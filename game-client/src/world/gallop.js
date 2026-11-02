// The gallop: open, rolling hills between the tall grass and the river, made
// for riding. Two low swells with a dip between, then the big one, then down
// to the river. A trunk the wind brought down lies across each of the two
// dips; on foot it's a scramble, on the horse a leap. The bird from the
// window is waiting on the first of them.
import Phaser from 'phaser';
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

  // the trunks: after the traveler is made, since they stop them. each is a
  // leap for whoever follows you (world/leaps.js). returns where the bird waits
  place() {
    const scene = this.scene;
    this.trunks = this.trunkXs.map((x) => {
      const ground = scene.hills.surfaceAt(x);
      const art = scene.add.image(x, ground + 4, 'woods-windfall').setOrigin(0.5, 1).setScale(ART).setDepth(6);
      const top = ground - 30;                        // the bark along its back (the moss is softer)
      const half = (art.displayWidth - 16) / 2, mid = x + 4;
      const block = scene.add.rectangle(mid, (top + ground) / 2, half * 2, ground - top).setVisible(false);
      scene.physics.add.existing(block, true);
      scene.physics.add.collider(scene.player, block);
      scene.leaps.add(mid - half, mid + half, top);
      return { x: mid, half, top };
    });
    // the reins are checked inside each physics step, like a wall would be, so
    // the horse simply stands at the trunk however long you keep pushing
    const world = scene.physics.world;
    const reins = () => this.reins();
    world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, reins);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, reins));
    const first = this.trunks[0];
    return [{ x: first.x + 16, y: first.top + 2 }];
  }

  // on the horse you pull up before its nose is in the trunk: the traveler's
  // body is narrow, but the horse reaches out in front of it. `pulledUp` says
  // you're standing at a trunk, pushing on: no walking on the spot
  reins() {
    const scene = this.scene, body = scene.player.body;
    this.pulledUp = false;
    if (!scene.riding || !body.blocked.down || body.velocity.y < 0) return;   // (not as it jumps)
    const dir = Math.sign(body.velocity.x);
    if (!dir) return;
    const middle = body.x + body.halfWidth;
    this.trunks.forEach((t) => {
      const end = t.x - dir * t.half;                 // the end of the trunk you're coming to
      const nose = middle + dir * NOSE;
      if ((end - middle) * dir > 0 && (nose - end) * dir >= 0 && body.bottom > t.top + 4) {
        body.x -= nose - end;
        body.velocity.x = 0;
        this.pulledUp = true;
      }
    });
  }

  // up against a trunk, on foot or on the horse: say which key gets you over it
  against() {
    const body = this.scene.player.body;
    if (this.pulledUp) return true;
    if (!body.blocked.left && !body.blocked.right) return false;
    return this.trunks.some((t) => Math.abs(body.center.x - t.x) < t.half + 30 && body.bottom > t.top + 4);
  }
}

// from the middle of the rider to the tip of the horse's nose
const NOSE = 66;
