// Makes the game's sounds with ElevenLabs, from the descriptions in
// src/audio/sounds.js, and writes them to src/audio/files/.
//
// It needs your ElevenLabs API key in the environment, set in your own
// terminal (it is never written anywhere, and never printed):
//
//   export ELEVENLABS_API_KEY=...       (then, from game-client/)
//   node tools/audio.mjs --list         what it would make, and roughly what it costs
//   node tools/audio.mjs                make every sound that isn't made yet
//   node tools/audio.mjs ui-tick bee    make just these (again, if they exist)
//
// (The music isn't made here: it's written in code by tools/music.mjs.)
//
// Each sound is saved as soon as it's made, so you can stop and run it again
// later and it carries on. The game plays whatever is in that folder — a
// file saved there by hand (music from somewhere else, say) counts the same,
// as long as it has the sound's name: music-title.mp3, and so on.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOUNDS } from '../src/audio/sounds.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/audio/files');
const API = 'https://api.elevenlabs.io/v1';
// rough credit costs, for --list only: sound effects through the API are 11
// credits a second (ElevenLabs' help centre); the music figure is a guess
const COST = { sfx: 11, loop: 11 };                  // credits per second

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const named = args.filter((a) => !a.startsWith('--'));
const file = (s) => path.join(OUT, `${s.id}.mp3`);

const MADE_HERE = SOUNDS.filter((s) => s.kind !== 'music');
let todo = MADE_HERE;
if (named.length) {
  const music = named.filter((id) => SOUNDS.some((s) => s.id === id && s.kind === 'music'));
  if (music.length) { console.error(`${music.join(', ')}: the music is written in code — node tools/music.mjs`); process.exit(1); }
  const unknown = named.filter((id) => !MADE_HERE.some((s) => s.id === id));
  if (unknown.length) { console.error(`no such sound: ${unknown.join(', ')}`); process.exit(1); }
  todo = MADE_HERE.filter((s) => named.includes(s.id));              // asked for by name: made even if they exist
} else {
  todo = todo.filter((s) => !fs.existsSync(file(s)));                // otherwise only what's missing
}

if (flags.has('--list')) {
  let credits = 0;
  todo.forEach((s) => {
    const c = Math.round(s.seconds * COST[s.kind]);
    credits += c;
    console.log(`${s.id.padEnd(14)} ${s.kind.padEnd(6)} ${String(s.seconds).padStart(5)}s   ~${c} credits`);
  });
  console.log(`\n${todo.length} to make, roughly ${credits} credits (a rough guess — see ElevenLabs' pricing)`);
  process.exit(0);
}

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error('set ELEVENLABS_API_KEY in this terminal first:  export ELEVENLABS_API_KEY=...');
  process.exit(1);
}
if (!todo.length) { console.log('nothing to make — every sound is already here.'); process.exit(0); }

fs.mkdirSync(OUT, { recursive: true });

async function make(s) {
  const request = { url: `${API}/sound-generation?output_format=mp3_44100_96`,
    body: { text: s.text, duration_seconds: s.seconds, prompt_influence: s.follow ?? 0.5, loop: s.kind === 'loop', model_id: 'eleven_text_to_sound_v2' } };
  const response = await fetch(request.url, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify(request.body)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`${response.status} ${detail.slice(0, 300)}`);
  }
  fs.writeFileSync(file(s), Buffer.from(await response.arrayBuffer()));
}

let made = 0;
const failed = [];
for (const [i, s] of todo.entries()) {
  process.stdout.write(`[${i + 1}/${todo.length}] ${s.id} … `);
  try {
    await make(s);
    made += 1;
    console.log('done');
  } catch (err) {
    failed.push(s.id);
    console.log(`couldn't: ${err.message}`);
  }
}
console.log(`\nmade ${made}${failed.length ? `; couldn't make ${failed.join(', ')} — run again with those names to retry` : ''}.`);
