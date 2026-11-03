// The stone stair: just past the cat, four rocks stand up out of the ground,
// each a step higher than the one before, one small jump each. At the top
// there's a flat lookout with no trees in the way, and then a long, easy
// slope back down to the road. Nothing to fall into: a missed jump just means
// trying again. The cat comes up after you, a hop at a time.
import { stretch } from './road.js';

const ART = 2;

// the steps: where each one starts (how far in), how high its top is above
// the road, and its rock. each rock leans out a little over the step below it
// (LIP), and the last one is the edge of the lookout. the rock pictures are
// drawn to these sizes in tools/forest-art.mjs
const STEPS = [
  { at: 260, up: 40, art: 'ledge-1' },
  { at: 350, up: 80, art: 'ledge-2' },
  { at: 440, up: 120, art: 'ledge-3' },
  { at: 530, up: 160, art: 'ledge-4' }
];
const LIP = 8;
const TOP = { from: 530, to: 860 };      // the lookout
const DOWN = 1580;                        // where the slope down meets the road again

export default class StoneStair {
  // the land goes in first, before the road's ground and dressing are laid
  constructor(scene) {
    this.scene = scene;
    const { from, to } = stretch('stone-stair');
    this.from = from;
    this.to = to;
    const land = [[0, 0]];
    STEPS.forEach((s, i) => land.push([s.at, i ? STEPS[i - 1].up : 0], [s.at, s.up]));
    land.push([TOP.to, STEPS[STEPS.length - 1].up], [DOWN, 0], [to - from, 0]);
    scene.hills.add(from, land);
    this.steps = STEPS.map((s) => ({ ...s, x: from + s.at, top: scene.groundY - s.up }));
    this.top = { from: from + TOP.from, to: from + TOP.to, y: scene.groundY - STEPS[STEPS.length - 1].up };
  }

  // the rocks, and a few trees: at the foot of the stair and down the slope,
  // none on the lookout
  dress(prop, dice) {
    const scene = this.scene;
    this.steps.forEach((s) => {
      scene.add.image(s.x - LIP - ART, scene.groundY + 4 + ART, `woods-${s.art}`).setOrigin(0, 1).setScale(ART).setDepth(3);
    });
    [[60, 'birch-a'], [150, 'spruce-c', true], [930, 'spruce-b'], [1060, 'birch-b', true], [1190, 'spruce-a'],
      [1330, 'birch-a'], [1450, 'pine-a', true], [1650, 'spruce-b']].forEach(([d, key, flip]) => prop(key, this.from + d, 1, !!flip));
    for (let d = 960; d < 1620; d += 180 + Math.floor(dice() * 160)) {
      prop(dice() < 0.5 ? 'bush-a' : 'bush-b', this.from + d, 4, dice() < 0.5, scene.groundY + 3);
    }
  }

  // after the traveler is made: the face of each rock is a wall you jump up,
  // not one the ground lifts you over, and each is a leap for the cat
  place() {
    const scene = this.scene;
    this.steps.forEach((s) => {
      const wall = scene.add.rectangle(s.x - 3, (s.top + scene.groundY) / 2, 6, scene.groundY - s.top).setVisible(false);
      scene.physics.add.existing(wall, true);
      scene.physics.add.collider(scene.player, wall);
      scene.leaps.add(s.x - 1, s.x + 1, s.top);
    });
  }

  // the bird waits on the edge of the lookout
  perches() {
    const last = this.steps[this.steps.length - 1];
    return [{ x: last.x + 36, y: last.top + 1 }];
  }

  update(px) {
    const body = this.scene.player.body;
    if (!this.saidTop && px > this.top.from + 20 && px < this.top.to && body.blocked.down && body.bottom <= this.top.y + 4) {
      this.saidTop = true;
      this.scene.showThought('you can see for miles from up here.', 3600);
    }
  }

  // up against a rock: say which key gets you up it
  against() {
    const body = this.scene.player.body;
    if (!body.blocked.right && !body.blocked.left) return false;
    const middle = body.x + body.halfWidth;
    return this.steps.some((s) => Math.abs(middle - s.x) < 24 && body.bottom > s.top + 4);
  }
}
