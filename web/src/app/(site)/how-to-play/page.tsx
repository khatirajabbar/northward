import type { Metadata } from "next";
import Link from "next/link";
import Shuffle from "@/components/Shuffle";
import Path from "@/components/Path";

export const metadata: Metadata = { title: "how to play" };

const KEYS = [
  { caps: ["←", "→", "a", "d"], what: "walk. north is to the right." },
  { caps: ["↑", "w", "space"], what: "jump." },
  { caps: ["e"], what: "do the thing in front of you. the game shows the key when there is one." },
  { caps: ["shift"], what: "hold it to go slowly and gently." },
  { caps: ["x"], what: "hold it to run, when something needs you to hurry." },
  { caps: ["i"], what: "open your bag." },
  { caps: ["esc", "p"], what: "pause. save and leave, or begin again." },
  { caps: ["f"], what: "full screen." },
  { caps: ["m"], what: "sound off, and on again." },
];

const NOTES = [
  { title: "you can't lose.", text: "nothing in the forest can hurt you." },
  { title: "torches remember.", text: "each torch you light keeps your place. leave when you like and carry on another day." },
  { title: "helping is a choice.", text: "most of what needs you, you can walk straight past. the forest counts the times you didn't." },
];

export default function HowToPlay() {
  return (
    <section className="page">
      <div className="page__top">
        <Path to="how-to-play" />
        <h1 className="line">
          walk. stop. help.
        </h1>
      </div>

      <div className="part" id="keys">
        <div className="part__head">
          <span className="label">01 / the keys</span>
          <span className="label">a keyboard is all you need</span>
        </div>
        <div className="keys">
          {KEYS.map((key) => (
            <div key={key.what} className="keys__item">
              <div className="keys__caps">
                {key.caps.map((cap) => (
                  <span key={cap} className="key">
                    {cap}
                  </span>
                ))}
              </div>
              <p>{key.what}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="part" id="notes">
        <div className="part__head">
          <span className="label">02 / good to know</span>
        </div>
        <div className="notes">
          {NOTES.map((note) => (
            <div key={note.title} className="note">
              <h2 className="title">{note.title}</h2>
              <p>{note.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="part" id="phone">
        <div className="part__head">
          <span className="label">03 / on a phone</span>
          <span className="label">hold it sideways</span>
        </div>
        <div className="notes">
          <div className="note">
            <h2 className="title">on its side.</h2>
            <p>
              the forest is wide, so hold your phone sideways. the keys come with it: your left thumb walks, your right
              thumb jumps and presses e, and the others come up when they&apos;re needed.
            </p>
          </div>
          <div className="note">
            <h2 className="title">on an iphone.</h2>
            <p>
              safari can&apos;t show a game on the whole screen; its own bars take a strip of it. kept on your home
              screen, the forest has all of it:
            </p>
            <ol className="steps">
              <li>open the play page in safari.</li>
              <li>tap share: the square with an arrow pointing up.</li>
              <li>choose &ldquo;add to home screen&rdquo;, then &ldquo;add&rdquo;.</li>
              <li>open northward from its new icon.</li>
            </ol>
            <p>you&apos;ll sign in once more there. your journeys come with you.</p>
          </div>
          <div className="note">
            <h2 className="title">on android.</h2>
            <p>
              it works in the browser as it is: tap full screen on the title. or add it to your home screen from the
              browser&apos;s menu, and it opens on its side with all of the screen.
            </p>
          </div>
        </div>
      </div>

      <div>
        <Link href="/play" className="box">
          <Shuffle text="play" />
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
