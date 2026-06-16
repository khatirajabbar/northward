import Phaser from 'phaser';

export default class LoginScene extends Phaser.Scene {
  constructor() {
    super('LoginScene');
  }

  create() {
    const { width, height } = this.scale;
    const groundTop = height - 80;

    this.cameras.main.setBackgroundColor('#1a2228');
    const skyColors = [0x1a2228, 0x232f36, 0x2e3d44, 0x3a4a50];
    const bandHeight = groundTop / skyColors.length;
    skyColors.forEach((color, i) => {
      this.add.rectangle(width / 2, i * bandHeight + bandHeight / 2, width, bandHeight, color)
        .setDepth(-10);
    });

    const sun = this.add.circle(width * 0.7, groundTop - 180, 70, 0xdce8e0, 0.15);
    sun.setDepth(-9);
    const sunCore = this.add.circle(width * 0.7, groundTop - 180, 45, 0xeef4ee, 0.25);
    sunCore.setDepth(-9);
    this.tweens.add({
      targets: [sun, sunCore],
      alpha: { from: 0.15, to: 0.35 },
      duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.inOut'
    });

    this.farTrees = [];
    for (let i = 0; i < 30; i++) {
      const x = i * 110 + Phaser.Math.Between(-30, 30);
      const tree = this.add.image(x, groundTop, 'tree');
      tree.setOrigin(0.5, 1);
      tree.setScale(0.6);
      tree.setTint(0x2a363a);
      tree.setAlpha(0.4);
      tree.setDepth(-7);
      this.farTrees.push(tree);
    }

    this.fog1 = this.add.rectangle(width / 2, groundTop - 120, width * 2, 120, 0xaab8bc, 0.06);
    this.fog1.setDepth(-6);

    this.midTrees = [];
    for (let i = 0; i < 22; i++) {
      const x = i * 160 + Phaser.Math.Between(-40, 40);
      const tree = this.add.image(x, groundTop, 'tree');
      tree.setOrigin(0.5, 1);
      tree.setScale(0.85);
      tree.setTint(0x1e2a2c);
      tree.setAlpha(0.7);
      tree.setDepth(-5);
      this.midTrees.push(tree);
    }

    this.fog2 = this.add.rectangle(width / 2, groundTop - 60, width * 2, 100, 0xc0ccce, 0.05);
    this.fog2.setDepth(-4);

    for (let x = 0; x < width + 100; x += 16) {
      this.add.image(x, groundTop, 'grass').setOrigin(0, 0).setDepth(-3);
    }
    for (let y = groundTop + 16; y < height; y += 16) {
      for (let x = 0; x < width + 100; x += 16) {
        this.add.image(x, y, 'dirt').setOrigin(0, 0).setDepth(-3);
      }
    }

    this.bgPlayer = this.add.sprite(-50, groundTop + 8, 'player', 30);
    this.bgPlayer.setOrigin(0.5, 1);
    this.bgPlayer.setScale(1.5);
    this.bgPlayer.setDepth(-2);
    this.bgPlayer.setAlpha(0.85);
    this.bgPlayer.play('walk');

    this.foreTrees = [];
    for (let i = 0; i < 10; i++) {
      const x = i * 320 + Phaser.Math.Between(-60, 60);
      const tree = this.add.image(x, groundTop + 8, 'tree');
      tree.setOrigin(0.5, 1);
      tree.setScale(1.2);
      tree.setTint(0x0e1618);
      tree.setDepth(2);
      this.foreTrees.push(tree);
    }

    this.fog3 = this.add.rectangle(width / 2, height - 40, width * 2, 120, 0xd0dcde, 0.04);
    this.fog3.setDepth(3);

    this.particles = [];
    for (let i = 0; i < 40; i++) {
      const p = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.FloatBetween(0.5, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.1, 0.4)
      );
      p.vx = Phaser.Math.FloatBetween(-0.15, 0.15);
      p.vy = Phaser.Math.FloatBetween(0.1, 0.3);
      p.setDepth(10);
      this.particles.push(p);
    }

    const vignette = this.add.graphics();
    vignette.setDepth(5);
    vignette.fillStyle(0x000000, 0.3);
    vignette.fillRect(0, 0, width, 60);
    vignette.fillRect(0, height - 60, width, 60);
    vignette.fillRect(0, 0, 60, height);
    vignette.fillRect(width - 60, 0, 60, height);
  }

  update() {
    this.bgPlayer.x += 0.5;
    if (this.bgPlayer.x > this.scale.width + 50) this.bgPlayer.x = -50;

    this.farTrees.forEach((t) => { t.x -= 0.08; if (t.x < -50) t.x = this.scale.width + 50; });
    this.midTrees.forEach((t) => { t.x -= 0.15; if (t.x < -50) t.x = this.scale.width + 50; });
    this.foreTrees.forEach((t) => { t.x -= 0.3; if (t.x < -100) t.x = this.scale.width + 100; });

    this.fog1.x -= 0.1; if (this.fog1.x < -this.scale.width / 2) this.fog1.x = this.scale.width;
    this.fog2.x -= 0.2; if (this.fog2.x < -this.scale.width / 2) this.fog2.x = this.scale.width;
    this.fog3.x += 0.15; if (this.fog3.x > this.scale.width * 1.5) this.fog3.x = 0;

    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > this.scale.height) { p.y = 0; p.x = Phaser.Math.Between(0, this.scale.width); }
      if (p.x < 0) p.x = this.scale.width;
      if (p.x > this.scale.width) p.x = 0;
    });
  }
}
