import Phaser from 'phaser';
import { FOREST_SCALE } from '../characters/lpc.js';
import { CREAM } from './guide.js';

// The road north, early in the day, sliding slowly by: a traveler walking, and
// a little way ahead of them the bird they are following, with the game's name
// written over it. The title screen and the menus before the game are all laid
// over this, and it carries on from one to the next without a break.
const ART = 2;                // the forest's art is shown at 2x
const STROLL = 0.42;          // how unhurried: a fraction of the forest's walking pace
const STRIP = 3200;           // the roadside comes round again after this many pixels
const MARGIN = 340;           // …and things swap ends this far off the left edge, out of sight

const TREES = [
  [90, 'spruce-b'], [270, 'birch-a'], [440, 'spruce-a'], [650, 'pine-a'], [770, 'spruce-c'], [1010, 'birch-b'],
  [1180, 'spruce-a'], [1330, 'spruce-b'], [1580, 'oak-a'], [1830, 'spruce-a'], [1960, 'spruce-c'], [2190, 'birch-a'],
  [2360, 'pine-a'], [2540, 'spruce-b'], [2760, 'birch-b'], [2930, 'spruce-a'], [3090, 'spruce-c']
];

// where the walk has got to — kept here, outside any one scene, so the next
// screen picks the road up exactly where the last one left it
const walk = { travel: 0, time: 0, traveler: 'lpc-khatira' };

// the same throws of the dice every time, so the roadside is the same from one screen to the next
function dice(seed) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default class Roadside {
  // `arrive`: the first time it's seen, the game's name comes in slowly
  constructor(scene, { arrive = false } = {}) {
    this.scene = scene;
    const { width, height } = scene.scale;
    const groundY = this.groundY = height - 60;
    const rnd = dice(41);

    // ── sky, and the three lines of trees behind the road ──
    scene.cameras.main.setBackgroundColor('#6fa3bd');
    scene.add.image(0, 0, 'woods-sky').setOrigin(0, 0).setScale(ART).setDepth(-30);
    this.layers = [['woods-far', 0.1, -24], ['woods-mid', 0.22, -23], ['woods-near', 0.4, -22]].map(([key, factor, depth]) => {
      const layer = scene.add.tileSprite(0, 0, width, height, key).setOrigin(0, 0).setTileScale(ART, ART).setDepth(depth);
      layer.factor = factor;
      return layer;
    });
    // morning mist, lying between the tree lines and along the foot of the road's own trees
    scene.add.rectangle(0, groundY - 150, width, 150, 0xeaf4f1, 0.1).setOrigin(0, 0).setDepth(-22.5);
    scene.add.rectangle(0, groundY - 84, width, 84, 0xeaf4f1, 0.13).setOrigin(0, 0).setDepth(-21);

    // ── the road ──
    this.ground = scene.add.tileSprite(0, groundY, width, 80, 'woods-ground').setOrigin(0, 0).setTileScale(ART, ART).setDepth(2);
    this.fringe = scene.add.tileSprite(0, groundY + 2, width, 12, 'woods-fringe').setOrigin(0, 1).setTileScale(ART, ART).setDepth(5);

    // ── the roadside: everything here slides by and comes round again ──
    this.things = [];
    const pick = (list) => list[Math.floor(rnd() * list.length)];
    const put = (key, at, depth, y = groundY + 4, pace = 1) => {
      const thing = scene.add.image(-999, y, `woods-${key}`).setOrigin(0.5, 1).setScale(ART).setDepth(depth).setFlipX(rnd() < 0.5);
      thing.at = at;
      thing.pace = pace;
      this.things.push(thing);
      return thing;
    };
    TREES.forEach(([at, key]) => put(key, at, 1));
    for (let at = 180; at < STRIP; at += 430) put(pick(['bush-a', 'bush-b']), at + rnd() * 120, 4, groundY + 3);
    for (let at = 40; at < STRIP; at += 90) {
      if (rnd() < 0.75) put(pick(['tuft-a', 'tuft-b', 'tuft-b', 'tuft-c']), at + rnd() * 30, 5, groundY + 3);
      if (rnd() < 0.45) put(pick(['flower-white', 'flower-yellow', 'flower-pink']), at + rnd() * 60, 5, groundY + 2);
      if (rnd() < 0.12) put('fern', at + rnd() * 40, 4, groundY + 3);
    }
    // a few things close to the eye, dark and quick, passing in front of everything
    [300, 1350, 2200, 2900].forEach((at, i) => {
      put(i % 2 ? 'bush-a' : 'fern', at, 20, height + 12, 1.7).setScale(ART * 2).setTint(0x23403a);
    });

    // ── the traveler, and the bird that flies north every morning ──
    this.traveler = scene.add.sprite(310, groundY + 5, `${walk.traveler}-walk-sheet`).setOrigin(0.5, 1).setScale(FOREST_SCALE).setDepth(10);
    this.traveler.play(`${walk.traveler}-walk`);
    this.traveler.anims.timeScale = STROLL;
    this.bird = scene.add.sprite(0, 0, 'woods-bird').setScale(ART).setFlipX(true).setDepth(11).play('bird-fly');

    // ── motes in the morning light ──
    this.motes = [];
    for (let i = 0; i < 26; i++) {
      const mote = scene.add.rectangle(Math.random() * width, 120 + Math.random() * (groundY - 160), 2, 2, 0xfff4d6,
        0.25 + Math.random() * 0.35).setDepth(12);
      mote.drift = 5 + Math.random() * 9;
      mote.sway = Math.random() * Math.PI * 2;
      this.motes.push(mote);
    }

    // ── the name of the game ──
    const title = scene.add.image(92, 104, 'ui-title').setOrigin(0, 0).setScale(4).setDepth(41);
    const words = scene.add.bitmapText(98, 246, 'px-edged', 'a small walk north. no hurry.').setScale(3).setTint(CREAM).setDepth(41);
    if (arrive) {
      scene.tweens.add({ targets: title, alpha: { from: 0, to: 1 }, duration: 900, delay: 250 });
      scene.tweens.add({ targets: words, alpha: { from: 0, to: 1 }, duration: 900, delay: 900 });
    }

    this.place();
    scene.events.on('update', this.update, this);
    scene.events.once('shutdown', () => scene.events.off('update', this.update, this));
  }

  // who is walking — the menus change this to whoever is being looked at
  setTraveler(id) {
    if (id === walk.traveler) return;
    walk.traveler = id;
    const stride = this.traveler.anims.getProgress();
    this.traveler.play(`${id}-walk`);
    this.traveler.anims.setProgress(stride);
    this.traveler.anims.timeScale = STROLL;
  }

  // put everything where it is at this moment of the walk
  place() {
    const { width } = this.scene.scale;
    const { travel, time } = walk;
    this.layers.forEach((layer) => { layer.tilePositionX = travel * layer.factor / ART; });
    this.ground.tilePositionX = travel / ART;
    this.fringe.tilePositionX = travel / ART;
    this.things.forEach((thing) => {
      thing.x = Math.round(Phaser.Math.Wrap(thing.at - travel * thing.pace, -MARGIN, STRIP - MARGIN));
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
    const step = Math.min(delta, 50);
    walk.travel += 220 * STROLL * step / 1000;
    walk.time += step;
    this.place();
  }
}
