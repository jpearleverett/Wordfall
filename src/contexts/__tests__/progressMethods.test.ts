/**
 * createProgressMethods — progression rewards batch regression pins.
 *
 * These drive the REAL implementation over a plain state object (the
 * provider itself can't render in this environment, but the method factory
 * is pure): weekly-goal rewards queue paying ceremonies, a purchased streak
 * shield never expires and counts the comeback day, a paid streak restore
 * never discards a played day, the missions panel can actually complete,
 * and achievement metrics measure what their names say.
 */
import { createProgressMethods, PlayerProgressData } from '../PlayerProgressContext';
import { ceremonyEconomyGrant } from '../../utils/ceremonyGrants';
import { SEASONAL_QUESTS } from '../../data/seasonalQuests';
import { ATLAS_PAGES } from '../../data/collections';

type TestState = PlayerProgressData & { tooltipsShown: string[] };

const isoDaysAgo = (n: number): string =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

function baseState(): TestState {
  return {
    currentLevel: 1,
    highestLevel: 0,
    totalScore: 0,
    puzzlesSolved: 0,
    perfectSolves: 0,
    currentChapter: 1,
    starsByLevel: {},
    totalStars: 0,
    dailyCompleted: [],
    dailyLoginDates: [],
    loginCycleDay: 0,
    lastLoginRewardClaimDate: null,
    streaks: {
      currentStreak: 0,
      bestStreak: 0,
      lastPlayDate: '',
      graceDaysUsed: 0,
      streakShieldAvailable: false,
      lastShieldDate: '',
      recentBreak: null,
    },
    missions: { dailyMissions: [], lastMissionDate: '', missionsCompletedToday: 0 },
    achievementIds: [],
    featuresUnlocked: [],
    onboardingMilestones: [],
    weeklyGoals: null,
    pendingCeremonies: [],
    failCountByLevel: {},
    consecutiveFailures: 0,
    lastLevelStars: 0,
    lastBreatherOfferedAt: null,
    wordsFoundTotal: 0,
    modesPlayedThisWeek: [],
    unlockedCosmetics: [],
    restoredWings: [],
    collections: { atlasPages: {}, rareTiles: {} },
    modeStats: {},
    performanceMetrics: {
      levelAttempts: {},
      averageStars: 0,
      averageCompletionTime: 0,
      consecutiveThreeStars: 0,
      recentStars: [],
      recentCompletionTimes: [],
    },
    lastActiveDate: '',
    comebackRewardsClaimed: [],
    tooltipsShown: [],
  };
}

function harness(overrides: Partial<TestState> = {}) {
  let state: TestState = { ...baseState(), ...overrides };
  const setData = (updater: (prev: TestState) => TestState): void => {
    state = updater(state);
  };
  const methods = createProgressMethods<TestState>(setData, () => state);
  return { methods, get state() { return state; } };
}

const goal = (over: Partial<{ templateId: string; trackingKey: string; target: number; progress: number; completed: boolean; reward: { coins: number; gems: number } }> = {}) => ({
  templateId: 'weekly_puzzles_20',
  description: 'Solve 20 puzzles this week',
  target: 20,
  progress: 0,
  completed: false,
  trackingKey: 'puzzles_solved',
  reward: { coins: 1000, gems: 20 },
  ...over,
});

describe('weekly goal completion queues its displayed reward', () => {
  it('queues one paying ceremony per completed goal, exactly once', () => {
    const h = harness({
      weeklyGoals: {
        goals: [goal({ target: 1 }), goal({ templateId: 'weekly_stars_15', trackingKey: 'stars_earned', target: 15 })],
        weekStart: '2026-08-17',
        allCompleteBonus: { coins: 500, gems: 15 },
      },
    });
    h.methods.updateWeeklyGoalProgress('puzzles_solved', 1);
    expect(h.state.weeklyGoals!.goals[0].completed).toBe(true);
    expect(h.state.pendingCeremonies).toHaveLength(1);
    const ceremony = h.state.pendingCeremonies[0];
    expect(ceremony.type).toBe('quest_step_complete');
    expect(ceremony.data.rewardCoins).toBe(1000);
    expect(ceremony.data.rewardGems).toBe(20);
    // The credit the player receives at pop is exactly the panel's numbers.
    expect(ceremonyEconomyGrant(ceremony)).toEqual({ coins: 1000, gems: 20, hintTokens: 0, rareTile: false });
    // A completed goal cannot pay twice.
    h.methods.updateWeeklyGoalProgress('puzzles_solved', 1);
    expect(h.state.pendingCeremonies).toHaveLength(1);
  });

  it('completing the LAST goal also queues the all-complete bonus, once', () => {
    const h = harness({
      weeklyGoals: {
        goals: [goal({ target: 1 })],
        weekStart: '2026-08-17',
        allCompleteBonus: { coins: 500, gems: 15 },
      },
    });
    h.methods.updateWeeklyGoalProgress('puzzles_solved', 1);
    expect(h.state.pendingCeremonies).toHaveLength(2);
    const bonus = h.state.pendingCeremonies[1];
    expect(bonus.data.weeklyGoalId).toBe('weekly_all_complete');
    expect(ceremonyEconomyGrant(bonus)).toEqual({ coins: 500, gems: 15, hintTokens: 0, rareTile: false });
    h.methods.updateWeeklyGoalProgress('puzzles_solved', 5);
    expect(h.state.pendingCeremonies).toHaveLength(2);
  });
});

describe('streak shield', () => {
  const shieldState = (over: Partial<TestState['streaks']> = {}) => ({
    streaks: {
      ...baseState().streaks,
      currentStreak: 10,
      bestStreak: 10,
      lastPlayDate: isoDaysAgo(2),
      streakShieldAvailable: true,
      lastGraceDate: isoDaysAgo(1), // grace on cooldown → shield branch
      ...over,
    },
  });

  it('a shield bought >72h ago still protects the streak and is consumed', () => {
    const h = harness(shieldState({ lastShieldDate: isoDaysAgo(5) }));
    h.methods.updateStreak();
    // Old code: shieldFresh=false → streak reset to 1 with the paid shield
    // still flagged true forever (blocking every future re-offer).
    expect(h.state.streaks.currentStreak).toBe(11);
    expect(h.state.streaks.streakShieldAvailable).toBe(false);
  });

  it('the paid path counts the comeback day like free grace does', () => {
    const h = harness(shieldState({ lastShieldDate: isoDaysAgo(1) }));
    h.methods.updateStreak();
    // Old code preserved 10 — one day behind what grace grants for the
    // identical miss.
    expect(h.state.streaks.currentStreak).toBe(11);
    expect(h.state.streaks.streakShieldAvailable).toBe(false);
  });
});

describe('restoreBrokenStreak', () => {
  it('same-day restore yields prevStreak + break-day play', () => {
    const h = harness({
      streaks: {
        ...baseState().streaks,
        currentStreak: 1,
        bestStreak: 10,
        lastPlayDate: isoDaysAgo(0),
        recentBreak: { prevStreak: 10, brokenAtMs: Date.now() - 3600 * 1000 },
      },
    });
    expect(h.methods.restoreBrokenStreak()).toBe(11);
    expect(h.state.streaks.currentStreak).toBe(11);
    expect(h.state.streaks.recentBreak).toBeNull();
  });

  it('next-day restore keeps the already-counted played day', () => {
    // Break on Monday (streak reset to 1), app killed with the modal
    // unaddressed; Tuesday's mount-effect updateStreak made it 2 before the
    // offer was paid. The restore must produce 12, not overwrite to 11.
    const h = harness({
      streaks: {
        ...baseState().streaks,
        currentStreak: 2,
        bestStreak: 10,
        lastPlayDate: isoDaysAgo(0),
        recentBreak: { prevStreak: 10, brokenAtMs: Date.now() - 10 * 3600 * 1000 },
      },
    });
    expect(h.methods.restoreBrokenStreak()).toBe(12);
    expect(h.state.streaks.currentStreak).toBe(12);
    expect(h.state.streaks.bestStreak).toBe(12);
  });
});

describe('daily missions', () => {
  it('updateMissionProgress flips completed at target and counts it once', () => {
    const h = harness({
      missions: {
        dailyMissions: [{ id: 'solve_3_puzzles', progress: 2, completed: false }],
        lastMissionDate: isoDaysAgo(0),
        missionsCompletedToday: 0,
      },
    });
    h.methods.updateMissionProgress('solve_3_puzzles', 3);
    expect(h.state.missions.dailyMissions[0].completed).toBe(true);
    expect(h.state.missions.missionsCompletedToday).toBe(1);
    h.methods.updateMissionProgress('solve_3_puzzles', 4);
    expect(h.state.missions.missionsCompletedToday).toBe(1);
  });

  it('only generates templates that useRewardWiring actually feeds', () => {
    const fs = require('fs');
    const path = require('path');
    const wiring = fs.readFileSync(
      path.join(__dirname, '../../hooks/useRewardWiring.ts'),
      'utf8',
    );
    const h = harness();
    h.methods.generateDailyMissions();
    expect(h.state.missions.dailyMissions).toHaveLength(3);
    for (const mission of h.state.missions.dailyMissions) {
      // 'collect_rare_tile' and 'play_5_minutes' had no progress wiring at
      // all — a day drawing one showed a bar frozen at the 2% minimum.
      expect(wiring).toContain(`'${mission.id}'`);
    }
  });
});

describe('achievement metrics measure what their names say', () => {
  it('tile_collector counts total tiles, so gold (52) is reachable', () => {
    const h = harness({
      collections: { atlasPages: {}, rareTiles: { A: 30, B: 22 } },
    });
    const earned = h.methods.checkAchievements()
      .filter((c) => String(c.data.id).startsWith('tile_collector'));
    // 52 total across 2 letters: the distinct-letter metric read 2 (no
    // tier); the summed metric awards bronze, silver, and gold.
    expect(earned.map((c) => c.data.id).sort()).toEqual([
      'tile_collector_bronze',
      'tile_collector_gold',
      'tile_collector_silver',
    ]);
  });

  it('atlas_scholar counts COMPLETED pages, not touched ones', () => {
    const atlasPages: Record<string, string[]> = {};
    // Three fully-completed pages…
    for (const page of ATLAS_PAGES.slice(0, 3)) {
      atlasPages[page.id] = [...page.words];
    }
    // …and five merely touched ones (one word each).
    for (const page of ATLAS_PAGES.slice(3, 8)) {
      atlasPages[page.id] = [page.words[0]];
    }
    const h = harness({ collections: { atlasPages, rareTiles: {} } });
    const earned = h.methods.checkAchievements()
      .filter((c) => String(c.data.id).startsWith('atlas_scholar'));
    // Touched-count read 8 → bronze+silver; completed-count reads 3 → bronze.
    expect(earned.map((c) => c.data.id)).toEqual(['atlas_scholar_bronze']);
  });
});

describe('seasonal quest final reward at pop time', () => {
  const quest = SEASONAL_QUESTS[0];
  const lastIndex = quest.steps.length - 1;
  const finalStepCeremony = {
    type: 'quest_step_complete' as const,
    data: {
      questId: quest.id,
      stepIndex: lastIndex,
      rewardCoins: quest.steps[lastIndex].rewardCoins,
      rewardGems: quest.steps[lastIndex].rewardGems,
    },
  };

  it('popping the final-step ceremony unlocks the finalReward cosmetic', () => {
    const h = harness({ pendingCeremonies: [finalStepCeremony] });
    const popped = h.methods.popCeremony();
    expect(popped).toBe(finalStepCeremony);
    expect(h.state.unlockedCosmetics).toContain(quest.finalReward.cosmetic!.id);
    expect(h.state.pendingCeremonies).toHaveLength(0);
  });

  it('is idempotent for an already-owned frame and inert for non-final steps', () => {
    const h = harness({
      unlockedCosmetics: [quest.finalReward.cosmetic!.id],
      pendingCeremonies: [
        finalStepCeremony,
        { type: 'quest_step_complete' as const, data: { questId: quest.id, stepIndex: 0, rewardCoins: 200, rewardGems: 5 } },
      ],
    });
    h.methods.popCeremony();
    h.methods.popCeremony();
    expect(h.state.unlockedCosmetics).toEqual([quest.finalReward.cosmetic!.id]);
  });
});

describe('procedural wing ceremonies past level 600', () => {
  const CURATED_WINGS = [
    'arts', 'elements', 'history', 'mythology', 'nature', 'ocean', 'science', 'space',
  ];

  it('completing the first procedural wing (chapters 41-45) queues its ceremony', () => {
    // Level 675 is the last level of chapter 45 (procedural wing 0's boss
    // finale). Completing it moves activeChapter to 46, which must mark
    // procedural_0 done — the static CHAPTERS filter froze wing ceremonies
    // at L600 for the deepest cohort.
    // totalStars is recomputed from starsByLevel inside the method, so the
    // star gate needs real per-level stars, not a totalStars override.
    const manyStars = Object.fromEntries(
      Array.from({ length: 674 }, (_, i) => [i + 1, 3]),
    );
    const h = harness({
      currentLevel: 675,
      highestLevel: 674,
      starsByLevel: manyStars,
      restoredWings: [...CURATED_WINGS],
    });
    h.methods.recordPuzzleComplete(675, 500, 3, false);
    expect(h.state.restoredWings).toContain('procedural_0');
    const wing = h.state.pendingCeremonies.find(
      (c: { type: string }) => c.type === 'wing_complete',
    ) as { type: string; data: { wingId: string; wingName: string; reward: { coins: number; gems: number } } };
    expect(wing).toBeDefined();
    expect(wing.data.wingId).toBe('procedural_0');
    expect(wing.data.wingName).toBe('Endless Wing 1');
    expect(wing.data.reward).toEqual({ coins: 1000, gems: 25 });
  });

  it('mid-wing procedural levels queue nothing new', () => {
    const h = harness({
      currentLevel: 662,
      highestLevel: 661,
      starsByLevel: Object.fromEntries(Array.from({ length: 661 }, (_, i) => [i + 1, 3])),
      restoredWings: [...CURATED_WINGS],
    });
    h.methods.recordPuzzleComplete(662, 500, 3, false);
    expect(h.state.restoredWings).not.toContain('procedural_0');
    expect(h.state.pendingCeremonies.filter((c: { type: string }) => c.type === 'wing_complete')).toHaveLength(0);
  });
});
