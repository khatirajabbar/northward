import Phaser from 'phaser';

// Beat 1 — the morning. A cozy one-room cabin built from real art assets.
// Walk with arrow keys, press E near a station to interact. Freeform order.
// Nature (bird singing + growing light) wakes you; opening the curtains warms
// the room. The bird motif is planted here and pays off in the ending.
export default class MorningScene extends Phaser.Scene {
  constructor() {
    super('MorningScene');
  }

  create() {
    const { width, height } = this.scale;
    this.W = width; this.H = height;

    this.cameras.main.setBackgroundColor('#1a140e');

    // ── background room (scaled to fill) ──
    const bg = this.add.image(width / 2, height / 2, 'cabin-bg').setDepth(-20);
    const bgScale = Math.max(width / 661, height / 376);
    bg.setScale(bgScale);

    // floor line: where furniture and the player stand
    this.floorY = height - 96;

    // dim overlay (brightens when curtains open)
    this.roomDim = this.add.rectangle(0, 0, width, height, 0x0a0d14)
      .setOrigin(0, 0).setDepth(40).setAlpha(0.5);

    this.buildFurniture();
    this.buildPlayer();
    this.buildUI();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('A,D');
    this.keyE = this.input.keyboard.addKey('E');
    this.keyE.on('down', () => this.tryInteract());

    this.done = { curtains: false, teeth: false, coffee: false, cereal: false, milk: false };
    this.busy = false;
    this._cerealStep = 0;

    this.startAsleep();
  }

  buildFurniture() {
    const { W, floorY } = this;
    this.stations = [];

    // ---- BED (far left, on floor) ----
    const bedX = W * 0.12;
    this.bedSprite = this.add.image(bedX, floorY + 10, 'cabin-bed-sleeping').setOrigin(0.5, 1).setScale(0.23).setDepth(2);
    this.bedX = bedX;

    // ---- WASHBASIN (left-center) ----
    const sinkX = W * 0.32;
    this.add.image(sinkX, floorY + 6, 'cabin-washbasin').setOrigin(0.5, 1).setScale(0.8).setDepth(2);
    this.stations.push({ name: 'teeth', x: sinkX, label: 'brush your teeth' });

    // ---- WINDOW + CURTAINS + BIRDHOUSE (center, on the wall) ----
    const winX = W * 0.52;
    const winY = floorY - 250; // natural height on the wall
    this.add.image(winX, winY, 'cabin-window').setOrigin(0.5).setScale(0.85).setDepth(1);

    this.stations.push({ name: 'curtains', x: winX, label: 'open the curtains' });


    // ---- KITCHEN: coffee counter + fridge (right) ----
    const counterX = W * 0.74;
    this.add.image(counterX, floorY + 6, 'cabin-counter').setOrigin(0.5, 1).setScale(0.9).setDepth(2);
    // coffee station is the counter's left side (machine), cereal is the right (bowl)
    this.stations.push({ name: 'coffee', x: counterX - 60, label: 'start the coffee' });
    this.stations.push({ name: 'cereal', x: counterX + 50, label: 'make some cereal' });
    // steam anchor
    this.coffeeX = counterX - 60; this.coffeeY = floorY - 130;

    // fridge (right of counter) — its own station; open to get milk
    const fridgeX = W * 0.9;
    this.fridge = this.add.image(fridgeX, floorY + 6, 'cabin-fridge-closed').setOrigin(0.5, 1).setScale(0.8).setDepth(2);
    this.fridgeX = fridgeX;
    this.stations.push({ name: 'fridge', x: fridgeX, label: 'get the milk' });

    // ---- DOOR + BAG (far right edge) ----
    const doorX = W * 0.97;
    this.add.image(doorX, floorY + 6, 'cabin-door').setOrigin(0.5, 1).setScale(0.8).setDepth(1);
    const bagX = W * 0.84;
    this.bag = this.add.image(bagX, floorY + 4, 'cabin-bag').setOrigin(0.5, 1).setScale(0.7).setDepth(2);
    this.stations.push({ name: 'bag', x: bagX, label: 'take your bag and go' });
    this.doorX = doorX;
  }

  buildPlayer() {
    this.player = this.add.sprite(this.bedX + 40, this.floorY - 55, 'player', 12).setScale(2.3).setDepth(10);
    this.player.setVisible(false); // 'under the blanket' until they wake
    this.playerSpeed = 3;
    this.canMove = false;
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
      // swap the sleeping bed for the empty bed (reset scale to normal bed size)
      this.bedSprite.setTexture('cabin-bed');
      this.bedSprite.setScale(0.85);
      this.player.setPosition(this.bedX + 80, this.floorY - 40);
      this.player.setAlpha(0);
      this.player.setVisible(true);
      if (this.anims.exists('idle')) this.player.play('idle');
      this.tweens.add({
        targets: this.player, alpha: 1,
        duration: 700, ease: 'Sine.inOut',
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
    if (this.busy || !this.canMove) return;
    const s = this.nearestStation();
    if (!s) return;
    switch (s.name) {
      case 'curtains': return this.doCurtains();
      case 'teeth': return this.doTeeth();
      case 'coffee': return this.doCoffee();
      case 'cereal': return this.doCereal();
      case 'fridge': return this.doFridge();
      case 'bag': return this.doBag();
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
    this.setBusy(1800, () => { this.done.teeth = true; this.sparkle(this.W * 0.32, this.floorY - 150); });
  }

  doCoffee() {
    if (this.done.coffee) { this.thought.setText("coffee's ready. warm."); return; }
    this.thought.setText('coffee brewing…');
    this.setBusy(3000, () => {
      this.done.coffee = true;
      this.thought.setText('mm. coffee.');
      this.steam(this.coffeeX, this.coffeeY);
    });
  }

  doCereal() {
    if (this.done.cereal && this.done.milk) { this.thought.setText("breakfast's ready. good."); return; }
    if (this.done.cereal) { this.thought.setText('cereal\'s in the bowl. just the milk now — from the fridge.'); return; }
    this.done.cereal = true;
    this.thought.setText('cereal in the bowl. now the milk from the fridge.');
  }

  doFridge() {
    if (this.done.milk) { this.thought.setText("breakfast's ready. good."); return; }
    if (!this.done.cereal) { this.thought.setText('cereal in the bowl first, then the milk.'); return; }
    this.fridge.setTexture('cabin-fridge-open');
    this.thought.setText('milk in the bowl… there. breakfast.');
    this.done.milk = true;
    this.time.delayedCall(1100, () => { this.fridge.setTexture('cabin-fridge-closed'); });
  }

  doBag() {
    const coreDone = this.done.coffee && this.done.cereal && this.done.milk && this.done.teeth;
    if (!coreDone) {
      const left = [];
      if (!this.done.teeth) left.push('brush my teeth');
      if (!this.done.coffee) left.push('make coffee');
      if (!this.done.cereal || !this.done.milk) left.push('finish breakfast');
      this.thought.setText('not yet — i should ' + left.join(', ') + ' first.');
      return;
    }
    this.canMove = false;
    this.busy = true;
    this.thought.setText('alright. time to go north.');
    this.prompt.setVisible(false);
    if (this.anims.exists('walk')) this.player.play('walk');
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
      const note = this.add.text((this.birdX || this.W * 0.7) + i * 6, (this.birdY || 200), '♪', {
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
    if (!this.canMove || this.busy) return;

    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    let moving = false;

    if (left) { this.player.x -= this.playerSpeed; this.player.setFlipX(true); moving = true; }
    else if (right) { this.player.x += this.playerSpeed; this.player.setFlipX(false); moving = true; }
    this.player.x = Phaser.Math.Clamp(this.player.x, 40, this.W - 40);

    if (moving) {
      if (this.anims.exists('walk') && this.player.anims.currentAnim?.key !== 'walk') this.player.play('walk');
    } else {
      if (this.anims.exists('idle') && this.player.anims.currentAnim?.key !== 'idle') this.player.play('idle');
    }

    const s = this.nearestStation();
    if (s) {
      this.prompt.setText('▸ e  ' + s.label);
      this.prompt.setPosition(this.player.x, this.floorY - 80);
      this.prompt.setVisible(true);
    } else {
      this.prompt.setVisible(false);
    }
  }
}
