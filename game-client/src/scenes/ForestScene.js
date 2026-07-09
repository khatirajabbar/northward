import Phaser from 'phaser';

export default class ForestScene extends Phaser.Scene {
  constructor() {
    super('ForestScene');
  }

  create() {
    const { width, height } = this.scale;
    this.W = width;
    this.H = height;
    const worldWidth = 10200;
    this.groundY = height - 60;

    this.makeTextures();

    // ── landmark positions ──
    this.bucketX = 620;
    this.treeX = 1080;
    this.lakeCenterX = 1980;
    this.lakeFillX = 1880;

    // ── state ──
    this.carrying = null;       // null | 'empty' | 'full'
    this.bucketPicked = false;
    this.treeWatered = false;
    this.kindness = 0;

    // ── inventory (generic: holds any item by name) ──
    // you packed a bag before leaving home — a few things are already in it
    this.inventory = this.registry.get('inventory') || {};
    this.bagOpen = false;
    // a little carrot field — a cluster you can harvest
    this.carrotXs = [820, 860, 900, 940, 980, 1020, 1060, 1100, 1140];
    this.carrotSprites = [];

    // ── the horse (a gate: hungry, won't let you pass until fed) ──
    this.horseX = 2400;
    this.grassX = 2900;          // tall-grass gate (only passable on horseback)
    this.meadowX = 4700;         // where the other horses graze — the goodbye, a little after the river
    this.crossX = 5200;          // stepping-stone water crossing (crossed alone, after the goodbye)
    this.crossWidth = 460;       // gap in the ground (water)
    this.riverX = 3900;          // the river — the horse carries you across, together, before goodbye
    this.riverWidth = 420;       // a real river — too wide and deep to cross on foot
    this.riverTorchX = 3680;     // checkpoint torch on the near bank of the river
    this.stoneXs = [5020, 5110, 5200, 5290, 5380];  // 5 stones with real gaps to jump across
    this.respawnX = 3680;        // default checkpoint — updates to each torch you light
    this.respawnY = this.groundY - 40;
    this.torchX = 4940;          // torch checkpoint before the crossing
    this.saidGoodbye = false;
    this.grassWidth = 440;
    this.horseFed = false;
    this.riding = false;
    this.carryingCat = false;
    this.catFollowing = false;
    this.catStopTimer = 0;
    this.groundBucketState = null;
    this.walkSpeed = 220;
    this.rideSpeed = 380;
    this.carrotSprites = [];

    // ── sky ──
    this.cameras.main.setBackgroundColor('#10161c');
    const skyBands = [0x10161c, 0x1a2630, 0x2b3d49, 0x415863, 0x6a8088];
    const bandH = height / skyBands.length;
    skyBands.forEach((c, i) => {
      this.add.rectangle(0, i * bandH, width, bandH + 1, c)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(-30);
    });

    // ── parallax (same recolor as GameScene) ──
    const dwScale = height / 272 * 1.05;
    const dwH = 272 * dwScale;
    const dwY = height - dwH;
    this.bgLayers = [];
    const addDW = (key, factor, depth, tint, alpha) => {
      const ts = this.add.tileSprite(0, dwY, width, dwH, key);
      ts.setOrigin(0, 0).setScrollFactor(0).setTileScale(dwScale, dwScale);
      ts.setDepth(depth).setTint(tint).setAlpha(alpha);
      ts.parallaxFactor = factor;
      this.bgLayers.push(ts);
    };
    addDW('dw-bg', 0.05, -25, 0x2e505c, 1);
    addDW('dw-far', 0.12, -24, 0x3a6068, 0.9);
    addDW('dw-mid', 0.25, -23, 0x25444e, 1);
    addDW('dw-close', 0.45, -22, 0x152b33, 1);

    // ── ground ──
    this.platforms = this.physics.add.staticGroup();
    const gapL = this.crossX - this.crossWidth / 2;
    const gapR = this.crossX + this.crossWidth / 2;
    const rivL = this.riverX - this.riverWidth / 2;
    const rivR = this.riverX + this.riverWidth / 2;
    // physics tiles are invisible now — the layered earth below draws the look,
    // in unbroken runs that stop exactly where the tiles stop (the water gaps)
    const groundRuns = [];
    let runStart = null;
    for (let x = 0; x < worldWidth; x += 16) {
      if ((x > gapL - 16 && x < gapR) ||         // gap over the stepping-stone water
          (x > rivL - 16 && x < rivR)) {         // gap over the river
        if (runStart !== null) { groundRuns.push([runStart, x]); runStart = null; }
        continue;
      }
      if (runStart === null) runStart = x;
      const tile = this.platforms.create(x, this.groundY, 'grass').setOrigin(0, 0);
      tile.refreshBody();
      tile.setVisible(false);
    }
    if (runStart !== null) groundRuns.push([runStart, worldWidth]);
    groundRuns.forEach(([x0, x1]) => {
      this.add.tileSprite(x0, this.groundY, x1 - x0, height - this.groundY + 8, 'terrain-dirt-day')
        .setOrigin(0, 0).setDepth(2);
      this.add.tileSprite(x0, this.groundY + 1, x1 - x0, 14, 'grass-fringe-day')
        .setOrigin(0, 1).setDepth(5);
    });

    // ── forest dressing — full and bare trees, bushes, grass and flowers along
    // the whole road, the way the ending dresses its field. everything sits at
    // depth 1 (trees) or 4-5 (shrubs), behind the gameplay objects, and the
    // placements stay clear of the landmarks so nothing readable is covered ──
    [{ x: 320, s: 1.0 }, { x: 1520, s: 1.15, f: true }, { x: 2230, s: 0.95 },
     { x: 3350, s: 1.1 }, { x: 4300, s: 1.0, f: true }, { x: 5560, s: 1.15 },
     { x: 9700, s: 1.1 }].forEach((t) => {
      this.add.image(t.x, this.groundY + 4, 'tree-lush-day')
        .setOrigin(0.5, 1).setScale(t.s).setDepth(1).setFlipX(!!t.f);
    });
    [180, 1350, 3520, 4480, 5480, 9450, 9880].forEach((x) => {
      this.add.image(x, this.groundY + 4, 'tree-bare-day')
        .setOrigin(0.5, 1).setScale(1.3 + Math.random() * 0.4).setDepth(1)
        .setFlipX(Math.random() < 0.5);
    });
    [260, 1420, 2180, 3420, 4380, 5540, 6820, 9620].forEach((x) => {
      this.add.image(x + (Math.random() * 20 - 10), this.groundY + 4, 'bush-day')
        .setOrigin(0.5, 1).setScale(0.9 + Math.random() * 0.4).setDepth(4);
    });
    // scattered tufts and blooms — skipping the water, the tall-grass gate, the
    // mushroom slope, the bramble and the rest field, which dress themselves
    const dressSkip = [
      [rivL - 40, rivR + 40], [gapL - 40, gapR + 40],
      [this.grassX - this.grassWidth / 2 - 60, this.grassX + this.grassWidth / 2 + 60],
      [5700, 6700], [7020, 7380], [7650, 9420]
    ];
    for (let x = 140; x < worldWidth - 80; x += 90) {
      if (dressSkip.some(([a, b]) => x > a && x < b)) continue;
      if (Math.random() < 0.7) {
        this.add.image(x + (Math.random() * 30 - 15), this.groundY + 4, 'tallgrass-day')
          .setOrigin(0.5, 1).setScale(0.45 + Math.random() * 0.3).setDepth(5).setAlpha(0.9);
      }
      if (Math.random() < 0.4) {
        const key = Math.random() < 0.5 ? 'flower-white' : 'flower-yellow';
        this.add.image(x + (Math.random() * 50 - 25), this.groundY + 4, key)
          .setOrigin(0.5, 1).setScale(0.9 + Math.random() * 0.4).setDepth(5);
      }
    }
    // ── water — layered, not flat: a lit top edge, a bright surface strip,
    // then bands falling away into the dark ──
    const drawWater = (cx, w, depth) => {
      const g = this.add.graphics().setDepth(depth);
      g.fillStyle(0x142835, 0.95); g.fillRect(cx - w / 2, this.groundY + 14, w, 200);  // the deep
      g.fillStyle(0x1d3a49, 0.95); g.fillRect(cx - w / 2, this.groundY + 14, w, 46);   // depth bands
      g.fillStyle(0x27505f, 0.95); g.fillRect(cx - w / 2, this.groundY + 14, w, 26);
      g.fillStyle(0x35687a, 0.95); g.fillRect(cx - w / 2, this.groundY + 14, w, 10);   // surface strip
      g.fillStyle(0x7fb8d0, 0.6); g.fillRect(cx - w / 2, this.groundY + 14, w, 2);     // lit top edge
      return g;
    };
    // river water filling its pit
    drawWater(this.riverX, this.riverWidth + 20, 3);
    // a waterline strip drawn ABOVE the horse — its legs sink behind this, so it reads as in the water
    this.add.rectangle(this.riverX, this.groundY + 18, this.riverWidth + 20, 26, 0x27505f, 0.95).setOrigin(0.5, 0).setDepth(11);
    this.add.rectangle(this.riverX, this.groundY + 18, this.riverWidth + 20, 4, 0x7fb8d0, 0.45).setOrigin(0.5, 0).setDepth(12);

    // the stepping-stone crossing — same water
    drawWater(this.crossX, this.crossWidth + 20, 3);
    // stepping stones — tops level with the ground, so you must JUMP between them.
    // the physics ellipse is invisible now; a layered stone image draws the look
    // at the same spot (its top edge sits exactly on the old ellipse top)
    this.stones = this.physics.add.staticGroup();
    this.stoneXs.forEach((sx) => {
      const stone = this.add.ellipse(sx, this.groundY + 6, 44, 20, 0x6b7278).setDepth(6).setVisible(false);
      this.physics.add.existing(stone, true);
      stone.body.setSize(40, 12).setOffset(2, 0);
      this.stones.add(stone);
      this.add.image(sx, this.groundY - 4, 'stepping-stone').setOrigin(0.5, 0).setDepth(6);
    });
    // a foreground waterline band over the stones — their bases sit behind the
    // surface now, IN the water instead of on top of it
    this.add.rectangle(this.crossX, this.groundY + 18, this.crossWidth + 20, 10, 0x27505f, 0.85).setOrigin(0.5, 0).setDepth(7);
    this.add.rectangle(this.crossX, this.groundY + 18, this.crossWidth + 20, 2, 0x7fb8d0, 0.5).setOrigin(0.5, 0).setDepth(7);

    // ── torch checkpoint on the near bank — starts UNLIT, lights as you pass ──
    this.torchSprite = this.add.image(this.torchX, this.groundY + 2, 'torch')
      .setOrigin(0.5, 1).setScale(1.8).setDepth(6);
    this.torchSprite.setTint(0x555555);   // dark/unlit look
    // the flame sits at the top of the post, hidden until lit
    this.torchFlame = this.add.image(this.torchX, this.groundY - 52, 'flame')
      .setOrigin(0.5, 1).setScale(1.8).setDepth(7).setVisible(false);
    this.torchGlow = this.add.circle(this.torchX, this.groundY - 60, 34, 0xffb347, 0).setDepth(5);
    this.torchLit = false;

    // ── river torch checkpoint on the near bank — starts UNLIT, lights as you pass ──
    this.riverTorchSprite = this.add.image(this.riverTorchX, this.groundY + 2, 'torch')
      .setOrigin(0.5, 1).setScale(1.8).setDepth(6);
    this.riverTorchSprite.setTint(0x555555);
    this.riverTorchFlame = this.add.image(this.riverTorchX, this.groundY - 52, 'flame')
      .setOrigin(0.5, 1).setScale(1.8).setDepth(7).setVisible(false);
    this.riverTorchGlow = this.add.circle(this.riverTorchX, this.groundY - 60, 34, 0xffb347, 0).setDepth(5);
    this.riverTorchLit = false;


    // ── lake — a layered pond: dark depths, banded shallows, a lit surface rim ──
    const pond = this.add.graphics().setDepth(8);
    pond.fillStyle(0x142835, 0.95);
    pond.fillEllipse(this.lakeCenterX, this.groundY + 34, 232, 40);    // the deep
    pond.fillStyle(0x1d3a49, 0.95);
    pond.fillEllipse(this.lakeCenterX, this.groundY + 28, 214, 30);    // depth bands
    pond.fillStyle(0x27505f, 0.95);
    pond.fillEllipse(this.lakeCenterX, this.groundY + 23, 196, 22);
    pond.fillStyle(0x35687a, 0.95);
    pond.fillEllipse(this.lakeCenterX, this.groundY + 19, 184, 12);    // surface
    pond.fillStyle(0x7fb8d0, 0.55);
    pond.fillEllipse(this.lakeCenterX, this.groundY + 16, 172, 4);     // lit top edge
    const shimmer = this.add.ellipse(this.lakeCenterX - 30, this.groundY + 18, 70, 4, 0x9fd4e0, 0.45).setDepth(8);
    this.tweens.add({ targets: shimmer, x: this.lakeCenterX + 40, alpha: 0.12,
      duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // ── the weak tree ──
    this.treeScale = 1.6;
    this.treeSprite = this.add.image(this.treeX, this.groundY + 4, 'tree-weak')
      .setOrigin(0.5, 1).setScale(this.treeScale).setDepth(2);

    // ── the bucket (on the path) — seated: sunk a little into the ground,
    // with a soft contact shadow under it and grass tufts at its front edge.
    // the same image swaps bucket-empty/bucket-full, so this covers both;
    // the shadow and tufts follow it when it's picked up and set down ──
    this.bucketShadow = this.add.ellipse(this.bucketX, this.groundY + 4, 34, 7, 0x2c332e, 0.5).setDepth(2);
    this.groundBucket = this.add.image(this.bucketX, this.groundY + 5, 'bucket-empty')
      .setOrigin(0.5, 1).setScale(1.4).setDepth(2);
    this.bucketTufts = [
      this.add.image(this.bucketX - 9, this.groundY + 5, 'tallgrass-day').setOrigin(0.5, 1).setScale(0.16).setDepth(3),
      this.add.image(this.bucketX + 10, this.groundY + 5, 'tallgrass-day').setOrigin(0.5, 1).setScale(0.13).setDepth(3)
    ];

    // ── carrots on the path — planted: the root tip sits below the ground
    // line and a little mound of turned earth covers it, so only the greens
    // and the orange shoulder show. each one sits its own way — a slightly
    // different size, depth in the soil, and mound — a patch, not a row ──
    this.carrotXs.forEach((cx) => {
      const carrot = this.add.image(cx, this.groundY + 12 + (Math.random() * 6 - 3), 'carrot')
        .setOrigin(0.5, 1).setScale(1.2 + Math.random() * 0.3).setDepth(4);
      carrot.itemX = cx;
      this.tweens.add({ targets: carrot, angle: { from: -4, to: 4 }, duration: 1200 + Math.random() * 400,
        yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const dirt = Math.random() < 0.5 ? [0x4e4136, 0x5d5044] : [0x483c31, 0x554839];
      const moundW = 17 + Math.random() * 6;
      const mound = this.add.graphics().setDepth(4);
      mound.fillStyle(dirt[0]);
      mound.fillEllipse(cx, this.groundY + 3, moundW, 12);
      mound.fillStyle(dirt[1]);
      mound.fillEllipse(cx, this.groundY + 1, moundW * 0.7, 6);
      this.carrotSprites.push(carrot);
    });

    // ── player ──
    this.player = this.physics.add.sprite(120, this.groundY - 40, 'lpc-khatira-idle', 39);
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(800);
    this.player.setMaxVelocity(220, 700);
    this.player.setScale(1);
    this.player.setSize(20, 34);
    this.player.setOffset(22, 26);
    this.player.setDepth(10);
    this.physics.add.collider(this.player, this.platforms);

    this.physics.add.collider(this.player, this.stones);

    // ── river crossing: an invisible floor across the gap, solid ONLY while riding ──
    // ride over it and the horse carries you across the surface; on foot it passes and you fall in
    this.riverBridge = this.add.rectangle(this.riverX, this.groundY + 30, this.riverWidth + 8, 12).setVisible(false);
    this.physics.add.existing(this.riverBridge, true);
    this.physics.add.collider(this.player, this.riverBridge, null, () => this.riding, this);

    // ── cat-on-cliff: the final cliff top (reached by climbing mushrooms) ──
    this.ledges = this.physics.add.staticGroup();
    const makeLedge = (x, topY, w, h = 320) => {
      // invisible collision strip only — the green polygon slope draws the visuals.
      // (a visible rectangle here used to stick out past the slope and make a lip.)
      const ledge = this.add.rectangle(x, topY + h / 2, w, h, 0x3f6d4e).setVisible(false);
      this.physics.add.existing(ledge, true);
      ledge.body.checkCollision.down = false;   // one-way: only land on top
      ledge.body.checkCollision.left = false;   // walk past/under it on the ground
      ledge.body.checkCollision.right = false;
      this.ledges.add(ledge);
    };
    this.cliffTopX = 6460;
    this.cliffTopY = this.groundY - 300;
    makeLedge(this.cliffTopX + 10, this.cliffTopY, 240, 16);   // collision strip — only under the visible flat green

    // (no torch on the cliff top — there's nothing to fall into here, so no
    // checkpoint is needed; the mushroom hill is a gentle, no-death section.)

    // ── third torch on the ground past the cliff — checkpoint before the bramble ──
    this.brambleTorchX = 6900;
    this.brambleTorchSprite = this.add.image(this.brambleTorchX, this.groundY + 2, 'torch')
      .setOrigin(0.5, 1).setScale(1.8).setDepth(6);
    this.brambleTorchSprite.setTint(0x555555);   // dark/unlit look
    this.brambleTorchFlame = this.add.image(this.brambleTorchX, this.groundY - 52, 'flame')
      .setOrigin(0.5, 1).setScale(1.8).setDepth(7).setVisible(false);
    this.brambleTorchGlow = this.add.circle(this.brambleTorchX, this.groundY - 60, 34, 0xffb347, 0).setDepth(5);
    this.brambleTorchLit = false;

    this.physics.add.collider(this.player, this.ledges);

    // ── stone wall behind the cat — grounded on the cliff top, blocks the
    // right edge so the mushrooms are the only way down ──
    this.rockWall = this.add.image(this.cliffTopX + 100, this.cliffTopY + 6, 'rock')
      .setOrigin(0.5, 1).setScale(2.2).setDepth(8);
    // seat the rock into the grass — tufts against its base in front
    [-26, -4, 18, 34].forEach((dx, i) => {
      this.add.image(this.cliffTopX + 100 + dx, this.cliffTopY + 4, 'tallgrass-day')
        .setOrigin(0.5, 1).setScale(0.26 + (i % 2) * 0.1).setDepth(9);
    });
    const rockBody = this.add.rectangle(this.cliffTopX + 108, this.cliffTopY - 45, 24, 100).setVisible(false);
    this.physics.add.existing(rockBody, true);
    this.physics.add.collider(this.player, rockBody);

    // ── bounce mushrooms: one on the ground, then one on each step, climbing to the cliff ──
    this.mushrooms = this.physics.add.staticGroup();
    const makeBounce = (x, groundTopY, scale, power, solid = true) => {
      const capY = groundTopY - 12;
      const m = this.add.image(x, capY, 'mushroom').setOrigin(0.5, 1).setScale(scale).setDepth(7);
      this.tweens.add({ targets: m, scaleX: { from: scale, to: scale + 0.08 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const pad = this.add.rectangle(x, capY - scale * 18, 34 * scale, 10, 0xff0000, 0).setDepth(7);
      this.physics.add.existing(pad, true);
      pad.bounceMush = m;
      pad.bouncePower = power;
      if (solid) {
        this.mushrooms.add(pad);
      } else {
        // ground spring: walk straight past it; hop and drop onto it to start the climb
        this.physics.add.overlap(this.player, pad, () => {
          if (this.player.body.velocity.y > 40) {
            this.player.setVelocityY(power);
            this.tweens.add({ targets: m, scaleY: { from: m.scaleY, to: m.scaleY * 0.65 }, duration: 90, yoyo: true });
          }
        });
      }
    };

    // ── a green mountain SLOPE rising to the cliff, with bounce mushrooms and
    // little flowers growing on it. the slope is the look; the mushrooms on top
    // are what you bounce up. ──
    const mtnLeft = 5760, peakX = 6440;
    const peakTop = this.cliffTopY;                 // slope meets the cliff height

    // the green surface height at a given x — a smooth diagonal rising left->right
    const surfaceTopY = (x) => {
      const t = Phaser.Math.Clamp((x - mtnLeft) / (peakX - mtnLeft), 0, 1);
      const eased = t * t * (3 - 2 * t);            // smoothstep, a soft curve
      return this.groundY - (this.groundY - peakTop) * eased;
    };

    // draw the filled green slope: a ramp rising left->right that levels into a
    // flat top at the peak (no overhang), ending just past the rock so the rock
    // sits on the ground with no orphan green behind it. one continuous shape.
    // draw the whole hill as ONE filled polygon: ground-left, up the curve, across
    // the flat top, down the right edge. one shape = no seams, no lips possible.
    const platRight = this.cliffTopX + 230;          // extends under the whole rock
    const pts = [{ x: mtnLeft, y: this.groundY + 6 }];
    for (let x = mtnLeft; x <= platRight; x += 4) {
      const curve = surfaceTopY(x);
      const top = curve <= this.cliffTopY + 14 ? this.cliffTopY : curve;
      pts.push({ x, y: top });
    }
    // clean top-right corner, then a single straight vertical drop to the ground
    pts.push({ x: platRight, y: this.cliffTopY });
    pts.push({ x: platRight, y: this.groundY + 6 });
    const slopeG = this.add.graphics().setDepth(3);
    slopeG.fillStyle(0x3f6d4e);                      // grass green body
    slopeG.fillPoints(pts, true);
    // a single light edge stroke along the top surface only (not the sides)
    slopeG.lineStyle(5, 0x5a8f63);
    slopeG.beginPath();
    for (let i = 1; i < pts.length - 1; i++) {
      if (i === 1) slopeG.moveTo(pts[i].x, pts[i].y);
      else slopeG.lineTo(pts[i].x, pts[i].y);
    }
    slopeG.strokePath();
    // speckle the hillside like the terrain — small darker grass tufts
    slopeG.fillStyle(0x35603f);
    for (let i = 0; i < 130; i++) {
      const spx = mtnLeft + 10 + Math.random() * (platRight - mtnLeft - 20);
      const curve = surfaceTopY(spx);
      const spTop = curve <= this.cliffTopY + 14 ? this.cliffTopY : curve;
      if (this.groundY - spTop < 24) continue;
      slopeG.fillRect(spx, spTop + 8 + Math.random() * (this.groundY - spTop - 14), 3, 2);
    }

    // scatter little flowers ALONG the whole green — up the slope, across the cliff
    // top by the cat, and behind the rock — so it's lush but never looks like a
    // bounce mushroom (only the real bounce mushrooms are mushrooms now).
    const plantFlower = (x) => {
      const top = surfaceTopY(x) + 2;   // returns the flat cliff height past the peak
      const key = Math.random() < 0.5 ? 'flower-white' : 'flower-yellow';
      this.add.image(x + (Math.random() - 0.5) * 14, top, key)
        .setOrigin(0.5, 1).setScale(0.85 + Math.random() * 0.4).setDepth(4);
    };
    // denser flowers up the slope
    for (let x = mtnLeft + 20; x < peakX - 60; x += 22) {
      if (Math.random() < 0.7) plantFlower(x);
    }
    // flowers across the cliff top (by the cat) and behind the rock
    for (let x = peakX - 40; x <= platRight - 10; x += 24) {
      if (Math.random() < 0.7) plantFlower(x);
    }

    // the green slope is decoration — you climb by bouncing up the mushrooms,
    // which sit flush on the slope surface as the path up to the cat.
    for (let x = mtnLeft + 90; x <= peakX - 230; x += 90) {
      const top = surfaceTopY(x);
      const power = -440 - (this.groundY - top) * 0.30;
      makeBounce(x, top + 10, 1.3, power, true);   // +10 sinks the base into the grass
    }

    this.physics.add.collider(this.player, this.mushrooms, (player, pad) => {
      // only bounce when coming DOWN onto the cap (player above it, falling).
      // hitting from below or the side just passes — no flatten, no fall-through.
      const fromAbove = player.body.velocity.y >= 0 && player.body.bottom <= pad.body.top + 24;
      if (fromAbove) {
        player.setVelocityY(pad.bouncePower);
        this.tweens.add({ targets: pad.bounceMush, scaleY: { from: pad.bounceMush.scaleY, to: pad.bounceMush.scaleY * 0.65 }, duration: 90, yoyo: true });
      }
    }, (player, pad) => {
      // process callback: only treat as a collision when landing on top
      return player.body.velocity.y >= 0 && player.body.bottom <= pad.body.top + 24;
    });

    // ── the scared cat, stranded on the cliff top — too afraid to climb down ──
    this.catSprite = this.add.image(this.cliffTopX, this.cliffTopY, 'cat-stand')
      .setOrigin(0.5, 1).setScale(1.4).setDepth(9);
    this.catRescued = false;
    this.catBreathe = this.tweens.add({ targets: this.catSprite, y: this.cliffTopY - 4,
      duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });   // anxious little breathing

    // ── the meadow: other horses grazing (your horse's future friends) ──
    this.meadowHorses = [];
    const meadowData = [
      { x: this.meadowX - 80, key: 'horse-grey', scale: 2 },
      { x: this.meadowX + 90, key: 'horse-dark', scale: 2 },
      { x: this.meadowX + 30, key: 'foal', scale: 1.8 }
    ];
    meadowData.forEach((h) => {
      const m = this.add.image(h.x, this.groundY + 2, h.key).setOrigin(0.5, 1).setScale(h.scale).setDepth(4);
      this.tweens.add({ targets: m, y: this.groundY - 2, duration: 1500 + Math.random() * 600,
        yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      m.baseX = h.x;
      this.meadowHorses.push(m);
    });

    // ── tall-grass gate (only passable on horseback) ──
    this.grassBlades = [];
    for (let gx = this.grassX - this.grassWidth / 2; gx <= this.grassX + this.grassWidth / 2; gx += 22) {
      const blade = this.add.image(gx, this.groundY + 4, 'tallgrass-day')
        .setOrigin(0.5, 1).setScale(1.5 + Math.random() * 0.3).setDepth(11);
      blade.baseX = gx;
      // gentle idle sway
      this.tweens.add({ targets: blade, angle: { from: -3, to: 3 },
        duration: 1600 + Math.random() * 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.grassBlades.push(blade);
    }
    // wall at the grass — a real physics wall (can't be pushed through),
    // removed once you've learned the grass is safe by riding through it
    this.grassWall = this.add.rectangle(this.grassX - this.grassWidth / 2, this.groundY - 300, 12, 640).setVisible(false);
    this.physics.add.existing(this.grassWall, true);
    this.grassWallCollider = this.physics.add.collider(this.player, this.grassWall);
    this.grassNoticed = false;
    this.grassLearned = false;
    this.grassLearnedShown = false;


    // ── bramble thicket past the cliff — a frightened bird is tangled inside ──
    this.brambleX = 7200;
    this.brambleWidth = 280;
    this.brambleBlades = [];
    for (let bx = this.brambleX - this.brambleWidth / 2; bx <= this.brambleX + this.brambleWidth / 2; bx += 20) {
      const thorn = this.add.image(bx, this.groundY + 4, 'bramble')
        .setOrigin(0.5, 1).setScale(1.5 + Math.random() * 0.3).setDepth(7);
      thorn.baseX = bx;
      this.tweens.add({ targets: thorn, angle: { from: -2, to: 2 },
        duration: 1800 + Math.random() * 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.brambleBlades.push(thorn);
    }
    // the trapped bird, low in the thorns near the far side
    this.birdX = 7280;
    this.birdFreed = false;
    this.birdHintShown = false;
    this.birdPanicking = false;
    this.birdSprite = this.add.image(this.birdX, this.groundY - 28, 'bird')
      .setOrigin(0.5, 1).setScale(1.6).setDepth(8);
    // an anxious little flutter — it's struggling to get free
    this.tweens.add({ targets: this.birdSprite, angle: { from: -6, to: 6 },
      duration: 220, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // ── resting field — trees, bushes, grass, and flowers, a wide quiet place after the bird ──
    this.restTreeX = 8000;
    // a smaller tree close beside the big one, slightly behind — a natural pair, not a row
    this.add.image(this.restTreeX - 75, this.groundY + 4, 'tree-lush-day')
      .setOrigin(0.5, 1).setScale(0.6).setDepth(4).setTint(0xc9d9c2);
    this.add.image(this.restTreeX, this.groundY + 4, 'tree-lush-day')
      .setOrigin(0.5, 1).setScale(1.1).setDepth(6);
    // bushes scattered at a few points, mid-height texture between flowers and trees
    const restBushXs = [-300, -210, -50, 90, 190, 300, 480, 680, 900, 1150];
    restBushXs.forEach((dx) => {
      this.add.image(this.restTreeX + dx + (Math.random() * 20 - 10), this.groundY + 4, 'bush-day')
        .setOrigin(0.5, 1).setScale(0.9 + Math.random() * 0.4).setDepth(5);
    });
    // tufts of grass scattered through the field, uneven and low
    const restGrassXs = [-320, -270, -220, -170, -120, -70, -20, 30, 80, 130, 180, 230, 280, 320,
                          360, 400, 440, 490, 540, 590, 650, 700, 760, 820, 880, 940,
                          1000, 1070, 1140, 1200, 1265, 1330];
    restGrassXs.forEach((dx) => {
      this.add.image(this.restTreeX + dx + (Math.random() * 14 - 7), this.groundY + 4, 'tallgrass-day')
        .setOrigin(0.5, 1).setScale(0.5 + Math.random() * 0.25).setDepth(5).setAlpha(0.9);
    });
    // flowers scattered unevenly through the field — not a neat row
    const restFlowerXs = [-330, -300, -260, -230, -195, -160, -130, -95, -65, -30, 5, 40,
                           75, 110, 145, 180, 215, 250, 285, 315,
                           380, 460, 550, 650, 760, 870, 990, 1120, 1260, 1390];
    restFlowerXs.forEach((dx) => {
      const key = Math.random() < 0.5 ? 'flower-white' : 'flower-yellow';
      const fx = this.restTreeX + dx + (Math.random() * 16 - 8);
      const scale = 1.0 + Math.random() * 0.5;
      this.add.image(fx, this.groundY + 4, key).setOrigin(0.5, 1).setScale(scale).setDepth(5);
    });
    this.restEntryShown = false;
    this.resting = false;
    this.restTimer = 0;
    this.restBirdVisited = false;
    this.restRabbitsVisited = false;

    // ── the horse + its gate ──
    this.horseSprite = this.add.image(this.horseX, this.groundY + 2, 'horse')
      .setOrigin(0.5, 1).setScale(2).setDepth(4);
    this.tweens.add({ targets: this.horseSprite, y: this.groundY - 2,
      duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // invisible gate just past the horse — blocks you until it's fed
    this.horseGate = this.add.rectangle(this.horseX + 70, this.groundY - 300, 12, 640).setVisible(false);
    this.physics.add.existing(this.horseGate, true);
    this.horseGateCollider = this.physics.add.collider(this.player, this.horseGate);

    // invisible wall at the water's edge — you stop at the shore, can't walk on the lake
    // (lake is now a foreground pool beside the path — no full wall)


    this.physics.world.setBounds(0, 0, worldWidth, height + 400);
    this.cameras.main.setBounds(0, 0, worldWidth, height);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    // the lerped follow lands on fractional scroll positions; snap rendering to the pixel grid
    this.cameras.main.setRoundPixels(true);

    // ── carried bucket (follows player) ──
    this.heldBucket = this.add.image(0, 0, 'bucket-empty')
      .setOrigin(0.5, 1).setScale(1.2).setDepth(6).setVisible(false);

    // ── input ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.keyE = this.input.keyboard.addKey('E');
    this.keyI = this.input.keyboard.addKey('I');
    // ── DEBUG teleport keys (harmless in normal play — just don't press them) ──
    this.debugKeys = this.input.keyboard.addKeys('ONE,TWO,THREE,FOUR,FIVE');
    // hold to walk slowly and gently — matters most in the bramble
    this.keyShift = this.input.keyboard.addKey('SHIFT');

    // ── prompt ──
    this.prompt = this.add.text(0, 0, '', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '15px',
      color: '#f0ece0', backgroundColor: '#00000066', padding: { x: 8, y: 4 }
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(150).setVisible(false);

    // ── faint kindness readout (TEST ONLY — we hide this later) ──
    this.kindnessDebug = this.add.text(this.W - 20, 18, 'kindness: 0', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '12px', color: '#cfe8d8'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(200).setAlpha(0.3);

    this.player.play('lpc-idle');
    this.time.delayedCall(600, () => this.showThought('north. but there\'s no hurry.'));
  }

  makeTextures() {
    const make = (cb, w, h, key) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      cb(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    // layered earth — grass cap over dirt, with speckles and buried stones
    // (same technique as EndingScene's terrain-dirt, in the forest's cool daylight)
    make((g) => {
      g.fillStyle(0x4e4136); g.fillRect(0, 0, 64, 96);                 // dirt body
      for (let i = 0; i < 30; i++) {
        g.fillStyle(Math.random() < 0.5 ? 0x3e332a : 0x5d5044);
        g.fillRect(Math.random() * 62, 18 + Math.random() * 74, 2, 2);
      }
      g.fillStyle(0x707a84);
      g.fillEllipse(14, 66, 8, 5); g.fillEllipse(46, 82, 10, 6); g.fillEllipse(33, 48, 6, 4);
      g.fillStyle(0x59616b);
      g.fillEllipse(15, 68, 5, 3); g.fillEllipse(48, 84, 6, 3);
      g.fillStyle(0x3f6d4e); g.fillRect(0, 0, 64, 12);                 // grass cap
      for (let x = 0; x < 64; x += 8) {                                // ragged cap edge
        g.fillTriangle(x, 12, x + 8, 12, x + 4, 15 + Math.random() * 5);
      }
      g.fillStyle(0x4f815b); g.fillRect(0, 0, 64, 7);
      g.fillStyle(0x5f9668); g.fillRect(0, 0, 64, 3);                  // lit top edge
    }, 64, 96, 'terrain-dirt-day');

    // grass blades standing up along the ground line
    make((g) => {
      const greens = [0x3f6d4e, 0x4f815b, 0x5f9668];
      for (let x = 0; x < 64; x += 5) {
        g.fillStyle(greens[Math.floor(Math.random() * greens.length)]);
        const h = 4 + Math.random() * 9;
        g.fillTriangle(x, 14, x + 4, 14, x + 2, 14 - h);
      }
    }, 64, 14, 'grass-fringe-day');

    // the weak tree and the healthy tree share the SAME trunk and branches —
    // an upright ordinary tree — so watering changes only the foliage.
    // weak: sparse dull yellow-brown clumps (thirsty, autumn-sick), and a
    // few fallen yellow leaves at its base
    make((g) => {
      g.fillStyle(0x5a4a34);
      g.fillRect(31, 40, 9, 100);                                      // trunk
      g.fillTriangle(31, 140, 22, 140, 32, 112);                       // root flare
      g.fillTriangle(40, 140, 49, 140, 39, 112);
      g.fillTriangle(32, 66, 16, 48, 20, 44);                          // left branch
      g.fillTriangle(39, 60, 52, 42, 56, 46);                          // right branch
      g.fillStyle(0x453724);
      g.fillRect(35, 46, 2, 68);                                       // bark shadow
      g.fillStyle(0x6d5b40);
      g.fillRect(31, 44, 2, 60);                                       // bark light
      g.fillStyle(0x6e6242);                                           // sparse clumps, dark
      g.fillEllipse(17, 44, 22, 14);
      g.fillEllipse(55, 42, 20, 13);
      g.fillEllipse(35, 32, 26, 16);
      g.fillStyle(0x84744a);                                           // mid, dry
      g.fillEllipse(15, 41, 14, 8);
      g.fillEllipse(53, 39, 12, 8);
      g.fillEllipse(33, 29, 16, 10);
      g.fillStyle(0x9a8752);                                           // the last pale leaves
      g.fillEllipse(31, 26, 10, 6);
      g.fillEllipse(14, 38, 7, 4);
      g.fillStyle(0x9a8752);                                           // fallen leaves at the base
      g.fillEllipse(18, 141, 7, 3); g.fillEllipse(52, 142, 8, 3); g.fillEllipse(60, 139, 5, 2);
      g.fillStyle(0x84744a);
      g.fillEllipse(26, 143, 6, 2); g.fillEllipse(44, 140, 5, 2);
    }, 70, 145, 'tree-weak');

    // healthy: the same silhouette in full green three-tone leaf, with small
    // white and pink blossoms — watering makes it bloom
    make((g) => {
      g.fillStyle(0x5a4a34);
      g.fillRect(31, 40, 9, 100);                                      // trunk (same as tree-weak)
      g.fillTriangle(31, 140, 22, 140, 32, 112);                       // root flare
      g.fillTriangle(40, 140, 49, 140, 39, 112);
      g.fillTriangle(32, 66, 16, 48, 20, 44);                          // left branch
      g.fillTriangle(39, 60, 52, 42, 56, 46);                          // right branch
      g.fillStyle(0x453724);
      g.fillRect(35, 46, 2, 68);                                       // bark shadow
      g.fillStyle(0x6d5b40);
      g.fillRect(31, 44, 2, 60);                                       // bark light
      g.fillStyle(0x2f5f44);                                           // canopy, dark
      g.fillEllipse(35, 40, 60, 46);
      g.fillEllipse(16, 52, 28, 24); g.fillEllipse(55, 50, 28, 24);
      g.fillStyle(0x43815a);                                           // canopy, mid
      g.fillEllipse(33, 35, 48, 36);
      g.fillEllipse(18, 47, 22, 17); g.fillEllipse(52, 44, 22, 18);
      g.fillStyle(0x5aa374);                                           // canopy, light
      g.fillEllipse(30, 27, 30, 20);
      g.fillEllipse(45, 31, 18, 13);
      g.fillStyle(0x70ba88);                                           // top glints
      g.fillCircle(25, 20, 4); g.fillCircle(37, 18, 3);
      g.fillStyle(0xf4f4ee);                                           // white blossoms
      g.fillCircle(20, 34, 2); g.fillCircle(42, 24, 2); g.fillCircle(54, 44, 2); g.fillCircle(30, 46, 2);
      g.fillStyle(0xe8b4c8);                                           // pink blossoms
      g.fillCircle(48, 36, 2); g.fillCircle(16, 46, 2); g.fillCircle(35, 30, 2);
    }, 70, 145, 'tree-healthy');

    // a full forest tree — EndingScene's tree-lush, in the day's cool greens
    make((g) => {
      g.fillStyle(0x5a4a34);
      g.fillRect(77, 130, 16, 110);                                    // trunk
      g.fillTriangle(77, 240, 61, 240, 79, 198);                       // root flare
      g.fillTriangle(93, 240, 109, 240, 91, 198);
      g.fillTriangle(78, 152, 52, 122, 60, 116);                       // branch stubs
      g.fillTriangle(92, 168, 120, 140, 126, 147);
      g.fillStyle(0x453724);
      g.fillRect(84, 138, 3, 44); g.fillRect(80, 190, 3, 34);          // bark shadow
      g.fillStyle(0x6d5b40);
      g.fillRect(77, 134, 3, 92);                                      // bark light
      g.fillStyle(0x2f5f44);                                           // canopy, dark
      g.fillEllipse(85, 86, 150, 110);
      g.fillEllipse(38, 112, 70, 60); g.fillEllipse(132, 110, 72, 62);
      g.fillStyle(0x43815a);                                           // canopy, mid
      g.fillEllipse(80, 74, 120, 86);
      g.fillEllipse(42, 100, 56, 44); g.fillEllipse(126, 98, 58, 46);
      g.fillStyle(0x5aa374);                                           // canopy, light
      g.fillEllipse(72, 58, 76, 50);
      g.fillEllipse(110, 64, 44, 34); g.fillEllipse(52, 76, 36, 26);
      g.fillStyle(0x70ba88);                                           // top glints
      g.fillCircle(66, 42, 8); g.fillCircle(92, 38, 6); g.fillCircle(112, 52, 5);
    }, 170, 240, 'tree-lush-day');

    // bare tree — thin and leafless, for the cold spaces between
    // (EndingScene's tree-bare with cooler daytime bark)
    make((g) => {
      g.fillStyle(0x6e5f4a);
      g.fillRect(27, 40, 8, 100);                                      // trunk
      g.fillTriangle(27, 44, 35, 44, 31, 6);                           // tapering up
      g.fillTriangle(29, 54, 8, 20, 12, 18);                           // left branch
      g.fillTriangle(33, 66, 52, 30, 56, 34);                          // right branch
      g.fillTriangle(30, 40, 20, 14, 24, 12);                          // small upper branch
      g.fillStyle(0x574a38);
      g.fillRect(31, 48, 3, 88);                                       // shaded side
    }, 60, 140, 'tree-bare-day');

    // bucket empty — banded metal pail with a lit and a shaded side
    make((g) => {
      g.fillStyle(0x9aa0a6);
      g.fillPoints([{ x: 4, y: 7 }, { x: 22, y: 7 }, { x: 19, y: 29 }, { x: 7, y: 29 }], true);
      g.fillStyle(0x7c828a);
      g.fillPoints([{ x: 16, y: 7 }, { x: 22, y: 7 }, { x: 19, y: 29 }, { x: 15, y: 29 }], true);  // shaded side
      g.fillStyle(0xb4bac0);
      g.fillPoints([{ x: 5, y: 8 }, { x: 8, y: 8 }, { x: 9, y: 28 }, { x: 7, y: 28 }], true);      // lit side
      g.fillStyle(0x666c74); g.fillRect(5, 24, 15, 2);   // lower band
      g.fillStyle(0x7c828a); g.fillRect(3, 5, 20, 4);
      g.fillStyle(0x8f959c); g.fillRect(3, 5, 20, 2);    // rim light
      g.lineStyle(2, 0x7c828a); g.beginPath(); g.arc(13, 7, 9, Math.PI, 0); g.strokePath();
    }, 26, 32, 'bucket-empty');

    // bucket full — same pail, water with a glint
    make((g) => {
      g.fillStyle(0x9aa0a6);
      g.fillPoints([{ x: 4, y: 7 }, { x: 22, y: 7 }, { x: 19, y: 29 }, { x: 7, y: 29 }], true);
      g.fillStyle(0x7c828a);
      g.fillPoints([{ x: 16, y: 7 }, { x: 22, y: 7 }, { x: 19, y: 29 }, { x: 15, y: 29 }], true);  // shaded side
      g.fillStyle(0xb4bac0);
      g.fillPoints([{ x: 5, y: 8 }, { x: 8, y: 8 }, { x: 9, y: 28 }, { x: 7, y: 28 }], true);      // lit side
      g.fillStyle(0x666c74); g.fillRect(5, 24, 15, 2);   // lower band
      g.fillStyle(0x4a90c2); g.fillRect(5, 9, 16, 5);    // water
      g.fillStyle(0x7fb8dc); g.fillRect(6, 9, 6, 2);     // glint on the water
      g.fillStyle(0x7c828a); g.fillRect(3, 5, 20, 4);
      g.fillStyle(0x8f959c); g.fillRect(3, 5, 20, 2);    // rim light
      g.lineStyle(2, 0x7c828a); g.beginPath(); g.arc(13, 7, 9, Math.PI, 0); g.strokePath();
    }, 26, 32, 'bucket-full');

    // carrot — item icon with a lit and a shaded flank, and taller tops in
    // the same soft greens as the grass so they don't glow against it
    make((g) => {
      g.fillStyle(0xe8772e);
      g.fillTriangle(9, 9, 14, 9, 11, 29);
      g.fillStyle(0xc25f22);
      g.fillTriangle(12, 9, 14, 9, 11, 27);              // shaded flank
      g.fillStyle(0xf29a55);
      g.fillTriangle(9, 9, 10, 9, 10, 23);               // lit flank
      g.fillStyle(0x4c7250);
      g.fillRect(8, 0, 2, 10); g.fillRect(14, 0, 2, 10);
      g.fillStyle(0x5d8a60);
      g.fillRect(11, 0, 2, 10);                          // lit middle leaf
    }, 22, 31, 'carrot');

    // rope — a coiled loop of rope
    make((g) => {
      g.fillStyle(0xb08850);
      g.fillEllipse(13, 14, 22, 18);            // outer coil
      g.fillStyle(0x2b2620);
      g.fillEllipse(13, 14, 10, 8);             // hole in the middle
      g.fillStyle(0x8a6a3c);
      g.fillRect(6, 7, 3, 3); g.fillRect(18, 9, 3, 3);   // little strand marks
      g.fillRect(9, 19, 3, 3); g.fillRect(16, 18, 3, 3);
    }, 26, 28, 'rope');

    // water — a little flask/bottle
    make((g) => {
      g.fillStyle(0x6b5d4d);
      g.fillRect(8, 0, 6, 4);                   // cork
      g.fillStyle(0x9aa6ae);
      g.fillRect(7, 4, 8, 3);                   // neck
      g.fillStyle(0x4a90c2);
      g.fillEllipse(11, 18, 16, 18);            // rounded bottle body, water-blue
      g.fillStyle(0x7fb8dc);
      g.fillEllipse(8, 15, 4, 6);               // shine
    }, 22, 30, 'water');

    // bread — a small loaf
    make((g) => {
      g.fillStyle(0xc79a5b);
      g.fillEllipse(13, 15, 24, 14);            // loaf body
      g.fillStyle(0xa87d42);
      g.fillRect(6, 9, 2, 8); g.fillRect(11, 8, 2, 9); g.fillRect(16, 9, 2, 8);  // score marks
      g.fillStyle(0xe0c089);
      g.fillEllipse(13, 12, 18, 5);             // floury top
    }, 26, 26, 'bread');

    // torch POST only (no flame — flame is its own sprite so it can dance)
    make((g) => {
      g.fillStyle(0x4e3c2a);
      g.fillRect(7, 14, 4, 30);            // wooden post
      g.fillStyle(0x5f4b34);
      g.fillRect(7, 14, 1, 30);            // lit edge
      g.fillStyle(0x3a2c1e);
      g.fillRect(10, 14, 1, 30);           // shaded edge
      g.fillStyle(0x3a2e20);
      g.fillRect(5, 12, 8, 5);             // holder
      g.fillStyle(0x55452e);
      g.fillRect(5, 12, 8, 2);             // holder rim catching light
      g.fillStyle(0x2b2118);
      g.fillRect(6, 26, 6, 2);             // binding band
    }, 18, 44, 'torch');

    // flame — its own little sprite, origin at the bottom so it sways from the base
    make((g) => {
      g.fillStyle(0xff8c3a);
      g.fillTriangle(7, 0, 1, 16, 13, 16); // outer
      g.fillStyle(0xffc14d);
      g.fillTriangle(7, 4, 3, 15, 11, 15); // mid
      g.fillStyle(0xfff3c4);
      g.fillTriangle(7, 9, 5, 14, 9, 14);  // hot core
    }, 14, 16, 'flame');

    // flower — a tiny five-petal bloom (white or yellow), for the green slope
    const makeFlower = (key, petal) => make((g) => {
      g.fillStyle(petal);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.fillCircle(8 + Math.cos(a) * 4, 8 + Math.sin(a) * 4, 3);   // petals
      }
      g.fillStyle(0xffd23f);
      g.fillCircle(8, 8, 2.4);                                       // golden center
    }, 16, 16, key);
    makeFlower('flower-white', 0xf4f4ee);
    makeFlower('flower-yellow', 0xffe680);

    // stepping stone — a rounded river boulder: lit crown, shaded underside,
    // wet base sunk in the water, and a pale waterline where they meet
    // (same layering as EndingScene's fire-ring stones)
    make((g) => {
      g.fillStyle(0x6b7278);
      g.fillEllipse(24, 10, 44, 20);                                   // body — same footprint as before
      g.fillStyle(0x878e94);
      g.fillEllipse(20, 6, 28, 9);                                     // lit crown
      g.fillStyle(0x9aa1a6);
      g.fillEllipse(16, 4, 12, 4);                                     // top highlight
      g.fillStyle(0x545b61);
      g.fillEllipse(28, 15, 34, 9);                                    // shaded underside
      g.fillStyle(0x3d4a52);
      g.fillEllipse(24, 22, 40, 12);                                   // wet base, sunk in the water
      g.fillStyle(0x9fd4e0, 0.5);
      g.fillEllipse(24, 20, 46, 4);                                    // waterline catching light
    }, 48, 30, 'stepping-stone');

    // rock — a split angular boulder: three flat facets (lit, mid, shadow)
    // with straight seams, moss along the top edge only, and a dark contact
    // shadow seating it in the grass
    make((g) => {
      g.fillStyle(0x2c332e, 0.85);
      g.fillEllipse(28, 45, 46, 6);                                    // contact shadow
      g.fillStyle(0x767d86);                                           // mid face — whole silhouette
      g.fillPoints([{ x: 4, y: 44 }, { x: 8, y: 22 }, { x: 22, y: 8 }, { x: 42, y: 10 }, { x: 52, y: 30 }, { x: 50, y: 44 }], true);
      g.fillStyle(0x99a0a8);                                           // lit face, top-left plane
      g.fillPoints([{ x: 8, y: 22 }, { x: 22, y: 8 }, { x: 30, y: 24 }, { x: 14, y: 34 }], true);
      g.fillStyle(0x565d66);                                           // shadow face, right plane
      g.fillPoints([{ x: 42, y: 10 }, { x: 52, y: 30 }, { x: 50, y: 44 }, { x: 34, y: 44 }, { x: 30, y: 24 }], true);
      g.lineStyle(1.5, 0x464d55);                                      // straight facet seams
      g.beginPath(); g.moveTo(22, 8); g.lineTo(30, 24); g.lineTo(34, 44); g.strokePath();
      g.beginPath(); g.moveTo(30, 24); g.lineTo(14, 34); g.strokePath();
      g.fillStyle(0x4f815b);                                           // moss along the top edge only
      g.fillEllipse(20, 9, 16, 5); g.fillEllipse(34, 9, 12, 4);
      g.fillStyle(0x5f9668);
      g.fillEllipse(18, 7, 8, 3);
    }, 56, 48, 'rock');

    // bounce mushroom — a chunky cartoon toadstool: sturdy flaring stem,
    // gills in shadow under the cap, and a glossy highlighted dome
    // (same size and cap footprint as before, so the bounce pads line up)
    make((g) => {
      g.fillStyle(0xd8ccb0);
      g.fillPoints([{ x: 15, y: 22 }, { x: 25, y: 22 }, { x: 27, y: 38 }, { x: 13, y: 38 }], true);  // stem, flaring down
      g.fillStyle(0xb8ac90);
      g.fillPoints([{ x: 22, y: 22 }, { x: 25, y: 22 }, { x: 27, y: 38 }, { x: 23, y: 38 }], true);  // stem shadow side
      g.fillEllipse(20, 38, 16, 4);                                    // base ring
      g.fillStyle(0x7a3a34);
      g.fillEllipse(20, 24, 34, 8);                                    // gills, in shadow under the cap
      g.fillStyle(0x9c453e);
      g.fillEllipse(20, 18, 38, 22);                                   // cap, dark under-curve
      g.fillStyle(0xb5524a);
      g.fillEllipse(20, 15, 34, 17);                                   // cap, main dome
      g.fillStyle(0xc9695e);
      g.fillEllipse(16, 11, 22, 9);                                    // cap, lit side
      g.fillStyle(0xdd8a7a);
      g.fillEllipse(13, 9, 10, 4);                                     // glossy highlight
      g.fillStyle(0xf0e6d2);
      g.fillCircle(13, 16, 3); g.fillCircle(27, 15, 3); g.fillCircle(20, 21, 2);  // spots
    }, 40, 40, 'mushroom');

    // cat — a small frightened tabby, curled and facing left
    make((g) => {
      g.fillStyle(0x8a7a66);
      g.fillEllipse(16, 20, 22, 12);              // body curled
      g.fillEllipse(9, 14, 11, 10);               // head
      g.fillTriangle(4, 10, 8, 10, 5, 4);         // ear
      g.fillTriangle(10, 10, 14, 10, 13, 4);      // ear
      g.fillRect(24, 12, 4, 12);                  // tail up, anxious
      g.fillStyle(0x6b5d4d);
      g.fillRect(14, 16, 3, 6); g.fillRect(19, 16, 3, 6);  // stripes
      g.fillStyle(0x2b2620);
      g.fillRect(6, 13, 2, 2); g.fillRect(11, 13, 2, 2);   // eyes
    }, 32, 28, 'cat');

    // cat (standing) — alert and anxious, on its own feet, facing left
    make((g) => {
      g.fillStyle(0x8a7a66);
      g.fillEllipse(17, 14, 24, 10);              // body
      g.fillRect(8, 18, 3, 8); g.fillRect(13, 18, 3, 8);   // front legs
      g.fillRect(20, 18, 3, 8); g.fillRect(25, 18, 3, 8);  // back legs
      g.fillEllipse(7, 9, 11, 10);                // head, up
      g.fillTriangle(2, 6, 6, 6, 3, 0);           // ear
      g.fillTriangle(8, 6, 12, 6, 11, 0);         // ear
      g.fillRect(28, 6, 3, 12);                   // tail up, anxious
      g.fillStyle(0x6b5d4d);
      g.fillRect(14, 11, 3, 5); g.fillRect(20, 11, 3, 5);  // stripes
      g.fillStyle(0x2b2620);
      g.fillRect(4, 8, 2, 2); g.fillRect(9, 8, 2, 2);      // eyes
    }, 34, 30, 'cat-stand');

    // cat (sitting) — settled and calm, tail curled round, facing left
    make((g) => {
      g.fillStyle(0x8a7a66);
      g.fillEllipse(16, 18, 20, 16);              // body, upright haunches
      g.fillEllipse(8, 9, 11, 10);                // head
      g.fillTriangle(3, 6, 7, 6, 4, 0);           // ear
      g.fillTriangle(9, 6, 13, 6, 12, 0);         // ear
      g.fillRect(6, 20, 4, 6); g.fillRect(22, 20, 4, 6);   // front paws down
      g.fillStyle(0x6b5d4d);
      g.fillEllipse(24, 22, 12, 5);               // tail curled round the side
      g.fillStyle(0x2b2620);
      g.fillRect(5, 8, 2, 2); g.fillRect(10, 8, 2, 2);     // eyes
    }, 32, 28, 'cat-sit');

    // rabbit (sitting) — one clean shape: round body, head, two tall ears,
    // dot eye, bright tail. less detail reads better at this size
    make((g) => {
      g.fillStyle(0xc9bba5);
      g.fillEllipse(11, 15, 16, 13);                // body
      g.fillCircle(6, 8, 5);                        // head
      g.fillRect(2, 0, 3, 9);                       // tall ear
      g.fillRect(7, 0, 3, 9);                       // tall ear
      g.fillStyle(0xe8e2d6);
      g.fillCircle(17, 14, 2.5);                    // tail
      g.fillStyle(0x2b2620);
      g.fillRect(3, 7, 2, 2);                       // eye
    }, 20, 22, 'rabbit-sit');

    // rabbit (hop) — mid-leap: one stretched body, head low, ears swept back,
    // legs reaching, bright tail
    make((g) => {
      g.fillStyle(0xc9bba5);
      g.fillEllipse(13, 11, 19, 10);                // body, stretched low
      g.fillCircle(4, 8, 4);                        // head, forward
      g.fillTriangle(4, 6, 11, 0, 13, 3);           // ear, swept back
      g.fillTriangle(3, 8, 10, 2, 12, 5);           // ear, swept back
      g.fillRect(3, 15, 3, 4);                      // front leg, reaching
      g.fillRect(18, 14, 3, 5);                     // back leg, pushing off
      g.fillStyle(0xe8e2d6);
      g.fillCircle(21, 8, 2.5);                     // tail
      g.fillStyle(0x2b2620);
      g.fillRect(2, 7, 2, 2);                       // eye
    }, 24, 20, 'rabbit-hop');

    // bush — a low flowering shrub, layered dark-to-light with a shaded side
    // (a cool daytime cousin of EndingScene's bush — its own key so the ending keeps its night one)
    make((g) => {
      g.fillStyle(0x3e5c44);                                           // base, dark
      g.fillEllipse(16, 18, 30, 22);
      g.fillEllipse(6, 14, 18, 16);
      g.fillEllipse(26, 14, 18, 16);
      g.fillStyle(0x365040);
      g.fillEllipse(24, 17, 16, 14);                                   // shaded side
      g.fillStyle(0x4f7d55);                                           // mid crown
      g.fillEllipse(14, 11, 22, 16);
      g.fillStyle(0x639468);                                           // lit top
      g.fillEllipse(11, 8, 14, 9);
      g.fillStyle(0xf4f4ee);
      g.fillCircle(9, 12, 2); g.fillCircle(22, 9, 2); g.fillCircle(16, 16, 2);
    }, 32, 26, 'bush-day');

    // horse — built in layers now (faces left, toward you): far legs in shadow,
    // a round barrel with a lit back and shaded belly, an arched neck with a
    // falling mane, a proper head with muzzle, eye and nostril, a flowing tail.
    // same canvas and same hoof line as before, so riding/wading line up
    const horseBody = (g, main, dark, light, mane) => {
      g.fillStyle(dark);
      g.fillRect(18, 36, 5, 21); g.fillRect(47, 36, 5, 21);        // far legs
      g.fillStyle(main);
      g.fillRect(26, 36, 5, 21); g.fillRect(55, 36, 5, 21);        // near legs
      g.fillStyle(0x2b2620);
      g.fillRect(18, 55, 5, 3); g.fillRect(47, 55, 5, 3);          // hooves
      g.fillRect(26, 55, 5, 3); g.fillRect(55, 55, 5, 3);
      g.fillStyle(main);
      g.fillEllipse(40, 29, 46, 23);                               // barrel
      g.fillPoints([{ x: 15, y: 32 }, { x: 10, y: 10 }, { x: 21, y: 10 }, { x: 29, y: 32 }], true);  // arched neck
      g.fillEllipse(12, 10, 17, 12);                               // head
      g.fillPoints([{ x: 2, y: 8 }, { x: 11, y: 5 }, { x: 11, y: 15 }, { x: 3, y: 13 }], true);      // muzzle
      g.fillStyle(dark);
      g.fillEllipse(42, 36, 38, 9);                                // shaded belly
      g.fillEllipse(53, 30, 18, 15);                               // shaded haunch
      g.fillStyle(light);
      g.fillEllipse(40, 22, 34, 7);                                // lit line of the back
      g.fillEllipse(12, 6, 11, 4);                                 // lit brow
      g.fillStyle(mane);
      g.fillTriangle(7, 5, 12, 4, 9, 0);                           // ear
      g.fillPoints([{ x: 14, y: 2 }, { x: 22, y: 6 }, { x: 30, y: 28 }, { x: 24, y: 28 }, { x: 17, y: 8 }], true);  // mane down the neck
      g.fillPoints([{ x: 58, y: 16 }, { x: 65, y: 20 }, { x: 63, y: 40 }, { x: 57, y: 34 }], true);  // tail
      g.fillStyle(0x2b2620);
      g.fillRect(7, 8, 2, 2);                                      // eye
      g.fillRect(3, 11, 2, 1);                                     // nostril
    };
    make((g) => horseBody(g, 0x6b4f3a, 0x523a2a, 0x82644a, 0x3a2a1e), 68, 60, 'horse');

    // meadow horses — the same build, their own coats
    make((g) => horseBody(g, 0x8a7a5c, 0x6b5d44, 0xa49472, 0x4e4432), 68, 60, 'horse-grey');
    make((g) => horseBody(g, 0x4a3a2c, 0x362a1f, 0x5f4c39, 0x241c14), 68, 60, 'horse-dark');

    // a baby foal — the same layered build, small and long-legged
    make((g) => {
      g.fillStyle(0x7d603f);
      g.fillRect(12, 24, 3, 13); g.fillRect(30, 24, 3, 13);        // far legs
      g.fillStyle(0x9a7a52);
      g.fillRect(17, 24, 3, 13); g.fillRect(35, 24, 3, 13);        // near legs
      g.fillStyle(0x2b2620);
      g.fillRect(12, 37, 3, 2); g.fillRect(30, 37, 3, 2);          // hooves
      g.fillRect(17, 37, 3, 2); g.fillRect(35, 37, 3, 2);
      g.fillStyle(0x9a7a52);
      g.fillEllipse(26, 19, 28, 14);                               // body
      g.fillPoints([{ x: 10, y: 21 }, { x: 7, y: 6 }, { x: 14, y: 6 }, { x: 19, y: 21 }], true);     // neck
      g.fillEllipse(8, 6, 11, 8);                                  // head
      g.fillStyle(0x7a5d3c);
      g.fillEllipse(27, 23, 22, 6);                                // shaded belly
      g.fillTriangle(4, 3, 8, 3, 6, 0);                            // ear
      g.fillPoints([{ x: 11, y: 2 }, { x: 16, y: 5 }, { x: 20, y: 19 }, { x: 16, y: 19 }], true);    // short mane
      g.fillPoints([{ x: 38, y: 12 }, { x: 42, y: 15 }, { x: 41, y: 27 }, { x: 37, y: 23 }], true);  // tail
      g.fillStyle(0xb08c60);
      g.fillEllipse(26, 14, 20, 5);                                // lit back
      g.fillStyle(0x2b2620);
      g.fillRect(5, 5, 2, 2);                                      // eye
    }, 44, 40, 'foal');

    // tall grass tuft — a blade cluster in three cool greens, deep to lit
    // (its own key so EndingScene keeps its night tallgrass)
    make((g) => {
      g.fillStyle(0x3a5a40);
      g.fillTriangle(2, 60, 6, 10, 10, 60);
      g.fillTriangle(10, 60, 15, 2, 20, 60);
      g.fillTriangle(18, 60, 24, 14, 30, 60);
      g.fillTriangle(26, 60, 31, 6, 36, 60);
      g.fillStyle(0x4c7250);
      g.fillTriangle(6, 60, 11, 20, 16, 60);
      g.fillTriangle(20, 60, 26, 10, 32, 60);
      g.fillStyle(0x5d8a60);
      g.fillTriangle(13, 60, 17, 12, 21, 60);                          // lit front blade
    }, 38, 62, 'tallgrass-day');

    // bramble — dark thorny cluster, a harsher cousin of the grass,
    // layered deep-to-lit with a pale rim blade and glinting berries
    make((g) => {
      g.fillStyle(0x232e22);
      g.fillTriangle(2, 60, 6, 8, 10, 60);
      g.fillTriangle(10, 60, 15, 0, 20, 60);
      g.fillTriangle(18, 60, 24, 12, 30, 60);
      g.fillTriangle(26, 60, 31, 4, 36, 60);
      g.fillStyle(0x35452f);
      g.fillTriangle(6, 60, 11, 18, 16, 60);
      g.fillTriangle(20, 60, 26, 8, 32, 60);
      g.fillStyle(0x46593c);
      g.fillTriangle(14, 60, 16, 14, 18, 60);                          // one pale rim blade
      // little thorns poking off the stems
      g.fillStyle(0x55402f);
      g.fillTriangle(12, 30, 16, 28, 12, 34);
      g.fillTriangle(24, 24, 28, 22, 24, 28);
      g.fillTriangle(8, 44, 4, 42, 8, 48);
      g.fillStyle(0x6b5540);
      g.fillTriangle(28, 36, 32, 34, 28, 40);                          // lit thorn
      // two tiny dark-red berries, each with a glint
      g.fillStyle(0x7a2e2e);
      g.fillCircle(18, 38, 3); g.fillCircle(27, 46, 2);
      g.fillStyle(0xa85555);
      g.fillCircle(17, 37, 1); g.fillCircle(26, 45, 1);
    }, 38, 62, 'bramble');

    // bird — small and brown, tucked low and frightened, facing left
    make((g) => {
      g.fillStyle(0x6b5135);
      g.fillEllipse(13, 13, 18, 12);              // body
      g.fillEllipse(6, 9, 9, 8);                  // head
      g.fillTriangle(0, 9, 5, 7, 5, 11);          // beak
      g.fillStyle(0x52402c);
      g.fillEllipse(16, 13, 9, 7);                // folded wing
      g.fillRect(20, 12, 5, 3);                   // short tail
      g.fillStyle(0x2b2620);
      g.fillRect(4, 7, 2, 2);                     // eye
    }, 26, 22, 'bird');
  }

  showThought(text, ms = 2800) {
    if (this.thought) this.thought.destroy();
    this.thought = this.add.text(this.W / 2, 92, text, {
      fontFamily: 'Georgia, serif', fontSize: '20px', color: '#ece8dc',
      fontStyle: 'italic', stroke: '#12161a', strokeThickness: 4,
      align: 'center', wordWrap: { width: this.W - 220 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(160).setAlpha(0);
    this.tweens.add({ targets: this.thought, alpha: 1, duration: 400 });
    this.time.delayedCall(ms, () => {
      if (this.thought) this.tweens.add({ targets: this.thought, alpha: 0, duration: 700 });
    });
  }

  sparkle(x, y) {
    for (let i = 0; i < 9; i++) {
      const s = this.add.circle(x, y, 3, 0xffe9a8).setDepth(70);
      const a = Math.random() * Math.PI * 2;
      this.tweens.add({
        targets: s, x: x + Math.cos(a) * 42, y: y + Math.sin(a) * 42 - 22,
        alpha: 0, duration: 900 + Math.random() * 500,
        onComplete: () => s.destroy()
      });
    }
  }

  addKindness(x, y) {
    this.kindness++;
    this.kindnessDebug.setText('kindness: ' + this.kindness);
    this.sparkle(x, y);
  }

  update() {
    // ── bag toggle (I) ──
    if (Phaser.Input.Keyboard.JustDown(this.keyI)) this.toggleBag();

    // ── DEBUG: jump to a section to test it (1 start, 2 horse, 3 cliff, 4 bramble) ──
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.ONE)) this.player.setPosition(120, this.groundY - 40);
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.TWO)) this.player.setPosition(2700, this.groundY - 40);
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.THREE)) this.player.setPosition(4600, this.groundY - 40);
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.FOUR)) this.player.setPosition(5750, this.groundY - 40);
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.FIVE)) this.player.setPosition(this.restTreeX - 100, this.groundY - 40);

    const px = this.player.x;

    // ── arriving at the resting field ──
    if (!this.restEntryShown && Math.abs(px - this.restTreeX) < 220) {
      this.restEntryShown = true;
      this.showThought('what a lovely place to rest.', 3200);
    }

    // ── a scream, far off. something has happened ──
    this.screamX = this.restTreeX + 500;
    if (!this.screamHeard && px > this.screamX) {
      this.screamHeard = true;
      // a beat of stillness before the thought lands — the character pausing to listen
      this.time.delayedCall(400, () => {
        this.showThought('someone is screaming.', 3200);
      });
    }

    // ── the crying settles in, after more walking, further along ──
    this.cryingCueX = this.restTreeX + 1150;
    if (!this.cryingHeard && this.screamHeard && px > this.cryingCueX) {
      this.cryingHeard = true;
      this.showThought('someone is crying out there. maybe they need help.', 3800);
    }

    // ── arriving — fade to black and hand off to the ending ──
    this.endingTransitionX = this.restTreeX + 1500;
    if (!this.endingTriggered && this.cryingHeard && px > this.endingTransitionX) {
      this.endingTriggered = true;
      this.player.setVelocity(0, 0);
      this.cameras.main.fadeOut(1400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        // MorningScene can still be running invisibly underneath us (main.js
        // starts it from the login handler without stopping other scenes).
        // EndingScene spends its preload frames drawing nothing, which let
        // the cabin show through for a moment — stop it before handing off.
        // (a no-op when MorningScene isn't running.)
        this.scene.stop('MorningScene');
        this.scene.start('EndingScene');
      });
    }

    // ── light the river torch as you approach the near bank ──
    if (!this.riverTorchLit && Math.abs(px - this.riverTorchX) < 50) {
      this.riverTorchLit = true;
      this.respawnX = this.riverTorchX;       // this is your checkpoint now
      this.respawnY = this.groundY - 40;
      this.riverTorchSprite.clearTint();
      this.riverTorchFlame.setVisible(true);
      this.tweens.add({ targets: this.riverTorchFlame, angle: { from: -4, to: 4 },
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: this.riverTorchFlame, scaleY: { from: 1.8, to: 1.95 },
        duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: this.riverTorchGlow, alpha: 0.18, duration: 600, ease: 'Sine.out',
        onComplete: () => {
          this.tweens.add({ targets: this.riverTorchGlow, alpha: { from: 0.10, to: 0.22 }, scale: { from: 0.92, to: 1.08 },
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        } });
      for (let i = 0; i < 10; i++) {
        const sp = this.add.circle(this.riverTorchX, this.groundY - 50, 2, 0xffd27a, 0.9).setDepth(7);
        const a = Math.random() * Math.PI * 2;
        this.tweens.add({ targets: sp, x: this.riverTorchX + Math.cos(a) * 26, y: this.groundY - 50 + Math.sin(a) * 26 - 14,
          alpha: 0, duration: 700 + Math.random() * 400, onComplete: () => sp.destroy() });
      }
    }

    // ── light the torch as you pass it (a warm point in the cold forest) ──
    if (!this.torchLit && Math.abs(px - this.torchX) < 50) {
      this.torchLit = true;
      this.respawnX = this.torchX;            // this is your checkpoint now
      this.respawnY = this.groundY - 40;
      this.torchSprite.clearTint();   // post catches warm light
      this.torchFlame.setVisible(true);
      // the flame sways gently, like the grass — slow and soft
      this.tweens.add({ targets: this.torchFlame, angle: { from: -4, to: 4 },
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: this.torchFlame, scaleY: { from: 1.8, to: 1.95 },
        duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: this.torchGlow, alpha: 0.18, duration: 600, ease: 'Sine.out',
        onComplete: () => {
          this.tweens.add({ targets: this.torchGlow, alpha: { from: 0.10, to: 0.22 }, scale: { from: 0.92, to: 1.08 },
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        } });
      // a little whoosh of sparks
      for (let i = 0; i < 10; i++) {
        const sp = this.add.circle(this.torchX, this.groundY - 50, 2, 0xffd27a, 0.9).setDepth(7);
        const a = Math.random() * Math.PI * 2;
        this.tweens.add({ targets: sp, x: this.torchX + Math.cos(a) * 26, y: this.groundY - 50 + Math.sin(a) * 26 - 14,
          alpha: 0, duration: 700 + Math.random() * 400, onComplete: () => sp.destroy() });
      }
    }

    // light the bramble checkpoint torch as you pass it on the ground
    if (!this.brambleTorchLit && Math.abs(px - this.brambleTorchX) < 50 &&
        this.player.y > this.groundY - 60) {
      this.brambleTorchLit = true;
      this.respawnX = this.brambleTorchX;      // this is your checkpoint now
      this.respawnY = this.groundY - 40;
      this.brambleTorchSprite.clearTint();
      this.brambleTorchFlame.setVisible(true);
      this.tweens.add({ targets: this.brambleTorchFlame, angle: { from: -4, to: 4 },
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: this.brambleTorchFlame, scaleY: { from: 1.8, to: 1.95 },
        duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: this.brambleTorchGlow, alpha: 0.18, duration: 600, ease: 'Sine.out',
        onComplete: () => {
          this.tweens.add({ targets: this.brambleTorchGlow, alpha: { from: 0.10, to: 0.22 }, scale: { from: 0.92, to: 1.08 },
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        } });
      for (let i = 0; i < 10; i++) {
        const sp = this.add.circle(this.brambleTorchX, this.groundY - 50, 2, 0xffd27a, 0.9).setDepth(7);
        const a = Math.random() * Math.PI * 2;
        this.tweens.add({ targets: sp, x: this.brambleTorchX + Math.cos(a) * 26, y: this.groundY - 50 + Math.sin(a) * 26 - 14,
          alpha: 0, duration: 700 + Math.random() * 400, onComplete: () => sp.destroy() });
      }
    }

    // the cliff is a mushroom hill now — bounce up to the cat, bounce back down,
    // steer with left/right. there's no pit to fall into, so no respawn needed.

    // ── stepping-stone water: fall in -> gentle splash, hop back to the bank ──
    const inCrossGap = px > this.crossX - this.crossWidth / 2 && px < this.crossX + this.crossWidth / 2;
    const inRiverGap = px > this.riverX - this.riverWidth / 2 && px < this.riverX + this.riverWidth / 2;
    if (this.player.y > this.groundY + 24 && this.player.body.velocity.y >= 0 && (inCrossGap || inRiverGap)) {
      // little splash
      for (let i = 0; i < 8; i++) {
        const drop = this.add.circle(this.player.x, this.groundY + 30, 3, 0x9fd4e0, 0.8).setDepth(60);
        const a = Math.random() * Math.PI - Math.PI / 2;
        this.tweens.add({ targets: drop, x: drop.x + Math.cos(a) * 30, y: drop.y - Math.abs(Math.sin(a)) * 30,
          alpha: 0, duration: 600, onComplete: () => drop.destroy() });
      }
      this.player.setVelocity(0, 0);
      this.player.setPosition(this.respawnX, this.groundY - 40);
      this.showThought('cold! ... try again.', 1600);
    }
    const onGround = this.player.body.blocked.down;
    const vx = Math.abs(this.player.body.velocity.x);

    // ── parallax ──
    const camX = this.cameras.main.scrollX;
    this.bgLayers.forEach((l) => { l.tilePositionX = camX * l.parallaxFactor / l.tileScaleX; });

    // ── movement ──
    // hold Shift to move slowly and gently (only on foot, not riding)
    this.movingSlow = this.keyShift.isDown && !this.riding;
    const baseSpeed = this.riding ? this.rideSpeed : this.walkSpeed;
    const inRiver = px > this.riverX - this.riverWidth / 2 && px < this.riverX + this.riverWidth / 2;
    const wading = this.riding && inRiver;
    let speed = this.movingSlow ? 90 : baseSpeed, jumpSpeed = -480;
    if (wading) speed = 150;   // the horse slows to wade through the deep water
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                 Phaser.Input.Keyboard.JustDown(this.wasd.W) ||
                 Phaser.Input.Keyboard.JustDown(this.cursors.space);

    // one-shot pose beats (watering, carrot crouch) hold off idle until they finish playing
    const poseHold = this.player.anims.isPlaying &&
      (this.player.anims.currentAnim?.key === 'lpc-water' || this.player.anims.currentAnim?.key === 'lpc-crouch');

    if (this.resting) {
      this.player.setVelocity(0, 0);
      this.restTimer += this.game.loop.delta;

      // ── the bird you freed comes to visit, quickly enough not to be missed ──
      if (this.birdFreed && !this.restBirdVisited && this.restTimer > 1200) {
        this.restBirdVisited = true;
        const bx = this.player.x + (this.player.flipX ? -60 : 60);
        this.birdSprite.setPosition(bx + 40, this.groundY - 220).setAlpha(1).setVisible(true).setAngle(0);
        this.tweens.add({ targets: this.birdSprite, x: bx, y: this.groundY - 28,
          duration: 900, ease: 'Sine.out',
          onComplete: () => {
            this.showThought('you again.', 2600);
            this.tweens.add({ targets: this.birdSprite, angle: { from: -4, to: 4 },
              duration: 260, yoyo: true, repeat: 4,
              onComplete: () => {
                // a little grateful hop, then off into the trees
                this.tweens.add({ targets: this.birdSprite, y: this.groundY - 60, duration: 300, yoyo: true,
                  onComplete: () => {
                    this.tweens.add({ targets: this.birdSprite, x: bx + 700, y: this.groundY - 480,
                      duration: 2000, ease: 'Sine.in', onComplete: () => this.birdSprite.setVisible(false) });
                  } });
              } });
          } });
      }

      // ── two rabbits pass through, unhurried, because the forest trusts stillness ──
      if (!this.restRabbitsVisited && this.restTimer > 3400) {
        this.restRabbitsVisited = true;
        const startX = this.player.x - 220, pauseX = this.player.x - 20, exitX = this.player.x + 600;
        [0, 500].forEach((delay) => {
          this.time.delayedCall(delay, () => {
            const rb = this.add.image(startX, this.groundY - 2, 'rabbit-hop')
              .setOrigin(0.5, 1).setScale(1.1).setDepth(9);
            const hopY = this.groundY - 2;
            const hopBounce = this.tweens.add({ targets: rb, y: hopY - 10, duration: 220,
              yoyo: true, repeat: -1, ease: 'Sine.out' });
            // hop in, pause a moment nearby, then hop off-screen and away
            this.tweens.add({ targets: rb, x: pauseX, duration: 1400, ease: 'Sine.inOut',
              onComplete: () => {
                this.time.delayedCall(1000, () => {
                  this.tweens.add({ targets: rb, x: exitX, duration: 2400, ease: 'Sine.in',
                    onComplete: () => { hopBounce.stop(); rb.destroy(); } });
                });
              } });
          });
        });
      }
    } else if (left) {
      this.player.setVelocityX(-speed); this.player.setFlipX(true);
      if (onGround && !this.riding && this.player.anims.currentAnim?.key !== 'lpc-walk') this.player.play('lpc-walk');
    } else if (right) {
      this.player.setVelocityX(speed); this.player.setFlipX(false);
      if (onGround && !this.riding && this.player.anims.currentAnim?.key !== 'lpc-walk') this.player.play('lpc-walk');
    } else if (onGround && !this.riding && !poseHold && this.player.anims.currentAnim?.key !== 'lpc-idle') {
      this.player.play('lpc-idle');
    }
    // riding and airborne poses override the on-foot walk/idle above
    if (this.riding) {
      if (this.player.anims.currentAnim?.key !== 'lpc-sit') this.player.play('lpc-sit');
    } else if (!onGround && !this.resting) {
      if (this.player.anims.currentAnim?.key !== 'lpc-jump') this.player.play('lpc-jump');
    }
    if (jump && onGround && !this.resting) this.player.setVelocityY(this.riding ? -540 : -340);

    // ── riding: horse moves under the player ──
    // ── tall-grass gate ──
    const grassL = this.grassX - this.grassWidth / 2;
    const grassR = this.grassX + this.grassWidth / 2;
    const inGrass = px > grassL - 18 && px < grassR + 18;
    // riding through the grass teaches you it's safe — then the wall comes down
    // on horseback and reaching the grass — the horse parts it, the wall comes down
    if (this.riding && !this.grassLearned && px > grassL - 60) {
      this.grassLearned = true;
      if (this.grassWallCollider) {
        this.physics.world.removeCollider(this.grassWallCollider);
        this.grassWallCollider = null;
      }
    }
    // on foot before learning: the wall blocks you, just show the hint once when near
    if (!this.riding && !this.grassLearned) {
      if (inGrass || Math.abs(px - grassL) < 40) {
        if (!this.grassNoticed) {
          this.grassNoticed = true;
          this.showThought('the grass is too tall — it could be dangerous on foot.');
        }
      } else {
        this.grassNoticed = false;
      }
    }
    // first gentle walk-through after learning — the grass is safe now
    if (this.grassLearned && !this.riding && inGrass && !this.grassLearnedShown) {
      this.grassLearnedShown = true;
      this.showThought('now i know the grass is safe, thanks to my friend.', 4000);
    }
    // grass parts as you pass through it
    this.grassBlades.forEach((b) => {
      const dx = this.player.x - b.baseX;
      if (Math.abs(dx) < 60) {
        b.x = b.baseX + (dx > 0 ? -10 : 10);
      } else {
        b.x += (b.baseX - b.x) * 0.1;
      }
    });

    // ── bramble: thorns part as you pass, and the bird reacts to how you move ──
    const brambleL = this.brambleX - this.brambleWidth / 2;
    const brambleR = this.brambleX + this.brambleWidth / 2;
    this.brambleBlades.forEach((b) => {
      const dx = this.player.x - b.baseX;
      if (Math.abs(dx) < 50) {
        b.x = b.baseX + (dx > 0 ? -8 : 8);
      } else {
        b.x += (b.baseX - b.x) * 0.1;
      }
    });
    // teaching hint as you near the thorns — re-arms when you walk away, so a
    // player who missed it the first time gets it again on their next approach.
    if (!this.birdFreed && !this.birdHintShown && px > brambleL - 120 && px < brambleL) {
      this.birdHintShown = true;
      this.showThought('thorns — and something trapped inside. move gently. (hold shift)', 7000);
    }
    if (px < brambleL - 140) this.birdHintShown = false;   // re-arm as soon as you step out — shows on every approach
    // a steady reminder while you're at the thorns on foot and haven't freed the
    // bird yet — so even if you missed the message, you always see what to do.
    this.atBrambleOnFoot = !this.birdFreed && !this.birdPanicking && !this.riding &&
                           !this.movingSlow && px > brambleL - 60 && px < brambleR;
    // panic: moving fast through the bramble (not slow) startles the bird
    if (!this.birdFreed && !this.birdPanicking &&
        px > brambleL && px < brambleR &&
        onGround && Math.abs(this.player.body.velocity.x) > 130) {
      this.birdPanicking = true;
      this.showThought('too fast — it panicked.', 2200);
      this.tweens.killTweensOf(this.birdSprite);
      // the bird bolts up and away into the dark
      this.tweens.add({ targets: this.birdSprite, y: this.birdSprite.y - 180, alpha: 0,
        duration: 900, ease: 'Quad.in' });
      // send you back to the checkpoint, then the bird returns to try again
      this.time.delayedCall(700, () => {
        this.player.setVelocity(0, 0);
        this.player.setPosition(this.respawnX, this.respawnY);
      });
      this.time.delayedCall(1600, () => {
        this.birdSprite.setPosition(this.birdX, this.groundY - 28).setAlpha(1);
        this.tweens.add({ targets: this.birdSprite, angle: { from: -6, to: 6 },
          duration: 220, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.birdPanicking = false;
      });
    }

    if (this.carryingCat) {
      // held in the arms, facing the way you walk — follows you down the climb
      this.catSprite.x = this.player.x + (this.player.flipX ? -6 : 6);
      this.catSprite.y = this.player.y + 20;
      this.catSprite.setFlipX(!this.player.flipX);
    } else if (this.catFollowing) {
      // a little companion now — trails behind you on foot, sits when you rest.
      // it keeps a gap on whichever side it's already on, so turning in place
      // doesn't make it snap across you — it only closes a gap that's too wide
      const gap = this.catSprite.x - this.player.x;     // + = cat is to your right
      const followGap = 100;
      let target = this.catSprite.x;
      if (gap > followGap) target = this.player.x + followGap;        // too far right -> ease in
      else if (gap < -followGap) target = this.player.x - followGap;  // too far left -> ease in
      this.catSprite.x += (target - this.catSprite.x) * 0.05;
      this.catSprite.y = this.groundY;
      const moving = vx > 20;
      if (moving) {
        this.catStopTimer = 0;
        if (this.catSprite.texture.key !== 'cat-stand') this.catSprite.setTexture('cat-stand');
        this.catSprite.setFlipX(this.catSprite.x < this.player.x);
      } else {
        this.catStopTimer += this.game.loop.delta;
        if (this.catStopTimer > 3000 && this.catSprite.texture.key !== 'cat-sit') {
          this.catSprite.setTexture('cat-sit');   // settled down to wait for you
        }
      }
    }

    if (this.riding) {
      this.horseSprite.x = this.player.x + 4;
      this.horseSprite.setFlipX(!this.player.flipX);
      // normal riding — anchored to the body so the hoof line stays where it always was,
      // even though the sprite itself is lifted onto the horse's back
      this.horseSprite.y = this.player.body.bottom - 6;
      if (wading) {
        // wading the river ONLY — the horse sinks chest-deep and bobs, water hiding its legs
        const bob = Math.sin(this.time.now / 200) * 3;
        this.horseSprite.y = this.player.body.bottom + 22 + bob;   // sinks lower into the water while crossing
        // ripples trailing at the waterline as the horse moves
        if (Math.abs(this.player.body.velocity.x) > 20 && this.time.now % 6 < 1) {
          const rip = this.add.ellipse(this.horseSprite.x, this.groundY + 8, 20, 5, 0x9fd4e0, 0.5).setDepth(5);
          this.tweens.add({ targets: rip, scaleX: 2.4, scaleY: 1.4, alpha: 0,
            duration: 900, ease: 'Sine.out', onComplete: () => rip.destroy() });
        }
        if (!this.riverThoughtShown) {
          this.riverThoughtShown = true;
          this.showThought("steady. i've got you.", 3000);
        }
      }
    } else if (this.horseFed && !this.saidGoodbye) {
      // dismounted companion — the horse gently trails behind you
      const behind = this.player.x - (this.player.flipX ? -70 : 70);
      this.horseSprite.x += (behind - this.horseSprite.x) * 0.04;
      this.horseSprite.setFlipX(this.horseSprite.x < this.player.x);
    }

    // ── carried bucket follows player ──
    if (this.carrying) {
      this.heldBucket.setVisible(true);
      this.heldBucket.setTexture(this.carrying === 'full' ? 'bucket-full' : 'bucket-empty');
      this.heldBucket.x = this.player.x + (this.player.flipX ? 16 : -16);
      this.heldBucket.y = this.player.y + 14;
    } else {
      this.heldBucket.setVisible(false);
    }


    // ── interaction prompt + action ──
    let label = null, action = null;
    const near = (x, r = 75) => Math.abs(px - x) < r;
    const nearCarrot = this.carrotSprites.find((cr) => cr.active && Math.abs(px - cr.itemX) < 70);
    if (nearCarrot) { label = 'pick up the carrot'; action = 'carrot'; this._nearCarrot = nearCarrot; }
    else if (!this.bucketPicked && near(this.bucketX)) { label = 'pick up the bucket'; action = 'pickup'; }
    else if (this.carrying === 'empty' && near(this.lakeFillX, 130)) { label = 'fill the bucket'; action = 'fill'; }
    else if (this.carrying === 'full' && !this.treeWatered && near(this.treeX)) { label = 'water the tree'; action = 'water'; }
    else if (!this.horseFed && near(this.horseX, 95) && (this.inventory.carrots || 0) > 0) { label = 'give the horse a carrot'; action = 'feedhorse'; }
    else if (!this.carryingCat && Math.abs(px - this.catSprite.x) < 70 && Math.abs(this.player.y - this.catSprite.y) < 80) { label = 'pick up the cat'; action = 'pickupcat'; }
    else if (!this.birdFreed && !this.birdPanicking && this.movingSlow && Math.abs(px - this.birdX) < 60) { label = 'free the bird'; action = 'freebird'; }
    else if (this.horseFed && !this.saidGoodbye && Math.abs(px - this.meadowX) < 160) { label = 'say goodbye'; action = 'farewell'; }
    else if (this.horseFed && !this.riding && !this.saidGoodbye && Math.abs(px - this.horseSprite.x) < 120) { label = 'ride the horse'; action = 'mount'; }
    else if (!this.resting && !this.riding && onGround && Math.abs(px - this.restTreeX) < 90) { label = 'lay down to rest'; action = 'restdown'; }
    else if (this.resting) { label = 'get up'; action = 'restup'; }
    else if (!this.horseFed && near(this.horseX, 95)) {
      label = null;
      if (!this.horseHungryHintShown) {
        this.horseHungryHintShown = true;
        this.showThought('the horse looks hungry.', 3200);
      }
    }
    else {
      const mh = this.meadowHorses && this.meadowHorses.find((m) => !m.fed && Math.abs(px - m.baseX) < 70);
      if (mh && (this.inventory.carrots || 0) > 0) { label = 'give a carrot'; action = 'feedmeadow'; this._nearMeadow = mh; }
    }

    // nothing else to do here? then you can set down whatever you're carrying
    if (!label && this.carryingCat && onGround && this.player.y > this.groundY - 60) { label = 'put down the cat'; action = 'putdowncat'; }
    else if (!label && this.carrying && onGround) { label = 'put down the bucket'; action = 'putdownbucket'; }

    if (label) {
      this.prompt.setText('▸ e  ' + label).setVisible(true);
      this.prompt.setPosition(this.W / 2, this.H - 40);
    } else if (this.atBrambleOnFoot) {
      // stuck at the thorns without holding shift? always show the full reminder.
      this.prompt.setText('▸ hold shift to move gently').setVisible(true);
      this.prompt.setPosition(this.W / 2, this.H - 40);
    } else {
      this.prompt.setVisible(false);
    }

    if (this.riding && action && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      // a mounted action takes priority over dismounting, so E does the action instead of getting off
      this.doAction(action);
    } else if (this.riding && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      const inGrassNow = this.player.x > (this.grassX - this.grassWidth / 2) - 18 &&
                         this.player.x < (this.grassX + this.grassWidth / 2) + 18;
      if (inGrassNow) {
        this.showThought("the grass is too tall — i shouldn't get down here.");
      } else {
        this.riding = false;
        this.player.setOffset(22, 26);
        this.player.y += 74;
        this.showThought('back on your feet.');
      }
    } else if (action && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.doAction(action);
    }
  }

  toggleBag() {
    this.bagOpen = !this.bagOpen;
    if (this.bagOpen) this.drawBag();
    else if (this.bagPanel) { this.bagPanel.destroy(); this.bagPanel = null; }
  }

  drawBag() {
    if (this.bagPanel) this.bagPanel.destroy();
    const W = this.W, H = this.H;
    const panel = this.add.container(0, 0).setScrollFactor(0).setDepth(300);

    const box = this.add.rectangle(W / 2, H / 2, 360, 240, 0x12181c, 0.94)
      .setStrokeStyle(2, 0x3a5a6e);
    const title = this.add.text(W / 2, H / 2 - 92, 'bag', {
      fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ece8dc'
    }).setOrigin(0.5);
    panel.add([box, title]);

    const items = Object.keys(this.inventory).filter((k) => this.inventory[k] > 0);
    if (items.length === 0) {
      const empty = this.add.text(W / 2, H / 2, 'empty for now.', {
        fontFamily: 'Helvetica Neue, sans-serif', fontSize: '15px', color: '#7c8a8e', fontStyle: 'italic'
      }).setOrigin(0.5);
      panel.add(empty);
    } else {
      items.forEach((name, i) => {
        const y = H / 2 - 50 + i * 36;
        if (this.textures.exists(name.replace(/s$/, ''))) {
          const icon = this.add.image(W / 2 - 110, y, name.replace(/s$/, '')).setOrigin(0.5).setScale(1.4);
          panel.add(icon);
        }
        const label = this.add.text(W / 2 - 80, y, name + '  ×' + this.inventory[name], {
          fontFamily: 'Helvetica Neue, sans-serif', fontSize: '16px', color: '#dce8e0'
        }).setOrigin(0, 0.5);
        panel.add(label);
      });
    }

    const hint = this.add.text(W / 2, H / 2 + 96, 'press i to close', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '12px', color: '#5a6a6e'
    }).setOrigin(0.5);
    panel.add(hint);

    this.bagPanel = panel;
  }

  addItem(name) {
    this.inventory[name] = (this.inventory[name] || 0) + 1;
  }

  doAction(action) {
    if (action === 'restdown') {
      this.resting = true;
      this.restTimer = 0;
      this.player.setVelocity(0, 0);
      this.player.body.setAllowGravity(false);   // stay put on the ground while resting
      this.player.play('lpc-rest');
      return;
    }
    if (action === 'restup') {
      this.resting = false;
      this.player.body.setAllowGravity(true);
      return;
    }
    if (action === 'freebird') {
      this.birdFreed = true;
      this.tweens.killTweensOf(this.birdSprite);
      this.addKindness(this.birdX, this.groundY - 60);
      this.showThought('there you go. carefully now.', 3200);
      // a gentle lift — perch a beat, then rise and fly off into the canopy
      this.tweens.add({ targets: this.birdSprite, y: this.groundY - 70, duration: 600, ease: 'Quad.out',
        onComplete: () => {
          this.tweens.add({ targets: this.birdSprite, y: this.groundY - 90, duration: 500, yoyo: true,
            onComplete: () => {
              this.tweens.add({ targets: this.birdSprite, x: this.birdX + 900, y: this.groundY - 520,
                duration: 3200, ease: 'Sine.in',
                onComplete: () => this.birdSprite.setVisible(false) });
            } });
        } });
      return;
    }
    if (action === 'farewell') {
      this.saidGoodbye = true;
      if (this.riding) {
        this.riding = false;
        this.player.setOffset(22, 26);
        this.player.y += 74;
      }
      // a heart floats up between you and the horse
      const hx = (this.player.x + this.horseSprite.x) / 2;
      const heart = this.add.text(hx, this.groundY - 70, '❤', {
        fontSize: '28px', color: '#e58a9a'
      }).setOrigin(0.5).setDepth(80);
      this.tweens.add({ targets: heart, y: this.groundY - 140, alpha: 0,
        duration: 2200, ease: 'Sine.out', onComplete: () => heart.destroy() });
      this.showThought("go on. i'll be alright. you found them.", 4000);
      this.addKindness(this.horseSprite.x, this.groundY - 60);
      // the horse trots off to join the meadow
      this.tweens.add({ targets: this.horseSprite, x: this.meadowX - 30, duration: 2600,
        ease: 'Sine.inOut', onComplete: () => {
          this.tweens.add({ targets: this.horseSprite, y: this.groundY - 6,
            duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        } });
      return;
    }
    if (action === 'mount') {
      this.riding = true;
      // lift the sprite (offset + y cancel out, so the body stays put) to seat it on the horse's back
      this.player.setOffset(22, 100);
      this.player.y -= 74;
      this.horseX = this.player.x;   // track from here
      this.showThought('up you go.');
      return;
    }
    if (action === 'feedhorse') {
      if (!this.riding) this.player.play('lpc-crouch');   // a quick bend-down beat
      this.inventory.carrots -= 1;
      this.horseFed = true;
      this.physics.world.removeCollider(this.horseGateCollider);
      this.addKindness(this.horseX, this.groundY - 60);
      this.tweens.add({ targets: this.horseSprite, y: this.groundY - 14,
        duration: 220, yoyo: true, repeat: 2, ease: 'Quad.out' });
      this.showThought('the horse eats happily. the way is clear.');
      return;
    }
    if (action === 'feedmeadow' && this._nearMeadow) {
      if (!this.riding) this.player.play('lpc-crouch');   // a quick bend-down beat
      this.inventory.carrots -= 1;
      this._nearMeadow.fed = true;
      this.sparkle(this._nearMeadow.x, this.groundY - 30);
      this.tweens.add({ targets: this._nearMeadow, y: this.groundY - 16,
        duration: 200, yoyo: true, repeat: 1, ease: 'Quad.out' });
      this.addKindness(this._nearMeadow.x, this.groundY - 40);
      this._nearMeadow = null;
      return;
    }
    if (action === 'pickupcat') {
      this.carryingCat = true;
      this.catFollowing = false;
      this.catSprite.setTexture('cat');   // curls up, safe in your arms
      this.catSprite.setScale(1.4);
      if (this.catBreathe) { this.catBreathe.stop(); this.catBreathe = null; }
      if (!this.catRescued) {
        this.catRescued = true;
        this.sparkle(this.catSprite.x, this.catSprite.y - 10);
        this.addKindness(this.catSprite.x, this.catSprite.y - 20);
        this.showThought("there you are. i've got you.", 3200);
      } else {
        this.showThought('up you come.', 2000);
      }
      return;
    }
    if (action === 'putdowncat') {
      this.carryingCat = false;
      this.catFollowing = true;
      this.catStopTimer = 0;
      this.catSprite.setTexture('cat-stand');   // back on its own feet
      this.catSprite.setPosition(Math.round(this.player.x) + (this.player.flipX ? -20 : 20), this.groundY);
      this.catSprite.setFlipX(false);
      if (!this.catSetDown) {
        this.catSetDown = true;
        this.showThought('there. safe on the ground.', 2400);
      }
      return;
    }
    if (action === 'putdownbucket') {
      this.groundBucketState = this.carrying;
      this.carrying = null;
      this.bucketPicked = false;
      this.bucketX = Math.round(this.player.x);
      this.groundBucket.setTexture(this.groundBucketState === 'full' ? 'bucket-full' : 'bucket-empty');
      this.groundBucket.setPosition(this.bucketX, this.groundY + 5);
      this.groundBucket.setVisible(true);
      this.bucketShadow.setPosition(this.bucketX, this.groundY + 4).setVisible(true);
      this.bucketTufts[0].setPosition(this.bucketX - 9, this.groundY + 5).setVisible(true);
      this.bucketTufts[1].setPosition(this.bucketX + 10, this.groundY + 5).setVisible(true);
      this.showThought('set it down for now.', 2200);
      return;
    }
    if (action === 'carrot' && this._nearCarrot) {
      if (!this.riding) this.player.play('lpc-crouch');   // a quick bend-down beat
      this.addItem('carrots');
      this.sparkle(this._nearCarrot.x, this._nearCarrot.y - 10);
      this._nearCarrot.destroy();
      this._nearCarrot = null;
      this.showThought('a carrot. into the bag.');
      return;
    }
    if (action === 'pickup') {
      this.bucketPicked = true;
      this.carrying = this.groundBucketState || 'empty';
      this.groundBucket.setVisible(false);
      this.bucketShadow.setVisible(false);
      this.bucketTufts.forEach((t) => t.setVisible(false));
      this.showThought('an old bucket. still good.');
    } else if (action === 'fill') {
      this.carrying = 'full';
      this.showThought('cold lake water.');
    } else if (action === 'water') {
      if (!this.riding) this.player.play('lpc-water');
      this.treeWatered = true;
      this.carrying = null;
      this.heldBucket.setVisible(false);
      this.add.ellipse(this.treeX + 34, this.groundY + 4, 32, 7, 0x2c332e, 0.5).setDepth(2);
      this.add.image(this.treeX + 34, this.groundY + 5, 'bucket-empty')
        .setOrigin(0.5, 1).setScale(1.3).setDepth(2);
      this.add.image(this.treeX + 26, this.groundY + 5, 'tallgrass-day')
        .setOrigin(0.5, 1).setScale(0.14).setDepth(3);
      this.treeSprite.setTexture('tree-healthy');
      this.treeSprite.setScale(this.treeScale * 0.9, this.treeScale * 0.78);
      this.tweens.add({ targets: this.treeSprite, scaleX: this.treeScale, scaleY: this.treeScale,
        duration: 750, ease: 'Back.out' });
      this.addKindness(this.treeX, this.groundY - 90);
      this.time.delayedCall(700, () => this.showThought('there. i\'ll bring you water every day.'));
    }
  }
}
