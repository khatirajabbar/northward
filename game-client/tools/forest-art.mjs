// Draws the art for the forest and writes it to public/assets/woods/.
//
//   node tools/forest-art.mjs
//
// Same toolkit, palette and trees as the cabin (tools/cabin-art.mjs), so the
// clearing you leave and the forest you walk into are one place. Art pixels are
// shown at 2x in the game. The forest is a long scrolling road, so instead of
// one painting there are layers that tile (sky, three tree lines, the ground)
// and separate props the scene places along the way.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, mix, rng, sheet } from './pixel.mjs';
import { C } from './palette.mjs';
import { spruce, birch, scotsPine, oak, bush, leafClump } from './trees.mjs';
import { horse, foal, cat, rabbit, bird } from './animals.mjs';

const W = 640, H = 360;
const GROUND = 330;            // art y of the ground line (660 on screen)

// draw on a small canvas and come back with a 1px outline around it
function piece(w, h, draw, outline = C.ink) {
  const inner = new Img(w, h);
  draw(inner);
  const out = new Img(w + 2, h + 2);
  out.blit(inner, 1, 1);
  if (outline !== null) out.outline(outline);
  return out;
}

// ── the layers that tile ──

function sky() {
  const img = new Img(W, H);
  const stops = [[0, 0x6fa3bd], [70, 0x8fbccb], [150, 0xb2d3d2], [220, 0xd4e3cc], [280, 0xeee6bd], [340, 0xf7e7b6]];
  const at = (y) => {
    for (let i = 0; i + 1 < stops.length; i++) {
      const [y0, c0] = stops[i], [y1, c1] = stops[i + 1];
      if (y <= y1) return mix(c0, c1, (y - y0) / (y1 - y0));
    }
    return stops[stops.length - 1][1];
  };
  const band = 9;
  for (let y = 0; y < H; y++) {
    const here = at(Math.floor(y / band) * band + band / 2), next = at((Math.floor(y / band) + 1) * band + band / 2);
    for (let x = 0; x < W; x++) {
      let c = here;
      if (y % band === band - 1 && (x + y) % 2 === 0) c = next;
      if (y % band === band - 2 && x % 4 === 0 && y % 2 === 0) c = next;
      img.put(x, y, c);
    }
  }
  const cloud = (cx, cy, len, tone) => {
    img.ellipse(cx, cy, len, 3, tone[0]);
    img.ellipse(cx - len * 0.25, cy - 2, len * 0.5, 2.6, tone[0]);
    img.ellipse(cx + len * 0.2, cy - 1.5, len * 0.4, 2.2, tone[0]);
    img.ellipse(cx + len * 0.1, cy + 2, len * 0.8, 1.4, tone[1]);
  };
  cloud(120, 46, 60, [0xdcebea, 0xb9d3d8]);
  cloud(420, 30, 46, [0xd2e5e8, 0xa9c8d2]);
  cloud(540, 92, 70, [0xe9f0e2, 0xcadccf]);
  cloud(260, 110, 48, [0xeef2e0, 0xd5e2cc]);
  return img;
}

// stamp an image so it wraps around the left/right edge — keeps a layer tileable
function stampWrapped(layer, img, x, y) {
  layer.blit(img, x, y);
  if (x < 0) layer.blit(img, x + W, y);
  if (x + img.w > W) layer.blit(img, x - W, y);
}

// mist pooled at the foot of a tree line, thinning upward
function mist(layer, top, bottom, tone, strength) {
  for (let y = top; y < H; y++) {
    const k = Math.min(1, (y - top) / (bottom - top));
    for (let x = 0; x < W; x++) {
      const a = strength * k * ((x + y) % 2 ? 1 : 0.82);
      layer.px(x, y, tone, a);
    }
  }
}

function treeLine({ seed, tones, count, hMin, hMax, base, squat, hills, mistTone, mistTop, mistStrength }) {
  const rnd = rng(seed);
  const layer = new Img(W, H);
  if (hills) {
    for (let x = 0; x < W; x++) {
      const y = base - 34 + Math.round(9 * Math.sin((x / W) * Math.PI * 4) + 6 * Math.sin((x / W) * Math.PI * 10 + 1) + 3 * Math.sin((x / W) * Math.PI * 22));
      layer.vline(x, y, H - y, hills);
    }
  }
  // back-to-front so nearer trees overlap farther ones
  const trees = [];
  for (let i = 0; i < count; i++) {
    const h = rnd.int(hMin, hMax);
    trees.push({ x: Math.round((i / count) * W + rnd.int(-12, 12)), h, w: Math.round(h * squat * (0.9 + rnd() * 0.25)) });
  }
  trees.sort((a, b) => a.h - b.h);
  trees.forEach((t) => {
    const img = spruce(t.w, t.h, rnd, tones);
    stampWrapped(layer, img, t.x - Math.floor(t.w / 2), base - t.h + rnd.int(0, 3));
  });
  layer.rect(0, base, W, H - base, tones[0]);
  mist(layer, mistTop, base + 6, mistTone, mistStrength);
  return layer;
}

function layers() {
  return {
    far: treeLine({
      seed: 11, tones: [0x9dc0bf, 0xa6c7c4, 0xb0cfca, 0xbad6cf], count: 34, hMin: 16, hMax: 34, base: 318, squat: 0.5,
      hills: 0xb7d2cf, mistTone: 0xe8f0e2, mistTop: 286, mistStrength: 0.75
    }),
    mid: treeLine({
      seed: 23, tones: [0x5f9092, 0x6b9c9c, 0x7aaaa6, 0x8bb8b0], count: 20, hMin: 60, hMax: 120, base: 324, squat: 0.42,
      mistTone: 0xdfeadd, mistTop: 268, mistStrength: 0.7
    }),
    near: treeLine({
      seed: 37, tones: [0x2f5c5f, 0x3a6c6d, 0x487e7b, 0x5a918a], count: 11, hMin: 150, hMax: 270, base: 330, squat: 0.36,
      mistTone: 0xd3e3d6, mistTop: 262, mistStrength: 0.62
    })
  };
}

// the earth you walk on: a grass cap over dirt, stones and roots — tiles sideways
function ground() {
  const rnd = rng(5);
  const w = 128, h = 40;
  const img = new Img(w, h);
  img.rect(0, 0, w, h, C.dirt[1]);
  for (let i = 0; i < 150; i++) img.put(rnd.int(0, w - 1), rnd.int(8, h - 1), rnd.pick([C.dirt[0], C.dirt[2], C.dirt[2], C.dirt[3]]));
  for (let i = 0; i < 9; i++) {                         // buried stones
    const x = rnd.int(3, w - 12), y = rnd.int(13, h - 6), sw = rnd.int(4, 8);
    img.ellipse(x + sw / 2, y + 1.5, sw / 2, 1.8, C.stone[1]);
    img.ellipse(x + sw / 2, y + 1, sw / 2 - 0.5, 1.3, C.stone[2]);
    img.hline(x + 1, y, Math.max(1, sw - 3), C.stone[3]);
  }
  for (let i = 0; i < 4; i++) {                         // a thin root now and then
    let x = rnd.int(6, w - 20), y = rnd.int(10, 16);
    for (let k = 0; k < rnd.int(6, 12); k++) { img.put(x, y, C.dirt[0]); x += 1; if (rnd.chance(0.4)) y += 1; }
  }
  img.rect(0, 0, w, 6, C.grass[1]);
  img.hline(0, 0, w, C.grass[3]); img.hline(0, 1, w, C.grass[2]); img.hline(0, 5, w, C.grass[0]);
  for (let x = 0; x < w; x++) {
    if (rnd.chance(0.5)) img.put(x, 6, C.grass[1]);
    if (rnd.chance(0.22)) img.put(x, 7, C.grass[0]);
    if (rnd.chance(0.25)) img.put(x, 4, C.grass[0]);
    if (rnd.chance(0.14)) img.put(x, 0, C.grass[4]);
    if (rnd.chance(0.1)) img.put(x, 2, C.grass[3]);
    if (rnd.chance(0.45)) img.put(x, 8, C.dirt[0]);    // shadow under the turf
  }
  return img;
}

// blades standing up along the ground line
function fringe() {
  const rnd = rng(9);
  const w = 128, h = 6;
  const img = new Img(w, h);
  for (let x = 0; x < w; x++) {
    if (!rnd.chance(0.55)) continue;
    const bh = rnd.int(1, 5), tone = rnd.pick([C.grass[1], C.grass[2], C.grass[2], C.grass[3]]);
    for (let k = 0; k < bh; k++) img.put(x + (k > 2 && rnd.chance(0.5) ? 1 : 0), h - 1 - k, k === bh - 1 ? C.grass[3] : tone);
  }
  return img;
}

// ── small things growing along the road ──

function tuft(w, h, seed) {
  const rnd = rng(seed);
  const img = new Img(w, h);
  for (let x = 0; x < w; x++) {
    const centre = 1 - Math.abs(x - (w - 1) / 2) / (w / 2);
    const bh = Math.max(1, Math.round(h * (0.35 + centre * 0.65) * (0.7 + rnd() * 0.3)));
    const sway = rnd.int(-1, 1);
    for (let k = 0; k < bh; k++) {
      const tone = k > bh - 2 ? C.grass[3] : x % 3 === 0 ? C.grass[0] : rnd.chance(0.5) ? C.grass[1] : C.grass[2];
      img.put(x + (k > bh * 0.6 ? sway : 0), h - 1 - k, tone);
    }
  }
  return img;
}

function flower(petal, heart = 0xffd23f) {
  const img = new Img(5, 9);
  img.vline(2, 3, 6, C.grass[2]); img.put(1, 6, C.grass[3]); img.put(3, 5, C.grass[1]);
  img.put(2, 0, petal); img.put(1, 1, petal); img.put(3, 1, petal); img.put(2, 2, petal);
  img.put(0, 1, mix(petal, 0x000000, 0.12)); img.put(4, 1, petal);
  img.put(2, 1, heart);
  return img;
}

function fern() {
  const rnd = rng(31);
  const img = new Img(18, 11);
  [[-8, 4], [-6, 1], [-3, 0], [0, 0], [3, 0], [6, 2], [8, 5]].forEach(([dx, top], i) => {
    for (let t = 0; t <= 8; t++) {
      const k = t / 8, x = Math.round(9 + dx * k), y = Math.round(10 - (10 - top) * Math.sin((k * Math.PI) / 2));
      img.put(x, y, i % 2 ? C.grass[2] : C.grass[1]);
      if (t > 1) { img.put(x, y - 1, t % 2 ? C.grass[3] : C.grass[2]); if (t % 2 === 0) img.put(x + (dx < 0 ? -1 : 1), y, C.grass[2]); }
    }
  });
  for (let i = 0; i < 6; i++) img.put(rnd.int(6, 11), rnd.int(7, 10), C.grass[0]);
  return img;
}

function pebble() {
  return piece(11, 6, (g) => {
    g.ellipse(5.5, 3.5, 5.5, 2.8, C.stone[2]); g.ellipse(5, 2.6, 4, 1.6, C.stone[3]);
    g.hline(3, 1, 4, C.stone[4]); g.hline(2, 5, 8, C.stone[1]);
  }, C.stone[0]);
}

function stump() {
  return piece(15, 10, (g) => {
    g.rect(1, 3, 13, 7, C.timber[3]); g.vline(1, 3, 7, C.timber[2]); g.vline(13, 3, 7, C.timber[4]);
    for (let x = 3; x < 13; x += 3) g.vline(x, 4, 6, C.timber[2]);
    g.ellipse(7.5, 2.5, 7, 2.5, C.cut[2]); g.ellipse(7.5, 2.5, 4.4, 1.4, C.cut[3]); g.put(7, 2, C.cut[0]);
    g.put(0, 9, C.timber[3]); g.put(14, 9, C.timber[3]);
    g.put(3, 2, C.grass[2]); g.put(4, 1, C.grass[3]);
  });
}

// ── the first stretch: bucket, carrots, the thirsty tree, the pond ──

function bucket(full) {
  return piece(10, 13, (g) => {
    const w = C.wood;
    g.poly([[0.5, 4], [9.5, 4], [8.5, 13], [1.5, 13]], w[2]);
    g.vline(1, 5, 7, w[1]); g.vline(3, 5, 8, w[1]); g.vline(6, 5, 8, w[1]); g.vline(7, 5, 8, w[3]); g.vline(8, 5, 7, w[4]);
    g.hline(1, 6, 8, C.iron[2]); g.hline(1, 7, 8, C.iron[4]); g.hline(2, 11, 6, C.iron[2]);
    g.hline(0, 4, 10, w[4]); g.hline(1, 3, 8, w[5]);
    if (full) { g.hline(1, 4, 8, 0x4f93a4); g.hline(2, 4, 3, 0xa8dbe0); g.hline(1, 3, 8, 0x6fb0bc); g.put(6, 3, 0xdff3f2); }
    else g.hline(1, 4, 8, w[0]);
    for (let i = 0; i <= 7; i++) g.put(1 + i, 2 - Math.round(Math.sin((i / 7) * Math.PI) * 2.2), C.iron[1]);   // handle
  });
}

function carrot() {
  // only the leafy top and the shoulder of the root show — the rest is in the ground
  const rnd = rng(19);
  return piece(11, 14, (g) => {
    leafClump(g, 5.5, 5.5, 4.6, 4, [C.grass[0], C.grass[1], C.grass[3], C.grass[4]], rnd);
    [[5, 0], [2, 1], [8, 1], [0, 4], [10, 4]].forEach(([x, y]) => { g.put(x, y, C.grass[3]); g.put(x, y + 1, C.grass[2]); });
    g.vline(5, 3, 6, C.grass[1]); g.line(3, 4, 5, 8, C.grass[1]); g.line(8, 4, 6, 8, C.grass[1]);
    g.rect(3, 10, 5, 2, 0xe8772e); g.hline(4, 12, 3, 0xe8772e); g.put(5, 13, 0xc25f22);
    g.vline(3, 10, 2, 0xf29a55); g.vline(7, 10, 2, 0xc25f22); g.put(6, 12, 0xc25f22);
  }, 0x1f2a1c);
}

function mound(seed) {
  const rnd = rng(seed);
  const img = new Img(14, 5);
  img.ellipse(7, 4, 7, 3.2, C.dirt[0]); img.ellipse(7, 3.6, 5.6, 2.4, C.dirt[2]); img.ellipse(7.5, 2.6, 3.4, 1.2, C.dirt[3]);
  for (let i = 0; i < 4; i++) img.put(rnd.int(3, 10), rnd.int(2, 4), C.dirt[1]);
  return img;
}

// the little tree by the path: thirsty, and then — after a bucket of water — in bloom
function sapling(healthy) {
  const rnd = rng(healthy ? 71 : 72);
  const w = 60, h = 116, cx = 30;
  const img = new Img(w, h);
  const bark = [0x4a3526, 0x65493a, 0x82624c, 0x9c7a5f];
  const boughs = [[-17, 46], [16, 40], [-8, 30], [9, 26], [-22, 60], [21, 56]];
  boughs.forEach(([dx, y1], i) => {
    const y0 = 70 - i * 3;
    img.line(cx, y0, cx + dx, y1, bark[0]); img.line(cx + 1, y0, cx + dx + 1, y1, bark[1]);
    img.line(cx + dx, y1, cx + dx + Math.sign(dx) * 5, y1 - 7, bark[0]);
  });
  for (let y = h - 1; y >= 36; y--) {
    const t = (h - y) / (h - 36), half = t < 0.08 ? 4 : t < 0.55 ? 2.5 : t < 0.8 ? 2 : 1.5;
    for (let dx = -Math.ceil(half); dx <= Math.floor(half); dx++) {
      const k = (dx + half) / (2 * half);
      let c = k < 0.3 ? bark[0] : k < 0.6 ? bark[1] : k < 0.9 ? bark[2] : bark[3];
      if ((y * 3 + dx * 7) % 9 === 0) c = bark[0];
      img.put(cx + dx, y, c);
    }
  }
  img.rect(cx - 6, h - 2, 12, 2, bark[1]); img.hline(cx - 6, h - 1, 12, bark[0]);
  if (healthy) {
    const green = [0x2f5f44, 0x43815a, 0x5aa374, 0x7cc08e];
    [[-18, 50, 12, 9], [18, 46, 12, 9], [-23, 62, 9, 7], [22, 58, 9, 7], [-8, 34, 13, 10], [9, 30, 13, 10], [0, 20, 15, 10], [0, 44, 13, 9]]
      .forEach(([dx, y, rx, ry]) => leafClump(img, cx + dx, y, rx, ry, green, rnd));
    for (let i = 0; i < 26; i++) {                       // blossom
      const x = rnd.int(6, w - 7), y = rnd.int(12, 66);
      if (!img.alpha(x, y)) continue;
      const c = rnd.chance(0.6) ? 0xf7f4ee : 0xf0b6c9;
      img.put(x, y, c); if (rnd.chance(0.5)) img.put(x + 1, y, c); if (rnd.chance(0.3)) img.put(x, y - 1, 0xffe680);
    }
  } else {
    const dry = [0x6e6242, 0x8a7a48, 0xa8944f, 0xc2ad62];
    [[-18, 49, 6, 4], [17, 43, 6, 4], [-8, 31, 7, 4], [9, 27, 6, 4], [0, 22, 7, 5], [-22, 62, 4, 3]]
      .forEach(([dx, y, rx, ry]) => leafClump(img, cx + dx, y, rx, ry, dry, rnd));
    for (let i = 0; i < 9; i++) {                        // the leaves it has already dropped
      const x = rnd.int(6, w - 8), c = rnd.pick([dry[1], dry[2], dry[3]]);
      img.put(x, h - 1, c); img.put(x + 1, h - 1, c); if (rnd.chance(0.4)) img.put(x, h - 2, c);
    }
  }
  return img;
}

// a small woodland pool beside the path
function pond() {
  const rnd = rng(15);
  const w = 124, h = 26;
  const img = new Img(w, h);
  img.ellipse(w / 2, 14, 60, 11.5, C.dirt[0]);                       // wet bank
  img.ellipse(w / 2, 14, 57, 10, 0x1d4658);
  img.ellipse(w / 2, 13, 54, 8.4, 0x2a6072);
  img.ellipse(w / 2 - 2, 12, 48, 6.4, 0x3c8090);
  img.ellipse(w / 2 - 6, 10.6, 36, 3.4, 0x58a2ad);
  for (let i = 0; i < 9; i++) {                                      // light on the water
    const x = rnd.int(22, w - 30), y = rnd.int(8, 16);
    img.hline(x, y, rnd.int(3, 8), i % 3 ? 0x8fcbd0 : 0xc9ecec);
  }
  [[8, 15], [20, 20], [w - 12, 15], [w - 26, 21], [44, 23], [78, 23]].forEach(([x, y], i) => {    // stones on the bank
    img.ellipse(x, y, 3.4, 2, C.stone[i % 2 ? 2 : 1]); img.hline(x - 2, y - 1, 3, C.stone[3]);
  });
  const reed = (x, top, head) => {
    img.vline(x, top, 14 - top, C.grass[1]); img.vline(x + 1, top + 2, 12 - top, C.grass[2]);
    if (head) { img.rect(x, top - 3, 2, 4, 0x6b4a30); img.put(x, top - 4, 0x8a6a44); }
  };
  reed(11, 1, true); reed(15, 4, false); reed(18, 0, true); reed(w - 18, 2, true); reed(w - 14, 5, false); reed(w - 22, 5, false);
  img.ellipse(84, 13, 4, 1.6, C.grass[2]); img.put(84, 13, C.grass[0]); img.put(87, 12, 0xf4f4ee);       // a lily pad
  return img;
}

// ── the fox cub and its log ──

function foxLog() {
  return piece(74, 26, (g) => {
    const t = C.timber, rnd = rng(41);
    g.rect(8, 6, 62, 18, t[3]);
    g.hline(8, 6, 62, t[4]); g.hline(8, 7, 62, mix(t[4], t[3], 0.5)); g.rect(8, 19, 62, 5, t[2]); g.hline(8, 23, 62, t[1]);
    for (let i = 0; i < 34; i++) { const x = rnd.int(16, 66), y = rnd.int(8, 21); g.hline(x, y, rnd.int(2, 7), rnd.chance(0.5) ? t[2] : t[4], 0.7); }
    [28, 47, 61].forEach((x) => { g.vline(x, 8, 14, t[1]); g.vline(x + 1, 9, 12, t[4], 0.5); });
    g.poly([[66, 8], [73, 2], [72, 6], [69, 11]], t[3]); g.put(73, 2, C.cut[2]);          // broken bough
    g.rect(69, 8, 2, 16, t[2]);
    // the open end
    g.ellipse(9, 15, 8.6, 10.6, t[4]); g.ellipse(9, 15, 7.4, 9.4, C.cut[1]);
    g.ellipse(9, 15, 5.6, 7.6, 0x17110d);
    g.put(4, 9, C.cut[3]); g.put(3, 12, C.cut[3]); g.put(14, 22, C.cut[0]);
    // moss and a few shelf mushrooms
    g.ellipse(34, 6, 10, 2, C.grass[1]); g.ellipse(32, 5, 6, 1.2, C.grass[3]); g.ellipse(55, 6, 6, 1.6, C.grass[1]); g.hline(52, 5, 4, C.grass[3]);
    [[40, 17], [44, 20]].forEach(([x, y]) => { g.hline(x, y, 4, 0xd9c7a3); g.hline(x, y + 1, 4, 0xa8926c); });
    for (let x = 12; x < 70; x += 5) if (rnd.chance(0.6)) g.put(x, 24, C.grass[1]);
  });
}

function foxCub(sitting) {
  const rust = [0x9c4d20, 0xc8692e, 0xe08a45], cream = 0xf3e7d2, sock = 0x3a2418;
  if (sitting) {
    return piece(20, 18, (g) => {
      g.ellipse(11, 12.5, 6, 5.6, rust[1]); g.ellipse(12.5, 11, 3.6, 3.4, rust[2]);          // haunches
      g.ellipse(8.6, 13.5, 2.6, 3.6, cream);                                                  // chest
      g.rect(7, 15, 2, 3, rust[0]); g.rect(10, 15, 2, 3, rust[0]); g.hline(7, 17, 2, sock); g.hline(10, 17, 2, sock);
      g.poly([[14, 16], [19, 12], [20, 15], [16, 18]], rust[1]); g.rect(18, 12, 2, 2, cream);   // tail round the feet
      g.ellipse(6.5, 6, 5, 4.4, rust[1]); g.ellipse(7.5, 5, 3, 2.4, rust[2]);                 // head
      g.poly([[2, 4], [4, 0], [6, 3]], rust[1]); g.poly([[8, 3], [11, 0], [11, 4]], rust[1]);
      g.put(4, 1, sock); g.put(10, 1, sock);
      g.ellipse(4.4, 8, 3, 1.8, cream); g.put(1, 8, 0x17110d);
      g.put(4, 6, 0x17110d); g.put(8, 6, 0x17110d);
    });
  }
  return piece(26, 17, (g) => {
    g.rect(8, 11, 2, 6, rust[0]); g.rect(17, 11, 2, 6, rust[0]);                              // far legs
    g.ellipse(13.5, 9, 7.4, 3.8, rust[1]); g.ellipse(14.5, 7.6, 5.4, 2, rust[2]);             // body
    g.ellipse(11, 11, 4, 1.6, cream);                                                         // belly
    g.rect(6, 11, 2, 5, rust[1]); g.rect(15, 11, 2, 5, rust[1]);
    [6, 8, 15, 17].forEach((x) => g.rect(x, 15, 2, 2, sock));
    g.poly([[19, 7], [25, 3], [26, 7], [21, 11]], rust[1]); g.rect(24, 3, 2, 3, cream); g.put(23, 5, rust[2]);   // tail
    g.ellipse(5.5, 6, 4.8, 4, rust[1]); g.ellipse(6.4, 5, 2.8, 2, rust[2]);                   // head
    g.poly([[1, 4], [3, 0], [5, 3]], rust[1]); g.poly([[7, 3], [9, 0], [10, 4]], rust[1]);
    g.put(3, 1, sock); g.put(9, 1, sock);
    g.ellipse(3.4, 8, 3, 1.7, cream); g.put(0, 8, 0x17110d);
    g.put(3, 6, 0x17110d); g.put(7, 6, 0x17110d);
  });
}

function foxEyes() {
  const img = new Img(5, 1);
  img.put(0, 0, 0xf2d9a0); img.put(4, 0, 0xf2d9a0);
  return img;
}

function bread() {
  return piece(11, 7, (g) => {
    g.ellipse(5.5, 4, 5.5, 3, 0xc79a5b); g.ellipse(5.5, 3, 4.6, 1.8, 0xdcb679); g.hline(1, 6, 9, 0xa87d42);
    g.put(3, 2, 0xa87d42); g.put(5, 2, 0xa87d42); g.put(7, 2, 0xa87d42); g.hline(4, 1, 3, 0xedd2a0);
  });
}

// what's in the bag, drawn as small icons
function icons() {
  return {
    'icon-bread': bread(),
    'icon-carrot': piece(11, 13, (g) => {
      g.poly([[3, 4], [9, 4], [6, 13]], 0xe8772e); g.line(8, 5, 6, 12, 0xc25f22); g.line(4, 5, 5, 9, 0xf29a55);
      g.line(5, 0, 5, 3, C.grass[2]); g.line(3, 1, 5, 4, C.grass[1]); g.line(8, 0, 6, 4, C.grass[3]);
      g.hline(5, 7, 2, 0xc25f22, 0.6);
    }),
    'icon-water': piece(9, 13, (g) => {
      g.rect(3, 0, 3, 2, 0x8a6a44); g.rect(3, 2, 3, 2, 0xb7c6cc);
      g.ellipse(4.5, 8.5, 4.5, 4.5, 0x4f93a4); g.ellipse(3.6, 7.4, 2, 2.4, 0x7fbcc8); g.put(3, 6, 0xdff3f2);
      g.hline(1, 12, 7, 0x2a6072);
    }),
    'icon-rope': piece(13, 11, (g) => {
      for (let y = 0; y < 11; y++) {
        for (let x = 0; x < 13; x++) {
          const d = Math.hypot((x - 6) / 6.4, (y - 5) / 5.4), hole = Math.hypot((x - 6) / 3, (y - 5) / 2.2);
          if (d > 1 || hole < 1) continue;
          g.put(x, y, (x + y) % 3 === 0 ? 0x8a6a3c : (x * 2 + y) % 5 === 0 ? 0xcfa868 : 0xb08850);
        }
      }
      g.line(10, 8, 12, 10, 0xb08850);
    })
  };
}

// ── the horse's stretch: the tall grass, the river, the torches ──

// grass taller than you are: dark blades at the back, lit ones in front, and
// a few gone to seed
function tallGrass(seed, h = 38) {
  const rnd = rng(seed);
  const w = 28, k = h / 38;
  const img = new Img(w, h);
  const blade = (x0, len, lean, tones, seedHead) => {
    let tx = x0, ty = h - 1;
    for (let k = 0; k < len; k++) {
      const t = k / len;
      tx = Math.round(x0 + lean * t * t); ty = h - 1 - k;                 // it bends more toward the tip
      img.put(tx, ty, t > 0.82 ? tones[2] : t > 0.3 ? tones[1] : tones[0]);
      if (t < 0.5) img.put(tx + 1, ty, t < 0.25 ? tones[0] : tones[1]);   // thicker at the root
    }
    if (seedHead) {
      const dir = lean < 0 ? -1 : 1;
      for (let k = 0; k < 5; k++) {
        img.put(tx + (k > 2 ? dir : 0), ty - k, k % 2 ? C.mustard[1] : C.mustard[2]);
        if (k > 0 && k < 4) img.put(tx + (k > 2 ? dir : 0) + (k % 2 ? 1 : -1), ty - k, C.mustard[0]);
      }
    }
  };
  const row = (count, lenRange, tones, seeds) => {
    for (let i = 0; i < count; i++) {
      const x = 3 + ((i + rnd() * 0.8) / count) * (w - 7);
      blade(Math.round(x), Math.round(rnd.int(...lenRange) * k), rnd.int(-5, 5), tones, rnd.chance(seeds));
    }
  };
  row(9, [24, 31], [0x254a33, C.grass[0], C.grass[1]], 0.16);
  row(8, [18, 27], [C.grass[0], C.grass[1], C.grass[2]], 0.08);
  row(7, [11, 20], [C.grass[1], C.grass[2], C.grass[4]], 0);
  for (let x = 2; x < w - 2; x++) if (rnd.chance(0.7)) img.put(x, h - 1 - rnd.int(0, 3), C.grass[rnd.int(2, 3)]);
  return img;
}

// bramble: a dark tangle with long canes arching out of it, every one of them
// armed with pale thorns — nothing you'd want to push through quickly
function bramble(seed, { w = 44, h = 30, canes = 5, low = false } = {}) {
  const rnd = rng(seed);
  const cane = [0x24131a, 0x3f2028, 0x6e3a3e, 0x9a5f5c], leaf = [0x1c3327, 0x2b4f38, 0x3f6d4e], thorn = [0x8a6a44, 0xe6d6b4, 0xfff6e0];
  return piece(w, h, (g) => {
    // the heart of the thicket: too dense to see into
    const massH = low ? h * 0.5 : h * 0.42;
    g.ellipse(w / 2, h - massH * 0.55, w / 2 - 4, massH * 0.62, cane[0]);
    g.ellipse(w * 0.3, h - massH * 0.4, w * 0.24, massH * 0.5, cane[0]); g.ellipse(w * 0.72, h - massH * 0.42, w * 0.24, massH * 0.52, cane[0]);
    for (let i = 0; i < (low ? 8 : 16); i++) {
      const x = rnd.int(5, w - 6), y = h - 2 - rnd.int(0, Math.round(massH * 0.8)), dir = rnd.chance(0.5) ? 1 : -1;
      if (g.alpha(x, y)) g.line(x, y, x + dir * rnd.int(2, 5), y - rnd.int(2, 5), cane[1]);
    }
    // the canes: up from the root, over in an arc, drooping at the end
    const berries = [], leaves = [];
    for (let i = 0; i < canes; i++) {
      const x0 = 6 + ((i + 0.2 + rnd() * 0.6) / canes) * (w - 12);
      const dir = x0 < w * 0.35 ? 1 : x0 > w * 0.65 ? -1 : i % 2 ? -1 : 1;
      const x2 = Math.max(2, Math.min(w - 3, x0 + dir * rnd.int(low ? 12 : 15, low ? 22 : 28)));
      const peak = low ? rnd.int(6, h - 2) : rnd.int(h - 13, h - 1);
      const endY = h - 1 - rnd.int(low ? 0 : 5, low ? 3 : 15);
      const cx = (x0 + x2) / 2, cy = h - 1 - peak * 1.6;
      const pts = [];
      for (let k = 0; k <= 48; k++) {
        const t = k / 48, u = 1 - t;
        const x = u * u * x0 + 2 * u * t * cx + t * t * x2, y = u * u * (h - 1) + 2 * u * t * cy + t * t * endY;
        if (y >= 3) pts.push([x, y]);
      }
      pts.forEach(([x, y], k) => {
        const thin = k > pts.length * 0.7;
        g.rect(Math.round(x), Math.round(y), thin ? 1 : 2, 2, cane[2]);
        g.put(Math.round(x), Math.round(y), cane[3]);
        if (!thin) g.put(Math.round(x) + 1, Math.round(y) + 1, cane[1]);
      });
      pts.forEach(([x, y], k) => {
        if (k % 6 !== 3 || k + 1 >= pts.length) return;
        // a thorn: brown where it leaves the cane, a bright point at the tip
        const [ax, ay] = pts[k + 1], len = Math.hypot(ax - x, ay - y) || 1;
        const side = Math.floor(k / 6) % 2 ? 1 : -1;
        const nx = (-(ay - y) / len) * side, ny = ((ax - x) / len) * side;
        const bx = x + 0.5, by = y + 0.5;
        g.put(bx + nx * 1.6, by + ny * 1.6, thorn[0]);
        g.put(bx + nx * 2.6, by + ny * 2.6, thorn[1]);
        g.put(bx + nx * 3.6, by + ny * 3.6, thorn[2]);
      });
      pts.forEach(([x, y], k) => {
        if (k % 19 === 13) leaves.push([x, y, dir]);
        if (k > 30 && k % 9 === 4 && rnd.chance(0.5)) berries.push([x, y + 2]);
      });
    }
    leaves.forEach(([x, y, side]) => {
      const lx = Math.round(x + side * 2), ly = Math.round(y);
      g.rect(lx, ly, 3, 2, leaf[1]); g.put(lx + 1, ly - 1, leaf[1]); g.put(lx + 1, ly, leaf[2]); g.put(lx, ly + 1, leaf[0]);
    });
    berries.forEach(([x, y]) => { g.rect(Math.round(x), Math.round(y), 2, 2, 0x7a2333); g.put(Math.round(x), Math.round(y), 0xc4485c); });
  });
}

// a river stone: flat enough to land on, mossy, its foot dark where the water wets it
function steppingStone(seed) {
  const rnd = rng(seed);
  const st = C.stone;
  return piece(26, 15, (g) => {
    const l = rnd.int(0, 2), r = rnd.int(0, 2);
    g.poly([[1 + l, 2], [4 + l, 0], [21 - r, 0], [25 - r, 3], [26, 8], [24, 15], [2, 15], [0, 8]], st[2]);
    g.poly([[2 + l, 2], [5 + l, 0], [21 - r, 0], [24 - r, 2], [21 - r, 4], [5 + l, 4]], st[3]);      // the flat top, lit
    g.hline(6 + l, 1, 9 - r, st[4]); g.hline(16, 0, 4 - r, st[4]);
    g.poly([[18, 5], [25, 4], [26, 8], [24, 15], [19, 15]], st[1]);                                  // the side in shade
    g.line(9 + l, 4, 11, 9, st[1]); g.line(11, 9, 9, 12, st[1]);                                     // a crack
    for (let i = 0; i < 7; i++) g.put(rnd.int(2, 17), rnd.int(5, 10), rnd.chance(0.5) ? st[3] : st[1]);
    g.rect(0, 11, 26, 4, 0x26434e, 0.75); g.hline(1, 10, 24, 0x3a6170, 0.6);                         // wet below the waterline
    // moss creeping over one shoulder
    const mx = rnd.chance(0.5) ? 2 + l : 14;
    g.ellipse(mx + 3, 1, 4, 1.4, C.grass[1]); g.hline(mx + 1, 0, 4, C.grass[3]); g.put(mx + 6, 2, C.grass[2]); g.put(mx, 2, C.grass[1]);
  }, st[0]);
}

// river water, tiled across the gap: a lit edge, a bright surface, then down into the dark
function water() {
  const rnd = rng(88);
  const w = 64, h = 44;
  const img = new Img(w, h);
  const bands = [[0, 0x58a2ad], [5, 0x3c8090], [12, 0x2a6072], [22, 0x1d4658], [33, 0x163949]];
  for (let y = 0; y < h; y++) {
    let i = 0;
    while (i + 1 < bands.length && y >= bands[i + 1][0]) i++;
    const next = bands[i + 1];
    for (let x = 0; x < w; x++) {
      let c = bands[i][1];
      if (next && y === next[0] - 1 && (x + y) % 2 === 0) c = next[1];          // a dithered step between bands
      if (next && y === next[0] - 2 && x % 4 === (y % 2) * 2) c = next[1];
      img.put(x, y, c);
    }
  }
  for (let x = 0; x < w; x++) img.put(x, 0, (x * 7) % 11 < 8 ? 0xc9ecec : 0x8fcbd0);   // light along the top edge
  for (let i = 0; i < 26; i++) {                                                // ripples, fewer the deeper you look
    const y = Math.round(1 + rnd() * rnd() * 26), x = rnd.int(0, w - 1), len = rnd.int(3, 9);
    const c = y < 5 ? 0xc9ecec : y < 12 ? 0x8fcbd0 : y < 20 ? 0x4f93a4 : 0x2a6072;
    for (let k = 0; k < len; k++) img.put((x + k) % w, y, c);
  }
  return img;
}

// a checkpoint torch: a post with an iron cradle. the flame is its own sprite
function torch() {
  return piece(11, 34, (g) => {
    const t = C.timber, ir = C.iron;
    g.rect(4, 8, 3, 26, t[3]); g.vline(4, 8, 26, t[4]); g.vline(6, 8, 26, t[1]);                // post
    for (let y = 12; y < 33; y += 5) g.put(5, y, t[1]);
    g.rect(3, 19, 5, 2, ir[2]); g.hline(3, 19, 5, ir[4]);                                       // an iron band
    g.poly([[0, 3], [11, 3], [8, 9], [3, 9]], ir[2]); g.hline(0, 3, 11, ir[4]); g.hline(1, 4, 9, ir[3]);   // cradle
    g.vline(1, 0, 4, ir[3]); g.vline(9, 0, 4, ir[3]); g.vline(5, 1, 3, ir[2]);
    g.rect(2, 2, 7, 2, 0x1c1410); g.put(3, 1, 0x1c1410); g.put(6, 1, 0x1c1410); g.put(7, 2, 0x33221a);     // charred wood
    g.rect(2, 32, 7, 2, C.stone[2]); g.hline(2, 32, 3, C.stone[3]); g.put(8, 33, C.stone[1]);   // stones at its foot
  });
}

function flame() {
  const f = C.fire;
  const one = (lean, tall) => piece(9, 14, (g) => {
    const tip = 4 + lean, top = 13 - tall;
    g.poly([[1, 13], [8, 13], [8, 9], [tip + 1, top], [tip, top], [1, 9]], f[1]);               // outer flame
    g.ellipse(4.5, 10.5, 3.6, 3.2, f[1]);
    g.poly([[2.4, 13], [6.6, 13], [6.2, 10], [tip + 0.6, top + 4], [3, 10]], f[2]);             // mid
    g.ellipse(4.5, 11.4, 1.5, 1.8, f[3]);                                                       // hot heart
    g.put(tip, top, f[0]); g.put(1, 9, f[0]); g.put(7, 8 + (lean > 0 ? 1 : 0), f[0]);
  }, f[0]);
  return sheet([one(0, 12), one(1, 11), one(0, 13), one(-1, 11)], 11, 16);
}

// ── the mushroom hill ──
//
// The hill's outline belongs to the scene (ForestScene: mtnLeft, peakX, the
// cliff top) — a smooth rise over 680px to a plateau 300px up, which runs on
// to a sheer drop. These numbers mirror it in screen pixels; the painting
// follows that outline exactly, so the mushrooms and flowers the scene plants
// along it sit on the grass.
const HILL = { rise: 680, width: 930, height: 300, below: 6, snap: 14, sky: 8 };

function hill() {
  const rnd = rng(61);
  const w = HILL.width / 2, h = (HILL.height + HILL.below + HILL.sky) / 2;
  const base = h - HILL.below / 2;                       // art y of the ground line
  const img = new Img(w, h);
  const surface = [];
  for (let x = 0; x < w; x++) {
    const t = Math.min(1, (x * 2) / HILL.rise);
    let up = HILL.height * t * t * (3 - 2 * t);
    if (up >= HILL.height - HILL.snap) up = HILL.height;  // the last little step up onto the flat top
    surface.push(Math.round(base - up / 2));
  }
  const g = C.grass, deep = 0x254a33;
  // speckle: how much of a second colour to mix in at a pixel — part ordered
  // pattern, part scatter, so the shading looks like grass and not a mesh
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const scatter = Array.from({ length: w * h }, () => rnd());
  const dither = (x, y, amount) => bayer[(y % 4) * 4 + (x % 4)] / 16 * 0.35 + scatter[y * w + x] * 0.65 < amount;
  for (let x = 0; x < w; x++) {
    const top = surface[x];
    for (let y = top; y < h; y++) {
      const d = y - top;
      // turf: a lit rim, a bright band under it, then the body of the hill
      // falling slowly into shade the deeper it goes
      let c = d === 0 ? g[4] : d === 1 ? g[3] : d < 4 ? g[2] : g[1];
      if (d === 4 && dither(x, y, 0.5)) c = g[2];
      if (d > 4) {
        const shade = Math.min(1, (y - (base - HILL.height / 2)) / (HILL.height / 2));    // 0 at the top … 1 at the foot
        const under = Math.min(1, d / 46);
        if (dither(x, y, Math.max(0, shade * under - 0.28) * 1.15)) c = g[0];
      }
      // the sheer side, turned away from the light
      const edge = w - 1 - x;
      if (edge < 12 && d > 2) {
        if (dither(x, y, 1 - edge / 12)) c = g[0];
        if (edge < 5 && dither(x, y, 0.75 - edge / 8)) c = deep;
        if (edge === 0) c = deep;
      }
      img.put(x, y, c);
    }
  }
  // softer and brighter patches, so it isn't one flat green
  for (let i = 0; i < 16; i++) {
    const x = rnd.int(40, w - 30), y = surface[x] + rnd.int(10, 70);
    if (y > base - 6) continue;
    const rx = rnd.int(8, 18), ry = rnd.int(2, 4);
    for (let yy = y - ry; yy <= y + ry; yy++) for (let xx = x - rx; xx <= x + rx; xx++) {
      const k = ((xx - x) / rx) ** 2 + ((yy - y) / ry) ** 2;
      if (k <= 1 && xx < w - 12 && yy > surface[Math.max(0, xx)] + 5 && dither(xx, yy, 0.6 * (1 - k))) img.put(xx, yy, g[2]);
    }
  }
  // tufts on the hillside
  for (let i = 0; i < 150; i++) {
    const x = rnd.int(6, w - 16), y = surface[x] + rnd.int(7, 140);
    if (y > base - 4) continue;
    const lit = rnd.chance(0.6);
    img.put(x, y, lit ? g[3] : g[0]); img.put(x + 1, y - 1, lit ? g[3] : g[0]); img.put(x + 2, y, lit ? g[2] : g[0]);
    if (rnd.chance(0.5)) img.put(x + 1, y + 1, g[0]);
  }
  // a few stones showing through
  for (let i = 0; i < 7; i++) {
    const x = rnd.int(60, w - 20), y = surface[x] + rnd.int(16, 120);
    if (y > base - 8) continue;
    img.ellipse(x, y, 2.6, 1.6, C.stone[2]); img.hline(x - 2, y - 1, 3, C.stone[3]); img.hline(x - 2, y + 1, 4, C.stone[1]);
  }
  // blades standing up along the top edge
  for (let x = 1; x < w - 1; x++) {
    if (!rnd.chance(0.5)) continue;
    const top = surface[x], bh = rnd.int(1, 3);
    for (let k = 1; k <= bh; k++) img.put(x, top - k, k === bh ? g[4] : g[3]);
  }
  return img;
}

// a bounce mushroom: a fat red cap with pale spots on a sturdy stem
function mushroom() {
  const cap = [0x7a2e33, 0xa23f42, 0xc25552, 0xe08a7a], stem = [0xa8987a, 0xd8ccb0, 0xf0e6d2];
  return piece(24, 21, (g) => {
    g.poly([[9, 10], [15, 10], [16.6, 21], [7.4, 21]], stem[1]);                    // stem, flaring to the foot
    g.poly([[13, 10], [15, 10], [16.6, 21], [14, 21]], stem[0]);
    g.vline(9, 12, 8, stem[2]); g.hline(8, 20, 9, stem[0]);
    g.ellipse(12, 11.5, 9.5, 2, cap[0]);                                            // gills, in shadow under the cap
    for (let y = 0; y < 11; y++) {                                                  // the cap: a dome
      const half = 12 * Math.sqrt(1 - ((10.5 - y) / 11) ** 2);
      for (let x = Math.round(12 - half); x < Math.round(12 + half); x++) {
        const k = (x - 12) / 12;
        g.put(x, y, y > 8 ? cap[1] : k > 0.45 ? cap[1] : cap[2]);
      }
    }
    g.ellipse(8, 3.6, 4.4, 1.6, cap[3]); g.hline(5, 6, 3, cap[3]);                  // light on the crown
    [[6.5, 7, 1.8, 1.5], [14.5, 4.5, 2.2, 1.8], [19.5, 8, 1.5, 1.3], [11, 9, 1.3, 1], [2.5, 9.4, 1, 0.9]]
      .forEach(([x, y, rx, ry]) => g.ellipse(x, y, rx, ry, stem[2]));               // spots
  });
}

// the boulder at the back of the cliff top — split into flat faces, moss on its crown
function boulder() {
  const st = C.stone, rnd = rng(77);
  return piece(60, 50, (g) => {
    g.poly([[2, 50], [7, 25], [23, 8], [46, 10], [58, 33], [56, 50]], st[2]);       // the whole stone
    g.poly([[7, 25], [23, 8], [32, 26], [14, 38]], st[3]);                          // lit face
    g.poly([[10, 25], [22, 12], [27, 23], [15, 32]], st[4], 0.55);
    g.poly([[46, 10], [58, 33], [56, 50], [37, 50], [32, 26]], st[1]);              // face in shade
    g.line(23, 8, 32, 26, st[0]); g.line(32, 26, 37, 50, st[0]); g.line(32, 26, 14, 38, st[0]);    // the seams between them
    g.line(33, 27, 38, 50, st[2]); g.line(44, 30, 49, 40, st[0]); g.line(20, 42, 26, 46, st[1]);
    for (let i = 0; i < 26; i++) {
      const x = rnd.int(5, 55), y = rnd.int(14, 48);
      if (g.alpha(x, y)) g.put(x, y, rnd.chance(0.5) ? st[3] : st[1]);
    }
    // moss along the top
    const moss = [C.grass[0], C.grass[1], C.grass[3], C.grass[4]];
    leafClump(g, 27, 8, 9, 3, moss, rnd); leafClump(g, 41, 10, 6, 2.4, moss, rnd); leafClump(g, 15, 17, 4, 2, moss, rnd);
  }, st[0]);
}

// the little flowers up the slope
function daisy(petal, heart, big) {
  if (!big) {
    return piece(5, 8, (g) => {
      g.vline(2, 4, 4, C.grass[3]); g.put(3, 6, C.grass[2]);
      g.hline(1, 0, 3, petal); g.hline(0, 1, 5, petal); g.hline(0, 2, 5, petal); g.hline(0, 3, 5, petal); g.hline(1, 4, 3, petal);
      g.put(2, 2, heart); g.put(0, 3, mix(petal, 0x000000, 0.14)); g.put(4, 3, mix(petal, 0x000000, 0.14));
    }, 0x2f5a3c);
  }
  return piece(7, 10, (g) => {
    g.vline(3, 6, 4, C.grass[3]); g.put(4, 8, C.grass[2]); g.put(2, 7, C.grass[4]);
    g.rect(2, 0, 3, 7, petal); g.rect(0, 2, 7, 3, petal); g.rect(1, 1, 5, 5, petal);
    g.put(1, 1, mix(petal, 0x000000, 0.14)); g.put(5, 5, mix(petal, 0x000000, 0.14)); g.put(1, 5, mix(petal, 0x000000, 0.14));
    g.rect(2, 2, 3, 3, heart); g.put(2, 2, mix(heart, 0xffffff, 0.4));
  }, 0x2f5a3c);
}

// ── assemble ──
// ── assemble ──

export function buildAll() {
  const rnd = rng(3);
  const sprites = {
    sky: sky(),
    ...layers(),
    ground: ground(),
    fringe: fringe(),
    // trees along the road
    'spruce-a': spruce(74, 150, rnd), 'spruce-b': spruce(54, 104, rnd), 'spruce-c': spruce(32, 58, rnd),
    'pine-a': scotsPine(64, 172, rnd), 'birch-a': birch(56, 140, rnd), 'birch-b': birch(46, 112, rnd),
    'oak-a': oak(120, 132, rnd),
    'bush-a': bush(24, 15, rnd), 'bush-b': bush(30, 18, rnd, { berries: 0xb5334a }),
    'tuft-a': tuft(7, 6, 1), 'tuft-b': tuft(10, 9, 2), 'tuft-c': tuft(13, 12, 3),
    'flower-white': flower(0xf7f4ee), 'flower-yellow': flower(0xffe27a, 0xe8a02c), 'flower-pink': flower(0xf0b6c9),
    fern: fern(), pebble: pebble(), stump: stump(),
    // the first stretch
    'bucket-empty': bucket(false), 'bucket-full': bucket(true),
    carrot: carrot(), 'mound-a': mound(1), 'mound-b': mound(2),
    'sapling-weak': sapling(false), 'sapling-healthy': sapling(true),
    pond: pond(),
    'fox-log': foxLog(), 'fox-cub': foxCub(false), 'fox-cub-sit': foxCub(true), 'fox-eyes': foxEyes(),
    bread: bread(),
    ...icons(),
    // the horse's stretch, the crossing and the thorns
    'tallgrass-a': tallGrass(11), 'tallgrass-b': tallGrass(12), 'tallgrass-c': tallGrass(13),
    'tallgrass-low-a': tallGrass(14, 27), 'tallgrass-low-b': tallGrass(15, 27),
    'bramble-a': bramble(21), 'bramble-b': bramble(22), 'bramble-c': bramble(23, { canes: 6 }),
    'bramble-low': bramble(24, { w: 40, h: 14, canes: 4, low: true }),
    'stone-a': steppingStone(31), 'stone-b': steppingStone(32), 'stone-c': steppingStone(33),
    water: water(), torch: torch(), flame: flame(),
    // the animals (sprite sheets — frame sizes are in tools/animals.mjs)
    horse: horse('chestnut'), 'horse-grey': horse('grey'), 'horse-dark': horse('dark'), foal: foal(),
    cat: cat(), rabbit: rabbit(), bird: bird(),
    // the mushroom hill
    hill: hill(), mushroom: mushroom(), boulder: boulder(),
    'daisy-white': daisy(0xf7f4ee, 0xffd23f, true), 'daisy-yellow': daisy(0xffe27a, 0xe8a02c, true),
    'daisy-white-small': daisy(0xf7f4ee, 0xffd23f, false), 'daisy-yellow-small': daisy(0xffe27a, 0xe8a02c, false)
  };
  return sprites;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/assets/woods');
  fs.mkdirSync(out, { recursive: true });
  const sprites = buildAll();
  Object.entries(sprites).forEach(([name, img]) => img.save(path.join(out, `${name}.png`)));
  console.log(`wrote ${Object.keys(sprites).length} images to ${out}`);
}
