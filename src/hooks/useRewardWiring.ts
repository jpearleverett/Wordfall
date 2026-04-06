import { useCallback } from 'react';
import { Board, CeremonyItem, Difficulty, GameMode, VictorySummaryItem } from '../types';
import { SeasonalQuestState, getCurrentSeasonalQuest } from '../data/seasonalQuests';
import {
  COLORS,
  getLevelConfig,
  ECONOMY,
  COLLECTION,
  MODE_CONFIGS,
  FEATURE_UNLOCK_SCHEDULE,
  STAR_MILESTONES,
  PERFECT_MILESTONES,
  MILESTONE_DECORATIONS,
  EARLY_GAME_BONUSES,
  STARTER_PACK_DELAY_PUZZLES,
} from '../constants';
import { ATLAS_PAGES, getCurrentSeasonAlbum } from '../data/collections';
import { generateShareText } from '../utils/shareGenerator';
import { getMasteryTierForXP, MASTERY_REWARDS } from '../data/masteryRewards';
import { eventManager } from '../services/eventManager';
import { analytics } from '../services/analytics';
import { funnelTracker } from '../services/funnelTracker';
import {
  triggerStreakReminder,
  triggerFriendBeatScoreNotification,
} from '../services/notificationTriggers';
import { firestoreService } from '../services/firestore';

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
  streaks: { currentStreak: number; bestStreak: number; lastPlayDate: string; graceDaysUsed: number; streakShieldAvailable: boolean; lastShieldDate: string };
  equippedTitle: string;
  equippedFrame: string;
  unlockedModes: string[];
  friendIds: string[];
  consecutiveFailures: number;
  performanceMetrics: any;
  referralCode: string;
  featuresUnlocked: string[];
  seasonalQuest: SeasonalQuestState;

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
  queueCeremony: (ceremony: CeremonyItem) => void;
  checkFeatureUnlocks: (level: number) => CeremonyItem[];
  checkAchievements: (extraData?: { maxCombo?: number }) => CeremonyItem[];
  unlockMode: (modeId: string) => void;
  awardFreeSpin: () => void;
  updateWinStreak: (won: boolean) => void;
  collectStamp: (albumId: string, stampIndex: number) => void;
}

interface EconomyContextLike {
  addCoins: (amount: number) => void;
  addGems: (amount: number) => void;
  addLibraryPoints: (amount: number) => void;
  addHintTokens: (amount: number) => void;
  starterPackExpiresAt: number;
  activateStarterPack: () => void;
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
}

/**
 * Extracts the massive handleComplete logic from App.tsx.
 * Returns a stable `handleComplete(stars, score)` callback that:
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
  const handleComplete = useCallback((stars: number, score: number, maxCombo: number = 0) => {
    const level = params.level || 0;
    const mode = (params.mode || 'classic') as GameMode;
    const isDaily = params.isDaily || false;

    // Capture pre-complete state for level-up detection
    const prevLevel = player.currentLevel;
    const prevHighest = player.highestLevel;
    const isFirstWin = player.puzzlesSolved === 0;

    // Record puzzle completion in PlayerContext
    const isPerfect = stars === 3;
    const boardData = params.board as Board | undefined;
    const wordsFound = boardData ? boardData.words.length : 0;
    void analytics.trackPuzzleComplete({
      level,
      mode,
      stars,
      duration_seconds: 0,
      hints_used: 0,
      undos_used: 0,
      words_found: wordsFound,
      score,
    });
    void analytics.updateUserProperties({
      player_level: Math.max(level + 1, player.currentLevel),
      total_puzzles_solved: player.puzzlesSolved + 1,
      player_stage: playerStageFromPuzzles(player.puzzlesSolved + 1),
    });
    player.recordPuzzleComplete(level, score, stars, isPerfect);

    // Capture pre-play mode stats for first-clear detection
    const prevModePlayed = player.modeStats?.[mode]?.played || 0;

    // Record mode play and advance mode level on win
    player.recordModePlay(mode, score, true);
    if (mode !== 'classic') {
      player.advanceModeLevel(mode);
    }

    // Reset consecutive failures on success
    if (player.consecutiveFailures > 0) {
      player.updateProgress({ consecutiveFailures: 0, lastLevelStars: stars });
    }

    // Update adaptive difficulty metrics
    player.recordPerformanceMetrics(level, stars, 0);

    // Award coins based on difficulty -- apply event multipliers
    const difficulty: Difficulty = level <= 5 ? 'easy' : level <= 15 ? 'medium' : level <= 30 ? 'hard' : 'expert';
    const eventMultipliers = eventManager.getEventMultipliers();
    const baseCoinReward = ECONOMY.puzzleCompleteCoins[difficulty] + (stars * ECONOMY.starBonus);
    const coinReward = Math.round(baseCoinReward * eventMultipliers.coins);
    economy.addCoins(coinReward);

    // Award gems for perfect clears
    if (isPerfect) {
      economy.addGems(ECONOMY.perfectClearGems);
    }

    // Award library points (apply XP multiplier)
    economy.addLibraryPoints(Math.round(stars * 5 * eventMultipliers.xp));

    // Update event progress for all active events
    eventManager.onPuzzleComplete(score, stars, isPerfect);
    player.updateProgress({ eventProgress: eventManager.getProgressSnapshot() });

    // Handle daily completion
    if (isDaily) {
      const today = new Date().toISOString().split('T')[0];
      player.recordDailyComplete(today);
      economy.addCoins(ECONOMY.dailyCompleteCoins);
      economy.addGems(ECONOMY.dailyCompleteGems);
      player.updateStreak();
      void triggerStreakReminder(player.streaks.currentStreak + 1);
      void analytics.trackDailyChallengeComplete(player.streaks.currentStreak + 1);
      void analytics.logEvent('daily_login', {
        date: today,
        streak: player.streaks.currentStreak + 1,
      });
    }

    // Collect Tier 2 unlocks to embed inline on the victory screen
    const summaryItems: VictorySummaryItem[] = [];

    // First-win celebration — outsized reward for the very first puzzle
    if (isFirstWin) {
      player.queueCeremony({
        type: 'first_win',
        data: { coins: 100, gems: 5, wheelSpins: 1 },
      });
    }

    // Early game bonus rewards — surprise rewards at specific levels to
    // break monotony and teach systems during the first 10 levels.
    // Use player's classic progression level (not puzzle level) to prevent
    // double-awarding when playing non-classic modes at overlapping levels.
    const progressionLevel = mode === 'classic' ? level : -1;
    const earlyBonus = EARLY_GAME_BONUSES.find(b => b.level === progressionLevel);
    if (earlyBonus && !isFirstWin) {
      // isFirstWin already awards the level-1 bonus via the ceremony above
      if (earlyBonus.coins) economy.addCoins(earlyBonus.coins);
      if (earlyBonus.gems) economy.addGems(earlyBonus.gems);
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
    // Award first-win bonus resources (handled separately from ceremony)
    if (isFirstWin) {
      economy.addCoins(100);
      economy.addGems(5);
      player.updateProgress({
        mysteryWheel: {
          ...player.mysteryWheel,
          spinsAvailable: (player.mysteryWheel?.spinsAvailable ?? 0) + 1,
        },
      });
    }

    // Activate starter pack timer after enough puzzles to understand value
    const puzzlesAfterThis = player.puzzlesSolved + 1;
    if (puzzlesAfterThis === STARTER_PACK_DELAY_PUZZLES && economy.starterPackExpiresAt === 0) {
      economy.activateStarterPack();
      player.queueCeremony({
        type: 'starter_pack_unlocked',
        data: {},
      });
    }

    // Check for rare tile drop -- apply event multiplier to drop rate
    // Early game guaranteed rare tile bypasses RNG to create first_rare_tile ceremony early
    const guaranteedRare = earlyBonus?.guaranteedRareTile === true;
    const baseDropChance = COLLECTION.rareTileBaseChance
      + (difficulty === 'hard' || difficulty === 'expert' ? COLLECTION.rareTileHardBonus : 0)
      + (isPerfect ? COLLECTION.rareTilePerfectBonus : 0);
    const dropChance = Math.min(baseDropChance * eventMultipliers.rareTileChance, 1);
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
      if (mission.id === 'complete_daily' && isDaily) {
        player.updateMissionProgress(mission.id, 1);
      }
    });

    // Update weekly goal progress
    player.updateWeeklyGoalProgress('puzzles_solved', 1);
    player.updateWeeklyGoalProgress('total_score', score);
    player.updateWeeklyGoalProgress('stars_earned', stars);
    if (isPerfect) player.updateWeeklyGoalProgress('perfect_solves', 1);
    if (isDaily) player.updateWeeklyGoalProgress('daily_completed', 1);

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
        else if (trackingKey === 'daily_completed' && isDaily) increment = 1;
        else if (trackingKey === 'words_found') increment = wordsFound;
        else if (trackingKey === 'modes_played') increment = 1;

        if (increment > 0) {
          const newProgress = questState.stepProgress + increment;
          player.updateSeasonalQuest({ stepProgress: newProgress });
        }
      }
    }

    // Detect level-up
    const newLevel = Math.max(level + 1, prevLevel);
    const leveledUp = newLevel > prevHighest;

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

    // Check feature unlocks based on new level
    const featureUnlocks = player.checkFeatureUnlocks(newLevel);
    for (const ceremony of featureUnlocks) {
      player.queueCeremony(ceremony);
      if (ceremony.data?.featureId) {
        void analytics.trackFeatureUnlocked(ceremony.data.featureId, newLevel);
      }
    }

    // Check achievements (maxCombo is the actual max combo chain from gameplay)
    const achievementCeremonies = player.checkAchievements({ maxCombo });
    for (const ceremony of achievementCeremonies) {
      player.queueCeremony(ceremony);
      if (ceremony.data?.achievementId && ceremony.data?.tier) {
        void analytics.trackAchievementEarned(ceremony.data.achievementId, ceremony.data.tier);
      }
    }

    // Auto-unlock modes based on level progression and queue ceremonies
    for (const [modeId, config] of Object.entries(MODE_CONFIGS)) {
      if (config.unlockLevel <= newLevel && !player.unlockedModes.includes(modeId)) {
        player.unlockMode(modeId);
        player.queueCeremony({
          type: 'mode_unlock',
          data: {
            modeId,
            modeName: config.name,
            modeIcon: config.icon,
            modeDescription: config.description,
            modeColor: config.color,
          },
        });
      }
    }

    // Star milestones (50/100/250/500 total stars)
    const totalStarsNow = player.totalStars + stars;
    for (const sm of STAR_MILESTONES) {
      const prevStars = totalStarsNow - stars;
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
            });
          }
        }
      }
    }

    // First mode clear
    if (prevModePlayed === 0 && mode !== 'classic') {
      const modeConfig = MODE_CONFIGS[mode as keyof typeof MODE_CONFIGS];
      if (modeConfig) {
        player.queueCeremony({
          type: 'first_mode_clear',
          data: { modeId: mode, modeName: modeConfig.name },
        });
      }
    }

    // Mastery tier-up detection (XP proxy: puzzlesSolved * 100)
    const prevMasteryXP = (player.puzzlesSolved - 1) * 100;
    const newMasteryXP = player.puzzlesSolved * 100;
    const prevMasteryTier = getMasteryTierForXP(prevMasteryXP);
    const newMasteryTier = getMasteryTierForXP(newMasteryXP);
    if (newMasteryTier > prevMasteryTier) {
      // Build reward description from mastery data
      const tierReward = MASTERY_REWARDS.find(r => r.tier === newMasteryTier);
      const rewardParts: string[] = [];
      if (tierReward) {
        if (tierReward.free.coins) rewardParts.push(`${tierReward.free.coins} coins`);
        if (tierReward.free.gems) rewardParts.push(`${tierReward.free.gems} gems`);
        if (tierReward.free.hintTokens) rewardParts.push(`${tierReward.free.hintTokens} hints`);
      }
      summaryItems.push({
        type: 'mastery_tier_up',
        icon: '\uD83C\uDFC6',
        label: `Mastery Tier ${newMasteryTier}!`,
        sublabel: rewardParts.length > 0 ? `Claim: ${rewardParts.join(', ')}` : 'Claim your rewards!',
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

    // Award mystery wheel free spin progress
    player.awardFreeSpin();

    // Update win streak
    player.updateWinStreak(true);

    // Award seasonal stamp based on puzzles solved this season
    const currentAlbum = getCurrentSeasonAlbum();
    if (currentAlbum) {
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

    // Generate share text (include referral code for viral deep link)
    const grid = params.board ? (params.board as Board).grid : null;
    const shareText = grid
      ? generateShareText(grid, level, stars, score, 0, isDaily, player.referralCode || undefined)
      : '';

    // Firestore social layer: submit scores + sync profile
    const displayName = player.equippedTitle || 'Player';

    if (isDaily && userId) {
      void firestoreService.submitDailyScore(userId, score, stars, level, displayName);
    }

    if (userId) {
      void firestoreService.submitWeeklyScore(userId, score, displayName);
    }

    if (userId) {
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
                  ? { level: newLevel, difficulty: getDifficultyForLevel(newLevel) }
                  : null,
                shareText,
                friendComparison: result,
                eventMultiplierLabel,
                showTomorrowPreview: puzzlesAfterThis <= 5,
                summaryItems,
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
            level: newLevel,
            difficulty: getDifficultyForLevel(newLevel),
          } : null,
          shareText,
          friendComparison,
          eventMultiplierLabel,
          showTomorrowPreview: puzzlesAfterThis <= 5,
          summaryItems,
        },
      });
    }

  }, [params, player, economy, navigation, userId]);

  return handleComplete;
}
