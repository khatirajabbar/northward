import Phaser from 'phaser';

export default class ForestScene extends Phaser.Scene {
  constructor() {
    super('ForestScene');
  }

  create() {
    const { width, height } = this.scale;
    this.W = width;
    this.H = height;
    const worldWidth = 6800;
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
    this.inventory = { rope: 1, water: 1, bread: 1 };
    this.bagOpen = false;
    // a little carrot field — a cluster you can harvest
    this.carrotXs = [820, 860, 900, 940, 980, 1020, 1060, 1100, 1140];
    this.carrotSprites = [];

    // ── the horse (a gate: hungry, won't let you pass until fed) ──
    this.horseX = 2400;
    this.grassX = 2900;          // tall-grass gate (only passable on horseback)
    this.meadowX = 3450;         // where the other horses graze
    this.crossX = 4200;          // stepping-stone water crossing (its own spot, past the meadow)
    this.crossWidth = 460;       // gap in the ground (water)
    this.stoneXs = [4020, 4110, 4200, 4290, 4380];  // 5 stones with real gaps to jump across
    this.respawnX = 3940;        // your latest checkpoint — updates each torch you light
    this.respawnY = this.groundY - 40;
    this.torchX = 3940;          // torch checkpoint before the crossing
    this.saidGoodbye = false;
    this.grassWidth = 320;
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
    addDW('dw-bg', 0.05, -25, 0x2b4453, 1);
    addDW('dw-far', 0.12, -24, 0x35525f, 0.9);
    addDW('dw-mid', 0.25, -23, 0x223843, 1);
    addDW('dw-close', 0.45, -22, 0x14242c, 1);

    // ── ground ──
    this.platforms = this.physics.add.staticGroup();
    const gapL = this.crossX - this.crossWidth / 2;
    const gapR = this.crossX + this.crossWidth / 2;
    for (let x = 0; x < worldWidth; x += 16) {
      if (x > gapL - 16 && x < gapR) continue;   // gap over the water (no tile bleed)
      this.platforms.create(x, this.groundY, 'grass').setOrigin(0, 0).refreshBody();
    }
    // water filling the pit (visual) — sits below the ground line, deep
    this.add.rectangle(this.crossX, this.groundY + 14, this.crossWidth + 20, 200, 0x24414f, 0.92).setOrigin(0.5, 0).setDepth(3);
    this.add.rectangle(this.crossX, this.groundY + 16, this.crossWidth - 10, 8, 0x4a7286, 0.7).setOrigin(0.5, 0).setDepth(4);
    // stepping stones — tops level with the ground, so you must JUMP between them
    this.stones = this.physics.add.staticGroup();
    this.stoneXs.forEach((sx) => {
      const stone = this.add.ellipse(sx, this.groundY + 6, 44, 20, 0x6b7278).setDepth(6);
      this.physics.add.existing(stone, true);
      stone.body.setSize(40, 12).setOffset(2, 0);
      this.stones.add(stone);
    });

    // ── torch checkpoint on the near bank — starts UNLIT, lights as you pass ──
    this.torchSprite = this.add.image(this.torchX, this.groundY + 2, 'torch')
      .setOrigin(0.5, 1).setScale(1.8).setDepth(6);
    this.torchSprite.setTint(0x555555);   // dark/unlit look
    // the flame sits at the top of the post, hidden until lit
    this.torchFlame = this.add.image(this.torchX, this.groundY - 52, 'flame')
      .setOrigin(0.5, 1).setScale(1.8).setDepth(7).setVisible(false);
    this.torchGlow = this.add.circle(this.torchX, this.groundY - 60, 34, 0xffb347, 0).setDepth(5);
    this.torchLit = false;


    // ── lake (visual pool on the shore) ──
    this.add.ellipse(this.lakeCenterX, this.groundY + 30, 220, 40, 0x24414f, 0.9).setDepth(8);
    this.add.ellipse(this.lakeCenterX, this.groundY + 28, 180, 28, 0x35586b, 0.85).setDepth(8);
    const shimmer = this.add.ellipse(this.lakeCenterX - 30, this.groundY + 4, 70, 6, 0x9fd4e0, 0.45).setDepth(4);
    this.tweens.add({ targets: shimmer, x: this.lakeCenterX + 40, alpha: 0.12,
      duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // ── the weak tree ──
    this.treeScale = 1.6;
    this.treeSprite = this.add.image(this.treeX, this.groundY + 4, 'tree-weak')
      .setOrigin(0.5, 1).setScale(this.treeScale).setDepth(2);

    // ── the bucket (on the path) ──
    this.groundBucket = this.add.image(this.bucketX, this.groundY + 2, 'bucket-empty')
      .setOrigin(0.5, 1).setScale(1.4).setDepth(2);

    // ── carrots on the path ──
    this.carrotXs.forEach((cx) => {
      const carrot = this.add.image(cx, this.groundY - 6, 'carrot').setOrigin(0.5, 1).setScale(1.4).setDepth(4);
      carrot.itemX = cx;
      this.tweens.add({ targets: carrot, y: this.groundY - 12, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.carrotSprites.push(carrot);
    });

    // ── player ──
    this.player = this.physics.add.sprite(120, this.groundY - 40, 'player', 12);
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(800);
    this.player.setMaxVelocity(220, 700);
    this.player.setScale(1.5);
    this.player.setSize(20, 28);
    this.player.setOffset(14, 18);
    this.player.setDepth(10);
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.stones);

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
    this.cliffTopX = 5260;
    this.cliffTopY = this.groundY - 300;
    makeLedge(this.cliffTopX + 10, this.cliffTopY, 240, 16);   // collision strip — only under the visible flat green

    // (no torch on the cliff top — there's nothing to fall into here, so no
    // checkpoint is needed; the mushroom hill is a gentle, no-death section.)

    // ── third torch on the ground past the cliff — checkpoint before the bramble ──
    this.brambleTorchX = 5800;
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
    const mtnLeft = 4560, peakX = 5240;
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
      const blade = this.add.image(gx, this.groundY + 4, 'tallgrass')
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
    this.brambleX = 6100;
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
    this.birdX = 6180;
    this.birdFreed = false;
    this.birdHintShown = false;
    this.birdPanicking = false;
    this.birdSprite = this.add.image(this.birdX, this.groundY - 28, 'bird')
      .setOrigin(0.5, 1).setScale(1.6).setDepth(8);
    // an anxious little flutter — it's struggling to get free
    this.tweens.add({ targets: this.birdSprite, angle: { from: -6, to: 6 },
      duration: 220, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

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

    // ── carried bucket (follows player) ──
    this.heldBucket = this.add.image(0, 0, 'bucket-empty')
      .setOrigin(0.5, 1).setScale(1.2).setDepth(6).setVisible(false);

    // ── input ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.keyE = this.input.keyboard.addKey('E');
    this.keyI = this.input.keyboard.addKey('I');
    // ── DEBUG teleport keys (harmless in normal play — just don't press them) ──
    this.debugKeys = this.input.keyboard.addKeys('ONE,TWO,THREE,FOUR');
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

    this.player.play('idle');
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

    // weak tree — drooping, dull
    make((g) => {
      g.fillStyle(0x5a4632); g.fillRect(30, 74, 10, 66);
      g.fillStyle(0x6b7a55);
      g.fillEllipse(35, 64, 54, 36);
      g.fillEllipse(20, 84, 32, 24);
      g.fillEllipse(52, 86, 28, 22);
    }, 70, 145, 'tree-weak');

    // healthy tree — upright, fuller, brighter
    make((g) => {
      g.fillStyle(0x6b5236); g.fillRect(30, 62, 10, 78);
      g.fillStyle(0x6f9f55);
      g.fillEllipse(35, 42, 62, 52);
      g.fillEllipse(18, 60, 38, 34);
      g.fillEllipse(54, 60, 38, 34);
      g.fillStyle(0x8cc06a);
      g.fillEllipse(35, 34, 44, 34);
    }, 70, 145, 'tree-healthy');

    // bucket empty
    make((g) => {
      g.fillStyle(0x9aa0a6);
      g.fillPoints([{ x: 4, y: 7 }, { x: 22, y: 7 }, { x: 19, y: 29 }, { x: 7, y: 29 }], true);
      g.fillStyle(0x7c828a); g.fillRect(3, 5, 20, 4);
      g.lineStyle(2, 0x7c828a); g.beginPath(); g.arc(13, 7, 9, Math.PI, 0); g.strokePath();
    }, 26, 32, 'bucket-empty');

    // bucket full
    make((g) => {
      g.fillStyle(0x9aa0a6);
      g.fillPoints([{ x: 4, y: 7 }, { x: 22, y: 7 }, { x: 19, y: 29 }, { x: 7, y: 29 }], true);
      g.fillStyle(0x4a90c2); g.fillRect(5, 9, 16, 5);
      g.fillStyle(0x7c828a); g.fillRect(3, 5, 20, 4);
      g.lineStyle(2, 0x7c828a); g.beginPath(); g.arc(13, 7, 9, Math.PI, 0); g.strokePath();
    }, 26, 32, 'bucket-full');

    // carrot — simple item icon
    make((g) => {
      g.fillStyle(0xe8772e);
      g.fillTriangle(9, 6, 14, 6, 11, 26);
      g.fillStyle(0x6faa4b);
      g.fillRect(8, 0, 2, 7); g.fillRect(11, 0, 2, 7); g.fillRect(14, 0, 2, 7);
    }, 22, 28, 'carrot');

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
      g.fillStyle(0x5a4632);
      g.fillRect(7, 14, 4, 30);            // wooden post
      g.fillStyle(0x3a2e20);
      g.fillRect(5, 12, 8, 5);             // holder
    }, 18, 44, 'torch');

    // flame — its own little sprite, origin at the bottom so it sways from the base
    make((g) => {
      g.fillStyle(0xffb347);
      g.fillTriangle(7, 0, 1, 16, 13, 16); // outer
      g.fillStyle(0xffe08a);
      g.fillTriangle(7, 5, 3, 15, 11, 15); // inner
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

    // rock — angular grey boulders with facets and cracks, sitting on the ground
    make((g) => {
      // big main boulder — an angular polygon, not a soft blob
      g.fillStyle(0x7c828b);
      g.fillPoints([{x:6,y:46},{x:2,y:30},{x:14,y:14},{x:30,y:10},{x:40,y:22},{x:38,y:46}], true);
      // lit top-left facet
      g.fillStyle(0x969ca4);
      g.fillPoints([{x:14,y:14},{x:30,y:10},{x:28,y:24},{x:12,y:28}], true);
      // shadowed right facet
      g.fillStyle(0x646a72);
      g.fillPoints([{x:40,y:22},{x:38,y:46},{x:28,y:46},{x:28,y:24}], true);
      // a second smaller boulder on the right
      g.fillStyle(0x868d96);
      g.fillPoints([{x:36,y:46},{x:34,y:30},{x:44,y:24},{x:52,y:34},{x:50,y:46}], true);
      g.fillStyle(0x646a72);
      g.fillPoints([{x:44,y:24},{x:52,y:34},{x:50,y:46},{x:44,y:46}], true);
      // dark cracks
      g.lineStyle(1.5, 0x4c525a);
      g.beginPath(); g.moveTo(20,12); g.lineTo(24,30); g.lineTo(18,44); g.strokePath();
      g.beginPath(); g.moveTo(30,11); g.lineTo(34,26); g.strokePath();
      // tiny moss tufts on top
      g.fillStyle(0x5a8f63);
      g.fillEllipse(22, 11, 12, 4); g.fillEllipse(42, 25, 8, 3);
    }, 56, 48, 'rock');

    // bounce mushroom — a springy toadstool
    make((g) => {
      g.fillStyle(0xe8dcc0);
      g.fillRect(15, 20, 10, 18);            // stem
      g.fillStyle(0xb5524a);
      g.fillEllipse(20, 18, 38, 22);         // cap
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

    // horse — simple standing silhouette (faces left, toward you)
    make((g) => {
      g.fillStyle(0x6b4f3a);
      g.fillEllipse(34, 30, 46, 22);                 // body
      g.fillRect(16, 38, 5, 20); g.fillRect(26, 38, 5, 20);   // front legs
      g.fillRect(44, 38, 5, 20); g.fillRect(54, 38, 5, 20);   // back legs
      g.fillEllipse(14, 18, 16, 13);                 // head
      g.fillRect(10, 8, 5, 12);                      // neck/face up
      g.fillStyle(0x4a3526);
      g.fillTriangle(8, 6, 12, 6, 10, 0);            // ear
      g.fillRect(50, 14, 4, 18);                     // tail
    }, 68, 60, 'horse');

    // meadow horses — same shape, different colors
    const horseBody = (g, main, dark) => {
      g.fillStyle(main);
      g.fillEllipse(34, 30, 46, 22);
      g.fillRect(16, 38, 5, 20); g.fillRect(26, 38, 5, 20);
      g.fillRect(44, 38, 5, 20); g.fillRect(54, 38, 5, 20);
      g.fillEllipse(14, 18, 16, 13);
      g.fillRect(10, 8, 5, 12);
      g.fillStyle(dark);
      g.fillTriangle(8, 6, 12, 6, 10, 0);
      g.fillRect(50, 14, 4, 18);
    };
    make((g) => horseBody(g, 0x8a7a5c, 0x6b5d44), 68, 60, 'horse-grey');
    make((g) => horseBody(g, 0x4a3a2c, 0x33271d), 68, 60, 'horse-dark');

    // a baby foal — same shape, just smaller drawing
    make((g) => {
      g.fillStyle(0x9a7a52);
      g.fillEllipse(22, 20, 30, 15);
      g.fillRect(11, 26, 3, 13); g.fillRect(17, 26, 3, 13);
      g.fillRect(28, 26, 3, 13); g.fillRect(34, 26, 3, 13);
      g.fillEllipse(9, 12, 11, 9);
      g.fillRect(6, 5, 4, 9);
      g.fillStyle(0x7a5d3c);
      g.fillTriangle(5, 4, 8, 4, 6, 0);
      g.fillRect(32, 10, 3, 12);
    }, 44, 40, 'foal');

    // tall grass tuft — a blade cluster
    make((g) => {
      g.fillStyle(0x4a6b42);
      g.fillTriangle(2, 60, 6, 10, 10, 60);
      g.fillTriangle(10, 60, 15, 2, 20, 60);
      g.fillTriangle(18, 60, 24, 14, 30, 60);
      g.fillTriangle(26, 60, 31, 6, 36, 60);
      g.fillStyle(0x5c7d4f);
      g.fillTriangle(6, 60, 11, 20, 16, 60);
      g.fillTriangle(20, 60, 26, 10, 32, 60);
    }, 38, 62, 'tallgrass');

    // bramble — dark thorny cluster, a harsher cousin of the grass
    make((g) => {
      g.fillStyle(0x2e3a2b);
      g.fillTriangle(2, 60, 6, 8, 10, 60);
      g.fillTriangle(10, 60, 15, 0, 20, 60);
      g.fillTriangle(18, 60, 24, 12, 30, 60);
      g.fillTriangle(26, 60, 31, 4, 36, 60);
      g.fillStyle(0x3f4f3a);
      g.fillTriangle(6, 60, 11, 18, 16, 60);
      g.fillTriangle(20, 60, 26, 8, 32, 60);
      // little thorns poking off the stems
      g.fillStyle(0x55402f);
      g.fillTriangle(12, 30, 16, 28, 12, 34);
      g.fillTriangle(24, 24, 28, 22, 24, 28);
      g.fillTriangle(8, 44, 4, 42, 8, 48);
      // two tiny dark-red berries
      g.fillStyle(0x7a2e2e);
      g.fillCircle(18, 38, 3); g.fillCircle(27, 46, 2);
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

    const px = this.player.x;

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
    if (this.player.y > this.groundY + 24 && this.player.body.velocity.y >= 0 &&
        px > this.crossX - this.crossWidth / 2 && px < this.crossX + this.crossWidth / 2) {
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
    const speed = this.movingSlow ? 90 : baseSpeed, jumpSpeed = -480;
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                 Phaser.Input.Keyboard.JustDown(this.wasd.W) ||
                 Phaser.Input.Keyboard.JustDown(this.cursors.space);

    if (left) {
      this.player.setVelocityX(-speed); this.player.setFlipX(true);
      if (onGround && this.player.anims.currentAnim?.key !== 'walk') this.player.play('walk');
    } else if (right) {
      this.player.setVelocityX(speed); this.player.setFlipX(false);
      if (onGround && this.player.anims.currentAnim?.key !== 'walk') this.player.play('walk');
    } else if (onGround && this.player.anims.currentAnim?.key !== 'idle') {
      this.player.play('idle');
    }
    if (jump && onGround) this.player.setVelocityY(this.riding ? -540 : -340);

    // ── riding: horse moves under the player ──
    // ── tall-grass gate ──
    const grassL = this.grassX - this.grassWidth / 2;
    const grassR = this.grassX + this.grassWidth / 2;
    const inGrass = px > grassL - 18 && px < grassR + 18;
    // riding through the grass teaches you it's safe — then the wall comes down
    if (this.riding && inGrass && !this.grassLearned) {
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
      // horse sits just below the player and follows the full jump arc
      this.horseSprite.y = this.player.y + 22;
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
    else if (!this.horseFed && near(this.horseX, 95)) { label = null; }
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

    if (this.riding && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      const inGrassNow = this.player.x > (this.grassX - this.grassWidth / 2) - 18 &&
                         this.player.x < (this.grassX + this.grassWidth / 2) + 18;
      if (inGrassNow) {
        this.showThought("the grass is too tall — i shouldn't get down here.");
      } else {
        this.riding = false;
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
      this.riding = false;
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
      this.horseX = this.player.x;   // track from here
      this.showThought('up you go.');
      return;
    }
    if (action === 'feedhorse') {
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
      this.groundBucket.setPosition(this.bucketX, this.groundY + 2);
      this.groundBucket.setVisible(true);
      this.showThought('set it down for now.', 2200);
      return;
    }
    if (action === 'carrot' && this._nearCarrot) {
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
      this.showThought('an old bucket. still good.');
    } else if (action === 'fill') {
      this.carrying = 'full';
      this.showThought('cold lake water.');
    } else if (action === 'water') {
      this.treeWatered = true;
      this.carrying = null;
      this.heldBucket.setVisible(false);
      this.add.image(this.treeX + 34, this.groundY + 2, 'bucket-empty')
        .setOrigin(0.5, 1).setScale(1.3).setDepth(2);
      this.treeSprite.setTexture('tree-healthy');
      this.treeSprite.setScale(this.treeScale * 0.9, this.treeScale * 0.78);
      this.tweens.add({ targets: this.treeSprite, scaleX: this.treeScale, scaleY: this.treeScale,
        duration: 750, ease: 'Back.out' });
      this.addKindness(this.treeX, this.groundY - 90);
      this.time.delayedCall(700, () => this.showThought('there. i\'ll bring you water every day.'));
    }
  }
}
