import { Grid, Cell, BoardConfig, Board, WordPlacement, CellPosition } from '../types';
import { applyGravity } from './gravity';
import { isSolvable, solve, countSolutions } from './solver';
import { getWordsByLength } from '../words';

// Simple seeded PRNG (mulberry32)
function createRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function randomChoice<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

let cellIdCounter = 0;
function newCellId(): string {
  return `cell_${++cellIdCounter}`;
}

/**
 * Create an empty grid.
 */
function createEmptyGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

/**
 * Try to place a word in the grid at the given position and direction.
 * Returns positions if successful, null if blocked.
 */
function tryPlace(
  grid: Grid,
  word: string,
  startRow: number,
  startCol: number,
  direction: 'horizontal' | 'vertical'
): CellPosition[] | null {
  const positions: CellPosition[] = [];
  const rows = grid.length;
  const cols = grid[0].length;

  for (let i = 0; i < word.length; i++) {
    const r = direction === 'vertical' ? startRow + i : startRow;
    const c = direction === 'horizontal' ? startCol + i : startCol;

    if (r < 0 || r >= rows || c < 0 || c >= cols) return null;

    const existing = grid[r][c];
    if (existing !== null && existing.letter !== word[i]) return null;

    positions.push({ row: r, col: c });
  }

  return positions;
}

/**
 * Place a word in the grid, creating cells where needed.
 */
function placeWord(
  grid: Grid,
  word: string,
  positions: CellPosition[]
): void {
  for (let i = 0; i < word.length; i++) {
    const { row, col } = positions[i];
    if (grid[row][col] === null) {
      grid[row][col] = { letter: word[i], id: newCellId() };
    }
  }
}

/**
 * Fill all null cells in the grid with random letters.
 * Avoids accidentally creating target words in unused spaces.
 */
function fillEmptyCells(grid: Grid, rng: () => number): void {
  // Use a mix of vowels and consonants
  const vowels = 'AEIOU';
  const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
  const all = vowels + consonants;

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === null) {
        // Bias toward consonants slightly to reduce accidental words
        const useVowel = rng() < 0.35;
        const letter = useVowel
          ? vowels[Math.floor(rng() * vowels.length)]
          : consonants[Math.floor(rng() * consonants.length)];
        grid[r][c] = { letter, id: newCellId() };
      }
    }
  }
}

/**
 * Select words for a puzzle, ensuring variety in length and starting letters.
 */
function selectWords(
  config: BoardConfig,
  rng: () => number
): string[] {
  const pool = getWordsByLength(config.minWordLength, config.maxWordLength);
  const shuffled = shuffleArray(pool, rng);
  const selected: string[] = [];
  const usedLetters = new Set<string>();

  for (const word of shuffled) {
    if (selected.length >= config.wordCount) break;

    // Avoid duplicate starting letters for variety
    if (selected.length < config.wordCount - 1 && usedLetters.has(word[0])) {
      continue;
    }

    // Avoid words that are substrings of already selected words
    const isSubstring = selected.some(
      w => w.includes(word) || word.includes(w)
    );
    if (isSubstring) continue;

    selected.push(word);
    usedLetters.add(word[0]);
  }

  // If we didn't get enough with the variety constraint, relax it
  if (selected.length < config.wordCount) {
    for (const word of shuffled) {
      if (selected.length >= config.wordCount) break;
      if (selected.includes(word)) continue;
      const isSubstring = selected.some(
        w => w.includes(word) || word.includes(w)
      );
      if (isSubstring) continue;
      selected.push(word);
    }
  }

  return selected;
}

/**
 * Attempt to generate a board with the given config.
 * Returns null if generation fails.
 */
function attemptGenerate(
  config: BoardConfig,
  rng: () => number
): Board | null {
  const words = selectWords(config, rng);
  if (words.length < config.wordCount) return null;

  const grid = createEmptyGrid(config.rows, config.cols);
  const placements: WordPlacement[] = [];

  // Place words in the grid
  for (const word of words) {
    let placed = false;

    // Try many random positions
    for (let attempt = 0; attempt < 80; attempt++) {
      const direction: 'horizontal' | 'vertical' =
        rng() < 0.5 ? 'horizontal' : 'vertical';

      let maxRow: number, maxCol: number;
      if (direction === 'horizontal') {
        maxRow = config.rows;
        maxCol = config.cols - word.length + 1;
      } else {
        maxRow = config.rows - word.length + 1;
        maxCol = config.cols;
      }

      if (maxRow <= 0 || maxCol <= 0) continue;

      const startRow = Math.floor(rng() * maxRow);
      const startCol = Math.floor(rng() * maxCol);

      const positions = tryPlace(grid, word, startRow, startCol, direction);
      if (positions) {
        placeWord(grid, word, positions);
        placements.push({
          word,
          positions,
          direction,
          found: false,
        });
        placed = true;
        break;
      }
    }

    if (!placed) return null;
  }

  // Fill empty cells
  fillEmptyCells(grid, rng);

  // Verify solvability
  const wordStrings = placements.map(p => p.word);
  if (!isSolvable(grid, wordStrings)) return null;

  return { grid, words: placements, config };
}

/**
 * Generate a board for the given config.
 * Retries with different seeds until a valid board is found.
 */
export function generateBoard(
  config: BoardConfig,
  seed?: number
): Board {
  const baseSeed = seed ?? Date.now();

  for (let attempt = 0; attempt < 50; attempt++) {
    const rng = createRng(baseSeed + attempt * 7919);
    const board = attemptGenerate(config, rng);
    if (board) return board;
  }

  // Fallback: generate a simpler board
  const fallbackConfig: BoardConfig = {
    ...config,
    wordCount: Math.max(2, config.wordCount - 1),
    maxWordLength: Math.min(config.maxWordLength, 4),
  };

  for (let attempt = 0; attempt < 50; attempt++) {
    const rng = createRng(baseSeed + 1000 + attempt * 7919);
    const board = attemptGenerate(fallbackConfig, rng);
    if (board) return board;
  }

  // Last resort: generate a minimal 2-word board
  const minimalConfig: BoardConfig = {
    rows: 5,
    cols: 5,
    wordCount: 2,
    minWordLength: 3,
    maxWordLength: 3,
    difficulty: 'easy',
  };

  for (let attempt = 0; attempt < 100; attempt++) {
    const rng = createRng(baseSeed + 2000 + attempt * 7919);
    const board = attemptGenerate(minimalConfig, rng);
    if (board) return board;
  }

  // Should never reach here, but just in case
  throw new Error('Failed to generate board after all attempts');
}

/**
 * Generate a daily challenge board based on the date.
 */
export function generateDailyBoard(dateString: string): Board {
  // Create a deterministic seed from the date string
  let seed = 0;
  for (let i = 0; i < dateString.length; i++) {
    seed = ((seed << 5) - seed + dateString.charCodeAt(i)) | 0;
  }

  const config: BoardConfig = {
    rows: 7,
    cols: 6,
    wordCount: 5,
    minWordLength: 3,
    maxWordLength: 5,
    difficulty: 'medium',
  };

  return generateBoard(config, Math.abs(seed));
}

/**
 * Get the number of valid solutions for a board (difficulty indicator).
 */
export function getBoardDifficulty(board: Board): {
  solutionCount: number;
  requiresPlanning: boolean;
} {
  const words = board.words
    .filter(w => !w.found)
    .map(w => w.word);
  const count = countSolutions(board.grid, words, 20);
  return {
    solutionCount: count,
    requiresPlanning: count < 3,
  };
}
