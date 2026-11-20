import type { Metadata, Viewport } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "play" };

// a phone mustn't zoom in when the game's sign-in boxes are tapped (iPhone Safari does, and stays zoomed)
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover" };

// The game, and nothing else: it fills the window under one thin bar.
// Where it's loaded from is set in .env.local (NEXT_PUBLIC_GAME_URL).
const GAME = process.env.NEXT_PUBLIC_GAME_URL;

export default function Play() {
  return (
    <div className="play">
      <header className="play__bar">
        <Link href="/" className="label" aria-label="back to northward">
          ← <span className="play__name">northward</span>
        </Link>
      </header>
      {GAME ? (
        <iframe className="play__frame" src={GAME} title="northward, the game" allow="fullscreen; autoplay" allowFullScreen />
      ) : (
        <div className="play__missing">
          <p className="title">the forest isn&apos;t here yet.</p>
          <p>the game hasn&apos;t been connected to this site. set NEXT_PUBLIC_GAME_URL and try again.</p>
        </div>
      )}
    </div>
  );
}
