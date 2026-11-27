"use client";

// The way in: one form that either signs you in or makes you an account.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { register, signIn, useSession } from "@/lib/session";
import Shuffle from "./Shuffle";

export default function Door({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const session = useSession();
  const [wrong, setWrong] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const joining = mode === "register";

  // already in? then there's nothing to do here
  useEffect(() => {
    if (session) router.replace("/account");
  }, [session, router]);

  async function enter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim();
    const password = String(data.get("password"));
    setBusy(true);
    setWrong(null);
    const problem = joining ? await register(String(data.get("username")).trim(), email, password) : await signIn(email, password);
    setBusy(false);
    if (problem) setWrong(problem);
  }

  return (
    <form className="form" onSubmit={enter}>
      {joining && (
        <label className="field">
          <span className="label">traveler&apos;s name</span>
          <input name="username" autoComplete="username" required minLength={3} maxLength={20} />
          <span className="field__hint">the name the leaderboard will show: 3 to 20 letters or numbers (spaces and - _ . are fine too).</span>
        </label>
      )}
      <label className="field">
        <span className="label">email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        <span className="label">password</span>
        <input name="password" type="password" autoComplete={joining ? "new-password" : "current-password"} required minLength={joining ? 8 : undefined} />
        {joining && <span className="field__hint">8 characters or more.</span>}
      </label>
      {wrong && (
        <p className="form__wrong" role="alert">
          {wrong}
        </p>
      )}
      <button className="box box--wide" disabled={busy}>
        <Shuffle text={busy ? "one moment" : joining ? "register" : "log in"} />
        <span aria-hidden="true">↗</span>
      </button>
      <p className="form__other">
        {joining ? (
          <>
            been here before? <Link href="/login">log in</Link>
          </>
        ) : (
          <>
            first time in the forest? <Link href="/register">register</Link>
          </>
        )}
      </p>
    </form>
  );
}
