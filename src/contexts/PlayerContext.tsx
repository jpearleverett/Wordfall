import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { CHAPTERS, getChapterForLevel } from '../data/chapters';
import { CeremonyItem, PlayerMetrics, PuzzleEnergyState, WeeklyGoalsState } from '../types';
import { SeasonalQuestState, DEFAULT_SEASONAL_QUEST_STATE } from '../data/seasonalQuests';
import { generateWeeklyGoals, isNewWeek } from '../data/weeklyGoals';
import { ACHIEVEMENTS, getAchievementTier, getAchievementTierId } from '../data/achievements';
import { COLLECTION, ENERGY, FEATURE_UNLOCK_SCHEDULE, MODE_CONFIGS, STAR_MILESTONES, STREAK } from '../constants';
import { DEFAULT_PLAYER_METRICS, updatePlayerMetrics } from '../engine/difficultyAdjuster';
import { ATLAS_PAGES } from '../data/collections';
import {
  PlayerSegments,
  DEFAULT_SEGMENTS,
  computeSegments,
  SegmentationInput,
} from '../services/playerSegmentation';
import { triggerEnergyFullNotification } from '../services/notificationTriggers';
import { createProgressMethods } from './PlayerProgressContext';
import { createSocialMethods } from './PlayerSocialContext';
import { generateReferralCode, REFERRAL_MILESTONES } from '../data/referralSystem';
import { createPersistQueue } from '../utils/persistQueue';
import { firestoreService } from '../services/firestore';
import { recordReferralSuccessSecure } from '../services/referralRewards';
import { analytics } from '../services/analytics';
import {
  getTitle,
  getTitleLabel,
  hasDecoration,
  hasFrame,
  hasTitle,
  isProfileCosmeticId,
  resolveLegacyCosmeticId,
  resolveTitleId,
} from '../data/cosmetics';
import {
  canPrestige,
  getPrestigeRewards,
  DEFAULT_PRESTIGE_STATE,
  PRESTIGE_LEVELS,
} from '../data/prestigeSystem';
import { PrestigeState } from '../types';
import {
  PlayerStoreContext,
  PlayerActionsContext,
  createPlayerStore,
  type PlayerStore,
  type PlayerActions,
} from '../stores/playerStore';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CollectionProgress {
  atlasPages: Record<string, string[]>;
  atlasWordMastery: Record<string, number>; // per-word mastery counter (max 5 = gold border)
  rareTiles: Record<string, number>;
  wildcardTiles: number;
  seasonalStamps: Record<string, number[]>;
}

interface MissionProgress {
  dailyMissions: DailyMission[];
  lastMissionDate: string;
  missionsCompletedToday: number;
}

interface DailyMission {
  id: string;
  progress: number;
  completed: boolean;
}

interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastPlayDate: string;
  graceDaysUsed: number;
  streakShieldAvailable: boolean;
  lastShieldDate: string;
}

interface ModeStats {
  played: number;
  bestScore: number;
  wins: number;
}

export interface PlayerData {
  // Progress
  currentLevel: number;
  highestLevel: number;
  totalScore: number;
  puzzlesSolved: number;
  perfectSolves: number;
  currentChapter: number;
  starsByLevel: Record<number, number>;
  totalStars: number;

  // Daily
  dailyCompleted: string[];
  dailyLoginDates: string[];
  loginCycleDay: number;
  lastLoginRewardClaimDate: string | null;

  // Streaks
  streaks: StreakData;

  // Collections
  collections: CollectionProgress;

  // Missions
  missions: MissionProgress;

  // Social
  clubId: string | null;
  friendIds: string[];

  // Friend Challenges
  friendChallenges: {
    sent: import('../types').FriendChallenge[];
    received: import('../types').FriendChallenge[];
  };

  // Cosmetics
  equippedTheme: string;
  equippedFrame: string;
  equippedTitle: string;
  unlockedCosmetics: string[];

  // Library
  restoredWings: string[];
  placedDecorations: Record<string, string>;
  ownedDecorations: string[];

  // Modes
  unlockedModes: string[];
  modeStats: Record<string, ModeStats>;
  modeLevels: Record<string, number>;

  // Onboarding
  tutorialComplete: boolean;
  onboardingDay: number;
  featuresUnlocked: string[];
  onboardingMilestones: string[]; // completed milestone IDs

  // Milestones
  achievementIds: string[];

  // Comebacks
  lastActiveDate: string;
  comebackRewardsClaimed: string[];

  // Weekly Goals
  weeklyGoals: WeeklyGoalsState | null;

  // Ceremonies
  pendingCeremonies: CeremonyItem[];

  // Tooltips
  tooltipsShown: string[];

  // Difficulty Pacing
  failCountByLevel: Record<number, number>;
  consecutiveFailures: number;
  lastLevelStars: number;

  // Tracking
  wordsFoundTotal: number;
  modesPlayedThisWeek: string[];

  // Gifting
  hintGiftsSentToday: number;
  lastGiftDate: string;
  tileGiftsSentToday: number;

  // Mystery Wheel
  mysteryWheel: {
    spinsAvailable: number;
    puzzlesSinceLastSpin: number;
    puzzlesPerFreeSpin: number;
    totalSpins: number;
    lastJackpotSpin: number;
    jackpotPity: number;
    lastDailySpinDate: string;
  };

  // Win Streak (per-session consecutive wins)
  winStreak: {
    currentStreak: number;
    bestStreak: number;
    lastWinDate: string | null;
    rewardsClaimed: number[];
  };

  // Flawless Streak (consecutive flawless puzzles — no hints/undos/shuffle).
  // Cross-session; increments on distinct calendar days so same-day replays
  // don't inflate the count. Breaks on any non-flawless completion.
  flawlessStreak: {
    currentStreak: number;
    bestStreak: number;
    lastFlawlessDate: string | null;
    rewardsClaimed: number[];
  };

  // Event Progress
  eventProgress: Record<string, { progress: number; claimedTiers: string[]; startedAt: number }>;

  // Puzzle Energy
  puzzleEnergy: PuzzleEnergyState;

  // Adaptive Difficulty Metrics
  performanceMetrics: PlayerMetrics;

  // Player Segmentation
  segments: PlayerSegments;

  // Referral
  referralCode: string;
  referralCount: number;
  referredBy: string | null;
  referredPlayerIds: string[];
  referralMilestonesClaimed: number[];
  /** Set once the Cloud Function onReferralSuccess has succeeded for this user. */
  referralRewardGranted?: boolean;

  // Prestige
  prestige: import('../types').PrestigeState;

  // Wing Completion Bonuses
  completedWingBonuses: string[];

  // Seasonal Quest
  seasonalQuest: SeasonalQuestState;

  // Cloud sync
  lastModified: number;
}

type CloudSyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface PlayerContextType extends PlayerData {
  loaded: boolean;
  cloudSyncStatus: CloudSyncStatus;

  // Progress
  updateProgress: (updates: Partial<PlayerData>) => void;
  recordPuzzleComplete: (level: number, score: number, stars: number, isPerfect: boolean) => void;
  recordDailyComplete: (dateString: string) => void;

  // Collections
  collectAtlasWord: (pageId: string, word: string) => void;
  addRareTile: (letter: string, count?: number) => void;
  collectStamp: (albumId: string, stampIndex: number) => void;

  // Missions
  updateMissionProgress: (missionId: string, progress: number) => void;
  claimMissionReward: (missionId: string) => void;
  generateDailyMissions: () => void;

  // Streaks
  updateStreak: () => void;
  useGraceDay: () => boolean;
  useStreakShield: () => boolean;

  // Cosmetics
  equipCosmetic: (type: 'theme' | 'frame' | 'title', id: string) => void;
  unlockCosmetic: (id: string) => void;

  // Library
  restoreWing: (wingId: string) => void;
  placeDecoration: (slotId: string, decorationId: string) => void;
  unlockDecoration: (decorationId: string) => void;

  // Modes
  unlockMode: (modeId: string) => void;
  recordModePlay: (modeId: string, score: number, isWin: boolean) => void;
  advanceModeLevel: (modeId: string) => void;
  getModeLevel: (modeId: string) => number;

  // Achievements
  completeAchievement: (achievementId: string) => void;

  // Comebacks
  checkComebackRewards: () => string[];

  // Feature unlocks
  unlockFeature: (featureId: string) => void;
  checkFeatureUnlocks: (level: number) => CeremonyItem[];

  // Tooltips
  markTooltipShown: (id: string) => void;

  // Onboarding milestones
  completeOnboardingMilestone: (id: string) => void;

  // Weekly Goals
  initWeeklyGoals: () => void;
  updateWeeklyGoalProgress: (trackingKey: string, value: number) => void;

  // Ceremonies
  queueCeremony: (ceremony: CeremonyItem) => void;
  popCeremony: () => CeremonyItem | null;

  // Difficulty pacing
  recordFailure: (level: number) => void;
  needsBreather: () => boolean;

  // Achievements checking
  checkAchievements: (extraData?: Record<string, unknown>) => CeremonyItem[];

  // Gifting
  sendHintGift: (friendId: string) => boolean;
  sendTileGift: (friendId: string, tileLetter: string) => boolean;

  // Mystery Wheel
  updateMysteryWheel: (updates: Partial<PlayerData['mysteryWheel']>) => void;
  awardFreeSpin: () => void;

  // Win Streak
  updateWinStreak: (won: boolean) => void;

  // Flawless Streak
  updateFlawlessStreak: (wasFlawless: boolean) => void;

  // Puzzle Energy
  useEnergy: (mode: string) => boolean;
  refillEnergy: (method: 'ad' | 'gems') => boolean;
  getTimeUntilNextEnergy: () => number;
  getEnergyDisplay: () => { current: number; max: number; bonusPlaysLeft: number; isBonusMode: boolean };

  // Adaptive Difficulty
  recordPerformanceMetrics: (level: number, stars: number, completionTimeSeconds: number) => void;

  // Player Segmentation
  recomputeSegments: (totalSpendCents?: number, sharesCount?: number) => void;

  // Friend Challenges
  sendChallenge: (friendId: string, puzzleData: {
    score: number;
    stars: number;
    time: number;
    level: number;
    seed: number;
    mode: import('../types').GameMode;
    boardConfig: import('../types').BoardConfig;
  }) => import('../types').FriendChallenge;
  respondToChallenge: (challengeId: string, score: number, stars: number) => void;

  // Event Progress
  updateEventProgress: (eventId: string, progress: number, claimedTiers?: string[]) => void;

  // Referral
  applyReferralCode: (code: string) => boolean;
  /** Fires the Cloud Function grant. Returns true if a grant was newly triggered. */
  recordReferralSuccess: () => Promise<boolean>;
  claimReferralMilestone: (count: number) => boolean;

  // Seasonal Quest
  updateSeasonalQuest: (updates: Partial<SeasonalQuestState>) => void;

  // Social Proof
  notifyFriendActivity: (friendName: string, event: string, detail: string) => void;

  // Prestige
  performPrestige: () => boolean;
  getPrestigeInfo: () => {
    state: PrestigeState;
    canPrestige: boolean;
    nextRewards: import('../data/prestigeSystem').PrestigeLevel | null;
  };
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const STORAGE_KEY = '@wordfall_player';

const getToday = (): string => new Date().toISOString().split('T')[0];

const DEFAULT_PLAYER_DATA: PlayerData = {
  // Progress
  currentLevel: 1,
  highestLevel: 1,
  totalScore: 0,
  puzzlesSolved: 0,
  perfectSolves: 0,
  currentChapter: 1,
  starsByLevel: {},
  totalStars: 0,

  // Daily
  dailyCompleted: [],
  dailyLoginDates: [],
  loginCycleDay: 1,
  lastLoginRewardClaimDate: null,

  // Streaks
  streaks: {
    currentStreak: 0,
    bestStreak: 0,
    lastPlayDate: '',
    graceDaysUsed: 0,
    streakShieldAvailable: false,
    lastShieldDate: '',
  },

  // Collections
  collections: {
    atlasPages: {},
    atlasWordMastery: {},
    rareTiles: {},
    wildcardTiles: 0,
    seasonalStamps: {},
  },

  // Missions
  missions: {
    dailyMissions: [],
    lastMissionDate: '',
    missionsCompletedToday: 0,
  },

  // Social
  clubId: null,
  friendIds: [],

  // Friend Challenges
  friendChallenges: {
    sent: [],
    received: [],
  },

  // Cosmetics
  equippedTheme: 'default',
  equippedFrame: 'default',
  equippedTitle: 'title_newcomer',
  unlockedCosmetics: ['default', 'title_newcomer'],

  // Library
  restoredWings: [],
  placedDecorations: {},
  ownedDecorations: [],

  // Modes
  unlockedModes: ['classic'],
  modeStats: {
    classic: { played: 0, bestScore: 0, wins: 0 },
  },
  modeLevels: {},

  // Onboarding
  tutorialComplete: false,
  onboardingDay: 1,
  featuresUnlocked: [],
  onboardingMilestones: [],

  // Milestones
  achievementIds: [],

  // Comebacks
  lastActiveDate: '',
  comebackRewardsClaimed: [],

  // Weekly Goals
  weeklyGoals: null,

  // Ceremonies
  pendingCeremonies: [],

  // Tooltips
  tooltipsShown: [],

  // Difficulty Pacing
  failCountByLevel: {},
  consecutiveFailures: 0,
  lastLevelStars: 0,

  // Tracking
  wordsFoundTotal: 0,
  modesPlayedThisWeek: [],

  // Gifting
  hintGiftsSentToday: 0,
  lastGiftDate: '',
  tileGiftsSentToday: 0,

  // Mystery Wheel
  mysteryWheel: {
    spinsAvailable: 1, // Start with 1 free spin
    puzzlesSinceLastSpin: 0,
    puzzlesPerFreeSpin: 5,
    totalSpins: 0,
    lastJackpotSpin: 0,
    jackpotPity: 25,
    lastDailySpinDate: '',
  },

  // Win Streak
  winStreak: {
    currentStreak: 0,
    bestStreak: 0,
    lastWinDate: null,
    rewardsClaimed: [],
  },

  // Flawless Streak
  flawlessStreak: {
    currentStreak: 0,
    bestStreak: 0,
    lastFlawlessDate: null,
    rewardsClaimed: [],
  },

  // Event Progress
  eventProgress: {},

  // Puzzle Energy
  puzzleEnergy: {
    current: ENERGY.MAX,
    lastRegenTime: new Date().toISOString(),
    lastResetDate: new Date().toISOString().split('T')[0],
    bonusPlaysUsed: 0,
  },

  // Adaptive Difficulty Metrics
  performanceMetrics: DEFAULT_PLAYER_METRICS,

  // Player Segmentation
  segments: DEFAULT_SEGMENTS,

  // Referral
  referralCode: '',
  referralCount: 0,
  referredBy: null,
  referredPlayerIds: [],
  referralMilestonesClaimed: [],
  referralRewardGranted: false,

  // Prestige
  prestige: DEFAULT_PRESTIGE_STATE,

  // Wing Completion Bonuses
  completedWingBonuses: [],

  // Seasonal Quest
  seasonalQuest: DEFAULT_SEASONAL_QUEST_STATE,

  // Cloud sync
  lastModified: 0,
};

// ─── Context ────────────────────────────────────────────────────────────────

const PlayerContext = createContext<PlayerContextType>({
  ...DEFAULT_PLAYER_DATA,
  loaded: false,
  cloudSyncStatus: 'offline',
  updateProgress: () => {},
  recordPuzzleComplete: () => {},
  recordDailyComplete: () => {},
  collectAtlasWord: () => {},
  addRareTile: () => {},
  collectStamp: () => {},
  updateMissionProgress: () => {},
  claimMissionReward: () => {},
  generateDailyMissions: () => {},
  updateStreak: () => {},
  useGraceDay: () => false,
  useStreakShield: () => false,
  equipCosmetic: () => {},
  unlockCosmetic: () => {},
  restoreWing: () => {},
  placeDecoration: () => {},
  unlockDecoration: () => {},
  unlockMode: () => {},
  recordModePlay: () => {},
  advanceModeLevel: () => {},
  getModeLevel: () => 1,
  completeAchievement: () => {},
  checkComebackRewards: () => [],
  unlockFeature: () => {},
  checkFeatureUnlocks: () => [],
  markTooltipShown: () => {},
  completeOnboardingMilestone: () => {},
  initWeeklyGoals: () => {},
  updateWeeklyGoalProgress: () => {},
  queueCeremony: () => {},
  popCeremony: () => null,
  recordFailure: () => {},
  needsBreather: () => false,
  checkAchievements: () => [],
  sendHintGift: () => false,
  sendTileGift: () => false,
  updateMysteryWheel: () => {},
  awardFreeSpin: () => {},
  updateWinStreak: () => {},
  updateFlawlessStreak: () => {},
  useEnergy: () => false,
  refillEnergy: () => false,
  getTimeUntilNextEnergy: () => 0,
  getEnergyDisplay: () => ({ current: ENERGY.MAX, max: ENERGY.MAX, bonusPlaysLeft: ENERGY.BONUS_PLAYS_AFTER_ZERO, isBonusMode: false }),
  recordPerformanceMetrics: () => {},
  sendChallenge: () => ({ id: '', challengerId: '', challengerName: '', challengerScore: 0, challengerStars: 0, challengerTime: 0, level: 0, seed: 0, mode: 'classic' as const, boardConfig: { rows: 5, cols: 5, wordCount: 3, minWordLength: 3, maxWordLength: 5, difficulty: 'easy' as const }, createdAt: '', expiresAt: '', status: 'pending' as const }),
  respondToChallenge: () => {},
  recomputeSegments: () => {},
  updateEventProgress: () => {},
  applyReferralCode: () => false,
  recordReferralSuccess: async () => false,
  claimReferralMilestone: () => false,
  updateSeasonalQuest: () => {},
  notifyFriendActivity: () => {},
  performPrestige: () => false,
  getPrestigeInfo: () => ({
    state: DEFAULT_PRESTIGE_STATE,
    canPrestige: false,
    nextRewards: null,
  }),
});

function deriveProgressUnlockedCosmetics(data: PlayerData): string[] {
  const unlocked = new Set<string>();

  const addIfValid = (id: string) => {
    if (isProfileCosmeticId(id)) unlocked.add(resolveLegacyCosmeticId(id));
  };

  if (data.puzzlesSolved >= 10) addIfValid('bronze_ring');
  if (data.puzzlesSolved >= 50) addIfValid('silver_ring');
  if (data.puzzlesSolved >= 100) addIfValid('gold_ring');
  if (data.puzzlesSolved >= 500) addIfValid('diamond_ring');

  if (data.puzzlesSolved >= 25) addIfValid('title_puzzle_solver');
  if (data.puzzlesSolved >= 30) addIfValid('title_veteran');
  if (data.perfectSolves >= 10) addIfValid('title_perfectionist');

  const totalRareTiles = Object.values(data.collections.rareTiles).reduce((sum, count) => sum + count, 0);
  if (totalRareTiles >= 50) addIfValid('title_collector');

  const completedAtlasPages = Object.values(data.collections.atlasPages).filter((words) => words.length >= 10).length;
  if (completedAtlasPages >= 3) addIfValid('title_scholar');

  const uniqueModesPlayed = Object.entries(data.modeStats)
    .filter(([, stats]) => stats.played > 0)
    .map(([modeId]) => modeId);
  if (uniqueModesPlayed.length >= 10) addIfValid('title_explorer');

  if (data.restoredWings.length >= 4) addIfValid('title_librarian');

  if (data.streaks.currentStreak >= 7) addIfValid('title_streak_keeper');

  if (data.wordsFoundTotal >= 100) addIfValid('title_word_finder');
  if (data.wordsFoundTotal >= 1000) addIfValid('title_word_sage');

  const speedDemonTier = data.achievementIds.includes('speed_demon_gold')
    || data.achievementIds.includes('speed_solver_bronze');
  if (speedDemonTier) addIfValid('title_speed_demon');

  const maxStarMilestone = STAR_MILESTONES.filter((milestone) => data.totalStars >= milestone.stars);
  for (const milestone of maxStarMilestone) {
    if (milestone.type === 'frame' && hasFrame(milestone.reward)) addIfValid(milestone.reward);
    if (milestone.type === 'title' && hasTitle(milestone.reward)) addIfValid(milestone.reward);
  }

  return Array.from(unlocked);
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<PlayerData>(DEFAULT_PLAYER_DATA);
  const [loaded, setLoaded] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('offline');
  const firestoreSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Debounced local persist. A winning puzzle fires 15+ setData calls via
  // useRewardWiring (recordPuzzleComplete → recordModePlay → updateProgress → ...).
  // Writing the full PlayerData blob to AsyncStorage synchronously on every one
  // of those was costing ~130ms on the post-win commit. JSON.stringify of the
  // player record + AsyncStorage.setItem is 5-20ms per call. We debounce to
  // coalesce rapid bursts into one write. 300ms is short enough that a user
  // who backgrounds the app within a third of a second still loses nothing
  // (AppState 'background' also triggers a synchronous flush — see below).
  //
  // Debounce coalesces; persistQueue serializes. The queue guarantees at
  // most one setItem in flight at a time — important because rapid-fire
  // state changes combined with AsyncStorage's async IO can otherwise
  // interleave and land out-of-order on some Android SharedPreferences
  // implementations.
  const localPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localPersistQueueRef = useRef(
    createPersistQueue<PlayerData>(async (payload) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        if (__DEV__) console.warn('Failed to save player data to AsyncStorage:', e);
      }
    }, 'player-local'),
  );
  const firestorePersistQueueRef = useRef(
    createPersistQueue<{ uid: string; data: PlayerData }>(async ({ uid, data: payload }) => {
      try {
        const docRef = doc(db, 'users', uid, 'data', 'player');
        await setDoc(docRef, payload, { merge: true });
      } catch (e) {
        if (__DEV__) console.warn('Failed to sync player data to Firestore:', e);
        throw e; // let queue log; next enqueue will retry with fresh data
      }
    }, 'player-firestore'),
  );
  const latestDataRef = useRef<PlayerData>(DEFAULT_PLAYER_DATA);
  const isInitialLoadDone = useRef(false);

  // Zustand store mirror — see src/stores/playerStore.ts. Every consumer that
  // calls usePlayerStore(selector) re-renders only when that slice changes.
  // Backwards-compat: usePlayer() still returns the full context value.
  const storeRef = useRef<PlayerStore | null>(null);
  if (!storeRef.current) storeRef.current = createPlayerStore(DEFAULT_PLAYER_DATA);

  // ── Persistence ─────────────────────────────────────────────────────────

  // Step 1: Load from AsyncStorage
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<PlayerData>;
          setData((prev) => ({ ...prev, ...parsed } as PlayerData));
        }
      } catch (e) {
        if (__DEV__) console.warn('Failed to load player data from AsyncStorage:', e);
      }
      setLoaded(true);
    };
    load();
  }, []);

  // Step 2: Once AsyncStorage is loaded AND user is available, try Firestore
  useEffect(() => {
    if (!loaded || !user || isInitialLoadDone.current) return;
    isInitialLoadDone.current = true;

    const syncFromFirestore = async () => {
      setCloudSyncStatus('syncing');
      try {
        const docRef = doc(db, 'users', user.uid, 'data', 'player');
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const cloudData = snapshot.data() as Partial<PlayerData>;
          setData((prev) => {
            // Use whichever data is more recent
            const localModified = prev.lastModified || 0;
            const cloudModified = cloudData.lastModified || 0;
            if (cloudModified > localModified) {
              return { ...DEFAULT_PLAYER_DATA, ...cloudData } as PlayerData;
            }
            return prev;
          });
        }
        setCloudSyncStatus('synced');
      } catch (e) {
        if (__DEV__) console.warn('Firestore player sync failed, using local data:', e);
        setCloudSyncStatus('offline');
      }
    };

    syncFromFirestore();
  }, [loaded, user]);

  // Step 3: Debounced persist to AsyncStorage (300ms) + Firestore (5s).
  //
  // A single winning puzzle fires 15+ setData calls in quick succession via
  // useRewardWiring. The previous implementation wrote to AsyncStorage on
  // every effect run, stringify-ing the full ~50-field player blob each time.
  // Trace showed ~130ms stalls on the post-win commit, entirely attributable
  // to these synchronous stringify + write passes.
  //
  // The debounce coalesces rapid bursts to a single write. Background/unmount
  // paths flush synchronously below so we never lose data.
  useEffect(() => {
    if (!loaded) return;

    // Always stamp lastModified and capture the latest snapshot so the
    // debounced writer and the AppState flush both see the same payload.
    const now = Date.now();
    const dataWithTimestamp: PlayerData = { ...data, lastModified: now };
    latestDataRef.current = dataWithTimestamp;

    // Debounced AsyncStorage write (300ms) routed through the persist queue.
    if (localPersistTimer.current) clearTimeout(localPersistTimer.current);
    localPersistTimer.current = setTimeout(() => {
      localPersistQueueRef.current.enqueue(latestDataRef.current);
    }, 300);

    // Debounced Firestore save (5 seconds) via the per-user queue.
    if (user) {
      if (firestoreSaveTimer.current) {
        clearTimeout(firestoreSaveTimer.current);
      }
      firestoreSaveTimer.current = setTimeout(() => {
        setCloudSyncStatus('syncing');
        firestorePersistQueueRef.current.enqueue({
          uid: user.uid,
          data: latestDataRef.current,
        });
        // Optimistic — the queue drains asynchronously. Sync status flips
        // back to synced/error when the writer settles (see onSettle below).
        setCloudSyncStatus('synced');
      }, 5000);
    }

    return () => {
      // Do NOT clear localPersistTimer here — it's intentionally persistent
      // across effect reruns so rapid bursts coalesce. The AppState flush
      // effect below handles crash-safety.
      if (firestoreSaveTimer.current) {
        clearTimeout(firestoreSaveTimer.current);
      }
    };
  }, [data, loaded, user]);

  // Crash-safety: on backgrounding or unmount, flush any pending debounced
  // write synchronously. Without this, the debounce window could swallow a
  // write if the user backgrounds the app within 300ms of a state change.
  useEffect(() => {
    if (!loaded) return;

    const flushPendingPersist = () => {
      if (localPersistTimer.current) {
        clearTimeout(localPersistTimer.current);
        localPersistTimer.current = null;
        // Route the final payload through the queue so it serializes
        // with any in-flight write instead of interleaving.
        void localPersistQueueRef.current.flush(latestDataRef.current);
      }
    };

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        flushPendingPersist();
      }
    });

    return () => {
      subscription.remove();
      // Also flush on provider unmount.
      flushPendingPersist();
    };
  }, [loaded]);

  // Reconcile unlock state with current level (helps old saves / balance updates).
  useEffect(() => {
    if (!loaded) return;

    setData((prev) => {
      const levelUnlockedModes = Object.values(MODE_CONFIGS)
        .filter((mode) => mode.unlockLevel <= prev.currentLevel)
        .map((mode) => mode.id);

      const mergedModes = Array.from(new Set([...prev.unlockedModes, ...levelUnlockedModes]));
      if (mergedModes.length === prev.unlockedModes.length) return prev;

      const mergedStats = { ...prev.modeStats };
      for (const modeId of mergedModes) {
        if (!mergedStats[modeId]) {
          mergedStats[modeId] = { played: 0, bestScore: 0, wins: 0 };
        }
      }

      return {
        ...prev,
        unlockedModes: mergedModes,
        modeStats: mergedStats,
      };
    });
  }, [loaded, data.currentLevel]);

  // NOTE: Segment recomputation useEffect moved below recomputeSegments definition to fix TS2448

  // Generate referral code on first load if not already set, and mirror the
  // code→uid mapping into Firestore so the onReferralSuccess Cloud Function
  // can resolve inbound codes back to this user.
  useEffect(() => {
    if (!loaded || !user) return;
    let nextCode: string | null = null;
    setData((prev) => {
      if (prev.referralCode) {
        nextCode = prev.referralCode;
        return prev;
      }
      nextCode = generateReferralCode(user.uid);
      return { ...prev, referralCode: nextCode };
    });
    if (nextCode) {
      firestoreService
        .upsertReferralCode(user.uid, nextCode)
        .catch(() => undefined);
    }
  }, [loaded, user]);

  // ── Mirror state into the zustand store ───────────────────────────────────
  // The store is the subscription surface for usePlayerStore(selector). The
  // useState above remains the write source of truth so the debounce and
  // reconciliation effects below are unchanged.
  useEffect(() => {
    storeRef.current!.setState(data, true);
  }, [data]);

  // ── Data accessor ref (for factory functions that need current data) ──
  const dataRef = useRef(data);
  dataRef.current = data;
  const getData = useCallback(() => dataRef.current, []);

  // ── Progress methods (extracted to PlayerProgressContext) ──────────────
  const progressMethods = useMemo(
    () => createProgressMethods(setData as any, getData as any),
    [getData],
  );
  const {
    recordPuzzleComplete,
    recordDailyComplete,
    updateStreak,
    useGraceDay,
    useStreakShield,
    updateMissionProgress,
    claimMissionReward,
    generateDailyMissions,
    unlockFeature,
    checkFeatureUnlocks,
    markTooltipShown,
    completeOnboardingMilestone,
    initWeeklyGoals,
    updateWeeklyGoalProgress,
    queueCeremony,
    popCeremony,
    recordFailure,
    needsBreather,
    checkAchievements,
    completeAchievement,
    checkComebackRewards,
    recordPerformanceMetrics,
  } = progressMethods;

  // ── Social methods (extracted to PlayerSocialContext) ──────────────────
  const socialMethods = useMemo(
    () => createSocialMethods(setData as any, user, getData as any),
    [user, getData],
  );
  const {
    sendHintGift,
    sendTileGift,
    sendChallenge,
    respondToChallenge,
    notifyFriendActivity,
  } = socialMethods;

  // ── Progress (remaining) ───────────────────────────────────────────────

  const updateProgress = useCallback((updates: Partial<PlayerData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // ── Collections ─────────────────────────────────────────────────────────

  const collectAtlasWord = useCallback((pageId: string, word: string) => {
    setData((prev) => {
      const existingWords = prev.collections.atlasPages[pageId] ?? [];
      if (existingWords.includes(word)) {
        // Duplicate: increment mastery counter (max 5 = gold border)
        const currentMastery = prev.collections.atlasWordMastery[word] ?? 1;
        if (currentMastery >= 5) return prev;
        const newMastery = currentMastery + 1;
        // Queue gold mastery ceremony when reaching 5
        let pendingCeremonies = prev.pendingCeremonies;
        if (newMastery === 5) {
          pendingCeremonies = [
            ...pendingCeremonies,
            { type: 'word_mastery_gold' as const, data: { word } },
          ];
        }
        return {
          ...prev,
          pendingCeremonies,
          collections: {
            ...prev.collections,
            atlasWordMastery: {
              ...prev.collections.atlasWordMastery,
              [word]: newMastery,
            },
          },
        };
      }
      return {
        ...prev,
        collections: {
          ...prev.collections,
          atlasPages: {
            ...prev.collections.atlasPages,
            [pageId]: [...existingWords, word],
          },
          atlasWordMastery: {
            ...prev.collections.atlasWordMastery,
            [word]: 1,
          },
        },
      };
    });
  }, []);

  const addRareTile = useCallback((letter: string, count: number = 1) => {
    setData((prev) => {
      const newCount = (prev.collections.rareTiles[letter] ?? 0) + count;
      // Check if any tile just crossed the wildcard threshold (5 dupes)
      let pendingCeremonies = prev.pendingCeremonies;
      const oldCount = prev.collections.rareTiles[letter] ?? 0;
      if (oldCount < COLLECTION.duplicatesForWildcard && newCount >= COLLECTION.duplicatesForWildcard) {
        pendingCeremonies = [
          ...pendingCeremonies,
          { type: 'wildcard_earned' as const, data: { letter } },
        ];
      }
      return {
        ...prev,
        pendingCeremonies,
        collections: {
          ...prev.collections,
          rareTiles: {
            ...prev.collections.rareTiles,
            [letter]: newCount,
          },
        },
      };
    });
  }, []);

  const collectStamp = useCallback((albumId: string, stampIndex: number) => {
    setData((prev) => {
      const existingStamps = prev.collections.seasonalStamps[albumId] ?? [];
      if (existingStamps.includes(stampIndex)) return prev;
      return {
        ...prev,
        collections: {
          ...prev.collections,
          seasonalStamps: {
            ...prev.collections.seasonalStamps,
            [albumId]: [...existingStamps, stampIndex],
          },
        },
      };
    });
  }, []);

  // ── Missions (extracted to PlayerProgressContext) ────────────────────────

  // ── Streaks (extracted to PlayerProgressContext) ─────────────────────────

  // ── Cosmetics ───────────────────────────────────────────────────────────

  const equipCosmetic = useCallback(
    (type: 'theme' | 'frame' | 'title', id: string) => {
      setData((prev) => {
        if (type === 'title') {
          const titleId = resolveTitleId(id);
          if (!titleId) return prev;
          if (!prev.unlockedCosmetics.includes(titleId) && titleId !== 'title_newcomer') return prev;
          return { ...prev, equippedTitle: titleId };
        }
        const resolvedId = resolveLegacyCosmeticId(id);
        if (!prev.unlockedCosmetics.includes(resolvedId) && resolvedId !== 'default') return prev;
        switch (type) {
          case 'theme':
            return { ...prev, equippedTheme: resolvedId };
          case 'frame':
            return { ...prev, equippedFrame: resolvedId };
          default:
            return prev;
        }
      });
    },
    [],
  );

  const unlockCosmetic = useCallback((id: string) => {
    setData((prev) => {
      const resolvedId = resolveLegacyCosmeticId(id);
      if (!isProfileCosmeticId(resolvedId)) return prev;
      if (prev.unlockedCosmetics.includes(resolvedId)) return prev;
      return {
        ...prev,
        unlockedCosmetics: [...prev.unlockedCosmetics, resolvedId],
      };
    });
  }, []);

  // ── Gifting (extracted to PlayerSocialContext) ──────────────────────────

  // ── Library ─────────────────────────────────────────────────────────────

  const restoreWing = useCallback((wingId: string) => {
    setData((prev) => {
      if (prev.restoredWings.includes(wingId)) return prev;
      return {
        ...prev,
        restoredWings: [...prev.restoredWings, wingId],
        pendingCeremonies: [
          ...prev.pendingCeremonies,
          { type: 'wing_complete' as const, data: { wingId, wingName: wingId } },
        ],
      };
    });
  }, []);

  /**
   * Check if a wing's chapters are all 3-starred and grant the wing completion bonus.
   * Awards 1000 coins + 25 gems + queues wing_complete ceremony.
   */
  const checkWingCompletion = useCallback((wingId: string) => {
    setData((prev) => {
      if (prev.completedWingBonuses.includes(wingId)) return prev;

      // Check if all chapters in this wing have 3 stars
      const wingChapters = CHAPTERS.filter(ch => ch.wingId === wingId);
      if (wingChapters.length === 0) return prev;

      let cumulativeLevel = 0;
      for (const ch of CHAPTERS) {
        if (ch.wingId === wingId) {
          // Check all puzzles in this chapter have 3 stars
          for (let i = 1; i <= ch.puzzleCount; i++) {
            const levelNum = cumulativeLevel + i;
            if ((prev.starsByLevel[levelNum] ?? 0) < 3) return prev;
          }
        }
        cumulativeLevel += ch.puzzleCount;
      }

      // All chapters in wing are 3-starred! Grant bonus.
      return {
        ...prev,
        completedWingBonuses: [...prev.completedWingBonuses, wingId],
        pendingCeremonies: [
          ...prev.pendingCeremonies,
          {
            type: 'wing_complete' as const,
            data: {
              wingId,
              wingName: wingId.charAt(0).toUpperCase() + wingId.slice(1),
              bonusCoins: 1000,
              bonusGems: 25,
            },
          },
        ],
      };
    });
  }, []);

  const placeDecoration = useCallback(
    (slotId: string, decorationId: string) => {
      setData((prev) => ({
        ...prev,
        placedDecorations: {
          ...prev.placedDecorations,
          [slotId]: decorationId,
        },
      }));
    },
    [],
  );

  const unlockDecoration = useCallback((decorationId: string) => {
    setData((prev) => {
      if (prev.ownedDecorations.includes(decorationId)) return prev;
      return {
        ...prev,
        ownedDecorations: [...prev.ownedDecorations, decorationId],
      };
    });
  }, []);

  // ── Modes ───────────────────────────────────────────────────────────────

  const unlockMode = useCallback((modeId: string) => {
    setData((prev) => {
      if (prev.unlockedModes.includes(modeId)) return prev;
      return {
        ...prev,
        unlockedModes: [...prev.unlockedModes, modeId],
        modeStats: {
          ...prev.modeStats,
          [modeId]: { played: 0, bestScore: 0, wins: 0 },
        },
      };
    });
  }, []);

  const recordModePlay = useCallback(
    (modeId: string, score: number, isWin: boolean) => {
      setData((prev) => {
        const existing = prev.modeStats[modeId] ?? {
          played: 0,
          bestScore: 0,
          wins: 0,
        };
        return {
          ...prev,
          modeStats: {
            ...prev.modeStats,
            [modeId]: {
              played: existing.played + 1,
              bestScore: Math.max(existing.bestScore, score),
              wins: isWin ? existing.wins + 1 : existing.wins,
            },
          },
          lastActiveDate: getToday(),
        };
      });
    },
    [],
  );

  const advanceModeLevel = useCallback((modeId: string) => {
    setData((prev) => {
      const currentModeLevel = prev.modeLevels[modeId] ?? 1;
      return {
        ...prev,
        modeLevels: {
          ...prev.modeLevels,
          [modeId]: currentModeLevel + 1,
        },
      };
    });
  }, []);

  const getModeLevel = useCallback((modeId: string): number => {
    return dataRef.current.modeLevels[modeId] ?? 1;
  }, []);

  // ── Achievements, Feature Unlocks, Tooltips, Weekly Goals, Ceremonies,
  //    Difficulty Pacing, Achievement Checking, Comebacks
  //    (all extracted to PlayerProgressContext) ────────────────────────────

  // ── Mystery Wheel ──────────────────────────────────────────────────────

  const updateMysteryWheel = useCallback((updates: Partial<PlayerData['mysteryWheel']>) => {
    setData((prev) => ({
      ...prev,
      mysteryWheel: { ...prev.mysteryWheel, ...updates },
    }));
  }, []);

  const awardFreeSpin = useCallback(() => {
    setData((prev) => {
      const newPuzzleCount = prev.mysteryWheel.puzzlesSinceLastSpin + 1;
      if (newPuzzleCount >= prev.mysteryWheel.puzzlesPerFreeSpin) {
        return {
          ...prev,
          mysteryWheel: {
            ...prev.mysteryWheel,
            spinsAvailable: prev.mysteryWheel.spinsAvailable + 1,
            puzzlesSinceLastSpin: 0,
          },
        };
      }
      return {
        ...prev,
        mysteryWheel: {
          ...prev.mysteryWheel,
          puzzlesSinceLastSpin: newPuzzleCount,
        },
      };
    });
  }, []);

  // ── Win Streak ────────────────────────────────────────────────────────

  const updateWinStreak = useCallback((won: boolean) => {
    setData((prev) => {
      if (!won) {
        return {
          ...prev,
          winStreak: { ...prev.winStreak, currentStreak: 0 },
        };
      }

      const newStreak = prev.winStreak.currentStreak + 1;
      const newBest = Math.max(newStreak, prev.winStreak.bestStreak);
      const today = new Date().toISOString().split('T')[0];

      // Check win streak milestones (3, 5, 7, 10, 15, 20)
      const winStreakMilestones = [3, 5, 7, 10, 15, 20];
      let pendingCeremonies = prev.pendingCeremonies;
      for (const milestone of winStreakMilestones) {
        if (newStreak >= milestone && prev.winStreak.currentStreak < milestone) {
          const labels: Record<number, string> = {
            3: 'Hat Trick!', 5: 'On Fire!', 7: 'Unstoppable!',
            10: 'LEGENDARY!', 15: 'GODLIKE!', 20: 'IMPOSSIBLE!',
          };
          pendingCeremonies = [
            ...pendingCeremonies,
            {
              type: 'win_streak_milestone' as const,
              data: { streak: milestone, label: labels[milestone] || `${milestone} Wins!` },
            },
          ];
        }
      }

      return {
        ...prev,
        pendingCeremonies,
        winStreak: {
          currentStreak: newStreak,
          bestStreak: newBest,
          lastWinDate: today,
          rewardsClaimed: prev.winStreak.rewardsClaimed,
        },
      };
    });
  }, []);

  // ── Flawless Streak ───────────────────────────────────────────────────
  // Cross-session counter of consecutive flawless puzzles (no hints, no undos,
  // no shuffle, no wrong-trace). Mirrors updateWinStreak but only counts
  // distinct calendar days so same-day replays don't inflate the streak.
  // Milestones (3/5/7/10/15/20) queue a `flawless_streak_milestone` ceremony.

  const updateFlawlessStreak = useCallback((wasFlawless: boolean) => {
    setData((prev) => {
      if (!wasFlawless) {
        if (prev.flawlessStreak.currentStreak > 0) {
          void analytics.logEvent('flawless_streak_broken', {
            streakLost: prev.flawlessStreak.currentStreak,
            bestStreak: prev.flawlessStreak.bestStreak,
          });
        }
        return {
          ...prev,
          flawlessStreak: {
            ...prev.flawlessStreak,
            currentStreak: 0,
            lastFlawlessDate: null,
          },
        };
      }

      const today = new Date().toISOString().split('T')[0];
      if (prev.flawlessStreak.lastFlawlessDate === today) {
        // Same-day replay — don't re-credit the streak.
        return prev;
      }

      const newStreak = prev.flawlessStreak.currentStreak + 1;
      const newBest = Math.max(newStreak, prev.flawlessStreak.bestStreak);

      const milestones = [3, 5, 7, 10, 15, 20];
      let pendingCeremonies = prev.pendingCeremonies;
      let rewardsClaimed = prev.flawlessStreak.rewardsClaimed;
      for (const milestone of milestones) {
        if (newStreak >= milestone && !rewardsClaimed.includes(milestone)) {
          const labels: Record<number, string> = {
            3: 'Flawless Trio', 5: 'Immaculate', 7: 'Pristine',
            10: 'Masterclass', 15: 'Virtuoso', 20: 'Untouchable',
          };
          pendingCeremonies = [
            ...pendingCeremonies,
            {
              type: 'flawless_streak_milestone' as const,
              data: { streak: milestone, label: labels[milestone] || `${milestone} Flawless!` },
            },
          ];
          rewardsClaimed = [...rewardsClaimed, milestone];
          void analytics.logEvent('flawless_streak_milestone', {
            milestone,
            streak: newStreak,
          });
        }
      }

      return {
        ...prev,
        pendingCeremonies,
        flawlessStreak: {
          currentStreak: newStreak,
          bestStreak: newBest,
          lastFlawlessDate: today,
          rewardsClaimed,
        },
      };
    });
  }, []);

  // ── Event Progress ────────────────────────────────────────────────────

  const updateEventProgressCb = useCallback((eventId: string, progress: number, claimedTiers?: string[]) => {
    setData((prev) => {
      const existing = prev.eventProgress[eventId] || { progress: 0, claimedTiers: [], startedAt: Date.now() };
      return {
        ...prev,
        eventProgress: {
          ...prev.eventProgress,
          [eventId]: {
            progress: existing.progress + progress,
            claimedTiers: claimedTiers ? [...new Set([...existing.claimedTiers, ...claimedTiers])] : existing.claimedTiers,
            startedAt: existing.startedAt,
          },
        },
      };
    });
  }, []);

  // ── Referral ──────────────────────────────────────────────────────────

  const applyReferralCode = useCallback((code: string): boolean => {
    // Prevent self-referral and double-referral
    let applied = false;
    setData((prev) => {
      if (prev.referredBy !== null) return prev; // already referred
      if (prev.referralCode === code) return prev; // self-referral
      applied = true;
      return {
        ...prev,
        referredBy: code,
      };
    });
    if (applied) {
      analytics.logEvent('referral_code_applied', { code });
    }
    return applied;
  }, []);

  const recordReferralSuccess = useCallback(async (): Promise<boolean> => {
    const current = dataRef.current;
    const code = current.referredBy;
    if (!code) return false;
    if (current.referralRewardGranted) return false;

    try {
      const result = await recordReferralSuccessSecure(code);
      setData((prev) => ({
        ...prev,
        referralRewardGranted: true,
        // Keep the local referralCount bump for back-compat with legacy
        // milestone UI; the server-side source of truth is the inbox docs
        // written to the referrer.
        referralCount: prev.referralCount + (result.alreadyGranted ? 0 : 1),
      }));
      analytics.logEvent('referral_success_grant', {
        already_granted: result.alreadyGranted,
        referrer_uid: result.referrerUid,
        gems_referred: result.grantedGemsReferred,
      });
      return !result.alreadyGranted;
    } catch (err) {
      // Network or permission error — leave referralRewardGranted false so
      // the next first-puzzle-complete retry can attempt again. Server-side
      // dedup doc guarantees at-most-once grant regardless of retries.
      analytics.logEvent('referral_success_grant', {
        already_granted: false,
        referrer_uid: 'error',
        gems_referred: 0,
      });
      return false;
    }
  }, []);

  const claimReferralMilestone = useCallback((count: number): boolean => {
    let claimed = false;
    setData((prev) => {
      if (prev.referralMilestonesClaimed.includes(count)) return prev;
      if (prev.referralCount < count) return prev;
      const milestone = REFERRAL_MILESTONES.find((entry) => entry.count === count);
      const rewards = milestone?.rewards;
      const unlockedCosmetics =
        rewards?.cosmeticId && isProfileCosmeticId(rewards.cosmeticId)
          ? Array.from(new Set([...prev.unlockedCosmetics, resolveLegacyCosmeticId(rewards.cosmeticId)]))
          : prev.unlockedCosmetics;
      claimed = true;
      return {
        ...prev,
        unlockedCosmetics,
        referralMilestonesClaimed: [...prev.referralMilestonesClaimed, count],
      };
    });
    return claimed;
  }, []);

  // ── Seasonal Quest ────────────────────────────────────────────────────

  const updateSeasonalQuest = useCallback((updates: Partial<SeasonalQuestState>) => {
    setData((prev) => ({
      ...prev,
      seasonalQuest: { ...prev.seasonalQuest, ...updates },
    }));
  }, []);

  // ── Prestige ───────────────────────────────────────────────────────────

  const performPrestige = useCallback((): boolean => {
    let success = false;
    setData((prev) => {
      const currentPrestige = prev.prestige ?? DEFAULT_PRESTIGE_STATE;
      if (!canPrestige(prev.currentLevel, currentPrestige.prestigeLevel)) return prev;

      const newPrestigeLevel = currentPrestige.prestigeLevel + 1;
      const rewards = getPrestigeRewards(newPrestigeLevel);
      if (!rewards) return prev;

      // Accumulate permanent bonus IDs
      const newBonusIds = [
        ...currentPrestige.permanentBonuses,
        ...rewards.permanentBonuses.map((b) => `${b.type}_${b.value}`),
      ];

      // Unlock the cosmetic reward
      const cosmeticId = rewards.cosmeticReward.id;
      const unlocksProfileCosmetic = isProfileCosmeticId(cosmeticId);
      const newUnlockedCosmetics =
        unlocksProfileCosmetic && !prev.unlockedCosmetics.includes(cosmeticId)
          ? [...prev.unlockedCosmetics, cosmeticId]
          : prev.unlockedCosmetics;
      const newOwnedDecorations =
        rewards.cosmeticReward.type === 'decoration' && hasDecoration(cosmeticId) && !prev.ownedDecorations.includes(cosmeticId)
          ? [...prev.ownedDecorations, cosmeticId]
          : prev.ownedDecorations;

      // Queue prestige ceremony
      const ceremony: CeremonyItem = {
        type: 'prestige',
        data: { level: newPrestigeLevel, label: rewards.label, icon: rewards.icon },
      };

      success = true;
      return {
        ...prev,
        // Reset progress
        currentLevel: 1,
        highestLevel: 1,
        starsByLevel: {},
        totalStars: 0,
        currentChapter: 1,
        modeLevels: {},
        // Update prestige state
        prestige: {
          prestigeLevel: newPrestigeLevel,
          totalPrestiges: currentPrestige.totalPrestiges + 1,
          lastPrestigedAt: Date.now(),
          permanentBonuses: newBonusIds,
        },
        // Unlock cosmetic reward
        unlockedCosmetics: newUnlockedCosmetics,
        ownedDecorations: newOwnedDecorations,
        // Queue ceremony
        pendingCeremonies: [...prev.pendingCeremonies, ceremony],
      };
    });
    return success;
  }, []);

  const getPrestigeInfo = useCallback(() => {
    const current = dataRef.current;
    const state = current.prestige ?? DEFAULT_PRESTIGE_STATE;
    const canDo = canPrestige(current.currentLevel, state.prestigeLevel);
    const nextRewards = getPrestigeRewards(state.prestigeLevel + 1);
    return { state, canPrestige: canDo, nextRewards };
  }, []);

  // ── Puzzle Energy ──────────────────────────────────────────────────────

  /**
   * Compute the current energy after regeneration since last regen time,
   * and daily reset if the date has changed.
   */
  const computeCurrentEnergy = useCallback((energyState: PuzzleEnergyState): PuzzleEnergyState => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    let state = { ...energyState };

    // Daily reset: refill to max and reset bonus plays at midnight
    if (state.lastResetDate !== today) {
      state = {
        current: ENERGY.MAX,
        lastRegenTime: now.toISOString(),
        lastResetDate: today,
        bonusPlaysUsed: 0,
      };
      return state;
    }

    // Compute regenerated energy since last regen
    if (state.current < ENERGY.MAX) {
      const lastRegen = new Date(state.lastRegenTime).getTime();
      const elapsed = now.getTime() - lastRegen;
      const regenMs = ENERGY.REGEN_MINUTES * 60 * 1000;
      const energyGained = Math.floor(elapsed / regenMs);

      if (energyGained > 0) {
        const newCurrent = Math.min(state.current + energyGained, ENERGY.MAX);
        const consumedTime = energyGained * regenMs;
        state = {
          ...state,
          current: newCurrent,
          lastRegenTime: newCurrent >= ENERGY.MAX
            ? now.toISOString()
            : new Date(lastRegen + consumedTime).toISOString(),
        };
      }
    }

    return state;
  }, []);

  const useEnergy = useCallback((mode: string): boolean => {
    // Free modes cost 0 energy
    if (ENERGY.FREE_MODES.includes(mode)) return true;

    let success = false;
    setData((prev) => {
      const energyNow = computeCurrentEnergy(prev.puzzleEnergy);

      // Has energy — spend it
      if (energyNow.current > 0) {
        success = true;
        const newCurrent = energyNow.current - 1;
        // Schedule a notification for when energy will be full again
        void triggerEnergyFullNotification(newCurrent, ENERGY.MAX);
        return {
          ...prev,
          puzzleEnergy: {
            ...energyNow,
            current: newCurrent,
            lastRegenTime: energyNow.current >= ENERGY.MAX
              ? new Date().toISOString()
              : energyNow.lastRegenTime,
          },
        };
      }

      // Out of energy — allow bonus plays (soft wall, NOT hard gate)
      if (energyNow.bonusPlaysUsed < ENERGY.BONUS_PLAYS_AFTER_ZERO) {
        success = true;
        return {
          ...prev,
          puzzleEnergy: {
            ...energyNow,
            bonusPlaysUsed: energyNow.bonusPlaysUsed + 1,
          },
        };
      }

      // Truly gated — no energy and no bonus plays left
      return { ...prev, puzzleEnergy: energyNow };
    });
    return success;
  }, [computeCurrentEnergy]);

  const refillEnergy = useCallback((method: 'ad' | 'gems'): boolean => {
    let success = false;
    setData((prev) => {
      const energyNow = computeCurrentEnergy(prev.puzzleEnergy);

      if (method === 'ad') {
        // Ad gives +5 energy (capped at max)
        success = true;
        return {
          ...prev,
          puzzleEnergy: {
            ...energyNow,
            current: Math.min(energyNow.current + ENERGY.AD_REFILL_AMOUNT, ENERGY.MAX),
          },
        };
      }

      // Gem refill — full refill for ENERGY.GEM_REFILL_COST gems
      // Note: gem spending is handled by the caller (EconomyContext)
      success = true;
      return {
        ...prev,
        puzzleEnergy: {
          ...energyNow,
          current: ENERGY.MAX,
          bonusPlaysUsed: 0,
          lastRegenTime: new Date().toISOString(),
        },
      };
    });
    return success;
  }, [computeCurrentEnergy]);

  const getTimeUntilNextEnergy = useCallback((): number => {
    const energyNow = computeCurrentEnergy(dataRef.current.puzzleEnergy);
    if (energyNow.current >= ENERGY.MAX) return 0;

    const lastRegen = new Date(energyNow.lastRegenTime).getTime();
    const regenMs = ENERGY.REGEN_MINUTES * 60 * 1000;
    const elapsed = Date.now() - lastRegen;
    const remaining = regenMs - (elapsed % regenMs);
    return Math.max(0, remaining);
  }, [computeCurrentEnergy]);

  const getEnergyDisplay = useCallback(() => {
    const energyNow = computeCurrentEnergy(dataRef.current.puzzleEnergy);
    const bonusPlaysLeft = ENERGY.BONUS_PLAYS_AFTER_ZERO - energyNow.bonusPlaysUsed;
    return {
      current: energyNow.current,
      max: ENERGY.MAX,
      bonusPlaysLeft: Math.max(0, bonusPlaysLeft),
      isBonusMode: energyNow.current <= 0 && energyNow.bonusPlaysUsed > 0,
    };
  }, [computeCurrentEnergy]);

  // ── Adaptive Difficulty + Friend Challenges (extracted to PlayerProgressContext / PlayerSocialContext) ──

  // ── Player Segmentation ───────────────────────────────────────────────

  const recomputeSegments = useCallback((totalSpendCents: number = 0, sharesCount: number = 0) => {
    setData((prev) => {
      const rareTilesCount = Object.values(prev.collections.rareTiles)
        .reduce((sum, c) => sum + c, 0);
      const input: SegmentationInput = {
        puzzlesSolved: prev.puzzlesSolved,
        currentLevel: prev.currentLevel,
        highestLevel: prev.highestLevel,
        totalStars: prev.totalStars,
        starsByLevel: prev.starsByLevel,
        perfectSolves: prev.perfectSolves,
        dailyLoginDates: prev.dailyLoginDates,
        lastActiveDate: prev.lastActiveDate,
        dailyCompleted: prev.dailyCompleted,
        atlasPages: prev.collections.atlasPages,
        rareTilesCount,
        restoredWings: prev.restoredWings,
        clubId: prev.clubId,
        friendIds: prev.friendIds,
        hintGiftsSentToday: prev.hintGiftsSentToday,
        tileGiftsSentToday: prev.tileGiftsSentToday,
        unlockedModes: prev.unlockedModes,
        modeStats: prev.modeStats,
        achievementIds: prev.achievementIds,
        tooltipsShown: prev.tooltipsShown,
        totalSpendCents,
        wordsFoundTotal: prev.wordsFoundTotal,
        modesPlayedThisWeek: prev.modesPlayedThisWeek,
        sharesCount,
      };
      const segments = computeSegments(input);
      return { ...prev, segments };
    });
  }, []);

  // Recompute player segments on app open (when data finishes loading)
  // (moved here from above to avoid TS2448: block-scoped variable used before declaration)
  useEffect(() => {
    if (!loaded) return;
    recomputeSegments();
  }, [loaded, recomputeSegments]);

  // ── Render ──────────────────────────────────────────────────────────────

  const value = useMemo(
    () => ({
      ...data,
      loaded,
      cloudSyncStatus,
      updateProgress,
      recordPuzzleComplete,
      recordDailyComplete,
      collectAtlasWord,
      addRareTile,
      collectStamp,
      updateMissionProgress,
      claimMissionReward,
      generateDailyMissions,
      updateStreak,
      useGraceDay,
      useStreakShield,
      equipCosmetic,
      unlockCosmetic,
      restoreWing,
      placeDecoration,
      unlockDecoration,
      unlockMode,
      recordModePlay,
      advanceModeLevel,
      getModeLevel,
      completeAchievement,
      checkComebackRewards,
      unlockFeature,
      checkFeatureUnlocks,
      markTooltipShown,
      completeOnboardingMilestone,
      initWeeklyGoals,
      updateWeeklyGoalProgress,
      queueCeremony,
      popCeremony,
      recordFailure,
      needsBreather,
      checkAchievements,
      sendHintGift,
      sendTileGift,
      updateMysteryWheel,
      awardFreeSpin,
      updateWinStreak,
      updateFlawlessStreak,
      useEnergy,
      refillEnergy,
      getTimeUntilNextEnergy,
      getEnergyDisplay,
      recordPerformanceMetrics,
      sendChallenge,
      respondToChallenge,
      recomputeSegments,
      updateEventProgress: updateEventProgressCb,
      applyReferralCode,
      recordReferralSuccess,
      claimReferralMilestone,
      updateSeasonalQuest,
      notifyFriendActivity,
      performPrestige,
      getPrestigeInfo,
    }),
    [
      data,
      loaded,
      cloudSyncStatus,
      updateProgress,
      recordPuzzleComplete,
      recordDailyComplete,
      collectAtlasWord,
      addRareTile,
      collectStamp,
      updateMissionProgress,
      claimMissionReward,
      generateDailyMissions,
      updateStreak,
      useGraceDay,
      useStreakShield,
      equipCosmetic,
      unlockCosmetic,
      restoreWing,
      placeDecoration,
      unlockDecoration,
      unlockMode,
      recordModePlay,
      advanceModeLevel,
      getModeLevel,
      completeAchievement,
      checkComebackRewards,
      unlockFeature,
      checkFeatureUnlocks,
      markTooltipShown,
      completeOnboardingMilestone,
      initWeeklyGoals,
      updateWeeklyGoalProgress,
      queueCeremony,
      popCeremony,
      recordFailure,
      needsBreather,
      checkAchievements,
      sendHintGift,
      sendTileGift,
      updateMysteryWheel,
      awardFreeSpin,
      updateWinStreak,
      updateFlawlessStreak,
      useEnergy,
      refillEnergy,
      getTimeUntilNextEnergy,
      getEnergyDisplay,
      recordPerformanceMetrics,
      sendChallenge,
      respondToChallenge,
      recomputeSegments,
      updateEventProgressCb,
      applyReferralCode,
      recordReferralSuccess,
      claimReferralMilestone,
      updateSeasonalQuest,
      notifyFriendActivity,
      performPrestige,
      getPrestigeInfo,
    ],
  );

  // Actions bag for usePlayerActions(). Identity is stable as long as the
  // underlying useCallback deps don't churn — same dep set as `value` above
  // minus the raw `data` field.
  const actions = useMemo<PlayerActions>(
    () => ({
      loaded,
      cloudSyncStatus,
      updateProgress,
      recordPuzzleComplete,
      recordDailyComplete,
      collectAtlasWord,
      addRareTile,
      collectStamp,
      updateMissionProgress,
      claimMissionReward,
      generateDailyMissions,
      updateStreak,
      useGraceDay,
      useStreakShield,
      equipCosmetic,
      unlockCosmetic,
      restoreWing,
      placeDecoration,
      unlockDecoration,
      unlockMode,
      recordModePlay,
      advanceModeLevel,
      getModeLevel,
      completeAchievement,
      checkComebackRewards,
      unlockFeature,
      checkFeatureUnlocks,
      markTooltipShown,
      completeOnboardingMilestone,
      initWeeklyGoals,
      updateWeeklyGoalProgress,
      queueCeremony,
      popCeremony,
      recordFailure,
      needsBreather,
      checkAchievements,
      sendHintGift,
      sendTileGift,
      updateMysteryWheel,
      awardFreeSpin,
      updateWinStreak,
      updateFlawlessStreak,
      useEnergy,
      refillEnergy,
      getTimeUntilNextEnergy,
      getEnergyDisplay,
      recordPerformanceMetrics,
      sendChallenge,
      respondToChallenge,
      recomputeSegments,
      updateEventProgress: updateEventProgressCb,
      applyReferralCode,
      recordReferralSuccess,
      claimReferralMilestone,
      updateSeasonalQuest,
      notifyFriendActivity,
      performPrestige,
      getPrestigeInfo,
    }),
    [
      loaded,
      cloudSyncStatus,
      updateProgress,
      recordPuzzleComplete,
      recordDailyComplete,
      collectAtlasWord,
      addRareTile,
      collectStamp,
      updateMissionProgress,
      claimMissionReward,
      generateDailyMissions,
      updateStreak,
      useGraceDay,
      useStreakShield,
      equipCosmetic,
      unlockCosmetic,
      restoreWing,
      placeDecoration,
      unlockDecoration,
      unlockMode,
      recordModePlay,
      advanceModeLevel,
      getModeLevel,
      completeAchievement,
      checkComebackRewards,
      unlockFeature,
      checkFeatureUnlocks,
      markTooltipShown,
      completeOnboardingMilestone,
      initWeeklyGoals,
      updateWeeklyGoalProgress,
      queueCeremony,
      popCeremony,
      recordFailure,
      needsBreather,
      checkAchievements,
      sendHintGift,
      sendTileGift,
      updateMysteryWheel,
      awardFreeSpin,
      updateWinStreak,
      updateFlawlessStreak,
      useEnergy,
      refillEnergy,
      getTimeUntilNextEnergy,
      getEnergyDisplay,
      recordPerformanceMetrics,
      sendChallenge,
      respondToChallenge,
      recomputeSegments,
      updateEventProgressCb,
      applyReferralCode,
      recordReferralSuccess,
      claimReferralMilestone,
      updateSeasonalQuest,
      notifyFriendActivity,
      performPrestige,
      getPrestigeInfo,
    ],
  );

  return (
    <PlayerStoreContext.Provider value={storeRef.current}>
      <PlayerActionsContext.Provider value={actions}>
        <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
      </PlayerActionsContext.Provider>
    </PlayerStoreContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      sourceVal !== null &&
      sourceVal !== undefined &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === 'object' &&
      targetVal !== null &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      ) as T[keyof T];
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal as T[keyof T];
    }
  }
  return result;
}
