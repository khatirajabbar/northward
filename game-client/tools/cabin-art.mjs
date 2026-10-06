// Draws the art for the morning cabin and writes it to public/assets/home/.
//
//   node tools/cabin-art.mjs
//
// Everything is drawn at half resolution (640x360) and shown at 2x in the game,
// so one "art pixel" is 2 screen pixels. The scene is a cutaway: the whole
// little log cabin in its clearing at dawn, front wall removed.
//
// The numbers in LAYOUT are mirrored in src/scenes/MorningScene.js — if you
// move furniture here, move it there too.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, mix, rng, loadPng } from './pixel.mjs';
import { useTheme, furnish, buildSprites, PLACE } from './cabin-furniture.mjs';

export { PLACE };

export const W = 640, H = 360;

export const LAYOUT = {
  ground: 318,        // top of the grass outside
  floorBack: 304,     // where the back wall meets the floor
  floorFront: 312,    // front edge of the floor (the traveler walks at ~310)
  base: 307,          // furniture stands here, a little in front of the wall
  ceiling: 204,       // underside of the top beam
  wallL: 100,         // outer face of the left wall
  roomL: 106,         // inner faces of the walls
  roomR: 532,
  wallR: 538,
  doorTop: 258,
  eave: 198,
  ridge: 140
};
const L = LAYOUT;

// ── palette ──
const C = {
  ink: 0x2b1b14,                                                    // warm dark outline
  wood: [0x4a2f1e, 0x6b452a, 0x8a5c36, 0xa97a48, 0xc99a62, 0xe2bd85],   // furniture oak, dark → light
  log: [0x2e211b, 0x3a2a22, 0x4a362b, 0x574033, 0x644b3b, 0x73584a],    // back wall logs (kept quiet)
  floor: [0x4a2f1e, 0x5f4029, 0x775233, 0x8e653e, 0xa57a4c],
  timber: [0x221610, 0x33221a, 0x453024, 0x573d2d, 0x6a4c39],           // beams, posts
  cut: [0x7d5c38, 0x9c7647, 0xb88f58, 0xd0aa70],                        // sawn log ends
  stone: [0x2d2f36, 0x45484f, 0x5f636b, 0x7c818a, 0x9da2aa],
  roof: [0x1b272d, 0x283a42, 0x355059, 0x436671, 0x577f8a],
  grass: [0x2f5a3c, 0x3f6d4e, 0x4f815b, 0x5f9668, 0x79ad78],
  dirt: [0x3e332a, 0x4e4136, 0x5d5044, 0x6e6052],
  path: [0x7b6b55, 0x8f7e65, 0xa39277],
  pineFar: 0x587f88,
  pineMid: 0x386069,
  pine: [0x15292e, 0x1f3a40, 0x2b5056, 0x3a686c, 0x4f8480],
  cream: [0xb9a888, 0xd6c6a4, 0xece0c4, 0xf7efd9],
  teal: [0x2f6b6e, 0x458a8a, 0x62a8a2, 0x86c4ba],
  rust: [0x7a3324, 0x9c4630, 0xb95c40, 0xd47a58],
  mustard: [0xa87628, 0xcf9a3a, 0xe8bb5c],
  iron: [0x17191e, 0x262a31, 0x383d47, 0x4d5360, 0x69707e],
  fire: [0xc8441c, 0xff8c3a, 0xffc14d, 0xfff3c4],
  white: [0xb8c0c4, 0xd9dfe0, 0xf2f5f3],
  glow: 0xffd68a
};

useTheme(C, L);

// ── sky, distance, ground ──

function drawSky(img) {
  const stops = [
    [0, 0x29456b], [60, 0x3b5f88], [115, 0x577fa0], [165, 0x7fa6b3],
    [210, 0xadc7bd], [250, 0xd9d6b2], [285, 0xf4dba8], [330, 0xfae5b8]
  ];
  const at = (y) => {
    for (let i = 0; i + 1 < stops.length; i++) {
      const [y0, c0] = stops[i], [y1, c1] = stops[i + 1];
      if (y <= y1) return mix(c0, c1, (y - y0) / (y1 - y0));
    }
    return stops[stops.length - 1][1];
  };
  // flat bands with a dithered seam between them — a pixel-art sky, not a smooth blend
  const band = 9;
  for (let y = 0; y < H; y++) {
    const here = at(Math.floor(y / band) * band + band / 2);
    const next = at((Math.floor(y / band) + 1) * band + band / 2);
    const inBand = y % band;
    for (let x = 0; x < W; x++) {
      let c = here;
      if (inBand === band - 1 && (x + y) % 2 === 0) c = next;
      if (inBand === band - 2 && (x % 4 === 0) && (y % 2 === 0)) c = next;
      img.put(x, y, c);
    }
  }

  // the sun, still low behind the trees on the right
  const sx = 572, sy = 286;
  [[60, 0.07], [44, 0.1], [30, 0.16], [19, 0.3]].forEach(([r, a]) => img.ellipse(sx, sy, r, r * 0.8, 0xffe7b0, a));
  img.ellipse(sx, sy, 10, 9, 0xfff3d2);

  // long thin dawn clouds, lit from below
  const cloud = (cx, cy, len, tone) => {
    img.ellipse(cx, cy, len, 2.6, tone[0]);
    img.ellipse(cx - len * 0.25, cy - 1.5, len * 0.5, 2.2, tone[0]);
    img.ellipse(cx + len * 0.1, cy + 1.6, len * 0.8, 1.4, tone[1]);
  };
  cloud(118, 62, 58, [0x6384a6, 0xa9b4bf]);
  cloud(300, 38, 44, [0x5576a0, 0x8ea3b8]);
  cloud(470, 84, 70, [0x86a6b6, 0xe0cdb0]);
  cloud(214, 122, 50, [0x9dbcbc, 0xecd2ac]);
  cloud(560, 150, 46, [0xbccdbb, 0xf6d7a6]);
  cloud(40, 170, 40, [0xb4c8bc, 0xf0d4aa]);
}

// a pine as a stack of ragged tiers; `tones` runs dark → light, lit from the right
function drawPine(img, cx, baseY, height, halfW, tones, rnd, { trunk = true } = {}) {
  if (trunk) {
    const th = Math.max(4, Math.round(height * 0.12));
    img.rect(cx - 1, baseY - th, 3, th, 0x3b2a20);
    img.vline(cx + 1, baseY - th, th, 0x54402f);
  }
  const top = baseY - height;
  const tiers = Math.max(3, Math.round(height / 11));
  const bottom = baseY - Math.round(height * 0.1);
  for (let t = 0; t < tiers; t++) {
    const y0 = top + Math.round(((bottom - top) * t) / tiers);
    const y1 = top + Math.round(((bottom - top) * (t + 1.35)) / tiers);
    const wTop = (halfW * (t + 0.15)) / tiers, wBot = (halfW * (t + 1.25)) / tiers;
    for (let y = y0; y < y1; y++) {
      const k = (y - y0) / (y1 - y0);
      const half = Math.max(0.6, wTop * 0.35 + (wBot - wTop * 0.35) * k);
      const l = Math.round(cx - half - (rnd.chance(0.35) ? 1 : 0));
      const r = Math.round(cx + half + (rnd.chance(0.35) ? 1 : 0));
      for (let x = l; x <= r; x++) {
        const side = (x - cx) / (half + 1);          // -1 left … 1 right
        let tone = 1;
        if (side > 0.25) tone = 2;
        if (side > 0.6 && k < 0.75) tone = 3;
        if (side < -0.45) tone = 0;
        if (k > 0.82) tone = Math.max(0, tone - 1);   // shadow under each tier
        if (tones.length > 4 && tone === 3 && rnd.chance(0.3)) tone = 4;
        img.put(x, y, tones[Math.min(tone, tones.length - 1)]);
      }
    }
  }
}

function drawDistance(img, rnd) {
  // far ridge, hazy
  for (let x = 0; x < W; x++) {
    const y = 262 + Math.round(8 * Math.sin(x / 47) + 5 * Math.sin(x / 19 + 2) + 3 * Math.sin(x / 7.3));
    img.vline(x, y, 330 - y, 0x7fa1a6);
  }
  // a far band of small pines
  for (let x = -4; x < W + 6; x += rnd.int(5, 8)) {
    const h = rnd.int(16, 30);
    drawPine(img, x, 300, h, h * 0.22, [C.pineFar, C.pineFar, 0x6a919a, 0x6a919a], rnd, { trunk: false });
  }
  img.rect(0, 296, W, 30, C.pineFar);
  // a nearer band, taller toward the edges of the clearing
  for (let x = -6; x < W + 8; x += rnd.int(8, 13)) {
    const edge = Math.min(1, Math.abs(x - 320) / 320);
    const h = rnd.int(30, 44) + Math.round(edge * 34);
    drawPine(img, x, 312, h, h * 0.2, [0x2c525b, C.pineMid, 0x457680, 0x4f8590], rnd, { trunk: false });
  }
  img.rect(0, 306, W, 20, C.pineMid);
  // soft mist lying along the tree line
  for (let x = 0; x < W; x++) {
    for (let y = 292; y < 318; y++) {
      const a = 0.26 * (1 - Math.abs(y - 305) / 13);
      if ((x + y) % 2 === 0) img.px(x, y, 0xdfe6da, a + 0.1); else img.px(x, y, 0xdfe6da, a);
    }
  }
}

function drawGround(img, rnd) {
  const g = L.ground;
  // earth
  img.rect(0, g, W, H - g, C.dirt[1]);
  for (let i = 0; i < 520; i++) {
    img.put(rnd.int(0, W - 1), rnd.int(g + 6, H - 1), rnd.pick([C.dirt[0], C.dirt[2], C.dirt[2]]));
  }
  for (let i = 0; i < 26; i++) {                       // buried stones
    const x = rnd.int(0, W - 8), y = rnd.int(g + 12, H - 6), w = rnd.int(3, 7);
    img.ellipse(x + w / 2, y + 1.5, w / 2, 1.6, C.stone[2]);
    img.hline(x + 1, y, Math.max(1, w - 3), C.stone[3]);
  }
  // grass cap with a ragged lower edge
  img.rect(0, g, W, 5, C.grass[1]);
  img.hline(0, g, W, C.grass[3]);
  img.hline(0, g + 1, W, C.grass[2]);
  for (let x = 0; x < W; x++) {
    if (rnd.chance(0.5)) img.put(x, g + 5, C.grass[1]);
    if (rnd.chance(0.2)) img.put(x, g + 6, C.grass[0]);
    if (rnd.chance(0.25)) img.put(x, g + 4, C.grass[0]);
    if (rnd.chance(0.12)) img.put(x, g, C.grass[4]);
  }
  // the path leading away from the porch, off to the right — north
  for (let x = 600; x < W; x++) {
    img.vline(x, g, 4, C.path[1]);
    img.put(x, g, C.path[2]);
    if (rnd.chance(0.3)) img.put(x, g + 2, C.path[0]);
    if (rnd.chance(0.5)) img.put(x, g + 4, C.path[0]);
  }
}

// grass blades, flowers — the small stuff standing on the ground line
function drawTufts(img, rnd, ranges, density = 0.5) {
  const g = L.ground;
  ranges.forEach(([x0, x1]) => {
    for (let x = x0; x < x1; x++) {
      if (!rnd.chance(density)) continue;
      const h = rnd.int(1, 4);
      const tone = rnd.pick([C.grass[1], C.grass[2], C.grass[3]]);
      for (let k = 0; k < h; k++) img.put(x + (k > 2 ? rnd.pick([-1, 1]) : 0), g - 1 - k, tone);
    }
    for (let x = x0 + 3; x < x1 - 3; x += rnd.int(9, 22)) {
      const petal = rnd.pick([0xf4f4ee, 0xffe680, 0xf2b6c0]);
      img.vline(x, g - 3, 3, C.grass[2]);
      img.put(x, g - 4, petal); img.put(x - 1, g - 3, petal); img.put(x + 1, g - 3, petal);
      img.put(x, g - 3, 0xffd23f);
    }
  });
}

// ── the house shell ──

function drawStones(img, rnd, x0, x1, y0, rows, rowH) {
  for (let r = 0; r < rows; r++) {
    let x = x0 - (r % 2 ? 3 : 0);
    const y = y0 + r * rowH;
    while (x < x1) {
      const w = rnd.int(6, 11);
      const a = Math.max(x, x0), b = Math.min(x + w, x1);
      if (b - a >= 2) {
        const tone = rnd.pick([1, 2, 2, 3]);
        img.rect(a, y, b - a, rowH, C.stone[tone]);
        img.hline(a, y, b - a, C.stone[Math.min(4, tone + 1)]);
        img.hline(a, y + rowH - 1, b - a, C.stone[0]);
        img.vline(b - 1, y, rowH, C.stone[0]);
        if (rnd.chance(0.25)) img.put(a + 1, y + 1, C.stone[Math.min(4, tone + 1)]);
      }
      x += w;
    }
  }
}

// one sawn log end: a rounded block with growth rings
function logEnd(img, x, y, w, h) {
  img.rect(x, y, w, h, C.cut[1]);
  img.rect(x + 1, y + 1, w - 2, h - 2, C.cut[2]);
  img.put(x, y, C.timber[1]); img.put(x + w - 1, y, C.timber[1]);
  img.put(x, y + h - 1, C.timber[1]); img.put(x + w - 1, y + h - 1, C.timber[1]);
  img.hline(x + 1, y, w - 2, C.timber[2]);
  img.hline(x + 1, y + h - 1, w - 2, C.timber[0]);
  img.vline(x, y + 1, h - 2, C.timber[2]);
  img.vline(x + w - 1, y + 1, h - 2, C.timber[1]);
  img.rect(x + 2, y + 2, w - 4, h - 4, C.cut[3]);
  img.put(x + Math.floor(w / 2), y + Math.floor(h / 2), C.cut[0]);
}

function drawBackWall(img, rnd) {
  const x0 = L.roomL, x1 = L.roomR;
  for (let y = L.ceiling; y < L.floorBack; y += 8) {
    const base = rnd.pick([3, 3, 4]);
    for (let x = x0; x < x1; x++) {
      img.put(x, y, C.log[0]);                                  // the gap between logs
      img.put(x, y + 1, C.log[Math.min(5, base + 1)]);          // lit top of the log
      img.put(x, y + 2, C.log[base]);
      img.put(x, y + 3, C.log[base]);
      img.put(x, y + 4, C.log[base]);
      img.put(x, y + 5, C.log[base - 1]);
      img.put(x, y + 6, C.log[base - 1]);
      img.put(x, y + 7, C.log[base - 2]);                       // underside in shadow
    }
    // grain: short streaks, a knot now and then
    for (let i = 0; i < 26; i++) {
      const gx = rnd.int(x0, x1 - 10), gy = y + rnd.int(2, 6), len = rnd.int(3, 12);
      img.hline(gx, gy, Math.min(len, x1 - gx), rnd.chance(0.5) ? C.log[base - 1] : C.log[base + 1], 0.55);
    }
    for (let i = 0; i < 2; i++) {
      if (!rnd.chance(0.6)) continue;
      const kx = rnd.int(x0 + 6, x1 - 8);
      img.ellipse(kx + 1.5, y + 4, 2, 1.5, C.log[base - 2]);
      img.put(kx + 1, y + 4, C.log[0]);
    }
  }
  // the room is darkest up under the beam and in the corners
  for (let y = L.ceiling; y < L.ceiling + 14; y++) img.shade(x0, y, x1 - x0, 1, 0.72 + ((y - L.ceiling) / 14) * 0.28);
  for (let i = 0; i < 10; i++) {
    img.shade(x0 + i, L.ceiling, 1, L.floorBack - L.ceiling, 0.8 + i * 0.02);
    img.shade(x1 - 1 - i, L.ceiling, 1, L.floorBack - L.ceiling, 0.8 + i * 0.02);
  }
  // baseboard
  img.rect(x0, L.floorBack - 3, x1 - x0, 3, C.timber[2]);
  img.hline(x0, L.floorBack - 3, x1 - x0, C.timber[4]);
  img.hline(x0, L.floorBack - 1, x1 - x0, C.timber[0]);
}

function drawFloor(img, rnd, x0, x1, weathered = false) {
  const tones = weathered ? [0x4b4037, 0x5d5146, 0x71655a, 0x84786c, 0x968a7d] : C.floor;
  // the top of the boards, seen at a shallow angle
  for (let y = L.floorBack; y < L.floorFront; y++) {
    const k = (y - L.floorBack) / (L.floorFront - L.floorBack);
    img.hline(x0, y, x1 - x0, k < 0.3 ? tones[2] : k < 0.75 ? tones[3] : tones[4]);
  }
  for (let x = x0 + rnd.int(8, 16); x < x1 - 3; x += rnd.int(17, 26)) {     // seams between boards
    img.line(x, L.floorBack, x + 2, L.floorFront - 1, tones[1]);
  }
  for (let i = 0; i < (x1 - x0) / 5; i++) {
    const gx = rnd.int(x0, x1 - 6), gy = rnd.int(L.floorBack + 1, L.floorFront - 2);
    img.hline(gx, gy, rnd.int(2, 6), tones[2], 0.5);
  }
  img.hline(x0, L.floorBack, x1 - x0, tones[1]);              // shadow where the wall stands
  // the front edge of the boards
  img.rect(x0, L.floorFront, x1 - x0, 3, tones[1]);
  img.hline(x0, L.floorFront, x1 - x0, tones[4]);
  img.hline(x0, L.floorFront + 2, x1 - x0, tones[0]);
  for (let x = x0 + rnd.int(6, 12); x < x1 - 2; x += rnd.int(15, 24)) img.vline(x, L.floorFront + 1, 2, tones[0]);
}

function drawShell(img, rnd) {
  // foundation
  drawStones(img, rnd, L.wallL - 2, L.wallR + 2, L.floorFront + 3, 2, 4);
  drawFloor(img, rnd, L.wallL, L.wallR);
  drawBackWall(img, rnd);

  // side walls: the cut ends of the logs, stacked
  for (let y = L.ceiling; y < L.floorBack; y += 8) {
    logEnd(img, L.wallL, y, 6, 8);
    if (y + 8 <= L.doorTop) logEnd(img, L.roomR, y, 6, 8);
  }
  logEnd(img, L.wallL, L.floorBack, 6, 8);
  // door frame in the right wall
  img.rect(L.roomR - 1, L.doorTop - 2, 8, 4, C.timber[3]);
  img.hline(L.roomR - 1, L.doorTop - 2, 8, C.timber[4]);
  img.hline(L.roomR - 1, L.doorTop + 1, 8, C.timber[0]);
  img.rect(L.roomR, L.floorBack, 6, 8, C.floor[2]);            // the threshold
  img.hline(L.roomR, L.floorBack, 6, C.floor[4]);

  // the top beam and the ends of the ceiling joists
  img.rect(L.wallL - 4, L.eave, L.wallR - L.wallL + 8, 6, C.timber[2]);
  img.hline(L.wallL - 4, L.eave, L.wallR - L.wallL + 8, C.timber[4]);
  img.hline(L.wallL - 4, L.eave + 1, L.wallR - L.wallL + 8, C.timber[3]);
  img.hline(L.wallL - 4, L.eave + 5, L.wallR - L.wallL + 8, C.timber[0]);
  for (let x = L.roomL + 20; x < L.roomR - 10; x += 44) {
    img.rect(x, L.ceiling, 6, 6, C.timber[3]);
    img.hline(x, L.ceiling, 6, C.timber[1]);
    img.vline(x, L.ceiling, 6, C.timber[4]);
    img.vline(x + 5, L.ceiling, 6, C.timber[1]);
    img.hline(x, L.ceiling + 5, 6, C.timber[0]);
    img.put(x + 2, L.ceiling + 2, C.timber[1]); img.put(x + 3, L.ceiling + 3, C.timber[1]);
  }
}

function drawPorch(img, rnd) {
  const x0 = L.wallR, x1 = 596;
  // deck, on short posts
  img.rect(x0, L.floorFront + 3, x1 - x0, 4, 0x241b17);
  for (let x = x0 + 6; x < x1; x += 18) img.rect(x, L.floorFront + 3, 3, 5, C.timber[1]);
  drawFloor(img, rnd, x0, x1, true);
  // two steps down to the path
  const step = (x, y, w) => {
    img.rect(x, y, w, L.ground - y, 0x5d5146);
    img.hline(x, y, w, 0x968a7d); img.hline(x, y + 1, w, 0x84786c);
    img.vline(x + w - 1, y + 1, L.ground - y - 1, 0x4b4037);
  };
  step(x1, L.floorFront, 10);
  step(x1 + 10, L.floorFront + 3, 9);
  // the post holding the roof, with a brace
  img.rect(586, L.eave + 6, 4, L.floorBack - L.eave - 6, C.timber[3]);
  img.vline(586, L.eave + 6, L.floorBack - L.eave - 6, C.timber[4]);
  img.vline(589, L.eave + 6, L.floorBack - L.eave - 6, C.timber[1]);
  for (let i = 0; i < 9; i++) { img.put(585 - i, L.eave + 15 - i, C.timber[3]); img.put(585 - i, L.eave + 16 - i, C.timber[1]); }
  // a lantern hanging under the eave by the door
  const lx = 562, ly = L.eave + 6;
  img.vline(lx, ly, 4, C.iron[1]);
  img.rect(lx - 2, ly + 4, 5, 1, C.iron[1]);
  img.rect(lx - 2, ly + 5, 5, 6, C.iron[2]);
  img.rect(lx - 1, ly + 6, 3, 4, C.fire[2]);
  img.put(lx, ly + 7, C.fire[3]); img.put(lx, ly + 8, C.fire[3]);
  img.rect(lx - 2, ly + 11, 5, 1, C.iron[1]);
}

function drawRoof(img, rnd) {
  const yB = L.eave, yT = L.ridge, xL = 86, xR = 598, inset = 18;
  const left = (y) => xL + ((yB - y) / (yB - yT)) * inset;
  const right = (y) => xR - ((yB - y) / (yB - yT)) * inset;
  // shingles, row by row from the eave up
  const rowH = 5;
  let row = 0;
  for (let y1 = yB; y1 > yT; y1 -= rowH, row++) {
    const y0 = Math.max(yT, y1 - rowH);
    const depth = (yB - y1) / (yB - yT);                  // 0 at the eave, 1 at the ridge
    let x = Math.round(left(y1)) - (row % 2 ? 4 : 0);
    while (x < right(y1)) {
      const w = rnd.int(6, 8);
      let tone = rnd.pick([1, 2, 2, 2, 3]);
      if (depth > 0.7 && tone > 1) tone -= rnd.chance(0.5) ? 1 : 0;   // darker toward the ridge
      for (let y = y0; y < y1; y++) {
        for (let xx = x; xx < x + w; xx++) {
          if (xx < left(y) || xx > right(y)) continue;
          let c = C.roof[tone];
          if (y === y0) c = C.roof[Math.min(4, tone + 1)];          // lit top edge of the row
          if (y === y1 - 1) c = C.roof[0];                          // shadow under the row
          if (xx === x + w - 1 && y > y0) c = C.roof[Math.max(0, tone - 1)];
          img.put(xx, y, c);
        }
      }
      x += w;
    }
  }
  // moss creeping in from the eave and the left side
  for (let i = 0; i < 150; i++) {
    const y = yB - 1 - Math.floor(Math.abs(rnd() - rnd()) * 26);
    const x = rnd.int(Math.ceil(left(y)), Math.floor(right(y)));
    const leftBias = 1 - (x - xL) / (xR - xL);
    if (rnd() > 0.25 + leftBias * 0.6) continue;
    img.put(x, y, rnd.pick([C.grass[1], C.grass[2], C.grass[2], C.grass[3]]));
    if (rnd.chance(0.5)) img.put(x + 1, y, C.grass[1]);
  }
  // the sloped ends and the ridge
  for (let y = yT; y < yB; y++) {
    img.put(Math.round(left(y)), y, C.roof[0]);
    img.put(Math.round(right(y)), y, C.roof[0]);
  }
  img.rect(Math.round(left(yT)) - 1, yT - 2, Math.round(right(yT) - left(yT)) + 3, 3, C.roof[1]);
  img.hline(Math.round(left(yT)) - 1, yT - 2, Math.round(right(yT) - left(yT)) + 3, C.roof[4]);
  img.hline(Math.round(left(yT)) - 1, yT, Math.round(right(yT) - left(yT)) + 3, C.roof[0]);
  // the eave board, and its shadow on the wall
  img.rect(xL, yB, xR - xL + 1, 2, C.timber[3]);
  img.hline(xL, yB, xR - xL + 1, C.timber[4]);
  img.hline(xL, yB + 2, xR - xL + 1, C.timber[0]);

  // a little dormer, with its own shingled gable and a window into the loft
  const dx = 236, dw = 30, dBase = yB - 1, dWall = 20;
  img.rect(dx, dBase - dWall, dw, dWall, C.log[3]);
  for (let y = dBase - dWall + 2; y < dBase; y += 4) img.hline(dx, y, dw, C.log[1]);
  img.vline(dx, dBase - dWall, dWall, C.timber[4]); img.vline(dx + 1, dBase - dWall, dWall, C.timber[3]);
  img.vline(dx + dw - 1, dBase - dWall, dWall, C.timber[1]); img.vline(dx + dw - 2, dBase - dWall, dWall, C.timber[2]);
  for (let i = 0; i <= dw / 2 + 3; i++) {                    // the gable: wall first, shingles on top
    const y = dBase - dWall - 1 - Math.round(i * 0.72);
    const x0 = dx - 3 + i, x1 = dx + dw + 2 - i;
    if (x1 < x0) break;
    img.hline(x0, y, x1 - x0 + 1, C.log[3]);
    img.put(x0, y, C.roof[3]); img.put(x0 + 1, y, C.roof[2]); img.put(x1, y, C.roof[1]); img.put(x1 - 1, y, C.roof[2]);
    img.put(x0 - 1, y, C.roof[0]); img.put(x1 + 1, y, C.roof[0]);
    if (x1 - x0 < 3) img.hline(x0, y, x1 - x0 + 1, C.roof[3]);
  }
  img.hline(dx - 4, dBase - dWall, 4, C.roof[0]); img.hline(dx + dw, dBase - dWall, 4, C.roof[0]);
  img.rect(dx + 9, dBase - dWall + 3, 12, 13, C.wood[3]);                                  // window frame
  img.rect(dx + 11, dBase - dWall + 5, 8, 9, 0x8fb6c4);
  img.rect(dx + 11, dBase - dWall + 5, 8, 4, 0xa9cbd4);
  img.vline(dx + 14, dBase - dWall + 5, 9, C.wood[3]); img.hline(dx + 11, dBase - dWall + 9, 8, C.wood[3]);
  img.hline(dx + 9, dBase - dWall + 3, 12, C.wood[5]); img.hline(dx + 9, dBase - dWall + 15, 12, C.wood[1]);
  img.put(dx + 12, dBase - dWall + 6, 0xe6f4f2); img.put(dx + 13, dBase - dWall + 6, 0xe6f4f2); img.put(dx + 12, dBase - dWall + 7, 0xe6f4f2);
  img.rect(dx + 8, dBase - dWall + 16, 14, 2, C.wood[4]); img.hline(dx + 8, dBase - dWall + 17, 14, C.wood[1]);
  img.shade(dx + dw, dBase - dWall + 1, 3, dWall - 1, 0.75);                               // its shadow on the roof

  // a weathervane on the ridge
  img.vline(150, yT - 13, 11, C.iron[1]);
  img.hline(144, yT - 11, 13, C.iron[1]); img.put(157, yT - 12, C.iron[1]); img.put(157, yT - 10, C.iron[1]); img.put(158, yT - 11, C.iron[1]);
  img.put(144, yT - 12, C.iron[1]); img.put(144, yT - 10, C.iron[1]); img.put(150, yT - 14, C.iron[2]);

  // stone chimney, above the stove
  const cx0 = 381, cx1 = 401, cTop = 108, cBase = 168;
  drawStones(img, rnd, cx0, cx1, cTop + 2, Math.ceil((cBase - cTop - 2) / 4), 4);
  img.vline(cx0, cTop + 2, cBase - cTop - 2, C.stone[3]);
  img.vline(cx1 - 1, cTop + 2, cBase - cTop - 2, C.stone[0]);
  img.rect(cx0 - 2, cTop, cx1 - cx0 + 4, 3, C.stone[2]);
  img.hline(cx0 - 2, cTop, cx1 - cx0 + 4, C.stone[4]);
  img.hline(cx0 - 2, cTop + 2, cx1 - cx0 + 4, C.stone[0]);
  img.rect(cx0 + 3, cTop - 2, cx1 - cx0 - 6, 2, C.iron[1]);
  img.hline(cx0 - 1, cBase, cx1 - cx0 + 2, C.roof[0]);          // where it meets the shingles
  img.hline(cx0 - 1, cBase + 1, cx1 - cx0 + 2, C.roof[1]);
}

// ── outside the house ──

function drawOutside(img, rnd) {
  // tall pines framing the clearing, and a couple peeking over the roof
  drawPine(img, 286, 205, 132, 30, C.pine, rnd, { trunk: false });
  drawPine(img, 482, 205, 110, 26, C.pine, rnd, { trunk: false });
  drawPine(img, 168, 205, 96, 24, C.pine, rnd, { trunk: false });
  drawPine(img, 548, 205, 84, 20, C.pine, rnd, { trunk: false });
  drawPine(img, 22, L.ground, 200, 40, C.pine, rnd);
  drawPine(img, 66, L.ground, 150, 30, C.pine, rnd);
  drawPine(img, 627, L.ground, 178, 36, C.pine, rnd);
}

function drawYard(img, rnd) {
  const g = L.ground;
  // firewood stacked against the left wall, under the eave
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 4 - (r > 3 ? 1 : 0); c++) {
      const x = 80 + c * 5 + (r % 2 ? 2 : 0), y = g - 5 - r * 4;
      img.ellipse(x + 2.5, y + 2.5, 2.5, 2.5, C.timber[1]);
      img.ellipse(x + 2.5, y + 2.5, 1.6, 1.6, C.cut[2]);
      img.put(x + 2, y + 2, C.cut[0]);
    }
  }
  // chopping stump with the axe left in it
  img.rect(48, g - 7, 11, 7, C.timber[3]);
  img.vline(48, g - 7, 7, C.timber[4]); img.vline(58, g - 7, 7, C.timber[1]);
  img.rect(48, g - 9, 11, 2, C.cut[2]); img.hline(48, g - 9, 11, C.cut[3]);
  img.line(55, g - 10, 62, g - 20, C.wood[2]);
  img.line(56, g - 10, 63, g - 20, C.wood[0]);
  img.rect(52, g - 13, 4, 4, C.iron[3]); img.vline(52, g - 13, 4, C.iron[4]);
  // a birdhouse on a pole
  img.rect(40, g - 30, 2, 30, C.timber[3]); img.vline(40, g - 30, 30, C.timber[4]);
  img.rect(36, g - 40, 10, 10, C.wood[3]); img.vline(36, g - 40, 10, C.wood[4]); img.vline(45, g - 40, 10, C.wood[1]);
  img.poly([[41, g - 47], [48, g - 40], [34, g - 40]], C.roof[2]); img.line(41, g - 47, 34, g - 41, C.roof[4]); img.hline(34, g - 40, 14, C.roof[0]);
  img.rect(40, g - 37, 2, 3, C.ink); img.hline(39, g - 32, 4, C.wood[5]);
  img.hline(36, g - 30, 10, C.ink);
  // a bush by the porch steps and a signpost pointing up the path
  const bush = (cx, cy, r) => {
    img.ellipse(cx, cy, r, r * 0.7, C.grass[0]);
    img.ellipse(cx - 1, cy - 1, r * 0.75, r * 0.5, C.grass[1]);
    img.ellipse(cx + 1, cy - 2, r * 0.45, r * 0.3, C.grass[2]);
    for (let i = 0; i < r; i++) img.put(cx + rnd.int(-r + 1, r - 1), cy + rnd.int(-3, 1), C.grass[3]);
  };
  bush(622, g - 3, 8);
  bush(8, g - 3, 9);
  bush(74, g - 2, 5);
  img.rect(609, g - 20, 2, 20, C.timber[3]); img.vline(609, g - 20, 20, C.timber[4]);
  img.poly([[603, g - 19], [616, g - 19], [619, g - 16.5], [616, g - 14], [603, g - 14]], C.wood[3]);
  img.hline(603, g - 19, 13, C.wood[5]); img.hline(603, g - 15, 13, C.wood[1]);
  img.put(606, g - 17, C.ink); img.put(608, g - 17, C.ink); img.put(610, g - 17, C.ink); img.put(613, g - 17, C.ink);
}

// ── the sleeper ──

// the traveler's head, asleep: the front-facing head from the character's own
// sprite sheet with the eyes closed. the game lays it on the pillow.
const HERE = path.dirname(fileURLToPath(import.meta.url));
export function sleeper(characterId) {
  const sheet = loadPng(path.join(HERE, `../public/assets/characters/${characterId}/standard/idle.png`));
  const head = sheet.crop(12, 64 * 2 + 6, 40, 27);            // frame 26, hair to chin
  const hex = (x, y) => head.get(x, y).slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
  const EYE = new Set(['84ec50', '53b351', '2b4b29', 'f2f7f8', '57cee4', '5686ae', '2a3c49']);   // iris, white, pupil
  const SKIN = 0xf9d5ba, LASH = 0x7a3a30;
  // find each eye by its colours, paint it over with skin, and draw it shut
  [[0, 20], [20, 40]].forEach(([xa, xb]) => {
    let x0 = 99, x1 = -1, y0 = 99, y1 = -1;
    for (let y = 16; y < 28; y++) {
      for (let x = xa; x < xb; x++) {
        if (!EYE.has(hex(x, y))) continue;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    }
    if (x1 < 0) return;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) head.put(x, y, SKIN);
    const mid = Math.round((y0 + y1) / 2);
    head.put(x0, mid, LASH); head.put(x1, mid, LASH);              // closed: a soft downward curve
    for (let x = x0 + 1; x < x1; x++) head.put(x, mid + 1, LASH);
  });
  return head;
}

// ── assemble ──
// ── assemble ──

// two layers: the far distance (sky, hills, the far trees) and everything near
// (the clearing and the house), so the game can slide them at different speeds
export function buildScene() {
  const rnd = rng(7);
  const backdrop = new Img(W, H);
  drawSky(backdrop);
  drawDistance(backdrop, rnd);
  const scene = new Img(W, H);
  drawOutside(scene, rnd);
  drawGround(scene, rnd);
  drawRoof(scene, rnd);
  drawShell(scene, rnd);
  furnish(scene, rnd, drawStones);
  drawPorch(scene, rnd);
  drawYard(scene, rnd);
  drawTufts(scene, rnd, [[0, 78], [600, W]], 0.55);
  return { backdrop, scene };
}

export function buildAll() {
  const { backdrop, scene } = buildScene();
  const sprites = buildSprites();
  sprites['sleeper-khatira'] = sleeper('lpc-khatira');
  sprites['sleeper-oliver'] = sleeper('lpc-oliver');
  return { backdrop, scene, sprites };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/assets/home');
  fs.mkdirSync(out, { recursive: true });
  const { backdrop, scene, sprites } = buildAll();
  backdrop.save(path.join(out, 'backdrop.png'));
  scene.save(path.join(out, 'scene.png'));
  Object.entries(sprites).forEach(([name, img]) => img.save(path.join(out, `${name}.png`)));
  console.log(`wrote backdrop.png, scene.png and ${Object.keys(sprites).length} sprites to ${out}`);
}
