// Every sound in the game, and how it's described to ElevenLabs, which makes
// them (tools/audio.mjs — you run it with your own key; nothing here needs it).
// The music is the exception: it's written in code, note by note, by
// tools/music.mjs, and its `text` only says what it is.
//
//   kind     sfx: a one-off (a footstep, a splash)   loop: something that goes on
//            (wind, water) and is made to loop seamlessly   music: a piece of music
//   seconds  how long to make it
//   volume   how loud it plays, before any fading — the mix lives here
//   text     the description it's made from
//   follow   (optional) how closely ElevenLabs keeps to the description, 0 to 1
//            (0.5 if not given) — higher for a sound that keeps coming out odd
//
// Change a description and run the tool with that sound's id to make it again.
export const SOUNDS = [
  // ── the air: places, weather, the time of day ──
  { id: 'amb-morning', kind: 'loop', seconds: 30, volume: 0.5,
    text: 'early summer morning at the edge of a pine forest: a dawn chorus of songbirds near and far, blackbird, wren and warbler calls overlapping, a soft breeze in the pines, peaceful, no people, no music' },
  { id: 'amb-forest', kind: 'loop', seconds: 20, volume: 0.45,
    text: 'daytime summer forest ambience, birdsong here and there, leaves rustling softly in a light wind, peaceful, no people' },
  { id: 'amb-wind', kind: 'loop', seconds: 30, volume: 1,
    text: 'gentle steady wind through a tall pine forest, treetops swaying and leaves rustling, now and then a soft creak of a trunk, no birds, no people' },
  { id: 'amb-water', kind: 'loop', seconds: 12, volume: 0.55,
    text: 'a small clear stream babbling gently over stones, soft flowing water, close' },
  { id: 'amb-dusk', kind: 'loop', seconds: 15, volume: 0.4,
    text: 'warm summer evening at dusk, crickets chirping softly, a very light breeze, calm' },
  { id: 'amb-night', kind: 'loop', seconds: 15, volume: 0.5,
    text: 'cold night wind blowing softly through bare trees, lonely and quiet, a little snow in the air' },
  { id: 'fire', kind: 'loop', seconds: 10, volume: 0.6,
    text: 'a small campfire crackling gently, soft pops of burning wood' },
  { id: 'bee', kind: 'loop', seconds: 6, volume: 0.45,
    text: 'a single bumblebee buzzing softly nearby, moving between flowers' },
  { id: 'hooves', kind: 'loop', seconds: 6, volume: 0.45,
    text: 'a horse walking at an easy pace on a soft dirt forest path, steady hoofbeats' },
  { id: 'crying', kind: 'loop', seconds: 10, volume: 0.3,
    text: 'a young person quietly sobbing alone in the distance, muffled, sad, no words' },

  // ── the guide: notes, tasks, boards ──
  { id: 'ui-paper', kind: 'sfx', seconds: 1, volume: 0.5, text: 'a sheet of paper unfolded, a soft dry rustle' },
  { id: 'ui-tick', kind: 'sfx', seconds: 1, volume: 0.4, follow: 0.75,
    text: "one soft, warm wooden marimba note, gentle and pleasant, a small 'done' sound for a cozy game: a single note that rings briefly and fades, nothing else" },
  { id: 'ui-sign', kind: 'sfx', seconds: 1.2, volume: 0.45, text: 'a small wooden sign swinging down on two ropes, a soft creak and a gentle wooden knock' },
  { id: 'ui-knock', kind: 'sfx', seconds: 0.5, volume: 0.45, text: 'one soft knock on a wooden board, short' },
  { id: 'kindness', kind: 'sfx', seconds: 1.5, volume: 0.45, text: 'a single gentle warm chime, soft and magical, quiet, short' },
  { id: 'torch', kind: 'sfx', seconds: 1.2, volume: 0.5, text: 'a torch catching fire, a soft whoosh and a crackle' },

  // ── you: walking, jumping, falling in ──
  { id: 'step-grass', kind: 'sfx', seconds: 0.5, volume: 0.35, text: 'one soft footstep on short grass, single step' },
  { id: 'step-wood', kind: 'sfx', seconds: 0.5, volume: 0.09, text: 'one soft footstep on an old wooden floorboard, single step' },
  { id: 'land', kind: 'sfx', seconds: 0.5, volume: 0.4, text: 'a soft landing on grass after a small jump, a light thud' },
  { id: 'splash', kind: 'sfx', seconds: 1.2, volume: 0.55, text: 'a person stepping off the bank into a shallow stream, a splash' },
  { id: 'bounce', kind: 'sfx', seconds: 0.6, volume: 0.45, text: 'a soft springy boing, bouncing on a giant mushroom cap, gentle and playful' },

  // ── the morning, in the cabin ──
  { id: 'curtains', kind: 'sfx', seconds: 1.2, volume: 0.14, text: 'cotton curtains being drawn open on a metal rail' },
  { id: 'brush', kind: 'sfx', seconds: 2.5, volume: 0.25, text: 'someone brushing their teeth with a toothbrush' },
  { id: 'coffee', kind: 'sfx', seconds: 2, volume: 0.4, text: 'hot coffee poured from a pot into a ceramic mug' },
  { id: 'cereal', kind: 'sfx', seconds: 1.5, volume: 0.13, text: 'dry cereal poured into a bowl' },
  { id: 'fridge', kind: 'sfx', seconds: 1.5, volume: 0.45, follow: 0.75,
    text: 'a kitchen fridge door pulled open and gently pushed shut a second later: a soft rubbery pop of the seal, then a muffled thump, quiet room, close-up, nothing else' },
  { id: 'door', kind: 'sfx', seconds: 1.6, volume: 0.35, follow: 0.75,
    text: 'an old wooden cabin door swinging slowly open: one smooth, low creak of its hinges that fades out, no knocking, no clicking, no rattling' },

  // ── on the road ──
  { id: 'carrot', kind: 'sfx', seconds: 0.7, volume: 0.5, text: 'a carrot pulled up out of soft garden soil' },
  { id: 'crunch', kind: 'sfx', seconds: 1.4, volume: 0.45, text: 'a small animal happily munching and crunching food' },
  { id: 'horse-snort', kind: 'sfx', seconds: 1.2, volume: 0.45, text: 'a gentle horse snorting softly through its nose' },
  { id: 'horse-neigh', kind: 'sfx', seconds: 1.8, volume: 0.45, text: 'a gentle friendly horse whinny, not loud' },
  { id: 'meow', kind: 'sfx', seconds: 1, volume: 0.45, text: 'a small cat meowing softly once' },
  { id: 'chirp', kind: 'sfx', seconds: 0.8, volume: 0.45, text: 'a small songbird chirping, two short sweet notes' },
  { id: 'birdsong', kind: 'sfx', seconds: 2, volume: 0.45, follow: 0.7,
    text: 'a small songbird singing one short sweet melodic phrase, clear and close, like a robin at a window in the morning, nothing else' },
  { id: 'wings', kind: 'sfx', seconds: 1, volume: 0.45, text: 'a small bird flapping its wings and flying away' },
  { id: 'rustle', kind: 'sfx', seconds: 1, volume: 0.45, text: 'rustling through a leafy bush, leaves and twigs moving' },
  { id: 'bleat', kind: 'sfx', seconds: 1, volume: 0.4, text: 'a frightened baby deer bleating softly' },
  { id: 'mud', kind: 'sfx', seconds: 1, volume: 0.45, text: 'a thick wet squelch of mud' },
  { id: 'rope', kind: 'sfx', seconds: 1, volume: 0.45, text: 'a rope thrown and pulled tight' },
  { id: 'squirrel', kind: 'sfx', seconds: 1, volume: 0.4, text: 'a red squirrel chattering briefly, high and quick' },
  { id: 'pop', kind: 'sfx', seconds: 0.5, volume: 0.4, text: 'a tiny soft pop, picking up a small acorn' },
  { id: 'quack', kind: 'sfx', seconds: 1, volume: 0.4, text: 'a mother duck quacking twice, calling' },
  { id: 'peep', kind: 'sfx', seconds: 0.7, volume: 0.4, text: 'a tiny duckling peeping' },
  { id: 'drink', kind: 'sfx', seconds: 1.5, volume: 0.4, text: 'an animal lapping water from a wooden bowl' },
  { id: 'shell', kind: 'sfx', seconds: 0.8, volume: 0.45, text: 'a turtle shell rolling over onto gravel, a soft scrape and bump' },
  { id: 'plank', kind: 'sfx', seconds: 0.8, volume: 0.5, text: 'a wooden plank set down onto a wooden beam, a soft hollow knock' },

  // ── the forest, now and then, from somewhere off the road ──
  { id: 'woodpecker', kind: 'sfx', seconds: 2, volume: 0.22, text: 'a woodpecker drumming on a tree trunk a little way off in a forest, one short burst' },
  { id: 'twig', kind: 'sfx', seconds: 1.2, volume: 0.35, text: 'a dry twig snapping in the undergrowth and something small scurrying away through leaves' },
  { id: 'birdcall', kind: 'sfx', seconds: 2, volume: 0.06, text: 'a blackbird calling once from high in a tree, a little distant, clear' },
  { id: 'owl', kind: 'sfx', seconds: 2.5, volume: 0.05, text: 'an owl hooting twice far away in a dark forest at night' },

  // ── the last field ──
  { id: 'earth', kind: 'sfx', seconds: 0.8, volume: 0.45, text: 'a handful of soft earth tossed onto the ground' },
  { id: 'logs', kind: 'sfx', seconds: 1, volume: 0.45, text: 'a few small logs of firewood set down together' },
  { id: 'ignite', kind: 'sfx', seconds: 1.5, volume: 0.5, text: 'a small campfire catching, a soft whoosh, then crackling' },

  // ── music: written in code (tools/music.mjs), not made by ElevenLabs ──
  { id: 'music-title', kind: 'music', volume: 0.35,
    text: 'the title and the morning: a folk tune in D, in three, on a fingerpicked nylon-string guitar and a soft piano; a music box the second time round' },
  { id: 'music-forest', kind: 'music', volume: 0.16,
    text: 'the walk: slow open chords on a pad and a soft piano, a melody that wanders in now and then and leaves room between its phrases' },
  { id: 'music-night', kind: 'music', volume: 0.2,
    text: 'dusk into night: a music box like a lullaby, high and far apart, over a slow pad in E minor and a low piano note now and then' },
  { id: 'music-ending', kind: 'music', volume: 0.25,
    text: 'by the fire: a tender piece for piano alone, A minor turning to C major, strings coming in quietly halfway' }
];
