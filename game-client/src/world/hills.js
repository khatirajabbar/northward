// Ground that rises and falls.
//
// The road is flat everywhere else. A hill is a few points (how far along
// it, how high above the road), and between them the ground eases up or down.
// It's drawn from the same earth as the flat road, one column at a time, so
// the turf, the dirt and the stones in it follow the slope. Arcade physics
// only knows boxes, so whoever walks on a hill is set back on its surface
// after every physics step: the same job a collider does for the flat road.
import Phaser from 'phaser';

const ART = 2;          // one art pixel is two on screen
const DEEP = 28;        // the rows of plain dirt (no turf) at the foot of the ground art, repeated further down

export default class Hills {
  constructor(scene, groundY) {
    this.scene = scene;
    this.groundY = groundY;
    this.list = [];
  }

  // a hill starting at `from` (world x). points are [distance along it,
  // height above the road] in screen pixels; it starts and ends level with the road
  add(from, points) {
    this.list.push({ from, to: from + points[points.length - 1][0], points });
    return this;
  }

  // is x on one of the hills (or within `margin` of one)?
  on(x, margin = 0) {
    return this.list.some((h) => x >= h.from - margin && x <= h.to + margin);
  }

  // how high the ground is above the road at x, before it's put on the pixel grid
  rise(x) {
    const hill = this.list.find((h) => x >= h.from && x <= h.to);
    if (!hill) return 0;
    const d = x - hill.from, p = hill.points;
    let i = 0;
    while (i < p.length - 2 && d > p[i + 1][0]) i++;
    const [x0, y0] = p[i], [x1, y1] = p[i + 1];
    const t = x1 === x0 ? 1 : Phaser.Math.Clamp((d - x0) / (x1 - x0), 0, 1);
    return y0 + (y1 - y0) * t * t * (3 - 2 * t);
  }

  // the top of the ground at x, as a screen y — on the art grid, like everything else
  surfaceAt(x) {
    return this.groundY - Math.round(this.rise(x) / ART) * ART;
  }

  // which way the ground leans at x, in degrees: uphill to the right is negative
  // (screen y points down), the way Phaser turns a sprite
  slantAt(x) {
    return Phaser.Math.RadToDeg(Math.atan2(this.rise(x - 12) - this.rise(x + 12), 24));
  }

  // the earth and the grass blades along its top, as two pictures per hill.
  // each column is the same column of the road's ground art that the flat road
  // shows at that x, lifted to the hill's height, so where a hill meets the
  // road the two join with no seam
  draw() {
    const earth = this.scene.textures.get('woods-ground').getSourceImage();
    const blades = this.scene.textures.get('woods-fringe').getSourceImage();
    this.list.forEach((hill, n) => {
      const columns = Math.round((hill.to - hill.from) / ART);
      const ups = [];
      for (let c = 0; c < columns; c++) ups.push((this.groundY - this.surfaceAt(hill.from + c * ART + 1)) / ART);
      const top = Math.max(...ups);
      const sx = (c) => (hill.from / ART + c) % earth.width;

      const ground = this.picture(`hill-earth-${n}-${hill.from}`, columns, top + earth.height, (ctx) => {
        ups.forEach((up, c) => {
          let y = top - up;
          ctx.drawImage(earth, sx(c), 0, 1, earth.height, c, y, 1, earth.height);
          y += earth.height;
          // a hill goes deeper than the strip of ground art does: more of the same dirt below
          while (y < top + earth.height) {
            const rows = Math.min(DEEP, top + earth.height - y);
            ctx.drawImage(earth, sx(c), earth.height - DEEP, 1, rows, c, y, 1, rows);
            y += rows;
          }
        });
      });
      this.scene.add.image(hill.from, this.groundY - top * ART, ground).setOrigin(0, 0).setScale(ART).setDepth(2);

      // the blades sit where the road's own do: their foot one art pixel below the ground line
      const grass = this.picture(`hill-grass-${n}-${hill.from}`, columns, top + blades.height, (ctx) => {
        ups.forEach((up, c) => ctx.drawImage(blades, sx(c), 0, 1, blades.height, c, top - up, 1, blades.height));
      });
      this.scene.add.image(hill.from, this.groundY + ART - (top + blades.height) * ART, grass)
        .setOrigin(0, 0).setScale(ART).setDepth(5);
    });
  }

  // a canvas texture, drawn once and kept for the rest of the game
  picture(key, w, h, paint) {
    if (this.scene.textures.exists(key)) return key;
    const canvas = this.scene.textures.createCanvas(key, w, h);
    const ctx = canvas.getContext();
    ctx.imageSmoothingEnabled = false;
    paint(ctx);
    canvas.refresh();
    return key;
  }

  // keep a body on the hills. after each physics step: if it has sunk into
  // the ground, it's set back on top; if it was on the ground a moment ago and
  // the ground has fallen away a little under it (going downhill), it's kept
  // on it rather than left skipping through the air. jumping is left alone
  hold(body) {
    const world = this.scene.physics.world;
    let onHill = false;
    const settle = (delta) => {
      const x = body.center.x;
      if (!this.on(x)) { onHill = false; return; }
      const gap = this.surfaceAt(x) - body.bottom;
      const reach = Math.abs(body.velocity.x) * delta * 0.6 + 2;
      if (body.velocity.y >= 0 && (gap <= 0 || (onHill && gap <= reach))) {
        body.y += gap;
        body.velocity.y = 0;
        body.blocked.down = true;
        body.blocked.none = false;
        body.touching.down = true;
        body.touching.none = false;
        onHill = true;
      } else {
        onHill = false;
      }
    };
    world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, settle);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, settle));
  }
}
