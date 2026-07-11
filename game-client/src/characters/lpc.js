export function loadLpcCharacter(scene, characterId) {
  // hurt.png is a single 13-frame row (832x64), not the usual 4-direction sheet
  const sheets = ['idle', 'walk', 'sit', 'jump', 'hurt', 'watering'];
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

  // one frame at frameRate 4 = a 250ms bend-down beat
  scene.anims.create({
    key: `${characterId}-crouch`,
    frames: [{ key: `${characterId}-jump-sheet`, frame: 41 }],
    frameRate: 4,
    repeat: 0
  });
}
