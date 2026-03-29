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
  wordPositions?: Map<string, CellPosition[]>
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

  // Slow path: budgeted full backtracking solve
  // Budget scales with word count but caps to prevent hangs
  const budget: SolveBudget = {
    remaining: Math.min(5000, words.length <= 4 ? 500 : words.length <= 6 ? 2000 : 5000),
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
  currentDirection: GravityDirection,
  wordsCleared: number
): boolean {
  if (remainingWords.length === 0) return false;

  const shortFirst = [...remainingWords].sort((a, b) => a.length - b.length);
  const orderings = [remainingWords, shortFirst, [...shortFirst].reverse()];

  for (const ordering of orderings) {
    if (trySolveWithOrderRotating(cloneGrid(grid), ordering, currentDirection)) return false;
  }

  const budget: SolveBudget = { remaining: 10000, startTime: Date.now(), timeoutMs: 300 };
  return solveWithRotatingGravity(cloneGrid(grid), remainingWords, currentDirection, wordsCleared, budget) === null;
}

// ============ NO GRAVITY MODE ============

/**
 * Check if all words can be found independently in the grid (no gravity needed).
 * Used for noGravity mode validation.
 */
export function areAllWordsIndependentlyFindable(grid: Grid, words: string[]): boolean {
  return words.every(word => isWordInGrid(grid, word));
}

/**
 * Check if the grid still has all remaining words after some removals (noGravity).
 * Since there's no gravity, words never become unfindable due to ordering.
 */
export function isDeadEndNoGravity(grid: Grid, remainingWords: string[]): boolean {
  // In no-gravity mode, if a word's letters still exist, it's always findable
  return !areAllWordsIndependentlyFindable(grid, remainingWords);
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
  wordsUntilShrink: number = 2
): boolean {
  if (words.length === 0) return true;

  // Quick check: all words must at least exist in current grid
  if (!areAllWordsIndependentlyFindable(grid, words)) return false;

  // If 2 or fewer words remain (no shrink will happen), any order works
  if (words.length <= wordsUntilShrink) return true;

  // Try heuristic orderings
  const shortFirst = [...words].sort((a, b) => a.length - b.length);
  const longFirst = [...shortFirst].reverse();
  const orderings = [words, shortFirst, longFirst];

  for (const ordering of orderings) {
    if (trySolveWithOrderShrinking(cloneGrid(grid), ordering, wordsUntilShrink)) return true;
  }

  // Budgeted backtracking
  const budget: SolveBudget = {
    remaining: Math.min(5000, words.length <= 4 ? 500 : words.length <= 6 ? 2000 : 5000),
    startTime: Date.now(),
    timeoutMs: 500,
  };
  return solveShrinkingBoard(cloneGrid(grid), words, wordsUntilShrink, budget) !== null;
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
