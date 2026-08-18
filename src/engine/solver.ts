import { Grid, CellPosition, GravityDirection } from '../types';
import { removeCellsAndApplyGravity, removeCellsAndApplyGravityInDirection, cloneGrid, removeCells } from './gravity';

// 8-directional deltas: right, left, down, up, and 4 diagonals
const DIRS = [
  [0, 1], [0, -1], [1, 0], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Find occurrences of a word in the grid along any path of
 * 8-directionally adjacent cells (including diagonals, zigzag, etc.).
 * Each cell can only be used once per path.
 * Returns arrays of positions for each occurrence.
 * @param limit - max number of occurrences to find (0 = unlimited)
 */
export function findWordInGrid(
  grid: Grid,
  word: string,
  limit: number = 0
): CellPosition[][] {
  const results: CellPosition[][] = [];
  const rows = grid.length;
  const cols = grid[0].length;

  if (word.length === 0) return results;

  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

  function dfs(r: number, c: number, idx: number, path: CellPosition[]): void {
    if (limit > 0 && results.length >= limit) return;
    if (idx === word.length) {
      results.push([...path]);
      return;
    }
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    if (visited[r][c]) return;
    const cell = grid[r][c];
    if (!cell || cell.letter !== word[idx]) return;

    visited[r][c] = true;
    path.push({ row: r, col: c });

    for (const [dr, dc] of DIRS) {
      if (limit > 0 && results.length >= limit) break;
      dfs(r + dr, c + dc, idx + 1, path);
    }

    path.pop();
    visited[r][c] = false;
  }

  // Start DFS from every cell that matches the first letter
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (limit > 0 && results.length >= limit) break;
      dfs(r, c, 0, []);
    }
  }

  return results;
}

/**
 * Check if a word is currently present somewhere in the grid.
 */
export function isWordInGrid(grid: Grid, word: string): boolean {
  return findWordInGrid(grid, word, 1).length > 0;
}

/**
 * Try to solve the puzzle using a specific word ordering. O(n) word lookups.
 * Returns the ordering if it works, null otherwise.
 * This is dramatically faster than full backtracking solve.
 */
export function trySolveWithOrder(
  grid: Grid,
  orderedWords: string[]
): string[] | null {
  let currentGrid = grid;
  for (const word of orderedWords) {
    const occurrences = findWordInGrid(currentGrid, word, 1);
    if (occurrences.length === 0) return null;
    currentGrid = removeCellsAndApplyGravity(currentGrid, occurrences[0]);
  }
  return orderedWords;
}

/**
 * Budget tracker for solve attempts to prevent hangs.
 */
interface SolveBudget {
  remaining: number;
  startTime?: number;
  timeoutMs?: number;
}

/**
 * Solve the puzzle: find an ordering of words such that all can be
 * found and removed with gravity applied between each removal.
 * Returns the first valid ordering found, or null if unsolvable.
 *
 * Uses limit=1 for findWordInGrid to reduce branching.
 * Accepts an optional budget to cap total recursive calls.
 */
export function solve(
  grid: Grid,
  remainingWords: string[],
  budget?: SolveBudget
): string[] | null {
  if (remainingWords.length === 0) return [];
  if (budget && budget.remaining <= 0) return null;
  if (budget) budget.remaining--;
  if (budget?.startTime && budget.timeoutMs && Date.now() - budget.startTime > budget.timeoutMs) return null;

  for (let i = 0; i < remainingWords.length; i++) {
    const word = remainingWords[i];
    // limit=1: only check the first occurrence found.
    // This massively reduces branching — from O(n! * k^n) to O(n!).
    // Correct for generation (we can retry seeds). For gameplay,
    // the placed position is almost always the one that matters.
    const occurrences = findWordInGrid(grid, word, 1);

    for (const positions of occurrences) {
      if (budget && budget.remaining <= 0) return null;
      const newGrid = removeCellsAndApplyGravity(grid, positions);
      const rest = [
        ...remainingWords.slice(0, i),
        ...remainingWords.slice(i + 1),
      ];
      const subSolution = solve(newGrid, rest, budget);
      if (subSolution !== null) {
        return [word, ...subSolution];
      }
    }
  }

  return null;
}

/**
 * Check if the puzzle is solvable using fast heuristics first,
 * falling back to budgeted full solve.
 *
 * @param wordPositions - optional placement positions for heuristic ordering
 */
export function isSolvable(
  grid: Grid,
  words: string[],
  wordPositions?: Map<string, CellPosition[]>,
  timeoutMs?: number
): boolean {
  if (words.length === 0) return true;

  const gridCopy = cloneGrid(grid);

  // Fast path: try heuristic orderings (each is O(n) word lookups)
  if (wordPositions) {
    // Compute average row for each word from placement data
    const wordRows = words.map(w => {
      const positions = wordPositions.get(w);
      if (!positions) return { word: w, avgRow: 0 };
      const avgRow = positions.reduce((sum: number, p: CellPosition) => sum + p.row, 0) / positions.length;
      return { word: w, avgRow };
    });

    // Heuristic 1: top-to-bottom (remove top words first — less gravity disruption)
    const topToBottom = [...wordRows].sort((a, b) => a.avgRow - b.avgRow).map(w => w.word);
    if (trySolveWithOrder(gridCopy, topToBottom)) return true;

    // Heuristic 2: bottom-to-top (remove bottom words first — they don't support anything)
    const bottomToTop = [...topToBottom].reverse();
    if (trySolveWithOrder(gridCopy, bottomToTop)) return true;

    // Heuristic 3: shortest words first (less grid disruption per removal)
    const shortFirst = [...words].sort((a, b) => a.length - b.length);
    if (trySolveWithOrder(gridCopy, shortFirst)) return true;

    // Heuristic 4: longest words first
    const longFirst = [...shortFirst].reverse();
    if (trySolveWithOrder(gridCopy, longFirst)) return true;
  } else {
    // Without position data, try length-based orderings
    const shortFirst = [...words].sort((a, b) => a.length - b.length);
    if (trySolveWithOrder(gridCopy, shortFirst)) return true;
    const longFirst = [...shortFirst].reverse();
    if (trySolveWithOrder(gridCopy, longFirst)) return true;
  }

  // Slow path: budgeted full backtracking solve.
  // The node budget alone is not enough of a guard — 5000 nodes of
  // backtracking, each cloning the grid, can still run for over a second on
  // a dense 8-word board. Callers that generate boards pass a wall-clock
  // budget too, because discarding a candidate and reseeding is far cheaper
  // than proving one bad candidate unsolvable.
  const budget: SolveBudget = {
    remaining: Math.min(5000, words.length <= 4 ? 500 : words.length <= 6 ? 2000 : 5000),
    ...(timeoutMs ? { startTime: Date.now(), timeoutMs } : {}),
  };
  return solve(cloneGrid(grid), words, budget) !== null;
}

/**
 * Count how many valid orderings exist (up to a limit for performance).
 * Uses budget to prevent hangs on larger boards.
 */
export function countSolutions(
  grid: Grid,
  remainingWords: string[],
  limit: number = 100
): number {
  if (remainingWords.length === 0) return 1;

  let count = 0;
  const budget: SolveBudget = { remaining: 10000 };

  for (let i = 0; i < remainingWords.length; i++) {
    if (budget.remaining <= 0) break;
    budget.remaining--;

    const word = remainingWords[i];
    const occurrences = findWordInGrid(grid, word, 1);

    for (const positions of occurrences) {
      if (budget.remaining <= 0) break;
      const newGrid = removeCellsAndApplyGravity(grid, positions);
      const rest = [
        ...remainingWords.slice(0, i),
        ...remainingWords.slice(i + 1),
      ];
      count += countSolutionsBudgeted(newGrid, rest, limit - count, budget);
      if (count >= limit) return count;
    }
  }

  return count;
}

/**
 * Estimate how FORGIVING a board is: the fraction of "play it naturally"
 * attempts that finish, where a natural attempt traces a uniformly random
 * currently-findable word each turn.
 *
 * This is deliberately not `countSolutions`. What hurts players is not how
 * many winning orders exist in the abstract, but how likely the order they
 * actually pick is to work — nothing on screen signals which word must be
 * cleared first, so a board with one winning order out of thousands reads
 * as unfair even though it is technically solvable.
 *
 * Cheap by design (samples x words word-searches, no backtracking) so it
 * can run on every candidate board during generation.
 */
export function estimateForgiveness(
  grid: Grid,
  words: string[],
  samples: number,
  rng: () => number,
  /**
   * Optional acceptance threshold. When supplied the sampling stops as soon
   * as the verdict is decided either way — a hopeless board bails after the
   * first couple of failures instead of paying for every sample. Generation
   * runs this on every candidate, so that early exit is the difference
   * between a cheap filter and a multi-second stall.
   */
  minRate?: number,
): number {
  if (words.length <= 1) return 1;

  const needed = minRate === undefined ? Infinity : Math.ceil(minRate * samples);
  let completed = 0;
  for (let s = 0; s < samples; s++) {
    if (minRate !== undefined) {
      const remaining = samples - s;
      // Already guaranteed to pass / already impossible to pass.
      if (completed >= needed) break;
      if (completed + remaining < needed) return completed / samples;
    }
    let current = grid;
    let remaining = words;
    let ok = true;

    while (remaining.length > 0) {
      const findable: string[] = [];
      for (const w of remaining) {
        if (findWordInGrid(current, w, 1).length > 0) findable.push(w);
      }
      if (findable.length === 0) {
        ok = false;
        break;
      }
      const pick = findable[Math.floor(rng() * findable.length)];
      const occurrences = findWordInGrid(current, pick, 1);
      current = removeCellsAndApplyGravity(current, occurrences[0]);
      remaining = remaining.filter((w) => w !== pick);
    }

    if (ok) completed++;
  }

  return completed / samples;
}

function countSolutionsBudgeted(
  grid: Grid,
  remainingWords: string[],
  limit: number,
  budget: SolveBudget
): number {
  if (remainingWords.length === 0) return 1;
  if (budget.remaining <= 0 || limit <= 0) return 0;
  budget.remaining--;
  if (budget.startTime && budget.timeoutMs && Date.now() - budget.startTime > budget.timeoutMs) return 0;

  let count = 0;
  for (let i = 0; i < remainingWords.length; i++) {
    const word = remainingWords[i];
    const occurrences = findWordInGrid(grid, word, 1);

    for (const positions of occurrences) {
      if (budget.remaining <= 0) break;
      const newGrid = removeCellsAndApplyGravity(grid, positions);
      const rest = [
        ...remainingWords.slice(0, i),
        ...remainingWords.slice(i + 1),
      ];
      count += countSolutionsBudgeted(newGrid, rest, limit - count, budget);
      if (count >= limit) return count;
    }
  }

  return count;
}

/**
 * Get all words that are currently findable in the grid.
 */
export function getAvailableWords(
  grid: Grid,
  remainingWords: string[]
): string[] {
  return remainingWords.filter(word => isWordInGrid(grid, word));
}

/**
 * Get a hint: find a word that, if removed next, keeps the puzzle solvable.
 * Returns the word and its positions, or null if stuck.
 *
 * Uses heuristic ordering first, then budgeted full solve as fallback.
 */
export function getHint(
  grid: Grid,
  remainingWords: string[]
): { word: string; positions: CellPosition[] } | null {
  // Try heuristic orderings first (much faster than full solve)
  const shortFirst = [...remainingWords].sort((a, b) => a.length - b.length);
  const orderings = [remainingWords, shortFirst, [...shortFirst].reverse()];

  for (const ordering of orderings) {
    const result = trySolveWithOrder(cloneGrid(grid), ordering);
    if (result && result.length > 0) {
      const word = result[0];
      const occurrences = findWordInGrid(grid, word, 1);
      if (occurrences.length > 0) {
        return { word, positions: occurrences[0] };
      }
    }
  }

  // Fallback: budgeted full solve
  const budget: SolveBudget = { remaining: 10000, startTime: Date.now(), timeoutMs: 300 };
  const solution = solve(cloneGrid(grid), remainingWords, budget);
  if (!solution || solution.length === 0) return null;

  const word = solution[0];
  const occurrences = findWordInGrid(grid, word, 1);

  return occurrences.length > 0
    ? { word, positions: occurrences[0] }
    : null;
}

/**
 * Check if the current state is a dead end (no valid ordering from here).
 * Uses heuristic orderings first for speed, then budgeted full solve.
 */
export function isDeadEnd(grid: Grid, remainingWords: string[]): boolean {
  if (remainingWords.length === 0) return false;

  // Try heuristic orderings first (O(n) each)
  const shortFirst = [...remainingWords].sort((a, b) => a.length - b.length);
  const orderings = [remainingWords, shortFirst, [...shortFirst].reverse()];

  for (const ordering of orderings) {
    if (trySolveWithOrder(cloneGrid(grid), ordering) !== null) {
      return false; // Found a valid ordering — not a dead end
    }
  }

  // No heuristic worked — try budgeted full solve
  const budget: SolveBudget = { remaining: 10000, startTime: Date.now(), timeoutMs: 300 };
  return solve(cloneGrid(grid), remainingWords, budget) === null;
}

// ============ GRAVITY FLIP MODE ============

const GRAVITY_CYCLE: GravityDirection[] = ['down', 'right', 'up', 'left'];

/**
 * Try to solve with a specific ordering using rotating gravity directions.
 * Direction advances after each word cleared.
 */
export function trySolveWithOrderRotating(
  grid: Grid,
  orderedWords: string[],
  startDirection: GravityDirection = 'down'
): string[] | null {
  let currentGrid = grid;
  const startIdx = GRAVITY_CYCLE.indexOf(startDirection);

  for (let i = 0; i < orderedWords.length; i++) {
    const word = orderedWords[i];
    const occurrences = findWordInGrid(currentGrid, word, 1);
    if (occurrences.length === 0) return null;
    const dir = GRAVITY_CYCLE[(startIdx + i) % 4];
    currentGrid = removeCellsAndApplyGravityInDirection(currentGrid, occurrences[0], dir);
  }
  return orderedWords;
}

/**
 * Backtracking solve with rotating gravity for gravityFlip mode.
 */
export function solveWithRotatingGravity(
  grid: Grid,
  remainingWords: string[],
  startDirection: GravityDirection = 'down',
  wordsCleared: number = 0,
  budget?: SolveBudget
): string[] | null {
  if (remainingWords.length === 0) return [];
  if (budget && budget.remaining <= 0) return null;
  if (budget) budget.remaining--;

  const dir = GRAVITY_CYCLE[(GRAVITY_CYCLE.indexOf(startDirection) + wordsCleared) % 4];

  for (let i = 0; i < remainingWords.length; i++) {
    const word = remainingWords[i];
    const occurrences = findWordInGrid(grid, word, 1);

    for (const positions of occurrences) {
      if (budget && budget.remaining <= 0) return null;
      const newGrid = removeCellsAndApplyGravityInDirection(grid, positions, dir);
      const rest = [
        ...remainingWords.slice(0, i),
        ...remainingWords.slice(i + 1),
      ];
      const subSolution = solveWithRotatingGravity(newGrid, rest, startDirection, wordsCleared + 1, budget);
      if (subSolution !== null) {
        return [word, ...subSolution];
      }
    }
  }

  return null;
}

/**
 * Check if a gravityFlip puzzle is solvable using heuristics then backtracking.
 */
export function isSolvableGravityFlip(
  grid: Grid,
  words: string[],
  startDirection: GravityDirection = 'down'
): boolean {
  if (words.length === 0) return true;

  const gridCopy = cloneGrid(grid);

  // Try heuristic orderings with rotating gravity
  const shortFirst = [...words].sort((a, b) => a.length - b.length);
  const orderings = [words, shortFirst, [...shortFirst].reverse()];

  for (const ordering of orderings) {
    if (trySolveWithOrderRotating(gridCopy, ordering, startDirection)) return true;
  }

  // Budgeted backtracking
  const budget: SolveBudget = {
    remaining: Math.min(5000, words.length <= 4 ? 500 : words.length <= 6 ? 2000 : 5000),
  };
  return solveWithRotatingGravity(cloneGrid(grid), words, startDirection, 0, budget) !== null;
}

/**
 * Dead-end detection for gravityFlip mode.
 */
export function isDeadEndGravityFlip(
  grid: Grid,
  remainingWords: string[],
  currentDirection: GravityDirection
): boolean {
  if (remainingWords.length === 0) return false;

  const shortFirst = [...remainingWords].sort((a, b) => a.length - b.length);
  const orderings = [remainingWords, shortFirst, [...shortFirst].reverse()];

  for (const ordering of orderings) {
    if (trySolveWithOrderRotating(cloneGrid(grid), ordering, currentDirection)) return false;
  }

  // Offset 0, and there is deliberately no wordsCleared parameter to pass.
  //
  // `currentDirection` is the direction the reducer will apply to the NEXT
  // clear — it is advanced immediately after each one, so it already encodes
  // every word cleared so far. This used to also take a `wordsCleared` count
  // and hand it to solveWithRotatingGravity, which adds it to the start
  // direction; the offset was applied twice and the simulation ran up to
  // three quarter-turns out of phase with the actual board.
  //
  // Measured at 33 disagreements in 222 live positions, in both directions:
  // announcing "no moves left" on solvable boards, and staying silent while
  // the player ground away at dead ones. It only showed up once the three
  // cheap heuristic orderings above failed and execution reached here — that
  // is, on exactly the hard boards where the answer matters. The parameter is
  // removed rather than ignored so it cannot be reintroduced by a caller.
  const budget: SolveBudget = { remaining: 10000, startTime: Date.now(), timeoutMs: 300 };
  return solveWithRotatingGravity(cloneGrid(grid), remainingWords, currentDirection, 0, budget) === null;
}

// ============ NO GRAVITY MODE ============

/**
 * Check if all words can be found using non-overlapping cell positions.
 * In noGravity mode, cleared cells become permanent holes (no gravity refill),
 * so if two words share a grid cell, clearing one makes the other unsolvable.
 * Uses backtracking to find an assignment of paths where no two words share cells.
 */
export function areAllWordsIndependentlyFindable(grid: Grid, words: string[]): boolean {
  if (words.length === 0) return true;

  // Find all possible paths for each word
  const wordPaths = words.map(word => ({
    word,
    paths: findWordInGrid(grid, word, 50),
  }));

  // If any word has no path at all, unsolvable
  if (wordPaths.some(wp => wp.paths.length === 0)) return false;

  // Sort by fewest paths first (most constrained → better pruning)
  wordPaths.sort((a, b) => a.paths.length - b.paths.length);

  const budget = { remaining: 10000 };
  return findNonOverlappingAssignment(wordPaths, 0, new Set<string>(), budget);
}

/**
 * Backtracking search for a set of word paths that don't share any grid cells.
 */
function findNonOverlappingAssignment(
  wordPaths: { word: string; paths: CellPosition[][] }[],
  index: number,
  usedCells: Set<string>,
  budget: { remaining: number }
): boolean {
  if (index === wordPaths.length) return true;
  if (budget.remaining <= 0) return false;
  budget.remaining--;

  const { paths } = wordPaths[index];

  for (const path of paths) {
    const cellKeys = path.map(p => `${p.row},${p.col}`);
    if (cellKeys.some(k => usedCells.has(k))) continue;

    // Assign this path
    for (const key of cellKeys) usedCells.add(key);
    if (findNonOverlappingAssignment(wordPaths, index + 1, usedCells, budget)) {
      return true;
    }
    // Backtrack
    for (const key of cellKeys) usedCells.delete(key);
  }

  return false;
}

/**
 * Check if the grid still has all remaining words after some removals (noGravity).
 * Words must use non-overlapping cells since cleared cells leave permanent holes.
 */
export function isDeadEndNoGravity(grid: Grid, remainingWords: string[]): boolean {
  return !areAllWordsIndependentlyFindable(grid, remainingWords);
}

/**
 * A hint for noGravity mode: a word AND the specific path that keeps the rest
 * of the board solvable.
 *
 * The generic `getHint` cannot be used here. It simulates downward gravity —
 * the classic rule — while noGravity leaves cleared cells as permanent holes,
 * so it happily suggests a word whose removal strands another. Hints are
 * bought with tokens, which makes a wrong one worse than none: the player
 * pays to be walked into a dead end.
 *
 * Correctness in this mode means picking a path out of a full non-overlapping
 * assignment for every remaining word, not just any occurrence of the word —
 * the same word can appear in several places, and only some of them leave
 * room for the others.
 */
export function getHintNoGravity(
  grid: Grid,
  remainingWords: string[]
): { word: string; positions: CellPosition[] } | null {
  if (remainingWords.length === 0) return null;

  const wordPaths = remainingWords.map(word => ({
    word,
    paths: findWordInGrid(grid, word, 50),
  }));
  if (wordPaths.some(wp => wp.paths.length === 0)) return null;

  // Most-constrained first, matching areAllWordsIndependentlyFindable so the
  // hint agrees with the dead-end check rather than contradicting it.
  wordPaths.sort((a, b) => a.paths.length - b.paths.length);

  const assignment = new Map<string, CellPosition[]>();
  const budget = { remaining: 10000 };
  if (!collectNonOverlappingAssignment(wordPaths, 0, new Set<string>(), assignment, budget)) {
    return null;
  }

  // Suggest the most-constrained word: it has the fewest places to go, so it
  // is both the most useful nudge and the one most likely to be lost if the
  // player clears something else first.
  const first = wordPaths[0];
  const positions = assignment.get(first.word);
  return positions ? { word: first.word, positions } : null;
}

/**
 * As findNonOverlappingAssignment, but records the assignment it found rather
 * than only reporting that one exists.
 */
function collectNonOverlappingAssignment(
  wordPaths: { word: string; paths: CellPosition[][] }[],
  index: number,
  usedCells: Set<string>,
  out: Map<string, CellPosition[]>,
  budget: { remaining: number }
): boolean {
  if (index === wordPaths.length) return true;
  if (budget.remaining <= 0) return false;
  budget.remaining--;

  const { word, paths } = wordPaths[index];

  for (const path of paths) {
    const cellKeys = path.map(p => `${p.row},${p.col}`);
    if (cellKeys.some(k => usedCells.has(k))) continue;

    for (const key of cellKeys) usedCells.add(key);
    out.set(word, path);
    if (collectNonOverlappingAssignment(wordPaths, index + 1, usedCells, out, budget)) {
      return true;
    }
    out.delete(word);
    for (const key of cellKeys) usedCells.delete(key);
  }

  return false;
}

/**
 * A hint for gravityFlip mode.
 *
 * Same problem as noGravity: `getHint` simulates downward gravity, while this
 * mode rotates the direction a quarter-turn after every clear, so a
 * downward-gravity plan diverges from the real board immediately. The word
 * returned here is the first step of a solve that uses the actual rotating
 * cycle from the live direction.
 */
export function getHintGravityFlip(
  grid: Grid,
  remainingWords: string[],
  currentDirection: GravityDirection
): { word: string; positions: CellPosition[] } | null {
  if (remainingWords.length === 0) return null;

  const shortFirst = [...remainingWords].sort((a, b) => a.length - b.length);
  const orderings = [remainingWords, shortFirst, [...shortFirst].reverse()];

  let solution: string[] | null = null;
  for (const ordering of orderings) {
    if (trySolveWithOrderRotating(cloneGrid(grid), ordering, currentDirection)) {
      solution = ordering;
      break;
    }
  }
  if (!solution) {
    const budget: SolveBudget = { remaining: 10000, startTime: Date.now(), timeoutMs: 300 };
    solution = solveWithRotatingGravity(cloneGrid(grid), remainingWords, currentDirection, 0, budget);
  }
  if (!solution || solution.length === 0) return null;

  const word = solution[0];
  const occurrences = findWordInGrid(grid, word, 1);
  return occurrences.length > 0 ? { word, positions: occurrences[0] } : null;
}

// ============ SHRINKING BOARD MODE ============

/**
 * Compute the outer ring of non-null cells (bounding box perimeter).
 * Duplicated from useGame.ts so the solver can simulate shrinks independently.
 */
function getOuterRingSolver(grid: Grid): CellPosition[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const ring: CellPosition[] = [];

  let minRow = rows, maxRow = -1, minCol = cols, maxCol = -1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== null) {
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }

  if (maxRow < 0) return ring;

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (grid[r][c] !== null && (r === minRow || r === maxRow || c === minCol || c === maxCol)) {
        ring.push({ row: r, col: c });
      }
    }
  }

  return ring;
}

/**
 * Simulate removing a word from a shrinking board grid:
 * - Remove the word's cells (no gravity)
 * - If wordsUntilShrink reaches 0, remove the outer ring and reset counter
 * Returns { grid, wordsUntilShrink } after the operation.
 */
function simulateShrinkingMove(
  grid: Grid,
  positions: CellPosition[],
  wordsUntilShrink: number,
  allDone: boolean
): { grid: Grid; wordsUntilShrink: number } {
  let newGrid = removeCells(grid, positions);
  let newWordsUntilShrink = wordsUntilShrink - 1;

  if (!allDone && newWordsUntilShrink <= 0) {
    const outerRing = getOuterRingSolver(newGrid);
    if (outerRing.length > 0) {
      newGrid = removeCells(newGrid, outerRing);
    }
    newWordsUntilShrink = 2;
  }

  return { grid: newGrid, wordsUntilShrink: newWordsUntilShrink };
}

/**
 * Try to solve a shrinking board puzzle with a specific word ordering.
 * Simulates the shrink mechanic (outer ring removed every 2 words).
 * Returns the ordering if it works, null otherwise.
 */
export function trySolveWithOrderShrinking(
  grid: Grid,
  orderedWords: string[],
  wordsUntilShrink: number = 2
): string[] | null {
  let currentGrid = grid;
  let currentWUS = wordsUntilShrink;

  for (let i = 0; i < orderedWords.length; i++) {
    const word = orderedWords[i];
    const occurrences = findWordInGrid(currentGrid, word, 1);
    if (occurrences.length === 0) return null;

    const allDone = i === orderedWords.length - 1;
    const result = simulateShrinkingMove(currentGrid, occurrences[0], currentWUS, allDone);
    currentGrid = result.grid;
    currentWUS = result.wordsUntilShrink;

    // After shrink, verify remaining words are still findable
    if (!allDone) {
      const remaining = orderedWords.slice(i + 1);
      if (!remaining.every(w => isWordInGrid(currentGrid, w))) {
        return null;
      }
    }
  }

  return orderedWords;
}

/**
 * Backtracking solver for shrinking board mode.
 * Simulates the shrink mechanic after every 2 words cleared.
 */
export function solveShrinkingBoard(
  grid: Grid,
  remainingWords: string[],
  wordsUntilShrink: number = 2,
  budget?: SolveBudget
): string[] | null {
  if (remainingWords.length === 0) return [];
  if (budget && budget.remaining <= 0) return null;
  if (budget) budget.remaining--;
  if (budget?.startTime && budget.timeoutMs && Date.now() - budget.startTime > budget.timeoutMs) return null;

  for (let i = 0; i < remainingWords.length; i++) {
    const word = remainingWords[i];
    const occurrences = findWordInGrid(grid, word, 1);

    for (const positions of occurrences) {
      if (budget && budget.remaining <= 0) return null;

      const rest = [
        ...remainingWords.slice(0, i),
        ...remainingWords.slice(i + 1),
      ];
      const allDone = rest.length === 0;
      const result = simulateShrinkingMove(grid, positions, wordsUntilShrink, allDone);

      // After shrink, check remaining words are still in the grid
      if (!allDone && !rest.every(w => isWordInGrid(result.grid, w))) {
        continue; // This word choice leads to unsolvable state after shrink
      }

      const subSolution = solveShrinkingBoard(result.grid, rest, result.wordsUntilShrink, budget);
      if (subSolution !== null) {
        return [word, ...subSolution];
      }
    }
  }

  return null;
}

/**
 * Check if a shrinking board puzzle is solvable.
 * Uses heuristic orderings first, then budgeted backtracking.
 */
export function isSolvableShrinkingBoard(
  grid: Grid,
  words: string[],
  wordsUntilShrink: number = 2,
  timeoutMs: number = 500
): boolean {
  if (words.length === 0) return true;

  // Quick check: all words must at least exist in current grid
  if (!areAllWordsIndependentlyFindable(grid, words)) return false;

  // If 2 or fewer words remain (no shrink will happen), any order works
  if (words.length <= wordsUntilShrink) return true;

  // Try heuristic orderings. Outermost-first matters here: a word near the
  // perimeter must be cleared before the shrink that would destroy it, so
  // clearing by distance-from-centre is the ordering most likely to work
  // and it usually succeeds without touching the backtracker at all.
  const shortFirst = [...words].sort((a, b) => a.length - b.length);
  const longFirst = [...shortFirst].reverse();
  const outermostFirst = orderWordsByPerimeterDistance(grid, words);
  const orderings = outermostFirst
    ? [outermostFirst, words, shortFirst, longFirst]
    : [words, shortFirst, longFirst];

  for (const ordering of orderings) {
    if (trySolveWithOrderShrinking(cloneGrid(grid), ordering, wordsUntilShrink)) return true;
  }

  // Budgeted backtracking. `timeoutMs` is tightened by the generator, where
  // discarding a candidate and reseeding is far cheaper than proving a bad
  // candidate unsolvable.
  const budget: SolveBudget = {
    remaining: Math.min(5000, words.length <= 4 ? 500 : words.length <= 6 ? 2000 : 5000),
    startTime: Date.now(),
    timeoutMs,
  };
  return solveShrinkingBoard(cloneGrid(grid), words, wordsUntilShrink, budget) !== null;
}

/**
 * Order words by how close their nearest cell sits to the grid perimeter
 * (outermost first). Words on the edge die at the next shrink, so clearing
 * them first is the ordering most likely to survive the whole schedule.
 * Returns null if any word can't be located.
 */
function orderWordsByPerimeterDistance(grid: Grid, words: string[]): string[] | null {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return null;

  const scored: Array<{ word: string; depth: number }> = [];
  for (const word of words) {
    const occurrences = findWordInGrid(grid, word, 1);
    if (occurrences.length === 0) return null;
    // Best case for this word: the placement furthest from the perimeter.
    let bestDepth = -1;
    for (const positions of occurrences) {
      let minDepth = Infinity;
      for (const p of positions) {
        const depth = Math.min(p.row, rows - 1 - p.row, p.col, cols - 1 - p.col);
        if (depth < minDepth) minDepth = depth;
      }
      if (minDepth > bestDepth) bestDepth = minDepth;
    }
    scored.push({ word, depth: bestDepth });
  }

  scored.sort((a, b) => a.depth - b.depth);
  return scored.map((s) => s.word);
}

/**
 * Get a hint for shrinking board mode.
 * Finds the first word in a valid solve ordering that accounts for future shrinks.
 */
export function getHintShrinkingBoard(
  grid: Grid,
  remainingWords: string[],
  wordsUntilShrink: number = 2
): { word: string; positions: CellPosition[] } | null {
  // Try heuristic orderings
  const shortFirst = [...remainingWords].sort((a, b) => a.length - b.length);
  const longFirst = [...shortFirst].reverse();
  const orderings = [remainingWords, shortFirst, longFirst];

  for (const ordering of orderings) {
    const result = trySolveWithOrderShrinking(cloneGrid(grid), ordering, wordsUntilShrink);
    if (result && result.length > 0) {
      const word = result[0];
      const occurrences = findWordInGrid(grid, word, 1);
      if (occurrences.length > 0) {
        return { word, positions: occurrences[0] };
      }
    }
  }

  // Budgeted backtracking
  const budget: SolveBudget = { remaining: 10000, startTime: Date.now(), timeoutMs: 300 };
  const solution = solveShrinkingBoard(cloneGrid(grid), remainingWords, wordsUntilShrink, budget);
  if (solution && solution.length > 0) {
    const word = solution[0];
    const occurrences = findWordInGrid(grid, word, 1);
    if (occurrences.length > 0) {
      return { word, positions: occurrences[0] };
    }
  }

  // Fallback: if no shrink-safe ordering found, return any findable word.
  // This prevents the hint from silently doing nothing on edge-case boards.
  for (const word of remainingWords) {
    const occurrences = findWordInGrid(grid, word, 1);
    if (occurrences.length > 0) {
      return { word, positions: occurrences[0] };
    }
  }

  return null;
}

/**
 * Dead-end detection for shrinking board mode.
 * Checks if there's any valid ordering that survives all future shrinks.
 */
export function isDeadEndShrinkingBoard(
  grid: Grid,
  remainingWords: string[],
  wordsUntilShrink: number = 2
): boolean {
  if (remainingWords.length === 0) return false;
  return !isSolvableShrinkingBoard(grid, remainingWords, wordsUntilShrink);
}

// ============ KEPT-IT-OPEN DETECTION (J11) ============

/**
 * Did the player's clearing choice avoid a dead end that an ALTERNATIVE
 * choice would have caused?
 *
 * Order-sensitivity is the game's stated skill, yet nothing ever confirmed
 * a GOOD ordering choice at the moment it was made — the player only
 * learned about ordering by losing. This powers the once-per-puzzle
 * "kept it open" acknowledgment (no score effect; pure information).
 *
 * Honesty over coverage: an alternative only counts as a dead end when the
 * budgeted solver CONFIRMS no completing order exists. If the time budget
 * runs out mid-proof the result is inconclusive and we return false — a
 * missed badge is fine, an unearned one teaches a false rule. Runs deferred
 * off the word-found hot path; worst case is bounded by `budgetMs`.
 *
 * @param prevGrid  the grid BEFORE the player's clear (history snapshot)
 * @param foundWord the word the player actually cleared
 * @param remainingWordsBeforeClear all unfound words at that moment,
 *                  INCLUDING foundWord
 */
export function choiceAvoidedDeadEnd(
  prevGrid: Grid,
  foundWord: string,
  remainingWordsBeforeClear: string[],
  budgetMs: number = 80,
): boolean {
  const deadline = Date.now() + budgetMs;
  const alternatives = remainingWordsBeforeClear.filter((w) => w !== foundWord);
  // Cap the scan — on an 8-word board checking every alternative would
  // triple the budget's worst case for marginal extra coverage.
  for (const alt of alternatives.slice(0, 4)) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 5) return false;
    const occurrences = findWordInGrid(prevGrid, alt, 1);
    if (occurrences.length === 0) continue;
    const afterAlt = removeCellsAndApplyGravity(cloneGrid(prevGrid), occurrences[0]);
    const rest = remainingWordsBeforeClear.filter((w) => w !== alt);

    // Fast path: any heuristic ordering that completes proves NOT a dead end.
    const shortFirst = [...rest].sort((a, b) => a.length - b.length);
    const orderings = [rest, shortFirst, [...shortFirst].reverse()];
    let solvedByHeuristic = false;
    for (const ordering of orderings) {
      if (trySolveWithOrder(cloneGrid(afterAlt), ordering) !== null) {
        solvedByHeuristic = true;
        break;
      }
    }
    if (solvedByHeuristic) continue;

    // Slow path: budgeted full solve. null is only trusted as "dead end"
    // when the solver finished INSIDE its budget — a timeout is
    // inconclusive, not a proof.
    const solveTimeout = Math.min(remainingMs - 2, 40);
    if (solveTimeout <= 5) return false;
    const started = Date.now();
    const budget: SolveBudget = {
      remaining: 5000,
      startTime: started,
      timeoutMs: solveTimeout,
    };
    const solution = solve(cloneGrid(afterAlt), rest, budget);
    const ranOut =
      Date.now() - started >= solveTimeout || budget.remaining <= 0;
    if (solution === null && !ranOut) {
      return true; // confirmed: clearing `alt` would have killed the board
    }
  }
  return false;
}

/**
 * Cheap positive proof that the board still has a completing order (three
 * heuristic orderings, O(n) each). Returns false when unproven — which does
 * NOT mean dead, just "couldn't confirm cheaply". Used as the J11 guard:
 * the "kept it open" badge must never appear on a board that just died, and
 * the authoritative isStuck check is debounced past the badge's window.
 */
export function isProvablyCompletable(
  grid: Grid,
  remainingWords: string[],
): boolean {
  if (remainingWords.length === 0) return true;
  const shortFirst = [...remainingWords].sort((a, b) => a.length - b.length);
  const orderings = [remainingWords, shortFirst, [...shortFirst].reverse()];
  for (const ordering of orderings) {
    if (trySolveWithOrder(cloneGrid(grid), ordering) !== null) return true;
  }
  return false;
}
