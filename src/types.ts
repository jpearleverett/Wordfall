export interface Cell {
  letter: string;
  id: string;
}

export type Grid = (Cell | null)[][];

export type Direction = 'horizontal' | 'vertical';

export type GravityDirection = 'down' | 'right' | 'up' | 'left';

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
  hintsUsed: number;
  undosLeft: number;
  history: { grid: Grid; words: WordPlacement[]; wordsUntilShrink?: number; shrinkCount?: number }[];
  status: GameStatus;
  level: number;
  maxMoves: number;
  mode: GameMode;
  timeRemaining: number;
  perfectRun: boolean;
  gravityDirection: GravityDirection;
  shrinkCount: number;
  wordsUntilShrink: number;
  wildcardCells: CellPosition[];
  wildcardMode: boolean;
  spotlightActive: boolean;
  spotlightLetters: string[];
  boosterCounts: {
    wildcardTile: number;
    spotlight: number;
    smartShuffle: number;
  };
  lastInvalidTap: CellPosition | null;
  lastSelectionResetTap: CellPosition | null;
  solveSequence: SolveStep[];
  puzzleStartTime: number;
  scoreDoubler: boolean;
  boardFreezeActive: boolean;
  premiumHintUsed: boolean;
  /**
   * Boosters activated in the current puzzle, in order of activation. Used to
   * detect two-booster combos (`src/data/boosterCombos.ts`). Resets on
   * NEW_GAME. Repeated activations of the same booster (e.g. two wildcards)
   * only contribute one entry so combos require two *distinct* boosters.
   */
  boostersUsedThisPuzzle: string[];
  /** Active booster-combo id, or null when no combo is in flight. */
  activeComboType: string | null;
  /**
   * Remaining word-finds with `comboMultiplier` applied. Decremented on each
   * successful word. When it reaches 0 the combo expires.
   */
  comboWordsRemaining: number;
  /** Score multiplier applied to word-find score while a combo is active. 1 = no combo. */
  comboMultiplier: number;
  /**
   * When true, `SUBMIT_WORD` captures `gridStateBefore` / `gridStateAfter`
   * snapshots on every solve step (for replay rendering + share text).
   * When false (the default) the snapshots are omitted to save two full
   * grid string-copies per word — perf-critical during chain clears.
   * Enabled per-puzzle by GameScreen for dailies / event puzzles.
   */
  captureReplay: boolean;
  /**
   * Unique identifier generated on the `'won'` status transition. Used
   * as a dedup key by any server-side flow that would otherwise
   * double-grant rewards on a retry (weekly-leaderboard snapshot,
   * referral-milestone credit, puzzle-complete inbox writes). `null`
   * until the puzzle is solved, then stays fixed for the remainder of
   * that puzzle's lifecycle (cleared on NEW_GAME).
   */
  completionId: string | null;
}

export type GameAction =
  | { type: 'SELECT_CELL'; position: CellPosition }
  /**
   * Batched form of SELECT_CELL. The reducer applies the positions in order,
   * producing a single new state object regardless of how many cells were
   * crossed. Used by the Grid pan handler's requestAnimationFrame batcher
   * so rapid drags don't commit N times per frame.
   */
  | { type: 'SELECT_CELLS'; positions: CellPosition[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SUBMIT_WORD' }
  | { type: 'USE_HINT' }
  | { type: 'UNDO_MOVE' }
  | { type: 'NEW_GAME'; board: Board; level: number; mode?: GameMode; maxMoves?: number; timeRemaining?: number }
  | { type: 'TICK_TIMER' }
  | { type: 'USE_BOOSTER'; booster: string }
  | { type: 'WILDCARD_PLACE'; position: CellPosition }
  | { type: 'SPOTLIGHT_ACTIVATE' }
  | { type: 'SMART_SHUFFLE' }
  | { type: 'GRANT_HINT' }
  | { type: 'GRANT_UNDO' }
  | { type: 'GRANT_BOOSTER'; booster: 'wildcardTile' | 'spotlight' | 'smartShuffle' }
  | { type: 'USE_PREMIUM_HINT' }
  | { type: 'ACTIVATE_SCORE_DOUBLER' }
  | { type: 'ACTIVATE_BOARD_FREEZE' }
  | {
      type: 'ACTIVATE_BOOSTER_COMBO';
      comboType: string;
      multiplier: number;
      wordsDuration: number;
    }
  | { type: 'EXPIRE_BOOSTER_COMBO' }
  /**
   * Dispatched from a `useEffect` when a shrinking-board shrink leaves the
   * puzzle unsolvable (see Fix B in the April 2026 perf pass). Carries
   * shrinkCount so the reducer ignores stale dispatches — if another
   * shrink has occurred since the check started, the check is outdated.
   */
  | { type: 'MARK_FAILED'; shrinkCount: number }
  /**
   * Restores an in-flight puzzle from a previously saved snapshot. Used when
   * the app is killed mid-puzzle (backgrounding + OS reclamation, crash,
   * etc.) so the player resumes exactly where they left off. Emitted by
   * GameScreen on mount if a valid snapshot exists for the target level.
   */
  | { type: 'HYDRATE_FROM_SNAPSHOT'; state: GameState };

/**
 * Serializable snapshot of an in-progress puzzle. Written to AsyncStorage on
 * AppState 'background' so a kill-mid-puzzle doesn't lose the player's work.
 *
 * `version` is bumped when the shape changes so stale snapshots from older
 * app versions are discarded safely instead of crashing hydrate.
 */
export interface PuzzleSnapshot {
  version: 1;
  savedAtMs: number;
  level: number;
  mode: GameMode;
  chapterId: number;
  state: GameState;
}

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
/**
 * Per-chapter generation constraints that steer procedural board generation
 * toward a curated "feel" without hand-authoring puzzles. Early tutorial
 * chapters use tight profiles (short words, common dictionary, clear mechanic
 * intros); later chapters loosen constraints for variety.
 */
export interface GenerationProfile {
  /** Lower bound on placed word length. Default 3. */
  minWordLength?: number;
  /** Upper bound on placed word length. Default 9. */
  maxWordLength?: number;
  /**
   * Mechanics this chapter should showcase so the generator biases toward
   * boards where the mechanic is likely to trigger. Purely advisory; does
   * not change engine rules (which are driven by mode).
   */
  introducedMechanics?: Array<
    | 'gravityCascade'
    | 'fourLetter'
    | 'wildcards'
    | 'longWords'
    | 'denseBoard'
  >;
  /** 0..1 — fraction of cells intentionally left empty at gen time. */
  emptyCellDensity?: number;
  /**
   * 'common' restricts to high-frequency dictionary subset (safer for
   * beginners). 'standard' uses the full dictionary. 'expert' biases toward
   * rarer words. Default 'standard'.
   */
  dictionaryTier?: 'common' | 'standard' | 'expert';
}

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
  /** Optional generation constraints. When absent, defaults apply. */
  profile?: GenerationProfile;
}

// ============ GAME MODES ============
export type GameMode =
  | 'classic'
  | 'gravityFlip'
  | 'timePressure'
  | 'perfectSolve'
  | 'shrinkingBoard'
  | 'daily'
  | 'weekly'
  | 'noGravity'
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

export interface SkillGate {
  perfectSolves?: number;
  minStars?: number;
  puzzlesSolved?: number;
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
  skillGate?: SkillGate;
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
  challengerScore: number;
  challengerStars: number;
  challengerTime: number;
  level: number;
  seed: number; // board seed for identical puzzle
  mode: GameMode;
  boardConfig: BoardConfig;
  createdAt: string;
  expiresAt: string; // 7 days
  status: 'pending' | 'completed' | 'expired';
  respondentScore?: number;
  respondentStars?: number;
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
  | 'gravityFlipChampionship'
  | 'mysteryWords'
  | 'retroRewind'
  | 'themeWeek'
  | 'expertGauntlet'
  | 'communityMilestone'
  | 'seasonFinale'
  | 'weekendBlitz';

export interface EventExclusiveReward {
  type: 'frame' | 'title' | 'decoration';
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

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
  exclusiveReward?: EventExclusiveReward;
  isTimeLimited?: boolean;
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
  lastPlayDate: string;
  graceDaysUsed: number;
  streakShieldAvailable: boolean;
  lastShieldDate?: string;
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
  | 'hint_starter'
  | 'hint_bundle_10'
  | 'hint_bundle_15'
  | 'hint_bundle_25'
  | 'hint_bundle_50'
  | 'hint_master'
  | 'hint_legend'
  | 'undo_starter'
  | 'undo_bundle_10'
  | 'undo_bundle_15'
  | 'undo_bundle_25'
  | 'undo_bundle_50'
  | 'undo_master'
  | 'undo_legend'
  | 'daily_value_pack'
  | 'chapter_bundle'
  | 'adventurer_pack'
  | 'explorer_bundle'
  | 'champion_pack'
  | 'booster_crate'
  | 'premium_pass'
  | 'ad_removal'
  | 'gems_30'
  | 'gems_50'
  | 'gems_120'
  | 'gems_200'
  | 'gems_250'
  | 'gems_400'
  | 'gems_500'
  | 'gems_1000'
  | 'coins_500'
  | 'coins_2000'
  | 'coins_5000'
  | 'weekend_warrior'
  | 'weekly_champion'
  | 'event_special'
  | 'season_pass_bundle'
  | 'quick_boost'
  | 'power_pack'
  | 'super_bundle'
  | 'diamond_collection'
  | 'platinum_pack'
  | 'royal_collection'
  | 'ultimate_whale'
  | 'vip_weekly'
  | 'vip_monthly'
  | 'vip_annual'
  | 'first_purchase_special'
  | 'piggy_bank_break'
  | 'season_pass_premium'
  | 'streak_freeze';

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

export interface CosmeticBonuses {
  coinMultiplier?: number;
  gemMultiplier?: number;
  xpMultiplier?: number;
}

export interface ProfileFrame {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  source: string;
  owned: boolean;
  cost?: { currency: CurrencyType; amount: number } | { coins: number; gems: number };
  bonuses?: CosmeticBonuses;
}

export interface ProfileTitle {
  id: string;
  title: string;
  source: string;
  owned: boolean;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  bonuses?: CosmeticBonuses;
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

// ============ FEATURE UNLOCKS ============
export type FeatureUnlockId =
  | 'tab_play'
  | 'tab_collections'
  | 'tab_library'
  | 'tab_profile'
  | 'boosters'
  | 'events'
  | 'weekly_goals';

export interface FeatureUnlockDef {
  id: FeatureUnlockId;
  unlockLevel: number;
  icon: string;
  title: string;
  description: string;
  accentColor: string;
}

// ============ WEEKLY GOALS ============
export interface WeeklyGoal {
  templateId: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  trackingKey: string;
  reward: { coins: number; gems: number };
}

export interface WeeklyGoalsState {
  goals: WeeklyGoal[];
  weekStart: string;
  allCompleteBonus: { coins: number; gems: number };
}

// ============ CEREMONY QUEUE ============
export interface CeremonyItem {
  type:
    | 'feature_unlock'
    | 'mode_unlock'
    | 'achievement'
    | 'streak_milestone'
    | 'collection_complete'
    | 'level_up'
    | 'difficulty_transition'
    | 'mystery_wheel_jackpot'
    | 'win_streak_milestone'
    | 'flawless_streak_milestone'
    | 'star_milestone'
    | 'perfect_milestone'
    | 'decoration_unlock'
    | 'first_rare_tile'
    | 'first_booster'
    | 'wing_complete'
    | 'word_mastery_gold'
    | 'first_mode_clear'
    | 'wildcard_earned'
    | 'mastery_tier_up'
    | 'quest_step_complete'
    | 'prestige'
    | 'first_win'
    | 'early_bonus'
    | 'library_teaser'
    | 'starter_pack_unlocked'
    | 'tomorrow_preview'
    | 'daily_quest_claim'
    | 'first_purchase_offer';
  data: Record<string, any>;
  /** If set, ceremony auto-dismisses after this many ms (Tier 2 behavior). */
  autoDismissMs?: number;
}

// ============ VICTORY SUMMARY ITEMS ============
// Tier 2 unlocks embedded inline on the victory screen (instead of full-screen ceremony modals)
export interface VictorySummaryItem {
  type:
    | 'level_up'
    | 'difficulty_transition'
    | 'mastery_tier_up'
    | 'star_milestone'
    | 'perfect_milestone'
    | 'decoration_unlock'
    | 'library_teaser'
    | 'early_bonus'
    | 'mode_unlock'
    | 'next_unlock_preview';
  icon: string;
  label: string;
  sublabel?: string;
  accentColor: string;
  action?: { type: 'navigate'; screen: string; params?: Record<string, unknown> };
  coinReward?: number;
  gemReward?: number;
}

// ============ ONBOARDING MILESTONES ============
export interface OnboardingMilestone {
  id: string;
  triggerLevel: number;
  message: string;
  ctaLabel: string;
  action: 'play' | 'play_again' | 'open_wheel' | 'try_mode' | 'open_collections' | 'tease_library' | 'open_goals' | 'open_library' | 'open_events';
  icon: string;
}

// ============ MYSTERY WHEEL ============
export interface MysteryWheelState {
  spinsAvailable: number;
  puzzlesSinceLastSpin: number;
  puzzlesPerFreeSpin: number;
  totalSpins: number;
  lastJackpotSpin: number;
  jackpotPity: number;
  lastDailySpinDate: string;
}

// ============ WIN STREAK ============
export interface WinStreakState {
  currentStreak: number;
  bestStreak: number;
  lastWinDate: string | null;
  rewardsClaimed: number[];
}

// ============ PUZZLE ENERGY ============
export interface PuzzleEnergyState {
  current: number;
  lastRegenTime: string; // ISO timestamp
  lastResetDate: string; // YYYY-MM-DD — for daily reset
  bonusPlaysUsed: number;
}

// ============ PLAYER METRICS (for adaptive difficulty) ============
export interface PlayerMetrics {
  levelAttempts: Record<number, number>;
  averageStars: number;
  averageCompletionTime: number;
  consecutiveThreeStars: number;
  recentStars: number[]; // last 20 puzzle star results
  recentCompletionTimes: number[]; // last 20 puzzle completion times (seconds)
}

// ============ CONTEXTUAL OFFER ============
export type ContextualOfferType =
  | 'hint_rescue'
  | 'life_refill'
  | 'streak_shield'
  | 'close_finish'
  | 'post_puzzle'
  | 'booster_pack';

// ============ LIVES / ENERGY ============
export interface LivesState {
  current: number;
  max: number;
  lastRefillTime: number;
}

export const DEFAULT_LIVES: LivesState = {
  current: 5,
  max: 5,
  lastRefillTime: Date.now(),
};

// ============ ANALYTICS ============
// Canonical event type — kept in sync with src/services/analytics.ts AnalyticsEventName
export type AnalyticsEvent =
  // Core retention
  | 'app_open'
  | 'tutorial_step'
  | 'tutorial_complete'
  // Puzzle lifecycle
  | 'puzzle_start'
  | 'puzzle_complete'
  | 'puzzle_fail'
  | 'puzzle_abandon'
  // In-game actions
  | 'hint_used'
  | 'booster_used'
  | 'dead_end_detected'
  // Offers & monetization
  | 'offer_shown'
  | 'offer_accepted'
  | 'offer_dismissed'
  | 'mystery_wheel_spin'
  | 'iap_initiated'
  | 'iap_completed'
  | 'iap_purchase'
  | 'ad_watched'
  // Progression & social
  | 'daily_challenge_complete'
  | 'streak_broken'
  | 'achievement_earned'
  | 'ceremony_shown'
  | 'ceremony_dismissed'
  | 'feature_unlocked'
  | 'screen_view'
  | 'club_joined'
  | 'share_tapped'
  // Session
  | 'app_session_start'
  | 'session_end'
  // A/B testing
  | 'experiment_assigned'
  // Legacy / granular events
  | 'daily_login'
  | 'streak_count'
  | 'undo_used'
  | 'club_join'
  | 'friend_challenge_sent'
  | 'gift_sent'
  | 'gravity_interaction'
  | 'dead_end_hit'
  | 'wrong_order_attempt'
  | 'atlas_word_found'
  | 'rare_tile_earned'
  | 'stamp_collected'
  | 'mode_started'
  | 'mode_played'
  | 'event_participated'
  | 'collection_completed'
  | 'level_up';

// ============ REFERRAL ============
export interface ReferralState {
  referralCode: string;
  referralCount: number;
  referredBy: string | null;
  referredPlayerIds: string[];
  referralMilestonesClaimed: number[];
}

export interface ReferralMilestone {
  count: number;
  label: string;
  icon: string;
  rewards: {
    coins?: number;
    gems?: number;
    cosmeticId?: string;
    cosmeticType?: 'frame' | 'title';
  };
}

// ============ PRESTIGE SYSTEM ============
export interface PrestigeState {
  prestigeLevel: number;      // 0 = never prestiged
  totalPrestiges: number;
  lastPrestigedAt?: number;   // timestamp
  permanentBonuses: string[]; // accumulated bonus IDs
}

// ============ VIP STREAK ============
export interface VipStreakState {
  vipStreakWeeks: number;           // consecutive weeks subscribed
  vipStreakBonusClaimed: boolean;   // claimed this week's streak bonus
}

// ============ SOLVE REPLAY ============
export interface SolveStep {
  wordFound: string;
  cellPositions: [number, number][];
  gridStateBefore: string[][]; // snapshot of letters
  gridStateAfter: string[][]; // after gravity
  timestamp: number; // ms since puzzle start
  score: number;
}

export interface ReplayData {
  level: number;
  mode: GameMode;
  steps: SolveStep[];
  totalScore: number;
  stars: number;
  totalTime: number;
  perfectRun: boolean;
}
