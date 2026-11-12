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
      { source: "/svc/leaderboard/:path*", destination: `${board}/api/leaderboard/:path*` },
      { source: "/svc/game/:path*", destination: `${game}/api/:path*` },
    ];
  },
};

export default nextConfig;
