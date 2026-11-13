"use client";

// The name at the start of the bar. Every few seconds it's set in a different
// typeface: it goes out of focus, changes, and comes back.
import { useEffect, useState } from "react";

const FACES = ["sans", "serif", "mono", "gothic", "pixel"] as const;
const EVERY_MS = 6000;
const BLUR_MS = 220;

export default function Name() {
  const [face, setFace] = useState(0);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let swap: number | undefined;
    let here = true;
    const turn = window.setInterval(() => {
      if (document.hidden) return;
      setChanging(true);
      swap = window.setTimeout(() => {
        setFace((now) => (now + 1) % FACES.length);
        // come back into focus only once the new typeface has arrived (the
        // first time round each one still has to be fetched)
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => {
            document.fonts.ready.then(() => {
              if (here) setChanging(false);
            });
          }),
        );
      }, BLUR_MS);
    }, EVERY_MS);
    return () => {
      here = false;
      window.clearInterval(turn);
      window.clearTimeout(swap);
    };
  }, []);

  return (
    <span className={`name ${changing ? "is-changing" : ""}`} data-face={FACES[face]} aria-hidden="true">
      <span>north</span>
      <span>ward</span>
    </span>
  );
}
