"use client";

// The label of the bigger things you can press (the names in the bar, the
// boxes): when you point at one (or tab to it, or press it), its letters
// scramble for a moment and settle back, left to right. Taken from the blur
// site's text-shuffle, made quicker. Small links and plain text never move.
import { useCallback, useEffect, useRef, useState } from "react";

// keep the scramble on screen for a beat, then resolve it cleanly
const HOLD_MS = 50;
const RESOLVE_MS = 230;
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";

function randomCharacter(character: string) {
  if (UPPERCASE.includes(character)) return UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)];
  if (LOWERCASE.includes(character)) return LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)];
  if (NUMBERS.includes(character)) return NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
  return character; // spaces, punctuation and arrows stay where they are
}

function frame(text: string, resolved: number) {
  return Array.from(text, (character, index) => (index < resolved ? character : randomCharacter(character))).join("");
}

export default function Shuffle({ text }: { text: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const animation = useRef<number | null>(null);
  const [shuffled, setShuffled] = useState<string | null>(null);

  const reset = useCallback(() => {
    if (animation.current !== null) {
      window.cancelAnimationFrame(animation.current);
      animation.current = null;
    }
    if (root.current) root.current.style.width = "";
    setShuffled(null);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // the whole link or button is the trigger, not only the letters
    const trigger = el.closest<HTMLElement>("a, button, [role='button']") ?? el;

    const play = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (animation.current !== null) window.cancelAnimationFrame(animation.current);
      // the letters change width as they scramble: hold the label's own width, so nothing beside it moves
      el.style.width = `${el.getBoundingClientRect().width}px`;
      const startedAt = window.performance.now();
      setShuffled(frame(text, 0));

      const tick = (now: number) => {
        const progress = Math.min(Math.max(now - startedAt - HOLD_MS, 0) / RESOLVE_MS, 1);
        setShuffled(frame(text, Math.floor(progress * Array.from(text).length)));
        if (progress < 1) {
          animation.current = window.requestAnimationFrame(tick);
          return;
        }
        // show the real words again, and only then let go of the width
        setShuffled(null);
        animation.current = window.requestAnimationFrame(() => {
          animation.current = null;
          el.style.width = "";
        });
      };
      animation.current = window.requestAnimationFrame(tick);
    };

    trigger.addEventListener("pointerenter", play);
    trigger.addEventListener("pointerdown", play);
    trigger.addEventListener("focus", play);
    return () => {
      trigger.removeEventListener("pointerenter", play);
      trigger.removeEventListener("pointerdown", play);
      trigger.removeEventListener("focus", play);
      reset();
    };
  }, [reset, text]);

  return (
    <span ref={root} className="shuffle">
      <span aria-hidden="true">{shuffled ?? text}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
