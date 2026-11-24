import Phaser from 'phaser';
import { game } from '../services/game.js';
import { auth, titleScene } from '../services/auth.js';
import { clock } from '../services/progress.js';
import Roadside from '../ui/roadside.js';
import Board, { BOARD, GOLD } from '../ui/board.js';

const TRAVELERS = ['lpc-khatira', 'lpc-oliver'];
const P = 3;                 // the board's art is shown at 3x
const WELL = { xs: [12, 86], y: 28, w: 58, h: 94 };   // the two frames cut into the board, in its own pixels

// Who is setting out — the two travelers, side by side in frames cut into the
// board; the one you choose is the one walking the road underneath.
export default class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelectScene');
  }

  init(data) {
    this.seamless = !!(data && data.seamless);
  }

  create() {
    this.roadside = new Roadside(this);
    const board = this.board = new Board(this).drop();
    board.heading('choose your traveler');

    this.cards = TRAVELERS.map((id, i) => {
      const [x, y] = board.at(WELL.xs[i], WELL.y);
      const w = WELL.w * P, h = WELL.h * P;
      // cut into the wood like the sign-in fields: dark along the top, the lower lip catching the light
      board.add(this.add.rectangle(x, y + P, w, h, 0xc99a62).setOrigin(0, 0));
      board.add(this.add.rectangle(x, y, w, h, 0x2a1a10).setOrigin(0, 0));
      board.add(this.add.rectangle(x, y, w, P, 0x170d07).setOrigin(0, 0));
      const sprite = board.add(this.add.sprite(x + w / 2, y + h - 2 * P, `${id}-idle-sheet`, 26).setOrigin(0.5, 1).setScale(4));
      sprite.play(`${id}-front`);
      const ring = board.add(this.add.rectangle(x - P, y - P, w + 2 * P, h + 2 * P).setOrigin(0, 0)
        .setStrokeStyle(P, GOLD).setVisible(false));
      const zone = board.add(this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true }));
      zone.on('pointerover', () => this.highlight(i));
      zone.on('pointerdown', () => { this.highlight(i); this.confirm(); });
      return { id, sprite, ring };
    });
    board.keys([[['left', 'right'], 'choose'], [['e'], 'set out'], [['esc'], 'back']]);

    this.confirmed = false;
    const saved = this.registry.get('playAs');
    this.highlight(Math.max(0, TRAVELERS.indexOf(saved)));

    this.input.keyboard.on('keydown-LEFT', () => this.move(-1));
    this.input.keyboard.on('keydown-A', () => this.move(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.move(1));
    this.input.keyboard.on('keydown-D', () => this.move(1));
    this.input.keyboard.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard.on('keydown-E', () => this.confirm());
    this.input.keyboard.on('keydown-ESC', () => this.back());

    if (!this.seamless) this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  move(dir) {
    this.highlight(Phaser.Math.Clamp(this.selectedIndex + dir, 0, this.cards.length - 1));
  }

  highlight(index) {
    if (this.confirmed) return;
    this.selectedIndex = index;
    this.cards.forEach((card, i) => {
      card.ring.setVisible(i === index);
      card.sprite.setTint(i === index ? 0xffffff : 0x8f8272);     // the other one stands back in the shade
    });
    this.roadside.setTraveler(this.cards[index].id);
  }

  back() {
    if (this.confirmed) return;
    this.confirmed = true;
    this.board.lift(() => this.scene.start(titleScene(), { seamless: true }));
  }

  confirm() {
    if (this.confirmed) return;
    this.confirmed = true;
    clock.seconds = 0;
    const travelerId = this.cards[this.selectedIndex].id;
    this.registry.set('playAs', travelerId);
    this.registry.remove('sessionId');
    this.registry.remove('sessionStartedAt');
    this.registry.remove('checkpoint');
    this.registry.set('kindness', 0);
    this.startJourney(travelerId);
    this.board.lift();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MorningScene'));
  }

  async startJourney(travelerId) {
    if (!auth.isAuthenticated()) return;          // walking without an account: nothing is kept
    try {
      const session = await game.startJourney(travelerId, auth.user.username);
      this.registry.set('sessionId', session.id);
      this.registry.set('sessionStartedAt', session.startedAt);
    } catch (err) {
      console.warn('starting journey without a saved session:', err.message);
    }
  }
}
