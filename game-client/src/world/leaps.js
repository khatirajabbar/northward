// Where you have to jump, so do they.
//
// A leap is a bit of road that someone following you (the horse walking after
// you, the cat) can't just walk along: a trunk lying across it, a gap. It's
// where it starts and ends, and the top it has to clear. A follower that has
// you on the far side walks up to it, stops short, and jumps it in one arc,
// landing clear on the other side, instead of walking through.

export default class Leaps {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
  }

  // from/to: the ends of it along the road; top: the screen y a jump has to clear
  add(from, to, top) {
    this.list.push({ from, to, top });
  }

  // the first leap between a follower at x and the spot it's heading for
  between(x, want) {
    return this.list.find((l) => (x <= l.from && want > l.from) || (x >= l.to && want < l.to)) || null;
  }

  // where to stop short of it (`room`: from the follower's middle to its front)
  short(l, x, room) {
    return x <= l.from ? l.from - room : l.to + room;
  }

  // a follower heading for `want`: where it should actually head for, and
  // whether it's at the edge and ready to jump (`leap`)
  plan(x, want, room) {
    const l = this.between(x, want);
    if (!l) return { want, leap: null };
    const edge = this.short(l, x, room);
    return { want: edge, leap: Math.abs(x - edge) < 8 ? l : null };
  }

  // jump it. `ground(x)` is the floor at x (where the follower's feet go);
  // `pose(t, dir)` is called along the way, t from 0 to 1, for leaning in the air
  jump(sprite, l, room, ground, { height = 22, speed = 260, pose, landed } = {}) {
    const dir = sprite.x <= l.from ? 1 : -1;
    const x0 = sprite.x;
    const x1 = dir > 0 ? l.to + room : l.from - room;
    const y0 = ground(x0), y1 = ground(x1);
    const rise = (y0 + y1) / 2 - (Math.min(y0, y1, l.top) - height);
    sprite.leaping = true;
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: (Math.abs(x1 - x0) / speed) * 1000,
      onUpdate: (tween) => {
        const t = tween.getValue();
        sprite.x = x0 + (x1 - x0) * t;
        sprite.y = y0 + (y1 - y0) * t - 4 * rise * t * (1 - t);
        if (pose) pose(t, dir);
      },
      onComplete: () => {
        sprite.leaping = false;
        if (landed) landed();
      }
    });
  }
}
