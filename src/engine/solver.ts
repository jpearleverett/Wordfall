import { Grid, CellPosition } from '../types';
import { removeCellsAndApplyGravity, cloneGrid } from './gravity';

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
