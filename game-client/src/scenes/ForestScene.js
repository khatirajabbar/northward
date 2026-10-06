import Phaser from 'phaser';
import { game } from '../services/game.js';
import { makeCat, updateCatFollow } from '../characters/cat.js';
import { FOREST_SCALE, FEET, setTravelerBody } from '../characters/lpc.js';
import { HORSE_BACK } from '../characters/animals.js';
import { FLAGS, tickClock, encodeProgress, decodeProgress } from '../services/progress.js';
import FoxCubPuzzle from '../puzzles/foxCub.js';

// The forest's art is drawn small by tools/forest-art.mjs (the same palette and
// trees as the cabin) and shown at 2x.
const ART = 2;

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
    // where the sprite's centre sits when the traveler stands on the ground
    this.standY = this.groundY - FEET * FOREST_SCALE - 4;
    // riding: how far the drawing is lifted so the traveler's seat rests on the horse's back
    this.rideLift = Math.round(HORSE_BACK * ART - 7 - 13 * FOREST_SCALE);

    // ── landmark positions ──
    this.bucketX = 620;
    this.treeX = 1080;
    this.lakeCenterX = 1980;
    this.lakeFillX = 1880;

    // ── state ──
    this.characterId = this.registry.get('playAs') || 'lpc-khatira';
    this.carrying = null;       // null | 'empty' | 'full'
    this.bucketPicked = false;
    this.treeWatered = false;
    this.kindness = this.registry.get('kindness') || 0;

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
    this.respawnY = this.standY;
    this.torchX = 4940;          // torch checkpoint before the crossing
    this.brambleTorchX = 6900;   // torch checkpoint before the bramble (sprite built below)
    // checkpoint torches in world order — stable id -> world x. passing a torch
    // saves it as the active checkpoint (respawn a step past it on resume).
    this.torchCheckpoints = { 'torch-1': this.riverTorchX, 'torch-2': this.torchX, 'torch-3': this.brambleTorchX };
    this.currentCheckpoint = null;
    this.saidGoodbye = false;
    this.grassWidth = 440;
    this.horseFed = false;
    this.riding = false;
    this.carryingCat = false;
    this.catFollowing = false;
    // what the saved run had already done (empty on a fresh forest entry)
    this.saved = decodeProgress(this.registry.get('checkpoint'));
    this.pickedCarrots = 0;     // bitmask over carrotXs
    this.groundBucketState = null;
    this.walkSpeed = 220;
    this.rideSpeed = 380;
    this.carrotSprites = [];

    // ── sky, and the forest behind the road: three lines of trees sliding by at
    // their own speeds, the farthest slowest ──
    this.cameras.main.setBackgroundColor('#6fa3bd');
    this.add.image(0, 0, 'woods-sky').setOrigin(0, 0).setScale(ART).setScrollFactor(0).setDepth(-30);
    this.bgLayers = [];
    const addLayer = (key, factor, depth) => {
      const ts = this.add.tileSprite(0, 0, width, height, key);
      ts.setOrigin(0, 0).setScrollFactor(0).setTileScale(ART, ART).setDepth(depth);
      ts.parallaxFactor = factor;
      this.bgLayers.push(ts);
    };
    addLayer('woods-far', 0.1, -24);
    addLayer('woods-mid', 0.22, -23);
    addLayer('woods-near', 0.4, -22);

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
      this.add.tileSprite(x0, this.groundY, x1 - x0, 80, 'woods-ground')
        .setOrigin(0, 0).setTileScale(ART, ART).setDepth(2);
      this.add.tileSprite(x0, this.groundY + 2, x1 - x0, 12, 'woods-fringe')
        .setOrigin(0, 1).setTileScale(ART, ART).setDepth(5);
    });

    // ── forest dressing — spruce, pine and birch along the whole road, with
    // bushes, ferns, grass and flowers under them. everything sits at depth 1
    // (trees) or 4-5 (undergrowth), behind the gameplay objects, and the
    // placements stay clear of the landmarks so nothing readable is covered ──
    const prop = (key, x, depth, flip = false, y = this.groundY + 4) =>
      this.add.image(x, y, `woods-${key}`).setOrigin(0.5, 1).setScale(ART).setDepth(depth).setFlipX(flip);
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    [[120, 'spruce-b'], [300, 'birch-a'], [470, 'spruce-a'], [700, 'pine-a'], [760, 'spruce-c'],
     [1230, 'birch-b'], [1400, 'spruce-a'], [1510, 'spruce-b'], [1790, 'birch-a'], [2150, 'spruce-a', true],
     [2290, 'spruce-c'], [2560, 'birch-b'], [2640, 'spruce-b'], [3180, 'spruce-a'], [3330, 'pine-a'],
     [3470, 'birch-a', true], [3600, 'spruce-b'], [4180, 'spruce-b', true], [4320, 'birch-a'], [4470, 'spruce-a'],
     [4860, 'pine-a', true], [5480, 'spruce-a'], [5600, 'birch-b'], [5690, 'spruce-c'], [6760, 'spruce-b'],
     [6840, 'birch-a'], [6980, 'spruce-a', true], [7420, 'pine-a'], [7540, 'spruce-b'], [9480, 'spruce-a'],
     [9620, 'birch-a', true], [9760, 'spruce-b'], [9900, 'pine-a'], [10060, 'spruce-a', true]
    ].forEach(([x, key, flip]) => prop(key, x, 1, !!flip));
    [260, 560, 1300, 1450, 2180, 2500, 3250, 3420, 4380, 4900, 5540, 6820, 7480, 9560, 9700].forEach((x, i) => {
      prop(i % 2 ? 'bush-b' : 'bush-a', x + (Math.random() * 20 - 10), 4, Math.random() < 0.5, this.groundY + 3);
    });
    [380, 2230, 4240, 9840].forEach((x) => prop('stump', x, 4, false, this.groundY + 3));
    // scattered undergrowth — skipping the water, the tall-grass gate, the
    // mushroom slope, the bramble and the rest field, which dress themselves
    const dressSkip = [
      [rivL - 40, rivR + 40], [gapL - 40, gapR + 40],
      [this.grassX - this.grassWidth / 2 - 60, this.grassX + this.grassWidth / 2 + 60],
      [5700, 6700], [7020, 7380], [7650, 9420],
      [1520, 1740]                                   // the fox cub's log
    ];
    for (let x = 140; x < worldWidth - 80; x += 90) {
      if (dressSkip.some(([a, b]) => x > a && x < b)) continue;
      if (Math.random() < 0.75) {
        prop(pick(['tuft-a', 'tuft-b', 'tuft-b', 'tuft-c']), x + (Math.random() * 30 - 15), 5, Math.random() < 0.5, this.groundY + 3);
      }
      if (Math.random() < 0.4) {
        prop(pick(['flower-white', 'flower-yellow', 'flower-pink']), x + (Math.random() * 50 - 25), 5, false, this.groundY + 2);
      }
      if (Math.random() < 0.14) prop('fern', x + 40, 4, Math.random() < 0.5, this.groundY + 3);
      if (Math.random() < 0.08) prop('pebble', x + 20, 4, false, this.groundY + 3);
    }
    // ── water — one tiled painting of a river: a lit edge, a bright surface,
    // then down into the dark. it drifts slowly (see update) ──
    this.waters = [];
    const addWater = (cx, w, top, h, depth, flow, alpha = 1) => {
      const water = this.add.tileSprite(cx - w / 2, this.groundY + top, w, h, 'woods-water')
        .setOrigin(0, 0).setTileScale(ART, ART).setDepth(depth).setAlpha(alpha);
      water.flow = flow;
      water.drift = Math.random() * 64;
      this.waters.push(water);
    };
    // the river filling its pit
    addWater(this.riverX, this.riverWidth + 20, 14, 88, 3, 5);
    // the near surface, drawn ABOVE the horse — its legs sink behind this, so it reads as in the water
    addWater(this.riverX, this.riverWidth + 20, 18, 30, 11, 8, 0.94);

    // the stepping-stone crossing — same water
    addWater(this.crossX, this.crossWidth + 20, 14, 88, 3, 5);
    // stepping stones — tops level with the ground, so you must JUMP between them.
    // the physics ellipse is invisible; a drawn stone sits at the same spot
    // (its top edge exactly on the ellipse's top)
    this.stones = this.physics.add.staticGroup();
    this.stoneXs.forEach((sx, i) => {
      const stone = this.add.ellipse(sx, this.groundY + 6, 44, 20, 0x6b7278).setDepth(6).setVisible(false);
      this.physics.add.existing(stone, true);
      stone.body.setSize(40, 12).setOffset(2, 0);
      this.stones.add(stone);
      this.add.image(sx, this.groundY - 6, `woods-stone-${'abc'[i % 3]}`)
        .setOrigin(0.5, 0).setScale(ART).setDepth(6).setFlipX(i % 2 === 1);
    });
    // the near surface over the stones — their feet sit IN the water instead of on top of it
    addWater(this.crossX, this.crossWidth + 20, 18, 12, 7, 8, 0.88);

    // ── checkpoint torches — each starts unlit and lights as you pass it:
    // on the near bank of the river, before the crossing, and before the bramble ──
    this.torches = {
      'torch-1': this.makeTorch(this.riverTorchX),
      'torch-2': this.makeTorch(this.torchX),
      'torch-3': this.makeTorch(this.brambleTorchX)
    };


    // ── the pond — a small woodland pool in front of the path, light sliding on it ──
    this.add.image(this.lakeCenterX, this.groundY + 4, 'woods-pond').setOrigin(0.5, 0).setScale(ART).setDepth(8);
    const shimmer = this.add.rectangle(this.lakeCenterX - 30, this.groundY + 26, 26, 2, 0xdff3f2, 0.7).setDepth(8);
    this.tweens.add({ targets: shimmer, x: this.lakeCenterX + 40, alpha: 0.15,
      duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // ── the weak tree ──
    this.treeScale = ART;
    this.treeSprite = this.add.image(this.treeX, this.groundY + 4, 'woods-sapling-weak')
      .setOrigin(0.5, 1).setScale(this.treeScale).setDepth(2);

    // ── the bucket (on the path) — seated: sunk a little into the ground,
    // with a soft contact shadow under it and grass tufts at its front edge.
    // the same image swaps bucket-empty/bucket-full, so this covers both;
    // the shadow and tufts follow it when it's picked up and set down ──
    this.bucketShadow = this.add.ellipse(this.bucketX, this.groundY + 4, 26, 6, 0x2c332e, 0.5).setDepth(2);
    this.groundBucket = this.add.image(this.bucketX, this.groundY + 5, 'woods-bucket-empty')
      .setOrigin(0.5, 1).setScale(ART).setDepth(2);
    this.bucketTufts = [
      prop('tuft-a', this.bucketX - 10, 3, false, this.groundY + 4),
      prop('tuft-a', this.bucketX + 11, 3, true, this.groundY + 4)
    ];

    // ── carrots on the path — planted: the root tip sits below the ground
    // line and a little mound of turned earth covers it, so only the greens
    // and the orange shoulder show. each one sits its own way — a slightly
    // different size, depth in the soil, and mound — a patch, not a row ──
    // on resume, the carrots picked in the saved run stay picked
    this.carrotXs.forEach((cx, index) => {
      if (this.saved.field & (1 << index)) return;
      const carrot = this.add.image(cx, this.groundY + 5 + Math.round(Math.random() * 2), 'woods-carrot')
        .setOrigin(0.5, 1).setScale(ART).setDepth(4);
      carrot.itemX = cx;
      carrot.fieldIndex = index;
      this.tweens.add({ targets: carrot, angle: { from: -4, to: 4 }, duration: 1200 + Math.random() * 400,
        yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      prop(Math.random() < 0.5 ? 'mound-a' : 'mound-b', cx, 4, Math.random() < 0.5, this.groundY + 8);
      this.carrotSprites.push(carrot);
    });

    // ── player ──
    // resume: if a saved checkpoint matches a known torch, spawn beside it
    // on the ground; otherwise (null/unknown) start at the forest entrance
    const savedCheckpoint = this.saved.place;
    let spawnX = 120;
    if (savedCheckpoint && this.torchCheckpoints[savedCheckpoint] !== undefined) {
      this.currentCheckpoint = savedCheckpoint;
      spawnX = this.torchCheckpoints[savedCheckpoint] - 10;   // beside the torch — a step past it can be water
      this.respawnX = this.torchCheckpoints[savedCheckpoint];
      this.respawnY = this.standY;
    }
    this.player = this.physics.add.sprite(spawnX, this.standY, `${this.characterId}-idle-sheet`, 39);
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(800);
    this.player.setMaxVelocity(220, 700);
    this.player.setScale(FOREST_SCALE);
    setTravelerBody(this.player);
    this.player.setDepth(10);
    this.physics.add.collider(this.player, this.platforms);

    this.physics.add.collider(this.player, this.stones);

    // ── river crossing: an invisible floor across the gap, solid ONLY while riding ──
    // ride over it and the horse carries you across the surface; on foot it passes and you fall in
    this.riverBridge = this.add.rectangle(this.riverX, this.groundY + 50, this.riverWidth + 8, 12).setVisible(false);
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

    this.physics.add.collider(this.player, this.ledges);

    // ── stone wall behind the cat — grounded on the cliff top, blocks the
    // right edge so the mushrooms are the only way down ──
    this.rockWall = this.add.image(this.cliffTopX + 100, this.cliffTopY + 6, 'woods-boulder')
      .setOrigin(0.5, 1).setScale(ART).setDepth(8);
    // seat the rock into the grass — tufts against its base in front
    [-26, -4, 18, 34].forEach((dx, i) => {
      this.add.image(this.cliffTopX + 100 + dx, this.cliffTopY + 4, i % 2 ? 'woods-tuft-b' : 'woods-tuft-a')
        .setOrigin(0.5, 1).setScale(ART).setDepth(9);
    });
    const rockBody = this.add.rectangle(this.cliffTopX + 108, this.cliffTopY - 45, 24, 100).setVisible(false);
    this.physics.add.existing(rockBody, true);
    this.physics.add.collider(this.player, rockBody);

    // ── bounce mushrooms: one on the ground, then one on each step, climbing to the cliff ──
    this.mushrooms = this.physics.add.staticGroup();
    const makeBounce = (x, groundTopY, scale, power, solid = true) => {
      const capY = groundTopY - 12;
      // the drawing is shown at the art's own size (`scale` still sizes the bounce
      // pad). it's planted deep and drawn BEHIND the hill, so the slope's own turf
      // closes over the foot of the stem and it grows out of the ground
      const m = this.add.image(x, capY + 10, 'woods-mushroom').setOrigin(0.5, 1).setScale(ART).setDepth(2.5);
      this.tweens.add({ targets: m, scaleX: { from: ART, to: ART + 0.1 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
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

    // the hill itself is one painting (tools/forest-art.mjs draws it to these
    // same measurements): a ramp rising left->right that levels into a flat top
    // at the peak and runs on under the whole rock to a sheer drop
    const platRight = this.cliffTopX + 230;
    this.add.image(mtnLeft, this.groundY + 6, 'woods-hill').setOrigin(0, 1).setScale(ART).setDepth(3);

    // scatter little flowers ALONG the whole green — up the slope, across the cliff
    // top by the cat, and behind the rock — so it's lush but never looks like a
    // bounce mushroom (only the real bounce mushrooms are mushrooms now).
    // (the mushrooms keep a little clear ground around their stems)
    const mushroomXs = [];
    for (let x = mtnLeft + 90; x <= peakX - 230; x += 90) mushroomXs.push(x);
    const plantFlower = (x) => {
      if (mushroomXs.some((mx) => Math.abs(x - mx) < 30)) return;
      const top = surfaceTopY(x) + 2;   // returns the flat cliff height past the peak
      const key = `woods-daisy-${Math.random() < 0.5 ? 'white' : 'yellow'}${Math.random() < 0.4 ? '-small' : ''}`;
      this.add.image(x + (Math.random() - 0.5) * 14, top, key)
        .setOrigin(0.5, 1).setScale(ART).setDepth(4);
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
    mushroomXs.forEach((x) => {
      const top = surfaceTopY(x);
      const power = -440 - (this.groundY - top) * 0.30;
      makeBounce(x, top + 10, 1.3, power, true);   // +10 sinks the base into the grass
    });

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
    this.catSprite = makeCat(this, this.cliffTopX, this.cliffTopY).setDepth(9);
    this.catSprite.play('cat-scared');
    this.catRescued = false;
    this.catBreathe = this.tweens.add({ targets: this.catSprite, scaleY: ART * 1.06,
      duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });   // quick, anxious little breaths

    // ── the meadow: other horses grazing (your horse's future friends) ──
    this.meadowHorses = [];
    const meadowData = [
      { x: this.meadowX - 130, key: 'horse-grey' },
      { x: this.meadowX + 140, key: 'horse-dark', flip: true },
      { x: this.meadowX + 40, key: 'foal' }
    ];
    meadowData.forEach((h, i) => {
      const m = this.add.sprite(h.x, this.groundY + 2, `woods-${h.key}`)
        .setOrigin(0.5, 1).setScale(ART).setDepth(4).setFlipX(!!h.flip);
      m.animKey = h.key;
      m.baseX = h.x;
      m.play({ key: `${h.key}-graze`, startFrame: i * 2 });
      // heads down in the grass, and up now and then to look around
      this.time.addEvent({ delay: 5200 + i * 1700, loop: true, callback: () => {
        if (m.anims.currentAnim?.key === `${h.key}-eat`) return;
        m.play(m.anims.currentAnim?.key === `${h.key}-graze` ? `${h.key}-idle` : `${h.key}-graze`);
      } });
      this.meadowHorses.push(m);
    });

    // ── tall-grass gate (only passable on horseback) — the tallest of it stands
    // behind you and a lower row in front, so you wade through it rather than
    // walk past it ──
    this.grassBlades = [];
    const grassRows = [
      [3, 0, ['tallgrass-a', 'tallgrass-b', 'tallgrass-c']],
      [11, 11, ['tallgrass-low-a', 'tallgrass-low-b']]
    ];
    for (let gx = this.grassX - this.grassWidth / 2; gx <= this.grassX + this.grassWidth / 2; gx += 22) {
      grassRows.forEach(([depth, shift, kinds]) => {
        const blade = this.add.image(gx + shift, this.groundY + 4, `woods-${pick(kinds)}`)
          .setOrigin(0.5, 1).setScale(ART).setDepth(depth).setFlipX(Math.random() < 0.5);
        blade.baseX = gx + shift;
        // gentle idle sway
        this.tweens.add({ targets: blade, angle: { from: -2, to: 2 },
          duration: 1600 + Math.random() * 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.grassBlades.push(blade);
      });
    }
    // wall at the grass — a real physics wall (can't be pushed through),
    // removed once you've learned the grass is safe by riding through it
    this.grassWall = this.add.rectangle(this.grassX - this.grassWidth / 2, this.groundY - 300, 12, 640).setVisible(false);
    this.physics.add.existing(this.grassWall, true);
    this.grassWallCollider = this.physics.add.collider(this.player, this.grassWall);
    this.grassNoticed = false;
    this.grassLearned = false;
    this.grassLearnedShown = false;


    // ── bramble thicket past the cliff — a frightened bird is tangled inside.
    // tall canes behind you and low runners in front, so you're IN the thorns ──
    this.brambleX = 7200;
    this.brambleWidth = 280;
    this.brambleBlades = [];
    const brambleKinds = ['bramble-a', 'bramble-b', 'bramble-c'];
    const thicket = (key, bx, depth) => {
      const thorn = this.add.image(bx, this.groundY + 4, `woods-${key}`)
        .setOrigin(0.5, 1).setScale(ART).setDepth(depth).setFlipX(Math.random() < 0.5);
      thorn.baseX = bx;
      this.brambleBlades.push(thorn);
    };
    for (let bx = this.brambleX - this.brambleWidth / 2 + 10; bx <= this.brambleX + this.brambleWidth / 2; bx += 52) {
      thicket(brambleKinds[this.brambleBlades.length % 3], bx, 7);
    }
    for (let bx = this.brambleX - this.brambleWidth / 2 + 30; bx <= this.brambleX + this.brambleWidth / 2; bx += 84) {
      thicket('bramble-low', bx, 11);
    }
    // the trapped bird, low in the thorns near the far side
    this.birdX = 7280;
    this.birdFreed = false;
    this.birdHintShown = false;
    this.birdPanicking = false;
    this.birdSprite = this.add.sprite(this.birdX, this.groundY - 28, 'woods-bird')
      .setOrigin(0.5, 1).setScale(ART).setDepth(8);
    this.birdSprite.play('bird-struggle');   // beating its wings — it's struggling to get free

    // ── resting field — trees, bushes, grass, and flowers, a wide quiet place after the bird ──
    this.restTreeX = 8000;
    // a smaller tree close beside the big one, slightly behind — a natural pair, not a row
    prop('birch-a', this.restTreeX - 120, 4, true);
    prop('oak-a', this.restTreeX, 6);
    // bushes scattered at a few points, mid-height texture between flowers and trees
    const restBushXs = [-300, -210, -50, 90, 190, 300, 480, 680, 900, 1150];
    restBushXs.forEach((dx) => {
      prop(pick(['bush-a', 'bush-b']), this.restTreeX + dx + (Math.random() * 20 - 10), 5, Math.random() < 0.5, this.groundY + 3);
    });
    // tufts of grass scattered through the field, uneven and low
    const restGrassXs = [-320, -270, -220, -170, -120, -70, -20, 30, 80, 130, 180, 230, 280, 320,
                          360, 400, 440, 490, 540, 590, 650, 700, 760, 820, 880, 940,
                          1000, 1070, 1140, 1200, 1265, 1330];
    restGrassXs.forEach((dx) => {
      prop(pick(['tuft-b', 'tuft-c', 'tuft-c']), this.restTreeX + dx + (Math.random() * 14 - 7), 5, Math.random() < 0.5, this.groundY + 3);
    });
    // flowers scattered unevenly through the field — not a neat row
    const restFlowerXs = [-330, -300, -260, -230, -195, -160, -130, -95, -65, -30, 5, 40,
                           75, 110, 145, 180, 215, 250, 285, 315,
                           380, 460, 550, 650, 760, 870, 990, 1120, 1260, 1390];
    restFlowerXs.forEach((dx) => {
      prop(pick(['flower-white', 'flower-yellow', 'flower-pink']), this.restTreeX + dx + (Math.random() * 16 - 8), 5, false, this.groundY + 2);
    });
    this.restEntryShown = false;
    this.resting = false;
    this.restAtField = false;   // resting under the big tree (vs. sitting to wait somewhere else)
    this.restTimer = 0;
    this.restBirdVisited = false;
    this.restRabbitsVisited = false;

    // ── the horse + its gate ──
    this.horseSprite = this.add.sprite(this.horseX, this.groundY + 2, 'woods-horse')
      .setOrigin(0.5, 1).setScale(ART).setDepth(4);
    this.horseSprite.play('horse-idle');
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

    // ── carried bucket (follows player) — just behind the traveler, in front of
    // everything they walk past ──
    this.heldBucket = this.add.image(0, 0, 'woods-bucket-empty')
      .setOrigin(0.5, 1).setScale(ART).setDepth(9.5).setVisible(false);

    // ── input ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.keyE = this.input.keyboard.addKey('E');
    this.keyI = this.input.keyboard.addKey('I');
    // hold to walk slowly and gently — matters most in the bramble
    this.keyShift = this.input.keyboard.addKey('SHIFT');
    const openPause = () => { this.scene.pause(); this.scene.launch('PauseScene', { caller: this.scene.key }); };
    this.input.keyboard.on('keydown-P', openPause);
    this.input.keyboard.on('keydown-ESC', openPause);

    // ── prompt ──
    this.prompt = this.add.text(0, 0, '', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '15px',
      color: '#f0ece0', backgroundColor: '#00000066', padding: { x: 8, y: 4 }
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(150).setVisible(false);

    this.player.play(`${this.characterId}-idle`);
    // ── the fox cub in the hollow log, between the carrot field and the lake ──
    this.fox = new FoxCubPuzzle(this, 1680);

    this.restoreProgress();
    if (this.saved.place === 'start') this.time.delayedCall(600, () => this.showThought('north. but there\'s no hurry.'));
  }

  // put the world back the way the saved run left it
  restoreProgress() {
    const saved = this.saved;
    if (!saved.saved) return;
    const has = (flag) => (saved.flags & flag) !== 0;

    // the bag you packed at home, minus whatever the saved run already gave away
    this.inventory = { bread: has(FLAGS.fox) ? 0 : 1, water: 1, rope: 1, carrots: saved.carrots };
    if (has(FLAGS.fox)) this.fox.restore();
    this.pickedCarrots = saved.field;

    if (has(FLAGS.tree)) {
      this.treeWatered = true;
      this.bucketPicked = true;
      this.treeSprite.setTexture('woods-sapling-healthy');
      // the empty bucket was left by the tree
      this.groundBucket.setPosition(this.treeX + 34, this.groundY + 5);
      this.bucketShadow.setPosition(this.treeX + 34, this.groundY + 4);
      this.bucketTufts.forEach((t) => t.setVisible(false));
    }
    if (has(FLAGS.horseFed)) {
      this.horseFed = true;
      this.physics.world.removeCollider(this.horseGateCollider);
    }
    if (has(FLAGS.grassLearned)) {
      this.grassLearned = true;
      this.grassLearnedShown = true;
      this.physics.world.removeCollider(this.grassWallCollider);
      this.grassWallCollider = null;
    }
    if (has(FLAGS.goodbye)) {
      this.saidGoodbye = true;
      this.horseSprite.x = this.meadowX - 30;
      this.horseSprite.play('horse-graze');
    } else if (this.horseFed) {
      this.horseSprite.x = this.player.x - 70;   // waiting beside you
    }
    this.meadowHorses.forEach((m, i) => { if (saved.meadow & (1 << i)) m.fed = true; });
    if (has(FLAGS.cat)) {
      this.catRescued = true;
      this.catFollowing = true;
      this.calmCat();
      this.catSprite.setPosition(this.player.x - 50, this.groundY + 2);
      this.catSprite.play('cat-stand');
    }
    if (has(FLAGS.bird)) {
      this.birdFreed = true;
      this.birdSprite.stop().setVisible(false);
    }
  }

  // everything worth keeping about this run, packed for the game service
  snapshot() {
    let flags = 0;
    if (this.treeWatered) flags |= FLAGS.tree;
    if (this.horseFed) flags |= FLAGS.horseFed;
    if (this.grassLearned) flags |= FLAGS.grassLearned;
    if (this.saidGoodbye) flags |= FLAGS.goodbye;
    if (this.catRescued) flags |= FLAGS.cat;
    if (this.birdFreed) flags |= FLAGS.bird;
    if (this.fox.done) flags |= FLAGS.fox;
    let meadow = 0;
    this.meadowHorses.forEach((m, i) => { if (m.fed) meadow |= 1 << i; });
    return encodeProgress({
      place: this.currentCheckpoint || 'start',
      carrots: this.inventory.carrots || 0,
      field: this.pickedCarrots,
      meadow,
      flags
    });
  }

  // keep the registry copy current (PauseScene and EndingScene read it) and
  // save to the backend, fire-and-forget, when a session exists
  saveProgress(sceneKey = 'ForestScene') {
    const state = this.snapshot();
    this.registry.set('checkpoint', state);
    const sessionId = this.registry.get('sessionId');
    if (sessionId) {
      game.updateProgress(sessionId, sceneKey, this.kindness, state)
        .catch((err) => console.warn('could not save progress:', err.message));
    }
  }

  // a checkpoint torch — unlit until you walk past it
  makeTorch(x) {
    const post = this.add.image(x, this.groundY + 2, 'woods-torch').setOrigin(0.5, 1).setScale(ART).setDepth(6);
    const flame = this.add.sprite(x, this.groundY - 58, 'woods-flame')
      .setOrigin(0.5, 1).setScale(ART).setDepth(7).setVisible(false);
    const glow = this.add.circle(x, this.groundY - 70, 34, 0xffb347, 0).setDepth(5);
    return { x, post, flame, glow, lit: false };
  }

  lightTorch(torch) {
    torch.lit = true;
    torch.flame.setVisible(true).play('flame-burn');
    this.tweens.add({ targets: torch.glow, alpha: 0.18, duration: 600, ease: 'Sine.out',
      onComplete: () => {
        this.tweens.add({ targets: torch.glow, alpha: { from: 0.10, to: 0.22 }, scale: { from: 0.92, to: 1.08 },
          duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      } });
    // a little whoosh of sparks
    for (let i = 0; i < 10; i++) {
      const sp = this.add.rectangle(torch.x, this.groundY - 68, 2, 2, 0xffd27a, 0.9).setDepth(7);
      const a = Math.random() * Math.PI * 2;
      this.tweens.add({ targets: sp, x: torch.x + Math.cos(a) * 26, y: this.groundY - 68 + Math.sin(a) * 26 - 14,
        alpha: 0, duration: 700 + Math.random() * 400, onComplete: () => sp.destroy() });
    }
  }

  // the cat stops trembling once it's safe with you
  calmCat() {
    if (this.catBreathe) { this.catBreathe.stop(); this.catBreathe = null; }
    this.catSprite.setScale(ART);
  }

  // a rabbit crosses the resting field in hops: in from behind you, a pause
  // where you can see it — and it looks back at you — then on its way
  sendRabbit(index) {
    const floor = this.groundY + 2;
    const dir = this.player.flipX ? -1 : 1;
    const rabbit = this.add.sprite(this.player.x - dir * (300 + index * 30), floor, 'woods-rabbit', 0)
      .setOrigin(0.5, 1).setScale(ART).setDepth(9);
    const pauseX = this.player.x + dir * (74 + index * 40), exitX = this.player.x + dir * 720;
    const hopTo = (targetX, then) => {
      const left = targetX - rabbit.x;
      if (Math.abs(left) < 6) { then(); return; }
      const step = Math.sign(left) * Math.min(Math.abs(left), 42);
      rabbit.setFlipX(step > 0);                                      // the art faces left
      rabbit.play('rabbit-hop');
      this.tweens.add({ targets: rabbit, x: rabbit.x + step, duration: 320 });
      this.tweens.add({ targets: rabbit, y: floor - 14, duration: 160, yoyo: true, ease: 'Quad.out',
        onComplete: () => {
          rabbit.setFrame(0);
          this.time.delayedCall(110, () => hopTo(targetX, then));     // a breath between hops
        } });
    };
    hopTo(pauseX, () => {
      rabbit.setFlipX(rabbit.x < this.player.x);
      rabbit.play('rabbit-sit');
      this.time.delayedCall(1700 + index * 350, () => hopTo(exitX, () => rabbit.destroy()));
    });
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
    this.registry.set('kindness', this.kindness);
    this.sparkle(x, y);
    this.saveProgress();
  }

  // record the torch you just passed as the active checkpoint and save,
  // only when it actually changes
  setCheckpoint(id) {
    if (id === this.currentCheckpoint) return;
    this.currentCheckpoint = id;
    this.saveProgress();
  }

  update() {
    tickClock(this);

    // ── bag toggle (I) ──
    if (Phaser.Input.Keyboard.JustDown(this.keyI)) this.toggleBag();

    const px = this.player.x;
    this.fox.update(px);
    this.fox.face(px);

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
        this.registry.set('kindness', this.kindness);
        this.saveProgress('EndingScene');
        this.scene.start('EndingScene');
      });
    }

    // ── light a torch as you pass it (a warm point in the forest) — it's your checkpoint now ──
    Object.entries(this.torches).forEach(([id, torch]) => {
      if (torch.lit || Math.abs(px - torch.x) >= 50) return;
      if (id === 'torch-3' && this.player.y <= this.groundY - 60) return;   // not from up on the hill
      this.respawnX = torch.x;
      this.respawnY = this.standY;
      this.setCheckpoint(id);
      this.lightTorch(torch);
    });

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
      this.player.setPosition(this.respawnX, this.standY);
      this.showThought('cold! ... try again.', 1600);
    }
    const onGround = this.player.body.blocked.down;
    const vx = Math.abs(this.player.body.velocity.x);

    // ── parallax ──
    const camX = this.cameras.main.scrollX;
    this.bgLayers.forEach((l) => { l.tilePositionX = camX * l.parallaxFactor / l.tileScaleX; });
    // the rivers drift, a whole pixel at a time
    this.waters.forEach((w) => {
      w.drift += w.flow * this.game.loop.delta / 1000;
      w.tilePositionX = Math.round(w.drift);
    });

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
      (this.player.anims.currentAnim?.key === `${this.characterId}-water` || this.player.anims.currentAnim?.key === `${this.characterId}-crouch`);

    if (this.resting) {
      this.player.setVelocity(0, 0);
      this.restTimer += this.game.loop.delta;

      // ── the bird you freed comes to visit, quickly enough not to be missed ──
      if (this.restAtField && this.birdFreed && !this.restBirdVisited && this.restTimer > 1200) {
        this.restBirdVisited = true;
        const side = this.player.flipX ? -1 : 1;
        const bx = this.player.x + side * 60, floor = this.groundY + 2;
        const bird = this.birdSprite;
        this.tweens.killTweensOf(bird);                                // in case it's still on its way out of the thorns
        bird.setPosition(bx + side * 60, this.groundY - 240).setAlpha(1).setVisible(true).setAngle(0)
          .setFlipX(side < 0).play('bird-fly');                        // flying in toward you
        this.tweens.add({ targets: bird, x: bx, y: floor, duration: 1100, ease: 'Sine.out',
          onComplete: () => {
            bird.play('bird-perch').setFlipX(side > 0);                // landed, looking at you
            this.showThought('you again.', 2600);
            // a few glad little hops, then off into the trees
            this.tweens.add({ targets: bird, y: floor - 12, duration: 150, yoyo: true, repeat: 2,
              repeatDelay: 420, ease: 'Quad.out',
              onComplete: () => {
                this.time.delayedCall(500, () => {
                  bird.play('bird-fly').setFlipX(true);
                  this.tweens.add({ targets: bird, x: bx + 700, y: this.groundY - 480,
                    duration: 2000, ease: 'Sine.in', onComplete: () => bird.setVisible(false) });
                });
              } });
          } });
      }

      // ── two rabbits pass through, unhurried, because the forest trusts stillness ──
      if (this.restAtField && !this.restRabbitsVisited && this.restTimer > 3400) {
        this.restRabbitsVisited = true;
        [0, 1].forEach((index) => this.time.delayedCall(index * 700, () => this.sendRabbit(index)));
      }
    } else if (left) {
      this.player.setVelocityX(-speed); this.player.setFlipX(true);
      if (onGround && !this.riding && this.player.anims.currentAnim?.key !== `${this.characterId}-walk`) this.player.play(`${this.characterId}-walk`);
    } else if (right) {
      this.player.setVelocityX(speed); this.player.setFlipX(false);
      if (onGround && !this.riding && this.player.anims.currentAnim?.key !== `${this.characterId}-walk`) this.player.play(`${this.characterId}-walk`);
    } else if (onGround && !this.riding && !poseHold && this.player.anims.currentAnim?.key !== `${this.characterId}-idle`) {
      this.player.play(`${this.characterId}-idle`);
    }
    // riding and airborne poses override the on-foot walk/idle above
    if (this.riding) {
      if (this.player.anims.currentAnim?.key !== `${this.characterId}-sit`) this.player.play(`${this.characterId}-sit`);
    } else if (!onGround && !this.resting) {
      if (this.player.anims.currentAnim?.key !== `${this.characterId}-jump`) this.player.play(`${this.characterId}-jump`);
    }
    if (jump && onGround && !this.resting) this.player.setVelocityY(this.riding ? -540 : -340);
    // the river bed sits lower than the banks — the horse steps up and out by itself
    if (wading && onGround && (this.player.body.blocked.left || this.player.body.blocked.right)) this.player.setVelocityY(-300);

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
      const target = Math.abs(dx) < 60 ? b.baseX + (dx > 0 ? -10 : 10) : b.baseX;
      b.x += (target - b.x) * 0.15;
    });

    // ── bramble: thorns part as you pass, and the bird reacts to how you move ──
    const brambleL = this.brambleX - this.brambleWidth / 2;
    const brambleR = this.brambleX + this.brambleWidth / 2;
    this.brambleBlades.forEach((b) => {
      const dx = this.player.x - b.baseX;
      const target = Math.abs(dx) < 50 ? b.baseX + (dx > 0 ? -8 : 8) : b.baseX;
      b.x += (target - b.x) * 0.15;
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
      // the bird beats its way up and out of sight
      this.birdSprite.play('bird-fly');
      this.tweens.add({ targets: this.birdSprite, y: this.birdSprite.y - 180, alpha: 0,
        duration: 900, ease: 'Quad.in' });
      // send you back to the checkpoint, then the bird returns to try again
      this.time.delayedCall(700, () => {
        this.player.setVelocity(0, 0);
        this.player.setPosition(this.respawnX, this.respawnY);
      });
      this.time.delayedCall(1600, () => {
        this.birdSprite.setPosition(this.birdX, this.groundY - 28).setAlpha(1).play('bird-struggle');
        this.birdPanicking = false;
      });
    }

    if (this.carryingCat) {
      // held in your arms — the only way it's coming down from the cliff
      this.catSprite.x = this.player.x + (this.player.flipX ? -7 : 7) * FOREST_SCALE;
      this.catSprite.y = this.player.y + 21 * FOREST_SCALE;
      this.catSprite.setFlipX(!this.player.flipX);
    } else if (this.catFollowing) {
      updateCatFollow(this, this.catSprite, this.player, this.groundY);
    }

    const horse = this.horseSprite;
    if (this.riding) {
      // the horse under you: hooves on whatever you're standing on, its back
      // under your seat — on the road and in the river alike
      const facing = this.player.flipX ? -1 : 1;
      let bob = 0;
      if (wading) {
        // the river comes up to its belly; you rise and fall with it as it wades
        bob = Math.round(Math.sin(this.time.now / 220) * 2);
        // ripples trailing at the waterline as the horse moves
        if (Math.abs(this.player.body.velocity.x) > 20 && this.time.now % 6 < 1) {
          const rip = this.add.rectangle(horse.x, this.groundY + 20, 18, 2, 0xc9ecec, 0.7).setDepth(12);
          this.tweens.add({ targets: rip, scaleX: 2.6, alpha: 0,
            duration: 900, ease: 'Sine.out', onComplete: () => rip.destroy() });
        }
        if (!this.riverThoughtShown) {
          this.riverThoughtShown = true;
          this.showThought("steady. i've got you.", 3000);
        }
      }
      setTravelerBody(this.player, this.rideLift - bob);
      horse.x = this.player.x + facing * 8;
      horse.y = this.player.body.bottom + 2 + bob;
      horse.setFlipX(!this.player.flipX);
      horse.play(Math.abs(this.player.body.velocity.x) > 20 ? 'horse-walk' : 'horse-idle', true);
      horse.anims.timeScale = wading ? 0.7 : 1.3;                  // a slow wade, a quick trot
    } else if (this.horseFed && !this.saidGoodbye) {
      // dismounted companion — the horse gently trails behind you
      const behind = this.player.x - (this.player.flipX ? -70 : 70);
      const gap = behind - horse.x;
      horse.x += gap * 0.04;
      horse.y = this.groundY + 2;
      horse.anims.timeScale = 1;
      if (horse.anims.currentAnim?.key !== 'horse-eat' || !horse.anims.isPlaying) {
        horse.setFlipX(horse.x < this.player.x);
        horse.play(Math.abs(gap) > 10 ? 'horse-walk' : 'horse-idle', true);
      }
    }

    // ── carried bucket follows player ──
    if (this.carrying) {
      this.heldBucket.setVisible(true);
      this.heldBucket.setTexture(this.carrying === 'full' ? 'woods-bucket-full' : 'woods-bucket-empty');
      this.heldBucket.x = this.player.x + (this.player.flipX ? 13 : -13) * FOREST_SCALE;
      this.heldBucket.y = this.player.y + 25 * FOREST_SCALE;
    } else {
      this.heldBucket.setVisible(false);
    }


    // ── interaction prompt + action ──
    let label = null, action = null;
    const near = (x, r = 75) => Math.abs(px - x) < r;
    const foxOffer = this.fox.offer(px, onGround);
    const nearCarrot = this.carrotSprites.find((cr) => cr.active && Math.abs(px - cr.itemX) < 70);
    // watering comes first — a few carrots grow right beside the tree
    if (this.carrying === 'full' && !this.treeWatered && near(this.treeX)) { label = 'water the tree'; action = 'water'; }
    else if (nearCarrot) { label = 'pick up the carrot'; action = 'carrot'; this._nearCarrot = nearCarrot; }
    else if (foxOffer && foxOffer.action) { label = foxOffer.label; action = foxOffer.action; }
    else if (!this.bucketPicked && near(this.bucketX)) { label = 'pick up the bucket'; action = 'pickup'; }
    else if (this.carrying === 'empty' && near(this.lakeFillX, 130)) { label = 'fill the bucket'; action = 'fill'; }
    else if (!this.horseFed && near(this.horseX, 95) && (this.inventory.carrots || 0) > 0) { label = 'give the horse a carrot'; action = 'feedhorse'; }
    else if (!this.catRescued && Math.abs(px - this.catSprite.x) < 70 && Math.abs(this.player.y - this.catSprite.y) < 80) { label = 'pick up the cat'; action = 'pickupcat'; }
    else if (!this.birdFreed && !this.birdPanicking && this.movingSlow && Math.abs(px - this.birdX) < 60) { label = 'free the bird'; action = 'freebird'; }
    else if (this.horseFed && !this.saidGoodbye && Math.abs(px - this.meadowX) < 160) { label = 'say goodbye'; action = 'farewell'; }
    else if (this.horseFed && !this.riding && !this.saidGoodbye && Math.abs(px - this.horseSprite.x) < 120) { label = 'ride the horse'; action = 'mount'; }
    else if (!this.resting && !this.riding && onGround && Math.abs(px - this.restTreeX) < 90) { label = 'lay down to rest'; action = 'restdown'; }
    else if (this.resting) { label = 'get up'; action = 'restup'; }
    else if (!this.horseFed && near(this.horseX, 95)) {
      label = null;
      if (!this.horseHungryHintShown) {
        this.horseHungryHintShown = true;
        this.showThought('the horse looks hungry. maybe a carrot from the field would help.', 3600);
      }
    }
    else {
      const mh = this.meadowHorses && this.meadowHorses.find((m) => !m.fed && Math.abs(px - m.baseX) < 70);
      if (mh && (this.inventory.carrots || 0) > 0) { label = 'give a carrot'; action = 'feedmeadow'; this._nearMeadow = mh; }
    }
    if (this.horseHungryHintShown && !near(this.horseX, 95)) this.horseHungryHintShown = false;

    // nothing else to do here? then you can set down whatever you're carrying
    if (!label && this.carryingCat && onGround && this.player.body.bottom > this.groundY - 10) { label = 'put down the cat'; action = 'putdowncat'; }
    else if (!label && this.carrying && onGround) { label = 'put down the bucket'; action = 'putdownbucket'; }

    if (label) {
      this.prompt.setText('▸ e  ' + label).setVisible(true);
      this.prompt.setPosition(this.W / 2, this.H - 40);
    } else if (foxOffer && foxOffer.hint) {
      this.prompt.setText('▸ ' + foxOffer.label).setVisible(true);
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
        setTravelerBody(this.player);
        this.player.y += this.rideLift;
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
        const iconKey = 'woods-icon-' + name.replace(/s$/, '');
        if (this.textures.exists(iconKey)) {
          const icon = this.add.image(W / 2 - 110, y, iconKey).setOrigin(0.5).setScale(ART);
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
    if (this.fox.act(action)) return;
    if (action === 'restdown') {
      this.resting = true;
      this.restAtField = true;
      this.restTimer = 0;
      this.player.setVelocity(0, 0);
      this.player.body.setAllowGravity(false);   // stay put on the ground while resting
      this.player.play(`${this.characterId}-rest`);
      return;
    }
    if (action === 'restup') {
      this.resting = false;
      this.player.body.setAllowGravity(true);
      return;
    }
    if (action === 'freebird') {
      this.birdFreed = true;
      this.addKindness(this.birdX, this.groundY - 60);
      this.showThought('there you go. carefully now.', 3200);
      // a gentle lift — it hangs in the air a beat, finding its wings, then flies off into the canopy
      const bird = this.birdSprite;
      bird.play('bird-fly');
      this.tweens.add({ targets: bird, y: this.groundY - 76, duration: 600, ease: 'Quad.out',
        onComplete: () => {
          this.tweens.add({ targets: bird, y: this.groundY - 92, duration: 500, yoyo: true, ease: 'Sine.inOut',
            onComplete: () => {
              bird.setFlipX(true);                                    // away, to the right
              this.tweens.add({ targets: bird, x: this.birdX + 900, y: this.groundY - 520,
                duration: 3200, ease: 'Sine.in',
                onComplete: () => bird.setVisible(false) });
            } });
        } });
      return;
    }
    if (action === 'farewell') {
      this.saidGoodbye = true;
      if (this.riding) {
        this.riding = false;
        setTravelerBody(this.player);
        this.player.y += this.rideLift;
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
      // the horse trots off to join the meadow, and puts its head down with the others
      const horse = this.horseSprite;
      horse.y = this.groundY + 2;
      horse.anims.timeScale = 1;
      horse.setFlipX(this.meadowX - 30 > horse.x).play('horse-walk');
      this.tweens.add({ targets: horse, x: this.meadowX - 30, duration: 2600,
        ease: 'Sine.inOut', onComplete: () => horse.play('horse-graze') });
      return;
    }
    if (action === 'mount') {
      this.riding = true;
      // lift the sprite (offset + y cancel out, so the body stays put) to seat it on the horse's back
      setTravelerBody(this.player, this.rideLift);
      this.player.y -= this.rideLift;
      this.horseX = this.player.x;   // track from here
      this.showThought('up you go.');
      return;
    }
    if (action === 'feedhorse') {
      if (!this.riding) this.player.play(`${this.characterId}-crouch`);   // a quick bend-down beat
      this.inventory.carrots -= 1;
      this.horseFed = true;
      this.physics.world.removeCollider(this.horseGateCollider);
      this.addKindness(this.horseX, this.groundY - 60);
      // it takes the carrot from your hand
      this.horseSprite.setFlipX(this.player.x > this.horseSprite.x).play('horse-eat');
      this.showThought('the horse eats happily. the way is clear.');
      return;
    }
    if (action === 'feedmeadow' && this._nearMeadow) {
      if (!this.riding) this.player.play(`${this.characterId}-crouch`);   // a quick bend-down beat
      this.inventory.carrots -= 1;
      this._nearMeadow.fed = true;
      this.sparkle(this._nearMeadow.x, this.groundY - 30);
      this._nearMeadow.setFlipX(this.player.x > this._nearMeadow.x)
        .play(`${this._nearMeadow.animKey}-eat`).chain(`${this._nearMeadow.animKey}-graze`);
      this.addKindness(this._nearMeadow.x, this.groundY - 40);
      this._nearMeadow = null;
      return;
    }
    if (action === 'pickupcat') {
      // too scared to climb down by itself — you carry it
      this.carryingCat = true;
      this.catRescued = true;
      this.calmCat();
      this.catSprite.play('cat-held').setDepth(10.5);              // in your arms, in front of you
      this.addKindness(this.catSprite.x, this.catSprite.y - 20);
      this.showThought("there you are. i've got you.", 3200);
      return;
    }
    if (action === 'putdowncat') {
      // safe on the ground — from here it follows you, all the way to the end
      this.carryingCat = false;
      this.catFollowing = true;
      this.catSprite.stillMs = 0;
      this.catSprite.play('cat-stand').setDepth(9);
      this.catSprite.setPosition(Math.round(this.player.x) + (this.player.flipX ? -30 : 30), this.groundY + 2);
      this.showThought('there. safe on the ground.', 2400);
      return;
    }
    if (action === 'putdownbucket') {
      this.groundBucketState = this.carrying;
      this.carrying = null;
      this.bucketPicked = false;
      this.bucketX = Math.round(this.player.x);
      this.groundBucket.setTexture(this.groundBucketState === 'full' ? 'woods-bucket-full' : 'woods-bucket-empty');
      this.groundBucket.setPosition(this.bucketX, this.groundY + 5);
      this.groundBucket.setVisible(true);
      this.bucketShadow.setPosition(this.bucketX, this.groundY + 4).setVisible(true);
      this.bucketTufts[0].setPosition(this.bucketX - 10, this.groundY + 4).setVisible(true);
      this.bucketTufts[1].setPosition(this.bucketX + 11, this.groundY + 4).setVisible(true);
      this.showThought('set it down for now.', 2200);
      return;
    }
    if (action === 'carrot' && this._nearCarrot) {
      if (!this.riding) this.player.play(`${this.characterId}-crouch`);   // a quick bend-down beat
      this.addItem('carrots');
      this.sparkle(this._nearCarrot.x, this._nearCarrot.y - 10);
      this.pickedCarrots |= 1 << this._nearCarrot.fieldIndex;
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
      if (!this.riding) this.player.play(`${this.characterId}-water`);
      this.treeWatered = true;
      this.carrying = null;
      this.heldBucket.setVisible(false);
      this.add.ellipse(this.treeX + 34, this.groundY + 4, 26, 6, 0x2c332e, 0.5).setDepth(2);
      this.add.image(this.treeX + 34, this.groundY + 5, 'woods-bucket-empty')
        .setOrigin(0.5, 1).setScale(ART).setDepth(2);
      this.add.image(this.treeX + 24, this.groundY + 4, 'woods-tuft-a')
        .setOrigin(0.5, 1).setScale(ART).setDepth(3);
      this.treeSprite.setTexture('woods-sapling-healthy');
      this.treeSprite.setScale(this.treeScale * 0.9, this.treeScale * 0.78);
      this.tweens.add({ targets: this.treeSprite, scaleX: this.treeScale, scaleY: this.treeScale,
        duration: 750, ease: 'Back.out' });
      this.addKindness(this.treeX, this.groundY - 90);
      this.time.delayedCall(700, () => this.showThought('there. i\'ll bring you water every day.'));
    }
  }
}
