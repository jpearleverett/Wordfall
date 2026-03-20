import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CollectionProgress {
  atlasPages: Record<string, string[]>;
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

  // Onboarding
  tutorialComplete: boolean;
  onboardingDay: number;
  featuresUnlocked: string[];

  // Milestones
  achievementIds: string[];

  // Comebacks
  lastActiveDate: string;
  comebackRewardsClaimed: string[];
}

interface PlayerContextType extends PlayerData {
  loaded: boolean;

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

  // Achievements
  completeAchievement: (achievementId: string) => void;

  // Comebacks
  checkComebackRewards: () => string[];
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

  // Onboarding
  tutorialComplete: false,
  onboardingDay: 1,
  featuresUnlocked: [],

  // Milestones
  achievementIds: [],

  // Comebacks
  lastActiveDate: '',
  comebackRewardsClaimed: [],
};

// ─── Context ────────────────────────────────────────────────────────────────

const PlayerContext = createContext<PlayerContextType>({
  ...DEFAULT_PLAYER_DATA,
  loaded: false,
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
  completeAchievement: () => {},
  checkComebackRewards: () => [],
});

// ─── Provider ───────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlayerData>(DEFAULT_PLAYER_DATA);
  const [loaded, setLoaded] = useState(false);

  // ── Persistence ─────────────────────────────────────────────────────────

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

  useEffect(() => {
    if (!loaded) return;
    const persist = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('Failed to save player data to AsyncStorage:', e);
      }
    };
    persist();
  }, [data, loaded]);

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

        return {
          ...prev,
          totalScore: prev.totalScore + score,
          puzzlesSolved: prev.puzzlesSolved + 1,
          perfectSolves: isPerfect ? prev.perfectSolves + 1 : prev.perfectSolves,
          highestLevel: Math.max(prev.highestLevel, level),
          currentLevel: Math.max(prev.currentLevel, level + 1),
          starsByLevel: newStarsByLevel,
          totalStars,
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
      if (existingWords.includes(word)) return prev;
      return {
        ...prev,
        collections: {
          ...prev.collections,
          atlasPages: {
            ...prev.collections.atlasPages,
            [pageId]: [...existingWords, word],
          },
        },
      };
    });
  }, []);

  const addRareTile = useCallback((letter: string, count: number = 1) => {
    setData((prev) => ({
      ...prev,
      collections: {
        ...prev.collections,
        rareTiles: {
          ...prev.collections.rareTiles,
          [letter]: (prev.collections.rareTiles[letter] ?? 0) + count,
        },
      },
    }));
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
      if (diffDays === 1) {
        // Consecutive day
        newStreak = streaks.currentStreak + 1;
      } else if (diffDays === 0) {
        // Same day
        newStreak = streaks.currentStreak;
      } else {
        // Streak broken
        newStreak = 1;
      }

      const newLoginDates = prev.dailyLoginDates.includes(today)
        ? prev.dailyLoginDates
        : [...prev.dailyLoginDates, today];

      const loginCycleDay = (newLoginDates.length - 1) % 7 + 1;

      return {
        ...prev,
        dailyLoginDates: newLoginDates,
        loginCycleDay,
        streaks: {
          ...streaks,
          currentStreak: newStreak,
          bestStreak: Math.max(streaks.bestStreak, newStreak),
          lastPlayDate: today,
        },
        lastActiveDate: today,
      };
    });
  }, []);

  const useGraceDay = useCallback((): boolean => {
    let success = false;
    setData((prev) => {
      const { streaks } = prev;
      if (streaks.graceDaysUsed >= 3) return prev;
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

  // ── Library ─────────────────────────────────────────────────────────────

  const restoreWing = useCallback((wingId: string) => {
    setData((prev) => {
      if (prev.restoredWings.includes(wingId)) return prev;
      return {
        ...prev,
        restoredWings: [...prev.restoredWings, wingId],
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
    } else if (daysSinceActive >= 7 && daysSinceActive < 14) {
      const rewardId = `comeback_7day_${today}`;
      if (!data.comebackRewardsClaimed.includes(rewardId)) {
        rewards.push(rewardId);
      }
    } else if (daysSinceActive >= 14) {
      const rewardId = `comeback_14day_${today}`;
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

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <PlayerContext.Provider
      value={{
        ...data,
        loaded,
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
        completeAchievement,
        checkComebackRewards,
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
