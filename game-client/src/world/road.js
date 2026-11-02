// The road through the forest, as a list of the stretches put into it.
//
// Every place along the road (each puzzle, torch and tree) was first set
// down on a shorter road, and ForestScene still writes those first
// positions. `along()` carries each one on past every stretch put in before
// it. So making the road longer is one line here, and everything after the
// new stretch moves up by itself.

export const STRETCHES = [
  // open, rolling hills you ride over, between the tall grass and the river
  { id: 'gallop', at: 3200, length: 3200 }
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
