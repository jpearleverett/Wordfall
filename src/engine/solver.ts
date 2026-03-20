import { Grid, WordPlacement, CellPosition } from '../types';
import { removeCellsAndApplyGravity, cloneGrid } from './gravity';

// 8-directional deltas: right, left, down, up, and 4 diagonals
const DIRS = [
  [0, 1], [0, -1], [1, 0], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Find all occurrences of a word in the grid along any path of
 * 8-directionally adjacent cells (including diagonals, zigzag, etc.).
 * Each cell can only be used once per path.
 * Returns arrays of positions for each occurrence.
 */
export function findWordInGrid(
  grid: Grid,
  word: string
): CellPosition[][] {
  const results: CellPosition[][] = [];
  const rows = grid.length;
  const cols = grid[0].length;

  if (word.length === 0) return results;

  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

  function dfs(r: number, c: number, idx: number, path: CellPosition[]): void {
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
      dfs(r + dr, c + dc, idx + 1, path);
    }

    path.pop();
    visited[r][c] = false;
  }

  // Start DFS from every cell that matches the first letter
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dfs(r, c, 0, []);
    }
  }

  return results;
}

/**
 * Check if a word is currently present somewhere in the grid.
 */
export function isWordInGrid(grid: Grid, word: string): boolean {
  return findWordInGrid(grid, word).length > 0;
}

/**
 * Solve the puzzle: find an ordering of words such that all can be
 * found and removed with gravity applied between each removal.
 * Returns the first valid ordering found, or null if unsolvable.
 */
export function solve(
  grid: Grid,
  remainingWords: string[]
): string[] | null {
  if (remainingWords.length === 0) return [];

  for (let i = 0; i < remainingWords.length; i++) {
    const word = remainingWords[i];
    const occurrences = findWordInGrid(grid, word);

    for (const positions of occurrences) {
      const newGrid = removeCellsAndApplyGravity(grid, positions);
      const rest = [
        ...remainingWords.slice(0, i),
        ...remainingWords.slice(i + 1),
      ];
      const subSolution = solve(newGrid, rest);
      if (subSolution !== null) {
        return [word, ...subSolution];
      }
    }
  }

  return null;
}

/**
 * Check if the puzzle is solvable (at least one valid word ordering exists).
 */
export function isSolvable(grid: Grid, words: string[]): boolean {
  return solve(cloneGrid(grid), words) !== null;
}

/**
 * Count how many valid orderings exist (up to a limit for performance).
 */
export function countSolutions(
  grid: Grid,
  remainingWords: string[],
  limit: number = 100
): number {
  if (remainingWords.length === 0) return 1;

  let count = 0;
  for (let i = 0; i < remainingWords.length; i++) {
    const word = remainingWords[i];
    const occurrences = findWordInGrid(grid, word);

    for (const positions of occurrences) {
      const newGrid = removeCellsAndApplyGravity(grid, positions);
      const rest = [
        ...remainingWords.slice(0, i),
        ...remainingWords.slice(i + 1),
      ];
      count += countSolutions(newGrid, rest, limit - count);
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
 */
export function getHint(
  grid: Grid,
  remainingWords: string[]
): { word: string; positions: CellPosition[] } | null {
  const solution = solve(cloneGrid(grid), remainingWords);
  if (!solution || solution.length === 0) return null;

  const word = solution[0];
  const occurrences = findWordInGrid(grid, word);
  // Find the occurrence that leads to a solvable state
  for (const positions of occurrences) {
    const newGrid = removeCellsAndApplyGravity(grid, positions);
    const rest = remainingWords.filter(w => w !== word);
    if (isSolvable(newGrid, rest)) {
      return { word, positions };
    }
  }

  return occurrences.length > 0
    ? { word, positions: occurrences[0] }
    : null;
}

/**
 * Check if the current state is a dead end (no valid ordering from here).
 */
export function isDeadEnd(grid: Grid, remainingWords: string[]): boolean {
  if (remainingWords.length === 0) return false;
  return solve(cloneGrid(grid), remainingWords) === null;
}
