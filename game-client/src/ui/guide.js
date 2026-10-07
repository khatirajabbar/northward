// The guide — everything on screen whose only job is to tell the player what
// to do next, so nobody has to guess:
//
//   - a note: a page that opens over the game with the plan for this part
//   - a task tag in the corner: the one thing to do now, ticked off when done
//   - a marker: a small arrow hanging over the thing that task needs
//   - a prompt: the key to press and what it will do
//   - a line: what the traveler is thinking (later, what they say out loud)
//
// A scene makes one in create() and feeds it; the art and the pixel font come
// from tools/ui-art.mjs.

const INK = 0x2b1b14;        // writing on paper
const PENCIL = 0x8a7a64;     // lighter writing on paper
const CREAM = 0xf7efd9;      // words over the world
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

    this.promptBox = scene.add.container(0, 0).setDepth(DEPTH + 2).setVisible(false);
    this.promptSign = '';

    this.tag = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH + 5).setVisible(false);

    scene.events.on('update', this.update, this);
    scene.events.once('shutdown', () => scene.events.off('update', this.update, this));
  }

  text(x, y, str, { size = 2, tint = CREAM, edged = true } = {}) {
    return this.scene.add.bitmapText(Math.round(x), Math.round(y), edged ? 'px-edged' : 'px', str).setScale(size).setTint(tint);
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
      const parts = [];
      let px = 0;
      keys.forEach((k) => {
        const cap = this.scene.add.image(px, 0, `ui-key-${k}`).setOrigin(0, 0.5).setScale(BIG);
        parts.push(cap);
        px += cap.displayWidth + 6;
      });
      const words = this.text(px + 6, -Math.round(4.5 * BIG), label, { size: BIG });
      parts.push(words);
      const shift = Math.round((px + 6 + words.width) / 2);
      parts.forEach((p) => { p.x -= shift; });
      this.promptBox.add(parts);
    }
    this.promptBox.setPosition(Math.round(x), Math.round(y)).setVisible(true);
  }

  hidePrompt() { this.promptBox.setVisible(false); }

  // ── tasks: an ordered list, one in hand at a time ──
  // each is { id, text, where } — where() gives the world [x, y] to mark, or null

  setTasks(tasks) {
    this.tasks = tasks;
    this.at = 0;
    this.showTag();
  }

  get task() { return this.tasks[this.at] || null; }

  is(id) { return !!this.task && this.task.id === id; }

  // tick off the task in hand (only if it is the one named) and bring on the next
  complete(id) {
    if (!this.is(id)) return false;
    const { scene } = this;
    this.at += 1;
    if (this.tagBox) {
      const tick = scene.add.image(this.tagBox.x + 5 * BIG, this.tagBox.y + 4 * BIG, 'ui-tick').setScale(BIG * 2.5).setAlpha(0);
      this.tag.add(tick);
      this.tagWords.setTint(PENCIL);
      scene.tweens.add({ targets: tick, scale: BIG, alpha: 1, duration: 220, ease: 'Back.out' });
    }
    scene.time.delayedCall(950, () => {
      scene.tweens.add({ targets: this.tag, x: -(this.tagWidth + 40), duration: 260, ease: 'Sine.in',
        onComplete: () => this.showTag() });
    });
    return true;
  }

  showTag() {
    const { scene, tag } = this;
    tag.removeAll(true);
    this.tagBox = null;
    const task = this.task;
    if (!task) { tag.setVisible(false); return; }
    const u = BIG;                                   // one art pixel of the tag, on screen
    const words = this.text(19 * u, 4 * u, task.text, { size: u, tint: INK, edged: false });
    const count = this.text(19 * u + words.width + 7 * u, 4 * u, `${this.at + 1}/${this.tasks.length}`, { size: u, tint: PENCIL, edged: false });
    const width = 19 * u + words.width + 7 * u + count.width + 7 * u;
    const paper = scene.add.nineslice(0, 0, 'ui-tag', undefined, Math.ceil(width / u), 18, 5, 5, 5, 6).setOrigin(0, 0).setScale(u);
    const box = scene.add.image(6 * u, 4 * u, 'ui-checkbox').setOrigin(0, 0).setScale(u);
    tag.add([paper, box, words, count]);
    this.tagBox = box;
    this.tagWords = words;
    this.tagWidth = width;
    tag.setPosition(-(width + 40), 22).setVisible(true);
    scene.tweens.add({ targets: tag, x: 22, duration: 320, ease: 'Sine.out' });
  }

  // ── the note: a page over the game. E (or a click) puts it away ──
  // { title, lines: [...], sign, keys: [[['left', 'right'], 'walk'], ...] }

  showNote({ title, lines, sign, keys = [] }, onClose) {
    const { scene, W, H } = this;
    this.blocking = true;
    this.hidePrompt();
    const box = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH + 20).setAlpha(0);
    const dim = scene.add.rectangle(0, 0, W, H, 0x0a0d14, 0.6).setOrigin(0, 0);
    const paper = scene.add.image(W / 2, H / 2 - 48, 'ui-note').setScale(3);
    const left = paper.x - paper.displayWidth / 2, top = paper.y - paper.displayHeight / 2;
    const on = (ax, ay) => [left + ax * 3, top + ay * 3];        // a spot on the page, in its own pixels
    const write = (ax, ay, str, tint = INK) => this.text(...on(ax, ay), str, { size: 3, tint, edged: false });
    const parts = [dim, paper, write(24, 19, title)];
    lines.forEach((str, i) => {
      parts.push(scene.add.image(...on(24, 39 + i * 11), 'ui-checkbox').setOrigin(0, 0).setScale(3));
      parts.push(write(38, 41 + i * 11, str));
    });
    if (sign) parts.push(write(0, 118, sign, PENCIL).setOrigin(1, 0).setX(on(156, 0)[0]));

    // under the page: how to play, and how to put the note away
    let ky = top + paper.displayHeight + 26;
    if (keys.length) {
      const row = scene.add.container(0, ky);
      let kx = 0;
      keys.forEach(([caps, does]) => {
        caps.forEach((k) => {
          const cap = scene.add.image(kx, 0, `ui-key-${k}`).setOrigin(0, 0.5).setScale(2);
          row.add(cap);
          kx += cap.displayWidth + 4;
        });
        const words = this.text(kx + 4, -9, does);
        row.add(words);
        kx += 4 + words.width + 34;
      });
      row.x = Math.round(W / 2 - (kx - 34) / 2);
      parts.push(row);
      ky += 50;
    }
    const cap = scene.add.image(0, 0, 'ui-key-e').setOrigin(0, 0.5).setScale(2);
    const okay = this.text(cap.displayWidth + 8, -9, 'okay');
    const go = scene.add.container(Math.round(W / 2 - (cap.displayWidth + 8 + okay.width) / 2), ky, [cap, okay]);
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
    const task = this.task;
    const spot = !this.blocking && task && task.where ? task.where() : null;
    if (spot) this.marker.setPosition(Math.round(spot[0]), Math.round(spot[1] + this.bob.y)).setVisible(true);
    else this.marker.setVisible(false);
  }
}
