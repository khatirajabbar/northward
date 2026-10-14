import Phaser from 'phaser';

// Evening, falling over the last of the road. From the stag's glade on, the
// further north you go the later it gets: the light turns gold, then rose,
// then a cold blue, the stars and the moon come out and the first snow comes
// down — so the walk leads into the night of the ending instead of cutting to it.
//
// It's all worked out from where you are on the road (walk back and it's
// earlier again): the sky from the ending laid in over the day's, and one
// shade over the world that everything below it is seen through.

const ART = 2;
const DEPTH = 50;           // the shade: over the world, under the guide

// how the light goes, from the glade (0) to the ending (1): the colour the world is seen through
const LIGHT = [
  [0, 0xffffff], [0.22, 0xfff3e0], [0.42, 0xffdcb4], [0.6, 0xe9b2a6],
  [0.74, 0xa898bc], [0.87, 0x7686b0], [1, 0x63719c]
];

const ramp = (t, a, b) => Phaser.Math.Clamp((t - a) / (b - a), 0, 1);

export default class Evening {
  constructor(scene, from, to) {
    this.scene = scene;
    this.from = from;
    this.to = to;
    this.t = 0;
    this.said = {};
    const { width, height } = scene.scale;

    // the sky: the ending's warm dusk, then its cold night, laid over the day's
    this.warmSky = scene.add.image(0, 0, 'woods-dusk-warm').setOrigin(0, 0).setScale(ART).setScrollFactor(0).setDepth(-29.9).setAlpha(0);
    this.coldSky = scene.add.image(0, 0, 'woods-dusk-cold').setOrigin(0, 0).setScale(ART).setScrollFactor(0).setDepth(-29.8).setAlpha(0);
    this.stars = scene.add.container(0, 0).setScrollFactor(0.03).setDepth(-29.7).setAlpha(0);
    for (let i = 0; i < 40; i++) {
      const size = Math.random() < 0.18 ? 4 : 2;
      const star = scene.add.rectangle(Math.round(Math.random() * width * 0.8) * 2 % width, Math.round(Math.random() * height * 0.27) * 2,
        size, size, 0xe8f0f8, 0.5 + Math.random() * 0.5);
      scene.tweens.add({ targets: star, alpha: 0.2 + Math.random() * 0.3, duration: 900 + Math.random() * 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.stars.add(star);
    }
    this.moon = scene.add.image(width * 0.74, 110, 'woods-moon').setScale(ART).setScrollFactor(0).setDepth(-29.6).setAlpha(0);

    // the light itself
    this.shade = scene.add.rectangle(0, 0, width, height, 0xffffff).setOrigin(0, 0).setScrollFactor(0)
      .setDepth(DEPTH).setBlendMode(Phaser.BlendModes.MULTIPLY).setVisible(false);
    // what still shines when it's dark: the torches you've lit
    Object.values(scene.torches).forEach((torch) => { torch.glow.setDepth(DEPTH + 1); torch.flame.setDepth(DEPTH + 2); });

    // fireflies in the dusk, and later the first snow — both over the shade, so they shine
    scene.time.addEvent({ delay: 450, loop: true, callback: () => this.firefly() });
    scene.time.addEvent({ delay: 130, loop: true, callback: () => this.snow() });
  }

  firefly() {
    const scene = this.scene, t = this.t;
    if (t < 0.5 || t > 0.95 || Math.random() > 0.7) return;
    const x = scene.player.x + (Math.random() - 0.5) * 900, y = scene.groundY - 16 - Math.random() * 120;
    const fly = scene.add.rectangle(x, y, 2, 2, 0xffe58a, 0).setDepth(DEPTH + 5);
    scene.tweens.add({ targets: fly, alpha: 0.9, duration: 600, yoyo: true, hold: 500, repeat: 1 });
    scene.tweens.add({ targets: fly, x: x + (Math.random() - 0.5) * 70, y: y - 20 - Math.random() * 30, duration: 3600,
      ease: 'Sine.inOut', onComplete: () => fly.destroy() });
  }

  snow() {
    const scene = this.scene;
    if (Math.random() > ramp(this.t, 0.78, 1) * 0.9) return;
    const x = scene.cameras.main.scrollX + Math.random() * scene.scale.width;
    const size = Math.random() < 0.3 ? 4 : 2;
    const flake = scene.add.rectangle(x, -12, size, size, 0xdfe8ee, 0.5 + Math.random() * 0.35).setDepth(DEPTH + 5);
    scene.tweens.add({ targets: flake, y: scene.groundY + 2, x: x + (Math.random() - 0.5) * 70, duration: 3800 + Math.random() * 2600,
      ease: 'Sine.in', onComplete: () => scene.tweens.add({ targets: flake, alpha: 0, duration: 500, onComplete: () => flake.destroy() }) });
  }

  update(px) {
    const scene = this.scene;
    const t = this.t = Phaser.Math.Clamp((px - this.from) / (this.to - this.from), 0, 1);
    this.shade.setVisible(t > 0);
    if (t > 0) {
      let i = 0;
      while (i < LIGHT.length - 2 && t > LIGHT[i + 1][0]) i++;
      const [t0, c0] = LIGHT[i], [t1, c1] = LIGHT[i + 1];
      const k = Math.round(ramp(t, t0, t1) * 100);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(c0), Phaser.Display.Color.ValueToColor(c1), 100, k);
      this.shade.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
    }
    this.warmSky.setAlpha(ramp(t, 0.18, 0.55));
    this.coldSky.setAlpha(ramp(t, 0.66, 0.92));
    this.stars.setAlpha(ramp(t, 0.76, 1));
    this.moon.setAlpha(ramp(t, 0.72, 0.98) * 0.9);

    if (t > 0.45 && !this.said.gold) { this.said.gold = true; scene.showThought("the sun's going down. it's later than i thought.", 3600); }
    if (t > 0.79 && !this.said.cold) { this.said.cold = true; scene.showThought('so cold, all of a sudden.', 2800); }
  }
}
