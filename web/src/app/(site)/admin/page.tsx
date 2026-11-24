import type { Metadata } from "next";
import Admin from "@/components/Admin";
import Path from "@/components/Path";

// not linked from anywhere, and search engines are asked to leave it alone
export const metadata: Metadata = { title: "admin", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <section className="page">
      <div className="page__top">
        <Path to="admin" />
        <h1 className="line">what players wrote.</h1>
      </div>
      <Admin />
    </section>
  );
}
