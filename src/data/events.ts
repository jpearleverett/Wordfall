import { GameEvent, EventType, EventExclusiveReward } from '../types';

/**
 * 12-week rotating event calendar.
 * Events repeat on a seasonal basis with different themes.
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
      { tier: 'gold', threshold: 3000, rewards: { coins: 1000, gems: 30, hintTokens: 10, badge: 'speed_demon' } },
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
      { tier: 'gold', threshold: 15, rewards: { coins: 1200, gems: 30, hintTokens: 10, badge: 'perfectionist' } },
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
      { tier: 'gold', threshold: 30000, rewards: { coins: 2000, gems: 50, hintTokens: 15, badge: 'rally_hero' } },
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
      { tier: 'gold', threshold: 6000, rewards: { coins: 1500, gems: 30, hintTokens: 10, badge: 'chain_master' } },
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
      { tier: 'gold', threshold: 50, rewards: { coins: 1500, gems: 40, hintTokens: 15, badge: 'mystery_solver' } },
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
      { tier: 'gold', threshold: 3500, rewards: { coins: 1200, gems: 30, hintTokens: 10, badge: 'retro_fan' } },
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
      { tier: 'gold', threshold: 3000, rewards: { coins: 1400, gems: 30, hintTokens: 10, badge: 'nature_expert' } },
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
      { tier: 'gold', threshold: 7000, rewards: { coins: 2000, gems: 50, hintTokens: 15, badge: 'gauntlet_survivor' } },
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
      { tier: 'gold', threshold: 750000, rewards: { coins: 1000, gems: 30, hintTokens: 10, badge: 'community_hero' } },
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
      { tier: 'gold', threshold: 10000, rewards: { coins: 2500, gems: 60, hintTokens: 20, badge: 'season_champion' } },
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
      { tier: 'gold', threshold: 3000, rewards: { coins: 1500, gems: 30, hintTokens: 10, badge: 'blitz_warrior' } },
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
      { tier: 'gold', threshold: 3000, rewards: { coins: 1400, gems: 30, hintTokens: 10, badge: 'science_expert' } },
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
      { tier: 'gold', threshold: 3000, rewards: { coins: 1400, gems: 30, hintTokens: 10, badge: 'ocean_explorer' } },
      { tier: 'diamond', threshold: 5000, rewards: { coins: 2800, gems: 50, hintTokens: 20, decoration: 'ship_wheel' } },
    ],
  },
];

/**
 * Generate a scheduled event for a given week number (0-indexed, repeats every 12 weeks).
 */
export function getEventForWeek(weekNumber: number): GameEvent {
  const templateIndex = weekNumber % EVENT_TEMPLATES.length;
  const template = EVENT_TEMPLATES[templateIndex];

  // Calculate start/end dates based on week number relative to a reference date
  const referenceDate = new Date('2026-01-05'); // First Monday of 2026
  const startDate = new Date(referenceDate);
  startDate.setDate(startDate.getDate() + weekNumber * 7);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  return {
    ...template,
    id: `event_w${weekNumber}_${template.type}`,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    active: true,
  };
}

/**
 * Get the current active event based on today's date.
 */
export function getCurrentEvent(): GameEvent | null {
  const now = new Date();
  const referenceDate = new Date('2026-01-05');
  const diffMs = now.getTime() - referenceDate.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));

  if (diffWeeks < 0) return null;
  return getEventForWeek(diffWeeks);
}
