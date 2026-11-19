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

// ── deer: the doe and her fawn ──
//
// slighter than the horse in every line — thin legs, a small head on a slim
// neck, big ears, a flick of a tail with white under it. the fawn still has
// its spots.

const DEER = {
  doe: { body: [0x7d5535, 0xa87646, 0xc9995f], belly: 0xead9b8, hoof: 0x2b1b14, spots: false },
  fawn: { body: [0x8c6038, 0xb9844c, 0xd6a568], belly: 0xf0e2c4, hoof: 0x3a2418, spots: true }
};
const DEER_BUILD = {
  doe: { w: 48, h: 37, cx: 26, back: 14, rx: 10, ry: 4.6, foreX: -8, hindX: 8, neck: 11, neckW: 5, head: 8, headW: 4.6, ear: 5 },
  fawn: { w: 32, h: 26, cx: 17, back: 11, rx: 6.2, ry: 3.2, foreX: -5, hindX: 5, neck: 6, neckW: 4, head: 6, headW: 4.2, ear: 4 }
};

function drawDeer(kind, pose = {}) {
  const { headDrop = 0, hooves = [], bob = 0, ear = 0, tail = 0 } = pose;
  const coat = DEER[kind], B = DEER_BUILD[kind], [dk, md, lt] = coat.body;
  const ground = B.h - 1, top = B.back + bob, mid = top + B.ry, hipY = mid + B.ry - 1;
  const R = Math.round;
  return outlined(B.w, B.h, (g) => {
    // a leg: slim, with a knee that folds forward (fore) or a hock that folds back (hind)
    const leg = (hipX, hoof = [0, 0], isFore, tone) => {
      const [dx, lift] = hoof;
      const fx = hipX + dx + (isFore ? 0 : 1), fy = ground - lift;
      const kx = (hipX + fx) / 2 + (isFore ? -lift * 0.9 : 1.2 + lift * 0.6), ky = (hipY + fy) / 2;
      limb(g, R(hipX) - 1, hipY - 1, R(kx) - 1, R(ky), 2, tone);
      g.line(R(kx), R(ky), R(fx), fy - 1, tone);
      g.rect(R(fx) - 1, fy, 2, 1, coat.hoof);
    };
    const fore = B.cx + B.foreX, hind = B.cx + B.hindX;
    leg(fore + 2, hooves[2], true, dk);
    leg(hind + 2, hooves[3], false, dk);

    // the tail: dark on top, white beneath — up like a flag when it's alarmed
    const tx = hind + B.rx * 0.55, ty = top + 1;
    if (tail) { g.rect(R(tx), ty - 3, 2, 4, 0xf7efd9); g.put(R(tx), ty - 3, dk); } else { g.rect(R(tx), ty, 2, 3, dk); g.put(R(tx) + 1, ty + 2, 0xf7efd9); }

    g.ellipse(B.cx, mid, B.rx, B.ry, md);
    g.ellipse(fore + 1, mid + 0.3, B.rx * 0.4, B.ry + 0.4, md);                            // chest
    g.ellipse(hind, mid - 0.4, B.rx * 0.46, B.ry + 0.5, md);                               // rump
    g.ellipse(B.cx + 0.5, mid + B.ry * 0.62, B.rx * 0.78, B.ry * 0.36, coat.belly);        // pale belly
    g.ellipse(B.cx, top + 1.3, B.rx * 0.74, 1, lt);                                        // light along the back
    g.rect(R(hind + B.rx * 0.42), R(mid - 1), 2, 3, coat.belly);                           // white rump patch
    if (coat.spots) [[-4, 1], [-1, 2], [2, 1], [4, 2], [0, 0], [-2, 3], [3, 3]].forEach(([dx, dy]) => g.put(B.cx + dx, R(top + 1 + dy), 0xf7efd9));

    leg(fore, hooves[0], true, md);
    leg(hind, hooves[1], false, md);

    // neck and head, as for the horse: up and alert, or down to nose at something
    const th = (64 - headDrop * 100) * Math.PI / 180;
    const d = [-Math.cos(th), -Math.sin(th)], n = [-d[1], d[0]];
    const len = B.neck * (1 + headDrop * 0.15);
    const withers = [fore + B.neckW * 0.8, top + 1], chest = [fore - 2, mid + 0.5];
    const poll = [fore + 1.5 + d[0] * len, top + 2 + d[1] * len];
    const w1 = B.neckW / 2 - 0.8;
    g.poly([withers, chest, [poll[0] - n[0] * w1, poll[1] - n[1] * w1], [poll[0] + n[0] * w1, poll[1] + n[1] * w1]], md);
    g.line(chest[0] + 1, chest[1] - 1, poll[0] - n[0] * w1 + 1, poll[1] - n[1] * w1 + 1, coat.belly);       // pale throat

    const ph = (38 + headDrop * 34) * Math.PI / 180;
    const h = [-Math.cos(ph), Math.sin(ph)], m = [-h[1], h[0]];
    const at = (along, out) => [poll[0] + h[0] * along + m[0] * out, poll[1] + h[1] * along + m[1] * out];
    const cheek = B.headW / 2, nose = B.headW / 2 - 1.1;
    g.poly([at(-1, cheek), at(-1, -cheek), at(B.head, -nose), at(B.head, nose)], md);
    g.ellipse(...at(1.2, 0), cheek + 0.4, cheek + 0.4, md);
    const tip = at(B.head - 0.3, 0);
    g.put(R(tip[0]), R(tip[1]), EYE);                                                      // nose
    const eye = at(2.2, 0.4);
    g.put(R(eye[0]), R(eye[1]), EYE);
    // ears: large, set back; one swivels
    const eb = at(-0.6, cheek - 0.4);
    const ev = [-h[0] * 0.75 + m[0] * 0.65 + (ear ? 0.55 : 0), -h[1] * 0.75 + m[1] * 0.65];
    g.poly([[eb[0] - 1, eb[1] + 1], [eb[0] + 2, eb[1] + 1], [eb[0] + ev[0] * B.ear + 1, eb[1] + ev[1] * B.ear], [eb[0] + ev[0] * B.ear, eb[1] + ev[1] * B.ear]], md);
    g.put(R(eb[0] + ev[0] * B.ear * 0.5 + 0.6), R(eb[1] + ev[1] * B.ear * 0.5), 0xe8c9b0);
  }, C.ink);
}

function deerFrames(kind) {
  const B = DEER_BUILD[kind], reach = kind === 'fawn' ? 2 : 4, lift = kind === 'fawn' ? 2 : 3;
  const frames = [
    drawDeer(kind, {}),                                                // 0 standing, alert
    drawDeer(kind, { ear: 1 })                                         // 1   an ear turns
  ];
  for (let i = 0; i < 6; i++) frames.push(drawDeer(kind, { hooves: stride(i / 6, reach, lift), bob: i % 3 === 1 ? 1 : 0 }));   // 2-7 walking
  frames.push(drawDeer(kind, { hooves: [[-reach - 1, 4], [reach + 2, 3], [-reach - 2, 5], [reach + 1, 4]], bob: -1, tail: 1 }));   // 8 mid-leap
  frames.push(drawDeer(kind, { headDrop: 0.75 }));                     // 9 head down, nosing
  frames.push(drawDeer(kind, { ear: 1, tail: 1, bob: 1 }));            // 10 frightened
  return sheet(frames, B.w + 2, B.h + 2);
}

export const doe = () => deerFrames('doe');
export const fawn = () => deerFrames('fawn');

// ── the old stag ──
//
// lying down with his legs folded under him, and not going to get up. one
// drawing, with the head carried high, lowered to drink, or laid on the ground.

const STAG = { body: [0x5a4636, 0x7a6350, 0x998068], belly: 0xcbbfa6, grey: 0xd3ccc0, antler: [0x9c8a66, 0xd9cba4], hoof: 0x2b1b14 };

function drawStag({ headDrop = 0, eyeShut = false, ear = 0, reach = 0, breath = 0 } = {}) {
  const [dk, md, lt] = STAG.body;
  const W = 66, H = 36, R = Math.round;
  const ox = 10, oy = 2;                              // room on the left and above for the head and antlers
  return outlined(W, H, (g) => {
    // the body, heavy on the ground, legs tucked in under it
    // (breath lifts his back a pixel: the only thing about him that still moves much)
    g.ellipse(ox + 34, oy + 25 - breath * 0.5, 15, 6.4 + breath * 0.5, md);
    g.ellipse(ox + 45, oy + 24 - breath * 0.5, 6.5, 6.6 + breath * 0.5, md);    // haunch
    g.ellipse(ox + 22, oy + 25.5, 6, 5.6, md);                                  // shoulder
    g.ellipse(ox + 34, oy + 29.6, 12, 2.2, STAG.belly);
    g.ellipse(ox + 34, oy + 20.4 - breath, 11, 1.3, lt);
    g.rect(ox + 47, oy + 21, 2, 3, STAG.belly); g.rect(ox + 49, oy + 20, 2, 3, dk);                 // rump patch, tail
    g.poly([[ox + 14, oy + 30], [ox + 24, oy + 29], [ox + 25, oy + 33], [ox + 13, oy + 33]], dk);   // a foreleg folded forward
    g.rect(ox + 11, oy + 31, 3, 2, STAG.hoof);
    g.poly([[ox + 38, oy + 30], [ox + 47, oy + 28], [ox + 50, oy + 33], [ox + 39, oy + 33]], dk);   // a hind leg under the haunch
    g.rect(ox + 36, oy + 32, 3, 2, STAG.hoof);
    [[27, 22], [33, 23], [40, 22], [30, 26], [43, 26]].forEach(([x, y]) => g.put(ox + x, oy + y, STAG.grey));   // the grey coming into his coat

    // neck and head: d runs along the neck, h along the face
    const th = (58 - headDrop * 78) * Math.PI / 180;
    const d = [-Math.cos(th), -Math.sin(th)], n = [-d[1], d[0]];
    const len = 12 + headDrop * 3 + reach;            // reach: the neck stretched out toward something
    const poll = [ox + 20 + d[0] * len, oy + 21 + d[1] * len];
    g.poly([[ox + 25, oy + 21], [ox + 17, oy + 27], [poll[0] - n[0] * 2.4, poll[1] - n[1] * 2.4], [poll[0] + n[0] * 2.4, poll[1] + n[1] * 2.4]], md);
    g.line(ox + 17, oy + 26, poll[0] - n[0] * 2 + 1, poll[1] - n[1] * 2 + 1, STAG.belly);
    const ph = (34 + headDrop * 30) * Math.PI / 180;
    const h = [-Math.cos(ph), Math.sin(ph)], m = [-h[1], h[0]];
    const at = (along, out) => [poll[0] + h[0] * along + m[0] * out, poll[1] + h[1] * along + m[1] * out];

    // antlers first, so the head sits in front of where they spring from: a beam
    // sweeping up and back from the brow, three tines reaching forward — the far
    // one a shade darker behind the near one
    const up = [m[0] * 0.92 - h[0] * 0.4, m[1] * 0.92 - h[1] * 0.4], fwd = [h[0] * 0.75 + m[0] * 0.65, h[1] * 0.75 + m[1] * 0.65];
    const antler = (shift, tone) => {
      const brow = at(0.4 + shift, 2.2);
      const beam = (k) => [brow[0] + up[0] * k - h[0] * k * k * 0.035, brow[1] + up[1] * k - h[1] * k * k * 0.035];
      for (let k = 0; k <= 11; k += 0.5) { const [x, y] = beam(k); g.put(x, y, tone); g.put(x + 1, y, tone); }
      [[2.5, 4.4], [6, 4], [9.5, 3.2]].forEach(([k, tine]) => {
        const [x, y] = beam(k);
        g.line(x, y, x + fwd[0] * tine, y + fwd[1] * tine, tone);
      });
    };
    antler(-2.2, STAG.antler[0]);
    antler(0, STAG.antler[1]);

    g.poly([at(-1, 2.6), at(-1, -2.6), at(9, -1.6), at(9, 1.6)], md);
    g.ellipse(...at(1.4, 0), 3, 3, md);
    g.ellipse(...at(7.6, 0), 2.3, 2.1, STAG.grey);                    // his muzzle has gone grey
    const tip = at(9, 0.2); g.put(R(tip[0]), R(tip[1]), EYE);
    const eye = at(2.6, 0.5);
    if (eyeShut) { g.put(R(eye[0]), R(eye[1]), dk); g.put(R(eye[0]) - 1, R(eye[1]), dk); } else g.put(R(eye[0]), R(eye[1]), EYE);
    // an ear, set below the antlers
    const eb = at(-0.8, 1.2), ev = [-h[0] * 0.95 + m[0] * 0.2 + (ear ? 0.3 : 0), -h[1] * 0.95 + m[1] * 0.2 + (ear ? 0.5 : 0)];
    g.poly([[eb[0] - 1, eb[1] + 1], [eb[0] + 2, eb[1] + 1], [eb[0] + ev[0] * 5 + 1, eb[1] + ev[1] * 5], [eb[0] + ev[0] * 5, eb[1] + ev[1] * 5]], md);
  }, C.ink);
}

export function stag() {
  return sheet([
    drawStag({}),                                             // 0 head up, watching you
    drawStag({ ear: 1 }),                                     // 1   an ear moves
    drawStag({ breath: 1 }),                                  // 2   breathing in
    drawStag({ headDrop: 0.8, reach: 5 }),                    // 3 neck stretched down to the bowl, drinking
    drawStag({ headDrop: 0.86 }),                             // 4 head low, tired
    drawStag({ headDrop: 0.86, breath: 1 }),                  // 5   breathing in
    drawStag({ headDrop: 1, eyeShut: true }),                 // 6 head laid down, eyes shut
    drawStag({ headDrop: 1, eyeShut: true, breath: 1 })       // 7   breathing in
  ], 68, 38);
}

// ── the moose by the road ──
//
// a bull: taller at the shoulder than you are, a hump over the forelegs, pale
// stockings, a long face with a nose that hangs over, a bell under the chin,
// and broad flat antlers. one drawing with a pose, like the horse: how far the
// head is lowered (0 up and looking … 1 down in the bushes, eating), where
// each hoof is, an ear, the jaw.

const MOOSE = { body: [0x2c211a, 0x44342a, 0x5c4939], leg: [0x6f6456, 0x9a8d7a], muzzle: 0x7d6a58,
  antler: [0x8f7d5c, 0xd9cba4], hoof: 0x17110d };
const MOOSE_BUILD = { w: 84, h: 58, cx: 49, leg: 22, rx: 15, ry: 7.5, foreX: -11, hindX: 11, neck: 12, neckW: 10, head: 17 };

function drawMoose({ headDrop = 0, hooves = [], ear = 0, chew = 0, bob = 0 } = {}) {
  const B = MOOSE_BUILD, [dk, md, lt] = MOOSE.body, R = Math.round;
  const ground = B.h - 1;
  const hipY = ground - B.leg;                    // where the legs leave the body
  const mid = hipY - B.ry + 2 + bob;              // middle of the barrel
  const top = mid - B.ry;                         // the line of the back
  const fore = B.cx + B.foreX, hind = B.cx + B.hindX;

  return outlined(B.w, B.h, (g) => {
    // a long leg: dark to the knee, a pale stocking below it
    const leg = (hipX, hoof = [0, 0], isFore, far) => {
      const [dx, lift] = hoof;
      const fx = hipX + dx + (isFore ? 0 : 1), fy = ground - lift;
      const kx = (hipX + fx) / 2 + (isFore ? -lift * 1.1 : 1.6 + lift * 0.7), ky = (hipY + fy) / 2 - 1;
      limb(g, R(hipX) - 1, hipY - 2, R(kx) - 1, R(ky), 4, far ? dk : md);          // forearm / thigh
      limb(g, R(kx), R(ky), R(fx), fy - 2, 2, far ? MOOSE.leg[0] : MOOSE.leg[1]);  // the stocking
      g.rect(R(kx) - 1, R(ky) - 1, 3, 2, far ? dk : md);                           // a knobbly knee
      g.rect(R(fx) - 1, fy - 1, 3, 2, MOOSE.hoof);
    };

    // far side first, in shadow
    leg(fore + 4, hooves[2], true, true);
    leg(hind + 3, hooves[3], false, true);

    // a stub of a tail
    g.rect(R(hind + B.rx * 0.5), top + 4, 2, 4, dk);

    // the barrel, the hump over the shoulders, the rump falling away behind
    g.ellipse(B.cx + 1, mid + 0.5, B.rx - 1, B.ry - 0.5, md);
    g.ellipse(fore + 3, mid - 3, 8.5, B.ry + 4, md);                              // shoulder and hump
    g.ellipse(hind - 1, mid + 1.5, 6.5, B.ry - 0.5, md);
    g.poly([[fore + 6, top - 5], [hind + 4, top + 3], [hind + 4, mid], [fore + 6, mid]], md);   // the back, sloping down to the rump
    g.ellipse(B.cx + 3, mid + B.ry * 0.72, B.rx * 0.66, B.ry * 0.26, dk);         // belly in shade
    g.ellipse(fore - 2, mid + 3, 3, 4.5, dk);                                     // and the hollow behind the chest
    g.line(fore + 1, top - 6, fore + 7, top - 5, lt);                             // light on the hump
    g.line(fore + 9, top - 3, hind, top + 2, lt);                                 // and down the back
    for (let x = fore - 2; x <= fore + 8; x += 2) g.put(x, top - 7 + (x % 4 === 0 ? 0 : 1), dk);   // the coarse hair on it

    // near legs over the body
    leg(fore, hooves[0], true, false);
    leg(hind, hooves[1], false, false);

    // neck: thick and short, from the hump out to the poll (up) or down to the bushes.
    // d runs along the neck, n points to its crest
    const th = (38 - headDrop * 88) * Math.PI / 180;
    const d = [-Math.cos(th), -Math.sin(th)], n = [-d[1], d[0]];
    const len = B.neck * (1 + headDrop * 0.45);
    const withers = [fore + 7, top - 2], chest = [fore - 4, mid + 3];
    const poll = [fore - 1 + d[0] * len, top + 3 + d[1] * len];
    const w1 = B.neckW / 2 - 1.5;
    g.poly([withers, chest, [poll[0] - n[0] * w1, poll[1] - n[1] * w1], [poll[0] + n[0] * w1, poll[1] + n[1] * w1]], md);
    g.line(withers[0] - 1, withers[1], poll[0] + n[0] * w1, poll[1] + n[1] * w1, dk);                       // the mane down its crest

    // head: h runs along the face from the poll to the nose, m points out of the forehead
    const ph0 = 52, ph = ph0 + headDrop * 24;
    const pr = ph * Math.PI / 180;
    const h = [-Math.cos(pr), Math.sin(pr)], m = [-h[1], h[0]];
    const at = (along, out) => [poll[0] + h[0] * along + m[0] * out, poll[1] + h[1] * along + m[1] * out + (along > B.head * 0.62 && out < 0 ? chew : 0)];

    // antlers, before the head so it sits in front of where they spring from.
    // drawn for the head held up, and tipped forward with it as it goes down:
    // a short beam out of the brow, a broad flat palm, tines along its rim
    const tip = -headDrop * 62 * Math.PI / 180, ct = Math.cos(tip), sn = Math.sin(tip);
    const antler = (shift, tone, shade) => {
      const brow = at(0.8 + shift, 3);
      const P = ([x, y]) => [brow[0] + x * ct - y * sn, brow[1] + x * sn + y * ct];
      limb(g, ...P([0, 0]).map(R), ...P([4, -3]).map(R), 2, shade);
      g.poly([[3, -2], [2, -6], [5, -9], [10, -10], [15, -8], [16, -5], [12, -3], [7, -2]].map(P), tone);
      g.poly([[3, -2], [7, -2], [12, -3], [16, -5], [12, -4.4], [7, -3.6]].map(P), shade);     // its underside, in shade
      // tines along the rim, and one forward over the brow
      [[[2, -6], [0, -9]], [[5, -9], [4, -12]], [[10, -10], [10, -13]], [[15, -8], [17, -11]], [[16, -5], [19, -5]],
        [[3, -2], [-2, -3]], [[-2, -3], [-3, -6]]].forEach(([a, b]) => g.line(...P(a), ...P(b), tone));
    };
    antler(-3.5, MOOSE.antler[0], mix(MOOSE.antler[0], dk, 0.45));
    antler(0, MOOSE.antler[1], MOOSE.antler[0]);

    // an ear, behind the antler, turned back (or pricked toward a sound)
    const eb = at(-2, 2.2), ev = ear ? [0.25, -1] : [0.85, -0.6];
    g.poly([[eb[0] - 1, eb[1] + 1], [eb[0] + 2, eb[1] + 1], [eb[0] + ev[0] * 6 + 1, eb[1] + ev[1] * 6], [eb[0] + ev[0] * 6, eb[1] + ev[1] * 6]], md);
    g.put(R(eb[0] + ev[0] * 2.5), R(eb[1] + ev[1] * 2.5), dk);

    // the long face, and the nose hanging over the end of it
    g.poly([at(-2, 3.6), at(-2, -3.4), at(B.head - 3, -2.6), at(B.head - 3, 2.4)], md);
    g.ellipse(...at(1, 0), 4, 4, md);                                             // the round of the jaw
    g.ellipse(...at(B.head - 3, -0.4), 3.6, 3.4, MOOSE.muzzle);                   // the bulb of the nose
    g.ellipse(...at(B.head - 1.2, -1.6), 2.4, 2.3, MOOSE.muzzle);                 //   drooping over the lip
    g.ellipse(...at(B.head - 4.5, 1.2), 2, 1.2, mix(MOOSE.muzzle, lt, 0.5));      // light on the bridge of it
    const eye = at(3.4, 1.4), nostril = at(B.head - 1.4, 0.2);
    g.put(R(eye[0]), R(eye[1]), EYE); g.put(R(eye[0]) - 1, R(eye[1]) - 1, lt);
    g.put(R(nostril[0]), R(nostril[1]), EYE);
    // the bell: the flap of hair under its chin, which always hangs straight down
    const chin = at(5, -3.4);
    g.rect(R(chin[0]) - 1, R(chin[1]), 3, 3, md); g.rect(R(chin[0]), R(chin[1]) + 3, 2, 3, dk);
  }, C.ink);
}

export function moose() {
  const frames = [
    drawMoose({ headDrop: 1 }),                                   // 0 head down, eating
    drawMoose({ headDrop: 1, chew: 1 }),                          // 1   its jaw going
    drawMoose({ headDrop: 1, ear: 1 }),                           // 2   an ear turns (it's about to look up)
    drawMoose({ headDrop: 0.5, ear: 1 }),                         // 3 the head coming up
    drawMoose({}),                                                // 4 head up, looking
    drawMoose({ ear: 1 }),                                        // 5   an ear turns
    drawMoose({ bob: 1 }),                                        // 6   a breath
    drawMoose({ headDrop: 0.15, ear: 1, hooves: [[-2, 5]] })      // 7 a forefoot lifted to stamp: it has seen you
  ];
  for (let i = 0; i < 8; i++) {                                   // 8-15 walking, head low, antlers first
    frames.push(drawMoose({ headDrop: 0.22, ear: 1, hooves: stride(i / 8, 5, 3), bob: i % 4 === 1 ? 1 : 0 }));
  }
  return sheet(frames, MOOSE_BUILD.w + 2, MOOSE_BUILD.h + 2);
}

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

// ── the red squirrel, who has dropped its winter store ──

const SQUIRREL = { fur: [0x8a3f1e, 0xb85a2a, 0xdc8242], belly: 0xf3e3c6, tip: 0xf2b678, nut: [0x6b4a2a, 0xc9954a, 0xe8bd72] };

// a stroke that swells or thins along its length — a squirrel is mostly tail
function brush(g, x0, y0, x1, y1, r0, r1, c) {
  for (let i = 0; i <= 8; i++) {
    const t = i / 8, r = r0 + (r1 - r0) * t;
    g.ellipse(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, c);
  }
}

// up on its haunches with its tail curled up behind. `tail` swings the tip,
// `up` lifts its head to look at you, `nut` puts an acorn in its paws
function squirrelSit({ tail = 0, up = false, nut = false } = {}) {
  const f = SQUIRREL.fur;
  return outlined(22, 18, (g) => {
    brush(g, 12, 15, 15.5, 9, 1.8, 2.6, f[1]);                                    // the tail: up the back…
    brush(g, 15.5, 9, 15 + tail, 4, 2.6, 3, f[1]);                                // …and curling over at the top
    brush(g, 14, 13, 15.6, 8, 0.6, 1.2, f[2]); g.ellipse(15 + tail, 4.2, 1.6, 1.8, SQUIRREL.tip);
    g.ellipse(8.6, 11.6, 3.2, 4.4, f[1]); g.ellipse(9.8, 14.2, 3.4, 2.8, f[1]);   // back and haunch
    g.ellipse(9.4, 10.4, 1.6, 2.4, f[2]);
    g.ellipse(6.8, 12.4, 1.7, 3.2, SQUIRREL.belly);
    g.rect(5, 16, 6, 2, f[0]);                                                    // the long hind foot
    const hy = up ? 5 : 6;
    g.ellipse(5.6, hy, 3.1, 2.7, f[1]); g.ellipse(6.2, hy - 0.9, 1.8, 1.2, f[2]); // head
    g.rect(6, hy - 5, 2, 3, f[1]); g.put(6, hy - 5, f[0]); g.put(7, hy - 3, SQUIRREL.tip);   // a tufted ear
    g.rect(3, hy + 2, 3, 1, SQUIRREL.belly);                                      // pale chin
    g.put(4, hy, EYE); g.put(2, hy + 1, EYE);                                     // eye, nose
    g.line(7, 10, 4, 11, f[0]);                                                   // paws held up at the chest
    if (nut) { g.rect(2, 10, 3, 3, SQUIRREL.nut[1]); g.hline(2, 9, 3, SQUIRREL.nut[0]); g.put(2, 11, SQUIRREL.nut[2]); }
  }, C.ink);
}

// one bound, in four moments, the tail streaming out behind
function squirrelRun(moment) {
  const f = SQUIRREL.fur;
  return outlined(28, 15, (g) => {
    const p = [
      { body: [10, 10, 5, 3], head: [4.5, 8.6], fore: [[5, 12], [4, 14]], hind: [[12, 12], [11, 14]], tail: [14, 9, 22, 4] },
      { body: [10, 8, 5.6, 2.6], head: [3.8, 6], fore: [[5, 9], [2, 11]], hind: [[13, 10], [15, 14]], tail: [15, 8, 24, 5] },
      { body: [10, 6.6, 6, 2.4], head: [3.4, 5.4], fore: [[5, 8], [1, 9]], hind: [[14, 8], [18, 9]], tail: [15, 6, 25, 6] },
      { body: [10, 8.6, 5.4, 2.8], head: [4.2, 9], fore: [[5, 11], [3, 14]], hind: [[13, 9], [16, 7]], tail: [14, 7, 23, 3] }
    ][moment];
    brush(g, p.tail[0], p.tail[1], p.tail[2], p.tail[3], 1.6, 2.8, f[1]);
    brush(g, p.tail[0] + 2, p.tail[1], p.tail[2], p.tail[3], 0.5, 1.3, f[2]);
    g.ellipse(p.tail[2], p.tail[3], 1.2, 1.2, SQUIRREL.tip);
    limb(g, p.hind[0][0], p.hind[0][1], p.hind[1][0], p.hind[1][1], 2, f[0]);
    limb(g, p.fore[0][0], p.fore[0][1], p.fore[1][0], p.fore[1][1], 2, f[0]);
    g.ellipse(...p.body, f[1]); g.ellipse(p.body[0] + 1, p.body[1] - 1, p.body[2] * 0.6, p.body[3] * 0.45, f[2]);
    g.ellipse(p.body[0] - 2, p.body[1] + p.body[3] * 0.55, p.body[2] * 0.5, 1.1, SQUIRREL.belly);
    g.ellipse(p.head[0], p.head[1], 2.9, 2.5, f[1]); g.ellipse(p.head[0] + 0.5, p.head[1] - 0.8, 1.7, 1.1, f[2]);
    g.rect(Math.round(p.head[0]) + 1, Math.round(p.head[1]) - 4, 2, 2, f[1]);     // ear
    g.put(Math.round(p.head[0] - 1.5), Math.round(p.head[1]), EYE); g.put(Math.round(p.head[0] - 3), Math.round(p.head[1] + 1), EYE);
  }, C.ink);
}

// looking out of its hole: a face, an ear, two paws on the rim
function squirrelPeek() {
  const f = SQUIRREL.fur;
  return outlined(10, 10, (g) => {
    g.ellipse(4.8, 5.4, 3.6, 3.2, f[1]); g.ellipse(5.4, 4.2, 2.2, 1.4, f[2]);
    g.rect(5, 0, 2, 3, f[1]); g.put(5, 0, f[0]); g.put(6, 2, SQUIRREL.tip); g.rect(8, 2, 1, 2, f[0]);
    g.rect(2, 7, 3, 1, SQUIRREL.belly);
    g.put(3, 5, EYE); g.put(1, 6, EYE);
    g.rect(2, 9, 2, 1, f[0]); g.rect(6, 9, 2, 1, f[0]);
  }, C.ink);
}

export function squirrel() {
  return sheet([
    squirrelSit(), squirrelSit({ tail: 1 }),                                      // 0-1 sitting, the tail twitching
    squirrelSit({ up: true }),                                                    // 2 looking up at you
    squirrelRun(0), squirrelRun(1), squirrelRun(2), squirrelRun(3),               // 3-6 bounding
    squirrelSit({ up: true, nut: true }),                                         // 7 with an acorn in its paws
    squirrelPeek()                                                                // 8 looking out of its hole
  ], 30, 20);
}

// ── the ducks at the pond: a mallard hen, and her ducklings ──

const DUCK = { b: [0x5a3f26, 0x86623c, 0xb08a5a, 0xd9bd8e], bill: [0xb5701f, 0xe09a2e], leg: 0xd9772a, wing: 0x3f6fae };
const DUCKLING = { d: [0xc98f1c, 0xf2cc45, 0xfde98e], bill: 0xe8862e, leg: 0xc96a22 };
const RIPPLE = [0x8fcbd0, 0xc9ecec];

// on the water a bird is cut off at the waterline, with a ripple either side
function afloat(g, w, line) {
  g.rect(0, line + 1, w, 20, [0, 0, 0, 0]);
  g.hline(1, line, 3, RIPPLE[1]); g.hline(w - 5, line, 4, RIPPLE[0]);
}

// `neck` stretches it up, `open` is a quack, `step` is which foot is forward
function duckHen({ neck = 0, open = false, step = 0, swim = false } = {}) {
  const b = DUCK.b;
  return outlined(23, 16, (g) => {
    g.ellipse(13, 9.6, 7, 4, b[1]); g.ellipse(14, 8.2, 5, 2, b[2]);                    // body, lighter along the back
    g.poly([[18, 8], [22, 5], [21, 10]], b[1]); g.put(22, 5, b[0]);                    // the tail, cocked up
    g.ellipse(9.6, 11.4, 4, 2.2, b[3]);                                                // pale breast
    [[10, 9], [12, 11], [15, 10], [17, 9], [13, 8], [11, 7], [16, 11], [8, 12]].forEach(([x, y]) => g.put(x, y, b[0]));   // mottling
    g.rect(13, 9, 4, 1, DUCK.wing); g.put(17, 9, 0xf2f2ec); g.put(12, 9, 0xf2f2ec);     // the blue on her wing
    const hy = 4 - neck;
    limb(g, 6, hy + 2, 8, 8, 3, b[2]);                                                 // neck
    g.ellipse(6, hy, 2.6, 2.3, b[2]); g.hline(4, hy - 2, 4, b[0]); g.hline(5, hy, 3, b[0]);   // head: dark cap, a line through the eye
    g.put(5, hy, EYE);
    g.rect(1, hy + 1, 3, 1, DUCK.bill[1]); g.put(1, hy + 2, DUCK.bill[0]);             // bill
    if (open) { g.rect(1, hy + 3, 2, 1, DUCK.bill[1]); g.put(3, hy + 2, 0x6b2a1c); }
    if (swim) { afloat(g, 23, 12); return; }
    const feet = step === 0 ? [10, 14] : step === 1 ? [9, 15] : [11, 13];
    feet.forEach((x) => { g.vline(x, 13, 2, DUCK.leg); g.hline(x - 1, 15, 3, DUCK.leg); });
  }, C.ink);
}

export function duck() {
  return sheet([
    duckHen(), duckHen({ neck: 1 }),                             // 0-1 standing, looking about
    duckHen({ neck: 1, open: true }),                            // 2 calling
    duckHen({ step: 1 }), duckHen({ step: 2 }),                  // 3-4 waddling
    duckHen({ swim: true }), duckHen({ swim: true, neck: 1 })    // 5-6 on the water
  ], 26, 18);
}

// a ball of yellow down. `peep` opens its bill, `step` is which foot, `hop` is
// mid-air, `held` is sitting in your hands with its feet tucked under it
function ducklingBody({ peep = false, step = 0, hop = false, swim = false, held = false } = {}) {
  const d = DUCKLING.d;
  return outlined(11, 10, (g) => {
    g.ellipse(6, 6, 3.4, 2.7, d[1]); g.ellipse(6.8, 5, 2.2, 1.3, d[2]);                // body
    g.put(10, 5, d[1]); g.put(5, 8, d[0]); g.put(7, 8, d[0]);
    if (hop) { g.put(8, 3, d[2]); g.put(9, 2, d[1]); g.put(9, 3, d[1]); }              // a stub of a wing, held out
    const hy = peep ? 2 : 3;
    g.ellipse(3.4, hy, 2.3, 2.2, d[1]); g.put(4, hy - 2, d[2]); g.put(3, hy - 1, d[2]);   // head
    g.put(2, hy, EYE);
    g.put(0, hy + 1, DUCKLING.bill); if (peep) g.put(0, hy + 2, DUCKLING.bill); else g.put(1, hy + 1, DUCKLING.bill);
    if (swim) { afloat(g, 11, 7); return; }
    if (hop || held) return;
    (step === 0 ? [5, 7] : [4, 8]).forEach((x) => g.put(x, 9, DUCKLING.leg));
  }, C.ink);
}

export function duckling() {
  return sheet([
    ducklingBody(), ducklingBody({ peep: true }),                // 0-1 standing, peeping
    ducklingBody({ step: 0 }), ducklingBody({ step: 1 }),        // 2-3 waddling
    ducklingBody({ hop: true }),                                 // 4 a hop
    ducklingBody({ swim: true }),                                // 5 on the water
    ducklingBody({ held: true }), ducklingBody({ held: true, peep: true })   // 6-7 in your hands
  ], 14, 12);
}

// ── the turtle that ended up on its back ──

const TURTLE = { shell: [0x2e3a22, 0x48582f, 0x66743d, 0x8a9550], belly: [0xb59a52, 0xd9bf72, 0xeedc9a], skin: [0x5a6a3a, 0x7d8c4e, 0xa3ae68] };

// the right way up: a domed shell with its plates picked out, head and feet
// out from under it. `head` 0 is pulled in, 1 out; `step` moves the feet
function turtleUp({ head = 1, step = 0 } = {}) {
  const s = TURTLE.shell, k = TURTLE.skin;
  return outlined(24, 13, (g) => {
    const feet = step === 0 ? [[6, 11], [16, 11]] : [[8, 11], [14, 11]];
    feet.forEach(([x, y]) => { g.rect(x, y - 1, 3, 3, k[1]); g.put(x, y + 1, k[0]); });
    g.rect(19, 9, 3, 2, k[1]);                                                      // a stub of a tail
    if (head) { g.ellipse(3.2, 8, 2.8, 2.2, k[1]); g.rect(4, 8, 3, 2, k[1]); g.put(2, 7, EYE); g.put(3, 9, k[0]); g.put(4, 7, k[2]); }
    for (let y = 0; y < 10; y++) {                                                  // the shell: a low dome
      const half = 9.5 * Math.sqrt(1 - ((9.5 - y) / 10) ** 2);
      for (let x = Math.round(12 - half); x < Math.round(12 + half); x++) g.put(x, y, y < 3 ? s[2] : s[1]);
    }
    [[8, 3, 2.4, 2], [12.5, 2.4, 2.4, 1.8], [17, 3.4, 2.2, 2], [10, 6.6, 2.2, 1.6], [15, 6.6, 2.2, 1.6]]
      .forEach(([x, y, rx, ry]) => { g.ellipse(x, y, rx, ry, s[2]); g.put(Math.round(x), Math.round(y) - 1, s[3]); });   // its plates
    g.hline(3, 9, 18, s[0]); g.hline(4, 10, 16, TURTLE.belly[0]);                    // the rim, and the yellow underneath
  }, C.ink);
}

// upside down: the pale underside of the shell to the sky, all four feet going
function turtleBack(kick) {
  const s = TURTLE.shell, b = TURTLE.belly, k = TURTLE.skin;
  return outlined(24, 14, (g) => {
    const feet = kick ? [[5, 3], [9, 1], [15, 2], [19, 4]] : [[5, 2], [9, 3], [15, 1], [19, 3]];
    feet.forEach(([x, y]) => { g.rect(x, y, 2, 3, k[1]); g.put(x, y, k[2]); });
    g.ellipse(2.6, 8.6, 2.4, 2, k[1]); g.put(2, 9, EYE);                            // its head, craned round
    for (let y = 4; y < 14; y++) {                                                  // the dome, now underneath
      const half = 9.5 * Math.sqrt(1 - ((y - 4.5) / 10) ** 2);
      for (let x = Math.round(12 - half); x < Math.round(12 + half); x++) g.put(x, y, y > 11 ? s[0] : s[1]);
    }
    g.ellipse(12, 5.6, 8, 1.8, b[1]); g.hline(6, 5, 12, b[2]); g.vline(12, 4, 3, b[0]); g.hline(7, 6, 10, b[0], 0.6);   // its belly plate
  }, C.ink);
}

export function turtle() {
  return sheet([
    turtleBack(false), turtleBack(true),                        // 0-1 on its back, feet going
    turtleUp({ head: 0 }),                                      // 2 right way up, head pulled in
    turtleUp(), turtleUp({ step: 1 })                           // 3-4 head out, walking
  ], 26, 16);
}

// ── the brown trout left behind in a puddle ──

const TROUT = { back: 0x4f5232, side: 0x93804a, gold: 0xb89c55, belly: 0xe2d6a4, spot: 0x2e2416, red: 0xb5432c, fin: 0x6d6a43 };

// a trout lying on its side, head to the left. `curl` bends both ends up (it
// flapping), `flick` lifts just the tail
function trout({ curl = 0, flick = 0 } = {}) {
  const W = 20, H = 13, mid = 7, len = 17;
  return outlined(W, H, (g) => {
    // where the middle of the body is at a point u (0 snout … 1 tail tip), and how thick it is there
    const at = (u) => mid - curl * 20 * (u - 0.45) * (u - 0.45) - flick * 6 * Math.max(0, u - 0.6) ** 2 / 0.16;
    const half = (u) => (u < 0.12 ? 0.6 + u * 14 : u < 0.55 ? 2.3 + Math.sin((u - 0.12) / 0.43 * Math.PI / 2) * 0.6 : u < 0.82 ? 2.9 - (u - 0.55) * 7 : 0);
    for (let x = 0; x <= len; x++) {
      const u = x / len, cy = at(u), h = half(u);
      if (u >= 0.82) {
        // the tail fin, fanning out
        const f = 0.8 + (u - 0.82) * 14;
        for (let y = Math.round(cy - f); y <= Math.round(cy + f); y++) {
          if (u > 0.93 && Math.abs(y - cy) < 1) continue;            // forked
          g.put(x + 1, y, Math.abs(y - cy) > f - 0.8 ? TROUT.back : TROUT.fin);
        }
        continue;
      }
      for (let y = Math.round(cy - h); y <= Math.round(cy + h); y++) {
        const k = (y - (cy - h)) / (2 * h || 1);                  // 0 along its back … 1 along its belly
        g.put(x + 1, y, k < 0.28 ? TROUT.back : k < 0.55 ? TROUT.side : k < 0.75 ? TROUT.gold : TROUT.belly);
      }
    }
    // spots, dark along the back and a few red down the side; a fin on the back and one under
    [[0.3, -1.2], [0.42, -1.6], [0.55, -1.1], [0.64, -1.5], [0.36, 0.2], [0.72, -0.6]].forEach(([u, o]) => g.put(Math.round(u * len) + 1, Math.round(at(u) + o), TROUT.spot));
    [[0.47, 0.3], [0.6, 0.1]].forEach(([u, o]) => g.put(Math.round(u * len) + 1, Math.round(at(u) + o), TROUT.red));
    const dorsal = Math.round(0.5 * len) + 1, dy = Math.round(at(0.5) - half(0.5));
    g.put(dorsal, dy - 1, TROUT.fin); g.put(dorsal + 1, dy - 1, TROUT.fin); g.put(dorsal + 1, dy - 2, TROUT.back);
    const anal = Math.round(0.66 * len) + 1, ay = Math.round(at(0.66) + half(0.66));
    g.put(anal, ay + 1, TROUT.fin);
    // the eye, and the line of the gill behind it
    const ey = Math.round(at(0.1) - 0.6);
    g.put(2, ey, 0x111111); g.put(3, ey, TROUT.belly);
    g.put(4, Math.round(at(0.2)), TROUT.back); g.put(4, Math.round(at(0.2)) + 1, TROUT.back);
  }, C.ink);
}

export function fish() {
  return sheet([
    trout({ curl: 0.15 }),                                     // 0 lying on its side, gasping
    trout({ curl: 0.15, flick: 1 }),                           // 1 the tail flicks up
    trout({ curl: 0.9 }),                                      // 2 both ends up: a flap
    trout({ curl: -0.5 }),                                     // 3 the other way
    trout()                                                    // 4 straight: in your hands, going into the water
  ], 22, 15);
}

// ── the bumblebee that has run out of sugar ──

const BEE = { fur: [0x231a12, 0xd99a24, 0xf5cf55], wing: [0xc9dde6, 0xf4fbff] };
export const BEE_FUR = BEE.fur;

// a round, furry bumblebee in stripes. `wings` 0 lie folded on its back, 1 are
// up and 2 down (flying); `crawl` moves a foot
function beeBody({ wings = 0, crawl = 0 } = {}) {
  const f = BEE.fur;
  return outlined(11, 9, (g) => {
    if (wings === 1) { g.ellipse(5.4, 1.6, 1.6, 2, BEE.wing[0]); g.ellipse(7.4, 1.8, 1.5, 1.8, BEE.wing[1]); }
    g.ellipse(6, 5.4, 3.8, 2.8, f[1]);                                              // the round of it
    g.ellipse(6.4, 4.4, 2.2, 1.2, f[2]);
    g.vline(5, 3, 5, f[0]); g.vline(8, 3, 5, f[0]); g.put(10, 5, f[0]); g.put(10, 6, f[0]);   // its stripes, and the dark tail end
    g.ellipse(1.8, 5, 1.7, 1.7, f[0]); g.put(1, 4, 0x4a3a2a);                       // head
    g.put(1, 2, f[0]); g.put(0, 1, f[0]); g.put(2, 2, f[0]); g.put(3, 1, f[0]);     // feelers
    if (wings === 0) { g.ellipse(7, 3.2, 2.6, 1.1, BEE.wing[0]); g.hline(6, 3, 3, BEE.wing[1]); }
    if (wings === 2) { g.ellipse(6, 4.2, 2.6, 1, BEE.wing[0]); g.ellipse(7.6, 3.8, 2, 0.9, BEE.wing[1]); }
    if (wings === 0) [3, 6 + crawl, 8].forEach((x) => g.put(x, 8, f[0]));          // feet, when it's down on them
  }, C.ink);
}

export function bee() {
  return sheet([
    beeBody(), beeBody({ crawl: -1 }),                          // 0-1 crawling, too tired to fly
    beeBody({ wings: 1 }), beeBody({ wings: 2 })                // 2-3 flying
  ], 13, 11);
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
  bird: { size: [18, 15], perch: 0, struggle: [1, 2], fly: [3, 6] },
  doe: { size: [DEER_BUILD.doe.w + 2, DEER_BUILD.doe.h + 2], idle: [0, 1], walk: [2, 7], leap: 8, nose: 9, frightened: 10 },
  fawn: { size: [DEER_BUILD.fawn.w + 2, DEER_BUILD.fawn.h + 2], idle: [0, 1], walk: [2, 7], leap: 8, nose: 9, frightened: 10 },
  stag: { size: [68, 38], watching: [0, 2], drinking: 3, tired: [4, 5], asleep: [6, 7] },
  moose: { size: [MOOSE_BUILD.w + 2, MOOSE_BUILD.h + 2], graze: [0, 2], rising: 3, looking: [4, 6], stamp: 7, walk: [8, 15] },
  squirrel: { size: [30, 20], sit: [0, 1], alert: 2, run: [3, 6], holding: 7, peek: 8 },
  duck: { size: [26, 18], stand: [0, 1], call: 2, walk: [3, 4], swim: [5, 6] },
  duckling: { size: [14, 12], stand: 0, peep: 1, walk: [2, 3], hop: 4, swim: 5, held: [6, 7] },
  turtle: { size: [26, 16], back: [0, 1], shy: 2, walk: [3, 4] },
  fish: { size: [22, 15], gasping: [0, 1], flap: [2, 3], held: 4 },
  bee: { size: [13, 11], tired: [0, 1], fly: [2, 3] }
};
