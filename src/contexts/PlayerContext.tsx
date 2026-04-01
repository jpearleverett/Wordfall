import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { CHAPTERS, getChapterForLevel } from '../data/chapters';
import { CeremonyItem, PlayerMetrics, PuzzleEnergyState, WeeklyGoalsState } from '../types';
import { generateWeeklyGoals, isNewWeek } from '../data/weeklyGoals';
import { ACHIEVEMENTS, getAchievementTier, getAchievementTierId } from '../data/achievements';
import { COLLECTION, ENERGY, FEATURE_UNLOCK_SCHEDULE, MODE_CONFIGS, STREAK } from '../constants';
import { DEFAULT_PLAYER_METRICS, updatePlayerMetrics } from '../engine/difficultyAdjuster';
import {
  PlayerSegments,
  DEFAULT_SEGMENTS,
  computeSegments,
  SegmentationInput,
} from '../services/playerSegmentation';
import { triggerEnergyFullNotification } from '../services/notificationTriggers';

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

interface PlayerData {
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

  // Modes
  unlockedModes: string[];
  modeStats: Record<string, ModeStats>;
  modeLevels: Record<string, number>;

  // Onboarding
  tutorialComplete: boolean;
  onboardingDay: number;
  featuresUnlocked: string[];

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
  };

  // Win Streak (per-session consecutive wins)
  winStreak: {
    currentStreak: number;
    bestStreak: number;
    lastWinDate: string | null;
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

  // Cloud sync
  lastModified: number;
}

type CloudSyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface PlayerContextType extends PlayerData {
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
  checkAchievements: (extraData?: { maxCombo?: number }) => CeremonyItem[];

  // Gifting
  sendHintGift: (friendId: string) => boolean;
  sendTileGift: (friendId: string, tileLetter: string) => boolean;

  // Mystery Wheel
  updateMysteryWheel: (updates: Partial<PlayerData['mysteryWheel']>) => void;
  awardFreeSpin: () => void;

  // Win Streak
  updateWinStreak: (won: boolean) => void;

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
  recordReferralSuccess: () => void;
  claimReferralMilestone: (count: number) => boolean;
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
  equippedTitle: 'Newcomer',
  unlockedCosmetics: ['default_theme', 'default_frame', 'title_newcomer'],

  // Library
  restoredWings: [],
  placedDecorations: {},

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
    puzzlesPerFreeSpin: 3,
    totalSpins: 0,
    lastJackpotSpin: 0,
    jackpotPity: 25,
  },

  // Win Streak
  winStreak: {
    currentStreak: 0,
    bestStreak: 0,
    lastWinDate: null,
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
  unlockMode: () => {},
  recordModePlay: () => {},
  advanceModeLevel: () => {},
  getModeLevel: () => 1,
  completeAchievement: () => {},
  checkComebackRewards: () => [],
  unlockFeature: () => {},
  checkFeatureUnlocks: () => [],
  markTooltipShown: () => {},
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
  useEnergy: () => false,
  refillEnergy: () => false,
  getTimeUntilNextEnergy: () => 0,
  getEnergyDisplay: () => ({ current: ENERGY.MAX, max: ENERGY.MAX, bonusPlaysLeft: ENERGY.BONUS_PLAYS_AFTER_ZERO, isBonusMode: false }),
  recordPerformanceMetrics: () => {},
  sendChallenge: () => ({ id: '', challengerId: '', challengerName: '', challengerScore: 0, challengerStars: 0, challengerTime: 0, level: 0, seed: 0, mode: 'classic' as const, boardConfig: { rows: 5, cols: 5, wordCount: 3, minWordLength: 3, maxWordLength: 5, difficulty: 'easy' as const }, createdAt: '', expiresAt: '', status: 'pending' as const }),
  respondToChallenge: () => {},
  recomputeSegments: () => {},
  updateEventProgress: () => {},
});

// ─── Provider ───────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<PlayerData>(DEFAULT_PLAYER_DATA);
  const [loaded, setLoaded] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('offline');
  const firestoreSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadDone = useRef(false);

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
        console.warn('Failed to load player data from AsyncStorage:', e);
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
        console.warn('Firestore player sync failed, using local data:', e);
        setCloudSyncStatus('offline');
      }
    };

    syncFromFirestore();
  }, [loaded, user]);

  // Step 3: Persist to AsyncStorage immediately on every change,
  //         and debounce Firestore saves to every 5 seconds
  useEffect(() => {
    if (!loaded) return;

    // Always stamp lastModified
    const now = Date.now();
    const dataWithTimestamp = { ...data, lastModified: now };

    // Save to AsyncStorage immediately
    const persistLocal = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithTimestamp));
      } catch (e) {
        console.warn('Failed to save player data to AsyncStorage:', e);
      }
    };
    persistLocal();

    // Debounced Firestore save (5 seconds)
    if (user) {
      if (firestoreSaveTimer.current) {
        clearTimeout(firestoreSaveTimer.current);
      }
      firestoreSaveTimer.current = setTimeout(async () => {
        setCloudSyncStatus('syncing');
        try {
          const docRef = doc(db, 'users', user.uid, 'data', 'player');
          await setDoc(docRef, dataWithTimestamp, { merge: true });
          setCloudSyncStatus('synced');
        } catch (e) {
          console.warn('Failed to sync player data to Firestore:', e);
          setCloudSyncStatus('error');
        }
      }, 5000);
    }

    return () => {
      if (firestoreSaveTimer.current) {
        clearTimeout(firestoreSaveTimer.current);
      }
    };
  }, [data, loaded, user]);

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

  // Recompute player segments on app open (when data finishes loading)
  useEffect(() => {
    if (!loaded) return;
    recomputeSegments();
  }, [loaded, recomputeSegments]);

  // ── Progress ────────────────────────────────────────────────────────────

  const updateProgress = useCallback((updates: Partial<PlayerData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const recordPuzzleComplete = useCallback(
    (level: number, score: number, stars: number, isPerfect: boolean) => {
      setData((prev) => {
        const existingStars = prev.starsByLevel[level] ?? 0;
        const newStarsByLevel = {
          ...prev.starsByLevel,
          [level]: Math.max(existingStars, stars),
        };
        const totalStars = Object.values(newStarsByLevel).reduce(
          (sum, s) => sum + s,
          0,
        );
        const highestCompletedLevel = Math.max(prev.highestLevel, level);
        const nextCurrentLevel = Math.max(prev.currentLevel, level + 1);
        const activeChapter = getChapterForLevel(nextCurrentLevel) ?? CHAPTERS[CHAPTERS.length - 1];
        const completedWingIds = Array.from(
          new Set(
            CHAPTERS.filter((chapter) => chapter.id < activeChapter.id).map((chapter) => chapter.wingId),
          ),
        );

        return {
          ...prev,
          totalScore: prev.totalScore + score,
          puzzlesSolved: prev.puzzlesSolved + 1,
          perfectSolves: isPerfect ? prev.perfectSolves + 1 : prev.perfectSolves,
          highestLevel: highestCompletedLevel,
          currentLevel: nextCurrentLevel,
          currentChapter: activeChapter.id,
          starsByLevel: newStarsByLevel,
          totalStars,
          restoredWings: Array.from(new Set([...prev.restoredWings, ...completedWingIds])),
          lastActiveDate: getToday(),
        };
      });
    },
    [],
  );

  const recordDailyComplete = useCallback((dateString: string) => {
    setData((prev) => {
      if (prev.dailyCompleted.includes(dateString)) return prev;
      return {
        ...prev,
        dailyCompleted: [...prev.dailyCompleted, dateString],
        lastActiveDate: getToday(),
      };
    });
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

  // ── Missions ────────────────────────────────────────────────────────────

  const updateMissionProgress = useCallback(
    (missionId: string, progress: number) => {
      setData((prev) => ({
        ...prev,
        missions: {
          ...prev.missions,
          dailyMissions: prev.missions.dailyMissions.map((m) =>
            m.id === missionId ? { ...m, progress: Math.max(m.progress, progress) } : m,
          ),
        },
      }));
    },
    [],
  );

  const claimMissionReward = useCallback((missionId: string) => {
    setData((prev) => ({
      ...prev,
      missions: {
        ...prev.missions,
        dailyMissions: prev.missions.dailyMissions.map((m) =>
          m.id === missionId ? { ...m, completed: true } : m,
        ),
        missionsCompletedToday: prev.missions.missionsCompletedToday + 1,
      },
    }));
  }, []);

  const generateDailyMissions = useCallback(() => {
    const today = getToday();
    setData((prev) => {
      if (prev.missions.lastMissionDate === today) return prev;

      const missionTemplates = [
        'solve_3_puzzles',
        'earn_500_score',
        'get_perfect_solve',
        'collect_rare_tile',
        'complete_daily',
        'solve_without_hints',
        'earn_3_stars',
        'play_5_minutes',
      ];

      // Pick 3 random missions
      const shuffled = [...missionTemplates].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 3);

      return {
        ...prev,
        missions: {
          dailyMissions: selected.map((id) => ({
            id,
            progress: 0,
            completed: false,
          })),
          lastMissionDate: today,
          missionsCompletedToday: 0,
        },
      };
    });
  }, []);

  // ── Streaks ─────────────────────────────────────────────────────────────

  const updateStreak = useCallback(() => {
    const today = getToday();
    setData((prev) => {
      const { streaks } = prev;
      if (streaks.lastPlayDate === today) return prev;

      const lastDate = streaks.lastPlayDate ? new Date(streaks.lastPlayDate) : null;
      const todayDate = new Date(today);
      const diffDays = lastDate
        ? Math.floor(
            (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
          )
        : 0;

      let newStreak: number;
      let graceUsed = false;
      if (diffDays === 1) {
        // Consecutive day
        newStreak = streaks.currentStreak + 1;
      } else if (diffDays === 0) {
        // Same day
        newStreak = streaks.currentStreak;
      } else if (diffDays === 2 && streaks.graceDaysUsed < 1) {
        // Missed exactly 1 day — auto-apply grace day (GDD: "Missing one day doesn't break streak")
        newStreak = streaks.currentStreak + 1;
        graceUsed = true;
      } else {
        // Streak broken (missed 2+ days, or no grace day available)
        newStreak = 1;
      }

      // Reset grace days when streak breaks (so new streaks get a fresh grace day)
      const newGraceDaysUsed = graceUsed
        ? streaks.graceDaysUsed + 1
        : diffDays >= 3 ? 0 : streaks.graceDaysUsed;

      const newLoginDates = prev.dailyLoginDates.includes(today)
        ? prev.dailyLoginDates
        : [...prev.dailyLoginDates, today];

      const loginCycleDay = (newLoginDates.length - 1) % 7 + 1;

      // Check if a streak milestone was just crossed
      const prevStreak = streaks.currentStreak;
      let pendingCeremonies = prev.pendingCeremonies;
      for (const milestone of STREAK.milestones) {
        if (newStreak >= milestone && prevStreak < milestone) {
          const reward = STREAK.milestoneRewards[milestone as keyof typeof STREAK.milestoneRewards];
          pendingCeremonies = [
            ...pendingCeremonies,
            {
              type: 'streak_milestone' as const,
              data: { streakCount: milestone, reward, badge: (reward as any).cosmetic },
            },
          ];
        }
      }

      return {
        ...prev,
        dailyLoginDates: newLoginDates,
        loginCycleDay,
        pendingCeremonies,
        streaks: {
          ...streaks,
          currentStreak: newStreak,
          bestStreak: Math.max(streaks.bestStreak, newStreak),
          lastPlayDate: today,
          graceDaysUsed: newGraceDaysUsed,
        },
        lastActiveDate: today,
      };
    });
  }, []);

  const useGraceDay = useCallback((): boolean => {
    let success = false;
    setData((prev) => {
      const { streaks } = prev;
      if (streaks.graceDaysUsed >= 1) return prev;
      success = true;
      return {
        ...prev,
        streaks: {
          ...streaks,
          graceDaysUsed: streaks.graceDaysUsed + 1,
          lastPlayDate: getToday(),
        },
      };
    });
    return success;
  }, []);

  const useStreakShield = useCallback((): boolean => {
    let success = false;
    setData((prev) => {
      const { streaks } = prev;
      if (!streaks.streakShieldAvailable) return prev;
      success = true;
      return {
        ...prev,
        streaks: {
          ...streaks,
          streakShieldAvailable: false,
          lastShieldDate: getToday(),
          lastPlayDate: getToday(),
        },
      };
    });
    return success;
  }, []);

  // ── Cosmetics ───────────────────────────────────────────────────────────

  const equipCosmetic = useCallback(
    (type: 'theme' | 'frame' | 'title', id: string) => {
      setData((prev) => {
        if (!prev.unlockedCosmetics.includes(id) && id !== 'default') return prev;
        switch (type) {
          case 'theme':
            return { ...prev, equippedTheme: id };
          case 'frame':
            return { ...prev, equippedFrame: id };
          case 'title':
            return { ...prev, equippedTitle: id };
          default:
            return prev;
        }
      });
    },
    [],
  );

  const unlockCosmetic = useCallback((id: string) => {
    setData((prev) => {
      if (prev.unlockedCosmetics.includes(id)) return prev;
      return {
        ...prev,
        unlockedCosmetics: [...prev.unlockedCosmetics, id],
      };
    });
  }, []);

  // ── Gifting ────────────────────────────────────────────────────────────

  const sendHintGift = useCallback((friendId: string): boolean => {
    const today = getToday();
    let success = false;
    setData((prev) => {
      const resetCount = prev.lastGiftDate !== today ? 0 : prev.hintGiftsSentToday;
      if (resetCount >= 1) return prev; // Max 1 hint gift per day per GDD
      success = true;
      return {
        ...prev,
        hintGiftsSentToday: resetCount + 1,
        lastGiftDate: today,
      };
    });
    // Deliver via Firestore if available
    if (success && user) {
      import('../services/firestore').then(({ firestoreService }) => {
        void firestoreService.sendGift(
          user.uid,
          data.equippedTitle || 'A friend',
          friendId,
          'hint',
          1
        );
      });
    }
    return success;
  }, [user, data.equippedTitle]);

  const sendTileGift = useCallback((friendId: string, tileLetter: string): boolean => {
    const today = getToday();
    let success = false;
    setData((prev) => {
      const resetCount = prev.lastGiftDate !== today ? 0 : prev.tileGiftsSentToday;
      if (resetCount >= 3) return prev; // Max 3 tile gifts per day per GDD
      success = true;
      return {
        ...prev,
        tileGiftsSentToday: resetCount + 1,
        lastGiftDate: today,
      };
    });
    // Deliver via Firestore if available
    if (success && user) {
      import('../services/firestore').then(({ firestoreService }) => {
        void firestoreService.sendGift(
          user.uid,
          data.equippedTitle || 'A friend',
          friendId,
          'tile',
          1
        );
      });
    }
    return success;
  }, [user, data.equippedTitle]);

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
    return data.modeLevels[modeId] ?? 1;
  }, [data.modeLevels]);

  // ── Achievements ────────────────────────────────────────────────────────

  const completeAchievement = useCallback((achievementId: string) => {
    setData((prev) => {
      if (prev.achievementIds.includes(achievementId)) return prev;
      return {
        ...prev,
        achievementIds: [...prev.achievementIds, achievementId],
      };
    });
  }, []);

  // ── Feature Unlocks ────────────────────────────────────────────────────

  const unlockFeature = useCallback((featureId: string) => {
    setData((prev) => {
      if (prev.featuresUnlocked.includes(featureId)) return prev;
      return {
        ...prev,
        featuresUnlocked: [...prev.featuresUnlocked, featureId],
      };
    });
  }, []);

  const checkFeatureUnlocks = useCallback((level: number): CeremonyItem[] => {
    const ceremonies: CeremonyItem[] = [];
    for (const feature of FEATURE_UNLOCK_SCHEDULE) {
      if (feature.unlockLevel <= level && !data.featuresUnlocked.includes(feature.id)) {
        ceremonies.push({
          type: 'feature_unlock',
          data: { ...feature },
        });
        setData((prev) => ({
          ...prev,
          featuresUnlocked: [...prev.featuresUnlocked, feature.id],
        }));
      }
    }
    return ceremonies;
  }, [data.featuresUnlocked]);

  // ── Tooltips ──────────────────────────────────────────────────────────

  const markTooltipShown = useCallback((id: string) => {
    setData((prev) => {
      if (prev.tooltipsShown.includes(id)) return prev;
      return {
        ...prev,
        tooltipsShown: [...prev.tooltipsShown, id],
      };
    });
  }, []);

  // ── Weekly Goals ──────────────────────────────────────────────────────

  const initWeeklyGoals = useCallback(() => {
    setData((prev) => {
      if (prev.weeklyGoals && !isNewWeek(prev.weeklyGoals.weekStart)) {
        return prev;
      }
      return {
        ...prev,
        weeklyGoals: generateWeeklyGoals(),
        modesPlayedThisWeek: [],
      };
    });
  }, []);

  const updateWeeklyGoalProgress = useCallback((trackingKey: string, value: number) => {
    setData((prev) => {
      if (!prev.weeklyGoals) return prev;
      const updatedGoals = prev.weeklyGoals.goals.map((g) => {
        if (g.trackingKey !== trackingKey || g.completed) return g;
        const newProgress = g.progress + value;
        return {
          ...g,
          progress: newProgress,
          completed: newProgress >= g.target,
        };
      });
      return {
        ...prev,
        weeklyGoals: { ...prev.weeklyGoals, goals: updatedGoals },
      };
    });
  }, []);

  // ── Ceremonies ────────────────────────────────────────────────────────

  const queueCeremony = useCallback((ceremony: CeremonyItem) => {
    setData((prev) => ({
      ...prev,
      pendingCeremonies: [...prev.pendingCeremonies, ceremony],
    }));
  }, []);

  const popCeremony = useCallback((): CeremonyItem | null => {
    let ceremony: CeremonyItem | null = null;
    setData((prev) => {
      if (prev.pendingCeremonies.length === 0) return prev;
      ceremony = prev.pendingCeremonies[0];
      return {
        ...prev,
        pendingCeremonies: prev.pendingCeremonies.slice(1),
      };
    });
    return ceremony;
  }, []);

  // ── Difficulty Pacing ─────────────────────────────────────────────────

  const recordFailure = useCallback((level: number) => {
    setData((prev) => ({
      ...prev,
      failCountByLevel: {
        ...prev.failCountByLevel,
        [level]: (prev.failCountByLevel[level] || 0) + 1,
      },
      consecutiveFailures: prev.consecutiveFailures + 1,
    }));
  }, []);

  const needsBreather = useCallback((): boolean => {
    return data.consecutiveFailures >= 2 || data.lastLevelStars === 1;
  }, [data.consecutiveFailures, data.lastLevelStars]);

  // ── Achievement Checking ──────────────────────────────────────────────

  const checkAchievements = useCallback((extraData?: { maxCombo?: number }): CeremonyItem[] => {
    const ceremonies: CeremonyItem[] = [];
    const valueMap: Record<string, number> = {
      word_finder: data.wordsFoundTotal,
      puzzle_solver: data.puzzlesSolved,
      perfect_player: data.perfectSolves,
      high_scorer: data.totalScore,
      chain_reaction: extraData?.maxCombo || 0,
      streak_master: data.streaks.currentStreak,
      daily_devotee: data.dailyCompleted.length,
      atlas_scholar: Object.keys(data.collections.atlasPages).length,
      tile_collector: Object.keys(data.collections.rareTiles).length,
      library_restorer: data.restoredWings.length,
      mode_explorer: Object.keys(data.modeStats).filter((m) => data.modeStats[m].played > 0).length,
      speed_demon: data.modeStats.timePressure?.wins || 0,
      level_climber: data.highestLevel,
      star_collector: data.totalStars,
    };

    // Collect all new achievement IDs first, then persist in a single setData call
    // (calling setData in a loop causes each call to close over stale state)
    const newAchievementIds: string[] = [];

    for (const achievement of ACHIEVEMENTS) {
      const value = valueMap[achievement.id] || 0;
      const tier = getAchievementTier(achievement, value);
      if (!tier) continue;
      const tierId = getAchievementTierId(achievement.id, tier);
      if (data.achievementIds.includes(tierId) || newAchievementIds.includes(tierId)) continue;

      // Add lower tiers first
      const tierIndex = achievement.tiers.findIndex((t) => t.level === tier);
      for (const lt of achievement.tiers.slice(0, tierIndex)) {
        const ltId = getAchievementTierId(achievement.id, lt.level);
        if (!data.achievementIds.includes(ltId) && !newAchievementIds.includes(ltId)) {
          newAchievementIds.push(ltId);
        }
      }

      newAchievementIds.push(tierId);
      ceremonies.push({
        type: 'achievement',
        data: {
          id: tierId,
          icon: achievement.icon,
          name: achievement.name,
          description: achievement.description,
          tier,
          reward: achievement.tiers[tierIndex].reward,
        },
      });
    }

    if (newAchievementIds.length > 0) {
      setData((prev) => ({
        ...prev,
        achievementIds: [...prev.achievementIds, ...newAchievementIds],
      }));
    }
    return ceremonies;
  }, [data]);

  // ── Comebacks ───────────────────────────────────────────────────────────

  const checkComebackRewards = useCallback((): string[] => {
    const today = getToday();
    const rewards: string[] = [];

    if (!data.lastActiveDate) return rewards;

    const lastActive = new Date(data.lastActiveDate);
    const todayDate = new Date(today);
    const daysSinceActive = Math.floor(
      (todayDate.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceActive >= 3 && daysSinceActive < 7) {
      const rewardId = `comeback_3day_${today}`;
      if (!data.comebackRewardsClaimed.includes(rewardId)) {
        rewards.push(rewardId);
      }
    } else if (daysSinceActive >= 7 && daysSinceActive < 30) {
      const rewardId = `comeback_7day_${today}`;
      if (!data.comebackRewardsClaimed.includes(rewardId)) {
        rewards.push(rewardId);
      }
    } else if (daysSinceActive >= 30) {
      const rewardId = `comeback_30day_${today}`;
      if (!data.comebackRewardsClaimed.includes(rewardId)) {
        rewards.push(rewardId);
      }
    }

    if (rewards.length > 0) {
      setData((prev) => ({
        ...prev,
        comebackRewardsClaimed: [...prev.comebackRewardsClaimed, ...rewards],
      }));
    }

    return rewards;
  }, [data.lastActiveDate, data.comebackRewardsClaimed]);

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
    const energyNow = computeCurrentEnergy(data.puzzleEnergy);
    if (energyNow.current >= ENERGY.MAX) return 0;

    const lastRegen = new Date(energyNow.lastRegenTime).getTime();
    const regenMs = ENERGY.REGEN_MINUTES * 60 * 1000;
    const elapsed = Date.now() - lastRegen;
    const remaining = regenMs - (elapsed % regenMs);
    return Math.max(0, remaining);
  }, [data.puzzleEnergy, computeCurrentEnergy]);

  const getEnergyDisplay = useCallback(() => {
    const energyNow = computeCurrentEnergy(data.puzzleEnergy);
    const bonusPlaysLeft = ENERGY.BONUS_PLAYS_AFTER_ZERO - energyNow.bonusPlaysUsed;
    return {
      current: energyNow.current,
      max: ENERGY.MAX,
      bonusPlaysLeft: Math.max(0, bonusPlaysLeft),
      isBonusMode: energyNow.current <= 0 && energyNow.bonusPlaysUsed > 0,
    };
  }, [data.puzzleEnergy, computeCurrentEnergy]);

  // ── Adaptive Difficulty Metrics ───────────────────────────────────────

  const recordPerformanceMetrics = useCallback((level: number, stars: number, completionTimeSeconds: number) => {
    setData((prev) => ({
      ...prev,
      performanceMetrics: updatePlayerMetrics(
        prev.performanceMetrics,
        level,
        stars,
        completionTimeSeconds,
      ),
    }));
  }, []);


  // ── Friend Challenges ────────────────────────────────────────────────

  const sendChallenge = useCallback((friendId: string, puzzleData: {
    score: number;
    stars: number;
    time: number;
    level: number;
    seed: number;
    mode: import('../types').GameMode;
    boardConfig: import('../types').BoardConfig;
  }) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const challenge: import('../types').FriendChallenge = {
      id: `challenge_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
      challengerId: user?.uid ?? 'local_player',
      challengerName: data.equippedTitle || 'Player',
      challengerScore: puzzleData.score,
      challengerStars: puzzleData.stars,
      challengerTime: puzzleData.time,
      level: puzzleData.level,
      seed: puzzleData.seed,
      mode: puzzleData.mode,
      boardConfig: puzzleData.boardConfig,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
    };

    setData((prev) => ({
      ...prev,
      friendChallenges: {
        ...prev.friendChallenges,
        sent: [...prev.friendChallenges.sent, challenge],
      },
    }));

    return challenge;
  }, [user, data.equippedTitle]);

  const respondToChallenge = useCallback((challengeId: string, score: number, stars: number) => {
    setData((prev) => {
      const updatedReceived = prev.friendChallenges.received.map((c) => {
        if (c.id === challengeId) {
          return { ...c, status: 'completed' as const, respondentScore: score, respondentStars: stars };
        }
        return c;
      });
      return {
        ...prev,
        friendChallenges: {
          ...prev.friendChallenges,
          received: updatedReceived,
        },
      };
    });
  }, []);

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

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <PlayerContext.Provider
      value={{
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
        unlockMode,
        recordModePlay,
        advanceModeLevel,
        getModeLevel,
        completeAchievement,
        checkComebackRewards,
        unlockFeature,
        checkFeatureUnlocks,
        markTooltipShown,
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
        useEnergy,
        refillEnergy,
        getTimeUntilNextEnergy,
        getEnergyDisplay,
        recordPerformanceMetrics,
        sendChallenge,
        respondToChallenge,
        recomputeSegments,
        updateEventProgress: updateEventProgressCb,
      }}
    >
      {children}
    </PlayerContext.Provider>
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
