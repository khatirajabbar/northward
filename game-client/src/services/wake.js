// Published, the game's services fall asleep when nobody's been by for a while
// (render.yaml in the repo) and take up to a minute to wake. So as soon as the
// game opens, they're all asked to wake: by the time you've looked at the title
// and decided to sign in, they're up. (The website does the same.)
const SERVICES = [import.meta.env.VITE_AUTH_URL, import.meta.env.VITE_GAME_URL, import.meta.env.VITE_LEADERBOARD_URL];

export function wakeServices() {
  if (import.meta.env.DEV) return;                 // on your machine they're always awake
  SERVICES.filter(Boolean).forEach((base) => fetch(`${base}/health`).catch(() => {}));
}
