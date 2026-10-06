// Journey state that has to survive save & resume. The game service stores one
// short checkpoint string per session (40 chars max), so everything is packed
// into it:  "<place>;t<seconds>;c<carrots>;f<field mask>;m<meadow mask>;b<flags>"
// e.g.      "torch-2;t312;c4;f31;m3;b47"

export const FLAGS = {
  tree: 1,          // the weak tree was watered
  horseFed: 2,      // the horse ate its carrot — the gate is open, it follows you
  grassLearned: 4,  // rode through the tall grass — it's passable on foot now
  goodbye: 8,       // the horse stayed with its friends in the meadow
  cat: 16,          // the cat came down from the cliff and follows you
  bird: 32,         // the bird was freed from the bramble
  fox: 64           // the fox cub came out for the bread
};

// play time in seconds — only counts while a story scene is actually running,
// so pausing, quitting and coming back another day don't inflate the time
export const clock = { seconds: 0 };

export function tickClock(scene) {
  clock.seconds += scene.game.loop.delta / 1000;
}

export function encodeProgress({ place = 'start', carrots = 0, field = 0, meadow = 0, flags = 0 } = {}) {
  return [
    place,
    't' + Math.floor(clock.seconds),
    'c' + carrots,
    'f' + field,
    'm' + meadow,
    'b' + flags
  ].join(';');
}

export function decodeProgress(str) {
  const state = { place: 'start', seconds: 0, carrots: 0, field: 0, meadow: 0, flags: 0, saved: false };
  if (!str) return state;

  const [place, ...parts] = String(str).split(';');
  state.place = place || 'start';
  state.saved = true;

  if (parts.length === 0) {
    // an older save that only stored the torch id. you can't reach a torch
    // without the things before it, so fill those in
    if (place === 'torch-1') state.flags = FLAGS.horseFed | FLAGS.grassLearned;
    if (place === 'torch-2' || place === 'torch-3') state.flags = FLAGS.horseFed | FLAGS.grassLearned | FLAGS.goodbye;
    return state;
  }

  parts.forEach((part) => {
    const value = parseInt(part.slice(1), 10) || 0;
    if (part[0] === 't') state.seconds = value;
    if (part[0] === 'c') state.carrots = value;
    if (part[0] === 'f') state.field = value;
    if (part[0] === 'm') state.meadow = value;
    if (part[0] === 'b') state.flags = value;
  });
  return state;
}

// the same saved state, stamped with the current play time
export function withCurrentTime(str) {
  const state = decodeProgress(str);
  return encodeProgress({
    place: state.place,
    carrots: state.carrots,
    field: state.field,
    meadow: state.meadow,
    flags: state.flags
  });
}
