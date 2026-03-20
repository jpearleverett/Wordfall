export interface Cell {
  letter: string;
  id: string;
}

export type Grid = (Cell | null)[][];

export type Direction = 'horizontal' | 'vertical';

export interface CellPosition {
  row: number;
  col: number;
}

export interface WordPlacement {
  word: string;
  positions: CellPosition[];
  direction: Direction;
  found: boolean;
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface BoardConfig {
  rows: number;
  cols: number;
  wordCount: number;
  minWordLength: number;
  maxWordLength: number;
  difficulty: Difficulty;
}

export interface Board {
  grid: Grid;
  words: WordPlacement[];
  config: BoardConfig;
}

export interface LevelConfig {
  level: number;
  difficulty: Difficulty;
  boardConfig: BoardConfig;
  stars3Threshold: number;
  stars2Threshold: number;
}

export type GameStatus = 'playing' | 'won' | 'paused' | 'failed' | 'timeout';

export interface GameState {
  board: Board;
  selectedCells: CellPosition[];
  selectionDirection: Direction | null;
  score: number;
  moves: number;
  hintsLeft: number;
  undosLeft: number;
  history: { grid: Grid; words: WordPlacement[] }[];
  status: GameStatus;
  level: number;
  combo: number;
  maxCombo: number;
  maxMoves: number;
  mode: GameMode;
  timeRemaining: number;
  cascadeMultiplier: number;
  perfectRun: boolean;
  chainCount: number;
  frozenColumns: number[];
  previewGrid: Grid | null;
  boosterCounts: {
    freezeColumn: number;
    boardPreview: number;
    shuffleFiller: number;
  };
}

export type GameAction =
  | { type: 'SELECT_CELL'; position: CellPosition }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SUBMIT_WORD' }
  | { type: 'USE_HINT' }
  | { type: 'UNDO_MOVE' }
  | { type: 'NEW_GAME'; board: Board; level: number; mode?: GameMode; maxMoves?: number; timeRemaining?: number }
  | { type: 'RESET_COMBO' }
  | { type: 'TICK_TIMER' }
  | { type: 'USE_BOOSTER'; booster: string }
  | { type: 'FREEZE_COLUMN'; col: number }
  | { type: 'SHUFFLE_FILLER' }
  | { type: 'PREVIEW_MOVE'; positions: CellPosition[] };

export interface PlayerProgress {
  currentLevel: number;
  highestLevel: number;
  totalScore: number;
  puzzlesSolved: number;
  perfectSolves: number;
  bestStreak: number;
  currentStreak: number;
  lastPlayedDate: string;
  dailyCompleted: string[];
  starsByLevel: Record<number, number>;
}

export const DEFAULT_PROGRESS: PlayerProgress = {
  currentLevel: 1,
  highestLevel: 1,
  totalScore: 0,
  puzzlesSolved: 0,
  perfectSolves: 0,
  bestStreak: 0,
  currentStreak: 0,
  lastPlayedDate: '',
  dailyCompleted: [],
  starsByLevel: {},
};

// ============ ECONOMY ============
export type CurrencyType = 'coins' | 'gems' | 'hintTokens' | 'eventStars' | 'libraryPoints';

export interface Currencies {
  coins: number;
  gems: number;
  hintTokens: number;
  eventStars: number;
  libraryPoints: number;
}

export const DEFAULT_CURRENCIES: Currencies = {
  coins: 500,
  gems: 50,
  hintTokens: 10,
  eventStars: 0,
  libraryPoints: 0,
};

// ============ CHAPTERS ============
export interface Chapter {
  id: number;
  name: string;
  theme: string;
  description: string;
  puzzleCount: number;
  requiredStars: number;
  difficulty: Difficulty;
  themeWords: string[];
  wingId: string;
  icon: string;
}

// ============ GAME MODES ============
export type GameMode =
  | 'classic'
  | 'limitedMoves'
  | 'timePressure'
  | 'perfectSolve'
  | 'cascade'
  | 'daily'
  | 'weekly'
  | 'endless'
  | 'expert'
  | 'relax';

export interface ModeConfig {
  id: GameMode;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlockLevel: number;
  rules: ModeRules;
}

export interface ModeRules {
  hasTimer: boolean;
  timerSeconds?: number;
  hasMoveLimit: boolean;
  moveLimit?: number;
  allowHints: boolean;
  allowUndo: boolean;
  unlimitedUndo: boolean;
  scoreMultiplier: number;
  comboMode: boolean;
}

// ============ COLLECTIONS ============
export interface WordAtlasPage {
  id: string;
  category: string;
  icon: string;
  words: string[];
  foundWords: string[];
  reward: CollectionReward;
}

export interface RareTile {
  letter: string;
  theme: string;
  earned: boolean;
  count: number;
}

export interface SeasonalStamp {
  id: string;
  name: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
}

export interface SeasonalAlbum {
  id: string;
  season: string;
  year: number;
  stamps: SeasonalStamp[];
  startDate: string;
  endDate: string;
}

export interface CollectionReward {
  coins: number;
  gems: number;
  hintTokens: number;
  decoration?: string;
  badge?: string;
}

// ============ LIBRARY META-GAME ============
export interface LibraryWing {
  id: string;
  name: string;
  theme: string;
  icon: string;
  totalShelves: number;
  restoredShelves: number;
  decorations: LibraryDecoration[];
  unlockedByChapter: number;
}

export interface LibraryDecoration {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'furniture' | 'lighting' | 'ornament' | 'book';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  owned: boolean;
  equipped: boolean;
  cost?: { currency: CurrencyType; amount: number };
}

// ============ SOCIAL ============
export interface Club {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  maxMembers: number;
  weeklyScore: number;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  leaderId: string;
  createdAt: string;
}

export interface ClubMember {
  id: string;
  displayName: string;
  avatarId: string;
  weeklyScore: number;
  totalScore: number;
  lastActive: string;
  role: 'leader' | 'elder' | 'member';
}

export interface FriendChallenge {
  id: string;
  challengerId: string;
  challengerName: string;
  challengeeId: string;
  challengeeName: string;
  puzzleSeed: number;
  difficulty: Difficulty;
  challengerScore?: number;
  challengeeScore?: number;
  status: 'pending' | 'active' | 'completed';
  createdAt: string;
  expiresAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarId: string;
  score: number;
  clubName?: string;
}

// ============ EVENTS ============
export type EventType =
  | 'speedSolve'
  | 'perfectClear'
  | 'clubRally'
  | 'cascadeChampionship'
  | 'mysteryWords'
  | 'retroRewind'
  | 'themeWeek'
  | 'expertGauntlet'
  | 'communityMilestone'
  | 'seasonFinale';

export interface GameEvent {
  id: string;
  type: EventType;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  active: boolean;
  rules: Record<string, any>;
  rewards: EventRewardTier[];
  leaderboardId?: string;
  communityGoal?: number;
  communityProgress?: number;
}

export interface EventRewardTier {
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  threshold: number;
  rewards: CollectionReward;
}

// ============ DAILY/WEEKLY SYSTEMS ============
export interface DailyMission {
  id: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  type: 'findWords' | 'completePuzzles' | 'achieveCombo' | 'noHints' | 'perfectSolve' | 'useMode';
  reward: CollectionReward;
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string;
  graceDaysUsed: number;
  shieldActive: boolean;
  shieldExpiry?: string;
}

export interface WeeklyChallenge {
  id: string;
  weekStart: string;
  puzzles: { seed: number; difficulty: Difficulty; completed: boolean; score: number }[];
  totalScore: number;
  rank?: number;
}

export interface MasteryTrack {
  season: string;
  currentTier: number;
  maxTier: number;
  isPremium: boolean;
  rewards: MasteryReward[];
}

export interface MasteryReward {
  tier: number;
  free: CollectionReward;
  premium: CollectionReward;
  claimed: boolean;
}

// ============ MONETIZATION ============
export type IAPProductId =
  | 'starter_pack'
  | 'hint_bundle_10'
  | 'hint_bundle_25'
  | 'hint_bundle_50'
  | 'undo_bundle_10'
  | 'undo_bundle_25'
  | 'undo_bundle_50'
  | 'daily_value_pack'
  | 'chapter_bundle'
  | 'premium_pass'
  | 'ad_removal';

export interface ShopOffer {
  id: string;
  productId: IAPProductId;
  name: string;
  description: string;
  price: string;
  originalPrice?: string;
  icon: string;
  contents: Partial<Currencies> & { decorations?: string[]; badges?: string[] };
  featured: boolean;
  expiresAt?: string;
  oneTime: boolean;
  purchased: boolean;
}

// ============ PROFILE & SETTINGS ============
export interface UserProfile {
  uid: string;
  displayName: string;
  avatarId: string;
  titleId: string;
  frameId: string;
  level: number;
  xp: number;
  xpToNext: number;
  badges: string[];
  joinDate: string;
}

export interface AppSettings {
  sfxVolume: number;
  musicVolume: number;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  colorTheme: string;
  adsRemoved: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  sfxVolume: 0.8,
  musicVolume: 0.5,
  hapticsEnabled: true,
  notificationsEnabled: true,
  colorTheme: 'default',
  adsRemoved: false,
};

// ============ COSMETICS ============
export interface CosmeticTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    bg: string;
    surface: string;
    accent: string;
    cellDefault: string;
    cellSelected: string;
  };
  cost?: { currency: CurrencyType; amount: number };
  owned: boolean;
  equipped: boolean;
}

export interface ProfileFrame {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  source: string;
  owned: boolean;
}

export interface ProfileTitle {
  id: string;
  title: string;
  source: string;
  owned: boolean;
}

// ============ ONBOARDING ============
export interface TutorialStep {
  id: string;
  message: string;
  highlightElement?: string;
  action?: string;
  dismissible: boolean;
}

export interface OnboardingState {
  completed: boolean;
  currentDay: number;
  tutorialStep: number;
  featuresUnlocked: string[];
  tooltipsShown: string[];
}

export const DEFAULT_ONBOARDING: OnboardingState = {
  completed: false,
  currentDay: 0,
  tutorialStep: 0,
  featuresUnlocked: ['classic', 'daily'],
  tooltipsShown: [],
};

// ============ ANALYTICS ============
export type AnalyticsEvent =
  | 'puzzle_start'
  | 'puzzle_complete'
  | 'puzzle_fail'
  | 'puzzle_abandon'
  | 'daily_login'
  | 'streak_count'
  | 'session_start'
  | 'session_end'
  | 'iap_purchase'
  | 'ad_watched'
  | 'hint_used'
  | 'undo_used'
  | 'club_join'
  | 'friend_challenge_sent'
  | 'gift_sent'
  | 'gravity_interaction'
  | 'dead_end_hit'
  | 'wrong_order_attempt'
  | 'chain_count'
  | 'atlas_word_found'
  | 'rare_tile_earned'
  | 'stamp_collected'
  | 'mode_played'
  | 'event_participated'
  | 'collection_completed';
