"use client";

// Your own page: who you are, the journeys you've finished, and the way out.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clock, day } from "@/lib/format";
import { type Entry, type Profile, deleteAccount, getMyEntries, getProfile, signOut, useSession } from "@/lib/session";
import Shuffle from "./Shuffle";

export default function Account() {
  const router = useRouter();
  const session = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [looked, setLooked] = useState(false);
  // deleting the account: asked for in two steps, the second with the password
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);

  useEffect(() => {
    let here = true;
    Promise.all([getProfile(), getMyEntries()]).then(([who, journeys]) => {
      if (!here) return;
      setProfile(who);
      setEntries(journeys);
      setLooked(true);
    });
    return () => {
      here = false;
    };
  }, []);

  // nobody signed in (or the sign-in has run out): to the door
  useEffect(() => {
    if (looked && !session) router.replace("/login");
  }, [looked, session, router]);

  const leave = () => {
    signOut();
    router.push("/");
  };

  async function remove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    setBusy(true);
    setWrong(null);
    const problem = await deleteAccount(password);
    setBusy(false);
    if (problem) setWrong(problem);
    else router.push("/");
  }

  const best = entries && entries.length ? Math.max(...entries.map((e) => e.score)) : null;

  return (
    <section className="page">
      <div className="page__top">
        <p className="label">your account</p>
        <h1 className="line">
          {session ? `${session.username}.` : "one moment."}
        </h1>
      </div>

      <div className="facts">
        <div className="fact">
          <span className="label">email</span>
          <strong>{profile?.email ?? "…"}</strong>
        </div>
        <div className="fact">
          <span className="label">set out on</span>
          <strong>{profile ? day(profile.createdAt) : "…"}</strong>
        </div>
        <div className="fact">
          <span className="label">journeys finished</span>
          <strong>{entries ? entries.length : "…"}</strong>
        </div>
        <div className="fact">
          <span className="label">kindest journey</span>
          <strong>{best !== null ? `♥ ${best}` : entries ? "none yet" : "…"}</strong>
        </div>
      </div>

      <div className="part">
        <div className="part__head">
          <span className="label">your journeys on the board</span>
          <button className="label" onClick={leave}>
            <Shuffle text="log out" />
          </button>
        </div>
        {entries && entries.length === 0 && <p className="board__empty">you haven&apos;t reached the end of the road yet.</p>}
        {entries && entries.length > 0 && (
          <table className="board">
            <thead>
              <tr>
                <th>arrived</th>
                <th className="num">kindness</th>
                <th className="num">time</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{day(entry.completedAt)}</td>
                  <td className="num">♥ {entry.score}</td>
                  <td className="num board__quiet">{clock(entry.completionTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <Link href="/play" className="box">
          <Shuffle text="play" />
          <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <div className="part" id="delete">
        <div className="part__head">
          <span className="label">delete your account</span>
        </div>
        <p className="text">
          this removes your account, your travelers and saved journeys, and your name from the leaderboard. it can&apos;t be undone.
        </p>
        {!deleting ? (
          <div>
            <button className="box" onClick={() => setDeleting(true)}>
              <Shuffle text="delete my account" />
            </button>
          </div>
        ) : (
          <form className="form form--narrow" onSubmit={remove}>
            <label className="field">
              <span className="label">your password, to be sure it&apos;s you</span>
              <input name="password" type="password" autoComplete="current-password" required autoFocus />
            </label>
            {wrong && (
              <p className="form__wrong" role="alert">
                {wrong}
              </p>
            )}
            <button className="box box--wide" disabled={busy}>
              <Shuffle text={busy ? "one moment" : "delete everything, for good"} />
            </button>
            <p className="form__other">
              <button type="button" className="plain" onClick={() => { setDeleting(false); setWrong(null); }}>
                <Shuffle text="no, keep my account" />
              </button>
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
