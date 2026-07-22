import Phaser from 'phaser';
import { game, CHARACTER_ID_BY_TYPE } from '../services/game.js';

const SCENE_LABELS = {
  MorningScene: 'morning',
  ForestScene: 'the forest',
  EndingScene: 'the ending'
};

export default class SessionSelectScene extends Phaser.Scene {
  constructor() {
    super('SessionSelectScene');
  }

  create() {
    const { width, height } = this.scale;
    this.menuX = Math.round(width * 0.12);
    this.menuTop = Math.round(height * 0.18) + 90;

    this.cameras.main.setBackgroundColor('#1a2228');
    const skyColors = [0x1a2228, 0x232f36, 0x2e3d44, 0x3a4a50];
    const bandHeight = height / skyColors.length;
    skyColors.forEach((color, i) => {
      this.add.rectangle(width / 2, i * bandHeight + bandHeight / 2, width, bandHeight, color)
        .setDepth(-10);
    });

    for (let i = 0; i < 20; i++) {
      const s = this.add.circle(Math.random() * width, Math.random() * height * 0.6,
        0.8 + Math.random() * 1.2, 0xe8f0f8, 0.3 + Math.random() * 0.4).setDepth(-8);
      this.tweens.add({ targets: s, alpha: 0.1 + Math.random() * 0.25,
        duration: 1600 + Math.random() * 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    this.add.text(this.menuX, Math.round(height * 0.18), 'northward', {
      fontFamily: 'Georgia, serif', fontSize: '42px', color: '#ece8dc', fontStyle: 'italic'
    }).setOrigin(0, 0.5);

    this.statusText = this.add.text(this.menuX, this.menuTop, 'gathering your journeys...', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '13px', color: '#7a8a90'
    }).setOrigin(0, 0.5).setAlpha(0.8);

    this.confirmed = false;
    this.items = [];
    this.loadSlots();

    this.input.keyboard.on('keydown-UP', () => this.move(-1));
    this.input.keyboard.on('keydown-W', () => this.move(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.move(1));
    this.input.keyboard.on('keydown-S', () => this.move(1));
    this.input.keyboard.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard.on('keydown-E', () => this.confirm());

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  async loadSlots() {
    let sessions = [];
    let characters = [];
    try {
      [sessions, characters] = await Promise.all([game.getSessions(), game.getCharacters()]);
      this.statusText.setVisible(false);
    } catch (err) {
      console.warn('could not load journeys:', err.message);
      this.statusText.setText('could not load journeys');
    }
    if (!this.scene.isActive()) return;

    const resumable = sessions
      .filter((session) => !session.isCompleted)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      .slice(0, 4);

    const slots = resumable.map((session) => {
      const character = characters.find((c) => c.id === session.playerCharacterId);
      return {
        session,
        travelerId: CHARACTER_ID_BY_TYPE[character?.characterType] || 'lpc-khatira',
        name: character?.customName || 'traveler'
      };
    });
    slots.push({ newJourney: true });

    this.buildMenu(slots);
  }

  buildMenu(slots) {
    const pad = (v) => String(v).padStart(2, '0');
    const lineH = 44;

    this.items = slots.map((slot, i) => {
      let label = 'new journey';
      if (!slot.newJourney) {
        const d = new Date(slot.session.startedAt);
        const scene = SCENE_LABELS[slot.session.currentScene] || 'morning';
        label = `${slot.name} — ${scene} — ${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
      }
      const text = this.add.text(this.menuX, this.menuTop + i * lineH, label, {
        fontFamily: 'Georgia, serif', fontSize: '20px', color: '#8a9aa0', fontStyle: 'italic'
      }).setOrigin(0, 0.5);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerover', () => this.highlight(i));
      text.on('pointerdown', () => { this.highlight(i); this.confirm(); });
      return { slot, text };
    });

    this.statusText.setY(this.menuTop + slots.length * lineH + 16);

    this.underline = this.add.rectangle(this.menuX, this.menuTop + 18, 80, 3, 0xece8dc)
      .setOrigin(0, 0.5);
    this.highlight(0);
  }

  move(dir) {
    if (!this.items.length || this.selectedIndex === undefined) return;
    this.highlight(Phaser.Math.Clamp(this.selectedIndex + dir, 0, this.items.length - 1));
  }

  highlight(index) {
    if (this.confirmed || !this.items[index]) return;
    this.selectedIndex = index;
    this.items.forEach((item, i) => item.text.setColor(i === index ? '#ece8dc' : '#8a9aa0'));
    this.underline.setSize(Math.round(this.items[index].text.width * 0.6), 3);
    this.tweens.add({ targets: this.underline, y: this.items[index].text.y + 18,
      duration: 200, ease: 'Sine.out' });
  }

  confirm() {
    if (this.confirmed || this.selectedIndex === undefined) return;
    const item = this.items[this.selectedIndex];
    if (!item) return;
    this.confirmed = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (item.slot.newJourney) {
        this.scene.start('CharacterSelectScene');
        return;
      }
      const { session, travelerId } = item.slot;
      this.registry.set('playAs', travelerId);
      this.registry.set('sessionId', session.id);
      this.registry.set('sessionStartedAt', session.startedAt);
      this.registry.set('kindness', session.score);
      this.registry.set('checkpoint', session.checkpoint ?? null);
      this.scene.start(session.currentScene);
    });
  }
}
