// The bird from the window. Every morning it sings there and then flies north;
// today you follow it. Now and then it's waiting up ahead (on a fallen trunk,
// a branch, a rock), and when you come near it's off again, north, to wait
// for you somewhere further on.
//
// A perch is { x, y, seen?, gone? }: where it sits (its feet), and what the
// traveler thinks on first seeing it there, and as it flies off.
import { play } from '../audio/sound.js';

const ART = 2;
const NEAR_ON_FOOT = 240;     // how close you get before it goes
const NEAR_RIDING = 320;      // further on a horse: it hears the hooves

// what goes through your head at its stops, in the order you come to them
// (not every stop: most of the time you just watch it go)
const THOUGHTS = [
  { seen: "that's the bird from my window! it came this way too.", gone: "north again. i'm coming, i'm coming." },
  null,
  { seen: 'there it is again. waiting for me.' },
  null,
  { gone: 'still north. always north.' },
  null,
  { seen: "it keeps stopping. as if it wants me to follow." }
];

export default class GuideBird {
  constructor(scene, perches) {
    this.scene = scene;
    this.perches = [...perches].sort((a, b) => a.x - b.x).map((p, i) => ({ ...THOUGHTS[i], ...p }));
    this.at = -1;
    this.flying = false;
    // the sheet faces left, at the traveler coming up the road
    this.sprite = scene.add.sprite(0, 0, 'woods-bird').setOrigin(0.5, 1).setScale(ART).setDepth(8).setVisible(false);
    this.lookAbout = scene.time.addEvent({ delay: 2600, loop: true, callback: () => this.hop() });
  }

  // from wherever the journey starts: perches already behind you are passed
  start(px) {
    this.at = this.perches.findIndex((p) => p.x > px + NEAR_RIDING);
    this.sit();
  }

  sit() {
    const p = this.perches[this.at];
    if (!p) { this.sprite.setVisible(false); return; }
    this.sprite.setPosition(p.x, p.y).setAngle(0).setAlpha(1).setFlipX(false).setVisible(true).play('bird-perch');
    this.seen = 0;
  }

  // a little hop where it sits, and now and then a look the other way
  hop() {
    if (this.flying || !this.sprite.visible) return;
    const p = this.perches[this.at];
    if (Math.random() < 0.35) this.sprite.setFlipX(!this.sprite.flipX);
    this.scene.tweens.add({ targets: this.sprite, y: p.y - 6, duration: 110, yoyo: true, ease: 'Quad.out' });
  }

  update(px) {
    const p = this.perches[this.at];
    if (!p || this.flying) return;
    const cam = this.scene.cameras.main;
    const onScreen = p.x < cam.scrollX + cam.width - 40;
    if (onScreen && !this.seen) {
      this.seen = this.scene.time.now;
      if (p.seen) this.scene.showThought(p.seen, 3600);
    }
    const near = this.scene.riding ? NEAR_RIDING : NEAR_ON_FOOT;
    if (p.x - px < near) this.flyOff(p);
  }

  // up and away north, out of sight, then on to its next perch
  flyOff(p) {
    this.flying = true;
    this.scene.tweens.killTweensOf(this.sprite);
    play(this.scene, 'chirp', { volume: 0.8 });
    this.sprite.setFlipX(true).play('bird-fly');
    this.scene.tweens.add({
      targets: this.sprite, x: p.x + 900, y: p.y - 420, duration: 2200, ease: 'Sine.in',
      onComplete: () => {
        this.flying = false;
        this.at += 1;
        this.sit();
      }
    });
    // what you thought on seeing it gets its time first
    const shown = this.seen ? this.scene.time.now - this.seen : 9999;
    if (p.gone) this.scene.time.delayedCall(Math.max(900, 3200 - shown), () => this.scene.showThought(p.gone, 3400));
  }

}
