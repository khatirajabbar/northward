// The furniture and props of the morning cabin. Each piece is drawn on its own
// small canvas, given a dark outline, and then either baked into the scene
// (things that never change) or saved as a sprite (things the game moves,
// swaps or layers: quilt, curtains, fridge, door, bag …).
import { Img, mix } from './pixel.mjs';

let C, L;
export function useTheme(palette, layout) { C = palette; L = layout; }

// draw on a w×h canvas, come back with a 1px outline around it (so the image
// is w+2 × h+2 and the drawing starts at 1,1)
function piece(w, h, draw, outline = C.ink) {
  const inner = new Img(w, h);
  draw(inner);
  const out = new Img(w + 2, h + 2);
  out.blit(inner, 1, 1);
  if (outline !== null) out.outline(outline);
  return out;
}

// stand a piece in the scene: x is its left edge, bottom the row under its feet
function place(scene, img, x, bottom = L.base) {
  scene.blit(img, x - 1, bottom - (img.h - 1));
}

// ── bedroom ──

export function bedFrame() {
  return piece(66, 36, (g) => {
    const w = C.wood;
    // head and foot posts
    g.rect(0, 3, 4, 33, w[2]); g.vline(0, 3, 33, w[3]); g.vline(3, 3, 33, w[1]);
    g.rect(0, 1, 4, 2, w[4]); g.rect(1, 0, 2, 1, w[5]); g.hline(0, 7, 4, w[1]);
    g.rect(62, 12, 4, 24, w[2]); g.vline(62, 12, 24, w[3]); g.vline(65, 12, 24, w[1]);
    g.rect(62, 10, 4, 2, w[4]); g.rect(63, 9, 2, 1, w[5]); g.hline(62, 16, 4, w[1]);
    // side rail
    g.rect(4, 27, 58, 4, w[2]); g.hline(4, 27, 58, w[4]); g.hline(4, 30, 58, w[0]);
    for (let x = 12; x < 60; x += 13) g.hline(x, 29, 5, w[1], 0.6);
    // mattress, striped ticking
    g.rect(4, 22, 58, 5, C.cream[2]); g.hline(4, 22, 58, C.cream[3]); g.hline(4, 26, 58, C.cream[0]);
    for (let x = 7; x < 62; x += 4) g.vline(x, 23, 3, C.teal[1], 0.4);
    // pillow
    g.rect(5, 15, 20, 7, C.white[2]); g.hline(6, 14, 18, C.white[2]);
    g.hline(5, 21, 20, C.white[0]); g.vline(24, 15, 6, C.white[1]); g.hline(7, 15, 12, 0xffffff);
    g.put(5, 14, [0, 0, 0, 0]); g.put(10, 18, C.white[1]); g.put(11, 19, C.white[1]); g.put(17, 17, C.white[1]);
  });
}

// the patchwork quilt. flat when the bed is empty; with someone under it, it
// humps up over shoulders and feet and the patches follow the curve
export function quilt(lump) {
  const rows = [
    [C.cream, C.mustard, C.teal, C.rust, C.cream, C.teal],
    [C.teal, C.cream, C.rust, C.teal, C.mustard, C.cream]
  ];
  const hump = [[0, 5], [2, 9], [5, 12], [13, 12], [21, 9], [30, 6], [34, 6], [38, 8], [41, 4]];
  const rise = (x) => {
    if (!lump) return 0;
    for (let i = 0; i + 1 < hump.length; i++) {
      const [x0, h0] = hump[i], [x1, h1] = hump[i + 1];
      if (x <= x1) return Math.round(h0 + ((h1 - h0) * (x - x0)) / (x1 - x0));
    }
    return 3;
  };
  const extra = lump ? 12 : 0;
  const hem = extra + 12;
  return piece(42, 13 + extra, (g) => {
    for (let x = 0; x < 42; x++) {
      const top = extra - rise(x);
      for (let y = top; y <= hem; y++) {
        const depth = y - top;                    // how far below the surface
        let c;
        if (x < 6) {                              // the sheet, turned down over the quilt
          c = C.cream[3];
          if (x === 5) c = C.cream[1];
          if (depth === 0) c = 0xffffff;
          if (y === hem) c = C.cream[1];
        } else {
          const col = Math.min(5, Math.floor((x - 6) / 6));
          const band = Math.floor((hem - y) / 5), within = (hem - y) % 5;   // counted up from the hem
          const p = rows[band % 2][(col + (band > 1 ? 2 : 0)) % 6];
          c = p[1];
          if (within === 4) c = p[2];                                // top edge of each patch
          if (within === 0) c = p[0];                                // the seam under it
          if ((x - 6) % 6 === 5 && col < 5) c = p[0];
          if ((x - 6) % 6 === 2 && within === 2) c = p[2];           // a stitch in the middle
          if (depth < 2) c = mix(c, 0xffffff, depth === 0 ? 0.4 : 0.18);   // lit from above
        }
        g.put(x, y, c);
      }
    }
  });
}

function nightstand() {
  return piece(14, 15, (g) => {
    const w = C.wood;
    g.rect(0, 0, 14, 2, w[4]); g.hline(0, 0, 14, w[5]); g.hline(0, 1, 14, w[3]);
    g.rect(1, 2, 12, 10, w[2]); g.vline(1, 2, 10, w[3]); g.vline(12, 2, 10, w[1]);
    g.rect(3, 4, 8, 5, w[3]); g.hline(3, 4, 8, w[4]); g.hline(3, 8, 8, w[1]); g.vline(10, 4, 5, w[1]);
    g.rect(6, 6, 2, 1, C.mustard[2]);
    g.hline(1, 11, 12, w[0]);
    g.rect(1, 12, 2, 3, w[1]); g.rect(11, 12, 2, 3, w[1]);
  });
}

function candle() {
  return piece(5, 7, (g) => {
    g.rect(1, 1, 2, 4, C.cream[3]); g.vline(2, 1, 4, C.cream[1]); g.put(1, 0, C.ink);
    g.rect(0, 5, 5, 1, C.mustard[2]); g.rect(1, 6, 3, 1, C.mustard[0]);
  });
}

function book(tone, w = 7) {
  return piece(w, 2, (g) => {
    g.rect(0, 0, w, 2, tone[1]); g.hline(0, 0, w, tone[2]); g.vline(w - 1, 0, 2, C.cream[3]);
  });
}

// a plank shelf with a row of books and a few keepsakes
function bookShelf() {
  return piece(42, 12, (g) => {
    const w = C.wood;
    g.rect(0, 9, 42, 2, w[4]); g.hline(0, 9, 42, w[5]); g.hline(0, 10, 42, w[2]);
    g.put(3, 11, w[1]); g.put(4, 11, w[1]); g.put(37, 11, w[1]); g.put(38, 11, w[1]);
    const spines = [
      [C.teal, 3, 8], [C.rust, 2, 7], [C.mustard, 3, 8], [C.cream, 2, 6], [C.teal, 2, 7],
      [C.stone.slice(1), 3, 8], [C.rust, 3, 6]
    ];
    let x = 2;
    spines.forEach(([tone, bw, bh]) => {
      g.rect(x, 9 - bh, bw, bh, tone[1]);
      g.vline(x, 9 - bh, bh, tone[2]);
      g.hline(x, 9 - bh + 2, bw, tone[0]);
      x += bw;
    });
    g.line(x + 1, 8, x + 3, 2, C.mustard[1]); g.line(x + 2, 8, x + 4, 2, C.mustard[0]);   // one leaning
    // a little framed photo and a jar of wildflowers
    g.rect(27, 2, 6, 7, w[3]); g.rect(28, 3, 4, 5, 0xbcd3d6); g.put(29, 6, C.pine[2]); g.put(30, 5, C.pine[2]); g.put(30, 6, C.pine[2]);
    g.rect(36, 5, 4, 4, 0xa9c6c9); g.hline(36, 5, 4, 0xd6e9e8);
    g.vline(37, 1, 4, C.grass[2]); g.vline(39, 2, 3, C.grass[2]);
    g.put(37, 0, 0xffe680); g.put(39, 1, 0xf2b6c0); g.put(38, 2, 0xf4f4ee);
  });
}

// a woven wall hanging, on its rod
function tapestry() {
  return piece(26, 26, (g) => {
    g.hline(0, 0, 26, C.wood[2]); g.put(0, 0, C.wood[4]); g.put(25, 0, C.wood[4]);
    for (let y = 1; y < 22; y++) {
      for (let x = 2; x < 24; x++) {
        const band = Math.floor((y - 1) / 3);
        let c = [C.rust[1], C.cream[2], C.teal[1], C.cream[2], C.mustard[1], C.cream[2], C.rust[1]][band % 7];
        const dx = Math.abs(x - 12.5), dy = Math.abs(y - 11);
        if (Math.abs(dx + dy * 1.6 - 9) < 1) c = C.cream[3];              // a big diamond
        if (dx + dy * 1.6 < 3.5) c = C.rust[2];
        if (x === 2 || x === 23) c = C.rust[0];
        g.put(x, y, c);
      }
    }
    for (let x = 2; x < 24; x += 2) { g.put(x, 22, C.cream[3]); g.put(x, 23, C.cream[2]); g.put(x, 24, C.cream[1]); }
  });
}

function cuckooClock() {
  return piece(11, 22, (g) => {
    const w = C.wood;
    g.poly([[5.5, 0], [11, 6], [0, 6]], w[1]);
    g.line(5, 0, 0, 5, w[3]); g.line(5, 0, 10, 5, w[0]);
    g.rect(1, 6, 9, 8, w[3]); g.vline(1, 6, 8, w[4]); g.vline(9, 6, 8, w[1]); g.hline(1, 13, 9, w[1]);
    g.rect(4, 3, 3, 2, w[0]);                                          // the cuckoo's little door
    g.ellipse(5.5, 10, 3, 3, C.cream[3]); g.put(5, 10, C.ink); g.put(5, 9, C.ink); g.put(6, 10, C.ink);
    g.vline(5, 14, 5, C.iron[3]); g.rect(4, 19, 3, 3, C.mustard[2]); g.put(4, 19, C.mustard[1]);   // pendulum
    g.vline(2, 14, 3, C.iron[3]); g.rect(1, 17, 2, 3, w[1]); g.vline(8, 14, 2, C.iron[3]); g.rect(8, 16, 2, 3, w[1]);   // weights
  });
}

// a little painted wooden horse — the kind every Swedish mantelpiece has
function dalaHorse() {
  return piece(9, 9, (g) => {
    const r = [0x8f2a1c, 0xc23c26, 0xe0563a];
    g.rect(2, 3, 6, 3, r[1]); g.rect(1, 1, 2, 4, r[1]); g.put(0, 2, r[1]); g.put(2, 0, r[1]);
    g.rect(2, 6, 1, 3, r[1]); g.rect(4, 6, 1, 3, r[0]); g.rect(6, 6, 1, 3, r[0]); g.rect(7, 6, 1, 3, r[1]);
    g.put(8, 3, r[1]); g.put(8, 4, r[0]);
    g.hline(2, 3, 5, r[2]); g.put(1, 1, r[2]);
    g.put(4, 4, 0xf7efd9); g.put(5, 4, C.teal[2]); g.put(6, 4, 0xf7efd9); g.put(2, 2, C.mustard[2]);
  });
}

function sampler() {
  return piece(14, 12, (g) => {
    g.rect(0, 0, 14, 12, C.wood[3]); g.hline(0, 0, 14, C.wood[5]); g.vline(13, 0, 12, C.wood[1]); g.hline(0, 11, 14, C.wood[1]);
    g.rect(2, 2, 10, 8, C.cream[3]);
    g.put(5, 4, C.rust[2]); g.put(8, 4, C.rust[2]); g.rect(5, 5, 4, 1, C.rust[2]); g.rect(6, 6, 2, 1, C.rust[2]); g.put(6, 7, C.rust[2]);
    [3, 10].forEach((x) => { g.put(x, 3, C.grass[2]); g.put(x, 8, C.grass[2]); });
    g.hline(4, 9, 6, C.teal[1], 0.7);
  });
}

// ── washing ──

function washstand() {
  return piece(22, 19, (g) => {
    const w = C.wood;
    g.rect(0, 0, 22, 2, w[4]); g.hline(0, 0, 22, w[5]); g.hline(0, 1, 22, w[3]);
    g.rect(1, 2, 20, 4, w[2]); g.hline(1, 2, 20, w[3]); g.hline(1, 5, 20, w[0]);
    g.rect(1, 6, 2, 13, w[2]); g.vline(2, 6, 13, w[1]);
    g.rect(19, 6, 2, 13, w[2]); g.vline(20, 6, 13, w[1]);
    g.rect(3, 13, 16, 2, w[3]); g.hline(3, 13, 16, w[4]); g.hline(3, 14, 16, w[1]);
    // folded towels on the lower shelf
    g.rect(5, 10, 9, 3, C.teal[1]); g.hline(5, 10, 9, C.teal[2]); g.hline(5, 11, 9, C.teal[0], 0.5);
    g.rect(6, 8, 8, 2, C.cream[2]); g.hline(6, 8, 8, C.cream[3]);
    g.rect(15, 11, 3, 2, C.rust[2]);
  });
}

function basin() {
  return piece(12, 5, (g) => {
    g.hline(0, 0, 12, C.white[2]); g.hline(0, 1, 12, C.white[1]);
    for (let x = 1; x < 11; x += 2) g.put(x, 1, C.teal[1]);
    g.hline(1, 2, 10, C.white[1]); g.hline(2, 3, 8, C.white[0]); g.hline(3, 4, 6, C.white[0]);
    g.put(2, 2, C.white[2]); g.put(3, 3, C.white[1]);
  });
}

function pitcher() {
  return piece(7, 9, (g) => {
    g.rect(1, 2, 4, 7, C.white[2]); g.rect(0, 4, 6, 4, C.white[2]);
    g.vline(4, 2, 7, C.white[0]); g.vline(5, 4, 4, C.white[0]);
    g.hline(1, 1, 3, C.white[1]); g.put(0, 1, C.white[1]);                 // spout
    g.hline(0, 5, 6, C.teal[1]);
    g.put(6, 3, C.white[1]); g.put(6, 4, C.white[1]); g.put(6, 5, C.white[1]); g.put(6, 6, C.white[1]);
  });
}

function mirror() {
  return piece(14, 18, (g) => {
    g.ellipse(7, 9, 7, 9, C.wood[3]);
    g.ellipse(6.5, 8.5, 6.6, 8.6, C.wood[4]);
    g.ellipse(7, 9, 5, 7, 0x86a9b3);
    g.ellipse(6.4, 8, 4.4, 6, 0xa6c7ce);
    for (let i = 0; i < 9; i++) {                                           // the shine
      const x = 3 + i, y = 12 - i;
      if (g.get(x, y)[0] === 0xa6 || g.get(x, y)[0] === 0x86) g.put(x, y, 0xe6f4f2);
      if (i > 2 && i < 8 && (g.get(x + 2, y)[0] === 0xa6 || g.get(x + 2, y)[0] === 0x86)) g.put(x + 2, y, 0xcfe6e6);
    }
  });
}

function toothShelf() {
  return piece(16, 7, (g) => {
    g.rect(0, 5, 16, 2, C.wood[4]); g.hline(0, 5, 16, C.wood[5]); g.hline(0, 6, 16, C.wood[2]);
    g.rect(3, 2, 3, 3, C.white[2]); g.vline(5, 2, 3, C.white[0]);          // cup
    g.line(5, 1, 7, -1, C.rust[3]); g.put(4, 0, C.teal[2]); g.put(4, 1, C.teal[2]);   // brushes
    g.rect(10, 4, 4, 1, 0xe8b9c2); g.rect(10, 3, 3, 1, 0xf4d3d9);          // soap
  });
}

function fern() {
  return piece(16, 24, (g) => {
    const cx = 8;
    const fronds = [[-7, 3], [-6, 9], [-4, 1], [-1, 0], [2, 1], [5, 4], [7, 10], [3, 8], [-3, 7]];
    fronds.forEach(([dx, topY], i) => {
      for (let t = 0; t <= 10; t++) {
        const k = t / 10;
        const x = Math.round(cx + dx * k), y = Math.round(17 - (17 - topY) * Math.sin((k * Math.PI) / 2));
        g.put(x, y, i % 2 ? C.grass[2] : C.grass[1]);
        if (t > 2 && t % 2 === 0) { g.put(x + (dx < 0 ? -1 : 1), y, C.grass[3]); g.put(x, y - 1, C.grass[2]); }
      }
    });
    g.rect(4, 17, 9, 2, C.rust[2]); g.hline(4, 17, 9, C.rust[3]);
    g.rect(5, 19, 7, 5, C.rust[1]); g.vline(5, 19, 5, C.rust[2]); g.vline(11, 19, 5, C.rust[0]);
    g.hline(6, 23, 5, C.rust[0]);
  }, 0x1c2f22);
}

// ── living corner ──

export function sofa() {
  return piece(58, 20, (g) => {
    const r = C.rust;
    // backrest: two fat cushions
    g.rect(5, 1, 48, 14, r[1]);
    g.hline(7, 0, 44, r[3]); g.hline(6, 1, 46, r[2]);
    g.put(5, 1, [0, 0, 0, 0]); g.put(52, 1, [0, 0, 0, 0]);
    g.rect(9, 3, 17, 2, r[2]); g.rect(32, 3, 17, 2, r[2]);
    g.vline(28, 1, 14, r[0]); g.vline(29, 1, 14, r[0], 0.5);
    g.put(17, 8, r[0]); g.put(40, 8, r[0]);
    g.hline(6, 13, 46, r[0], 0.5);
    // seat cushions
    g.rect(8, 14, 42, 3, r[2]); g.hline(8, 14, 42, r[3]); g.hline(8, 16, 42, r[1]);
    g.vline(28, 14, 3, r[0]); g.vline(29, 14, 3, r[1]);
    // apron and feet
    g.rect(8, 17, 42, 1, r[0]);
    g.rect(3, 18, 3, 2, C.wood[1]); g.rect(52, 18, 3, 2, C.wood[1]);
    // arms
    const arm = (x) => {
      g.rect(x, 7, 8, 11, r[1]);
      g.hline(x + 1, 6, 6, r[3]); g.hline(x, 7, 8, r[2]); g.hline(x, 8, 8, r[2]);
      g.vline(x, 9, 9, r[0]); g.vline(x + 7, 9, 9, r[0]);
      g.rect(x + 2, 10, 4, 6, r[2], 0.5);
    };
    arm(0); arm(50);
    // a mustard cushion in the corner, a teal throw over the other arm
    g.rect(9, 5, 10, 9, C.mustard[1]); g.hline(9, 5, 10, C.mustard[2]); g.vline(9, 5, 9, C.mustard[2]);
    g.hline(9, 13, 10, C.mustard[0]); g.vline(18, 5, 9, C.mustard[0]);
    g.put(13, 9, C.mustard[0]); g.put(14, 9, C.mustard[0]);
    g.rect(49, 4, 9, 11, C.teal[1]); g.hline(49, 4, 9, C.teal[3]);
    for (let y = 7; y < 15; y += 3) g.hline(49, y, 9, C.teal[2]);
    g.vline(49, 5, 10, C.teal[0]);
    for (let x = 49; x < 58; x += 2) g.put(x, 15, C.cream[3]);
  });
}

function painting() {
  return piece(30, 20, (g) => {
    const w = C.wood;
    g.rect(0, 0, 30, 20, w[3]);
    g.hline(0, 0, 30, w[5]); g.vline(0, 0, 20, w[4]); g.hline(0, 19, 30, w[1]); g.vline(29, 0, 20, w[1]);
    g.rect(2, 2, 26, 16, 0xf0cf9a);
    for (let y = 2; y < 9; y++) g.hline(2, y, 26, mix(0x8fb7c4, 0xf3d6a4, (y - 2) / 7));
    g.poly([[2, 13], [9, 5], [15, 11], [20, 6], [28, 13]], 0x6d8fa3);          // far peaks
    g.put(9, 5, 0xf2f5f3); g.put(8, 6, 0xf2f5f3); g.put(10, 6, 0xf2f5f3); g.put(20, 6, 0xf2f5f3); g.put(19, 7, 0xf2f5f3);
    g.poly([[2, 14], [6, 10], [12, 14]], 0x4f7a80); g.poly([[16, 14], [23, 9], [28, 14]], 0x4f7a80);
    g.rect(2, 13, 26, 3, C.teal[2]); g.hline(4, 14, 8, C.teal[3]); g.hline(16, 15, 9, C.teal[3]);
    g.rect(2, 16, 26, 2, C.grass[1]);
    [4, 7, 24, 26].forEach((x, i) => { g.vline(x, 11 + (i % 2), 6 - (i % 2), C.pine[1]); g.put(x - 1, 14, C.pine[1]); g.put(x + 1, 14, C.pine[1]); g.put(x - 1, 16, C.pine[1]); g.put(x + 1, 16, C.pine[1]); });
    g.rect(13, 14, 4, 2, C.rust[2]); g.hline(12, 13, 6, C.rust[0]);            // a tiny red cabin
  });
}

function sideTable() {
  return piece(14, 15, (g) => {
    const w = C.wood;
    g.hline(1, 0, 12, w[5]); g.hline(0, 1, 14, w[4]); g.hline(1, 2, 12, w[2]);
    g.rect(6, 3, 2, 9, w[2]); g.vline(7, 3, 9, w[1]);
    g.hline(4, 12, 6, w[2]); g.hline(3, 13, 8, w[2]); g.hline(3, 14, 2, w[1]); g.hline(9, 14, 2, w[1]);
  });
}

export function mug() {
  return piece(6, 5, (g) => {
    g.rect(0, 0, 4, 5, C.white[2]); g.vline(3, 0, 5, C.white[0]);
    g.hline(0, 2, 4, C.teal[1]); g.hline(0, 0, 4, 0x4a2f1e);
    g.put(4, 1, C.white[1]); g.put(5, 2, C.white[1]); g.put(4, 3, C.white[1]);
  });
}

function hangingLantern() {
  return piece(7, 11, (g) => {
    g.rect(2, 0, 3, 1, C.iron[2]); g.rect(1, 1, 5, 1, C.iron[3]);
    g.rect(0, 2, 7, 1, C.iron[2]);
    g.rect(1, 3, 5, 6, C.fire[2]); g.rect(2, 4, 3, 4, C.fire[3]);
    g.vline(0, 3, 6, C.iron[2]); g.vline(6, 3, 6, C.iron[1]); g.vline(3, 3, 6, C.iron[1], 0.5);
    g.rect(0, 9, 7, 1, C.iron[2]); g.rect(2, 10, 3, 1, C.iron[1]);
  }, C.iron[0]);
}

// ── kitchen ──

export function stove() {
  return piece(28, 30, (g) => {
    const i = C.iron;
    g.rect(0, 0, 28, 3, i[3]); g.hline(0, 0, 28, i[4]); g.hline(0, 2, 28, i[1]);
    g.rect(2, 3, 24, 23, i[2]);
    g.vline(2, 3, 23, i[3]); g.vline(3, 3, 23, i[3], 0.5); g.vline(25, 3, 23, i[1]); g.vline(24, 3, 23, i[1], 0.6);
    g.hline(2, 4, 24, i[1]);
    // the fire door, with its barred window
    g.rect(6, 6, 16, 14, i[1]); g.hline(6, 6, 16, i[3]); g.vline(6, 6, 14, i[3]);
    g.rect(8, 9, 12, 8, C.fire[0]);
    g.rect(8, 11, 12, 6, C.fire[1]); g.rect(9, 13, 10, 4, C.fire[2]); g.rect(11, 15, 5, 2, C.fire[3]);
    g.put(10, 10, C.fire[1]); g.put(14, 9, C.fire[1]); g.put(17, 10, C.fire[2]); g.put(12, 12, C.fire[2]); g.put(16, 12, C.fire[3]);
    [10, 13, 16].forEach((x) => g.vline(x + 1, 9, 8, i[0]));
    g.put(23, 12, C.mustard[2]); g.put(23, 13, C.mustard[0]);
    // ash drawer
    g.rect(8, 21, 12, 3, i[1]); g.hline(8, 21, 12, i[3]);
    for (let x = 10; x < 19; x += 2) g.put(x, 22, i[0]);
    // legs
    g.rect(3, 26, 3, 4, i[1]); g.rect(22, 26, 3, 4, i[1]); g.hline(2, 29, 5, i[1]); g.hline(21, 29, 5, i[1]);
    g.vline(3, 26, 3, i[3]); g.vline(22, 26, 3, i[3]);
  }, C.iron[0]);
}

function stovePipe(len) {
  return piece(5, len, (g) => {
    const i = C.iron;
    for (let y = 0; y < len; y++) {
      g.put(0, y, i[1]); g.put(1, y, i[4]); g.put(2, y, i[3]); g.put(3, y, i[2]); g.put(4, y, i[1]);
      if (y % 16 === 8) g.hline(0, y, 5, i[0]);
      if (y % 16 === 7) g.hline(0, y, 5, i[4]);
    }
  }, C.iron[0]);
}

function coffeePot() {
  return piece(11, 11, (g) => {
    const t = [0x2c5f7a, 0x3f7f9c, 0x5f9fb8, 0x8fc2d2];           // blue enamel
    g.rect(3, 3, 5, 8, t[1]); g.rect(2, 6, 7, 5, t[1]);
    g.vline(3, 3, 8, t[2]); g.vline(2, 6, 5, t[2]); g.vline(8, 6, 5, t[0]); g.vline(7, 3, 3, t[0]);
    g.hline(3, 2, 5, t[0]); g.rect(5, 0, 1, 2, C.iron[2]);
    g.put(1, 5, t[1]); g.put(0, 4, t[1]); g.put(1, 6, t[0]);       // spout
    g.put(9, 4, t[0]); g.put(10, 5, t[0]); g.put(10, 6, t[0]); g.put(10, 7, t[0]); g.put(9, 8, t[0]);   // handle
    g.put(4, 5, 0xf2f5f3); g.put(6, 8, 0xf2f5f3); g.put(5, 9, t[3]); g.put(4, 7, t[3]);     // speckles
    g.hline(2, 10, 7, t[0]);
  });
}

function firewood() {
  return piece(13, 11, (g) => {
    const log = (x, y) => {
      g.rect(x, y, 4, 4, C.timber[3]);
      g.rect(x + 1, y + 1, 2, 2, C.cut[3]); g.put(x + 1, y + 1, C.cut[2]);
      g.put(x, y, C.timber[1]); g.put(x + 3, y + 3, C.timber[1]);
    };
    log(0, 7); log(4, 7); log(8, 7);
    log(2, 3); log(6, 3);
    log(4, -1 + 0);
    g.rect(4, 0, 4, 3, C.timber[3]); g.rect(5, 0, 2, 2, C.cut[3]);
  }, C.timber[0]);
}

function counter() {
  return piece(48, 20, (g) => {
    const w = C.wood;
    g.rect(0, 0, 48, 2, w[4]); g.hline(0, 0, 48, w[5]); g.hline(0, 1, 48, w[3]);
    g.rect(1, 2, 46, 16, w[2]); g.vline(1, 2, 16, w[3]); g.vline(46, 2, 16, w[1]);
    g.hline(1, 2, 46, w[0], 0.7);                                   // shadow under the worktop
    const door = (x) => {
      g.rect(x, 4, 20, 12, w[2]);
      g.hline(x, 4, 20, w[1]); g.vline(x, 4, 12, w[1]); g.hline(x, 15, 20, w[0]); g.vline(x + 19, 4, 12, w[0]);
      g.rect(x + 3, 7, 14, 6, w[3]); g.hline(x + 3, 7, 14, w[4]); g.vline(x + 3, 7, 6, w[4]);
      g.hline(x + 3, 12, 14, w[1]); g.vline(x + 16, 7, 6, w[1]);
    };
    door(3); door(25);
    g.put(21, 9, C.mustard[2]); g.put(21, 10, C.mustard[0]); g.put(26, 9, C.mustard[2]); g.put(26, 10, C.mustard[0]);
    g.rect(2, 18, 44, 2, w[0]);
  });
}

export function bowl(fill) {
  return piece(10, 5, (g) => {
    g.hline(0, 0, 10, C.white[2]);
    if (fill === 'cereal') { g.hline(1, 0, 8, C.mustard[1]); g.put(2, 0, C.mustard[2]); g.put(5, 0, C.mustard[2]); g.put(7, 0, C.mustard[0]); }
    if (fill === 'milk') { g.hline(1, 0, 8, 0xfbfbf4); g.put(2, 0, C.mustard[1]); g.put(4, 0, C.mustard[2]); g.put(7, 0, C.mustard[1]); }
    g.hline(0, 1, 10, C.white[1]); g.hline(0, 1, 10, C.rust[2], 0.85);
    g.hline(1, 2, 8, C.white[2]); g.hline(1, 3, 8, C.white[1]); g.hline(3, 4, 4, C.white[0]);
    g.put(1, 3, C.white[2]); g.put(8, 2, C.white[0]); g.put(8, 3, C.white[0]); g.put(2, 4, [0, 0, 0, 0]);
  });
}

function cerealBox() {
  return piece(6, 9, (g) => {
    g.rect(0, 0, 6, 9, C.mustard[1]); g.vline(0, 0, 9, C.mustard[2]); g.vline(5, 0, 9, C.mustard[0]);
    g.rect(0, 2, 6, 2, C.rust[2]); g.rect(2, 5, 2, 2, C.white[2]); g.hline(0, 0, 6, C.mustard[2]);
  });
}

function breadBoard() {
  return piece(12, 6, (g) => {
    g.rect(0, 4, 12, 2, C.wood[4]); g.hline(0, 4, 12, C.wood[5]);
    g.rect(2, 1, 8, 3, 0xc79a5b); g.hline(3, 0, 6, 0xd9b27a); g.hline(2, 3, 8, 0xa87d42);
    g.put(4, 1, 0xa87d42); g.put(6, 1, 0xa87d42); g.put(8, 1, 0xa87d42);
  });
}

function kitchenShelf() {
  return piece(46, 14, (g) => {
    const w = C.wood;
    g.rect(0, 11, 46, 2, w[4]); g.hline(0, 11, 46, w[5]); g.hline(0, 12, 46, w[2]);
    g.put(3, 13, w[1]); g.put(4, 13, w[1]); g.put(41, 13, w[1]); g.put(42, 13, w[1]);
    // a stack of plates
    for (let y = 7; y < 11; y++) { g.hline(2, y, 9, y % 2 ? C.white[2] : C.white[0]); }
    g.hline(3, 6, 7, C.white[2]);
    // two mugs
    const cup = (x, tone) => { g.rect(x, 7, 4, 4, tone[1]); g.vline(x, 7, 4, tone[2]); g.vline(x + 3, 7, 4, tone[0]); g.put(x + 4, 8, tone[0]); g.put(x + 4, 9, tone[0]); };
    cup(14, C.teal); cup(20, C.rust);
    // jars
    const jar = (x, fill) => { g.rect(x, 5, 5, 6, 0xb7d0d2); g.rect(x, 7, 5, 4, fill); g.vline(x, 5, 6, 0xdff0ee); g.rect(x, 4, 5, 1, C.wood[2]); };
    jar(27, C.mustard[1]); jar(33, C.rust[1]);
    // a trailing plant at the end
    g.rect(40, 8, 5, 3, C.rust[2]); g.hline(40, 8, 5, C.rust[3]);
    [[40, 7], [41, 6], [42, 5], [43, 6], [44, 7], [42, 7], [39, 8], [45, 8]].forEach(([x, y]) => g.put(x, y, C.grass[2]));
    [[41, 5], [43, 5], [42, 4]].forEach(([x, y]) => g.put(x, y, C.grass[3]));
  });
}

function herbBundle(tone) {
  return piece(5, 12, (g) => {
    g.vline(2, 0, 4, C.cream[1]);
    g.rect(1, 4, 3, 6, tone[0]); g.rect(0, 5, 5, 4, tone[1]);
    g.put(1, 5, tone[2]); g.put(3, 7, tone[2]); g.put(2, 9, tone[2]); g.put(0, 9, tone[0]); g.put(4, 10, tone[1]); g.put(2, 10, tone[1]); g.put(2, 11, tone[0]);
    g.hline(1, 4, 3, C.cream[2]);
  }, 0x1c2f22);
}

const ENAMEL = [0x2f5a5d, 0x3f7477, 0x5f9ea0, 0x7fbcbc, 0xa6d6d2];

function fridgeBody(g) {
  const e = ENAMEL;
  g.rect(0, 2, 24, 43, e[2]); g.rect(1, 1, 22, 1, e[2]); g.rect(2, 0, 20, 1, e[3]);
  g.vline(1, 2, 43, e[3]); g.vline(2, 3, 41, e[3], 0.6);
  g.vline(22, 2, 43, e[1]); g.vline(21, 3, 41, e[1], 0.6); g.vline(23, 2, 43, e[1]);
  g.hline(3, 1, 18, e[4]);
  g.hline(0, 14, 24, e[0]);                                    // between freezer and fridge doors
  g.hline(0, 43, 24, e[1]); g.hline(0, 44, 24, e[0]);
  g.rect(3, 45, 3, 3, C.iron[1]); g.rect(18, 45, 3, 3, C.iron[1]);
  g.rect(16, 4, 4, 1, C.white[1]);                             // badge
  g.rect(4, 6, 2, 6, C.white[2]); g.vline(5, 6, 6, C.white[0]);          // freezer handle
}

export function fridge() {
  return piece(24, 48, (g) => {
    fridgeBody(g);
    g.rect(4, 18, 2, 12, C.white[2]); g.vline(5, 18, 12, C.white[0]);
    // a note under a magnet, and a little heart
    g.rect(11, 20, 6, 7, C.cream[3]); g.hline(12, 22, 4, C.cream[0]); g.hline(12, 24, 3, C.cream[0]);
    g.put(13, 20, C.rust[3]); g.put(14, 20, C.rust[3]);
    g.put(15, 32, C.rust[2]); g.put(17, 32, C.rust[2]); g.rect(15, 33, 3, 1, C.rust[2]); g.put(16, 34, C.rust[2]);
  });
}

export function fridgeOpen() {
  return piece(33, 48, (g) => {
    fridgeBody(g);
    // inside: lit, with shelves
    g.rect(2, 16, 20, 26, 0xf6efd6);
    g.vline(2, 16, 26, 0xd9cfae); g.vline(21, 16, 26, 0xe6dcbc); g.hline(2, 16, 20, 0xd9cfae);
    g.hline(3, 24, 18, 0xb9b29a); g.hline(3, 32, 18, 0xb9b29a);
    g.rect(5, 18, 3, 6, 0xffffff); g.rect(5, 17, 3, 1, C.teal[1]); g.vline(7, 18, 6, C.white[0]);     // the milk
    g.rect(10, 20, 3, 4, C.rust[2]); g.hline(10, 20, 3, C.cream[1]);
    g.rect(15, 21, 4, 3, C.mustard[1]); g.hline(15, 21, 4, C.mustard[2]);
    g.rect(4, 29, 7, 3, C.cream[1]); g.put(5, 28, C.cream[3]); g.put(7, 28, C.cream[3]); g.put(9, 28, C.cream[3]);  // eggs
    g.rect(14, 27, 3, 5, 0xe08a3c); g.rect(14, 26, 3, 1, C.white[1]);
    g.rect(3, 34, 18, 7, 0xcfe4dc); g.hline(3, 34, 18, 0xa9c7bf);
    g.ellipse(8, 38, 3.5, 2.5, C.grass[2]); g.ellipse(7, 37, 2, 1.4, C.grass[3]);
    g.ellipse(15, 38, 2.5, 2.5, C.rust[2]); g.put(15, 36, C.grass[1]);
    // the door, swung open toward you: its inner side, with a bottle rack
    const e = ENAMEL;
    g.rect(24, 15, 9, 29, e[2]); g.vline(24, 15, 29, e[1]); g.vline(32, 15, 29, e[1]); g.hline(24, 15, 9, e[3]);
    g.rect(26, 17, 5, 25, 0xe8e2c8); g.hline(26, 26, 5, 0xb9b29a); g.hline(26, 36, 5, 0xb9b29a);
    g.rect(27, 21, 2, 5, C.teal[1]); g.rect(29, 23, 1, 3, C.rust[2]);
    g.rect(27, 31, 3, 5, 0xe08a3c); g.put(28, 30, C.white[2]);
    g.hline(24, 43, 9, e[1]);
  });
}

// ── by the door ──

function coatHooks() {
  return piece(26, 22, (g) => {
    const w = C.wood;
    g.rect(0, 0, 26, 3, w[3]); g.hline(0, 0, 26, w[5]); g.hline(0, 2, 26, w[1]);
    [4, 13, 22].forEach((x) => { g.rect(x, 2, 1, 3, C.iron[3]); g.put(x, 4, C.iron[1]); });
    // a long striped scarf on the first peg
    for (let y = 4; y < 21; y++) {
      const tone = Math.floor(y / 3) % 2 ? C.cream[2] : C.teal[1];
      g.hline(2, y, 2, tone); g.hline(5, y, 2, tone);
      g.put(3, y, tone === C.cream[2] ? C.cream[1] : C.teal[0]);
    }
    g.put(2, 21, C.cream[3]); g.put(3, 21, C.cream[3]); g.put(5, 21, C.cream[3]); g.put(6, 21, C.cream[3]);
    g.hline(3, 4, 3, C.teal[2]);
    // a straw hat on the last one
    g.rect(19, 5, 6, 4, C.mustard[2]); g.hline(20, 4, 4, C.mustard[2]); g.vline(24, 5, 4, C.mustard[1]);
    g.hline(19, 8, 6, C.rust[2]);
    g.hline(16, 9, 10, C.mustard[2]); g.hline(15, 10, 11, C.mustard[1]); g.hline(17, 11, 8, C.mustard[0]);
  });
}

export function bag() {
  return piece(12, 17, (g) => {
    const l = [0x4f3523, 0x6e4a2e, 0x8a6039, 0xa97c4c];          // leather
    g.line(5, 0, 1, 8, l[1]); g.line(6, 0, 10, 8, l[1]);            // the strap, up to its peg
    g.rect(0, 8, 12, 9, l[1]); g.vline(0, 8, 9, l[2]); g.vline(11, 8, 9, l[0]); g.hline(0, 16, 12, l[0]);
    g.rect(0, 8, 12, 5, l[2]); g.hline(0, 8, 12, l[3]); g.hline(1, 12, 10, l[0]);
    g.put(0, 12, l[1]); g.put(11, 12, l[1]);
    g.rect(5, 11, 2, 3, C.mustard[2]); g.put(5, 13, C.mustard[0]); g.put(6, 13, C.mustard[0]);
    for (let x = 2; x < 10; x += 2) g.put(x, 15, l[3]);
  });
}

function boots() {
  return piece(12, 8, (g) => {
    const b = [0x2a1d16, 0x3f2c20, 0x57402e];
    const boot = (x) => {
      g.rect(x, 0, 3, 6, b[1]); g.vline(x, 0, 6, b[2]); g.rect(x, 5, 5, 2, b[1]); g.hline(x, 7, 5, b[0]);
      g.hline(x, 0, 3, b[2]); g.put(x + 4, 5, b[2]);
    };
    boot(0); boot(6);
  });
}

// the door, seen edge-on while it's shut and face-on once it swings out
export function doorClosed() {
  return piece(3, 46, (g) => {
    g.rect(0, 0, 3, 46, C.wood[2]); g.vline(0, 0, 46, C.wood[4]); g.vline(2, 0, 46, C.wood[1]);
    g.rect(0, 6, 3, 2, C.iron[2]); g.rect(0, 36, 3, 2, C.iron[2]);
    g.put(0, 23, C.mustard[2]);
  });
}

export function doorOpen() {
  return piece(24, 46, (g) => {
    const w = C.wood;
    for (let x = 0; x < 24; x++) {
      const board = Math.floor(x / 6);
      g.vline(x, 0, 46, board % 2 ? w[2] : w[3]);
      if (x % 6 === 5) g.vline(x, 0, 46, w[1]);
      if (x % 6 === 0) g.vline(x, 0, 46, w[4], 0.6);
    }
    const batten = (y) => { g.rect(0, y, 24, 4, w[3]); g.hline(0, y, 24, w[5]); g.hline(0, y + 3, 24, w[0]); for (let x = 3; x < 24; x += 6) g.put(x, y + 1, C.iron[1]); };
    batten(5); batten(36);
    g.line(2, 34, 21, 10, w[1]); g.line(2, 35, 21, 11, w[3]); g.line(2, 36, 21, 12, w[0]);    // the brace
    g.rect(18, 22, 3, 4, C.iron[2]); g.put(19, 26, C.iron[1]); g.put(18, 23, C.iron[4]);
    g.hline(0, 0, 24, w[4]); g.hline(0, 45, 24, w[0]);
  });
}

// ── window ──

// each half of the curtains: drawn shut, or gathered to its side of the window
export function curtain(open) {
  const h = 46;
  if (!open) {
    return piece(21, h, (g) => {
      for (let x = 0; x < 21; x++) {
        const fold = [1, 2, 3, 2, 1, 0][x % 6];
        const lit = 0.1 + 0.3 * (x / 20);                         // the morning behind it, brighter toward the middle
        for (let y = 0; y < h - ((x % 6 === 5) ? 1 : 0); y++) {
          let c = mix(C.cream[fold], 0xfff0c2, lit);
          if (y < 3) c = mix(C.cream[Math.max(0, fold - 1)], 0x8a6a48, 0.25);
          if (y >= h - 8 && y < h - 6) c = mix(C.rust[2], 0xfff0c2, lit * 0.5);
          if (y === h - 4) c = mix(C.rust[1], 0xfff0c2, lit * 0.5);
          g.put(x, y, c);
        }
        if (x % 3 === 1) g.put(x, 0, C.iron[2]);                  // rings on the rod
      }
    }, 0x5a4634);
  }
  return piece(9, h, (g) => {
    for (let y = 0; y < h; y++) {
      const tied = y >= 27 && y <= 28;
      const wide = y < 26 ? 8 : tied ? 5 : Math.min(8, 5 + Math.floor((y - 28) / 4));
      for (let x = 0; x < wide; x++) {
        let c = C.cream[[1, 3, 2, 3, 1, 2, 3, 1][x]];
        if (y < 3) c = mix(c, 0x8a6a48, 0.3);
        if (tied) c = C.rust[2];
        if (y >= h - 8 && y < h - 6) c = C.rust[2];
        if (y === h - 4) c = C.rust[1];
        g.put(x, y, c);
      }
      if (y === 0) { g.put(1, 0, C.iron[2]); g.put(4, 0, C.iron[2]); g.put(7, 0, C.iron[2]); }
    }
  }, 0x5a4634);
}

export function bird() {
  return piece(9, 8, (g) => {
    const b = [0x4a3a28, 0x6b5135, 0x8a6d49, 0xc9b08a];
    g.ellipse(4.5, 4.5, 3.6, 2.8, b[1]);
    g.ellipse(2.5, 2.5, 2.2, 2.1, b[1]);
    g.put(0, 3, 0xd9a441); g.put(2, 2, 0x17191e);                 // beak, eye
    g.rect(4, 4, 4, 2, b[0]); g.put(8, 4, b[0]);                  // wing and tail
    g.put(2, 5, b[3]); g.put(3, 6, b[3]); g.put(4, 6, b[3]); g.put(3, 5, b[2]);
    g.put(4, 7, 0xd9a441); g.put(6, 7, 0xd9a441);
  });
}

// ── small effects ──

export function effects() {
  const plain = (w, h, draw) => { const im = new Img(w, h); draw(im); return im; };
  return {
    // a soft round warm light for lanterns and the stove
    glow: plain(48, 48, (g) => {
      for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
          const d = Math.hypot(x - 23.5, y - 23.5) / 24;
          if (d >= 1) continue;
          const a = Math.pow(1 - d, 2) * 0.8;
          const steps = Math.round(a * 6) / 6;                    // banded, with a dithered edge
          const dither = ((x + y) % 2 === 0) ? 0.07 : 0;
          g.put(x, y, [255, 214, 138, Math.round(Math.min(1, steps + dither * (a > 0.03 ? 1 : 0)) * 255)]);
        }
      }
    }),
    // sunlight through the window: a faint beam and a bright patch on the boards
    sunlight: plain(74, 70, (g) => {
      const beam = [[22, 4], [56, 4], [50, 60], [8, 60]];
      const patch = [[10, 60], [52, 60], [40, 68], [0, 68]];
      for (let y = 0; y < 70; y++) {
        for (let x = 0; x < 74; x++) {
          const inside = (poly) => {
            let hit = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
              const [xi, yi] = poly[i], [xj, yj] = poly[j];
              if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
            }
            return hit;
          };
          if (inside(patch)) g.put(x, y, [255, 232, 170, (x + y) % 2 ? 78 : 62]);
          else if (inside(beam)) g.put(x, y, [255, 232, 170, (x + y) % 2 ? 16 : 8]);
        }
      }
    }),
    puff: plain(7, 6, (g) => { g.ellipse(3.5, 3, 3.4, 2.8, [226, 230, 228, 150]); g.ellipse(2.8, 2.2, 1.8, 1.4, [246, 248, 246, 170]); }),
    steam: plain(3, 6, (g) => { [[1, 5], [2, 4], [1, 3], [0, 2], [1, 1], [2, 0]].forEach(([x, y]) => g.put(x, y, [240, 244, 242, 190])); }),
    note: plain(5, 7, (g) => { g.vline(3, 0, 6, 0xf7efd9); g.put(4, 1, 0xf7efd9); g.put(4, 2, 0xf7efd9); g.rect(1, 4, 3, 2, 0xf7efd9); g.put(0, 5, 0xf7efd9); g.put(2, 6, 0xf7efd9); g.put(1, 6, 0xf7efd9); }),
    sparkle: plain(5, 5, (g) => { g.vline(2, 0, 5, 0xffffff); g.hline(0, 2, 5, 0xffffff); g.put(2, 2, 0xcfeef0); }),
    zzz: plain(5, 5, (g) => { g.hline(0, 0, 5, 0xe8f0f8); g.put(3, 1, 0xe8f0f8); g.put(2, 2, 0xe8f0f8); g.put(1, 3, 0xe8f0f8); g.hline(0, 4, 5, 0xe8f0f8); })
  };
}

// ── putting the room together ──

// where the game puts each sprite (top-left corner, art pixels). outlined
// pieces include their 1px outline, so these are 1 less than the drawing.
export const PLACE = {};

const WIN = { x: 244, y: 243, w: 40, h: 38 };

// the window's frame, the cross between the panes, the sill and the shine on
// the glass — drawn over whatever is outside
export function windowFront() {
  const { w, h } = WIN, ox = 4, oy = 1;
  const im = new Img(w + 8, h + 5);
  const f = C.wood;
  const R = (x, y, ww, hh, c, a) => im.rect(ox + x, oy + y, ww, hh, c, a);
  // glass
  R(3, 3, w - 6, h - 6, 0xcfe6ee, 0.1);
  for (let k = 0; k < 9; k++) { im.px(ox + 7 + k, oy + 14 - k, 0xffffff, 0.34); im.px(ox + 9 + k, oy + 15 - k, 0xffffff, 0.2); im.px(ox + 24 + k, oy + 30 - k, 0xffffff, 0.26); }
  // frame and the cross between the panes
  R(0, 0, w, 3, f[3]); R(0, h - 3, w, 3, f[3]); R(0, 0, 3, h, f[3]); R(w - 3, 0, 3, h, f[3]);
  R(0, 0, w, 1, f[5]); R(0, 0, 1, h, f[4]); R(3, 2, w - 6, 1, f[1]); R(2, 3, 1, h - 6, f[1]);
  R(w - 1, 0, 1, h, f[1]); R(3, h - 3, w - 6, 1, f[4]);
  R(19, 3, 2, h - 6, f[3]); R(20, 3, 1, h - 6, f[1]);
  R(3, 18, w - 6, 2, f[3]); R(3, 19, w - 6, 1, f[1]);
  // outline, sill
  R(0, -1, w, 1, C.ink); R(-1, 0, 1, h, C.ink); R(w, 0, 1, h, C.ink);
  R(-3, h, w + 6, 3, f[4]); R(-3, h, w + 6, 1, f[5]); R(-3, h + 2, w + 6, 1, f[1]);
  R(-3, h + 3, w + 6, 1, C.ink); R(-4, h + 1, 1, 1, C.ink); R(w + 3, h + 1, 1, 1, C.ink);
  return im;
}

function drawWindow(scene) {
  const { x, y, w, h } = WIN;
  // what's outside: bright morning sky and the far trees
  for (let j = 3; j < h - 3; j++) {
    for (let i = 3; i < w - 3; i++) scene.put(x + i, y + j, mix(0x9fc6d2, 0xf5e3b6, Math.pow(j / h, 1.3)));
  }
  for (let i = 3; i < w - 3; i++) {
    const far = 4 + Math.round(2 * Math.sin(i * 0.9) + 2 * Math.sin(i * 0.37 + 1));
    scene.vline(x + i, y + h - 4 - far, far + 1, 0x86aaa8);
    const near = 2 + ((i * 7) % 5 === 0 ? 4 : (i * 3) % 4 === 0 ? 2 : 0);
    scene.vline(x + i, y + h - 4 - near, near + 1, 0x56827f);
  }
  // a pine bough reaching across from the right — where the bird sits
  const bough = [[36, 26], [33, 27], [30, 28], [27, 29], [24, 30], [22, 30]];
  bough.forEach(([i, j], k) => {
    scene.put(x + i, y + j, 0x5a4332); scene.put(x + i + 1, y + j, 0x5a4332); scene.put(x + i + 2, y + j, 0x5a4332);
    scene.put(x + i, y + j + 1, 0x3b2a20);
    if (k % 2 === 0) { scene.put(x + i + 1, y + j + 1, C.pine[3]); scene.put(x + i + 1, y + j + 2, C.pine[2]); scene.put(x + i + 2, y + j + 2, C.pine[3]); scene.put(x + i, y + j + 3, C.pine[2]); }
    if (k % 2 === 1) { scene.put(x + i + 2, y + j - 1, C.pine[3]); scene.put(x + i + 1, y + j - 2, C.pine[4]); }
  });
  scene.shade(x - 2, y + h + 4, w + 4, 2, 0.8);                  // the sill's shadow on the wall
  // curtain rod
  scene.hline(x - 6, y - 4, w + 12, C.iron[2]); scene.hline(x - 6, y - 5, w + 12, C.iron[4]);
  [x - 8, x + w + 6].forEach((fx) => { scene.rect(fx, y - 6, 3, 3, C.iron[3]); scene.put(fx, y - 6, C.iron[4]); scene.put(fx + 2, y - 4, C.iron[1]); });
  PLACE['window-front'] = [x - 4, y - 1];
  PLACE['curtain-shut-l'] = [x - 2, y - 5]; PLACE['curtain-shut-r'] = [x + 19, y - 5];
  PLACE['curtain-open-l'] = [x - 6, y - 5]; PLACE['curtain-open-r'] = [x + w - 5, y - 5];
  PLACE.bird = [x + 24, y + 20];
  PLACE.sunlight = [x - 14, y - 2];
}

export function furnish(scene, rnd, drawStones) {
  const base = L.base;
  const put = (img, x, bottom = base) => place(scene, img, x, bottom);
  const floorShadow = (x, w) => scene.shade(x, base + 1, w, 1, 0.72);
  const wallShadow = (x, top, h) => scene.shade(x, top, 2, h, 0.84);

  // rugs lie flat on the boards
  const rug = (x0, x1, tones, stripe) => {
    for (let y = L.floorBack + 2; y < L.floorFront - 1; y++) {
      const inset = y === L.floorBack + 2 || y === L.floorFront - 2 ? 2 : 0;
      for (let x = x0 + inset; x < x1 - inset; x++) {
        let c = tones[1];
        if (x - x0 < 3 || x1 - x < 4) c = stripe;
        else if ((x - x0) % 8 === 5) c = tones[2];
        if (y === L.floorBack + 2) c = mix(c, 0x000000, 0.15);
        scene.put(x, y, c);
      }
    }
    for (let y = L.floorBack + 3; y < L.floorFront - 2; y += 2) { scene.put(x0 - 1, y, C.cream[3]); scene.put(x1, y, C.cream[3]); }
  };
  rug(178, 238, C.rust, C.cream[2]);
  rug(292, 356, C.teal, C.mustard[1]);

  // ── bed corner ──
  wallShadow(174, 284, 22);
  put(bedFrame(), 108); floorShadow(108, 66);
  PLACE.quilt = [108 + 20 - 1, base - 36 + 20 - 1];
  PLACE['quilt-lump'] = [108 + 20 - 1, base - 36 + 20 - 1 - 12];
  put(bookShelf(), 126, 262);
  put(tapestry(), 136, 244);
  scene.shade(127, 262, 40, 2, 0.8);
  put(nightstand(), 177); floorShadow(177, 14);
  put(candle(), 179, base - 15); put(book(C.teal), 184, base - 15);

  // ── washstand ──
  put(mirror(), 207, 268);
  put(toothShelf(), 206, 277);
  scene.shade(207, 277, 14, 2, 0.8);
  put(washstand(), 203); floorShadow(203, 22);
  put(basin(), 205, base - 19); put(pitcher(), 217, base - 19);
  put(fern(), 227); floorShadow(231, 8);

  // ── window ──
  drawWindow(scene);

  // ── sofa, picture, lamp, little table ──
  put(painting(), 308, 268);
  scene.shade(309, 268, 28, 2, 0.8);
  wallShadow(352, 292, 14);
  PLACE.sofa = [294 - 1, base - 20 - 1];
  floorShadow(294, 58);
  put(cuckooClock(), 356, 268);
  put(sideTable(), 354); floorShadow(357, 8);
  put(book(C.rust, 6), 360, base - 15);
  PLACE.mug = [355, base - 15 - 6];
  // the lantern on its chain
  for (let y = L.ceiling + 6; y < 222; y += 2) scene.put(305, y, C.iron[3]);
  put(hangingLantern(), 302, 233);
  PLACE['glow-lantern'] = [305 - 24, 228 - 24];

  // ── stove, on its stone hearth ──
  drawStones(scene, rnd, 372, 410, 236, 12, 6);
  scene.vline(372, 236, 68, C.stone[0]); scene.vline(409, 236, 68, C.stone[0]);
  scene.rect(370, 233, 42, 3, C.wood[4]); scene.hline(370, 233, 42, C.wood[5]); scene.hline(370, 235, 42, C.wood[1]);
  scene.hline(370, 232, 42, C.ink); scene.hline(370, 236, 42, C.ink);
  scene.rect(370, L.floorBack, 42, 5, C.stone[2]); scene.hline(370, L.floorBack, 42, C.stone[3]); scene.hline(370, L.floorBack + 4, 42, C.stone[0]);
  for (let x = 376; x < 410; x += 9) scene.vline(x, L.floorBack + 1, 3, C.stone[1]);
  put(stovePipe(base - 30 - L.ceiling), 389, base - 30);
  put(stove(), 377); floorShadow(377, 28);
  put(coffeePot(), 379, base - 30);
  PLACE['glow-stove'] = [391 - 24, base - 17 - 24];
  PLACE.steam = [381, base - 30 - 14];
  // mantel things: a painted horse and a candle
  put(dalaHorse(), 376, 233);
  put(candle(), 401, 233);
  put(firewood(), 408); floorShadow(408, 12);

  // ── kitchen ──
  put(kitchenShelf(), 423, 268);
  scene.shade(424, 268, 44, 2, 0.8);
  put(counter(), 422); floorShadow(422, 48);
  put(cerealBox(), 450, base - 20); put(breadBoard(), 457, base - 20);
  PLACE.bowl = [434, base - 20 - 6];
  put(herbBundle(C.grass), 428, L.ceiling + 13); put(herbBundle([0x5a4f80, 0x7a6da6, 0x9d91c4]), 437, L.ceiling + 14);
  put(herbBundle(C.grass), 445, L.ceiling + 12);
  wallShadow(498, 266, 40);
  PLACE.fridge = [474 - 1, base - 48 - 1];
  floorShadow(474, 24);
  // a potted plant on top of the fridge
  PLACE['fridge-plant'] = [478, base - 48 - 9];

  // ── by the door ──
  put(sampler(), 508, 256);
  put(coatHooks(), 502, 287);
  PLACE.bag = [510, 267];
  for (let y = L.floorBack + 2; y < L.floorFront - 1; y++) {
    for (let x = 505; x < 531; x++) scene.put(x, y, (x - 505) % 4 === 0 ? C.rust[1] : (y % 2 ? C.cream[1] : C.cream[0]));
  }
  put(boots(), 507, base + 1);
  PLACE['door-shut'] = [L.roomR + 1, L.doorTop - 1];
  PLACE['door-open'] = [L.wallR, L.doorTop - 1];
}

// everything the game needs as its own image
export function buildSprites() {
  const fx = effects();
  const plant = piece(16, 10, (g) => {
    g.rect(5, 6, 6, 4, C.rust[1]); g.hline(4, 5, 8, C.rust[3]); g.vline(10, 6, 4, C.rust[0]);
    [[3, 4], [5, 2], [7, 1], [9, 2], [11, 4], [6, 3], [8, 3], [4, 3], [10, 3], [7, 4], [2, 5], [12, 5], [1, 6], [13, 6], [0, 8], [14, 8], [1, 7], [13, 7]].forEach(([x, y], i) => g.put(x, y, i % 3 ? C.grass[2] : C.grass[3]));
  }, 0x1c2f22);
  return {
    'window-front': windowFront(),
    quilt: quilt(false),
    'quilt-lump': quilt(true),
    sofa: sofa(),
    mug: mug(),
    bowl: bowl('empty'),
    'bowl-cereal': bowl('cereal'),
    'bowl-milk': bowl('milk'),
    fridge: fridge(),
    'fridge-open': fridgeOpen(),
    'fridge-plant': plant,
    bag: bag(),
    'door-shut': doorClosed(),
    'door-open': doorOpen(),
    'curtain-shut': curtain(false),
    'curtain-open': curtain(true),
    bird: bird(),
    ...fx
  };
}
