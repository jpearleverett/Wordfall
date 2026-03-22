import { Dimensions } from 'react-native';
import { BoardConfig, Difficulty, GameMode, ModeConfig } from './types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Layout
export const GRID_PADDING = 12;
export const CELL_GAP = 4;
export const MAX_GRID_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;
export const CELL_SIZE = (col: number) =>
  Math.floor((MAX_GRID_WIDTH - CELL_GAP * (col - 1)) / col);

// Colors — Miami synthwave neon palette
export const COLORS = {
  // Backgrounds — deep purple-black
  bg: '#0a0012',
  bgLight: '#160028',
  surface: '#1a0033',
  surfaceLight: '#2d0060',

  // Tiles
  cellDefault: '#2a1045',
  cellSelected: '#ff2d95',
  cellHint: '#ffd700',
  cellFound: '#0a2a1a',

  // Text — warm white with pink tint
  textPrimary: '#fff0f5',
  textSecondary: '#b899cc',
  textMuted: '#6b4f80',

  // Primary accent — hot pink / magenta (THE synthwave signature)
  accent: '#ff2d95',
  accentLight: '#ff6eb4',
  accentDark: '#cc0066',
  accentGlow: 'rgba(255, 45, 149, 0.55)',

  // Gold — stays (synthwave-compatible)
  gold: '#ffd700',
  goldLight: '#ffe566',
  goldGlow: 'rgba(255, 215, 0, 0.50)',

  // Green — neon mint
  green: '#00ffaa',
  greenGlow: 'rgba(0, 255, 170, 0.45)',

  // Coral — warm neon orange
  coral: '#ff6b2b',
  coralGlow: 'rgba(255, 107, 43, 0.45)',

  // Purple — electric violet
  purple: '#c77dff',
  purpleLight: '#e0b0ff',
  purpleGlow: 'rgba(199, 125, 255, 0.50)',

  // Orange — neon
  orange: '#ff9100',
  orangeGlow: 'rgba(255, 145, 0, 0.45)',

  // Teal — electric cyan (secondary synthwave accent)
  teal: '#00fff5',
  tealGlow: 'rgba(0, 255, 245, 0.50)',

  // Pink — full magenta
  pink: '#ff00ff',
  pinkGlow: 'rgba(255, 0, 255, 0.55)',

  // Word states
  wordFound: '#00ffaa',
  wordPending: '#b899cc',
  wordActive: '#ff2d95',

  // Stars
  star: '#ffd700',
  starEmpty: '#2a1045',

  // Buttons
  buttonPrimary: '#ff2d95',
  buttonSecondary: '#2d0060',
  buttonDanger: '#ff6b2b',
  buttonGold: '#ffd700',

  // Rarity colors
  rarityCommon: '#b899cc',
  rarityRare: '#00fff5',
  rarityEpic: '#c77dff',
  rarityLegendary: '#ffd700',

  // Club tier colors
  tierBronze: '#d4893a',
  tierSilver: '#d0d8e8',
  tierGold: '#ffd700',
  tierDiamond: '#00fff5',

  // Tab bar
  tabActive: '#ff2d95',
  tabInactive: '#6b4f80',

  // Extended tokens — Synthwave Neon design system
  surface2: '#2d0060',
  surfaceGlass: 'rgba(26, 0, 51, 0.85)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderMedium: 'rgba(255,255,255,0.12)',
  borderAccent: 'rgba(255,45,149,0.25)',
  textTertiary: '#4a2d6b',
};

// Gradient presets for LinearGradient — synthwave neon multi-stop gradients
export const GRADIENTS = {
  tile: {
    default: ['#1e0a35', '#2a1248', '#220e3d'] as const,
    selected: ['#ff2d95', '#e6006e', '#cc0066'] as const,
    valid: ['#00ffaa', '#00cc88', '#009966'] as const,
    hint: ['#ffe066', '#ffd700', '#f0a500'] as const,
    frozen: ['#0a1a3a', '#0e2245', '#081a35'] as const,
  },
  button: {
    primary: ['#ff6eb4', '#ff2d95', '#cc0066'] as const,
    gold: ['#ffe066', '#ffd700', '#f0a500'] as const,
    danger: ['#ff8855', '#ff6b2b', '#ee4400'] as const,
    green: ['#66ffcc', '#00ffaa', '#00cc88'] as const,
  },
  surface: ['#180030', '#100020'] as const,
  surfaceCard: ['#220044', '#180030'] as const,
  header: ['#220044', '#120024'] as const,
  bg: ['#050008', '#0a0018', '#0a0012'] as const,
  grid: ['#120028', '#1a0038', '#150030'] as const,
  gridBorder: ['rgba(255,45,149,0.30)', 'rgba(199,125,255,0.22)', 'rgba(255,45,149,0.15)'] as const,
  victoryCard: ['#2d0060', '#220050', '#1a0040'] as const,
  scorePanel: ['#140028', '#1a0035'] as const,
  tabBar: ['#1a0033', '#120024'] as const,

  // Premium overlays
  tileSurface: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)'] as const,
  glassOverlay: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.0)'] as const,
  boardGlow: ['rgba(255,45,149,0.08)', 'rgba(199,125,255,0.05)', 'transparent'] as const,
  goldShine: ['rgba(255,230,102,0.3)', 'rgba(255,215,0,0.1)', 'transparent'] as const,
  celebrationOverlay: ['rgba(255,45,149,0.10)', 'transparent', 'rgba(199,125,255,0.08)'] as const,

  // Synthwave-specific gradients
  synthwaveSun: ['#ffd700', '#ff9100', '#ff2d95', '#cc0066', '#6b0080'] as const,
  synthwaveSky: ['#0a0012', '#120024', '#2d0060', '#6b0080'] as const,
  neonGridLine: ['rgba(255,45,149,0.0)', 'rgba(255,45,149,0.3)', 'rgba(255,45,149,0.0)'] as const,
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
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 14,
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

// Typography — Synthwave Neon design system
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
