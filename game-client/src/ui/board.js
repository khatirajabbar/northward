import Phaser from 'phaser';
import { CREAM } from './guide.js';

// A wooden board on two ropes, let down from the top of the screen — the
// game's menus are written on these, the same board the sign-in form is on
// (index.html / style.css draw that one; tools/ui-art.mjs draws the wood).
//
// Its art is six planks: the top one takes a heading, and a menu puts one
// choice on each plank below it.
const P = 3;                                             // the board's art is shown at 3x
export const BOARD = { w: 156, plank: 22, planks: 6 };   // the wood, in its own pixels
export const TAN = 0xf1d9a8;                             // quieter paint than cream
export const GOLD = 0xe8bb5c;                            // what's chosen
const CARVED = 0x4a2f1e;                                 // the shade under painted letters
const HOME = { x: 762, y: 126 };                         // where the sign-in board hangs on the title screen

export default class Board {
  constructor(scene, { x = HOME.x, y = HOME.y, depth = 60 } = {}) {
    this.scene = scene;
    this.restY = y;
    this.box = scene.add.container(x, y).setDepth(depth).setScrollFactor(0);
    // the ropes, up out of sight, and the wood (which starts 1 across and 6 down in its picture)
    [23, 130].forEach((rx) => {
      this.box.add(scene.add.tileSprite(rx * P, 3 * P, 5 * P, 960, 'ui-rope').setOrigin(0, 1).setTileScale(P, P));
    });
    this.box.add(scene.add.image(0, 0, 'ui-sign').setOrigin(0, 0).setScale(P));
    this.rows = [];
    this.chosen = -1;
  }

  // a spot on the wood, given in its own pixels
  at(cx, cy) { return [(1 + cx) * P, (6 + cy) * P]; }

  add(thing) { this.box.add(thing); return thing; }

  // painted words. `align` says which end of them sits at cx
  write(cx, cy, str, { tint = CREAM, align = 'left' } = {}) {
    const [x, y] = this.at(cx, cy);
    const words = this.scene.add.bitmapText(x, y, 'px', str).setScale(P).setTint(tint);
    words.setDropShadow(0, 1, CARVED, 1);
    if (align === 'center') words.setX(Math.round(x - words.width / 2));
    if (align === 'right') words.setX(Math.round(x - words.width));
    return this.add(words);
  }

  heading(str) { return this.write(BOARD.w / 2, 6, str, { align: 'center' }); }

  // a list to choose from, one to a plank: each is { label, short, note } — the
  // note is written at the right-hand end, and `short` is used if the label
  // won't fit beside it. onPick(item, index) is called when one is taken
  menu(items, onPick) {
    const { scene } = this;
    this.items = items;
    this.onPick = onPick;
    this.rows = items.map((item, i) => {
      const cy = BOARD.plank * (i + 1);
      const [x, y] = this.at(2, cy + 1);
      const w = (BOARD.w - 4) * P, h = (BOARD.plank - 3) * P;
      const lit = this.add(scene.add.rectangle(x, y, w, h, 0xfff3cf, 0.16).setOrigin(0, 0).setVisible(false));
      const arrow = this.write(7, cy + 6, '▸', { tint: GOLD }).setVisible(false);
      const note = item.note ? this.write(BOARD.w - 9, cy + 6, item.note, { tint: TAN, align: 'right' }) : null;
      const label = this.write(16, cy + 6, item.label, { tint: TAN });
      const room = (BOARD.w - 25) * P - (note ? note.width + 6 * P : 0);
      if (label.width > room && item.short) label.setText(item.short);
      const zone = this.add(scene.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true }));
      zone.on('pointerover', () => this.choose(i));
      zone.on('pointerdown', () => { this.choose(i); this.pick(); });
      return { lit, arrow, label };
    });
    this.choose(0);
  }

  choose(index) {
    if (this.closed || !this.rows[index]) return;
    this.chosen = index;
    this.rows.forEach((row, i) => {
      row.lit.setVisible(i === index);
      row.arrow.setVisible(i === index);
      row.label.setTint(i === index ? CREAM : TAN);
    });
    if (this.onChoose) this.onChoose(this.items[index], index);
  }

  move(dir) {
    if (this.rows.length) this.choose(Phaser.Math.Clamp(this.chosen + dir, 0, this.rows.length - 1));
  }

  pick() {
    if (this.closed || !this.rows[this.chosen]) return;
    this.onPick(this.items[this.chosen], this.chosen);
  }

  // under the board: which keys do what — [[['up', 'down'], 'choose'], [['e'], 'start']]
  keys(hints) {
    const { scene } = this;
    const row = scene.add.container(0, 0);
    let x = 0;
    hints.forEach(([caps, does]) => {
      caps.forEach((k) => {
        const cap = scene.add.image(x, 0, `ui-key-${k}`).setOrigin(0, 0.5).setScale(2);
        row.add(cap);
        x += cap.displayWidth + 4;
      });
      const words = scene.add.bitmapText(x + 4, -9, 'px-edged', does).setScale(2).setTint(CREAM);
      row.add(words);
      x = words.x + words.width + 26;
    });
    const [mid, under] = this.at(BOARD.w / 2, BOARD.plank * BOARD.planks);
    row.setPosition(Math.round(mid - (x - 26) / 2), under + 34);
    return this.add(row);
  }

  // let it down on its ropes; it settles
  drop() {
    this.box.y = this.restY - 760;
    this.scene.tweens.add({ targets: this.box, y: this.restY, duration: 620, ease: 'Back.out', easeParams: [1.15] });
    return this;
  }

  // draw it back up out of sight, then carry on. nothing on it answers any more
  lift(then) {
    this.closed = true;
    this.scene.tweens.add({ targets: this.box, y: this.restY - 760, duration: 380, ease: 'Back.in', easeParams: [1.1],
      onComplete: () => { if (then) then(); } });
  }
}
