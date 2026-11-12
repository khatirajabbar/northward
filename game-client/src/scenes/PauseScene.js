import Phaser from 'phaser';
import { game } from '../services/game.js';
import { auth, titleScene } from '../services/auth.js';
import { clock, withCurrentTime } from '../services/progress.js';
import Board from '../ui/board.js';
import { isOn, setOn } from '../audio/sound.js';

const MENU_ITEMS = ['resume', 'restart journey', 'full screen', 'music', 'sounds', 'save & quit', 'quit to title'];
// walking without an account there's nothing to save to: the same place in the
// menu offers to sign in and keep the journey instead
const KEEP = 'keep this journey';
const STORY_SCENES = ['MorningScene', 'ForestScene', 'EndingScene'];

// The game, stopped: a board let down over it with what you can do from here.
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  init(data) {
    this.caller = data.caller;
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x0a0e12, 0.6).setOrigin(0, 0);
    this.board = new Board(this, { x: Math.round(width / 2 - 241), y: 64, planks: 8 }).drop();
    this.board.heading('paused');
    this.items = MENU_ITEMS.map((item) => (item === 'save & quit' && !auth.isAuthenticated() ? KEEP : item));
    this.board.menu(this.items.map((label) => ({ label: this.labelFor(label), item: label })), (item) => this.confirm(item.item));
    // M works in here too: keep the lines on the board saying which they are
    const relabel = () => ['music', 'sounds'].forEach((item) => this.board.setRow(this.items.indexOf(item), this.labelFor(item)));
    this.game.events.on('sound-toggled', relabel);
    this.events.once('shutdown', () => this.game.events.off('sound-toggled', relabel));
    this.board.keys([[['up', 'down'], 'choose'], [['e'], 'do it'], [['esc'], 'resume']]);

    this.input.keyboard.on('keydown-UP', () => this.board.move(-1));
    this.input.keyboard.on('keydown-W', () => this.board.move(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.board.move(1));
    this.input.keyboard.on('keydown-S', () => this.board.move(1));
    this.input.keyboard.on('keydown-ENTER', () => this.board.pick());
    this.input.keyboard.on('keydown-E', () => this.board.pick());
    this.input.keyboard.on('keydown-P', () => this.resumeCaller());
    this.input.keyboard.on('keydown-ESC', () => this.resumeCaller());
  }

  confirm(item) {
    if (item === 'resume') { this.resumeCaller(); return; }
    if (item === 'restart journey') { this.restartJourney(); return; }
    if (item === 'full screen') { this.scale.toggleFullscreen(); return; }
    if (item === 'music' || item === 'sounds') { setOn(this.game, item, !isOn(item)); return; }
    if (item === 'save & quit') { this.saveAndQuit(); return; }
    if (item === KEEP) { this.keepJourney(); return; }
    if (item === 'quit to title') this.quitToTitle();
  }

  labelFor(item) {
    if (item === 'music' || item === 'sounds') return `${item}: ${isOn(item) ? 'on' : 'off'}`;
    return item;
  }

  resumeCaller() {
    this.scene.resume(this.caller);
    this.scene.stop();
  }

  restartJourney() {
    this.registry.set('kindness', 0);
    this.registry.set('inventory', {});
    this.registry.remove('checkpoint');
    clock.seconds = 0;
    // saved straight away as back at the start, so closing the game now doesn't
    // leave the old journey's progress waiting to be continued
    game.saveProgress(this.registry.get('sessionId'), 'MorningScene', 0, withCurrentTime(null));
    STORY_SCENES.forEach((key) => this.scene.stop(key));
    this.scene.start('MorningScene');
  }

  // remember where this journey has got to (if there's somewhere to keep it)
  save() {
    const sessionId = this.registry.get('sessionId');
    if (!sessionId) return;
    // the forest knows its own state; the other scenes just carry the last
    // saved state forward (none yet in the morning) with the play time so far
    let checkpoint;
    if (this.caller === 'ForestScene') checkpoint = this.scene.get('ForestScene').snapshot();
    else checkpoint = withCurrentTime(this.caller === 'MorningScene' ? null : this.registry.get('checkpoint'));
    game.saveProgress(sessionId, this.caller, this.registry.get('kindness') || 0, checkpoint);
  }

  saveAndQuit() {
    // (the journeys board this goes to waits for the save before it lists anything)
    this.save();
    this.quitToTitle();
  }

  // walking without an account: the board comes down to sign in or make one.
  // once you have, this journey becomes one of yours, saved as it stands
  keepJourney() {
    this.game.events.emit('door-open', {
      purpose: 'keep',
      kept: async () => {
        try {
          const session = await game.startJourney(this.registry.get('playAs') || 'lpc-khatira', auth.user.username);
          this.registry.set('sessionId', session.id);
          this.registry.set('sessionStartedAt', session.startedAt);
          this.save();
          return null;
        } catch (err) {
          console.warn('could not keep the journey:', err.message);
          return "couldn't keep it: that account's four journeys may be full";
        }
      },
      // signed in: the menu is the usual one now, with save & quit in it
      closed: (signedIn) => { if (signedIn) this.scene.restart({ caller: this.caller }); }
    });
  }

  quitToTitle() {
    STORY_SCENES.forEach((key) => this.scene.stop(key));
    this.scene.start(titleScene());
  }
}
