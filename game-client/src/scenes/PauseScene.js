import Phaser from 'phaser';

const MENU_ITEMS = ['resume', 'restart journey', 'fullscreen', 'quit to menu'];
const STORY_SCENES = ['MorningScene', 'ForestScene', 'EndingScene'];

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  init(data) {
    this.caller = data.caller;
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x0a0e12, 0.75).setOrigin(0, 0);

    this.add.text(width / 2, height * 0.3, 'paused', {
      fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ece8dc', fontStyle: 'italic'
    }).setOrigin(0.5);

    const startY = Math.round(height * 0.44);
    const lineH = 52;
    this.items = MENU_ITEMS.map((label, i) => {
      const text = this.add.text(width / 2, startY + i * lineH, label, {
        fontFamily: 'Georgia, serif', fontSize: '20px', color: '#8a9aa0', fontStyle: 'italic'
      }).setOrigin(0.5);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerover', () => this.highlight(i));
      text.on('pointerdown', () => { this.highlight(i); this.confirm(); });
      return text;
    });

    this.underline = this.add.rectangle(width / 2, startY + 18, 80, 3, 0xece8dc);
    this.highlight(0);

    this.input.keyboard.on('keydown-UP', () => this.move(-1));
    this.input.keyboard.on('keydown-W', () => this.move(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.move(1));
    this.input.keyboard.on('keydown-S', () => this.move(1));
    this.input.keyboard.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard.on('keydown-E', () => this.confirm());
    this.input.keyboard.on('keydown-P', () => this.resumeCaller());
    this.input.keyboard.on('keydown-ESC', () => this.resumeCaller());
  }

  move(dir) {
    this.highlight(Phaser.Math.Clamp(this.selectedIndex + dir, 0, this.items.length - 1));
  }

  highlight(index) {
    this.selectedIndex = index;
    this.items.forEach((text, i) => text.setColor(i === index ? '#ece8dc' : '#8a9aa0'));
    this.underline.setSize(Math.round(this.items[index].width * 0.6), 3);
    this.tweens.add({ targets: this.underline, y: this.items[index].y + 18,
      duration: 200, ease: 'Sine.out' });
  }

  confirm() {
    const item = MENU_ITEMS[this.selectedIndex];
    if (item === 'resume') { this.resumeCaller(); return; }
    if (item === 'restart journey') { this.restartJourney(); return; }
    if (item === 'fullscreen') { this.scale.toggleFullscreen(); return; }
    if (item === 'quit to menu') this.quitToMenu();
  }

  resumeCaller() {
    this.scene.resume(this.caller);
    this.scene.stop();
  }

  restartJourney() {
    this.registry.set('kindness', 0);
    this.registry.set('inventory', {});
    STORY_SCENES.forEach((key) => this.scene.stop(key));
    this.scene.start('MorningScene');
  }

  quitToMenu() {
    STORY_SCENES.forEach((key) => this.scene.stop(key));
    this.scene.start('CharacterSelectScene');
  }
}
