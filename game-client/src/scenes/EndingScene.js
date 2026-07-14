import Phaser from 'phaser';
import { leaderboard, formatTime } from '../services/leaderboard.js';

const CRYING_COMPANION = { 'lpc-khatira': 'lpc-oliver', 'lpc-oliver': 'lpc-khatira' };
const CHARACTER_TYPE = { 'lpc-khatira': 'female', 'lpc-oliver': 'male' };

// Beat 5 — the ending. Someone is sitting under a tall tree, crying over a
// bird that fell from its nest. There is nothing to fix and nothing to win
// here: you bury the bird together, build a fire together, and sit with them
// while the world warms from cold blue night to gold. Then you say goodbye
// and walk back alone.
export default class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
  }

  create() {
    const { width, height } = this.scale;
    this.W = width;
    this.H = height;
    const worldWidth = 2400;
    this.groundY = height - 60;

    this.makeTextures();

    // ── landmark positions ──
    this.fireX = 1500;             // an old stone fire ring at their camp
    this.nestTreeX = 1730;         // the tall tree the nest is in
    this.treeScale = 1.45;
    this.nestX = this.nestTreeX - 20 * this.treeScale;      // tucked in against the trunk
    this.nestY = this.groundY + 4 - 85 * this.treeScale;    // on the trunk, below the canopy
    this.birdX = this.nestX + 4;   // the bird lies where it fell, below the nest
    this.figureHomeX = 1790;       // where they sit crying
    this.figureFireX = this.fireX + 46;   // where they settle once the fire is lit
    this.seatX = this.fireX + 88;         // where you sit, close beside them
    this.leaveX = 420;             // walking back past here ends the game

    // ── state ──
    this.characterId = this.registry.get('playAs') || 'lpc-khatira';
    this.companionId = CRYING_COMPANION[this.characterId] || 'lpc-oliver';
    this.arrivalShown = false;
    this.talked = false;
    this.buryOffered = false;
    this.buryTosses = 0;
    this.buried = false;
    this.fireOffered = false;
    this.woodLaid = false;
    this.fireBuilt = false;
    this.sitting = false;
    this.sitTimer = 0;
    this.skyBirdFlown = false;
    this.saidGoodbye = false;
    this.ended = false;
    this.busy = false;
    this.walkSpeed = 220;
    this.dialogueActive = false;
    this.dialogueBox = null;

    // ── warmth: 0 = cold blue night, 1 = warm gold. the whole palette rides this ──
    this.warmth = { t: 0 };
    this.tintScenery = [];
    this.sceneCold = 0x7d90a8;
    this.sceneWarm = 0xffcf9e;

    // ── sky: a deep gradient that goes from cold indigo to dusk gold ──
    this.cameras.main.setBackgroundColor('#0d1220');
    this.skyCold = [0x0d1220, 0x121a2b, 0x1a2637, 0x243343, 0x314351, 0x415560, 0x546a70, 0x6b8286];
    this.skyWarm = [0x2b1a30, 0x46243a, 0x6b3343, 0x94494b, 0xbd6a4e, 0xdd8f56, 0xf2b368, 0xffd98c];
    this.skyBandRects = [];
    const bandH = height / this.skyCold.length;
    this.skyCold.forEach((c, i) => {
      const r = this.add.rectangle(0, i * bandH, width, bandH + 1, c)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(-40);
      this.skyBandRects.push(r);
    });

    // ── stars, fading out as the warmth comes in ──
    this.stars = this.add.container(0, 0).setScrollFactor(0.03).setDepth(-38);
    for (let i = 0; i < 46; i++) {
      const s = this.add.circle(Math.random() * width * 1.6, Math.random() * height * 0.55,
        0.8 + Math.random() * 1.4, 0xe8f0f8, 0.5 + Math.random() * 0.5);
      this.tweens.add({ targets: s, alpha: 0.2 + Math.random() * 0.3,
        duration: 900 + Math.random() * 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.stars.add(s);
    }

    // ── moon giving way to a low, rising sun ──
    this.moon = this.add.image(width * 0.74, 110, 'moon')
      .setScrollFactor(0.05).setDepth(-37).setScale(1.1).setAlpha(0.9);
    this.sunBaseY = height * 0.62;
    this.sun = this.add.image(width * 0.32, this.sunBaseY, 'sun')
      .setScrollFactor(0.05).setDepth(-37).setScale(1.6).setAlpha(0);

    // ── slow clouds ──
    [{ x: 180, y: 90, s: 1.4, d: 90000 }, { x: 620, y: 160, s: 1.9, d: 120000 },
     { x: 1000, y: 70, s: 1.2, d: 100000 }].forEach((c) => {
      const cloud = this.add.image(c.x, c.y, 'cloud-puff')
        .setScrollFactor(0.08).setDepth(-36).setScale(c.s).setAlpha(0.7);
      this.tweens.add({ targets: cloud, x: c.x + 500, duration: c.d, repeat: -1, yoyo: true, ease: 'Sine.inOut' });
      this.tintScenery.push({ obj: cloud, cold: 0x8fa2ba, warm: 0xffc9a2 });
    });

    // ── parallax (same layers as ForestScene, recolored for the hour) ──
    const dwScale = height / 272 * 1.05;
    const dwH = 272 * dwScale;
    const dwY = height - dwH;
    this.bgLayers = [];
    const addDW = (key, factor, depth, coldTint, warmTint, alpha) => {
      const ts = this.add.tileSprite(0, dwY, width, dwH, key);
      ts.setOrigin(0, 0).setScrollFactor(0).setTileScale(dwScale, dwScale);
      ts.setDepth(depth).setTint(coldTint).setAlpha(alpha);
      ts.parallaxFactor = factor;
      ts.coldTint = coldTint;
      ts.warmTint = warmTint;
      this.bgLayers.push(ts);
    };
    addDW('dw-bg', 0.05, -25, 0x24384a, 0x8a5a48, 1);
    addDW('dw-far', 0.12, -24, 0x2e4656, 0x9a6a50, 0.9);
    addDW('dw-mid', 0.25, -23, 0x1d2e3a, 0x6b4534, 1);
    addDW('dw-close', 0.45, -22, 0x101b25, 0x3b2620, 1);

    // ── ground: invisible physics tiles, with layered earth drawn on top ──
    this.platforms = this.physics.add.staticGroup();
    for (let x = 0; x < worldWidth; x += 16) {
      const tile = this.platforms.create(x, this.groundY, 'grass').setOrigin(0, 0);
      tile.refreshBody();
      tile.setVisible(false);
    }
    this.terrain = this.add.tileSprite(0, this.groundY, worldWidth, height - this.groundY + 8, 'terrain-dirt')
      .setOrigin(0, 0).setDepth(2);
    this.fringe = this.add.tileSprite(0, this.groundY + 1, worldWidth, 14, 'grass-fringe')
      .setOrigin(0, 1).setDepth(5);
    this.tintScenery.push({ obj: this.terrain, cold: this.sceneCold, warm: this.sceneWarm });
    this.tintScenery.push({ obj: this.fringe, cold: this.sceneCold, warm: this.sceneWarm });

    // ── the field: full trees, bare trees, bushes, grass, flowers ──
    const dress = (key, x, scale, depth, flip = false) => {
      const img = this.add.image(x, this.groundY + 4, key)
        .setOrigin(0.5, 1).setScale(scale).setDepth(depth).setFlipX(flip);
      this.tintScenery.push({ obj: img, cold: this.sceneCold, warm: this.sceneWarm });
      return img;
    };
    [{ x: 340, s: 1.15 }, { x: 900, s: 1.3, f: true }, { x: 2120, s: 1.2 }].forEach((t) => {
      dress('tree-lush', t.x, t.s, 3, !!t.f);
    });
    [640, 1180, 2300].forEach((x) => {
      dress('tree-bare', x, 1.4 + Math.random() * 0.4, 3, Math.random() < 0.5);
    });
    [240, 540, 980, 1340, 1950, 2210].forEach((x) => {
      dress('bush', x + (Math.random() * 20 - 10), 0.9 + Math.random() * 0.4, 4);
    });
    for (let x = 160; x < worldWidth - 80; x += 90) {
      if (Math.random() < 0.75) {
        dress('tallgrass', x + (Math.random() * 30 - 15), 0.45 + Math.random() * 0.3, 5);
      }
      if (Math.random() < 0.4) {
        const key = Math.random() < 0.5 ? 'flower-white' : 'flower-yellow';
        dress(key, x + (Math.random() * 50 - 25), 0.9 + Math.random() * 0.4, 5);
      }
    }

    // ── the camp: the nest tree, the empty nest, the bird that fell ──
    dress('tree-lush', this.nestTreeX, this.treeScale, 3);
    const branch = this.add.image(this.nestTreeX - 6, this.nestY + 8, 'branch-arm')
      .setOrigin(1, 0.5).setScale(1.7).setDepth(3).setAngle(-6);
    this.tintScenery.push({ obj: branch, cold: this.sceneCold, warm: this.sceneWarm });
    const nest = this.add.image(this.nestX, this.nestY, 'nest')
      .setOrigin(0.5, 1).setScale(1.4).setDepth(4);
    this.tintScenery.push({ obj: nest, cold: this.sceneCold, warm: this.sceneWarm });
    this.birdShadow = this.add.ellipse(this.birdX, this.groundY + 2, 30, 6, 0x000000, 0.25).setDepth(5);
    this.birdSprite = this.add.image(this.birdX, this.groundY + 2, 'bird-fallen')
      .setOrigin(0.5, 1).setScale(1.3).setDepth(6);

    // the grave mound, hidden until the burial
    this.mound = this.add.image(this.birdX, this.groundY + 4, 'grave-mound')
      .setOrigin(0.5, 1).setScale(1.4).setDepth(6).setVisible(false);
    this.mound.scaleY = 0;
    this.tintScenery.push({ obj: this.mound, cold: this.sceneCold, warm: this.sceneWarm });
    this.moundFlower = this.add.image(this.birdX, this.groundY - 12, 'flower-white')
      .setOrigin(0.5, 1).setScale(1.1).setDepth(7).setAlpha(0);

    // ── the old fire ring, cold and empty when you arrive ──
    this.add.image(this.fireX, this.groundY - 2, 'fire-stones-back')
      .setOrigin(0.5, 1).setScale(1.6).setDepth(6);
    this.fireLogs = this.add.image(this.fireX, this.groundY + 2, 'fire-logs')
      .setOrigin(0.5, 1).setScale(1.6).setDepth(7).setVisible(false);
    this.flame = this.add.image(this.fireX, this.groundY - 6, 'flame-big')
      .setOrigin(0.5, 1).setScale(1.8).setDepth(8).setVisible(false);
    this.add.image(this.fireX, this.groundY + 4, 'fire-stones-front')
      .setOrigin(0.5, 1).setScale(1.6).setDepth(9);
    this.fireGlow = this.add.circle(this.fireX, this.groundY - 26, 75, 0xffb347, 0).setDepth(5);
    this.fireGlowCore = this.add.circle(this.fireX, this.groundY - 20, 38, 0xffd27a, 0).setDepth(5);
    this.fireLight = this.add.ellipse(this.fireX, this.groundY + 2, 260, 26, 0xffb865, 0).setDepth(4);

    // ── the crying figure, hunched under the tree ──
    // TODO: audio — thin wind and a soft crying loop, very quiet (sound pass)
    this.figure = this.add.sprite(this.figureHomeX, this.groundY + 2, `${this.companionId}-sit-sheet`, 28)
      .setOrigin(0.5, 1).setScale(1).setDepth(9);
    // small tremble in the shoulders
    this.cryTween = this.tweens.add({ targets: this.figure, y: this.groundY + 0.5,
      duration: 340, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // a tear now and then, until the fire is lit
    this.time.addEvent({ delay: 1900, loop: true, callback: () => {
      if (this.fireBuilt) return;
      const tear = this.add.circle(this.figure.x - 8 + Math.random() * 6, this.groundY - 44, 2, 0x9fc4d8, 0.8).setDepth(10);
      this.tweens.add({ targets: tear, y: tear.y + 28, alpha: 0, duration: 850,
        ease: 'Quad.in', onComplete: () => tear.destroy() });
    } });

    // ── a thin snowfall while the world is cold; it stops as things warm ──
    this.time.addEvent({ delay: 170, loop: true, callback: () => {
      if (this.warmth.t > 0.42 || this.ended) return;
      const fx = this.cameras.main.scrollX + Math.random() * this.W;
      const flake = this.add.circle(fx, -12, 1.4 + Math.random() * 1.2, 0xdfe8ee,
        0.5 + Math.random() * 0.35).setDepth(35);
      this.tweens.add({ targets: flake, y: this.groundY + 2, x: fx + (Math.random() - 0.5) * 70,
        duration: 3800 + Math.random() * 2600, ease: 'Sine.in',
        onComplete: () => {
          this.tweens.add({ targets: flake, alpha: 0, duration: 500, onComplete: () => flake.destroy() });
        } });
    } });

    // ── fireflies, once the evening turns gold ──
    this.time.addEvent({ delay: 800, loop: true, callback: () => {
      if (this.warmth.t < 0.55 || this.ended) return;
      const fx = this.fireX - 480 + Math.random() * 960;
      const fy = this.groundY - 16 - Math.random() * 110;
      const fly = this.add.circle(fx, fy, 2, 0xffe58a, 0).setDepth(8);
      this.tweens.add({ targets: fly, alpha: 0.85, duration: 600, yoyo: true, hold: 500, repeat: 1 });
      this.tweens.add({ targets: fly, x: fx + (Math.random() - 0.5) * 70, y: fy - 20 - Math.random() * 30,
        duration: 3600, ease: 'Sine.inOut', onComplete: () => fly.destroy() });
    } });

    // ── cold overlay / warm overlay — crossfade with the warmth ──
    this.coldMist = this.add.rectangle(0, 0, width, height, 0x18222e)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(30).setAlpha(0.25);
    this.warmGlow = this.add.rectangle(0, 0, width, height, 0xffb866)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(30).setAlpha(0);

    // ── player ──
    this.player = this.physics.add.sprite(140, this.groundY - 40, `${this.characterId}-idle-sheet`, 39);
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(800);
    this.player.setMaxVelocity(220, 700);
    this.player.setScale(1);
    this.player.setSize(20, 34);
    this.player.setOffset(22, 26);
    this.player.setDepth(10);
    this.physics.add.collider(this.player, this.platforms);

    this.physics.world.setBounds(0, 0, worldWidth, height + 400);
    this.cameras.main.setBounds(0, 0, worldWidth, height);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // ── input ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.keyE = this.input.keyboard.addKey('E');

    // ── prompt ──
    this.prompt = this.add.text(0, 0, '', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '15px',
      color: '#f0ece0', backgroundColor: '#00000066', padding: { x: 8, y: 4 }
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(150).setVisible(false);

    this.applyWarmth(0);
    this.player.play(`${this.characterId}-idle`);

    // arriving out of the black — no rush
    this.cameras.main.fadeIn(1400, 0, 0, 0);
    this.time.delayedCall(1200, () => this.showThought('so quiet.', 2400));
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
    make((g) => {
      g.fillStyle(0x6b4a32); g.fillRect(0, 0, 64, 96);                 // dirt body
      for (let i = 0; i < 30; i++) {
        g.fillStyle(Math.random() < 0.5 ? 0x59391f : 0x7d5a3d);
        g.fillRect(Math.random() * 62, 18 + Math.random() * 74, 2, 2);
      }
      g.fillStyle(0x8a8d92);
      g.fillEllipse(14, 66, 8, 5); g.fillEllipse(46, 82, 10, 6); g.fillEllipse(33, 48, 6, 4);
      g.fillStyle(0x6e7176);
      g.fillEllipse(15, 68, 5, 3); g.fillEllipse(48, 84, 6, 3);
      g.fillStyle(0x4e8a3c); g.fillRect(0, 0, 64, 12);                 // grass cap
      for (let x = 0; x < 64; x += 8) {                                // ragged cap edge
        g.fillTriangle(x, 12, x + 8, 12, x + 4, 15 + Math.random() * 5);
      }
      g.fillStyle(0x63a84c); g.fillRect(0, 0, 64, 7);
      g.fillStyle(0x74b25a); g.fillRect(0, 0, 64, 3);                  // lit top edge
    }, 64, 96, 'terrain-dirt');

    // grass blades standing up along the ground line
    make((g) => {
      const greens = [0x4e8a3c, 0x63a84c, 0x74b25a];
      for (let x = 0; x < 64; x += 5) {
        g.fillStyle(greens[Math.floor(Math.random() * greens.length)]);
        const h = 4 + Math.random() * 9;
        g.fillTriangle(x, 14, x + 4, 14, x + 2, 14 - h);
      }
    }, 64, 14, 'grass-fringe');

    // a full tree — chunky trunk, big three-tone canopy
    make((g) => {
      g.fillStyle(0x6b4a30);
      g.fillRect(77, 130, 16, 110);                                    // trunk
      g.fillTriangle(77, 240, 61, 240, 79, 198);                       // root flare
      g.fillTriangle(93, 240, 109, 240, 91, 198);
      g.fillTriangle(78, 152, 52, 122, 60, 116);                       // branch stubs
      g.fillTriangle(92, 168, 120, 140, 126, 147);
      g.fillStyle(0x543a24);
      g.fillRect(84, 138, 3, 44); g.fillRect(80, 190, 3, 34);          // bark shadow
      g.fillStyle(0x7f5d3c);
      g.fillRect(77, 134, 3, 92);                                      // bark light
      g.fillStyle(0x35682e);                                           // canopy, dark
      g.fillEllipse(85, 86, 150, 110);
      g.fillEllipse(38, 112, 70, 60); g.fillEllipse(132, 110, 72, 62);
      g.fillStyle(0x4a8a3c);                                           // canopy, mid
      g.fillEllipse(80, 74, 120, 86);
      g.fillEllipse(42, 100, 56, 44); g.fillEllipse(126, 98, 58, 46);
      g.fillStyle(0x63ad52);                                           // canopy, light
      g.fillEllipse(72, 58, 76, 50);
      g.fillEllipse(110, 64, 44, 34); g.fillEllipse(52, 76, 36, 26);
      g.fillStyle(0x79c264);                                           // top glints
      g.fillCircle(66, 42, 8); g.fillCircle(92, 38, 6); g.fillCircle(112, 52, 5);
    }, 170, 240, 'tree-lush');

    // bare tree — thin, leafless, for the cold spaces between
    make((g) => {
      g.fillStyle(0x8a6a4c);
      g.fillRect(27, 40, 8, 100);                                      // trunk
      g.fillTriangle(27, 44, 35, 44, 31, 6);                           // tapering up
      g.fillTriangle(29, 54, 8, 20, 12, 18);                           // left branch
      g.fillTriangle(33, 66, 52, 30, 56, 34);                          // right branch
      g.fillTriangle(30, 40, 20, 14, 24, 12);                          // small upper branch
      g.fillStyle(0x6e5238);
      g.fillRect(31, 48, 3, 88);                                       // shaded side
    }, 60, 140, 'tree-bare');

    // the branch the nest sits on
    make((g) => {
      g.fillStyle(0x5a3f28);
      g.fillTriangle(52, 1, 0, 4, 52, 9);
      g.fillStyle(0x6e5238);
      g.fillRect(44, 1, 8, 8);                                         // thick end at the trunk
    }, 52, 10, 'branch-arm');

    // the nest — a small twig bowl, empty now
    make((g) => {
      g.fillStyle(0x7a5a38);
      g.fillEllipse(14, 8, 26, 11);                                    // bowl
      g.fillStyle(0x4a3320);
      g.fillEllipse(14, 6, 16, 6);                                     // hollow
      g.fillStyle(0x8f6b42);
      g.fillRect(2, 6, 6, 2); g.fillRect(20, 5, 6, 2); g.fillRect(10, 10, 7, 2);   // stray twigs
    }, 28, 14, 'nest');

    // the fallen bird — small and brown, lying still on its side
    make((g) => {
      g.fillStyle(0x5f492f);
      g.fillEllipse(13, 8, 18, 9);                // body, on its side
      g.fillEllipse(5, 6, 8, 7);                  // head
      g.fillTriangle(0, 6, 4, 4, 4, 8);           // beak
      g.fillStyle(0x4a3a28);
      g.fillEllipse(15, 7, 9, 5);                 // folded wing
      g.fillRect(20, 7, 5, 3);                    // short tail
      g.fillStyle(0x2b2620);
      g.fillRect(3, 5, 3, 1);                     // eye, closed
    }, 26, 14, 'bird-fallen');

    // bird — the small brown bird of the whole journey, for the sky later
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

    // grave mound — a small handful of turned earth
    make((g) => {
      g.fillStyle(0x6b4a32);
      g.fillEllipse(22, 14, 42, 14);
      g.fillStyle(0x7d5a3d);
      g.fillEllipse(22, 10, 30, 8);
      g.fillStyle(0x59391f);
      g.fillRect(12, 12, 2, 2); g.fillRect(28, 10, 2, 2); g.fillRect(20, 14, 2, 2);
    }, 44, 18, 'grave-mound');

    // fire ring stones, back row and front row so the flame sits inside
    make((g) => {
      g.fillStyle(0x777d84); g.fillEllipse(8, 9, 13, 9);
      g.fillStyle(0x6b7178); g.fillEllipse(24, 8, 14, 10);
      g.fillStyle(0x7e848b); g.fillEllipse(40, 9, 12, 8);
      g.fillStyle(0x585e64);
      g.fillEllipse(8, 12, 10, 4); g.fillEllipse(24, 12, 11, 4); g.fillEllipse(40, 12, 9, 4);
    }, 48, 14, 'fire-stones-back');
    make((g) => {
      g.fillStyle(0x83898f); g.fillEllipse(11, 7, 15, 9);
      g.fillStyle(0x6f757c); g.fillEllipse(32, 7, 16, 9);
      g.fillStyle(0x9aa0a6);
      g.fillEllipse(9, 5, 6, 3); g.fillEllipse(30, 5, 7, 3);
    }, 48, 12, 'fire-stones-front');

    // fire logs — two chunky branches crossed, end grain showing
    make((g) => {
      g.fillStyle(0x5a3f28); g.fillRect(3, 10, 34, 6);
      g.fillStyle(0x7a5a38); g.fillEllipse(4, 13, 5, 6);               // end grain
      g.fillStyle(0x6b4a30);
      g.fillPoints([{ x: 8, y: 16 }, { x: 30, y: 4 }, { x: 34, y: 7 }, { x: 12, y: 18 }], true);
      g.fillStyle(0x8a6a44); g.fillEllipse(31, 5, 5, 5);               // end grain
    }, 40, 18, 'fire-logs');

    // a single stick — the one they add to the fire themselves
    make((g) => {
      g.fillStyle(0x5a3f28); g.fillRect(0, 1, 16, 3);
      g.fillStyle(0x4a3626); g.fillRect(4, 0, 3, 2);
    }, 16, 4, 'stick');

    // the campfire flame — three warm layers
    make((g) => {
      g.fillStyle(0xff8c3a);
      g.fillTriangle(13, 0, 2, 26, 24, 26);
      g.fillEllipse(13, 26, 22, 12);
      g.fillStyle(0xffc14d);
      g.fillTriangle(13, 7, 5, 25, 21, 25);
      g.fillEllipse(13, 25, 15, 9);
      g.fillStyle(0xfff3c4);
      g.fillTriangle(13, 14, 8, 24, 18, 24);
      g.fillEllipse(13, 24, 9, 6);
    }, 26, 34, 'flame-big');

    // moon — pale, quietly cratered
    make((g) => {
      g.fillStyle(0xdce8f0); g.fillCircle(28, 28, 24);
      g.fillStyle(0xc2d2dd);
      g.fillCircle(20, 22, 5); g.fillCircle(34, 34, 4); g.fillCircle(30, 16, 3);
    }, 56, 56, 'moon');

    // sun — a soft gold disc with its own halo
    make((g) => {
      g.fillStyle(0xffc978, 0.35); g.fillCircle(36, 36, 34);
      g.fillStyle(0xffd98a); g.fillCircle(36, 36, 24);
      g.fillStyle(0xfff3c0); g.fillCircle(36, 36, 15);
    }, 72, 72, 'sun');

    // cloud — a few soft lobes
    make((g) => {
      g.fillStyle(0xe8eef4);
      g.fillEllipse(30, 20, 44, 18); g.fillEllipse(54, 16, 50, 20);
      g.fillEllipse(76, 22, 36, 14); g.fillEllipse(20, 24, 28, 12);
    }, 96, 32, 'cloud-puff');

    // bush — a low flowering shrub
    make((g) => {
      g.fillStyle(0x5c8a4a);
      g.fillEllipse(16, 18, 30, 22);
      g.fillEllipse(6, 14, 18, 16);
      g.fillEllipse(26, 14, 18, 16);
      g.fillStyle(0x6f9f55);
      g.fillEllipse(16, 10, 22, 16);
      g.fillStyle(0xf4f4ee);
      g.fillCircle(9, 12, 2); g.fillCircle(22, 9, 2); g.fillCircle(16, 16, 2);
    }, 32, 26, 'bush');

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

    // flowers — tiny five-petal blooms
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

  lerpColor(a, b, t) {
    const c1 = Phaser.Display.Color.ValueToColor(a);
    const c2 = Phaser.Display.Color.ValueToColor(b);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(c1, c2, 100, Math.round(t * 100));
    return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
  }

  // move every palette element between its cold and warm color
  applyWarmth(t) {
    this.skyBandRects.forEach((r, i) => r.setFillStyle(this.lerpColor(this.skyCold[i], this.skyWarm[i], t)));
    this.bgLayers.forEach((l) => l.setTint(this.lerpColor(l.coldTint, l.warmTint, t)));
    this.tintScenery.forEach((s) => s.obj.setTint(this.lerpColor(s.cold, s.warm, t)));
    this.coldMist.setAlpha(0.25 * (1 - t));
    this.warmGlow.setAlpha(0.12 * t);
    this.stars.setAlpha(Math.max(0, 1 - t * 1.8));
    this.moon.setAlpha(Math.max(0, 1 - t * 1.5) * 0.9);
    this.sun.setAlpha(Phaser.Math.Clamp((t - 0.2) / 0.5, 0, 1));
    this.sun.y = this.sunBaseY - t * 230;
  }

  warmTo(target, ms) {
    this.tweens.add({ targets: this.warmth, t: target, duration: ms,
      ease: 'Sine.inOut', onUpdate: () => this.applyWarmth(this.warmth.t) });
  }

  update() {
    const px = this.player.x;
    const onGround = this.player.body.blocked.down;

    // ── parallax ──
    const camX = this.cameras.main.scrollX;
    this.bgLayers.forEach((l) => { l.tilePositionX = camX * l.parallaxFactor / l.tileScaleX; });

    // ── dialogue — 'e' advances one line at a time, the box stays over the speaker ──
    if (this.dialogueActive && Phaser.Input.Keyboard.JustDown(this.keyE)) this.advanceDialogue();
    if (this.dialogueActive) this.positionDialogueBox();

    // ── arrival — one spare thought, nothing more ──
    if (!this.arrivalShown && px > this.figureHomeX - 340) {
      this.arrivalShown = true;
      this.showThought('oh... it fell from the nest.', 3400);
    }

    // ── movement ──
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                 Phaser.Input.Keyboard.JustDown(this.wasd.W) ||
                 Phaser.Input.Keyboard.JustDown(this.cursors.space);

    if (this.sitting) {
      this.player.setVelocity(0, 0);
      this.sitTimer += this.game.loop.delta;
      // and far off, a small bird crosses the warm sky
      if (!this.skyBirdFlown && this.sitTimer > 6500) {
        this.skyBirdFlown = true;
        const skyBird = this.add.image(px - 720, this.groundY - 520, 'bird')
          .setScale(1.1).setDepth(-21).setTint(0x4a3a30);
        this.tweens.add({ targets: skyBird, scaleY: 0.7, duration: 200, yoyo: true, repeat: -1 });
        this.tweens.add({ targets: skyBird, x: px + 760, y: this.groundY - 560,
          duration: 8000, ease: 'Sine.inOut', onComplete: () => skyBird.destroy() });
      }
    } else if (this.busy) {
      this.player.setVelocityX(0);
      if (onGround && this.player.anims.currentAnim?.key !== `${this.characterId}-idle`) this.player.play(`${this.characterId}-idle`);
    } else if (left) {
      this.player.setVelocityX(-this.walkSpeed); this.player.setFlipX(true);
      if (onGround && this.player.anims.currentAnim?.key !== `${this.characterId}-walk`) this.player.play(`${this.characterId}-walk`);
    } else if (right) {
      this.player.setVelocityX(this.walkSpeed); this.player.setFlipX(false);
      if (onGround && this.player.anims.currentAnim?.key !== `${this.characterId}-walk`) this.player.play(`${this.characterId}-walk`);
    } else if (onGround && this.player.anims.currentAnim?.key !== `${this.characterId}-idle`) {
      this.player.play(`${this.characterId}-idle`);
    }
    if (jump && onGround && !this.sitting && !this.busy) this.player.setVelocityY(-340);

    // ── walking back alone — the world lets you go ──
    if (this.saidGoodbye && !this.ended && px < this.leaveX) this.finishGame();

    // ── interaction prompt + action ──
    let label = null, action = null;
    const near = (x, r = 75) => Math.abs(px - x) < r;
    if (!this.busy && !this.saidGoodbye && !this.ended) {
      if (!this.talked && onGround && near(this.birdX, 70)) { label = 'talk with them'; action = 'talk'; }
      else if (this.talked && !this.buryOffered && onGround && near(this.birdX, 70)) { label = 'ask about burying the bird'; action = 'offerbury'; }
      else if (this.buryOffered && !this.buried && onGround && near(this.birdX, 70)) { label = 'toss earth'; action = 'toss'; }
      else if (this.buried && !this.fireOffered && onGround && near(this.fireX, 85)) { label = 'ask about a fire'; action = 'offerfire'; }
      else if (this.fireOffered && !this.woodLaid && onGround && near(this.fireX, 85)) { label = 'lay the wood'; action = 'wood'; }
      else if (this.woodLaid && !this.fireBuilt && onGround && near(this.fireX, 85)) { label = 'light it together'; action = 'light'; }
      else if (this.fireBuilt && !this.sitting && onGround && near(this.fireX + 60, 120)) { label = 'sit with them'; action = 'sit'; }
      else if (this.sitting && this.sitTimer > 8000) { label = 'say goodbye'; action = 'goodbye'; }
    }

    if (label) {
      this.prompt.setText('▸ e  ' + label).setVisible(true);
      this.prompt.setPosition(this.W / 2, this.H - 40);
    } else if (!this.dialogueActive) {
      this.prompt.setVisible(false);
    }

    if (action && Phaser.Input.Keyboard.JustDown(this.keyE)) this.doAction(action);
  }

  doAction(action) {
    if (action === 'talk') {
      this.player.setVelocity(0, 0);
      this.player.setFlipX(this.figure.x < this.player.x);
      this.startDialogue([
        { who: 'companion', text: 'this little bird fell from the nest.' },
        { who: 'companion', text: 'i saw it every morning when i passed this tree. it always sang.' },
        { who: 'companion', text: 'i couldn\'t do anything.' },
        { who: 'player', text: 'i\'m sorry. i\'ll stay with you for a while.' }
      ], () => {
        this.talked = true;
        this.busy = false;
      });
      return;
    }
    if (action === 'offerbury') {
      this.player.setVelocity(0, 0);
      this.player.setFlipX(this.birdX < this.player.x);
      this.startDialogue([
        { who: 'player', text: 'should we bury it? together.' },
        { who: 'companion', text: 'yes. i\'d like that.' }
      ], () => {
        // they rise and come to the grave side
        // TODO: audio — no music here, just wind and the soft sound of earth (sound pass)
        this.cryTween.stop();
        this.figure.play(`${this.companionId}-walk`);
        this.figure.setFlipX(true);
        this.figure.y = this.groundY + 2;
        this.tweens.add({ targets: this.figure, x: this.birdX + 36, duration: 1700, ease: 'Sine.inOut',
          onComplete: () => {
            this.figure.anims.stop();
            this.figure.setTexture(`${this.companionId}-sit-sheet`, 28);
            this.buryOffered = true;
            this.busy = false;
          } });
      });
      return;
    }
    if (action === 'toss') {
      // one press, one pair of handfuls — yours first, then theirs
      this.busy = true;
      this.player.setVelocity(0, 0);
      this.player.setFlipX(this.birdX < this.player.x);
      this.buryTosses++;
      const toss = (fromPlayer) => {
        const sx = fromPlayer ? this.birdX - 22 : this.birdX + 24;
        const d = this.add.circle(sx, this.groundY - 12, 3, 0x6b4a32, 0.9).setDepth(12);
        this.tweens.add({ targets: d, x: this.birdX + (Math.random() - 0.5) * 12, y: this.groundY,
          alpha: 0, duration: 420, ease: 'Quad.in', onComplete: () => d.destroy() });
        // a small bow from whoever is digging
        const digger = fromPlayer ? this.player : this.figure;
        this.tweens.add({ targets: digger, scaleY: digger.scaleY * 0.94, duration: 140, yoyo: true });
      };
      toss(true);
      this.time.delayedCall(500, () => toss(false));
      if (this.buryTosses < 3) {
        this.time.delayedCall(1000, () => { this.busy = false; });
      } else {
        this.finishBurial();
      }
      return;
    }
    if (action === 'offerfire') {
      this.player.setVelocity(0, 0);
      this.player.setFlipX(this.fireX < this.player.x);
      this.startDialogue([
        { who: 'player', text: 'it\'s getting cold. should we light a fire?' },
        { who: 'companion', text: 'there\'s wood in the ring. i never got to it.' }
      ], () => {
        this.fireOffered = true;
        this.busy = false;
      });
      return;
    }
    if (action === 'wood') {
      this.busy = true;
      this.player.setVelocity(0, 0);
      this.player.setFlipX(this.fireX < this.player.x);
      // you lay the wood in the ring
      this.fireLogs.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: this.fireLogs, alpha: 1, duration: 400,
        onComplete: () => { this.woodLaid = true; this.busy = false; } });
      return;
    }
    if (action === 'light') {
      this.busy = true;
      this.player.setVelocity(0, 0);
      this.player.setFlipX(this.fireX < this.player.x);
      // they get up to help — the fire is lit together
      this.cryTween.stop();
      this.figure.play(`${this.companionId}-walk`);
      this.figure.setFlipX(true);
      this.figure.y = this.groundY + 2;
      this.tweens.add({ targets: this.figure, x: this.figureFireX, duration: 2200, ease: 'Sine.inOut',
        onComplete: () => {
          this.figure.anims.stop();
          this.figure.setTexture(`${this.companionId}-sit-sheet`, 28);
          // they add a branch of their own, and the spark takes
          const stick = this.add.image(this.figure.x - 10, this.groundY - 30, 'stick')
            .setOrigin(0.5).setScale(1.4).setDepth(8);
          this.tweens.add({ targets: stick, x: this.fireX, y: this.groundY - 6, angle: 40,
            duration: 500, ease: 'Quad.in',
            onComplete: () => { stick.destroy(); this.kindleFire(); } });
        } });
      return;
    }
    if (action === 'sit') {
      this.sitting = true;
      this.sitTimer = 0;
      this.player.setVelocity(0, 0);
      this.player.body.setAllowGravity(false);
      this.player.setPosition(this.seatX, this.groundY - 30);
      this.player.setFlipX(false);   // both of you, facing out of the screen
      this.player.anims.stop();
      this.player.setTexture(`${this.characterId}-sit-sheet`, 28);
      this.figure.anims.stop();
      this.figure.setFlipX(false);
      this.figure.setTexture(`${this.companionId}-sit-sheet`, 28);
      // TODO: audio — the main theme returns here, slow and warm (sound pass)
      // a shoulder against a shoulder — the closest thing to words
      this.time.delayedCall(700, () => {
        this.tweens.add({ targets: this.figure, angle: 2, duration: 900, ease: 'Sine.inOut' });
      });
      this.warmTo(1, 16000);
      return;
    }
    if (action === 'goodbye') {
      this.startDialogue([
        { who: 'player', text: 'i need to go now. i wish i could stay longer.' },
        { who: 'companion', text: 'thank you for staying. it mattered.' },
        { who: 'player', text: 'take care of yourself. i hope we meet again.' }
      ], () => this.doGoodbye());
    }
  }

  finishBurial() {
    this.tweens.add({ targets: [this.birdSprite, this.birdShadow], alpha: 0, duration: 1400, delay: 900 });
    this.mound.setVisible(true);
    this.tweens.add({ targets: this.mound, scaleY: 1.4, duration: 2000, delay: 800, ease: 'Sine.out' });
    // they lay a white flower on the little grave
    this.time.delayedCall(2400, () => {
      this.moundFlower.setPosition(this.figure.x - 12, this.groundY - 30).setAlpha(1);
      this.tweens.add({ targets: this.moundFlower, x: this.birdX, y: this.groundY - 12,
        duration: 800, ease: 'Sine.inOut' });
      this.buried = true;
      this.warmTo(0.2, 8000);
    });
    // then they go back to their place and sit — quieter than before
    this.time.delayedCall(3400, () => {
      this.figure.play(`${this.companionId}-walk`);
      this.figure.setFlipX(false);
      this.tweens.add({ targets: this.figure, x: this.figureHomeX - 10, duration: 1500, ease: 'Sine.inOut',
        onComplete: () => {
          this.figure.anims.stop();
          this.figure.setTexture(`${this.companionId}-sit-sheet`, 28);
          this.cryTween = this.tweens.add({ targets: this.figure, y: this.groundY + 1,
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          this.busy = false;
        } });
    });
    this.time.delayedCall(5300, () => this.showThought('so cold out here.', 3000));
  }

  doGoodbye() {
    this.saidGoodbye = true;
    this.sitting = false;
    this.busy = true;
    this.player.body.setAllowGravity(true);
    this.player.setAngle(0);
    // TODO: audio — the theme thins back to a single line, resolved (sound pass)
    // a small nod. that's all that's needed
    this.tweens.add({ targets: this.figure, angle: 0, duration: 600, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.figure, y: this.groundY + 5, duration: 500,
      yoyo: true, delay: 800, ease: 'Sine.inOut' });
    this.time.delayedCall(1800, () => { this.busy = false; });
  }

  startDialogue(lines, onDone) {
    this.busy = true;
    this.player.setVelocity(0, 0);
    this.dialogueLines = lines;
    this.dialogueIndex = 0;
    this.dialogueDone = onDone;
    this.dialogueActive = true;
    this.showDialogueLine();
  }

  showDialogueLine() {
    const line = this.dialogueLines[this.dialogueIndex];
    const fromPlayer = line.who === 'player';
    if (this.dialogueBox) this.dialogueBox.destroy();
    const border = fromPlayer ? 0xece8dc : 0xcfe0ec;
    const text = this.add.text(0, 0, line.text, {
      fontFamily: 'Georgia, serif', fontSize: '15px',
      color: fromPlayer ? '#ece8dc' : '#cfe0ec',
      fontStyle: 'italic', align: 'center', wordWrap: { width: 260 }
    }).setOrigin(0.5);
    const boxW = text.width + 16;
    const boxH = text.height + 12;
    const g = this.add.graphics();
    g.fillStyle(0x12161a, 0.85);
    g.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
    g.fillTriangle(-6, boxH / 2, 6, boxH / 2, 0, boxH / 2 + 6);   // tail down toward the speaker
    g.lineStyle(2, border, 1);
    g.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
    this.dialogueBox = this.add.container(0, 0, [g, text]).setDepth(160).setAlpha(0);
    this.dialogueBox.boxW = boxW;
    this.dialogueBox.boxH = boxH;
    this.dialogueSpeaker = fromPlayer ? this.player : this.figure;
    this.positionDialogueBox();
    this.tweens.add({ targets: this.dialogueBox, alpha: 1, duration: 250 });
    this.prompt.setText('▸ e  continue').setVisible(true);
    this.prompt.setPosition(this.W / 2, this.H - 40);
  }

  // keep the box over the speaker's head, fully inside the camera view
  positionDialogueBox() {
    if (!this.dialogueBox) return;
    const cam = this.cameras.main;
    const half = this.dialogueBox.boxW / 2;
    const top = this.dialogueSpeaker.getBounds().top;
    const x = Phaser.Math.Clamp(this.dialogueSpeaker.x, cam.scrollX + half + 8, cam.scrollX + this.W - half - 8);
    this.dialogueBox.setPosition(x, top - 16 - this.dialogueBox.boxH / 2);
  }

  advanceDialogue() {
    this.dialogueIndex++;
    if (this.dialogueIndex < this.dialogueLines.length) {
      this.showDialogueLine();
      return;
    }
    this.dialogueActive = false;
    if (this.dialogueBox) { this.dialogueBox.destroy(); this.dialogueBox = null; }
    const done = this.dialogueDone;
    this.dialogueDone = null;
    if (done) done();
  }

  kindleFire() {
    // TODO: audio — a small crackle fades in under the wind (sound pass)
    this.flame.setVisible(true).setScale(1.2, 0.4);
    this.tweens.add({ targets: this.flame, scaleY: 1.2, duration: 1200, ease: 'Sine.out' });
    this.tweens.add({ targets: this.flame, angle: { from: -4, to: 4 },
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.fireGlow, alpha: 0.10, duration: 900, ease: 'Sine.out',
      onComplete: () => {
        this.tweens.add({ targets: this.fireGlow, alpha: { from: 0.07, to: 0.13 }, scale: { from: 0.92, to: 1.08 },
          duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      } });
    this.tweens.add({ targets: this.fireGlowCore, alpha: 0.16, duration: 900, ease: 'Sine.out',
      onComplete: () => {
        this.tweens.add({ targets: this.fireGlowCore, alpha: { from: 0.11, to: 0.19 }, scale: { from: 0.9, to: 1.1 },
          duration: 550, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      } });
    this.tweens.add({ targets: this.fireLight, alpha: 0.12, duration: 1200 });
    // embers rising, and now and then a wisp of smoke
    let puffCount = 0;
    this.time.addEvent({ delay: 1000, loop: true, callback: () => {
      if (this.ended) return;
      const ember = this.add.circle(this.fireX + (Math.random() - 0.5) * 16, this.groundY - 26, 2, 0xffc27a, 0.8).setDepth(8);
      this.tweens.add({ targets: ember, y: ember.y - 50 - Math.random() * 30, x: ember.x + (Math.random() - 0.5) * 24,
        alpha: 0, duration: 1600, ease: 'Sine.out', onComplete: () => ember.destroy() });
      if (++puffCount % 3 === 0) {
        const puff = this.add.circle(this.fireX, this.groundY - 44, 6, 0x9aa0a6, 0.18).setDepth(8);
        this.tweens.add({ targets: puff, y: puff.y - 90, scale: 2.2, alpha: 0,
          duration: 2500, ease: 'Sine.out', onComplete: () => puff.destroy() });
      }
    } });
    // settled by the fire now — slow breathing instead of the tremble
    this.figure.y = this.groundY + 2;
    this.tweens.add({ targets: this.figure, y: this.groundY - 1,
      duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.warmTo(0.6, 10000);
    this.fireBuilt = true;
    this.busy = false;
  }

  finishGame() {
    this.ended = true;
    this.submitKindnessScore();
    // you keep walking as the dark comes up around you
    const fade = this.add.rectangle(0, 0, this.W, this.H, 0x000000)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(250).setAlpha(0);
    this.tweens.add({ targets: fade, alpha: 1, duration: 3200, ease: 'Sine.inOut',
      onComplete: () => {
        this.busy = true;
        this.player.setVelocity(0, 0);
        const title = this.add.text(this.W / 2, this.H / 2, 'northward', {
          fontFamily: 'Georgia, serif', fontSize: '34px', color: '#ece8dc', fontStyle: 'italic'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(260).setAlpha(0);
        this.tweens.add({ targets: title, alpha: 1, duration: 1600 });
        // TODO: end-of-game hook — credits and the web platform handoff go here
      } });
  }

  submitKindnessScore() {
    const kindness = this.registry.get('kindness') || 0;
    leaderboard.submitScore({
      characterType: CHARACTER_TYPE[this.characterId] || 'female',
      season: 'summer',
      score: kindness,
      completionTime: formatTime(this.time.now / 1000)
    }).then(() => {
      console.log('kindness score submitted:', kindness);
    }).catch((err) => {
      console.error('could not submit kindness score:', err.message);
    });
  }
}
