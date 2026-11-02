// The quiet stretches between one thing and the next (see world/road.js):
// nothing to do but walk on for a little while. Each has gentle ground, a
// low swell or two, and its own kind of wood: birches, spruce, pines, or
// open grass. In some of them the bird from the window is waiting on a stump.
import { STRETCHES, stretch } from './road.js';

const ART = 2;

// trees for each kind of wood: which ones, and how far apart (screen px)
const WOODS = {
  birch: { kinds: ['birch-a', 'birch-b', 'birch-a', 'birch-b', 'spruce-c'], gap: [120, 220] },
  spruce: { kinds: ['spruce-a', 'spruce-b', 'spruce-c', 'spruce-b'], gap: [90, 170] },
  pine: { kinds: ['pine-a', 'pine-a', 'spruce-b', 'birch-b'], gap: [150, 260] },
  mixed: { kinds: ['spruce-a', 'birch-a', 'pine-a', 'spruce-c', 'birch-b', 'spruce-b'], gap: [120, 230] },
  open: { kinds: ['birch-b', 'spruce-c', 'bush-a'], gap: [380, 600] }
};

// the same throws of the dice every time
function dice(seed) {
  let s = seed * 7919;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// a low swell or two: level at both ends, never steeper than a gentle walk
function lieOfTheLand(length, roll) {
  const swells = length >= 1100 ? 2 : 1;
  const edge = 160, width = (length - edge * 2) / swells;
  const points = [[0, 0], [edge, 0]];
  for (let i = 0; i < swells; i++) {
    const a = edge + i * width;
    const high = Math.max(12, Math.round((width * (0.035 + roll() * 0.015)) / 4) * 4);
    points.push([a + width * 0.42, high], [a + width * 0.58, high], [a + width, 0]);
  }
  points.push([length, 0]);
  return points;
}

export default class Walks {
  // the land goes in first, before the road's ground and dressing are laid
  constructor(scene) {
    this.scene = scene;
    this.list = STRETCHES.filter((s) => s.walk).map((s) => {
      const { from, to } = stretch(s.id);
      const roll = dice(s.walk.seed);
      scene.hills.add(from, lieOfTheLand(s.length, roll));
      return { ...s.walk, id: s.id, from, to, roll };
    });
  }

  // its trees, and a stump for the bird. the last of the road, from the old
  // stag on, already dresses itself by rule (ForestScene), so it's left to that
  dress(prop) {
    this.list.forEach((w) => {
      const roll = w.roll;
      if (w.trees && w.from < this.scene.stagX) {
        const wood = WOODS[w.trees];
        for (let x = w.from + 60 + roll() * 80; x < w.to - 40; x += wood.gap[0] + roll() * (wood.gap[1] - wood.gap[0])) {
          const key = wood.kinds[Math.floor(roll() * wood.kinds.length)];
          if (key.startsWith('bush')) prop(key, x, 4, roll() < 0.5, this.scene.groundY + 3);
          else prop(key, x, 1, roll() < 0.3);
        }
        for (let x = w.from + 200 + roll() * 200; x < w.to - 100; x += 300 + roll() * 300) {
          prop(roll() < 0.5 ? 'bush-a' : 'bush-b', x, 4, roll() < 0.5, this.scene.groundY + 3);
        }
      }
      if (w.bird) {
        w.perchX = Math.round(w.from + (w.to - w.from) * (0.55 + roll() * 0.15));
        prop('stump', w.perchX, 4, false, this.scene.groundY + 3);
      }
    });
  }

  // where the bird waits: on top of the stump
  perches() {
    return this.list.filter((w) => w.perchX).map((w) => ({
      x: w.perchX, y: this.scene.hills.surfaceAt(w.perchX) + 3 - 11 * ART
    }));
  }
}
