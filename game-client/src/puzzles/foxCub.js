// The fox cub in the hollow log — the first lesson in patience.
// It will not come out while you stand over it, and you can't make it.
// Leave it some bread, give it room, sit down and wait: it comes out on its own.
//
// The puzzle owns its sprites and its little state machine; ForestScene asks it
// for a prompt (offer), hands it actions (act) and ticks it (update).

const ROOM = 130;          // how far from the bread you have to be before it dares
const PEEK_MS = 2500;      // sitting still this long: it leans out to look
const COME_MS = 5200;      // ...this long: it comes out to the bread

function makeTextures(scene) {
  const make = (cb, w, h, key) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    cb(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  // an old fallen log, hollow at the left end, moss along the top
  make((g) => {
    g.fillStyle(0x2c332e, 0.6);
    g.fillEllipse(48, 33, 88, 6);                                    // contact shadow
    g.fillStyle(0x5a4a34);
    g.fillRoundedRect(10, 6, 82, 26, 10);                            // trunk
    g.fillStyle(0x453724);
    g.fillRect(16, 24, 72, 6);                                       // shaded underside
    g.fillRect(34, 10, 2, 16); g.fillRect(58, 12, 2, 14); g.fillRect(76, 9, 2, 15);   // bark cracks
    g.fillStyle(0x6d5b40);
    g.fillRect(18, 9, 66, 3);                                        // lit top edge
    g.fillStyle(0x6d5b40);
    g.fillEllipse(13, 19, 22, 28);                                   // the open end — rim
    g.fillStyle(0x1c1712);
    g.fillEllipse(13, 19, 15, 21);                                   // the hollow
    g.fillStyle(0x4f815b);
    g.fillEllipse(44, 7, 30, 6); g.fillEllipse(72, 7, 16, 5);        // moss
    g.fillStyle(0x5f9668);
    g.fillEllipse(40, 6, 14, 3);
    g.fillStyle(0x5a4a34);
    g.fillTriangle(88, 12, 96, 4, 92, 16);                           // a broken branch stub
  }, 98, 38, 'fox-log');

  // two eyes in the dark
  make((g) => {
    g.fillStyle(0xf2d9a0);
    g.fillRect(0, 0, 2, 2); g.fillRect(6, 0, 2, 2);
  }, 8, 2, 'fox-eyes');

  // fox cub, standing, facing left — small, round, big ears, white tail tip
  const cub = (g, sitting) => {
    const rust = 0xc8692e, dark = 0x9c4d20, cream = 0xf1e4cf, ink = 0x2b2620;
    if (sitting) {
      g.fillStyle(rust);
      g.fillEllipse(17, 19, 16, 16);                                 // haunches, upright
      g.fillStyle(dark);
      g.fillEllipse(25, 24, 12, 5);                                  // tail curled round
      g.fillStyle(cream);
      g.fillEllipse(30, 24, 5, 4);                                   // tail tip
      g.fillEllipse(13, 20, 6, 9);                                   // chest
      g.fillStyle(ink);
      g.fillRect(10, 24, 3, 3); g.fillRect(15, 24, 3, 3);            // front paws
    } else {
      g.fillStyle(dark);
      g.fillRect(12, 20, 3, 7); g.fillRect(22, 20, 3, 7);            // far legs
      g.fillStyle(rust);
      g.fillEllipse(18, 17, 20, 10);                                 // body
      g.fillRect(9, 20, 3, 6); g.fillRect(19, 20, 3, 6);             // near legs
      g.fillStyle(ink);
      g.fillRect(9, 25, 3, 2); g.fillRect(19, 25, 3, 2);             // dark socks
      g.fillRect(12, 25, 3, 2); g.fillRect(22, 25, 3, 2);
      g.fillStyle(rust);
      g.fillPoints([{ x: 26, y: 14 }, { x: 34, y: 9 }, { x: 35, y: 15 }, { x: 28, y: 19 }], true);   // tail
      g.fillStyle(cream);
      g.fillEllipse(34, 11, 5, 6);                                   // tail tip
    }
    g.fillStyle(rust);
    g.fillEllipse(9, 11, 13, 11);                                    // head
    g.fillTriangle(4, 8, 8, 7, 5, 0);                                // ear
    g.fillTriangle(10, 7, 14, 8, 13, 0);                             // ear
    g.fillStyle(ink);
    g.fillTriangle(5, 6, 7, 6, 5.5, 2);                              // ear tips
    g.fillTriangle(11, 6, 13, 6, 12.5, 2);
    g.fillStyle(cream);
    g.fillEllipse(6, 13, 8, 5);                                      // muzzle
    g.fillStyle(ink);
    g.fillRect(2, 12, 2, 2);                                         // nose
    g.fillRect(6, 9, 2, 2); g.fillRect(11, 9, 2, 2);                 // eyes
  };
  make((g) => cub(g, false), 38, 28, 'fox-cub');
  make((g) => cub(g, true), 34, 28, 'fox-cub-sit');
}

export default class FoxCubPuzzle {
  constructor(scene, logX) {
    this.scene = scene;
    this.logX = logX;
    this.holeX = logX - 54;           // the middle of the hollow at the log's open end
    this.breadX = logX - 110;         // where you leave the bread
    this.sitX = this.breadX + 16;     // where the cub ends up
    this.stage = 'hiding';            // hiding → bread → peeking → coming → eating → done
    this.done = false;
    this.noticed = false;

    makeTextures(scene);
    const y = scene.groundY;

    this.cub = scene.add.image(this.holeX + 14, y + 2, 'fox-cub')
      .setOrigin(0.5, 1).setScale(1.3).setDepth(5).setVisible(false);
    this.log = scene.add.image(logX, y + 6, 'fox-log').setOrigin(0.5, 1).setScale(1.5).setDepth(6);
    // grass against the log so it sits in the ground, not on it
    [-52, -8, 30, 58].forEach((dx, i) => {
      scene.add.image(logX + dx, y + 5, 'tallgrass-day')
        .setOrigin(0.5, 1).setScale(0.2 + (i % 2) * 0.08).setDepth(7);
    });
    this.eyes = scene.add.image(this.holeX + 1, y - 26, 'fox-eyes').setScale(1.5).setDepth(7);
    scene.tweens.add({ targets: this.eyes, scaleY: 0.2, duration: 110, yoyo: true,
      repeat: -1, repeatDelay: 2600 });                              // a blink now and then
    this.bread = scene.add.image(this.breadX, y + 3, 'bread')
      .setOrigin(0.5, 1).setScale(0.9).setDepth(6).setVisible(false);
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
      this.cub.setTexture('fox-cub').setCrop(0, 0, 15, 28).setAlpha(1).setFlipX(false)
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
    this.cub.setTexture('fox-cub-sit').setCrop().setAlpha(1).setPosition(this.sitX, scene.groundY + 2)
      .setVisible(true).setDepth(7).setAngle(0);
    scene.tweens.add({ targets: this.cub, scaleY: 1.34, duration: 1500, yoyo: true,
      repeat: -1, ease: 'Sine.inOut' });                             // slow, easy breathing
  }

  // once it's out, it keeps its face toward you
  face(px) {
    if (this.done) this.cub.setFlipX(px > this.cub.x);
  }
}
