// The guide — everything on screen whose only job is to tell the player what
// to do next, so nobody has to guess:
//
//   - a note: a page that opens over the game with the plan for this part
//   - a task tag in the corner: the one thing to do now, ticked off when done
//   - a marker: a small arrow hanging over the thing that task needs — or at
//     the edge of the screen, pointing the way, when that thing is out of sight
//   - a prompt: the key to press and what it will do
//   - a line: what the traveler is thinking (later, what they say out loud)
//   - a tip: a key and what it's for, shown for a few seconds
//
// A scene makes one in create() and feeds it; the art and the pixel font come
// from tools/ui-art.mjs.

export const INK = 0x2b1b14;        // writing on paper
export const PENCIL = 0x8a7a64;     // lighter writing on paper
export const CREAM = 0xf7efd9;      // words over the world
const DEPTH = 100;           // above every scene's own layers
const BIG = 3;               // how large the tag and the prompt are drawn — they have to be noticed

export default class Guide {
  constructor(scene) {
    this.scene = scene;
    this.W = scene.scale.width;
    this.H = scene.scale.height;
    this.tasks = [];
    this.at = 0;
    this.blocking = false;     // true while a note is open: the scene should wait

    // the traveler's line of thought — along the bottom, where subtitles go,
    // close to the traveler and clear of the task tag
    this.line = scene.add.bitmapText(this.W / 2, this.H - 24, 'px-edged', '')
      .setOrigin(0.5, 1).setScale(3).setTint(CREAM).setMaxWidth(this.W - 260).setCenterAlign()
      .setScrollFactor(0).setDepth(DEPTH + 5).setAlpha(0);

    // the marker bobs over whatever the task in hand needs
    this.marker = scene.add.image(0, 0, 'ui-marker').setOrigin(0.5, 1).setScale(3).setDepth(DEPTH).setVisible(false);
    this.bob = { y: 0 };
    scene.tweens.add({ targets: this.bob, y: -9, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.edge = scene.add.image(0, 0, 'ui-marker').setScale(4).setScrollFactor(0).setDepth(DEPTH + 4).setVisible(false);

    this.promptBox = scene.add.container(0, 0).setDepth(DEPTH + 2).setVisible(false);
    this.promptSign = '';

    this.tag = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH + 5).setVisible(false);

    scene.events.on('update', this.update, this);
    scene.events.once('shutdown', () => scene.events.off('update', this.update, this));
  }

  text(x, y, str, { size = 2, tint = CREAM, edged = true } = {}) {
    return this.scene.add.bitmapText(Math.round(x), Math.round(y), edged ? 'px-edged' : 'px', str).setScale(size).setTint(tint);
  }

  // a row of key caps followed by a few words; returns the pieces and how wide they are
  keyRow(keys, label, size) {
    const parts = [];
    let x = 0;
    keys.forEach((k) => {
      const cap = this.scene.add.image(x, 0, `ui-key-${k}`).setOrigin(0, 0.5).setScale(size);
      parts.push(cap);
      x += cap.displayWidth + 2 * size;
    });
    const words = this.text(x + (keys.length ? 2 * size : 0), -Math.round(4.5 * size), label, { size });
    parts.push(words);
    return { parts, width: words.x + words.width };
  }

  // ── the line of thought ──

  say(str, ms = 4200) {
    const { scene, line } = this;
    scene.tweens.killTweensOf(line);
    if (this.lineTimer) this.lineTimer.remove();
    line.setText(str).setAlpha(0);
    scene.tweens.add({ targets: line, alpha: 1, duration: 300 });
    this.lineTimer = scene.time.delayedCall(ms, () => scene.tweens.add({ targets: line, alpha: 0, duration: 700 }));
  }

  // ── the prompt: keys, then what they do — drawn in the world, over the traveler ──

  prompt(keys, label, x, y) {
    const sign = `${keys.join('+')}|${label}`;
    if (sign !== this.promptSign) {
      this.promptSign = sign;
      this.promptBox.removeAll(true);
      const { parts, width } = this.keyRow(keys, label, BIG);
      parts.forEach((p) => { p.x -= Math.round(width / 2); });
      this.promptBox.add(parts);
    }
    this.promptBox.setPosition(Math.round(x), Math.round(y)).setVisible(true);
  }

  hidePrompt() { this.promptBox.setVisible(false); }

  // ── a tip: top right, there for a few seconds and gone ──

  tip(keys, label, ms = 5200) {
    const { scene } = this;
    const { parts, width } = this.keyRow(keys, label, 2);
    const box = scene.add.container(this.W - 28 - width, 44, parts).setScrollFactor(0).setDepth(DEPTH + 5).setAlpha(0);
    scene.tweens.add({ targets: box, alpha: 1, duration: 300, hold: ms, yoyo: true, onComplete: () => box.destroy() });
  }

  // ── tasks: one in hand at a time, shown on the tag ──
  // each is { id, text, where } — where() gives the world [x, y] to mark, or
  // null. a scene either walks its list in order (complete), or says which
  // task is in hand as the world changes (focus). `counted` adds "2/7".

  setTasks(tasks, { counted = true } = {}) {
    this.tasks = tasks;
    this.counted = counted;
    this.at = 0;
    this.turning = false;
    this.showTag();
  }

  get task() { return this.tasks[this.at] || null; }

  is(id) { return !!this.task && this.task.id === id; }

  // tick off the task in hand (only if it is the one named) and bring on the next
  complete(id) {
    if (!this.is(id)) return false;
    this.turnTo(this.at + 1, true);
    return true;
  }

  // put a different task in hand — `ticked` if the last one was finished rather
  // than left behind. null means there's nothing to do for now
  focus(id, ticked = false) {
    const index = id === null ? this.tasks.length : this.tasks.findIndex((t) => t.id === id);
    if (index >= 0 && index !== this.at) this.turnTo(index, ticked);
  }

  turnTo(index, ticked) {
    const { scene, tag } = this;
    this.at = index;                       // the marker moves on at once; the tag follows
    if (this.turning) return;              // already changing — it'll show whatever is in hand when it lands
    if (!tag.visible) { this.showTag(); return; }
    this.turning = true;
    let wait = 0;
    if (ticked && this.tagBox) {
      const tick = scene.add.image(this.tagBox.x + 5 * BIG, this.tagBox.y + 4 * BIG, 'ui-tick').setScale(BIG * 2.5).setAlpha(0);
      tag.add(tick);
      this.tagWords.setTint(PENCIL);
      scene.tweens.add({ targets: tick, scale: BIG, alpha: 1, duration: 220, ease: 'Back.out' });
      wait = 950;
    }
    scene.time.delayedCall(wait, () => {
      scene.tweens.add({ targets: tag, x: -(this.tagWidth + 40), duration: 260, ease: 'Sine.in',
        onComplete: () => { this.turning = false; this.showTag(); } });
    });
  }

  showTag() {
    const { scene, tag } = this;
    tag.removeAll(true);
    this.tagBox = null;
    const task = this.task;
    if (!task) { tag.setVisible(false); return; }
    const u = BIG;                                   // one art pixel of the tag, on screen
    const words = this.text(19 * u, 4 * u, task.text, { size: u, tint: INK, edged: false });
    let width = 19 * u + words.width + 7 * u;
    const pieces = [words];
    if (this.counted) {
      const count = this.text(width, 4 * u, `${this.at + 1}/${this.tasks.length}`, { size: u, tint: PENCIL, edged: false });
      pieces.push(count);
      width += count.width + 7 * u;
    }
    const paper = scene.add.nineslice(0, 0, 'ui-tag', undefined, Math.ceil(width / u), 18, 5, 5, 5, 6).setOrigin(0, 0).setScale(u);
    const box = scene.add.image(6 * u, 4 * u, 'ui-checkbox').setOrigin(0, 0).setScale(u);
    tag.add([paper, box, ...pieces]);
    this.tagBox = box;
    this.tagWords = words;
    this.tagWidth = width;
    tag.setPosition(-(width + 40), 22).setVisible(true);
    scene.tweens.add({ targets: tag, x: 22, duration: 320, ease: 'Sine.out' });
  }

  // ── the note: a page over the game. E (or a click) puts it away ──
  // { title, lines: [...], sign, keys: [[['left', 'right'], 'walk'], ...] }
  // a line is a string — or, on a page that looks back over the day,
  // { text, ticked }: those get their ticks one after another, and what wasn't
  // done stays in pencil. `foot` is a line of words under the page, `okay` what
  // E is said to do, `dim` how dark the game goes behind it.

  showNote({ title, lines, sign, keys = [], foot = null, okay = 'okay', dim: dark = 0.6 }, onClose) {
    const { scene, W, H } = this;
    this.blocking = true;
    this.hidePrompt();
    const box = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH + 20).setAlpha(0);
    const dim = scene.add.rectangle(0, 0, W, H, 0x0a0d14, dark).setOrigin(0, 0);
    // more than seven lines go on the longer page
    const tall = lines.length > 7;
    const paper = scene.add.image(W / 2, H / 2 - (tall ? 44 : 48), tall ? 'ui-note-tall' : 'ui-note').setScale(3);
    const left = paper.x - paper.displayWidth / 2, top = paper.y - paper.displayHeight / 2;
    const on = (ax, ay) => [left + ax * 3, top + ay * 3];        // a spot on the page, in its own pixels
    const write = (ax, ay, str, tint = INK) => this.text(...on(ax, ay), str, { size: 3, tint, edged: false });
    const parts = [dim, paper, write(24, 19, title)];
    lines.forEach((line, i) => {
      const { text: str, ticked } = typeof line === 'string' ? { text: line } : line;
      parts.push(scene.add.image(...on(24, 39 + i * 11), 'ui-checkbox').setOrigin(0, 0).setScale(3));
      parts.push(write(38, 41 + i * 11, str, ticked === false ? PENCIL : INK));
      if (ticked) {
        const [tx, ty] = on(29, 43 + i * 11);
        const tick = scene.add.image(tx, ty, 'ui-tick').setScale(7.5).setAlpha(0);
        scene.tweens.add({ targets: tick, scale: 3, alpha: 1, duration: 220, delay: 700 + i * 300, ease: 'Back.out' });
        parts.push(tick);
      }
    });
    if (sign) parts.push(write(0, tall ? 140 : 118, sign, PENCIL).setOrigin(1, 0).setX(on(156, 0)[0]));

    // under the page: a line of words, how to play, and how to put the note away
    let ky = top + paper.displayHeight + 26;
    if (foot) {
      const words = this.text(0, ky - 9, foot);
      parts.push(words.setX(Math.round(W / 2 - words.width / 2)));
      ky += 48;
    }
    if (keys.length) {
      const row = scene.add.container(0, ky);
      let kx = 0;
      keys.forEach(([caps, does]) => {
        const { parts: bits, width } = this.keyRow(caps, does, 2);
        bits.forEach((b) => { b.x += kx; });
        row.add(bits);
        kx += width + 34;
      });
      row.x = Math.round(W / 2 - (kx - 34) / 2);
      parts.push(row);
      ky += 50;
    }
    const cap = scene.add.image(0, 0, 'ui-key-e').setOrigin(0, 0.5).setScale(2);
    const does = this.text(cap.displayWidth + 8, -9, okay);
    const go = scene.add.container(Math.round(W / 2 - (cap.displayWidth + 8 + does.width) / 2), ky, [cap, does]);
    scene.tweens.add({ targets: go, alpha: 0.45, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    parts.push(go);
    box.add(parts);

    paper.y += 24;
    scene.tweens.add({ targets: box, alpha: 1, duration: 320 });
    scene.tweens.add({ targets: paper, y: paper.y - 24, duration: 420, ease: 'Back.out' });

    let closing = false;
    const close = () => {
      if (closing) return;
      closing = true;
      scene.input.keyboard.off('keydown-E', close);
      scene.input.keyboard.off('keydown-ENTER', close);
      scene.input.keyboard.off('keydown-SPACE', close);
      scene.input.off('pointerdown', close);
      scene.tweens.add({ targets: box, alpha: 0, duration: 240,
        onComplete: () => {
          box.destroy();
          this.blocking = false;
          if (onClose) onClose();
        } });
    };
    // a beat before it can be dismissed, so a key still held from before doesn't skip it
    scene.time.delayedCall(450, () => {
      scene.input.keyboard.on('keydown-E', close);
      scene.input.keyboard.on('keydown-ENTER', close);
      scene.input.keyboard.on('keydown-SPACE', close);
      scene.input.on('pointerdown', close);
    });
  }

  update() {
    const { scene, marker, edge } = this;
    const task = this.task;
    const spot = !this.blocking && task && task.where ? task.where() : null;
    marker.setVisible(false);
    edge.setVisible(false);
    if (!spot) return;
    const view = scene.cameras.main.worldView;
    if (spot[0] < view.x + 30 || spot[0] > view.right - 30) {
      // out of sight: point the way from the edge of the screen
      const leftward = spot[0] < view.x + 30;
      edge.setPosition(leftward ? 46 - this.bob.y : this.W - 46 + this.bob.y, this.H - 190)
        .setAngle(leftward ? 90 : -90).setVisible(true);
    } else {
      marker.setPosition(Math.round(spot[0]), Math.round(spot[1] + this.bob.y)).setVisible(true);
    }
  }
}
