/**
 * The canonical week bucket, used by BOTH the weekly leaderboard and the
 * weekly puzzle board.
 *
 * This exists as one shared function on purpose. There were previously three
 * independent implementations — the client's leaderboard writer, the server's
 * score submitter, and the reward distributor — and they disagreed on both
 * the separator and the week number, which left the weekly leaderboard
 * permanently empty and weekly rewards unpaid. Anything that needs a week
 * identifier must import this rather than reimplementing the arithmetic.
 *
 * UTC-based: a local-time version puts players either side of midnight into
 * different buckets depending on timezone, splitting one leaderboard into
 * several.
 */
export function getWeekId(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / 86_400_000);
  const weekNumber = Math.ceil((days + startOfYear.getUTCDay() + 1) / 7);
  return `${year}_W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Stable numeric seed for a week id, so every player in a given week
 * generates the identical weekly board.
 */
export function weekIdSeed(weekId: string): number {
  let hash = 0;
  for (let i = 0; i < weekId.length; i++) {
    hash = (hash << 5) - hash + weekId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
