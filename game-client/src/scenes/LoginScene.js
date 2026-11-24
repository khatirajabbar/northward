import Phaser from 'phaser';
import Roadside from '../ui/roadside.js';

// The title — the first thing anyone sees: the road north sliding by, and the
// game's name. The sign-in form (a wooden board on two ropes, in index.html)
// hangs on top, on the right; main.js lets it down when this scene says it's
// ready, and draws it up again once you're in.
export default class LoginScene extends Phaser.Scene {
  constructor() {
    super('LoginScene');
  }

  create() {
    this.roadside = new Roadside(this, { arrive: true });
    this.cameras.main.fadeIn(700, 0, 0, 0);
    this.game.events.emit('title-ready');
  }
}
