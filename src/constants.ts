import { Dimensions } from 'react-native';
import { BoardConfig, Difficulty, GameMode, ModeConfig } from './types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Layout
export const GRID_PADDING = 12;
export const CELL_GAP = 4;
export const MAX_GRID_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;
export const CELL_SIZE = (col: number) =>
  Math.floor((MAX_GRID_WIDTH - CELL_GAP * (col - 1)) / col);

// Colors
export const COLORS = {
  bg: '#0a0e27',
  bgLight: '#111638',
  surface: '#1a1f45',
  surfaceLight: '#252b5e',

  cellDefault: '#2a3060',
  cellSelected: '#00d4ff',
  cellHint: '#ffd700',
  cellFound: '#1a3a2a',

  textPrimary: '#ffffff',
  textSecondary: '#8890b5',
  textMuted: '#4a5280',

  accent: '#00d4ff',
  accentGlow: 'rgba(0, 212, 255, 0.3)',
  gold: '#ffd700',
  goldGlow: 'rgba(255, 215, 0, 0.3)',
  green: '#4caf50',
  greenGlow: 'rgba(76, 175, 80, 0.3)',
  coral: '#ff6b6b',
  coralGlow: 'rgba(255, 107, 107, 0.3)',
  purple: '#a855f7',
  purpleGlow: 'rgba(168, 85, 247, 0.3)',
  orange: '#ff9f43',
  orangeGlow: 'rgba(255, 159, 67, 0.3)',
  teal: '#2ed8a3',
  tealGlow: 'rgba(46, 216, 163, 0.3)',

  wordFound: '#4caf50',
  wordPending: '#8890b5',
  wordActive: '#00d4ff',

  star: '#ffd700',
  starEmpty: '#2a3060',

  buttonPrimary: '#00d4ff',
  buttonSecondary: '#252b5e',
  buttonDanger: '#ff6b6b',
  buttonGold: '#ffd700',

  // Rarity colors
  rarityCommon: '#8890b5',
  rarityRare: '#00d4ff',
  rarityEpic: '#a855f7',
  rarityLegendary: '#ffd700',

  // Club tier colors
  tierBronze: '#cd7f32',
  tierSilver: '#c0c0c0',
  tierGold: '#ffd700',
  tierDiamond: '#b9f2ff',

  // Tab bar
  tabActive: '#00d4ff',
  tabInactive: '#4a5280',
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

// Level progression
export function getLevelConfig(level: number): BoardConfig {
  if (level <= 5) return DIFFICULTY_CONFIGS.easy;
  if (level <= 15) return DIFFICULTY_CONFIGS.medium;
  if (level <= 30) return DIFFICULTY_CONFIGS.hard;
  return DIFFICULTY_CONFIGS.expert;
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
  limitedMoves: {
    id: 'limitedMoves',
    name: 'Limited Moves',
    description: 'Complete in exactly N moves',
    icon: '🎯',
    color: COLORS.coral,
    unlockLevel: 5,
    rules: {
      hasTimer: false,
      hasMoveLimit: true,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 1.25,
      comboMode: false,
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
    },
  },
  cascade: {
    id: 'cascade',
    name: 'Cascade',
    description: 'Build combo multipliers',
    icon: '🔥',
    color: COLORS.coral,
    unlockLevel: 6,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 1,
      comboMode: true,
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
    },
  },
  endless: {
    id: 'endless',
    name: 'Endless',
    description: 'Never-ending puzzles',
    icon: '♾️',
    color: COLORS.teal,
    unlockLevel: 15,
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
  expert: {
    id: 'expert',
    name: 'Expert',
    description: 'Minimal hints, harder boards',
    icon: '🧠',
    color: COLORS.purple,
    unlockLevel: 20,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: false,
      allowUndo: false,
      unlimitedUndo: false,
      scoreMultiplier: 2,
      comboMode: false,
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
    { day: 1, coins: 50 },
    { day: 2, coins: 75 },
    { day: 3, coins: 100, hints: 2 },
    { day: 4, coins: 125 },
    { day: 5, coins: 150, gems: 5 },
    { day: 6, coins: 175, hints: 3 },
    { day: 7, coins: 200, gems: 10, rareTile: true },
  ],
  hintCost: 50, // coins per hint refill
  undoCost: 50,
  streakShieldCost: 200, // coins
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

// Shop
export const SHOP_ITEMS = {
  starterPack: {
    id: 'starter_pack',
    price: '$1.99',
    coins: 500,
    gems: 50,
    hints: 10,
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
  },
  premiumPass: { id: 'premium_pass', price: '$4.99/season' },
  adRemoval: { id: 'ad_removal', price: '$4.99' },
};

// Events
export const EVENT_SCHEDULE = {
  weeklyResetDay: 1, // Monday
  weekendBlitzStart: 6, // Saturday
  weekendBlitzEnd: 0, // Sunday
  dailyResetHourUTC: 0,
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };
