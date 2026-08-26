import { useCallback } from 'react';
import { Board, CeremonyItem, Difficulty, GameMode, VictorySummaryItem } from '../types';
import { SeasonalQuestState, getCurrentSeasonalQuest } from '../data/seasonalQuests';
import {
  COLORS,
  ECONOMY,
  COLLECTION,
  MODE_CONFIGS,
  FEATURE_UNLOCK_SCHEDULE,
  STAR_MILESTONES,
  PERFECT_MILESTONES,
  MILESTONE_DECORATIONS,
  getScheduledLevelBonus,
  STARTER_PACK_DELAY_PUZZLES,
} from '../constants';
import { ATLAS_PAGES, getCurrentSeasonAlbum } from '../data/collections';
import { generateShareText } from '../utils/shareGenerator';
import { getMasteryTierForXP, MASTERY_REWARDS } from '../data/masteryRewards';
import { eventManager } from '../services/eventManager';
import {
  getWeekendWindow,
  tournamentEventId,
  weekendTournamentEnabled,
} from '../data/weekendTournament';
import { DailyQuestEvent, getQuestTemplate } from '../data/dailyQuests';
import { analytics } from '../services/analytics';
import { funnelTracker } from '../services/funnelTracker';
import { trackDifficultyPerception } from '../services/softLaunchAnalytics';
import {
  triggerStreakReminder,
  triggerDailyChallengeReminder,
  triggerFriendBeatScoreNotification,
} from '../services/notificationTriggers';
import { firestoreService } from '../services/firestore';
import { crashReporter } from '../services/crashReporting';
import { getTitleLabel, computeEquippedBonuses } from '../data/cosmetics';
import {
  getPrestigeCoinMultiplier,
  getPrestigeGemMultiplier,
  getPrestigeRareTileBonus,
  getPrestigeXpMultiplier,
} from '../data/prestigeSystem';
import { getRemoteBoolean, getRemoteNumber } from '../services/remoteConfig';
import {
  puzzleCoinPayout,
  perfectClearGems,
  claimFlawlessGems,
  claimWeeklyBoardPayout,
} from '../data/economyTuning';

/** Tier 6 B3 — defensive ceiling on the composed (cosmetic × prestige) bonus
 *  factor so a level-5 whale with a legendary frame doesn't accidentally
 *  produce 8× XP gains. Observed from analytics after launch and tightened if
 *  the real distribution warrants. */
const MAX_BONUS_FACTOR = 5.0;

// Helper: get difficulty name for a level
function getDifficultyForLevel(level: number): string {
  if (level <= 5) return 'Easy';
  if (level <= 15) return 'Medium';
  if (level <= 30) return 'Hard';
  return 'Expert';
}

// Helper: detect difficulty transition between two levels
function detectDifficultyTransition(oldLevel: number, newLevel: number): { from: string; to: string } | null {
  const thresholds = [
    { at: 6, from: 'Easy', to: 'Medium' },
    { at: 16, from: 'Medium', to: 'Hard' },
    { at: 31, from: 'Hard', to: 'Expert' },
  ];
  for (const t of thresholds) {
    if (oldLevel < t.at && newLevel >= t.at) {
      return { from: t.from, to: t.to };
    }
  }
  return null;
}

export function playerStageFromPuzzles(puzzlesSolved: number): 'new' | 'early' | 'established' | 'veteran' {
  if (puzzlesSolved <= 2) return 'new';
  if (puzzlesSolved <= 10) return 'early';
  if (puzzlesSolved <= 30) return 'established';
  return 'veteran';
}

/** The player and economy context interfaces expected by useRewardWiring */
interface PlayerContextLike {
  currentLevel: number;
  highestLevel: number;
  puzzlesSolved: number;
  perfectSolves: number;
  totalStars: number;
  totalScore: number;
  mysteryWheel: { spinsAvailable: number; puzzlesSinceLastSpin: number; puzzlesPerFreeSpin: number; totalSpins: number; lastJackpotSpin: number; jackpotPity: number };
  modeStats: Record<string, { played: number; bestScore: number; wins: number }>;
  collections: {
    atlasPages: Record<string, string[]>;
    atlasWordMastery: Record<string, number>;
    rareTiles: Record<string, number>;
    wildcardTiles: number;
    seasonalStamps: Record<string, number[]>;
  };
  missions: { dailyMissions: Array<{ id: string; progress: number; completed: boolean }>; lastMissionDate: string; missionsCompletedToday: number };
  /** Distinct modes played since the last weekly reset (initWeeklyGoals).
   *  Optional so pre-existing saves that hydrated without it stay safe. */
  modesPlayedThisWeek?: string[];
  streaks: { currentStreak: number; bestStreak: number; lastPlayDate: string; graceDaysUsed: number; streakShieldAvailable: boolean; lastShieldDate: string };
  equippedTitle: string;
  equippedFrame: string;
  unlockedModes: string[];
  friendIds: string[];
  consecutiveFailures: number;
  performanceMetrics: any;
  referralCode: string;
  referredBy: string | null;
  referralRewardGranted?: boolean;
  /** Null until the first-purchase hard modal has rendered exactly once. */
  firstPurchaseModalShownAt: number | null;
  recordReferralSuccess: () => Promise<boolean>;
  featuresUnlocked: string[];
  seasonalQuest: SeasonalQuestState;
  /** Tier 6 B3 — prestige state feeds the permanent-bonus multiplier. */
  prestige?: {
    prestigeLevel: number;
    totalPrestiges: number;
    permanentBonuses: string[];
  };

  recordPuzzleComplete: (level: number, score: number, stars: number, isPerfect: boolean) => void;
  recordModePlay: (modeId: string, score: number, isWin: boolean) => void;
  advanceModeLevel: (modeId: string) => void;
  updateProgress: (updates: any) => void;
  recordPerformanceMetrics: (level: number, stars: number, completionTimeSeconds: number) => void;
  collectAtlasWord: (pageId: string, word: string) => void;
  addRareTile: (letter: string, count?: number) => void;
  updateMissionProgress: (missionId: string, progress: number) => void;
  updateWeeklyGoalProgress: (trackingKey: string, value: number) => void;
  updateSeasonalQuest: (updates: Partial<SeasonalQuestState>) => void;
  updateStreak: () => void;
  recordDailyComplete: (dateString: string) => void;
  /** UTC day strings for dailies already finished, used to skip a redundant reminder. */
  dailyCompleted: string[];
  queueCeremony: (ceremony: CeremonyItem) => void;
  checkFeatureUnlocks: (level: number) => CeremonyItem[];
  checkAchievements: (extraData?: Record<string, unknown>) => CeremonyItem[];
  unlockMode: (modeId: string) => void;
  awardFreeSpin: () => void;
  updateWinStreak: (won: boolean) => void;
  updateFlawlessStreak: (wasFlawless: boolean) => void;
  flawlessStreak: {
    currentStreak: number;
    bestStreak: number;
    lastFlawlessDate: string | null;
    rewardsClaimed: number[];
  };
  collectStamp: (albumId: string, stampIndex: number) => void;
  unlockDecoration: (decorationId: string) => void;
  recordDailyQuestEvent: (event: DailyQuestEvent) => void;
  /** Active quest snapshot — drives the victory quest-progress chip. */
  dailyQuests?: { quests: Array<{ templateId: string; progress: number; claimed: boolean }> };
}

interface EconomyContextLike {
  addCoins: (amount: number) => void;
  addGems: (amount: number) => void;
  addLibraryPoints: (amount: number) => void;
  addHintTokens: (amount: number) => void;
  addPiggyBankGems: (amount: number) => void;
  /** Read-only jar snapshot (pre-fill) — drives the victory piggy chip. */
  piggyBank?: { gems: number };
  addSeasonPassXp: (amount: number) => void;
  starterPackExpiresAt: number;
  activateStarterPack: () => void;
  /** Full purchase history — used to detect non-payer segment for first-purchase offer (only length is read). */
  purchaseHistory: readonly unknown[];
  /** True when the Premium Pass SKU is owned — gates the premium mastery lane. */
  isPremiumPassFlag?: boolean;
  /**
   * True while a VIP subscription is active (EconomyContext's computed
   * `isVip` — commercialEntitlements' isVipSubscriber && not expired).
   * Feeds the advertised "2x XP boost" perk into the XP composition.
   */
  isVip?: boolean;
}

interface UseRewardWiringParams {
  player: PlayerContextLike;
  economy: EconomyContextLike;
  userId: string;
  /** The route params containing board, level, mode, isDaily */
  params: Record<string, any>;
  /** Navigation object for setParams / isFocused */
  navigation: any;
}

export interface CompletionData {
  isFirstWin: boolean;
  leveledUp: boolean;
  newLevel: number;
  difficultyTransition: { from: string; to: string } | null;
  nextLevelPreview: { level: number; difficulty: string } | null;
  shareText: string;
  friendComparison: { beaten: number; total: number };
  eventMultiplierLabel?: string;
  /** Show "come back tomorrow" card for early-game players */
  showTomorrowPreview: boolean;
  /** Tier 2 unlocks embedded inline on the victory screen */
  summaryItems: VictorySummaryItem[];
  /** Total coins awarded this puzzle (for animated tally) */
  totalCoinsAwarded: number;
  /** Total gems awarded this puzzle (for animated tally) */
  totalGemsAwarded: number;
  /** Next feature/mode unlock preview for retention hook */
  nextUnlockPreview: { icon: string; name: string; unlockLevel: number } | null;
}

/**
 * Extracts the massive handleComplete logic from App.tsx.
 * Returns a stable `handleComplete(stars, score, perfectRun)` callback that:
 * - Awards coins/gems/library points
 * - Handles daily completion
 * - Checks rare tile drops
 * - Processes atlas collection
 * - Updates missions and weekly goals
 * - Detects level-ups, difficulty transitions, feature unlocks
 * - Checks achievements, mode unlocks, milestones
 * - Awards mystery wheel spins and updates win streak
 * - Syncs to Firestore
 * - Sets completion data on navigation params
 */
export function useRewardWiring({
  player,
  economy,
  userId,
  params,
  navigation,
}: UseRewardWiringParams) {
  const handleComplete = useCallback((
    stars: number,
    score: number,
    perfectRun: boolean = false,
    completionTimeSeconds: number = 0,
    assists: { hintsUsed: number; undosUsed: number } = { hintsUsed: 0, undosUsed: 0 },
  ) => {
    try {
    const level = params.level || 0;
    const mode = (params.mode || 'classic') as GameMode;
    const isDaily = params.isDaily || false;

    // Capture pre-complete state for level-up detection
    const prevLevel = player.currentLevel;
    const prevHighest = player.highestLevel;
    const isFirstWin = player.puzzlesSolved === 0;

    // Only classic, level-bearing completions advance the GLOBAL progression
    // ladder (starsByLevel / totalStars / currentLevel / highestLevel /
    // chapter / wing state). Every other mode keeps its own independent
    // ladder (advanceModeLevel below), and daily/weekly play at level 0 —
    // recording those globally wrote phantom starsByLevel entries, skipped
    // classic levels wholesale, and paid wing bonuses for wings never played.
    const isClassicProgression = mode === 'classic' && level > 0;
    // One payout per daily board. recordDailyComplete only dedups the date
    // array — the daily board is deterministic all day and freely replayable,
    // so every daily-specific grant below keys off this flag instead.
    const todayUtc = new Date().toISOString().split('T')[0];
    const isFirstDailyToday = isDaily && !(player.dailyCompleted ?? []).includes(todayUtc);
    // The weekly board shares this completion path and is just as
    // deterministic/replayable, but has no profile-side completion array —
    // its first-completion-of-the-week gate lives in the local faucet
    // ledger (data/economyTuning.ts). handleComplete runs exactly once per
    // completion (GameScreen guards double-fires), so claiming here is safe.
    const isWeekly = mode === 'weekly';
    const isFirstWeeklyThisWeek = isWeekly && claimWeeklyBoardPayout();
    // A REPLAY of an already-paid shared board earns nothing: no base coins,
    // no flawless gems, no piggy fill, no season-pass XP, and no advance of
    // any puzzlesSolved-derived reward counter (mastery tiers, wheel-spin
    // progress, stamps). Score submission and analytics still run — the
    // leaderboard paths carry their own dedup.
    const isRepeatBoard = (isDaily && !isFirstDailyToday) || (isWeekly && !isFirstWeeklyThisWeek);
    // How much this completion moves the lifetime solve counter — 0 on a
    // repeat board so replays cannot farm counter-derived rewards.
    const solvedDelta = isRepeatBoard ? 0 : 1;
    // consecutiveFailures increments on every loss (recordFailure) and is
    // cleared below on wins, so a non-zero read here means at least one loss
    // landed since the previous win — the win streak must break before this
    // win is credited (losses themselves never call updateWinStreak).
    const hadFailuresSinceLastWin = player.consecutiveFailures > 0;

    // "Flawless" = no hints, no undos, no shuffle, no wrong-trace (tracked by
    // `perfectRun` on the game state). Distinct from 3 stars, which is a
    // quantitative move-count threshold. A player can earn 3 stars while using
    // one hint; only `perfectRun` counts as flawless.
    const isPerfect = perfectRun;
    const boardData = params.board as Board | undefined;
    const wordsFound = boardData ? boardData.words.length : 0;
    // These three were hardcoded to 0 while completionTimeSeconds sat in
    // scope and assists had simply never been plumbed through — so the
    // primary completion event reported every puzzle as instant, hint-free
    // and undo-free. Any difficulty read built on it was measuring nothing.
    void analytics.trackPuzzleComplete({
      level,
      mode,
      stars,
      duration_seconds: completionTimeSeconds,
      hints_used: assists.hintsUsed,
      undos_used: assists.undosUsed,
      words_found: wordsFound,
      score,
      flawless: perfectRun,
    });
    // Phase 3.5: seed difficulty-tuning dataset. Pair with BigQuery later to
    // retune thresholds.
    void analytics.trackDifficultyTelemetry({
      mode,
      level,
      outcome: 'win',
      stars,
      words_found: wordsFound,
      words_total: wordsFound,
    });
    // Soft-launch difficulty signal. The whole point of a PH/CA soft launch
    // is to find out whether the curve is right before global, and this
    // module's nine track functions had no callers at all — the measurement
    // plan produced zero data. Attempts comes from the adaptive adjuster's
    // own per-level record, which is the same number it uses to decide
    // whether to ease off.
    void trackDifficultyPerception({
      level,
      mode,
      attempts: player.performanceMetrics?.levelAttempts?.[level] ?? 1,
      timeToComplete: completionTimeSeconds,
      hintsUsed: assists.hintsUsed,
      undosUsed: assists.undosUsed,
      deadEndsHit: 0,
      stars,
    });
    void analytics.updateUserProperties({
      // Non-classic modes carry their own ladder's level (or 0) — only
      // classic wins can move the reported global player level.
      player_level: isClassicProgression ? Math.max(level + 1, player.currentLevel) : player.currentLevel,
      total_puzzles_solved: player.puzzlesSolved + solvedDelta,
      player_stage: playerStageFromPuzzles(player.puzzlesSolved + solvedDelta),
      // Tier 6 B3 — attribute every subsequent event to the player's
      // prestige tier for whale-cohort funnel analysis.
      prestige_tier: player.prestige?.prestigeLevel ?? 0,
    });
    if (isClassicProgression) {
      player.recordPuzzleComplete(level, score, stars, isPerfect);
    } else if (isRepeatBoard) {
      // Replay of an already-paid daily/weekly board: the lifetime reward
      // counters stay frozen (puzzlesSolved feeds mastery tiers, stamp
      // milestones and wheel-spin progress; perfectSolves feeds milestones)
      // so the deterministic board cannot be farmed. Score and recency still
      // record — replays are legitimate play, just not paid play.
      player.updateProgress({
        totalScore: player.totalScore + score,
        lastActiveDate: todayUtc,
      });
    } else {
      // Non-classic wins still count toward the lifetime totals everything
      // below (mastery, stamps, achievements, profile sync) reads, but must
      // not touch the classic ladder — recordPuzzleComplete would write this
      // mode's own level number into starsByLevel/currentLevel/highestLevel.
      player.updateProgress({
        puzzlesSolved: player.puzzlesSolved + 1,
        totalScore: player.totalScore + score,
        lastActiveDate: todayUtc,
        ...(isPerfect ? { perfectSolves: player.perfectSolves + 1 } : {}),
      });
    }

    // Daily quest progress — emit O(1) events for active quests. Collected
    // first so the victory-screen quest chip below can compute the SAME
    // post-event progress the async context update will land on (quest
    // tracking used to be completely invisible during play — rewards fired
    // as surprise ceremonies while the only progress UI was a Home card).
    const questEvents: DailyQuestEvent[] = [{ type: 'puzzle_complete' }];
    if (isPerfect) {
      questEvents.push({ type: 'flawless_complete' });
      questEvents.push({ type: 'hint_skipped_puzzle' });
    }
    questEvents.push({ type: 'mode_played', mode });
    if (boardData) {
      for (const w of boardData.words) {
        const len = w.word?.length ?? 0;
        if (len > 0) {
          questEvents.push({ type: 'word_found', value: len });
        }
      }
    }
    for (const event of questEvents) {
      player.recordDailyQuestEvent(event);
    }

    // Capture pre-play mode stats for first-clear detection
    const prevModePlayed = player.modeStats?.[mode]?.played || 0;

    // Record mode play and advance mode level on win
    player.recordModePlay(mode, score, true);
    if (mode !== 'classic') {
      player.advanceModeLevel(mode);
    }

    // Track distinct modes played this week. initWeeklyGoals resets the
    // array on week rollover but nothing populated it, and the seasonal
    // 'modes_played' quest step counted every puzzle as a "new mode".
    const modesThisWeek = player.modesPlayedThisWeek ?? [];
    const isNewModeThisWeek = !modesThisWeek.includes(mode);
    if (isNewModeThisWeek) {
      player.updateProgress({ modesPlayedThisWeek: [...modesThisWeek, mode] });
    }

    // Record the stars actually earned so needsBreather() reads the real
    // previous-level result — this used to be written only on recovery wins
    // (consecutiveFailures > 0), so a post-fail 1-star win pinned the
    // breather config on every later level however cleanly it was won, and
    // a no-fail 1-star scrape never triggered the breather at all. The
    // failure counter still clears on any win.
    player.updateProgress({
      lastLevelStars: stars,
      ...(hadFailuresSinceLastWin ? { consecutiveFailures: 0 } : {}),
    });

    // Update adaptive difficulty metrics with the real completion time
    // (was hard-coded to 0 until April 2026 which zeroed out the
    // averageCompletionTime channel entirely).
    player.recordPerformanceMetrics(level, stars, completionTimeSeconds);

    // Award coins based on difficulty -- apply event multipliers + cosmetic perks
    const difficulty: Difficulty = level <= 5 ? 'easy' : level <= 15 ? 'medium' : level <= 30 ? 'hard' : 'expert';
    const eventMultipliers = eventManager.getEventMultipliers();
    const cosmeticPerksOn = getRemoteBoolean('cosmeticPerksEnabled');
    const cosmeticBonuses = cosmeticPerksOn
      ? computeEquippedBonuses(player.equippedFrame, player.equippedTitle)
      : { coinMultiplier: 0, gemMultiplier: 0, xpMultiplier: 0 };
    // Tier 6 B3 — prestige permanent-bonus multipliers (were dead code
    // before; now stack multiplicatively on top of cosmetics). The
    // composed factor is capped at MAX_BONUS_FACTOR so the most
    // stacked-out whale can't inflate rewards past 5×.
    const prestige = player.prestige;
    const prestigeXp = getPrestigeXpMultiplier(prestige?.prestigeLevel ?? 0);
    const prestigeCoin = getPrestigeCoinMultiplier(prestige?.permanentBonuses ?? []);
    const prestigeGem = getPrestigeGemMultiplier(prestige?.permanentBonuses ?? []);
    const coinBonusFactor = Math.min(
      (1 + (cosmeticBonuses.coinMultiplier ?? 0)) * prestigeCoin,
      MAX_BONUS_FACTOR,
    );
    const gemBonusFactor = Math.min(
      (1 + (cosmeticBonuses.gemMultiplier ?? 0)) * prestigeGem,
      MAX_BONUS_FACTOR,
    );
    // VIP "2x XP boost" — advertised on every vip_* SKU since launch and
    // rendered in the shop's perk list, but never applied until Aug 2026.
    // Composes multiplicatively with cosmetic × prestige under the same
    // MAX_BONUS_FACTOR ceiling as the other channels.
    const vipXp = economy.isVip ? 2 : 1;
    const xpBonusFactor = Math.min(
      (1 + (cosmeticBonuses.xpMultiplier ?? 0)) * prestigeXp * vipXp,
      MAX_BONUS_FACTOR,
    );
    // Per-difficulty coin payout, remotely tunable. These four keys and
    // gemsPerPerfectClear were declared as Remote Config and read by nothing,
    // so the economy — the thing a soft launch exists to calibrate — could
    // only be retuned by shipping a release. Clamped: the realistic failure
    // is a slipped digit in a web console, and an extra zero here lands as a
    // silent economy change on every device at once with no build to roll
    // back. Defaults equal the constants, so nothing moves until someone
    // moves it.
    const baseCoinReward =
      puzzleCoinPayout(difficulty) + (stars * ECONOMY.starBonus);
    // Repeat daily/weekly boards pay zero — the base payout was the largest
    // single leak in the replay farm (known solution, fresh coins each run).
    const coinReward = isRepeatBoard
      ? 0
      : Math.round(baseCoinReward * eventMultipliers.coins * coinBonusFactor);
    if (coinReward > 0) {
      economy.addCoins(coinReward);
    }

    // Track total rewards for animated victory tally
    let totalCoinsAwarded = coinReward;
    let totalGemsAwarded = 0;

    // Award gems for perfect clears (cosmetic gem multiplier applies).
    // claimFlawlessGems enforces the per-UTC-day `dailyFlawlessGemCap`
    // (default 5) and returns what is actually grantable — credit exactly
    // that so the tally, the grant, and the persisted counter agree.
    // Streak-MILESTONE gems (ceremonyGrants) are deliberately not routed
    // through this cap: they are bounded by streak progression already.
    if (isPerfect && !isRepeatBoard) {
      const requestedGems = Math.round(perfectClearGems() * gemBonusFactor);
      const perfectGems = claimFlawlessGems(requestedGems);
      if (perfectGems > 0) {
        economy.addGems(perfectGems);
        totalGemsAwarded += perfectGems;
      }
    }

    // Slow-fill piggy bank — accumulates gems per puzzle complete (capped
    // at RC `piggyBankCapacity`; each add is a no-op once full). The grant
    // path is separate from `addGems` so the jar doesn't inflate the victory
    // tally or totalEarned.gems on fill — only on break.
    const piggyFill = Math.max(0, Math.round(getRemoteNumber('piggyBankFillPerPuzzle')));
    if (piggyFill > 0 && !isRepeatBoard) {
      economy.addPiggyBankGems(piggyFill);
      void analytics.logEvent('piggy_bank_filled', { amount: piggyFill });
    }

    // Season pass XP — scaled by star bonus + daily/perfect kickers. Repeat
    // shared boards earn none at all (they used to keep the base solve XP,
    // which made the known daily solution a season-pass ladder treadmill).
    const baseXp = Math.max(0, Math.round(getRemoteNumber('seasonPassXpPerPuzzle')));
    if (baseXp > 0 && !isRepeatBoard) {
      const xpGain = Math.round(
        (baseXp +
          stars * 50 +
          // Daily kicker pays once per daily board — replays of the same
          // deterministic board earn only the base solve XP.
          (isFirstDailyToday ? 200 : 0) +
          (isPerfect ? 150 : 0)) *
          xpBonusFactor,
      );
      economy.addSeasonPassXp(xpGain);
      void analytics.logEvent('season_pass_xp_gained', {
        amount: xpGain,
        is_daily: isDaily,
        is_perfect: isPerfect,
        stars,
      });
    }

    // Award library points (apply XP multiplier)
    economy.addLibraryPoints(Math.round(stars * 5 * eventMultipliers.xp));

    // Update event progress for all active events
    eventManager.onPuzzleComplete(score, stars, isPerfect, wordsFound);
    player.updateProgress({ eventProgress: eventManager.getProgressSnapshot() });

    // Handle daily completion — first completion of today's board only.
    // The daily board is seeded by the date and stays tappable after
    // completion, so an ungated block here was an unbounded coin/gem/XP
    // farm (replay the known solution, collect 150c/2g each time).
    if (isFirstDailyToday) {
      const today = todayUtc;
      player.recordDailyComplete(today);
      const dailyCoins = Math.round(ECONOMY.dailyCompleteCoins * coinBonusFactor);
      const dailyGems = Math.round(ECONOMY.dailyCompleteGems * gemBonusFactor);
      economy.addCoins(dailyCoins);
      economy.addGems(dailyGems);
      totalCoinsAwarded += dailyCoins;
      totalGemsAwarded += dailyGems;
      player.updateStreak();
      // updateStreak has just set lastPlayDate to today, so pass today
      // explicitly rather than the pre-update value — otherwise the reminder
      // is scheduled for tonight and tells a player who just played that
      // their streak expires in a few hours.
      void triggerStreakReminder(
        player.streaks.currentStreak + 1,
        new Date().toISOString().split('T')[0],
      );
      // Same reason: recordDailyComplete has just added today, but this
      // closure holds the pre-update array. Push today's date in explicitly
      // so tomorrow's 9 AM ping is scheduled instead of one for a couple of
      // hours from now announcing a puzzle they just finished.
      void triggerDailyChallengeReminder([...player.dailyCompleted, today]);
      void analytics.trackDailyChallengeComplete(player.streaks.currentStreak + 1);
      void analytics.logEvent('daily_login', {
        date: today,
        streak: player.streaks.currentStreak + 1,
      });
      player.recordDailyQuestEvent({ type: 'daily_challenge_done' });
    }

    // Collect Tier 2 unlocks to embed inline on the victory screen
    const summaryItems: VictorySummaryItem[] = [];

    // First-win celebration — outsized reward for the very first puzzle
    // Includes library teaser content (moved from onboarding for faster first-open flow)
    if (isFirstWin) {
      player.queueCeremony({
        type: 'first_win',
        data: {
          coins: 100,
          gems: 5,
          wheelSpins: 1,
          libraryTeaser: true,
          tips: [
            { icon: '\u2B07\uFE0F', text: 'Letters fall when you clear words' },
            { icon: '\uD83E\uDDE9', text: 'Word order changes the board' },
            { icon: '\uD83D\uDCA1', text: 'Use hints when you get stuck' },
          ],
        },
        // Long enough to actually read the three teaching tips — this
        // ceremony is the carrier for content two onboarding phases were
        // deleted in favour of.
        autoDismissMs: 6000,
      });
    }

    // Early game bonus rewards — surprise rewards at specific levels to
    // break monotony and teach systems during the first 10 levels.
    // Use player's classic progression level (not puzzle level) to prevent
    // double-awarding when playing non-classic modes at overlapping levels.
    const progressionLevel = mode === 'classic' ? level : -1;
    const earlyBonus = progressionLevel > 0 ? getScheduledLevelBonus(progressionLevel) : undefined;
    if (earlyBonus && !isFirstWin) {
      // isFirstWin already awards the level-1 bonus via the ceremony above
      if (earlyBonus.coins) { economy.addCoins(earlyBonus.coins); totalCoinsAwarded += earlyBonus.coins; }
      if (earlyBonus.gems) { economy.addGems(earlyBonus.gems); totalGemsAwarded += earlyBonus.gems; }
      if (earlyBonus.hints) economy.addHintTokens(earlyBonus.hints);
      if (earlyBonus.wheelSpins) {
        player.updateProgress({
          mysteryWheel: {
            ...player.mysteryWheel,
            spinsAvailable: (player.mysteryWheel?.spinsAvailable ?? 0) + earlyBonus.wheelSpins,
          },
        });
      }
      if (earlyBonus.coins || earlyBonus.gems || earlyBonus.hints) {
        const parts = [
          earlyBonus.coins && `+${earlyBonus.coins} coins`,
          earlyBonus.gems && `+${earlyBonus.gems} gems`,
          earlyBonus.hints && `+${earlyBonus.hints} hints`,
        ].filter(Boolean);
        summaryItems.push({
          type: 'early_bonus',
          icon: '\uD83C\uDF81',
          label: 'Bonus Reward!',
          sublabel: parts.join(', '),
          accentColor: COLORS.green,
        });
      }
    }

    // Visible pursuit chips \u2014 quest progress and piggy fill on the victory
    // screen. Both systems already tracked and paid invisibly (quest events
    // batch-fire; piggy fill shows only on Home/Shop), wasting the two
    // strongest one-more-level meters in the game. Low priority: the
    // victory screen's 2-item cap keeps them out of milestone moments.
    const activeQuests = player.dailyQuests?.quests ?? [];
    let bestQuestChip: { title: string; progress: number; target: number } | null = null;
    for (const q of activeQuests) {
      if (q.claimed) continue;
      const template = getQuestTemplate(q.templateId);
      if (!template) continue;
      // Same post-event progress the async context update will land on.
      const delta = questEvents.reduce((sum, e) => sum + template.matcher(e), 0);
      const progress = Math.min(template.target, q.progress + delta);
      if (progress >= template.target) continue; // completion pays its own ceremony
      if (
        !bestQuestChip ||
        template.target - progress < bestQuestChip.target - bestQuestChip.progress
      ) {
        bestQuestChip = { title: template.title, progress, target: template.target };
      }
    }
    if (bestQuestChip && mode !== 'daily' && mode !== 'weekly') {
      summaryItems.push({
        type: 'quest_progress',
        icon: '\uD83C\uDFAF',
        label: bestQuestChip.title,
        sublabel: `${bestQuestChip.progress}/${bestQuestChip.target} \u2014 almost there!`,
        accentColor: COLORS.cyan,
      });
    }
    if (piggyFill > 0 && !isRepeatBoard && getRemoteBoolean('piggyBankEnabled')) {
      const capacity = Math.max(1, Math.round(getRemoteNumber('piggyBankCapacity')));
      // Context state is a pre-fill snapshot; this solve's fill was applied
      // above, so add it for the displayed figure (clamped like the jar is).
      const jarGems = Math.min(capacity, (economy.piggyBank?.gems ?? 0) + piggyFill);
      summaryItems.push({
        type: 'piggy_fill',
        icon: '\uD83D\uDC37',
        label: jarGems >= capacity ? 'Piggy Bank is FULL!' : 'Piggy Bank',
        sublabel: `${jarGems}/${capacity} gems saved`,
        accentColor: COLORS.gold,
      });
    }
    // Award first-win bonus resources (handled separately from ceremony)
    if (isFirstWin) {
      economy.addCoins(100);
      economy.addGems(5);
      totalCoinsAwarded += 100;
      totalGemsAwarded += 5;
      player.updateProgress({
        mysteryWheel: {
          ...player.mysteryWheel,
          spinsAvailable: (player.mysteryWheel?.spinsAvailable ?? 0) + 1,
        },
      });
      // If this player was referred by someone, trigger the Cloud Function
      // grant loop. Server-side dedup guarantees at-most-once even if this
      // fires again on a flaky network retry.
      if (player.referredBy && !player.referralRewardGranted) {
        void player.recordReferralSuccess();
      }
    }

    // Activate starter pack timer after enough puzzles to understand value
    // Tier 3: no ceremony — player discovers via Shop screen badge dot
    const puzzlesAfterThis = player.puzzlesSolved + solvedDelta;
    if (puzzlesAfterThis === STARTER_PACK_DELAY_PUZZLES && economy.starterPackExpiresAt === 0) {
      economy.activateStarterPack();
    }

    // Check for rare tile drop -- apply event multiplier to drop rate
    // Early game guaranteed rare tile bypasses RNG to create first_rare_tile ceremony early
    const guaranteedRare = earlyBonus?.guaranteedRareTile === true;
    const baseDropChance = COLLECTION.rareTileBaseChance
      + (difficulty === 'hard' || difficulty === 'expert' ? COLLECTION.rareTileHardBonus : 0)
      + (isPerfect ? COLLECTION.rareTilePerfectBonus : 0);
    // Prestige tier-3's `rare_tile_bonus` (+2%) is additive on the base
    // chance — it was displayed by the prestige ceremony as a permanent
    // reward since launch with no consumer anywhere.
    const prestigeRareTileBonus = getPrestigeRareTileBonus(
      player.prestige?.permanentBonuses ?? [],
    );
    const dropChance = Math.min(
      (baseDropChance + prestigeRareTileBonus) * eventMultipliers.rareTileChance,
      1,
    );
    if (guaranteedRare || Math.random() < dropChance) {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomLetter = letters[Math.floor(Math.random() * letters.length)];
      const wasFirstTile = Object.keys(player.collections.rareTiles || {}).length === 0;
      player.addRareTile(randomLetter);
      void analytics.logEvent('rare_tile_earned', {
        letter: randomLetter,
        difficulty,
        isPerfect,
      });
      if (wasFirstTile) {
        player.queueCeremony({
          type: 'first_rare_tile',
          data: { letter: randomLetter },
          autoDismissMs: 3000,  // Tier 2: auto-dismiss
        });
      }
    }

    // Check for atlas word collection from the words found (all pages)
    if (params.board) {
      const board = params.board as Board;

      // Build local projection of atlas state so we can detect completions
      const localAtlas: Record<string, string[]> = {};
      for (const page of ATLAS_PAGES) {
        localAtlas[page.id] = [...(player.collections.atlasPages[page.id] || [])];
      }

      board.words.forEach((wp: any) => {
        const word = wp.word.toLowerCase();
        for (const page of ATLAS_PAGES) {
          if (page.words.includes(word)) {
            player.collectAtlasWord(page.id, word);
            if (!localAtlas[page.id].includes(word)) {
              localAtlas[page.id].push(word);
            }
          }
        }
      });

      // Check for collection completions using local projection
      for (const page of ATLAS_PAGES) {
        const projectedCount = localAtlas[page.id].length;
        const oldCount = (player.collections.atlasPages[page.id] || []).length;
        if (projectedCount >= page.words.length && oldCount < page.words.length) {
          player.queueCeremony({
            type: 'collection_complete',
            data: { icon: page.icon, name: page.category, reward: page.reward },
            autoDismissMs: 3000,  // Tier 2: auto-dismiss
          });
        }
      }
    }

    // Update mission progress
    (player.missions?.dailyMissions ?? []).forEach((mission) => {
      if (mission.completed) return;
      if (mission.id === 'solve_3_puzzles' || mission.id === 'earn_3_stars') {
        player.updateMissionProgress(mission.id, mission.progress + 1);
      }
      if (mission.id === 'earn_500_score') {
        player.updateMissionProgress(mission.id, mission.progress + score);
      }
      if (mission.id === 'solve_without_hints' && isPerfect) {
        player.updateMissionProgress(mission.id, mission.progress + 1);
      }
      if (mission.id === 'get_perfect_solve' && isPerfect) {
        player.updateMissionProgress(mission.id, mission.progress + 1);
      }
      if (mission.id === 'complete_daily' && isFirstDailyToday) {
        player.updateMissionProgress(mission.id, 1);
      }
    });

    // Update weekly goal progress
    player.updateWeeklyGoalProgress('puzzles_solved', 1);
    player.updateWeeklyGoalProgress('total_score', score);
    player.updateWeeklyGoalProgress('stars_earned', stars);
    if (isPerfect) player.updateWeeklyGoalProgress('perfect_solves', 1);
    if (isFirstDailyToday) player.updateWeeklyGoalProgress('daily_completed', 1);

    // Update seasonal quest progress
    const questState = player.seasonalQuest;
    if (questState.activeQuestId) {
      const currentQuest = getCurrentSeasonalQuest();
      if (currentQuest.id === questState.activeQuestId && questState.currentStepIndex < currentQuest.steps.length) {
        const currentStep = currentQuest.steps[questState.currentStepIndex];
        const trackingKey = currentStep.trackingKey;
        let increment = 0;
        if (trackingKey === 'puzzles_solved') increment = 1;
        else if (trackingKey === 'total_score') increment = score;
        else if (trackingKey === 'stars_earned') increment = stars;
        else if (trackingKey === 'perfect_solves' && isPerfect) increment = 1;
        else if (trackingKey === 'daily_completed' && isFirstDailyToday) increment = 1;
        else if (trackingKey === 'words_found') increment = wordsFound;
        // "Play N different game modes" counts DISTINCT modes (per weekly
        // window), not puzzles — an unconditional 1 here let four classic
        // solves clear the mode-exploration step.
        else if (trackingKey === 'modes_played') increment = isNewModeThisWeek ? 1 : 0;

        if (increment > 0) {
          const newProgress = questState.stepProgress + increment;
          player.updateSeasonalQuest({ stepProgress: newProgress });
        }
      }
    }

    // Detect level-up — classic ladder only. For non-classic completions
    // `level` is that mode's own ladder (or 0 for daily/weekly); deriving
    // newLevel from it handed out feature/mode unlocks, level-up fanfare and
    // repeatable late-game milestone coins for levels never actually reached.
    const newLevel = isClassicProgression ? Math.max(level + 1, prevLevel) : prevLevel;
    const leveledUp = isClassicProgression && newLevel > prevHighest;
    // What the player will PLAY next: non-classic ladders advanced via
    // advanceModeLevel above, so their preview is the mode's own next level.
    const nextPlayLevel = isClassicProgression ? newLevel : level > 0 ? level + 1 : newLevel;

    // Track level milestone in funnel
    void funnelTracker.trackLevelMilestone(newLevel);

    // Embed level-up as summary item with details about what unlocked
    const difficultyTransition = leveledUp ? detectDifficultyTransition(prevHighest, newLevel) : null;
    if (leveledUp) {
      // Gather what unlocks at this level
      const unlockDetails: string[] = [];
      if (difficultyTransition) {
        unlockDetails.push(`${difficultyTransition.from} \u2192 ${difficultyTransition.to}`);
      }
      const featureAtLevel = FEATURE_UNLOCK_SCHEDULE.find(f => f.unlockLevel === newLevel);
      if (featureAtLevel) {
        unlockDetails.push(featureAtLevel.title);
      }
      for (const [, config] of Object.entries(MODE_CONFIGS)) {
        if (config.unlockLevel === newLevel) {
          unlockDetails.push(`${config.name} mode`);
        }
      }
      const decoAtLevel = MILESTONE_DECORATIONS.find(d => d.level === newLevel);
      if (decoAtLevel) {
        unlockDetails.push(decoAtLevel.name);
      }

      summaryItems.push({
        type: 'level_up',
        icon: '\u2B06\uFE0F',
        label: `Level ${newLevel} Reached!`,
        sublabel: unlockDetails.length > 0 ? unlockDetails.join(' \u2022 ') : undefined,
        accentColor: COLORS.gold,
      });
    }

    // Check feature unlocks based on new level — Tier 2 (auto-dismiss)
    const featureUnlocks = player.checkFeatureUnlocks(newLevel);
    for (const ceremony of featureUnlocks) {
      player.queueCeremony({ ...ceremony, autoDismissMs: 3000 });
      if (ceremony.data?.featureId) {
        void analytics.trackFeatureUnlocked(ceremony.data.featureId, newLevel);
      }
    }

    // First-purchase hard modal — interrupts post-puzzle exactly once for
    // non-payers at levels `firstPurchaseModalMinLevel..MaxLevel` (default 5–6).
    // Any prior purchase (purchaseHistory non-empty) or a non-null
    // `firstPurchaseModalShownAt` permanently disables the trigger.
    if (
      getRemoteBoolean('firstPurchaseModalEnabled') &&
      player.firstPurchaseModalShownAt === null &&
      economy.purchaseHistory.length === 0
    ) {
      const minLvl = getRemoteNumber('firstPurchaseModalMinLevel');
      const maxLvl = getRemoteNumber('firstPurchaseModalMaxLevel');
      if (newLevel >= minLvl && newLevel <= maxLvl) {
        player.queueCeremony({
          type: 'first_purchase_offer',
          data: { productId: 'first_purchase_special' },
        });
      }
    }

    // Only classic wins add to totalStars now (see isClassicProgression),
    // so project the post-completion total accordingly. Classic always plays
    // the current (never-completed) level, so + stars is exact.
    const totalStarsNow = player.totalStars + (isClassicProgression ? stars : 0);

    // Achievements — demoted to Tier 3 (no ceremony, silent).
    // The reward/unlock still happens in checkAchievements, we just don't queue modals.
    // Counter state is still the PRE-completion snapshot here (React batches
    // every setData this callback makes — same convention the mastery block
    // below documents), so pass the post-completion values through the
    // extraData escape hatch. Read stale, every counter-based tier crossing
    // fired one puzzle late — or never, if the player churned at the
    // threshold — while the achievements screen already showed it as met.
    const distinctModesPlayed = Object.keys(player.modeStats ?? {})
      .filter((m) => (player.modeStats?.[m]?.played ?? 0) > 0).length;
    const achievementCeremonies = player.checkAchievements({
      puzzle_solver: player.puzzlesSolved + 1,
      high_scorer: player.totalScore + score,
      star_collector: totalStarsNow,
      perfect_player: player.perfectSolves + (isPerfect ? 1 : 0),
      level_climber: isClassicProgression ? Math.max(player.highestLevel, level) : player.highestLevel,
      daily_devotee: (player.dailyCompleted ?? []).length + (isFirstDailyToday ? 1 : 0),
      mode_explorer: prevModePlayed === 0 ? distinctModesPlayed + 1 : distinctModesPlayed,
    });
    for (const ceremony of achievementCeremonies) {
      // Tier 3: no modal — but the REWARD is not optional. The comment above
      // this loop used to claim "the reward/unlock still happens" while the
      // loop only logged analytics; every achievement tier's declared
      // coins/gems went ungranted. The achievement screen shows the amounts,
      // so pay them.
      const reward = ceremony.data?.reward as { coins?: number; gems?: number } | undefined;
      if (reward?.coins) economy.addCoins(reward.coins);
      if (reward?.gems) economy.addGems(reward.gems);
      if (ceremony.data?.achievementId && ceremony.data?.tier) {
        void analytics.trackAchievementEarned(ceremony.data.achievementId, ceremony.data.tier);
      }
    }

    // Auto-unlock modes based on level progression.
    // Early modes (unlockLevel <= 8) become inline summary items to reduce modal fatigue.
    // Later modes (unlockLevel > 8) get full-screen ceremony modals.
    for (const [modeId, config] of Object.entries(MODE_CONFIGS)) {
      if (config.unlockLevel <= newLevel && !player.unlockedModes.includes(modeId)) {
        player.unlockMode(modeId);
        if (config.unlockLevel <= 8) {
          // Inline on victory screen — less intrusive for early game
          summaryItems.push({
            type: 'mode_unlock',
            icon: config.icon,
            label: `${config.name} Unlocked!`,
            sublabel: config.description,
            accentColor: config.color,
          });
        } else {
          // Tier 2 ceremony for premium/later modes — auto-dismiss
          player.queueCeremony({
            type: 'mode_unlock',
            data: {
              modeId,
              modeName: config.name,
              modeIcon: config.icon,
              modeDescription: config.description,
              modeColor: config.color,
            },
            autoDismissMs: 3000,
          });
        }
      }
    }

    // Star milestones (50/100/250/500 total stars) — totalStarsNow is the
    // classic-gated projection computed above the achievements check, so
    // non-classic wins can no longer celebrate a crossing that the recorded
    // totalStars never makes.
    for (const sm of STAR_MILESTONES) {
      const prevStars = player.totalStars;
      if (totalStarsNow >= sm.stars && prevStars < sm.stars) {
        summaryItems.push({
          type: 'star_milestone',
          icon: '\u2B50',
          label: `${sm.stars} Stars!`,
          sublabel: sm.name,
          accentColor: COLORS.gold,
        });
      }
    }

    // Perfect solve milestones (10/25/50 perfects)
    if (isPerfect) {
      const perfectCount = player.perfectSolves + 1;
      for (const pm of PERFECT_MILESTONES) {
        if (perfectCount === pm.count) {
          summaryItems.push({
            type: 'perfect_milestone',
            icon: '\uD83D\uDC8E',
            label: pm.name,
            sublabel: `${pm.count} perfect solves!`,
            accentColor: COLORS.purple,
          });
        }
      }
    }

    // Milestone decoration unlocks (every 5 levels)
    if (leveledUp) {
      const libraryUnlockLevel = FEATURE_UNLOCK_SCHEDULE.find(f => f.id === 'tab_library')?.unlockLevel ?? 9;
      const hasLibrary = player.featuresUnlocked.includes('tab_library');
      for (const md of MILESTONE_DECORATIONS) {
        if (newLevel >= md.level && prevHighest < md.level) {
          if (!hasLibrary && newLevel < libraryUnlockLevel) {
            player.unlockDecoration(md.decoration);
            summaryItems.push({
              type: 'library_teaser',
              icon: md.icon,
              label: md.name,
              sublabel: `Unlock the Library at Level ${libraryUnlockLevel} to place it!`,
              accentColor: COLORS.purple,
            });
          } else {
            player.unlockDecoration(md.decoration);
            summaryItems.push({
              type: 'decoration_unlock',
              icon: md.icon,
              label: md.name,
              sublabel: 'New library decoration!',
              accentColor: COLORS.teal,
              action: { type: 'navigate', screen: 'Library', params: { showDecorations: true } },
            });
          }
        }
      }
    }

    // First mode clear — Tier 3 (silent, no ceremony modal).
    // Player discovers via profile/achievements. Analytics still tracked.
    if (prevModePlayed === 0 && mode !== 'classic') {
      void analytics.logEvent('first_mode_clear', { mode });
    }

    // Mastery tier-up detection (XP proxy: puzzlesSolved * 100).
    // player.puzzlesSolved is the PRE-completion count here (the progress
    // update is queued, not yet applied), so "after" is count + 1 — the same
    // post-completion convention the rest of this callback and
    // MasteryScreen use. The old (count-1)/count pair fired every tier-up
    // one puzzle late (or never, if the player churned first).
    // solvedDelta is 0 on a repeat shared board, so prev === new and no tier
    // can cross — replays cannot walk the mastery ladder.
    const prevMasteryXP = player.puzzlesSolved * 100;
    const newMasteryXP = (player.puzzlesSolved + solvedDelta) * 100;
    const prevMasteryTier = getMasteryTierForXP(prevMasteryXP);
    const newMasteryTier = getMasteryTierForXP(newMasteryXP);
    if (newMasteryTier > prevMasteryTier) {
      // Build reward description from mastery data
      const tierReward = MASTERY_REWARDS.find(r => r.tier === newMasteryTier);
      const rewardParts: string[] = [];
      if (tierReward) {
        // Grant mastery tier rewards
        if (tierReward.free.coins) { economy.addCoins(tierReward.free.coins); rewardParts.push(`${tierReward.free.coins} coins`); }
        if (tierReward.free.gems) { economy.addGems(tierReward.free.gems); rewardParts.push(`${tierReward.free.gems} gems`); }
        if (tierReward.free.hintTokens) { economy.addHintTokens(tierReward.free.hintTokens); rewardParts.push(`${tierReward.free.hintTokens} hints`); }
        // Premium Pass owners see the premium lane render as earned with no
        // claim step (MasteryScreen), so the paid lane must be credited here
        // too — it used to be display-only, delivering nothing for the SKU.
        if (economy.isPremiumPassFlag && tierReward.premium) {
          if (tierReward.premium.coins) { economy.addCoins(tierReward.premium.coins); rewardParts.push(`+${tierReward.premium.coins} premium coins`); }
          if (tierReward.premium.gems) { economy.addGems(tierReward.premium.gems); rewardParts.push(`+${tierReward.premium.gems} premium gems`); }
          if (tierReward.premium.hintTokens) { economy.addHintTokens(tierReward.premium.hintTokens); rewardParts.push(`+${tierReward.premium.hintTokens} premium hints`); }
          if (tierReward.premium.decoration) player.unlockDecoration(tierReward.premium.decoration);
        }
      }
      summaryItems.push({
        type: 'mastery_tier_up',
        icon: '\uD83C\uDFC6',
        label: `Mastery Tier ${newMasteryTier}!`,
        sublabel: rewardParts.length > 0 ? rewardParts.join(', ') : 'View your progress!',
        accentColor: COLORS.purple,
        action: { type: 'navigate', screen: 'Mastery' },
      });
    }

    // Late-game milestone rewards (every 25 levels after level 50)
    if (leveledUp && newLevel >= 50 && newLevel % 25 === 0) {
      economy.addCoins(500);
      economy.addGems(25);
      summaryItems.push({
        type: 'star_milestone',
        icon: '\uD83D\uDC51',
        label: `Level ${newLevel} Master!`,
        sublabel: '500 coins + 25 gems',
        accentColor: COLORS.gold,
      });
    }

    // Award mystery wheel free spin progress — a repeat shared board must
    // not tick the every-N-puzzles free-spin counter (each spin carries
    // ~2 gems of expected value, so replays were indirect gem income).
    if (!isRepeatBoard) {
      player.awardFreeSpin();
    }

    // Update win streak. Losses only go through recordFailure — nothing
    // calls updateWinStreak(false) on them — so the "consecutive" streak
    // silently became a lifetime-wins counter and its milestone ceremonies
    // ('Hat Trick!' etc., paid from WIN_STREAK_TIERS at pop) fired without
    // consecutive wins. Break the streak here first when any loss landed
    // since the last win; both updates are functional setData calls, so
    // reset-then-credit composes to a streak of 1 within one React batch.
    if (hadFailuresSinceLastWin) {
      player.updateWinStreak(false);
    }
    player.updateWinStreak(true);

    // Update flawless streak (increments on distinct calendar days; resets on
    // any non-flawless completion). Fires analytics inside the callback.
    player.updateFlawlessStreak(perfectRun);
    if (perfectRun) {
      void analytics.logEvent('puzzle_flawless_complete', {
        level,
        score,
        mode,
        streakAfter: (player.flawlessStreak?.currentStreak || 0) + 1,
      });
      const streakAfter = (player.flawlessStreak?.currentStreak || 0) + 1;
      player.recordDailyQuestEvent({ type: 'flawless_streak_hit', value: streakAfter });
    }

    // Award seasonal stamp based on puzzles solved this season. Skipped on
    // repeat shared boards: the counter isn't advancing, so re-detecting the
    // same milestone would be wrong.
    const currentAlbum = getCurrentSeasonAlbum();
    if (currentAlbum && !isRepeatBoard) {
      const puzzleCount = player.puzzlesSolved + 1;
      // Award stamps at puzzle milestones: 1, 3, 5, 10, 15, 20, 30, 40, 50, 60,
      // 75, 90, 100, 120, 150, 175, 200, 250, 300, 500
      const STAMP_MILESTONES = [1, 3, 5, 10, 15, 20, 30, 40, 50, 60, 75, 90, 100, 120, 150, 175, 200, 250, 300, 500];
      const stampIndex = STAMP_MILESTONES.indexOf(puzzleCount);
      if (stampIndex >= 0 && stampIndex < currentAlbum.stamps.length) {
        player.collectStamp(currentAlbum.id, stampIndex);
        void analytics.logEvent('stamp_collected', { albumId: currentAlbum.id, stampIndex, puzzleCount });
      }
    }

    // Compute next unlock preview for retention hook on victory screen
    const nextFeature = FEATURE_UNLOCK_SCHEDULE.find(f => f.unlockLevel > newLevel);
    const nextModeEntry = Object.entries(MODE_CONFIGS).find(([, c]) => c.unlockLevel > newLevel);
    const candidates: { icon: string; name: string; unlockLevel: number }[] = [];
    if (nextFeature) candidates.push({ icon: nextFeature.icon, name: nextFeature.title, unlockLevel: nextFeature.unlockLevel });
    if (nextModeEntry) candidates.push({ icon: nextModeEntry[1].icon, name: nextModeEntry[1].name, unlockLevel: nextModeEntry[1].unlockLevel });
    candidates.sort((a, b) => a.unlockLevel - b.unlockLevel);
    // Show preview only if within 3 levels — don't overwhelm with distant goals
    const nextUnlockPreview = candidates.length > 0 && candidates[0].unlockLevel - newLevel <= 3
      ? candidates[0]
      : null;

    // Generate share text (include referral code for viral deep link)
    const grid = params.board ? (params.board as Board).grid : null;
    const shareText = grid
      ? generateShareText(grid, level, stars, score, isDaily, player.referralCode || undefined, perfectRun)
      : '';

    // Firestore social layer: submit scores + sync profile
    const displayName = getTitleLabel(player.equippedTitle) || 'Player';

    // First completion of today's board only — replays of the known
    // solution must not resubmit to the daily leaderboard.
    if (isFirstDailyToday && userId) {
      void firestoreService.submitDailyScore(userId, score, stars, level, displayName);
    }

    if (userId) {
      // level + mode ride along for the server's plausibility ceiling —
      // omitted, the callable assumed level 0 and rejected any score over
      // 1000, which was essentially every real weekly submission. The weekly
      // PUZZLE itself plays at level 0 (it has no level), so send the
      // player's progression level for that case — it is what the ceiling is
      // actually trying to scale by.
      const ceilingLevel = level > 0 ? level : player.currentLevel;
      void firestoreService.submitWeeklyScore(userId, score, displayName, ceilingLevel, mode);
    }

    // MG2: per-event cumulative score. eventManager keeps a list of
    // currently-active events; we submit the puzzle score against each
    // so a single puzzle can rank on multiple overlapping events.
    if (userId) {
      for (const activeEvent of eventManager.getActiveEvents()) {
        void firestoreService.submitEventScore(
          activeEvent.id,
          userId,
          score,
          displayName,
          level,
          mode,
        );
      }
      // Weekend tournament: every in-window solve also ranks the player in
      // their ~100-player bracket (deterministic per uid+weekend), riding
      // the same per-event leaderboard rails.
      const weekend = getWeekendWindow();
      if (weekend.active && weekendTournamentEnabled()) {
        void firestoreService.submitEventScore(
          tournamentEventId(userId, weekend.weekendId),
          userId,
          score,
          displayName,
          level,
          mode,
        );
      }
    }

    if (userId) {
      // The onPuzzleComplete Cloud Function (club goal progress + club
      // weekly score) triggers on this document's CREATION — it listened
      // on a path no client ever wrote, so club goals and weekly club
      // scores were frozen at zero. handleComplete runs once per
      // completion (GameScreen guards double-fires) and this write is not
      // retried, so a fresh id per call cannot double-fire the trigger.
      const resultId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      void firestoreService.recordPuzzleResult(userId, resultId, {
        score,
        stars,
        wordsFound,
        isPerfect,
        hintsUsed: assists.hintsUsed,
        level,
        mode,
      });
    }

    // Profile sync is skipped on repeat shared boards: the lifetime solve
    // counter did not advance, so the +1 projection below would overstate
    // it. The next real completion syncs the fresher totals anyway.
    if (userId && !isRepeatBoard) {
      void firestoreService.syncPlayerProfile(userId, {
        displayName,
        level: newLevel,
        puzzlesSolved: player.puzzlesSolved + 1,
        totalScore: player.totalScore + score,
        currentStreak: player.streaks.currentStreak,
        equippedFrame: player.equippedFrame,
        equippedTitle: player.equippedTitle,
      });
    }

    // Fetch real friend comparison (async -- update params when ready)
    const friendIds = player.friendIds || [];
    let friendComparison = { beaten: 0, total: 0 };
    const eventMultiplierLabel = eventManager.getActiveMultiplierLabel();
    if (firestoreService.isAvailable() && friendIds.length > 0 && userId) {
      firestoreService
        .getFriendScores(userId, friendIds)
        .then((result) => {
          // Notify friends that the player beat their score
          if (result.beaten > 0) {
            void triggerFriendBeatScoreNotification(
              displayName,
              level,
            );
          }
          if (result.total > 0 && navigation.isFocused()) {
            navigation.setParams({
              completionData: {
                isFirstWin,
                leveledUp,
                newLevel,
                difficultyTransition,
                nextLevelPreview: !isDaily
                  ? { level: nextPlayLevel, difficulty: getDifficultyForLevel(nextPlayLevel) }
                  : null,
                shareText,
                friendComparison: result,
                eventMultiplierLabel,
                showTomorrowPreview: puzzlesAfterThis <= 5,
                summaryItems,
                totalCoinsAwarded,
                totalGemsAwarded,
                nextUnlockPreview,
              },
            });
          }
        })
        .catch(() => {});
    }

    // Store completion metadata in route params for GameScreen to pick up
    if (navigation.isFocused()) {
      navigation.setParams({
        completionData: {
          isFirstWin,
          leveledUp,
          newLevel,
          difficultyTransition,
          nextLevelPreview: !isDaily ? {
            level: nextPlayLevel,
            difficulty: getDifficultyForLevel(nextPlayLevel),
          } : null,
          shareText,
          friendComparison,
          eventMultiplierLabel,
          showTomorrowPreview: puzzlesAfterThis <= 5,
          summaryItems,
          totalCoinsAwarded,
          totalGemsAwarded,
          nextUnlockPreview,
        },
      });
    }

    } catch (e) {
      // A reward-wiring bug should never swallow a victory silently. Report
      // to Sentry with scope tags and rethrow so the local PuzzleComplete
      // ErrorBoundary can show the player a recovery button.
      crashReporter.captureException(
        e instanceof Error ? e : new Error(String(e)),
        { tags: { step: 'reward_wiring', mode: (params.mode ?? 'unknown') as string }, level: params.level ?? 0 },
      );
      throw e;
    }
    // `player`/`economy` are stable context facades (state resolves to the
    // store snapshot at call time — src/utils/contextFacade.ts), so they are
    // deliberately NOT dependencies: listing the old full context values
    // re-minted handleComplete on every one of the 15+ writes a completion
    // makes, which defeated GameScreen's memo and re-rendered the whole
    // gameplay tree during victory animations.
  }, [params, navigation, userId]);

  return handleComplete;
}
