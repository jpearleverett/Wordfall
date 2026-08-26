/**
 * Weekend tournament — window math and bracket determinism. The window is
 * Friday 17:00 UTC → Sunday 22:00 UTC; brackets hash uid+weekend into one
 * of N buckets so a player's leaderboard holds ~100 people, per the
 * PeopleFun bracket-size finding this feature is built on.
 */
const mockNumbers = new Map<string, number>();

jest.mock('../../services/remoteConfig', () => ({
  getRemoteBoolean: (): boolean => true,
  getRemoteNumberClamped: (key: string, fallback: number, min: number, max: number): number => {
    const v = mockNumbers.get(key) ?? fallback;
    return Math.max(min, Math.min(max, v));
  },
}));

import {
  getWeekendWindow,
  tournamentBracket,
  tournamentEventId,
} from '../weekendTournament';

beforeEach(() => mockNumbers.clear());

describe('getWeekendWindow', () => {
  // 2026-08-28 is a Friday.
  it('opens Friday 17:00 UTC and closes Sunday 22:00 UTC', () => {
    expect(getWeekendWindow(new Date('2026-08-28T16:59:00Z')).active).toBe(false);
    expect(getWeekendWindow(new Date('2026-08-28T17:00:00Z')).active).toBe(true);
    expect(getWeekendWindow(new Date('2026-08-29T12:00:00Z')).active).toBe(true); // Saturday
    expect(getWeekendWindow(new Date('2026-08-30T21:59:00Z')).active).toBe(true); // Sunday
    expect(getWeekendWindow(new Date('2026-08-30T22:00:00Z')).active).toBe(false);
    expect(getWeekendWindow(new Date('2026-09-01T12:00:00Z')).active).toBe(false); // Tuesday
  });

  it('keeps one stable weekendId for the whole window', () => {
    const sat = getWeekendWindow(new Date('2026-08-29T03:00:00Z'));
    const sun = getWeekendWindow(new Date('2026-08-30T20:00:00Z'));
    expect(sat.weekendId).toBe('2026-08-28');
    expect(sun.weekendId).toBe('2026-08-28');
  });

  it('points at the NEXT Friday once the window closes', () => {
    const after = getWeekendWindow(new Date('2026-08-31T12:00:00Z')); // Monday
    expect(after.active).toBe(false);
    expect(new Date(after.nextStartsAt).toISOString()).toBe('2026-09-04T17:00:00.000Z');
  });
});

describe('bracket assignment', () => {
  it('is deterministic for a uid+weekend and varies across weekends', () => {
    const a1 = tournamentBracket('uid_alpha', '2026-08-28');
    const a2 = tournamentBracket('uid_alpha', '2026-08-28');
    expect(a1).toBe(a2);
    const ids = new Set(
      Array.from({ length: 6 }, (_, i) => tournamentBracket('uid_alpha', `2026-0${i + 1}-02`)),
    );
    expect(ids.size).toBeGreaterThan(1);
  });

  it('spreads a population roughly evenly over the buckets', () => {
    mockNumbers.set('tournamentBracketCount', 8);
    const counts = new Array(8).fill(0);
    for (let i = 0; i < 800; i++) {
      counts[tournamentBracket(`uid_${i}`, '2026-08-28')]++;
    }
    for (const c of counts) {
      expect(c).toBeGreaterThan(50); // 100 expected; catastrophic skew fails
      expect(c).toBeLessThan(150);
    }
  });

  it('event ids carry the weekend and bucket', () => {
    mockNumbers.set('tournamentBracketCount', 8);
    const id = tournamentEventId('uid_alpha', '2026-08-28');
    expect(id).toMatch(/^tournament_2026-08-28_b[0-7]$/);
  });
});
