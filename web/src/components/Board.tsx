// The leaderboard as a table. `by` is what it's sorted on, so that column comes first.
import { getTop } from "@/lib/board";
import { clock, day } from "@/lib/format";

export default async function Board({ by, limit, dates = false }: { by: "scores" | "times"; limit: number; dates?: boolean }) {
  const entries = await getTop(by, limit);

  if (entries === null) return <p className="board__empty">the board can&apos;t be reached right now. come back in a little while.</p>;
  if (entries.length === 0) return <p className="board__empty">nobody has reached the end of the road yet.</p>;

  return (
    <table className="board">
      <thead>
        <tr>
          <th>#</th>
          <th>traveler</th>
          <th className="num">{by === "scores" ? "kindness" : "time"}</th>
          <th className="num">{by === "scores" ? "time" : "kindness"}</th>
          {dates && <th className="num hide-small">arrived</th>}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, i) => (
          <tr key={entry.id}>
            <td className="board__rank">{String(entry.rank ?? i + 1).padStart(2, "0")}</td>
            <td>{entry.username}</td>
            <td className="num">{by === "scores" ? `♥ ${entry.score}` : clock(entry.completionTime)}</td>
            <td className="num board__quiet">{by === "scores" ? clock(entry.completionTime) : `♥ ${entry.score}`}</td>
            {dates && <td className="num board__quiet hide-small">{day(entry.completedAt)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// what stands in its place for the moment before the board arrives
export function BoardWaiting({ rows }: { rows: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
