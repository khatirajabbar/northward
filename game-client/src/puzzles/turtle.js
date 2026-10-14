// The turtle on its back — the one that needs a patient pair of hands.
// It has ended up upside down beside the road and can't right itself; its feet
// just go and go. Turn it over slowly: hold E and it tips a little at a time.
// Let go too soon and it rocks back. Once it's the right way up it pulls its
// head in, thinks about you, and goes off into the bracken at its own pace.
//
// Like the other puzzles it owns its sprites and its state; ForestScene asks
// it for a prompt (offer), hands it actions (act) and ticks it (update).

const ART = 2;             // the forest's art is shown at 2x
const TURN_MS = 1700;      // how long it takes, held, to turn it the whole way over
const PLOD = 16;           // how fast a turtle goes, in no hurry at all

export default class TurtlePuzzle {
  constructor(scene, x) {
    this.scene = scene;
    this.x = x;
    this.stage = 'stuck';        // stuck → righted → gone
    this.done = false;
    this.turning = false;        // your hands are on it
    this.turned = 0;             // how far over it is, 0 to 1
    this.said = {};

    const g = scene.groundY;
    this.floor = g + 3;
    this.turtle = scene.add.sprite(x, this.floor, 'woods-turtle').setOrigin(0.5, 1).setScale(ART).setDepth(6).play('turtle-back');
    // where it's going: the bracken beside the road, which it goes in behind
    this.home = x + 150;
    [[x + 122, 'fern'], [x + 150, 'bush-a'], [x + 178, 'fern']].forEach(([fx, key], i) => {
      scene.add.image(fx, g + 3, `woods-${key}`).setOrigin(0.5, 1).setScale(ART).setDepth(8).setFlipX(i === 2);
    });
  }

  // the world as a finished save left it: long gone into the bracken
  restore() {
    this.done = true;
    this.stage = 'gone';
    this.turtle.setVisible(false);
  }

  // what E would do here right now — { label, action } or null
  offer(px, onGround) {
    const scene = this.scene;
    if (this.done || scene.resting || !onGround) return null;
    if (Math.abs(px - this.x) < 72) return { label: this.turning ? 'keep holding — gently' : 'hold to turn it over', action: 'turtle-turn' };
    return null;
  }

  act(action) {
    if (action !== 'turtle-turn') return false;
    const scene = this.scene;
    if (!this.turning) {
      this.turning = true;
      this.side = scene.player.x < this.x ? 1 : -1;                  // which way it'll tip: away from you
      scene.tweens.killTweensOf(this.turtle);
      scene.player.setVelocityX(0);
      scene.player.setFlipX(this.x < scene.player.x);
      scene.player.play(`${scene.characterId}-crouch`);
    }
    return true;
  }

  update(px) {
    const scene = this.scene, turtle = this.turtle;
    if (this.stage === 'stuck' && !this.said.seen && Math.abs(px - this.x) < 260) {
      this.said.seen = true;
      scene.showThought("a turtle, on its back. it can't turn itself over.", 3800);
    }
    if (!this.turning) return;

    if (scene.keyE.isDown && Math.abs(px - this.x) < 90) {
      // over it goes, a little at a time — heavier than it looks, so it shivers
      this.turned = Math.min(1, this.turned + scene.game.loop.delta / TURN_MS);
      turtle.setAngle(this.side * (this.turned * 92 + Math.sin(scene.time.now / 45) * 2));
      if (this.turned >= 1) this.righted();
      return;
    }
    // you let go before it was over: back it rocks
    this.turning = false;
    this.turned = 0;
    scene.tweens.add({ targets: turtle, angle: 0, duration: 520, ease: 'Back.out', easeParams: [3] });
    if (!this.said.rocked) { this.said.rocked = true; scene.showThought('too soon — it rocked back. hold on longer, gently.', 3400); }
  }

  // the right way up
  righted() {
    const scene = this.scene, turtle = this.turtle;
    this.turning = false;
    this.stage = 'righted';
    this.done = true;
    turtle.setAngle(0).play('turtle-shy');
    scene.tweens.add({ targets: turtle, y: this.floor - 8, duration: 120, yoyo: true, ease: 'Quad.out' });
    for (let i = 0; i < 6; i++) {
      const dust = scene.add.rectangle(this.x + (Math.random() - 0.5) * 40, scene.groundY, 3, 3, 0xd9c7a3, 0.8).setDepth(9);
      scene.tweens.add({ targets: dust, y: dust.y - 8 - Math.random() * 12, x: dust.x + (Math.random() - 0.5) * 24, alpha: 0,
        duration: 500 + Math.random() * 300, onComplete: () => dust.destroy() });
    }
    scene.addKindness(this.x, this.floor - 40);
    scene.showThought('there. the right way up.', 2800);

    // head in a while, then out, a look at you — and off, slow as anything
    scene.time.delayedCall(1600, () => turtle.play('turtle-walk').anims.pause());
    scene.time.delayedCall(2900, () => {
      turtle.setFlipX(true).play('turtle-walk');
      scene.showThought("slow as anything. but it knows where it's going.", 3600);
      scene.tweens.add({ targets: turtle, x: this.home, duration: (this.home - turtle.x) / PLOD * 1000,
        onComplete: () => { this.stage = 'gone'; turtle.setVisible(false); } });
    });
  }
}
