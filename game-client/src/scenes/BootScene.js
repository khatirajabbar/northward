import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Loading text
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 20, 'northward', {
      fontFamily: 'Helvetica Neue, sans-serif',
      fontSize: '42px',
      color: '#ffffff',
      fontStyle: '200'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 30, 'loading the forest...', {
      fontFamily: 'Helvetica Neue, sans-serif',
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(0.5);

    // Placeholder textures (we'll replace with real pixel art later)
    this.createPlaceholderTextures();
  }

  create() {
    // Small delay so the loading screen is actually visible
    this.time.delayedCall(800, () => {
      this.scene.start('ForestScene');
    });
  }

  createPlaceholderTextures() {
    // Generate placeholder graphics so we can build without art assets yet

    // Player character (white rectangle, 16x32)
    const playerGfx = this.make.graphics({ x: 0, y: 0, add: false });
    playerGfx.fillStyle(0xffffff);
    playerGfx.fillRect(0, 0, 16, 32);
    playerGfx.generateTexture('player', 16, 32);
    playerGfx.destroy();

    // Ground tile (32x32 dark green)
    const groundGfx = this.make.graphics({ x: 0, y: 0, add: false });
    groundGfx.fillStyle(0x2a3a2a);
    groundGfx.fillRect(0, 0, 32, 32);
    groundGfx.lineStyle(1, 0x3a4a3a);
    groundGfx.strokeRect(0, 0, 32, 32);
    groundGfx.generateTexture('ground', 32, 32);
    groundGfx.destroy();

    // Tree (32x96 dark)
    const treeGfx = this.make.graphics({ x: 0, y: 0, add: false });
    treeGfx.fillStyle(0x1a2a1a);
    treeGfx.fillRect(0, 0, 32, 96);
    treeGfx.generateTexture('tree', 32, 96);
    treeGfx.destroy();
  }
}
