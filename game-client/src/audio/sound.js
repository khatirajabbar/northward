import Phaser from 'phaser';
import { SOUNDS } from './sounds.js';

// Playing the game's sounds. Three kinds of thing:
//
//   play(scene, id)            a one-off — a footstep, a splash — a little
//                              different each time
//   bed(scene, { id: level })  the sounds a place is made of (its air, its
//                              music): whatever isn't listed fades out, what
//                              is fades in. they carry on from scene to scene
//   level(id, 0..1)            turn one of those up or down right now — the
//                              water as you come near it, the crickets as it
//                              gets dark
//
// The sounds are the files in src/audio/files/, each named after its id in
// sounds.js (bee.mp3, music-title.mp3): made by tools/audio.mjs, or saved there
// by hand. Only those are ever loaded or played; a sound with no file yet is
// quietly nothing, so the game works before there's a sound in it.

const FILES = import.meta.glob('./files/*.mp3', { eager: true, query: '?url', import: 'default' });
const URL_OF = Object.fromEntries(Object.entries(FILES).map(([file, url]) => [file.slice('./files/'.length, -'.mp3'.length), url]));
const BY_ID = Object.fromEntries(SOUNDS.map((s) => [s.id, s]));
const MADE = new Set(Object.keys(URL_OF).filter((id) => BY_ID[id]));
const key = (id) => `snd-${id}`;
const looping = new Map();        // id → the playing sound, game-wide (beds outlive scenes)
const given = new Map();          // id → the volume we last gave it. Phaser's own reading of a
                                  // sound's volume lags behind what it was told, so a fade
                                  // starting from that would start from the wrong place
const fading = new Map();         // id → the fade in progress on it

export function loadSounds(scene) {
  MADE.forEach((id) => scene.load.audio(key(id), URL_OF[id]));
}

const ready = (scene, id) => MADE.has(id) && scene.cache.audio.exists(key(id));
const loudest = (id) => BY_ID[id].volume ?? 0.5;

export function play(scene, id, { volume = 1, vary = 0.06, pan = 0 } = {}) {
  if (!ready(scene, id) || volume < 0.02 || !on[group(id)]) return;     // too far off to hear, or switched off
  scene.sound.play(key(id), {
    volume: loudest(id) * volume,
    rate: 1 + (Math.random() * 2 - 1) * vary,
    pan
  });
}

// every so often, one of a place's small sounds, from somewhere off to one
// side: `pick` says which right now ({ id, volume }), or null for nothing.
// it keeps going as long as the scene does
export function nowAndThen(scene, pick, every = [7000, 16000]) {
  const next = () => scene.time.delayedCall(Phaser.Math.Between(...every), () => {
    const sound = pick();
    if (sound) play(scene, sound.id, { volume: sound.volume ?? Phaser.Math.FloatBetween(0.5, 1), pan: Phaser.Math.FloatBetween(-0.8, 0.8) });
    next();
  });
  next();
}

// the playing loop for an id, started silent if it isn't going yet
function loop(scene, id) {
  let sound = looping.get(id);
  if (!sound && ready(scene, id)) {
    sound = scene.sound.add(key(id), { loop: true, volume: 0 });
    sound.play();
    looping.set(id, sound);
    given.set(id, 0);
  }
  return sound;
}

function setVolume(id, sound, volume) {
  given.set(id, volume);
  sound.setVolume(on[group(id)] ? volume : 0);
}

export function level(scene, id, amount) {
  const sound = amount > 0 ? loop(scene, id) : looping.get(id);
  if (sound) setVolume(id, sound, loudest(id) * Phaser.Math.Clamp(amount, 0, 1));
}

// ease a loop to a level over a while (to 0: and then it stops)
export function fade(scene, id, amount, ms = 1500) {
  const sound = amount > 0 ? loop(scene, id) : looping.get(id);
  if (!sound) return;
  if (fading.has(id)) fading.get(id).stop();                  // a new fade takes over from where the last one got to
  const now = { volume: given.get(id) ?? 0 };
  fading.set(id, scene.tweens.add({ targets: now, volume: loudest(id) * amount, duration: ms,
    onUpdate: () => setVolume(id, sound, now.volume),
    onComplete: () => {
      fading.delete(id);
      if (amount <= 0) { sound.stop(); sound.destroy(); looping.delete(id); given.delete(id); }
    } }));
}

export function bed(scene, levels, ms = 1500) {
  [...looping.keys()].forEach((id) => { if (!(id in levels)) fade(scene, id, 0, ms); });
  Object.entries(levels).forEach(([id, amount]) => fade(scene, id, amount, ms));
}

// footsteps at walking pace: call every frame; it plays one when one is due
export function steps(scene, moving, { surface = 'grass', slow = false } = {}) {
  const now = scene.time.now;
  if (!moving) { scene.nextStep = now + 120; return; }
  if (now < (scene.nextStep || 0)) return;
  play(scene, `step-${surface}`, { vary: 0.12 });
  scene.nextStep = now + (slow ? 470 : 300);
}

// how near something is, as 0..1, for loops that come from one place
export function nearness(distance, reach) {
  return Phaser.Math.Clamp(1 - distance / reach, 0, 1);
}

// two switches, remembered between visits: the music, and every other sound
// (the air, the creatures, your feet, the paper). a loop that's switched off
// goes on playing silently, so switching it back on picks up where it is
function group(id) { return BY_ID[id].kind === 'music' ? 'music' : 'sounds'; }

const remembered = (name) => {
  try {
    const value = localStorage.getItem(`northward-${name}`);
    if (value !== null) return value === '1';
    return localStorage.getItem('northward-muted') !== '1';      // from when there was one switch for both
  } catch (err) { return true; }
};
const on = { music: remembered('music'), sounds: remembered('sounds') };

export const isOn = (which) => on[which];

// switch one (or both, which = 'all') on or off, and let anything showing it —
// the title chip, the pause menu — know
export function setOn(game, which, value) {
  (which === 'all' ? ['music', 'sounds'] : [which]).forEach((name) => {
    on[name] = value;
    try { localStorage.setItem(`northward-${name}`, value ? '1' : '0'); } catch (err) { /* private window: just not remembered */ }
  });
  looping.forEach((sound, id) => sound.setVolume(on[group(id)] ? given.get(id) ?? 0 : 0));
  game.events.emit('sound-toggled');
}

// M and the title chip: everything off — or, if anything's off, everything on
export function toggleAll(game) {
  setOn(game, 'all', !(on.music && on.sounds));
}
