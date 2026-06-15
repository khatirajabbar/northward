import Phaser from 'phaser';

export default class ForestScene extends Phaser.Scene {
  constructor() {
    super('ForestScene');
  }

  create() {
    const { width, height } = this.scale;

    // Sky (cozy dusk blue-grey)
    this.cameras.main.setBackgroundColor('#13191e');

    const worldWidth = 3000;
    const groundTop = height - 80;

    // Distant trees (parallax background, slower)
    for (let i = 0; i < 25; i++) {
      const x = i * 130 + Phaser.Math.Between(-30, 30);
      const tree = this.add.image(x, groundTop, 'tree');
      tree.setOrigin(0.5, 1);
      tree.setScale(0.7);
      tree.setTint(0x0a1410);
      tree.setAlpha(0.7);
      tree.setScrollFactor(0.3);
      tree.setDepth(-3);
    }

    // Mid trees
    for (let i = 0; i < 18; i++) {
      const x = i * 180 + Phaser.Math.Between(-40, 40);
      const tree = this.add.image(x, groundTop, 'tree');
      tree.setOrigin(0.5, 1);
      tree.setScale(0.9);
      tree.setTint(0x152620);
      tree.setScrollFactor(0.6);
      tree.setDepth(-2);
    }

    // Ground (grass on top + dirt below for depth)
    this.platforms = this.physics.add.staticGroup();

    // Grass top row
    for (let x = 0; x < worldWidth; x += 16) {
      this.platforms.create(x, groundTop, 'grass').setOrigin(0, 0).refreshBody();
    }

    // Dirt rows below (decoration, not physics)
    for (let y = groundTop + 16; y < height; y += 16) {
      for (let x = 0; x < worldWidth; x += 16) {
        this.add.image(x, y, 'dirt').setOrigin(0, 0).setDepth(-1);
      }
    }

    // Floating grass platforms
    this.makePlatform(400, height - 220, 4);
    this.makePlatform(720, height - 320, 3);
    this.makePlatform(1100, height - 260, 5);
    this.makePlatform(1500, height - 380, 3);

    // Foreground trees (in front of player, faster parallax)
    for (let i = 0; i < 10; i++) {
      const x = i * 320 + Phaser.Math.Between(-60, 60);
      const tree = this.add.image(x, groundTop + 8, 'tree');
      tree.setOrigin(0.5, 1);
      tree.setScale(1.1);
      tree.setTint(0x081410);
      tree.setScrollFactor(1.3);
      tree.setDepth(10);
    }

    // Player
    this.player = this.physics.add.sprite(100, height - 200, 'player', 12);
    this.player.setCollideWorldBounds(false);
    this.player.setDragX(800);
    this.player.setMaxVelocity(200, 600);
    this.player.setScale(1.5);
    this.player.setSize(20, 28);
    this.player.setOffset(14, 18);
    this.player.setDepth(5);

    this.physics.add.collider(this.player, this.platforms);

    this.physics.world.setBounds(0, 0, worldWidth, height);
    this.cameras.main.setBounds(0, 0, worldWidth, height);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    // HUD
    this.add.text(20, 20, 'a quiet adventure', {
      fontFamily: 'Helvetica Neue, sans-serif',
      fontSize: '14px',
      color: '#aaaaaa'
    }).setScrollFactor(0).setDepth(100);

    this.add.text(20, 40, 'arrow keys or wasd  ·  space to jump', {
      fontFamily: 'Helvetica Neue, sans-serif',
      fontSize: '12px',
      color: '#666666'
    }).setScrollFactor(0).setDepth(100);

    this.player.play('idle');
  }

  makePlatform(x, y, length) {
    for (let i = 0; i < length; i++) {
      this.platforms.create(x + i * 16, y, 'grass').setOrigin(0, 0).refreshBody();
    }
  }

  update() {
    const speed = 200;
    const jumpSpeed = -480;

    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const jump = this.cursors.up.isDown || this.wasd.W.isDown || this.cursors.space.isDown;

    if (left) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
      if (this.player.body.blocked.down && this.player.anims.currentAnim?.key !== 'walk') {
        this.player.play('walk');
      }
    } else if (right) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
      if (this.player.body.blocked.down && this.player.anims.currentAnim?.key !== 'walk') {
        this.player.play('walk');
      }
    } else if (this.player.body.blocked.down && this.player.anims.currentAnim?.key !== 'idle') {
      this.player.play('idle');
    }

    if (jump && this.player.body.blocked.down) {
      this.player.setVelocityY(jumpSpeed);
    }
  }
}
