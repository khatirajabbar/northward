// Trees, drawn the same way wherever they stand.
import { Img } from './pixel.mjs';
import { C } from './palette.mjs';

// a pine as a stack of ragged tiers; `tones` runs dark → light, lit from the right
export function drawPine(img, cx, baseY, height, halfW, tones, rnd, { trunk = true } = {}) {
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

// ── whole trees, each on its own canvas (trunk at the bottom centre) ──

// a rounded clump of leaves: dark body, lit toward the upper right, ragged edge
export function leafClump(img, cx, cy, rx, ry, tones, rnd) {
  img.ellipse(cx, cy, rx, ry, tones[0]);
  img.ellipse(cx + rx * 0.12, cy - ry * 0.18, rx * 0.84, ry * 0.8, tones[1]);
  img.ellipse(cx + rx * 0.28, cy - ry * 0.36, rx * 0.56, ry * 0.52, tones[2]);
  if (tones[3] !== undefined) img.ellipse(cx + rx * 0.38, cy - ry * 0.5, rx * 0.26, ry * 0.24, tones[3]);
  const n = Math.round((rx + ry) * 1.6);
  for (let i = 0; i < n; i++) {                       // loose leaves breaking the outline
    const a = rnd() * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * (rx + rnd() * 1.6)), y = Math.round(cy + Math.sin(a) * (ry + rnd() * 1.4));
    img.put(x, y, Math.sin(a) < -0.2 && Math.cos(a) > -0.3 ? tones[2] : tones[0]);
  }
  for (let i = 0; i < n; i++) {                       // shadow flecks inside, so it isn't a smooth ball
    const x = Math.round(cx + (rnd() - 0.5) * rx * 1.5), y = Math.round(cy + (rnd() - 0.2) * ry * 1.1);
    if (img.alpha(x, y)) img.put(x, y, rnd.chance(0.5) ? tones[0] : tones[1]);
  }
}

export function spruce(w, h, rnd, tones = C.pine) {
  const img = new Img(w, h);
  drawPine(img, Math.floor(w / 2), h, h - 1, w / 2 - 2, tones, rnd);
  return img;
}

const BARK = [0xaab0a6, 0xc9cec3, 0xe4e7dc, 0xf3f4ec], BARK_MARK = 0x2f302b;
const LEAF = [0x355f3d, 0x4d8348, 0x74a957, 0xa3cc72];      // fresh birch green

export function birch(w, h, rnd) {
  const img = new Img(w, h);
  const cx = Math.floor(w / 2), top = Math.round(h * 0.16);
  const lean = (y) => cx + Math.round(Math.sin(((h - y) / h) * 2.4) * 2.2);
  // boughs first, so the trunk sits in front of them
  const tips = [];
  for (let i = 0; i < 9; i++) {
    const y0 = Math.round(h * (0.6 - i * 0.052)), side = i % 2 ? 1 : -1;
    const len = Math.round(w * (0.16 + rnd() * 0.2) * (1 - i * 0.04)), x0 = lean(y0);
    const x1 = x0 + side * len, y1 = y0 - Math.round(len * (0.6 + rnd() * 0.4));
    img.line(x0, y0, x1, y1, 0x4b4d45);
    tips.push([x1, y1], [Math.round(x0 + (x1 - x0) * 0.55), Math.round(y0 + (y1 - y0) * 0.55) - 2]);
  }
  tips.push([lean(top), top - 3], [lean(top) - 4, top + 5], [lean(top) + 5, top + 3], [lean(top) + 1, top + 12]);
  // trunk: white, shaded on the left, with the dark scars birches have
  for (let y = h - 1; y >= top; y--) {
    const t = (h - y) / (h - top), half = t < 0.25 ? 2.5 : t < 0.7 ? 2 : 1.5, x = lean(y);
    for (let dx = -Math.ceil(half); dx <= Math.floor(half); dx++) {
      const k = (dx + half) / (2 * half);
      img.put(x + dx, y, k < 0.25 ? BARK[0] : k < 0.5 ? BARK[1] : k < 0.85 ? BARK[3] : BARK[2]);
    }
  }
  for (let y = h - 3; y > top + 4; y -= rnd.int(4, 9)) {
    const x = lean(y), len = rnd.int(2, 4);
    for (let i = 0; i < len; i++) img.put(x - 2 + i + rnd.int(0, 1), y, BARK_MARK);
    if (rnd.chance(0.3)) { img.put(x, y + 1, BARK_MARK); img.put(x - 1, y + 1, BARK[0]); }
  }
  img.rect(lean(h - 1) - 4, h - 2, 9, 2, BARK[1]); img.put(lean(h - 1) - 4, h - 1, BARK_MARK); img.put(lean(h - 1) + 3, h - 2, BARK_MARK);
  // leaves: many small airy clumps, lowest first, each trailing a few twigs
  tips.sort((a, b) => b[1] - a[1]);
  tips.forEach(([x, y]) => {
    const rx = rnd.int(5, 8), ry = rnd.int(3, 5);
    for (let k = 0; k < 4; k++) {
      const tx = x + rnd.int(-rx, rx), ty = y + ry - 1, len = rnd.int(3, 9);
      for (let j = 0; j < len; j++) if (j % 2 === 0 || rnd.chance(0.4)) img.put(tx, ty + j, j % 3 ? LEAF[1] : LEAF[2]);
    }
    leafClump(img, x, y, rx, ry, LEAF, rnd);
  });
  return img;
}

const PINE_BARK = [0x5c3a28, 0x7d4f35, 0xa06a45, 0xbd8659];

// a scots pine: a long bare trunk and a crown of flat clumps at the top
export function scotsPine(w, h, rnd) {
  const img = new Img(w, h);
  const cx = Math.floor(w / 2), crown = Math.round(h * 0.34);
  const lean = (y) => cx + Math.round(Math.sin(((h - y) / h) * 1.7) * 1.5);
  const tips = [];
  for (let i = 0; i < 6; i++) {
    const y0 = crown - 4 + i * 5 - (i > 3 ? 14 : 0), side = i % 2 ? 1 : -1;
    const len = Math.round(w * (0.24 + rnd() * 0.12)), x0 = lean(y0);
    const x1 = x0 + side * len, y1 = y0 - Math.round(len * (0.25 + rnd() * 0.3));
    img.line(x0, y0, x1, y1, PINE_BARK[0]); img.line(x0, y0 + 1, x1, y1 + 1, PINE_BARK[1]);
    tips.push([x1, y1 - 2]);
  }
  tips.push([lean(8) - 2, 9], [lean(8) + 5, 13], [lean(8), 5]);
  for (let y = h - 1; y >= 10; y--) {
    const t = (h - y) / h, half = t < 0.12 ? 3 : t < 0.5 ? 2.5 : t < 0.8 ? 2 : 1.5, x = lean(y);
    for (let dx = -Math.ceil(half); dx <= Math.floor(half); dx++) {
      const k = (dx + half) / (2 * half);
      let c = k < 0.3 ? PINE_BARK[0] : k < 0.6 ? PINE_BARK[1] : k < 0.9 ? PINE_BARK[2] : PINE_BARK[3];
      if ((y * 7 + dx * 3) % 11 === 0) c = PINE_BARK[0];            // plated bark
      img.put(x + dx, y, c);
    }
  }
  for (let i = 0; i < 3; i++) {                                    // snapped-off dead branches lower down
    const y = Math.round(h * (0.45 + i * 0.13)), side = i % 2 ? 1 : -1, x = lean(y);
    img.line(x + side * 2, y, x + side * (5 + i), y - 2, PINE_BARK[0]);
  }
  img.rect(lean(h - 1) - 4, h - 2, 9, 2, PINE_BARK[1]); img.hline(lean(h - 1) - 4, h - 1, 9, PINE_BARK[0]);
  tips.sort((a, b) => b[1] - a[1]);
  tips.forEach(([x, y]) => leafClump(img, x, y, rnd.int(8, 12), rnd.int(4, 6), C.pine.slice(1), rnd));
  return img;
}

const OAK_BARK = [0x3f2e22, 0x574032, 0x705343, 0x8a6a55];

// a broad old tree with a heavy crown — the kind you lie down under
export function oak(w, h, rnd, leaves = C.grass) {
  const img = new Img(w, h);
  const cx = Math.floor(w / 2), fork = Math.round(h * 0.52);
  const boughs = [[-0.34, 0.3], [0.36, 0.26], [-0.14, 0.14], [0.16, 0.12]];
  boughs.forEach(([dx, yk]) => {
    const x1 = cx + Math.round(dx * w), y1 = Math.round(h * yk) + 6;
    for (let k = -1; k <= 1; k++) img.line(cx + k, fork + 4, x1 + k, y1, k < 0 ? OAK_BARK[0] : k === 0 ? OAK_BARK[1] : OAK_BARK[2]);
  });
  for (let y = h - 1; y >= fork; y--) {
    const t = (h - y) / (h - fork), half = 4 + (t < 0.2 ? Math.round((0.2 - t) * 22) : 0) + (t > 0.85 ? 1 : 0);
    for (let dx = -half; dx <= half; dx++) {
      const k = (dx + half) / (2 * half);
      let c = k < 0.28 ? OAK_BARK[0] : k < 0.6 ? OAK_BARK[1] : k < 0.9 ? OAK_BARK[2] : OAK_BARK[3];
      if ((y * 5 + dx * 9) % 13 === 0 && t > 0.1) c = OAK_BARK[0];
      img.put(cx + dx, y, c);
    }
  }
  img.ellipse(cx - 1, fork + Math.round((h - fork) * 0.45), 1.5, 2.5, OAK_BARK[0]);     // a knot
  const clumps = [
    [-0.3, 0.36, 0.2, 0.15], [0.3, 0.34, 0.2, 0.15], [-0.36, 0.24, 0.15, 0.12], [0.36, 0.22, 0.15, 0.12],
    [-0.14, 0.26, 0.22, 0.16], [0.14, 0.24, 0.22, 0.16], [0, 0.14, 0.26, 0.14], [-0.22, 0.14, 0.17, 0.12],
    [0.22, 0.13, 0.17, 0.12], [0, 0.3, 0.18, 0.12]
  ];
  clumps.forEach(([dx, yk, rx, ry]) => leafClump(img, cx + Math.round(dx * w), Math.round(h * yk) + 2, rx * w, ry * h, leaves.slice(0, 4), rnd));
  return img;
}

// a leafless tree for the cold spaces of the last field: a pale trunk that
// forks and forks again into bare twigs
export function bareTree(w, h, rnd) {
  const img = new Img(w, h);
  const bark = [0x43342b, 0x64503f, 0x86705b, 0xa58f77];
  const limbOut = (x0, y0, angle, len, width, depth) => {
    const x1 = x0 + Math.cos(angle) * len, y1 = y0 - Math.sin(angle) * len;
    for (let k = 0; k < width; k++) {
      img.line(x0 + k, y0, x1 + k, y1, width === 1 ? bark[1] : k === 0 ? bark[0] : k === width - 1 ? bark[3] : bark[k === 1 ? 1 : 2]);
    }
    if (depth <= 0 || y1 < 3) return;
    const n = depth > 2 ? 2 : rnd.int(2, 3);
    for (let i = 0; i < n; i++) {
      const fan = (i - (n - 1) / 2) * (0.62 + rnd() * 0.3) + (rnd() - 0.5) * 0.25;
      limbOut(x1, y1, angle + fan, len * (0.6 + rnd() * 0.16), Math.max(1, width - 1), depth - 1);
    }
  };
  const cx = Math.floor(w / 2) - 2;
  limbOut(cx, h - 1, Math.PI / 2 + (rnd() - 0.5) * 0.12, h * 0.4, 4, 5);
  img.rect(cx - 2, h - 3, 8, 3, bark[1]); img.hline(cx - 3, h - 1, 10, bark[0]);            // root flare
  img.line(cx + 3, Math.round(h * 0.78), cx + 9, Math.round(h * 0.7), bark[1]);              // a snapped lower branch
  for (let y = h - 4; y > h * 0.62; y -= 5) img.put(cx + 1, y, bark[0]);                     // bark marks
  return img;
}

export function bush(w, h, rnd, { berries } = {}) {
  const img = new Img(w, h);
  leafClump(img, w * 0.3, h * 0.62, w * 0.28, h * 0.36, C.grass, rnd);
  leafClump(img, w * 0.68, h * 0.6, w * 0.3, h * 0.38, C.grass, rnd);
  leafClump(img, w * 0.5, h * 0.48, w * 0.3, h * 0.42, C.grass, rnd);
  for (let i = 0; i < Math.round(w / 3); i++) {
    const x = rnd.int(2, w - 3), y = rnd.int(Math.round(h * 0.25), h - 3);
    if (img.alpha(x, y)) img.put(x, y, berries || rnd.pick([0xf4f4ee, 0xffe680]));
  }
  img.hline(Math.round(w * 0.15), h - 1, Math.round(w * 0.7), C.grass[0]);
  return img;
}
