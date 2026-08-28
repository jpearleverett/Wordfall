/**
 * EVERY MODE'S LEVEL LOAD MUST STAY INSIDE THE SYNCHRONOUS BUDGET, AND
 * SHRINKINGBOARD MUST SHIP THE LIST ITS CURVE ASKS FOR.
 *
 * boardGen.perf pins classic. These are the two modes that were outside it.
 *
 * EXPERT: selectWords hard-filtered the pool to words of length >= 5 for
 * GameMode 'expert'. The same file already documents that an all-5/6 letter
 * find-list is "the slowest placement config the generator faces (~10x
 * generation cost)" and had already replaced it with a BIAS for the
 * dictionaryTier path — the GameMode branch never got the same treatment.
 * Level load is synchronous on the JS thread, so its 2.4s tail was a frozen
 * screen with no spinner between tapping Play and seeing the board.
 *
 * SHRINKINGBOARD: the mode caps its find-list to what the shrink schedule can
 * survive, via floor((shortSide - MIN_SHRINK_CORE) / 2) shrink phases. At
 * MIN_SHRINK_CORE = 5 a short side of 8 floored to ONE phase instead of two —
 * 4 words instead of 6 — and a short side of 8 is exactly what a 6-column
 * config pads to. That is the curated tall-narrow chapter (every 4th, forever)
 * and the tail's narrow silhouette, so the shipped word count tracked the
 * grid's column count rather than the difficulty curve.
 */
import { generateLevelBoard } from '../boardGenerator';
import { getLevelConfigExtended } from '../puzzleGenerator';
import { isSolvableShrinkingBoard } from '../solver';
import type { GameMode } from '../../types';

function percentiles(times: number[]) {
  const t = [...times].sort((a, b) => a - b);
  const at = (q: number) => t[Math.min(t.length - 1, Math.floor(t.length * q))];
  return { p50: at(0.5), p95: at(0.95), p99: at(0.99), max: t[t.length - 1] };
}

function sweep(mode: GameMode, from: number, to: number, step: number) {
  const times: number[] = [];
  const wordCounts: number[] = [];
  for (let level = from; level <= to; level += step) {
    const config = getLevelConfigExtended(level);
    const t0 = Date.now();
    try {
      const board = generateLevelBoard(level, config, level * 977 + 13, mode);
      wordCounts.push(board.words.length);
    } catch {
      wordCounts.push(0);
    }
    times.push(Date.now() - t0);
  }
  return { times, wordCounts, ...percentiles(times) };
}

describe('per-mode level load stays inside the synchronous budget', () => {
  it('expert does not stall', () => {
    const r = sweep('expert', 22, 600, 4);
    // eslint-disable-next-line no-console
    console.log(`\nexpert n=${r.times.length} p50=${r.p50}ms p95=${r.p95}ms p99=${r.p99}ms max=${r.max}ms`);
    // Same ceiling boardGen.perf holds classic to. Before the fix: max 2366ms.
    expect(r.max).toBeLessThan(1500);
    expect(r.p95).toBeLessThan(900);
  }, 900_000);

  it('the heaviest procedural tail configs do not stall in expert', () => {
    const r = sweep('expert', 900, 1400, 7);
    // eslint-disable-next-line no-console
    console.log(`expert tail n=${r.times.length} p50=${r.p50}ms p95=${r.p95}ms max=${r.max}ms`);
    expect(r.max).toBeLessThan(1500);
  }, 900_000);
});

describe('shrinkingBoard ships the list its curve asks for', () => {
  it('word count tracks the curve, not the column count', () => {
    const r = sweep('shrinkingBoard', 1, 201, 1);
    const hist: Record<number, number> = {};
    for (const n of r.wordCounts) hist[n] = (hist[n] || 0) + 1;
    // eslint-disable-next-line no-console
    console.log(`\nshrinkingBoard L1-201 word-count histogram: ${JSON.stringify(hist)}`);
    // eslint-disable-next-line no-console
    console.log(`shrinkingBoard n=${r.times.length} p50=${r.p50}ms p95=${r.p95}ms max=${r.max}ms`);

    // Before the fix, 48 of 201 boards shipped 4 words because their config
    // asked for 6 columns. The oscillation is the defect, not the value.
    expect(hist[4] ?? 0).toBeLessThan(20);
    // The mode has its own generous ceiling in boardGen.perf.
    expect(r.max).toBeLessThan(2500);
  }, 900_000);

  it('every generated board is still solvable under the shrink rule', () => {
    // Raising the word cap must not buy word count at the cost of solvability
    // — the mode eats the outer ring every two words, so a longer list is a
    // strictly harder constraint.
    let checked = 0;
    for (let level = 5; level <= 200; level += 5) {
      const config = getLevelConfigExtended(level);
      let board;
      try { board = generateLevelBoard(level, config, level * 977 + 13, 'shrinkingBoard'); }
      catch { continue; }
      checked++;
      expect(isSolvableShrinkingBoard(board.grid, board.words.map((w) => w.word), 2, 2000)).toBe(true);
    }
    expect(checked).toBeGreaterThan(20);
  }, 900_000);
});
