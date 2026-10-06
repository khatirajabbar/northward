import Phaser from 'phaser';
import { game } from '../services/game.js';
import { tickClock } from '../services/progress.js';
import { CABIN_SCALE, FEET } from '../characters/lpc.js';

// Beat 1 — the morning. A small log cabin in its clearing at dawn, seen as a
// cutaway: the whole house with the front wall taken off. Walk with arrows,
// press E at a station. Make coffee and sit a while, make breakfast (cereal +
// milk from the fridge), then head out the door. Nature wakes you; the
// curtains warm the room. The bird at the window is planted here and pays off
// in the ending.
//
// The art is drawn small by tools/cabin-art.mjs and shown at 2.5x, so the house
// is a little wider than the screen and the camera follows you along it.
// Positions below are in art pixels and mirror that script — if a piece of
// furniture moves there, move it here too.
const ART = 2.5;
const WORLD_W = 640 * ART;       // the whole painted scene
const VIEW_Y = 137;              // the camera's fixed height: roof to just under the grass

const ROOM = {
  left: 106, right: 532,         // inner faces of the side walls
  wallLeft: 100, wallRight: 538,
  ceiling: 204,
  floorFront: 315,               // bottom of the floor boards' front edge
  feet: 310                      // the line the traveler walks on
};

const AT = {
  quilt: [127, 290], quiltLump: [127, 278],
  windowFront: [240, 242],
  curtainShutL: [242, 238], curtainShutR: [263, 238],
  curtainOpenL: [238, 238], curtainOpenR: [279, 238],
  bird: [268, 263], sunlight: [230, 241],
  sofa: [293, 286], mug: [355, 286],
  glowLantern: [281, 204], glowStove: [367, 266], glowPorch: [538, 187],
  steam: [381, 263], bowl: [434, 281],
  fridge: [473, 258], fridgePlant: [478, 250],
  bag: [510, 267], doorShut: [533, 257], doorOpen: [538, 257],
  chimney: [391, 106], head: [121.1, 283.4], mirror: [214, 258]
};

// where you stand to use each thing (art x)
const STATION = { teeth: 214, curtains: 264, sofa: 323, coffee: 391, cereal: 440, fridge: 486, door: 525 };

export default class MorningScene extends Phaser.Scene {
  constructor() {
    super('MorningScene');
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;
    this.characterId = this.registry.get('playAs') || 'lpc-khatira';
    this.feetY = ROOM.feet * ART;

    this.cameras.main.setBackgroundColor('#1b2c47');

    this.buildHouse();
    this.buildLight();
    this.buildPlayer();
    this.buildUI();

    // the camera slides along the house with you; its height never changes
    this.cameras.main.setBounds(0, VIEW_Y, WORLD_W, this.H);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.keyE = this.input.keyboard.addKey('E');
    this.keyE.on('down', () => this.tryInteract());
    const openPause = () => { this.scene.pause(); this.scene.launch('PauseScene', { caller: this.scene.key }); };
    this.input.keyboard.on('keydown-P', openPause);
    this.input.keyboard.on('keydown-ESC', openPause);

    this.done = { curtains: false, teeth: false, coffee: false, cereal: false, milk: false };
    this.inventory = {};
    this.busy = false;
    this.sitting = false;

    this.startAsleep();
  }

  // one piece of cabin art, placed by its top-left corner in art pixels
  art(key, [ax, ay], depth) {
    return this.add.image(ax * ART, ay * ART, `home-${key}`).setOrigin(0, 0).setScale(ART).setDepth(depth);
  }

  buildHouse() {
    // the far distance drifts by more slowly than the clearing in front of it
    this.add.image(0, 0, 'home-backdrop').setOrigin(0, 0).setScale(ART).setDepth(-1).setScrollFactor(0.35, 1);
    this.add.image(0, 0, 'home-scene').setOrigin(0, 0).setScale(ART).setDepth(0);

    this.stations = [
      { name: 'teeth', x: STATION.teeth * ART, label: 'brush your teeth' },
      { name: 'curtains', x: STATION.curtains * ART, label: 'open the curtains' },
      { name: 'coffee', x: STATION.coffee * ART, label: 'start the coffee' },
      { name: 'cereal', x: STATION.cereal * ART, label: 'make some cereal' },
      { name: 'fridge', x: STATION.fridge * ART, label: 'get the milk' },
      { name: 'leave', x: STATION.door * ART, label: 'head out north' }
    ];

    // ── the bed's quilt: flat once you're up, humped over you while you sleep ──
    this.quilt = this.art('quilt', AT.quilt, 2).setVisible(false);

    // ── the window: the bird on its bough outside, the frame and glass in
    // front of it, then the curtains over everything ──
    this.bird = this.art('bird', AT.bird, 3);
    this.art('window-front', AT.windowFront, 3.5);
    this.curtainL = this.art('curtain-shut', AT.curtainShutL, 4);
    this.curtainR = this.art('curtain-shut', AT.curtainShutR, 4).setFlipX(true);

    // ── living corner ──
    this.art('sofa', AT.sofa, 2);
    this.mug = this.art('mug', AT.mug, 3).setVisible(false);

    // ── kitchen ──
    this.bowl = this.art('bowl', AT.bowl, 3);
    this.fridge = this.art('fridge', AT.fridge, 2);
    this.art('fridge-plant', AT.fridgePlant, 3);

    // ── by the door: the bag on its hook, the door itself ──
    this.bag = this.art('bag', AT.bag, 3);
    this.doorShut = this.art('door-shut', AT.doorShut, 3);
    this.doorOpen = this.art('door-open', AT.doorOpen, 3).setVisible(false);

    // ── smoke from the chimney, always ──
    this.time.addEvent({ delay: 900, loop: true, callback: () => this.smoke() });
    this.smoke();
  }

  buildLight() {
    // the room is still dark; this lifts as you wake and as the curtains open.
    // it covers the inside of the house only — outside it's already morning
    const x = ROOM.wallLeft * ART, y = ROOM.ceiling * ART;
    this.roomDim = this.add.rectangle(x, y, (ROOM.wallRight - ROOM.wallLeft) * ART, (ROOM.floorFront - ROOM.ceiling) * ART, 0x0a0d14)
      .setOrigin(0, 0).setDepth(40).setAlpha(0.56);
    // the last of the night over everything, fading out with the dawn
    this.dawn = this.add.rectangle(0, 0, this.W, this.H, 0x101c34).setOrigin(0, 0).setScrollFactor(0).setDepth(41).setAlpha(0.42);

    // sunlight through the window, once the curtains are open
    this.sunlight = this.art('sunlight', AT.sunlight, 5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);

    // warm light that shows through the dark: lantern, stove, porch lamp
    const glow = (at, alpha, low, ms) => {
      const g = this.art('glow', at, 42).setBlendMode(Phaser.BlendModes.ADD).setAlpha(alpha);
      this.tweens.add({ targets: g, alpha: low, duration: ms, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      return g;
    };
    glow(AT.glowLantern, 0.5, 0.4, 1900);
    glow(AT.glowStove, 0.42, 0.26, 620);
    glow(AT.glowPorch, 0.34, 0.26, 2300);
  }

  buildPlayer() {
    // physics player — arcade body + global gravity.
    // body size/offset are frame pixels (arcade scales them with the sprite),
    // and both body bottom and visual feet sit at frame y=60 — contact holds at any scale
    this.standY = this.feetY - FEET * CABIN_SCALE - 2;
    this.player = this.physics.add.sprite(190 * ART, this.standY, `${this.characterId}-idle-sheet`, 39).setScale(CABIN_SCALE).setDepth(10);
    this.player.setSize(20, 34);
    this.player.setOffset(22, 26);
    this.player.setVisible(false);
    this.player.body.setAllowGravity(false); // asleep: stay put until we wake
    this.playerSpeed = 240;   // walk speed (px/sec)
    this.jumpSpeed = -400;
    this.canMove = false;

    // the walls and the ceiling keep you in the room; the floor holds you up
    this.physics.world.setBounds(ROOM.left * ART, ROOM.ceiling * ART + 30, (ROOM.right - ROOM.left) * ART, 400);
    this.player.setCollideWorldBounds(true);
    const ground = this.add.rectangle(WORLD_W / 2, this.feetY + 10, WORLD_W + 400, 20).setVisible(false);
    this.physics.add.existing(ground, true);
    this.physics.add.collider(this.player, ground);
  }

  buildUI() {
    const { W } = this;
    this.thought = this.add.text(W / 2, 92, '', {
      fontFamily: 'Georgia, serif', fontSize: '20px', color: '#ece8dc',
      fontStyle: 'italic', align: 'center',
      wordWrap: { width: W - 220 }, stroke: '#12161a', strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
    this.prompt = this.add.text(0, 0, '', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '14px', color: '#f4ead6',
      backgroundColor: '#00000088', padding: { x: 8, y: 4 }
    }).setOrigin(0.5, 1).setDepth(60).setVisible(false);
  }

  startAsleep() {
    // asleep in the bed, on one side, facing the room: the traveler's own head
    // (eyes closed) lying on the pillow, and the quilt — humped up over
    // shoulders and feet — pulled up to the chin
    const who = this.characterId.replace('lpc-', '');
    this.sleeper = this.add.image(AT.head[0] * ART, AT.head[1] * ART, `home-sleeper-${who}`)
      .setScale(CABIN_SCALE).setAngle(-90).setDepth(10);
    this.quiltLump = this.art('quilt-lump', AT.quiltLump, 11);
    // slow breathing
    this.tweens.add({ targets: this.quiltLump, scaleY: ART * 1.03, y: this.quiltLump.y - 2, duration: 1700,
      yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.snore = this.time.addEvent({ delay: 1300, loop: true, callback: () => {
      this.floatUp('zzz', AT.head[0] * ART + 4, AT.head[1] * ART - 34, { rise: 36, drift: 18, ms: 1900 });
    } });

    this.time.delayedCall(900, () => this.chirp());
    this.time.delayedCall(2000, () => this.chirp());
    this.time.delayedCall(3400, () => this.chirp());
    this.tweens.add({ targets: this.roomDim, alpha: 0.4, duration: 5000, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.dawn, alpha: 0.14, duration: 7000, ease: 'Sine.inOut' });
    this.time.delayedCall(5000, () => {
      this.thought.setText('morning already. a bird singing somewhere outside.');
      // rise: leave the bed and stand up beside it
      this.snore.remove();
      this.quiltLump.destroy();
      this.sleeper.destroy();
      this.quilt.setVisible(true);
      this.player.setPosition(190 * ART, this.standY);
      this.player.body.setAllowGravity(true);
      this.player.setAlpha(0).setVisible(true);
      this.player.play(`${this.characterId}-idle`);
      this.tweens.add({
        targets: this.player, alpha: 1, duration: 700, ease: 'Sine.inOut',
        onComplete: () => { this.canMove = true; this.thoughtIdle(); }
      });
    });
  }

  thoughtIdle() {
    this.time.delayedCall(2000, () => {
      if (!this.busy && this.canMove) this.thought.setText('a quiet morning. i should get ready before i head north.');
    });
  }

  nearestStation() {
    if (!this.canMove) return null;
    let best = null, bestD = 75;
    for (const s of this.stations) {
      const d = Math.abs(this.player.x - s.x);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  tryInteract() {
    if (this.sitting) return this.standUp();
    if (this.busy || !this.canMove) return;
    const s = this.nearestStation();
    if (!s) return;
    switch (s.name) {
      case 'curtains': return this.doCurtains();
      case 'teeth': return this.doTeeth();
      case 'coffee': return this.doCoffee();
      case 'drink': return this.sitWithCoffee();
      case 'cereal': return this.doCereal();
      case 'fridge': return this.doFridge();
      case 'leave': return this.doLeave();
    }
  }

  // a station you're finished with stops offering itself
  retire(name) { this.stations = this.stations.filter((s) => s.name !== name); }
  relabel(name, label) { const s = this.stations.find((st) => st.name === name); if (s) s.label = label; }

  setBusy(ms, cb) {
    this.busy = true;
    this.time.delayedCall(ms, () => { this.busy = false; if (cb) cb(); });
  }

  doCurtains() {
    if (this.done.curtains) { this.thought.setText('the morning light is nice. and the little bird is still there.'); return; }
    this.done.curtains = true;
    this.relabel('curtains', 'look out the window');
    this.thought.setText('there. let the morning in.');
    // each half slides to its own side of the rod, then hangs gathered there
    const rightEdge = (AT.curtainShutR[0] + 23) * ART;
    this.curtainR.setOrigin(1, 0).setX(rightEdge);
    this.tweens.add({ targets: [this.curtainL, this.curtainR], scaleX: ART * 0.45, duration: 650, ease: 'Sine.inOut',
      onComplete: () => {
        this.curtainL.setTexture('home-curtain-open').setScale(ART).setPosition(AT.curtainOpenL[0] * ART, AT.curtainOpenL[1] * ART);
        this.curtainR.setTexture('home-curtain-open').setScale(ART).setOrigin(0, 0)
          .setPosition(AT.curtainOpenR[0] * ART, AT.curtainOpenR[1] * ART);
      } });
    this.tweens.add({ targets: this.roomDim, alpha: 0.04, duration: 1300, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.sunlight, alpha: 1, duration: 1300, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.dawn, alpha: 0, duration: 2600, ease: 'Sine.inOut' });
    this.time.addEvent({ delay: 700, loop: true, callback: () => this.mote() });
    // and there's the singer, on the sill
    this.time.delayedCall(1500, () => this.chirp());
    this.time.addEvent({ delay: 4200, loop: true, callback: () => this.birdHop() });
  }

  birdHop() {
    this.bird.setFlipX(Math.random() < 0.4 ? !this.bird.flipX : this.bird.flipX);
    this.tweens.add({ targets: this.bird, y: this.bird.y - 4, duration: 110, yoyo: true, repeat: 1 });
    if (Math.random() < 0.6) this.chirp();
  }

  doTeeth() {
    this.thought.setText('brushing… (a fresh start).');
    this.setBusy(1800, () => {
      this.done.teeth = true;
      this.retire('teeth');
      this.thought.setText('minty. good.');
      this.floatUp('sparkle', AT.mirror[0] * ART - 8, AT.mirror[1] * ART - 6, { rise: 10, ms: 700 });
      this.time.delayedCall(180, () => this.floatUp('sparkle', AT.mirror[0] * ART + 12, AT.mirror[1] * ART + 8, { rise: 10, ms: 700 }));
    });
  }

  doCoffee() {
    this.thought.setText('coffee brewing…');
    const brewing = this.time.addEvent({ delay: 380, loop: true, callback: () => this.steam(AT.steam[0] * ART, AT.steam[1] * ART) });
    this.setBusy(2600, () => {
      brewing.remove();
      this.done.coffee = true;
      this.retire('coffee');
      this.stations.push({ name: 'drink', x: STATION.sofa * ART, label: 'sit and drink your coffee' });
      this.thought.setText('a hot cup. i should sit and drink it.');
    });
  }

  sitWithCoffee() {
    this.canMove = false; this.busy = true; this.prompt.setVisible(false);
    this.cameras.main.fadeOut(600, 21, 17, 12);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // on the sofa, facing the room: hips on the seat cushion, feet on the rug
      this.player.setPosition(STATION.sofa * ART, (ROOM.feet - 1) * ART - 29 * CABIN_SCALE);
      this.player.body.setAllowGravity(false);
      this.player.setVelocity(0, 0);
      this.player.setFlipX(false);
      this.player.anims.stop();
      this.player.setTexture(`${this.characterId}-sit-sheet`, 28);
      this.mug.setVisible(true);
      this.cameras.main.fadeIn(700, 21, 17, 12);
      this.cameras.main.once('camerafadeincomplete', () => {
        this.sitting = true; this.busy = false;
        this.thought.setText('a few quiet minutes before the forest.');
        this.prompt.setText('▸ e  get up');
        this.prompt.setPosition(this.player.x, this.player.y - 56).setVisible(true);
        this.sipTimer = this.time.addEvent({ delay: 1100, loop: true,
          callback: () => this.steam(AT.mug[0] * ART + 6, AT.mug[1] * ART - 2) });
      });
    });
  }

  standUp() {
    this.sitting = false;
    this.stations = this.stations.filter((s) => s.name !== 'drink');
    if (this.sipTimer) this.sipTimer.remove();
    this.prompt.setVisible(false);
    this.thought.setText('alright. onward.');
    this.player.setPosition(STATION.sofa * ART, this.standY);
    this.player.body.setAllowGravity(true);
    this.player.play(`${this.characterId}-idle`);
    this.canMove = true;
  }

  doCereal() {
    if (this.done.cereal && this.done.milk) { this.thought.setText("breakfast's ready. good."); return; }
    if (this.done.cereal) { this.thought.setText("cereal's in the bowl. just the milk now — from the fridge."); return; }
    this.done.cereal = true;
    this.relabel('cereal', 'look at breakfast');
    this.bowl.setTexture('home-bowl-cereal');
    this.thought.setText('cereal in the bowl. now the milk from the fridge.');
  }

  doFridge() {
    if (this.done.milk) { this.thought.setText("breakfast's ready. good."); return; }
    if (!this.done.cereal) { this.thought.setText('cereal in the bowl first, then the milk.'); this.openFridgeBriefly(); return; }
    this.openFridgeBriefly();
    this.thought.setText('milk in the bowl… there. breakfast.');
    this.done.milk = true;
    this.time.delayedCall(700, () => this.bowl.setTexture('home-bowl-milk'));
    this.time.delayedCall(1200, () => { this.retire('fridge'); this.retire('cereal'); });
  }

  openFridgeBriefly() {
    this.fridge.setTexture('home-fridge-open');
    this.time.delayedCall(1100, () => this.fridge.setTexture('home-fridge'));
  }

  doLeave() {
    const ready = this.done.teeth && this.done.coffee && this.done.cereal && this.done.milk;
    if (!ready) {
      const left = [];
      if (!this.done.teeth) left.push('brush my teeth');
      if (!this.done.coffee) left.push('have my coffee');
      if (!this.done.cereal || !this.done.milk) left.push('finish breakfast');
      this.thought.setText('not yet — i should ' + left.join(', ') + ' first.');
      return;
    }
    this.canMove = false; this.busy = true;
    this.inventory = { bread: 1, water: 1, rope: 1 };   // the bag on its hook, packed last night
    this.thought.setText('bag on my shoulder — bread, water, rope. time to go north.');
    this.prompt.setVisible(false);
    // hand control to the tweens: stop physics fighting the walk out
    this.player.body.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);
    this.player.body.enable = false;
    this.player.setFlipX(false);
    // take the bag down, open the door
    this.tweens.add({ targets: this.bag, alpha: 0, y: this.bag.y + 6, duration: 350 });
    this.time.delayedCall(450, () => {
      this.doorShut.setVisible(false);
      this.doorOpen.setVisible(true);
      this.player.play(`${this.characterId}-walk`);
      // across the porch, down the two steps, and away up the path
      const walk = (x, dy, ms, next) => this.tweens.add({ targets: this.player, x: x * ART, y: this.player.y + dy, duration: ms, onComplete: next });
      walk(594, 0, 1150, () => {
        walk(616, 8 * ART, 420, () => walk(690, 0, 1100));
        this.cameras.main.fadeOut(1300, 21, 17, 12);
        this.registry.set('inventory', this.inventory);
        const sessionId = this.registry.get('sessionId');
        if (sessionId) game.updateProgress(sessionId, 'ForestScene', 0).catch((err) => console.warn('could not save progress:', err.message));
        this.time.delayedCall(1400, () => this.scene.start('ForestScene'));
      });
    });
  }

  // ── small effects: each is a tiny sprite drifting up and fading ──

  floatUp(key, x, y, { rise = 28, drift = 0, ms = 1100, depth = 45, alpha = 1 } = {}) {
    const s = this.add.image(x, y, `home-${key}`).setScale(ART).setDepth(depth).setAlpha(alpha);
    this.tweens.add({ targets: s, y: y - rise, x: x + drift, alpha: 0, duration: ms, onComplete: () => s.destroy() });
    return s;
  }

  // the bird's song — from behind the curtains at first, then from the bird itself
  chirp() {
    const x = AT.bird[0] * ART + 8, y = AT.bird[1] * ART - 6;
    this.floatUp('note', x, y, { rise: 30, drift: -8 });
    this.time.delayedCall(180, () => this.floatUp('note', x + 12, y + 4, { rise: 30, drift: 6 }));
  }

  steam(x, y) {
    this.floatUp('steam', x + Phaser.Math.Between(-3, 3), y, { rise: 26, drift: Phaser.Math.Between(-4, 4), ms: 1500, alpha: 0.8 });
  }

  // dust drifting through the sunbeam
  mote() {
    const x = (AT.sunlight[0] + Phaser.Math.Between(16, 50)) * ART, y = (AT.sunlight[1] + Phaser.Math.Between(10, 56)) * ART;
    const m = this.add.rectangle(x, y, 3, 3, 0xfff3cf).setDepth(6).setAlpha(0);
    this.tweens.add({ targets: m, alpha: 0.75, duration: 900, yoyo: true });
    this.tweens.add({ targets: m, x: x - Phaser.Math.Between(6, 18), y: y + Phaser.Math.Between(8, 20), duration: 1800,
      onComplete: () => m.destroy() });
  }

  smoke() {
    const x = AT.chimney[0] * ART + Phaser.Math.Between(-4, 4), y = AT.chimney[1] * ART;
    const puff = this.add.image(x, y, 'home-puff').setScale(ART).setDepth(1).setAlpha(0.75);
    this.tweens.add({ targets: puff, y: y - Phaser.Math.Between(70, 100), x: x + Phaser.Math.Between(24, 52),
      scale: ART * 2.5, alpha: 0, duration: 4200, ease: 'Sine.out', onComplete: () => puff.destroy() });
  }

  update() {
    tickClock(this);
    if (!this.canMove || this.busy) {
      if (this.player && this.player.body) this.player.setVelocityX(0);
      if (this.busy) this.prompt.setVisible(false);     // nothing to press while something's happening
      return;
    }
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const jump = this.cursors.up.isDown || this.wasd.W.isDown || this.cursors.space.isDown;
    const onGround = this.player.body.blocked.down;

    if (left) { this.player.setVelocityX(-this.playerSpeed); this.player.setFlipX(true); }
    else if (right) { this.player.setVelocityX(this.playerSpeed); this.player.setFlipX(false); }
    else { this.player.setVelocityX(0); }

    if (jump && onGround) this.player.setVelocityY(this.jumpSpeed);

    const moving = left || right;
    if (moving && onGround) {
      if (this.player.anims.currentAnim?.key !== `${this.characterId}-walk` || !this.player.anims.isPlaying) this.player.play(`${this.characterId}-walk`);
    } else if (onGround) {
      if (this.player.anims.currentAnim?.key !== `${this.characterId}-idle` || !this.player.anims.isPlaying) this.player.play(`${this.characterId}-idle`);
    }

    const s = this.nearestStation();
    if (s) {
      this.prompt.setText('▸ e  ' + s.label);
      this.prompt.setPosition(this.player.x, this.player.y - 56).setVisible(true);
    } else {
      this.prompt.setVisible(false);
    }
  }
}
