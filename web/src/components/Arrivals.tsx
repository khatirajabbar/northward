"use client";

// The small box on the leaderboard page that counts the rows as they come
// into focus, one by one, and goes away when they're all there.
import { useEffect, useState } from "react";

const three = (n: number) => String(n).padStart(3, "0");
const LOOK_MS = 70;
const STAY_MS = 1400; // how long it stays once every row is there
const GIVE_UP_MS = 8000; // no rows at all (an empty board, or it can't be reached)

export default function Arrivals() {
  const [count, setCount] = useState<{ here: number; of: number } | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const began = window.performance.now();
    let allHereAt: number | null = null;
    let shown = false;

    const look = window.setInterval(() => {
      const time = window.performance.now();
      // a row is "here" once its first cell has started to appear
      const cells = document.querySelectorAll<HTMLElement>(".board tbody tr > td:first-child");
      let here = 0;
      for (const cell of cells) if (Number(getComputedStyle(cell).opacity) > 0.02) here += 1;

      if (cells.length === 0) {
        if (time - began > GIVE_UP_MS) window.clearInterval(look);
        return;
      }
      if (here < cells.length) {
        allHereAt = null;
        shown = true;
        setDone(false);
        setCount({ here, of: cells.length });
        return;
      }
      // every row is there. if they already were when we first looked, say nothing
      if (!shown) {
        window.clearInterval(look);
        return;
      }
      setCount({ here, of: cells.length });
      allHereAt ??= time;
      if (time - allHereAt > STAY_MS) {
        setDone(true);
        window.clearInterval(look);
      }
    }, LOOK_MS);

    return () => window.clearInterval(look);
  }, []);

  if (!count) return null;
  return (
    <p className={`arrivals glass ${done ? "is-done" : ""}`} aria-hidden="true">
      {count.here < count.of ? "reading the board" : "the board"} {three(count.here)}/{three(count.of)}
    </p>
  );
}
