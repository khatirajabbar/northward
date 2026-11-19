import Phaser from 'phaser';
import { loadLpcCharacter, createLpcAnims } from '../characters/lpc.js';
import { loadAnimals, createAnimalAnims } from '../characters/animals.js';
import { loadSounds } from '../audio/sound.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const { width, height } = this.scale;

    // while everything loads: the game's own lettering, which the page brings
    // as a font file (the drawn letters aren't loaded yet — they're in the queue below)
    const waiting = [
      this.add.text(width / 2, height / 2 - 30, 'northward', { fontFamily: 'northward, monospace', fontSize: '60px', color: '#f7efd9' }),
      this.add.text(width / 2, height / 2 + 34, 'loading the forest...', { fontFamily: 'northward, monospace', fontSize: '20px', color: '#8a9aa0' })
    ];
    waiting.forEach((text) => text.setOrigin(0.5));
    // if the font file arrives after the words were first drawn, draw them again
    if (document.fonts) document.fonts.load('20px northward').then(() => waiting.forEach((text) => { if (text.active) text.updateText(); }));

    loadLpcCharacter(this, 'lpc-khatira');
    loadLpcCharacter(this, 'lpc-oliver');


    // the invisible tiles the forest's ground and the bridge's boards are made of
    this.load.image('grass', 'assets/tiles/grass.png');

    // The morning cabin — drawn by tools/cabin-art.mjs: the far distance, the
    // clearing with the whole house, and the pieces the scene moves, swaps or layers
    ['backdrop', 'scene', 'quilt', 'quilt-lump', 'sleeper-khatira', 'sleeper-oliver', 'window-front',
      'curtain-shut', 'curtain-open', 'bird', 'sofa', 'mug', 'bowl', 'bowl-cereal', 'bowl-milk',
      'fridge', 'fridge-open', 'fridge-plant', 'bag', 'door-shut', 'door-open',
      'glow', 'sunlight', 'puff', 'steam', 'note', 'sparkle', 'zzz'
    ].forEach((name) => this.load.image(`home-${name}`, `assets/home/${name}.png`));

    // The forest — drawn by tools/forest-art.mjs: sky, the tree lines behind
    // the road, the ground, and every prop along the way
    ['sky', 'far', 'mid', 'near', 'ground', 'fringe',
      'spruce-a', 'spruce-b', 'spruce-c', 'pine-a', 'birch-a', 'birch-b', 'oak-a', 'bush-a', 'bush-b',
      'tuft-a', 'tuft-b', 'tuft-c', 'flower-white', 'flower-yellow', 'flower-pink', 'fern', 'pebble', 'stump',
      'carrot', 'mound-a', 'mound-b', 'pond',
      'fox-log', 'fox-cub', 'fox-cub-sit', 'fox-eyes', 'bread',
      'icon-bread', 'icon-carrot', 'icon-water', 'icon-rope',
      'tallgrass-a', 'tallgrass-b', 'tallgrass-c', 'tallgrass-low-a', 'tallgrass-low-b', 'bramble-a', 'bramble-b', 'bramble-c', 'bramble-low',
      'stone-a', 'stone-b', 'stone-c', 'water', 'torch', 'mud', 'dish',
      'acorn', 'icon-acorn', 'oak-old', 'snag', 'fallen-log', 'windfall', 'trunk-long', 'thicket', 'ledge-1', 'ledge-2', 'ledge-3', 'ledge-4', 'bog', 'bog-post', 'plank-rotten', 'plank', 'trestle', 'daisy-tall', 'daisy-tall-yellow',
      'hill', 'mushroom', 'boulder', 'daisy-white', 'daisy-yellow', 'daisy-white-small', 'daisy-yellow-small',
      'dusk-cold', 'dusk-warm', 'moon', 'sun', 'dusk-cloud-a', 'dusk-cloud-b', 'oak-b', 'bare-a', 'bare-b',
      'nest-bough', 'nest', 'bird-fallen', 'grave-mound', 'fire-pit', 'fire-logs', 'stick'
    ].forEach((name) => this.load.image(`woods-${name}`, `assets/woods/${name}.png`));
    loadAnimals(this);
    loadSounds(this);         // only the ones that have been made (tools/audio.mjs)

    // The guide — drawn by tools/ui-art.mjs: the note, the task tag, the keys,
    // and the game's own pixel font (plain for paper, edged for over the world)
    ['title', 'bin', 'sign', 'sign-8', 'rope', 'note', 'note-tall', 'note-long', 'tag', 'marker', 'checkbox', 'tick',
      'key-e', 'key-i', 'key-f', 'key-x', 'key-left', 'key-right', 'key-up', 'key-down', 'key-shift', 'key-esc']
      .forEach((name) => this.load.image(`ui-${name}`, `assets/ui/${name}.png`));
    this.load.bitmapFont('px', 'assets/ui/font.png', 'assets/ui/font.xml');
    this.load.bitmapFont('px-edged', 'assets/ui/font-edged.png', 'assets/ui/font-edged.xml');
  }

  create() {
    createLpcAnims(this, 'lpc-khatira');
    createLpcAnims(this, 'lpc-oliver');
    createAnimalAnims(this);

    this.time.delayedCall(800, () => {
      this.scene.start('LoginScene');
    });
  }
}
