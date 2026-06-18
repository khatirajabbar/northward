import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import LoginScene from './scenes/LoginScene.js';
import GameScene from './scenes/GameScene.js';
import MorningScene from './scenes/MorningScene.js';
import ForestScene from './scenes/ForestScene.js';
import { auth } from './services/auth.js';

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
  scene: [BootScene, LoginScene, MorningScene, GameScene, ForestScene]
};

const game = new Phaser.Game(config);

const overlay = document.getElementById('login-overlay');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const submitBtn = document.getElementById('login-submit');
const errorBox = document.getElementById('login-error');

emailInput.focus();

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
    overlay.classList.add('hidden');
    setTimeout(() => {
      overlay.style.display = 'none';
      game.scene.stop('LoginScene');
      game.scene.start('MorningScene');
    }, 800);
  } catch (err) {
    showError(err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'enter the forest';
  }
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function hideError() {
  errorBox.hidden = true;
  errorBox.textContent = '';
}

submitBtn.addEventListener('click', attemptLogin);

[emailInput, passwordInput].forEach((input) => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptLogin();
  });
});
