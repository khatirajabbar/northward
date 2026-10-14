// Northward's own pixel font, drawn here letter by letter and written out as a
// bitmap font the game can load (an image of the letters plus an .xml that says
// where each one is).
//
//   node tools/ui-art.mjs      (builds the font together with the rest of the UI)
//
// Every glyph is nine rows tall: rows 0-6 sit on the line (capitals fill all
// seven, small letters the lower five), rows 7-8 are for tails that hang below.
// Widths vary — an "i" is one pixel wide, an "m" five.
//
// The same letters are also written out as a real font file (buildWebFont), so
// the page around the game — the sign-in form — can be set in them too.
import { Img } from './pixel.mjs';

const ROWS = 9;

// a glyph written as its rows; `top` is the row the first string sits on
const g = (top, ...rows) => ({ top, rows });

const GLYPHS = {
  a: g(2, '.##.', '...#', '.###', '#..#', '.###'),
  b: g(0, '#...', '#...', '###.', '#..#', '#..#', '#..#', '###.'),
  c: g(2, '.###', '#...', '#...', '#...', '.###'),
  d: g(0, '...#', '...#', '.###', '#..#', '#..#', '#..#', '.###'),
  e: g(2, '.##.', '#..#', '####', '#...', '.###'),
  f: g(0, '.##', '#..', '###', '#..', '#..', '#..', '#..'),
  g: g(2, '.###', '#..#', '#..#', '#..#', '.###', '...#', '.##.'),
  h: g(0, '#...', '#...', '###.', '#..#', '#..#', '#..#', '#..#'),
  i: g(0, '#', '.', '#', '#', '#', '#', '#'),
  j: g(0, '.#', '..', '.#', '.#', '.#', '.#', '.#', '.#', '#.'),
  k: g(0, '#...', '#...', '#..#', '#.#.', '##..', '#.#.', '#..#'),
  l: g(0, '#.', '#.', '#.', '#.', '#.', '#.', '.#'),
  m: g(2, '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'),
  n: g(2, '###.', '#..#', '#..#', '#..#', '#..#'),
  o: g(2, '.##.', '#..#', '#..#', '#..#', '.##.'),
  p: g(2, '###.', '#..#', '#..#', '#..#', '###.', '#...', '#...'),
  q: g(2, '.###', '#..#', '#..#', '#..#', '.###', '...#', '...#'),
  r: g(2, '#.#', '##.', '#..', '#..', '#..'),
  s: g(2, '.###', '#...', '.##.', '...#', '###.'),
  t: g(0, '.#.', '.#.', '###', '.#.', '.#.', '.#.', '..#'),
  u: g(2, '#..#', '#..#', '#..#', '#..#', '.###'),
  v: g(2, '#...#', '#...#', '.#.#.', '.#.#.', '..#..'),
  w: g(2, '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'),
  x: g(2, '#..#', '#..#', '.##.', '#..#', '#..#'),
  y: g(2, '#..#', '#..#', '#..#', '#..#', '.###', '...#', '.##.'),
  z: g(2, '####', '...#', '.##.', '#...', '####'),
  'ö': g(0, '#..#', '....', '.##.', '#..#', '#..#', '#..#', '.##.'),

  A: g(0, '.##.', '#..#', '#..#', '####', '#..#', '#..#', '#..#'),
  B: g(0, '###.', '#..#', '#..#', '###.', '#..#', '#..#', '###.'),
  C: g(0, '.###', '#...', '#...', '#...', '#...', '#...', '.###'),
  D: g(0, '###.', '#..#', '#..#', '#..#', '#..#', '#..#', '###.'),
  E: g(0, '####', '#...', '#...', '###.', '#...', '#...', '####'),
  F: g(0, '####', '#...', '#...', '###.', '#...', '#...', '#...'),
  G: g(0, '.###', '#...', '#...', '#.##', '#..#', '#..#', '.###'),
  H: g(0, '#..#', '#..#', '#..#', '####', '#..#', '#..#', '#..#'),
  I: g(0, '###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'),
  J: g(0, '...#', '...#', '...#', '...#', '...#', '#..#', '.##.'),
  K: g(0, '#..#', '#.#.', '##..', '##..', '#.#.', '#..#', '#..#'),
  L: g(0, '#...', '#...', '#...', '#...', '#...', '#...', '####'),
  M: g(0, '#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'),
  N: g(0, '#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'),
  O: g(0, '.##.', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'),
  P: g(0, '###.', '#..#', '#..#', '###.', '#...', '#...', '#...'),
  Q: g(0, '.##.', '#..#', '#..#', '#..#', '#..#', '#.#.', '.#.#'),
  R: g(0, '###.', '#..#', '#..#', '###.', '#.#.', '#..#', '#..#'),
  S: g(0, '.###', '#...', '#...', '.##.', '...#', '...#', '###.'),
  T: g(0, '#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'),
  U: g(0, '#..#', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'),
  V: g(0, '#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'),
  W: g(0, '#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'),
  X: g(0, '#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'),
  Y: g(0, '#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'),
  Z: g(0, '####', '...#', '..#.', '.#..', '#...', '#...', '####'),

  0: g(0, '.##.', '#..#', '#.##', '##.#', '#..#', '#..#', '.##.'),
  1: g(0, '.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'),
  2: g(0, '.##.', '#..#', '...#', '..#.', '.#..', '#...', '####'),
  3: g(0, '###.', '...#', '...#', '.##.', '...#', '...#', '###.'),
  4: g(0, '#..#', '#..#', '#..#', '####', '...#', '...#', '...#'),
  5: g(0, '####', '#...', '###.', '...#', '...#', '#..#', '.##.'),
  6: g(0, '.##.', '#...', '#...', '###.', '#..#', '#..#', '.##.'),
  7: g(0, '####', '...#', '..#.', '..#.', '.#..', '.#..', '.#..'),
  8: g(0, '.##.', '#..#', '#..#', '.##.', '#..#', '#..#', '.##.'),
  9: g(0, '.##.', '#..#', '#..#', '.###', '...#', '...#', '.##.'),

  '.': g(6, '#'),
  ',': g(6, '.#', '#.'),
  "'": g(0, '#', '#'),
  '"': g(0, '#.#', '#.#'),
  '!': g(0, '#', '#', '#', '#', '#', '.', '#'),
  '?': g(0, '.##.', '#..#', '...#', '..#.', '.#..', '....', '.#..'),
  ':': g(3, '#', '.', '.', '#'),
  ';': g(3, '.#', '..', '..', '.#', '#.'),
  '-': g(4, '###'),
  '–': g(4, '####'),
  '—': g(4, '######'),
  '…': g(6, '#.#.#'),
  '(': g(0, '.#', '#.', '#.', '#.', '#.', '#.', '.#'),
  '[': g(0, '##', '#.', '#.', '#.', '#.', '#.', '##'),
  ']': g(0, '##', '.#', '.#', '.#', '.#', '.#', '##'),
  ')': g(0, '#.', '.#', '.#', '.#', '.#', '.#', '#.'),
  '/': g(0, '...#', '..#.', '..#.', '.#..', '.#..', '#...', '#...'),
  '+': g(3, '.#.', '###', '.#.'),
  '×': g(3, '#.#', '.#.', '#.#'),
  '·': g(4, '#'),
  '&': g(0, '.##..', '#..#.', '#..#.', '.##..', '#..#.#', '#...#.', '.###.#'),
  '@': g(0, '.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.'),
  _: g(7, '####'),
  '#': g(1, '.#.#.', '#####', '.#.#.', '#####', '.#.#.'),
  '*': g(1, '#.#', '.#.', '#.#'),
  '=': g(3, '###', '...', '###'),
  '•': g(2, '.##.', '####', '####', '.##.'),
  '▸': g(2, '#..', '##.', '###', '##.', '#..'),
  '♥': g(1, '.#.#.', '#####', '#####', '.###.', '..#..'),
  '←': g(2, '..#..', '.#...', '#####', '.#...', '..#..'),
  '→': g(2, '..#..', '...#.', '#####', '...#.', '..#..'),
  '↑': g(1, '..#..', '.###.', '#.#.#', '..#..', '..#..', '..#..'),
  '↓': g(1, '..#..', '..#..', '..#..', '#.#.#', '.###.', '..#..')
};

// the same drawing serves for typographic twins of a plain character
const ALIAS = { '’': "'", '‘': "'", '“': '"', '”': '"' };
const SPACE = 3;

// lay the glyphs out in rows on one image. `outline` gives each a dark edge so
// the text stays readable over the scenery; `ink`/`edge` are the two colours.
export function buildFont({ outline = false, ink = 0xffffff, edge = 0x14161c } = {}) {
  const pad = outline ? 1 : 0;                 // room around each glyph for its edge
  const cellH = ROWS + pad * 2;
  const entries = Object.entries(GLYPHS).map(([ch, glyph]) => ({ ch, glyph, w: Math.max(...glyph.rows.map((r) => r.length)) }));
  const sheetW = 256;
  let x = 1, y = 1;
  entries.forEach((e) => {
    const cw = e.w + pad * 2;
    if (x + cw + 1 > sheetW) { x = 1; y += cellH + 1; }
    e.x = x; e.y = y; e.cw = cw;
    x += cw + 1;
  });
  const img = new Img(sheetW, y + cellH + 1);
  entries.forEach((e) => {
    const cell = new Img(e.cw, cellH);
    e.glyph.rows.forEach((row, r) => {
      [...row].forEach((bit, c) => { if (bit === '#') cell.put(pad + c, pad + e.glyph.top + r, ink); });
    });
    if (outline) cell.outline(edge, { corners: true });
    img.blit(cell, e.x, e.y);
  });

  const lineHeight = ROWS + 2;
  const chars = [];
  const add = (code, e) => chars.push(
    `    <char id="${code}" x="${e.x}" y="${e.y}" width="${e.cw}" height="${cellH}" xoffset="${-pad}" yoffset="${-pad}" xadvance="${e.w + 1}" page="0" chnl="15"/>`);
  entries.forEach((e) => add(e.ch.codePointAt(0), e));
  Object.entries(ALIAS).forEach(([twin, plain]) => add(twin.codePointAt(0), entries.find((e) => e.ch === plain)));
  chars.push(`    <char id="32" x="0" y="0" width="0" height="0" xoffset="0" yoffset="0" xadvance="${SPACE}" page="0" chnl="15"/>`);
  const xml = `<?xml version="1.0"?>
<font>
  <info face="northward" size="${ROWS}"/>
  <common lineHeight="${lineHeight}" base="7" scaleW="${img.w}" scaleH="${img.h}" pages="1"/>
  <pages><page id="0" file="font.png"/></pages>
  <chars count="${chars.length}">
${chars.join('\n')}
  </chars>
</font>
`;
  return { img, xml };
}

// draw a line of text straight onto an image — for art that has words baked in
// (key caps), and for previews
export function drawText(img, text, x, y, color) {
  let cx = x;
  for (const raw of text) {
    const ch = ALIAS[raw] || raw;
    if (ch === ' ') { cx += SPACE; continue; }
    const glyph = GLYPHS[ch];
    if (!glyph) continue;
    glyph.rows.forEach((row, r) => { [...row].forEach((bit, c) => { if (bit === '#') img.put(cx + c, y + glyph.top + r, color); }); });
    cx += Math.max(...glyph.rows.map((r) => r.length)) + 1;
  }
  return cx - x - 1;
}

export function textWidth(text) {
  return drawText(new Img(1, 1), text, 0, 0, 0);
}

// ── the same letters as a font file ──
//
// A TrueType font written out by hand, table by table: every pixel of a glyph
// becomes 100 font units, and each glyph's outline is the edge of its pixels.
// Ten pixels to the em, so text set at 30px has pixels 3px across.

const UNIT = 100;              // font units per pixel
const BASELINE = 7;            // rows above the line
const NOTDEF = g(0, '####', '#..#', '#..#', '#..#', '#..#', '#..#', '####');

// the outline of a glyph's pixels, as closed loops of [x, y] in font units
function trace(glyph) {
  const edges = new Map();     // "x,y>x,y" → [from, to], for every pixel side that has nothing beyond it
  const side = (x0, y0, x1, y1) => {
    const twin = `${x1},${y1}>${x0},${y0}`;
    if (edges.has(twin)) edges.delete(twin); else edges.set(`${x0},${y0}>${x1},${y1}`, [[x0, y0], [x1, y1]]);
  };
  glyph.rows.forEach((row, r) => [...row].forEach((bit, c) => {
    if (bit !== '#') return;
    const y = glyph.top + r;
    side(c, y, c + 1, y); side(c + 1, y, c + 1, y + 1); side(c + 1, y + 1, c, y + 1); side(c, y + 1, c, y);
  }));
  const from = new Map();
  edges.forEach((e) => { const k = e[0].join(); if (!from.has(k)) from.set(k, []); from.get(k).push(e); });
  const loops = [];
  edges.forEach((first) => {
    if (first.used) return;
    const loop = [];
    for (let e = first; e && !e.used; e = (from.get(e[1].join()) || []).find((n) => !n.used)) { e.used = true; loop.push(e[0]); }
    // keep only the corners
    const corners = loop.filter((p, i) => {
      const a = loop[(i + loop.length - 1) % loop.length], b = loop[(i + 1) % loop.length];
      return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
    });
    loops.push(corners.map(([x, y]) => [x * UNIT, (BASELINE - y) * UNIT]));
  });
  return loops;
}

const u16 = (...v) => { const b = Buffer.alloc(v.length * 2); v.forEach((n, i) => b.writeUInt16BE(n & 0xffff, i * 2)); return b; };
const u32 = (...v) => { const b = Buffer.alloc(v.length * 4); v.forEach((n, i) => b.writeUInt32BE(n >>> 0, i * 4)); return b; };
const pad4 = (b) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]) : b);
const sum32 = (b) => { let s = 0; for (let i = 0; i < b.length; i += 4) s = (s + b.readUInt32BE(i)) >>> 0; return s; };

export function buildWebFont({ family = 'Northward' } = {}) {
  // glyph 0 is the box drawn for anything missing, glyph 1 the space
  const glyphs = [{ glyph: NOTDEF, w: 4 }, { glyph: null, w: SPACE - 1 }];
  const codes = new Map([[0x20, 1], [0xa0, 1]]);
  Object.entries(GLYPHS).forEach(([ch, glyph]) => {
    codes.set(ch.codePointAt(0), glyphs.length);
    glyphs.push({ glyph, w: Math.max(...glyph.rows.map((r) => r.length)) });
  });
  Object.entries(ALIAS).forEach(([twin, plain]) => codes.set(twin.codePointAt(0), codes.get(plain.codePointAt(0))));

  // glyf + loca + hmtx
  const box = { x0: 0, y0: 0, x1: 0, y1: 0 };
  let maxPoints = 0, maxContours = 0;
  const shapes = [], loca = [0], hmtx = [];
  glyphs.forEach(({ glyph, w }) => {
    const loops = glyph ? trace(glyph) : [];
    const pts = loops.flat();
    let data = Buffer.alloc(0), left = 0;
    if (pts.length) {
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const b = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      left = b[0];
      box.x0 = Math.min(box.x0, b[0]); box.y0 = Math.min(box.y0, b[1]); box.x1 = Math.max(box.x1, b[2]); box.y1 = Math.max(box.y1, b[3]);
      maxPoints = Math.max(maxPoints, pts.length); maxContours = Math.max(maxContours, loops.length);
      let end = -1;
      const ends = loops.map((l) => (end += l.length));
      const dx = pts.map((p, i) => p[0] - (i ? pts[i - 1][0] : 0)), dy = pts.map((p, i) => p[1] - (i ? pts[i - 1][1] : 0));
      data = pad4(Buffer.concat([u16(loops.length, ...b), u16(...ends), u16(0), Buffer.alloc(pts.length, 1), u16(...dx), u16(...dy)]));
    }
    shapes.push(data);
    loca.push(loca[loca.length - 1] + data.length);
    hmtx.push((w + 1) * UNIT, left);
  });
  const advances = glyphs.map(({ w }) => (w + 1) * UNIT);
  const widest = Math.max(...advances);

  // cmap: one segment per character, plus the closing one the format asks for
  const chars = [...codes.entries()].sort((a, b) => a[0] - b[0]);
  const seg = chars.length + 1, pow = 2 ** Math.floor(Math.log2(seg));
  const table4 = Buffer.concat([
    u16(4, 16 + seg * 8, 0, seg * 2, pow * 2, Math.log2(pow), seg * 2 - pow * 2),
    u16(...chars.map(([c]) => c), 0xffff), u16(0),
    u16(...chars.map(([c]) => c), 0xffff),
    u16(...chars.map(([c, gid]) => gid - c), 1),
    u16(...chars.map(() => 0), 0)
  ]);
  const cmap = Buffer.concat([u16(0, 2, 0, 3), u32(20), u16(3, 1), u32(20), table4]);

  // name: what the font is called
  const names = [[1, family], [2, 'Regular'], [3, `${family} pixel font`], [4, family], [5, 'Version 1.0'], [6, family.replace(/\s/g, '')]];
  const strings = names.map(([, str]) => Buffer.from(str, 'utf16le').swap16());
  let at = 0;
  const name = Buffer.concat([
    u16(0, names.length, 6 + names.length * 12),
    ...names.map(([id], i) => { const rec = u16(3, 1, 0x409, id, strings[i].length, at); at += strings[i].length; return rec; }),
    ...strings
  ]);

  const ascent = 8 * UNIT, descent = 2 * UNIT, gap = UNIT;      // eleven pixels from line to line, as in the game
  const bounds = u16(box.x0, box.y0, box.x1, box.y1);
  const tables = {
    'OS/2': Buffer.concat([
      u16(3, Math.round(advances.reduce((a, b) => a + b, 0) / advances.length), 400, 5, 0),
      u16(650, 600, 0, 75, 650, 600, 0, 350, UNIT, 250, 0), Buffer.alloc(10),
      u32(3, 0, 0, 0), Buffer.from('NRTH'),
      u16(0x40, chars[0][0], chars[chars.length - 1][0], ascent, -descent, gap, ascent, descent),
      u32(1, 0), u16(5 * UNIT, 7 * UNIT, 0, 0x20, 1)
    ]),
    cmap,
    glyf: Buffer.concat(shapes),
    head: Buffer.concat([u32(0x00010000, 0x00010000, 0, 0x5f0f3cf5), u16(3, 10 * UNIT), u32(0, 3800000000, 0, 3800000000),
      bounds, u16(0, 8, 2, 1, 0)]),
    hhea: Buffer.concat([u32(0x00010000), u16(ascent, -descent, gap, widest, 0, 0, box.x1, 1, 0, 0, 0, 0, 0, 0, 0, glyphs.length)]),
    hmtx: u16(...hmtx),
    loca: u32(...loca),
    maxp: Buffer.concat([u32(0x00010000), u16(glyphs.length, maxPoints, maxContours, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0)]),
    name,
    post: u32(0x00030000, 0, (-UNIT & 0xffff) * 0x10000 + UNIT, 0, 0, 0, 0, 0)
  };

  // the file: a directory of the tables, then the tables, each on a 4-byte boundary
  const tags = Object.keys(tables).sort();
  const hi = 2 ** Math.floor(Math.log2(tags.length));
  let offset = 12 + tags.length * 16;
  const records = [], bodies = [];
  tags.forEach((tag) => {
    const body = pad4(tables[tag]);
    records.push(Buffer.concat([Buffer.from(tag), u32(sum32(body), offset, tables[tag].length)]));
    bodies.push(body);
    offset += body.length;
  });
  const file = Buffer.concat([u32(0x00010000), u16(tags.length, hi * 16, Math.log2(hi), tags.length * 16 - hi * 16), ...records, ...bodies]);
  // the file's own checksum goes in the head table, 8 bytes in
  const head = 12 + tags.length * 16 + bodies.slice(0, tags.indexOf('head')).reduce((n, b) => n + b.length, 0);
  file.writeUInt32BE((0xb1b0afba - sum32(file)) >>> 0, head + 8);
  return file;
}
