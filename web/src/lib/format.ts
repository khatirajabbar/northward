// Small helpers for showing times and dates from the leaderboard.

// "00:07:58" → "7:58", "01:02:03" → "1:02:03"
export function clock(time: string): string {
  const [h, m, s] = time.split(".")[0].split(":").map(Number);
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

export function day(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).toLowerCase();
}
