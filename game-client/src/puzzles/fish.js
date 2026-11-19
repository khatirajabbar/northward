// The trout the high water left behind.
//
// A little way on from the stepping stones, a brown trout lies in a puddle on
// the road: all that's left of the water that was here when the river came up.
// The puddle is going down, and the trout lies on its side in it, gasping.
// Pick it up and take it back to the river — but a fish can only last a few
// seconds out of water, and the river is a long way back. Walking, you won't
// make it. Hold X and run.
//
// Too slow, and it can't go on: you hurry it back into its puddle to breathe,
// and try again from there. Nothing is lost but time.
//
// Like the other puzzles it owns its sprites and its state; ForestScene asks
// it for a prompt (offer), hands it actions (act), ticks it (update), and asks
// how fast you may go (pace).

import { stretch } from '../world/road.js';
import { play } from '../audio/sound.js';
import { FOREST_SCALE } from '../characters/lpc.js';

const ART = 2;                 // the forest's art is shown at 2x
const AT = 900;                // how far into its stretch the puddle is (on the level, past the rise)
const BREATH = 3600;           // how long it can last out of the water (ms)
const WALK = 220;              // the top speed the scene holds you to
const RUN = 340;               // what you can do holding X, with the fish
const NEAR = 46;               // how near you have to be to reach it
const BANK = 90;               // how far back from the water's edge you can let it go from

export default class FishPuzzle {
  constructor(scene) {
    this.scene = scene;
    const { from } = stretch('past-the-stones');
    this.x = from + AT;                                           // the puddle
    this.bankR = scene.crossX + scene.crossWidth / 2;              // the river's edge you come back to…
    this.bankL = scene.crossX - scene.crossWidth / 2;              // …and the one on the far side of the stones
    this.state = 'puddle';       // puddle → held → free (or back to the puddle)
    this.done = false;
    this.breath = BREATH;        // how much longer it can go without water (ms)
    this.said = {};
    this.keyX = scene.input.keyboard.addKey('X');
    this.nextDrip = 0;

    this.floor = (x) => scene.hills.surfaceAt(x);
    this.puddle = scene.add.image(this.x, this.floor(this.x) + 9, 'woods-puddle').setScale(ART).setDepth(5.2);
    this.fish = scene.add.sprite(0, 0, 'woods-fish').setScale(ART);
    this.inPuddle();
  }

  // the world as a finished save left it: back in the river, long ago
  restore() {
    this.done = true;
    this.state = 'free';
    this.fish.setVisible(false);
  }

  get held() { return this.state === 'held'; }

  // lying in its puddle, gasping
  inPuddle() {
    this.state = 'puddle';
    this.breath = BREATH;
    this.fish.setPosition(this.x + 4, this.floor(this.x) + 6).setDepth(5.4).setFlipX(false).setAngle(0).play('fish-gasp');
    this.fish.anims.timeScale = 1;
  }

  // is there water to let it go into, just there?
  atWater(px) {
    return (px > this.bankR - 12 && px < this.bankR + BANK) || (px > this.bankL - BANK && px < this.bankL + 12);
  }

  // the marker: the river when it's in your hands, otherwise the fish
  where() {
    const g = this.scene.groundY;
    if (this.done) return null;
    if (this.held) return [this.bankR + 30, g - 70];
    return [this.x, g - 50];
  }

  // a reminder or an action over your head — { label, action } or { label, keys, hint } — or null
  offer(px, onGround) {
    const scene = this.scene;
    if (this.done || this.state === 'back' || scene.riding || scene.resting) return null;
    if (this.held) {
      if (onGround && this.atWater(px)) return { label: 'let it go', action: 'fish-free' };
      return { label: 'hold to run to the river', keys: ['x'], hint: true };
    }
    if (onGround && Math.abs(px - this.x) < NEAR) return { label: 'pick up the fish', action: 'fish-take' };
    return null;
  }

  act(action) {
    const scene = this.scene, player = scene.player;
    if (action === 'fish-take') {
      this.state = 'held';
      this.breath = BREATH;
      player.setVelocityX(0);
      player.play(`${scene.characterId}-crouch`);
      play(scene, 'splash', { volume: 0.35 });
      this.fish.play('fish-held').setDepth(10.5);
      this.place();
      if (!this.said.took) {
        this.said.took = true;
        scene.showThought("it can't last long out of water. back to the river with it — run!", 4200);
      }
      return true;
    }
    if (action === 'fish-free') {
      this.free();
      return true;
    }
    return false;
  }

  // in your hands, in front of you
  place() {
    const player = this.scene.player, way = player.flipX ? -1 : 1;
    this.fish.setPosition(player.x + way * 10 * FOREST_SCALE, player.y + 8 * FOREST_SCALE).setFlipX(way > 0).setAngle(0);
  }

  // a drop of puddle water off it
  drip() {
    const scene = this.scene, fish = this.fish;
    const d = scene.add.rectangle(fish.x + (Math.random() - 0.5) * 16, fish.y + 6, 2, 3, 0x9fd4e0, 0.9).setDepth(10.4);
    scene.tweens.add({ targets: d, y: d.y + 22 + Math.random() * 10, alpha: 0, duration: 340, ease: 'Quad.in', onComplete: () => d.destroy() });
  }

  // too long out of the water: you hurry it back to its puddle to breathe
  tooLong() {
    const scene = this.scene, player = scene.player, cam = scene.cameras.main;
    this.state = 'back';
    this.running = false;
    player.anims.timeScale = 1;
    player.setMaxVelocity(WALK, 700);
    player.setVelocityX(0);
    this.fish.play('fish-flap');
    scene.showThought("it can't breathe —", 1200);
    scene.time.delayedCall(500, () => {
      cam.fadeOut(220, 10, 13, 20);
      cam.once('camerafadeoutcomplete', () => {
        this.inPuddle();
        const x = this.x - 60;
        player.setVelocity(0, 0);
        player.setPosition(x, scene.standY - (scene.groundY - scene.hills.surfaceAt(x)) - 4);
        player.setFlipX(false);
        cam.fadeIn(320, 10, 13, 20);
        scene.showThought(this.said.back ? 'back in its puddle. once more — and run the whole way.'
          : "i got it back into its puddle in time. once more — and this time run the whole way (hold X).", this.said.back ? 3000 : 4800);
        this.said.back = true;
      });
    });
  }

  // into the river, and away
  free() {
    const scene = this.scene, fish = this.fish, player = scene.player;
    this.state = 'free';
    this.done = true;
    player.setVelocityX(0);
    const way = player.x > (this.bankL + this.bankR) / 2 ? -1 : 1;      // towards the water
    player.setFlipX(way < 0);
    player.play(`${scene.characterId}-toss`);
    const fromX = player.x + way * 10, fromY = player.y + 6;
    const toX = (way < 0 ? this.bankR : this.bankL) + way * 70, toY = scene.groundY + 22;
    fish.setPosition(fromX, fromY).setFlipX(way > 0).play('fish-flap').setDepth(5);
    fish.anims.timeScale = 1;
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 520,
      onUpdate: (tw) => {
        const t = tw.getValue();
        fish.setPosition(fromX + (toX - fromX) * t, fromY + (toY - fromY) * t - Math.sin(t * Math.PI) * 46).setAngle(way * t * 50);
      },
      onComplete: () => {
        play(scene, 'splash', { volume: 0.8 });
        for (let i = 0; i < 7; i++) {
          const drop = scene.add.circle(toX, scene.groundY + 18, 2.5, 0x9fd4e0, 0.85).setDepth(8);
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 2;
          scene.tweens.add({ targets: drop, x: drop.x + Math.cos(a) * 26, y: drop.y + Math.sin(a) * 22, alpha: 0, duration: 520, onComplete: () => drop.destroy() });
        }
        // under, and gone
        scene.tweens.add({ targets: fish, y: toY + 14, duration: 300, onComplete: () => fish.setVisible(false) });
        scene.addKindness(toX, scene.groundY - 30);
        scene.showThought('there — home. a flick of its tail and it was gone.', 3400);
        // and a ring further out, where it's off upstream
        scene.time.delayedCall(1100, () => play(scene, 'splash', { volume: 0.2 }));
      }
    });
  }

  update(px) {
    const scene = this.scene, now = scene.time.now;
    const dt = Math.min(50, scene.game.loop.delta);
    if (this.done) return;

    if (!this.said.seen && Math.abs(px - this.x) < 300) {
      this.said.seen = true;
      scene.showThought('a fish — in a puddle, on the road. the high water must have left it here.', 4200);
    }
    if (!this.held) return;

    // into the river with it, the other way: it's back in its puddle
    if (scene.player.y > scene.groundY + 20) {
      this.inPuddle();
      return;
    }
    this.place();
    this.breath = Math.max(0, this.breath - dt);
    const tired = 1 - this.breath / BREATH;
    this.fish.anims.timeScale = 1 + tired * 1.5;                          // wriggling harder and harder
    if (now > this.nextDrip) {
      this.drip();
      this.nextDrip = now + 60 + tired * 160;                             // the last of the puddle water dripping off it
    }
    if (this.breath <= 0) this.tooLong();
    else if (this.breath < 1100 && !this.said.hurry) {
      this.said.hurry = true;
      scene.showThought('hurry —', 1200);
    }
  }

  // how fast you may go: running with it, holding X; standing still while you put it back
  pace(speed) {
    const player = this.scene.player;
    if (this.state === 'back') return 0;
    const running = this.held && this.keyX.isDown;
    if (running !== this.running) {
      this.running = running;
      player.anims.timeScale = running ? 1.6 : 1;                       // legs going faster
      player.setMaxVelocity(running ? RUN : WALK, 700);                  // (the scene holds you to a walk otherwise)
    }
    return running ? RUN : speed;
  }
}
