import Phaser from 'phaser';
import { game } from '../services/game.js';
import { clock, withCurrentTime } from '../services/progress.js';
import Board from '../ui/board.js';

const MENU_ITEMS = ['resume', 'restart journey', 'full screen', 'save & quit', 'quit to title'];
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
    this.board = new Board(this, { x: Math.round(width / 2 - 241), y: 128 }).drop();
    this.board.heading('paused');
    this.board.menu(MENU_ITEMS.map((label) => ({ label })), (item) => this.confirm(item.label));
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
    if (item === 'save & quit') { this.saveAndQuit(); return; }
    if (item === 'quit to title') this.quitToTitle();
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
    STORY_SCENES.forEach((key) => this.scene.stop(key));
    this.scene.start('MorningScene');
  }

  saveAndQuit() {
    const sessionId = this.registry.get('sessionId');
    if (sessionId) {
      // the forest knows its own state; the other scenes just carry the last
      // saved state forward (none yet in the morning) with the play time so far
      let checkpoint;
      if (this.caller === 'ForestScene') checkpoint = this.scene.get('ForestScene').snapshot();
      else checkpoint = withCurrentTime(this.caller === 'MorningScene' ? null : this.registry.get('checkpoint'));
      game.updateProgress(sessionId, this.caller, this.registry.get('kindness') || 0, checkpoint)
        .catch((err) => console.warn('could not save progress:', err.message));
    } else {
      console.warn('no session to save — quitting without saving');
    }
    this.quitToTitle();
  }

  quitToTitle() {
    STORY_SCENES.forEach((key) => this.scene.stop(key));
    this.scene.start('SessionSelectScene');
  }
}
