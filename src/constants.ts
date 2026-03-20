import { Dimensions } from 'react-native';
import { BoardConfig, Difficulty } from './types';

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
  purple: '#a855f7',
  purpleGlow: 'rgba(168, 85, 247, 0.3)',

  wordFound: '#4caf50',
  wordPending: '#8890b5',
  wordActive: '#00d4ff',

  star: '#ffd700',
  starEmpty: '#2a3060',

  buttonPrimary: '#00d4ff',
  buttonSecondary: '#252b5e',
  buttonDanger: '#ff6b6b',
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

// Scoring
export const SCORE = {
  wordFound: 100,
  bonusPerLetter: 20,
  comboMultiplier: 0.5, // +50% per combo level
  perfectClear: 500,
  noHints: 200,
  starThresholds: [0.5, 0.75, 1.0], // percentage of max score
};

// Hints & Undos
export const INITIAL_HINTS = 3;
export const INITIAL_UNDOS = 3;
export const HINTS_PER_AD = 1;

// Animation
export const ANIM = {
  gravityDuration: 300,
  cellSelectDuration: 150,
  wordFoundDuration: 500,
  celebrationDuration: 1200,
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };
