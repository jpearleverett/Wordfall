/**
 * THE SHARED BOARDS MUST NOT FREEZE THE SCREEN, AND MUST BE IDENTICAL FOR
 * EVERYONE.
 *
 * Daily and weekly boards are generated synchronously on the JS thread, so a
 * slow date is a frozen screen for every player in the world who opens the
 * daily that day. They are also the one surface where determinism is
 * load-bearing: two players on the same date must get the same board or the
 * shared leaderboard is meaningless. That rules out a wall-clock timeout as
 * the bound (a slow device would generate a different board than a fast one),
 * so the bound has to be deterministic — attempts and node budgets.
 *
 * The cost was never the disabled wall-clock guard. It was the same
 * forgiveness search running TWICE, nested: shopFairestBoard scores every
 * candidate it receives, while generateBoard was independently hunting for a
 * forgiving board inside each candidate and discarding up to twelve boards to
 * produce the one the shop would then score. Removing the inner tranche on the
 * deterministic path makes a candidate cost one generation instead of
 * thirteen, which both bounds the time and buys the shop many more
 * independently-scored seeds.
 */
import { generateDailyBoard, generateWeeklyBoard } from '../boardGenerator';
import { findWordInGrid, isDeadEnd } from '../solver';
import { removeCellsAndApplyGravity } from '../gravity';
import type { Grid } from '../../types';

/** Dates across a full year, including 2026-11-02 (the measured worst case). */
function datesAcrossAYear(): string[] {
  const out: string[] = ['2026-11-02'];
  for (let m = 1; m <= 12; m++) {
    for (const d of [1, 7, 13, 19, 25]) {
      out.push(`2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
  }
  return out;
}

describe('shared board generation stays inside a synchronous budget', () => {
  it('no daily board blocks the JS thread for long', () => {
    const timings: number[] = [];
    for (const date of datesAcrossAYear()) {
      const t0 = Date.now();
      const board = generateDailyBoard(date);
      timings.push(Date.now() - t0);
      expect(board.words.length).toBeGreaterThan(0);
    }
    timings.sort((a, b) => a - b);
    const p50 = timings[Math.floor(timings.length * 0.5)];
    const p99 = timings[Math.floor(timings.length * 0.99)];
    const max = timings[timings.length - 1];
    // eslint-disable-next-line no-console
    console.log(`\ndaily over ${timings.length} dates: p50 ${p50}ms, p99 ${p99}ms, max ${max}ms`);
    // Level load is synchronous, so this is frozen-screen time. Measured
    // before the fix: p99 2120ms, max 3553ms on 2026-11-02.
    expect(max).toBeLessThan(1500);
  }, 900_000);

  it('no weekly board blocks the JS thread for long', () => {
    const timings: number[] = [];
    for (let w = 1; w <= 52; w += 3) {
      const id = `2026_W${String(w).padStart(2, '0')}`;
      const t0 = Date.now();
      const board = generateWeeklyBoard(id);
      timings.push(Date.now() - t0);
      expect(board.words.length).toBeGreaterThan(0);
    }
    timings.sort((a, b) => a - b);
    // eslint-disable-next-line no-console
    console.log(`weekly over ${timings.length} weeks: p50 ${timings[Math.floor(timings.length / 2)]}ms, max ${timings[timings.length - 1]}ms`);
    expect(timings[timings.length - 1]).toBeLessThan(1500);
  }, 900_000);

  it('the same date always produces the same board', () => {
    // Determinism is what makes a global daily leaderboard meaningful. Cell
    // ids legitimately differ (newCellId is random per process); the grid
    // letters and the find-list must not.
    for (const date of ['2026-11-02', '2026-03-07', '2027-01-19']) {
      const a = generateDailyBoard(date);
      const b = generateDailyBoard(date);
      expect(a.words.map((w) => w.word)).toEqual(b.words.map((w) => w.word));
      expect(a.grid.map((r) => r.map((c) => c?.letter ?? '.').join(''))).toEqual(
        b.grid.map((r) => r.map((c) => c?.letter ?? '.').join('')),
      );
    }
  }, 300_000);
});

/**
 * A POISONED OPENING ON A SHARED BOARD IS EVERYONE'S PROBLEM.
 *
 * shopFairestBoard optimises one number — estimateForgiveness — and never
 * asked whether the move a thoughtful player is most likely to make first is
 * fatal. On a daily that matters more than anywhere else: every player in the
 * world gets the same board, nobody can reroll it, and the leaderboard is
 * per-date.
 *
 * "Poisoned" here means the strictest version: an opening that ties for the
 * BEST one-ply score — the most other words still traceable afterwards, which
 * is exactly what the tutorial teaches a player to look for — and is
 * nonetheless a proven dead end.
 *
 * Measured over 72 dates: 2 poisoned (2.8%) at the old 16-attempt / 0.6
 * forgiveness shop, 0 at the 24-attempt / 0.85 one. Raising the bar removed
 * them, which is what you would expect — 0.85 forgiveness means most clear
 * orders succeed — but nothing was ASSERTING it, so this pins the property
 * rather than the parameter.
 */
function hasPoisonedTopOpening(grid: Grid, words: string[]): boolean {
  const scored: { word: string; survivors: number; after: Grid }[] = [];
  let best = -1;
  for (const word of words) {
    const occ = findWordInGrid(grid, word, 1);
    if (occ.length === 0) continue;
    const after = removeCellsAndApplyGravity(grid, occ[0]);
    const survivors = words
      .filter((w) => w !== word)
      .filter((w) => findWordInGrid(after, w, 1).length > 0).length;
    scored.push({ word, survivors, after });
    if (survivors > best) best = survivors;
  }
  return scored
    .filter((s) => s.survivors === best)
    .some((s) => isDeadEnd(s.after, words.filter((w) => w !== s.word)));
}

describe('shared boards do not punish the obvious opening', () => {
  it('no daily has a top-scoring opening that is a proven dead end', () => {
    const poisoned: string[] = [];
    let checked = 0;
    for (let m = 1; m <= 12; m++) {
      for (const d of [2, 6, 11, 16, 21, 26]) {
        const date = `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        let board;
        try { board = generateDailyBoard(date); } catch { continue; }
        checked++;
        if (hasPoisonedTopOpening(board.grid, board.words.map((w) => w.word))) poisoned.push(date);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`\ndaily: ${poisoned.length}/${checked} with a poisoned top opening${poisoned.length ? ' — ' + poisoned.join(', ') : ''}`);
    expect(checked).toBeGreaterThan(50);
    expect(poisoned).toEqual([]);
  }, 900_000);

  it('no weekly has one either', () => {
    const poisoned: string[] = [];
    let checked = 0;
    for (let w = 1; w <= 52; w += 2) {
      const id = `2026_W${String(w).padStart(2, '0')}`;
      let board;
      try { board = generateWeeklyBoard(id); } catch { continue; }
      checked++;
      if (hasPoisonedTopOpening(board.grid, board.words.map((x) => x.word))) poisoned.push(id);
    }
    // eslint-disable-next-line no-console
    console.log(`weekly: ${poisoned.length}/${checked} with a poisoned top opening`);
    expect(checked).toBeGreaterThan(20);
    expect(poisoned).toEqual([]);
  }, 900_000);
});
