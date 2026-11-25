// The owl chick that fell out of its nest.
//
// In the pine wood after the fawn, an old dead aspen stands partway up a rise
// in the road, with a hollow high up in it where a pair of tawny owls nest.
// One of the chicks has fallen out. It sits at the foot of the tree, calling,
// with its mother watching from the branch above the hole. The hole is far too
// high to reach from the ground.
//
// Down at the bottom of the rise stands an old handcart. Walk into it and it
// goes ahead of you, slowly; push it up under the tree and you'd have
// something to stand on. But let go of it on the slope and it rolls back down.
// A flat stone lies by the tree: carry it to the cart and wedge it under the
// wheel, and the cart stays where it is. Then pick up the chick, climb up on
// the cart, and put it back in the hole.
//
// Like the other puzzles it owns its sprites and its state; ForestScene asks
// it for a prompt (offer), hands it actions (act), ticks it (update), and asks
// how fast you may go (pace).

import { stretch } from '../world/road.js';
import { play } from '../audio/sound.js';
import { FOREST_SCALE } from '../characters/lpc.js';

const ART = 2;                 // the forest's art is shown at 2x
const TREE = 330;              // where the tree is, in from the start of its stretch (on the rise)
const CART_AT = 90;            // where the cart is left, at the bottom of the rise
const STONE_AT = 430;          // the loose stone, just up the rise from the tree
const CHICK_DX = 44;           // the chick, at the tree's foot
// the tree's picture (tools/forest-art.mjs: OWL_TREE), on screen
const HOLE_UP = 68 * ART, HOLE_DX = -1 * ART, PERCH_UP = 84 * ART, PERCH_DX = 18;
// the cart's picture (tools/forest-art.mjs: CART): its box, where you can stand,
// from the cart's middle; and its wheel
const BOX = [-24, 40], BOX_UP = 21 * ART;
const AXLE_DX = 8, AXLE_UP = 9 * ART, WHEEL_R = 8.6 * ART;
const PUSH = 80;               // how fast you can push it (px a second)
const ROLL = 260;              // how hard it rolls down a slope
const ROLL_MAX = 200;          // …and how fast it can get
const REACH = 34;              // how near the hole you have to be to put the chick in
const NEAR = 40;               // how near the chick or the stone to pick it up
const STILL = 0.012;           // slopes gentler than this, it doesn't roll

export default class OwlPuzzle {
  constructor(scene) {
    this.scene = scene;
    const { from, to } = stretch('past-the-mud');
    this.from = from;
    this.to = to;
    this.treeX = from + TREE;
    this.holeX = this.treeX + HOLE_DX;
    this.done = false;
    this.holding = null;         // what's in your hands: 'stone', 'chick' or nothing
    this.wedged = false;         // the stone's under the wheel
    this.v = 0;                  // the cart rolling, px a second
    this.said = {};
    this.callAt = 0;

    const floor = (x) => scene.hills.surfaceAt(x);
    this.floor = floor;
    const g = floor(this.treeX);
    this.holeY = g - HOLE_UP;

    // the tree, the mother on her branch, the chick at its foot
    scene.add.image(this.treeX, g + 4, 'woods-owl-tree').setOrigin(0.5, 1).setScale(ART).setDepth(4.5);
    this.mother = scene.add.sprite(this.treeX + PERCH_DX, g + 2 - PERCH_UP, 'woods-tawny').setOrigin(0.5, 1).setScale(ART).setDepth(4.6).play('tawny-watch');
    this.chickHome = this.treeX + CHICK_DX;
    this.chick = scene.add.sprite(this.chickHome, floor(this.chickHome) + 2, 'woods-owlet').setOrigin(0.5, 1).setScale(ART).setDepth(6).play('owlet-sit');

    // the stone
    this.stone = scene.add.image(from + STONE_AT, floor(from + STONE_AT) + 2, 'woods-wedge-stone').setOrigin(0.5, 1).setScale(ART).setDepth(6);
    this.stoneX = from + STONE_AT;

    // the cart: its picture, its wheel, and a box you bump into and stand on
    this.x = from + CART_AT;
    this.cart = scene.add.image(this.x, 0, 'woods-handcart').setOrigin(0.5, 1).setScale(ART).setDepth(7);
    this.wheel = scene.add.image(this.x, 0, 'woods-cart-wheel').setScale(ART).setDepth(7.1);
    this.box = scene.add.rectangle(0, 0, BOX[1] - BOX[0], BOX_UP).setVisible(false);
    scene.physics.add.existing(this.box, true);
    scene.physics.add.collider(scene.player, this.box);
    this.moveCart(0);
  }

  // the world as a finished save left it: the chick home, the cart where you left it
  restore() {
    this.done = true;
    this.chick.setVisible(false);
  }

  // ── the cart ──

  slopeAt(x) { return (this.floor(x + 12) - this.floor(x - 12)) / 24; }    // > 0: the road goes down to the right

  // move the cart by dx, and carry you along if you're standing on it
  moveCart(dx) {
    const scene = this.scene, player = scene.player;
    if (dx && this.onCart()) player.x += dx;
    this.x = Math.max(this.from + 40, Math.min(this.to - 80, this.x + dx));
    const y = this.floor(this.x) + 2, tilt = Math.atan(this.slopeAt(this.x));
    this.cart.setPosition(this.x, y).setRotation(tilt);
    this.wheel.setPosition(this.x + AXLE_DX, this.floor(this.x + AXLE_DX) + 2 - AXLE_UP);
    this.wheel.rotation += dx / WHEEL_R;
    // the box you stand on: level, at the height of the cart's rim where you are
    const top = this.floor(this.x + (BOX[0] + BOX[1]) / 2) + 2 - BOX_UP;
    this.box.setPosition(this.x + (BOX[0] + BOX[1]) / 2, top + BOX_UP / 2);
    this.box.body.updateFromGameObject();
    this.top = top;
  }

  onCart() {
    const body = this.scene.player.body;
    return body.bottom <= this.top + 4 && body.right > this.x + BOX[0] && body.left < this.x + BOX[1];
  }

  // which side of the cart you're up against, on the ground: -1 its left, 1 its right, 0 neither
  against() {
    const body = this.scene.player.body;
    if (this.onCart() || body.bottom < this.floor(this.scene.player.x) - 6) return 0;
    if (Math.abs(body.right - (this.x + BOX[0])) < 6) return -1;
    if (Math.abs(body.left - (this.x + BOX[1])) < 6) return 1;
    return 0;
  }

  underHole() { return Math.abs(this.x + (BOX[0] + BOX[1]) / 2 - this.holeX) < 26; }

  // ── where things are, and what E does ──

  // the marker: whatever wants doing next — the cart under the tree, the
  // stone under its wheel, the chick, the hole
  where() {
    if (this.done) return null;
    const g = this.scene.groundY;
    if (this.holding === 'chick') return [this.holeX, this.holeY - 30];
    if (!this.underHole()) return [this.x, this.top - 40];
    if (!this.wedged && Math.abs(this.slopeAt(this.x)) > STILL) return this.holding === 'stone' ? [this.x + BOX[0], this.top - 40] : [this.stoneX, g - 40];
    return [this.chick.x, g - 50];
  }

  offer(px, onGround) {
    const scene = this.scene;
    if (this.done || scene.riding || scene.resting) return null;
    const side = this.against();
    if (this.holding === 'chick') {
      if (this.onCart() && Math.abs(px - this.holeX) < REACH) return { label: 'put it back in the nest', action: 'owl-home' };
      if (!this.onCart() && Math.abs(px - this.holeX) < 60) return { label: "too high — i'll need something to stand on", keys: [], hint: true };
      // one thing in your hands at a time: by the stone, put the chick down first
      if (onGround && !this.wedged && Math.abs(px - this.stoneX) < NEAR) return { label: 'put the chick down first', action: 'owl-putchick' };
      return null;
    }
    if (!onGround) return null;
    if (this.holding === 'stone') {
      if (side) return { label: 'wedge the wheel', action: 'owl-wedge' };
      if (Math.abs(px - this.chick.x) < NEAR) return { label: 'put the stone down first', action: 'owl-drop' };
      return null;
    }
    if (this.wedged && side) return { label: 'take the stone out', action: 'owl-unwedge' };
    if (!this.wedged && this.stone.visible && Math.abs(px - this.stoneX) < NEAR) return { label: 'pick up the stone', action: 'owl-stone' };
    if (Math.abs(px - this.chick.x) < NEAR) return { label: 'pick up the owl chick', action: 'owl-chick' };
    return null;
  }

  act(action) {
    const scene = this.scene, player = scene.player;
    const crouch = () => { player.setVelocityX(0); player.play(`${scene.characterId}-crouch`); };
    if (action === 'owl-stone') {
      crouch();
      this.holding = 'stone';
      this.stone.setDepth(10.5);
      if (!this.said.stone) { this.said.stone = true; scene.showThought('this would do, under a wheel.', 2600); }
      return true;
    }
    if (action === 'owl-drop') {
      crouch();
      this.holding = null;
      this.stoneX = player.x + (player.flipX ? -14 : 14);
      this.stone.setPosition(this.stoneX, this.floor(this.stoneX) + 2).setDepth(6).setAngle(0);
      return true;
    }
    if (action === 'owl-wedge') {
      crouch();
      this.holding = null;
      this.wedged = true;
      this.v = 0;
      this.placeStone();
      play(scene, 'crunch', { volume: 0.4 });
      if (!this.said.wedged) { this.said.wedged = true; scene.showThought("that'll hold it.", 2400); }
      return true;
    }
    if (action === 'owl-unwedge') {
      crouch();
      this.wedged = false;
      this.holding = 'stone';
      this.stone.setDepth(10.5);
      return true;
    }
    if (action === 'owl-chick') {
      crouch();
      this.holding = 'chick';
      this.chick.play('owlet-sit').setDepth(10.5);
      play(scene, 'chirp', { volume: 0.4, vary: 0.2 });
      if (!this.said.held) {
        this.said.held = true;
        scene.showThought('light as anything. all fluff.', 2600);
      }
      return true;
    }
    if (action === 'owl-putchick') {
      crouch();
      this.holding = null;
      const x = player.x + (player.flipX ? -16 : 16);
      this.chick.setPosition(x, this.floor(x) + 2).setDepth(6).setFlipX(false).play('owlet-sit');
      return true;
    }
    if (action === 'owl-home') {
      this.home();
      return true;
    }
    return false;
  }

  // the stone under the wheel, on its downhill side
  placeStone() {
    const down = this.slopeAt(this.x) >= 0 ? 1 : -1;
    this.stoneX = this.x + AXLE_DX + down * (WHEEL_R + 6);
    this.stone.setPosition(this.stoneX, this.floor(this.stoneX) + 2).setDepth(7.2).setAngle(0);
  }

  // in your hands, in front of you: `up` is how far below your middle its
  // bottom is, `ahead` how far in front of you
  carry(sprite, up, ahead = 9) {
    const player = this.scene.player, way = player.flipX ? -1 : 1;
    sprite.setPosition(player.x + way * ahead * FOREST_SCALE, player.y + up * FOREST_SCALE);
  }

  // up into the hole it goes, and its mother comes to see
  home() {
    const scene = this.scene, chick = this.chick, mother = this.mother, player = scene.player;
    this.done = true;
    this.holding = null;
    player.setVelocityX(0);
    player.setFlipX(this.holeX < player.x);
    // in at the hole; then only its face shows, looking out
    chick.setFlipX(false);
    scene.tweens.add({ targets: chick, x: this.holeX, y: this.holeY + 21, duration: 380, ease: 'Sine.out',
      onComplete: () => {
        chick.setDepth(4.55).setCrop(0, 0, 14, 9).play('owlet-sit');
        play(scene, 'chirp', { volume: 0.5, vary: 0.2 });
      } });
    // its mother, up on her branch, ruffles and settles
    scene.time.delayedCall(700, () => {
      mother.play('tawny-fly');
      play(scene, 'wings', { volume: 0.6 });
      scene.tweens.add({ targets: mother, y: mother.y - 8, duration: 200, yoyo: true, repeat: 1, ease: 'Quad.out',
        onComplete: () => mother.play('tawny-watch') });
    });
    scene.addKindness(this.holeX, this.holeY - 20);
    scene.showThought('back in. and its mother right there beside it.', 3400);
  }

  update(px) {
    const scene = this.scene, player = scene.player, now = scene.time.now;
    const dt = Math.min(50, scene.game.loop.delta) / 1000;

    if (!this.said.seen && px > this.treeX - 520 && px < this.treeX + 200) {
      this.said.seen = true;
      scene.showThought('an owl chick, fallen out of its nest — and its mother up there, watching. the hole is far too high to reach.', 5200);
    }
    if (!this.done && !this.said.cart && Math.abs(px - this.x) < 120 && this.said.seen) {
      this.said.cart = true;
      scene.showThought("an old handcart. under that tree, it'd be something to stand on.", 3800);
    }
    // the chick calls for its mother now and then
    if (!this.done && this.holding !== 'chick' && now > this.callAt && Math.abs(px - this.chick.x) < 700) {
      this.callAt = now + 2600 + Math.random() * 2400;
      this.chick.play('owlet-call');
      play(scene, 'chirp', { volume: 0.3, vary: 0.25, pan: Math.max(-1, Math.min(1, (this.chick.x - px) / 600)) });
      scene.time.delayedCall(500, () => { if (this.holding !== 'chick' && !this.done) this.chick.play('owlet-sit'); });
    }

    // what's in your hands goes where you go
    // the stone is heavy: held low in both hands, against you, not up by your face
    if (this.holding === 'stone') this.carry(this.stone, 20, 5);
    if (this.holding === 'chick') { this.carry(this.chick, 16); this.chick.setFlipX(player.flipX); }

    // pushing: walking into it, on the ground, and it isn't wedged
    const side = this.against();
    const left = scene.cursors.left.isDown || scene.wasd.A.isDown, right = scene.cursors.right.isDown || scene.wasd.D.isDown;
    const pushing = (side === -1 && right) ? 1 : (side === 1 && left) ? -1 : 0;
    this.pushing = pushing;
    if (pushing && this.wedged) {
      if (!this.said.stuck) { this.said.stuck = true; scene.showThought("it won't budge with the stone under the wheel.", 2600); }
      return;
    }
    if (pushing) {
      this.v = 0;
      this.moveCart(pushing * PUSH * dt);
      return;
    }
    if (this.wedged) return;

    // let go of on a slope, it rolls back down; you can hold it, stood against its downhill end
    const slope = this.slopeAt(this.x);
    const holding = (side === -1 && slope < 0) || (side === 1 && slope > 0);
    if (holding) { this.v = 0; return; }
    if (Math.abs(slope) > STILL) this.v += ROLL * slope * dt * 10;
    this.v *= 0.985;
    if (Math.abs(this.v) < 3 && Math.abs(slope) <= STILL) this.v = 0;
    this.v = Math.max(-ROLL_MAX, Math.min(ROLL_MAX, this.v));
    if (this.v) {
      const was = this.x;
      this.moveCart(this.v * dt);
      if (this.x === was) this.v = 0;                              // (at the end of where it can go)
      if (!this.said.rolled && Math.abs(this.v) > 40) {
        this.said.rolled = true;
        scene.showThought('it rolls back down the slope. something under the wheel would hold it.', 4200);
      }
    }
  }

  // pushing the cart is slow going
  pace(speed) { return this.pushing ? Math.min(speed, PUSH) : speed; }
}
