// The old stag under the oak — the one there is nothing to do for.
// He is lying down and he is not going to get up. You can give him water, and
// he drinks, and nothing changes. What's left is to sit down beside him and
// stay a while; that is the whole of it, and it is enough. The road's first
// taste of what the ending is about.
//
// Like the other puzzles it owns its sprites and its state; ForestScene asks
// it for a prompt (offer), hands it actions (act) and ticks it (update).

import { play } from '../audio/sound.js';

const ART = 2;             // the forest's art is shown at 2x
const STAY_MS = 9000;      // how long you sit before it has been enough

export default class OldStagPuzzle {
  constructor(scene, x) {
    this.scene = scene;
    this.x = x;
    this.stage = 'lying';       // lying → watered → done
    this.done = false;
    this.noticed = false;
    this.sat = 0;               // how long you've sat with him so far
    this.said = 0;              // how many of the sitting thoughts have come

    this.floor = scene.groundY + 2;
    this.stag = scene.add.sprite(x, this.floor, 'woods-stag').setOrigin(0.5, 1).setScale(ART).setDepth(6);
    this.stag.play('stag-watching');
    this.dish = scene.add.image(x - 64, this.floor + 2, 'woods-dish').setOrigin(0.5, 1).setScale(ART).setDepth(7).setVisible(false);
  }

  // the world as a finished save left it: asleep under his tree, the bowl beside him
  restore() {
    this.stage = 'done';
    this.done = true;
    this.dish.setVisible(true);
    this.stag.play('stag-asleep');
  }

  // what E would do here right now — { label, action } or null
  offer(px, onGround) {
    const scene = this.scene;
    if (scene.resting || !onGround) return null;
    const near = Math.abs(px - this.x);
    // the bowl goes down in front of him, so that's where you offer it from
    if (this.stage === 'lying' && px > this.x - 160 && px < this.x - 10 && (scene.inventory.water || 0) > 0) {
      return { label: 'offer him some water', action: 'stag-water' };
    }
    if (this.stage !== 'lying' && near < 170) return { label: 'sit with him a while', action: 'stag-sit' };
    return null;
  }

  act(action) {
    const scene = this.scene;
    if (action === 'stag-water') {
      scene.inventory.water -= 1;
      scene.player.setVelocityX(0);
      scene.player.setFlipX(this.x < scene.player.x);
      scene.player.play(`${scene.characterId}-crouch`);
      this.stage = 'watered';
      this.dish.setVisible(true).setAlpha(0);
      scene.tweens.add({ targets: this.dish, alpha: 1, duration: 300 });
      // he lowers his head to it, drinks, and lifts it again. that is all that happens
      scene.time.delayedCall(700, () => { this.stag.play('stag-drinking'); play(scene, 'drink'); });
      scene.time.delayedCall(3000, () => { if (this.said === 0) this.stag.play('stag-watching'); });
      scene.showThought("he drinks, a little. but he doesn't get up.", 3400);
      scene.time.delayedCall(4600, () => { if (!this.done && !scene.resting) scene.showThought("he isn't hurt. he's just very old.", 3600); });
      return true;
    }
    if (action === 'stag-sit') {
      // the same quiet sit as everywhere else — ForestScene handles getting up
      scene.resting = true;
      scene.restAtField = false;
      scene.restTimer = 0;
      scene.player.setVelocity(0, 0);
      scene.player.body.setAllowGravity(false);
      scene.player.setFlipX(scene.player.x > this.x);          // turned toward him
      scene.player.play(`${scene.characterId}-rest`);
      return true;
    }
    return false;
  }

  update(px) {
    const scene = this.scene;
    if (!this.noticed && !this.done && Math.abs(px - this.x) < 300) {
      this.noticed = true;
      scene.showThought("an old stag, lying under the oak. he doesn't run from me.", 4200);
    }
    if (this.done || this.stage === 'lying') return;
    const sitting = scene.resting && !scene.restAtField && Math.abs(px - this.x) < 200;
    if (!sitting) return;

    this.sat += scene.game.loop.delta;
    // a leaf comes down from the oak now and then
    if (Math.random() < 0.012) this.leaf();
    const beats = [
      [2400, () => { this.stag.play('stag-tired'); scene.showThought("there's nothing here for me to fix.", 3200); }],
      [5600, () => { this.stag.play('stag-asleep'); scene.showThought("so i'll stay a while.", 3000); }],
      [STAY_MS, () => {
        this.stage = 'done';
        this.done = true;
        scene.addKindness(this.x, this.floor - 70);
        scene.showThought('that was all he needed. not to be alone.', 4600);
      }]
    ];
    while (this.said < beats.length && this.sat >= beats[this.said][0]) {
      beats[this.said][1]();
      this.said += 1;
    }
  }

  leaf() {
    const scene = this.scene;
    const x = this.x + (Math.random() - 0.3) * 260, y = this.floor - 190 - Math.random() * 40;
    const leaf = scene.add.rectangle(x, y, 4, 2, Math.random() < 0.5 ? 0x8a9a4a : 0xc2a24a).setDepth(9);
    scene.tweens.add({ targets: leaf, x: x - 30 - Math.random() * 40, duration: 3800, ease: 'Sine.inOut' });
    scene.tweens.add({ targets: leaf, y: this.floor - 2, angle: 180, duration: 3800, ease: 'Sine.in',
      onComplete: () => scene.tweens.add({ targets: leaf, alpha: 0, duration: 1500, onComplete: () => leaf.destroy() }) });
  }
}
