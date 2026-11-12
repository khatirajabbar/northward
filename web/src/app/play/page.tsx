import type { Metadata } from "next";
import Link from "next/link";
import Shuffle from "@/components/Shuffle";

export const metadata: Metadata = { title: "play" };

// The game, and nothing else: it fills the window under one thin bar.
// Where it's loaded from is set in .env.local (NEXT_PUBLIC_GAME_URL).
const GAME = process.env.NEXT_PUBLIC_GAME_URL;

export default function Play() {
  return (
    <div className="play">
      <header className="play__bar">
        <Link href="/" className="label">
          <Shuffle text="← northward" />
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
