import Phaser from 'phaser';
import { game } from '../services/game.js';
import { tickClock, withCurrentTime } from '../services/progress.js';
import { CABIN_SCALE, FEET } from '../characters/lpc.js';
import Guide from '../ui/guide.js';
import { play, bed, fade, steps } from '../audio/sound.js';

// Beat 1 — the morning. A small log cabin in its clearing at dawn, seen as a
// cutaway: the whole house with the front wall taken off. You wake to a note
// with the day's plan and work through it in order — curtains, teeth, coffee,
// cereal, then breakfast and the coffee together on the sofa — and head out
// the door. It's also
// where the game teaches itself: E to do things, arrows to walk, and a marker
// over whatever comes next. The bird at the window is planted here and pays
// off in the ending.
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
  glowLantern: [281, 204], glowStove: [367, 271], glowPorch: [538, 187],
  steam: [381, 272], bowl: [434, 281],
  fridge: [473, 258], fridgePlant: [478, 250],
  bag: [510, 267], doorShut: [533, 257], doorOpen: [538, 257],
  chimney: [391, 106], head: [121.1, 283.4], mirror: [214, 258]
};

// where you stand to use each thing (art x)
const STATION = { teeth: 214, curtains: 264, sofa: 323, coffee: 391, cereal: 440, fridge: 486, door: 525 };
// how high the marker hangs over each of them (art y)
const MARK = { teeth: 250, curtains: 234, drink: 276, coffee: 268, cereal: 272, fridge: 250, leave: 250 };

// the morning, in order: what the tag says, and the station that does it
const TODAY = [
  { id: 'curtains', text: 'open the curtains', station: 'curtains' },
  { id: 'teeth', text: 'brush your teeth', station: 'teeth' },
  { id: 'coffee', text: 'put the coffee on', station: 'coffee' },
  { id: 'cereal', text: 'pour some cereal', station: 'cereal' },
  { id: 'milk', text: 'get the milk from the fridge', station: 'fridge' },
  { id: 'breakfast', text: 'sit down and have breakfast', station: 'drink' },
  { id: 'leave', text: 'take your bag and head north', station: 'leave' }
];
// the same plan as you wrote it on the note by the bed
const NOTE = {
  title: 'today',
  lines: ['open the curtains', 'brush my teeth', 'coffee and breakfast', 'sit a while', 'take the bag, go north'],
  sign: 'no hurry.',
  keys: [[['left', 'right'], 'walk'], [['up'], 'jump'], [['e'], 'use']]
};

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
    // development only: number keys that skip the morning, out to a place on the road (dev/shortcuts.js)
    if (import.meta.env.DEV) import('../dev/shortcuts.js').then((dev) => { if (this.scene.isActive()) dev.morningShortcuts(this); });

    this.done = { curtains: false, teeth: false, coffee: false, cereal: false, milk: false };
    this.inventory = {};
    this.busy = false;
    this.sitting = false;
    this.asleep = true;
    this.walked = false;       // until you've taken a step, the arrow keys are shown

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
    this.guide = new Guide(this);
    // the birds outside the walls, the stove ticking over, the tune from the title going on quietly
    bed(this, { 'amb-morning': 0.6, fire: 0.25, 'music-title': 0.5 });
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
    // the first thing the game asks of you is the key you'll use for everything
    this.time.delayedCall(1800, () => {
      if (this.asleep) this.guide.prompt(['e'], 'wake up', AT.head[0] * ART + 44, AT.head[1] * ART - 70);
    });
    this.time.delayedCall(14000, () => this.wakeUp());      // …or sleep in, and wake on your own
  }

  wakeUp() {
    if (!this.asleep) return;
    this.asleep = false;
    this.guide.hidePrompt();
    // the reason for the whole walk, said before anything else
    this.guide.say("that bird again. every morning it sings at my window, and then it flies north. today i'm going to see where it goes.", 6000);
    // rise: leave the bed and stand up beside it
    this.snore.remove();
    this.quiltLump.destroy();
    this.sleeper.destroy();
    this.quilt.setVisible(true);
    this.player.setPosition(190 * ART, this.standY);
    this.player.body.setAllowGravity(true);
    this.player.setAlpha(0).setVisible(true);
    this.player.play(`${this.characterId}-idle`);
    this.tweens.add({ targets: this.player, alpha: 1, duration: 700, ease: 'Sine.inOut' });
    // then the note you left yourself last night — the plan for the morning.
    // (E brings it up sooner, for anyone who doesn't want to wait)
    this.noteTimer = this.time.delayedCall(6500, () => this.openNote());
  }

  openNote() {
    if (!this.noteTimer) return;
    this.noteTimer.remove();
    this.noteTimer = null;
    this.guide.showNote(NOTE, () => {
      this.canMove = true;
      this.guide.setTasks(TODAY.map((t) => ({ ...t, where: () => this.markSpot(t.station) })));
      this.thoughtIdle();
    });
  }

  // where the marker should hang for a station — nowhere while you're busy with something
  markSpot(name) {
    if (!this.canMove || this.busy) return null;
    const s = this.stations.find((st) => st.name === name);
    return s ? [s.x, MARK[name] * ART] : null;
  }

  thoughtIdle() {
    this.time.delayedCall(2000, () => {
      if (!this.busy && this.canMove) this.guide.say('a quiet morning. i should get ready before i head north.');
    });
  }

  nearestStation() {
    if (!this.canMove) return null;
    const task = this.guide.task;
    let best = null, bestD = 75;
    for (const s of this.stations) {
      if (!s.extra && !(task && task.station === s.name)) continue;
      const d = Math.abs(this.player.x - s.x);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  tryInteract() {
    if (this.guide.blocking) return;
    if (this.asleep) return this.wakeUp();
    if (this.noteTimer) return this.openNote();
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

  // step in front of something on the back wall and turn to it — we see your back
  turnTo(stationX) {
    this.player.setVelocity(0, 0);
    this.player.setFlipX(false);
    this.tweens.add({ targets: this.player, x: stationX * ART, duration: 160 });
    this.player.anims.stop();
    this.player.setTexture(`${this.characterId}-idle-sheet`, 0);
  }

  // a station you're finished with stops offering itself
  retire(name) { this.stations = this.stations.filter((s) => s.name !== name); }
  // a finished station that still has something to say stays, as an extra
  relabel(name, label) { const s = this.stations.find((st) => st.name === name); if (s) { s.label = label; s.extra = true; } }

  setBusy(ms, cb) {
    this.busy = true;
    this.time.delayedCall(ms, () => { this.busy = false; if (cb) cb(); });
  }

  doCurtains() {
    if (this.done.curtains) {
      // already open — stand at the glass a moment and look out
      this.turnTo(STATION.curtains);
      this.guide.say('the morning light is nice. and the little bird is still there.');
      this.time.delayedCall(700, () => this.birdHop());
      this.setBusy(2600);
      return;
    }
    this.done.curtains = true;
    play(this, 'curtains');
    this.guide.complete('curtains');
    this.relabel('curtains', 'look out the window');
    this.guide.say('there. let the morning in.');
    // at the window, arms out: one half of the curtain in each hand
    this.turnTo(STATION.curtains);
    this.player.play(`${this.characterId}-part-curtains`);
    this.setBusy(2300);
    this.time.delayedCall(1050, () => { this.player.anims.stop(); this.player.setTexture(`${this.characterId}-idle-sheet`, 0); });
    this.time.delayedCall(330, () => {
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
    });
    // and there's the singer, on the sill
    this.time.delayedCall(1800, () => this.chirp());
    this.time.addEvent({ delay: 4200, loop: true, callback: () => this.birdHop() });
  }

  birdHop() {
    this.bird.setFlipX(Math.random() < 0.4 ? !this.bird.flipX : this.bird.flipX);
    this.tweens.add({ targets: this.bird, y: this.bird.y - 4, duration: 110, yoyo: true, repeat: 1 });
    if (Math.random() < 0.6) this.chirp();
  }

  doTeeth() {
    this.guide.say('brushing… (a fresh start).');
    // at the mirror, elbow going, a little foam
    this.turnTo(STATION.teeth);
    this.player.play(`${this.characterId}-brush`);
    play(this, 'brush');
    const foam = this.time.addEvent({ delay: 240, loop: true, callback: () => {
      const dot = this.add.rectangle(this.player.x + Phaser.Math.Between(-10, 12), this.player.y - Phaser.Math.Between(8, 20), 3, 3, 0xf4fbff)
        .setDepth(11);
      this.tweens.add({ targets: dot, y: dot.y - Phaser.Math.Between(8, 16), alpha: 0, duration: 520, onComplete: () => dot.destroy() });
    } });
    this.setBusy(2300, () => {
      foam.remove();
      this.player.anims.stop();
      this.done.teeth = true;
      this.guide.complete('teeth');
      this.retire('teeth');
      this.guide.say('minty. good.');
      this.floatUp('sparkle', AT.mirror[0] * ART - 8, AT.mirror[1] * ART - 6, { rise: 10, ms: 700 });
      this.time.delayedCall(180, () => this.floatUp('sparkle', AT.mirror[0] * ART + 12, AT.mirror[1] * ART + 8, { rise: 10, ms: 700 }));
    });
  }

  doCoffee() {
    this.guide.say('coffee brewing…');
    play(this, 'coffee');
    const brewing = this.time.addEvent({ delay: 380, loop: true, callback: () => this.steam(AT.steam[0] * ART, AT.steam[1] * ART) });
    this.setBusy(2600, () => {
      brewing.remove();
      this.done.coffee = true;
      this.guide.complete('coffee');
      this.retire('coffee');
      this.stations.push({ name: 'drink', x: STATION.sofa * ART, label: 'sit down with breakfast' });
      this.guide.say("a hot cup. something to eat with it, then i'll sit.");
    });
  }

  // on the sofa with the bowl in your lap and the coffee beside you. the eating
  // itself happens behind a short fade: full bowl, a moment of dark, empty bowl
  sitWithCoffee() {
    this.canMove = false; this.busy = true; this.guide.hidePrompt();
    const cam = this.cameras.main;
    const dark = (ms, then) => { cam.fadeOut(ms, 21, 17, 12); cam.once('camerafadeoutcomplete', then); };
    const light = (ms, then) => { cam.fadeIn(ms, 21, 17, 12); cam.once('camerafadeincomplete', then); };
    dark(600, () => {
      // hips on the seat cushion, feet on the rug, facing the room
      const p = this.player;
      p.setPosition(STATION.sofa * ART, (ROOM.feet - 1) * ART - 29 * CABIN_SCALE);
      p.body.setAllowGravity(false);
      p.setVelocity(0, 0);
      p.setFlipX(false);
      p.anims.stop();
      p.setTexture(`${this.characterId}-sit-sheet`, 28);
      this.mug.setVisible(true);
      this.bowl.setVisible(false);                      // you carried it over with you
      this.lapBowl = this.add.image(p.x, p.y + 30, 'home-bowl-milk').setOrigin(0.5, 1).setScale(ART).setDepth(11);
      this.sipTimer = this.time.addEvent({ delay: 1100, loop: true,
        callback: () => this.steam(AT.mug[0] * ART + 6, AT.mug[1] * ART - 2) });
      light(700, () => {
        this.guide.say('a few quiet minutes before the forest.');
        this.time.delayedCall(2000, () => dark(500, () => {
          this.lapBowl.setTexture('home-bowl');           // eaten
          this.sipTimer.remove();                         // and the coffee's gone too
          light(650, () => {
            this.sitting = true; this.busy = false;
            this.guide.complete('breakfast');
            this.guide.prompt(['e'], 'get up', p.x, p.y - 74);
          });
        }));
      });
    });
  }

  standUp() {
    this.sitting = false;
    this.stations = this.stations.filter((s) => s.name !== 'drink');
    if (this.sipTimer) this.sipTimer.remove();
    this.guide.hidePrompt();
    this.guide.say('alright. onward.');
    // the empty bowl goes back on the counter on your way up
    if (this.lapBowl) { this.lapBowl.destroy(); this.lapBowl = null; }
    this.bowl.setTexture('home-bowl').setVisible(true);
    this.player.setPosition(STATION.sofa * ART, this.standY);
    this.player.body.setAllowGravity(true);
    this.player.play(`${this.characterId}-idle`);
    this.canMove = true;
  }

  doCereal() {
    if (this.done.cereal && this.done.milk) { this.guide.say("breakfast's ready. good."); return; }
    if (this.done.cereal) { this.guide.say("cereal's in the bowl. just the milk now — from the fridge."); return; }
    this.done.cereal = true;
    play(this, 'cereal');
    this.guide.complete('cereal');
    this.relabel('cereal', 'look at breakfast');
    this.bowl.setTexture('home-bowl-cereal');
    this.guide.say('cereal in the bowl. now the milk from the fridge.');
  }

  doFridge() {
    if (this.done.milk) { this.guide.say("breakfast's ready. good."); return; }
    if (!this.done.cereal) { this.guide.say('cereal in the bowl first, then the milk.'); this.openFridgeBriefly(); return; }
    this.openFridgeBriefly();
    this.guide.say('milk in the bowl… there. breakfast.');
    this.done.milk = true;
    this.guide.complete('milk');
    this.time.delayedCall(700, () => this.bowl.setTexture('home-bowl-milk'));
    this.time.delayedCall(1200, () => { this.retire('fridge'); this.retire('cereal'); });
  }

  openFridgeBriefly() {
    play(this, 'fridge');
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
      this.guide.say('not yet — i should ' + left.join(', ') + ' first.');
      return;
    }
    this.canMove = false; this.busy = true;
    this.inventory = { bread: 1, water: 1, rope: 1 };   // the bag on its hook, packed last night
    this.guide.complete('leave');
    this.guide.say('bag on my shoulder — bread, water, rope. time to go north.');
    this.guide.hidePrompt();
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
      play(this, 'door');
      fade(this, 'amb-morning', 1, 1200);           // the door open: the birds, all at once
      this.player.play(`${this.characterId}-walk`);
      // across the porch, down the two steps, and away up the path
      const walk = (x, dy, ms, next) => this.tweens.add({ targets: this.player, x: x * ART, y: this.player.y + dy, duration: ms, onComplete: next });
      walk(594, 0, 1150, () => {
        walk(616, 8 * ART, 420, () => walk(690, 0, 1100));
        this.cameras.main.fadeOut(1300, 21, 17, 12);
        this.registry.set('inventory', this.inventory);
        const sessionId = this.registry.get('sessionId');
        // saved with a real "start of the forest" state (and the time so far), so
        // continuing this journey later doesn't arrive with nothing
        if (sessionId) game.updateProgress(sessionId, 'ForestScene', 0, withCurrentTime(null)).catch((err) => console.warn('could not save progress:', err.message));
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
    play(this, 'birdsong', { volume: this.done.curtains ? 0.9 : 0.5, vary: 0.1 });   // through the curtains, at first
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
      if (this.busy) this.guide.hidePrompt();     // nothing to press while something's happening
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
    steps(this, moving && onGround, { surface: 'wood' });
    if (moving && onGround) {
      if (this.player.anims.currentAnim?.key !== `${this.characterId}-walk` || !this.player.anims.isPlaying) this.player.play(`${this.characterId}-walk`);
    } else if (onGround) {
      if (this.player.anims.currentAnim?.key !== `${this.characterId}-idle` || !this.player.anims.isPlaying) this.player.play(`${this.characterId}-idle`);
    }

    if (moving) this.walked = true;
    const s = this.nearestStation();
    if (s) this.guide.prompt(['e'], s.label, this.player.x, this.player.y - 74);
    else if (!this.walked) this.guide.prompt(['left', 'right'], 'walk', this.player.x, this.player.y - 74);
    else this.guide.hidePrompt();
  }
}
