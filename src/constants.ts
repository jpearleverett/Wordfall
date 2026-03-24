import { Dimensions } from 'react-native';
import { BoardConfig, Difficulty, GameMode, ModeConfig } from './types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Layout
export const GRID_PADDING = 12;
export const CELL_GAP = 2;
export const MAX_GRID_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;
export const CELL_SIZE = (col: number) =>
  Math.floor((MAX_GRID_WIDTH - CELL_GAP * (col - 1)) / col);

// Colors — premium palette with rich jewel tones and luminous accents
export const COLORS = {
  bg: '#060918',
  bgLight: '#0d1230',
  surface: '#141940',
  surfaceLight: '#1e2558',

  cellDefault: '#232a5e',
  cellSelected: '#00d4ff',
  cellHint: '#ffd700',
  cellFound: '#1a3a2a',

  textPrimary: '#f0f2ff',
  textSecondary: '#9099cc',
  textMuted: '#525b8a',

  accent: '#00d4ff',
  accentLight: '#66e8ff',
  accentDark: '#0088aa',
  accentGlow: 'rgba(0, 212, 255, 0.50)',
  gold: '#ffd700',
  goldLight: '#ffe566',
  goldGlow: 'rgba(255, 215, 0, 0.50)',
  green: '#00e676',
  greenGlow: 'rgba(0, 230, 118, 0.45)',
  coral: '#ff5252',
  coralGlow: 'rgba(255, 82, 82, 0.45)',
  purple: '#b366ff',
  purpleLight: '#d9a3ff',
  purpleGlow: 'rgba(179, 102, 255, 0.45)',
  orange: '#ff9100',
  orangeGlow: 'rgba(255, 145, 0, 0.45)',
  teal: '#1de9b6',
  tealGlow: 'rgba(29, 233, 182, 0.45)',
  pink: '#ff4081',
  pinkGlow: 'rgba(255, 64, 129, 0.40)',

  wordFound: '#00e676',
  wordPending: '#9099cc',
  wordActive: '#00d4ff',

  star: '#ffd700',
  starEmpty: '#232a5e',

  buttonPrimary: '#00d4ff',
  buttonSecondary: '#1e2558',
  buttonDanger: '#ff5252',
  buttonGold: '#ffd700',

  // Rarity colors — richer saturation
  rarityCommon: '#9099cc',
  rarityRare: '#00d4ff',
  rarityEpic: '#b366ff',
  rarityLegendary: '#ffd700',

  // Club tier colors
  tierBronze: '#d4893a',
  tierSilver: '#d0d8e8',
  tierGold: '#ffd700',
  tierDiamond: '#a0f0ff',

  // Tab bar
  tabActive: '#00d4ff',
  tabInactive: '#525b8a',

  // Extended tokens — Neon Intelligence design system
  surface2: '#1e2558',
  surfaceGlass: 'rgba(20, 25, 64, 0.85)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderMedium: 'rgba(255,255,255,0.12)',
  borderAccent: 'rgba(0,212,255,0.25)',
  textTertiary: '#3d4570',
};

// Gradient presets for LinearGradient — premium multi-stop gradients
export const GRADIENTS = {
  tile: {
    default: ['rgba(18,20,52,0.72)', 'rgba(28,32,72,0.72)', 'rgba(20,24,58,0.72)'] as const,
    selected: ['#00e5ff', '#00b4d8', '#0088aa'] as const,
    valid: ['#00e676', '#00c853', '#009e42'] as const,
    hint: ['#ffe066', '#ffd700', '#f0a500'] as const,
    frozen: ['rgba(20,48,90,0.75)', 'rgba(24,44,80,0.70)', 'rgba(18,38,68,0.75)'] as const,
  },
  button: {
    primary: ['#00e5ff', '#00b4d8', '#0088cc'] as const,
    gold: ['#ffe066', '#ffd700', '#f0a500'] as const,
    danger: ['#ff6b6b', '#ff5252', '#ee3a3a'] as const,
    green: ['#69f0ae', '#00e676', '#00c853'] as const,
  },
  surface: ['#161c48', '#101538'] as const,
  surfaceCard: ['#1a2050', '#141a3e'] as const,
  header: ['rgba(22,28,70,0.75)', 'rgba(12,16,42,0.80)'] as const,
  bg: ['#040714', '#080d22', '#060918'] as const,
  grid: ['rgba(12,16,46,0.55)', 'rgba(18,22,58,0.50)', 'rgba(14,18,50,0.52)'] as const,
  gridBorder: ['rgba(0,212,255,0.22)', 'rgba(179,102,255,0.18)', 'rgba(0,212,255,0.12)'] as const,
  victoryCard: ['#1a2058', '#161d4e', '#121840'] as const,
  scorePanel: ['#101535', '#161c48'] as const,
  tabBar: ['#141940', '#0f1430'] as const,

  // Synthwave scene gradients
  synthwave: {
    sky: ['#0a0020', '#1a0533', '#3d1055', '#2a0845', '#150030'] as const,
    sun: ['#00e5ff', '#00d4ff', '#c850c0', '#ff6ec7', '#ff4081'] as const,
    sunInner: ['rgba(0,228,255,0.9)', 'rgba(0,212,255,0.6)', 'rgba(200,80,192,0.4)', 'rgba(255,110,199,0.2)'] as const,
    ground: ['#1a0533', '#0d0020', '#060010'] as const,
    gridLine: ['rgba(0,212,255,0.5)', 'rgba(200,80,192,0.3)', 'rgba(255,64,129,0.1)'] as const,
  },

  // New premium gradients
  tileSurface: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)'] as const,
  glassOverlay: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.0)'] as const,
  boardGlow: ['rgba(0,212,255,0.08)', 'rgba(179,102,255,0.05)', 'transparent'] as const,
  goldShine: ['rgba(255,230,102,0.3)', 'rgba(255,215,0,0.1)', 'transparent'] as const,
  celebrationOverlay: ['rgba(0,212,255,0.08)', 'transparent', 'rgba(179,102,255,0.06)'] as const,
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

// Breather difficulty config (slightly easier version of current difficulty)
export function getBreatherConfig(level: number): BoardConfig {
  if (level <= 5) return DIFFICULTY_CONFIGS.easy;
  if (level <= 15) return { ...DIFFICULTY_CONFIGS.easy, wordCount: 4, maxWordLength: 4, difficulty: 'medium' as const };
  if (level <= 30) return DIFFICULTY_CONFIGS.medium;
  return DIFFICULTY_CONFIGS.hard;
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

export { SCREEN_WIDTH, SCREEN_HEIGHT };
