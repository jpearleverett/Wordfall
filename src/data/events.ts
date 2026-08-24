import { GameEvent, EventType, EventExclusiveReward } from '../types';

/**
 * 12-week rotating event calendar.
 * Events repeat on a seasonal basis with different themes.
 *
 * Tier rewards may only carry keys the claim path actually delivers:
 * coins / gems / hintTokens (credited by EventScreen's claim handler) and
 * `decoration` (granted via unlockDecoration). Gold tiers used to also list
 * a `badge`, but the client has no badge ledger, so every one was silently
 * dropped at claim time — they were removed rather than left as an empty
 * promise. Re-add badges only together with a store that records them.
 */
export const EVENT_TEMPLATES: Omit<GameEvent, 'id' | 'startDate' | 'endDate' | 'active'>[] = [
  {
    type: 'speedSolve',
    name: 'Speed Blitz',
    description: 'Solve puzzles as fast as possible! Top times earn exclusive rewards.',
    rules: { timeLimit: 60, bonusPerSecondRemaining: 50 },
    exclusiveReward: { type: 'frame', id: 'speed_demon_frame', name: 'Speed Demon Frame', rarity: 'epic' },
    isTimeLimited: true,
    rewards: [
      { tier: 'bronze', threshold: 500, rewards: { coins: 200, gems: 5, hintTokens: 3 } },
      { tier: 'silver', threshold: 1500, rewards: { coins: 500, gems: 15, hintTokens: 5 } },
      { tier: 'gold', threshold: 3000, rewards: { coins: 1000, gems: 30, hintTokens: 10 } },
      { tier: 'diamond', threshold: 5000, rewards: { coins: 2000, gems: 50, hintTokens: 20, decoration: 'speed_trophy' } },
    ],
  },
  {
    type: 'perfectClear',
    name: 'Perfect Week',
    description: 'Achieve the most perfect clears this week. No hints, no undos!',
    rules: { noHints: true, noUndo: true, scoreMultiplier: 2 },
    exclusiveReward: { type: 'title', id: 'perfectionist_title', name: 'The Perfectionist', rarity: 'epic' },
    isTimeLimited: true,
    rewards: [
      { tier: 'bronze', threshold: 3, rewards: { coins: 300, gems: 5, hintTokens: 3 } },
      { tier: 'silver', threshold: 7, rewards: { coins: 600, gems: 15, hintTokens: 5 } },
      { tier: 'gold', threshold: 15, rewards: { coins: 1200, gems: 30, hintTokens: 10 } },
      { tier: 'diamond', threshold: 25, rewards: { coins: 2500, gems: 50, hintTokens: 20, decoration: 'diamond_plaque' } },
    ],
  },
  {
    type: 'clubRally',
    name: 'Club Rally',
    description: 'Your club competes together! Combined scores determine club ranking.',
    rules: { teamMode: true, clubScoreMultiplier: 1.5 },
    exclusiveReward: { type: 'decoration', id: 'rally_banner', name: 'Rally Banner', rarity: 'rare' },
    isTimeLimited: true,
    rewards: [
      { tier: 'bronze', threshold: 5000, rewards: { coins: 500, gems: 10, hintTokens: 5 } },
      { tier: 'silver', threshold: 15000, rewards: { coins: 1000, gems: 25, hintTokens: 10 } },
      { tier: 'gold', threshold: 30000, rewards: { coins: 2000, gems: 50, hintTokens: 15 } },
      { tier: 'diamond', threshold: 50000, rewards: { coins: 4000, gems: 100, hintTokens: 25, decoration: 'rally_banner' } },
    ],
  },
  {
    type: 'gravityFlipChampionship',
    name: 'Gravity Flip Championship',
    description: 'Master rotating gravity! Gravity Flip mode with boosted multipliers.',
    rules: { gravityFlipBoost: 2, minWordCount: 3 },
    exclusiveReward: { type: 'frame', id: 'gravity_flip_crown_frame', name: 'Gravity Flip Crown', rarity: 'legendary' },
    isTimeLimited: true,
    rewards: [
      { tier: 'bronze', threshold: 1000, rewards: { coins: 300, gems: 5, hintTokens: 3 } },
      { tier: 'silver', threshold: 3000, rewards: { coins: 700, gems: 15, hintTokens: 5 } },
      { tier: 'gold', threshold: 6000, rewards: { coins: 1500, gems: 30, hintTokens: 10 } },
      { tier: 'diamond', threshold: 10000, rewards: { coins: 3000, gems: 50, hintTokens: 20, decoration: 'gravity_flip_crystal' } },
    ],
  },
  {
    type: 'mysteryWords',
    name: 'Mystery Words',
    description: 'Words are hidden! Find them without seeing the word bank.',
    rules: { hiddenWordBank: true, revealOnFind: true, bonusScore: 200 },
    exclusiveReward: { type: 'decoration', id: 'mystery_orb', name: 'Mystery Orb', rarity: 'epic' },
    isTimeLimited: true,
    rewards: [
      { tier: 'bronze', threshold: 10, rewards: { coins: 400, gems: 10, hintTokens: 5 } },
      { tier: 'silver', threshold: 25, rewards: { coins: 800, gems: 20, hintTokens: 10 } },
      { tier: 'gold', threshold: 50, rewards: { coins: 1500, gems: 40, hintTokens: 15 } },
      { tier: 'diamond', threshold: 75, rewards: { coins: 3000, gems: 75, hintTokens: 25, decoration: 'mystery_orb' } },
    ],
  },
  {
    type: 'retroRewind',
    name: 'Retro Rewind',
    description: 'Replay classic puzzles with a retro theme and boosted rewards.',
    rules: { retro: true, rewardMultiplier: 1.5 },
    exclusiveReward: { type: 'title', id: 'retro_master_title', name: 'Retro Master', rarity: 'rare' },
    isTimeLimited: true,
    rewards: [
      { tier: 'bronze', threshold: 500, rewards: { coins: 250, gems: 5, hintTokens: 3 } },
      { tier: 'silver', threshold: 1500, rewards: { coins: 600, gems: 15, hintTokens: 5 } },
      { tier: 'gold', threshold: 3500, rewards: { coins: 1200, gems: 30, hintTokens: 10 } },
      { tier: 'diamond', threshold: 6000, rewards: { coins: 2500, gems: 50, hintTokens: 20, decoration: 'retro_arcade' } },
    ],
  },
  {
    type: 'themeWeek',
    name: 'Nature Week',
    description: 'All puzzles feature nature-themed words. Bonus for nature atlas words!',
    rules: { themeCategory: 'nature', atlasBonus: true },
    exclusiveReward: { type: 'frame', id: 'nature_bloom_frame', name: 'Nature Bloom Frame', rarity: 'rare' },
    isTimeLimited: true,
    rewards: [
      { tier: 'bronze', threshold: 500, rewards: { coins: 300, gems: 5, hintTokens: 3 } },
      { tier: 'silver', threshold: 1500, rewards: { coins: 700, gems: 15, hintTokens: 5 } },
      { tier: 'gold', threshold: 3000, rewards: { coins: 1400, gems: 30, hintTokens: 10 } },
      { tier: 'diamond', threshold: 5000, rewards: { coins: 2800, gems: 50, hintTokens: 20, decoration: 'nature_painting' } },
    ],
  },
  {
    type: 'expertGauntlet',
    name: 'Expert Gauntlet',
    description: 'Expert-difficulty puzzles only. No hints, no undos, maximum glory.',
    rules: { difficulty: 'expert', noHints: true, noUndo: true, scoreMultiplier: 3 },
    exclusiveReward: { type: 'title', id: 'gauntlet_survivor', name: 'Gauntlet Survivor', rarity: 'legendary' },
    isTimeLimited: true,
    rewards: [
      { tier: 'bronze', threshold: 1000, rewards: { coins: 500, gems: 10, hintTokens: 5 } },
      { tier: 'silver', threshold: 3000, rewards: { coins: 1000, gems: 25, hintTokens: 10 } },
      { tier: 'gold', threshold: 7000, rewards: { coins: 2000, gems: 50, hintTokens: 15 } },
      { tier: 'diamond', threshold: 12000, rewards: { coins: 4000, gems: 100, hintTokens: 30, decoration: 'gauntlet_shield' } },
    ],
  },
  {
    type: 'communityMilestone',
    name: 'Community Goal',
    description: 'All players work together to reach a massive word-finding goal!',
    rules: { communityTarget: 1000000 },
    exclusiveReward: { type: 'decoration', id: 'community_star', name: 'Community Star', rarity: 'rare' },
    isTimeLimited: true,
    communityGoal: 1000000,
    communityProgress: 0,
    rewards: [
      { tier: 'bronze', threshold: 250000, rewards: { coins: 200, gems: 5, hintTokens: 3 } },
      { tier: 'silver', threshold: 500000, rewards: { coins: 500, gems: 15, hintTokens: 5 } },
      { tier: 'gold', threshold: 750000, rewards: { coins: 1000, gems: 30, hintTokens: 10 } },
      { tier: 'diamond', threshold: 1000000, rewards: { coins: 2000, gems: 50, hintTokens: 20, decoration: 'community_statue' } },
    ],
  },
  {
    type: 'seasonFinale',
    name: 'Season Finale',
    description: 'The grand finale! Compete for the top spot with boosted everything.',
    rules: { allModesUnlocked: true, scoreMultiplier: 2, bonusStamps: true },
    exclusiveReward: { type: 'frame', id: 'season_champion_frame', name: 'Season Champion Frame', rarity: 'legendary' },
    isTimeLimited: true,
    rewards: [
      { tier: 'bronze', threshold: 2000, rewards: { coins: 500, gems: 15, hintTokens: 5 } },
      { tier: 'silver', threshold: 5000, rewards: { coins: 1000, gems: 30, hintTokens: 10 } },
      { tier: 'gold', threshold: 10000, rewards: { coins: 2500, gems: 60, hintTokens: 20 } },
      { tier: 'diamond', threshold: 20000, rewards: { coins: 5000, gems: 100, hintTokens: 30, decoration: 'season_throne' } },
    ],
  },
  {
    type: 'weekendBlitz',
    name: 'Weekend Blitz',
    description: 'Saturday and Sunday only! Double XP and increased rare tile drop rates.',
    rules: { doubleXP: true, rareTileDropBoost: 2, durationDays: 2 },
    exclusiveReward: { type: 'title', id: 'blitz_warrior', name: 'Blitz Warrior', rarity: 'rare' },
    isTimeLimited: true,
    rewards: [
      { tier: 'bronze', threshold: 500, rewards: { coins: 300, gems: 5, hintTokens: 3 } },
      { tier: 'silver', threshold: 1500, rewards: { coins: 700, gems: 15, hintTokens: 5 } },
      { tier: 'gold', threshold: 3000, rewards: { coins: 1500, gems: 30, hintTokens: 10 } },
      { tier: 'diamond', threshold: 5000, rewards: { coins: 3000, gems: 50, hintTokens: 20, decoration: 'blitz_trophy' } },
    ],
  },
  {
    type: 'themeWeek',
    name: 'Science Week',
    description: 'All puzzles feature science-themed words. Perfect for the curious mind.',
    rules: { themeCategory: 'science', atlasBonus: true },
    exclusiveReward: { type: 'frame', id: 'cosmic_frame', name: 'Cosmic Frame', rarity: 'epic' },
    isTimeLimited: true,
    rewards: [
      { tier: 'bronze', threshold: 500, rewards: { coins: 300, gems: 5, hintTokens: 3 } },
      { tier: 'silver', threshold: 1500, rewards: { coins: 700, gems: 15, hintTokens: 5 } },
      { tier: 'gold', threshold: 3000, rewards: { coins: 1400, gems: 30, hintTokens: 10 } },
      { tier: 'diamond', threshold: 5000, rewards: { coins: 2800, gems: 50, hintTokens: 20, decoration: 'lab_equipment' } },
    ],
  },
  {
    type: 'themeWeek',
    name: 'Ocean Week',
    description: 'Dive deep into ocean-themed word puzzles all week!',
    rules: { themeCategory: 'ocean', atlasBonus: true },
    exclusiveReward: { type: 'decoration', id: 'ocean_wave_deco', name: 'Ocean Wave', rarity: 'epic' },
    isTimeLimited: true,
    rewards: [
      { tier: 'bronze', threshold: 500, rewards: { coins: 300, gems: 5, hintTokens: 3 } },
      { tier: 'silver', threshold: 1500, rewards: { coins: 700, gems: 15, hintTokens: 5 } },
      { tier: 'gold', threshold: 3000, rewards: { coins: 1400, gems: 30, hintTokens: 10 } },
      { tier: 'diamond', threshold: 5000, rewards: { coins: 2800, gems: 50, hintTokens: 20, decoration: 'ship_wheel' } },
    ],
  },
];

/**
 * Generate a scheduled event for a given week number (0-indexed, repeats every 12 weeks).
 */
export function getEventForWeek(weekNumber: number): GameEvent {
  const templateIndex = weekNumber % 12; // 12-week rotation cycle
  const template = EVENT_TEMPLATES[templateIndex];

  // Calculate start/end dates in pure UTC epoch math, matching how
  // getCurrentEvent selects the week (Monday 00:00 UTC rollover) and how
  // eventManager parses endDate (`endDate + 'T23:59:59.999Z'`). The old code
  // advanced weeks with LOCAL setDate on a UTC-midnight reference and then
  // re-serialized via toISOString() — in any zone whose DST-summer offset
  // exceeds its Jan 5 offset (US / EU / UK), that emitted both dates one UTC
  // day early, so the event vanished from the active list a full day before
  // the rotation advanced, stranding reached-but-unclaimed tiers.
  const DAY_MS = 24 * 60 * 60 * 1000;
  const startMs = Date.UTC(2026, 0, 5) + weekNumber * 7 * DAY_MS; // First Monday of 2026
  const endMs = startMs + 6 * DAY_MS;

  return {
    ...template,
    id: `event_w${weekNumber}_${template.type}`,
    startDate: new Date(startMs).toISOString().split('T')[0],
    endDate: new Date(endMs).toISOString().split('T')[0],
    active: true,
  };
}

/**
 * Get the current active event based on today's date.
 *
 * Respects the `weekendBlitzEnabled` Remote Config flag as an ops
 * kill-switch: when the week would land on a weekendBlitz event and
 * the flag is false, return null so no event is shown (rather than
 * silently substituting another event, which would surprise players
 * expecting the regular rotation).
 */
export function getCurrentEvent(): GameEvent | null {
  const now = new Date();
  // Same UTC anchor as getEventForWeek — first Monday of 2026, 00:00 UTC.
  const diffMs = now.getTime() - Date.UTC(2026, 0, 5);
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));

  if (diffWeeks < 0) return null;
  const event = getEventForWeek(diffWeeks);

  if (event.type === 'weekendBlitz') {
    // Lazy-require to avoid a data -> services cycle.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getRemoteBoolean } = require('../services/remoteConfig') as {
      getRemoteBoolean: (key: string) => boolean;
    };
    if (!getRemoteBoolean('weekendBlitzEnabled')) return null;
  }

  return event;
}

// ── Event play configuration ────────────────────────────────────────────────

export interface EventPlayConfig {
  /** GameMode the event's puzzles actually run in. */
  mode: import('../types').GameMode;
  /** Countdown seconds (timePressure-mapped events only). */
  timeLimitSeconds?: number;
  /** Difficulty override (expert gauntlet). */
  difficulty?: import('../types').Difficulty;
  /** Theme word list (theme week). */
  themeWords?: string[];
}

/**
 * Map an event's authored rules onto the existing mode machinery.
 *
 * The event Play button used to hardcode mode:'classic' and never consult
 * `rules` at all — a player tapping Play during Expert Gauntlet got their
 * ordinary next level and correctly concluded events are a reskinned score
 * counter. Nothing new is invented here: every mapping reuses a shipped
 * mode (timer, perfect-solve, gravity flip) or the themeWords parameter the
 * generator already takes. Events with rules the engine can't express yet
 * (mysteryWords' hidden bank, clubRally's team scoring) stay classic.
 */
export function getEventPlayConfig(event: GameEvent | null): EventPlayConfig {
  if (!event) return { mode: 'classic' };
  switch (event.type) {
    case 'speedSolve':
      return {
        mode: 'timePressure',
        timeLimitSeconds: Number(event.rules?.timeLimit) > 0 ? Number(event.rules.timeLimit) : 60,
      };
    case 'perfectClear':
      return { mode: 'perfectSolve' };
    case 'expertGauntlet':
      return { mode: 'perfectSolve', difficulty: 'expert' };
    case 'gravityFlipChampionship':
      return { mode: 'gravityFlip' };
    case 'themeWeek': {
      // Curated nature list reusing the shared-board authoring bank.
      const { DAILY_THEMES } = require('./sharedBoardThemes') as
        typeof import('./sharedBoardThemes');
      const nature = DAILY_THEMES.filter((t) =>
        ['Garden Path', 'Jungle Trek', 'Rainstorm', 'Harvest Home'].includes(t.name),
      );
      return {
        mode: 'classic',
        themeWords: nature.flatMap((t) => t.words),
      };
    }
    default:
      return { mode: 'classic' };
  }
}
