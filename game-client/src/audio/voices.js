// The two travelers' voices: ElevenLabs voice ids (not secret — they only
// name a voice; the API key that pays for using it stays in your terminal).
// Each traveler says their own thoughts; at the end, the one you didn't choose
// is the one crying by the tree, and speaks in their own voice there.
//
// Recorded by tools/voices.mjs into src/audio/voices/<traveler>/<line>.mp3.

export const VOICES = {
  'lpc-khatira': '7Oe5w10Lkmw2m7thw7Bq',          // Khatira — a young woman
  'lpc-oliver': 'sy82hnCq3jGxFihPCnOh'            // Oliver — a young man
};

// ElevenLabs' most natural voice model
export const MODEL = 'eleven_v3';

// how each voice is described, to design it (node tools/voices.mjs --design khatira):
// a real person quietly thinking to themselves — not performing — young, with a
// light Scandinavian accent, close and unhurried
export const DESCRIPTIONS = {
  'lpc-khatira': 'A young Swedish woman in her mid-twenties, speaking English with a soft, light Scandinavian accent. She is quietly thinking to herself, not performing: gentle, close and unhurried, warm but a little shy, curious about the world around her. Calm, natural pacing with small pauses. Intimate, close-microphone studio quality, no background noise.',
  // (his first voice, made from "intimate, close-microphone, low and quiet", came out whispery, like ASMR:
  // this one asks for an ordinary speaking voice, said out loud)
  'lpc-oliver': 'A young Swedish man in his mid-twenties, speaking English with a light Scandinavian accent. A clear, natural speaking voice at an ordinary conversational volume, like a friendly, down-to-earth guy talking to himself out loud on a walk through the woods: calm, warm and thoughtful, a little dry, with some lightness in it. A full, steady voice, medium-low pitch, relaxed natural pacing. Clean studio recording, no background noise.'
};

// what the voices say while they're being chosen: lines from the game (100 to 1000 letters)
export const SAMPLE = "that bird again. every morning it sings at my window, and then it flies north. today i'm going to see where it goes. a fish — in a puddle, on the road. the high water must have left it here.";
