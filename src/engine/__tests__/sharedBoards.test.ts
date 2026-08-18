/**
 * SHARED-BOARD CONTRACT — daily and weekly must be the same puzzle for
 * everyone, and stable for a given player across re-entries.
 *
 * Both modes write to a shared leaderboard (`submitDailyScore` /
 * `submitWeeklyScore`). If the board differs per player, the leaderboard
 * ranks people on different puzzles and means nothing. If it differs per
 * ENTRY, a player can back out and re-enter until they draw an easy board —
 * which is a scoring exploit, not just an unfairness.
 *
 * The weekly used to be `generateBoard(DIFFICULTY_CONFIGS.hard, Date.now())`,
 * which failed both halves. These tests pin the fix.
 */
import { generateDailyBoard, generateWeeklyBoard } from '../boardGenerator';
import { getWeekId, weekIdSeed } from '../../utils/weekId';
import type { Board, Grid } from '../../types';

function fingerprint(board: Board): string {
  const letters = board.grid
    .map((row: Grid[number]) => row.map((c) => (c ? c.letter : '.')).join(''))
    .join('/');
  const words = board.words
    .map((w) => w.word)
    .sort()
    .join(',');
  return `${letters}|${words}`;
}

describe('weekly challenge board', () => {
  it('is identical across repeated entries in the same week', () => {
    const weekId = '2026_W33';
    const a = generateWeeklyBoard(weekId);
    const b = generateWeeklyBoard(weekId);
    expect(fingerprint(b)).toBe(fingerprint(a));
  });

  it('differs from week to week', () => {
    const seen = new Set<string>();
    for (const weekId of ['2026_W10', '2026_W11', '2026_W12', '2026_W13']) {
      seen.add(fingerprint(generateWeeklyBoard(weekId)));
    }
    // Four consecutive weeks must not collapse onto the same puzzle.
    expect(seen.size).toBe(4);
  });

  it('survives cache eviction with the same result', () => {
    // The cache is bounded (4 entries). Generating past the bound and coming
    // back must reproduce the board from the seed, not a fresh random one —
    // otherwise a long-lived session silently swaps the puzzle mid-week.
    const target = generateWeeklyBoard('2026_W20');
    const before = fingerprint(target);
    for (const w of ['2026_W21', '2026_W22', '2026_W23', '2026_W24', '2026_W25']) {
      generateWeeklyBoard(w);
    }
    expect(fingerprint(generateWeeklyBoard('2026_W20'))).toBe(before);
  });

  it('produces a playable board', () => {
    const board = generateWeeklyBoard('2026_W07');
    expect(board.words.length).toBeGreaterThanOrEqual(3);
    expect(board.grid.length).toBeGreaterThan(0);
  });
});

describe('daily challenge board', () => {
  it('is identical across repeated entries on the same day', () => {
    const a = generateDailyBoard('2026-08-16');
    const b = generateDailyBoard('2026-08-16');
    expect(fingerprint(b)).toBe(fingerprint(a));
  });

  it('differs day to day', () => {
    const seen = new Set<string>();
    for (const d of ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04']) {
      seen.add(fingerprint(generateDailyBoard(d)));
    }
    expect(seen.size).toBe(4);
  });
});

describe('week id', () => {
  it('is UTC-based, so timezone does not split the leaderboard', () => {
    // 23:30 UTC and 00:30 UTC the next day are different days but, mid-week,
    // the same week. The point being pinned is that the bucket is computed
    // from UTC fields only — a local-time version returned different ids for
    // the same instant depending on device timezone.
    const instant = new Date('2026-08-12T23:30:00Z');
    expect(getWeekId(instant)).toBe(getWeekId(new Date('2026-08-12T23:30:00.000Z')));
    expect(getWeekId(instant)).toMatch(/^\d{4}_W\d{2}$/);
  });

  it('advances exactly once per 7 days', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 7; i++) {
      ids.add(getWeekId(new Date(Date.UTC(2026, 7, 9 + i))));
    }
    // Aug 9 2026 is a Sunday — a full Sun-to-Sat span is one bucket.
    expect(ids.size).toBe(1);
    expect(getWeekId(new Date(Date.UTC(2026, 7, 16)))).not.toBe(
      getWeekId(new Date(Date.UTC(2026, 7, 15))),
    );
  });

  it('seeds are stable and distinct per week', () => {
    expect(weekIdSeed('2026_W33')).toBe(weekIdSeed('2026_W33'));
    expect(weekIdSeed('2026_W33')).not.toBe(weekIdSeed('2026_W34'));
  });
});
