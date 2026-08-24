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
 *
 * MUST stay byte-identical (body-wise) to `getClosingWeekId` and `weekIdFor`
 * in functions/src/social.ts.
 */
export function getWeekId(date: Date = new Date()): string {
  // Anchor to the Sunday that starts this week (weeks run Sunday–Saturday,
  // UTC) and number the week from the ANCHOR's year. For every week whose
  // Sunday falls inside the date's own year — i.e. all mid-year weeks — this
  // produces exactly the id the previous formula did, so live bucket ids do
  // not move. What changes is the year boundary: the old code restarted
  // numbering at Jan 1 regardless of weekday, splitting the week containing
  // Jan 1 into a short old-year bucket and a short `W01` bucket; the
  // Sunday-23:00 payout run (24h look-back to the closing week's Saturday)
  // could never name the old-year half, so every score in it went unrewarded,
  // and the weekly leaderboard + shared weekly board reset mid-week at
  // midnight Jan 1. Now Jan 1 through the first Saturday share the PRIOR
  // year's last bucket (e.g. Jan 1–3 2026 → `2025_W53`), every bucket spans
  // exactly 7 days, and the year's first bucket opens on its first Sunday
  // (numbered as before, so a given year's `W01` may simply never exist).
  const DAY_MS = 86_400_000;
  const utcMidnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const sunday = new Date(utcMidnight - date.getUTCDay() * DAY_MS);
  const year = sunday.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const days = Math.floor((sunday.getTime() - startOfYear.getTime()) / DAY_MS);
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
