export default class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a2530');

    this.add.text(width / 2, height / 2, 'you have arrived.', {
      fontFamily: 'Helvetica Neue, sans-serif', fontSize: '20px', color: '#dce8e0'
    }).setOrigin(0.5);

    // TODO: build the ending — the crying figure, the dead bird, the burial,
    // the fire, the warming color, the goodbye, the walk back alone.
  }
}
