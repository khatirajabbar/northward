"use client";

// Who's signed in, kept in the browser. The site's pages read it with
// useSession(); signing in, registering and signing out change it.
import { useSyncExternalStore } from "react";

export type Session = {
  accessToken: string;
  refreshToken: string;
  username: string;
  userId: string;
};

export type Profile = {
  userId: string;
  username: string;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
};

export type Entry = {
  id: string;
  username: string;
  characterType: string;
  score: number;
  completionTime: string;
  completedAt: string;
  rank: number | null;
};

const KEY = "northward.session";
const CHANGED = "northward:session";

let cachedRaw: string | null | undefined;
let cached: Session | null = null;

function read(): Session | null {
  const raw = window.localStorage.getItem(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      cached = null;
    }
  }
  return cached;
}

function write(session: Session | null) {
  if (session) window.localStorage.setItem(KEY, JSON.stringify(session));
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// null while nobody is signed in (and on the server, before the browser has looked)
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

// what the services say when something's wrong, as one line a person can read
async function problem(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.error === "string") return body.error.toLowerCase();
    if (body.errors) return Object.values(body.errors as Record<string, string[]>).flat().join(" ").toLowerCase();
    if (typeof body.title === "string") return body.title.toLowerCase();
  } catch {
    // not JSON: fall through
  }
  return "something went wrong. try again in a moment.";
}

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

async function enter(path: string, body: unknown): Promise<string | null> {
  let response: Response;
  try {
    response = await post(path, body);
  } catch {
    return "can't reach the forest right now. try again in a moment.";
  }
  if (!response.ok) return problem(response);
  const data = await response.json();
  write({ accessToken: data.accessToken, refreshToken: data.refreshToken, username: data.username, userId: data.userId });
  return null;
}

// each returns null when it worked, or what to tell the person
export const signIn = (email: string, password: string) => enter("/svc/auth/login", { email, password });
export const register = (username: string, email: string, password: string) =>
  enter("/svc/auth/register", { username, email, password });
export const signOut = () => write(null);

// a request as the signed-in person. the pass lasts 15 minutes; if it has run
// out it's renewed once and the request is sent again
async function asMe(path: string): Promise<Response | null> {
  const session = read();
  if (!session) return null;
  const send = (token: string) => fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  let response = await send(session.accessToken);
  if (response.status === 401) {
    const renewed = await post("/svc/auth/refresh", { refreshToken: session.refreshToken });
    if (!renewed.ok) {
      write(null);
      return null;
    }
    const data = await renewed.json();
    write({ ...session, accessToken: data.accessToken, refreshToken: data.refreshToken });
    response = await send(data.accessToken);
  }
  return response.ok ? response : null;
}

// Delete the signed-in account, for good: its lines on the leaderboard, its
// travelers and saved journeys, and then the account itself. The password is
// checked first, so nothing is removed if it's wrong; and the account goes
// last, so if anything fails on the way it can simply be tried again.
// Returns null when it's done, or what to tell the person.
export async function deleteAccount(password: string): Promise<string | null> {
  const profile = await getProfile();
  if (!profile) return "you're not signed in any more. log in and try again.";
  try {
    const check = await post("/svc/auth/login", { email: profile.email, password });
    if (!check.ok) return "that password isn't right.";
    const { accessToken } = await check.json();
    const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    const board = await fetch("/svc/leaderboard/me", { method: "DELETE", headers });
    const journeys = await fetch("/svc/game/playercharacter", { method: "DELETE", headers });
    if (!board.ok || !journeys.ok) return "couldn't delete everything just now. nothing of your account is gone yet; try again in a moment.";

    const account = await fetch("/svc/auth/me", { method: "DELETE", headers, body: JSON.stringify({ password }) });
    if (!account.ok) return problem(account);
  } catch {
    return "can't reach the forest right now. try again in a moment.";
  }
  write(null);
  return null;
}

export async function getProfile(): Promise<Profile | null> {
  const response = await asMe("/svc/auth/me");
  return response ? response.json() : null;
}

export async function getMyEntries(): Promise<Entry[]> {
  const response = await asMe("/svc/leaderboard/me");
  return response ? response.json() : [];
}
