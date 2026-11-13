"use client";

// The bar across the top, from one edge of the page to the other: the name,
// then each part of the site (a small drawing, its name, and the pages under
// it), a few words about the game, and the mark (the bird).
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/session";
import { Bird, DoorIcon, Pinwheel, Podium, Runner } from "./Icons";
import Name from "./Name";
import Shuffle from "./Shuffle";

type Part = {
  icon: React.ReactNode;
  title: string;
  href: string;
  links: { label: string; href?: string; press?: () => void }[];
};

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  const session = useSession();

  const leave = () => {
    signOut();
    router.push("/");
  };

  const parts: Part[] = [
    { icon: <Runner />, title: "play", href: "/play", links: [{ label: "enter the forest", href: "/play" }] },
    {
      icon: <Pinwheel />,
      title: "how to play",
      href: "/how-to-play",
      links: [
        { label: "the keys", href: "/how-to-play#keys" },
        { label: "good to know", href: "/how-to-play#notes" },
      ],
    },
    {
      icon: <Podium />,
      title: "leaderboard",
      href: "/leaderboard",
      links: [
        { label: "the kindest", href: "/leaderboard#kindest" },
        { label: "the quickest", href: "/leaderboard#quickest" },
      ],
    },
    session
      ? { icon: <DoorIcon />, title: session.username, href: "/account", links: [{ label: "your account", href: "/account" }, { label: "log out", press: leave }] }
      : { icon: <DoorIcon />, title: "account", href: "/login", links: [{ label: "log in", href: "/login" }, { label: "register", href: "/register" }] },
  ];

  return (
    <header className="nav">
      <Link href="/" className="nav__name" aria-label="northward, home">
        <Name />
      </Link>
      {parts.map((part) => (
        <div key={part.href} className="nav__part">
          <Link href={part.href} aria-hidden="true" tabIndex={-1}>
            {part.icon}
          </Link>
          <div>
            <Link href={part.href} className="nav__title">
              <Shuffle text={part.title} />
            </Link>
            <div className="nav__links">
              {part.links.map((link) =>
                link.href ? (
                  <Link key={link.label} href={link.href} className={`nav__link ${path === link.href ? "is-here" : ""}`}>
                    {link.label}
                  </Link>
                ) : (
                  <button key={link.label} className="nav__link" onClick={link.press}>
                    {link.label}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      ))}
      <p className="nav__about">
        a quiet adventure
        <br />
        through a swedish forest.
        <br />
        it plays in your browser.
        <br />
        no download, no account.
      </p>
      <Link href="/" className="nav__mark" aria-hidden="true" tabIndex={-1}>
        <Bird />
      </Link>
    </header>
  );
}
