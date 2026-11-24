"use client";

// The name at the start of the bar. Every few seconds (and whenever you point
// at it) it changes typeface the way a bad signal changes a picture: for half
// a second it's cut into horizontal strips, some still the old typeface and
// some already the new one, different strips each moment, with a faint ghost
// of the new one behind — and then the new one is whole.
import { useEffect, useRef, useState } from "react";

const FACES = ["sans", "serif", "mono", "gothic", "pixel"] as const;
const EVERY_MS = 5000;
const MOMENTS = 9; // how many different cuts one change goes through
const MOMENT_MS = 48;

type Cut = { old: string; fresh: string; oldShift: number; freshShift: number };

// one moment of the change: strips of uneven height from top to bottom, each
// showing the old typeface or the new. the further along, the more are new
function cut(along: number): Cut {
  const old: string[] = [];
  const fresh: string[] = [];
  let from = 0;
  while (from < 100) {
    const to = Math.min(100, from + 4 + Math.random() * 13);
    const isNew = Math.random() < along;
    old.push(`${isNew ? "transparent" : "#000"} ${from}% ${to}%`);
    fresh.push(`${isNew ? "#000" : "transparent"} ${from}% ${to}%`);
    from = to;
  }
  const nudge = () => Math.round((Math.random() - 0.5) * 8);
  return {
    old: `linear-gradient(to bottom, ${old.join(", ")})`,
    fresh: `linear-gradient(to bottom, ${fresh.join(", ")})`,
    oldShift: nudge(),
    freshShift: nudge(),
  };
}

const strips = (mask: string, shift: number): React.CSSProperties => ({
  maskImage: mask,
  WebkitMaskImage: mask,
  transform: `translateX(${shift}px)`,
});

export default function Name() {
  const root = useRef<HTMLSpanElement>(null);
  const [face, setFace] = useState(0);
  const [moment, setMoment] = useState<Cut | null>(null); // null while the name is whole
  const next = (face + 1) % FACES.length;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: number | undefined;
    let changing = false;

    const change = () => {
      if (changing || document.hidden) return;
      changing = true;
      let at = 0;
      const step = () => {
        at += 1;
        if (at > MOMENTS) {
          setFace((now) => (now + 1) % FACES.length);
          setMoment(null);
          changing = false;
          return;
        }
        setMoment(cut(at / (MOMENTS + 1)));
        timer = window.setTimeout(step, MOMENT_MS);
      };
      step();
    };

    const turn = window.setInterval(change, EVERY_MS);
    const link = root.current?.closest("a");
    link?.addEventListener("pointerenter", change);
    return () => {
      window.clearInterval(turn);
      window.clearTimeout(timer);
      link?.removeEventListener("pointerenter", change);
    };
  }, []);

  const words = (
    <>
      <span>north</span>
      <span>ward</span>
    </>
  );

  return (
    <span ref={root} className="name" aria-hidden="true">
      {/* the typeface it's in now */}
      <span className="name__face" data-face={FACES[face]} style={moment ? strips(moment.old, moment.oldShift) : undefined}>
        {words}
      </span>
      {/* the one it's turning into: unseen until the change (which also means
          its typeface has been fetched by then), a faint ghost during it */}
      <span className="name__face name__face--over" data-face={FACES[next]} style={{ opacity: moment ? 0.3 : 0 }}>
        {words}
      </span>
      {moment && (
        <span className="name__face name__face--over" data-face={FACES[next]} style={strips(moment.fresh, moment.freshShift)}>
          {words}
        </span>
      )}
    </span>
  );
}
