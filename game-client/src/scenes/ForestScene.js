import Phaser from 'phaser';

export default class ForestScene extends Phaser.Scene {
  constructor() {
    super('ForestScene');
  }

  create() {
    const { width, height } = this.scale;

    // Sky / background gradient (top portion)
    this.cameras.main.setBackgroundColor('#0a0a0a');

    // Distant trees (parallax background, slower scrolling)
    this.bgTrees = this.add.group();
    for (let i = 0; i < 30; i++) {
      const x = i * 80 + Phaser.Math.Between(-20, 20);
      const tree = this.add.image(x, height - 100, 'tree').setScale(1, 1.5);
      tree.setTint(0x0a1a0a);
      tree.setAlpha(0.6);
      tree.setScrollFactor(0.3);
      this.bgTrees.add(tree);
    }

    // Mid-ground trees
    for (let i = 0; i < 20; i++) {
      const x = i * 130 + Phaser.Math.Between(-30, 30);
      const tree = this.add.image(x, height - 80, 'tree');
      tree.setTint(0x152515);
      tree.setScrollFactor(0.6);
    }

    // Ground (physics-enabled platforms)
    this.platforms = this.physics.add.staticGroup();
    const groundY = height - 32;
    for (let x = 0; x < 3000; x += 32) {
      this.platforms.create(x, groundY, 'ground').refreshBody();
    }

    // A few floating platforms for variety
    this.platforms.create(400, height - 200, 'ground').setScale(3, 0.5).refreshBody();
    this.platforms.create(700, height - 320, 'ground').setScale(3, 0.5).refreshBody();
    this.platforms.create(1100, height - 240, 'ground').setScale(3, 0.5).refreshBody();

    // Foreground trees (in front of player, scroll faster)
    for (let i = 0; i < 15; i++) {
      const x = i * 200 + Phaser.Math.Between(-50, 50);
      const tree = this.add.image(x, height - 60, 'tree').setScale(0.7, 0.8);
      tree.setTint(0x0a1a0a);
      tree.setScrollFactor(1.4);
      tree.setDepth(10);
    }

    // Player
    this.player = this.physics.add.sprite(100, height - 200, 'player');
    this.player.setCollideWorldBounds(false);
    this.player.setDragX(800);
    this.player.setMaxVelocity(200, 600);

    // Physics: player vs ground
    this.physics.add.collider(this.player, this.platforms);

    // World bounds (so we can walk a bit before hitting the edge)
    this.physics.world.setBounds(0, 0, 3000, height);
    this.cameras.main.setBounds(0, 0, 3000, height);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    // UI text (stays on screen)
    this.add.text(20, 20, 'a quiet adventure', {
      fontFamily: 'Helvetica Neue, sans-serif',
      fontSize: '14px',
      color: '#888888'
    }).setScrollFactor(0).setDepth(100);

    this.add.text(20, 40, 'arrow keys or wasd  ·  space to jump', {
      fontFamily: 'Helvetica Neue, sans-serif',
      fontSize: '12px',
      color: '#555555'
    }).setScrollFactor(0).setDepth(100);
  }

  update() {
    const speed = 220;
    const jumpSpeed = -480;

    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const jump = this.cursors.up.isDown || this.wasd.W.isDown || this.cursors.space.isDown;

    if (left) {
      this.player.setVelocityX(-speed);
    } else if (right) {
      this.player.setVelocityX(speed);
    }

    if (jump && this.player.body.blocked.down) {
      this.player.setVelocityY(jumpSpeed);
    }
  }
}
