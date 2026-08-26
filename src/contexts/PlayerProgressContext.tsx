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
import { CHAPTERS, WING_NAMES, getChapterForLevel, getLastLevelOfChapter } from '../data/chapters';
import { generateWeeklyGoals, isNewWeek } from '../data/weeklyGoals';
import { getQuestFinalReward } from '../data/seasonalQuests';
import { ATLAS_PAGES } from '../data/collections';
import { ACHIEVEMENTS, getAchievementTier, getAchievementTierId } from '../data/achievements';
import { FEATURE_UNLOCK_SCHEDULE, STREAK } from '../constants';
import { isProfileCosmeticId, resolveLegacyCosmeticId } from '../data/cosmetics';
import { getLoginCalendarOffsetDays, getLoginCycleLength } from '../data/loginCalendar';
import { updatePlayerMetrics } from '../engine/difficultyAdjuster';
import { PlayerMetrics } from '../types';

const getToday = (): string => new Date().toISOString().split('T')[0];

/** Minimum days between two grace days — one skip per fortnight of play. */
const GRACE_COOLDOWN_DAYS = 14;

/**
 * Whether a missed day may be forgiven right now.
 *
 * Losing a long streak to a single missed day is one of the most reliable
 * churn moments in a daily game, and long-streak players are the most
 * valuable ones to protect — so forgiveness has to keep existing for as long
 * as the streak does.
 *
 * This was a counter: `graceDaysUsed` against an allowance that grew with
 * streak length and capped at 4. The counter only reset when the streak
 * BROKE, so the cap was a lifetime budget rather than a rate. Someone on a
 * 365-day streak who had used their four graces by day 60 then went 300 days
 * with no forgiveness at all — the exact opposite of the intent, applied to
 * the exact player it was meant to protect.
 *
 * A cooldown expresses the intended policy directly and uniformly: one
 * missed day forgiven per fortnight, at any streak length, forever. It is no
 * more generous than the counter was early on (the first grace is still
 * free) and strictly more generous where the counter failed.
 */
function canUseGrace(lastGraceDate: string | undefined, todayDate: Date): boolean {
  if (!lastGraceDate) return true;
  const lastMs = new Date(lastGraceDate).getTime();
  if (Number.isNaN(lastMs)) return true;
  const daysSince = Math.floor((todayDate.getTime() - lastMs) / (1000 * 60 * 60 * 24));
  return daysSince >= GRACE_COOLDOWN_DAYS;
}

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
    lastGraceDate?: string;
    streakShieldAvailable: boolean;
    lastShieldDate: string;
    /**
     * Set when a streak of >=3 days just broke (R5 in launch_blockers.md).
     * Surfaces the restorative "50 gems to save your streak" modal on the
     * next app open. Cleared when either the offer is claimed (streak
     * restored) or 24h pass (offer expired).
     */
    recentBreak: {
      prevStreak: number;
      brokenAtMs: number;
    } | null;
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
  onboardingMilestones: string[]; // completed milestone IDs

  // Weekly Goals
  weeklyGoals: WeeklyGoalsState | null;

  // Ceremonies
  pendingCeremonies: CeremonyItem[];

  // Difficulty Pacing
  failCountByLevel: Record<number, number>;
  consecutiveFailures: number;
  lastLevelStars: number;
  /**
   * Timestamp (ms) of the last fail-breather offer shown to this player.
   * Used by `App.tsx:GameScreenWrapper` to enforce a 1-hour cooldown so the
   * offer doesn't re-fire back-to-back on the same stuck level.
   * Tier 6 B1 — see `agent_docs/launch_blockers.md`.
   */
  lastBreatherOfferedAt: number | null;

  // Tracking
  wordsFoundTotal: number;
  modesPlayedThisWeek: string[];
  unlockedCosmetics: string[];

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
  activateStreakShield: () => void;
  /**
   * Restore a recently-broken streak (R5 in launch_blockers.md).
   * Reverts `currentStreak` to the pre-break value stored in `recentBreak`
   * and clears the break marker so the offer modal stops showing.
   * Returns the restored streak count, or 0 if nothing to restore.
   * Callers are responsible for spending the gem cost via EconomyContext.
   */
  restoreBrokenStreak: () => number;
  /** Clear the recent-break marker without restoring (user dismissed offer). */
  dismissStreakBreak: () => void;
  updateMissionProgress: (missionId: string, progress: number) => void;
  claimMissionReward: (missionId: string) => void;
  generateDailyMissions: () => void;
  unlockFeature: (featureId: string) => void;
  checkFeatureUnlocks: (level: number) => CeremonyItem[];
  markTooltipShown: (id: string) => void;
  completeOnboardingMilestone: (id: string) => void;
  initWeeklyGoals: () => void;
  updateWeeklyGoalProgress: (trackingKey: string, value: number) => void;
  queueCeremony: (ceremony: CeremonyItem) => void;
  popCeremony: () => CeremonyItem | null;
  recordFailure: (level: number) => void;
  needsBreather: () => boolean;
  checkAchievements: (extraData?: Record<string, unknown>) => CeremonyItem[];
  completeAchievement: (achievementId: string) => void;
  checkComebackRewards: () => string[];
  recordPerformanceMetrics: (level: number, stars: number, completionTimeSeconds: number) => void;
  recordPerformanceFailure: (level: number) => void;
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
      const uncappedNextLevel = Math.max(prev.currentLevel, level + 1);
      // Enforce chapter star gate: if the player would cross into a chapter
      // whose requiredStars exceeds their total, clamp them to the last level
      // of the previously-unlocked chapter so they can replay for more stars.
      const targetChapter =
        getChapterForLevel(uncappedNextLevel) ?? CHAPTERS[CHAPTERS.length - 1];
      const currentUnlockedChapter =
        getChapterForLevel(prev.currentLevel) ?? CHAPTERS[0];
      const crossesChapterBoundary =
        targetChapter.id !== currentUnlockedChapter.id;
      const gateMet = totalStars >= targetChapter.requiredStars;
      const nextCurrentLevel =
        !crossesChapterBoundary || gateMet
          ? uncappedNextLevel
          : Math.min(uncappedNextLevel, getLastLevelOfChapter(currentUnlockedChapter.id));
      const activeChapter =
        getChapterForLevel(nextCurrentLevel) ?? CHAPTERS[CHAPTERS.length - 1];
      const completedWingIds = Array.from(
        new Set(
          CHAPTERS.filter((chapter) => chapter.id < activeChapter.id).map((chapter) => chapter.wingId),
        ),
      );
      // Procedural wings (5 chapters each, ids 41+): the static filter above
      // can never see them, which froze wing ceremonies at L600 for exactly
      // the deepest cohort. Wing N spans chapter ids 41+5N .. 45+5N (its
      // finale is the isBossChapter); it is complete once activeChapter has
      // moved past its last chapter.
      if (activeChapter.id > CHAPTERS.length) {
        const wingsDone = Math.floor((activeChapter.id - CHAPTERS.length - 1) / 5);
        for (let w = 0; w < wingsDone; w++) {
          completedWingIds.push(`procedural_${w}`);
        }
      }

      // Detect newly completed wings for ceremony queue
      const newlyRestoredWings = completedWingIds.filter(
        (wingId) => !prev.restoredWings.includes(wingId),
      );
      // wingName was the raw id ('nature Complete!'); the reward rides in
      // data so the pop-time grant (ceremonyEconomyGrant) pays it — restoring
      // a wing is 5 chapters / 75 levels, and the 1000c/25g bonus for it
      // previously lived only in an unreachable duplicate method.
      const wingCeremonies: CeremonyItem[] = newlyRestoredWings.map((wingId) => ({
        type: 'wing_complete' as const,
        data: {
          wingId,
          wingName:
            WING_NAMES[wingId] ??
            (wingId.startsWith('procedural_')
              ? `Endless Wing ${Number(wingId.slice('procedural_'.length)) + 1}`
              : wingId),
          reward: { coins: 1000, gems: 25 },
        },
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

      // A purchased streak shield persists until consumed — no freshness
      // window. The SKU copy ("Protect your streak for one missed day.
      // Single-use shield.") promises no expiry, and the old 72h window
      // silently voided exactly the buyer the shield was sold to: someone
      // who bought insurance in advance and then missed a day more than
      // three days later lost their streak with the shield still "owned" —
      // and because the stale flag was never cleared, the in-game shield
      // re-offer stayed suppressed for the life of the account.
      const shieldUsable = streaks.streakShieldAvailable;

      let newStreak: number;
      let graceUsed = false;
      let shieldConsumed = false;
      // True only when the final else actually resets the streak — the one
      // branch that means "a real break happened". Deriving this from
      // diffDays afterwards (>= 3) missed the diffDays === 2 break where
      // grace was on cooldown and no shield was fresh, so that break kept
      // the old grace cooldown — the exact inheritance the reset exists to
      // prevent.
      let streakReset = false;
      // A streak break big enough to regret (≥3 days) is remembered in
      // `recentBreak` so the HomeScreen can surface the restorative
      // "50 gems to save your streak" offer on next open. Small breaks
      // (1–2 day streaks) are not worth an offer.
      let didBreakStreak = false;
      if (!lastDate) {
        // First play ever. This case used to fall into the diffDays === 0
        // branch below (diffDays is hardcoded 0 when there is no prior
        // date), which PRESERVES the current streak — i.e. left it at 0. The
        // player's streak then read one day behind for its entire life:
        // day one showed 0, day two showed 1, and every milestone arrived a
        // day late.
        newStreak = 1;
      } else if (diffDays === 1) {
        newStreak = streaks.currentStreak + 1;
      } else if (diffDays === 0) {
        // Same-day replay is normally caught by the early return above;
        // this remains only as a guard against day-granularity edge cases.
        newStreak = streaks.currentStreak;
      } else if (diffDays === 2 && canUseGrace(streaks.lastGraceDate, todayDate)) {
        newStreak = streaks.currentStreak + 1;
        graceUsed = true;
      } else if (diffDays >= 2 && shieldUsable) {
        // Shield saves the streak: the missed day is forgiven and TODAY's
        // play counts, exactly like the grace branch above. (The old
        // no-increment version conflated the missed day with today, so the
        // paid path permanently counted one day fewer than free grace for
        // the identical scenario.) Consume the shield.
        newStreak = streaks.currentStreak + 1;
        shieldConsumed = true;
      } else {
        newStreak = 1;
        streakReset = true;
        if (streaks.currentStreak >= 3) {
          didBreakStreak = true;
        }
      }

      // graceDaysUsed is now telemetry only — the cooldown decides
      // eligibility. A real break clears both, so a fresh streak starts with
      // forgiveness available rather than inheriting the old one's cooldown.
      const streakBroke = streakReset;
      const newGraceDaysUsed = graceUsed
        ? streaks.graceDaysUsed + 1
        : streakBroke ? 0 : streaks.graceDaysUsed;
      // NEVER let this become an `undefined` VALUE on the object. Firestore's
      // setDoc rejects nested undefined outright (the app does not enable
      // ignoreUndefinedProperties), and this object rides inside the full
      // player payload — one undefined here made every cloud save throw and
      // be silently dropped for any player who had never used a grace day.
      // "Cleared" is expressed by deleting the key below, not by storing
      // undefined under it.
      const newLastGraceDate = graceUsed
        ? today
        : streakBroke ? undefined : streaks.lastGraceDate;

      const newLoginDates = prev.dailyLoginDates.includes(today)
        ? prev.dailyLoginDates
        : [...prev.dailyLoginDates, today];

      const cycleLength = getLoginCycleLength();
      const offset = getLoginCalendarOffsetDays();
      const loginCycleDay = ((newLoginDates.length - 1 + offset) % cycleLength) + 1;

      // Check if a streak milestone was just crossed
      const prevStreak = streaks.currentStreak;
      let unlockedCosmetics = prev.unlockedCosmetics;
      let pendingCeremonies = prev.pendingCeremonies;
      for (const milestone of STREAK.milestones) {
        if (newStreak >= milestone && prevStreak < milestone) {
          const reward = STREAK.milestoneRewards[milestone as keyof typeof STREAK.milestoneRewards];
          const cosmeticId = 'cosmetic' in reward && reward.cosmetic
            ? resolveLegacyCosmeticId(reward.cosmetic)
            : undefined;
          if (cosmeticId && isProfileCosmeticId(cosmeticId) && !unlockedCosmetics.includes(cosmeticId)) {
            unlockedCosmetics = [...unlockedCosmetics, cosmeticId];
          }
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
        unlockedCosmetics,
        pendingCeremonies,
        streaks: (() => {
          const nextStreaks = {
            ...streaks,
            currentStreak: newStreak,
            bestStreak: Math.max(streaks.bestStreak, newStreak),
            lastPlayDate: today,
            graceDaysUsed: shieldConsumed ? streaks.graceDaysUsed : newGraceDaysUsed,
            streakShieldAvailable: shieldConsumed ? false : streaks.streakShieldAvailable,
            recentBreak: didBreakStreak
              ? { prevStreak: streaks.currentStreak, brokenAtMs: Date.now() }
              : streaks.recentBreak,
          };
          const finalLastGraceDate = shieldConsumed
            ? streaks.lastGraceDate
            : newLastGraceDate;
          // Key present with a string, or absent — never present-but-undefined.
          if (finalLastGraceDate === undefined) {
            delete nextStreaks.lastGraceDate;
          } else {
            nextStreaks.lastGraceDate = finalLastGraceDate;
          }
          return nextStreaks;
        })(),
        lastActiveDate: today,
      };
    });
  };

  const useGraceDay = (): boolean => {
    let success = false;
    setData((prev) => {
      const { streaks } = prev;
      const today = getToday();
      if (!canUseGrace(streaks.lastGraceDate, new Date(today))) return prev;
      success = true;
      return {
        ...prev,
        streaks: {
          ...streaks,
          graceDaysUsed: streaks.graceDaysUsed + 1,
          lastGraceDate: today,
          lastPlayDate: today,
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

  const activateStreakShield = (): void => {
    // Grants a streak-shield charge (single-use). Called by commerce after a
    // streak_freeze SKU purchase, and by the in-game streak_shield offer.
    setData((prev) => ({
      ...prev,
      streaks: {
        ...prev.streaks,
        streakShieldAvailable: true,
        lastShieldDate: new Date().toISOString().slice(0, 10),
      },
    }));
  };

  const restoreBrokenStreak = (): number => {
    // R5 in launch_blockers.md: restorative path for a just-broken streak.
    // Reverts `currentStreak` to the pre-break value and clears the marker.
    // The gem cost is deducted separately by the caller (EconomyContext).
    let restoredCount = 0;
    setData((prev) => {
      const br = prev.streaks.recentBreak;
      if (!br) return prev;
      // The break was detected DURING a play: updateStreak had just set
      // lastPlayDate to that day and reset currentStreak to 1 before writing
      // recentBreak. So the day they broke, they played — restoring means
      // prevStreak plus the whole post-break run. On the break day itself
      // that run is 1; restored the NEXT day (still inside the 24h offer
      // window, after the mount-effect updateStreak counted that day too)
      // it is 2. The old hardcoded prevStreak + 1 was right only for the
      // same-day case — a next-day restore overwrote the day already
      // counted, silently shorting the paying player one day forever.
      // lastPlayDate is left alone: it already records the last day they
      // actually played.
      const postBreakRun = Math.max(prev.streaks.currentStreak, 1);
      restoredCount = br.prevStreak + postBreakRun;
      return {
        ...prev,
        streaks: {
          ...prev.streaks,
          currentStreak: br.prevStreak + postBreakRun,
          bestStreak: Math.max(prev.streaks.bestStreak, br.prevStreak + postBreakRun),
          recentBreak: null,
        },
      };
    });
    return restoredCount;
  };

  const dismissStreakBreak = (): void => {
    setData((prev) =>
      prev.streaks.recentBreak
        ? { ...prev, streaks: { ...prev.streaks, recentBreak: null } }
        : prev,
    );
  };

  /**
   * Completion targets per mission template — the same numbers HomeScreen's
   * MISSION_LABELS renders next to each row. `completed` flips here the
   * moment progress reaches the target: claimMissionReward, previously the
   * ONLY writer of the flag, has no callers anywhere, so the panel could
   * never show a checkmark and its counter read 0/3 forever.
   */
  const MISSION_TARGETS: Record<string, number> = {
    solve_3_puzzles: 3,
    earn_500_score: 500,
    get_perfect_solve: 1,
    collect_rare_tile: 1,
    complete_daily: 1,
    solve_without_hints: 1,
    earn_3_stars: 3,
    play_5_minutes: 1,
  };

  const updateMissionProgress = (missionId: string, progress: number): void => {
    setData((prev) => {
      let completedDelta = 0;
      const dailyMissions = prev.missions.dailyMissions.map((m) => {
        if (m.id !== missionId) return m;
        const newProgress = Math.max(m.progress, progress);
        const target = MISSION_TARGETS[m.id] ?? Number.POSITIVE_INFINITY;
        const completed = m.completed || newProgress >= target;
        if (completed && !m.completed) completedDelta += 1;
        return { ...m, progress: newProgress, completed };
      });
      return {
        ...prev,
        missions: {
          ...prev.missions,
          dailyMissions,
          missionsCompletedToday: prev.missions.missionsCompletedToday + completedDelta,
        },
      };
    });
  };

  const claimMissionReward = (missionId: string): void => {
    // Legacy path — updateMissionProgress now flips `completed` at target.
    // Kept for API compatibility, made idempotent so a future caller can't
    // double-count missionsCompletedToday for an already-completed mission.
    setData((prev) => {
      const mission = prev.missions.dailyMissions.find((m) => m.id === missionId);
      if (!mission || mission.completed) return prev;
      return {
        ...prev,
        missions: {
          ...prev.missions,
          dailyMissions: prev.missions.dailyMissions.map((m) =>
            m.id === missionId ? { ...m, completed: true } : m,
          ),
          missionsCompletedToday: prev.missions.missionsCompletedToday + 1,
        },
      };
    });
  };

  const generateDailyMissions = (): void => {
    const today = getToday();
    setData((prev) => {
      if (prev.missions.lastMissionDate === today) return prev;

      // Only templates useRewardWiring actually feeds progress into.
      // 'collect_rare_tile' and 'play_5_minutes' had no wiring at all, so a
      // day that drew one showed a bar frozen at the 2% minimum all day —
      // untracked templates must not be generated.
      const missionTemplates = [
        'solve_3_puzzles',
        'earn_500_score',
        'get_perfect_solve',
        'complete_daily',
        'solve_without_hints',
        'earn_3_stars',
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

  const completeOnboardingMilestone = (id: string): void => {
    setData((prev) => {
      if (prev.onboardingMilestones.includes(id)) return prev;
      return {
        ...prev,
        onboardingMilestones: [...prev.onboardingMilestones, id],
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
      // The HomeScreen panel renders goal.reward (and allCompleteBonus) next
      // to each goal, but no code path ever credited them — every weekly
      // reward was phantom currency. A goal flipping to completed now queues
      // a ceremony carrying its reward; App.tsx credits it at pop time via
      // ceremonyEconomyGrant, exactly-once (the `g.completed` early-return
      // above the flip means a goal can complete only once per week, and pop
      // removes the ceremony from the persisted queue). The generic
      // quest_step_complete surface is reused so no new ceremony variant /
      // router case is needed.
      const newCeremonies: CeremonyItem[] = [];
      const updatedGoals = prev.weeklyGoals.goals.map((g) => {
        if (g.trackingKey !== trackingKey || g.completed) return g;
        const newProgress = g.progress + value;
        const completed = newProgress >= g.target;
        if (completed) {
          newCeremonies.push({
            type: 'quest_step_complete' as const,
            data: {
              icon: '\u{1F3AF}',
              title: 'Weekly Goal Complete!',
              description: g.description,
              weeklyGoalId: g.templateId,
              rewardCoins: g.reward?.coins ?? 0,
              rewardGems: g.reward?.gems ?? 0,
            },
          });
        }
        return { ...g, progress: newProgress, completed };
      });
      // The all-complete bonus fires exactly on the not-all → all transition,
      // which can happen at most once per weekly generation since completed
      // goals never un-complete before Monday's regeneration.
      const wasAllComplete =
        prev.weeklyGoals.goals.length > 0 && prev.weeklyGoals.goals.every((g) => g.completed);
      const nowAllComplete = updatedGoals.length > 0 && updatedGoals.every((g) => g.completed);
      if (!wasAllComplete && nowAllComplete) {
        const bonus = prev.weeklyGoals.allCompleteBonus;
        newCeremonies.push({
          type: 'quest_step_complete' as const,
          data: {
            icon: '\u{1F3C6}',
            title: 'All Weekly Goals Complete!',
            description: 'You finished every goal this week — bonus reward!',
            weeklyGoalId: 'weekly_all_complete',
            rewardCoins: bonus?.coins ?? 0,
            rewardGems: bonus?.gems ?? 0,
          },
        });
      }
      return {
        ...prev,
        weeklyGoals: { ...prev.weeklyGoals, goals: updatedGoals },
        ...(newCeremonies.length > 0
          ? { pendingCeremonies: [...prev.pendingCeremonies, ...newCeremonies] }
          : {}),
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
    // Claiming a seasonal quest's LAST step completes the quest. The
    // finalReward's coins/gems ride ceremonyEconomyGrant (applied by App.tsx
    // around this same pop), and its exclusive cosmetic frame unlocks here —
    // pop is the one exactly-once point, and unlockedCosmetics lives on this
    // context. Before this, the four quest frames sat in the live cosmetics
    // catalog with no reachable unlock path.
    let finalCosmeticId: string | null = null;
    if (ceremony.type === 'quest_step_complete') {
      const final = getQuestFinalReward(ceremony.data?.questId, ceremony.data?.stepIndex);
      const rawId = final?.cosmetic?.id;
      if (rawId) {
        const resolved = resolveLegacyCosmeticId(rawId);
        if (isProfileCosmeticId(resolved)) finalCosmeticId = resolved;
      }
    }
    setData((prev) => ({
      ...prev,
      pendingCeremonies: prev.pendingCeremonies.slice(1),
      ...(finalCosmeticId && !prev.unlockedCosmetics.includes(finalCosmeticId)
        ? { unlockedCosmetics: [...prev.unlockedCosmetics, finalCosmeticId] }
        : {}),
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
      // Also feed the adaptive difficulty adjuster. levelAttempts is
      // what getAdjustedConfig reads to detect "struggling on this
      // level" (>3 attempts); before this co-update it only counted
      // wins, so the branch was dead code.
      performanceMetrics: {
        ...prev.performanceMetrics,
        levelAttempts: {
          ...prev.performanceMetrics.levelAttempts,
          [level]: (prev.performanceMetrics.levelAttempts[level] || 0) + 1,
        },
      },
    }));
  };

  const needsBreather = (): boolean => {
    const data = getData();
    return data.consecutiveFailures >= 2 || data.lastLevelStars === 1;
  };

  const checkAchievements = (_extraData?: Record<string, unknown>): CeremonyItem[] => {
    const data = getData();
    const ceremonies: CeremonyItem[] = [];
    const valueMap: Record<string, number> = {
      word_finder: data.wordsFoundTotal,
      puzzle_solver: data.puzzlesSolved,
      perfect_player: data.perfectSolves,
      high_scorer: data.totalScore,
      streak_master: data.streaks.currentStreak,
      daily_devotee: data.dailyCompleted.length,
      // "Complete Word Atlas pages" — pages whose every word has been
      // collected. Counting keys counted pages merely TOUCHED (the key is
      // created on the first word found), which handed out tiers for
      // finding one word per page.
      atlas_scholar: ATLAS_PAGES.filter(
        (page) => (data.collections.atlasPages[page.id]?.length ?? 0) >= page.words.length,
      ).length,
      // "Collect rare tiles" — TOTAL tiles, not distinct letters. The map
      // is keyed A–Z, so counting keys capped the metric at 26: gold
      // (threshold 52) was mathematically unreachable and silver meant
      // "one of every letter". Same summed formula as the title_collector
      // unlock in PlayerContext.
      tile_collector: Object.values(data.collections.rareTiles).reduce(
        (sum, count) => sum + (count || 0),
        0,
      ),
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
          // A player who jumps straight past a tier (e.g. a big score in one
          // puzzle) still EARNED it. These used to be recorded as owned
          // without being returned, so their rewards silently skipped —
          // return them like any other earn so the caller grants them.
          ceremonies.push({
            type: 'achievement',
            data: {
              id: ltId,
              icon: achievement.icon,
              name: achievement.name,
              description: achievement.description,
              tier: lt.level,
              reward: lt.reward,
            },
          });
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

  /**
   * Count a failure (stuck / timeout / perfect-broken) against the
   * adaptive-difficulty feed. WITHOUT this call the adjuster's
   * `levelAttempts[level]` never exceeded 1 — each win bumped the
   * counter once and the player moved on, so the
   * `recentMultiAttemptLevels > 3` struggling branch was dead code.
   * Failures now bump the counter so a player who's stuck on a level
   * for 4+ attempts triggers the "easier" path on the next puzzle
   * load, even if they haven't won recently enough to tank their
   * averageStars below 2.0.
   */
  const recordPerformanceFailure = (level: number): void => {
    setData((prev) => ({
      ...prev,
      performanceMetrics: {
        ...prev.performanceMetrics,
        levelAttempts: {
          ...prev.performanceMetrics.levelAttempts,
          [level]: (prev.performanceMetrics.levelAttempts[level] || 0) + 1,
        },
      },
    }));
  };

  return {
    recordPuzzleComplete,
    recordDailyComplete,
    updateStreak,
    useGraceDay,
    useStreakShield,
    activateStreakShield,
    restoreBrokenStreak,
    dismissStreakBreak,
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
    recordPerformanceFailure,
  };
}
