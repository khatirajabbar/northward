// Shown at the end of the game. The character sprites are Liberated Pixel Cup
// (LPC) art, whose licences require crediting every contributing artist — the
// full per-layer list is in public/assets/characters/*/credits/.
//
// Each block is a small heading, then lines that wrap by themselves (`large`
// writes them bigger), then an optional `small` line underneath.
export const CREDITS = [
  {
    heading: 'a game by',
    lines: ['Khatira Jabbarli'],
    large: true
  },
  {
    heading: 'characters: Liberated Pixel Cup sprites by',
    lines: [
      'Benjamin K. Smith (BenCreating), bluecarrot16, Durrani, Eliza Wyatt (ElizaWy), Evert, Fabzy, ' +
      'JaidynReiman, Johannes Sjölund (wulax), Mandi Paugh, Matthew Krohn (makrohn), MuffinElZangano, ' +
      'Nila122, Pierre Vigier (pvigier), Stephen Challener (Redshrike), TheraHedwig, William.Thompsonj'
    ],
    small: 'CC-BY-SA 3.0 · GPL 3.0 · OGA-BY 3.0 — opengameart.org'
  },
  {
    heading: 'sounds',
    lines: ['sound effects made with ElevenLabs'],
    small: 'elevenlabs.io'
  }
];
