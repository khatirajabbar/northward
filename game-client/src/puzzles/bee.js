// The bumblebee in the daisies — the one you get close to by keeping still.
// It's busy in a clump of tall daisies a little way past the stag. Stand still
// and watch, and it goes on about its work as if you weren't there; after a
// while it moves on to the next clump. Then you remember: if you go up to a
// bee gently enough, it might let you pet it. Walk up slowly (hold shift) and
// it does — a close-up of a fingertip on its fur. Hurry, and it flies off to
// other flowers, and you try again.
//
// Like the other puzzles it owns its sprites and its state; ForestScene asks
// it for a prompt (offer), hands it actions (act) and ticks it (update).

import { level, nearness } from '../audio/sound.js';

const ART = 2;             // the forest's art is shown at 2x
const WATCH_MS = 9000;     // how long you keep still before it moves on by itself
const NEAR = 160;          // come this close at a walk and you frighten it
const TOUCH = 52;          // …this close, gently, and it lets you
const PICTURE_MS = 4600;   // how long the close-up stays

export default class BeePuzzle {
  constructor(scene, x) {
    this.scene = scene;
    this.x = x;
    this.stage = 'watch';        // watch → approach → petting → done
    this.done = false;
    this.watched = 0;            // how long you've kept still near it
    this.said = {};

    const g = scene.groundY;
    // three clumps of tall daisies, the bee in the first
    this.clumps = [x, x + 240, x + 420].map((cx, c) => {
      const heads = [-22, -6, 10, 24].map((dx, i) => {
        const tall = (i + c) % 2 === 0;
        const key = (i + c) % 3 === 1 ? 'daisy-tall-yellow' : 'daisy-tall';
        scene.add.image(cx + dx, g + 4 - (tall ? 0 : 6), `woods-${key}`).setOrigin(0.5, 1).setScale(ART).setDepth(5).setFlipX(i % 2 === 1);
        return [cx + dx, g + 4 - (tall ? 0 : 6) - 30];                // where a flower's heart is
      });
      return { x: cx, heads };
    });
    this.at = 0;
    const [hx, hy] = this.clumps[0].heads[1];
    this.bee = scene.add.sprite(hx, hy, 'woods-bee').setOrigin(0.5, 0.75).setScale(ART).setDepth(6).play('bee-feed');
    // busy: from flower to flower in its clump, every little while
    this.busy = scene.time.addEvent({ delay: 2600, loop: true, callback: () => this.nextFlower() });
  }

  // the world as a finished save left it: back at work in the second clump, nothing more to do
  restore() {
    this.done = true;
    this.stage = 'done';
    this.moveTo(1, true);
  }

  // over to another flower in the same clump
  nextFlower() {
    if (this.flying || this.stage === 'petting') return;
    const scene = this.scene, bee = this.bee;
    const heads = this.clumps[this.at].heads;
    const [hx, hy] = heads[Math.floor(Math.random() * heads.length)];
    bee.setFlipX(hx > bee.x).play('bee-fly');
    scene.tweens.add({ targets: bee, x: hx, y: hy, duration: 520, ease: 'Sine.inOut', onComplete: () => bee.play('bee-feed') });
    scene.tweens.add({ targets: bee, y: hy - 10, duration: 260, yoyo: true, ease: 'Sine.out' });
  }

  // off to another clump of daisies, up over the grass and down
  moveTo(clump, atOnce = false) {
    const scene = this.scene, bee = this.bee;
    this.at = clump;
    const [hx, hy] = this.clumps[clump].heads[2];
    scene.tweens.killTweensOf(bee);
    if (atOnce) { bee.setPosition(hx, hy).play('bee-feed'); return; }
    this.flying = true;
    bee.setFlipX(hx > bee.x).play('bee-fly');
    const hop = { t: 0 }, x0 = bee.x, y0 = bee.y;
    scene.tweens.add({ targets: hop, t: 1, duration: 1300, ease: 'Sine.inOut',
      onUpdate: () => bee.setPosition(x0 + (hx - x0) * hop.t, y0 + (hy - y0) * hop.t - Math.sin(hop.t * Math.PI) * 70),
      onComplete: () => { this.flying = false; bee.play('bee-feed'); } });
  }

  // the other clump from the one it's in (it doesn't go back to the first)
  elsewhere() { return this.at === 1 ? 2 : 1; }

  // the marker: on the bee itself
  spot() { return [this.bee.x, this.bee.y - 30]; }

  // a reminder over your head while you're near — { label, keys, hint } — or null
  offer(px) {
    const scene = this.scene;
    if (this.done || this.stage === 'petting' || this.flying || scene.resting) return null;
    const far = Math.abs(px - this.bee.x);
    if (this.stage === 'watch' && far < 260) return { label: 'keep still, and watch', hint: true };
    if (this.stage === 'approach' && far < 280 && !scene.movingSlow) {
      return { label: 'hold to go up to it gently', keys: ['shift'], hint: true };
    }
    return null;
  }

  act() { return false; }

  update(px) {
    const scene = this.scene, bee = this.bee;
    level(scene, 'bee', nearness(Math.abs(px - bee.x), 380));      // its hum, louder as you come near
    if (this.done || this.stage === 'petting' || this.flying) return;
    const far = Math.abs(px - bee.x);
    const pace = Math.abs(scene.player.body.velocity.x);
    const say = (id, text, ms = 3800) => { if (!this.said[id]) { this.said[id] = true; scene.showThought(text, ms); } };

    if (this.stage === 'watch') {
      if (far > 260) return;
      say('seen', "a bumblebee, busy in the daisies. i'll keep still, so i don't frighten it.", 4400);
      if (far < NEAR && pace > 100) {                         // came right up to it at a walk
        say('scared', "oh — i've frightened it.", 2400);
        this.watched = WATCH_MS;
      }
      if (pace < 12) this.watched += scene.game.loop.delta;
      if (this.watched > WATCH_MS * 0.5) say('calm', "it doesn't mind me at all, as long as i'm still.", 3400);
      if (this.watched >= WATCH_MS) {
        this.stage = 'approach';
        this.moveTo(1);
        scene.time.delayedCall(this.said.scared ? 2600 : 900, () => {
          scene.showThought('if i go up to it gently, it might even let me pet it. i read that somewhere.', 4800);
        });
      }
      return;
    }

    // the approach: slowly is fine; at a walk, and it's gone to other flowers
    if (far < NEAR && pace > 100) {
      this.moveTo(this.elsewhere());
      scene.showThought(this.said.tooQuick ? 'too quick again. slowly, slowly.' : "too quick — it's flown off. slowly, slowly.", 3000);
      this.said.tooQuick = true;
      return;
    }
    if (far < TOUCH && scene.player.body.blocked.down) this.pet();
  }

  // close enough, gently enough: it lets you
  pet() {
    const scene = this.scene, player = scene.player;
    this.stage = 'petting';
    this.done = true;
    // you stop where you are, and reach out
    player.setVelocity(0, 0);
    player.setFlipX(this.bee.x < player.x);
    player.play(`${scene.characterId}-crouch`);
    scene.input.keyboard.enabled = false;
    scene.input.keyboard.resetKeys();                               // nothing still held down carries you off
    scene.guide.hidePrompt();

    // the picture: a fingertip on its fur, close up, on a sheet of the game's paper
    const { width, height } = scene.scale;
    const u = 4;                                                     // the picture's pixels, on screen
    const dim = scene.add.rectangle(0, 0, width, height, 0x0a0d14, 0.5).setOrigin(0, 0);
    const paper = scene.add.nineslice(0, 0, 'ui-tag', undefined, 120 + 10, 80 + 11, 5, 5, 5, 6).setScale(u);
    const picture = scene.add.sprite(0, -2 * u, 'woods-bee-pet').setScale(u).play('bee-pet');
    const card = scene.add.container(Math.round(width / 2), Math.round(height / 2 - 30), [paper, picture]).setScale(0.92);
    const box = scene.add.container(0, 0, [dim, card]).setScrollFactor(0).setDepth(102).setAlpha(0);   // under the line of thought
    scene.tweens.add({ targets: box, alpha: 1, duration: 400 });
    scene.tweens.add({ targets: card, scale: 1, duration: 500, ease: 'Back.out' });
    scene.showThought('so soft.', PICTURE_MS - 400);
    scene.addKindness(this.bee.x, this.bee.y - 20);

    scene.time.delayedCall(PICTURE_MS, () => {
      scene.tweens.add({ targets: box, alpha: 0, duration: 450,
        onComplete: () => {
          box.destroy();
          scene.input.keyboard.enabled = true;
          scene.input.keyboard.resetKeys();
          this.stage = 'done';
          scene.showThought("it didn't mind at all. it just went on with its flowers.", 3800);
        } });
    });
  }
}
