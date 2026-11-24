"use client";

// What travelers said: messages their writers agreed to have shown, chosen on
// the admin page. Until there's at least one, this isn't on the page at all.
import Link from "next/link";
import { useEffect, useState } from "react";
import { day } from "@/lib/format";

type Word = { id: string; username: string; text: string; createdAt: string };

export default function Words() {
  const [words, setWords] = useState<Word[]>([]);

  useEffect(() => {
    let here = true;
    fetch("/svc/messages/shown")
      .then((response) => (response.ok ? response.json() : []))
      .then((all: Word[]) => {
        if (here) setWords(all);
      })
      .catch(() => {});
    return () => {
      here = false;
    };
  }, []);

  if (words.length === 0) return null;

  return (
    <section className="words">
      <div className="part__head">
        <span className="label">what travelers said</span>
        <Link href="/say-something" className="label">
          say something
        </Link>
      </div>
      <div className="words__all">
        {words.map((word) => (
          <figure key={word.id} className="word">
            <blockquote>{word.text}</blockquote>
            <figcaption className="label">
              {word.username} · {day(word.createdAt)}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
