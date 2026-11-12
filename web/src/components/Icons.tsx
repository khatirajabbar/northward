"use client";

// The four small drawings in the bar across the top. Each does something
// when you point at its part of the bar: the runner jumps a block, the
// pinwheel spins, the bars rise into a podium, the door swings open.
// The movement is in globals.css; only the pinwheel needs a little code,
// so it can coast to a stop instead of snapping back.
import { useEffect, useRef } from "react";

// play: a small figure that runs on the spot and hops over a block
export function Runner() {
  return (
    <svg className="icon runner" viewBox="0 0 60 80" aria-hidden="true">
      <rect x="2" y="72" width="56" height="2" />
      <g className="runner__body">
        <rect x="17" y="28" width="14" height="14" />
        <rect x="18" y="44" width="12" height="16" />
        <rect x="30" y="47" width="8" height="4" />
        <rect className="runner__leg runner__leg--a" x="18" y="60" width="4" height="12" />
        <rect className="runner__leg runner__leg--b" x="26" y="60" width="4" height="12" />
      </g>
      <rect className="runner__block" x="48" y="60" width="8" height="12" />
    </svg>
  );
}

// how to play: a pinwheel on a stick. it spins while you're there, and when
// you leave it coasts a little further round and settles
export function Pinwheel() {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = svg.current;
    const blades = el?.querySelector<SVGGElement>(".pinwheel__blades");
    const part = el?.closest<HTMLElement>(".nav__part");
    if (!el || !blades || !part) return;

    const spin = () => {
      blades.style.transition = "none";
      blades.style.transform = "";
      el.classList.add("is-spinning");
    };
    const coast = () => {
      // where the spin has got to, read off the running animation
      const matrix = getComputedStyle(blades).transform.match(/matrix\(([^)]+)\)/);
      el.classList.remove("is-spinning");
      let angle = 0;
      if (matrix) {
        const [a, b] = matrix[1].split(",").map(Number);
        angle = Math.atan2(b, a) * (180 / Math.PI);
      }
      blades.style.transition = "none";
      blades.style.transform = `rotate(${angle}deg)`;
      void blades.getBoundingClientRect();
      blades.style.transition = "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)";
      blades.style.transform = `rotate(${angle + 60}deg)`;
    };

    part.addEventListener("pointerenter", spin);
    part.addEventListener("pointerleave", coast);
    return () => {
      part.removeEventListener("pointerenter", spin);
      part.removeEventListener("pointerleave", coast);
    };
  }, []);

  return (
    <svg ref={svg} className="icon pinwheel" viewBox="0 0 60 80" aria-hidden="true">
      <rect x="29" y="30" width="2" height="48" />
      <g className="pinwheel__blades">
        <path d="M30 30 C 30 14, 18 8, 8 14 C 16 18, 24 24, 30 30 Z" />
        <path d="M30 30 C 46 30, 52 18, 46 8 C 42 16, 36 24, 30 30 Z" />
        <path d="M30 30 C 30 46, 42 52, 52 46 C 44 42, 36 36, 30 30 Z" />
        <path d="M30 30 C 14 30, 8 42, 14 52 C 18 44, 24 36, 30 30 Z" />
        <circle cx="30" cy="30" r="2.5" />
      </g>
    </svg>
  );
}

// leaderboard: three bars, level until you point, then first, second and third
export function Podium() {
  return (
    <svg className="icon podium" viewBox="0 0 60 80" aria-hidden="true">
      <rect x="2" y="72" width="56" height="2" />
      <rect className="podium__bar podium__bar--2" x="6" y="38" width="14" height="34" />
      <rect className="podium__bar podium__bar--1" x="23" y="22" width="14" height="50" />
      <rect className="podium__bar podium__bar--3" x="40" y="50" width="14" height="22" />
    </svg>
  );
}

// account: a door, shut until you point at it
export function DoorIcon() {
  return (
    <svg className="icon door" viewBox="0 0 60 80" aria-hidden="true">
      <rect x="2" y="72" width="56" height="2" />
      <rect className="door__frame" x="13" y="9" width="34" height="63" />
      <g className="door__leaf">
        <rect x="12" y="8" width="36" height="64" />
        <circle className="door__knob" cx="41" cy="42" r="2" />
      </g>
    </svg>
  );
}

// the mark at the far end of the bar: the bird, flying north. a few flat
// shapes, like folded paper; its wing beats when you point at it
export function Bird() {
  return (
    <svg className="mark" viewBox="0 0 100 80" aria-hidden="true">
      <path d="M2 36 L14 46 L4 56 L30 51 L54 51 Q72 47 84 38 L98 33 L82 29 Q70 30 58 36 L30 41 Z" />
      <path className="mark__wing" d="M40 40 L30 4 L66 35 Z" />
    </svg>
  );
}
