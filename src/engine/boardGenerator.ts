import { Grid, Cell, BoardConfig, Board, WordPlacement, CellPosition, GameMode, GenerationProfile } from '../types';
import { applyGravity } from './gravity';
import { isSolvable, trySolveWithOrder, countSolutions, isSolvableGravityFlip, areAllWordsIndependentlyFindable, trySolveWithOrderRotating, isSolvableShrinkingBoard } from './solver';
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

// 8-directional deltas: right, left, down, up, and 4 diagonals
const DIRS = [
  [0, 1], [0, -1], [1, 0], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Try to place a word along a random adjacent path starting from (startRow, startCol).
 * Each step picks a random 8-directional neighbor. Allows zigzag, diagonal, etc.
 * Returns positions if successful, null if no valid path found.
 *
 * Uses a step budget to prevent exponential exploration on crowded grids.
 */
function tryPlace(
  grid: Grid,
  word: string,
  startRow: number,
  startCol: number,
  rng: () => number
): CellPosition[] | null {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = new Set<string>();
  const path: CellPosition[] = [];
  let steps = 0;
  const maxSteps = word.length * 50; // budget to prevent deep backtracking

  function dfs(r: number, c: number, idx: number): boolean {
    if (idx === word.length) return true;
    if (++steps > maxSteps) return false;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    const key = `${r},${c}`;
    if (visited.has(key)) return false;

    const existing = grid[r][c];
    if (existing !== null && existing.letter !== word[idx]) return false;

    visited.add(key);
    path.push({ row: r, col: c });

    // Shuffle directions for randomness
    const shuffledDirs = [...DIRS];
    for (let i = shuffledDirs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffledDirs[i], shuffledDirs[j]] = [shuffledDirs[j], shuffledDirs[i]];
    }

    for (const [dr, dc] of shuffledDirs) {
      if (dfs(r + dr, c + dc, idx + 1)) return true;
    }

    path.pop();
    visited.delete(key);
    return false;
  }

  if (dfs(startRow, startCol, 0)) {
    return path;
  }
  return null;
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
 * Uses uncommon consonant clusters to minimize accidental word formation.
 */
function fillEmptyCells(grid: Grid, rng: () => number): void {
  // Weighted letter pool: heavy on uncommon consonants to reduce accidental words
  const vowels = 'AEIOU';
  const commonConsonants = 'BCDFGHLMNPRST';
  const uncommonConsonants = 'JKQVWXYZ';

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === null) {
        const roll = rng();
        let letter: string;
        if (roll < 0.25) {
          // 25% vowels (reduced from 35%)
          letter = vowels[Math.floor(rng() * vowels.length)];
        } else if (roll < 0.55) {
          // 30% common consonants
          letter = commonConsonants[Math.floor(rng() * commonConsonants.length)];
        } else {
          // 45% uncommon consonants — makes accidental words very unlikely
          letter = uncommonConsonants[Math.floor(rng() * uncommonConsonants.length)];
        }
        grid[r][c] = { letter, id: newCellId() };
      }
    }
  }
}

/**
 * Select words for a puzzle, ensuring variety in length and starting letters.
 * Prefers shorter words for faster placement and solvability.
 */
function selectWords(
  config: BoardConfig,
  rng: () => number,
  mode?: GameMode,
  profile?: GenerationProfile,
): string[] {
  let pool = getWordsByLength(config.minWordLength, config.maxWordLength);

  // Profile-driven dictionary tiering (applied before mode filters so mode
  // can still tighten further for timePressure/expert).
  if (profile?.dictionaryTier === 'common') {
    // "Common" tutorial tier: bias to 3-5 letter words — our dictionary's
    // shorter buckets skew toward everyday vocabulary.
    const commonPool = pool.filter(w => w.length <= 5);
    if (commonPool.length >= config.wordCount * 3) {
      pool = commonPool;
    }
  } else if (profile?.dictionaryTier === 'expert') {
    const expertPool = pool.filter(w => w.length >= 5);
    if (expertPool.length >= config.wordCount * 3) {
      pool = expertPool;
    }
  }

  // Mode-specific word pool filtering
  if (mode === 'timePressure') {
    // Prefer shorter words (3-4 letters) for faster spotting under time pressure
    const shortPool = pool.filter(w => w.length <= 4);
    if (shortPool.length >= config.wordCount * 3) {
      pool = shortPool;
    }
  } else if (mode === 'expert') {
    // Prefer longer words (5+) for harder challenge
    const longPool = pool.filter(w => w.length >= 5);
    if (longPool.length >= config.wordCount * 3) {
      pool = longPool;
    }
  }

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

    // Avoid words sharing too many letters (reduces placement conflicts)
    const letterSet = new Set(word.split(''));
    const tooMuchOverlap = selected.some(w => {
      const shared = w.split('').filter(l => letterSet.has(l)).length;
      return shared > Math.min(w.length, word.length) * 0.5;
    });
    if (tooMuchOverlap && selected.length < config.wordCount - 2) continue;

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
 * Compute ordering heuristics for solvability checking.
 * Returns multiple orderings to try, from most likely to work to least.
 */
function getOrderingHeuristics(
  words: string[],
  wordPositions: Map<string, CellPosition[]>,
  rng: () => number
): string[][] {
  // Compute average row for each word
  const wordRows = words.map(w => {
    const positions = wordPositions.get(w);
    if (!positions) return { word: w, avgRow: 0, minRow: 0 };
    const avgRow = positions.reduce((sum: number, p: CellPosition) => sum + p.row, 0) / positions.length;
    const minRow = Math.min(...positions.map((p: CellPosition) => p.row));
    return { word: w, avgRow, minRow };
  });

  const orderings: string[][] = [];

  // Top-to-bottom: remove top words first (less gravity disruption below)
  orderings.push([...wordRows].sort((a, b) => a.avgRow - b.avgRow).map(w => w.word));

  // Bottom-to-top: remove bottom words first (they don't support anything)
  orderings.push([...wordRows].sort((a, b) => b.avgRow - a.avgRow).map(w => w.word));

  // By min row (topmost cell first)
  orderings.push([...wordRows].sort((a, b) => a.minRow - b.minRow).map(w => w.word));

  // Shortest first (less grid disruption per removal)
  orderings.push([...words].sort((a, b) => a.length - b.length));

  // Longest first
  orderings.push([...words].sort((a, b) => b.length - a.length));

  // A few random shuffles
  for (let i = 0; i < 5; i++) {
    orderings.push(shuffleArray(words, rng));
  }

  return orderings;
}

/**
 * Fast solvability check using heuristic orderings before budgeted full solve.
 * Mode-aware: uses different validation for gravityFlip, noGravity, shrinkingBoard.
 */
function checkSolvability(
  grid: Grid,
  words: string[],
  wordPositions: Map<string, CellPosition[]>,
  rng: () => number,
  mode?: GameMode
): boolean {
  // noGravity: just check all words are independently findable
  if (mode === 'noGravity') {
    return areAllWordsIndependentlyFindable(grid, words);
  }

  // gravityFlip: use rotating gravity solver
  if (mode === 'gravityFlip') {
    // Try heuristic orderings with rotating gravity first
    const orderings = getOrderingHeuristics(words, wordPositions, rng);
    for (const ordering of orderings) {
      if (trySolveWithOrderRotating(grid, ordering, 'down') !== null) {
        return true;
      }
    }
    return isSolvableGravityFlip(grid, words, 'down');
  }

  // shrinkingBoard: simulate the full shrink sequence to verify solvability
  // Words must survive outer ring removals that happen every 2 words cleared
  if (mode === 'shrinkingBoard') {
    return isSolvableShrinkingBoard(grid, words, 2);
  }

  // classic / timePressure / perfectSolve / etc: standard solvability with gravity
  const orderings = getOrderingHeuristics(words, wordPositions, rng);
  for (const ordering of orderings) {
    if (trySolveWithOrder(grid, ordering) !== null) {
      return true;
    }
  }

  // Fall back to budgeted full backtracking solver
  return isSolvable(grid, words, wordPositions);
}

/**
 * Attempt to generate a board with the given config.
 * Returns null if generation fails.
 */
function attemptGenerate(
  config: BoardConfig,
  rng: () => number,
  mode?: GameMode,
  profile?: GenerationProfile,
): Board | null {
  const words = selectWords(config, rng, mode, profile);
  if (words.length < config.wordCount) return null;

  const grid = createEmptyGrid(config.rows, config.cols);
  const placements: WordPlacement[] = [];
  const wordPositions = new Map<string, CellPosition[]>();

  // Sort words longest-first for placement (longer words are harder to fit)
  const sortedWords = [...words].sort((a, b) => b.length - a.length);

  // Place words in the grid along random adjacent paths
  // For shrinkingBoard, constrain to the interior (avoid the outer filler ring).
  // The shrink-aware solver then validates that at least one word-clearing order
  // exists where each word survives until it's cleared — edge words must be
  // cleared before the shrink that would destroy them.
  const isShrinking = mode === 'shrinkingBoard';
  const rowMin = isShrinking ? 1 : 0;
  const rowMax = isShrinking ? config.rows - 2 : config.rows - 1;
  const colMin = isShrinking ? 1 : 0;
  const colMax = isShrinking ? config.cols - 2 : config.cols - 1;

  for (const word of sortedWords) {
    let placed = false;

    // Try random starting positions within the allowed region
    const startPositions: [number, number][] = [];
    for (let i = 0; i < 60; i++) {
      startPositions.push([
        rowMin + Math.floor(rng() * (rowMax - rowMin + 1)),
        colMin + Math.floor(rng() * (colMax - colMin + 1)),
      ]);
    }

    for (const [startRow, startCol] of startPositions) {
      const positions = tryPlace(grid, word, startRow, startCol, rng);
      // For shrinkingBoard, verify all positions are within the interior
      if (positions && isShrinking && positions.some(p => p.row < rowMin || p.row > rowMax || p.col < colMin || p.col > colMax)) {
        continue; // Word path wandered into outer ring — reject
      }
      if (positions) {
        placeWord(grid, word, positions);
        placements.push({
          word,
          positions,
          direction: 'horizontal', // Legacy field, paths are now freeform
          found: false,
        });
        wordPositions.set(word, positions);
        placed = true;
        break;
      }
    }

    if (!placed) return null;
  }

  // Fill empty cells
  fillEmptyCells(grid, rng);

  // Verify solvability using fast heuristics + budgeted fallback
  const wordStrings = placements.map(p => p.word);
  if (!checkSolvability(grid, wordStrings, wordPositions, rng, mode)) return null;

  return { grid, words: placements, config };
}

/**
 * Generate a board for the given config.
 * Retries with different seeds until a valid board is found.
 * Mode-aware: shrinkingBoard gets +1 row/col, gravityFlip and noGravity
 * use mode-specific solvability validation.
 */
/** Absolute time limit for board generation to prevent UI hangs */
const GENERATION_TIMEOUT_MS = 5000;

export function generateBoard(
  config: BoardConfig,
  seed?: number,
  mode?: GameMode,
  profile?: GenerationProfile,
): Board {
  const baseSeed = seed ?? Date.now();
  const startTime = Date.now();

  const checkTimeout = (): void => {
    if (Date.now() - startTime > GENERATION_TIMEOUT_MS) {
      throw new Error('Board generation timed out');
    }
  };

  // Apply profile word-length clamps. Profile tightens config bounds where
  // specified, never loosens. Keeps dictionary selection deterministic.
  const clampedConfig: BoardConfig = (() => {
    if (!profile) return config;
    const min = Math.max(config.minWordLength, profile.minWordLength ?? config.minWordLength);
    const max = Math.min(config.maxWordLength, profile.maxWordLength ?? config.maxWordLength);
    // Guard against invalid ranges (profile too tight).
    if (min > max) return config;
    return { ...config, minWordLength: min, maxWordLength: max };
  })();

  // shrinkingBoard: add 1 buffer ring (filler perimeter for the initial visual shrink).
  // Words are placed in the interior and the shrink-aware solver validates that
  // at least one clearing order exists where words survive each shrink phase.
  // Edge words get cleared before the shrink that would destroy them.
  // Minimum 3 words so the player sees the shrink mechanic (2 cleared → shrink → solve remaining).
  let effectiveConfig: BoardConfig;
  if (mode === 'shrinkingBoard') {
    effectiveConfig = {
      ...clampedConfig,
      rows: Math.max(clampedConfig.rows, 5) + 2,
      cols: Math.max(clampedConfig.cols, 5) + 2,
      wordCount: Math.max(clampedConfig.wordCount, 3),
    };
  } else {
    effectiveConfig = clampedConfig;
  }

  // Primary attempts with full config
  for (let attempt = 0; attempt < 80; attempt++) {
    checkTimeout();
    const rng = createRng(baseSeed + attempt * 7919);
    const board = attemptGenerate(effectiveConfig, rng, mode, profile);
    if (board) return board;
  }

  // Fallback: slightly simpler board (1 fewer word, cap word length)
  const fallbackConfig: BoardConfig = {
    ...effectiveConfig,
    wordCount: Math.max(2, effectiveConfig.wordCount - 1),
    maxWordLength: Math.min(effectiveConfig.maxWordLength, 5),
  };

  for (let attempt = 0; attempt < 60; attempt++) {
    checkTimeout();
    const rng = createRng(baseSeed + 1000 + attempt * 7919);
    const board = attemptGenerate(fallbackConfig, rng, mode, profile);
    if (board) return board;
  }

  // Second fallback: even simpler
  const fallback2Config: BoardConfig = {
    ...effectiveConfig,
    wordCount: Math.max(2, effectiveConfig.wordCount - 2),
    maxWordLength: Math.min(effectiveConfig.maxWordLength, 4),
  };

  for (let attempt = 0; attempt < 60; attempt++) {
    checkTimeout();
    const rng = createRng(baseSeed + 2000 + attempt * 7919);
    const board = attemptGenerate(fallback2Config, rng, mode, profile);
    if (board) return board;
  }

  // Last resort: generate a minimal 2-word board (always attempted even after timeout).
  // Profile is NOT applied here — this is a true emergency fallback.
  const minimalConfig: BoardConfig = {
    rows: 5,
    cols: 5,
    wordCount: 2,
    minWordLength: 3,
    maxWordLength: 3,
    difficulty: 'easy',
  };

  for (let attempt = 0; attempt < 100; attempt++) {
    checkTimeout();
    const rng = createRng(baseSeed + 3000 + attempt * 7919);
    const board = attemptGenerate(minimalConfig, rng, mode);
    if (board) return board;
  }

  // Should never reach here, but just in case
  throw new Error('Failed to generate board after all attempts');
}

/**
 * Hash a date string to a stable non-negative integer seed. Callers use
 * this to derive the daily challenge's Mulberry32 seed so every player
 * on the same UTC date generates the same board — which is what enables
 * a global daily leaderboard (same puzzle, comparable scores).
 */
export function dailyBoardSeed(dateString: string): number {
  let seed = 0;
  for (let i = 0; i < dateString.length; i++) {
    seed = ((seed << 5) - seed + dateString.charCodeAt(i)) | 0;
  }
  return Math.abs(seed);
}

// Module-level memo: daily board generation runs the full puzzle
// generator with retries (~tens of ms on a fresh call). Callers that
// hit the daily screen multiple times per app session (tab switches,
// navigation back-and-forth) get cached results rather than burning
// CPU regenerating the identical board.
const dailyBoardCache = new Map<string, Board>();

/**
 * Generate (or return the cached copy of) the daily challenge board for
 * the given UTC date string. Pure function of `dateString` — two
 * devices on the same date produce identical boards.
 */
export function generateDailyBoard(dateString: string): Board {
  const cached = dailyBoardCache.get(dateString);
  if (cached) return cached;

  const config: BoardConfig = {
    rows: 7,
    cols: 6,
    wordCount: 5,
    minWordLength: 3,
    maxWordLength: 5,
    difficulty: 'medium',
  };

  const board = generateBoard(config, dailyBoardSeed(dateString));
  dailyBoardCache.set(dateString, board);

  // Bound the cache so rollover doesn't leak memory over a long-lived
  // session (e.g. a player who doesn't kill the app for a week).
  if (dailyBoardCache.size > 8) {
    const firstKey = dailyBoardCache.keys().next().value;
    if (firstKey !== undefined) dailyBoardCache.delete(firstKey);
  }

  return board;
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
