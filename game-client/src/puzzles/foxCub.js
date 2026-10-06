// The fox cub in the hollow log — the first lesson in patience.
// It will not come out while you stand over it, and you can't make it.
// Leave it some bread, give it room, sit down and wait: it comes out on its own.
//
// The puzzle owns its sprites and its little state machine; ForestScene asks it
// for a prompt (offer), hands it actions (act) and ticks it (update).

const ROOM = 130;          // how far from the bread you have to be before it dares
const PEEK_MS = 2500;      // sitting still this long: it leans out to look
const COME_MS = 5200;      // ...this long: it comes out to the bread
const ART = 2;             // the forest's art is shown at 2x

export default class FoxCubPuzzle {
  constructor(scene, logX) {
    this.scene = scene;
    this.logX = logX;
    this.holeX = logX - 56;           // the middle of the hollow at the log's open end
    this.breadX = logX - 110;         // where you leave the bread
    this.sitX = this.breadX + 16;     // where the cub ends up
    this.stage = 'hiding';            // hiding → bread → peeking → coming → eating → done
    this.done = false;
    this.noticed = false;

    const y = scene.groundY;
    const art = (key, x, bottom, depth) =>
      scene.add.image(x, bottom, `woods-${key}`).setOrigin(0.5, 1).setScale(ART).setDepth(depth);

    this.cub = art('fox-cub', this.holeX + 14, y + 2, 5).setVisible(false);
    this.log = art('fox-log', logX, y + 6, 6);
    // grass against the log so it sits in the ground, not on it
    [-52, -8, 30, 58].forEach((dx, i) => art(i % 2 ? 'tuft-b' : 'tuft-a', logX + dx, y + 5, 7));
    this.eyes = scene.add.image(this.holeX, y - 20, 'woods-fox-eyes').setScale(ART).setDepth(7);
    scene.tweens.add({ targets: this.eyes, scaleY: 0.2, duration: 110, yoyo: true,
      repeat: -1, repeatDelay: 2600 });                              // a blink now and then
    this.bread = art('bread', this.breadX, y + 4, 6).setVisible(false);
  }

  // the world as a finished save left it
  restore() {
    this.stage = 'done';
    this.done = true;
    this.eyes.setVisible(false);
    this.settle();
  }

  farEnough(px) {
    return px <= this.breadX - ROOM || px >= this.logX + 90;
  }

  // what E would do here right now — { label, action }, a bare { label } hint, or null
  offer(px, onGround) {
    const scene = this.scene;
    if (this.done || scene.riding || scene.resting || !onGround) return null;
    if (this.stage === 'hiding') {
      if (Math.abs(px - this.logX) < 110 && (scene.inventory.bread || 0) > 0) {
        return { label: 'leave some bread by the log', action: 'fox-bread' };
      }
      return null;
    }
    if (this.stage === 'bread' && Math.abs(px - this.breadX) < 420) {
      if (!this.farEnough(px)) return { label: 'give it some room', hint: true };
      return { label: 'sit down and wait', action: 'fox-wait' };
    }
    return null;
  }

  act(action) {
    const scene = this.scene;
    if (action === 'fox-bread') {
      scene.inventory.bread -= 1;
      scene.player.play(`${scene.characterId}-crouch`);
      this.bread.setVisible(true).setAlpha(0);
      scene.tweens.add({ targets: this.bread, alpha: 1, duration: 300 });
      this.stage = 'bread';
      scene.showThought("i'll leave this here. it won't come out while i'm standing over it.", 4200);
      return true;
    }
    if (action === 'fox-wait') {
      // the same quiet sit as in the resting field — ForestScene handles getting up
      scene.resting = true;
      scene.restAtField = false;
      scene.restTimer = 0;
      scene.player.setVelocity(0, 0);
      scene.player.body.setAllowGravity(false);
      scene.player.setFlipX(scene.player.x > this.breadX);           // facing the log
      scene.player.play(`${scene.characterId}-rest`);
      return true;
    }
    return false;
  }

  update(px) {
    const scene = this.scene;
    if (this.done) return;
    const near = Math.abs(px - this.logX);

    if (this.stage === 'hiding' || this.stage === 'bread') {
      // it watches from the dark — and pulls back when you get close
      const shy = near < 95 ? 0 : 1;
      this.eyes.alpha += (shy - this.eyes.alpha) * 0.15;
      if (!this.noticed && near < 190) {
        this.noticed = true;
        scene.showThought('something small is hiding in that log. a fox cub — watching me.', 3800);
      }
    }

    const waiting = scene.resting && !scene.restAtField && this.farEnough(px);

    if (this.stage === 'bread' && waiting && scene.restTimer > PEEK_MS) {
      // its head comes out of the hollow to look at the bread — and at you.
      // only the head is drawn (the sprite is cropped), so the rest stays inside
      this.stage = 'peeking';
      this.eyes.setVisible(false);
      this.cub.setTexture('woods-fox-cub').setCrop(0, 0, 12, 19).setAlpha(1).setFlipX(false)
        .setPosition(this.holeX + 18, scene.groundY + 2).setVisible(true).setDepth(7);
      scene.tweens.add({ targets: this.cub, x: this.holeX + 5, duration: 900, ease: 'Sine.out' });
    } else if (this.stage === 'peeking' && waiting && scene.restTimer > COME_MS) {
      this.stage = 'coming';
      this.cub.setCrop();
      this.hop = scene.tweens.add({ targets: this.cub, y: scene.groundY - 5, duration: 170,
        yoyo: true, repeat: -1, ease: 'Sine.out' });
      scene.tweens.add({ targets: this.cub, x: this.sitX, duration: 1700, ease: 'Sine.inOut',
        onComplete: () => { if (this.stage === 'coming') this.eat(); } });
    } else if ((this.stage === 'peeking' || this.stage === 'coming') && !waiting) {
      this.bolt();
    }
  }

  // you moved too soon — back into the log, and you start the wait again
  bolt() {
    const scene = this.scene;
    this.stage = 'bread';
    scene.tweens.killTweensOf(this.cub);
    if (this.hop) { this.hop.stop(); this.hop = null; }
    this.cub.setY(scene.groundY + 2);
    scene.tweens.add({ targets: this.cub, x: this.holeX + 18, alpha: 0, duration: 320, ease: 'Quad.in',
      onComplete: () => {
        this.cub.setVisible(false);
        this.eyes.setVisible(true).setAlpha(0);
      } });
    scene.showThought('too soon. it needs me to stay still.', 2600);
  }

  eat() {
    const scene = this.scene;
    this.stage = 'eating';
    if (this.hop) { this.hop.stop(); this.hop = null; }
    this.cub.setY(scene.groundY + 2);
    scene.tweens.add({ targets: this.cub, angle: -12, duration: 220, yoyo: true, repeat: 3,
      onComplete: () => {
        this.cub.setAngle(0);
        scene.tweens.add({ targets: this.bread, alpha: 0, duration: 300,
          onComplete: () => this.bread.setVisible(false) });
        this.stage = 'done';
        this.done = true;
        this.settle();
        scene.addKindness(this.sitX, scene.groundY - 40);
        scene.showThought('it came out on its own. all it needed was room, and time.', 4600);
      } });
  }

  // fed and unafraid: it sits by the log and watches you go
  settle() {
    const scene = this.scene;
    this.bread.setVisible(false);
    this.cub.setTexture('woods-fox-cub-sit').setCrop().setAlpha(1).setPosition(this.sitX, scene.groundY + 2)
      .setVisible(true).setDepth(7).setAngle(0);
    scene.tweens.add({ targets: this.cub, scaleY: ART * 1.03, duration: 1500, yoyo: true,
      repeat: -1, ease: 'Sine.inOut' });                             // slow, easy breathing
  }

  // once it's out, it keeps its face toward you
  face(px) {
    if (this.done) this.cub.setFlipX(px > this.cub.x);
  }
}
