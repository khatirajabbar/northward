const AUTH_API_BASE = import.meta.env.VITE_AUTH_URL || 'http://localhost:5283';
const AUTH_REFRESH_PATH = '/api/auth/refresh';

// the renewal in progress, if there is one (see refresh)
let renewing = null;

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

  // The pass you sign in with (the access token) only lasts 15 minutes; this
  // trades the refresh token for a new one. A refresh token works once only,
  // so if several requests find their pass has run out at the same moment,
  // they must all wait on the same renewal — a second renewal with the same
  // (now used) refresh token would be refused, and its request would fail.
  refresh() {
    if (!renewing) renewing = renew().finally(() => { renewing = null; });
    return renewing;
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

async function renew() {
  if (!auth.refreshToken) {
    throw new Error('no refresh token');
  }

  const response = await fetch(`${AUTH_API_BASE}${AUTH_REFRESH_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: auth.refreshToken })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'refresh failed' }));
    throw new Error(error.error || 'could not refresh session');
  }

  const data = await response.json();
  auth.accessToken = data.accessToken;
  if (data.refreshToken) auth.refreshToken = data.refreshToken;

  return auth.accessToken;
}

// Send a request with the current pass. If the server says it has run out,
// renew it and try once more — unless it was already renewed while this
// request was on its way, in which case the retry can just use the new one.
export async function withPass(send) {
  const sentWith = auth.accessToken;
  let response = await send(auth.accessToken);
  if (response.status === 401) {
    if (auth.accessToken === sentWith) await auth.refresh();
    response = await send(auth.accessToken);
  }
  return response;
}
