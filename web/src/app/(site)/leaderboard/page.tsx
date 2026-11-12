import type { Metadata } from "next";
import { Suspense } from "react";
import Board, { BoardWaiting } from "@/components/Board";

export const metadata: Metadata = { title: "leaderboard" };

export default function Leaderboard() {
  return (
    <section className="page">
      <div className="page__top">
        <p className="label">leaderboard</p>
        <h1 className="line">
          everyone who reached the end of the road.
        </h1>
      </div>
      <div className="split">
        <div className="part" id="kindest">
          <div className="part__head">
            <span className="label">01 / the kindest</span>
          </div>
          <Suspense fallback={<BoardWaiting rows={8} />}>
            <Board by="scores" limit={20} dates />
          </Suspense>
        </div>
        <div className="part" id="quickest">
          <div className="part__head">
            <span className="label">02 / the quickest</span>
          </div>
          <Suspense fallback={<BoardWaiting rows={8} />}>
            <Board by="times" limit={20} dates />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
