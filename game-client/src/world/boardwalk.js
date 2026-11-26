// The boardwalk: before the fawn the ground goes soft, and someone long ago
// laid boards on posts over the bog. Some have gone, so you jump the gaps;
// some have gone soft, and they hold you a moment and then give way, so you
// don't stop on those. Miss, and you're in the bog up to your knees: there's
// no wading through it, so it's back to the bank where the boards begin, and
// the whole way over again (the soft boards you broke are back, too, so it's
// the same crossing every time). The cat keeps to the boards, jumping the
// gaps and the soft ones, as it would.
import { stretch } from './road.js';
import { play } from '../audio/sound.js';
import { setTravelerBody } from '../characters/lpc.js';

const ART = 2;
const DECK = 30;             // how high the boards stand above the bog
const BOARD = 112;           // one board's length (the plank art: 56 art pixels)
const BANK = 280;            // how far in the boards begin, at the top of the bank
// the boards in order: '=' a sound one, '_' one that's gone, '~' a soft one.
// (a gap is as far as you can jump, so never two together; the bird waits on
// the fourth board, so that one is sound)
const BOARDS = '=_~=_=~~_=';
const HOLDS = 650;           // how long a soft board holds you (ms): walk on and it's fine
const SINK = 14;             // how far into the bog you sink
const STUCK_MS = 650;        // how long you stand in it before you're back on the bank

export default class Boardwalk {
  // the land goes in first: a bank up to the boards, and one down after them
  constructor(scene) {
    this.scene = scene;
    const { from, to } = stretch('boardwalk');
    this.from = from;
    this.to = to;
    this.bogL = from + BANK;
    this.bogR = this.bogL + BOARDS.length * BOARD;
    this.deckY = scene.groundY - DECK;
    scene.hills.add(from + 120, [[0, 0], [140, DECK], [BANK - 120, DECK]]);
    scene.hills.add(this.bogR, [[0, DECK], [24, DECK], [180, 0]]);
    this.sunk = false;          // in the bog, on your way back to the bank
    this.said = {};
  }

  // the bog under the boards, and the reeds and dead trees about it
  dress(prop) {
    const scene = this.scene, g = scene.groundY, w = this.bogR - this.bogL;
    scene.add.tileSprite(this.bogL, g - 6, w, 44, 'woods-bog').setOrigin(0, 0).setTileScale(ART, ART).setDepth(5.2);
    // the top of the water again, in front of you: what you'd be wading in
    this.front = scene.add.tileSprite(this.bogL, g - 6, w, 26, 'woods-bog').setOrigin(0, 0).setTileScale(ART, ART)
      .setDepth(11).setAlpha(0.9);
    [[this.bogL + 150, 'snag'], [this.bogL + 520, 'bare-b'], [this.bogL + 860, 'snag'], [this.from + 60, 'birch-b'],
      [this.bogR + 150, 'spruce-b'], [this.bogR + 270, 'birch-a']].forEach(([x, key]) => prop(key, x, 1, x % 2 === 0));
    // reeds along the edges of the water, some behind the boards and some in front of you
    for (let x = this.bogL + 10; x < this.bogR - 10; x += 70 + (x % 3) * 20) {
      const front = (x / 70) % 4 < 1;
      scene.add.image(x, g + 4, `woods-tallgrass-low-${front ? 'b' : 'a'}`).setOrigin(0.5, 1).setScale(ART)
        .setDepth(front ? 11.5 : 5.1).setFlipX(x % 2 === 0);
    }
  }

  // the boards, after the traveler is made since they hold them up. each gap
  // and each soft board is a leap for the cat. returns where the bird waits
  place() {
    const scene = this.scene;
    // a gap with a soft board right after it is one long jump for the cat, not two
    [...BOARDS.matchAll(/[_~]+/g)].forEach((run) => {
      const x = this.bogL + run.index * BOARD;
      scene.leaps.add(x, x + run[0].length * BOARD, this.deckY);
    });
    this.boards = [...BOARDS].map((kind, i) => {
      const x = this.bogL + i * BOARD;
      if (kind === '_') return { kind, x };
      const art = scene.add.image(x - ART, this.deckY - ART, kind === '~' ? 'woods-plank-rotten' : 'woods-plank')
        .setOrigin(0, 0).setScale(ART).setDepth(6);
      const posts = [x, x + BOARD].map((px) => scene.add.image(px - 9 * ART, this.deckY + 10, 'woods-bog-post').setOrigin(0, 0).setScale(ART).setDepth(5.3));
      const body = scene.add.rectangle(x + BOARD / 2, this.deckY + 4, BOARD, 8).setVisible(false);
      scene.physics.add.existing(body, true);
      // you land on a board from above, and climb up through it from the bog below
      body.body.checkCollision.down = false;
      body.body.checkCollision.left = false;
      body.body.checkCollision.right = false;
      scene.physics.add.collider(scene.player, body);
      return { kind, x, art, posts, body, held: 0, gone: false, home: art.y };
    });
    // the faces of the two banks: stood in the bog, you don't walk in under them
    [this.bogL, this.bogR].forEach((x) => {
      const wall = scene.add.rectangle(x, this.deckY + DECK / 2, 6, DECK).setVisible(false);
      scene.physics.add.existing(wall, true);
      scene.physics.add.collider(scene.player, wall);
    });
    const perch = this.boards[3];
    return [{ x: perch.x + 70, y: this.deckY + 1 }];
  }

  // where the cat walks at x: on the boards over the bog, or null off them
  floorAt(x) {
    if (x < this.bogL || x > this.bogR) return null;
    return this.deckY + 2;
  }

  // the board you're standing on, if any
  under() {
    const body = this.scene.player.body, middle = body.x + body.halfWidth;
    if (!body.blocked.down || Math.abs(body.bottom - this.deckY) > 3) return null;
    return this.boards.find((b) => !b.gone && b.kind !== '_' && middle >= b.x - 6 && middle <= b.x + BOARD + 6) || null;
  }

  update(px) {
    const scene = this.scene, player = scene.player, body = player.body;
    if (!this.boards) return;
    // the bank you last stood on: miss a board and it's that one you're back on
    if (px < this.bogL) this.bank = 'left';
    else if (px > this.bogR) this.bank = 'right';
    // (only coming to it the first time: not on the way back, having crossed it)
    if (!this.said.first && !player.flipX && px > this.from + 60 && px < this.bogL) {
      this.said.first = true;
      scene.showThought('the ground goes soft here. someone laid boards over it, a long time ago.', 4200);
    }
    if (!this.said.after && px > this.bogR + 60 && px < this.to) {
      this.said.after = true;
      scene.showThought('boggy all the way. anything could get stuck out here.', 3600);
    }

    // a soft board: it creaks as you step on, holds you a moment, then gives way
    const on = this.under();
    this.boards.forEach((b) => {
      if (b.kind !== '~' || b.gone) return;
      if (b === on) {
        if (b.held === 0) {
          play(scene, 'plank', { volume: 0.6 });
          scene.tweens.add({ targets: b.art, y: b.art.y + 2, duration: 120, yoyo: true });
          if (!this.said.soft) { this.said.soft = true; scene.showThought("this one's gone soft. don't stop on it.", 3000); }
        }
        b.held += scene.game.loop.delta;
        if (b.held > HOLDS) this.giveWay(b);
      } else {
        b.held = 0;
      }
    });

    // in the bog, up to your knees: nothing for it but back to the bank
    if (!this.sunk && px > this.bogL && px < this.bogR && body.bottom > scene.groundY - 3) this.sink();
  }

  // you stand there in it a moment, and then you're back on the bank where
  // the boards begin (the one you came from), to cross again from the start
  sink() {
    const scene = this.scene, player = scene.player, cam = scene.cameras.main;
    this.sunk = true;
    setTravelerBody(player, -SINK);
    player.y += SINK;
    player.setVelocity(0, 0);
    play(scene, 'splash', { volume: 0.7 });
    play(scene, 'mud', { volume: 0.5 });
    scene.time.delayedCall(STUCK_MS, () => {
      cam.fadeOut(220, 10, 13, 20);
      cam.once('camerafadeoutcomplete', () => {
        setTravelerBody(player, 0);
        player.setVelocity(0, 0);
        const back = this.bank === 'right';      // on your way back, it's the far bank you came from
        player.setPosition(back ? this.bogR + 70 : this.bogL - 70, scene.standY - DECK - 4);
        player.setFlipX(back);
        this.boards.forEach((b) => this.mend(b));
        this.sunk = false;
        cam.fadeIn(320, 10, 13, 20);
        scene.showThought(this.said.wet ? 'in again. from the start, then.' : "up to my knees — there's no wading through that. from the start of the boards, then.",
          this.said.wet ? 2600 : 4600);
        this.said.wet = true;
      });
    });
  }

  // a soft board that gave way, back as it was (see sink)
  mend(b) {
    if (b.kind !== '~') return;
    this.scene.tweens.killTweensOf(b.art);
    b.art.setY(b.home).setAngle(0).setAlpha(1);
    b.body.body.enable = true;
    b.gone = false;
    b.held = 0;
  }

  giveWay(b) {
    const scene = this.scene;
    b.gone = true;
    b.body.body.enable = false;
    play(scene, 'twig', { volume: 0.9 });
    play(scene, 'splash', { volume: 0.5 });
    scene.tweens.add({ targets: b.art, y: b.art.y + 34, angle: 7, alpha: 0, duration: 900, ease: 'Quad.in' });
  }

  // stood in the bog you don't go anywhere, and there's nothing to jump from
  pace(speed) { return this.sunk ? 0 : speed; }
  jump(power) { return this.sunk ? 0 : power; }
}
