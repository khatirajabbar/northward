"use client";

// The admin page: the messages players have sent, and everyone on the
// leaderboard (with a way to take a name off the board). It asks for its own
// password (not a player's), and keeps the pass it's given only for as long
// as this tab is open.
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { clock, day } from "@/lib/format";
import Shuffle from "./Shuffle";

type Letter = { id: string; username: string; email: string; text: string; createdAt: string; mayShow: boolean; shown: boolean };
type Player = { userId: string; username: string; journeys: number; kindest: number; quickest: string; lastArrived: string; hidden: boolean };

const KEPT = "northward.admin";
const CHANGED = "northward:admin";

function keptPass(): string | null {
  try {
    const kept = JSON.parse(window.sessionStorage.getItem(KEPT) ?? "null");
    return kept && new Date(kept.expiresAt) > new Date() ? kept.token : null;
  } catch {
    return null;
  }
}

function keep(kept: { token: string; expiresAt: string } | null) {
  if (kept) window.sessionStorage.setItem(KEPT, JSON.stringify(kept));
  else window.sessionStorage.removeItem(KEPT);
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  return () => window.removeEventListener(CHANGED, onChange);
}

const never = () => () => {};

async function said(response: Response): Promise<string> {
  if (response.status === 429) return "too many tries. wait a minute.";
  try {
    const body = await response.json();
    if (typeof body.error === "string") return body.error.toLowerCase();
  } catch {
    // not JSON: fall through
  }
  return "something went wrong. try again in a moment.";
}

export default function Admin() {
  // still in from earlier in this tab? (nothing is known until the browser has looked)
  const pass = useSyncExternalStore(subscribe, keptPass, () => null);
  const looked = useSyncExternalStore(never, () => true, () => false);
  const [letters, setLetters] = useState<Letter[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null); // the message being asked about, before it's deleted

  const leave = useCallback(() => {
    keep(null);
    setLetters(null);
  }, []);

  // in: fetch the messages (a pass that has run out puts you back at the door)
  useEffect(() => {
    if (!pass) return;
    let here = true;
    fetch("/svc/messages", { headers: { Authorization: `Bearer ${pass}` } }).then(async (response) => {
      if (!here) return;
      if (response.ok) setLetters(await response.json());
      else leave();
    });
    return () => {
      here = false;
    };
  }, [pass, leave]);

  async function enter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    setBusy(true);
    setWrong(null);
    try {
      const response = await fetch("/svc/messages/admin/enter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (response.ok) {
        keep(await response.json());
      } else setWrong(await said(response));
    } catch {
      setWrong("can't reach the forest right now. try again in a moment.");
    }
    setBusy(false);
  }

  async function remove(id: string) {
    const response = await fetch(`/svc/messages/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${pass}` } });
    if (response.ok || response.status === 404) setLetters((all) => (all ?? []).filter((letter) => letter.id !== id));
    else if (response.status === 401) leave();
    setAsking(null);
  }

  // put a message on the website's home page, or take it off again
  async function show(id: string, shown: boolean) {
    const response = await fetch(`/svc/messages/${id}/shown`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${pass}`, "Content-Type": "application/json" },
      body: JSON.stringify({ shown }),
    });
    if (response.ok) setLetters((all) => (all ?? []).map((letter) => (letter.id === id ? { ...letter, shown } : letter)));
    else if (response.status === 401) leave();
  }

  if (!looked) return null;

  if (!pass) {
    return (
      <form className="form form--narrow" onSubmit={enter}>
        <label className="field">
          <span className="label">the admin password</span>
          <input name="password" type="password" autoComplete="off" required autoFocus />
        </label>
        {wrong && (
          <p className="form__wrong" role="alert">
            {wrong}
          </p>
        )}
        <button className="box box--wide" disabled={busy}>
          <Shuffle text={busy ? "one moment" : "open"} />
          <span aria-hidden="true">↗</span>
        </button>
      </form>
    );
  }

  return (
    <>
    <div className="part">
      <div className="part__head">
        <span className="label">{letters === null ? "fetching…" : letters.length === 1 ? "1 message" : `${letters.length} messages`}</span>
        <button className="label" onClick={leave}>
          close the admin page
        </button>
      </div>
      {letters && letters.length === 0 && <p className="board__empty">nobody has written yet.</p>}
      {letters && letters.length > 0 && (
        <div className="letters">
          {letters.map((letter) => (
            <article key={letter.id} className="letter">
              <div className="letter__head">
                <span className="letter__who">
                  <span>{letter.username}</span>
                  <a href={`mailto:${letter.email}`}>{letter.email}</a>
                </span>
                <span className="label">{day(letter.createdAt)}</span>
              </div>
              <p className="letter__text">{letter.text}</p>
              <div className="letter__tools">
                {!letter.mayShow && <span className="label">private</span>}
                {letter.mayShow && !letter.shown && (
                  <button className="plain" onClick={() => show(letter.id, true)}>
                    show on the website
                  </button>
                )}
                {letter.shown && (
                  <>
                    <span className="letter__shown">
                      on the website <i className="dot" />
                    </span>
                    <button className="plain" onClick={() => show(letter.id, false)}>
                      take it off
                    </button>
                  </>
                )}
                {asking === letter.id ? (
                  <>
                    <button className="plain" onClick={() => remove(letter.id)}>
                      yes, delete it
                    </button>
                    <button className="plain" onClick={() => setAsking(null)}>
                      keep it
                    </button>
                  </>
                ) : (
                  <button className="plain" onClick={() => setAsking(letter.id)}>
                    delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
    <Players pass={pass} leave={leave} />
    </>
  );
}

// everyone who has reached the end of the road, newest first. A name nobody
// should have to read can be taken off the public board (and put back): the
// player's journeys and account are kept, only the board stops showing them.
function Players({ pass, leave }: { pass: string; leave: () => void }) {
  const [players, setPlayers] = useState<Player[] | null>(null);

  useEffect(() => {
    let here = true;
    fetch("/svc/leaderboard/admin/players", { headers: { Authorization: `Bearer ${pass}` } }).then(async (response) => {
      if (!here) return;
      if (response.ok) setPlayers(await response.json());
      else if (response.status === 401) leave();
      else setPlayers([]);
    });
    return () => {
      here = false;
    };
  }, [pass, leave]);

  async function hide(userId: string, hidden: boolean) {
    const response = await fetch(`/svc/leaderboard/admin/players/${userId}/hidden`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${pass}`, "Content-Type": "application/json" },
      body: JSON.stringify({ hidden }),
    });
    if (response.ok) setPlayers((all) => (all ?? []).map((player) => (player.userId === userId ? { ...player, hidden } : player)));
    else if (response.status === 401) leave();
  }

  return (
    <div className="part">
      <div className="part__head">
        <span className="label">{players === null ? "fetching…" : players.length === 1 ? "1 player on the board" : `${players.length} players on the board`}</span>
      </div>
      {players && players.length === 0 && <p className="board__empty">nobody has reached the end yet.</p>}
      {players && players.length > 0 && (
        <div className="letters">
          {players.map((player) => (
            <article key={player.userId} className="letter">
              <div className="letter__head">
                <span className="letter__who">
                  <span>{player.username}</span>
                  <span className="label">
                    {player.journeys === 1 ? "1 journey" : `${player.journeys} journeys`} · ♥ {player.kindest} · {clock(player.quickest)}
                  </span>
                </span>
                <span className="label">{day(player.lastArrived)}</span>
              </div>
              <div className="letter__tools">
                {player.hidden ? (
                  <>
                    <span className="letter__shown">hidden from the board</span>
                    <button className="plain" onClick={() => hide(player.userId, false)}>
                      show again
                    </button>
                  </>
                ) : (
                  <button className="plain" onClick={() => hide(player.userId, true)}>
                    hide from the board
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
