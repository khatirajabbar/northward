import Phaser from 'phaser';
import { leaderboard, formatTime } from '../services/leaderboard.js';
import { game } from '../services/game.js';
import { makeCat, updateCatFollow } from '../characters/cat.js';
import { FOREST_SCALE, FEET, setTravelerBody } from '../characters/lpc.js';
import { FLAGS, clock, tickClock, decodeProgress } from '../services/progress.js';
import { CREDITS } from '../credits.js';

// The last field is drawn by tools/forest-art.mjs like the rest of the forest
// and shown at 2x; this scene tints it from cold night to warm dusk.
const ART = 2;

const CRYING_COMPANION = { 'lpc-khatira': 'lpc-oliver', 'lpc-oliver': 'lpc-khatira' };

// the companion's poses: [sheet, frame, how high their eyes are in frame pixels]
const POSE = {
  seated: ['sit', 27, 32],       // sitting on the ground, facing out
  standing: ['idle', 39, 44]
};
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

    // ── landmark positions ──
    this.fireX = 1500;             // an old stone fire ring at their camp
    this.nestTreeX = 1730;         // the tall tree the nest is in
    this.treeScale = 1.45;
    this.nestX = this.nestTreeX - 20 * this.treeScale;      // tucked in against the trunk
    this.nestY = this.groundY + 4 - 85 * this.treeScale;    // on the trunk, below the canopy
    this.birdX = this.nestX + 4;   // the bird lies where it fell, below the nest
    this.figureHomeX = 1790;       // where they sit crying
    this.figureFireX = this.fireX + 62;   // where they settle once the fire is lit
    this.seatX = this.figureFireX + 26 * FOREST_SCALE;   // where you sit, close beside them
    this.leaveX = 1000;             // walking back past here ends the game

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

    // ── sky: a cold indigo night painted in bands, with the gold dusk it turns
    // into laid over it — the warmth fades one into the other ──
    this.cameras.main.setBackgroundColor('#0d1220');
    this.add.image(0, 0, 'woods-dusk-cold').setOrigin(0, 0).setScale(ART).setScrollFactor(0).setDepth(-40);
    this.duskSky = this.add.image(0, 0, 'woods-dusk-warm')
      .setOrigin(0, 0).setScale(ART).setScrollFactor(0).setDepth(-39).setAlpha(0);

    // ── stars, fading out as the warmth comes in ──
    this.stars = this.add.container(0, 0).setScrollFactor(0.03).setDepth(-38);
    for (let i = 0; i < 46; i++) {
      const size = Math.random() < 0.18 ? 4 : 2;
      const s = this.add.rectangle(Math.round(Math.random() * width * 0.8) * 2, Math.round(Math.random() * height * 0.27) * 2,
        size, size, 0xe8f0f8, 0.5 + Math.random() * 0.5);
      this.tweens.add({ targets: s, alpha: 0.2 + Math.random() * 0.3,
        duration: 900 + Math.random() * 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.stars.add(s);
    }

    // ── moon giving way to a low, rising sun ──
    this.moon = this.add.image(width * 0.74, 110, 'woods-moon')
      .setScrollFactor(0.05).setDepth(-37).setScale(ART).setAlpha(0.9);
    this.sunBaseY = height * 0.62;
    this.sun = this.add.image(width * 0.32, this.sunBaseY, 'woods-sun')
      .setScrollFactor(0.05).setDepth(-37).setScale(ART).setAlpha(0);

    // ── slow clouds ──
    [{ x: 180, y: 90, key: 'dusk-cloud-a', d: 90000 }, { x: 620, y: 160, key: 'dusk-cloud-b', d: 120000 },
     { x: 1000, y: 70, key: 'dusk-cloud-a', d: 100000, f: true }].forEach((c) => {
      const cloud = this.add.image(c.x, c.y, `woods-${c.key}`)
        .setScrollFactor(0.08).setDepth(-36).setScale(ART).setAlpha(0.7).setFlipX(!!c.f);
      this.tweens.add({ targets: cloud, x: c.x + 500, duration: c.d, repeat: -1, yoyo: true, ease: 'Sine.inOut' });
      this.tintScenery.push({ obj: cloud, cold: 0x8fa2ba, warm: 0xffc9a2 });
    });

    // ── the forest behind — the same three tree lines as the road here,
    // dark against the night and browning as the dusk comes up ──
    this.bgLayers = [];
    const addLayer = (key, factor, depth, coldTint, warmTint) => {
      const ts = this.add.tileSprite(0, 0, width, height, key);
      ts.setOrigin(0, 0).setScrollFactor(0).setTileScale(ART, ART).setDepth(depth).setTint(coldTint);
      ts.parallaxFactor = factor;
      ts.coldTint = coldTint;
      ts.warmTint = warmTint;
      this.bgLayers.push(ts);
    };
    addLayer('woods-far', 0.12, -24, 0x7a7e96, 0xffa078);
    addLayer('woods-mid', 0.25, -23, 0x74788f, 0xff9068);
    addLayer('woods-near', 0.45, -22, 0x5e6078, 0xff8462);

    // ── ground: invisible physics tiles, with the forest's earth drawn on top ──
    this.platforms = this.physics.add.staticGroup();
    for (let x = 0; x < worldWidth; x += 16) {
      const tile = this.platforms.create(x, this.groundY, 'grass').setOrigin(0, 0);
      tile.refreshBody();
      tile.setVisible(false);
    }
    this.terrain = this.add.tileSprite(0, this.groundY, worldWidth, 80, 'woods-ground')
      .setOrigin(0, 0).setTileScale(ART, ART).setDepth(2);
    this.fringe = this.add.tileSprite(0, this.groundY + 2, worldWidth, 12, 'woods-fringe')
      .setOrigin(0, 1).setTileScale(ART, ART).setDepth(5);
    const scenery = (obj) => {
      this.tintScenery.push({ obj, cold: this.sceneCold, warm: this.sceneWarm });
      return obj;
    };
    scenery(this.terrain);
    scenery(this.fringe);

    // ── the field: full trees, bare trees, bushes, grass, flowers ──
    const dress = (key, x, depth, flip = false, y = this.groundY + 4) => scenery(
      this.add.image(x, y, `woods-${key}`).setOrigin(0.5, 1).setScale(ART).setDepth(depth).setFlipX(flip));
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    [{ x: 340, key: 'oak-a' }, { x: 900, key: 'oak-b', f: true }, { x: 2120, key: 'oak-a', f: true }].forEach((t) => {
      dress(t.key, t.x, 3, !!t.f);
    });
    [640, 1180, 2300].forEach((x, i) => {
      dress(i % 2 ? 'bare-b' : 'bare-a', x, 3, Math.random() < 0.5);
    });
    [240, 540, 980, 1340, 1950, 2210].forEach((x, i) => {
      dress(i % 2 ? 'bush-b' : 'bush-a', x + (Math.random() * 20 - 10), 4, Math.random() < 0.5, this.groundY + 3);
    });
    for (let x = 160; x < worldWidth - 80; x += 90) {
      if (Math.random() < 0.75) {
        dress(pick(['tuft-a', 'tuft-b', 'tuft-b', 'tuft-c']), x + (Math.random() * 30 - 15), 5, Math.random() < 0.5, this.groundY + 3);
      }
      if (Math.random() < 0.4) {
        dress(pick(['flower-white', 'flower-yellow']), x + (Math.random() * 50 - 25), 5, false, this.groundY + 2);
      }
    }

    // ── the camp: the nest tree, the empty nest, the bird that fell ──
    dress('oak-b', this.nestTreeX, 3);
    scenery(this.add.image(this.nestTreeX - 4, this.nestY + 8, 'woods-nest-bough')
      .setOrigin(1, 0.3).setScale(ART).setDepth(3));
    scenery(this.add.image(this.nestX, this.nestY + 12, 'woods-nest')
      .setOrigin(0.5, 1).setScale(ART).setDepth(4));
    this.birdShadow = this.add.ellipse(this.birdX, this.groundY + 2, 30, 6, 0x000000, 0.25).setDepth(5);
    this.birdSprite = this.add.image(this.birdX, this.groundY + 4, 'woods-bird-fallen')
      .setOrigin(0.5, 1).setScale(ART).setDepth(6);

    // the grave mound, hidden until the burial
    this.mound = scenery(this.add.image(this.birdX, this.groundY + 4, 'woods-grave-mound')
      .setOrigin(0.5, 1).setScale(ART).setDepth(6).setVisible(false));
    this.mound.scaleY = 0;
    this.moundFlower = this.add.image(this.birdX, this.groundY - 12, 'woods-daisy-white')
      .setOrigin(0.5, 1).setScale(ART).setDepth(7).setAlpha(0);

    // ── the old fire ring, cold and empty when you arrive: a patch of ash with
    // a few small stones around it. the wood you lay is what makes it a fire ──
    scenery(this.add.image(this.fireX, this.groundY + 6, 'woods-fire-pit')
      .setOrigin(0.5, 1).setScale(ART).setDepth(6));
    this.fireLogs = scenery(this.add.image(this.fireX, this.groundY + 6, 'woods-fire-logs')
      .setOrigin(0.5, 1).setScale(ART).setDepth(7).setVisible(false));
    this.flame = this.add.sprite(this.fireX, this.groundY - 8, 'woods-campfire')
      .setOrigin(0.5, 1).setScale(ART).setDepth(8).setVisible(false);
    this.fireGlow = this.add.circle(this.fireX, this.groundY - 26, 75, 0xffb347, 0).setDepth(5);
    this.fireGlowCore = this.add.circle(this.fireX, this.groundY - 20, 38, 0xffd27a, 0).setDepth(5);
    this.fireLight = this.add.ellipse(this.fireX, this.groundY + 2, 260, 26, 0xffb865, 0).setDepth(4);

    // ── the crying figure, hunched under the tree ──
    // TODO: audio — thin wind and a soft crying loop, very quiet (sound pass)
    this.figureY = this.groundY + 5;      // their sprite's foot line, level with your own feet
    this.figure = this.add.sprite(this.figureHomeX, this.figureY, `${this.companionId}-sit-sheet`, POSE.seated[1])
      .setOrigin(0.5, 1).setScale(FOREST_SCALE).setDepth(9);
    this.poseFigure(...POSE.seated);
    this.breatheFigure(0.97, 340);        // small tremble in the shoulders
    // a tear now and then, until the fire is lit
    this.time.addEvent({ delay: 1900, loop: true, callback: () => {
      if (this.fireBuilt) return;
      const tear = this.add.rectangle(this.figure.x - 6 + Math.random() * 10, this.groundY - this.figureFace, 2, 4, 0x9fc4d8, 0.8).setDepth(10);
      this.tweens.add({ targets: tear, y: tear.y + 22, alpha: 0, duration: 850,
        ease: 'Quad.in', onComplete: () => tear.destroy() });
    } });

    // ── a thin snowfall while the world is cold; it stops as things warm ──
    this.time.addEvent({ delay: 170, loop: true, callback: () => {
      if (this.warmth.t > 0.42 || this.ended) return;
      const fx = this.cameras.main.scrollX + Math.random() * this.W;
      const size = Math.random() < 0.3 ? 4 : 2;
      const flake = this.add.rectangle(fx, -12, size, size, 0xdfe8ee,
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
      const fly = this.add.rectangle(fx, fy, 2, 2, 0xffe58a, 0).setDepth(8);
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
    this.player = this.physics.add.sprite(140, this.groundY - FEET * FOREST_SCALE - 4, `${this.characterId}-idle-sheet`, 39);
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(800);
    this.player.setMaxVelocity(220, 700);
    this.player.setScale(FOREST_SCALE);
    setTravelerBody(this.player);
    this.player.setDepth(10);
    this.physics.add.collider(this.player, this.platforms);

    // the cat from the cliff, if you brought it down — still with you
    this.cat = null;
    if (decodeProgress(this.registry.get('checkpoint')).flags & FLAGS.cat) {
      this.cat = makeCat(this, this.player.x - 60, this.groundY).setDepth(9);
      this.tintScenery.push({ obj: this.cat, cold: 0xb9c4d4, warm: 0xffe2c4 });
    }

    this.physics.world.setBounds(0, 0, worldWidth, height + 400);
    this.cameras.main.setBounds(0, 0, worldWidth, height);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // ── input ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.keyE = this.input.keyboard.addKey('E');
    this.keyEnter = this.input.keyboard.addKey('ENTER');
    const openPause = () => { if (this.ended) return; this.scene.pause(); this.scene.launch('PauseScene', { caller: this.scene.key }); };
    this.input.keyboard.on('keydown-P', openPause);
    this.input.keyboard.on('keydown-ESC', openPause);

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

  // put the companion in a pose — one frame of one of their sheets, on the ground
  poseFigure(sheet, frame, faceHeight) {
    if (this.figureMood) { this.figureMood.stop(); this.figureMood = null; }
    this.figure.anims.stop();
    this.figure.setTexture(`${this.companionId}-${sheet}-sheet`, frame);
    this.figure.setScale(FOREST_SCALE).setAngle(0);
    this.figure.y = this.figureY;
    this.figureFace = faceHeight * FOREST_SCALE;      // how far above the ground their eyes are
  }

  // the rise and fall of their shoulders — quick and small while they cry, slow by the fire
  breatheFigure(amount, duration) {
    if (this.figureMood) this.figureMood.stop();
    this.figure.setScale(FOREST_SCALE);
    this.figureMood = this.tweens.add({ targets: this.figure, scaleY: FOREST_SCALE * amount,
      duration, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  // they get up and walk somewhere
  walkFigure(x, duration, onArrive) {
    this.poseFigure(...POSE.standing);
    this.figure.setFlipX(x < this.figure.x);
    this.figure.play(`${this.companionId}-walk`);
    this.tweens.add({ targets: this.figure, x, duration, ease: 'Sine.inOut', onComplete: onArrive });
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
    this.duskSky.setAlpha(t);
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
    if (!this.ended) tickClock(this);
    // by the fire the cat settles on your free side — the other one is taken
    if (this.cat) updateCatFollow(this, this.cat, this.player, this.groundY, this.sitting ? 1 : 0);
    if (this.canLeave && (Phaser.Input.Keyboard.JustDown(this.keyE) || Phaser.Input.Keyboard.JustDown(this.keyEnter))) this.returnToTitle();

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
        const skyBird = this.add.sprite(px - 720, this.groundY - 520, 'woods-bird')
          .setScale(ART).setDepth(-21).setTint(0x4a3a30).setFlipX(true).play('bird-fly');
        this.tweens.add({ targets: skyBird, x: px + 760, y: this.groundY - 560,
          duration: 8000, ease: 'Sine.inOut', onComplete: () => skyBird.destroy() });
      }
    } else if (this.busy) {
      this.player.setVelocityX(0);
      const tossing = this.player.anims.isPlaying && this.player.anims.currentAnim?.key === `${this.characterId}-toss`;
      if (onGround && !tossing && this.player.anims.currentAnim?.key !== `${this.characterId}-idle`) this.player.play(`${this.characterId}-idle`);
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
        this.walkFigure(this.birdX + 36, 1700, () => {
          this.poseFigure(...POSE.standing);
          this.figure.setFlipX(true);                 // standing over the bird, facing it
          this.buryOffered = true;
          this.busy = false;
        });
      });
      return;
    }
    if (action === 'toss') {
      // one press, one pair of handfuls — yours first, then theirs
      this.busy = true;
      this.player.setVelocity(0, 0);
      this.player.setFlipX(this.birdX < this.player.x);
      this.buryTosses++;
      // each of you crouches for a handful of earth and throws it in
      const toss = (fromPlayer) => {
        const digger = fromPlayer ? this.player : this.figure;
        const id = fromPlayer ? this.characterId : this.companionId;
        const side = digger.x < this.birdX ? 1 : -1;
        digger.play(`${id}-toss`);
        this.time.delayedCall(430, () => {
          for (let i = 0; i < 4; i++) {
            const crumb = this.add.rectangle(digger.x + side * 22, this.groundY - 40 + i * 2, i % 2 ? 2 : 4, i % 2 ? 2 : 4, i % 2 ? 0x6e6052 : 0x5d5044).setDepth(12);
            this.tweens.add({ targets: crumb, x: this.birdX + (Math.random() - 0.5) * 18, duration: 380 + i * 40 });
            this.tweens.add({ targets: crumb, y: this.groundY - 2, duration: 380 + i * 40, ease: 'Quad.in',
              onComplete: () => crumb.destroy() });
          }
        });
      };
      toss(true);
      this.time.delayedCall(650, () => toss(false));
      if (this.buryTosses < 3) {
        this.time.delayedCall(1450, () => { this.busy = false; });
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
      this.walkFigure(this.figureFireX, 2200, () => {
        this.poseFigure(...POSE.seated);              // down on the ground by the fire
        this.figure.setFlipX(false);
        // they add a branch of their own, and the spark takes
        const stick = this.add.image(this.figure.x - 14, this.groundY - 24, 'woods-stick')
          .setOrigin(0.5).setScale(ART).setDepth(8);
        this.tweens.add({ targets: stick, x: this.fireX, y: this.groundY - 10, angle: 40,
          duration: 500, ease: 'Quad.in',
          onComplete: () => { stick.destroy(); this.kindleFire(); } });
      });
      return;
    }
    if (action === 'sit') {
      this.sitting = true;
      this.sitTimer = 0;
      this.player.setVelocity(0, 0);
      this.player.body.setAllowGravity(false);
      this.player.setPosition(this.seatX, this.groundY + 1 - FEET * FOREST_SCALE);
      this.player.setFlipX(false);   // both of you on the ground, facing out of the screen
      this.player.anims.stop();
      this.player.setTexture(`${this.characterId}-sit-sheet`, POSE.seated[1]);
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
    this.tweens.add({ targets: this.mound, scaleY: ART, duration: 2000, delay: 800, ease: 'Sine.out' });
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
      this.walkFigure(this.figureHomeX - 10, 1500, () => {
        this.poseFigure(...POSE.seated);
        this.figure.setFlipX(false);
        this.breatheFigure(0.98, 700);
        this.busy = false;
      });
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
    this.tweens.add({ targets: this.figure, y: this.figureY + 3, duration: 500,
      yoyo: true, delay: 800, ease: 'Sine.inOut' });
    this.time.delayedCall(1800, () => { this.busy = false; });
    this.time.delayedCall(2600, () => this.showThought('time to go home.', 3200));
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
    this.flame.setVisible(true).setScale(ART, ART * 0.3).play('campfire-burn');
    this.tweens.add({ targets: this.flame, scaleY: ART, duration: 1200, ease: 'Sine.out' });
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
      const ember = this.add.rectangle(this.fireX + (Math.random() - 0.5) * 16, this.groundY - 26, 2, 2, 0xffc27a, 0.8).setDepth(8);
      this.tweens.add({ targets: ember, y: ember.y - 50 - Math.random() * 30, x: ember.x + (Math.random() - 0.5) * 24,
        alpha: 0, duration: 1600, ease: 'Sine.out', onComplete: () => ember.destroy() });
      if (++puffCount % 3 === 0) {
        const puff = this.add.image(this.fireX, this.groundY - 48, 'home-puff').setScale(ART).setAlpha(0.4).setDepth(8);
        this.tweens.add({ targets: puff, y: puff.y - 90, scale: ART * 2.2, alpha: 0,
          duration: 2500, ease: 'Sine.out', onComplete: () => puff.destroy() });
      }
    } });
    // settled by the fire now — slow breathing instead of the tremble
    this.breatheFigure(1.025, 1600);
    this.warmTo(0.6, 10000);
    this.fireBuilt = true;
    this.busy = false;
  }

  finishGame() {
    this.ended = true;
    this.finalKindness = this.registry.get('kindness') || 0;
    this.finalTime = formatTime(clock.seconds);
    this.submitKindnessScore();
    const sessionId = this.registry.get('sessionId');
    if (sessionId) game.completeSession(sessionId).catch((err) => console.warn('could not complete session:', err.message));
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
        // the title rests a moment, then lifts to make room for the credits
        this.time.delayedCall(3200, () => {
          this.tweens.add({ targets: title, y: 110, duration: 1400, ease: 'Sine.inOut',
            onComplete: () => this.showCredits() });
        });
      } });
  }

  showCredits() {
    const text = (y, str, size, color, italic = false) => {
      const t = this.add.text(this.W / 2, y, str, {
        fontFamily: italic ? 'Georgia, serif' : 'Helvetica Neue, sans-serif', fontSize: size, color,
        fontStyle: italic ? 'italic' : 'normal', align: 'center', lineSpacing: 5,
        wordWrap: { width: this.W - 320 }
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(260).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 1200 });
      return t;
    };

    const [, minutes, seconds] = this.finalTime.split(':');
    const hours = Number(this.finalTime.split(':')[0]);
    const time = `${hours * 60 + Number(minutes)}:${seconds}`;
    text(160, `kindness ${this.finalKindness}   ·   ${time}`, '15px', '#9fb0b6');

    let y = 215;
    CREDITS.forEach((block) => {
      const heading = text(y, block.heading, '16px', '#ece8dc', true);
      y += heading.height + 6;
      const body = text(y, block.lines.join('\n'), '12px', '#8a9aa0');
      y += body.height + 22;
    });

    this.time.delayedCall(2500, () => {
      const hint = text(this.H - 60, '▸ e  back to the title', '14px', '#ece8dc');
      hint.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.returnToTitle());
      this.canLeave = true;
    });
  }

  returnToTitle() {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('SessionSelectScene'));
  }

  submitKindnessScore() {
    const kindness = this.registry.get('kindness') || 0;
    leaderboard.submitScore({
      characterType: CHARACTER_TYPE[this.characterId] || 'female',
      season: 'summer',
      score: kindness,
      completionTime: this.finalTime
    }).then(() => {
      console.log('kindness score submitted:', kindness);
    }).catch((err) => {
      console.error('could not submit kindness score:', err.message);
    });
  }
}
