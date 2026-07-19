import { auth } from './auth.js';

const GAME_API_BASE = 'http://localhost:5160';

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

  const send = () => fetch(`${GAME_API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.accessToken}`
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  let response = await send();

  if (response.status === 401) {
    await auth.refresh();
    response = await send();
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'request failed' }));
    throw new Error(err.message || err.error || 'game service request failed');
  }

  return await response.json();
}

export const game = {
  getCharacters() {
    return request('/api/playercharacter');
  },

  createCharacter(characterType, customName) {
    return request('/api/playercharacter', 'POST', { characterType, customName });
  },

  getSessions() {
    return request('/api/gamesession');
  },

  createSession(playerCharacterId, season) {
    return request('/api/gamesession', 'POST', { playerCharacterId, season });
  },

  updateProgress(sessionId, currentScene, score) {
    return request(`/api/gamesession/${sessionId}/progress`, 'PATCH', { currentScene, score });
  },

  completeSession(sessionId) {
    return request(`/api/gamesession/${sessionId}/complete`, 'PATCH');
  }
};
