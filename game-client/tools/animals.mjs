// The animals of the forest, drawn as sprite sheets: the horse and its herd,
// the cat, the rabbits and the small brown bird.
//
// Like the fox cub, every animal faces LEFT and is shown at 2x. Each function
// returns one image with its frames side by side; FRAMES at the bottom says
// which frame is which, and the scenes mirror those numbers in their animations.
import { Img, mix, outlined, sheet, limb } from './pixel.mjs';
import { C } from './palette.mjs';

const EYE = 0x17110d;

// ── the horse ──
//
// one drawing with a pose: how far the head is lowered (0 up … 1 grazing),
// where each hoof is, and which way the tail hangs. the walk is that drawing
// with the hooves taken through a four-beat stride.

const COATS = {
  // your horse: a chestnut with a blaze and one white sock
  chestnut: { body: [0x6b452a, 0x8f5f38, 0xae7c4a], hair: 0x3a2418, hoof: 0x2b1b14, blaze: 0xf3e7d2, sock: 0xf3e7d2 },
  grey: { body: [0x7b7f84, 0xa3a7aa, 0xc6c9c8], hair: 0xe8e4d8, hoof: 0x3a3d42, blaze: null, sock: null },
  dark: { body: [0x2e211b, 0x453024, 0x5c4132], hair: 0x17110d, hoof: 0x17110d, blaze: 0xf3e7d2, sock: null },
  foal: { body: [0x9c7647, 0xc29a62, 0xddbb85], hair: 0x6b452a, hoof: 0x4a2f1e, blaze: 0xf7efd9, sock: 0xf7efd9 }
};

// the grown horse and the foal are the same animal at two sets of measurements
const BUILDS = {
  horse: { w: 60, h: 40, cx: 30, back: 13, barrelRx: 12, barrelRy: 6, leg: 15, foreX: -10, hindX: 10,
           neck: 12, neckW: 8, head: 11, headW: 6, tail: 15, upper: 3 },
  foal: { w: 40, h: 30, cx: 20, back: 11, barrelRx: 7.5, barrelRy: 4, leg: 12, foreX: -6, hindX: 6,
          neck: 7, neckW: 5.4, head: 8, headW: 5, tail: 8, upper: 2 }
};

function drawHorse(coat, build, pose = {}) {
  const { headDrop = 0, hooves = [], tail = 0, bob = 0, ear = 0, chew = 0 } = pose;
  const B = build, [dk, md, lt] = coat.body;
  const ground = B.h - 1;
  const top = B.back + bob;                       // y of the line of the back
  const mid = top + B.barrelRy;                   // middle of the barrel
  const hipY = mid + B.barrelRy - 2;              // where the legs leave the body

  return outlined(B.w, B.h, (g) => {
    // one leg: hip → knee → hoof. `hoof` is [dx, lift] from standing square.
    // a foreleg lifts by folding its knee forward, a hind leg by folding the hock back
    const R = Math.round;
    const leg = (hipX, hoof = [0, 0], isFore, tone, sock) => {
      const [dx, lift] = hoof;
      const fx = hipX + dx + (isFore ? 0 : 1), fy = ground - lift;
      const kx = (hipX + fx) / 2 + (isFore ? -lift * 1.1 : 1.4 + lift * 0.7), ky = (hipY + fy) / 2;
      limb(g, R(hipX) - 1, hipY - 1, R(kx) - 1, R(ky), B.upper, tone);       // forearm / thigh
      limb(g, R(kx), R(ky), R(fx), fy - 2, 2, tone);                         // cannon
      if (sock) g.rect(R(fx), fy - 4, 2, 3, sock);
      g.rect(R(fx) - 1, fy - 1, 3, 2, coat.hoof);
    };
    const fore = B.cx + B.foreX, hind = B.cx + B.hindX;

    // far side first, in shadow
    leg(fore + 3, hooves[2], true, dk);
    leg(hind + 2, hooves[3], false, dk);

    // tail: out from the top of the rump, then hanging
    const tx = hind + B.barrelRx * 0.42, ty = top + 2;
    g.rect(R(tx), ty, 4, 2, coat.hair);
    for (let k = 0; k <= B.tail; k++) {
      const t = k / B.tail;
      const x = R(tx + 3 + Math.sin(t * Math.PI * 0.5) * 2 + Math.sin(t * Math.PI * 0.9) * tail * 2);
      g.rect(x, ty + 1 + k, t > 0.2 && t < 0.85 ? 3 : 2, 1, coat.hair);
    }

    // barrel, with a deep chest and a round rump
    g.ellipse(B.cx, mid, B.barrelRx, B.barrelRy, md);
    g.ellipse(fore + 1, mid + 0.5, B.barrelRx * 0.42, B.barrelRy + 0.5, md);
    g.ellipse(hind, mid - 0.5, B.barrelRx * 0.5, B.barrelRy + 0.6, md);
    g.ellipse(B.cx + 1, mid + B.barrelRy * 0.62, B.barrelRx * 0.8, B.barrelRy * 0.36, dk);     // belly in shade
    g.ellipse(B.cx, top + 1.6, B.barrelRx * 0.78, 1.2, lt);                                    // light along the back
    g.ellipse(hind + 1, mid - B.barrelRy * 0.35, B.barrelRx * 0.26, B.barrelRy * 0.4, lt);     // and on the rump

    // near legs over the body
    leg(fore, hooves[0], true, md, coat.sock);
    leg(hind, hooves[1], false, md);

    // neck: from the shoulder up to the poll, or down to the grass.
    // d runs along the neck, n points to its crest (where the mane grows)
    const th = (60 - headDrop * 105) * Math.PI / 180;
    const d = [-Math.cos(th), -Math.sin(th)], n = [-d[1], d[0]];
    const len = B.neck * (1 + headDrop * 0.2);
    const withers = [fore + B.neckW * 0.75, top + 1], chest = [fore - 2, mid + 1];
    const poll = [fore + 2 + d[0] * len, top + 2 + d[1] * len];
    const w1 = B.neckW / 2 - 1;
    g.poly([withers, chest, [poll[0] - n[0] * w1, poll[1] - n[1] * w1], [poll[0] + n[0] * w1, poll[1] + n[1] * w1]], md);

    // head: a wedge from the poll down to the muzzle. h runs along the face,
    // m points out of the forehead
    const ph = (50 + headDrop * 22) * Math.PI / 180;
    const h = [-Math.cos(ph), Math.sin(ph)], m = [-h[1], h[0]];
    const at = (along, out) => [poll[0] + h[0] * along + m[0] * out, poll[1] + h[1] * along + m[1] * out + (along > B.head * 0.6 ? chew : 0)];
    const cheek = B.headW / 2, nose = B.headW / 2 - 0.8;
    g.poly([at(-1, cheek), at(-1, -cheek), at(B.head, -nose), at(B.head, nose)], md);
    g.ellipse(...at(1.5, 0), cheek + 0.5, cheek + 0.5, md);                                   // the round of the cheek
    g.ellipse(...at(B.head - 1, 0), nose + 0.6, nose + 0.6, mix(md, dk, 0.55));                // soft dark muzzle
    if (coat.blaze) g.line(...at(1, cheek - 0.2), ...at(B.head - 2.5, nose), coat.blaze);
    const eye = at(2.6, 0.6), nostril = at(B.head - 0.8, 0.9);
    g.put(Math.round(eye[0]), Math.round(eye[1]), EYE);
    g.put(Math.round(nostril[0]), Math.round(nostril[1]), EYE);

    // an ear, the forelock, and the mane down the crest of the neck
    const eb = at(-0.5, cheek - 0.6);
    const ev = [-h[0] * 0.8 + m[0] * 0.6 + (ear ? 0.5 : 0), -h[1] * 0.8 + m[1] * 0.6];
    g.poly([[eb[0] - 1, eb[1] + 1], [eb[0] + 1.6, eb[1] + 1], [eb[0] + ev[0] * 3.6, eb[1] + ev[1] * 3.6]], md);
    g.put(Math.round(eb[0] + ev[0] * 1.6), Math.round(eb[1] + ev[1] * 1.6), dk);
    const crest = [poll[0] + n[0] * w1, poll[1] + n[1] * w1];
    const steps = Math.ceil(len) + 2;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      g.rect(Math.round(crest[0] + (withers[0] - crest[0]) * t), Math.round(crest[1] + (withers[1] - 1 - crest[1]) * t), 2, 2, coat.hair);
    }
    const fl = at(0.6, cheek);
    g.rect(Math.round(fl[0]), Math.round(fl[1]), 2, 2, coat.hair);
  }, C.ink);
}

// hoof positions through one stride. the order is near-fore, near-hind,
// far-fore, far-hind; each is [dx, lift] from standing square.
function stride(phase, reach, lift) {
  const one = (offset) => {
    const p = (phase + offset) % 1;
    if (p < 0.6) return [Math.round(-reach + (p / 0.6) * reach * 2), 0];                  // on the ground, sliding back
    const s = (p - 0.6) / 0.4;                                                             // in the air, swinging forward
    return [Math.round(reach - s * reach * 2), Math.max(1, Math.round(Math.sin(s * Math.PI) * lift))];
  };
  return [one(0.25), one(0), one(0.75), one(0.5)];
}

function horseFrames(coat, build) {
  const reach = build === BUILDS.foal ? 3 : 4, lift = build === BUILDS.foal ? 2 : 3;
  const frames = [
    drawHorse(coat, build, {}),                                       // 0 standing
    drawHorse(coat, build, { tail: 1 }),                              // 1   tail swings
    drawHorse(coat, build, { bob: 1 }),                               // 2   a breath
    drawHorse(coat, build, { ear: 1, tail: -1 })                      // 3   an ear turns
  ];
  for (let i = 0; i < 8; i++) {                                       // 4-11 walking
    frames.push(drawHorse(coat, build, { hooves: stride(i / 8, reach, lift), bob: i % 4 === 1 ? 1 : 0,
      tail: Math.sin((i / 8) * Math.PI * 2), headDrop: 0.04 + (i % 4 < 2 ? 0.03 : 0) }));
  }
  frames.push(drawHorse(coat, build, { headDrop: 1 }));               // 12 grazing
  frames.push(drawHorse(coat, build, { headDrop: 1, chew: -1, tail: 1 }));   // 13   chewing
  frames.push(drawHorse(coat, build, { headDrop: 0.45 }));            // 14 reaching for a carrot
  frames.push(drawHorse(coat, build, { headDrop: 0.45, chew: 1, ear: 1 })); // 15   eating it
  return sheet(frames, build.w + 2, build.h + 2);
}

export const horse = (coat) => horseFrames(COATS[coat], BUILDS.horse);
export const foal = () => horseFrames(COATS.foal, BUILDS.foal);
// how high the rider sits: art pixels from the hooves up to the horse's back
export const HORSE_BACK = BUILDS.horse.h - BUILDS.horse.back;

// ── the cat from the cliff: a grey tabby with a white bib and socks ──

const CAT = { fur: [0x4f545c, 0x767c85, 0x9aa0a8], stripe: 0x3d4148, white: 0xf2f0e8, nose: 0xe59a9a };

function catHead(g, x, y, { earsBack = false } = {}) {
  const f = CAT.fur;
  g.ellipse(x, y, 4.2, 3.6, f[1]); g.ellipse(x + 0.6, y - 1, 2.6, 1.8, f[2]);
  if (earsBack) {
    g.poly([[x - 3, y - 2], [x - 1, y - 4], [x, y - 2]], f[1]); g.poly([[x + 1, y - 3], [x + 4, y - 4], [x + 3, y - 1]], f[1]);
  } else {
    g.poly([[x - 4, y - 2], [x - 3, y - 6], [x - 1, y - 3]], f[1]); g.poly([[x + 1, y - 3], [x + 3, y - 6], [x + 4, y - 2]], f[1]);
    g.put(Math.round(x - 3), Math.round(y - 4), CAT.nose); g.put(Math.round(x + 3), Math.round(y - 4), CAT.nose);
  }
  g.ellipse(x - 1.8, y + 1.8, 2.4, 1.5, CAT.white);                       // muzzle
  g.put(Math.round(x - 4), Math.round(y + 1), CAT.nose);
  g.put(Math.round(x - 2), Math.round(y), EYE); g.put(Math.round(x + 2), Math.round(y), EYE);
  g.put(Math.round(x), Math.round(y - 3), CAT.stripe); g.put(Math.round(x + 1), Math.round(y - 3), CAT.stripe);   // tabby mark
}

function catWalk(step, { scared = false } = {}) {
  const f = CAT.fur;
  return outlined(26, 17, (g) => {
    const low = scared ? 3 : 0;
    const by = 9 + low;
    // legs: [x, shift, lift] — the diagonal pairs move together
    const s = [[0, 0], [-2, 0], [0, 1], [2, 0]][step % 4], o = [[0, 0], [2, 0], [0, 0], [-2, 0]][step % 4];
    const legs = scared
      ? [[8, 0, 0, f[0]], [18, 0, 0, f[0]], [6, 0, 0, f[1]], [16, 0, 0, f[1]]]
      : [[9, o[0], o[1], f[0]], [19, s[0], s[1], f[0]], [7, s[0], s[1], f[1]], [17, o[0], o[1], f[1]]];
    const legTop = by + 2;
    legs.slice(0, 2).forEach(([x, dx, up, tone]) => { limb(g, x, legTop, x + dx, 15 - up, 2, tone); });
    // tail: up like a question mark when it's happy, tucked low when it's frightened
    if (scared) { for (let k = 0; k < 6; k++) g.rect(20 + k, by + 1 + Math.round(k * 0.5), 2, 2, k > 3 ? f[0] : f[1]); }
    else {
      const sway = [0, 1, 0, -1][step % 4];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8, x = 20 + Math.round(t * 2 + Math.sin(t * Math.PI) * (2 + sway)), y = by - 1 - k;
        g.rect(x, y, 2, 1, k > 6 ? f[0] : f[1]);
      }
    }
    g.ellipse(13.5, by, 7.2, 3.5, f[1]); g.ellipse(14.5, by - 1.4, 5, 1.5, f[2]);          // body
    [11, 14, 17].forEach((x) => g.vline(x, by - 3, 3, CAT.stripe));                          // stripes
    g.ellipse(9.5, by + 2, 3.4, 1.6, CAT.white);                                             // bib and belly
    legs.slice(2).forEach(([x, dx, up, tone]) => {
      limb(g, x, legTop, x + dx, 15 - up, 2, tone);
      g.rect(x + dx, 14 - up, 2, 2, CAT.white);                                              // socks
    });
    catHead(g, 5.5, by - 2.5 + (scared ? 1 : 0), { earsBack: scared });
  }, C.ink);
}

function catSit(tailFlick) {
  const f = CAT.fur;
  return outlined(20, 18, (g) => {
    g.ellipse(11, 12.5, 5.6, 5.4, f[1]); g.ellipse(12.4, 11, 3.2, 3.2, f[2]);              // haunches
    [11, 14].forEach((x) => g.vline(x, 8, 3, CAT.stripe));
    g.ellipse(8.4, 13.4, 2.6, 3.6, CAT.white);                                              // bib
    g.rect(7, 15, 2, 3, f[1]); g.rect(10, 15, 2, 3, f[1]); g.hline(7, 17, 2, CAT.white); g.hline(10, 17, 2, CAT.white);
    // tail curled round the feet, its tip lifting now and then
    g.poly([[14, 16], [19, 14], [20, 16], [15, 18]], f[1]);
    if (tailFlick) { g.rect(18, 11, 2, 3, f[1]); g.rect(18, 10, 2, 1, f[0]); } else g.rect(18, 14, 2, 2, f[0]);
    catHead(g, 6.5, 6.5);
  }, C.ink);
}

// carried in your arms: head up, front paws over your arm, tail hanging down
function catHeld() {
  const f = CAT.fur;
  return outlined(18, 14, (g) => {
    // the tail, hanging loose with a curl at the tip
    [[13, 7], [15, 8], [16, 9], [16, 10], [16, 11], [15, 12], [14, 13]].forEach(([x, y], k) => g.rect(x, y, 2, 1, k > 4 ? f[0] : f[1]));
    g.rect(12, 9, 2, 3, f[0]); g.rect(12, 11, 2, 2, CAT.white);                              // a hind paw dangling
    g.ellipse(10.5, 7.5, 4.6, 3, f[1]); g.ellipse(11.5, 6.2, 2.8, 1.4, f[2]);                // body, tucked along your arm
    g.vline(11, 5, 2, CAT.stripe); g.vline(13, 5, 2, CAT.stripe);
    g.rect(8, 9, 2, 3, f[1]); g.rect(8, 11, 2, 2, CAT.white);                                // a front paw hooked over your arm
    catHead(g, 5.5, 6.5);
  }, C.ink);
}

export function cat() {
  return sheet([
    catWalk(0), catWalk(1), catWalk(2), catWalk(3),              // 0-3 walking (0 is also standing)
    catSit(false), catSit(true),                                  // 4-5 sitting, tail tip flicking
    catWalk(0, { scared: true }),                                 // 6 crouched and frightened
    catHeld()                                                     // 7 in your arms
  ], 28, 20);
}

// ── rabbits ──

const RABBIT = { fur: [0x8a7560, 0xb39d82, 0xd2c1a6], belly: 0xefe6d4, tail: 0xf7f4ee, ear: 0xd9a0a0 };

function rabbitSit(earDown) {
  const f = RABBIT.fur;
  return outlined(16, 15, (g) => {
    g.ellipse(9.5, 10, 5, 4.4, f[1]); g.ellipse(10.6, 8.6, 3, 2.4, f[2]);                  // round back
    g.ellipse(7, 12, 2.6, 2.4, RABBIT.belly);
    g.rect(10, 13, 4, 2, f[0]); g.rect(5, 13, 2, 2, f[1]);                                  // big hind foot, front paws
    g.ellipse(14, 11.5, 1.6, 1.6, RABBIT.tail);
    g.ellipse(4.5, 7, 3.2, 2.8, f[1]); g.ellipse(5, 6.2, 2, 1.4, f[2]);                    // head
    g.rect(4, 0, 2, 5, f[1]); g.vline(4, 1, 3, RABBIT.ear);                                 // ears
    if (earDown) { g.rect(7, 3, 4, 2, f[1]); g.hline(8, 4, 2, RABBIT.ear); } else { g.rect(7, 1, 2, 5, f[1]); g.vline(8, 2, 3, RABBIT.ear); }
    g.put(3, 7, EYE); g.put(1, 8, RABBIT.ear);
  }, C.ink);
}

// one hop, in four moments: gather, spring, stretch, land
function rabbitHop(moment) {
  const f = RABBIT.fur;
  return outlined(20, 15, (g) => {
    const p = [
      { body: [10, 10.5, 5.6, 3.6], head: [4.5, 9], ear: [[6, 7], [10, 5]], fore: [[4, 12], [3, 14]], hind: [[13, 12], [11, 14]], tail: [15.5, 9.5] },
      { body: [10, 8, 6.4, 3], head: [3.5, 5.5], ear: [[5, 4], [9, 3]], fore: [[4, 8], [2, 10]], hind: [[14, 10], [16, 14]], tail: [16, 8] },
      { body: [10, 6, 7, 2.6], head: [3, 5], ear: [[5, 3.4], [10, 2.4]], fore: [[4, 8], [1, 9]], hind: [[15, 7], [19, 8]], tail: [16.6, 4.6] },
      { body: [10, 8.5, 6.2, 3.2], head: [4, 9.5], ear: [[6, 7.6], [10, 5.6]], fore: [[4, 11], [3, 14]], hind: [[14, 8], [17, 6]], tail: [16, 6.6] }
    ][moment];
    limb(g, p.hind[0][0], p.hind[0][1], p.hind[1][0], p.hind[1][1], 2, f[0]);
    limb(g, p.fore[0][0], p.fore[0][1], p.fore[1][0], p.fore[1][1], 2, f[1]);
    g.ellipse(...p.body, f[1]); g.ellipse(p.body[0] + 1, p.body[1] - 1.2, p.body[2] * 0.6, p.body[3] * 0.45, f[2]);
    g.ellipse(p.body[0] - 2, p.body[1] + p.body[3] * 0.5, p.body[2] * 0.5, 1.2, RABBIT.belly);
    g.ellipse(p.tail[0], p.tail[1], 1.6, 1.6, RABBIT.tail);
    limb(g, p.ear[0][0], p.ear[0][1], p.ear[1][0], p.ear[1][1], 2, f[1]);                     // ears laid back in the wind
    g.line(p.ear[0][0] + 1, p.ear[0][1], p.ear[1][0], p.ear[1][1], RABBIT.ear);
    g.ellipse(p.head[0], p.head[1], 3, 2.6, f[1]); g.ellipse(p.head[0] + 0.4, p.head[1] - 0.8, 1.8, 1.2, f[2]);
    g.put(Math.round(p.head[0] - 1.5), Math.round(p.head[1]), EYE); g.put(Math.round(p.head[0] - 3), Math.round(p.head[1] + 1), RABBIT.ear);
  }, C.ink);
}

export function rabbit() {
  return sheet([rabbitSit(false), rabbitSit(true), rabbitHop(0), rabbitHop(1), rabbitHop(2), rabbitHop(3)], 22, 17);
}

// ── the small brown bird — the one from your window ──

const BIRD = { b: [0x4a3a28, 0x6b5135, 0x8a6d49, 0xc9b08a], beak: 0xd9a441 };

// perched, with its wings shut, half-raised, or beating — the struggle in the thorns
function birdPerch(wing) {
  const b = BIRD.b;
  return outlined(14, 12, (g) => {
    g.rect(10, 7, 4, 2, b[0]);                                                               // tail
    g.ellipse(7, 7, 4.2, 3.2, b[1]); g.ellipse(5.6, 8.4, 2.6, 1.6, b[3]);                    // body, pale breast
    g.ellipse(3.6, 4.4, 2.8, 2.6, b[1]); g.ellipse(4, 3.6, 1.6, 1.2, b[2]);                  // head
    g.put(0, 5, BIRD.beak); g.put(1, 5, BIRD.beak); g.put(3, 4, EYE);
    if (wing === 0) { g.ellipse(8.4, 6.8, 3, 1.8, b[0]); g.hline(7, 6, 3, b[2]); }
    if (wing === 1) { g.poly([[6, 6], [10, 6], [12, 1], [9, 2]], b[0]); g.line(7, 5, 10, 2, b[2]); }
    if (wing === 2) { g.poly([[6, 6], [10, 5], [13, 8], [9, 9]], b[0]); g.hline(8, 7, 3, b[2]); }
    g.put(6, 10, BIRD.beak); g.put(6, 11, BIRD.beak); g.put(8, 10, BIRD.beak); g.put(8, 11, BIRD.beak);   // feet
  }, C.ink);
}

function birdFly(beat) {
  const b = BIRD.b;
  return outlined(16, 13, (g) => {
    const y = [6, 7, 7, 6][beat];
    g.rect(11, y, 4, 2, b[0]); g.put(15, y - 1, b[0]);                                       // tail spread behind
    // the far wing, a beat behind the near one
    if (beat === 0) g.poly([[6, y - 1], [9, y - 1], [12, y - 6], [9, y - 5]], b[0]);
    if (beat === 2) g.poly([[6, y + 1], [9, y + 1], [11, y + 5], [8, y + 4]], b[0]);
    g.ellipse(7.5, y, 4.6, 2.4, b[1]); g.ellipse(6, y + 1.2, 3, 1.2, b[3]);                  // body
    g.ellipse(3, y - 0.6, 2.6, 2.2, b[1]); g.ellipse(3.4, y - 1.2, 1.4, 1, b[2]);            // head, stretched forward
    g.put(0, y, BIRD.beak); g.put(2, y - 1, EYE);
    // the near wing
    if (beat === 0) { g.poly([[5, y - 1], [9, y - 1], [9, y - 7], [6, y - 5]], b[2]); g.line(6, y - 2, 8, y - 6, b[3]); }
    if (beat === 1 || beat === 3) { g.poly([[5, y - 1], [10, y - 1], [12, y - 3], [7, y - 3]], b[2]); g.hline(7, y - 2, 4, b[3]); }
    if (beat === 2) { g.poly([[5, y], [9, y], [9, y + 5], [6, y + 4]], b[2]); g.line(6, y + 1, 8, y + 4, b[0]); }
  }, C.ink);
}

export function bird() {
  return sheet([birdPerch(0), birdPerch(1), birdPerch(2), birdFly(0), birdFly(1), birdFly(2), birdFly(3)], 18, 15);
}

// frame numbers, for the scenes
export const FRAMES = {
  horse: { size: [BUILDS.horse.w + 2, BUILDS.horse.h + 2], idle: [0, 3], walk: [4, 11], graze: [12, 13], eat: [14, 15] },
  foal: { size: [BUILDS.foal.w + 2, BUILDS.foal.h + 2], idle: [0, 3], walk: [4, 11], graze: [12, 13], eat: [14, 15] },
  cat: { size: [28, 20], walk: [0, 3], sit: [4, 5], scared: 6, held: 7 },
  rabbit: { size: [22, 17], sit: [0, 1], hop: [2, 5] },
  bird: { size: [18, 15], perch: 0, struggle: [1, 2], fly: [3, 6] }
};
