// The game's music, written in code like the pixel art: four short pieces,
// each played by a few instruments built from scratch — a nylon-string guitar
// (a plucked string, Karplus–Strong), a soft felt piano, a music box and a warm
// pad — in a small room (reverb), and saved as mp3s in src/audio/files/ next
// to the sound effects, where the game finds them by name.
//
//   node tools/music.mjs              all four
//   node tools/music.mjs forest       just one: title, forest, night or ending
//
// Plain Node, apart from the very last step: ffmpeg turns the sound into an
// mp3 (brew install ffmpeg). The same notes come out every time — the
// "random" parts are seeded.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/audio/files');
const SR = 44100;
const TAU = Math.PI * 2;

// ── small things ──

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// 'F#4' → 66
function note(name) {
  const [, letter, accidental, octave] = name.match(/^([A-G])(#|b)?(\d)$/);
  return 12 * (Number(octave) + 1) + STEP[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
}
const chord = (names) => names.split(' ').map(note);

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// a one-pole lowpass, in place: rounds off the top of a sound
function soften(x, cutoff) {
  const a = 1 - Math.exp(-TAU * cutoff / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] = y; }
  return x;
}

// add a sine that dies away (two rates: a quick fall, then a long ring) into
// `out`. turning a point round a circle instead of calling Math.sin each sample
function ring(out, f, amp, t60, { quick = 0.6, quickT60 = t60 * 0.3, phase = 0 } = {}) {
  if (f >= SR / 2 - 200) return;
  const w = TAU * f / SR, cw = Math.cos(w), sw = Math.sin(w);
  let c = Math.cos(phase), s = Math.sin(phase);
  let a = amp * quick, b = amp * (1 - quick);
  const da = Math.exp(-6.9 / (quickT60 * SR)), db = Math.exp(-6.9 / (t60 * SR));
  for (let i = 0; i < out.length; i++) {
    out[i] += s * (a + b);
    const nc = c * cw - s * sw; s = c * sw + s * cw; c = nc;
    a *= da; b *= db;
    if ((i & 4095) === 0) { const k = 1 / Math.hypot(c, s); c *= k; s *= k; }
  }
}

// the very end of a note faded to nothing, so it never stops with a click
function tail(out, seconds = 0.04) {
  const n = Math.min(out.length, Math.round(seconds * SR));
  for (let i = 0; i < n; i++) out[out.length - 1 - i] *= i / n;
  return out;
}

// ── the instruments ──

// a soft felt piano: a handful of slightly stretched overtones, the high ones
// dying first, each struck on two strings a hair apart for the shimmer; a
// knock of felt at the start, and the damper when the key comes up
function piano(midi, vel, hold, random) {
  const f = hz(midi);
  const t60 = Math.min(14, Math.max(1.6, 9 * (110 / f) ** 0.55));
  const len = Math.min(hold, t60) + 0.5;
  const out = new Float32Array(Math.ceil(len * SR));
  const dark = 0.55 - 0.3 * vel;                     // gentler hands, rounder sound
  for (let k = 1; k <= 14; k++) {
    const fk = k * f * Math.sqrt(1 + 0.00012 * k * k);
    if (fk > 8000) break;
    const amp = vel * Math.exp(-(k - 1) * dark) / k ** 1.1 / 2;
    const tk = t60 / (1 + 0.45 * (k - 1));
    ring(out, fk * 0.99965, amp, tk, { phase: 0 });
    ring(out, fk * 1.00035, amp, tk, { phase: random() * 0.3 });
  }
  const attack = Math.round(0.006 * SR);
  for (let i = 0; i < attack; i++) out[i] *= i / attack;
  for (let i = 0; i < 0.03 * SR; i++) out[i] += (random() * 2 - 1) * 0.03 * vel * Math.exp(-i / (0.004 * SR));
  const up = Math.floor(Math.min(hold, len) * SR);
  for (let i = up; i < out.length; i++) out[i] *= Math.exp(-(i - up) / (0.09 * SR));
  return tail(soften(out, 1400 + 3600 * vel));
}

// a nylon string, plucked: a burst of soft noise going round a loop one
// vibration long, smoothed a little each time round (Karplus–Strong), with a
// tiny all-pass so the loop is exactly in tune
function guitar(midi, vel, hold, random) {
  const f = hz(midi), period = SR / f;
  const N = Math.floor(period - 0.6), d = period - 0.5 - N, C = (1 - d) / (1 + d);
  const t60 = Math.min(7, Math.max(1.2, 5 * (110 / f) ** 0.6));
  const loss = 10 ** (-3 / (t60 * f));
  const line = new Float32Array(N);
  let lp = 0;
  const bright = 0.18 + 0.35 * vel;
  for (let i = 0; i < N; i++) { lp += bright * ((random() * 2 - 1) - lp); line[i] = lp; }
  // plucked a little way from the bridge: some overtones never start
  const at = Math.max(1, Math.round(N * 0.17));
  const pluck = Float32Array.from(line);
  for (let i = 0; i < N; i++) line[i] = pluck[i] - pluck[(i - at + N) % N];
  let mean = 0; line.forEach((x) => { mean += x / N; });
  for (let i = 0; i < N; i++) line[i] = (line[i] - mean) * vel;

  const len = Math.min(hold, t60 * 1.1) + 0.08;
  const out = new Float32Array(Math.ceil(len * SR));
  let idx = 0, prev = 0, apIn = 0, apOut = 0;
  for (let i = 0; i < out.length; i++) {
    const x = line[idx];
    out[i] = x;
    const avg = 0.5 * (x + prev); prev = x;
    const ap = C * avg + apIn - C * apOut; apIn = avg; apOut = ap;
    line[idx] = ap * loss;
    if (++idx >= N) idx = 0;
  }
  const fade = Math.round(0.08 * SR);
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  return soften(out, 4500);
}

// a music box: a bright little tine, a few bell-like overtones, gone quickly
function musicBox(midi, vel) {
  const f = hz(midi), scale = (523 / f) ** 0.4;
  const out = new Float32Array(Math.ceil((2.6 * scale + 0.1) * SR));
  [[1, 1, 2.4], [2.0, 0.28, 1.1], [3.0, 0.1, 0.6], [4.17, 0.07, 0.35]]
    .forEach(([ratio, amp, t60]) => ring(out, f * ratio, vel * amp, t60 * scale, { quick: 0.3 }));
  const attack = Math.round(0.0015 * SR);
  for (let i = 0; i < attack; i++) out[i] *= i / attack;
  return tail(out);
}

// a warm pad, like strings far off: soft overtones, three voices a few cents
// apart, swelling in slowly and fading slowly
function pad(midi, vel, hold, random, { attack = 2, release = 2.5 } = {}) {
  const f = hz(midi);
  const out = new Float32Array(Math.ceil((hold + release) * SR));
  const tmp = new Float32Array(out.length);
  for (let k = 1; k <= 10; k++) {
    if (k * f > 3200) break;
    for (const detune of [0.997, 1, 1.003]) {
      // a "ring" that never dies: an evenly sustained voice
      ring(tmp, k * f * detune, vel / k ** 1.6 / 3, 1e6, { quick: 0, phase: random() * TAU });
    }
  }
  const a = attack * SR, h = hold * SR, r = release / 4.6 * SR;
  for (let i = 0; i < out.length; i++) {
    const env = i < a ? (i / a) ** 2 : i < h ? 1 : Math.exp(-(i - h) / r);
    out[i] = tmp[i] * env;
  }
  return tail(soften(out, 2200), 0.1);
}

// ── the room and the mix ──

// Freeverb (Jezar's): eight combs and four all-passes per side
function reverb(inL, inR, { room = 0.82, damp = 0.4 } = {}) {
  const n = inL.length, fb = room * 0.28 + 0.7, dmp = damp * 0.4, pre = Math.round(0.025 * SR);
  return [0, 23].map((spread) => {
    const out = new Float32Array(n);
    const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((t) => ({ buf: new Float32Array(t + spread), i: 0, store: 0 }));
    const alls = [556, 441, 341, 225].map((t) => ({ buf: new Float32Array(t + spread), i: 0 }));
    for (let j = 0; j < n; j++) {
      const src = j - pre;
      const x = src >= 0 ? (inL[src] + inR[src]) * 0.015 : 0;
      let acc = 0;
      for (const c of combs) {
        const y = c.buf[c.i];
        c.store = y * (1 - dmp) + c.store * dmp;
        c.buf[c.i] = x + c.store * fb;
        if (++c.i >= c.buf.length) c.i = 0;
        acc += y;
      }
      for (const a of alls) {
        const b = a.buf[a.i];
        const y = b - acc;
        a.buf[a.i] = acc + b * 0.5;
        if (++a.i >= a.buf.length) a.i = 0;
        acc = y;
      }
      out[j] = acc;
    }
    return out;
  });
}

class Mix {
  constructor(seconds) {
    this.n = Math.ceil(seconds * SR);
    this.dry = [new Float32Array(this.n), new Float32Array(this.n)];
    this.send = [new Float32Array(this.n), new Float32Array(this.n)];
    this.energy = {};
  }

  // a sound into the mix at `at` seconds: how loud, where (−1 left … 1 right),
  // and how much of it goes into the room
  add(sound, at, { gain = 1, pan = 0, room = 0.3, part = 'other' } = {}) {
    const i0 = Math.max(0, Math.round(at * SR));
    const angle = (pan + 1) * Math.PI / 4, l = Math.cos(angle) * gain, r = Math.sin(angle) * gain;
    let e = 0;
    for (let i = 0; i < sound.length && i0 + i < this.n; i++) {
      const x = sound[i], j = i0 + i;
      this.dry[0][j] += x * l; this.dry[1][j] += x * r;
      this.send[0][j] += x * l * room; this.send[1][j] += x * r * room;
      e += (x * gain) ** 2;
    }
    this.energy[part] = (this.energy[part] || 0) + e;
  }

  // dry and room together; the room's tail folded back onto the start so the
  // piece loops without a seam; the whole thing brought up to just under full
  finish(length, roomLevel) {
    const [wl, wr] = reverb(this.send[0], this.send[1]);
    const rms = (a) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
    const wet = roomLevel * (rms(this.dry[0]) + rms(this.dry[1])) / (rms(wl) + rms(wr) + 1e-9);
    const n = Math.round(length * SR);
    const out = [new Float32Array(n), new Float32Array(n)];
    for (let ch = 0; ch < 2; ch++) {
      const dry = this.dry[ch], w = ch ? wr : wl;
      for (let i = 0; i < this.n; i++) out[ch][i % n] += dry[i] + w[i] * wet;
      // no rumble below what anyone would hear
      let x1 = 0, y1 = 0;
      for (let i = 0; i < n; i++) { const x = out[ch][i]; y1 = x - x1 + 0.9957 * y1; x1 = x; out[ch][i] = y1; }
    }
    let peak = 0;
    out.forEach((c) => c.forEach((x) => { peak = Math.max(peak, Math.abs(x)); }));
    out.forEach((c) => { for (let i = 0; i < n; i++) c[i] *= 0.89 / peak; });
    const total = Object.values(this.energy).reduce((a, b) => a + b, 0);
    const parts = Object.entries(this.energy).map(([k, e]) => `${k} ${(10 * Math.log10(e / total)).toFixed(1)} dB`).join(', ');
    return { out, parts };
  }
}

// ── the pieces ──

// a melody written as [note, beats] pairs ('r' is a rest) → timed notes
function line(start, beat, notes) {
  let t = start;
  return notes.map(([name, beats]) => {
    const at = t; t += beats * beat;
    return name === 'r' ? null : { midi: note(name), at, beats };
  }).filter(Boolean);
}

// the title and the morning: a folk tune in D, in three, fingerpicked on a
// nylon-string guitar, the melody on a soft piano; a music box joins in the
// second time round
function title() {
  const random = rng(11), beat = 60 / 88, bar = 3 * beat;
  const human = (t) => t + (random() - 0.5) * 0.018;
  const C = {
    D: chord('D3 A3 D4 F#4'), 'A/C#': chord('C#3 A3 E4 A4'), Bm: chord('B2 F#3 B3 D4'), G: chord('G2 G3 B3 D4'),
    'D/F#': chord('F#2 A3 D4 F#4'), Em7: chord('E2 G3 B3 D4'), Asus4: chord('A2 E3 A3 D4'), A: chord('A2 E3 A3 C#4')
  };
  const verse = ['D', 'A/C#', 'Bm', 'G', 'D/F#', 'Em7', ['Asus4', 'A'], 'D'];
  const bridge = ['G', 'D/F#', 'Em7', 'Bm', 'G', 'D/F#', 'Em7', ['Asus4', 'A']];
  const bars = ['D', 'D', ...verse, ...bridge, ...verse, 'G', ['Asus4', 'A'], 'D', 'end'];
  const length = bars.length * bar;
  const mix = new Mix(length + 7);

  // the guitar: six quavers a bar, bass – fifth – top – high – top – fifth
  const pattern = [0, 1, 2, 3, 2, 1];
  bars.forEach((b, i) => {
    const t0 = i * bar;
    if (b === 'end') {                          // one last strum, left to ring
      chord('D3 A3 D4 F#4').forEach((m, k) => mix.add(guitar(m, 0.42, 3.5, random), human(t0 + k * 0.035), { gain: 0.9, pan: -0.3, room: 0.3, part: 'guitar' }));
      return;
    }
    const at = (beatInBar) => C[Array.isArray(b) ? b[beatInBar < 1.5 ? 0 : 1] : b];
    for (let q = 0; q < 6; q++) {
      const tones = at(q * 0.5), k = pattern[q];
      const vel = q === 0 ? 0.55 : q === 3 ? 0.45 : 0.38;
      const hold = k === 0 ? bar : 1.6 * beat;
      mix.add(guitar(tones[k], vel * (0.94 + random() * 0.12), hold, random), human(t0 + q * 0.5 * beat), { gain: 0.9, pan: -0.3, room: 0.3, part: 'guitar' });
    }
  });

  // the melody
  const A = [['A4', 1], ['D5', 1], ['E5', 1], ['F#5', 1.5], ['E5', 0.5], ['D5', 1], ['D5', 1], ['B4', 1], ['D5', 1],
    ['E5', 2], ['D5', 0.5], ['B4', 0.5], ['A4', 1], ['D5', 1], ['F#5', 1], ['G5', 1.5], ['F#5', 0.5], ['E5', 1],
    ['E5', 1], ['D5', 1], ['C#5', 1], ['D5', 3]];
  const B = [['D5', 1], ['G5', 1], ['A5', 1], ['F#5', 2], ['E5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 1], ['B5', 1],
    ['A5', 1.5], ['F#5', 0.5], ['D5', 1], ['B4', 1], ['D5', 1], ['G5', 1], ['F#5', 1.5], ['E5', 0.5], ['D5', 1],
    ['E5', 1], ['F#5', 1], ['G5', 1], ['A5', 1.5], ['G5', 0.5], ['E5', 1]];
  const end = [['B4', 1.5], ['D5', 1.5], ['E5', 1.5], ['C#5', 1.5], ['D5', 3]];
  const sing = (notes, from, { box = false } = {}) => line(from, beat, notes).forEach((n) => {
    const vel = 0.42 + random() * 0.1;
    mix.add(piano(n.midi, vel, n.beats * beat + 0.25, random), human(n.at), { gain: 0.65, pan: 0.15, room: 0.35, part: 'piano' });
    if (box) mix.add(musicBox(n.midi + 12, 0.5), human(n.at), { gain: 0.32, pan: 0.35, room: 0.4, part: 'music box' });
  });
  sing(A, 2 * bar);
  sing(B, 10 * bar);
  sing(A, 18 * bar, { box: true });
  sing(end, 26 * bar);

  // a warm pad under it all, from the first verse on, very low
  bars.forEach((b, i) => {
    if (i < 2 || b === 'end') return;
    const halves = Array.isArray(b) ? [[b[0], 0, 1.5 * beat], [b[1], 1.5 * beat, 1.5 * beat]] : [[b, 0, bar]];
    halves.forEach(([name, from, span]) => C[name].slice(1).forEach((m, k) =>
      mix.add(pad(m, 0.035, span + 0.4, random, { attack: 0.6, release: 1.2 }), i * bar + from, { pan: k % 2 ? -0.4 : 0.4, room: 0.5, part: 'pad' })));
  });
  return mix.finish(length, 0.5);
}

// the forest: slow, open chords on a pad and a soft piano, and a melody that
// wanders in now and then and leaves plenty of room between its phrases —
// the walk is long, so it never insists
function forest() {
  const random = rng(23), beat = 1, bar = 4;
  const human = (t) => t + (random() - 0.5) * 0.02;
  const C = {
    Cmaj7: { bass: note('C2'), pad: chord('C3 G3 B3 E4') },
    'G/B': { bass: note('B1'), pad: chord('D3 G3 B3 D4') },
    Am7: { bass: note('A1'), pad: chord('E3 G3 A3 C4') },
    Dsus2: { bass: note('D2'), pad: chord('D3 A3 D4 E4') },
    Em7: { bass: note('E2'), pad: chord('E3 G3 B3 D4') },
    G: { bass: note('G2'), pad: chord('G3 B3 D4 G4') },
    Dsus4: { bass: note('D2'), pad: chord('D3 G3 A3 D4') },
    D: { bass: note('D2'), pad: chord('D3 F#3 A3 D4') }
  };
  // each chord lasts two bars
  const one = ['Cmaj7', 'G/B', 'Am7', 'Dsus2'], two = ['Em7', 'Cmaj7', 'G', 'Dsus4'];
  const chords = [...one, ...two, ...one, ...two, 'G'];
  const span = 2 * bar, length = chords.length * span;
  const mix = new Mix(length + 9);
  const pent = [62, 64, 67, 69, 71, 74, 76, 79, 81, 83];      // G major's five notes, D4 to B5
  let at = 5;

  chords.forEach((name, i) => {
    const t0 = i * span, { bass, pad: voicing } = C[name];
    const last = i === chords.length - 1;
    // the pad, overlapping into the next chord
    voicing.forEach((m, k) => mix.add(pad(m, 0.038, span + 1, random, { attack: i === 0 ? 0.8 : 2.5, release: 3 }), t0, { pan: k % 2 ? -0.45 : 0.45, room: 0.6, part: 'pad' }));
    // the piano: a low note and the chord rolled gently up from it
    mix.add(piano(bass, 0.3, span, random), human(t0), { gain: 0.5, pan: -0.2, room: 0.45, part: 'piano' });
    voicing.forEach((m, k) => mix.add(piano(m, 0.22, last ? span : 3.5, random), human(t0 + 0.5 + k * 0.08), { gain: 0.45, pan: -0.1 + k * 0.1, room: 0.45, part: 'piano' }));
    if (last) return;

    // the very start: a few notes straight away, so the walk doesn't begin in a hush
    if (i === 0) {
      const first = rng(99);
      line(t0 + 0.5, beat, [['G4', 1], ['B4', 1], ['D5', 1.5], ['E5', 3]]).forEach((n) =>
        mix.add(piano(n.midi, 0.44, n.beats + 0.4, first), n.at + (first() - 0.5) * 0.02, { gain: 0.6, pan: 0.15, room: 0.5, part: 'piano' }));
    }

    // now and then, the melody: a short phrase, landing on a note of the chord
    if (i >= 1 && random() < 0.75) {
      const tones = new Set(voicing.map((m) => m % 12));
      let t = t0 + [0.5, 1, 1.5, 2][Math.floor(random() * 4)];
      const count = 3 + Math.floor(random() * 3);
      for (let k = 0; k < count; k++) {
        const lastNote = k === count - 1;
        at = Math.min(9, Math.max(2, at + [-2, -1, -1, 1, 1, 2][Math.floor(random() * 6)]));
        if (lastNote) {                          // settle on the chord
          const near = [at, at - 1, at + 1, at - 2, at + 2].filter((j) => j >= 2 && j <= 9 && tones.has(pent[j] % 12));
          if (near.length) at = near[0];
        }
        const beats = lastNote ? 2 + Math.floor(random() * 2) : [0.5, 1, 1, 1.5, 2][Math.floor(random() * 5)];
        if (t + beats > t0 + span - 0.5) break;
        mix.add(piano(pent[at], 0.38 + random() * 0.12, beats + 0.4, random), human(t), { gain: 0.6, pan: 0.15, room: 0.5, part: 'piano' });
        t += beats;
      }
    }
    // and sometimes, far off, a single chime
    if (random() < 0.35) {
      const m = pent[5 + Math.floor(random() * 5)] + 12;
      mix.add(musicBox(m, 0.3), t0 + 3 + random() * 3, { gain: 0.28, pan: random() < 0.5 ? -0.5 : 0.5, room: 0.7, part: 'music box' });
    }
  });
  return mix.finish(length, 0.7);
}

// dusk into night: the sun going down and the cold coming in. a music box,
// like a lullaby, high and far apart, over a slow pad in E minor and a low
// piano note now and then — quieter and further off than the day's music
function night() {
  const random = rng(51), beat = 60 / 54, bar = 4 * beat;
  const human = (t) => t + (random() - 0.5) * 0.03;
  const C = {
    Em9: { bass: note('E2'), pad: chord('E3 G3 B3 F#4') },
    Cmaj7: { bass: note('C2'), pad: chord('C3 G3 B3 E4') },
    Am7: { bass: note('A1'), pad: chord('E3 G3 A3 C4') },
    Bm7: { bass: note('B1'), pad: chord('D3 F#3 A3 B3') },
    Gmaj7: { bass: note('G1'), pad: chord('D3 F#3 G3 B3') },
    Bsus4: { bass: note('B1'), pad: chord('E3 F#3 B3 E4') }
  };
  const chords = ['Em9', 'Cmaj7', 'Am7', 'Bm7', 'Em9', 'Gmaj7', 'Cmaj7', 'Bsus4', 'Em9', 'Cmaj7', 'Am7', 'Em9'];
  const span = 2 * bar, length = chords.length * span;
  const mix = new Mix(length + 9);
  const pent = [71, 74, 76, 79, 81, 83, 86, 88];               // E minor's five notes, B4 to E6
  let at = 3;

  chords.forEach((name, i) => {
    const t0 = i * span, { bass, pad: voicing } = C[name];
    voicing.forEach((m, k) => mix.add(pad(m, 0.04, span + 1.2, random, { attack: i === 0 ? 1 : 3, release: 3.5 }), t0, { pan: k % 2 ? -0.5 : 0.5, room: 0.7, part: 'pad' }));
    mix.add(piano(bass, 0.28, span, random), human(t0), { gain: 0.5, pan: -0.2, room: 0.5, part: 'piano' });
    mix.add(piano(voicing[2], 0.18, 4 * beat, random), human(t0 + 4 * beat), { gain: 0.45, pan: 0, room: 0.5, part: 'piano' });

    // the lullaby: a few notes, slow, landing on the chord — and often nothing at all
    if (i === 0 || random() < 0.7) {
      const tones = new Set([...voicing, bass].map((m) => m % 12));
      let t = t0 + [0, 0.5, 1, 2][Math.floor(random() * 4)];
      const count = 2 + Math.floor(random() * 3);
      for (let k = 0; k < count; k++) {
        const lastNote = k === count - 1;
        at = Math.min(7, Math.max(0, at + [-2, -1, -1, 1, 1, 2][Math.floor(random() * 6)]));
        if (lastNote) {
          const near = [at, at - 1, at + 1, at - 2, at + 2].filter((j) => j >= 0 && j <= 7 && tones.has(pent[j] % 12));
          if (near.length) at = near[0];
        }
        const beats = lastNote ? 3 : [1, 1, 1.5, 2][Math.floor(random() * 4)];
        if (t + beats > t0 + span - 0.5) break;
        mix.add(musicBox(pent[at], 0.42 + random() * 0.1), human(t), { gain: 0.6, pan: 0.2, room: 0.7, part: 'music box' });
        t += beats;
      }
    }
  });
  return mix.finish(length, 0.8);
}

// by the fire: a tender piece for piano alone, in A minor, turning slowly to
// C major — and strings that come in quietly halfway through
function ending() {
  const random = rng(37), beat = 60 / 58, bar = 4 * beat;
  const human = (t) => t + (random() - 0.5) * 0.03;
  const C = {
    Am: chord('A2 E3 A3 C4'), F: chord('F2 C3 F3 A3'), C: chord('C3 G3 C4 E4'), G: chord('G2 D3 G3 B3'),
    Esus4: chord('E2 B2 E3 A3'), E: chord('E2 B2 E3 G#3'), Em: chord('E2 B2 E3 G3'), Csus2: chord('C3 G3 C4 D4')
  };
  const bars = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', ['Esus4', 'E'],
    'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C',
    'F', 'G', 'Am', 'F', 'Csus2', 'end', 'rest', 'rest'];
  const length = bars.length * bar;
  const mix = new Mix(length + 9);

  // the left hand: the chord broken into four slow crotchets, the pedal down
  bars.forEach((b, i) => {
    const t0 = i * bar;
    if (b === 'rest') return;
    if (b === 'end') {
      chord('C2 G2 C3 E3 G3').forEach((m, k) => mix.add(piano(m, 0.3, 3 * bar, random), human(t0 + k * 0.09), { gain: 0.55, pan: -0.25 + k * 0.08, room: 0.5, part: 'piano' }));
      return;
    }
    for (let q = 0; q < 4; q++) {
      const tones = C[Array.isArray(b) ? b[q < 2 ? 0 : 1] : b];
      mix.add(piano(tones[q], [0.3, 0.22, 0.25, 0.22][q], bar - q * beat, random), human(t0 + q * beat), { gain: 0.55, pan: -0.25 + q * 0.08, room: 0.5, part: 'piano' });
    }
  });

  // the right hand
  const tune = [
    ['E5', 1.5], ['D5', 0.5], ['C5', 1], ['B4', 1], ['C5', 3], ['A4', 1], ['G4', 1], ['C5', 1], ['E5', 1], ['D5', 1], ['D5', 3], ['B4', 1],
    ['C5', 1.5], ['B4', 0.5], ['A4', 1], ['E5', 1], ['F5', 2], ['E5', 1], ['C5', 1], ['E5', 1], ['D5', 1], ['C5', 1], ['G4', 1], ['A4', 2], ['G#4', 2],
    ['A4', 1], ['C5', 1], ['F5', 1], ['E5', 1], ['D5', 2], ['G5', 1], ['D5', 1], ['E5', 1.5], ['D5', 0.5], ['B4', 2], ['C5', 2], ['E5', 2],
    ['A5', 2], ['G5', 1], ['F5', 1], ['G5', 1.5], ['F5', 0.5], ['D5', 2], ['E5', 4], ['C5', 1], ['D5', 1], ['E5', 1], ['G5', 1],
    ['A5', 3], ['G5', 1], ['G5', 2], ['D5', 1], ['B4', 1], ['C5', 2], ['E5', 1], ['A5', 1], ['A5', 2], ['G5', 1], ['F5', 1],
    ['E5', 1], ['D5', 1], ['C5', 2], ['C5', 8]
  ];
  line(0, beat, tune).forEach((n) => {
    const vel = 0.44 + random() * 0.1;
    mix.add(piano(n.midi, vel, n.beats * beat + 0.3, random), human(n.at), { gain: 0.62, pan: 0.15, room: 0.5, part: 'piano' });
  });

  // the strings, from the turn toward C major on, swelling in slowly
  bars.forEach((b, i) => {
    if (i < 8 || b === 'rest') return;
    const name = b === 'end' ? 'C' : b;
    const tones = [...new Set(C[name].map((m) => 55 + ((m - 55) % 12 + 12) % 12))].sort((x, y) => x - y);
    const hold = b === 'end' ? 2.5 * bar : bar + 0.6;
    const swell = i === 8 ? 4 : 1.2;
    tones.forEach((m, k) => mix.add(pad(m, 0.05, hold, random, { attack: swell, release: 2.5 }), i * bar, { pan: k % 2 ? -0.5 : 0.5, room: 0.6, part: 'strings' }));
  });
  return mix.finish(length, 0.55);
}

// ── out to a file ──

function save(id, { out: [l, r], parts }) {
  const n = l.length, data = Buffer.alloc(n * 4);
  const random = rng(5);
  for (let i = 0; i < n; i++) {
    const dither = () => (random() - random()) / 32768;
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l[i] + dither())) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r[i] + dither())) * 32767), i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8); head.write('fmt ', 12);
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22); head.writeUInt32LE(SR, 24);
  head.writeUInt32LE(SR * 4, 28); head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(data.length, 40);
  const wav = path.join(os.tmpdir(), `northward-${id}.wav`);
  fs.writeFileSync(wav, Buffer.concat([head, data]));
  fs.mkdirSync(OUT, { recursive: true });
  const mp3 = path.join(OUT, `${id}.mp3`);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '96k', mp3]);
  fs.unlinkSync(wav);
  console.log(`${id}: ${(n / SR).toFixed(1)}s, ${(fs.statSync(mp3).size / 1024).toFixed(0)} KB  (${parts})`);
}

const PIECES = { title, forest, night, ending };
const asked = process.argv.slice(2);
const unknown = asked.filter((name) => !PIECES[name]);
if (unknown.length) { console.error(`no such piece: ${unknown.join(', ')} (there's title, forest, night and ending)`); process.exit(1); }
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch (err) {
  console.error('this needs ffmpeg to make the mp3s:  brew install ffmpeg');
  process.exit(1);
}
for (const name of asked.length ? asked : Object.keys(PIECES)) {
  const started = Date.now();
  save(`music-${name}`, PIECES[name]());
  console.log(`  (${((Date.now() - started) / 1000).toFixed(1)}s to write)`);
}
