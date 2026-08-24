/**
 * Week-bucket formula guards.
 *
 * The shared week id (client src/utils/weekId.ts + `getClosingWeekId` /
 * `weekIdFor` in functions/src/social.ts) previously restarted numbering at
 * Jan 1 regardless of weekday, splitting the week containing Jan 1 into a
 * short old-year bucket and a short `W01` bucket. The Sunday-23:00
 * distributeWeeklyRewards run (24h look-back to the closing week's Saturday)
 * could never name the old-year half — every score in it went unrewarded —
 * and the weekly leaderboard + shared weekly board reset mid-week at
 * midnight Jan 1. These tests pin the Sunday-anchored replacement:
 *   1. every bucket spans exactly 7 days and starts on a Sunday (UTC);
 *   2. every bucket is eventually named by a Sunday-23:00 payout run;
 *   3. mid-year ids are byte-identical to the old formula, so live
 *      production bucket ids did not move at the cutover.
 */

import { getWeekId, weekIdSeed } from '../weekId';

const DAY_MS = 86_400_000;

/** The pre-fix formula (Jan-1 reset), kept here to pin id stability. */
function legacyWeekId(date: Date): string {
  const year = date.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / DAY_MS);
  const weekNumber = Math.ceil((days + startOfYear.getUTCDay() + 1) / 7);
  return `${year}_W${String(weekNumber).padStart(2, '0')}`;
}

/** First Sunday on/after the given UTC date. */
function firstSundayOnOrAfter(utcMs: number): number {
  const d = new Date(utcMs);
  return utcMs + ((7 - d.getUTCDay()) % 7) * DAY_MS;
}

describe('getWeekId — Sunday-anchored week buckets', () => {
  // Sunday 2025-06-01 through Saturday four years on: covers four year
  // boundaries (2025→26 … 2028→29), including a Jan 1 on almost every
  // weekday.
  const start = firstSundayOnOrAfter(Date.UTC(2025, 5, 1));
  const totalWeeks = 4 * 52 + 10;
  const end = start + totalWeeks * 7 * DAY_MS; // exclusive; lands on a Sunday

  it('every bucket spans exactly 7 consecutive days starting on a Sunday (UTC)', () => {
    const spans = new Map<string, { first: number; count: number }>();
    const order: string[] = [];
    for (let t = start; t < end; t += DAY_MS) {
      const id = getWeekId(new Date(t + 12 * 3_600_000)); // UTC noon
      const span = spans.get(id);
      if (!span) {
        spans.set(id, { first: t, count: 1 });
        order.push(id);
      } else {
        span.count += 1;
      }
    }
    expect(order.length).toBe(totalWeeks);
    for (const id of order) {
      const span = spans.get(id)!;
      expect(span.count).toBe(7);
      expect(new Date(span.first).getUTCDay()).toBe(0); // Sunday
    }
    // No bucket id repeats after its 7-day run (the map would have merged a
    // non-contiguous repeat into count > 7, caught above).
  });

  it('every bucket is named by a Sunday-23:00 payout run (24h look-back)', () => {
    const observed = new Set<string>();
    for (let t = start; t < end; t += DAY_MS) {
      observed.add(getWeekId(new Date(t + 12 * 3_600_000)));
    }
    const paid = new Set<string>();
    // Runs fire Sunday 23:00 UTC; each names getWeekId(run − 24h) — the
    // closing week's Saturday. Include one run past the range end so the
    // final full bucket gets its run.
    for (let run = start + 23 * 3_600_000; run <= end + 23 * 3_600_000; run += 7 * DAY_MS) {
      paid.add(getWeekId(new Date(run - DAY_MS)));
    }
    for (const id of observed) {
      expect(paid.has(id)).toBe(true);
    }
  });

  it('matches the legacy formula for every mid-year week (live ids stable)', () => {
    for (let t = start; t < end; t += DAY_MS) {
      const date = new Date(t + 12 * 3_600_000);
      const sunday = new Date(t - new Date(t).getUTCDay() * DAY_MS);
      if (sunday.getUTCFullYear() === date.getUTCFullYear()) {
        // Week's anchor Sunday is in the date's own year — the id must be
        // exactly what the old formula produced.
        expect(getWeekId(date)).toBe(legacyWeekId(date));
      }
    }
  });

  it('keeps the week containing Jan 1 as one 7-day prior-year bucket', () => {
    // Sun Dec 28 2025 – Sat Jan 3 2026 is a single 2025_W53 bucket…
    expect(getWeekId(new Date(Date.UTC(2025, 11, 28)))).toBe('2025_W53');
    expect(getWeekId(new Date(Date.UTC(2025, 11, 31)))).toBe('2025_W53');
    expect(getWeekId(new Date(Date.UTC(2026, 0, 1)))).toBe('2025_W53');
    expect(getWeekId(new Date(Date.UTC(2026, 0, 3)))).toBe('2025_W53');
    // …and the payout run of Sun Jan 4 23:00 (look-back to Sat Jan 3)
    // names exactly that bucket.
    expect(getWeekId(new Date(Date.UTC(2026, 0, 4, 23) - DAY_MS))).toBe('2025_W53');
    // 2026 then opens on its first Sunday. Its `W01` simply never exists —
    // documented and fine (ids only need to be stable + unique, not dense).
    expect(getWeekId(new Date(Date.UTC(2026, 0, 4)))).toBe('2026_W02');
  });

  it('weekIdSeed stays deterministic per id and distinct across neighbors', () => {
    expect(weekIdSeed('2025_W53')).toBe(weekIdSeed('2025_W53'));
    expect(weekIdSeed('2025_W53')).not.toBe(weekIdSeed('2026_W02'));
  });
});
