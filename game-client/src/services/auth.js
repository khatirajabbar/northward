const AUTH_API_BASE = import.meta.env.VITE_AUTH_URL || 'http://localhost:5283';
const AUTH_REFRESH_PATH = '/api/auth/refresh';

// Who's signed in is kept in the browser, so closing the tab or refreshing
// doesn't sign you out. The website keeps it under the same name, so (when the
// game and the site are served from the same address) signing in on either
// signs you in on both.
const STORED = 'northward.session';

function stored() {
  try {
    return JSON.parse(window.localStorage.getItem(STORED));
  } catch {
    return null;
  }
}

function store() {
  try {
    if (auth.user && auth.accessToken) {
      window.localStorage.setItem(STORED, JSON.stringify({
        accessToken: auth.accessToken, refreshToken: auth.refreshToken, username: auth.user.username, userId: auth.user.userId
      }));
    } else {
      window.localStorage.removeItem(STORED);
    }
  } catch {
    // a browser that won't keep it: you're signed in until the tab closes, as before
  }
}

function take(session) {
  auth.accessToken = session.accessToken;
  auth.refreshToken = session.refreshToken;
  auth.user = { userId: session.userId, username: session.username };
}

// what the sign-in service said was wrong, as one line a person can read
async function problem(response, fallback) {
  const body = await response.json().catch(() => null);
  if (body && typeof body.error === 'string') return body.error;
  if (body && body.errors) return Object.values(body.errors).flat().join(' ');
  return fallback;
}

// the renewal in progress, if there is one (see refresh)
let renewing = null;

export const auth = {
  user: null,
  accessToken: null,
  refreshToken: null,
  // walking without an account: nothing is saved, nothing goes on the board
  guest: false,

  async login(email, password) {
    return enter('/api/auth/login', { email, password }, 'invalid email or password');
  },

  async register(username, email, password) {
    return enter('/api/auth/register', { username, email, password }, 'could not make the account');
  },

  // signed in last time? then you still are, if the service agrees. true if so
  async restore() {
    const session = stored();
    if (!session || !session.refreshToken) return false;
    take(session);
    try {
      await this.refresh();
      return true;
    } catch {
      this.logout();
      return false;
    }
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
    store();
  },

  isAuthenticated() {
    return this.user !== null && this.accessToken !== null;
  }
};

async function enter(path, body, fallback) {
  let response;
  try {
    response = await fetch(`${AUTH_API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error("can't reach the forest right now");
  }
  if (!response.ok) throw new Error(await problem(response, fallback));

  take(await response.json());
  auth.guest = false;
  store();
  return auth.user;
}

async function renew() {
  // the website may have renewed it since (it shares what's kept in the
  // browser): then its new pass is ours too, and there's nothing to ask for
  const kept = stored();
  if (kept && kept.refreshToken && kept.refreshToken !== auth.refreshToken) {
    take(kept);
    return auth.accessToken;
  }
  if (!auth.refreshToken) {
    throw new Error('no refresh token');
  }

  const response = await fetch(`${AUTH_API_BASE}${AUTH_REFRESH_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: auth.refreshToken })
  });

  if (!response.ok) {
    throw new Error(await problem(response, 'could not refresh session'));
  }

  const data = await response.json();
  auth.accessToken = data.accessToken;
  if (data.refreshToken) auth.refreshToken = data.refreshToken;
  store();

  return auth.accessToken;
}

// where "back to the title" leads: your journeys if you're signed in, the
// title screen and its board if you're walking without an account
export const titleScene = () => (auth.isAuthenticated() ? 'SessionSelectScene' : 'LoginScene');

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
