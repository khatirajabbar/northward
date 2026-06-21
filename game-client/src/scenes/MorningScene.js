import Phaser from 'phaser';

// Beat 1 — the morning. A cozy one-room cabin: Penzilla walls/floor with the
// hand-drawn Gemini furniture on top. Walk with arrows, press E at a station.
// Make coffee and sit a while, make breakfast (cereal + milk from the fridge),
// then head out the door. Nature wakes you; the curtains warm the room. The
// bird at the window is planted here and pays off in the ending.
export default class MorningScene extends Phaser.Scene {
  constructor() {
    super('MorningScene');
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;

    this.cameras.main.setBackgroundColor('#1a140e');

    this.floorY = height - 96;
    this.px = 7;                 // penzilla wall/floor scale
    this.buildBackground();

    this.roomDim = this.add.rectangle(0, 0, width, height, 0x0a0d14)
      .setOrigin(0, 0).setDepth(40).setAlpha(0.5);

    this.buildFurniture();
    this.buildPlayer();
    this.buildUI();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.keyE = this.input.keyboard.addKey('E');
    this.keyE.on('down', () => this.tryInteract());

    this.done = { curtains: false, teeth: false, coffee: false, cereal: false, milk: false };
    this.busy = false;
    this.sitting = false;

    this.startAsleep();
  }

  // scale a hi-res Gemini piece to a target on-screen width / height
  fitW(key, w) { return w / this.textures.get(key).getSourceImage().width; }
  fitH(key, h) { return h / this.textures.get(key).getSourceImage().height; }

  buildBackground() {
    const { W, H, floorY, px } = this;
    this.add.tileSprite(0, 0, W, floorY, 'cabin-wall')
      .setOrigin(0, 0).setTileScale(px, px).setDepth(-20);
    this.add.tileSprite(0, floorY, W, H - floorY, 'cabin-floor')
      .setOrigin(0, 0).setTileScale(px, px).setDepth(-19);
  }

  buildFurniture() {
    const { W, H, floorY } = this;
    this.stations = [];

    // ---- BED (far left) — starts as the sleeping bed (character in it) ----
    const bedX = W * 0.15;
    this.bedX = bedX;
    this.bedSprite = this.add.image(bedX, floorY + 2, 'cabin-bed-sleeping')
      .setOrigin(0.5, 1).setScale(this.fitW('cabin-bed-sleeping', 260)).setDepth(2);

    // ---- WASHBASIN (left-center) ----
    const sinkX = W * 0.30;
    this.add.image(sinkX, floorY + 2, 'cabin-washbasin').setOrigin(0.5, 1).setScale(this.px).setDepth(2);
    this.stations.push({ name: 'teeth', x: sinkX, label: 'brush your teeth' });

    // ---- WINDOW (center wall) — the bird in the glass ----
    const winX = W * 0.52;
    const winY = floorY - 210;
    this.add.image(winX, winY, 'cabin-window').setOrigin(0.5).setScale(this.fitW('cabin-window', 180)).setDepth(1);
    this.stations.push({ name: 'curtains', x: winX, label: 'open the curtains' });

    // ---- KITCHEN: counter (coffee machine + bowl) + fridge ----
    const counterX = W * 0.72;
    this.add.image(counterX, floorY + 14, 'cabin-counter').setOrigin(0.5, 1).setScale(this.fitW('cabin-counter', 210)).setDepth(2);
    this.stations.push({ name: 'coffee', x: counterX - 45, label: 'start the coffee' });
    this.stations.push({ name: 'cereal', x: counterX + 45, label: 'make some cereal' });
    this.coffeeX = counterX - 45; this.coffeeY = floorY - 120;
    this.cerealX = counterX + 45; this.cerealY = floorY - 110;

    // fridge (right) — bottom-LEFT origin so closed/open share the same body position
    const fridgeX = W * 0.82;
    this.fridge = this.add.image(fridgeX, floorY + 12, 'cabin-fridge-closed')
      .setOrigin(0, 1).setScale(this.fitH('cabin-fridge-closed', 155)).setDepth(2);
    this.fridgeX = fridgeX;
    this.stations.push({ name: 'fridge', x: fridgeX + 40, label: 'get the milk' });

    // ---- DOOR (right edge) — the way out ----
    const doorX = W * 0.97;
    this.add.image(doorX, floorY + 2, 'cabin-door').setOrigin(0.5, 1).setScale(this.px).setDepth(1);
    this.stations.push({ name: 'leave', x: doorX, label: 'head out north' });
    this.doorX = doorX;

    // ---- CEILING LAMP (penzilla, hung from ceiling) ----
    const lampX = W / 2, seg = this.px * 8, top = -this.px * 2;
    this.add.image(lampX, top, 'cabin-lamp-top').setOrigin(0.5, 0).setScale(this.px).setDepth(3);
    this.add.image(lampX, top + seg, 'cabin-lamp-mid').setOrigin(0.5, 0).setScale(this.px).setDepth(3);
    this.add.image(lampX, top + seg * 2, 'cabin-lamp-mid').setOrigin(0.5, 0).setScale(this.px).setDepth(3);
    this.add.image(lampX, top + seg * 3, 'cabin-lamp-bottom').setOrigin(0.5, 0).setScale(this.px).setDepth(3);

    // ---- WALL DECOR (penzilla) ----
    this.add.image(W * 0.06, H * 0.34, 'cabin-painting').setOrigin(0.5, 0.5).setScale(this.px).setDepth(1);
    this.add.image(W * 0.24, H * 0.40, 'cabin-shelf').setOrigin(0.5, 0.5).setScale(this.px).setDepth(1);
    this.add.image(W * 0.20, floorY + 2, 'cabin-plant').setOrigin(0.5, 1).setScale(this.px).setDepth(2);

    // ---- LIVING AREA: sofa + table + mug (the coffee beat) ----
    this.sofaX = W * 0.42;
    this.add.image(this.sofaX, floorY + 2, 'cabin-sofa').setOrigin(0.5, 1).setScale(this.px).setDepth(2);
    const tableX = this.sofaX + this.px * 10;
    this.add.image(tableX, floorY + 2, 'cabin-coffee-table').setOrigin(0.5, 1).setScale(this.px).setDepth(2);
    this.mugX = tableX; this.mugY = floorY + 2 - this.px * 8;
    this.mug = this.add.image(tableX, this.mugY, 'cabin-mug').setOrigin(0.5, 1).setScale(this.px).setDepth(3).setVisible(false);

    // ---- FILLER (penzilla) ----
    this.add.image(W * 0.035, floorY + 2, 'cabin-floor-lamp').setOrigin(0.5, 1).setScale(this.px).setDepth(2);
  }

  buildPlayer() {
    // physics player — arcade body + global gravity (matches GameScene)
    this.player = this.physics.add.sprite(this.bedX + 70, this.floorY - 40, 'player', 12).setScale(3).setDepth(10);
    this.player.setVisible(false);
    this.player.setCollideWorldBounds(true);
    this.player.body.setAllowGravity(false); // asleep: stay put until we wake
    this.playerSpeed = 240;   // walk speed (px/sec)
    this.jumpSpeed = -480;    // same jump strength as GameScene
    this.canMove = false;

    // invisible floor to stand and land on
    const ground = this.add.rectangle(this.W / 2, this.floorY + 40, this.W, 20).setVisible(false);
    this.physics.add.existing(ground, true);
    this.physics.add.collider(this.player, ground);
  }

  buildUI() {
    const { W } = this;
    this.thought = this.add.text(W / 2, 60, '', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '19px',
      color: '#f4ead6', fontStyle: 'italic', align: 'center',
      wordWrap: { width: W * 0.7 }, stroke: '#1a140e', strokeThickness: 3
    }).setOrigin(0.5).setDepth(60);
    this.prompt = this.add.text(0, 0, '', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '14px', color: '#f4ead6',
      backgroundColor: '#00000077', padding: { x: 8, y: 4 }
    }).setOrigin(0.5, 1).setDepth(60).setVisible(false);
  }

  startAsleep() {
    this.time.delayedCall(900, () => this.chirp());
    this.time.delayedCall(2000, () => this.chirp());
    this.time.delayedCall(3400, () => this.chirp());
    this.tweens.add({ targets: this.roomDim, alpha: 0.38, duration: 5000, ease: 'Sine.inOut' });
    this.time.delayedCall(5000, () => {
      this.thought.setText('morning already. a bird singing somewhere outside.');
      // swap sleeping bed -> empty bed, stand the character up beside it
      this.bedSprite.setTexture('cabin-bed');
      this.bedSprite.setScale(this.fitW('cabin-bed', 260));
      this.player.setPosition(this.bedX + 70, this.floorY - 40);
      this.player.body.setAllowGravity(true);
      this.player.setAlpha(0).setVisible(true);
      if (this.anims.exists('idle')) this.player.play('idle');
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

  setBusy(ms, cb) {
    this.busy = true;
    this.time.delayedCall(ms, () => { this.busy = false; if (cb) cb(); });
  }

  doCurtains() {
    if (this.done.curtains) { this.thought.setText('the morning light is nice.'); return; }
    this.done.curtains = true;
    this.thought.setText('there. let the morning in.');
    this.tweens.add({ targets: this.roomDim, alpha: 0.06, duration: 1300, ease: 'Sine.inOut' });
  }

  doTeeth() {
    if (this.done.teeth) { this.thought.setText('minty. good.'); return; }
    this.thought.setText('brushing… (a fresh start).');
    this.setBusy(1800, () => { this.done.teeth = true; this.sparkle(this.W * 0.30, this.floorY - 150); });
  }

  doCoffee() {
    if (this.done.coffee) { this.thought.setText("coffee's ready. warm."); return; }
    this.thought.setText('coffee brewing…');
    this.setBusy(2600, () => {
      this.done.coffee = true;
      this.stations.push({ name: 'drink', x: this.sofaX, label: 'sit and drink your coffee' });
      this.thought.setText('a hot cup. i should sit and drink it.');
    });
  }

  sitWithCoffee() {
    this.canMove = false; this.busy = true; this.prompt.setVisible(false);
    this.cameras.main.fadeOut(600, 21, 17, 12);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.player.setPosition(this.sofaX, this.floorY - this.px * 5);
      this.player.body.setAllowGravity(false);
      this.player.setVelocity(0, 0);
      this.player.setFlipX(false);
      if (this.anims.exists('idle')) this.player.play('idle');
      this.mug.setVisible(true);
      this.cameras.main.fadeIn(700, 21, 17, 12);
      this.cameras.main.once('camerafadeincomplete', () => {
        this.sitting = true; this.busy = false;
        this.thought.setText('a few quiet minutes before the forest.');
        this.prompt.setText('▸ e  get up');
        this.prompt.setPosition(this.player.x, this.floorY - 80).setVisible(true);
        this.sipTimer = this.time.addEvent({ delay: 1500, loop: true, callback: () => this.steam(this.mugX, this.mugY) });
      });
    });
  }

  standUp() {
    this.sitting = false;
    this.stations = this.stations.filter((s) => s.name !== 'drink');
    if (this.sipTimer) this.sipTimer.remove();
    this.prompt.setVisible(false);
    this.thought.setText('alright. onward.');
    this.player.setPosition(this.sofaX + this.px * 8, this.floorY - 40);
    this.player.body.setAllowGravity(true);
    this.canMove = true;
  }

  doCereal() {
    if (this.done.cereal && this.done.milk) { this.thought.setText("breakfast's ready. good."); return; }
    if (this.done.cereal) { this.thought.setText("cereal's in the bowl. just the milk now — from the fridge."); return; }
    this.done.cereal = true;
    this.thought.setText('cereal in the bowl. now the milk from the fridge.');
  }

  doFridge() {
    if (this.done.milk) { this.thought.setText("breakfast's ready. good."); return; }
    if (!this.done.cereal) { this.thought.setText('cereal in the bowl first, then the milk.'); this.openFridgeBriefly(); return; }
    this.openFridgeBriefly();
    this.thought.setText('milk in the bowl… there. breakfast.');
    this.done.milk = true;
  }

  openFridgeBriefly() {
    this.fridge.setTexture('cabin-fridge-open');
    this.fridge.setScale(this.fitH('cabin-fridge-open', 155));
    this.time.delayedCall(1100, () => {
      this.fridge.setTexture('cabin-fridge-closed');
      this.fridge.setScale(this.fitH('cabin-fridge-closed', 155));
    });
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
    this.thought.setText('alright. time to go north.');
    this.prompt.setVisible(false);
    // hand control to the tween: stop physics fighting the walk-to-door
    this.player.body.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);
    this.player.body.enable = false;
    if (this.anims.exists(this.char?.walk || 'walk')) this.player.play(this.char?.walk || 'walk');
    this.player.setFlipX(false);
    this.tweens.add({
      targets: this.player, x: this.doorX, duration: 1500, ease: 'Sine.inOut',
      onComplete: () => {
        this.cameras.main.fadeOut(1300, 21, 17, 12);
        this.time.delayedCall(1400, () => this.scene.start('GameScene'));
      }
    });
  }

  chirp() {
    for (let i = 0; i < 2; i++) {
      const note = this.add.text((this.birdX || this.W * 0.52) + i * 6, (this.birdY || 220), '♪', {
        fontFamily: 'sans-serif', fontSize: '15px', color: '#f4ead6'
      }).setOrigin(0.5).setDepth(40);
      this.tweens.add({ targets: note, y: note.y - 30, alpha: 0, duration: 1100, delay: i * 180, onComplete: () => note.destroy() });
    }
  }

  steam(x, y) {
    for (let i = 0; i < 3; i++) {
      const s = this.add.text(x + (i - 1) * 5, y, '~', { fontSize: '14px', color: '#cccccc' }).setOrigin(0.5).setDepth(40).setAlpha(0.6);
      this.tweens.add({ targets: s, y: y - 28, alpha: 0, duration: 1600, delay: i * 250, repeat: 2, onComplete: () => s.destroy() });
    }
  }

  sparkle(x, y) {
    const s = this.add.text(x, y, '✦', { fontSize: '18px', color: '#e8f0f4' }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: s, alpha: 0, scale: 1.6, duration: 700, onComplete: () => s.destroy() });
  }

  update() {
    if (!this.canMove || this.busy) {
      if (this.player && this.player.body) this.player.setVelocityX(0);
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
      if (this.anims.exists('walk') && this.player.anims.currentAnim?.key !== 'walk') this.player.play('walk');
    } else if (onGround) {
      if (this.anims.exists('idle') && this.player.anims.currentAnim?.key !== 'idle') this.player.play('idle');
    }

    const s = this.nearestStation();
    if (s) {
      this.prompt.setText('▸ e  ' + s.label);
      this.prompt.setPosition(this.player.x, this.floorY - 80).setVisible(true);
    } else {
      this.prompt.setVisible(false);
    }
  }
}
