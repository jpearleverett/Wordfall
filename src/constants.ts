import { Dimensions, Platform } from 'react-native';
import { BoardConfig, Difficulty, GameMode, ModeConfig } from './types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Layout
export { SCREEN_WIDTH, SCREEN_HEIGHT };
export const GRID_PADDING = 12;
export const CELL_GAP = 4;
export const MAX_GRID_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;
export const CELL_SIZE = (col: number) =>
  Math.floor((MAX_GRID_WIDTH - CELL_GAP * (col - 1)) / col);

// Colors
export const COLORS = {
  bg: '#070b1d',
  bgLight: '#0d1431',
  bgElevated: '#121b40',
  surface: '#151d43',
  surfaceLight: '#1d2758',
  surfaceBright: '#24326d',
  surfaceGlass: 'rgba(26, 37, 82, 0.72)',
  surfaceGlassStrong: 'rgba(31, 44, 97, 0.86)',
  border: 'rgba(120, 145, 255, 0.18)',
  borderStrong: 'rgba(120, 224, 255, 0.42)',

  cellDefault: '#223061',
  cellSelected: '#00d4ff',
  cellHint: '#ffd166',
  cellFound: '#173929',
  cellShadow: '#040712',

  textPrimary: '#f6f8ff',
  textSecondary: '#b7c3f2',
  textMuted: '#7180b9',
  textDim: '#4f5b8f',
  textOnAccent: '#04101f',

  accent: '#20d8ff',
  accentStrong: '#68ebff',
  accentGlow: 'rgba(32, 216, 255, 0.34)',
  accentGlowStrong: 'rgba(32, 216, 255, 0.5)',
  gold: '#ffcf5a',
  goldDeep: '#ffb938',
  goldGlow: 'rgba(255, 207, 90, 0.38)',
  green: '#52d67b',
  greenGlow: 'rgba(82, 214, 123, 0.32)',
  coral: '#ff7c72',
  coralGlow: 'rgba(255, 124, 114, 0.32)',
  purple: '#a874ff',
  purpleGlow: 'rgba(168, 116, 255, 0.32)',
  orange: '#ff9b54',
  orangeGlow: 'rgba(255, 155, 84, 0.32)',
  teal: '#32d8c0',
  tealGlow: 'rgba(50, 216, 192, 0.32)',

  wordFound: '#69e293',
  wordPending: '#9dacdd',
  wordActive: '#6ce8ff',

  star: '#ffd76a',
  starEmpty: '#293863',

  buttonPrimary: '#20d8ff',
  buttonSecondary: '#24326d',
  buttonDanger: '#ff7c72',
  buttonGold: '#ffcf5a',

  rarityCommon: '#8890b5',
  rarityRare: '#20d8ff',
  rarityEpic: '#a874ff',
  rarityLegendary: '#ffcf5a',

  tierBronze: '#cd7f32',
  tierSilver: '#c0c0c0',
  tierGold: '#ffd700',
  tierDiamond: '#b9f2ff',

  tabActive: '#20d8ff',
  tabInactive: '#4a5280',
};

export const GRADIENTS = {
  background: ['#060914', '#0a1030', '#11173c'],
  atmospheric: ['rgba(32,216,255,0.14)', 'rgba(168,116,255,0.1)', 'rgba(0,0,0,0)'],
  panel: ['rgba(35,47,102,0.96)', 'rgba(18,26,60,0.96)'],
  panelSoft: ['rgba(24,34,78,0.85)', 'rgba(12,18,44,0.78)'],
  accent: ['#6ef1ff', '#20d8ff', '#0a8cff'],
  gold: ['#ffe39a', '#ffcf5a', '#ffad33'],
  success: ['#7af0a0', '#52d67b', '#1d9b53'],
  tile: ['#33468b', '#24366f', '#182758'],
  tileSelected: ['#8bf4ff', '#2fe0ff', '#0786d0'],
  tileHint: ['#ffe7a4', '#ffd166', '#ffab3f'],
};

export const TYPOGRAPHY = {
  display: Platform.select({ ios: 'AvenirNext-Heavy', android: 'sans-serif-condensed', default: 'System' }),
  ui: Platform.select({ ios: 'AvenirNext-Medium', android: 'sans-serif-medium', default: 'System' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADII = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  pill: 999,
};

export const SHADOWS = {
  glow: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 12,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 18,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
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
    maxWordLength: 7,
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
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 1.75,
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
      scoreMultiplier: 0.75,
      comboMode: false,
    },
  },
};

// Animation timings
export const ANIM = {
  cellSelectDuration: 150,
  gravityDuration: 300,
  wordClearDuration: 400,
  chainPopupDuration: 800,
};

// Economy
export const ECONOMY = {
  startingCoins: 100,
  startingGems: 10,
  puzzleCompleteCoins: {
    easy: 10,
    medium: 15,
    hard: 25,
    expert: 40,
  },
  dailyCompleteCoins: 30,
  weeklyCompleteCoins: 100,
  starBonus: 5,
  perfectClearGems: 1,
  hintCost: 25,
  undoCost: 15,
  shuffleCost: 20,
};
