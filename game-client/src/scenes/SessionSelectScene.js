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

// Your journeys — the ones you can carry on with, and a new one — on a board
// hung where the sign-in board was, over the same road.
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
    this.board.keys([[['up', 'down'], 'choose'], [['e'], 'begin'], [['f'], 'full screen']]);

    this.confirmed = false;
    this.loadSlots();

    this.input.keyboard.on('keydown-UP', () => this.board.move(-1));
    this.input.keyboard.on('keydown-W', () => this.board.move(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.board.move(1));
    this.input.keyboard.on('keydown-S', () => this.board.move(1));
    this.input.keyboard.on('keydown-ENTER', () => this.board.pick());
    this.input.keyboard.on('keydown-E', () => this.board.pick());

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

    const resumable = sessions
      .filter((session) => !session.isCompleted)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      .slice(0, 4);

    const slots = resumable.map((session) => {
      const character = characters.find((c) => c.id === session.playerCharacterId);
      return {
        session,
        travelerId: CHARACTER_ID_BY_TYPE[character?.characterType] || 'lpc-khatira',
        name: character?.customName || 'traveler'
      };
    });
    slots.push({ newJourney: true });

    this.buildMenu(slots, failed);
  }

  buildMenu(slots, failed) {
    const pad = (v) => String(v).padStart(2, '0');
    this.status.destroy();
    const items = slots.map((slot) => {
      if (slot.newJourney) return { slot, label: 'a new journey' };
      const d = new Date(slot.session.startedAt);
      const place = SCENE_LABELS[slot.session.currentScene] || 'morning';
      return { slot, label: `${slot.name} · ${place}`, short: place, note: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}` };
    });
    // the one walking under the board is whoever's journey you're looking at
    this.board.onChoose = (item) => { if (item.slot.travelerId) this.roadside.setTraveler(item.slot.travelerId); };
    this.board.menu(items, (item) => this.confirm(item.slot));
    if (failed) {
      const [x, y] = this.board.at(78, 22 * (items.length + 1) + 6);
      const words = this.add.bitmapText(x, y, 'px', "couldn't reach your saved journeys").setScale(2).setTint(0xffc9ad);
      this.board.add(words.setX(Math.round(x - words.width / 2)));
    }
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
