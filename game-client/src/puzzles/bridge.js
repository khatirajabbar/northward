// The broken bridge — the last thing between you and whoever is crying.
// A brook crosses the road, and the footbridge over it has lost its boards:
// only the supports in the water still stand. Three of the
// boards are lying about on the near side. Carry them back one at a time and
// lay them across, and you can go on — and so can whoever comes after you.
//
// Like the other puzzles it owns its sprites and its state; ForestScene asks
// it for a prompt (offer), hands it actions (act) and ticks it (update). The
// scene makes the gap in the ground and the water; this lays the way over it.

const ART = 2;             // the forest's art is shown at 2x
const BOARD = 112;         // how much of the brook one board spans
const BOARDS = 3;

export default class BridgePuzzle {
  constructor(scene, left, right) {
    this.scene = scene;
    this.left = left;                   // the near bank's edge
    this.right = right;                 // the far bank's edge
    this.laid = 0;
    this.carrying = false;
    this.done = false;
    this.said = {};

    const g = scene.groundY;
    // what's left standing: the supports in the stream. each one's beam sits
    // just under where the boards go, and it's drawn over the water's surface so
    // the posts run down into the brook without a break
    for (let i = 1; i < BOARDS; i++) {
      scene.add.image(left + BOARD * i, g + 12, 'woods-trestle').setOrigin(0.5, 0).setScale(ART).setDepth(7.5);
    }

    // the boards, where the water left them — the nearest first
    this.planks = [left - 190, left - 400, left - 620].map((x, i) => ({
      x,
      sprite: scene.add.image(x, g + 5, 'woods-plank').setOrigin(0.5, 1).setScale(ART).setDepth(4.5).setAngle(i === 1 ? -3 : i === 2 ? 2 : 0),
      taken: false
    }));
    // …and the one in your arms
    this.held = scene.add.image(0, 0, 'woods-plank').setScale(ART).setDepth(10.4).setVisible(false);
  }

  // the world as a finished save left it: mended
  restore() {
    this.planks.forEach((plank) => { plank.taken = true; plank.sprite.setVisible(false); });
    for (let i = 0; i < BOARDS; i++) this.lay(i);
    this.laid = BOARDS;
    this.done = true;
  }

  // where the bridge reaches to so far
  get end() { return this.left + BOARD * this.laid; }

  nearest(px) {
    return this.planks.filter((plank) => !plank.taken).sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0] || null;
  }

  // close enough to the brook for any of this to be your business
  inReach(px) { return px > this.left - 760 && px < this.right + 80; }

  // the marker: the board to fetch, or the place to lay the one you have
  nextSpot(px) {
    const g = this.scene.groundY;
    if (this.carrying) return [this.end + 30, g - 44];
    const plank = this.nearest(px);
    return plank ? [plank.x, g - 36] : null;
  }

  // what E would do here right now — { label, action }, a { label, hint } reminder, or null
  offer(px, onGround) {
    const scene = this.scene;
    if (this.done || scene.resting) return null;
    if (this.carrying) {
      if (onGround && px > this.end - 96 && px < this.end + 6) return { label: 'lay the plank across', action: 'bridge-lay' };
      return { label: 'carry it to the bridge', hint: true };
    }
    const plank = this.nearest(px);
    if (onGround && plank && Math.abs(px - plank.x) < 62) return { label: 'pick up the plank', action: 'bridge-pick' };
    return null;
  }

  act(action) {
    const scene = this.scene;
    if (action === 'bridge-pick') {
      const plank = this.nearest(scene.player.x);
      if (!plank) return true;
      plank.taken = true;
      plank.sprite.setVisible(false);
      this.carrying = true;
      scene.player.setVelocityX(0);
      scene.player.play(`${scene.characterId}-crouch`);
      this.held.setVisible(true);
      if (!this.said.first) { this.said.first = true; scene.showThought('a board off the bridge. still sound.', 3000); }
      return true;
    }
    if (action === 'bridge-lay') {
      this.carrying = false;
      this.held.setVisible(false);
      scene.player.setVelocityX(0);
      scene.player.play(`${scene.characterId}-crouch`);
      const x = this.end;
      this.lay(this.laid);
      this.laid += 1;
      // it drops into place: a knock, a puff of dust off the old wood
      for (let i = 0; i < 7; i++) {
        const dust = scene.add.rectangle(x + Math.random() * BOARD, scene.groundY - 2, 3, 3, 0xd9c7a3, 0.8).setDepth(9);
        scene.tweens.add({ targets: dust, y: dust.y - 10 - Math.random() * 14, x: dust.x + (Math.random() - 0.5) * 20, alpha: 0,
          duration: 500 + Math.random() * 300, onComplete: () => dust.destroy() });
      }
      if (this.laid === BOARDS) {
        this.done = true;
        scene.addKindness(this.left + BOARD * 1.5, scene.groundY - 50);
        scene.showThought("there. it'll hold — for me, and for whoever comes this way next.", 4200);
      } else {
        scene.showThought(this.laid === 1 ? 'one. it needs two more.' : 'two. one more.', 2600);
      }
      return true;
    }
    return false;
  }

  // a board across the brook: something to look at, and something to stand on
  lay(index) {
    const scene = this.scene, x = this.left + BOARD * index;
    scene.add.image(x, scene.groundY - 3, 'woods-plank').setOrigin(0, 0).setScale(ART).setDepth(6);
    for (let tx = x; tx < x + BOARD; tx += 16) {
      const tile = scene.platforms.create(tx, scene.groundY, 'grass').setOrigin(0, 0);
      tile.refreshBody();
      tile.setVisible(false);
    }
  }

  update(px) {
    const scene = this.scene;
    if (this.carrying) {
      // over your shoulder, tipped back a little
      const player = scene.player, back = player.flipX ? 1 : -1;
      this.held.setPosition(player.x + back * 8, player.y - 1).setAngle(back * 9);
    }
    if (!this.done && !this.said.broken && px > this.left - 430) {
      this.said.broken = true;
      scene.showThought('the bridge is out. its boards are lying all about.', 3600);
    }
  }
}
