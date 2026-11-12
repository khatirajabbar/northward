import type { Metadata } from "next";

export const metadata: Metadata = { title: "credits" };

// The same credits the game shows at its end.
export default function Credits() {
  return (
    <section className="page">
      <div className="page__top">
        <p className="label">credits</p>
        <h1 className="line">
          who made this.
        </h1>
      </div>
      <div className="credits">
        <div className="credit">
          <span className="label">a game by</span>
          <p>Khatira Jabbarli</p>
        </div>
        <div className="credit">
          <span className="label">characters: liberated pixel cup sprites by</span>
          <p>
            Benjamin K. Smith (BenCreating), bluecarrot16, Durrani, Eliza Wyatt (ElizaWy), Evert, Fabzy, JaidynReiman, Johannes Sjölund (wulax), Mandi Paugh,
            Matthew Krohn (makrohn), MuffinElZangano, Nila122, Pierre Vigier (pvigier), Stephen Challener (Redshrike), TheraHedwig, William.Thompsonj
          </p>
          <small>
            CC-BY-SA 3.0 · GPL 3.0 · OGA-BY 3.0 —{" "}
            <a href="https://opengameart.org" rel="noreferrer">
              opengameart.org
            </a>
          </small>
        </div>
        <div className="credit">
          <span className="label">sounds</span>
          <p>music written in code, note by note, for this game</p>
          <p>sound effects made with ElevenLabs</p>
          <small>
            <a href="https://elevenlabs.io" rel="noreferrer">
              elevenlabs.io
            </a>
          </small>
        </div>
      </div>
    </section>
  );
}
