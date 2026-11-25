import type { NextConfig } from "next";

// The site's own server passes sign-in and leaderboard requests on to the
// game's services, so the browser only ever talks to this site.
const auth = process.env.AUTH_URL ?? "http://localhost:5001";
const board = process.env.LEADERBOARD_URL ?? "http://localhost:5003";
const game = process.env.GAME_URL ?? "http://localhost:5002";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // the game's own files (its code, sounds and voices) are named after what's
  // in them, so a file of that name never changes: a browser can keep it for
  // good, and a second visit doesn't fetch the voices again. (Only the files
  // straight inside /game/assets — the pictures in its folders keep their
  // names when they're redrawn, so those are asked for afresh.)
  //
  // And on every page, a few rules for the browser, so the site can't be
  // misused by others: no other website may show these pages inside its own
  // (where a hidden sign-in form could be clicked without the person knowing),
  // files are only ever read as what they say they are, other sites aren't told
  // which page someone came from, and nothing may ask for the camera,
  // microphone or location.
  async headers() {
    return [
      { source: "/game/assets/:file", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/svc/auth/:path*", destination: `${auth}/api/auth/:path*` },
      { source: "/svc/messages/:path*", destination: `${auth}/api/messages/:path*` },
      { source: "/svc/messages", destination: `${auth}/api/messages` },
      { source: "/svc/leaderboard/:path*", destination: `${board}/api/leaderboard/:path*` },
      { source: "/svc/game/:path*", destination: `${game}/api/:path*` },
      // the game, played from this site (/game, scripts/build-game.mjs), reaches
      // each service through here — so it's all one address and one sign-in
      { source: "/svc/a/:path*", destination: `${auth}/:path*` },
      { source: "/svc/g/:path*", destination: `${game}/:path*` },
      { source: "/svc/l/:path*", destination: `${board}/:path*` },
    ];
  },
};

export default nextConfig;
