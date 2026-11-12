import type { Metadata } from "next";
import Door from "@/components/Door";

export const metadata: Metadata = { title: "log in" };

export default function Page() {
  return (
    <section className="page">
      <div className="door">
        <div className="page__top">
          <p className="label">log in</p>
          <h1 className="line">
            welcome back.
          </h1>
          <p className="text">your journeys are where you left them.</p>
        </div>
        <Door mode="login" />
      </div>
    </section>
  );
}
