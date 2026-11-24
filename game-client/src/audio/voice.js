// The travelers' voices, in the game. Every thought on the line at the foot of
// the screen (guide.say), and every line of the talk at the end, is said aloud
// by whoever is thinking or saying it — if it's been recorded (tools/voices.mjs).
// A line with no recording yet is simply read, as before.
//
// One voice at a time. A new thought waits for the last to be finished (ui/guide.js),
// and carries on into the next scene; a line in the talk at the end takes over
// straight away (you asked for it, with E). They follow the
// "sounds" switch (the pause menu, the title chip, M).
//
// The recordings are only fetched when a line is first said, so they cost
// nothing to load up front.

import { lineKey } from './speech.js';
import { isOn } from './sound.js';

const FILES = import.meta.glob('./voices/*/*.mp3', { eager: true, query: '?url', import: 'default' });
// "lpc-khatira/1a2b3c4d" → its url
const URL_OF = Object.fromEntries(Object.entries(FILES).map(([file, url]) => [file.slice('./voices/'.length, -'.mp3'.length), url]));

const LOUD = 0.95;
let current = null;

// say `text` in `who`'s voice. `onLength(ms)` hears how long it turned out to
// be, once that's known (so the words can stay up for as long as they're said)
export function speak(who, text, onLength) {
  stopSpeaking();
  const url = URL_OF[`${who}/${lineKey(text)}`];
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

export function stopSpeaking() {
  if (!current) return;
  current.pause();
  current = null;
}

// how many lines each traveler has recorded (for the tool and for checking)
export const recorded = () => Object.keys(URL_OF);
