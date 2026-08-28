/**
 * A PLAYABLE, WATCHABLE RUN OF AN ACTUAL LEVEL.
 *
 * `stuckRate` and `skilledPlay` both play real boards, but they only ever
 * report an aggregate percentage — you cannot see a puzzle being solved, so
 * you cannot tell a board that solves cleanly from one that solves by luck.
 * This file plays the same boards through the same engine and renders each
 * move: the trace, the cells it clears, and where gravity drops the survivors.
 *
 * It is the closest thing the repo has to "watch someone play level N"
 * without a device, and it is the only harness that will show you a grid.
 *
 *   npx jest playthrough                      # assert the sampled levels win
 *   PLAY_VERBOSE=1 npx jest playthrough       # ...and print every move
 *   PLAY_LEVEL=137 npx jest playthrough       # play one level, always verbose
 *
 * The player is `skilledPlay.test.ts`'s one-ply lookahead policy, not a
 * solver: it never backtracks and can still walk into a trap. That is
 * deliberate — a level that needs deeper search than this to survive is a
 * level a thoughtful human loses, which is what the assertion is guarding.
 */
import { generateLevelBoard } from '../boardGenerator';
import { getLevelConfigExtended } from '../puzzleGenerator';
import { getChapterForLevel } from '../../data/chapters';
import { findWordInGrid, isDeadEnd } from '../solver';
import { removeCellsAndApplyGravity } from '../gravity';
import type { CellPosition, Grid } from '../../types';

const SINGLE = process.env.PLAY_LEVEL ? Number(process.env.PLAY_LEVEL) : null;
const VERBOSE = !!process.env.PLAY_VERBOSE || SINGLE !== null;

/** Deterministic RNG — same generator the other engine benchmarks use. */
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
 * Render the grid. Cells on `highlight` are bracketed, holes are `.`, so a
 * trace and the empty space it will leave are both legible in plain text.
 */
function render(grid: Grid, highlight: CellPosition[] = []): string {
  const marked = new Set(highlight.map((p) => `${p.row},${p.col}`));
  return grid
    .map((row, r) =>
      row
        .map((cell, c) => {
          const letter = cell ? cell.letter : '.';
          return marked.has(`${r},${c}`) ? `[${letter}]` : ` ${letter} `;
        })
        .join(''),
    )
    .join('\n');
}

/** Two grids side by side, so a fall is one glance rather than two. */
function sideBySide(left: string, right: string, gap = '     '): string {
  const l = left.split('\n');
  const r = right.split('\n');
  const width = Math.max(...l.map((s) => s.length));
  return l
    .map((line, i) => line.padEnd(width) + gap + (r[i] ?? ''))
    .join('\n');
}

interface PlayResult {
  won: boolean;
  moves: string[];
  stuckWith: string[];
}

/**
 * One-ply lookahead: of the words findable right now, take the one whose
 * removal leaves the most others still findable. Ties break toward the
 * shorter word. Lifted from skilledPlay.test.ts so both files measure the
 * same player.
 */
function pick(grid: Grid, findable: string[], remaining: string[], rng: () => number): string {
  let best = findable[0];
  let bestSurvivors = -1;

  for (const candidate of findable) {
    const occurrences = findWordInGrid(grid, candidate, 1);
    if (occurrences.length === 0) continue;
    const after = removeCellsAndApplyGravity(grid, occurrences[0]);
    const others = remaining.filter((w) => w !== candidate);
    const survivors = others.filter((w) => findWordInGrid(after, w, 1).length > 0).length;
    if (survivors > bestSurvivors || (survivors === bestSurvivors && candidate.length < best.length)) {
      bestSurvivors = survivors;
      best = candidate;
    }
  }

  return bestSurvivors < 0 ? findable[Math.floor(rng() * findable.length)] : best;
}

function play(grid: Grid, words: string[], rng: () => number, log: (s: string) => void): PlayResult {
  let current = grid;
  let remaining = [...words];
  const moves: string[] = [];

  while (remaining.length > 0) {
    const findable = remaining.filter((w) => findWordInGrid(current, w, 1).length > 0);
    if (findable.length === 0) {
      log(`\n  STUCK — no remaining word can be traced. Left: ${remaining.join(', ')}`);
      return { won: false, moves, stuckWith: remaining };
    }

    const word = pick(current, findable, remaining, rng);
    const path = findWordInGrid(current, word, 1)[0];
    const before = render(current, path);
    current = removeCellsAndApplyGravity(current, path);
    moves.push(word);
    remaining = remaining.filter((w) => w !== word);

    log(
      `\n  ${moves.length}. ${word}  (${path.length} cells)   ${remaining.length} word${
        remaining.length === 1 ? '' : 's'
      } left${remaining.length === 1 ? '   <- last-word tension' : ''}`,
    );
    log(sideBySide(before, render(current)));

    if (remaining.length > 0 && isDeadEnd(current, remaining)) {
      log(`\n  DEAD END — the board can no longer be finished. Left: ${remaining.join(', ')}`);
      return { won: false, moves, stuckWith: remaining };
    }
  }

  return { won: true, moves, stuckWith: [] };
}

function playLevel(level: number, log: (s: string) => void): PlayResult {
  const config = getLevelConfigExtended(level);
  const chapter = getChapterForLevel(level);
  const board = generateLevelBoard(
    level,
    config,
    level * 977 + 13,
    'classic',
    chapter?.profile,
    chapter?.themeWords,
  );
  const words = board.words.map((w) => w.word);

  log(
    `\n=== LEVEL ${level} — ${chapter?.name ?? 'procedural'} ` +
      `(${config.difficulty}, ${board.grid.length}x${board.grid[0].length}) ===`,
  );
  log(`  find: ${words.join(', ')}`);
  log('');
  log(render(board.grid));

  return play(board.grid, words, makeRng(level * 31 + 7), log);
}

/* eslint-disable no-console */
const emit = VERBOSE ? (s: string) => console.log(s) : () => {};

describe('a real level plays through end to end', () => {
  // Spread across the curve: tutorial, early, the L31 regime change, mid,
  // late curated, and past L600 where chapters go procedural.
  const LEVELS = SINGLE !== null ? [SINGLE] : [1, 5, 25, 60, 150, 400, 900];

  it.each(LEVELS)('level %i is winnable by a player who plans one move ahead', (level) => {
    const lines: string[] = [];
    const result = playLevel(level, (s) => lines.push(s));
    if (VERBOSE) emit(lines.join('\n'));

    if (!result.won) {
      // A loss is the interesting case, so print the run even when quiet —
      // an aggregate pass/fail would tell you nothing about why.
      console.log(lines.join('\n'));
    }

    expect(result.stuckWith).toEqual([]);
    expect(result.won).toBe(true);
  }, 120_000);
});
