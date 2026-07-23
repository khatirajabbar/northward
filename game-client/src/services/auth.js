const AUTH_API_BASE = import.meta.env.VITE_AUTH_URL || 'http://localhost:5283';
// not referenced anywhere in game-client — verify against the Auth service
const AUTH_REFRESH_PATH = '/api/auth/refresh';

export const auth = {
  user: null,
  accessToken: null,
  refreshToken: null,

  async login(email, password) {
    const response = await fetch(`${AUTH_API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'login failed' }));
      throw new Error(error.error || 'invalid email or password');
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.user = {
      userId: data.userId,
      username: data.username
    };

    return this.user;
  },

  async refresh() {
    if (!this.refreshToken) {
      throw new Error('no refresh token');
    }

    const response = await fetch(`${AUTH_API_BASE}${AUTH_REFRESH_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'refresh failed' }));
      throw new Error(error.error || 'could not refresh session');
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    if (data.refreshToken) this.refreshToken = data.refreshToken;

    return this.accessToken;
  },

  logout() {
    this.user = null;
    this.accessToken = null;
    this.refreshToken = null;
  },

  isAuthenticated() {
    return this.user !== null && this.accessToken !== null;
  }
};
