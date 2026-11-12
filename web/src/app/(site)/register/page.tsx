import type { Metadata } from "next";
import Door from "@/components/Door";

export const metadata: Metadata = { title: "register" };

export default function Page() {
  return (
    <section className="page">
      <div className="door">
        <div className="page__top">
          <p className="label">register</p>
          <h1 className="line">
            pack a bag.
          </h1>
          <p className="text">an account keeps your journey between visits, and puts your name on the board when you reach the end.</p>
        </div>
        <Door mode="register" />
      </div>
    </section>
  );
}
