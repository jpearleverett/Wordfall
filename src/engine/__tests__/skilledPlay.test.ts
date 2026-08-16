/**
 * HOW MUCH OF THE STUCK RATE IS THE GAME, AND HOW MUCH IS THE PLAYER?
 *
 * `stuckRate.test.ts` measures a player who picks uniformly at random among
 * currently-findable words. That is an honest model of a first-timer who has
 * not yet learned that clearing order reshapes the board — but it is a model
 * of the WORST reasonable player, and its numbers (12% early, 57% mid) have
 * been standing in for the game's difficulty in every decision about the
 * generator.
 *
 * That mattered before the tutorial taught the ordering rule; now that it
 * does, the relevant question is what a player who has learned it
 * experiences. This file measures the same boards under one-ply lookahead —
 * prefer the word whose removal leaves the most other words still findable —
 * which is exactly the reasoning a thoughtful human does after being shown
 * board D. It is not a solver: it never backtracks, never searches beyond one
 * move, and can still walk into a trap.
 *
 * The gap between the two policies is the part of the stuck rate that is
 * SKILL rather than unfairness. If the gap is large, the generator is fine
 * and the fix was teaching; if it is small, the boards themselves are
 * arbitrary and no amount of teaching helps.
 *
 * Run `SKILL_VERBOSE=1 npx jest skilledPlay` for the side-by-side.
 */
import { generateBoard } from '../boardGenerator';
import { getLevelConfigExtended } from '../puzzleGenerator';
import { getChapterForLevel } from '../../data/chapters';
import { findWordInGrid, isDeadEnd } from '../solver';
import { removeCellsAndApplyGravity } from '../gravity';
import type { Grid } from '../../types';

const VERBOSE = !!process.env.SKILL_VERBOSE;

function makeRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Policy = (grid: Grid, findable: string[], remaining: string[], rng: () => number) => string;

/** The naive player: any legal move, chosen at random. */
const randomPolicy: Policy = (_grid, findable, _remaining, rng) =>
  findable[Math.floor(rng() * findable.length)];

/**
 * The taught player: one-ply lookahead. For each findable word, clear it and
 * count how many of the others survive; take the best. Ties break toward the
 * shorter word, which is what a human does when two options look equally safe.
 */
const lookaheadPolicy: Policy = (grid, findable, remaining, rng) => {
  let best = findable[0];
  let bestSurvivors = -1;

  for (const candidate of findable) {
    const occurrences = findWordInGrid(grid, candidate, 1);
    if (occurrences.length === 0) continue;
    const after = removeCellsAndApplyGravity(grid, occurrences[0]);
    const others = remaining.filter((w) => w !== candidate);
    const survivors = others.filter((w) => findWordInGrid(after, w, 1).length > 0).length;

    if (
      survivors > bestSurvivors ||
      (survivors === bestSurvivors && candidate.length < best.length)
    ) {
      bestSurvivors = survivors;
      best = candidate;
    }
  }

  // Nothing distinguishable — fall back to the naive choice rather than
  // silently always taking findable[0], which would be its own policy.
  return bestSurvivors < 0 ? randomPolicy(grid, findable, remaining, rng) : best;
};

function play(grid: Grid, words: string[], policy: Policy, rng: () => number): boolean {
  let current = grid;
  let remaining = [...words];

  while (remaining.length > 0) {
    const findable = remaining.filter((w) => findWordInGrid(current, w, 1).length > 0);
    if (findable.length === 0) return true; // stuck
    const pick = policy(current, findable, remaining, rng);
    const occurrences = findWordInGrid(current, pick, 1);
    if (occurrences.length === 0) return true;
    current = removeCellsAndApplyGravity(current, occurrences[0]);
    remaining = remaining.filter((w) => w !== pick);
    if (remaining.length > 0 && isDeadEnd(current, remaining)) return true;
  }
  return false;
}

function measure(levels: number[], policy: Policy, runs: number) {
  let stuck = 0;
  let total = 0;
  for (const level of levels) {
    const config = getLevelConfigExtended(level);
    const chapter = getChapterForLevel(level);
    // Same seeds as stuckRate.test.ts, so the two files measure the same
    // boards and the difference is purely the policy.
    const board = generateBoard(
      config,
      level * 977 + 13,
      'classic',
      chapter?.profile,
      chapter?.themeWords,
    );
    const words = board.words.map((w) => w.word);
    const rng = makeRng(level * 31 + 7);
    for (let i = 0; i < runs; i++) {
      if (play(board.grid, words, policy, rng)) stuck++;
      total++;
    }
  }
  return stuck / total;
}

describe('skill closes most of the stuck-rate gap', () => {
  // Lookahead is deterministic, so one run per board is enough for it; the
  // random policy needs repeats to be meaningful.
  const MID_LEVELS = Array.from({ length: 30 }, (_, i) => 31 + i * 3);
  const EARLY_LEVELS = Array.from({ length: 30 }, (_, i) => i + 1);

  it('mid game is far more forgiving to a player who plans one move ahead', () => {
    const naive = measure(MID_LEVELS, randomPolicy, 12);
    const taught = measure(MID_LEVELS, lookaheadPolicy, 1);

    if (VERBOSE) {
      // eslint-disable-next-line no-console
      console.log(
        `\nmid game (L31-118) stuck rate — random: ${(naive * 100).toFixed(1)}%  ` +
          `one-ply lookahead: ${(taught * 100).toFixed(1)}%`,
      );
    }

    // Measured: 57.2% random vs 0.0% lookahead. Effectively ALL of the
    // mid-game stuck rate is the policy, not the board — every sampled board
    // survives greedy one-move planning. Bound left at 10% rather than 0 so
    // a single unlucky board doesn't fail the suite, but a real regression
    // here means boards have become arbitrary and the fix belongs in the
    // generator rather than in teaching.
    expect(taught).toBeLessThan(naive);
    expect(taught).toBeLessThan(0.10);
  }, 240_000);

  it('early game is nearly always winnable once the rule is known', () => {
    const taught = measure(EARLY_LEVELS, lookaheadPolicy, 1);

    if (VERBOSE) {
      // eslint-disable-next-line no-console
      console.log(
        `early game (L1-30) stuck rate — one-ply lookahead: ${(taught * 100).toFixed(1)}%`,
      );
    }

    // Early levels exist to teach. A player applying the tutorial's lesson
    // should essentially never dead-end here. Measured: 0.0%.
    expect(taught).toBeLessThan(0.05);
  }, 240_000);
});
