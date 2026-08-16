/**
 * FORGIVENESS BENCHMARK — how often does a normal player get stuck?
 *
 * "Stuck" (remaining list words become untraceable) is one of only three
 * real fail states in Wordfall, and unlike a timeout it is invisible in
 * advance: nothing on screen tells the player which word must be cleared
 * first. Generation only guarantees that AT LEAST ONE solving order
 * exists, so a board can be technically solvable while being a coin flip
 * in practice.
 *
 * This simulates a naive-but-reasonable player: repeatedly trace a
 * uniformly random word that is currently findable. That is the honest
 * model of a first-time player who has not yet learned to plan around
 * gravity. The measured stuck rate is a direct proxy for "how often does
 * this game feel unfair".
 *
 * Run `STUCK_VERBOSE=1 npx jest stuckRate` for the per-level breakdown.
 */
import { generateBoard, generateDailyBoard, generateWeeklyBoard } from '../boardGenerator';
import { getLevelConfigExtended } from '../puzzleGenerator';
import { getChapterForLevel } from '../../data/chapters';
import { findWordInGrid, isDeadEnd } from '../solver';
import { removeCellsAndApplyGravity } from '../gravity';
import type { Grid } from '../../types';

const VERBOSE = !!process.env.STUCK_VERBOSE;

// Deterministic PRNG so the benchmark is reproducible run to run.
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
 * One clear-and-fall step, using the SAME engine helper the real game and
 * the solver use, so this benchmark cannot drift from actual gameplay.
 */
function clearWord(grid: Grid, word: string): Grid | null {
  const occurrences = findWordInGrid(grid, word, 1);
  if (occurrences.length === 0) return null;
  return removeCellsAndApplyGravity(grid, occurrences[0]);
}

interface PlayResult {
  stuck: boolean;
  cleared: number;
  total: number;
}

/** Play one board with random-but-legal choices. */
function playRandomly(grid: Grid, words: string[], rng: () => number): PlayResult {
  let current = grid;
  let remaining = [...words];
  const total = words.length;

  while (remaining.length > 0) {
    const findable = remaining.filter((w) => findWordInGrid(current, w, 1).length > 0);
    if (findable.length === 0) {
      return { stuck: true, cleared: total - remaining.length, total };
    }
    const pick = findable[Math.floor(rng() * findable.length)];
    const next = clearWord(current, pick);
    if (!next) return { stuck: true, cleared: total - remaining.length, total };
    current = next;
    remaining = remaining.filter((w) => w !== pick);
    if (remaining.length > 0 && isDeadEnd(current, remaining)) {
      return { stuck: true, cleared: total - remaining.length, total };
    }
  }
  return { stuck: false, cleared: total, total };
}

describe('stuck rate (player forgiveness)', () => {
  const PLAYTHROUGHS_PER_BOARD = 12;

  function measure(levels: number[]) {
    let stuckRuns = 0;
    let totalRuns = 0;
    const perLevel: Array<{ level: number; rate: number }> = [];

    for (const level of levels) {
      const config = getLevelConfigExtended(level);
      const chapter = getChapterForLevel(level);
      const board = generateBoard(
        config,
        level * 977 + 13,
        'classic',
        chapter?.profile,
        chapter?.themeWords,
      );
      const words = board.words.map((w) => w.word);
      const rng = makeRng(level * 31 + 7);

      let levelStuck = 0;
      for (let i = 0; i < PLAYTHROUGHS_PER_BOARD; i++) {
        const result = playRandomly(board.grid, words, rng);
        if (result.stuck) levelStuck++;
        totalRuns++;
      }
      stuckRuns += levelStuck;
      perLevel.push({ level, rate: levelStuck / PLAYTHROUGHS_PER_BOARD });
    }

    if (VERBOSE) {
      const worst = [...perLevel].sort((a, b) => b.rate - a.rate).slice(0, 10);
      // eslint-disable-next-line no-console
      console.log(
        `\noverall stuck rate: ${((stuckRuns / totalRuns) * 100).toFixed(1)}% ` +
          `(${stuckRuns}/${totalRuns})`,
      );
      // eslint-disable-next-line no-console
      console.log(
        `worst levels: ${worst
          .map((w) => `L${w.level}:${(w.rate * 100).toFixed(0)}%`)
          .join('  ')}`,
      );
    }
    return stuckRuns / totalRuns;
  }

  // These bounds are REGRESSION GUARDS pinned to measured behaviour, not
  // aspirations. Baseline before the generator's forgiveness gate existed:
  // 53% early / 80% mid, with several levels unwinnable by natural play.
  // See the note at the bottom of this file for why mid-game is still high.
  it('early game (levels 1-30) is forgiving', () => {
    const levels = Array.from({ length: 30 }, (_, i) => i + 1);
    const rate = measure(levels);
    expect(rate).toBeLessThan(0.20); // measured ~0.12, was ~0.53
  }, 180_000);

  it('mid game (levels 31-120) is not a coin flip', () => {
    const levels = Array.from({ length: 30 }, (_, i) => 31 + i * 3);
    const rate = measure(levels);
    expect(rate).toBeLessThan(0.65); // measured ~0.57, was ~0.80
  }, 180_000);
});

/**
 * REMAINING LIMITATION — mid/late game forgiveness.
 *
 * Two mechanisms now work together: placement prefers words in disjoint
 * COLUMNS (gravity acts per column, so column-disjoint words can never
 * disturb each other), and generation then prefers candidates that survive
 * random play. Together they took levels 1-30 from 53% stuck to ~12% and
 * 31-120 from 80% to ~57%.
 *
 * Mid/late game is still the weak spot, and it is a geometry problem: an
 * expert board asks for 7-8 words on a grid only 7-8 columns wide, so column
 * overlap is unavoidable and the placement heuristic runs out of room. The
 * remaining levers are design ones rather than generator ones — fewer words
 * on wider boards at expert tier, or making the stuck state cheap to recover
 * from (a free shuffle when genuinely dead-ended, rather than spending a
 * token). Worth an on-device play session before picking.
 */
describe('daily challenge fairness', () => {
  // The daily is the same board for every player and a core return hook, so
  // an unfair one is felt collectively and on the day it matters most —
  // there is no "just play a different level" escape valve.
  it('a year of daily boards is at least as fair as the curated game', () => {
    let stuck = 0;
    let runs = 0;
    const worst: Array<{ date: string; rate: number }> = [];

    for (let day = 0; day < 60; day++) {
      const date = new Date(Date.UTC(2026, 0, 1 + day * 6)).toISOString().split('T')[0];
      const board = generateDailyBoard(date);
      const words = board.words.map((w) => w.word);
      const rng = makeRng(day * 97 + 11);

      let dayStuck = 0;
      for (let i = 0; i < 8; i++) {
        if (playRandomly(board.grid, words, rng).stuck) dayStuck++;
        runs++;
      }
      stuck += dayStuck;
      worst.push({ date, rate: dayStuck / 8 });
    }

    if (VERBOSE) {
      const top = [...worst].sort((a, b) => b.rate - a.rate).slice(0, 6);
      // eslint-disable-next-line no-console
      console.log(
        `\ndaily stuck rate: ${((stuck / runs) * 100).toFixed(1)}% (${stuck}/${runs})`,
      );
      // eslint-disable-next-line no-console
      console.log(
        `worst dailies: ${top.map((d) => `${d.date}:${(d.rate * 100).toFixed(0)}%`).join('  ')}`,
      );
    }

    // Measured ~0.16 after the daily shops for the fairest candidate; it was
    // ~0.34 when it simply took the first board generated, with individual
    // days at 100% (unfinishable by natural play).
    expect(stuck / runs).toBeLessThan(0.25);
  }, 120_000);
});

describe('weekly challenge fairness', () => {
  // The weekly is the harshest shared board: one puzzle, one leaderboard,
  // seven days. If it's a coin flip, the player's only options are to eat the
  // loss or to not compete at all — and unlike a level they cannot retry into
  // a different board.
  it('a year of weekly boards is not a coin flip', () => {
    let stuck = 0;
    let runs = 0;
    const worst: Array<{ week: string; rate: number }> = [];

    for (let week = 1; week <= 52; week += 2) {
      const weekId = `2026_W${String(week).padStart(2, '0')}`;
      const board = generateWeeklyBoard(weekId);
      const words = board.words.map((w) => w.word);
      const rng = makeRng(week * 131 + 5);

      let weekStuck = 0;
      for (let i = 0; i < 8; i++) {
        if (playRandomly(board.grid, words, rng).stuck) weekStuck++;
        runs++;
      }
      stuck += weekStuck;
      worst.push({ week: weekId, rate: weekStuck / 8 });
    }

    if (VERBOSE) {
      const top = [...worst].sort((a, b) => b.rate - a.rate).slice(0, 6);
      // eslint-disable-next-line no-console
      console.log(
        `\nweekly stuck rate: ${((stuck / runs) * 100).toFixed(1)}% (${stuck}/${runs})`,
      );
      // eslint-disable-next-line no-console
      console.log(
        `worst weeks: ${top.map((w) => `${w.week}:${(w.rate * 100).toFixed(0)}%`).join('  ')}`,
      );
    }

    expect(stuck / runs).toBeLessThan(0.5);
  }, 180_000);
});

describe('forgiveness gate wiring', () => {
  it('is documented as a preference, not a hard requirement', () => {
    // Guard against someone turning the gate into an unconditional filter
    // again: generation must still succeed for every early level even if no
    // forgiving candidate is found within the attempt budget.
    for (const level of [1, 7, 13, 20, 27]) {
      const config = getLevelConfigExtended(level);
      const board = generateBoard(config, level * 101 + 5, 'classic');
      expect(board.words.length).toBeGreaterThanOrEqual(2);
    }
  }, 60_000);
});
