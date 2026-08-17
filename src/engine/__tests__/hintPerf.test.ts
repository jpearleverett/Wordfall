/**
 * HINT LATENCY — pressing the hint button must not freeze the board.
 *
 * Hints are computed synchronously on the JS thread the moment the player
 * taps, mid-puzzle, so a slow hint is a frozen app rather than a slow one —
 * the same failure mode the board-generation budget exists for.
 *
 * The mode-aware hints added on this branch are the reason to measure. The
 * generic getHint runs a bounded solve, but getHintNoGravity enumerates up to
 * 50 paths PER WORD and then backtracks over the combinations looking for a
 * non-overlapping assignment, and getHintGravityFlip falls through to a
 * rotating backtracking solve when its three cheap orderings miss. Both are
 * correct — that was the point of adding them — but correctness bought with
 * an unbounded search would just move the problem.
 *
 * Bounds are wall-clock on a fast machine. Hermes on a mid-range Android
 * device is roughly an order of magnitude slower, so the ceilings here are
 * set well below what would actually be perceptible, leaving headroom rather
 * than pinning the current number.
 *
 * Run with HINT_PERF_VERBOSE=1 to print the distributions.
 */
import { generateBoard } from '../boardGenerator';
import { getHint, getHintNoGravity, getHintGravityFlip } from '../solver';
import type { BoardConfig, GameMode, GravityDirection } from '../../types';

const VERBOSE = !!process.env.HINT_PERF_VERBOSE;

/** The heaviest shape the generator produces: 8 words on a small grid. */
const HEAVY: BoardConfig = {
  rows: 8,
  cols: 7,
  wordCount: 8,
  minWordLength: 3,
  maxWordLength: 6,
  difficulty: 'expert',
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
}

function report(label: string, timings: number[]) {
  const sorted = [...timings].sort((a, b) => a - b);
  const line =
    `${label}: n=${sorted.length} p50=${percentile(sorted, 50)}ms ` +
    `p95=${percentile(sorted, 95)}ms max=${sorted[sorted.length - 1]}ms`;
  if (VERBOSE) {
    // eslint-disable-next-line no-console
    console.log(line);
  }
  return { sorted, line };
}

/** Time a hint on the FULL word list, which is the worst case for each mode. */
function measure(
  mode: GameMode,
  compute: (board: ReturnType<typeof generateBoard>) => unknown,
): { sorted: number[]; line: string } {
  const timings: number[] = [];
  for (let seed = 1; seed <= 40; seed++) {
    let board;
    try {
      board = generateBoard(HEAVY, seed * 421 + 17, mode);
    } catch {
      continue;
    }
    const started = Date.now();
    compute(board);
    timings.push(Date.now() - started);
  }
  return report(mode, timings);
}

describe('hint latency stays well inside a frame budget', () => {
  it('classic (generic getHint)', () => {
    const { sorted } = measure('classic', (board) =>
      getHint(board.grid, board.words.map((w) => w.word)),
    );
    expect(sorted.length).toBeGreaterThan(10);
    // Measured p50 1ms, p95 33ms, max 50ms.
    expect(percentile(sorted, 95)).toBeLessThan(400);
  }, 180_000);

  it('noGravity (path enumeration + non-overlapping assignment)', () => {
    // The one most likely to be expensive: 50 paths per word, then a
    // backtracking search over the combinations.
    const { sorted } = measure('noGravity', (board) =>
      getHintNoGravity(board.grid, board.words.map((w) => w.word)),
    );
    expect(sorted.length).toBeGreaterThan(10);
    // Measured p50 0ms, p95 1ms, max 1ms — the cheapest of the three,
    // despite being the one that looked most likely to be expensive. On a
    // grid this size each word has only a handful of paths, and the
    // most-constrained-first ordering prunes the assignment search hard.
    expect(percentile(sorted, 95)).toBeLessThan(400);
    expect(sorted[sorted.length - 1]).toBeLessThan(1000);
  }, 180_000);

  it('gravityFlip (rotating solve)', () => {
    const { sorted } = measure('gravityFlip', (board) =>
      getHintGravityFlip(board.grid, board.words.map((w) => w.word), 'down'),
    );
    expect(sorted.length).toBeGreaterThan(10);
    // Measured p50 11ms, p95 49ms, max 56ms.
    expect(percentile(sorted, 95)).toBeLessThan(400);
    expect(sorted[sorted.length - 1]).toBeLessThan(1000);
  }, 180_000);

  it('gravityFlip is not slower from a rotated start', () => {
    // The live direction is whatever the cycle has reached, not always
    // 'down'. If a rotated start were pathologically slower, the hint would
    // stutter on three moves out of four.
    const directions: GravityDirection[] = ['down', 'right', 'up', 'left'];
    for (const direction of directions) {
      const timings: number[] = [];
      for (let seed = 1; seed <= 20; seed++) {
        let board;
        try {
          board = generateBoard(HEAVY, seed * 421 + 17, 'gravityFlip');
        } catch {
          continue;
        }
        const started = Date.now();
        getHintGravityFlip(board.grid, board.words.map((w) => w.word), direction);
        timings.push(Date.now() - started);
      }
      const { sorted } = report(`gravityFlip:${direction}`, timings);
      expect(percentile(sorted, 95)).toBeLessThan(400);
    }
  }, 180_000);
});

describe('hints stay fast late in a puzzle', () => {
  it('noGravity hint cost does not blow up as words are cleared', () => {
    // Fewer remaining words means fewer constraints, so the assignment
    // search should get cheaper, not more expensive. A rise here would mean
    // the search is exploring more as it gets less constrained — the shape
    // of an unbounded backtrack.
    const board = generateBoard(HEAVY, 991, 'noGravity');
    const words = board.words.map((w) => w.word);

    let worst = 0;
    for (let remaining = words.length; remaining >= 2; remaining--) {
      const subset = words.slice(0, remaining);
      const started = Date.now();
      getHintNoGravity(board.grid, subset);
      worst = Math.max(worst, Date.now() - started);
    }
    if (VERBOSE) {
      // eslint-disable-next-line no-console
      console.log(`noGravity worst across word counts: ${worst}ms`);
    }
    expect(worst).toBeLessThan(500);
  }, 120_000);
});
