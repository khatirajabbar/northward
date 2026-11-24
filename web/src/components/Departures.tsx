"use client";

// The flip-tile board at the bottom of every page, like the one in a railway
// station: "next departure", and tiles that flip through a few answers. Point
// at it and it flips to the next one straight away.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/session";

const TILES = 16;
const ANSWERS = ["north", "today", "when you like", "no ticket needed"]; // each at most 16 letters
const EVERY_MS = 5200;
const FLIP_MS = 65;
const LETTERS = "abcdefghijklmnopqrstuvwxyz";

const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// one tile. on its way to a new letter it rattles through a few others first
function Tile({ to, wait }: { to: string; wait: number }) {
  const [face, setFace] = useState({ letter: to, flips: 0 });
  const showing = useRef(to);

  useEffect(() => {
    if (showing.current === to) return;
    let left = still() ? 1 : 3 + Math.floor(Math.random() * 4);
    let timer = window.setTimeout(function flip() {
      left -= 1;
      const letter = left <= 0 ? to : LETTERS[Math.floor(Math.random() * LETTERS.length)];
      showing.current = letter;
      setFace((now) => ({ letter, flips: now.flips + 1 }));
      if (left > 0) timer = window.setTimeout(flip, FLIP_MS);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [to, wait]);

  return (
    <span className={`flap__tile ${face.letter === " " ? "is-empty" : ""}`}>
      <span key={face.flips} className="flap__letter">
        {face.letter}
      </span>
    </span>
  );
}

export default function Departures() {
  const session = useSession();
  const [answer, setAnswer] = useState(0);
  const next = () => setAnswer((now) => (now + 1) % ANSWERS.length);

  useEffect(() => {
    if (still()) return;
    const turn = window.setInterval(() => {
      if (!document.hidden) setAnswer((now) => (now + 1) % ANSWERS.length);
    }, EVERY_MS);
    return () => window.clearInterval(turn);
  }, []);

  const tiles = Array.from(ANSWERS[answer].padEnd(TILES).slice(0, TILES));

  return (
    <div className="flap">
      <div className="flap__head">
        <h2>next departure</h2>
        <Link href="/play">play ↗</Link>
      </div>
      <div className="flap__tiles" aria-hidden="true" onPointerEnter={next}>
        {tiles.map((letter, i) => (
          <Tile key={i} to={letter} wait={i * 35} />
        ))}
      </div>
      <p className="sr-only">next departure: {ANSWERS.join(". ")}.</p>
      <div className="flap__foot">
        <span>traveler</span>
        <span>{session ? session.username : "you"}</span>
      </div>
    </div>
  );
}
