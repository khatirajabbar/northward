// The way down from the cat's cliff, the two of you together. The mushrooms
// are no way to go with a frightened cat in your arms, so at the far edge of
// the cliff top you loop your rope round the big rock, sit in it with the cat
// in your lap, and let yourselves down the rock face, facing it, feet against
// it: hold ↓ and the rope runs out, let go and you hang there. The rope stays
// up there round the rock, so once the cat is safe on the ground you go back
// up the mushrooms for it: you'll need it again further on.
//
// Like the puzzles, it owns its rope and its state; ForestScene asks it for a
// prompt (offer), hands it the action (act), and while you're on the rope
// lets it hold you (hang) and seat the cat in your lap (lap).
import { play } from '../audio/sound.js';
import { FOREST_SCALE } from '../characters/lpc.js';

const LOWER = 70;            // how fast the rope runs out while you hold ↓ (screen px a second)
const OFF_THE_EDGE = 26;     // how far out from the rock face you hang (your feet against it)
const SEAT_DROP = 24;        // how far below the lip you sit once you're over it

export default class CatRope {
  // rockX/waistY: where the rope goes round the rock; edgeX/topY: the lip of the cliff
  constructor(scene, { rockX, waistY, edgeX, topY }) {
    this.scene = scene;
    Object.assign(this, { rockX, waistY, edgeX, topY });
    this.stage = 'coiled';     // coiled (in your bag) → tied (round the rock) → back (in your bag again)
    this.lowering = false;
    this.reeled = 0;           // taking it back: how much of it you've drawn up
    this.line = scene.add.graphics().setDepth(8.5);    // in front of the rock, behind you
  }

  get done() { return this.stage !== 'coiled' && !this.lowering; }    // you're down
  get left() { return this.stage === 'tied' && !this.lowering; }      // …and the rope is still up there
  get taken() { return this.stage === 'back'; }

  // E would do this right now: { label, action }, or null
  offer(px) {
    const scene = this.scene, body = scene.player.body;
    if (this.lowering || scene.riding) return null;
    const onTop = body.blocked.down && body.bottom <= this.topY + 4;
    if (!onTop) return null;
    if (this.stage === 'coiled' && scene.carryingCat && px > this.edgeX - 90 && (scene.inventory.rope || 0) > 0) {
      return { label: 'let yourselves down on the rope', action: 'cat-rope' };
    }
    if (this.stage === 'tied' && !scene.carryingCat && Math.abs(px - this.rockX) < 120) {
      return { label: 'take your rope back', action: 'cat-rope-back' };
    }
    return null;
  }

  act(action) {
    const scene = this.scene, player = scene.player;
    if (action === 'cat-rope') {
      play(scene, 'rope');
      this.stage = 'tied';
      scene.inventory.rope = 0;                  // it's round the rock now
      this.lowering = true;
      this.halfway = false;
      // round the rock, and out over the edge: sitting in the rope just below
      // the lip, turned to the rock face with your feet against it
      player.body.setAllowGravity(false);
      player.body.reset(this.edgeX + OFF_THE_EDGE, player.y + SEAT_DROP);
      player.setFlipX(true);
      scene.showThought('round the rock, and over the edge. hold on tight.', 3200);
      return true;
    }
    if (action === 'cat-rope-back') {
      play(scene, 'rope', { volume: 0.7 });
      this.stage = 'back';
      scene.inventory.rope = 1;
      scene.showThought("there. i'll be needing that again.", 3000);
      // drawn up hand over hand, then off the rock
      scene.tweens.addCounter({ from: 0, to: 1, duration: 1100, ease: 'Sine.inOut',
        onUpdate: (tween) => { this.reeled = tween.getValue(); this.draw(); },
        onComplete: () => this.line.clear() });
      return true;
    }
    return false;
  }

  // every frame you're on the rope: ↓ lets it out, nothing else does anything
  hang() {
    const scene = this.scene, player = scene.player, body = player.body;
    const down = scene.cursors.down.isDown || scene.wasd.S.isDown;
    player.setVelocity(0, down ? LOWER : 0);
    player.setFlipX(true);
    const sit = `${scene.characterId}-sit`;
    if (player.anims.currentAnim?.key !== sit) player.play(sit);
    // hanging still, you sway a little on the rope
    player.setAngle(down ? 0 : Math.sin(scene.time.now / 520) * 2);
    if (!this.halfway && body.bottom > (this.topY + scene.groundY) / 2) {
      this.halfway = true;
      play(scene, 'meow', { volume: 0.6 });
      scene.showThought("nearly there. don't look down.", 2600);
    }
    if (body.blocked.down && body.bottom > scene.groundY - 20) this.land();
    this.draw();
  }

  // the cat sits in your lap on the way down, held in against you (so it's
  // behind your arms), looking at the rock as you are
  lap(cat) {
    const player = this.scene.player;
    cat.x = player.x - 11 * FOREST_SCALE;
    cat.y = player.y + 16 * FOREST_SCALE;
    cat.setFlipX(false).setDepth(9.6);
    if (cat.anims.currentAnim?.key !== 'cat-sit') cat.play('cat-sit');
  }

  // feet on the ground: off the rope. it stays up there, round the rock
  land() {
    const scene = this.scene, player = scene.player;
    this.lowering = false;
    player.body.setAllowGravity(true);
    player.setAngle(0).setFlipX(false).play(`${scene.characterId}-idle`);
    scene.catSprite.play('cat-held').setDepth(10.5);                 // back in your arms
    scene.showThought("we made it. my rope's still up there, round the rock. i'll go back for it.", 4200);
    this.draw();
  }

  // the rope: once round the rock, along the top to the lip, and down the
  // rock face, into your hands while you're on it, to the ground once you're
  // off. taking it back, it's drawn up the face and over the lip
  draw() {
    const g = this.line, p = this.scene.player, ground = this.scene.groundY;
    g.clear();
    if (this.stage === 'coiled' || this.reeled >= 1) return;
    const hangsTo = this.lowering
      ? [Math.round(p.x - 9 * FOREST_SCALE), Math.round(p.y + 2 * FOREST_SCALE)]        // your hands
      : [this.edgeX + 8, Math.round(ground - (ground - this.topY) * this.reeled)];       // the free end
    g.lineStyle(2, 0x8a6a3c, 1);
    g.beginPath();
    g.moveTo(this.rockX - 52, this.waistY + 4);
    [[this.rockX, this.waistY + 8], [this.rockX + 54, this.waistY + 4], [this.rockX + 62, this.topY - 2],
      [this.edgeX, this.topY - 2], [this.edgeX + 5, this.topY + 6], hangsTo].forEach(([x, y]) => g.lineTo(x, y));
    g.strokePath();
    if (this.lowering) {
      g.lineStyle(2, 0xcfa868, 1);
      g.strokeEllipse(Math.round(p.x + 2), Math.round(p.y + 13 * FOREST_SCALE), 26, 8);   // the seat
    } else if (this.reeled === 0) {
      g.lineStyle(2, 0x8a6a3c, 1);
      g.strokeEllipse(this.edgeX + 12, ground + 1, 16, 5);                                // the end of it, lying in the grass
    }
  }
}
