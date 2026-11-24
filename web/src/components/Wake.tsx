"use client";

// Published, the game's services fall asleep when nobody's been by for a while
// (render.yaml), and take up to a minute to wake. So the moment anyone opens
// the site, they're all asked to wake — by the time you've read the front page
// or picked a traveler, sign-in and the leaderboard are ready.
import { useEffect } from "react";

let asked = false;

export default function Wake() {
  useEffect(() => {
    if (asked) return;
    asked = true;
    for (const service of ["a", "g", "l"]) fetch(`/svc/${service}/health`).catch(() => {});
  }, []);
  return null;
}
