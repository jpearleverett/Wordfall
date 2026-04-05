/**
 * PlayerProgressContext — extracted from PlayerContext.
 *
 * Contains progress tracking, achievement checking, weekly goals,
 * missions, streaks, fail tracking, breather detection, performance metrics,
 * and feature unlocks.
 *
 * These functions are created here and imported back into PlayerContext
 * to keep the same external API surface (usePlayer() still returns everything).
 */
import { useCallback } from 'react';
import { CeremonyItem, WeeklyGoalsState } from '../types';
import { CHAPTERS, getChapterForLevel } from '../data/chapters';
import { generateWeeklyGoals, isNewWeek } from '../data/weeklyGoals';
import { ACHIEVEMENTS, getAchievementTier, getAchievementTierId } from '../data/achievements';
import { FEATURE_UNLOCK_SCHEDULE, STREAK } from '../constants';
import { updatePlayerMetrics } from '../engine/difficultyAdjuster';
import { PlayerMetrics } from '../types';

const getToday = (): string => new Date().toISOString().split('T')[0];

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PlayerProgressData {
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
  streaks: {
    currentStreak: number;
    bestStreak: number;
    lastPlayDate: string;
    graceDaysUsed: number;
    streakShieldAvailable: boolean;
    lastShieldDate: string;
  };

  // Missions
  missions: {
    dailyMissions: Array<{ id: string; progress: number; completed: boolean }>;
    lastMissionDate: string;
    missionsCompletedToday: number;
  };

  // Milestones
  achievementIds: string[];

  // Onboarding
  featuresUnlocked: string[];

  // Weekly Goals
  weeklyGoals: WeeklyGoalsState | null;

  // Ceremonies
  pendingCeremonies: CeremonyItem[];

  // Difficulty Pacing
  failCountByLevel: Record<number, number>;
  consecutiveFailures: number;
  lastLevelStars: number;

  // Tracking
  wordsFoundTotal: number;
  modesPlayedThisWeek: string[];

  // Library
  restoredWings: string[];

  // Collections (needed for achievement checking)
  collections: {
    atlasPages: Record<string, string[]>;
    rareTiles: Record<string, number>;
  };

  // Modes (needed for achievement checking)
  modeStats: Record<string, { played: number; bestScore: number; wins: number }>;

  // Adaptive Difficulty Metrics
  performanceMetrics: PlayerMetrics;

  // Comebacks
  lastActiveDate: string;
  comebackRewardsClaimed: string[];
}

export interface PlayerProgressMethods {
  recordPuzzleComplete: (level: number, score: number, stars: number, isPerfect: boolean) => void;
  recordDailyComplete: (dateString: string) => void;
  updateStreak: () => void;
  useGraceDay: () => boolean;
  useStreakShield: () => boolean;
  updateMissionProgress: (missionId: string, progress: number) => void;
  claimMissionReward: (missionId: string) => void;
  generateDailyMissions: () => void;
  unlockFeature: (featureId: string) => void;
  checkFeatureUnlocks: (level: number) => CeremonyItem[];
  markTooltipShown: (id: string) => void;
  initWeeklyGoals: () => void;
  updateWeeklyGoalProgress: (trackingKey: string, value: number) => void;
  queueCeremony: (ceremony: CeremonyItem) => void;
  popCeremony: () => CeremonyItem | null;
  recordFailure: (level: number) => void;
  needsBreather: () => boolean;
  checkAchievements: (extraData?: { maxCombo?: number }) => CeremonyItem[];
  completeAchievement: (achievementId: string) => void;
  checkComebackRewards: () => string[];
  recordPerformanceMetrics: (level: number, stars: number, completionTimeSeconds: number) => void;
}

type SetDataFn<T> = (updater: (prev: T) => T) => void;

/**
 * Creates the progress-related callbacks for PlayerContext.
 * Called inside PlayerProvider; receives `setData` and current data accessor.
 */
export function createProgressMethods<T extends PlayerProgressData & { tooltipsShown: string[] }>(
  setData: SetDataFn<T>,
  getData: () => T,
): PlayerProgressMethods {

  const recordPuzzleComplete = (level: number, score: number, stars: number, isPerfect: boolean): void => {
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

      // Detect newly completed wings for ceremony queue
      const newlyRestoredWings = completedWingIds.filter(
        (wingId) => !prev.restoredWings.includes(wingId),
      );
      const wingCeremonies: CeremonyItem[] = newlyRestoredWings.map((wingId) => ({
        type: 'wing_complete' as const,
        data: { wingId, wingName: wingId },
      }));

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
        pendingCeremonies: [...prev.pendingCeremonies, ...wingCeremonies],
        lastActiveDate: getToday(),
      };
    });
  };

  const recordDailyComplete = (dateString: string): void => {
    setData((prev) => {
      if (prev.dailyCompleted.includes(dateString)) return prev;
      return {
        ...prev,
        dailyCompleted: [...prev.dailyCompleted, dateString],
        lastActiveDate: getToday(),
      };
    });
  };

  const updateStreak = (): void => {
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
        newStreak = streaks.currentStreak + 1;
      } else if (diffDays === 0) {
        newStreak = streaks.currentStreak;
      } else if (diffDays === 2 && streaks.graceDaysUsed < 1) {
        newStreak = streaks.currentStreak + 1;
        graceUsed = true;
      } else {
        newStreak = 1;
      }

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
  };

  const useGraceDay = (): boolean => {
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
  };

  const useStreakShield = (): boolean => {
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
  };

  const updateMissionProgress = (missionId: string, progress: number): void => {
    setData((prev) => ({
      ...prev,
      missions: {
        ...prev.missions,
        dailyMissions: prev.missions.dailyMissions.map((m) =>
          m.id === missionId ? { ...m, progress: Math.max(m.progress, progress) } : m,
        ),
      },
    }));
  };

  const claimMissionReward = (missionId: string): void => {
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
  };

  const generateDailyMissions = (): void => {
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
  };

  const unlockFeature = (featureId: string): void => {
    setData((prev) => {
      if (prev.featuresUnlocked.includes(featureId)) return prev;
      return {
        ...prev,
        featuresUnlocked: [...prev.featuresUnlocked, featureId],
      };
    });
  };

  const checkFeatureUnlocks = (level: number): CeremonyItem[] => {
    const data = getData();
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
  };

  const markTooltipShown = (id: string): void => {
    setData((prev) => {
      if (prev.tooltipsShown.includes(id)) return prev;
      return {
        ...prev,
        tooltipsShown: [...prev.tooltipsShown, id],
      };
    });
  };

  const initWeeklyGoals = (): void => {
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
  };

  const updateWeeklyGoalProgress = (trackingKey: string, value: number): void => {
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
  };

  const queueCeremony = (ceremony: CeremonyItem): void => {
    setData((prev) => ({
      ...prev,
      pendingCeremonies: [...prev.pendingCeremonies, ceremony],
    }));
  };

  const popCeremony = (): CeremonyItem | null => {
    const current = getData();
    if (current.pendingCeremonies.length === 0) return null;
    const ceremony = current.pendingCeremonies[0];
    setData((prev) => ({
      ...prev,
      pendingCeremonies: prev.pendingCeremonies.slice(1),
    }));
    return ceremony;
  };

  const recordFailure = (level: number): void => {
    setData((prev) => ({
      ...prev,
      failCountByLevel: {
        ...prev.failCountByLevel,
        [level]: (prev.failCountByLevel[level] || 0) + 1,
      },
      consecutiveFailures: prev.consecutiveFailures + 1,
    }));
  };

  const needsBreather = (): boolean => {
    const data = getData();
    return data.consecutiveFailures >= 2 || data.lastLevelStars === 1;
  };

  const checkAchievements = (extraData?: { maxCombo?: number }): CeremonyItem[] => {
    const data = getData();
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

    const newAchievementIds: string[] = [];

    for (const achievement of ACHIEVEMENTS) {
      const value = valueMap[achievement.id] || 0;
      const tier = getAchievementTier(achievement, value);
      if (!tier) continue;
      const tierId = getAchievementTierId(achievement.id, tier);
      if (data.achievementIds.includes(tierId) || newAchievementIds.includes(tierId)) continue;

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
  };

  const completeAchievement = (achievementId: string): void => {
    setData((prev) => {
      if (prev.achievementIds.includes(achievementId)) return prev;
      return {
        ...prev,
        achievementIds: [...prev.achievementIds, achievementId],
      };
    });
  };

  const checkComebackRewards = (): string[] => {
    const data = getData();
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
  };

  const recordPerformanceMetrics = (level: number, stars: number, completionTimeSeconds: number): void => {
    setData((prev) => ({
      ...prev,
      performanceMetrics: updatePlayerMetrics(
        prev.performanceMetrics,
        level,
        stars,
        completionTimeSeconds,
      ),
    }));
  };

  return {
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
  };
}
