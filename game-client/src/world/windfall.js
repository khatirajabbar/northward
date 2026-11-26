// The windfall: after the squirrel, a storm has brought trees down across the
// road. One to get over; then one you climb onto and a long one lying across
// it and the next, twice as high, that you walk along and drop off the end of;
// then a pile of two, which takes a jump from right up against it. The cat
// keeps to the tops of them and hops up and down as you do. Right after it,
// the duckling is stuck behind one more fallen tree.
import { stretch } from './road.js';

const ART = 2;
const LIFT = 30;             // one trunk lying on another sits this much higher

// the trunks: where each lies (its middle, how far in), its picture, and how
// many trunks down it lies (0 on the ground, 1 on top of another)
const TRUNKS = [
  { at: 300, art: 'windfall', up: 0 },
  { at: 620, art: 'windfall', up: 0 },          // the one you climb onto…
  { at: 830, art: 'windfall', up: 0 },          // …the one under the far end of the long one…
  { at: 790, art: 'trunk-long', up: 1 },        // …and the long one, across the two
  { at: 1240, art: 'windfall', up: 0 },         // the pile
  { at: 1260, art: 'windfall', up: 1 }
];
// the bark you stand on, from the picture's middle: [left, right]
const SPAN = { windfall: [-70, 78], 'trunk-long': [-172, 174] };

export default class Windfall {
  constructor(scene) {
    this.scene = scene;
    const { from, to } = stretch('windfall');
    this.from = from;
    this.to = to;
    const g = scene.groundY;
    // each trunk as a box from its top right down to the ground: there's no
    // getting under the ones lying up on the others, so their ends are walls
    // to climb, never a gap to squeeze into
    this.trunks = TRUNKS.map((t) => {
      const [l, r] = SPAN[t.art];
      return { ...t, x: from + t.at, left: from + t.at + l, right: from + t.at + r, top: g - (t.up + 1) * LIFT, bottom: g };
    });
    this.said = {};
  }

  // the trunks, and what the storm left standing about them
  dress(prop) {
    const scene = this.scene, g = scene.groundY;
    this.trunks.forEach((t) => {
      scene.add.image(t.x, g + 4 - t.up * LIFT, `woods-${t.art}`).setOrigin(0.5, 1).setScale(ART).setDepth(6);
    });
    [[60, 'spruce-b'], [160, 'snag'], [460, 'birch-b', true], [1000, 'snag', true], [1100, 'spruce-a'],
      [1420, 'bare-a'], [1530, 'spruce-c', true]].forEach(([d, key, flip]) => prop(key, this.from + d, 1, !!flip));
    [[440, 'stump'], [1080, 'stump'], [1460, 'bush-b']].forEach(([d, key]) => prop(key, this.from + d, 4, false, g + 3));
  }

  // after the traveler is made: each trunk stops you, and wherever the tops
  // step up or down is a hop for the cat. returns where the bird waits
  place() {
    const scene = this.scene;
    this.trunks.forEach((t) => {
      const box = scene.add.rectangle((t.left + t.right) / 2, (t.top + t.bottom) / 2, t.right - t.left, t.bottom - t.top).setVisible(false);
      scene.physics.add.existing(box, true);
      scene.physics.add.collider(scene.player, box);
    });
    const ground = scene.groundY;
    const edges = [...new Set(this.trunks.flatMap((t) => [t.left, t.right]))].sort((a, b) => a - b);
    edges.forEach((e) => {
      const before = this.floorAt(e - 2) ?? ground, after = this.floorAt(e + 2) ?? ground;
      if (before !== after) scene.leaps.add(e - 1, e + 1, Math.min(before, after));
    });
    const long = this.trunks.find((t) => t.art === 'trunk-long');
    return [{ x: long.x + 40, y: long.top + 1 }];
  }

  // the top you'd stand on at x — the highest trunk there — or null if none
  floorAt(x) {
    const under = this.trunks.filter((t) => x >= t.left && x <= t.right);
    return under.length ? Math.min(...under.map((t) => t.top)) : null;
  }

  update(px) {
    // coming to them, not back over them
    if (!this.said.first && !this.scene.player.flipX && px > this.from + 40 && px < this.from + 300) {
      this.said.first = true;
      this.scene.showThought('trees down across the road. a storm, and not long ago.', 3600);
    }
  }

  // up against a trunk: say which key gets you over it
  against() {
    const body = this.scene.player.body;
    if (!body.blocked.right && !body.blocked.left) return false;
    const middle = body.x + body.halfWidth;
    return this.trunks.some((t) => body.bottom > t.top + 4 && body.bottom <= t.bottom + 4 &&
      (Math.abs(middle - t.left) < 24 || Math.abs(middle - t.right) < 24));
  }
}
