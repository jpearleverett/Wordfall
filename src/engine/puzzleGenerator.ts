/**
 * High-Level Puzzle Generator
 *
 * Creates complete puzzle definitions using the board generator with
 * curated word selections per theme. Supports themed puzzles using
 * word categories from the atlas and procedural chapter generation
 * beyond the 40 curated chapters.
 */

import { BoardConfig, Board, Difficulty, Chapter } from '../types';
import { generateBoard } from './boardGenerator';
import { getLevelConfig } from '../constants';
import { getWordsByLength, getAllWords } from '../words';
import {
  WORD_CATEGORIES,
  WordCategory,
  getCategory,
  getCategoryWords,
  getRandomCategory,
} from '../data/wordCategories';

// Seeded PRNG (same as boardGenerator for consistency)
function createRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Puzzle Definition ─────────────────────────────────────────────────────

export interface PuzzleDef {
  id: string;
  board: Board;
  theme?: string;
  themeIcon?: string;
  difficulty: Difficulty;
  level: number;
  seed: number;
}

// ─── Themed Word Selection ─────────────────────────────────────────────────

/**
 * Select words for a puzzle, preferring words from the given theme category.
 * Falls back to the general word pool if the category doesn't have enough words.
 */
function selectThemedWords(
  config: BoardConfig,
  categoryId: string,
  rng: () => number,
): string[] {
  const allWords = new Set(getAllWords());
  const categoryWords = getCategoryWords(categoryId, config.minWordLength, config.maxWordLength)
    .filter(w => allWords.has(w));

  const shuffledCategory = shuffleWithRng(categoryWords, rng);
  const selected: string[] = [];
  const usedStarts = new Set<string>();

  // First, pick words from the theme category
  for (const word of shuffledCategory) {
    if (selected.length >= config.wordCount) break;
    if (selected.length < config.wordCount - 1 && usedStarts.has(word[0])) continue;
    const isSubstring = selected.some(w => w.includes(word) || word.includes(w));
    if (isSubstring) continue;
    selected.push(word);
    usedStarts.add(word[0]);
  }

  // Fill remaining slots from the general pool
  if (selected.length < config.wordCount) {
    const generalPool = getWordsByLength(config.minWordLength, config.maxWordLength);
    const shuffledGeneral = shuffleWithRng(generalPool, rng);
    for (const word of shuffledGeneral) {
      if (selected.length >= config.wordCount) break;
      if (selected.includes(word)) continue;
      if (selected.length < config.wordCount - 1 && usedStarts.has(word[0])) continue;
      const isSubstring = selected.some(w => w.includes(word) || word.includes(w));
      if (isSubstring) continue;
      selected.push(word);
      usedStarts.add(word[0]);
    }
  }

  return selected;
}

// ─── Single Puzzle Generation ──────────────────────────────────────────────

/**
 * Generate a single puzzle with optional theme.
 */
export function generatePuzzle(
  level: number,
  config: BoardConfig,
  theme?: string,
  seed?: number,
): PuzzleDef {
  const puzzleSeed = seed ?? (level * 1337 + Date.now());
  const board = generateBoard(config, puzzleSeed);
  const category = theme ? getCategory(theme) : undefined;

  return {
    id: `puzzle_${level}_${puzzleSeed}`,
    board,
    theme: category?.name ?? theme,
    themeIcon: category?.icon,
    difficulty: config.difficulty,
    level,
    seed: puzzleSeed,
  };
}

// ─── Puzzle Set Generation ─────────────────────────────────────────────────

/**
 * Generate a set of puzzles with the given difficulty and optional theme.
 * Useful for event puzzles, chapter generation, etc.
 */
export function generatePuzzleSet(
  count: number,
  difficulty: Difficulty,
  theme?: string,
  baseSeed?: number,
): PuzzleDef[] {
  const puzzles: PuzzleDef[] = [];
  const seed = baseSeed ?? Date.now();

  // Get appropriate config for the difficulty
  const baseConfig = getDifficultyConfig(difficulty);

  for (let i = 0; i < count; i++) {
    const puzzleSeed = seed + i * 7919;
    const board = generateBoard(baseConfig, puzzleSeed);
    const category = theme ? getCategory(theme) : undefined;

    puzzles.push({
      id: `set_${seed}_${i}`,
      board,
      theme: category?.name ?? theme,
      themeIcon: category?.icon,
      difficulty,
      level: i + 1,
      seed: puzzleSeed,
    });
  }

  return puzzles;
}

/**
 * Get a BoardConfig for a given difficulty tier.
 */
function getDifficultyConfig(difficulty: Difficulty): BoardConfig {
  switch (difficulty) {
    case 'easy':
      return { rows: 5, cols: 5, wordCount: 3, minWordLength: 3, maxWordLength: 4, difficulty: 'easy' };
    case 'medium':
      return { rows: 6, cols: 6, wordCount: 4, minWordLength: 3, maxWordLength: 5, difficulty: 'medium' };
    case 'hard':
      return { rows: 7, cols: 7, wordCount: 5, minWordLength: 3, maxWordLength: 6, difficulty: 'hard' };
    case 'expert':
      return { rows: 8, cols: 7, wordCount: 7, minWordLength: 4, maxWordLength: 6, difficulty: 'expert' };
  }
}

// ─── Procedural Chapter Generation ─────────────────────────────────────────

/**
 * The total number of curated chapters.
 */
const CURATED_CHAPTER_COUNT = 40;
const PUZZLES_PER_CHAPTER = 15;
const CURATED_LEVEL_COUNT = CURATED_CHAPTER_COUNT * PUZZLES_PER_CHAPTER; // 600

/**
 * Chapter themes for procedural generation, cycling through categories.
 * Each procedural chapter picks a theme from this rotation.
 */
const PROCEDURAL_THEMES = WORD_CATEGORIES.map(c => ({
  categoryId: c.id,
  name: c.name,
  icon: c.icon,
}));

/**
 * Get the difficulty for a procedural chapter based on its index beyond the curated content.
 * Difficulty continues scaling beyond level 40's expert tier, with periodic
 * breather chapters (every 5th procedural chapter is one tier easier).
 */
function getProceduralDifficulty(proceduralIndex: number): Difficulty {
  // Every 5th procedural chapter is a breather (one tier easier)
  const isBreather = proceduralIndex > 0 && proceduralIndex % 5 === 0;

  // Base progression: hard for first 10, then expert forever
  let baseDifficulty: Difficulty;
  if (proceduralIndex < 5) {
    baseDifficulty = 'hard';
  } else if (proceduralIndex < 10) {
    baseDifficulty = 'expert';
  } else {
    baseDifficulty = 'expert';
  }

  if (isBreather) {
    switch (baseDifficulty) {
      case 'expert': return 'hard';
      case 'hard': return 'medium';
      default: return baseDifficulty;
    }
  }

  return baseDifficulty;
}

/**
 * Get a BoardConfig for procedural chapters that scales beyond the curated difficulty.
 * Increases word count and grid size progressively.
 */
function getProceduralBoardConfig(proceduralIndex: number, difficulty: Difficulty): BoardConfig {
  // Scale word count and grid size beyond curated content
  const scaleFactor = Math.min(proceduralIndex, 20); // Cap scaling at 20 chapters beyond curated

  switch (difficulty) {
    case 'hard':
      return {
        rows: 7 + Math.floor(scaleFactor / 8),
        cols: 7,
        wordCount: 5 + Math.floor(scaleFactor / 5),
        minWordLength: 3,
        maxWordLength: 6,
        difficulty: 'hard',
      };
    case 'expert':
      return {
        rows: Math.min(9 + Math.floor(scaleFactor / 6), 10),
        cols: Math.min(7 + Math.floor(scaleFactor / 10), 8),
        wordCount: Math.min(7 + Math.floor(scaleFactor / 4), 10),
        minWordLength: 4,
        maxWordLength: 6,
        difficulty: 'expert',
      };
    default:
      return {
        rows: 7,
        cols: 6,
        wordCount: 5,
        minWordLength: 3,
        maxWordLength: 5,
        difficulty,
      };
  }
}

/**
 * Generate a procedural chapter definition for chapters beyond the 40 curated ones.
 * Each chapter has a theme, 15 puzzles, and difficulty that continues scaling.
 *
 * @param chapterId - The chapter number (41+)
 * @returns A Chapter definition compatible with the curated chapter format
 */
export function generateProceduralChapter(chapterId: number): Chapter {
  if (chapterId <= CURATED_CHAPTER_COUNT) {
    throw new Error(`Chapter ${chapterId} is a curated chapter, not procedural`);
  }

  const proceduralIndex = chapterId - CURATED_CHAPTER_COUNT - 1; // 0-indexed
  const themeInfo = PROCEDURAL_THEMES[proceduralIndex % PROCEDURAL_THEMES.length];
  const category = getCategory(themeInfo.categoryId);
  const difficulty = getProceduralDifficulty(proceduralIndex);

  // Generate stars requirement based on chapter position
  const prevChapterStars = 234 + (proceduralIndex * 6); // Continues from chapter 40 (234 stars)

  // Pick theme words from the category
  const themeWords = category ? category.words.slice(0, 12).map(w => w.toLowerCase()) : [];

  // Generate chapter name with variety
  const adjectives = [
    'Hidden', 'Lost', 'Ancient', 'Mystic', 'Sacred', 'Golden', 'Silver',
    'Crystal', 'Shadow', 'Ember', 'Frozen', 'Radiant', 'Eternal', 'Cosmic',
    'Primal', 'Arcane', 'Phantom', 'Crimson', 'Azure', 'Emerald',
  ];
  const nouns = [
    'Vault', 'Archive', 'Sanctum', 'Garden', 'Citadel', 'Haven', 'Forge',
    'Temple', 'Tower', 'Realm', 'Domain', 'Nexus', 'Passage', 'Chamber',
    'Summit', 'Oasis', 'Bastion', 'Spire', 'Depths', 'Pinnacle',
  ];

  const rng = createRng(chapterId * 31337);
  const adj = adjectives[Math.floor(rng() * adjectives.length)];
  const noun = nouns[Math.floor(rng() * nouns.length)];

  return {
    id: chapterId,
    name: `${adj} ${noun}`,
    theme: `${themeInfo.name} Mastery`,
    description: `A procedurally generated ${themeInfo.name.toLowerCase()}-themed challenge.`,
    puzzleCount: PUZZLES_PER_CHAPTER,
    requiredStars: prevChapterStars,
    difficulty,
    themeWords,
    wingId: `procedural_${Math.floor(proceduralIndex / 5)}`,
    icon: themeInfo.icon,
  };
}

/**
 * Get a chapter by ID, falling back to procedural generation for chapters > 40.
 */
export function getChapterExtended(chapterId: number, curatedChapters: Chapter[]): Chapter {
  const curated = curatedChapters.find(ch => ch.id === chapterId);
  if (curated) return curated;
  return generateProceduralChapter(chapterId);
}

/**
 * Get the board config for a given level, supporting levels beyond the curated 600.
 * For curated levels (1-600), delegates to getLevelConfig.
 * For procedural levels (601+), generates appropriate difficulty.
 */
export function getLevelConfigExtended(level: number): BoardConfig {
  if (level <= CURATED_LEVEL_COUNT) {
    return getLevelConfig(level);
  }

  // Beyond curated content
  const proceduralLevel = level - CURATED_LEVEL_COUNT;
  const proceduralChapterIndex = Math.floor((proceduralLevel - 1) / PUZZLES_PER_CHAPTER);
  const difficulty = getProceduralDifficulty(proceduralChapterIndex);
  return getProceduralBoardConfig(proceduralChapterIndex, difficulty);
}
