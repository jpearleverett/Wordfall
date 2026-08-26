/**
 * High-Level Puzzle Generator
 *
 * Creates complete puzzle definitions using the board generator with
 * curated word selections per theme. Supports themed puzzles using
 * word categories from the atlas and procedural chapter generation
 * beyond the 40 curated chapters.
 */

import { BoardConfig, Board, Difficulty, Chapter, GameMode, GenerationProfile } from '../types';
import { generateBoard } from './boardGenerator';
import {
  getLevelConfig,
  getBreatherConfig,
  isBreatherLevel,
  isSpikeLevel,
} from '../constants';
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
  mode?: GameMode,
): PuzzleDef {
  const puzzleSeed = seed ?? (level * 1337 + Date.now());
  const board = generateBoard(config, puzzleSeed, mode);
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
  mode?: GameMode,
): PuzzleDef[] {
  const puzzles: PuzzleDef[] = [];
  const seed = baseSeed ?? Date.now();

  // Get appropriate config for the difficulty
  const baseConfig = getDifficultyConfig(difficulty);

  for (let i = 0; i < count; i++) {
    const puzzleSeed = seed + i * 7919;
    const board = generateBoard(baseConfig, puzzleSeed, mode);
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

// ─── Procedural Chapter Naming ────────────────────────────────────────────

const CHAPTER_NAME_PREFIXES = [
  'Twilight', 'Crystal', 'Neon', 'Shadow', 'Golden', 'Mystic', 'Cosmic', 'Ancient', 'Frozen', 'Ember',
  'Jade', 'Silver', 'Thunder', 'Phantom', 'Celestial', 'Iron', 'Sapphire', 'Crimson', 'Ethereal', 'Obsidian',
];

const CHAPTER_NAME_SUFFIXES = [
  'Lexicon', 'Archives', 'Codex', 'Vault', 'Sanctum', 'Chambers', 'Passages', 'Chronicles', 'Enigma', 'Grimoire',
  'Pinnacle', 'Labyrinth', 'Odyssey', 'Nexus', 'Summit', 'Dominion', 'Horizon', 'Citadel', 'Threshold', 'Meridian',
];

/**
 * Generate a deterministic themed name for procedural chapters beyond level 600.
 * @param chapterNumber - The chapter number (typically 41+)
 * @returns A formatted chapter name like "Chapter 42: Crystal Archives"
 */
export function getProceduralChapterName(chapterNumber: number): string {
  const prefix = CHAPTER_NAME_PREFIXES[chapterNumber % CHAPTER_NAME_PREFIXES.length];
  const suffix = CHAPTER_NAME_SUFFIXES[Math.floor(chapterNumber / CHAPTER_NAME_PREFIXES.length) % CHAPTER_NAME_SUFFIXES.length];
  return `Chapter ${chapterNumber}: ${prefix} ${suffix}`;
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

/** Drop one difficulty tier — used for breather chapters and breather levels. */
function easeTier(difficulty: Difficulty): Difficulty {
  switch (difficulty) {
    case 'expert': return 'hard';
    case 'hard': return 'medium';
    case 'medium': return 'easy';
    default: return difficulty;
  }
}

/** Every 5th procedural chapter is a full breather chapter (one tier easier). */
function isBreatherChapter(proceduralIndex: number): boolean {
  return proceduralIndex > 0 && proceduralIndex % 5 === 0;
}

/**
 * Get the difficulty for a procedural chapter based on its index beyond the curated content.
 * The tail SEEDS FROM the curated endgame instead of restarting below it:
 * L600 plays a 9x7/8-word expert board, so L601 opens at expert with the
 * matching config (the old `proceduralIndex < 5 ? 'hard'` on-ramp handed the
 * deepest, highest-investment cohort ~90 levels easier than level 100).
 * Breather chapters (every 5th) remain the macro relief valve, one tier down.
 */
function getProceduralDifficulty(proceduralIndex: number): Difficulty {
  return isBreatherChapter(proceduralIndex) ? 'hard' : 'expert';
}

/**
 * Get a BoardConfig for procedural chapters that scales beyond the curated difficulty.
 * Every branch scales with the chapter index — the old default branch
 * returned a FIXED 7x6/5-word board (a ~level-11 config) at any scale, which
 * is what double-eased breathers served at level 905.
 */
function getProceduralBoardConfig(proceduralIndex: number, difficulty: Difficulty): BoardConfig {
  // Scale word count and grid size beyond curated content
  const scaleFactor = Math.min(proceduralIndex, 20); // Cap scaling at 20 chapters beyond curated

  switch (difficulty) {
    case 'hard':
      // The relief tier: opens at 8x7/6 (a genuine dip from expert's 9x7/8)
      // and converges on the L600 endgame board (9x7/8) late in the tail —
      // late-game "relief" is the board a mid-game player calls a finale.
      return {
        rows: Math.min(8 + Math.floor(scaleFactor / 8), 9),
        cols: 7,
        wordCount: Math.min(6 + Math.floor(scaleFactor / 5), 8),
        minWordLength: 3,
        maxWordLength: 6,
        difficulty: 'hard',
      };
    case 'expert': {
      // Seeds at 9x7/8 — exactly the curated L600 config — then ramps to the
      // documented caps (10x8, 10 words). Never regresses below the seed.
      // decoyRichness ramps visual-search difficulty through the tail: the
      // only difficulty axis still open once the structural caps are hit,
      // and orthogonal to clear-order luck (see fillEmptyCells). Richer
      // filler multiplies solver branching, so the cap tightens on the
      // heaviest (9-10 word) boards to stay inside boardGen.perf's 900ms
      // p95 guard.
      const wordCount = Math.min(8 + Math.floor(scaleFactor / 5), 10);
      return {
        rows: Math.min(9 + Math.floor(scaleFactor / 6), 10),
        cols: Math.min(7 + Math.floor(scaleFactor / 10), 8),
        wordCount,
        minWordLength: 4,
        maxWordLength: 6,
        difficulty: 'expert',
        decoyRichness: Math.min(wordCount >= 9 ? 0.25 : 0.5, scaleFactor * 0.025),
      };
    }
    default:
      // Reached only via the adaptive-difficulty breather path
      // (getBreatherConfigExtended easing a breather chapter's 'hard') —
      // still scales so a struggling level-900 player gets a mid-size board,
      // not the level-11 one.
      return {
        rows: Math.min(7 + Math.floor(scaleFactor / 10), 8),
        cols: 6,
        wordCount: Math.min(5 + Math.floor(scaleFactor / 6), 7),
        minWordLength: 3,
        maxWordLength: 5,
        difficulty,
      };
  }
}

/**
 * Rotate the board silhouette per procedural chapter — the same idea as the
 * 1-600 endgame texture cycle — so consecutive same-tier chapters don't
 * repeat one shape for 15 levels at a stretch. Honors the documented
 * bounds: rows ≤ 10, cols 4-8, wordCount 2-10, word lengths 3-6.
 */
function applyProceduralTexture(config: BoardConfig, proceduralIndex: number): BoardConfig {
  // Seven silhouettes against the 5-chapter breather rhythm: the combined
  // cycle repeats every LCM(7,5)=35 chapters (525 levels), where the old
  // %4 cycle locked the capped tail into an exact 300-level loop from L901.
  switch (proceduralIndex % 7) {
    case 1: // tall + narrow — many shorter words, long gravity columns
      return {
        ...config,
        rows: Math.min(10, config.rows + 1),
        cols: Math.max(6, config.cols - 1),
        wordCount: Math.max(4, config.wordCount - 1),
        maxWordLength: Math.max(config.minWordLength + 1, 5),
      };
    case 2: // compact — fewer but longer words, tight board
      return {
        ...config,
        rows: Math.max(config.cols, config.rows - 1),
        wordCount: Math.max(4, config.wordCount - 1),
        maxWordLength: 6,
      };
    case 3: // large — the roomiest silhouette of the cycle
      return {
        ...config,
        rows: Math.min(10, config.rows + 1),
      };
    case 4: // wide — short stacks, long word window
      return {
        ...config,
        rows: Math.max(config.minWordLength + 2, config.rows - 1),
        cols: Math.min(8, config.cols + 1),
        maxWordLength: 6,
      };
    case 5: // sparse — fewer words rattling around the full grid
      return {
        ...config,
        wordCount: Math.max(5, config.wordCount - 2),
        maxWordLength: 6,
      };
    case 6: // swarm — one extra short word, tighter length window
      return {
        ...config,
        wordCount: Math.min(10, config.wordCount + 1),
        minWordLength: 3,
        maxWordLength: Math.max(4, config.maxWordLength - 1),
      };
    default: // standard mix — the base procedural config
      return config;
  }
}

/**
 * Spike transformation for procedural levels: one more word + one longer
 * word, mirroring the curated range's applySpike but with an explicit
 * wordCount cap (procedural expert configs already reach the 10-word bound).
 */
function applyProceduralSpike(config: BoardConfig): BoardConfig {
  // Procedural levels are all past BOSS_WORD_MIN_LEVEL (300), so the spike's
  // +1-length step may reach the 7-letter boss-word window.
  return {
    ...config,
    wordCount: Math.min(10, config.wordCount + 1),
    maxWordLength: Math.min(7, config.maxWordLength + 1),
  };
}

/**
 * Generate a procedural chapter definition for chapters beyond the 40 curated ones.
 * Each chapter has a theme, 15 puzzles, and difficulty that continues scaling.
 *
 * @param chapterId - The chapter number (41+)
 * @returns A Chapter definition compatible with the curated chapter format
 */
const PROCEDURAL_ADJECTIVES = [
  'Hidden', 'Lost', 'Ancient', 'Mystic', 'Sacred', 'Golden', 'Silver',
  'Crystal', 'Shadow', 'Ember', 'Frozen', 'Radiant', 'Eternal', 'Cosmic',
  'Primal', 'Arcane', 'Phantom', 'Crimson', 'Azure', 'Emerald',
  'Twilight', 'Obsidian', 'Ivory', 'Amber', 'Verdant', 'Sapphire',
  'Gilded', 'Starlit', 'Thundering', 'Whispering', 'Sunken', 'Floating',
  'Forgotten', 'Boundless', 'Luminous', 'Umbral', 'Astral', 'Tidal',
  'Molten', 'Opaline',
];

const PROCEDURAL_NOUNS = [
  'Vault', 'Archive', 'Sanctum', 'Garden', 'Citadel', 'Haven', 'Forge',
  'Temple', 'Tower', 'Realm', 'Domain', 'Nexus', 'Passage', 'Chamber',
  'Summit', 'Oasis', 'Bastion', 'Spire', 'Depths', 'Pinnacle',
  'Atelier', 'Observatory', 'Rotunda', 'Crossing', 'Terrace', 'Grotto',
  'Hollow', 'Expanse', 'Threshold', 'Menagerie', 'Reliquary', 'Solarium',
  'Causeway', 'Wilds', 'Foundry', 'Gallery', 'Labyrinth', 'Conservatory',
  'Enclave', 'Aerie',
];

/**
 * Theme-name variants rotated once per full pass over PROCEDURAL_THEMES, so
 * the second nature-themed chapter reads "Nature Expedition", not a xerox of
 * the first pass's "Nature Mastery".
 */
const PROCEDURAL_THEME_VARIANTS = [
  'Mastery', 'Expedition', 'Trials', 'Odyssey',
  'Legacy', 'Frontier', 'Ascension', 'Chronicles',
];

const PROCEDURAL_DESCRIPTIONS: ReadonlyArray<(themeName: string) => string> = [
  (t) => `A ${t}-themed challenge from the endless archive.`,
  (t) => `Trace your way through ${t} words that grow trickier with every board.`,
  (t) => `The library's ${t} shelves run deep — clear them word by word.`,
  (t) => `Sharpen your ${t} vocabulary against ever-shifting boards.`,
];

export function generateProceduralChapter(chapterId: number): Chapter {
  if (chapterId <= CURATED_CHAPTER_COUNT) {
    throw new Error(`Chapter ${chapterId} is a curated chapter, not procedural`);
  }

  const proceduralIndex = chapterId - CURATED_CHAPTER_COUNT - 1; // 0-indexed
  const themeInfo = PROCEDURAL_THEMES[proceduralIndex % PROCEDURAL_THEMES.length];
  const themeCycle = Math.floor(proceduralIndex / PROCEDURAL_THEMES.length);
  const category = getCategory(themeInfo.categoryId);
  const difficulty = getProceduralDifficulty(proceduralIndex);

  // Generate stars requirement based on chapter position
  const prevChapterStars = 234 + (proceduralIndex * 6); // Continues from chapter 40 (234 stars)

  const rng = createRng(chapterId * 31337);
  const adj = PROCEDURAL_ADJECTIVES[Math.floor(rng() * PROCEDURAL_ADJECTIVES.length)];
  const noun = PROCEDURAL_NOUNS[Math.floor(rng() * PROCEDURAL_NOUNS.length)];

  // Rotate the theme-word window per visit instead of always taking the
  // first 12 — repeat visits to a category get a fresh word list.
  const wordPool = category
    ? category.words.filter(w => w.length >= 3 && w.length <= 8)
    : [];
  const themeWords = shuffleWithRng(wordPool, rng)
    .slice(0, 12)
    .map(w => w.toLowerCase());

  const variant = PROCEDURAL_THEME_VARIANTS[themeCycle % PROCEDURAL_THEME_VARIANTS.length];
  const describe = PROCEDURAL_DESCRIPTIONS[Math.floor(rng() * PROCEDURAL_DESCRIPTIONS.length)];

  // Mirror the curated sawtooth's generation levers: breather chapters get
  // airy boards, wing finales get dense long-word boards, expert chapters
  // pull from the rarer dictionary tier.
  const finale = proceduralIndex % 5 === 4;
  const breather = isBreatherChapter(proceduralIndex);
  const densityLo = breather ? 0.1 : difficulty === 'expert' ? 0.02 : 0.06;
  const densityHi = breather ? 0.14 : difficulty === 'expert' ? 0.06 : 0.1;
  const emptyCellDensity =
    Math.round((densityLo + rng() * (densityHi - densityLo)) * 100) / 100;
  const profile: GenerationProfile = finale
    ? { introducedMechanics: ['longWords', 'denseBoard'], dictionaryTier: 'expert' }
    : {
        introducedMechanics: difficulty === 'expert' ? ['longWords'] : ['fourLetter'],
        emptyCellDensity,
        dictionaryTier: difficulty === 'expert' ? 'expert' : 'standard',
      };

  return {
    id: chapterId,
    name: `${adj} ${noun}`,
    theme: `${themeInfo.name} ${variant}`,
    description: describe(themeInfo.name.toLowerCase()),
    puzzleCount: PUZZLES_PER_CHAPTER,
    requiredStars: prevChapterStars,
    difficulty,
    themeWords,
    wingId: `procedural_${Math.floor(proceduralIndex / 5)}`,
    icon: themeInfo.icon,
    profile,
    isBossChapter: finale,
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

function proceduralChapterIndexForLevel(level: number): number {
  const proceduralLevel = level - CURATED_LEVEL_COUNT;
  return Math.floor((proceduralLevel - 1) / PUZZLES_PER_CHAPTER);
}

/**
 * Get the board config for a given level, supporting levels beyond the curated 600.
 * For curated levels (1-600), delegates to getLevelConfig.
 * For procedural levels (601+), the tier ramp from getProceduralDifficulty is
 * layered with the same per-level cadence the curated range has: every 5th
 * level is a breather (one tier easier), spike levels (multiples of 13,
 * RC-gated, breathers win collisions) add a word, and the board silhouette
 * rotates per chapter so the infinite tail never flatlines into one shape.
 */
export function getLevelConfigExtended(level: number): BoardConfig {
  if (level <= CURATED_LEVEL_COUNT) {
    return getLevelConfig(level);
  }

  const chapterIndex = proceduralChapterIndexForLevel(level);
  const difficulty = getProceduralDifficulty(chapterIndex);

  // Breather levels play the standard silhouette one tier down — a real
  // relief valve, not just a smaller spike. Inside a breather CHAPTER the
  // tier is already eased, so the per-level breather dips in config space
  // instead of easing twice (double-easing is how level 905 used to serve a
  // level-11 board).
  if (isBreatherLevel(level)) {
    if (isBreatherChapter(chapterIndex)) {
      // Dip from the same textured config the chapter's plain levels play,
      // so the breather is always the lightest board in its own chapter.
      const eased = applyProceduralTexture(
        getProceduralBoardConfig(chapterIndex, difficulty),
        chapterIndex,
      );
      return { ...eased, wordCount: Math.max(4, eased.wordCount - 1) };
    }
    return getProceduralBoardConfig(chapterIndex, easeTier(difficulty));
  }

  let config = getProceduralBoardConfig(chapterIndex, difficulty);
  config = applyProceduralTexture(config, chapterIndex);
  if (isSpikeLevel(level)) {
    config = applyProceduralSpike(config);
  }
  return config;
}

/**
 * Breather-mode config (used by the adaptive-difficulty "needsBreather" path)
 * that stays correct past level 600. The curated-range getBreatherConfig maps
 * a level to the phase config from 4 levels earlier, but past 600 that lands
 * on the endgame texture cycle — which is HARDER than the early procedural
 * tail. Here the procedural tail eases one tier instead.
 */
export function getBreatherConfigExtended(level: number): BoardConfig {
  if (level <= CURATED_LEVEL_COUNT) {
    return getBreatherConfig(level);
  }
  const chapterIndex = proceduralChapterIndexForLevel(level);
  const difficulty = getProceduralDifficulty(chapterIndex);
  return getProceduralBoardConfig(chapterIndex, easeTier(difficulty));
}
