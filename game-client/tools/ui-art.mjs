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
import { buildFont, buildWebFont, drawText, textWidth } from './font.mjs';

const PAPER = [0xb9a888, 0xdccdaa, 0xefe4c8, 0xf8f1dc];
const INK = 0x2b1b14;

// a torn-off page: ruled lines the text sits on, a strip of tape holding it up.
// the usual page takes seven lines of writing; the longer ones nine and eleven
function note(h = 136) {
  const rnd = rng(5);
  const w = 172;
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

// the game's name, for the title screen: the font's own letters cut three
// times as large — so the ink round them stays thin — lit from above, and with
// a little thickness under them like letters sawn out of board
function title() {
  const word = 'northward', k = 3, depth = 2;
  const letters = new Img(textWidth(word), 9);
  drawText(letters, word, 0, 0, 0xffffff);
  const face = [0xfffdf2, 0xfffdf2, 0xf9f1da, 0xf9f1da, 0xf1e2b9, 0xf1e2b9, 0xe6ce97];   // top row of the letters → bottom
  return outlined(letters.w * k, 7 * k + depth, (g) => {
    const each = (draw) => { for (let y = 0; y < 7; y++) for (let x = 0; x < letters.w; x++) if (letters.alpha(x, y)) draw(x, y); };
    each((x, y) => g.rect(x * k, y * k + depth, k, k, C.wood[1]));
    each((x, y) => g.rect(x * k, y * k, k, k, face[y]));
  }, INK);
}

// the sign-in page is a board hung by the road: six planks nailed together,
// with an iron eye at each top corner for the ropes it hangs from. the words
// and the fields are laid over it by the page (see style.css), which is why the
// planks are the height they are
const SIGN = { w: 156, plank: 22, planks: 6, eye: 5, eyes: [24, 131] };

function sign() {
  const rnd = rng(23);
  const wd = C.wood, { w, plank, planks, eye } = SIGN;
  const h = plank * planks;
  const art = new Img(w + 2, eye + h + 2);
  for (let i = 0; i < planks; i++) {
    const y = eye + 1 + i * plank;
    const x0 = 1 + rnd.int(0, 1), len = w - (x0 - 1) - rnd.int(0, 1);       // sawn by hand: the ends don't quite line up
    const tone = mix(wd[2], wd[3], rnd());
    art.rect(x0, y, len, plank, tone);
    art.hline(x0, y, len, mix(tone, wd[5], 0.4));                           // light along the top edge
    art.hline(x0, y + plank - 2, len, mix(tone, wd[0], 0.35));
    art.hline(x0, y + plank - 1, len, mix(wd[0], INK, 0.35));               // the dark between two planks
    for (let k = 0; k < 9; k++) {                                           // grain
      const gx = x0 + rnd.int(8, len - 40), gy = y + rnd.int(3, plank - 5);
      art.hline(gx, gy, rnd.int(8, 30), rnd.chance(0.25) ? mix(tone, wd[5], 0.25) : mix(tone, wd[0], 0.22));
    }
    if (rnd.chance(0.5)) {                                                  // a knot
      const kx = x0 + rnd.int(20, len - 24), ky = y + rnd.int(7, plank - 8);
      art.ellipse(kx, ky, 3, 2, mix(tone, wd[0], 0.3)); art.ellipse(kx, ky, 1.4, 0.8, mix(tone, wd[0], 0.65));
    }
    [x0 + 3, x0 + len - 5].forEach((nx) => {                                // nailed at both ends
      art.rect(nx, y + 10, 2, 2, C.iron[2]); art.put(nx, y + 10, C.iron[4]);
    });
  }
  SIGN.eyes.forEach((cx) => {
    const x = cx - 1;
    art.rect(x, 1, 5, eye + 2, C.iron[3]); art.rect(x + 1, 2, 3, eye - 1, [0, 0, 0, 0]);
    art.put(x, 1, [0, 0, 0, 0]); art.put(x + 4, 1, [0, 0, 0, 0]); art.vline(x, 2, eye, C.iron[4]);
  });
  art.outline(INK);
  const img = new Img(art.w + 3, art.h + 4);
  for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) if (art.alpha(x, y)) img.put(x + 3, y + 4, [10, 12, 18, 80]);
  img.blit(art, 0, 0);
  return img;
}

// a length of the rope it hangs from — a tile, repeated as far up as it has to go
function rope() {
  const img = new Img(5, 4);
  const tan = [0x8a6a3c, 0xb89a62, 0xd9c08a];
  for (let y = 0; y < 4; y++) {
    img.put(0, y, INK); img.put(4, y, INK);
    for (let x = 1; x < 4; x++) img.put(x, y, tan[(x + y) % 4 === 0 ? 0 : x === 1 ? 2 : 1]);    // the twist of the strands
  }
  return img;
}

// four corners pulled apart: fill the screen
function fullscreen() {
  return outlined(11, 11, (g) => {
    [[0, 0, 1, 1], [10, 0, -1, 1], [0, 10, 1, -1], [10, 10, -1, -1]].forEach(([x, y, dx, dy]) => {
      for (let k = 0; k < 4; k++) { g.put(x + dx * k, y, 0xf7efd9); g.put(x, y + dy * k, 0xf7efd9); g.put(x + dx * k, y + dy, 0xf7efd9); g.put(x + dx, y + dy * k, 0xf7efd9); }
    });
  }, 0x14161c);
}

// a speaker, its sound coming out of it — or, `off`, a cross where the sound would be
function sound({ off = false } = {}) {
  return outlined(11, 11, (g) => {
    g.rect(0, 4, 2, 3, 0xf7efd9);                                              // the box…
    g.vline(2, 3, 5, 0xf7efd9); g.vline(3, 2, 7, 0xf7efd9); g.vline(4, 1, 9, 0xf7efd9);   // …and its cone
    if (off) {
      for (let k = 0; k < 5; k++) { g.put(6 + k, 3 + k, 0xf7efd9); g.put(10 - k, 3 + k, 0xf7efd9); }
    } else {
      g.vline(6, 4, 3, 0xf7efd9);                                                                   // near…
      [[8, 2], [9, 3], [9, 4], [9, 5], [9, 6], [9, 7], [8, 8]].forEach(([x, y]) => g.put(x, y, 0xf7efd9));   // …and further out
    }
  }, 0x14161c);
}

// the button on the sign-in page: green as the road's grass, stretched to fit
// its words like the tag. `down` is the same button pressed in
function button({ down = false } = {}) {
  const g = C.grass, drop = down ? 2 : 0;
  const img = new Img(17, 17);
  img.blit(outlined(15, 15 - drop, (b) => {
    b.rect(0, 0, 15, 15 - drop, g[0]);                                        // the side you see from above…
    b.rect(0, 0, 15, 11, g[2]); b.hline(1, 0, 13, g[4]); b.hline(0, 10, 15, g[1]);   // …and its top face
    b.put(0, 0, g[1]); b.put(14, 0, g[1]);
  }, INK), 0, drop);
  return img;
}

// a little bin, for letting a journey go
function bin() {
  return outlined(9, 10, (g) => {
    g.rect(0, 2, 9, 2, 0xd8d0be); g.rect(3, 0, 3, 2, 0xd8d0be); g.hline(1, 2, 7, 0xf2ecdd);   // the lid and its handle
    g.rect(1, 4, 7, 6, 0xb9b2a4); g.rect(1, 4, 7, 1, 0xd8d0be);                                // the can
    [2, 4, 6].forEach((x) => g.vline(x, 5, 4, 0x8d8678));
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
    note: note(), 'note-tall': note(158), 'note-long': note(180), tag: tag(), marker: marker(), checkbox: checkbox(), tick: tick(),
    title: title(), bin: bin(), sign: sign(), rope: rope(), fullscreen: fullscreen(), sound: sound(), 'sound-off': sound({ off: true }), button: button(), 'button-down': button({ down: true }),
    'key-e': key('E'), 'key-i': key('I'), 'key-f': key('F'), 'key-x': key('X'), 'key-down': key('↓'), 'key-left': key('←'), 'key-right': key('→'), 'key-up': key('↑'),
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
  // …and once more as a font file, for the sign-in form on the page around the game
  fs.writeFileSync(path.join(out, 'northward.ttf'), buildWebFont());
  console.log(`wrote ${Object.keys(sprites).length} images and 3 fonts to ${out}`);
}
