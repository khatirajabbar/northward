import { auth, withPass } from './auth.js';

const LEADERBOARD_API_BASE = import.meta.env.VITE_LEADERBOARD_URL || 'http://localhost:5294';

export const leaderboard = {
  async submitScore({ characterType, season, score, completionTime }) {
    if (!auth.isAuthenticated()) {
      throw new Error('not logged in');
    }

    // (the name on the board is taken from your sign-in on the server, not from here)
    const response = await withPass((token) => fetch(`${LEADERBOARD_API_BASE}/api/leaderboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        characterType,
        season,
        score,
        completionTime // format "HH:MM:SS"
      })
    }));

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'submit failed' }));
      throw new Error(err.error || 'could not submit score');
    }

    return await response.json();
  }
};

// Format seconds into "HH:MM:SS"
export function formatTime(totalSeconds) {
  totalSeconds = Math.min(Math.max(totalSeconds, 1), 24 * 3600 - 1);   // the service takes 00:00:01 – 23:59:59
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
