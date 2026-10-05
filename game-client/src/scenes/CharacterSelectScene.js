import Phaser from 'phaser';
import { game, CHARACTER_TYPE_BY_ID } from '../services/game.js';
import { auth } from '../services/auth.js';
import { clock } from '../services/progress.js';

const TRAVELERS = ['lpc-khatira', 'lpc-oliver'];

export default class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelectScene');
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#1a2228');
    const skyColors = [0x1a2228, 0x232f36, 0x2e3d44, 0x3a4a50];
    const bandHeight = height / skyColors.length;
    skyColors.forEach((color, i) => {
      this.add.rectangle(width / 2, i * bandHeight + bandHeight / 2, width, bandHeight, color)
        .setDepth(-10);
    });

    const maxGroupW = Math.min(width * 0.7, 900);
    const k = Math.min(1, maxGroupW / 760);
    const cardW = 260 * k;
    const cardH = 320 * k;
    const gap = 40 * k;
    const groupW = cardW * 2 + gap;
    const groupLeft = width / 2 - groupW / 2;
    const cardY = Math.round(height / 2 + 30);
    const cardTop = cardY - cardH / 2;
    const feetY = Math.round(cardY + cardH * 0.375);

    this.add.text(width / 2, cardTop - 80, 'choose your traveler', {
      fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ece8dc', fontStyle: 'italic'
    }).setOrigin(0.5, 1);

    this.cards = TRAVELERS.map((id, i) => {
      const x = Math.round(groupLeft + cardW / 2 + i * (cardW + gap));
      const rect = this.add.rectangle(x, cardY, cardW, cardH, 0x121a22)
        .setStrokeStyle(1, 0x3a4a50);
      const sprite = this.add.sprite(x, feetY, `${id}-idle-sheet`, 39)
        .setOrigin(0.5, 1).setScale(3 * k);
      sprite.play(`${id}-idle`);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => { this.highlight(i); this.confirm(); });
      return { id, rect, sprite };
    });

    this.underline = this.add.rectangle(this.cards[0].rect.x,
      Math.round(cardY + cardH / 2 + 12), cardW * 0.6, 3, 0xece8dc);

    this.confirmed = false;
    const saved = this.registry.get('playAs');
    this.highlight(Math.max(0, TRAVELERS.indexOf(saved)));

    this.input.keyboard.on('keydown-LEFT', () => this.move(-1));
    this.input.keyboard.on('keydown-A', () => this.move(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.move(1));
    this.input.keyboard.on('keydown-D', () => this.move(1));
    this.input.keyboard.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard.on('keydown-E', () => this.confirm());
    this.input.keyboard.on('keydown-ESC', () => this.back());

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  move(dir) {
    this.highlight(Phaser.Math.Clamp(this.selectedIndex + dir, 0, this.cards.length - 1));
  }

  highlight(index) {
    if (this.confirmed) return;
    this.selectedIndex = index;
    this.cards.forEach((card, i) => {
      const on = i === index;
      card.rect.setStrokeStyle(on ? 2 : 1, on ? 0xece8dc : 0x3a4a50);
    });
    this.tweens.add({ targets: this.underline, x: this.cards[index].rect.x,
      duration: 200, ease: 'Sine.out' });
  }

  back() {
    if (this.confirmed) return;
    this.confirmed = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('SessionSelectScene'));
  }

  confirm() {
    if (this.confirmed) return;
    this.confirmed = true;
    clock.seconds = 0;
    const travelerId = this.cards[this.selectedIndex].id;
    this.registry.set('playAs', travelerId);
    this.registry.remove('sessionId');
    this.registry.remove('sessionStartedAt');
    this.registry.remove('checkpoint');
    this.registry.set('kindness', 0);
    this.startJourney(travelerId);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MorningScene'));
  }

  async startJourney(travelerId) {
    try {
      const characterType = CHARACTER_TYPE_BY_ID[travelerId];
      const characters = await game.getCharacters();
      let character = characters.find((c) => c.characterType === characterType);
      if (!character) character = await game.createCharacter(characterType, auth.user.username);
      const session = await game.createSession(character.id, 'summer');
      this.registry.set('sessionId', session.id);
      this.registry.set('sessionStartedAt', session.startedAt);
    } catch (err) {
      console.warn('starting journey without a saved session:', err.message);
    }
  }
}
