// The travelers' voices, in the game. Every thought on the line at the foot of
// the screen (guide.say), and every line of the talk at the end, is said aloud
// by whoever is thinking or saying it — if it's been recorded (tools/voices.mjs).
// A line with no recording yet is simply read, as before.
//
// One voice at a time. A new thought waits a moment for the last to finish,
// then takes over, the last one fading out (ui/guide.js); a voice carries on
// into the next scene. A line in the talk at the end takes over straight away
// (you asked for it, with E). They follow the "sounds" switch (the pause
// menu, the title chip, M).
//
// Nothing is loaded up front. Once you've chosen who's walking, their voice
// is fetched quietly in the background (warmVoice), so a line starts the
// moment it's thought, even on a slow connection.

import { lineKey } from './speech.js';
import { isOn } from './sound.js';

const FILES = import.meta.glob('./voices/*/*.mp3', { eager: true, query: '?url', import: 'default' });
// "lpc-khatira/1a2b3c4d" → its url
const URL_OF = Object.fromEntries(Object.entries(FILES).map(([file, url]) => [file.slice('./voices/'.length, -'.mp3'.length), url]));

const LOUD = 0.95;
const FADE_MS = 160;            // a voice that's taken over from doesn't stop dead
let current = null;
const ready = new Map();        // "lpc-khatira/1a2b3c4d" → the recording, already fetched (a blob: url)
const warming = new Set();      // travelers whose voice is being fetched

// fetch all of one traveler's lines, one at a time, after the game's own
// loading is done. Skipped where the browser asks to save data
export function warmVoice(who) {
  if (warming.has(who)) return;
  warming.add(who);
  if (navigator.connection && navigator.connection.saveData) return;
  const keys = Object.keys(URL_OF).filter((k) => k.startsWith(`${who}/`));
  const next = async () => {
    const key = keys.shift();
    if (!key) return;
    try {
      const response = await fetch(URL_OF[key]);
      if (response.ok) ready.set(key, URL.createObjectURL(await response.blob()));
    } catch { /* offline for a moment: that line is fetched when it's said, as before */ }
    setTimeout(next, 30);
  };
  setTimeout(next, 2500);
}

// say `text` in `who`'s voice. `onLength(ms)` hears how long it turned out to
// be, once that's known (so the words can stay up for as long as they're said)
export function speak(who, text, onLength) {
  stopSpeaking({ fade: true });
  const key = `${who}/${lineKey(text)}`;
  const url = ready.get(key) || URL_OF[key];
  if (!url) { unrecorded(who, text); return; }
  if (!isOn('sounds')) return;
  const audio = new Audio(url);
  audio.volume = LOUD;
  if (onLength) audio.addEventListener('loadedmetadata', () => { if (isFinite(audio.duration)) onLength(audio.duration * 1000); }, { once: true });
  audio.play().catch(() => { /* not allowed to play yet (no tap or key so far): just read */ });
  current = audio;
}

// how much longer the voice has to go on the line it's saying (0 when it's quiet,
// or when it couldn't play). Not loaded far enough to know yet: a guess.
export function stillSaying() {
  if (!current || current.paused || current.ended) return 0;
  const left = (current.duration - current.currentTime) * 1000;
  return isFinite(left) ? Math.max(0, left) : 1500;
}

// in development: a line said with no recording for it (tools/voices.mjs missed it)
function unrecorded(who, text) {
  if (import.meta.env.DEV) console.warn(`[voice] no recording for ${who}: "${text}"`);
}

// stop the voice: faded out over a moment (a new line taking over), or at once
export function stopSpeaking({ fade = false } = {}) {
  if (!current) return;
  const audio = current;
  current = null;
  if (!fade || audio.paused) { audio.pause(); return; }
  const from = audio.volume, start = performance.now();
  const step = () => {
    const t = (performance.now() - start) / FADE_MS;
    if (t >= 1) { audio.pause(); return; }
    audio.volume = from * (1 - t);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// how many lines each traveler has recorded (for the tool and for checking)
export const recorded = () => Object.keys(URL_OF);
