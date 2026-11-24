// The leaderboard, asked for by the site's server each time a page is opened.

export type BoardEntry = {
  id: string;
  username: string;
  characterType: string;
  score: number;
  completionTime: string; // "00:07:58"
  completedAt: string;
  rank: number | null;
};

const BOARD = process.env.LEADERBOARD_URL ?? "http://localhost:5003";

// null if the board can't be reached, so the page can say so instead of breaking.
// Published, the board may be asleep (render.yaml) and take up to a minute to
// wake: the page shows its "waiting" rows until then
export async function getTop(by: "scores" | "times", limit: number): Promise<BoardEntry[] | null> {
  try {
    const response = await fetch(`${BOARD}/api/leaderboard/top-${by}?limit=${limit}`, { signal: AbortSignal.timeout(55000) });
    if (!response.ok) return null;
    return (await response.json()) as BoardEntry[];
  } catch {
    return null;
  }
}
