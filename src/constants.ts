import { Dimensions } from 'react-native';
import { BoardConfig, Difficulty, GameMode, ModeConfig } from './types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Layout
export const GRID_PADDING = 12;
export const CELL_GAP = 4;
export const MAX_GRID_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;
export const CELL_SIZE = (col: number) =>
  Math.floor((MAX_GRID_WIDTH - CELL_GAP * (col - 1)) / col);

// Colors — SYNTHWAVE / MIAMI VICE palette
export const COLORS = {
  bg: '#0a0015',
  bgLight: '#150028',
  surface: '#1a0a2e',
  surfaceLight: '#2d1452',

  cellDefault: '#2a1548',
  cellSelected: '#ff2d95',
  cellHint: '#ffb800',
  cellFound: '#1a3a2a',

  textPrimary: '#f0e6ff',
  textSecondary: '#b08cda',
  textMuted: '#6b4d8a',

  accent: '#ff2d95',
  accentLight: '#ff6eb8',
  accentDark: '#cc1a72',
  accentGlow: 'rgba(255, 45, 149, 0.55)',
  gold: '#ffb800',
  goldLight: '#ffd24d',
  goldGlow: 'rgba(255, 184, 0, 0.50)',
  green: '#00ff87',
  greenGlow: 'rgba(0, 255, 135, 0.50)',
  coral: '#ff4466',
  coralGlow: 'rgba(255, 68, 102, 0.45)',
  purple: '#c84dff',
  purpleLight: '#e0a0ff',
  purpleGlow: 'rgba(200, 77, 255, 0.50)',
  orange: '#ff6a00',
  orangeGlow: 'rgba(255, 106, 0, 0.45)',
  teal: '#00f5d4',
  tealGlow: 'rgba(0, 245, 212, 0.50)',
  pink: '#ff2d95',
  pinkGlow: 'rgba(255, 45, 149, 0.50)',
  cyan: '#00e5ff',
  cyanGlow: 'rgba(0, 229, 255, 0.50)',

  wordFound: '#00ff87',
  wordPending: '#b08cda',
  wordActive: '#ff2d95',

  star: '#ffb800',
  starEmpty: '#2a1548',

  buttonPrimary: '#ff2d95',
  buttonSecondary: '#2d1452',
  buttonDanger: '#ff4466',
  buttonGold: '#ffb800',

  rarityCommon: '#b08cda',
  rarityRare: '#00e5ff',
  rarityEpic: '#c84dff',
  rarityLegendary: '#ffb800',

  tierBronze: '#d4893a',
  tierSilver: '#d0d8e8',
  tierGold: '#ffb800',
  tierDiamond: '#00e5ff',

  tabActive: '#ff2d95',
  tabInactive: '#6b4d8a',

  surface2: '#2d1452',
  surfaceGlass: 'rgba(26, 10, 46, 0.88)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderMedium: 'rgba(255,255,255,0.12)',
  borderAccent: 'rgba(255,45,149,0.30)',
  textTertiary: '#4a2d6b',

  // Synthwave extended palette
  chrome: '#d4e0f7',
  chromeDark: '#8a9ab5',
  chromeHighlight: '#eef2ff',
  sunset: '#ff6b35',
  sunsetDeep: '#cc4400',
  sunsetWarm: '#ff9f43',
  neonTube: '#ff2d95',
  scanLine: 'rgba(255,255,255,0.03)',
  vhsStatic: 'rgba(255,255,255,0.02)',
  mountainSilhouette: '#1a0533',
  horizonGlow: 'rgba(255,45,149,0.35)',
};

// Gradient presets — synthwave / Miami
export const GRADIENTS = {
  tile: {
    default: ['rgba(42,21,72,0.80)', 'rgba(26,10,46,0.85)', 'rgba(35,15,60,0.82)'] as const,
    selected: ['#ff2d95', '#e91e8c', '#c84dff'] as const,
    valid: ['#00ff87', '#00e676', '#00cc6a'] as const,
    hint: ['#ffd24d', '#ffb800', '#ff9500'] as const,
    frozen: ['rgba(0,229,255,0.30)', 'rgba(0,180,216,0.25)', 'rgba(0,140,180,0.30)'] as const,
    wildcard: ['#ffd700', '#ff9500', '#ff2d95'] as const,
  },
  button: {
    primary: ['#ff2d95', '#e91e8c', '#c84dff'] as const,
    gold: ['#ffd24d', '#ffb800', '#ff9500'] as const,
    danger: ['#ff4466', '#ff2d55', '#ee1a3a'] as const,
    green: ['#00ff87', '#00e676', '#00cc6a'] as const,
  },
  surface: ['#1a0a2e', '#120620'] as const,
  surfaceCard: ['rgba(45,20,82,0.75)', 'rgba(26,10,46,0.80)'] as const,
  header: ['rgba(45,20,82,0.80)', 'rgba(20,8,38,0.85)'] as const,
  bg: ['#08000f', '#0a0015', '#12002a'] as const,
  grid: ['rgba(42,21,72,0.50)', 'rgba(26,10,46,0.45)', 'rgba(35,15,60,0.48)'] as const,
  gridBorder: ['rgba(255,45,149,0.25)', 'rgba(200,77,255,0.20)', 'rgba(0,229,255,0.15)'] as const,
  victoryCard: ['#2d1452', '#1a0a2e', '#120620'] as const,
  scorePanel: ['#150028', '#1a0a2e'] as const,
  tabBar: ['#1a0a2e', '#0a0015'] as const,

  synthwave: {
    sky: ['#08000f', '#1a0533', '#3d1055', '#2a0845', '#150030'] as const,
    sun: ['#ff2d95', '#ff6eb8', '#c84dff', '#00e5ff', '#00b4d8'] as const,
    sunInner: ['rgba(255,45,149,0.9)', 'rgba(255,110,184,0.6)', 'rgba(200,77,255,0.4)', 'rgba(0,229,255,0.2)'] as const,
    ground: ['#1a0533', '#0d0020', '#060010'] as const,
    gridLine: ['rgba(255,45,149,0.5)', 'rgba(200,77,255,0.3)', 'rgba(0,229,255,0.15)'] as const,
    // New synthwave materials
    sunBands: ['#ff1493', '#ff2d95', '#ff6b35', '#ffb800', '#ff6b35', '#ff2d95'] as const,
    chrome: ['#d4e0f7', '#8a9ab5', '#d4e0f7'] as const,
    neonTube: ['rgba(255,45,149,0.0)', 'rgba(255,45,149,0.8)', 'rgba(255,45,149,0.0)'] as const,
    crtScreen: ['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.1)'] as const,
    holographic: ['#ff2d95', '#c84dff', '#00e5ff', '#00ff87', '#ffb800'] as const,
    mountainFar: ['#2a0845', '#1a0533'] as const,
    mountainNear: ['#1a0533', '#0d0020'] as const,
    aurora: ['rgba(0,229,255,0.12)', 'rgba(200,77,255,0.08)', 'rgba(0,245,212,0.06)'] as const,
  },

  tileSurface: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)'] as const,
  glassOverlay: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.0)'] as const,
  boardGlow: ['rgba(255,45,149,0.08)', 'rgba(200,77,255,0.05)', 'transparent'] as const,
  goldShine: ['rgba(255,210,77,0.3)', 'rgba(255,184,0,0.1)', 'transparent'] as const,
  celebrationOverlay: ['rgba(255,45,149,0.08)', 'transparent', 'rgba(200,77,255,0.06)'] as const,
};

// Shadow presets
export const SHADOWS = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 14,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  }),
  neonGlow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 14,
  }),
  neonEdge: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  }),
  chromeDepth: {
    shadowColor: '#8a9ab5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
};

// Difficulty configs
export const DIFFICULTY_CONFIGS: Record<Difficulty, BoardConfig> = {
  easy: {
    rows: 6,
    cols: 5,
    wordCount: 3,
    minWordLength: 3,
    maxWordLength: 4,
    difficulty: 'easy',
  },
  medium: {
    rows: 7,
    cols: 6,
    wordCount: 5,
    minWordLength: 3,
    maxWordLength: 5,
    difficulty: 'medium',
  },
  hard: {
    rows: 8,
    cols: 7,
    wordCount: 6,
    minWordLength: 3,
    maxWordLength: 6,
    difficulty: 'hard',
  },
  expert: {
    rows: 9,
    cols: 7,
    wordCount: 8,
    minWordLength: 4,
    maxWordLength: 6,
    difficulty: 'expert',
  },
};

// Level progression — smooth per-level ramp with breather pacing
// Inspired by Candy Crush / Royal Match: gradual increase with periodic easy levels
// instead of a cliff at each difficulty threshold.
export function getLevelConfig(level: number): BoardConfig {
  // Breather levels: every 5th level is slightly easier (sawtooth pattern)
  const isBreather = level > 1 && level % 5 === 0;
  const effectiveLevel = isBreather ? level - 2 : level;

  // Phase 1: Tutorial / Easy (levels 1-5) — gentle ramp from 2 to 3 words
  if (effectiveLevel <= 3) {
    return { rows: 5, cols: 4, wordCount: 2, minWordLength: 3, maxWordLength: 3, difficulty: 'easy' };
  }
  if (effectiveLevel <= 5) {
    return { rows: 5, cols: 5, wordCount: 3, minWordLength: 3, maxWordLength: 4, difficulty: 'easy' };
  }

  // Phase 2: Early game (levels 6-10) — introduce bigger grids gradually
  if (effectiveLevel <= 7) {
    return { rows: 6, cols: 5, wordCount: 3, minWordLength: 3, maxWordLength: 4, difficulty: 'easy' };
  }
  if (effectiveLevel <= 10) {
    return { rows: 6, cols: 5, wordCount: 4, minWordLength: 3, maxWordLength: 4, difficulty: 'medium' };
  }

  // Phase 3: Building confidence (levels 11-15) — 4-5 words, longer words creep in
  if (effectiveLevel <= 12) {
    return { rows: 6, cols: 6, wordCount: 4, minWordLength: 3, maxWordLength: 5, difficulty: 'medium' };
  }
  if (effectiveLevel <= 15) {
    return { rows: 7, cols: 6, wordCount: 5, minWordLength: 3, maxWordLength: 5, difficulty: 'medium' };
  }

  // Phase 4: Mid-game (levels 16-22) — grid grows, word count climbs
  if (effectiveLevel <= 18) {
    return { rows: 7, cols: 6, wordCount: 5, minWordLength: 3, maxWordLength: 5, difficulty: 'hard' };
  }
  if (effectiveLevel <= 22) {
    return { rows: 7, cols: 7, wordCount: 5, minWordLength: 3, maxWordLength: 6, difficulty: 'hard' };
  }

  // Phase 5: Late mid-game (levels 23-30) — 6 words, bigger grids
  if (effectiveLevel <= 26) {
    return { rows: 8, cols: 7, wordCount: 6, minWordLength: 3, maxWordLength: 6, difficulty: 'hard' };
  }
  if (effectiveLevel <= 30) {
    return { rows: 8, cols: 7, wordCount: 6, minWordLength: 3, maxWordLength: 6, difficulty: 'hard' };
  }

  // Phase 6: Expert (levels 31-40) — harder word constraints, more words
  if (effectiveLevel <= 35) {
    return { rows: 8, cols: 7, wordCount: 7, minWordLength: 3, maxWordLength: 6, difficulty: 'expert' };
  }
  if (effectiveLevel <= 40) {
    return { rows: 9, cols: 7, wordCount: 7, minWordLength: 4, maxWordLength: 6, difficulty: 'expert' };
  }

  // Phase 7: Endgame (levels 41+) — full expert config
  return { rows: 9, cols: 7, wordCount: 8, minWordLength: 4, maxWordLength: 6, difficulty: 'expert' };
}

/**
 * Get a gentler config for first-time mode plays.
 * Ramps difficulty based on how many times the player has played this mode,
 * scaling from easy up to their normal level config over ~5 plays.
 * This prevents a level-50 player from getting an expert board on their
 * first ever shrinkingBoard attempt.
 */
export function getModeIntroConfig(
  levelConfig: BoardConfig,
  modePlays: number,
): BoardConfig {
  // After 5 plays in the mode, use the full level config
  if (modePlays >= 5) return levelConfig;

  // Introductory ramp: blend from easy toward the level config
  const introConfigs: BoardConfig[] = [
    // Play 0 (first ever): easy
    { rows: 5, cols: 5, wordCount: 3, minWordLength: 3, maxWordLength: 4, difficulty: 'easy' },
    // Play 1: easy+
    { rows: 6, cols: 5, wordCount: 3, minWordLength: 3, maxWordLength: 4, difficulty: 'easy' },
    // Play 2: medium-
    { rows: 6, cols: 5, wordCount: 4, minWordLength: 3, maxWordLength: 4, difficulty: 'medium' },
    // Play 3: medium
    { rows: 6, cols: 6, wordCount: 4, minWordLength: 3, maxWordLength: 5, difficulty: 'medium' },
    // Play 4: medium+ (approaching their level config)
    { rows: 7, cols: 6, wordCount: 5, minWordLength: 3, maxWordLength: 5, difficulty: 'medium' },
  ];

  const introConfig = introConfigs[modePlays];

  // Never make it harder than their actual level config
  return {
    rows: Math.min(introConfig.rows, levelConfig.rows),
    cols: Math.min(introConfig.cols, levelConfig.cols),
    wordCount: Math.min(introConfig.wordCount, levelConfig.wordCount),
    minWordLength: Math.min(introConfig.minWordLength, levelConfig.minWordLength),
    maxWordLength: Math.min(introConfig.maxWordLength, levelConfig.maxWordLength),
    difficulty: introConfig.difficulty,
  };
}

// Legacy helper: get the broad difficulty tier for a level (used for rewards, UI labels)
export function getDifficultyTier(level: number): Difficulty {
  if (level <= 5) return 'easy';
  if (level <= 15) return 'medium';
  if (level <= 30) return 'hard';
  return 'expert';
}

// Mode configurations
export const MODE_CONFIGS: Record<GameMode, ModeConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Solve all listed words',
    icon: '📖',
    color: COLORS.accent,
    unlockLevel: 1,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 1,
      comboMode: false,
    },
  },
  shrinkingBoard: {
    id: 'shrinkingBoard',
    name: 'Shrinking Board',
    description: 'Board shrinks every 2 words',
    icon: '🔻',
    color: COLORS.coral,
    unlockLevel: 5,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 1.25,
      comboMode: false,
      skillGate: { perfectSolves: 3 },
    },
  },
  timePressure: {
    id: 'timePressure',
    name: 'Time Pressure',
    description: 'Beat the clock',
    icon: '⏱️',
    color: COLORS.orange,
    unlockLevel: 8,
    rules: {
      hasTimer: true,
      timerSeconds: 120,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 1.5,
      comboMode: false,
      skillGate: { perfectSolves: 5 },
    },
  },
  perfectSolve: {
    id: 'perfectSolve',
    name: 'Perfect Solve',
    description: 'Zero mistakes, no assists',
    icon: '💎',
    color: COLORS.gold,
    unlockLevel: 12,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: false,
      allowUndo: false,
      unlimitedUndo: false,
      scoreMultiplier: 2,
      comboMode: false,
      skillGate: { perfectSolves: 10, minStars: 30 },
    },
  },
  gravityFlip: {
    id: 'gravityFlip',
    name: 'Gravity Flip',
    description: 'Gravity rotates 90° after each word',
    icon: '🔄',
    color: COLORS.coral,
    unlockLevel: 10,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 1.5,
      comboMode: false,
      skillGate: { minStars: 50 },
    },
  },
  daily: {
    id: 'daily',
    name: 'Daily Challenge',
    description: 'Same puzzle for everyone',
    icon: '☀️',
    color: COLORS.gold,
    unlockLevel: 1,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 1,
      comboMode: false,
    },
  },
  weekly: {
    id: 'weekly',
    name: 'Weekly Special',
    description: 'Curated hard puzzle',
    icon: '🏆',
    color: COLORS.purple,
    unlockLevel: 10,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 1.5,
      comboMode: false,
      skillGate: { puzzlesSolved: 20 },
    },
  },
  noGravity: {
    id: 'noGravity',
    name: 'No Gravity',
    description: 'Letters stay put — pure word finding',
    icon: '🚀',
    color: COLORS.teal,
    unlockLevel: 3,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 0.75,
      comboMode: false,
    },
  },
  expert: {
    id: 'expert',
    name: 'Expert',
    description: 'Minimal hints, harder boards',
    icon: '🧠',
    color: COLORS.purple,
    unlockLevel: 30,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: false,
      allowUndo: false,
      unlimitedUndo: false,
      scoreMultiplier: 2,
      comboMode: false,
      skillGate: { perfectSolves: 25, minStars: 100 },
    },
  },
  relax: {
    id: 'relax',
    name: 'Relax',
    description: 'No pressure, unlimited undos',
    icon: '🌿',
    color: COLORS.green,
    unlockLevel: 3,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: true,
      scoreMultiplier: 0.5,
      comboMode: false,
    },
  },
};

// Scoring
export const SCORE = {
  wordFound: 100,
  bonusPerLetter: 20,
  comboMultiplier: 0.5,
  perfectClear: 500,
  noHints: 200,
  starThresholds: [0.5, 0.75, 1.0],
  timeBonus: 10, // points per second remaining
  chainBonus: 150, // bonus for gravity-revealed chain
};

// Hints & Undos
export const INITIAL_HINTS = 3;
export const INITIAL_UNDOS = 3;
export const HINTS_PER_AD = 1;

// Animation
export const ANIM = {
  gravityDuration: 300,
  gravityBounce: 50,
  gravityStagger: 30,
  cellSelectDuration: 150,
  wordFoundDuration: 500,
  celebrationDuration: 1200,
  chainPopupDuration: 800,
  starAnimDelay: [200, 500, 800],
  // Synthwave effects
  glitchDuration: 150,
  neonFlickerDuration: 80,
  chromeSweepDuration: 2000,
  scanLinePeriod: 4000,
  selectionRippleDuration: 300,
  neonOverchargeDuration: 100,
  gridDissolveDelay: 30, // per-tile stagger
  victoryPhase1: 500,
  victoryPhase2: 700,
  victoryPhase3: 800,
  victoryPhase4: 1500,
  crtShutdownDuration: 200,
  tabSlideSpeed: 250,
  trailFadeDuration: 400,
  gravityTrailDuration: 500,
};

// Economy
export const ECONOMY = {
  puzzleCompleteCoins: {
    easy: 50,
    medium: 100,
    hard: 200,
    expert: 400,
  },
  starBonus: 25,
  comboBonus: 10,
  perfectClearGems: 5,
  dailyCompleteCoins: 150,
  dailyCompleteGems: 2,
  streakBonusMultiplier: 0.1, // +10% per streak day
  loginRewards: [
    // Week 1
    { day: 1, coins: 50 },
    { day: 2, coins: 75 },
    { day: 3, coins: 100, hints: 2 },
    { day: 4, coins: 125 },
    { day: 5, coins: 150, gems: 5 },
    { day: 6, coins: 175, hints: 3 },
    { day: 7, coins: 200, gems: 10, rareTile: true },
    // Week 2
    { day: 8, coins: 100, gems: 3 },
    { day: 9, coins: 125 },
    { day: 10, coins: 150, hints: 2 },
    { day: 11, coins: 175, gems: 5 },
    { day: 12, coins: 200 },
    { day: 13, coins: 250, hints: 3 },
    { day: 14, coins: 400, gems: 25 },
    // Week 3
    { day: 15, coins: 150, gems: 5 },
    { day: 16, coins: 200, hints: 2 },
    { day: 17, coins: 250, gems: 8 },
    { day: 18, coins: 300, hints: 3 },
    { day: 19, coins: 350, gems: 10 },
    { day: 20, coins: 400, hints: 5 },
    { day: 21, coins: 600, gems: 50, cosmetic: 'login_21_frame' },
    // Week 4+
    { day: 22, coins: 200, gems: 8 },
    { day: 23, coins: 250, hints: 3 },
    { day: 24, coins: 300, gems: 10 },
    { day: 25, coins: 350, hints: 5 },
    { day: 26, coins: 400, gems: 15 },
    { day: 27, coins: 450, hints: 5 },
    { day: 28, coins: 500, gems: 20 },
    { day: 29, coins: 500, gems: 25 },
    { day: 30, coins: 1000, gems: 100, cosmetic: 'login_30_exclusive', rareTile: true },
  ] as { day: number; coins: number; gems?: number; hints?: number; rareTile?: boolean; cosmetic?: string }[],
  loginRewardCycleLength: 30,
  loginRewardRepeatMultiplier: 1.5,
  hintCost: 50, // coins per hint refill
  undoCost: 50,
  streakShieldCost: 500, // coins
};

// Lives / Energy
export const LIVES = {
  max: 5,
  refillMinutes: 30,
  gemRefillCost: 10,
};

// Puzzle Energy (soft scarcity — NOT a hard wall)
export const ENERGY = {
  MAX: 30,
  REGEN_MINUTES: 15,
  FREE_MODES: ['daily', 'endless', 'relax'] as string[],
  BONUS_PLAYS_AFTER_ZERO: 3,
  AD_REFILL_AMOUNT: 5,
  GEM_REFILL_COST: 10,
};

// Streak
export const STREAK = {
  graceDays: 1,
  shieldCooldownDays: 30,
  milestones: [7, 14, 30, 60, 100],
  milestoneRewards: {
    7: { coins: 500, gems: 10 },
    14: { coins: 1000, gems: 25 },
    30: { coins: 2500, gems: 50, cosmetic: 'streak_30_frame' },
    60: { coins: 5000, gems: 100, cosmetic: 'streak_60_title' },
    100: { coins: 10000, gems: 200, cosmetic: 'streak_100_badge' },
  },
};

// Collection
export const COLLECTION = {
  rareTilePityTimer: 10, // guaranteed within 10 puzzles
  rareTileBaseChance: 0.15,
  rareTileHardBonus: 0.1,
  rareTilePerfectBonus: 0.15,
  duplicatesForWildcard: 5,
  giftTilesPerDay: 3,
  atlasMasteryMax: 5, // max mastery level per word (unlocks gold border at max)
};

// Club settings
export const CLUB = {
  minMembers: 10,
  maxMembers: 30,
  autoKickInactiveDays: 14, // auto-kick after 14 days of inactivity
};

// Comeback rewards
export const COMEBACK = {
  day3: { coins: 200, hints: 5 },
  day7: { coins: 500, gems: 10, hints: 10 },
  day30: { coins: 1000, gems: 25, hints: 20, premiumHintDays: 3, doubleRewardDays: 3 },
};

// Mastery track
export const MASTERY = {
  tiersPerSeason: 30,
  premiumPassPrice: '$4.99',
};

// Library
export const LIBRARY = {
  wingsCount: 8,
  shelvesPerWing: 5,
  decorationSlots: 3,
  wingNames: ['Nature', 'Science', 'Mythology', 'Ocean', 'Arts', 'Space', 'History', 'Elements'],
  wingIcons: ['🌿', '🔬', '⚡', '🌊', '🎨', '🚀', '📜', '🔥'],
  wingChapters: [
    [1, 5],
    [6, 10],
    [11, 15],
    [16, 20],
    [21, 25],
    [26, 30],
    [31, 35],
    [36, 40],
  ],
};

// Milestone decoration unlocks (every 5 levels per GDD)
export const MILESTONE_DECORATIONS: { level: number; decoration: string; name: string; icon: string }[] = [
  { level: 5, decoration: 'bookend_oak', name: 'Oak Bookend', icon: '📚' },
  { level: 10, decoration: 'lamp_brass', name: 'Brass Lamp', icon: '💡' },
  { level: 15, decoration: 'globe_antique', name: 'Antique Globe', icon: '🌍' },
  { level: 20, decoration: 'clock_pendulum', name: 'Pendulum Clock', icon: '🕰️' },
  { level: 25, decoration: 'telescope_mini', name: 'Mini Telescope', icon: '🔭' },
  { level: 30, decoration: 'statue_thinker', name: 'The Thinker', icon: '🤔' },
  { level: 35, decoration: 'plant_fern', name: 'Library Fern', icon: '🌿' },
  { level: 40, decoration: 'painting_sunset', name: 'Sunset Painting', icon: '🖼️' },
  { level: 45, decoration: 'crystal_ball', name: 'Crystal Ball', icon: '🔮' },
  { level: 50, decoration: 'crown_wisdom', name: 'Crown of Wisdom', icon: '👑' },
];

// Star milestone cosmetic rewards (per GDD: 50/100/250/500)
export const STAR_MILESTONES: { stars: number; reward: string; name: string; type: 'frame' | 'title' }[] = [
  { stars: 50, reward: 'frame_bronze_star', name: 'Bronze Star Frame', type: 'frame' },
  { stars: 100, reward: 'frame_silver_star', name: 'Silver Star Frame', type: 'frame' },
  { stars: 250, reward: 'title_star_collector', name: 'Star Collector', type: 'title' },
  { stars: 500, reward: 'frame_gold_star', name: 'Gold Star Frame', type: 'frame' },
];

// Perfect solve milestone badges (per GDD: 10/25/50)
export const PERFECT_MILESTONES: { count: number; badge: string; name: string }[] = [
  { count: 10, badge: 'badge_perfect_10', name: 'Perfect Bronze' },
  { count: 25, badge: 'badge_perfect_25', name: 'Perfect Silver' },
  { count: 50, badge: 'badge_perfect_50', name: 'Perfect Gold' },
];

// Shop
export const SHOP_ITEMS = {
  starterPack: {
    id: 'starter_pack',
    price: '$1.99',
    coins: 500,
    gems: 50,
    hints: 10,
    decoration: 'starter_bookend',
    expiresHours: 72,
  },
  hintBundles: [
    { id: 'hint_10', count: 10, price: '$0.99' },
    { id: 'hint_25', count: 25, price: '$1.99', bestValue: true },
    { id: 'hint_50', count: 50, price: '$2.99' },
  ],
  undoBundles: [
    { id: 'undo_10', count: 10, price: '$0.99' },
    { id: 'undo_25', count: 25, price: '$1.99', bestValue: true },
    { id: 'undo_50', count: 50, price: '$2.99' },
  ],
  dailyValuePack: {
    id: 'daily_value',
    price: '$0.99/day',
    duration: 7,
    dailyCoins: 100,
    dailyGems: 5,
    dailyHints: 3,
    availableAfterDay: 3,
    autoEnds: true,
  },
  premiumPass: { id: 'premium_pass', price: '$4.99/season' },
  adRemoval: { id: 'ad_removal', price: '$4.99' },
  chapterBundle: {
    id: 'chapter_bundle',
    price: '$2.99',
    gems: 20,
    hints: 10,
    decoration: true,
    smartShuffle: 1,
  },
};

// Feature unlock schedule (progressive disclosure)
export const FEATURE_UNLOCK_SCHEDULE: {
  id: string;
  unlockLevel: number;
  icon: string;
  title: string;
  description: string;
  accentColor: string;
}[] = [
  { id: 'tab_play', unlockLevel: 1, icon: '▶', title: 'Play', description: 'Access game modes', accentColor: COLORS.accent },
  { id: 'tab_collections', unlockLevel: 5, icon: '◆', title: 'Collections Unlocked!', description: 'Discover Word Atlas, Rare Tiles, and Seasonal Stamps. Collect them all!', accentColor: COLORS.gold },
  { id: 'tab_library', unlockLevel: 8, icon: '❏', title: 'The Grand Library!', description: 'Restore 8 wings of the ancient library. Place decorations and build your sanctuary.', accentColor: COLORS.purple },
  { id: 'boosters', unlockLevel: 6, icon: '⚡', title: 'Boosters Unlocked!', description: 'Use Freeze, Preview, and Shuffle to gain the edge on tough puzzles.', accentColor: COLORS.teal },
  { id: 'events', unlockLevel: 10, icon: '🏆', title: 'Events Unlocked!', description: 'Compete in weekly events for exclusive rewards and climb the leaderboards.', accentColor: COLORS.coral },
  { id: 'weekly_goals', unlockLevel: 5, icon: '📋', title: 'Weekly Goals!', description: 'Complete weekly objectives for bonus gems and exclusive rewards.', accentColor: COLORS.green },
];

// Breather difficulty config — drops the player back ~3-4 levels worth of difficulty
export function getBreatherConfig(level: number): BoardConfig {
  const easierLevel = Math.max(1, level - 4);
  return getLevelConfig(easierLevel);
}

// Events
export const EVENT_SCHEDULE = {
  weeklyResetDay: 1, // Monday
  weekendBlitzStart: 6, // Saturday
  weekendBlitzEnd: 0, // Sunday
  dailyResetHourUTC: 0,
};

// Typography — Neon Intelligence design system
// Fonts: SpaceGrotesk (display) + Inter (body)
export const FONTS = {
  display: 'SpaceGrotesk_700Bold',
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};

export const TYPOGRAPHY = {
  displayHero: { fontFamily: FONTS.display, fontSize: 48, letterSpacing: 2 },
  displayLarge: { fontFamily: FONTS.display, fontSize: 36, letterSpacing: 1.5 },
  screenTitle: { fontFamily: FONTS.display, fontSize: 28, letterSpacing: 1 },
  sectionTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 20, letterSpacing: 0.5 },
  body: { fontFamily: FONTS.bodyRegular, fontSize: 15, letterSpacing: 0.2 },
  bodyMedium: { fontFamily: FONTS.bodyMedium, fontSize: 15, letterSpacing: 0.2 },
  bodySemiBold: { fontFamily: FONTS.bodySemiBold, fontSize: 15, letterSpacing: 0.2 },
  bodyBold: { fontFamily: FONTS.bodyBold, fontSize: 15, letterSpacing: 0.2 },
  label: { fontFamily: FONTS.bodySemiBold, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  caption: { fontFamily: FONTS.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
  score: { fontFamily: FONTS.display, fontSize: 22, letterSpacing: 0.5 },
  comboText: { fontFamily: FONTS.display, fontSize: 28, letterSpacing: 1 },
  tileLetter: { fontFamily: FONTS.display, letterSpacing: 0.8 },
  // Synthwave typography presets
  chromeTitle: { fontFamily: FONTS.display, fontSize: 36, letterSpacing: 4 },
  neonDisplay: { fontFamily: FONTS.display, fontSize: 48, letterSpacing: 6 },
  arcadeScore: { fontFamily: FONTS.display, fontSize: 40, letterSpacing: 2 },
  vhsLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' as const },
  neonCounter: { fontFamily: FONTS.display, fontSize: 32, letterSpacing: 1 },
};

// Spacing scale
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

// Border radius scale
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

// Materials — synthwave material definitions for component styling
export const MATERIALS = {
  chrome: {
    textShadowColor: '#d4e0f7',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 20,
  },
  neonTube: {
    borderWidth: 1.5,
    glowRadius: 12,
    glowOpacity: 0.6,
  },
  crtGlass: {
    scanLineSpacing: 3,
    scanLineOpacity: 0.03,
    vignetteOpacity: 0.15,
  },
  holographic: {
    sweepSpeed: 2000,
    shimmerOpacity: 0.3,
  },
};

// Chain combo visual intensity tiers
export const CHAIN_INTENSITY = {
  1: { borderGlow: false, pulse: false, glitch: false },
  2: { borderGlow: true, pulse: false, glitch: false, color: COLORS.accent },
  3: { borderGlow: true, pulse: true, glitch: false, colors: [COLORS.accent, COLORS.purple, COLORS.cyan] },
  4: { borderGlow: true, pulse: true, glitch: true, colors: [COLORS.accent, COLORS.purple, COLORS.cyan, COLORS.gold] },
} as const;

// Background evolution by player level
export const BACKGROUND_EVOLUTION = {
  easy: { starCount: 10, sunScale: 1.0, gridSpeed: 8000, mountains: 0, meteor: false, aurora: false },
  medium: { starCount: 15, sunScale: 1.1, gridSpeed: 6500, mountains: 1, meteor: false, aurora: false },
  hard: { starCount: 20, sunScale: 1.2, gridSpeed: 5000, mountains: 2, meteor: true, aurora: false },
  expert: { starCount: 25, sunScale: 1.3, gridSpeed: 4000, mountains: 2, meteor: true, aurora: true },
} as const;

// Ad configuration — rewarded ads tuning
export const AD_CONFIG = {
  /** AdMob rewarded ad unit ID (defaults to Google test ID for development) */
  REWARDED_AD_UNIT_ID:
    (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_ADMOB_REWARDED_ID) ||
    'ca-app-pub-3940256099942544/5224354917', // Google test ad unit
  /** Maximum total rewarded ads a player can watch per day */
  MAX_ADS_PER_DAY: 10,
  /** Maximum "watch ad for coins" ads per day */
  MAX_COIN_ADS_PER_DAY: 3,
  /** Minimum cooldown between rewarded ads (ms) */
  REWARDED_COOLDOWN_MS: 30_000, // 30 seconds
};

// Economy Tuning — central knobs for balancing the free-to-play economy
export const ECONOMY_TUNING = {
  // Coins earned vs spent ratio target: 1.5:1 (earn 50% more than spend)
  targetEarnSpendRatio: 1.5,
  // Hint scarcity threshold: player should run out of free hints by level 8-10
  freeHintRunoutLevel: 9,
  // First purchase pressure point: level 12-15 (player hits real difficulty)
  firstPurchasePressureLevel: 13,
  // Gem drip rate: ~2-5 gems per day for active free player
  dailyGemDripTarget: 3,
  // Days until free player hits gem gate: 14-21 days
  freePlayerGemGateDays: 17,
  // Coins awarded per difficulty tier
  coinsPerDifficulty: {
    easy: 50,
    medium: 100,
    hard: 200,
    expert: 400,
  } as Record<string, number>,
  // Gem awards
  gemsPerPerfectClear: 5,
  gemsPerDailyCompletion: 2,
  // Rare tile pity timer (matches COLLECTION.rareTilePityTimer)
  rareTilePityTimer: 10,
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };
