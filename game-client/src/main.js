import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import ForestScene from './scenes/ForestScene.js';

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
  scene: [BootScene, ForestScene]
};

new Phaser.Game(config);
