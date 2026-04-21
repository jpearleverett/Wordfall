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
import { generateDailyBoard, dailyBoardSeed } from '../boardGenerator';

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

  it('produces a board with 5 words (daily config)', () => {
    const board = generateDailyBoard('2026-04-21');
    expect(board.words.length).toBe(5);
    expect(board.config.rows).toBe(7);
    expect(board.config.cols).toBe(6);
  });
});
