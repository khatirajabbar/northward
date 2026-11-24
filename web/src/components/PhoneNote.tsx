"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

// On an iPhone, Safari can't show the game on the whole screen: its own bars
// take a strip of it. From the home screen it has all of it, so someone playing
// in Safari on an iPhone gets one quiet line saying so, with a link to the
// steps. Closed, it stays closed (in this browser).

const KEY = "northward.phone-note";
const CHANGED = "northward:phone-note";

function wanted(): boolean {
  const iphone = /iPhone|iPod/.test(navigator.userAgent);
  const fromHome =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  let closed = false;
  try {
    closed = window.localStorage.getItem(KEY) === "closed";
  } catch {
    // a browser that keeps nothing: it shows again next time, which is fine
  }
  return iphone && !fromHome && !closed;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  return () => window.removeEventListener(CHANGED, onChange);
}

export default function PhoneNote() {
  const show = useSyncExternalStore(subscribe, wanted, () => false);
  if (!show) return null;

  function close() {
    try {
      window.localStorage.setItem(KEY, "closed");
    } catch {
      // see above
    }
    window.dispatchEvent(new Event(CHANGED));
  }

  return (
    <p className="play__note label">
      <span>on an iphone, the forest has the whole screen from your home screen.</span>
      <Link href="/how-to-play#phone">how</Link>
      <button type="button" onClick={close} aria-label="close this note">
        ×
      </button>
    </p>
  );
}
