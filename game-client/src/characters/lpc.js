// How big the traveler is drawn. LPC frames are 64px with the feet at y=60.
// Out in the world the forest's art is shown at 2x and indoors the cabin's at
// 2.5x, so these two keep the traveler the same size against both.
export const FOREST_SCALE = 1.25;  // out in the world (forest, ending)
export const CABIN_SCALE = 1.5;    // indoors, against the cabin furniture
export const FEET = 28;            // frame pixels from the sprite's centre down to the feet

// The traveler's physics body out in the world: 20x34 on screen, standing on
// the sprite's feet, whatever size the sprite is drawn — so the drawing can
// grow without changing how the jumps, stones and mushrooms play. `lift`
// raises the drawing above the body (sitting on the horse's back).
export function setTravelerBody(sprite, lift = 0) {
  const s = sprite.scaleY;
  sprite.body.setSize(20 / s, 34 / s);
  sprite.body.setOffset(32 - 10 / s, 60 - (34 - lift) / s);
}

export function loadLpcCharacter(scene, characterId) {
  // hurt.png is a single 13-frame row (832x64), not the usual 4-direction sheet
  const sheets = ['idle', 'walk', 'sit', 'jump', 'hurt', 'watering', 'slash'];
  sheets.forEach((name) => {
    scene.load.spritesheet(`${characterId}-${name}-sheet`, `assets/characters/${characterId}/standard/${name}.png`, {
      frameWidth: 64,
      frameHeight: 64
    });
  });
}

export function createLpcAnims(scene, characterId) {
  scene.anims.create({
    key: `${characterId}-idle`,
    frames: scene.anims.generateFrameNumbers(`${characterId}-idle-sheet`, { start: 39, end: 40 }),
    frameRate: 2,
    repeat: -1
  });

  scene.anims.create({
    key: `${characterId}-walk`,
    frames: scene.anims.generateFrameNumbers(`${characterId}-walk-sheet`, { start: 40, end: 47 }),
    frameRate: 10,
    repeat: -1
  });

  scene.anims.create({
    key: `${characterId}-sit`,
    frames: [{ key: `${characterId}-sit-sheet`, frame: 41 }],
    frameRate: 1,
    repeat: -1
  });

  scene.anims.create({
    key: `${characterId}-jump`,
    frames: scene.anims.generateFrameNumbers(`${characterId}-jump-sheet`, { start: 41, end: 43 }),
    frameRate: 8,
    repeat: 0
  });

  scene.anims.create({
    key: `${characterId}-lie`,
    frames: [{ key: `${characterId}-hurt-sheet`, frame: 5 }],
    frameRate: 1,
    repeat: -1
  });

  scene.anims.create({
    key: `${characterId}-rest`,
    frames: [{ key: `${characterId}-sit-sheet`, frame: 40 }],
    frameRate: 1,
    repeat: -1
  });

  scene.anims.create({
    key: `${characterId}-water`,
    frames: scene.anims.generateFrameNumbers(`${characterId}-watering-sheet`, { start: 39, end: 46 }),
    frameRate: 8,
    repeat: 0
  });

  // a handful of earth: crouch to gather it, then a throw from the shoulder
  scene.anims.create({
    key: `${characterId}-toss`,
    frames: [
      { key: `${characterId}-jump-sheet`, frame: 40 }, { key: `${characterId}-jump-sheet`, frame: 40 },
      { key: `${characterId}-slash-sheet`, frame: 40 }, { key: `${characterId}-slash-sheet`, frame: 42 },
      { key: `${characterId}-slash-sheet`, frame: 43 }, { key: `${characterId}-slash-sheet`, frame: 44 },
      { key: `${characterId}-idle-sheet`, frame: 39 }
    ],
    frameRate: 10,
    repeat: 0
  });

  // one frame at frameRate 4 = a 250ms bend-down beat
  scene.anims.create({
    key: `${characterId}-crouch`,
    frames: [{ key: `${characterId}-jump-sheet`, frame: 41 }],
    frameRate: 4,
    repeat: 0
  });
}
