/**
 * rewardWiring.test.ts — call-site contracts of useRewardWiring's
 * handleComplete, driven directly with mocked player/economy facades.
 *
 * Pins the August 2026 reward-wiring fixes:
 *  - non-classic completions never write the global classic ladder
 *  - daily rewards pay once per daily board (replays earn base solve only)
 *  - Premium Pass owners are credited the premium mastery lane
 *  - the win streak breaks on wins that follow losses
 *  - lastLevelStars is recorded on every win, not just recovery wins
 *  - checkAchievements receives POST-completion counters via extraData
 *  - seasonal 'modes_played' steps count distinct modes, not puzzles
 *
 * useCallback is mocked to identity so the hook body runs as a plain
 * function — no renderer needed (the repo has no @testing-library dep).
 */

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useCallback: (fn: unknown) => fn,
}));
jest.mock('../../services/analytics', () => ({
  analytics: {
    trackPuzzleComplete: jest.fn(),
    trackDifficultyTelemetry: jest.fn(),
    updateUserProperties: jest.fn(),
    logEvent: jest.fn(),
    trackDailyChallengeComplete: jest.fn(),
    trackFeatureUnlocked: jest.fn(),
    trackAchievementEarned: jest.fn(),
  },
}));
jest.mock('../../services/funnelTracker', () => ({
  funnelTracker: { trackLevelMilestone: jest.fn() },
}));
jest.mock('../../services/softLaunchAnalytics', () => ({
  trackDifficultyPerception: jest.fn(),
}));
jest.mock('../../services/notificationTriggers', () => ({
  triggerStreakReminder: jest.fn(),
  triggerDailyChallengeReminder: jest.fn(),
  triggerFriendBeatScoreNotification: jest.fn(),
}));
jest.mock('../../services/firestore', () => ({
  firestoreService: {
    isAvailable: jest.fn(() => false),
    submitDailyScore: jest.fn(),
    submitWeeklyScore: jest.fn(),
    submitEventScore: jest.fn(),
    recordPuzzleResult: jest.fn(),
    syncPlayerProfile: jest.fn(),
    getFriendScores: jest.fn(),
  },
}));
jest.mock('../../services/crashReporting', () => ({
  crashReporter: { captureException: jest.fn() },
}));
jest.mock('../../services/eventManager', () => ({
  eventManager: {
    getEventMultipliers: jest.fn(() => ({ coins: 1, gems: 1, xp: 1, rareTileChance: 0 })),
    onPuzzleComplete: jest.fn(),
    getProgressSnapshot: jest.fn(() => ({})),
    getActiveEvents: jest.fn(() => []),
    getActiveMultiplierLabel: jest.fn(() => undefined),
  },
}));
jest.mock('../../services/remoteConfig', () => ({
  getRemoteBoolean: jest.fn(() => false),
  getRemoteNumber: jest.fn((key: string) => {
    if (key === 'seasonPassXpPerPuzzle') return 100;
    if (key === 'piggyBankFillPerPuzzle') return 2;
    return 0;
  }),
}));
jest.mock('../../data/economyTuning', () => ({
  puzzleCoinPayout: jest.fn(() => 10),
  perfectClearGems: jest.fn(() => 1),
  // Default: the daily flawless-gem cap has headroom (grant = requested) and
  // the weekly board has not been completed this week. Individual tests
  // override with mockReturnValueOnce.
  claimFlawlessGems: jest.fn((requested: number) => requested),
  claimWeeklyBoardPayout: jest.fn(() => true),
}));
jest.mock('../../data/seasonalQuests', () => ({
  ...jest.requireActual('../../data/seasonalQuests'),
  getCurrentSeasonalQuest: jest.fn(() => ({
    id: 'q_test',
    name: 'Test Quest',
    steps: [
      {
        id: 'q_test_step_1',
        title: 'Explorer',
        description: 'Play different modes',
        icon: 'x',
        trackingKey: 'modes_played',
        target: 4,
        rewardCoins: 0,
        rewardGems: 0,
      },
    ],
  })),
}));

import { useRewardWiring } from '../useRewardWiring';
import { MODE_CONFIGS, ECONOMY } from '../../constants';
import { firestoreService } from '../../services/firestore';
import { claimFlawlessGems, claimWeeklyBoardPayout } from '../../data/economyTuning';

const mockClaimFlawless = claimFlawlessGems as jest.Mock;
const mockClaimWeekly = claimWeeklyBoardPayout as jest.Mock;

const TODAY_UTC = new Date().toISOString().split('T')[0];

function makePlayer(overrides: Record<string, unknown> = {}) {
  return {
    currentLevel: 12,
    highestLevel: 11,
    puzzlesSolved: 20,
    perfectSolves: 2,
    totalStars: 30,
    totalScore: 5000,
    mysteryWheel: { spinsAvailable: 0, puzzlesSinceLastSpin: 0, puzzlesPerFreeSpin: 5, totalSpins: 0, lastJackpotSpin: 0, jackpotPity: 0 },
    modeStats: { classic: { played: 20, bestScore: 900, wins: 20 } } as Record<string, { played: number; bestScore: number; wins: number }>,
    collections: { atlasPages: {}, atlasWordMastery: {}, rareTiles: { A: 1 }, wildcardTiles: 0, seasonalStamps: {} },
    missions: { dailyMissions: [], lastMissionDate: '', missionsCompletedToday: 0 },
    streaks: { currentStreak: 0, bestStreak: 0, lastPlayDate: '', graceDaysUsed: 0, streakShieldAvailable: false, lastShieldDate: '' },
    equippedTitle: '',
    equippedFrame: '',
    unlockedModes: Object.keys(MODE_CONFIGS),
    friendIds: [],
    consecutiveFailures: 0,
    performanceMetrics: { levelAttempts: {} },
    referralCode: '',
    referredBy: null,
    firstPurchaseModalShownAt: 1,
    recordReferralSuccess: jest.fn(async () => false),
    featuresUnlocked: [],
    seasonalQuest: { activeQuestId: null, currentStepIndex: 0, stepProgress: 0, completedQuestIds: [], seasonId: '' },
    modesPlayedThisWeek: [] as string[],
    dailyCompleted: [] as string[],
    flawlessStreak: { currentStreak: 0, bestStreak: 0, lastFlawlessDate: null, rewardsClaimed: [] },
    recordPuzzleComplete: jest.fn(),
    recordModePlay: jest.fn(),
    advanceModeLevel: jest.fn(),
    updateProgress: jest.fn(),
    recordPerformanceMetrics: jest.fn(),
    collectAtlasWord: jest.fn(),
    addRareTile: jest.fn(),
    updateMissionProgress: jest.fn(),
    updateWeeklyGoalProgress: jest.fn(),
    updateSeasonalQuest: jest.fn(),
    updateStreak: jest.fn(),
    recordDailyComplete: jest.fn(),
    queueCeremony: jest.fn(),
    checkFeatureUnlocks: jest.fn(() => []),
    checkAchievements: jest.fn(() => []),
    unlockMode: jest.fn(),
    awardFreeSpin: jest.fn(),
    updateWinStreak: jest.fn(),
    updateFlawlessStreak: jest.fn(),
    collectStamp: jest.fn(),
    unlockDecoration: jest.fn(),
    recordDailyQuestEvent: jest.fn(),
    ...overrides,
  };
}

function makeEconomy(overrides: Record<string, unknown> = {}) {
  return {
    addCoins: jest.fn(),
    addGems: jest.fn(),
    addLibraryPoints: jest.fn(),
    addHintTokens: jest.fn(),
    addPiggyBankGems: jest.fn(),
    addSeasonPassXp: jest.fn(),
    starterPackExpiresAt: 1,
    activateStarterPack: jest.fn(),
    purchaseHistory: [{}],
    isPremiumPassFlag: false,
    ...overrides,
  };
}

function makeNavigation() {
  return { isFocused: jest.fn(() => true), setParams: jest.fn() };
}

function run(
  playerOverrides: Record<string, unknown>,
  economyOverrides: Record<string, unknown>,
  params: Record<string, unknown>,
  stars = 3,
  score = 500,
  perfectRun = false,
) {
  const player = makePlayer(playerOverrides);
  const economy = makeEconomy(economyOverrides);
  const navigation = makeNavigation();
  const handleComplete = useRewardWiring({
    player: player as never,
    economy: economy as never,
    userId: 'u1',
    params,
    navigation,
  }) as unknown as (stars: number, score: number, perfectRun?: boolean) => void;
  handleComplete(stars, score, perfectRun);
  return { player, economy, navigation };
}

function completionData(navigation: ReturnType<typeof makeNavigation>) {
  const call = navigation.setParams.mock.calls.find((c) => c[0]?.completionData);
  return call?.[0].completionData;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('global progression is classic-only', () => {
  it('classic level-bearing wins record global progression', () => {
    const { player } = run({}, {}, { level: 12, mode: 'classic' });
    expect(player.recordPuzzleComplete).toHaveBeenCalledWith(12, 500, 3, false);
  });

  it('non-classic wins never call recordPuzzleComplete, only lifetime counters', () => {
    const { player } = run({}, {}, { level: 40, mode: 'relax' });
    expect(player.recordPuzzleComplete).not.toHaveBeenCalled();
    expect(player.updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({ puzzlesSolved: 21, totalScore: 5500 }),
    );
  });

  it('daily (level 0) wins never write the classic ladder', () => {
    const { player } = run({}, {}, { level: 0, mode: 'daily', isDaily: true });
    expect(player.recordPuzzleComplete).not.toHaveBeenCalled();
    expect(player.updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({ puzzlesSolved: 21 }),
    );
  });

  it('non-classic wins do not level up or pay the late-game level milestone', () => {
    const { player, economy, navigation } = run(
      { currentLevel: 50, highestLevel: 49 },
      {},
      { level: 49, mode: 'relax' },
    );
    const data = completionData(navigation);
    expect(data.leveledUp).toBe(false);
    expect(data.newLevel).toBe(50);
    // Late-game milestone (500c/25g at level%25) must not fire off a mode ladder
    expect(economy.addCoins).not.toHaveBeenCalledWith(500);
    expect(economy.addGems).not.toHaveBeenCalledWith(25);
    expect(player.recordPuzzleComplete).not.toHaveBeenCalled();
  });
});

describe('daily rewards pay once per daily board', () => {
  const dailyParams = { level: 0, mode: 'daily', isDaily: true };

  it('first completion of the day grants base + daily coins/gems, piggy fill, streak, and submits the score', () => {
    const { player, economy } = run({ dailyCompleted: [] }, {}, dailyParams);
    expect(player.recordDailyComplete).toHaveBeenCalledWith(TODAY_UTC);
    expect(economy.addGems).toHaveBeenCalledWith(ECONOMY.dailyCompleteGems);
    // base solve payout: mocked puzzleCoinPayout 10 + 3 stars * starBonus 5
    expect(economy.addCoins).toHaveBeenCalledWith(10 + 3 * ECONOMY.starBonus);
    expect(economy.addCoins).toHaveBeenCalledWith(ECONOMY.dailyCompleteCoins);
    expect(economy.addPiggyBankGems).toHaveBeenCalledWith(2);
    expect(player.updateStreak).toHaveBeenCalled();
    expect(player.awardFreeSpin).toHaveBeenCalled();
    expect(player.updateWeeklyGoalProgress).toHaveBeenCalledWith('daily_completed', 1);
    expect(firestoreService.submitDailyScore).toHaveBeenCalledTimes(1);
    // base 100 + 3 stars * 50 + 200 daily kicker
    expect(economy.addSeasonPassXp).toHaveBeenCalledWith(450);
  });

  it('replaying the completed daily pays nothing at all', () => {
    const { player, economy, navigation } = run({ dailyCompleted: [TODAY_UTC] }, {}, dailyParams);
    expect(player.recordDailyComplete).not.toHaveBeenCalled();
    // No currency of any kind: base coins, daily coins/gems, flawless gems,
    // piggy fill and season-pass XP are all first-completion-only.
    expect(economy.addCoins).not.toHaveBeenCalled();
    expect(economy.addGems).not.toHaveBeenCalled();
    expect(economy.addPiggyBankGems).not.toHaveBeenCalled();
    expect(economy.addSeasonPassXp).not.toHaveBeenCalled();
    // No counter-derived progress: the lifetime solve counter stays frozen,
    // so mastery tiers and the every-N-puzzles wheel spin cannot be farmed.
    expect(player.awardFreeSpin).not.toHaveBeenCalled();
    const solvedWrites = player.updateProgress.mock.calls.filter(
      (c) => 'puzzlesSolved' in (c[0] ?? {}),
    );
    expect(solvedWrites).toHaveLength(0);
    expect(player.updateStreak).not.toHaveBeenCalled();
    expect(player.updateWeeklyGoalProgress).not.toHaveBeenCalledWith('daily_completed', 1);
    expect(firestoreService.submitDailyScore).not.toHaveBeenCalled();
    const data = completionData(navigation);
    expect(data.totalCoinsAwarded).toBe(0);
    expect(data.totalGemsAwarded).toBe(0);
  });

  it('a flawless daily replay earns no flawless gems either', () => {
    const { economy } = run({ dailyCompleted: [TODAY_UTC] }, {}, dailyParams, 3, 500, true);
    expect(mockClaimFlawless).not.toHaveBeenCalled();
    expect(economy.addGems).not.toHaveBeenCalled();
  });
});

describe('weekly board pays once per week', () => {
  const weeklyParams = { level: 0, mode: 'weekly' };

  it('first completion of the week pays base rewards and claims the week', () => {
    const { player, economy } = run({}, {}, weeklyParams);
    expect(mockClaimWeekly).toHaveBeenCalledTimes(1);
    expect(economy.addCoins).toHaveBeenCalledWith(10 + 3 * ECONOMY.starBonus);
    expect(economy.addPiggyBankGems).toHaveBeenCalledWith(2);
    // base 100 + 3 stars * 50 (no daily kicker on the weekly)
    expect(economy.addSeasonPassXp).toHaveBeenCalledWith(250);
    expect(player.awardFreeSpin).toHaveBeenCalled();
  });

  it('replaying the weekly board pays nothing but still submits the score', () => {
    mockClaimWeekly.mockReturnValueOnce(false);
    const { player, economy, navigation } = run({}, {}, weeklyParams);
    expect(economy.addCoins).not.toHaveBeenCalled();
    expect(economy.addGems).not.toHaveBeenCalled();
    expect(economy.addPiggyBankGems).not.toHaveBeenCalled();
    expect(economy.addSeasonPassXp).not.toHaveBeenCalled();
    expect(player.awardFreeSpin).not.toHaveBeenCalled();
    const solvedWrites = player.updateProgress.mock.calls.filter(
      (c) => 'puzzlesSolved' in (c[0] ?? {}),
    );
    expect(solvedWrites).toHaveLength(0);
    // Leaderboard submission is deliberately unaffected — score improvement
    // is the one legitimate reason to replay the shared board.
    expect(firestoreService.submitWeeklyScore).toHaveBeenCalledTimes(1);
    expect(completionData(navigation).totalCoinsAwarded).toBe(0);
  });

  it('non-shared modes never consult the weekly gate', () => {
    run({}, {}, { level: 12, mode: 'classic' });
    expect(mockClaimWeekly).not.toHaveBeenCalled();
  });
});

describe('flawless gems flow through the daily cap', () => {
  // Level 13 deliberately: no EARLY_GAME_BONUSES entry and no mastery
  // crossing at the default 20 puzzlesSolved, so every addGems call below is
  // attributable to the flawless grant alone.
  const classicParams = { level: 13, mode: 'classic' };

  it('credits exactly what the cap allows and tallies the same figure', () => {
    const { economy, navigation } = run({}, {}, classicParams, 3, 500, true);
    // requested = round(perfectClearGems() * gemBonusFactor) = 1
    expect(mockClaimFlawless).toHaveBeenCalledWith(1);
    expect(economy.addGems).toHaveBeenCalledWith(1);
    expect(completionData(navigation).totalGemsAwarded).toBe(1);
  });

  it('grants nothing once the daily cap is spent', () => {
    mockClaimFlawless.mockReturnValueOnce(0);
    const { economy, navigation } = run({}, {}, classicParams, 3, 500, true);
    expect(economy.addGems).not.toHaveBeenCalled();
    expect(completionData(navigation).totalGemsAwarded).toBe(0);
  });

  it('non-flawless completions never touch the cap', () => {
    run({}, {}, classicParams, 3, 500, false);
    expect(mockClaimFlawless).not.toHaveBeenCalled();
  });
});

describe('mastery premium lane', () => {
  // puzzlesSolved 4 -> XP 400 -> 500 crosses tier 1
  // tier 1: free {100c, 0g, 1 hint}, premium {200c, 5g, 2 hints}
  // Level 13 deliberately: it carries no EARLY_GAME_BONUSES entry, so every
  // gem/hint call below is attributable to the mastery lanes alone.
  const crossing = { puzzlesSolved: 4, totalScore: 0, totalStars: 0 };

  it('free lane only without the Premium Pass', () => {
    const { economy } = run(crossing, { isPremiumPassFlag: false }, { level: 13, mode: 'classic' });
    expect(economy.addCoins).toHaveBeenCalledWith(100);
    expect(economy.addHintTokens).toHaveBeenCalledWith(1);
    expect(economy.addCoins).not.toHaveBeenCalledWith(200);
    expect(economy.addGems).not.toHaveBeenCalledWith(5);
    expect(economy.addHintTokens).not.toHaveBeenCalledWith(2);
  });

  it('credits the premium lane too when the Premium Pass is owned', () => {
    const { economy } = run(crossing, { isPremiumPassFlag: true }, { level: 13, mode: 'classic' });
    expect(economy.addCoins).toHaveBeenCalledWith(100);
    expect(economy.addCoins).toHaveBeenCalledWith(200);
    expect(economy.addGems).toHaveBeenCalledWith(5);
    expect(economy.addHintTokens).toHaveBeenCalledWith(1);
    expect(economy.addHintTokens).toHaveBeenCalledWith(2);
  });
});

describe('win streak breaks on wins that follow losses', () => {
  it('resets then credits when losses landed since the last win', () => {
    const { player } = run({ consecutiveFailures: 2 }, {}, { level: 12, mode: 'classic' });
    expect(player.updateWinStreak.mock.calls).toEqual([[false], [true]]);
  });

  it('only credits on a clean consecutive win', () => {
    const { player } = run({ consecutiveFailures: 0 }, {}, { level: 12, mode: 'classic' });
    expect(player.updateWinStreak.mock.calls).toEqual([[true]]);
  });
});

describe('lastLevelStars is recorded on every win', () => {
  it('writes stars with no prior failure (and leaves the counter alone)', () => {
    const { player } = run({ consecutiveFailures: 0 }, {}, { level: 12, mode: 'classic' }, 3);
    const call = player.updateProgress.mock.calls.find((c) => 'lastLevelStars' in (c[0] ?? {}));
    expect(call?.[0]).toEqual({ lastLevelStars: 3 });
  });

  it('writes stars and clears the failure counter on a recovery win', () => {
    const { player } = run({ consecutiveFailures: 2 }, {}, { level: 12, mode: 'classic' }, 1);
    expect(player.updateProgress).toHaveBeenCalledWith({ lastLevelStars: 1, consecutiveFailures: 0 });
  });
});

describe('achievements see post-completion counters', () => {
  it('passes the +1/post-completion values through extraData', () => {
    const { player } = run({}, {}, { level: 12, mode: 'classic' }, 3, 500);
    expect(player.checkAchievements).toHaveBeenCalledWith(
      expect.objectContaining({
        puzzle_solver: 21,
        high_scorer: 5500,
        star_collector: 33,
        perfect_player: 2,
        level_climber: 12,
      }),
    );
  });

  it('non-classic wins do not project star or level growth', () => {
    const { player } = run({}, {}, { level: 40, mode: 'relax' }, 3, 500);
    expect(player.checkAchievements).toHaveBeenCalledWith(
      expect.objectContaining({ star_collector: 30, level_climber: 11, puzzle_solver: 21 }),
    );
  });
});

describe("seasonal 'modes_played' steps count distinct modes", () => {
  const questState = {
    activeQuestId: 'q_test',
    currentStepIndex: 0,
    stepProgress: 0,
    completedQuestIds: [],
    seasonId: '',
  };

  it('increments when the mode is new this week and records it', () => {
    const { player } = run(
      { seasonalQuest: questState, modesPlayedThisWeek: [] },
      {},
      { level: 12, mode: 'classic' },
    );
    expect(player.updateSeasonalQuest).toHaveBeenCalledWith({ stepProgress: 1 });
    expect(player.updateProgress).toHaveBeenCalledWith({ modesPlayedThisWeek: ['classic'] });
  });

  it('does not increment for a repeat mode', () => {
    const { player } = run(
      { seasonalQuest: questState, modesPlayedThisWeek: ['classic'] },
      {},
      { level: 12, mode: 'classic' },
    );
    expect(player.updateSeasonalQuest).not.toHaveBeenCalled();
  });
});

// ─── VIP 2× XP boost (Aug 2026 — the perk was advertised on every vip_* SKU
// and rendered in the shop's benefit list, but never applied anywhere) ───────
describe('VIP 2x XP boost composition', () => {
  const classicParams = { level: 12, mode: 'classic' };

  it('non-VIP baseline: base 100 + 3 stars * 50 with no multiplier', () => {
    const { economy } = run({}, { isVip: false }, classicParams);
    expect(economy.addSeasonPassXp).toHaveBeenCalledWith(250);
  });

  it('an active VIP subscription doubles season-pass XP', () => {
    const { economy } = run({}, { isVip: true }, classicParams);
    expect(economy.addSeasonPassXp).toHaveBeenCalledWith(500);
  });

  it('VIP composes multiplicatively with prestige under the MAX_BONUS_FACTOR 5.0 cap', () => {
    // Prestige level 5 alone is a 3.0x XP multiplier; x2 VIP = 6.0, which
    // must clamp to the shared 5.0 ceiling: (100 + 150) * 5 = 1250.
    const prestige = { prestigeLevel: 5, permanentBonuses: [] as string[] };
    const { economy } = run({ prestige }, { isVip: true }, classicParams);
    expect(economy.addSeasonPassXp).toHaveBeenCalledWith(1250);

    // Sanity: without VIP the same prestige pays 3.0x = 750, proving the
    // clamp above came from composing the two channels.
    const { economy: economyNoVip } = run({ prestige }, { isVip: false }, classicParams);
    expect(economyNoVip.addSeasonPassXp).toHaveBeenCalledWith(750);
  });

  it('VIP does not touch coin or gem payouts (XP-only perk)', () => {
    const { economy: vip } = run({}, { isVip: true }, classicParams);
    const { economy: nonVip } = run({}, { isVip: false }, classicParams);
    expect(vip.addCoins).toHaveBeenCalledWith(10 + 3 * ECONOMY.starBonus);
    expect(nonVip.addCoins).toHaveBeenCalledWith(10 + 3 * ECONOMY.starBonus);
  });
});
