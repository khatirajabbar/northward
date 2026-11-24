// The gallop: open, rolling hills between the tall grass and the river, made
// for riding. Two low swells with a dip between, then the big one, then down
// to the river. The bird from the window is waiting on a stump in the first dip.
import { stretch } from './road.js';

// the lie of the land: [how far in, how high above the road], screen pixels
const LAND = [
  [0, 0], [260, 0], [700, 72], [900, 72], [1240, 12], [1520, 12],
  [2040, 112], [2240, 112], [2680, 20], [2900, 20], [3080, 0], [3200, 0]
];
const STUMP = 1400;                 // how far in the bird's stump is, in the first dip

export default class Gallop {
  // the land goes in first, before the road's ground and dressing are laid,
  // so they know where it rises
  constructor(scene) {
    this.scene = scene;
    const { from, to } = stretch('gallop');
    this.from = from;
    this.to = to;
    scene.hills.add(from, LAND);
  }

  // the trees: few, out here in the open — birches on the slopes, a pine on
  // the big hill — and the stump the bird waits on
  dress(prop, dice) {
    [[this.from + 420, 'birch-b'], [this.from + 980, 'birch-a', true], [this.from + 1100, 'spruce-c'],
      [this.from + 1760, 'birch-b', true], [this.from + 2150, 'pine-a'], [this.from + 2560, 'birch-a'],
      [this.from + 3020, 'spruce-b']].forEach(([x, key, flip]) => prop(key, x, 1, !!flip));
    for (let x = this.from + 200; x < this.to - 100; x += 300 + Math.floor(dice() * 220)) {
      prop(dice() < 0.5 ? 'bush-a' : 'bush-b', x, 4, dice() < 0.5, this.scene.groundY + 3);
    }
    prop('stump', this.from + STUMP, 4, false, this.scene.groundY + 3);
  }

  // where the bird waits: on top of the stump
  perches() {
    const x = this.from + STUMP;
    return [{ x, y: this.scene.hills.surfaceAt(x) + 3 - 22 }];
  }
}
