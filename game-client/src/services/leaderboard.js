import { auth } from './auth.js';

const LEADERBOARD_API_BASE = import.meta.env.VITE_LEADERBOARD_URL || 'http://localhost:5294';

export const leaderboard = {
  async submitScore({ characterType, season, score, completionTime }) {
    if (!auth.isAuthenticated()) {
      throw new Error('not logged in');
    }

    const post = () => fetch(`${LEADERBOARD_API_BASE}/api/leaderboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`
      },
      body: JSON.stringify({
        username: auth.user.username,
        characterType,
        season,
        score,
        completionTime // format "HH:MM:SS"
      })
    });

    let response = await post();

    if (response.status === 401) {
      await auth.refresh();
      response = await post();
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'submit failed' }));
      throw new Error(err.error || 'could not submit score');
    }

    return await response.json();
  }
};

// Format seconds into "HH:MM:SS"
export function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
