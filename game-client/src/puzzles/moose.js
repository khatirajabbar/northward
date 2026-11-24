// The moose that comes up behind you.
//
// In the quiet stretch after the meadow there's a crashing in the trees behind
// you, and a bull moose comes out onto the road, head down, coming for you.
// Walking, it would have you. Hold X and you run — but only for a little
// while, so you need somewhere to go: a thicket of young spruce up ahead.
// Get in among them and stand completely still. It comes up to the thicket,
// snorts and stamps and pushes its nose in among the boughs, and if nothing
// moves it gives up and goes back the way it came. Move while it's there and
// it finds you.
//
// If it has you, you're back where it came out at you, to try again. Nothing
// is hurt but your nerves. Unlike the animals you help, this isn't a choice:
// the road doesn't go on without it.
//
// Like the puzzles it owns its sprites and its state; ForestScene asks it for
// a reminder (offer), ticks it (update), and asks how fast you may go (pace).

import { stretch } from '../world/road.js';
import { play } from '../audio/sound.js';

const ART = 2;                 // the forest's art is shown at 2x
const START = 220;             // how far into its stretch you are when it comes out at you
const THICKET = 1120;          // …and where the young spruce are (its stretch is 1296 long)
const HIDES = 50;              // how far either side of the thicket's middle it hides you
const COMES_FROM = 700;        // it comes out of the trees this far behind you (off the screen)…
const CLOSES = 520;            // …fast, px a second, until it's this near:
const NEAR = 420;
const CHASE = 330;             // then it keeps coming at this (you walk at 220)
const WALK = 220;              // the top speed the scene holds you to
const RUN = 340;               // what you can do holding X
const BREATH = 3500;           // …for this long (ms)
const REACH = 46;              // this close and it has you
const SETTLE = 600;            // you have to have been still this long when it gets to you
const NOSE = 112;              // where it stops, short of the thicket's middle, to search it
const SEARCH = [               // what it does there: [animation, ms]
  ['moose-stamp', 700], ['moose-look', 1300], ['moose-graze', 1500], ['moose-look', 1000]
];
const WANDERS = 80;            // going back the way it came, px a second
const BACK = 160;              // where you find yourself when it has had you: this far short of where it came out

export default class MoosePuzzle {
  constructor(scene) {
    this.scene = scene;
    const { from, to } = stretch('on-alone');
    this.from = from;
    this.to = to;
    this.startX = from + START;
    this.hideX = from + THICKET;

    this.mood = 'waiting';       // waiting → closing → chasing → searching → leaving … or found, caught
    this.done = false;           // it has gone, and you're past it
    this.caught = false;         // it has you, and you're on your way back
    this.breath = BREATH;
    this.still = 0;              // how long you've been standing still in the thicket (ms)
    this.said = {};
    this.keyX = scene.input.keyboard.addKey('X');

    this.floor = (x) => scene.hills.surfaceAt(x) + 3;
    // the young spruce, drawn in front of you
    scene.add.image(this.hideX, this.floor(this.hideX) + 2, 'woods-thicket').setOrigin(0.5, 1).setScale(ART).setDepth(11);
    // the moose (its sheet faces left), out of sight in the trees until it comes
    this.moose = scene.add.sprite(this.startX - COMES_FROM, this.floor(this.startX - COMES_FROM), 'woods-moose')
      .setOrigin(0.5, 1).setScale(ART).setDepth(9.5).setVisible(false);
  }

  get started() { return this.mood !== 'waiting' || this.done; }
  get chased() { return this.mood === 'closing' || this.mood === 'chasing'; }

  hidden(px) { return Math.abs(px - this.hideX) <= HIDES; }

  // the marker: over the thicket
  hideAt() { return [this.hideX, this.scene.hills.surfaceAt(this.hideX) - 120]; }

  // a reminder over your head — { label, keys, hint } — or null
  offer(px) {
    if (this.done || this.caught || this.scene.riding) return null;
    if (this.hidden(px) && ['chasing', 'closing', 'searching'].includes(this.mood)) return { label: 'stay still', keys: [], hint: true };
    if (this.mood === 'found') return { label: 'run!', keys: [], hint: true };
    if (this.chased) {
      if (this.breath > 0) return { label: 'hold to run', keys: ['x'], hint: true };
      return { label: 'get into the young spruce', keys: [], hint: true };
    }
    return null;
  }

  act() { return false; }

  show(anim, fast = 1) {
    if (this.moose.anims.currentAnim?.key !== anim) this.moose.play(anim);
    this.moose.anims.timeScale = fast;
  }

  turn(way) { this.moose.setFlipX(way > 0); }

  // are you keeping still? (no keys held, and not moving)
  keepingStill() {
    const scene = this.scene, body = scene.player.body;
    const held = scene.cursors.left.isDown || scene.cursors.right.isDown || scene.wasd.A.isDown || scene.wasd.D.isDown ||
      scene.cursors.up.isDown || scene.wasd.W.isDown || scene.cursors.space.isDown;
    return !held && Math.abs(body.velocity.x) < 5 && body.blocked.down;
  }

  // out of the trees behind you
  come() {
    const scene = this.scene, x = scene.player.x - COMES_FROM;
    this.mood = 'closing';
    this.breath = BREATH;
    this.still = 0;
    this.moose.setPosition(x, this.floor(x)).setDepth(9.5).setVisible(true);
    this.turn(1);
    this.show('moose-walk', 2.3);
    play(scene, 'rustle', { volume: 1, vary: 0 });
    play(scene, 'twig', { volume: 0.9 });
    scene.time.delayedCall(350, () => play(scene, 'horse-snort', { volume: 1, vary: 0 }));
    scene.showThought(this.said.came ? 'here it comes again — run!' : 'something big, crashing through the trees behind me — a moose! run, and hide!', 4200, true);
    this.said.came = true;
  }

  // you moved: it has seen you in among the spruce, and comes for you
  find() {
    const scene = this.scene;
    this.mood = 'found';
    this.turn(scene.player.x >= this.moose.x ? 1 : -1);
    this.show('moose-stamp');
    play(scene, 'horse-snort', { volume: 1, vary: 0 });
    scene.showThought("it's seen me move!", 1500, true);
    this.said.found = true;
    this.until = scene.time.now + 450;
  }

  // it has you: and you're back where it came out at you
  catch() {
    const scene = this.scene, player = scene.player, cam = scene.cameras.main;
    this.caught = true;
    this.mood = 'caught';
    const past = player.x > this.hideX + HIDES;                       // ran on by the spruce
    player.setVelocityX(0);
    // a last lunge, if it isn't on you yet
    const way = player.x >= this.moose.x ? 1 : -1;
    if (Math.abs(player.x - this.moose.x) > REACH) {
      this.turn(way);
      this.show('moose-walk', 2.6);
      scene.tweens.add({ targets: this.moose, x: player.x - way * REACH, duration: 280, ease: 'Quad.in',
        onUpdate: () => this.moose.setY(this.floor(this.moose.x)), onComplete: () => this.show('moose-stamp') });
    } else this.show('moose-stamp');
    this.running = false;
    player.anims.timeScale = 1;
    player.setMaxVelocity(WALK, 700);
    play(scene, 'horse-snort', { volume: 1, vary: 0 });
    scene.time.delayedCall(380, () => {
      cam.fadeOut(220, 10, 13, 20);
      cam.once('camerafadeoutcomplete', () => {
        const x = this.startX - BACK;
        scene.tweens.killTweensOf(this.moose);
        this.moose.setVisible(false);
        this.mood = 'waiting';
        player.setVelocity(0, 0);
        player.setPosition(x, scene.standY - (scene.groundY - scene.hills.surfaceAt(x)) - 4);
        player.setFlipX(false);
        this.caught = false;
        cam.fadeIn(320, 10, 13, 20);
        const why = this.said.found ? "it found me. once i'm in the spruce i mustn't move at all — not until it's gone."
          : past ? "i ran right past the young spruce. i have to get in among them, and keep still."
          : this.said.winded ? "i ran out of breath before i got there. i'll keep running till the spruce."
            : "it had me. walking's no good — i have to run (hold X) to the young spruce, and hide.";
        scene.showThought(why, 5200, true);
        this.said.caught = true;
        this.said.found = false;
        this.said.winded = false;
      });
    });
  }

  update(px) {
    const scene = this.scene, moose = this.moose, now = scene.time.now;
    const dt = Math.min(50, scene.game.loop.delta);
    if (this.done && this.mood === 'leaving' && moose.visible) {
      // on its way back into the trees down the road; out of sight, it's gone
      moose.x -= WANDERS * dt / 1000;
      moose.y = this.floor(moose.x);
      if (moose.x < scene.cameras.main.worldView.x - 120) moose.setVisible(false);
      return;
    }
    if (this.caught || this.done || scene.riding) return;
    const step = (to, speed) => {
      const d = to - moose.x, s = speed * dt / 1000;
      moose.x = Math.abs(d) <= s ? to : moose.x + Math.sign(d) * s;
      moose.y = this.floor(moose.x);
      return moose.x === to;
    };

    if (this.mood === 'waiting') {
      if (px > this.hideX + 90) { this.done = true; return; }            // (come back to the road beyond its spruce: by its torch, say)
      if (px > this.startX) this.come();
      return;
    }

    // how long you've been keeping still in the thicket
    this.still = this.hidden(px) && this.keepingStill() ? this.still + dt : 0;

    if (this.chased) {
      // running uses up your breath
      if (this.keyX.isDown && Math.abs(scene.player.body.velocity.x) > 230) {
        this.breath -= dt;
        if (this.breath <= 0 && !this.said.puffed) { this.said.puffed = true; this.said.winded = true; scene.showThought("i can't run any more —", 1600, true); }
      }
      if (this.mood === 'closing') {
        this.turn(px >= moose.x ? 1 : -1);
        step(px, CLOSES);
        if (Math.abs(px - moose.x) <= NEAR) { this.mood = 'chasing'; this.show('moose-walk', 2); }
        return;
      }
      // in the spruce, still, before it gets there: it doesn't see where you went, and stops to search
      const stop = this.hideX - NOSE;
      if (this.hidden(px) && this.still >= SETTLE && moose.x >= stop - 120) {
        this.turn(stop >= moose.x ? 1 : -1);
        this.show('moose-walk', 1.2);
        if (step(stop, CHASE * 0.5)) this.search();
        return;
      }
      this.turn(px >= moose.x ? 1 : -1);
      step(px, CHASE);
      if (Math.abs(px - moose.x) < REACH || px > this.to - 30) this.catch();   // (with the river ahead, it has you)
      return;
    }

    if (this.mood === 'searching') {
      if (!this.keepingStill() || !this.hidden(px)) return this.find();
      if (now > this.until) {
        this.beat += 1;
        if (this.beat >= SEARCH.length) return this.leave();
        const [anim, ms] = SEARCH[this.beat];
        this.show(anim);
        this.until = now + ms;
        if (anim === 'moose-stamp') play(scene, 'horse-snort', { volume: 0.8 });
        if (anim === 'moose-graze') play(scene, 'rustle', { volume: 0.7 });
      }
      return;
    }

    if (this.mood === 'found') {
      if (now < this.until) return;
      this.turn(px >= moose.x ? 1 : -1);
      this.show('moose-walk', 2.3);
      step(px, CHASE);
      if (Math.abs(px - moose.x) < REACH || px > this.to - 30) this.catch();   // (with the river ahead, it has you)
      return;
    }

    if (this.mood === 'leaving') {
      step(moose.x - 1000, WANDERS);
      // move while it's still close and it turns round
      if (moose.x > px - 300 && !this.keepingStill()) {
        this.mood = 'searching';
        this.beat = SEARCH.length - 2;
        this.until = now + 900;
        this.turn(1);
        this.show('moose-look');
        play(scene, 'horse-snort', { volume: 0.8 });
        if (!this.said.turned) { this.said.turned = true; scene.showThought('it heard me — still!', 1600, true); }
        return;
      }
      // far enough off down the road: you can go
      if (moose.x < px - 300) {
        this.done = true;
        scene.showThought(this.said.caught ? "it's gone. this time i kept still." : "it's gone. my heart's going like a drum.", 3600);
      }
    }
  }

  // at the thicket: it stamps, looks, pushes its nose in among the boughs, looks again
  search() {
    this.mood = 'searching';
    this.beat = 0;
    this.until = this.scene.time.now + SEARCH[0][1];
    this.show(SEARCH[0][0]);
    play(this.scene, 'horse-snort', { volume: 1, vary: 0 });
  }

  // nothing there, after all: back the way it came
  leave() {
    this.mood = 'leaving';
    this.turn(-1);
    this.show('moose-walk');
    if (!this.said.leaving) { this.said.leaving = true; this.scene.showThought("it's going… don't move yet.", 2600); }
  }

  // how fast you may go: running from it with X, and not at all once it has you
  pace(speed) {
    const player = this.scene.player;
    if (this.caught) return 0;
    const running = this.chased && this.keyX.isDown && this.breath > 0;
    if (running !== this.running) {
      this.running = running;
      player.anims.timeScale = running ? 1.6 : 1;                     // legs going faster
      player.setMaxVelocity(running ? RUN : WALK, 700);                // (the scene holds you to a walk otherwise)
    }
    return running ? RUN : speed;
  }
}
