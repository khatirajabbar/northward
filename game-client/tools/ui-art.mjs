// Draws the game's interface pieces and its pixel font, and writes them to
// public/assets/ui/.
//
//   node tools/ui-art.mjs
//
// These are the things that tell a player what to do: the note you find when
// you wake, the small tag that holds the task in hand, the marker over the
// thing to go to, and the keys to press. Same toolkit and palette as the rest.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, rng, outlined, mix } from './pixel.mjs';
import { C } from './palette.mjs';
import { buildFont, drawText, textWidth } from './font.mjs';

const PAPER = [0xb9a888, 0xdccdaa, 0xefe4c8, 0xf8f1dc];
const INK = 0x2b1b14;

// a torn-off page: ruled lines the text sits on, a strip of tape holding it up
function note() {
  const rnd = rng(5);
  const w = 172, h = 136;
  const img = new Img(w + 4, h + 10);
  const page = new Img(w, h);
  page.rect(0, 0, w, h, PAPER[2]);
  for (let x = 0; x < w; x++) {                              // an uneven torn edge along the top and bottom
    if (rnd.chance(0.3)) page.put(x, 0, [0, 0, 0, 0]);
    if (rnd.chance(0.22)) page.put(x, h - 1, [0, 0, 0, 0]);
  }
  for (let y = 0; y < h; y++) { if (rnd.chance(0.12)) page.put(0, y, [0, 0, 0, 0]); if (rnd.chance(0.12)) page.put(w - 1, y, [0, 0, 0, 0]); }
  for (let i = 0; i < 260; i++) page.px(rnd.int(1, w - 2), rnd.int(1, h - 2), rnd.chance(0.5) ? PAPER[3] : PAPER[1], 0.5);   // paper grain
  for (let y = 31; y < h - 6; y += 11) page.hline(8, y, w - 16, mix(PAPER[1], 0x8fb0b8, 0.35));                               // ruled lines
  page.vline(17, 4, h - 8, mix(PAPER[1], 0xc8644e, 0.45));                                                                    // the margin
  page.rect(1, 1, w - 2, 1, PAPER[3]); page.rect(w - 3, 2, 2, h - 4, PAPER[1]); page.rect(2, h - 3, w - 4, 2, PAPER[1]);      // light and shade
  page.poly([[w - 12, h], [w, h - 12], [w, h]], [0, 0, 0, 0]);                                                                // a folded corner
  for (let k = 0; k < 12; k++) { page.put(w - 12 + k, h - 1 - k, PAPER[0]); if (k > 1) page.put(w - 13 + k, h - 1 - k, PAPER[3]); }
  page.poly([[w - 12, h - 1], [w - 2, h - 11], [w - 12, h - 11]], PAPER[3]);
  page.line(w - 12, h - 1, w - 12, h - 11, PAPER[0]); page.line(w - 12, h - 11, w - 2, h - 11, PAPER[0]);
  page.outline(mix(PAPER[0], INK, 0.55));
  img.blit(page, 2, 6);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {                                                                    // a soft shadow under it
    if (page.alpha(x, y) && !img.alpha(x + 5, y + 9)) img.put(x + 5, y + 9, [10, 12, 18, 90]);
  }
  // the tape
  img.rect(w / 2 - 14, 1, 30, 10, [222, 208, 160, 215]); img.hline(w / 2 - 14, 1, 30, [240, 230, 190, 230]);
  img.vline(w / 2 - 14, 1, 10, [196, 182, 138, 215]); img.vline(w / 2 + 15, 1, 10, [196, 182, 138, 215]);
  return img;
}

// a small paper tag — stretched to fit its words, so the corners are kept square to the pixel
function tag() {
  const img = new Img(18, 18);
  img.rect(1, 1, 16, 15, PAPER[2]); img.hline(2, 1, 14, PAPER[3]); img.hline(2, 15, 14, PAPER[1]); img.vline(16, 2, 13, PAPER[1]);
  [[1, 1], [16, 1], [1, 15], [16, 15]].forEach(([x, y]) => img.put(x, y, [0, 0, 0, 0]));
  img.outline(mix(PAPER[0], INK, 0.6));
  for (let x = 2; x < 17; x++) img.put(x, 17, [10, 12, 18, 80]);
  return img;
}

// a key on the keyboard, with what's printed on it
function key(label, { wide = false } = {}) {
  const tw = textWidth(label);
  const w = Math.max(11, tw + (wide ? 8 : 6));
  return outlined(w, 13, (g) => {
    g.rect(0, 0, w, 13, 0xb9b2a4);                               // the body of the key
    g.rect(0, 0, w, 10, 0xf2ecdd); g.hline(1, 0, w - 2, 0xffffff); g.hline(0, 9, w, 0xd8d0be);   // its top face
    g.put(0, 0, 0xd8d0be); g.put(w - 1, 0, 0xd8d0be);
    g.hline(0, 12, w, 0x8d8678);
    drawText(g, label, Math.round((w - tw) / 2), 1, INK);
  }, INK);
}

// "this one" — a small arrow that hangs over the thing to go to
function marker() {
  return outlined(11, 9, (g) => {
    g.poly([[0, 0], [11, 0], [5.5, 9]], 0xffe9a8); g.rect(0, 0, 11, 2, 0xfff6d6);
    g.poly([[6, 2], [10, 2], [6, 8]], 0xf2c466);
  }, INK);
}

function checkbox() {
  const img = new Img(9, 9);
  img.rect(0, 0, 9, 9, INK); img.rect(1, 1, 7, 7, PAPER[3]); img.hline(1, 7, 7, PAPER[1]); img.vline(7, 1, 7, PAPER[1]);
  return img;
}

function tick() {
  return outlined(10, 9, (g) => {
    g.line(0, 5, 3, 8, C.grass[2]); g.line(1, 5, 4, 8, C.grass[3]); g.line(3, 8, 9, 0, C.grass[2]); g.line(4, 8, 10, 0, C.grass[3]);
  }, 0x1f3a2a);
}

export function buildAll() {
  return {
    note: note(), tag: tag(), marker: marker(), checkbox: checkbox(), tick: tick(),
    'key-e': key('E'), 'key-i': key('I'), 'key-left': key('←'), 'key-right': key('→'), 'key-up': key('↑'),
    'key-shift': key('shift', { wide: true }), 'key-esc': key('esc', { wide: true })
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/assets/ui');
  fs.mkdirSync(out, { recursive: true });
  const sprites = buildAll();
  Object.entries(sprites).forEach(([name, img]) => img.save(path.join(out, `${name}.png`)));
  // the font twice: plain, for writing on paper, and edged, for words over the world
  const plain = buildFont(), edged = buildFont({ outline: true });
  plain.img.save(path.join(out, 'font.png')); fs.writeFileSync(path.join(out, 'font.xml'), plain.xml);
  edged.img.save(path.join(out, 'font-edged.png')); fs.writeFileSync(path.join(out, 'font-edged.xml'), edged.xml.replace('font.png', 'font-edged.png'));
  console.log(`wrote ${Object.keys(sprites).length} images and 2 fonts to ${out}`);
}
