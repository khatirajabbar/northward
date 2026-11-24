import Link from "next/link";
import Path from "@/components/Path";
import Shuffle from "@/components/Shuffle";
import Words from "@/components/Words";

// The home page: one sentence, and a way in. Nothing of the game is shown.
export default function Home() {
  return (
    <>
    <section className="home">
      <Path />
      <h1 className="line">
        every morning a bird sings at your window, and then it flies north.
      </h1>
      <p className="line line--quiet">today you follow it.</p>
      <div className="home__go">
        <Link href="/play" className="box">
          <Shuffle text="play" />
          <span aria-hidden="true">↗</span>
        </Link>
        <Link href="/how-to-play" className="plain">
          how to play
        </Link>
      </div>
    </section>
    <Words />
    </>
  );
}
