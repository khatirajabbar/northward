import Link from "next/link";
import Nav from "@/components/Nav";

// Every page but the play page: the bar on top, one small row underneath.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
      <footer className="foot label">
        <span>northward © 2026</span>
        <span>a game by khatira jabbarli</span>
        <Link href="/credits">credits</Link>
      </footer>
    </>
  );
}
