// The road through the forest, as a list of the stretches put into it.
//
// Every place along the road (each puzzle, torch and tree) was first set
// down on a shorter road, and ForestScene still writes those first
// positions. `along()` carries each one on past every stretch put in before
// it. So making the road longer is one line here, and everything after the
// new stretch moves up by itself.
//
// Most stretches are a quiet bit of road between one thing and the next,
// time to just walk for a while (`walk`: its trees, and whether the bird
// from the window is waiting there). The gallop is a stretch of its own
// (world/gallop.js). Four of the quiet ones are where the stone stair, the
// boardwalk, the windfall and the sunset ridge will go.
//
// Every length is a multiple of 16: the road's ground is laid in 16px tiles,
// so whatever comes after a stretch (a river bank, the brook) still meets the
// tiles exactly the way it did before.

export const STRETCHES = [
  { id: 'past-the-carrots', at: 1220, length: 704, walk: { trees: 'birch', seed: 1 } },
  { id: 'past-the-fox', at: 2120, length: 1008, walk: { trees: 'spruce', seed: 2, bird: true } },
  // open, rolling hills you ride over, between the tall grass and the river
  { id: 'gallop', at: 3200, length: 3200 },
  { id: 'over-the-river', at: 4300, length: 1008, walk: { trees: 'open', seed: 3 } },
  { id: 'on-alone', at: 4880, length: 1296, walk: { trees: 'mixed', seed: 4, bird: true } },
  { id: 'past-the-stones', at: 5470, length: 1008, walk: { trees: 'pine', seed: 5 } },
  { id: 'stone-stair', at: 6750, length: 1200, walk: { trees: 'birch', seed: 6, bird: true } },
  { id: 'past-the-thorns', at: 7480, length: 1008, walk: { trees: 'spruce', seed: 7 } },
  { id: 'boardwalk', at: 8680, length: 1200, walk: { trees: 'mixed', seed: 8, bird: true } },
  { id: 'past-the-mud', at: 9860, length: 1008, walk: { trees: 'pine', seed: 9 } },   // past where the doe and fawn run off
  { id: 'windfall', at: 10880, length: 1200, walk: { trees: 'spruce', seed: 10, bird: true } },
  { id: 'past-the-pond', at: 12460, length: 1008, walk: { trees: 'birch', seed: 11 } },
  { id: 'sunset-ridge', at: 12980, length: 1200, walk: { seed: 12, bird: true } },
  { id: 'past-the-bee', at: 13780, length: 896, walk: { seed: 13 } },
  { id: 'past-the-turtle', at: 14100, length: 896, walk: { seed: 14, bird: true } }
];

// a position on the first road → where it is now
export function along(x) {
  return STRETCHES.reduce((now, s) => (x >= s.at ? now + s.length : now), x);
}

// where a stretch lies now: its first step and its last
export function stretch(id) {
  const s = STRETCHES.find((t) => t.id === id);
  const from = along(s.at) - s.length;
  return { from, to: from + s.length };
}
