import Link from "next/link";
import Nav from "@/components/Nav";
import Status from "@/components/Status";
import Ticker from "@/components/Ticker";

// Every page but the play page: the bar on top with the thin typed line under
// it; at the bottom, the ways around the site with the status panel beside
// them, and one small row.

const WAYS = [
  {
    title: "the game",
    links: [
      { label: "play", href: "/play" },
      { label: "how to play", href: "/how-to-play" },
      { label: "leaderboard", href: "/leaderboard" },
    ],
  },
  {
    title: "more",
    links: [
      { label: "say something", href: "/say-something" },
      { label: "credits", href: "/credits" },
    ],
  },
];
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="strip glass">
        <Ticker />
      </div>
      <main>{children}</main>
      <footer className="foot">
        <div className="foot__main">
          <nav className="foot__ways" aria-label="the site">
            {WAYS.map((way) => (
              <div key={way.title} className="foot__way">
                <h2>{way.title}</h2>
                {way.links.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <Status />
        </div>
        <div className="foot__row label">
          <span>northward © 2026</span>
          <span>a game by khatira jabbarli</span>
        </div>
      </footer>
    </>
  );
}
