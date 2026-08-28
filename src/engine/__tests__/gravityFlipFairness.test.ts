/**
 * GRAVITYFLIP MUST BE WINNABLE BY A PLAYER WHO PLANS ONE MOVE AHEAD.
 *
 * Gravity turns a quarter turn after every clear, so the second clear slides
 * every ROW sideways and a vertically placed word is sheared by the holes to
 * its right. Each additional word both adds another rotation and adds another
 * thing to break, so the damage compounds in WORD COUNT and almost nothing
 * else — measured on a fixed 8x7 board: 3 words 3.7% dead-end, 4 words 13.1%,
 * 5 words 33.1%, 6 words 49.4%, 7 words 75.6%, with grid size barely moving
 * the curve.
 *
 * getLevelConfigExtended hands every level past ~31 a 7-word list and
 * gravityFlip received it unmodified, so the mode dead-ended a taught player
 * roughly 79% of the time against classic's ~4.5% on the same levels.
 *
 * Neither of the generator's fairness mechanisms can help: stackingPenalty
 * scores shared COLUMNS (anti-correlated here — column-disjoint words share
 * rows, and rows are what horizontal gravity shears), and checkSolvability
 * returns for gravityFlip before the forgiveness gate runs. Filtering was
 * measured and rejected: 152 of 200 boards score exactly 0 forgiveness under
 * rotating gravity and re-seeding does not change it. Capping the list is the
 * only lever that moves the number.
 */
import { generateLevelBoard } from '../boardGenerator';
import { getLevelConfigExtended } from '../puzzleGenerator';
import { findWordInGrid, isDeadEndGravityFlip } from '../solver';
import { removeCellsAndApplyGravityInDirection } from '../gravity';
import type { Grid, GravityDirection } from '../../types';

const CYCLE: GravityDirection[] = ['down', 'right', 'up', 'left'];

function makeRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One-ply lookahead under ROTATING gravity. Same policy as skilledPlay's, but
 * every simulated clear uses the current phase and advances it — running this
 * with downward gravity would produce confident nonsense.
 */
function playsThroughGravityFlip(grid: Grid, words: string[], rng: () => number): boolean {
  let cur = grid;
  let remaining = [...words];
  let phase = 0;
  while (remaining.length > 0) {
    const dir = CYCLE[phase % 4];
    const findable = remaining.filter((w) => findWordInGrid(cur, w, 1).length > 0);
    if (findable.length === 0) return false;
    let best = findable[0];
    let bestSurvivors = -1;
    for (const cand of findable) {
      const occ = findWordInGrid(cur, cand, 1);
      if (!occ.length) continue;
      const after = removeCellsAndApplyGravityInDirection(cur, occ[0], dir);
      const survivors = remaining
        .filter((w) => w !== cand)
        .filter((w) => findWordInGrid(after, w, 1).length > 0).length;
      if (survivors > bestSurvivors) { bestSurvivors = survivors; best = cand; }
    }
    if (bestSurvivors < 0) best = findable[Math.floor(rng() * findable.length)];
    cur = removeCellsAndApplyGravityInDirection(cur, findWordInGrid(cur, best, 1)[0], dir);
    remaining = remaining.filter((w) => w !== best);
    phase++;
    if (remaining.length > 0 && isDeadEndGravityFlip(cur, remaining, CYCLE[phase % 4])) return false;
  }
  return true;
}

describe('gravityFlip is playable by a taught player', () => {
  it('one-ply lookahead wins the large majority of boards', () => {
    let played = 0;
    let lost = 0;
    let maxWords = 0;
    for (let level = 5; level <= 600; level += 5) {
      const config = getLevelConfigExtended(level);
      let board;
      try { board = generateLevelBoard(level, config, level * 977 + 13, 'gravityFlip'); }
      catch { continue; }
      const words = board.words.map((w) => w.word);
      maxWords = Math.max(maxWords, words.length);
      played++;
      if (!playsThroughGravityFlip(board.grid, words, makeRng(level * 31 + 7))) lost++;
    }
    // eslint-disable-next-line no-console
    console.log(`\ngravityFlip: ${lost}/${played} dead-ended under one-ply lookahead (${(100 * lost / played).toFixed(1)}%), max find-list ${maxWords}`);

    expect(played).toBeGreaterThan(50);
    // The cap is what makes this achievable; before it the rate was ~79%.
    expect(maxWords).toBeLessThanOrEqual(4);
    expect(lost / played).toBeLessThan(0.25);
  }, 900_000);

  it('classic on the same levels is unaffected by the cap', () => {
    // The cap must be scoped to gravityFlip only — classic keeps its full
    // find-list, which is the whole progression curve.
    let maxWords = 0;
    for (let level = 100; level <= 600; level += 50) {
      const config = getLevelConfigExtended(level);
      const board = generateLevelBoard(level, config, level * 977 + 13, 'classic');
      maxWords = Math.max(maxWords, board.words.length);
    }
    expect(maxWords).toBeGreaterThan(4);
  }, 600_000);
});
