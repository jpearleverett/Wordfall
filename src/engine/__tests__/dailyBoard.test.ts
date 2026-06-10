/**
 * Locks in the daily-board determinism contract:
 *  - Two calls with the same date produce the same grid + words.
 *  - Different dates produce different boards (overwhelmingly likely).
 *  - The seed derivation is pure over the date string.
 *
 * These are the guarantees a global daily-challenge leaderboard relies
 * on: every player on a given UTC date plays the same puzzle, so
 * scores are comparable.
 */
import { generateDailyBoard, dailyBoardSeed, getDailyVariant } from '../boardGenerator';

describe('dailyBoardSeed', () => {
  it('is deterministic over a fixed date string', () => {
    const a = dailyBoardSeed('2026-04-21');
    const b = dailyBoardSeed('2026-04-21');
    expect(a).toBe(b);
  });

  it('diverges for different dates', () => {
    const a = dailyBoardSeed('2026-04-21');
    const b = dailyBoardSeed('2026-04-22');
    expect(a).not.toBe(b);
  });

  it('returns a non-negative integer', () => {
    const s = dailyBoardSeed('2026-04-21');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(s)).toBe(true);
  });
});

describe('generateDailyBoard', () => {
  it('returns an identical board for the same date (determinism)', () => {
    const a = generateDailyBoard('2026-04-21');
    const b = generateDailyBoard('2026-04-21');

    const gridA = a.grid.map((row) => row.map((c) => c?.letter ?? '.').join(''));
    const gridB = b.grid.map((row) => row.map((c) => c?.letter ?? '.').join(''));
    expect(gridA).toEqual(gridB);

    const wordsA = a.words.map((w) => w.word).sort();
    const wordsB = b.words.map((w) => w.word).sort();
    expect(wordsA).toEqual(wordsB);
  });

  it('returns a different board for a different date', () => {
    const a = generateDailyBoard('2026-04-21');
    const b = generateDailyBoard('2026-04-22');

    const gridA = a.grid.map((row) => row.map((c) => c?.letter ?? '.').join(''));
    const gridB = b.grid.map((row) => row.map((c) => c?.letter ?? '.').join(''));
    expect(gridA).not.toEqual(gridB);
  });

  it('matches the weekday variant config (2026-04-21 is a Tuesday)', () => {
    const board = generateDailyBoard('2026-04-21');
    expect(board.words.length).toBe(5);
    expect(board.config.rows).toBe(7);
    expect(board.config.cols).toBe(6);
  });

  it('weekday variants rotate the daily texture', () => {
    // 2026-04-19 Sunday .. 2026-04-25 Saturday
    const dates = ['2026-04-19', '2026-04-20', '2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24', '2026-04-25'];
    const variants = dates.map((d) => getDailyVariant(d));
    expect(variants.map((v) => v.name)).toEqual([
      'Zen Garden', 'Word Flood', 'Classic Daily', 'Long Haul', 'Tall Tower', 'Big Board', 'Weekend Special',
    ]);
    // Each variant generates a valid board with its declared word count
    // (allow the generator's -1 fallback under placement strain).
    for (const d of dates) {
      const board = generateDailyBoard(d);
      const expected = getDailyVariant(d).config.wordCount;
      expect(board.words.length).toBeGreaterThanOrEqual(expected - 1);
    }
  });

  it('falls back to the classic variant for unparseable dates', () => {
    expect(getDailyVariant('garbage').name).toBe('Classic Daily');
  });
});
