import { Grid, WordPlacement, CellPosition } from '../types';
import { removeCellsAndApplyGravity, cloneGrid } from './gravity';

/**
 * Find all occurrences of a word in the grid (horizontal and vertical).
 * Returns arrays of positions for each occurrence.
 */
export function findWordInGrid(
  grid: Grid,
  word: string
): CellPosition[][] {
  const results: CellPosition[][] = [];
  const rows = grid.length;
  const cols = grid[0].length;
  const len = word.length;

  // Horizontal search
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols - len; c++) {
      let match = true;
      const positions: CellPosition[] = [];
      for (let i = 0; i < len; i++) {
        const cell = grid[r][c + i];
        if (!cell || cell.letter !== word[i]) {
          match = false;
          break;
        }
        positions.push({ row: r, col: c + i });
      }
      if (match) results.push(positions);
    }
  }

  // Vertical search
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r <= rows - len; r++) {
      let match = true;
      const positions: CellPosition[] = [];
      for (let i = 0; i < len; i++) {
        const cell = grid[r + i][c];
        if (!cell || cell.letter !== word[i]) {
          match = false;
          break;
        }
        positions.push({ row: r + i, col: c });
      }
      if (match) results.push(positions);
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
