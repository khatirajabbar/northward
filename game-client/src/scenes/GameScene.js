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

    // ── gradient dawn sky (cool misty blue) ──
    this.cameras.main.setBackgroundColor('#10161c');
    const skyBands = [0x10161c, 0x1a2630, 0x2b3d49, 0x415863, 0x6a8088];
    const bandH = height / skyBands.length;
    skyBands.forEach((c, i) => {
      this.add.rectangle(0, i * bandH, width, bandH + 1, c)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(-30);
    });

    // ── Demon Woods parallax layers (recolored cool/misty, no red) ──
    // Layers are 272px tall silhouettes. Scale to fill from bottom.
    const dwScale = height / 272 * 1.05;
    const dwH = 272 * dwScale;
    const dwY = height - dwH;
    const coolTint = 0x3a5a6e; // cool blue-teal to kill the red
    this.bgLayers = [];

    const addDW = (key, factor, depth, tint, alpha) => {
      const ts = this.add.tileSprite(0, dwY, width, dwH, key);
      ts.setOrigin(0, 0);
      ts.setScrollFactor(0);
      ts.setTileScale(dwScale, dwScale);
      ts.setDepth(depth);
      ts.setTint(tint);
      ts.setAlpha(alpha);
      ts.parallaxFactor = factor;
      this.bgLayers.push(ts);
      return ts;
    };

    // back to front: bg wash, far trees, mid trees, close trees
    addDW('dw-bg', 0.05, -25, 0x2b4453, 1);
    addDW('dw-far', 0.12, -24, 0x35525f, 0.9);
    addDW('dw-mid', 0.25, -23, 0x223843, 1);
    addDW('dw-close', 0.45, -22, 0x14242c, 1);

    // legacy var kept so later code referencing bgLayers parallax still works
    const layerH = dwH;
    const layerY = dwY;


    // ── platforms with gaps ──
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

    // ── checkpoints ──
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
      fire.lit = index === 0;
      this.checkpointSprites.push(fire);
    });

    this.respawnPoint = { x: this.checkpointPositions[0].x, y: this.checkpointPositions[0].y - 40 };

    // ── goal ──
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
    this.physics.add.overlap(this.player, this.checkpoints, this.hitCheckpoint, null, this);
    this.physics.add.overlap(this.player, this.goal, this.reachGoal, null, this);

    this.physics.world.setBounds(0, 0, worldWidth, height + 400);
    this.cameras.main.setBounds(0, 0, worldWidth, height);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    // HUD
    this.add.text(20, 20, 'reach the light at the end of the path', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '14px', color: '#2a2018'
    }).setScrollFactor(0).setDepth(100);

    this.deathCount = 0;
    this.deathText = this.add.text(20, 44, 'falls: 0', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '12px', color: '#4a3a28'
    }).setScrollFactor(0).setDepth(100);

    this.timerText = this.add.text(20, 64, 'time: 0:00', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '12px', color: '#4a3a28'
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

    const camX = this.cameras.main.scrollX;
    this.bgLayers.forEach((layer) => {
      layer.tilePositionX = camX * layer.parallaxFactor / layer.tileScaleX;
    });

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
