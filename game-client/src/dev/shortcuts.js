// Development only — not part of the published game. The scenes load this file
// only when import.meta.env.DEV is true (the local dev server); a production
// build never asks for it, so it isn't in the bundle.
//
// The number keys set you down along the road, so a puzzle can be tried
// without the walk to it. In the morning the same keys skip straight out to
// that place, bag packed.
import { setTravelerBody } from '../characters/lpc.js';
import { along } from '../world/road.js';

const KEYS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO', 'MINUS', 'PLUS', 'OPEN_BRACKET', 'CLOSED_BRACKET', 'G', 'T', 'B', 'N', 'O', 'H', 'K'];   // PLUS is the = key
const HINT = 'test keys: 1-9, 0, -, =, [, ], g, t, b, n, o, h and k jump along the road';

// key → [what's there, where to stand] — a little before each thing, so you arrive at it
function stops(forest) {
  return {
    ONE: ['the start', 120],
    TWO: ['the fox cub', forest.fox.logX - 330],
    THREE: ['the horse', along(2180)],
    FOUR: ['the stepping stones', forest.torchX + 20],
    FIVE: ['the mushroom hill', along(5640)],
    SIX: ['the bird in the thorns', forest.brambleTorchX - 60],
    SEVEN: ['the resting tree', forest.restTreeX - 280],
    EIGHT: ['the fawn', forest.restTorchX - 60],
    NINE: ['the squirrel', forest.acornTorchX - 60],
    ZERO: ['the duckling', forest.duckLogX - 230],
    MINUS: ['the old stag', forest.stagX - 340],
    PLUS: ['the bumblebee', forest.beeX - 300],
    OPEN_BRACKET: ['the turtle', forest.turtleX - 300],
    CLOSED_BRACKET: ['the broken bridge', forest.brookL - 800],
    G: ['the gallop', forest.gallop.from - 160],
    T: ['the stone stair', forest.stair.from + 60],
    B: ['the boardwalk', forest.boardwalk.from + 40],
    N: ['the windfall', forest.windfall.from + 20],
    O: ['the moose', forest.moose.from - 40],
    H: ['the fish', forest.fish.x - 320],
    K: ['the owl chick', forest.owl.from + 20]
  };
}

// what must already have happened for you to be standing at x: the horse fed,
// the tall grass ridden through, the goodbye said at the meadow. set the same
// way a saved journey restores them, so the task list isn't left pointing back
function catchUp(forest, x) {
  const grassLeft = forest.grassX - forest.grassWidth / 2;
  if (x > grassLeft - 100 && !forest.horseFed) {
    forest.horseFed = true;
    forest.physics.world.removeCollider(forest.horseGateCollider);
  }
  if (x > grassLeft + forest.grassWidth && !forest.grassLearned) {
    forest.grassLearned = true;
    forest.grassLearnedShown = true;
    if (forest.grassWallCollider) { forest.physics.world.removeCollider(forest.grassWallCollider); forest.grassWallCollider = null; }
  }
  if (x > forest.meadowX + 100 && !forest.saidGoodbye) {
    forest.saidGoodbye = true;
    forest.horseSprite.x = forest.meadowX - 30;
    forest.horseSprite.play('horse-graze');
  }
}

function jumpTo(forest, name, x) {
  if (forest.endingTriggered) return;
  // on your own feet, whatever you were doing
  if (forest.resting) { forest.resting = false; forest.player.body.setAllowGravity(true); }
  if (forest.riding) { forest.riding = false; setTravelerBody(forest.player); }
  catchUp(forest, x);
  forest.player.setVelocity(0, 0);
  forest.player.setPosition(x, forest.standY);
  if (forest.catFollowing) forest.catSprite.setPosition(x - 50, forest.hills.surfaceAt(x - 50) + 2);
  forest.cameras.main.centerOn(x, forest.player.y);          // no long slide across the forest
  forest.guide.tip([], `jumped to ${name}`, 1800);
}

// in the forest: each key jumps to its place
export function forestShortcuts(forest) {
  const places = stops(forest);
  KEYS.forEach((key) => forest.input.keyboard.on(`keydown-${key}`, () => jumpTo(forest, ...places[key])));
  // arriving from the morning by one of the same keys
  const from = forest.registry.get('devJump');
  forest.registry.remove('devJump');
  if (from && places[from]) jumpTo(forest, ...places[from]);
  else forest.time.delayedCall(forest.saved.place === 'start' ? 10500 : 1500, () => forest.guide.tip([], HINT, 5000));
}

// in the morning: the same keys skip it
export function morningShortcuts(morning) {
  KEYS.forEach((key) => morning.input.keyboard.on(`keydown-${key}`, () => {
    morning.registry.set('inventory', { bread: 1, water: 1, rope: 1 });
    morning.registry.set('devJump', key);
    morning.scene.start('ForestScene');
  }));
  morning.time.delayedCall(1200, () => morning.guide.tip([], HINT, 5000));
}
