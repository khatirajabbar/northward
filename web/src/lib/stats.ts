"use client";

// The leaderboard in a few numbers, for the typed line under the bar and the
// status panel at the bottom. Asked for once per visit, by whichever of them
// needs it first.
import { useEffect, useState } from "react";

export type Stats = {
  travelers: number; // different people who reached the end of the road
  journeys: number;
  kindest: number | null;
  quickest: string | null; // "00:07:58"
};

let asked: Promise<Stats | null> | null = null;

function ask(): Promise<Stats | null> {
  asked ??= fetch("/svc/leaderboard/stats")
    .then((response) => (response.ok ? (response.json() as Promise<Stats>) : null))
    .catch(() => null);
  return asked;
}

// undefined while it's on its way, null if the board can't be reached
export function useStats(): Stats | null | undefined {
  const [stats, setStats] = useState<Stats | null | undefined>(undefined);
  useEffect(() => {
    let here = true;
    ask().then((answer) => {
      if (here) setStats(answer);
    });
    return () => {
      here = false;
    };
  }, []);
  return stats;
}
