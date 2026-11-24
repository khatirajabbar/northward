// The squirrel and its acorns — the one that asks you to look about you.
// It has dropped its winter store along the road: one acorn lying in plain
// sight, one gone into a bush, one lodged at the top of a dead tree (the big
// mushroom beside it is the way up). Pick them up as you come, and give them
// back when you reach the old oak it lives in.
//
// Like the other puzzles it owns its sprites and its state; ForestScene asks
// it for a prompt (offer), hands it actions (act) and ticks it (update).

import { play } from '../audio/sound.js';

const ART = 2;             // the forest's art is shown at 2x
const HOLLOW = 74;         // how far up the oak's trunk the hollow is (tools/forest-art.mjs: HOLLOW.up, at 2x)
const BOUNCE = -570;       // what the big mushroom gives you: enough to reach the top of the dead tree, and no jump is
const BROWNS = [0x8a6238, 0xc9954a, 0xe8bd72];

export default class SquirrelPuzzle {
  constructor(scene, x) {
    this.scene = scene;
    this.x = x;                         // the foot of the old oak
    this.done = false;
    this.stage = 'searching';           // searching → thanked → home
    this.count = 0;                     // acorns in your bag
    this.said = {};                     // thoughts that only come once
    this.nextMove = 0;

    const g = scene.groundY;
    this.floor = g + 2;
    this.bushX = x - 450;
    this.mushroomX = x - 272;
    this.snagX = x - 226;
    this.hole = [x - 1, g + 4 - HOLLOW];
    const art = (key, ax, bottom, depth) =>
      scene.add.image(ax, bottom, `woods-${key}`).setOrigin(0.5, 1).setScale(ART).setDepth(depth);

    // the oak it lives in, the dead tree, and the mushroom that gets you up it
    art('oak-old', x, g + 4, 3);
    art('snag', this.snagX, g + 4, 1.5);
    scene.makeBounce(this.mushroomX, g, 1.3, BOUNCE, false);

    // the three acorns: on the path, in the bush, at the top of the dead tree
    this.bush = art('bush-b', this.bushX, g + 3, 4);
    // it shivers every little while: there's something in it
    this.rustle = scene.time.addEvent({ delay: 2500, loop: true, callback: () => {
      scene.tweens.add({ targets: this.bush, angle: { from: -3, to: 3 }, duration: 80, yoyo: true, repeat: 2,
        onComplete: () => this.bush.setAngle(0) });
    } });
    this.acorns = [
      { kind: 'path', x: x - 640, y: g + 4 },
      { kind: 'bush', x: this.bushX, y: g - 6, hidden: true },
      { kind: 'high', x: this.snagX, y: g - 170 }
    ];
    this.acorns.forEach((acorn) => {
      acorn.sprite = art('acorn', acorn.x, acorn.y, 6).setVisible(!acorn.hidden);
      // a glint now and then, so it catches your eye
      acorn.glint = scene.add.rectangle(acorn.x + 3, acorn.y - 14, 2, 2, 0xfff6d6, 0).setDepth(7);
      if (!acorn.hidden) {
        scene.tweens.add({ targets: acorn.glint, alpha: 1, duration: 160, yoyo: true, repeat: -1, repeatDelay: 1500 + Math.random() * 600 });
      }
    });

    // the squirrel, going back and forth over the same patch of grass
    this.home = x - 74;
    this.squirrel = scene.add.sprite(this.home, this.floor, 'woods-squirrel').setOrigin(0.5, 1).setScale(ART).setDepth(6);
    this.squirrel.play('squirrel-sit');
  }

  // the world as a finished save left it: nothing lying about, and a face at the hollow
  restore() {
    this.done = true;
    this.stage = 'home';
    this.count = 0;
    this.rustle.remove();
    this.acorns.forEach((acorn) => { acorn.taken = true; acorn.sprite.setVisible(false); acorn.glint.setVisible(false); });
    this.lookOut();
  }

  left() { return this.acorns.filter((acorn) => !acorn.taken); }

  // where the next acorn is, for the marker — null once you have them all
  nextSpot() {
    const acorn = this.left()[0];
    if (!acorn) return null;
    const g = this.scene.groundY;
    if (acorn.kind === 'bush') return [this.bushX, g - 54];
    if (acorn.kind === 'high') return [this.snagX, g - 206];
    return [acorn.x, g - 34];
  }

  // what E would do here right now — { label, action }, a { label, keys, hint } reminder, or null
  offer(px, onGround) {
    const scene = this.scene;
    if (this.done || scene.resting) return null;
    const [, bush, high] = this.acorns;
    if (onGround && !bush.taken && !bush.popping && Math.abs(px - this.bushX) < 62) {
      return { label: 'look in the bush', action: 'squirrel-bush' };
    }
    if (onGround && this.count === 3 && Math.abs(px - this.squirrel.x) < 150) {
      return { label: 'give the squirrel its acorns', action: 'squirrel-give' };
    }
    if (onGround && !high.taken && Math.abs(px - this.mushroomX) < 120) {
      return { label: 'jump onto the mushroom', keys: ['up'], hint: true };
    }
    return null;
  }

  act(action) {
    const scene = this.scene;
    if (action === 'squirrel-bush') {
      const acorn = this.acorns[1];
      acorn.popping = true;
      scene.player.setVelocityX(0);
      scene.player.setFlipX(this.bushX < scene.player.x);
      scene.player.play(`${scene.characterId}-crouch`);
      this.rustle.remove();
      scene.tweens.killTweensOf(this.bush);
      scene.tweens.add({ targets: this.bush, angle: { from: -7, to: 7 }, duration: 60, yoyo: true, repeat: 4,
        onComplete: () => this.bush.setAngle(0) });
      this.leaves(this.bushX, scene.groundY - 22);
      play(scene, 'rustle');
      // out it comes, up and over into your hands
      acorn.sprite.setVisible(true).setPosition(this.bushX, scene.groundY - 16);
      scene.tweens.add({ targets: acorn.sprite, y: scene.groundY - 66, duration: 240, yoyo: true, ease: 'Quad.out' });
      scene.tweens.add({ targets: acorn.sprite, x: scene.player.x, duration: 480, onComplete: () => this.collect(acorn) });
      return true;
    }
    if (action === 'squirrel-give') {
      this.give();
      return true;
    }
    return false;
  }

  update(px) {
    const scene = this.scene;
    if (this.stage === 'home') return;
    const say = (id, text, ms = 3600) => { if (!this.said[id]) { this.said[id] = true; scene.showThought(text, ms); } };

    if (!this.done) {
      // walk into an acorn and it's yours
      const body = scene.player.body;
      this.acorns.forEach((acorn) => {
        if (acorn.taken || acorn.hidden) return;
        if (Math.abs(body.center.x - acorn.x) < 30 && Math.abs(body.center.y - (acorn.y - 9)) < 40) this.collect(acorn);
      });

      const [path, bush, high] = this.acorns;
      if (!path.taken && Math.abs(px - path.x) < 240) say('path', 'an acorn, lying in the road.', 3000);
      if (!bush.taken && path.taken && Math.abs(px - this.bushX) < 150) say('bush', "something's rustling in that bush.", 3200);
      if (!high.taken && Math.abs(px - this.snagX) < 170 && scene.player.body.blocked.down) {
        say('high', "there's one up on the dead tree. that mushroom might get me there.", 4200);
      }
      if (Math.abs(px - this.squirrel.x) < 230) {
        if (this.count === 3) say('yours', 'oh. these are yours, are they?', 3200);
        else say('lost', "a squirrel, going over and over the same grass. it's lost something.", 4200);
      }
    }
    if (this.stage === 'searching') this.search(px);
  }

  // back and forth over its patch, nose down — until you come close, and then it watches you
  search(px) {
    const scene = this.scene, squirrel = this.squirrel;
    if (this.moving) return;
    if (Math.abs(px - squirrel.x) < 150) {
      squirrel.setFlipX(px > squirrel.x);
      squirrel.play('squirrel-alert', true);
      return;
    }
    if (scene.time.now < this.nextMove) { squirrel.play('squirrel-sit', true); return; }
    const to = this.home - 60 + Math.random() * 100;
    this.scurry(to, () => { this.nextMove = scene.time.now + 900 + Math.random() * 1500; });
  }

  scurry(to, then) {
    const scene = this.scene, squirrel = this.squirrel;
    this.moving = true;
    squirrel.setFlipX(to > squirrel.x).play('squirrel-run', true);
    scene.tweens.add({ targets: squirrel, x: to, duration: Math.max(180, Math.abs(to - squirrel.x) * 5),
      onComplete: () => { this.moving = false; squirrel.play('squirrel-sit'); if (then) then(); } });
  }

  collect(acorn) {
    const scene = this.scene;
    if (acorn.taken) return;
    acorn.taken = true;
    acorn.hidden = false;
    this.count += 1;
    scene.inventory.acorns = this.count;
    scene.tweens.killTweensOf([acorn.sprite, acorn.glint]);
    acorn.glint.setVisible(false);
    play(scene, 'pop');
    scene.tweens.add({ targets: acorn.sprite, y: acorn.sprite.y - 26, alpha: 0, duration: 380, ease: 'Quad.out',
      onComplete: () => acorn.sprite.setVisible(false) });
    // how many that makes, over your head
    const tally = scene.guide.text(scene.player.x, scene.player.y - 74, `${this.count}/3`, { size: 3 }).setOrigin(0.5).setDepth(80);
    scene.tweens.add({ targets: tally, y: tally.y - 34, alpha: 0, duration: 1300, ease: 'Sine.out', onComplete: () => tally.destroy() });
    for (let i = 0; i < 6; i++) {
      const spark = scene.add.rectangle(acorn.x, acorn.y - 10, 2, 2, 0xfff6d6).setDepth(8);
      const a = Math.random() * Math.PI * 2;
      scene.tweens.add({ targets: spark, x: acorn.x + Math.cos(a) * 22, y: acorn.y - 10 + Math.sin(a) * 22, alpha: 0,
        duration: 420, onComplete: () => spark.destroy() });
    }
    if (this.count === 1) scene.showThought("someone's dropped this.", 2600);
    if (this.count === 3) scene.showThought('three of them. somebody will be missing these.', 3600);
  }

  leaves(x, y) {
    const scene = this.scene;
    for (let i = 0; i < 7; i++) {
      const leaf = scene.add.rectangle(x + (Math.random() - 0.5) * 30, y, 4, 2, i % 2 ? 0x4f815b : 0x79ad78).setDepth(9);
      scene.tweens.add({ targets: leaf, x: leaf.x + (Math.random() - 0.5) * 60, y: y + 26, angle: 200, alpha: 0,
        duration: 700 + Math.random() * 300, ease: 'Quad.in', onComplete: () => leaf.destroy() });
    }
  }

  // all three, set down in front of it
  give() {
    const scene = this.scene, squirrel = this.squirrel, player = scene.player;
    this.done = true;
    this.stage = 'thanked';
    this.count = 0;
    scene.inventory.acorns = 0;
    scene.tweens.killTweensOf(squirrel);
    this.moving = false;
    player.setVelocityX(0);
    player.setFlipX(squirrel.x < player.x);
    player.play(`${scene.characterId}-crouch`);
    squirrel.setFlipX(player.x > squirrel.x).play('squirrel-alert');

    const side = player.x < squirrel.x ? -1 : 1;                  // which side of it you're on
    const pile = [0, 1, 2].map((i) => {
      const acorn = scene.add.image(player.x, player.y, 'woods-acorn').setOrigin(0.5, 1).setScale(ART).setDepth(7).setVisible(false);
      const to = squirrel.x + side * (22 + i * 13);
      scene.time.delayedCall(i * 170, () => {
        acorn.setVisible(true);
        scene.tweens.add({ targets: acorn, x: to, duration: 420 });
        scene.tweens.add({ targets: acorn, y: player.y - 30, duration: 210, yoyo: false, ease: 'Quad.out',
          onComplete: () => scene.tweens.add({ targets: acorn, y: this.floor + 2, duration: 210, ease: 'Quad.in' }) });
      });
      return acorn;
    });

    scene.time.delayedCall(1000, () => {
      // it can't believe it: one in its paws straight away, and a little dance
      squirrel.play('squirrel-holding');
      play(scene, 'squirrel');
      scene.tweens.add({ targets: squirrel, y: this.floor - 14, duration: 150, yoyo: true, repeat: 2, repeatDelay: 110, ease: 'Quad.out' });
      scene.addKindness(squirrel.x, this.floor - 44);
      scene.showThought('there. every one of them.', 3000);
    });
    scene.time.delayedCall(2700, () => this.carryHome(pile));
  }

  // up the trunk with them and into the hollow
  carryHome(pile) {
    const scene = this.scene, squirrel = this.squirrel;
    const [hx, hy] = this.hole;
    this.scurry(hx - 4, () => {
      pile.forEach((acorn, i) => {
        scene.tweens.add({ targets: acorn, x: hx, y: hy + 6, scale: 1, duration: 520, delay: 120 + i * 150, ease: 'Sine.inOut',
          onComplete: () => acorn.destroy() });
      });
      // a squirrel climbs head first: turned on end, it runs straight up the bark
      squirrel.setOrigin(0.5, 0.5).setFlipX(false).setAngle(90).setPosition(hx, this.floor - 20).play('squirrel-run');
      scene.tweens.add({ targets: squirrel, y: hy + 14, duration: 620, ease: 'Sine.inOut',
        onComplete: () => {
          this.stage = 'home';
          this.lookOut();
          scene.time.delayedCall(700, () => scene.showThought("it'll need them when the cold comes.", 3600));
        } });
    });
  }

  // at home: a face at the hollow, ducking back inside now and then
  lookOut() {
    const scene = this.scene, squirrel = this.squirrel;
    const [hx, hy] = this.hole;
    scene.tweens.killTweensOf(squirrel);
    squirrel.setOrigin(0.5, 1).setAngle(0).setFlipX(false).setDepth(3.5).setPosition(hx, hy + 13).play('squirrel-peek');
    scene.time.addEvent({ delay: 4600, loop: true, callback: () => {
      squirrel.setVisible(false);
      scene.time.delayedCall(700, () => squirrel.setVisible(true));
    } });
  }
}
