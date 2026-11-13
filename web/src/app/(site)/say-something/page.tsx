import type { Metadata } from "next";
import SaySomething from "@/components/SaySomething";

export const metadata: Metadata = { title: "say something" };

export default function Page() {
  return (
    <section className="page">
      <div className="door">
        <div className="page__top">
          <p className="label">say something</p>
          <h1 className="line">tell us what you think.</h1>
          <p className="text">something you liked, something that broke, something you wish was there. it goes straight to the person who made the game.</p>
        </div>
        <SaySomething />
      </div>
    </section>
  );
}
