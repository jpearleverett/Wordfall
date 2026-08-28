/**
 * "BOARD IS STUCK" MUST BE TRUE WHEN THE GAME SAYS IT.
 *
 * isDeadEnd drives the stuck banner, the fail sting, the BGM duck, the stuck
 * haptic, the adaptive-difficulty failure record and the rescue offers. It is
 * therefore the one solver entry point that must not report a false negative
 * result in front of the player.
 *
 * It used to inherit solve()'s occurrenceLimit of 1 — a deliberate branching
 * trade that is correct for GENERATION, which can retry a seed when it guesses
 * wrong, but wrong for gameplay, where the player may trace ANY legal
 * occurrence of a word. A board whose only winning line runs through a word's
 * second or third trace was reported dead. Measured over real playthroughs: of
 * 32 boards isDeadEnd called dead, 7 (22%) were still winnable.
 *
 * isDeadEnd now confirms a dead verdict with a second, wider pass before
 * returning true. This suite pins the accuracy AND the latency, because the
 * check runs on the JS thread after every clear.
 */
import { generateLevelBoard } from '../boardGenerator';
import { getLevelConfigExtended } from '../puzzleGenerator';
import { getChapterForLevel } from '../../data/chapters';
import { findWordInGrid, isDeadEnd } from '../solver';
import { removeCellsAndApplyGravity } from '../gravity';
import type { Grid } from '../../types';

/** Exhaustive ground truth: every occurrence of every word, as the player sees it. */
function reallySolvable(grid: Grid, words: string[], depth = 0): boolean {
  if (words.length === 0) return true;
  if (depth > 12) return false;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    for (const pos of findWordInGrid(grid, w, 0)) {
      const rest = [...words.slice(0, i), ...words.slice(i + 1)];
      if (reallySolvable(removeCellsAndApplyGravity(grid, pos), rest, depth + 1)) return true;
    }
  }
  return false;
}

function makeRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One-ply lookahead, the repo's "thoughtful player", stopping when isDeadEnd fires. */
function playUntilStuck(grid: Grid, words: string[], rng: () => number) {
  let cur = grid;
  let remaining = [...words];
  const timings: number[] = [];
  while (remaining.length > 0) {
    const findable = remaining.filter((w) => findWordInGrid(cur, w, 1).length > 0);
    if (findable.length === 0) return { grid: cur, remaining, stuck: false, timings };
    let best = findable[0];
    let bestSurvivors = -1;
    for (const cand of findable) {
      const occ = findWordInGrid(cur, cand, 1);
      if (!occ.length) continue;
      const after = removeCellsAndApplyGravity(cur, occ[0]);
      const survivors = remaining
        .filter((w) => w !== cand)
        .filter((w) => findWordInGrid(after, w, 1).length > 0).length;
      if (survivors > bestSurvivors || (survivors === bestSurvivors && cand.length < best.length)) {
        bestSurvivors = survivors;
        best = cand;
      }
    }
    if (bestSurvivors < 0) best = findable[Math.floor(rng() * findable.length)];
    cur = removeCellsAndApplyGravity(cur, findWordInGrid(cur, best, 1)[0]);
    remaining = remaining.filter((w) => w !== best);
    if (remaining.length > 0) {
      const t0 = Date.now();
      const dead = isDeadEnd(cur, remaining);
      timings.push(Date.now() - t0);
      if (dead) return { grid: cur, remaining, stuck: true, timings };
    }
  }
  return null;
}

describe('isDeadEnd does not declare winnable boards dead', () => {
  it('every stuck verdict is a real dead end', () => {
    let verdicts = 0;
    let falsePositives = 0;
    const allTimings: number[] = [];
    const examples: string[] = [];

    for (let level = 30; level <= 300; level += 2) {
      const config = getLevelConfigExtended(level);
      const chapter = getChapterForLevel(level);
      for (let k = 0; k < 3; k++) {
        let board;
        try {
          board = generateLevelBoard(level, config, level * 977 + 13 + k * 100003, 'classic', chapter?.profile, chapter?.themeWords);
        } catch {
          continue;
        }
        const words = board.words.map((w) => w.word);
        const res = playUntilStuck(board.grid, words, makeRng(level * 31 + 7 + k));
        if (!res) continue;
        allTimings.push(...res.timings);
        if (!res.stuck) continue;
        verdicts++;
        if (reallySolvable(res.grid, res.remaining)) {
          falsePositives++;
          if (examples.length < 5) {
            examples.push(`L${level} seed ${level * 977 + 13 + k * 100003}: remaining [${res.remaining.join(',')}]`);
          }
        }
      }
    }

    allTimings.sort((a, b) => a - b);
    const p95 = allTimings[Math.floor(allTimings.length * 0.95)] ?? 0;
    // eslint-disable-next-line no-console
    console.log(`\n${verdicts} stuck verdicts, ${falsePositives} of them false`);
    // eslint-disable-next-line no-console
    console.log(`isDeadEnd latency over ${allTimings.length} calls: p95 ${p95}ms, max ${allTimings[allTimings.length - 1]}ms`);
    examples.forEach((e) => console.log('  FALSE: ' + e));

    // Guard the guard — no verdicts means nothing was measured.
    expect(verdicts).toBeGreaterThan(5);
    expect(falsePositives).toBe(0);

    // The check runs on the JS thread after every clear (debounced by
    // SOLVER_QUIET_MS), so a slow one is a stalled board. The confirmation
    // pass is only paid on boards about to be called dead, so the p95 across
    // ALL calls should stay small.
    expect(p95).toBeLessThan(120);
  }, 900_000);
});
