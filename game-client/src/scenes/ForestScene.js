import Phaser from 'phaser';

export default class ForestScene extends Phaser.Scene {
  constructor() {
    super('ForestScene');
  }

  create() {
    const { width, height } = this.scale;
    this.W = width;
    this.H = height;
    const worldWidth = 5600;
    this.groundY = height - 60;

    this.makeTextures();

    // ── landmark positions ──
    this.bucketX = 620;
    this.treeX = 1080;
    this.lakeCenterX = 1980;
    this.deerX = 1820;
    this.lakeFillX = 1880;

    // ── state ──
    this.carrying = null;       // null | 'empty' | 'full'
    this.bucketPicked = false;
    this.treeWatered = false;
    this.deerState = 'drinking'; // 'drinking' | 'scared' | 'done'
    this.calmTimer = 0;
    this.kindness = 0;
    this.deerNoticed = false;

    // ── inventory (generic: holds any item by name) ──
    this.inventory = {};
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
    this.respawnX = 3940;        // near bank (by the torch), where you hop back if you fall in
    this.torchX = 3940;          // torch checkpoint before the crossing
    this.saidGoodbye = false;
    this.grassWidth = 320;
    this.horseFed = false;
    this.riding = false;
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

    // ── the deer (drinking at the lake) ──
    this.deerSprite = this.add.image(this.deerX, this.groundY + 2, 'deer-drink')
      .setOrigin(0.5, 1).setScale(1.5).setDepth(4).setFlipX(true);

    // ── carrots on the path ──
    this.carrotXs.forEach((cx) => {
      const carrot = this.add.image(cx, this.groundY - 6, 'carrot').setOrigin(0.5, 1).setScale(1.4).setDepth(4);
      carrot.itemX = cx;
      this.tweens.add({ targets: carrot, y: this.groundY - 12, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.carrotSprites.push(carrot);
    });
    this.tweens.add({ targets: this.deerSprite, y: this.groundY + 6,
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

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
    const makeLedge = (x, topY, w) => {
      const h = 320;
      const ledge = this.add.rectangle(x, topY + h / 2, w, h, 0x2b2620).setDepth(5);
      this.physics.add.existing(ledge, true);
      this.ledges.add(ledge);
      this.add.rectangle(x, topY, w, 5, 0x3f5240).setDepth(6);  // mossy top edge
    };
    this.cliffTopX = 5260;
    this.cliffTopY = this.groundY - 300;
    makeLedge(this.cliffTopX, this.cliffTopY, 240);   // the cat's cliff

    // ── ascending rock steps, each holding a bounce mushroom ──
    const stepData = [
      { x: 4780, topY: this.groundY - 70,  w: 90 },
      { x: 4910, topY: this.groundY - 140, w: 90 },
      { x: 5040, topY: this.groundY - 210, w: 90 },
    ];
    stepData.forEach((s) => makeLedge(s.x, s.topY, s.w));
    this.physics.add.collider(this.player, this.ledges);

    // ── bounce mushrooms: one on the ground, then one on each step, climbing to the cliff ──
    this.mushrooms = this.physics.add.staticGroup();
    const makeBounce = (x, groundTopY, scale, power) => {
      const capY = groundTopY - 12;
      const m = this.add.image(x, capY, 'mushroom').setOrigin(0.5, 1).setScale(scale).setDepth(7);
      this.tweens.add({ targets: m, scaleX: { from: scale, to: scale + 0.08 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const pad = this.add.rectangle(x, capY - scale * 18, 34 * scale, 10, 0xff0000, 0).setDepth(7);
      this.physics.add.existing(pad, true);
      pad.bounceMush = m;
      pad.bouncePower = power;
      this.mushrooms.add(pad);
    };
    // sitting ON the ground, then ON each rock step — climbing up
    makeBounce(4660, this.groundY,        1.0, -420);  // on the ground
    makeBounce(4780, this.groundY - 70,   1.2, -460);  // on step 1
    makeBounce(4910, this.groundY - 140,  1.4, -500);  // on step 2
    makeBounce(5040, this.groundY - 210,  1.6, -560);  // on step 3 -> up to the cliff
    this.physics.add.collider(this.player, this.mushrooms, (player, pad) => {
      if (player.body.velocity.y >= 0) {
        player.setVelocityY(pad.bouncePower);
        this.tweens.add({ targets: pad.bounceMush, scaleY: { from: pad.bounceMush.scaleY, to: pad.bounceMush.scaleY * 0.65 }, duration: 90, yoyo: true });
      }
    });

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
        .setOrigin(0.5, 1).setScale(1.5 + Math.random() * 0.3).setDepth(7);
      blade.baseX = gx;
      // gentle idle sway
      this.tweens.add({ targets: blade, angle: { from: -3, to: 3 },
        duration: 1600 + Math.random() * 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.grassBlades.push(blade);
    }
    // wall at the grass — blocks on foot, removed while riding
    this.grassNoticed = false;
    this.grassLearned = false;
    this.grassLearnedShown = false;

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
    this.shoreX = this.lakeCenterX - 130;


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

    // deer — simple silhouette
    make((g) => {
      g.fillStyle(0x5b4632);
      g.fillEllipse(24, 22, 30, 14);
      g.fillRect(11, 26, 4, 12); g.fillRect(33, 26, 4, 12);
      g.fillRect(18, 26, 4, 12); g.fillRect(27, 26, 4, 12);
      g.fillEllipse(38, 14, 13, 11);
      g.fillRect(40, 4, 2, 9); g.fillRect(44, 5, 2, 8);
    }, 50, 42, 'deer');

    // deer drinking — head lowered toward the water (faces right)
    make((g) => {
      g.fillStyle(0x5b4632);
      g.fillEllipse(22, 18, 30, 14);
      g.fillRect(10, 22, 4, 14); g.fillRect(16, 22, 4, 14);
      g.fillRect(28, 22, 4, 14); g.fillRect(33, 22, 4, 14);
      g.fillEllipse(42, 30, 11, 9);          // head lowered to the ground/water
      g.fillRect(38, 24, 4, 8);              // neck angled down
      g.fillRect(44, 22, 2, 7); g.fillRect(47, 23, 2, 6);  // ears/antlers
    }, 54, 44, 'deer-drink');

    // carrot — simple item icon
    make((g) => {
      g.fillStyle(0xe8772e);
      g.fillTriangle(9, 6, 14, 6, 11, 26);
      g.fillStyle(0x6faa4b);
      g.fillRect(8, 0, 2, 7); g.fillRect(11, 0, 2, 7); g.fillRect(14, 0, 2, 7);
    }, 22, 28, 'carrot');

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

    // bounce mushroom — a springy toadstool
    make((g) => {
      g.fillStyle(0xe8dcc0);
      g.fillRect(15, 20, 10, 18);            // stem
      g.fillStyle(0xb5524a);
      g.fillEllipse(20, 18, 38, 22);         // cap
      g.fillStyle(0xf0e6d2);
      g.fillCircle(13, 16, 3); g.fillCircle(27, 15, 3); g.fillCircle(20, 21, 2);  // spots
    }, 40, 40, 'mushroom');

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

    const px = this.player.x;

    // ── light the torch as you pass it (a warm point in the cold forest) ──
    if (!this.torchLit && Math.abs(px - this.torchX) < 50) {
      this.torchLit = true;
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

    // ── cliff climb: fall back down between the steps -> back to the torch ──
    // the climbing zone is BETWEEN the first step and the cliff; if you're back
    // on the ground in that middle stretch, you fell — return to the torch.
    if (this.player.body.blocked.down &&
        px > 4720 && px < this.cliffTopX - 40 &&
        this.player.y > this.groundY - 60) {
      this.player.setVelocity(0, 0);
      this.player.setPosition(this.torchX, this.groundY - 40);
      this.showThought('back to the torch. try again.', 1600);
    }

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
    const speed = this.riding ? this.rideSpeed : this.walkSpeed, jumpSpeed = -480;
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
    // riding through the grass teaches you it's safe
    if (this.riding && inGrass) this.grassLearned = true;
    if (!this.riding && !this.grassLearned) {
      if (inGrass) {
        // push the player back to whichever edge they came from
        const cameFromLeft = this.player.body.velocity.x > 0 || px < this.grassX;
        this.player.x = cameFromLeft ? grassL - 20 : grassR + 20;
        this.player.setVelocityX(0);
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

    // ── deer behaviour ──
    if (this.deerState === 'drinking') {
      const d = Math.abs(px - this.deerX);
      if (!this.deerNoticed && d < 300) {
        this.deerNoticed = true;
        this.showThought('a deer, drinking. maybe i should wait...');
      }
      if (d < 130 && (!onGround || vx > 150)) {
        this.deerState = 'scared';
        this.deerSprite.setFlipX(false);
        this.tweens.add({ targets: this.deerSprite, x: this.deerX + 520, alpha: 0,
          duration: 1100, ease: 'Quad.in' });
        this.showThought('...it ran off.');
      } else if (d < 270 && onGround && vx < 45) {
        this.calmTimer += this.game.loop.delta;
        if (this.calmTimer > 1500) {
          this.deerState = 'done';
          this.addKindness(this.deerX, this.groundY - 30);
          this.showThought('it drank in peace.');
          this.tweens.add({ targets: this.deerSprite, y: this.groundY - 8,
            duration: 240, yoyo: true, repeat: 1, ease: 'Quad.out',
            onComplete: () => this.tweens.add({ targets: this.deerSprite,
              x: this.deerX + 440, alpha: 0, duration: 2400, ease: 'Sine.in' }) });
        }
      } else {
        this.calmTimer = 0;
      }
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
    else if (this.horseFed && !this.saidGoodbye && Math.abs(px - this.meadowX) < 160) { label = 'say goodbye'; action = 'farewell'; }
    else if (this.horseFed && !this.riding && !this.saidGoodbye && Math.abs(px - this.horseSprite.x) < 120) { label = 'ride the horse'; action = 'mount'; }
    else if (!this.horseFed && near(this.horseX, 95)) { label = null; this._horseHint = true; }
    else {
      const mh = this.meadowHorses && this.meadowHorses.find((m) => !m.fed && Math.abs(px - m.baseX) < 70);
      if (mh && (this.inventory.carrots || 0) > 0) { label = 'give a carrot'; action = 'feedmeadow'; this._nearMeadow = mh; }
    }

    if (label) {
      this.prompt.setText('▸ e  ' + label).setVisible(true);
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
      this.carrying = 'empty';
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
