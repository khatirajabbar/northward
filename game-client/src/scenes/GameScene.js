import Phaser from 'phaser';
import { leaderboard, formatTime } from '../services/leaderboard.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const { width, height } = this.scale;
    const worldWidth = 4000;
    const groundY = height - 60;

    this.cameras.main.setBackgroundColor('#13191e');

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

    this.platforms = this.physics.add.staticGroup();
    const segments = [
      [0, 600], [760, 1200], [1360, 1700], [1900, 2400],
      [2560, 2900], [3100, 3500], [3650, 4000]
    ];
    segments.forEach(([startX, endX]) => {
      for (let x = startX; x < endX; x += 16) {
        this.platforms.create(x, groundY, 'grass').setOrigin(0, 0).refreshBody();
      }
    });

    this.makeFloater(660, groundY - 90, 5);
    this.makeFloater(1260, groundY - 110, 4);
    this.makeFloater(1780, groundY - 100, 4);
    this.makeFloater(2460, groundY - 120, 5);
    this.makeFloater(2980, groundY - 100, 4);
    this.makeFloater(3540, groundY - 110, 4);

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

    this.respawnPoint = { x: this.checkpointPositions[0].x, y: this.checkpointPositions[0].y - 40 };

    this.goal = this.physics.add.staticImage(3950, groundY - 40, 'goal');
    this.goal.setOrigin(0.5, 1);
    this.goal.refreshBody();

    this.player = this.physics.add.sprite(this.respawnPoint.x, this.respawnPoint.y, 'player', 12);
    this.player.setCollideWorldBounds(false);
    this.player.setDragX(800);
    this.player.setMaxVelocity(220, 700);
    this.player.setScale(1.5);
    this.player.setSize(20, 28);
    this.player.setOffset(14, 18);
    this.player.setDepth(5);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.checkpoints, this.hitCheckpoint, null, this);
    this.physics.add.overlap(this.player, this.goal, this.reachGoal, null, this);

    this.physics.world.setBounds(0, 0, worldWidth, height + 400);
    this.cameras.main.setBounds(0, 0, worldWidth, height);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    this.add.text(20, 20, 'reach the light at the end of the path', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '14px', color: '#aaaaaa'
    }).setScrollFactor(0).setDepth(100);

    this.deathCount = 0;
    this.deathText = this.add.text(20, 44, 'falls: 0', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '12px', color: '#666666'
    }).setScrollFactor(0).setDepth(100);

    this.timerText = this.add.text(20, 64, 'time: 0:00', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '12px', color: '#666666'
    }).setScrollFactor(0).setDepth(100);

    this.startTime = this.time.now;
    this.elapsedSeconds = 0;

    this.player.play('idle');
    this.isRespawning = false;
    this.levelComplete = false;
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
      this.tweens.add({
        targets: fire, scaleX: 1.8, scaleY: 1.8,
        duration: 200, yoyo: true, ease: 'Quad.out'
      });
    }
  }

  async reachGoal() {
    if (this.levelComplete) return;
    this.levelComplete = true;

    const { width, height } = this.scale;

    const score = Math.max(0, 1000 - this.deathCount * 50 - Math.floor(this.elapsedSeconds));
    const timeStr = formatTime(this.elapsedSeconds);

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(200);
    this.add.text(width / 2, height / 2 - 60, 'you made it.', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '36px', color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    this.add.text(width / 2, height / 2 - 10, `time ${timeStr}  ·  falls ${this.deathCount}  ·  score ${score}`, {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '16px', color: '#aaaaaa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const statusText = this.add.text(width / 2, height / 2 + 40, 'saving your score...', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '14px', color: '#888888'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.player.setVelocity(0, 0);
    this.player.body.enable = false;

    try {
      await leaderboard.submitScore({
        characterType: 'female',
        season: 'summer',
        score,
        completionTime: timeStr
      });
      statusText.setText('score saved to the leaderboard ✓');
      statusText.setColor('#7ac77a');
    } catch (err) {
      statusText.setText('could not save score: ' + err.message);
      statusText.setColor('#ff8080');
    }
  }

  respawn() {
    this.isRespawning = true;
    this.deathCount++;
    this.deathText.setText('falls: ' + this.deathCount);
    this.cameras.main.flash(200, 10, 15, 20);
    this.player.setVelocity(0, 0);
    this.player.setPosition(this.respawnPoint.x, this.respawnPoint.y);
    this.time.delayedCall(50, () => { this.isRespawning = false; });
  }

  update() {
    if (this.levelComplete) return;

    this.elapsedSeconds = (this.time.now - this.startTime) / 1000;
    const m = Math.floor(this.elapsedSeconds / 60);
    const s = Math.floor(this.elapsedSeconds % 60);
    this.timerText.setText(`time: ${m}:${String(s).padStart(2, '0')}`);

    const speed = 220;
    const jumpSpeed = -480;

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
