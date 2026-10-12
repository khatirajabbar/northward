// The fawn in the mud — the one you can't rush.
// It has gone in up to its belly beside the path, and its mother can't reach
// it. You have a rope: throw it, then walk away from the fawn slowly (hold
// shift). Pull hard and it panics and slides back in; pull gently and the mud
// lets go. Then its mother comes for it.
//
// Like the fox, the puzzle owns its sprites and its state; ForestScene asks it
// for a prompt (offer), hands it actions (act) and ticks it (update).

const ART = 2;             // the forest's art is shown at 2x
const ROPE = 110;          // how far the rope reaches
const HAUL = 120;          // how far the fawn has to come before the mud lets go
const GENTLE = 130;        // pull faster than this and it panics
const SHY = 190;           // how close the doe lets you get

export default class FawnPuzzle {
  constructor(scene, x) {
    this.scene = scene;
    this.x = x;
    this.stage = 'stuck';       // stuck → roped → free → gone
    this.done = false;
    this.hauling = false;       // true on the frames you are actually drawing it out
    this.noticed = false;
    this.calmAt = 0;            // after a panic it needs a moment before you try again

    this.floor = scene.groundY + 2;           // where a deer's hooves sit on the path
    this.sunk = this.floor + 26;              // …and how far down the fawn is
    this.doeHome = x + 340;
    this.doe = scene.add.sprite(this.doeHome, this.floor, 'woods-doe').setOrigin(0.5, 1).setScale(ART).setDepth(6);
    this.doe.play('doe-idle');
    // the fawn is drawn behind the mud, so the mud hides its legs
    this.fawn = scene.add.sprite(x, this.sunk, 'woods-fawn').setOrigin(0.5, 1).setScale(ART).setDepth(7);
    this.fawn.play('fawn-frightened');
    scene.add.image(x, scene.groundY + 2, 'woods-mud').setOrigin(0.5, 0).setScale(ART).setDepth(8);
    this.rope = scene.add.graphics().setDepth(9.6);
    // it struggles, uselessly, every little while
    this.struggle = scene.tweens.add({ targets: this.fawn, x: x + 3, duration: 130, yoyo: true, repeat: -1, repeatDelay: 900 });
  }

  // the world as a finished save left it: mother and fawn long gone
  restore() {
    this.stage = 'gone';
    this.done = true;
    this.struggle.stop();
    this.fawn.destroy();
    this.doe.destroy();
  }

  // what E would do here right now — { label, action }, a { label, keys, hint } reminder, or null
  offer(px, onGround) {
    const scene = this.scene;
    if (this.done || scene.resting || !onGround) return null;
    if (this.stage === 'stuck' && Math.abs(px - this.x) < 150 && (scene.inventory.rope || 0) > 0) {
      return { label: 'throw the rope to the fawn', action: 'fawn-rope' };
    }
    if (this.stage === 'roped') return { label: 'hold, and walk away slowly', keys: ['shift'], hint: true };
    return null;
  }

  act(action) {
    if (action !== 'fawn-rope') return false;
    const scene = this.scene;
    scene.player.setVelocityX(0);
    scene.player.setFlipX(this.fawn.x < scene.player.x);
    scene.player.play(`${scene.characterId}-toss`);
    scene.time.delayedCall(450, () => {
      this.stage = 'roped';
      this.struggle.stop();
      this.fawn.x = this.x;
      this.fawn.play('fawn-idle');
      scene.showThought('got it. slowly now — hold shift, and walk away.', 4200);
    });
    return true;
  }

  update(px) {
    const scene = this.scene;
    this.hauling = false;
    if (this.stage === 'gone') return;

    if (!this.noticed && Math.abs(px - this.x) < 320) {
      this.noticed = true;
      scene.showThought("a fawn, up to its belly in the mud. and its mother can't reach it.", 4400);
    }
    this.keepDoeShy(px);
    if (this.stage !== 'roped') return;

    const away = px - this.fawn.x, dist = Math.abs(away);
    const vx = scene.player.body.velocity.x;
    const pulling = dist >= ROPE && Math.sign(vx) === Math.sign(away) && Math.abs(vx) > 8;
    if (pulling && scene.time.now > this.calmAt) {
      if (Math.abs(vx) > GENTLE) {
        this.panic();
      } else {
        // it comes with you, a little at a time, and up out of the mud as it comes
        this.hauling = true;
        const want = px - Math.sign(away) * ROPE;
        this.fawn.x += Math.max(-1.2, Math.min(1.2, want - this.fawn.x));
        const out = Math.min(1, Math.abs(this.fawn.x - this.x) / HAUL);
        this.fawn.y = this.sunk + (this.floor - this.sunk) * out;
        this.fawn.setFlipX(away > 0);                 // facing the way it's being led
        if (out >= 1) this.free();
      }
    }
    this.drawRope();
  }

  // the doe watches from a little way off, and gives ground if you come close
  keepDoeShy(px) {
    if (this.stage === 'free' || !this.doe.active) return;
    const want = Math.max(this.doeHome, Math.min(px + SHY, this.doeHome + 420));
    const step = Math.max(-2.2, Math.min(2.2, want - this.doe.x));
    if (Math.abs(step) > 0.4) {
      this.doe.x += step;
      this.doe.setFlipX(step > 0);
      this.doe.play('doe-walk', true);
    } else {
      this.doe.setFlipX(false);                       // looking back at her fawn
      this.doe.play('doe-idle', true);
    }
  }

  // pulled too hard: it thrashes and slides back to where it started
  panic() {
    const scene = this.scene;
    this.calmAt = scene.time.now + 1700;
    this.fawn.play('fawn-frightened');
    this.mudSplash(this.fawn.x, 8);
    scene.tweens.add({ targets: this.fawn, x: this.x, y: this.sunk, duration: 420, ease: 'Quad.in',
      onComplete: () => { if (this.stage === 'roped') this.fawn.play('fawn-idle'); } });
    scene.showThought('too hard — it panicked, and slid back in. slower.', 3400);
  }

  mudSplash(x, count) {
    const scene = this.scene;
    for (let i = 0; i < count; i++) {
      const drop = scene.add.rectangle(x + (Math.random() - 0.5) * 30, this.floor + 6, i % 2 ? 2 : 4, i % 2 ? 2 : 4, i % 2 ? 0x6c563f : 0x3d2e21).setDepth(9);
      scene.tweens.add({ targets: drop, x: drop.x + (Math.random() - 0.5) * 50, duration: 520 });
      scene.tweens.add({ targets: drop, y: drop.y - 18 - Math.random() * 24, duration: 260, yoyo: true, ease: 'Quad.out',
        onComplete: () => drop.destroy() });
    }
  }

  // the rope from your hand to the loop round its neck, sagging when it's slack
  drawRope() {
    const g = this.rope, p = this.scene.player;
    g.clear();
    if (this.stage !== 'roped') return;
    const x0 = p.x + (p.flipX ? 10 : -10), y0 = p.y + 6;
    const x1 = this.fawn.x + (this.fawn.flipX ? 12 : -12), y1 = this.fawn.y - 34;
    const sag = 4 + Math.max(0, ROPE - Math.abs(p.x - this.fawn.x)) * 0.4;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag;
    g.lineStyle(2, 0x8a6a3c, 1);
    g.beginPath();
    g.moveTo(Math.round(x0), Math.round(y0));
    for (let i = 1; i <= 14; i++) {
      const t = i / 14, u = 1 - t;
      g.lineTo(Math.round(u * u * x0 + 2 * u * t * mx + t * t * x1), Math.round(u * u * y0 + 2 * u * t * my + t * t * y1));
    }
    g.strokePath();
    g.lineStyle(2, 0xcfa868, 1);
    g.strokeEllipse(Math.round(x1), Math.round(y1 + 3), 12, 8);
  }

  // out. it shakes the mud off, and then its mother is there
  free() {
    const scene = this.scene, fawn = this.fawn, doe = this.doe;
    this.stage = 'free';
    this.done = true;
    this.hauling = false;
    this.rope.clear();
    fawn.setY(this.floor).play('fawn-idle');
    this.mudSplash(fawn.x, 10);
    scene.tweens.add({ targets: fawn, x: fawn.x + 3, duration: 70, yoyo: true, repeat: 5 });
    scene.addKindness(fawn.x, this.floor - 50);
    scene.showThought('there. out you come.', 3000);

    scene.time.delayedCall(1300, () => {
      // she comes to it — past you, if she has to — and noses it all over
      const side = doe.x > fawn.x ? 1 : -1;
      const meet = fawn.x + side * 50;
      doe.setFlipX(meet > doe.x).play('doe-walk');
      scene.tweens.add({ targets: doe, x: meet, duration: Math.max(500, Math.abs(meet - doe.x) * 5.5),
        onComplete: () => {
          doe.setFlipX(side < 0).play('doe-nose');
          fawn.setFlipX(side > 0);
          const heart = scene.guide.text((doe.x + fawn.x) / 2, this.floor - 96, '♥', { size: 4 }).setTint(0xe58a9a).setOrigin(0.5).setDepth(80);
          scene.tweens.add({ targets: heart, y: heart.y - 50, alpha: 0, duration: 1800, ease: 'Sine.out', onComplete: () => heart.destroy() });
          scene.time.delayedCall(1700, () => {
            // and then the two of them are away north, ahead of you
            this.boundAway(doe, 'doe', 0, 46);
            this.boundAway(fawn, 'fawn', 220, 30);
            scene.time.delayedCall(3200, () => { this.stage = 'gone'; });
          });
        } });
    });
  }

  // a deer leaving in long bounds, fading into the trees
  boundAway(deer, kind, delay, height) {
    const scene = this.scene;
    scene.time.delayedCall(delay, () => {
      deer.setFlipX(true).play(`${kind}-leap`);
      scene.tweens.add({ targets: deer, x: deer.x + 900, duration: 2600, ease: 'Sine.in' });
      scene.tweens.add({ targets: deer, y: this.floor - height, duration: 230, yoyo: true, repeat: 5, ease: 'Quad.out' });
      scene.tweens.add({ targets: deer, alpha: 0, duration: 700, delay: 1900, onComplete: () => deer.destroy() });
    });
  }
}
