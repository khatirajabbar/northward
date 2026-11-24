"use client";

// The panel at the side of the bottom of every page, everything under each
// other: the time in the forest (Sweden's), at the desk (Baku's) and where
// the visitor is; how many have reached the end of the road (read off the
// leaderboard); whether the game is up; where it's made, and who's at the
// desk there.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStats } from "@/lib/stats";

const FOREST = "Europe/Stockholm";
const DESK_ZONE = "Asia/Baku";
const MADE_IN = "baku, az";
const DESK = ["1 person", "1 claude agent", "2 cats", "1 macbook"];

// the time somewhere, to the thousandth of a second if `fine`, and how far that place is from GMT
function timeIn(zone: string | undefined, date: Date, fine: boolean) {
  // hours, minutes and seconds are named one by one: asking for thousandths alone would give only those
  const time = date.toLocaleTimeString("en-GB", {
    timeZone: zone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    ...(fine ? { fractionalSecondDigits: 3 } : {}),
  });
  const offset = date.toLocaleTimeString("en-GB", { timeZone: zone, timeZoneName: "shortOffset" }).split(" ").pop() ?? "";
  return { time, offset: offset.toLowerCase() };
}

// three clocks: the forest's, the desk's, and the visitor's own
function now(fine: boolean) {
  const date = new Date();
  const yours = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return [
    { ...timeIn(FOREST, date, fine), where: "in the forest · sweden" },
    { ...timeIn(DESK_ZONE, date, fine), where: "at the desk · baku" },
    { ...timeIn(undefined, date, fine), where: `where you are · ${(yours ?? "somewhere").toLowerCase()}` },
  ];
}

export default function Status() {
  const stats = useStats();
  const [at, setAt] = useState<ReturnType<typeof now> | null>(null);

  // the clock runs to the thousandth of a second (to the second, for anyone
  // who has asked their device for less motion), and rests while the tab is hidden
  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      if (!document.hidden) setAt(now(!still));
    };
    const first = window.setTimeout(tick, 0);
    const every = window.setInterval(tick, still ? 1000 : 47);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, []);

  const facts: [string, React.ReactNode][] = [
    [
      "status",
      stats === undefined ? "…" : stats === null ? "out of reach" : (
        <>
          online <i className="dot" />
        </>
      ),
    ],
    ["the game", stats === null ? "resting" : "open"],
    ["location", MADE_IN],
  ];

  return (
    <section className="status" aria-label="the forest, right now">
      <div className="status__now">
        {(at ?? [{ time: "--:--:--", offset: "", where: "in the forest · sweden" }]).map((clock) => (
          <p key={clock.where}>
            &gt; <b>{clock.time}</b>{" "}
            <span>
              {clock.where}
              {clock.offset && `, ${clock.offset}`}
            </span>
          </p>
        ))}
        <p>
          &gt; <b>reached the end of the road: {stats ? stats.travelers : "…"}</b>{" "}
          <Link href="/leaderboard">[see who]</Link>
        </p>
      </div>
      <dl className="status__facts">
        {facts.map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="status__desk">
        <p>currently at the desk</p>
        <ul>
          {DESK.map((thing) => (
            <li key={thing}>{thing}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
