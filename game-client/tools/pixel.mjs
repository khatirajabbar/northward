// A tiny pixel-art toolkit: an RGBA canvas with a few drawing helpers and a
// PNG reader/writer. No dependencies — plain Node (zlib + fs).
import zlib from 'node:zlib';
import fs from 'node:fs';

// colors are 0xRRGGBB numbers, '#rrggbb' strings, or [r, g, b, a] arrays
export function rgba(c, a = 255) {
  if (Array.isArray(c)) return c.length === 4 ? c : [c[0], c[1], c[2], a];
  if (typeof c === 'string') c = parseInt(c.replace('#', ''), 16);
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255, a];
}

export function mix(a, b, t) {
  const A = rgba(a), B = rgba(b);
  return [0, 1, 2, 3].map((i) => Math.round(A[i] + (B[i] - A[i]) * t));
}

// deterministic random numbers, so the art comes out the same on every run
export function rng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.chance = (p) => next() < p;
  return next;
}

export class Img {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }

  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  get(x, y) {
    if (!this.inside(x, y)) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
  }

  alpha(x, y) { return this.inside(x, y) ? this.d[(y * this.w + x) * 4 + 3] : 0; }

  // overwrite one pixel, no blending
  put(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (!this.inside(x, y)) return;
    const [r, g, b, a] = rgba(c);
    const i = (y * this.w + x) * 4;
    this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = a;
  }

  // paint one pixel over what's there (respects the color's alpha)
  px(x, y, c, alpha) {
    x = Math.round(x); y = Math.round(y);
    if (!this.inside(x, y)) return;
    let [r, g, b, a] = rgba(c);
    if (alpha !== undefined) a = Math.round(a * alpha);
    if (a === 0) return;
    const i = (y * this.w + x) * 4;
    const da = this.d[i + 3];
    if (a === 255 || da === 0) {
      this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = a === 255 ? 255 : a;
      return;
    }
    const sa = a / 255, ia = (da / 255) * (1 - sa), oa = sa + ia;
    this.d[i] = Math.round((r * sa + this.d[i] * ia) / oa);
    this.d[i + 1] = Math.round((g * sa + this.d[i + 1] * ia) / oa);
    this.d[i + 2] = Math.round((b * sa + this.d[i + 2] * ia) / oa);
    this.d[i + 3] = Math.round(oa * 255);
  }

  rect(x, y, w, h, c, alpha) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c, alpha);
    return this;
  }

  hline(x, y, len, c, alpha) { return this.rect(x, y, len, 1, c, alpha); }
  vline(x, y, len, c, alpha) { return this.rect(x, y, 1, len, c, alpha); }

  line(x0, y0, x1, y1, c, alpha) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c, alpha);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  // filled ellipse; cx/cy may be .5 values to centre it between pixels
  ellipse(cx, cy, rx, ry, c, alpha) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.px(x, y, c, alpha);
      }
    }
    return this;
  }

  // filled polygon, points as [[x, y], ...]
  poly(points, c, alpha) {
    const ys = points.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const hits = [];
      for (let i = 0; i < points.length; i++) {
        const [xa, ya] = points[i], [xb, yb] = points[(i + 1) % points.length];
        const yc = y + 0.5;
        if ((ya <= yc && yb > yc) || (yb <= yc && ya > yc)) hits.push(xa + ((yc - ya) / (yb - ya)) * (xb - xa));
      }
      hits.sort((a, b) => a - b);
      for (let i = 0; i + 1 < hits.length; i += 2) {
        for (let x = Math.ceil(hits[i] - 0.5); x <= Math.floor(hits[i + 1] - 0.5); x++) this.px(x, y, c, alpha);
      }
    }
    return this;
  }

  // draw another image onto this one
  blit(src, dx, dy, { flipX = false, alpha } = {}) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.get(flipX ? src.w - 1 - x : x, y);
        if (c[3]) this.px(dx + x, dy + y, c, alpha);
      }
    }
    return this;
  }

  // a 1px outline around everything opaque
  outline(c, { corners = false } = {}) {
    const edge = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) >= 128) continue;
        const near = this.alpha(x - 1, y) >= 128 || this.alpha(x + 1, y) >= 128 ||
          this.alpha(x, y - 1) >= 128 || this.alpha(x, y + 1) >= 128 ||
          (corners && (this.alpha(x - 1, y - 1) >= 128 || this.alpha(x + 1, y - 1) >= 128 ||
            this.alpha(x - 1, y + 1) >= 128 || this.alpha(x + 1, y + 1) >= 128));
        if (near) edge.push([x, y]);
      }
    }
    edge.forEach(([x, y]) => this.put(x, y, c));
    return this;
  }

  // change every opaque pixel in a region: fn(color, x, y) -> color
  recolor(x0, y0, w, h, fn) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (!this.inside(x, y) || !this.alpha(x, y)) continue;
        this.put(x, y, fn(this.get(x, y), x, y));
      }
    }
    return this;
  }

  // darken (f < 1) or brighten (f > 1) a region
  shade(x0, y0, w, h, f) {
    return this.recolor(x0, y0, w, h, ([r, g, b, a]) => [r * f, g * f, b * f, a]);
  }

  crop(x0, y0, w, h) {
    const out = new Img(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.put(x, y, this.get(x0 + x, y0 + y));
    return out;
  }

  // nearest-neighbour resize (factor can be fractional)
  scaled(f) {
    const out = new Img(Math.round(this.w * f), Math.round(this.h * f));
    for (let y = 0; y < out.h; y++) {
      for (let x = 0; x < out.w; x++) out.put(x, y, this.get(Math.floor(x / f), Math.floor(y / f)));
    }
    return out;
  }

  save(file) { fs.writeFileSync(file, encodePng(this)); return this; }
}

// ── PNG ──

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

export function encodePng(img) {
  const head = Buffer.alloc(13);
  head.writeUInt32BE(img.w, 0);
  head.writeUInt32BE(img.h, 4);
  head[8] = 8; head[9] = 6;            // 8 bits per channel, RGBA
  const raw = Buffer.alloc((img.w * 4 + 1) * img.h);
  for (let y = 0; y < img.h; y++) {
    raw[y * (img.w * 4 + 1)] = 0;      // no filter
    Buffer.from(img.d.buffer, y * img.w * 4, img.w * 4).copy(raw, y * (img.w * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', head),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// reads 8-bit RGB, RGBA and palette PNGs (enough for the game's sprite sheets)
export function loadPng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8, w = 0, h = 0, type = 6, palette = null, trans = null;
  const parts = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), name = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (name === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9];
      if (data[8] !== 8 || data[12] !== 0) throw new Error(`unsupported png: ${file}`);
    }
    if (name === 'PLTE') palette = data;
    if (name === 'tRNS') trans = data;
    if (name === 'IDAT') parts.push(data);
    pos += len + 12;
  }
  const bpp = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  const raw = zlib.inflateSync(Buffer.concat(parts));
  const stride = w * bpp;
  const out = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let val = v;
      if (filter === 1) val = v + a;
      else if (filter === 2) val = v + b;
      else if (filter === 3) val = v + ((a + b) >> 1);
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        val = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      out[y * stride + x] = val & 255;
    }
  }
  const img = new Img(w, h);
  for (let i = 0; i < w * h; i++) {
    let px;
    if (type === 6) px = [out[i * 4], out[i * 4 + 1], out[i * 4 + 2], out[i * 4 + 3]];
    else if (type === 2) px = [out[i * 3], out[i * 3 + 1], out[i * 3 + 2], 255];
    else if (type === 3) {
      const k = out[i];
      px = [palette[k * 3], palette[k * 3 + 1], palette[k * 3 + 2], trans && k < trans.length ? trans[k] : 255];
    } else if (type === 4) px = [out[i * 2], out[i * 2], out[i * 2], out[i * 2 + 1]];
    else px = [out[i], out[i], out[i], 255];
    img.d.set(px, i * 4);
  }
  return img;
}
