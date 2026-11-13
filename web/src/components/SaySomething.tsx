"use client";

// The "say something" page: a signed-in player writes to the people who made
// the game. (Someone not signed in is shown the way in instead.)
import Link from "next/link";
import { useState } from "react";
import { sendMessage, useSession } from "@/lib/session";
import Shuffle from "./Shuffle";

const LONGEST = 2000;

export default function SaySomething() {
  const session = useSession();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) {
      setWrong("there's nothing written yet.");
      return;
    }
    setBusy(true);
    setWrong(null);
    const problem = await sendMessage(text);
    setBusy(false);
    if (problem) setWrong(problem);
    else {
      setSent(true);
      setText("");
    }
  }

  if (!session) {
    return (
      <div className="form">
        <p className="text">you need to be signed in to write, so we know which traveler it came from.</p>
        <div className="home__go">
          <Link href="/login" className="box">
            <Shuffle text="log in" />
            <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/register" className="plain">
            <Shuffle text="register" />
          </Link>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="form">
        <p className="title">sent. thank you, {session.username}.</p>
        <p className="text">it&apos;s been read by a person, or will be soon.</p>
        <div>
          <button className="plain" onClick={() => setSent(false)}>
            <Shuffle text="write another" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={send}>
      <label className="field">
        <span className="label">your message, {session.username}</span>
        <textarea name="text" value={text} onChange={(e) => setText(e.target.value)} maxLength={LONGEST} required />
        <span className="field__count">
          {text.length} / {LONGEST}
        </span>
      </label>
      {wrong && (
        <p className="form__wrong" role="alert">
          {wrong}
        </p>
      )}
      <button className="box box--wide" disabled={busy}>
        <Shuffle text={busy ? "one moment" : "send"} />
        <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}
