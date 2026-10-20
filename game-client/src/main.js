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
import { isMuted, toggleMuted } from './audio/sound.js';

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
game.sound.mute = isMuted();              // off last time: off again
// development only (stripped from the production build): lets test scripts reach the game
if (import.meta.env.DEV) window.__northward = game;

// fullscreen the whole page, not just the canvas parent, so the login overlay stays visible
game.scale.fullscreenTarget = document.body;
window.addEventListener('keydown', (e) => {
  if (e.key !== 'f' && e.key !== 'F') return;
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  game.scale.toggleFullscreen();
});

// sound on and off: M, anywhere (but not while typing), the chip on the title
// screen, or the pause menu — each keeps the others right through the event
const soundBtn = document.getElementById('sound-toggle');
function showSound() {
  const off = isMuted();
  soundBtn.querySelector('img').src = off ? '/assets/ui/sound-off.png' : '/assets/ui/sound.png';
  soundBtn.querySelector('span').textContent = off ? 'sound off' : 'sound on';
}
game.events.on('sound-toggled', showSound);
const toggleSound = () => toggleMuted(game);
soundBtn.addEventListener('click', toggleSound);
window.addEventListener('keydown', (e) => {
  if (e.key !== 'm' && e.key !== 'M') return;
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  toggleSound();
});
showSound();

const overlay = document.getElementById('login-overlay');
const form = document.getElementById('login-form');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const submitBtn = document.getElementById('login-submit');
const errorBox = document.getElementById('login-error');

const WEBSITE_BASE = import.meta.env.VITE_WEBSITE_URL || 'http://localhost:5222';
document.getElementById('login-register').href = `${WEBSITE_BASE}/Account/Register`;

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
fullscreenBtn.addEventListener('click', () => game.scale.toggleFullscreen());
document.addEventListener('fullscreenchange', () => {
  fullscreenBtn.querySelector('span').textContent = document.fullscreenElement ? 'leave full screen' : 'full screen';
});

// it is let down once the title screen is there to hang it over
game.events.once('title-ready', () => {
  fitOverlay();
  overlay.classList.add('shown');
  emailInput.focus({ preventScroll: true });
});

async function attemptLogin() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('please enter both email and password');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'signing in...';
  hideError();

  try {
    const user = await auth.login(email, password);
    console.log('logged in as', user.username);
    // the sign-in board is drawn back up, and the board with your journeys
    // comes down in its place over the same road
    overlay.classList.add('leaving');
    setTimeout(() => {
      overlay.style.display = 'none';
      game.scene.stop('LoginScene');
      game.scene.start('SessionSelectScene', { seamless: true });
    }, 600);
  } catch (err) {
    showError(err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'enter the forest';
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
  attemptLogin();
});
