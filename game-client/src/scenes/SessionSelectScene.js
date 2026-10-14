import Phaser from 'phaser';
import { game, CHARACTER_ID_BY_TYPE } from '../services/game.js';
import { clock, decodeProgress } from '../services/progress.js';
import Roadside from '../ui/roadside.js';
import Board from '../ui/board.js';

const SCENE_LABELS = {
  MorningScene: 'morning',
  ForestScene: 'the forest',
  EndingScene: 'the ending'
};
const SLOTS = 4;                 // journeys kept on the go at once (the game service holds to the same)
const FORGET = 0xffb4a0;         // the colour a plank's words go when it's asking whether to let a journey go

// Your journeys — up to four you can carry on with, and a new one — on a board
// hung where the sign-in board was, over the same road. Each has a little bin
// at its end; and when all four are in use, starting a new journey means
// choosing one of them to let go.
export default class SessionSelectScene extends Phaser.Scene {
  constructor() {
    super('SessionSelectScene');
  }

  // `seamless`: coming straight from another screen over the same road, so
  // nothing fades — one board goes up and this one comes down
  init(data) {
    this.seamless = !!(data && data.seamless);
  }

  create() {
    this.roadside = new Roadside(this);
    this.board = new Board(this).drop();
    this.board.heading('your journeys');
    this.status = this.board.write(78, 28, 'gathering them...', { tint: 0xf1d9a8, align: 'center' });
    this.showKeys();

    this.confirmed = false;
    this.mode = 'pick';          // pick → (room →) forget?
    this.slots = [];
    this.loadSlots();

    const key = (name, fn) => this.input.keyboard.on(`keydown-${name}`, fn);
    ['UP', 'W'].forEach((k) => key(k, () => this.move(-1)));
    ['DOWN', 'S'].forEach((k) => key(k, () => this.move(1)));
    ['ENTER', 'E'].forEach((k) => key(k, () => this.board.pick()));
    ['X', 'DELETE', 'BACKSPACE'].forEach((k) => key(k, () => this.askToForget(this.board.chosen)));
    key('ESC', () => this.cancel());

    if (!this.seamless) this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  async loadSlots() {
    let sessions = [];
    let characters = [];
    let failed = false;
    try {
      [sessions, characters] = await Promise.all([game.getSessions(), game.getCharacters()]);
    } catch (err) {
      console.warn('could not load journeys:', err.message);
      failed = true;
    }
    if (!this.scene.isActive()) return;

    this.slots = sessions
      .filter((session) => !session.isCompleted)
      .sort((a, b) => new Date(b.lastPlayedAt || b.startedAt) - new Date(a.lastPlayedAt || a.startedAt))
      .slice(0, SLOTS)
      .map((session) => {
        const character = characters.find((c) => c.id === session.playerCharacterId);
        return {
          session,
          travelerId: CHARACTER_ID_BY_TYPE[character?.characterType] || 'lpc-khatira',
          name: character?.customName || 'traveler'
        };
      });
    this.failed = failed;
    if (this.status) { this.status.destroy(); this.status = null; }
    this.buildMenu();
  }

  buildMenu() {
    const pad = (v) => String(v).padStart(2, '0');
    const items = this.slots.map((slot) => {
      const d = new Date(slot.session.lastPlayedAt || slot.session.startedAt);
      const place = SCENE_LABELS[slot.session.currentScene] || 'morning';
      return { slot, label: `${slot.name} · ${place}`, short: place, note: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`, bin: true };
    });
    items.push({ slot: { newJourney: true }, label: 'a new journey' });
    // the one walking under the board is whoever's journey you're looking at
    this.board.onChoose = (item) => { if (item.slot.travelerId) this.roadside.setTraveler(item.slot.travelerId); };
    this.board.menu(items, (item, i) => this.picked(item, i), { onBin: (item, i) => this.askToForget(i) });
    if (this.notice) { this.notice.destroy(); this.notice = null; }
    if (this.failed) this.say("couldn't reach your saved journeys", 0xffc9ad);
  }

  // a line of small writing on the plank under the list — or, when every plank
  // is taken, on the heading's for a moment (never out past the board's edge)
  say(text, tint = 0xf1d9a8) {
    if (this.notice) { this.notice.destroy(); this.notice = null; }
    if (this.board.rows.length >= 5) {
      const heading = this.board.title.text;
      this.board.retitle(text);
      this.board.title.setTint(tint);
      this.time.delayedCall(2600, () => {
        if (this.board.title.text !== text) return;
        this.board.retitle(this.mode === 'room' ? 'let one go to make room' : heading);
        this.board.title.setTint(0xf7efd9);
      });
      return;
    }
    const [x, y] = this.board.at(78, 22 * (this.board.rows.length + 1) + 6);
    const words = this.add.bitmapText(x, y, 'px', text).setScale(2).setTint(tint);
    this.notice = this.board.add(words.setX(Math.round(x - words.width / 2)));
  }

  showKeys() {
    if (this.mode === 'forget') this.board.keys([[['e'], 'let it go'], [['esc'], 'keep it']]);
    else if (this.mode === 'room') this.board.keys([[['up', 'down'], 'choose'], [['e'], 'let it go'], [['esc'], 'back']]);
    else this.board.keys([[['up', 'down'], 'choose'], [['e'], 'begin'], [['x'], 'forget'], [['f'], 'full screen']]);
  }

  move(dir) {
    if (this.mode === 'forget') this.cancel();
    this.board.move(dir);
  }

  picked(item, index) {
    if (this.confirmed) return;
    if (this.mode === 'forget') { if (index === this.pending) this.forget(); else this.cancel(); return; }
    if (this.mode === 'room') { if (!item.slot.newJourney) this.askToForget(index); return; }
    if (item.slot.newJourney && this.slots.length >= SLOTS) { this.makeRoom(); return; }
    this.confirm(item.slot);
  }

  // all four are in use: the new one needs one of them to go
  makeRoom() {
    this.mode = 'room';
    this.board.retitle('let one go to make room');
    this.board.setRow(this.slots.length, 'choose one to forget', { tint: 0xf1d9a8 });
    this.board.choose(0);
    this.showKeys();
  }

  // "forget this journey?" — asked on its own plank, with the keys to answer underneath
  askToForget(index) {
    if (this.confirmed || !this.slots[index]) return;
    if (this.mode === 'forget') this.board.setRow(this.pending, null);
    this.backTo = this.mode === 'room' ? 'room' : 'pick';
    this.mode = 'forget';
    this.pending = index;
    this.board.choose(index);
    this.board.setRow(index, 'forget this journey?', { tint: FORGET, note: false });
    this.showKeys();
  }

  cancel() {
    if (this.mode === 'forget') {
      this.board.setRow(this.pending, null);
      this.mode = this.backTo;
      this.showKeys();
      return;
    }
    if (this.mode === 'room') {
      this.mode = 'pick';
      this.board.retitle('your journeys');
      this.board.setRow(this.slots.length, null);
      if (this.notice) { this.notice.destroy(); this.notice = null; }
      this.showKeys();
    }
  }

  async forget() {
    const slot = this.slots[this.pending];
    const makingRoom = this.backTo === 'room';
    this.confirmed = true;                             // nothing else answers while it goes
    try {
      await game.deleteSession(slot.session.id);
    } catch (err) {
      console.warn('could not forget the journey:', err.message);
      this.confirmed = false;
      this.board.setRow(this.pending, null);
      this.mode = this.backTo;
      this.showKeys();
      this.say("couldn't let it go just now", 0xffc9ad);
      return;
    }
    if (!this.scene.isActive()) return;
    this.slots.splice(this.pending, 1);
    this.confirmed = false;
    this.mode = 'pick';
    this.board.retitle('your journeys');
    this.showKeys();
    if (makingRoom) { this.confirm({ newJourney: true }); return; }  // and on to the new one
    this.buildMenu();
  }

  confirm(slot) {
    if (this.confirmed) return;
    this.confirmed = true;
    if (slot.newJourney) {
      this.board.lift(() => this.scene.start('CharacterSelectScene', { seamless: true }));
      return;
    }
    this.board.lift();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const { session, travelerId } = slot;
      this.registry.set('playAs', travelerId);
      this.registry.set('sessionId', session.id);
      this.registry.set('sessionStartedAt', session.startedAt);
      this.registry.set('kindness', session.score);
      this.registry.set('checkpoint', session.checkpoint ?? null);
      this.registry.set('inventory', {});
      clock.seconds = decodeProgress(session.checkpoint).seconds;
      this.scene.start(session.currentScene);
    });
  }
}
