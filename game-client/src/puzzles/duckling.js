// The lost duckling — the one you have to wait for.
// It is on the wrong side of a fallen log, and its mother and the others are
// at a pond a good way further on. Pick it up and carry it over; set it down
// (or it wriggles down by itself) and it takes you for something to follow —
// but its legs are short. Walk at your own pace and it falls behind and stops,
// peeping; go back for it, go slowly, and it comes all the way.
// Nothing goes wrong if you hurry. It just can't be done in a hurry.
//
// Like the other puzzles it owns its sprites and its state; ForestScene asks
// it for a prompt (offer), hands it actions (act) and ticks it (update).

import { play, nearness } from '../audio/sound.js';

const ART = 2;             // the forest's art is shown at 2x
const PACE = 94;           // how fast a duckling goes, flat out — just past your slow walk (90)
const KEEP_UP = 175;       // get further ahead of it than this and it has lost you
const COME_BACK = 80;      // …until you are this close again
const HEEL = 30;           // how far behind you it likes to be
const ENOUGH = 300;        // carried this far past the log, it wants down

export default class DucklingPuzzle {
  constructor(scene, logX, pondX) {
    this.scene = scene;
    this.logX = logX;
    this.pondX = pondX;
    this.stage = 'stuck';        // stuck → held → following → reunited → home
    this.done = false;
    this.waiting = false;        // true while it has lost you and stopped
    this.said = {};

    const g = scene.groundY;
    this.floor = g + 2;
    this.water = g + 36;         // where a swimming bird sits on the pond
    this.bankX = pondX - 96;     // where the mother stands and calls
    this.arriveX = pondX - 190;  // close enough to see her: it runs the rest by itself

    // the log, and the pond a good way past it
    scene.add.image(logX, g + 6, 'woods-fallen-log').setOrigin(0.5, 1).setScale(ART).setDepth(6);
    [-40, -6, 28].forEach((dx, i) => {
      scene.add.image(logX + dx, g + 5, i % 2 ? 'woods-tuft-b' : 'woods-tuft-a').setOrigin(0.5, 1).setScale(ART).setDepth(7);
    });
    scene.add.image(pondX, g + 4, 'woods-pond').setOrigin(0.5, 0).setScale(ART).setDepth(8).setFlipX(true);
    const shimmer = scene.add.rectangle(pondX - 40, g + 24, 26, 2, 0xdff3f2, 0.7).setDepth(8);
    scene.tweens.add({ targets: shimmer, x: pondX + 30, alpha: 0.15, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const bird = (key, x) => scene.add.sprite(x, this.floor, `woods-${key}`).setOrigin(0.5, 1).setScale(ART).setDepth(6.5);
    // the family: the mother on the bank, looking back down the road, two ducklings at her feet
    this.mother = bird('duck', this.bankX).play('duck-stand');
    this.others = [bird('duckling', this.bankX + 30).play('duckling-stand'), bird('duckling', this.bankX + 48).play('duckling-stand')];
    this.calling = scene.time.addEvent({ delay: 2600, loop: true, callback: () => this.call() });

    // the lost one, at the log, trying
    this.duckling = bird('duckling', logX - 68).setFlipX(true).play('duckling-peep');
    this.trying = scene.time.addEvent({ delay: 1500, loop: true, callback: () => this.tryLog() });
  }

  // the world as a finished save left it: all of them out on the water
  restore() {
    this.done = true;
    this.stage = 'home';
    this.trying.remove();
    this.calling.remove();
    this.launch(true);
  }

  // still on the wrong side of the log, on its feet or in your hands
  onNearSide() { return this.stage === 'stuck' || this.stage === 'held'; }

  missing() { return this.stage === 'stuck' || this.stage === 'held' || this.stage === 'following'; }

  // she calls for it: her bill open, a note going up
  call() {
    const scene = this.scene, mother = this.mother;
    if (!this.missing()) return;
    mother.play('duck-call');
    play(scene, 'quack', { volume: nearness(Math.abs(scene.player.x - mother.x), 900) });   // heard from further off than she's seen
    const note = scene.guide.text(mother.x - 22, this.floor - 44, '!', { size: 3 }).setDepth(80);
    scene.tweens.add({ targets: note, y: note.y - 20, alpha: 0, duration: 800, onComplete: () => note.destroy() });
    scene.time.delayedCall(420, () => { if (this.missing()) mother.play('duck-stand'); });
  }

  // a hop at the log. it comes up short every time
  tryLog() {
    const scene = this.scene, duckling = this.duckling;
    if (this.stage !== 'stuck') return;
    if (Math.abs(scene.player.x - duckling.x) < 130) {                // you're here: it turns and tells you about it
      duckling.setFlipX(scene.player.x > duckling.x).play('duckling-peep');
      return;
    }
    duckling.setFlipX(true).play('duckling-hop');
    scene.tweens.add({ targets: duckling, x: this.logX - 60, y: this.floor - 16, duration: 170, yoyo: true, ease: 'Quad.out',
      onComplete: () => { if (this.stage === 'stuck') duckling.setPosition(this.logX - 68, this.floor).play('duckling-peep'); } });
  }

  // what E would do here right now — { label, action }, a { label, keys, hint } reminder, or null
  offer(px, onGround) {
    const scene = this.scene;
    if (this.done || scene.resting) return null;
    if (this.stage === 'stuck' && onGround && Math.abs(px - this.duckling.x) < 80) {
      return { label: 'pick up the duckling', action: 'duck-pick' };
    }
    if (this.stage === 'held') {
      if (onGround && px > this.logX + 60) return { label: 'set the duckling down', action: 'duck-down' };
      return { label: 'carry it over the log', hint: true };
    }
    if (this.stage === 'following' && px > this.logX + 40) {        // once you're over the log yourself
      if (this.waiting) return { label: 'it has stopped — go back for it', hint: true };
      // only said when it's needed: you're striding off, or it's dropping back
      const striding = Math.abs(scene.player.body.velocity.x) > 100;
      if (!scene.movingSlow && (striding || Math.abs(px - this.duckling.x) > 110)) {
        return { label: 'hold to walk slowly, so it keeps up', keys: ['shift'], hint: true };
      }
    }
    return null;
  }

  act(action) {
    const scene = this.scene, duckling = this.duckling;
    if (action === 'duck-pick') {
      // into your hands. it's held there every frame from now (see update)
      scene.tweens.killTweensOf(duckling);
      this.trying.remove();
      this.stage = 'held';
      scene.player.setVelocityX(0);
      scene.player.setFlipX(duckling.x < scene.player.x);
      scene.player.play(`${scene.characterId}-crouch`);
      duckling.play('duckling-held').setDepth(10.5);
      play(scene, 'peep');
      scene.showThought("there, i've got you. somewhere ahead a duck is calling.", 4000);
      return true;
    }
    if (action === 'duck-down') {
      scene.player.setVelocityX(0);
      scene.player.play(`${scene.characterId}-crouch`);
      this.setDown("there. and now it's following me — slowly, then. it has short legs.");
      return true;
    }
    return false;
  }

  // out of your hands and onto its own feet, just in front of you
  setDown(thought) {
    const scene = this.scene, duckling = this.duckling;
    this.stage = 'following';
    this.waiting = false;
    duckling.setDepth(6.5).setPosition(scene.player.x + (scene.player.flipX ? -26 : 26), this.floor).play('duckling-peep');
    play(scene, 'peep');
    scene.showThought(thought, 4400);
  }

  update(px) {
    const scene = this.scene;
    if (this.stage === 'stuck' && !this.said.found && Math.abs(px - this.duckling.x) < 260) {
      this.said.found = true;
      scene.showThought("a duckling, all on its own. it can't get over that log.", 4000);
    }
    if (this.stage === 'held') {
      // in your hands, at your chest, facing the way you are
      const player = scene.player;
      this.duckling.setPosition(player.x + (player.flipX ? -11 : 11), player.y + 20).setFlipX(!player.flipX);
      // carried far enough: it has its own ideas about walking
      if (px > this.logX + ENOUGH && player.body.blocked.down) this.setDown("it's wriggling — it wants to walk. slowly, then. it has short legs.");
      return;
    }
    if (this.stage !== 'following') return;

    const duckling = this.duckling;
    const gap = px - duckling.x, far = Math.abs(gap);
    if (this.waiting) {
      // it stays where it lost you, peeping, until you come back
      duckling.play('duckling-peep', true);
      if (far > COME_BACK) return;
      this.waiting = false;
    } else if (far > KEEP_UP && px > this.logX) {
      this.waiting = true;
      duckling.setFlipX(gap > 0).play('duckling-peep');
      play(scene, 'peep', { volume: 0.8 });
      if (!this.said.lost) { this.said.lost = true; scene.showThought("it can't keep up with me. i'll go back for it.", 3800); }
      return;
    }
    // at your heel, as fast as it can go — which isn't fast. (and never back
    // over the log: if you're still on the far side of it, it waits there)
    // once it's walking it keeps walking while you do, steadily at your heel,
    // and only stands when you've stopped and it has caught up; it starts off
    // again when you're a few steps ahead. (stopping and starting every few
    // frames, it flickered between its walking and standing pictures, and
    // turned to and fro whenever it came a pixel too close)
    const want = Math.max(px - Math.sign(gap || 1) * HEEL, this.logX + 58);
    const off = want - duckling.x;
    const youMove = Math.abs(scene.player.body.velocity.x) > 10;
    const go = this.stepping ? (Math.abs(off) > 0.5 || youMove) : Math.abs(off) > 12;
    this.stepping = go;
    if (go) {
      const reach = PACE * scene.game.loop.delta / 1000;
      const step = Math.max(-reach, Math.min(reach, off));
      duckling.x += step;
      if (Math.abs(step) > 0.3) duckling.setFlipX(step > 0);     // it turns only when it really sets off the other way
      duckling.play('duckling-walk', true);
    } else {
      if (far > 8) duckling.setFlipX(gap > 0);                     // stood still, it looks to you
      duckling.play('duckling-stand', true);
    }
    if (!this.said.pond && duckling.x > this.arriveX - 220) { this.said.pond = true; scene.showThought('a pond — and a duck, calling.', 3000); }
    if (duckling.x > this.arriveX) this.reunite();
  }

  // it has seen her: the last of the way it runs by itself
  reunite() {
    const scene = this.scene, duckling = this.duckling, mother = this.mother;
    this.stage = 'reunited';
    this.done = true;
    this.calling.remove();
    mother.play('duck-call');
    play(scene, 'quack');
    duckling.setFlipX(true).play('duckling-walk');
    scene.tweens.add({ targets: duckling, x: mother.x - 26, duration: Math.max(300, (mother.x - 26 - duckling.x) * 6),
      onComplete: () => {
        duckling.play('duckling-peep');
        mother.play('duck-stand');
        play(scene, 'peep');
        this.others.forEach((other, i) => {
          other.play('duckling-hop');
          scene.tweens.add({ targets: other, y: this.floor - 12, duration: 130, yoyo: true, repeat: 1, delay: i * 90,
            onComplete: () => other.play('duckling-stand') });
        });
        const heart = scene.guide.text(mother.x - 12, this.floor - 60, '♥', { size: 4 }).setTint(0xe58a9a).setOrigin(0.5).setDepth(80);
        scene.tweens.add({ targets: heart, y: heart.y - 50, alpha: 0, duration: 1800, ease: 'Sine.out', onComplete: () => heart.destroy() });
        scene.addKindness(mother.x, this.floor - 50);
        scene.showThought("there's your family. off you go.", 3400);
        scene.time.delayedCall(1900, () => this.launch(false));
      } });
  }

  // onto the water, the mother first and the three of them in a line behind her
  launch(atOnce) {
    const scene = this.scene;
    const birds = [[this.mother, 'duck-swim', 46], [this.duckling, 'duckling-swim', 6], [this.others[0], 'duckling-swim', -22], [this.others[1], 'duckling-swim', -50]];
    birds.forEach(([bird, anim, dx], i) => {
      const x = this.pondX + dx;
      const settle = () => {
        bird.setFlipX(true).setDepth(8.5).setPosition(x, this.water).play(anim);
        // riding the water, each a little out of step with the next
        scene.tweens.add({ targets: bird, y: this.water + 2, duration: 900 + i * 130, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      };
      if (atOnce) { settle(); return; }
      scene.time.delayedCall(i * 260, () => {
        bird.setFlipX(x > bird.x).play(i ? 'duckling-hop' : 'duck-walk');
        scene.tweens.add({ targets: bird, x, duration: 520, ease: 'Sine.inOut' });
        scene.tweens.add({ targets: bird, y: this.floor - 18, duration: 200, ease: 'Quad.out',
          onComplete: () => scene.tweens.add({ targets: bird, y: this.water, duration: 320, ease: 'Quad.in', onComplete: settle }) });
      });
    });
    if (!atOnce) scene.time.delayedCall(1800, () => { this.stage = 'home'; });
  }
}
