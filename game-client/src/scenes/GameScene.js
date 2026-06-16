import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const { width, height } = this.scale;
    const worldWidth = 4000;
    const groundY = height - 60;

    // misty dawn background
    this.cameras.main.setBackgroundColor('#13191e');

    // parallax background trees
    for (let i = 0; i < 40; i++) {
      const x = i * 120 + Phaser.Math.Between(-30, 30);
      const tree = this.add.image(x, groundY + 20, 'tree');
      tree.setOrigin(0.5, 1);
      tree.setScale(0.7);
      tree.setTint(0x0e1a16);
      tree.setAlpha(0.6);
      tree.setScrollFactor(0.4);
      tree.setDepth(-5);
    }

    // ── platforms with GAPS (the core challenge) ──
    this.platforms = this.physics.add.staticGroup();

    // Define ground segments as [startX, endX] — gaps are the spaces between them
    const segments = [
      [0, 600],
      [760, 1200],
      [1360, 1700],
      [1900, 2400],
      [2560, 2900],
      [3100, 3500],
      [3650, 4000]
    ];
    segments.forEach(([startX, endX]) => {
      for (let x = startX; x < endX; x += 16) {
        this.platforms.create(x, groundY, 'grass').setOrigin(0, 0).refreshBody();
      }
    });

    // floating platforms over some gaps (to help cross)
    this.makeFloater(660, groundY - 90, 5);
    this.makeFloater(1260, groundY - 110, 4);
    this.makeFloater(1780, groundY - 100, 4);
    this.makeFloater(2460, groundY - 120, 5);
    this.makeFloater(2980, groundY - 100, 4);
    this.makeFloater(3540, groundY - 110, 4);

    // ── checkpoints (campfires) ──
    this.checkpoints = this.physics.add.staticGroup();
    this.checkpointPositions = [
      { x: 100, y: groundY - 20 },
      { x: 1000, y: groundY - 20 },
      { x: 2100, y: groundY - 20 },
      { x: 3300, y: groundY - 20 }
    ];
    this.checkpointSprites = [];
    this.checkpointPositions.forEach((cp, index) => {
      const fire = this.checkpoints.create(cp.x, cp.y, index === 0 ? 'campfire_on' : 'campfire_off');
      fire.setOrigin(0.5, 1);
      fire.setScale(1.5);
      fire.refreshBody();
      fire.checkpointIndex = index;
      fire.lit = index === 0;
      this.checkpointSprites.push(fire);
    });

    // first checkpoint is the starting respawn point
    this.respawnPoint = { x: this.checkpointPositions[0].x, y: this.checkpointPositions[0].y - 40 };

    // ── goal marker at the end ──
    this.goal = this.physics.add.staticImage(3950, groundY - 40, 'goal');
    this.goal.setOrigin(0.5, 1);
    this.goal.refreshBody();

    // ── player ──
    this.player = this.physics.add.sprite(this.respawnPoint.x, this.respawnPoint.y, 'player', 12);
    this.player.setCollideWorldBounds(false);
    this.player.setDragX(800);
    this.player.setMaxVelocity(220, 700);
    this.player.setScale(1.5);
    this.player.setSize(20, 28);
    this.player.setOffset(14, 18);
    this.player.setDepth(5);

    this.physics.add.collider(this.player, this.platforms);

    // checkpoint overlap
    this.physics.add.overlap(this.player, this.checkpoints, this.hitCheckpoint, null, this);
    // goal overlap
    this.physics.add.overlap(this.player, this.goal, this.reachGoal, null, this);

    // camera
    this.physics.world.setBounds(0, 0, worldWidth, height + 400); // extra below for falling
    this.cameras.main.setBounds(0, 0, worldWidth, height);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    // HUD
    this.add.text(20, 20, 'reach the light at the end of the path', {
      fontFamily: 'Helvetica Neue, sans-serif',
      fontSize: '14px',
      color: '#aaaaaa'
    }).setScrollFactor(0).setDepth(100);

    this.deathCount = 0;
    this.deathText = this.add.text(20, 44, 'falls: 0', {
      fontFamily: 'Helvetica Neue, sans-serif',
      fontSize: '12px',
      color: '#666666'
    }).setScrollFactor(0).setDepth(100);

    this.player.play('idle');
    this.isRespawning = false;
  }

  makeFloater(x, y, length) {
    for (let i = 0; i < length; i++) {
      this.platforms.create(x + i * 16, y, 'grass').setOrigin(0, 0).refreshBody();
    }
  }

  hitCheckpoint(player, fire) {
    if (!fire.lit) {
      fire.lit = true;
      fire.setTexture('campfire_on');
      this.respawnPoint = { x: fire.x, y: fire.y - 40 };
      // little glow pulse
      this.tweens.add({
        targets: fire,
        scaleX: 1.8, scaleY: 1.8,
        duration: 200, yoyo: true, ease: 'Quad.out'
      });
    }
  }

  reachGoal() {
    if (this.levelComplete) return;
    this.levelComplete = true;

    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(200);
    this.add.text(width / 2, height / 2 - 20, 'you made it.', {
      fontFamily: 'Helvetica Neue, sans-serif',
      fontSize: '36px',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    this.add.text(width / 2, height / 2 + 30, `falls: ${this.deathCount}`, {
      fontFamily: 'Helvetica Neue, sans-serif',
      fontSize: '16px',
      color: '#aaaaaa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.player.setVelocity(0, 0);
    this.player.body.enable = false;
  }

  respawn() {
    this.isRespawning = true;
    this.deathCount++;
    this.deathText.setText('falls: ' + this.deathCount);

    // quick camera flash
    this.cameras.main.flash(200, 10, 15, 20);

    this.player.setVelocity(0, 0);
    this.player.setPosition(this.respawnPoint.x, this.respawnPoint.y);

    this.time.delayedCall(50, () => { this.isRespawning = false; });
  }

  update() {
    if (this.levelComplete) return;

    const speed = 220;
    const jumpSpeed = -480;

    // fall detection — below the world
    if (this.player.y > this.scale.height + 100 && !this.isRespawning) {
      this.respawn();
      return;
    }

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
