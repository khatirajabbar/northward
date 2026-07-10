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

    this.load.spritesheet('lpc-khatira-idle', 'assets/characters/lpc-khatira/standard/idle.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('lpc-khatira-walk', 'assets/characters/lpc-khatira/standard/walk.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('lpc-khatira-sit', 'assets/characters/lpc-khatira/standard/sit.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('lpc-khatira-jump', 'assets/characters/lpc-khatira/standard/jump.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    // hurt.png is a single 13-frame row (832x64), not the usual 4-direction sheet
    this.load.spritesheet('lpc-khatira-hurt', 'assets/characters/lpc-khatira/standard/hurt.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('lpc-khatira-watering', 'assets/characters/lpc-khatira/standard/watering.png', {
      frameWidth: 64,
      frameHeight: 64
    });


    this.load.image('grass', 'assets/tiles/grass.png');

    // Parallax forest layers (ansimuz, 272x160 each)
    this.load.image('forest-back', 'assets/forest/back-trees.png');
    this.load.image('forest-middle', 'assets/forest/middle-trees.png');
    this.load.image('forest-front', 'assets/forest/front-trees.png');
    this.load.image('forest-lights', 'assets/forest/lights.png');

    // Demon Woods layers (592x272 trees, 480x272 bg) — silhouette style
    this.load.image('dw-bg', 'assets/forest2/dw-bg.png');
    this.load.image('dw-far', 'assets/forest2/dw-far.png');
    this.load.image('dw-mid', 'assets/forest2/dw-mid.png');
    this.load.image('dw-close', 'assets/forest2/dw-close.png');

    // Cabin interior assets (Gemini art, cut to transparent PNGs)
    this.load.image('cabin-bg', 'assets/cabin/bg.png');
    this.load.image('cabin-bed', 'assets/cabin/bed_empty.png');
    this.load.image('cabin-bed-sleeping', 'assets/cabin/bed_sleeping.png');
    this.load.image('cabin-window', 'assets/cabin/window.png');
    this.load.image('cabin-curtain-left', 'assets/cabin/curtain_left.png');
    this.load.image('cabin-curtain-right', 'assets/cabin/curtain_right.png');
    this.load.image('cabin-washbasin', 'assets/cabin/washbasin.png');
    this.load.image('cabin-counter', 'assets/cabin/counter.png');
    this.load.image('cabin-fridge-closed', 'assets/cabin/fridge_closed.png');
    this.load.image('cabin-fridge-open', 'assets/cabin/fridge_open.png');
    this.load.image('cabin-birdhouse', 'assets/cabin/birdhouse.png');
    this.load.image('cabin-bag', 'assets/cabin/bag.png');
    this.load.image('cabin-door', 'assets/cabin/door.png');
    this.load.image('cabin-lantern', 'assets/cabin/lantern.png');
    this.load.image('cabin-painting', 'assets/cabin/painting.png');
    this.load.image('cabin-shelf', 'assets/cabin/shelf.png');
    this.load.image('cabin-wall', 'assets/cabin/wall.png');
    this.load.image('cabin-floor', 'assets/cabin/floor.png');
    this.load.image('cabin-lamp-top', 'assets/cabin/lamp_top.png');
    this.load.image('cabin-lamp-mid', 'assets/cabin/lamp_mid.png');
    this.load.image('cabin-lamp-bottom', 'assets/cabin/lamp_bottom.png');
    this.load.image('cabin-counter-left', 'assets/cabin/counter_left.png');
    this.load.image('cabin-counter-mid', 'assets/cabin/counter_mid.png');
    this.load.image('cabin-counter-right', 'assets/cabin/counter_right.png');
    this.load.image('cabin-teapot', 'assets/cabin/teapot.png');
    this.load.image('cabin-mug', 'assets/cabin/mug.png');
    this.load.image('cabin-plant', 'assets/cabin/plant.png');
    this.load.image('cabin-sofa', 'assets/cabin/sofa.png');
    this.load.image('cabin-coffee-table', 'assets/cabin/coffee_table.png');
    this.load.image('cabin-floor-lamp', 'assets/cabin/floor_lamp.png');
    this.load.image('cabin-bookshelf', 'assets/cabin/bookshelf.png');
    this.load.image('cabin-radio', 'assets/cabin/radio.png');

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

    // Campfire checkpoint — unlit (dim logs) and lit (glowing)
    const logsGfx = this.make.graphics({ x: 0, y: 0, add: false });
    logsGfx.fillStyle(0x3a2818);
    logsGfx.fillRect(2, 20, 28, 6);
    logsGfx.fillRect(6, 24, 20, 5);
    logsGfx.fillStyle(0x2a1c10);
    logsGfx.fillRect(0, 26, 32, 4);
    logsGfx.generateTexture('campfire_off', 32, 32);
    logsGfx.destroy();

    const fireGfx = this.make.graphics({ x: 0, y: 0, add: false });
    fireGfx.fillStyle(0x3a2818);
    fireGfx.fillRect(2, 20, 28, 6);
    fireGfx.fillRect(6, 24, 20, 5);
    fireGfx.fillStyle(0x2a1c10);
    fireGfx.fillRect(0, 26, 32, 4);
    // flames
    fireGfx.fillStyle(0xff8c42);
    fireGfx.fillTriangle(16, 0, 6, 22, 26, 22);
    fireGfx.fillStyle(0xffd24a);
    fireGfx.fillTriangle(16, 8, 10, 22, 22, 22);
    fireGfx.generateTexture('campfire_on', 32, 32);
    fireGfx.destroy();

    // Goal marker (tall glowing post)
    const goalGfx = this.make.graphics({ x: 0, y: 0, add: false });
    goalGfx.fillStyle(0xdce8e0);
    goalGfx.fillRect(14, 0, 4, 80);
    goalGfx.fillStyle(0xffd24a);
    goalGfx.fillCircle(16, 8, 8);
    goalGfx.generateTexture('goal', 32, 80);
    goalGfx.destroy();
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


    this.anims.create({
      key: 'lpc-idle',
      frames: this.anims.generateFrameNumbers('lpc-khatira-idle', { start: 39, end: 40 }),
      frameRate: 2,
      repeat: -1
    });

    this.anims.create({
      key: 'lpc-walk',
      frames: this.anims.generateFrameNumbers('lpc-khatira-walk', { start: 40, end: 47 }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'lpc-sit',
      frames: [{ key: 'lpc-khatira-sit', frame: 41 }],
      frameRate: 1,
      repeat: -1
    });

    this.anims.create({
      key: 'lpc-jump',
      frames: this.anims.generateFrameNumbers('lpc-khatira-jump', { start: 41, end: 43 }),
      frameRate: 8,
      repeat: 0
    });

    this.anims.create({
      key: 'lpc-lie',
      frames: [{ key: 'lpc-khatira-hurt', frame: 5 }],
      frameRate: 1,
      repeat: -1
    });

    this.anims.create({
      key: 'lpc-rest',
      frames: [{ key: 'lpc-khatira-sit', frame: 40 }],
      frameRate: 1,
      repeat: -1
    });

    this.anims.create({
      key: 'lpc-water',
      frames: this.anims.generateFrameNumbers('lpc-khatira-watering', { start: 39, end: 46 }),
      frameRate: 8,
      repeat: 0
    });

    // one frame at frameRate 4 = a 250ms bend-down beat
    this.anims.create({
      key: 'lpc-crouch',
      frames: [{ key: 'lpc-khatira-jump', frame: 41 }],
      frameRate: 4,
      repeat: 0
    });

    this.time.delayedCall(800, () => {
      this.scene.start('LoginScene');
    });
  }
}
