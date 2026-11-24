import type { NextConfig } from "next";

// The site's own server passes sign-in and leaderboard requests on to the
// game's services, so the browser only ever talks to this site.
const auth = process.env.AUTH_URL ?? "http://localhost:5001";
const board = process.env.LEADERBOARD_URL ?? "http://localhost:5003";
const game = process.env.GAME_URL ?? "http://localhost:5002";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
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
