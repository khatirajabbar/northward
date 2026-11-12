import { auth, withPass } from './auth.js';

const GAME_API_BASE = import.meta.env.VITE_GAME_URL || 'http://localhost:5160';

export const CHARACTER_TYPE_BY_ID = {
  'lpc-khatira': 'female',
  'lpc-oliver': 'male'
};

export const CHARACTER_ID_BY_TYPE = Object.fromEntries(
  Object.entries(CHARACTER_TYPE_BY_ID).map(([id, type]) => [type, id])
);

async function request(path, method = 'GET', body) {
  if (!auth.isAuthenticated()) {
    throw new Error('not logged in');
  }

  const response = await withPass((token) => fetch(`${GAME_API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  }));

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'request failed' }));
    throw new Error(err.message || err.error || 'game service request failed');
  }

  if (response.status === 204) return null;      // done, nothing to say (a journey let go)
  return await response.json();
}

// ── saving, one at a time ──
// The game saves often (every kind thing you do, every torch you pass) and
// never stops to wait for it. If two saves were on their way at once, the
// older could reach the server last and be the one that's kept — so they go
// one after another, and while one is on its way only the newest save for
// each journey waits behind it (an older one waiting would only be replaced).
const saves = { sending: null, waiting: new Map(), done: [] };

function sendNextSave() {
  if (saves.sending) return;
  const next = saves.waiting.entries().next().value;
  if (!next) {
    saves.done.splice(0).forEach((resolve) => resolve());   // everything asked for is saved
    return;
  }
  const [sessionId, body] = next;
  saves.waiting.delete(sessionId);
  saves.sending = request(`/api/gamesession/${sessionId}/progress`, 'PATCH', body)
    .catch((err) => console.warn('could not save progress:', err.message))
    .finally(() => { saves.sending = null; sendNextSave(); });
}

// settles once every save asked for so far has gone (or failed) — or after
// `ms`, so a slow server never leaves anyone waiting for long
function whenSaved(ms = 5000) {
  if (!saves.sending && saves.waiting.size === 0) return Promise.resolve();
  return new Promise((resolve) => {
    saves.done.push(resolve);
    setTimeout(resolve, ms);
  });
}

export const game = {
  getCharacters() {
    return request('/api/playercharacter');
  },

  createCharacter(characterType, customName) {
    return request('/api/playercharacter', 'POST', { characterType, customName });
  },

  // the journeys list waits for any save still on its way, so it always shows
  // where you really got to (save & quit goes straight to this list)
  async getSessions() {
    await whenSaved();
    return request('/api/gamesession');
  },

  createSession(playerCharacterId, season) {
    return request('/api/gamesession', 'POST', { playerCharacterId, season });
  },

  // a new journey for this traveler (the first one makes the traveler too)
  async startJourney(travelerId, name) {
    const characterType = CHARACTER_TYPE_BY_ID[travelerId];
    const characters = await this.getCharacters();
    let character = characters.find((c) => c.characterType === characterType);
    if (!character) character = await this.createCharacter(characterType, name);
    return this.createSession(character.id, 'summer');
  },

  // remember where a journey has got to. it goes when it's its turn (see above);
  // there's nothing to wait for and nothing that needs catching
  saveProgress(sessionId, currentScene, score, checkpoint) {
    if (!sessionId) return;
    saves.waiting.delete(sessionId);                 // re-added at the back: still in the order asked
    saves.waiting.set(sessionId, { currentScene, score, checkpoint });
    sendNextSave();
  },

  // finishing deletes the journey, so the last save goes first — a save that
  // arrived after it would only find nothing there
  async completeSession(sessionId) {
    await whenSaved();
    return request(`/api/gamesession/${sessionId}/complete`, 'PATCH');
  },

  async deleteSession(sessionId) {
    saves.waiting.delete(sessionId);                 // nothing more to save for a journey let go
    await whenSaved();
    return request(`/api/gamesession/${sessionId}`, 'DELETE');
  }
};
