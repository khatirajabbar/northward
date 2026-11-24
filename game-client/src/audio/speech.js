// What the game and tools/voices.mjs agree on about a spoken line: what it's
// called, and what's actually said. Kept free of anything that needs a
// browser, so the tool can use it too.

// a line's name: a short fingerprint of its words exactly as they're written,
// so a line that's changed gets a new recording, and one that hasn't keeps its own
export function lineKey(text) {
  let h = 0x811c9dc5;                        // FNV-1a, 32 bits
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// what the voice says: the words, without a key hint written into them —
// "(hold shift)", "(hold X)" are for reading, not for saying
export function spokenText(text) {
  return text
    .replace(/\s*\((?:hold|press)\b[^)]*\)/gi, '')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();
}
