// The way down from the cat's cliff, the two of you together. The mushrooms
// are no way to go with a frightened cat in your arms, so at the far edge of
// the cliff top you loop your rope round the big rock, doubled, both ends over
// the edge, the way climbers do. You sit in it with the cat in your lap and let
// yourselves down the rock face, facing it, feet against it: hold ↓ and the
// rope runs out, let go and you hang there. Once the cat is safe on the ground
// you pull on one end, and the whole rope runs up the face, round the rock and
// comes down to you: you'll need it again further on. (Climb back up and you
// can still take it off the rock by hand.)
//
// Like the puzzles, it owns its rope and its state; ForestScene asks it for a
// prompt (offer), hands it the action (act), and while you're on the rope
// lets it hold you (hang) and seat the cat in your lap (lap), and while you
// pull it down, keeps you hauling (haul).
import { play } from '../audio/sound.js';
import { FOREST_SCALE } from '../characters/lpc.js';

const LOWER = 70;            // how fast the rope runs out while you hold ↓ (screen px a second)
const OFF_THE_EDGE = 26;     // how far out from the rock face you hang (your feet against it)
const SEAT_DROP = 24;        // how far below the lip you sit once you're over it
const PULL_MS = 2600;        // hauling it up the face, round the rock and back to the lip
const FALL_MS = 450;         // the last of it dropping off the edge to you
const ROPE = 0x8a6a3c;

// the rope's points from `d` along it to its end: what's left of it once its
// far end has run `d` round the rock
function from(points, d) {
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (d <= len) {
      const t = len ? d / len : 0;
      return [[x0 + (x1 - x0) * t, y0 + (y1 - y0) * t], ...points.slice(i)];
    }
    d -= len;
  }
  return points.slice(-1);
}

// how long the rope is from its start to point `n`
function lengthTo(points, n) {
  let len = 0;
  for (let i = 1; i <= n; i++) len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return len;
}

function stroke(g, points) {
  g.beginPath();
  g.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));
  points.slice(1).forEach(([x, y]) => g.lineTo(Math.round(x), Math.round(y)));
  g.strokePath();
}

export default class CatRope {
  // rockX/waistY: where the rope goes round the rock; edgeX/topY: the lip of the cliff
  constructor(scene, { rockX, waistY, edgeX, topY }) {
    this.scene = scene;
    Object.assign(this, { rockX, waistY, edgeX, topY });
    this.stage = 'coiled';     // coiled (in your bag) → tied (round the rock) → back (in your bag again)
    this.lowering = false;
    this.reeled = 0;           // taking it back from up top: how much of it you've drawn up
    this.pulling = false;      // pulling it down from below…
    this.pulled = 0;           // …how far its far end has run round the rock
    this.falling = 0;          // …and the last of it coming down off the edge
    this.line = scene.add.graphics().setDepth(8.5);    // in front of the rock, behind you
  }

  get done() { return this.stage !== 'coiled' && !this.lowering; }    // you're down
  get left() { return this.stage === 'tied' && !this.lowering; }      // …and the rope is still up there
  get taken() { return this.stage === 'back'; }
  get footX() { return this.edgeX + 14; }                              // where its two ends lie, at the foot of the face

  // E would do this right now: { label, action }, or null
  offer(px) {
    const scene = this.scene, body = scene.player.body;
    if (this.lowering || this.pulling || scene.riding || !body.blocked.down) return null;
    if (body.bottom <= this.topY + 4) {                                  // up on the cliff top
      if (this.stage === 'coiled' && scene.carryingCat && px > this.edgeX - 90 && (scene.inventory.rope || 0) > 0) {
        return { label: 'let yourselves down on the rope', action: 'cat-rope' };
      }
      if (this.stage === 'tied' && !scene.carryingCat && Math.abs(px - this.rockX) < 120) {
        return { label: 'take your rope back', action: 'cat-rope-back' };
      }
      return null;
    }
    // down at the foot of the face, hands free: pull it down after you
    if (this.stage === 'tied' && !scene.carryingCat && body.bottom > scene.groundY - 20 && Math.abs(px - this.footX) < 60) {
      return { label: 'pull one end: it slides round the rock', action: 'cat-rope-pull' };
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
    if (action === 'cat-rope-pull') {
      // one end in both hands, hand over hand: the other end runs up the face,
      // along the top, round the rock and back, and the last of it drops to you
      play(scene, 'rope', { volume: 0.7 });
      this.pulling = true;
      this.pulled = 0;
      this.falling = 0;
      player.setVelocity(0, 0);
      player.setFlipX(this.footX < player.x);
      player.play(`${scene.characterId}-haul`);
      scene.tweens.addCounter({ from: 0, to: 1, duration: PULL_MS, ease: 'Sine.inOut',
        onUpdate: (tween) => { this.pulled = tween.getValue(); },
        onComplete: () => {
          play(scene, 'rope', { volume: 0.5 });
          scene.tweens.addCounter({ from: 0, to: 1, duration: FALL_MS, ease: 'Quad.in',
            onUpdate: (tween) => { this.falling = tween.getValue(); },
            onComplete: () => {
              this.pulling = false;
              this.stage = 'back';
              this.reeled = 1;
              scene.inventory.rope = 1;
              this.line.clear();
              player.play(`${scene.characterId}-idle`);
              scene.showThought("there. i'll be needing that again.", 3000);
            } });
        } });
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

  // every frame you're pulling it down: you stand and haul, and that's all
  haul() {
    const player = this.scene.player, haul = `${this.scene.characterId}-haul`;
    player.setVelocityX(0);
    if (player.anims.currentAnim?.key !== haul) player.play(haul);
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

  // feet on the ground: off the rope. it stays doubled round the rock, both
  // ends lying at the foot of the face, till you pull it down
  land() {
    const scene = this.scene, player = scene.player;
    this.lowering = false;
    player.body.setAllowGravity(true);
    player.setAngle(0).setFlipX(false).play(`${scene.characterId}-idle`);
    scene.catSprite.play('cat-held').setDepth(10.5);                 // back in your arms
    scene.showThought('we made it. if i pull one end, the rope slides round the rock and comes down to me.', 4600);
    this.draw();
  }

  // the rope, doubled: up from one end at the foot of the face, over the lip,
  // along the top, round behind the rock and back, over the lip again and down
  // to the other end. `a` and `b` are where its two ends are
  path(a, b) {
    const { rockX, waistY, topY, edgeX } = this;
    return [a,
      [edgeX + 5, topY + 6], [edgeX, topY - 2], [rockX + 62, topY - 2], [rockX + 54, waistY + 4], [rockX, waistY + 8], [rockX - 52, waistY + 4],
      [rockX - 50, waistY + 8], [rockX, waistY + 11], [rockX + 54, waistY + 7], [rockX + 62, topY + 1], [edgeX + 2, topY + 1], [edgeX + 9, topY + 7],
      b];
  }

  // on the way down both ends are in your hands; once you're off, they lie in
  // the grass; taken back from up top, they're drawn up the face and over the
  // lip; pulled from below, the far end runs round the rock and comes down
  draw() {
    const g = this.line, p = this.scene.player, ground = this.scene.groundY;
    g.clear();
    if (this.stage === 'coiled' || this.reeled >= 1) return;
    g.lineStyle(2, ROPE, 1);
    if (this.pulling) { this.drawPull(g, p, ground); return; }
    if (this.lowering) {
      const hands = [Math.round(p.x - 9 * FOREST_SCALE), Math.round(p.y + 2 * FOREST_SCALE)];
      stroke(g, this.path(hands, hands));
      g.lineStyle(2, 0xcfa868, 1);
      g.strokeEllipse(Math.round(p.x + 2), Math.round(p.y + 13 * FOREST_SCALE), 26, 8);   // the seat
      return;
    }
    const endY = Math.round(ground - (ground - this.topY) * this.reeled);
    stroke(g, this.path([this.edgeX + 8, endY], [this.edgeX + 14, endY]));
    if (this.reeled === 0) g.strokeEllipse(this.edgeX + 11, ground + 1, 18, 5);   // the ends of it, lying in the grass
  }

  drawPull(g, p, ground) {
    const dir = p.flipX ? -1 : 1;
    const hands = [Math.round(p.x + dir * 10 * FOREST_SCALE), Math.round(p.y + 2 * FOREST_SCALE)];
    const whole = this.path([this.edgeX + 8, ground], hands);
    const lip = whole.length - 3;                         // over the lip on the near side
    const rope = this.falling > 0
      ? [[this.edgeX + 9, this.topY + 7 + (ground - this.topY - 7) * this.falling], hands]
      : from(whole, this.pulled * lengthTo(whole, lip));
    stroke(g, rope);
    // what you've drawn in piles up at your feet
    const coils = Math.ceil((this.pulled * 0.8 + this.falling * 0.2) * 3);
    for (let i = 0; i < coils; i++) g.strokeEllipse(Math.round(p.x + dir * 16), ground - i * 2, 18 - i * 3, 5);
  }
}
