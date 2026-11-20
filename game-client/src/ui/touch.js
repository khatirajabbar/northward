// Phone controls.
//
// On a phone there's no keyboard, so a few key caps are laid over the screen —
// the same cream caps the game shows in its hints — and each one presses the
// real key behind the scenes. Every scene goes on reading the keyboard exactly
// as before; it can't tell the difference.
//
//   left thumb   one pad for walking: hold its left half to go left, its right
//                half to go right (slide across it without lifting)
//   right thumb  jump, and E
//   when asked   shift (slowly), X (run) and the bag come up beside them only
//                while the game's hint is asking for them, and a little after
//   top corner   pause
//
// The menus need none of this: their planks and notes take a tap already, and
// the key hints under a board (board.js) press their key when tapped.
//
// Held upright, the game would be a thin strip, so a phone held that way gets
// a quiet "turn your phone sideways" instead, with the game paused behind it.

// key → [keyCode, key] as a browser would send them (Phaser reads the keyCode)
const CODES = {
  left: [37, 'ArrowLeft'], right: [39, 'ArrowRight'], up: [38, 'ArrowUp'], down: [40, 'ArrowDown'],
  e: [69, 'e'], shift: [16, 'Shift'], x: [88, 'x'], i: [73, 'i'], esc: [27, 'Escape'], enter: [13, 'Enter']
};

// a phone or tablet (a finger, not a mouse) — or ?touch in the address, to try it on a computer
export const touchy = typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || new URLSearchParams(window.location.search).has('touch'));

function send(type, name) {
  const [keyCode, key] = CODES[name];
  const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'keyCode', { get: () => keyCode });
  Object.defineProperty(event, 'which', { get: () => keyCode });
  window.dispatchEvent(event);
}

// hold a key down / let it go
export const hold = (name) => send('keydown', name);
export const release = (name) => send('keyup', name);

// one quick press, as a tap (long enough for the game to see it on its next frame)
export function tapKey(name) {
  if (!CODES[name]) return;
  hold(name);
  setTimeout(() => release(name), 90);
}

// keep a finger's moves coming to this button even if it slides off (never mind if it can't)
const capture = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ } };

// can this browser put a page full screen? an iPhone can't (only videos): there,
// adding the game to the home screen is the way to have all of the screen
export const fullscreenWorks = typeof document !== 'undefined' && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
// opened from a phone's home screen: it has the whole screen already
export const standalone = typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

const PLAYING = ['MorningScene', 'ForestScene', 'EndingScene'];
const ASKED_FOR = 2500;          // how long a button the game asked for stays up after it stops asking (ms)

export function setupTouch(game) {
  if (!touchy) return;
  document.body.classList.add('touchy');

  const pad = document.createElement('div');
  pad.id = 'touch-pad';
  document.body.appendChild(pad);

  const cap = (name, label, extra = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pad-key pad-key--${name} ${extra}`.trim();
    b.setAttribute('aria-label', label);
    const img = document.createElement('img');
    img.src = `/assets/ui/key-${name}.png`;
    img.alt = '';
    img.draggable = false;
    b.appendChild(img);
    pad.appendChild(b);
    return b;
  };

  // a cap you hold: the key is down for as long as your finger is on it
  const held = new Set();
  const holdable = (button, name) => {
    const down = (e) => {
      e.preventDefault();
      capture(button, e);
      if (!held.has(name)) { held.add(name); hold(name); }
      button.classList.add('pressed');
    };
    const up = () => {
      if (held.has(name)) { held.delete(name); release(name); }
      button.classList.remove('pressed');
    };
    button.addEventListener('pointerdown', down);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => button.addEventListener(t, up));
    button.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  // the walking pad: which half your thumb is on decides the way
  const walk = document.createElement('div');
  walk.className = 'pad-walk';
  walk.setAttribute('aria-label', 'walk');
  pad.appendChild(walk);
  const halves = { left: document.createElement('img'), right: document.createElement('img') };
  Object.entries(halves).forEach(([name, img]) => { img.src = `/assets/ui/key-${name}.png`; img.alt = ''; img.draggable = false; img.className = `pad-walk__${name}`; walk.appendChild(img); });
  let way = null, walkPointer = null;
  const goWay = (next) => {
    if (next === way) return;
    if (way) { release(way); halves[way].classList.remove('pressed'); }
    way = next;
    if (way) { hold(way); halves[way].classList.add('pressed'); }
  };
  const wayAt = (e) => {
    const box = walk.getBoundingClientRect();
    return e.clientX < box.left + box.width / 2 ? 'left' : 'right';
  };
  walk.addEventListener('pointerdown', (e) => { e.preventDefault(); walkPointer = e.pointerId; capture(walk, e); goWay(wayAt(e)); });
  walk.addEventListener('pointermove', (e) => { if (e.pointerId === walkPointer) goWay(wayAt(e)); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => walk.addEventListener(t, (e) => { if (e.pointerId === walkPointer) { walkPointer = null; goWay(null); } }));
  walk.addEventListener('contextmenu', (e) => e.preventDefault());

  holdable(cap('up', 'jump'), 'up');
  holdable(cap('e', 'do the thing in front of you'), 'e');
  // the ones that come when they're asked for
  const asked = {
    shift: cap('shift', 'go slowly', 'pad-key--asked'),
    x: cap('x', 'run', 'pad-key--asked'),
    i: cap('i', 'open your bag', 'pad-key--asked pad-key--top')
  };
  holdable(asked.shift, 'shift');
  holdable(asked.x, 'x');
  holdable(asked.i, 'i');
  holdable(cap('esc', 'pause', 'pad-key--top'), 'esc');

  // the guide says which keys a hint is showing (guide.js)
  const wanted = {};
  game.events.on('asking', (keys, ms = ASKED_FOR) => {
    const now = performance.now();
    keys.forEach((k) => { if (asked[k]) wanted[k] = Math.max(wanted[k] || 0, now + ms); });
  });

  // on screen only while you're out walking — not in the menus, and not over a note
  const tick = () => {
    const now = performance.now();
    const scenes = game.scene.getScenes(true);
    const top = scenes.find((s) => PLAYING.includes(s.scene.key));
    const paused = scenes.some((s) => s.scene.key === 'PauseScene');
    const on = !!top && !paused && !(top.guide && top.guide.blocking);
    pad.classList.toggle('pad--on', on);
    if (!on) { goWay(null); held.forEach((k) => release(k)); held.clear(); pad.querySelectorAll('.pressed').forEach((b) => b.classList.remove('pressed')); }
    Object.entries(asked).forEach(([k, b]) => b.classList.toggle('pad-key--shown', on && ((wanted[k] || 0) > now || held.has(k))));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // held upright: ask for it sideways, and stop the game till it is
  const turn = document.createElement('div');
  turn.id = 'turn-phone';
  turn.innerHTML = '<img src="/assets/ui/turn-phone.png" alt="" /><p>turn your phone sideways</p>';
  document.body.appendChild(turn);
  const upright = window.matchMedia('(orientation: portrait)');
  const fit = () => {
    turn.classList.toggle('shown', upright.matches);
    if (upright.matches) game.loop.sleep();
    else {
      game.loop.wake();
      // it was asleep while the screen turned: fit it to the screen as it is now
      requestAnimationFrame(() => game.scale.refresh());
    }
  };
  upright.addEventListener('change', fit);
  // a phone browser's own bars grow and shrink as you tap and turn: fit the game to what's left each time
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => requestAnimationFrame(() => game.scale.refresh()));
  if (game.isBooted) fit(); else game.events.once('ready', fit);
}
