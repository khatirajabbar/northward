// The forest's animals are sprite sheets drawn by tools/animals.mjs. This is
// the list of sheets to load and the animations cut from them — the sizes and
// frame numbers mirror FRAMES at the bottom of that file. (The torch and
// campfire flames are drawn the same way, so they live here too.)

const SHEETS = [
  ['horse', 62, 42], ['horse-grey', 62, 42], ['horse-dark', 62, 42], ['foal', 42, 32],
  ['cat', 28, 20], ['rabbit', 22, 17], ['bird', 18, 15], ['doe', 50, 39], ['fawn', 34, 28], ['stag', 68, 38], ['squirrel', 30, 20],
  ['flame', 11, 16], ['campfire', 18, 24]
];

// art pixels from the horse's hooves up to its back — where a rider sits
export const HORSE_BACK = 28;

export function loadAnimals(scene) {
  SHEETS.forEach(([name, frameWidth, frameHeight]) => {
    scene.load.spritesheet(`woods-${name}`, `assets/woods/${name}.png`, { frameWidth, frameHeight });
  });
}

export function createAnimalAnims(scene) {
  const add = (key, sheet, frames, frameRate, repeat = -1) => {
    scene.anims.create({ key, frames: frames.map((frame) => ({ key: `woods-${sheet}`, frame })), frameRate, repeat });
  };

  // every horse has the same moves, whatever its coat
  ['horse', 'horse-grey', 'horse-dark', 'foal'].forEach((h) => {
    add(`${h}-idle`, h, [0, 0, 2, 0, 0, 1, 0, 3, 0, 2], 2.5);     // a breath, a swish of the tail, an ear
    add(`${h}-walk`, h, [4, 5, 6, 7, 8, 9, 10, 11], 10);
    add(`${h}-graze`, h, [12, 13, 12, 13, 12, 12, 13, 12], 2.5);
    add(`${h}-eat`, h, [14, 15, 14, 15, 14, 15, 14, 15], 6, 0);   // a carrot from your hand
  });

  add('cat-stand', 'cat', [0], 1);
  add('cat-walk', 'cat', [0, 1, 2, 3], 8);
  add('cat-sit', 'cat', [4, 4, 4, 4, 5, 4, 4, 5], 3);              // the tip of its tail flicks
  add('cat-scared', 'cat', [6], 1);
  add('cat-held', 'cat', [7], 1);

  add('rabbit-sit', 'rabbit', [0, 0, 0, 1, 0, 0, 1, 0], 4);        // an ear drops and lifts
  add('rabbit-hop', 'rabbit', [2, 3, 4, 5], 12, 0);                // one hop: gather, spring, stretch, land

  ['doe', 'fawn'].forEach((d) => {
    add(`${d}-idle`, d, [0, 0, 0, 1, 0, 0, 1, 1], 2.5);           // an ear turning, listening
    add(`${d}-walk`, d, [2, 3, 4, 5, 6, 7], 10);
    add(`${d}-leap`, d, [8], 1);
    add(`${d}-nose`, d, [9], 1);
    add(`${d}-frightened`, d, [10, 0, 10, 1], 9);
  });

  // the old stag never gets up: what moves is his breathing, and an ear now and then
  add('stag-watching', 'stag', [0, 0, 0, 2, 2, 2, 0, 1, 0, 2, 2, 2], 2);
  add('stag-drinking', 'stag', [3], 1);
  add('stag-tired', 'stag', [4, 4, 4, 5, 5, 5], 2);
  add('stag-asleep', 'stag', [6, 6, 6, 6, 7, 7, 7, 7], 2);

  add('squirrel-sit', 'squirrel', [0, 0, 0, 1, 0, 0, 1, 0], 4);   // nose down, the tail twitching
  add('squirrel-alert', 'squirrel', [2], 1);
  add('squirrel-run', 'squirrel', [3, 4, 5, 6], 14);
  add('squirrel-holding', 'squirrel', [7], 1);
  add('squirrel-peek', 'squirrel', [8], 1);

  add('bird-perch', 'bird', [0], 1);
  add('bird-struggle', 'bird', [0, 1, 2, 1], 10);
  add('bird-fly', 'bird', [3, 4, 5, 6], 14);

  add('flame-burn', 'flame', [0, 1, 2, 3], 8);
  add('campfire-burn', 'campfire', [0, 1, 2, 3], 7);
}
