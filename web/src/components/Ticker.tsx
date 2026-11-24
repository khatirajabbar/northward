"use client";

// The thin line under the bar: it types a few words, waits, and types the
// next. Some of what it says is read off the leaderboard as it is right now.
import { useEffect, useMemo, useState } from "react";
import { clock } from "@/lib/format";
import { useStats } from "@/lib/stats";

const ALWAYS = [
  "a quiet adventure through a swedish forest",
  "plays in your browser. no download, no account",
  "nothing in the forest can hurt you",
  "the leaderboard counts kindness, not speed",
];

const TYPE_MS = 34;
const WAIT_MS = 3400;
const GAP_MS = 500;

export default function Ticker() {
  const stats = useStats();
  const lines = useMemo(() => {
    if (!stats || stats.journeys === 0) return ALWAYS;
    const live = [`${stats.travelers} ${stats.travelers === 1 ? "traveler has" : "travelers have"} reached the end of the road`];
    if (stats.kindest !== null) live.push(`kindest journey so far: ♥ ${stats.kindest}`);
    if (stats.quickest !== null) live.push(`quickest journey so far: ${clock(stats.quickest)}`);
    // one of ours, one from the board, and so on
    return ALWAYS.flatMap((line, i) => (live[i] ? [line, live[i]] : [line]));
  }, [stats]);

  const [typed, setTyped] = useState(ALWAYS[0]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: number;
    let line = 0;
    let letters = lines[0].length; // the first line is already there when the page arrives

    const step = () => {
      const text = lines[line % lines.length];
      if (letters < text.length) {
        letters += 1;
        setTyped(text.slice(0, letters));
        timer = window.setTimeout(step, TYPE_MS);
      } else {
        timer = window.setTimeout(() => {
          line += 1;
          letters = 0;
          setTyped("");
          timer = window.setTimeout(step, GAP_MS);
        }, WAIT_MS);
      }
    };
    timer = window.setTimeout(step, WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [lines]);

  return (
    <span className="ticker" aria-hidden="true">
      &gt; {typed}
      <i className="ticker__cursor" />
    </span>
  );
}
