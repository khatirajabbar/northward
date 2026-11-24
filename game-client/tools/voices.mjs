// Records the travelers' voices with ElevenLabs: every line the game can say —
// each thought, and each line of the talk at the end — in both travelers'
// voices (src/audio/voices.js names them), into src/audio/voices/.
//
// It finds the lines itself, by reading the game: whatever is handed to
// showThought(...) or guide.say(...), and the { who, text } lines of a talk.
// A line that's changed gets recorded afresh; the old recording is left until
// you tidy it away.
//
// It needs your ElevenLabs API key in the environment, set in your own
// terminal (it's never written anywhere, and never printed):
//
//   export ELEVENLABS_API_KEY=...              (then, from game-client/)
//   node tools/voices.mjs --design khatira     make a few versions of her voice to listen to (or oliver)
//   node tools/voices.mjs --keep khatira 2     keep version 2: it's saved to your account, and its id goes in the game
//   node tools/voices.mjs --voices             your ElevenLabs voices, with their ids
//   node tools/voices.mjs --lines              every line the game can say (no key needed)
//   node tools/voices.mjs --list               what isn't recorded yet, and roughly what it costs
//   node tools/voices.mjs                      record everything that isn't recorded yet
//   node tools/voices.mjs oliver               …only Oliver's (or khatira)
//   node tools/voices.mjs --redo "a moose"     record again the lines with these words in them
//   node tools/voices.mjs --tidy               delete recordings of lines the game no longer has
//
// Each line is saved as soon as it's recorded, so you can stop and carry on later.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lineKey, spokenText } from '../src/audio/speech.js';
import { VOICES, MODEL, DESCRIPTIONS, SAMPLE } from '../src/audio/voices.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(SRC, 'audio/voices');
const API = 'https://api.elevenlabs.io/v1';
const CREDITS_PER_CHARACTER = 1;          // ElevenLabs v3: one credit a character

// ── finding the lines ──

function sourceFiles(dir, found = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) { if (!['audio', 'dev'].includes(name)) sourceFiles(p, found); }
    else if (p.endsWith('.js')) found.push(p);
  }
  return found;
}

// the string literals in a piece of code: [{ text, dynamic }]
function literals(code) {
  const out = [];
  for (const m of code.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    const raw = m[2];
    if (m[1] === '`' && raw.includes('${')) { out.push({ text: raw, dynamic: true }); continue; }
    out.push({ text: raw.replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, ' '), dynamic: false });
  }
  return out;
}

// the first argument of the call whose "(" is at `open`
function firstArgument(src, open) {
  let depth = 0, quote = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '\'' || c === '"' || c === '`') { quote = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) return src.slice(open + 1, i); }
    else if (c === ',' && depth === 1) return src.slice(open + 1, i);
  }
  return '';
}

// all the arguments of the call whose "(" is at `open`
function argumentsOf(src, open) {
  const out = [];
  let depth = 0, quote = null, start = open + 1;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '\'' || c === '"' || c === '`') { quote = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) { out.push(src.slice(start, i)); return out; } }
    else if (c === ',' && depth === 1) { out.push(src.slice(start, i)); start = i + 1; }
  }
  return out;
}

// what's handed in as `name`, when it's a method's parameter: setDown(thought) {…}
// → the words at that place in every setDown(…) in the same file
function passedIn(src, name) {
  const found = [];
  for (const d of src.matchAll(new RegExp(`^\\s*([A-Za-z_$][\\w$]*)\\(([^)]*)\\)\\s*\\{`, 'gm'))) {
    const at = d[2].split(',').map((p) => p.trim().split('=')[0].trim()).indexOf(name);
    if (at < 0) continue;
    for (const c of src.matchAll(new RegExp(`(?<![\\w$])${d[1]}\\(`, 'g'))) {
      if (c.index > d.index - 1 && c.index < d.index + d[0].length) continue;          // the definition itself
      const a = argumentsOf(src, c.index + c[0].length - 1)[at];
      if (a) found.push(a);
    }
  }
  return found.join(',');
}

// what `name` was set to, in the same file
function definition(src, name) {
  const m = src.match(new RegExp(`(?:const|let|var)\\s+${name}\\s*=([\\s\\S]*?);\\n`));
  return m ? m[1] : '';
}

export function collectLines() {
  const lines = new Map(), dynamic = [];
  const add = (text, where) => {
    if (!/[a-z]/i.test(text) || text.length < 2) return;
    const key = lineKey(text);
    if (!lines.has(key)) lines.set(key, { key, text, spoken: spokenText(text), where });
  };
  for (const file of sourceFiles(SRC)) {
    const src = fs.readFileSync(file, 'utf8');
    const where = path.relative(SRC, file);
    // thoughts: showThought(…) and guide.say(…) — not where they're defined
    for (const m of src.matchAll(/(?:showThought|guide\.say)\(/g)) {
      const before = src.slice(Math.max(0, m.index - 30), m.index);
      if (/^\s*$/.test(before.split('\n').pop()) && /\)\s*\{/.test(src.slice(m.index, m.index + 80).split('\n')[0])) continue;   // a definition
      let arg = firstArgument(src, m.index + m[0].length - 1).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(arg)) arg = definition(src, arg) || passedIn(src, arg);   // said from a variable: what it was set to, or what was handed in
      literals(arg).forEach((l) => (l.dynamic ? dynamic.push(`${where}: ${l.text}`) : add(l.text, where)));
    }
    // a puzzle's own small helper, say(id, text) → showThought(text): the words are its second argument
    if (/const say = \(\w+, \w+/.test(src)) {
      for (const m of src.matchAll(/(?<![.\w])say\(/g)) {
        const all = argumentsOf(src, m.index + m[0].length - 1).slice(1).join(',');
        literals(all).forEach((l) => (l.dynamic ? dynamic.push(`${where}: ${l.text}`) : add(l.text, where)));
      }
    }
    // the bird's stops: { seen: '…', gone: '…' } (src/world/guideBird.js)
    for (const m of src.matchAll(/\b(?:seen|gone):\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
      add(m[2].replace(/\\(['"`\\])/g, '$1'), where);
    }
    // a talk: { who: '…', text: '…' }
    for (const m of src.matchAll(/who:\s*['"][a-z]+['"]\s*,\s*text:\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
      add(m[2].replace(/\\(['"`\\])/g, '$1'), where);
    }
  }
  return { lines: [...lines.values()], dynamic };
}

// ── the commands ──

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const value = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const travelers = Object.keys(VOICES);
const short = (id) => id.replace(/^lpc-/, '');
const only = travelers.filter((t) => args.includes(short(t)));
const who = only.length ? only : travelers;
const file = (traveler, line) => path.join(OUT, traveler, `${line.key}.mp3`);

const { lines, dynamic } = collectLines();

if (flag('--lines')) {
  lines.forEach((l) => console.log(`${l.key}  ${l.spoken}${l.spoken !== l.text ? '   (written: ' + l.text + ')' : ''}`));
  const chars = lines.reduce((n, l) => n + l.spoken.length, 0);
  console.log(`\n${lines.length} lines, ${chars} characters — about ${chars * CREDITS_PER_CHARACTER * travelers.length} credits for both voices`);
  if (dynamic.length) console.log(`\nput together as the game runs, so they can't be recorded ahead:\n  ${dynamic.join('\n  ')}`);
  process.exit(0);
}

if (flag('--tidy')) {
  const keys = new Set(lines.map((l) => l.key));
  let gone = 0;
  for (const traveler of travelers) {
    const dir = path.join(OUT, traveler);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith('.mp3') && !keys.has(name.slice(0, -4))) { fs.unlinkSync(path.join(dir, name)); gone++; }
    }
  }
  console.log(`deleted ${gone} recording${gone === 1 ? '' : 's'} of lines the game no longer has.`);
  process.exit(0);
}

const redo = value('--redo');
const jobs = [];
for (const traveler of who) {
  for (const line of lines) {
    if (redo ? line.text.includes(redo) : !fs.existsSync(file(traveler, line))) jobs.push({ traveler, line });
  }
}

if (flag('--list')) {
  const chars = jobs.reduce((n, j) => n + j.line.spoken.length, 0);
  who.forEach((t) => console.log(`${short(t).padEnd(8)} ${jobs.filter((j) => j.traveler === t).length} lines to record`));
  console.log(`\nabout ${chars * CREDITS_PER_CHARACTER} credits (${chars} characters, ${MODEL})`);
  process.exit(0);
}

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error('set ELEVENLABS_API_KEY in this terminal first:  export ELEVENLABS_API_KEY=...');
  process.exit(1);
}

if (flag('--voices')) {
  const response = await fetch(`${API}/voices`, { headers: { 'xi-api-key': key } });
  if (!response.ok) { console.error(`couldn't list your voices: ${response.status} ${(await response.text()).slice(0, 300)}`); process.exit(1); }
  const { voices } = await response.json();
  voices.forEach((v) => console.log(`${v.voice_id}   ${v.name}${v.category ? `   (${v.category})` : ''}`));
  console.log('\nput the two you want in src/audio/voices.js — or send them to Claude.');
  process.exit(0);
}

// ── choosing a voice: a few versions from its description, to listen to; then keep one ──
const PREVIEWS = path.join(ROOT, 'voice-previews');
const travelerNamed = (name) => travelers.find((t) => short(t) === name);

if (flag('--design')) {
  const traveler = travelerNamed(value('--design'));
  if (!traveler) { console.error(`which voice? --design ${travelers.map(short).join(' or --design ')}`); process.exit(1); }
  console.log(`designing ${short(traveler)}'s voice — a few versions, this takes a little while …`);
  const response = await fetch(`${API}/text-to-voice/design?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ voice_description: DESCRIPTIONS[traveler], text: SAMPLE, model_id: 'eleven_ttv_v3' })
  });
  if (!response.ok) { console.error(`couldn't design it: ${response.status} ${(await response.text()).slice(0, 300)}`); process.exit(1); }
  const { previews } = await response.json();
  fs.mkdirSync(PREVIEWS, { recursive: true });
  const ids = previews.map((p, i) => {
    const out = path.join(PREVIEWS, `${short(traveler)}-${i + 1}.mp3`);
    fs.writeFileSync(out, Buffer.from(p.audio_base_64, 'base64'));
    return p.generated_voice_id;
  });
  fs.writeFileSync(path.join(PREVIEWS, `${short(traveler)}.json`), JSON.stringify(ids));
  console.log(`\n${ids.length} versions, in game-client/voice-previews/. listen to them:\n`);
  ids.forEach((_, i) => console.log(`  afplay voice-previews/${short(traveler)}-${i + 1}.mp3`));
  console.log(`\nthen keep the one you like:   node tools/voices.mjs --keep ${short(traveler)} 1   (or 2, 3 …)`);
  console.log(`or none of them? run --design ${short(traveler)} again for new ones.`);
  process.exit(0);
}

if (flag('--keep')) {
  const traveler = travelerNamed(value('--keep'));
  const n = Number(args[args.indexOf('--keep') + 2]);
  const saved = traveler && path.join(PREVIEWS, `${short(traveler)}.json`);
  if (!traveler || !n || !fs.existsSync(saved)) { console.error('keep which? e.g. --keep khatira 2 (after --design khatira)'); process.exit(1); }
  const generated = JSON.parse(fs.readFileSync(saved, 'utf8'))[n - 1];
  if (!generated) { console.error(`there's no version ${n} — look in voice-previews/`); process.exit(1); }
  const response = await fetch(`${API}/text-to-voice`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ voice_name: `northward ${short(traveler)}`, voice_description: DESCRIPTIONS[traveler], generated_voice_id: generated })
  });
  if (!response.ok) { console.error(`couldn't keep it: ${response.status} ${(await response.text()).slice(0, 300)}`); process.exit(1); }
  const { voice_id: id } = await response.json();
  // and into the game
  const config = path.join(SRC, 'audio/voices.js');
  const text = fs.readFileSync(config, 'utf8').replace(new RegExp(`('${traveler}':\\s*)'[^']*'`), `$1'${id}'`);
  fs.writeFileSync(config, text);
  console.log(`kept: "northward ${short(traveler)}" is saved in your ElevenLabs voices (${id}), and the game uses it now.`);
  process.exit(0);
}

const missing = who.filter((t) => !VOICES[t]);
if (missing.length) {
  console.error(`no voice id yet for ${missing.map(short).join(' and ')} — put it in src/audio/voices.js (node tools/voices.mjs --voices lists yours)`);
  process.exit(1);
}
if (!jobs.length) { console.log('nothing to record — every line is here.'); process.exit(0); }

async function record({ traveler, line }) {
  const response = await fetch(`${API}/text-to-speech/${VOICES[traveler]}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: line.spoken, model_id: MODEL })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`${response.status} ${detail.slice(0, 300)}`);
  }
  fs.mkdirSync(path.join(OUT, traveler), { recursive: true });
  fs.writeFileSync(file(traveler, line), Buffer.from(await response.arrayBuffer()));
}

let made = 0;
const failed = [];
for (const [i, job] of jobs.entries()) {
  process.stdout.write(`[${i + 1}/${jobs.length}] ${short(job.traveler)}: ${job.line.spoken.slice(0, 60)} … `);
  try {
    await record(job);
    made += 1;
    console.log('done');
  } catch (err) {
    failed.push(job);
    console.log(`couldn't: ${err.message}`);
    if (/^40[12]/.test(err.message)) { console.error('\nthe key or the voice id isn\'t right — stopping here.'); break; }
  }
}
console.log(`\nrecorded ${made}${failed.length ? `; couldn't record ${failed.length} — run it again to try those` : ''}.`);
