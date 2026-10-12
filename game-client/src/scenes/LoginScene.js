import Phaser from 'phaser';
import { FOREST_SCALE } from '../characters/lpc.js';
import { CREAM } from '../ui/guide.js';

// The title — the first thing anyone sees. The road north, early in the day,
// sliding slowly by: a traveler walking, and a little way ahead of them the
// bird they are following. The game's name is written over it. The sign-in
// form (a wooden board on two ropes, in index.html) hangs on top, on the
// right; main.js lets it down when this scene says it's ready.
const ART = 2;                // the forest's art is shown at 2x
const STROLL = 0.42;          // how unhurried: a fraction of the forest's walking pace
const STRIP = 3200;           // the roadside comes round again after this many pixels
const MARGIN = 340;           // …and things swap ends this far off the left edge, out of sight

const TREES = [
  [90, 'spruce-b'], [270, 'birch-a'], [440, 'spruce-a'], [650, 'pine-a'], [770, 'spruce-c'], [1010, 'birch-b'],
  [1180, 'spruce-a'], [1330, 'spruce-b'], [1580, 'oak-a'], [1830, 'spruce-a'], [1960, 'spruce-c'], [2190, 'birch-a'],
  [2360, 'pine-a'], [2540, 'spruce-b'], [2760, 'birch-b'], [2930, 'spruce-a'], [3090, 'spruce-c']
];

export default class LoginScene extends Phaser.Scene {
  constructor() {
    super('LoginScene');
  }

  create() {
    const { width, height } = this.scale;
    this.groundY = height - 60;
    this.travel = 0;            // how far the road has slid by

    // ── sky, and the three lines of trees behind the road ──
    this.cameras.main.setBackgroundColor('#6fa3bd');
    this.add.image(0, 0, 'woods-sky').setOrigin(0, 0).setScale(ART).setDepth(-30);
    this.layers = [['woods-far', 0.1, -24], ['woods-mid', 0.22, -23], ['woods-near', 0.4, -22]].map(([key, factor, depth]) => {
      const layer = this.add.tileSprite(0, 0, width, height, key).setOrigin(0, 0).setTileScale(ART, ART).setDepth(depth);
      layer.factor = factor;
      return layer;
    });
    // morning mist, lying between the tree lines and along the foot of the road's own trees
    this.add.rectangle(0, this.groundY - 150, width, 150, 0xeaf4f1, 0.1).setOrigin(0, 0).setDepth(-22.5);
    this.add.rectangle(0, this.groundY - 84, width, 84, 0xeaf4f1, 0.13).setOrigin(0, 0).setDepth(-21);

    // ── the road ──
    this.ground = this.add.tileSprite(0, this.groundY, width, 80, 'woods-ground').setOrigin(0, 0).setTileScale(ART, ART).setDepth(2);
    this.fringe = this.add.tileSprite(0, this.groundY + 2, width, 12, 'woods-fringe').setOrigin(0, 1).setTileScale(ART, ART).setDepth(5);

    // ── the roadside: everything here slides by and comes round again ──
    this.roadside = [];
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const put = (key, at, depth, y = this.groundY + 4, pace = 1) => {
      const thing = this.add.image(-999, y, `woods-${key}`).setOrigin(0.5, 1).setScale(ART).setDepth(depth).setFlipX(Math.random() < 0.5);
      thing.at = at;
      thing.pace = pace;
      this.roadside.push(thing);
      return thing;
    };
    TREES.forEach(([at, key]) => put(key, at, 1));
    for (let at = 180; at < STRIP; at += 430) put(pick(['bush-a', 'bush-b']), at + Math.random() * 120, 4, this.groundY + 3);
    for (let at = 40; at < STRIP; at += 90) {
      if (Math.random() < 0.75) put(pick(['tuft-a', 'tuft-b', 'tuft-b', 'tuft-c']), at + Math.random() * 30, 5, this.groundY + 3);
      if (Math.random() < 0.45) put(pick(['flower-white', 'flower-yellow', 'flower-pink']), at + Math.random() * 60, 5, this.groundY + 2);
      if (Math.random() < 0.12) put('fern', at + Math.random() * 40, 4, this.groundY + 3);
    }
    // a few things close to the eye, dark and quick, passing in front of everything
    [300, 1350, 2200, 2900].forEach((at, i) => {
      put(i % 2 ? 'bush-a' : 'fern', at, 20, height + 12, 1.7).setScale(ART * 2).setTint(0x23403a);
    });

    // ── the traveler, and the bird that flies north every morning ──
    this.traveler = this.add.sprite(310, this.groundY + 5, 'lpc-khatira-walk-sheet').setOrigin(0.5, 1).setScale(FOREST_SCALE).setDepth(10);
    this.traveler.play('lpc-khatira-walk');
    this.traveler.anims.timeScale = STROLL;
    this.bird = this.add.sprite(0, 0, 'woods-bird').setScale(ART).setFlipX(true).setDepth(11).play('bird-fly');

    // ── motes in the morning light ──
    this.motes = [];
    for (let i = 0; i < 26; i++) {
      const mote = this.add.rectangle(Math.random() * width, 120 + Math.random() * (this.groundY - 160), 2, 2, 0xfff4d6,
        0.25 + Math.random() * 0.35).setDepth(12);
      mote.drift = 5 + Math.random() * 9;
      mote.sway = Math.random() * Math.PI * 2;
      this.motes.push(mote);
    }

    // ── the name of the game ──
    const title = this.add.image(92, 104, 'ui-title').setOrigin(0, 0).setScale(4).setDepth(41).setAlpha(0);
    const words = this.add.bitmapText(98, 246, 'px-edged', 'a small walk north. no hurry.').setScale(3).setTint(CREAM).setDepth(41).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 900, delay: 250 });
    this.tweens.add({ targets: words, alpha: 1, duration: 900, delay: 900 });

    this.place(0);
    this.cameras.main.fadeIn(700, 0, 0, 0);
    this.game.events.emit('title-ready');
  }

  // put everything where it is at this moment of the walk
  place(time) {
    const { width } = this.scale;
    this.layers.forEach((layer) => { layer.tilePositionX = this.travel * layer.factor / ART; });
    this.ground.tilePositionX = this.travel / ART;
    this.fringe.tilePositionX = this.travel / ART;
    this.roadside.forEach((thing) => {
      thing.x = Math.round(Phaser.Math.Wrap(thing.at - this.travel * thing.pace, -MARGIN, STRIP - MARGIN));
    });
    // the bird keeps ahead — now a little further, now waiting for you — and rides the air
    this.bird.setPosition(
      Math.round(this.traveler.x + 190 + Math.sin(time * 0.00043) * 80 + Math.sin(time * 0.0013) * 14),
      Math.round(this.groundY - 150 + Math.sin(time * 0.0021) * 14 + Math.sin(time * 0.00061) * 30));
    this.motes.forEach((mote) => {
      mote.x -= mote.drift * 0.016;
      mote.y += Math.sin(time * 0.0008 + mote.sway) * 0.12;
      if (mote.x < -4) mote.x = width + 4;
    });
  }

  update(time, delta) {
    this.travel += 220 * STROLL * Math.min(delta, 50) / 1000;
    this.place(time);
  }
}
