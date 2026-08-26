/**
 * Weekend Tournament — Fri-Sun appointment competition in ~100-player
 * brackets, PeopleFun's best-evidenced retention lever (+20% LTV from
 * launch, +8% more from tuning bracket size 50→100; 100→250 regressed —
 * players buried on a huge leaderboard disengage).
 *
 * Pure module: window math and deterministic bracket assignment. The
 * competition itself rides the shipped per-event leaderboard rails —
 * submitEventScore / getEventLeaderboard / EventLeaderboardCard — with the
 * bracket id as the event id, so every solve in the window ranks the
 * player against only their bracket.
 *
 * Bracket sizing: the client cannot count concurrent players, so the dial
 * is BUCKET COUNT (RC `tournamentBracketCount`): uid hashes into one of N
 * buckets per weekend, making expected bracket size ≈ weekend actives / N.
 * Tune N as DAU moves to hold ~100 per bracket.
 */
import { getRemoteBoolean, getRemoteNumberClamped } from '../services/remoteConfig';

export interface WeekendWindow {
  active: boolean;
  /** Stable id for the weekend, keyed by the Friday's UTC date. */
  weekendId: string;
  /** Epoch ms when the current/most recent window ends. */
  endsAt: number;
  /** Epoch ms when the next window starts (for countdown teasers). */
  nextStartsAt: number;
}

/** Window: Friday 17:00 UTC → Sunday 22:00 UTC (Wordscapes' proven slot). */
const START_DAY = 5; // Friday
const START_HOUR_UTC = 17;
const END_DAY = 0; // Sunday
const END_HOUR_UTC = 22;

function mostRecentFridayStart(now: Date): Date {
  const d = new Date(now);
  d.setUTCHours(START_HOUR_UTC, 0, 0, 0);
  let delta = d.getUTCDay() - START_DAY;
  if (delta < 0) delta += 7;
  if (delta === 0 && now.getTime() < d.getTime()) delta = 7;
  d.setUTCDate(d.getUTCDate() - delta);
  return d;
}

export function getWeekendWindow(now: Date = new Date()): WeekendWindow {
  const start = mostRecentFridayStart(now);
  const end = new Date(start);
  // Friday 17:00 → Sunday 22:00 is +2 days +5 hours.
  end.setUTCDate(end.getUTCDate() + 2);
  end.setUTCHours(END_HOUR_UTC, 0, 0, 0);
  void END_DAY;
  const active = now.getTime() >= start.getTime() && now.getTime() < end.getTime();
  const nextStart = new Date(start);
  if (!active && now.getTime() >= end.getTime()) {
    nextStart.setUTCDate(nextStart.getUTCDate() + 7);
  }
  return {
    active,
    weekendId: start.toISOString().slice(0, 10),
    endsAt: end.getTime(),
    nextStartsAt: nextStart.getTime(),
  };
}

/** Deterministic 32-bit string hash (FNV-1a). */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function tournamentBracketCount(): number {
  return getRemoteNumberClamped('tournamentBracketCount', 32, 1, 4096);
}

/** Bucket index for a uid this weekend — stable across the whole window. */
export function tournamentBracket(uid: string, weekendId: string): number {
  return hash32(`${weekendId}:${uid}`) % tournamentBracketCount();
}

/**
 * The event id the bracket's leaderboard lives under. Everything downstream
 * (submitEventScore, getEventLeaderboard, the server-side maxPlausibleScore
 * event scope) treats it as an ordinary event id.
 */
export function tournamentEventId(uid: string, weekendId: string): string {
  return `tournament_${weekendId}_b${tournamentBracket(uid, weekendId)}`;
}

export function weekendTournamentEnabled(): boolean {
  return getRemoteBoolean('weekendTournamentEnabled');
}
