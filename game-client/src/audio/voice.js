// The travelers' voices, in the game. Every thought on the line at the foot of
// the screen (guide.say), and every line of the talk at the end, is said aloud
// by whoever is thinking or saying it — if it's been recorded (tools/voices.mjs).
// A line with no recording yet is simply read, as before.
//
// One voice at a time: a new line takes over from the last. They follow the
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
  if (!url || !isOn('sounds')) return;
  const audio = new Audio(url);
  audio.volume = LOUD;
  if (onLength) audio.addEventListener('loadedmetadata', () => { if (isFinite(audio.duration)) onLength(audio.duration * 1000); }, { once: true });
  audio.play().catch(() => { /* not allowed to play yet (no tap or key so far): just read */ });
  current = audio;
}

export function stopSpeaking() {
  if (!current) return;
  current.pause();
  current = null;
}

// how many lines each traveler has recorded (for the tool and for checking)
export const recorded = () => Object.keys(URL_OF);
