import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2 - 20, 'northward', {
      fontFamily: 'Helvetica Neue, sans-serif',
      fontSize: '42px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 30, 'loading the forest...', {
      fontFamily: 'Helvetica Neue, sans-serif',
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(0.5);

    this.load.spritesheet('player', 'assets/characters/player.png', {
      frameWidth: 48,
      frameHeight: 48
    });

    this.load.image('grass', 'assets/tiles/grass.png');

    const dirtGfx = this.make.graphics({ x: 0, y: 0, add: false });
    dirtGfx.fillStyle(0x3a2d1f);
    dirtGfx.fillRect(0, 0, 16, 16);
    dirtGfx.generateTexture('dirt', 16, 16);
    dirtGfx.destroy();

    const treeGfx = this.make.graphics({ x: 0, y: 0, add: false });
    treeGfx.fillStyle(0x2a1a0f);
    treeGfx.fillRect(28, 80, 8, 32);
    treeGfx.fillStyle(0x1a2818);
    treeGfx.fillTriangle(32, 0, 8, 40, 56, 40);
    treeGfx.fillTriangle(32, 20, 4, 60, 60, 60);
    treeGfx.fillTriangle(32, 40, 0, 84, 64, 84);
    treeGfx.generateTexture('tree', 64, 112);
    treeGfx.destroy();
  }

  create() {
    this.anims.create({
      key: 'idle',
      frames: this.anims.generateFrameNumbers('player', { start: 12, end: 17 }),
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: 'walk',
      frames: this.anims.generateFrameNumbers('player', { start: 30, end: 35 }),
      frameRate: 10,
      repeat: -1
    });

    this.time.delayedCall(800, () => {
      this.scene.start('LoginScene');
    });
  }
}
