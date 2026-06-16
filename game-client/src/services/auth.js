const AUTH_API_BASE = 'http://localhost:5283';

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

  logout() {
    this.user = null;
    this.accessToken = null;
    this.refreshToken = null;
  },

  isAuthenticated() {
    return this.user !== null && this.accessToken !== null;
  }
};
