// The gallop: open, rolling hills between the tall grass and the river, made
// for riding. Two low swells with a dip between, then the big one, then down
// to the river. A trunk the wind brought down lies across each of the two
// dips; on foot it's a scramble, on the horse a leap. The bird from the
// window is waiting on the first of them.
import { stretch } from './road.js';

const ART = 2;

// the lie of the land: [how far in, how high above the road], screen pixels
const LAND = [
  [0, 0], [260, 0], [700, 72], [900, 72], [1240, 12], [1520, 12],
  [2040, 112], [2240, 112], [2680, 20], [2900, 20], [3080, 0], [3200, 0]
];
const TRUNKS = [1380, 2790];        // how far in each one lies, in the middle of its dip

export default class Gallop {
  // the land goes in first, before the road's ground and dressing are laid,
  // so they know where it rises
  constructor(scene) {
    this.scene = scene;
    const { from, to } = stretch('gallop');
    this.from = from;
    this.to = to;
    scene.hills.add(from, LAND);
    this.trunkXs = TRUNKS.map((d) => from + d);
  }

  // the trees: few, out here in the open — birches on the slopes, a pine on the big hill
  dress(prop, dice) {
    const clear = (x) => this.trunkXs.every((t) => Math.abs(x - t) > 150);
    [[this.from + 420, 'birch-b'], [this.from + 980, 'birch-a', true], [this.from + 1100, 'spruce-c'],
      [this.from + 1760, 'birch-b', true], [this.from + 2150, 'pine-a'], [this.from + 2560, 'birch-a'],
      [this.from + 3020, 'spruce-b']].forEach(([x, key, flip]) => prop(key, x, 1, !!flip));
    for (let x = this.from + 200; x < this.to - 100; x += 300 + Math.floor(dice() * 220)) {
      if (clear(x)) prop(dice() < 0.5 ? 'bush-a' : 'bush-b', x, 4, dice() < 0.5, this.scene.groundY + 3);
    }
  }

  // the trunks, and the bird: after the traveler is made, since the trunks stop them
  place() {
    const scene = this.scene;
    this.trunks = this.trunkXs.map((x) => {
      const ground = scene.hills.surfaceAt(x);
      const art = scene.add.image(x, ground + 4, 'woods-windfall').setOrigin(0.5, 1).setScale(ART).setDepth(6);
      const top = ground - 30;                        // the bark along its back (the moss is softer)
      const block = (w) => {
        const r = scene.add.rectangle(x + 4, (top + ground) / 2, w, ground - top).setVisible(false);
        scene.physics.add.existing(r, true);
        return r;
      };
      // on foot you stop at the bark; on the horse a little sooner, so its
      // head doesn't go through the trunk before it pulls up
      const onFoot = block(art.displayWidth - 16);
      const mounted = block(art.displayWidth + 60);
      scene.physics.add.collider(scene.player, onFoot, null, () => !scene.riding);
      scene.physics.add.collider(scene.player, mounted, null, () => scene.riding);
      return { x, top, onFoot, mounted };
    });
    const first = this.trunks[0];
    return [{
      x: first.x + 20, y: first.top + 2,
      seen: "that's the bird from my window! it came this way too.",
      gone: "north again. i'm coming, i'm coming."
    }];
  }

  // the horse (or the cat) walking along after you hops over a trunk rather
  // than through it: how far it's lifted at x
  hop(x) {
    for (const t of this.trunks) {
      const half = 100, d = x - (t.x + 4);
      if (Math.abs(d) < half) {
        const ground = this.scene.hills.surfaceAt(x);
        return Math.sin(((d + half) / (2 * half)) * Math.PI) * (ground - t.top + 8);
      }
    }
    return 0;
  }

  // pushing up against a trunk: say which key gets you over it
  against() {
    const body = this.scene.player.body;
    if (!body.blocked.left && !body.blocked.right) return false;
    const x = body.center.x;
    return this.trunks.some((t) => Math.abs(x - t.x) < 150 && body.bottom > t.top + 4);
  }
}
