import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import LoginScene from './scenes/LoginScene.js';
import SessionSelectScene from './scenes/SessionSelectScene.js';
import CharacterSelectScene from './scenes/CharacterSelectScene.js';
import MorningScene from './scenes/MorningScene.js';
import ForestScene from './scenes/ForestScene.js';
import EndingScene from './scenes/EndingScene.js';
import PauseScene from './scenes/PauseScene.js';
import { auth } from './services/auth.js';
import { isOn, toggleAll } from './audio/sound.js';
import { setupTouch, fullscreenWorks, standalone } from './ui/touch.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  pixelArt: true,
  backgroundColor: '#0a0a0a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 800 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, LoginScene, SessionSelectScene, CharacterSelectScene, MorningScene, ForestScene, EndingScene, PauseScene]
};

const game = new Phaser.Game(config);
setupTouch(game);                // phone controls (only on a phone)
// development only (stripped from the production build): lets test scripts reach the game
if (import.meta.env.DEV) window.__northward = game;

// fullscreen the whole page, not just the canvas parent, so the login overlay stays visible
game.scale.fullscreenTarget = document.body;
window.addEventListener('keydown', (e) => {
  if (e.key !== 'f' && e.key !== 'F') return;
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  game.scale.toggleFullscreen();
});

// sound on and off: M, anywhere (but not while typing), and the chip on the
// title screen switch everything; the pause menu has music and sounds apart.
// each keeps the others right through the event
const soundBtn = document.getElementById('sound-toggle');
function showSound() {
  const off = !isOn('music') && !isOn('sounds');
  soundBtn.querySelector('img').src = off ? '/assets/ui/sound-off.png' : '/assets/ui/sound.png';
  soundBtn.querySelector('span').textContent = off ? 'sound off' : 'sound on';
}
game.events.on('sound-toggled', showSound);
const toggleSound = () => toggleAll(game);
soundBtn.addEventListener('click', toggleSound);
window.addEventListener('keydown', (e) => {
  if (e.key !== 'm' && e.key !== 'M') return;
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  toggleSound();
});
showSound();

const overlay = document.getElementById('login-overlay');
const form = document.getElementById('login-form');
const heading = document.getElementById('login-heading');
const nameInput = document.getElementById('login-name');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const submitBtn = document.getElementById('login-submit');
const errorBox = document.getElementById('login-error');
const switchAsk = document.getElementById('login-switch-ask');
const switchLink = document.getElementById('login-switch');
const otherBtn = document.getElementById('login-other');

// the sign-in page is drawn in the game's own pixels: keep it laid exactly over
// the canvas, and tell it how big one game pixel is on screen right now
function fitOverlay() {
  if (!game.canvas) return;
  const box = game.canvas.getBoundingClientRect();
  overlay.style.left = `${box.left}px`;
  overlay.style.top = `${box.top}px`;
  overlay.style.width = `${box.width}px`;
  overlay.style.height = `${box.height}px`;
  overlay.style.setProperty('--u', `${box.width / config.width}px`);
}
const refit = () => requestAnimationFrame(fitOverlay);     // after Phaser has resized the canvas itself
game.scale.on('resize', refit);
window.addEventListener('resize', refit);
document.addEventListener('fullscreenchange', refit);

// on the title screen full screen is something to click: the F key is busy
// being a letter while you type your email
const fullscreenBtn = document.getElementById('fullscreen-toggle');
// (opened from a phone's home screen it has the whole screen already; and on an
// iPhone in Safari there's no going full screen, so the button says how instead)
if (standalone) fullscreenBtn.hidden = true;
fullscreenBtn.addEventListener('click', () => {
  if (fullscreenWorks) { game.scale.toggleFullscreen(); return; }
  const words = fullscreenBtn.querySelector('span');
  words.textContent = 'share → add to home screen';
  clearTimeout(fullscreenBtn.back);
  fullscreenBtn.back = setTimeout(() => { words.textContent = 'full screen'; }, 5000);
});
document.addEventListener('fullscreenchange', () => {
  fullscreenBtn.querySelector('span').textContent = document.fullscreenElement ? 'leave full screen' : 'full screen';
});

// ── the board ──
// The wooden board is the way in, and it comes down for three reasons:
//   'enter'  on the title screen: sign in, make an account, or just walk without one
//   'keep'   from the pause menu, walking without an account: sign in to keep this journey
//   'board'  at the end of the road, without an account: sign in to put your name on the leaderboard
// A scene asks for the last two with the 'door-open' event, giving `kept` (what
// to do once signed in — it may answer with a line saying why it couldn't) and
// `closed` (called when the board has gone back up, with whether you signed in).
const door = { purpose: 'enter', register: false, kept: null, closed: null };

const HEADINGS = { enter: "who's walking today?", keep: 'keep this journey', board: 'your name on the board' };

function dressDoor() {
  form.classList.toggle('is-register', door.register);
  form.classList.toggle('is-centre', door.purpose !== 'enter');
  heading.textContent = door.register && door.purpose === 'enter' ? 'a new traveler' : HEADINGS[door.purpose];
  submitBtn.textContent = door.register ? 'make my account' : door.purpose === 'enter' ? 'enter the forest' : 'sign in';
  switchAsk.textContent = door.register ? 'been here before?' : 'no account?';
  switchLink.textContent = door.register ? 'sign in' : 'make one here';
  otherBtn.textContent = door.purpose === 'enter' ? 'or just walk, without one' : 'not now';
  passwordInput.autocomplete = door.register ? 'new-password' : 'current-password';
  passwordInput.placeholder = door.register ? '8 letters or more' : 'your password';
  submitBtn.disabled = false;
  hideError();
}

function openDoor(purpose, { kept = null, closed = null } = {}) {
  Object.assign(door, { purpose, kept, closed, register: purpose !== 'enter' });   // someone walking without an account most likely has none
  passwordInput.value = '';
  dressDoor();
  // while you type, the keys are letters: the game underneath doesn't hear them
  game.input.keyboard.enabled = false;
  overlay.style.display = '';
  overlay.classList.remove('leaving');
  fitOverlay();
  overlay.classList.add('shown');
  (door.register ? nameInput : emailInput).focus({ preventScroll: true });
}

// the board is drawn back up, and then whatever comes next
function closeDoor(then) {
  overlay.classList.add('leaving');
  setTimeout(() => {
    overlay.style.display = 'none';
    game.input.keyboard.enabled = true;
    then();
  }, 600);
}

// the title screen is there to hang it over. if you were signed in last time
// you still are: straight to your journeys, and the board stays up
let firstTitle = true;
game.events.on('title-ready', async () => {
  if (firstTitle) {
    firstTitle = false;
    if (await auth.restore()) {
      game.scene.stop('LoginScene');
      game.scene.start('SessionSelectScene', { seamless: true });
      return;
    }
  }
  openDoor('enter');
});
game.events.on('door-open', ({ purpose, kept, closed }) => openDoor(purpose, { kept, closed }));

async function attempt() {
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (door.register && name.length < 3) { showError('your name needs 3 letters or more'); return; }
  if (!email || !password) { showError('please enter both email and password'); return; }
  if (door.register && password.length < 8) { showError('the password needs 8 letters or more'); return; }

  const label = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = door.register ? 'one moment...' : 'signing in...';
  hideError();

  try {
    if (door.register) await auth.register(name, email, password);
    else await auth.login(email, password);

    if (door.purpose === 'enter') {
      // the board with your journeys comes down in its place over the same road
      closeDoor(() => {
        game.scene.stop('LoginScene');
        game.scene.start('SessionSelectScene', { seamless: true });
      });
      return;
    }
    // signed in to keep something: do that now. if it can't be done, you're
    // told why, and you're walking without an account again
    const why = door.kept ? await door.kept() : null;
    if (why) {
      auth.logout();
      auth.guest = true;
      throw new Error(why);
    }
    const closed = door.closed;
    closeDoor(() => closed && closed(true));
  } catch (err) {
    showError(err.message.toLowerCase());
    submitBtn.disabled = false;
    submitBtn.textContent = label;
  }
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  form.classList.add('has-error');
}

function hideError() {
  errorBox.hidden = true;
  errorBox.textContent = '';
  form.classList.remove('has-error');
}

// a real form, so Enter sends it and a password manager knows what it's looking at
form.addEventListener('submit', (e) => {
  e.preventDefault();
  attempt();
});

// signing in, or making an account: the same board, one more field
switchLink.addEventListener('click', (e) => {
  e.preventDefault();
  door.register = !door.register;
  dressDoor();
  (door.register ? nameInput : emailInput).focus({ preventScroll: true });
});

// the other way on: without an account, or without keeping anything
otherBtn.addEventListener('click', () => {
  if (door.purpose === 'enter') {
    auth.guest = true;
    closeDoor(() => {
      game.scene.stop('LoginScene');
      game.scene.start('CharacterSelectScene', { seamless: true });
    });
    return;
  }
  const closed = door.closed;
  closeDoor(() => closed && closed(false));
});
