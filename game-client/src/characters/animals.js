// The forest's animals are sprite sheets drawn by tools/animals.mjs. This is
// the list of sheets to load and the animations cut from them — the sizes and
// frame numbers mirror FRAMES at the bottom of that file. (The torch and
// campfire flames are drawn the same way, so they live here too.)

const SHEETS = [
  ['horse', 62, 42], ['horse-grey', 62, 42], ['horse-dark', 62, 42], ['foal', 42, 32],
  ['cat', 28, 20], ['rabbit', 22, 17], ['bird', 18, 15], ['flame', 11, 16], ['campfire', 18, 24]
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

  add('bird-perch', 'bird', [0], 1);
  add('bird-struggle', 'bird', [0, 1, 2, 1], 10);
  add('bird-fly', 'bird', [3, 4, 5, 6], 14);

  add('flame-burn', 'flame', [0, 1, 2, 3], 8);
  add('campfire-burn', 'campfire', [0, 1, 2, 3], 7);
}
