import { MasteryReward } from '../types';

export const MASTERY_SEASON = 'Season 1: Dawn of Words';
export const MASTERY_MAX_TIER = 30;
export const MASTERY_XP_PER_TIER = 500;

export const MASTERY_REWARDS: MasteryReward[] = [
  // Tier 1-5: Early rewards
  { tier: 1, free: { coins: 100, gems: 0, hintTokens: 1 }, premium: { coins: 200, gems: 5, hintTokens: 2 }, claimed: false },
  { tier: 2, free: { coins: 150, gems: 0, hintTokens: 0 }, premium: { coins: 300, gems: 0, hintTokens: 2, badge: 'season1_starter' }, claimed: false },
  { tier: 3, free: { coins: 200, gems: 5, hintTokens: 1 }, premium: { coins: 400, gems: 10, hintTokens: 2 }, claimed: false },
  { tier: 4, free: { coins: 200, gems: 0, hintTokens: 0 }, premium: { coins: 400, gems: 5, hintTokens: 1, decoration: 'season1_banner' }, claimed: false },
  { tier: 5, free: { coins: 300, gems: 10, hintTokens: 2, badge: 'mastery_5' }, premium: { coins: 600, gems: 20, hintTokens: 3, decoration: 'season1_lamp' }, claimed: false },

  // Tier 6-10
  { tier: 6, free: { coins: 250, gems: 0, hintTokens: 1 }, premium: { coins: 500, gems: 10, hintTokens: 2 }, claimed: false },
  { tier: 7, free: { coins: 300, gems: 5, hintTokens: 0 }, premium: { coins: 600, gems: 15, hintTokens: 1 }, claimed: false },
  { tier: 8, free: { coins: 300, gems: 0, hintTokens: 2 }, premium: { coins: 600, gems: 10, hintTokens: 3, decoration: 'season1_rug' }, claimed: false },
  { tier: 9, free: { coins: 350, gems: 5, hintTokens: 0 }, premium: { coins: 700, gems: 15, hintTokens: 2 }, claimed: false },
  { tier: 10, free: { coins: 500, gems: 15, hintTokens: 3, badge: 'mastery_10' }, premium: { coins: 1000, gems: 30, hintTokens: 5, decoration: 'season1_bookshelf' }, claimed: false },

  // Tier 11-15
  { tier: 11, free: { coins: 400, gems: 5, hintTokens: 1 }, premium: { coins: 800, gems: 15, hintTokens: 2 }, claimed: false },
  { tier: 12, free: { coins: 400, gems: 0, hintTokens: 2 }, premium: { coins: 800, gems: 10, hintTokens: 3 }, claimed: false },
  { tier: 13, free: { coins: 450, gems: 10, hintTokens: 0 }, premium: { coins: 900, gems: 20, hintTokens: 2, decoration: 'season1_globe' }, claimed: false },
  { tier: 14, free: { coins: 450, gems: 0, hintTokens: 2 }, premium: { coins: 900, gems: 15, hintTokens: 3 }, claimed: false },
  { tier: 15, free: { coins: 600, gems: 20, hintTokens: 3, badge: 'mastery_15' }, premium: { coins: 1200, gems: 40, hintTokens: 5, decoration: 'season1_chandelier' }, claimed: false },

  // Tier 16-20
  { tier: 16, free: { coins: 500, gems: 10, hintTokens: 1 }, premium: { coins: 1000, gems: 20, hintTokens: 3 }, claimed: false },
  { tier: 17, free: { coins: 500, gems: 5, hintTokens: 2 }, premium: { coins: 1000, gems: 15, hintTokens: 3 }, claimed: false },
  { tier: 18, free: { coins: 550, gems: 10, hintTokens: 0 }, premium: { coins: 1100, gems: 25, hintTokens: 2, decoration: 'season1_painting' }, claimed: false },
  { tier: 19, free: { coins: 550, gems: 5, hintTokens: 2 }, premium: { coins: 1100, gems: 20, hintTokens: 3 }, claimed: false },
  { tier: 20, free: { coins: 800, gems: 30, hintTokens: 5, badge: 'mastery_20' }, premium: { coins: 1600, gems: 60, hintTokens: 8, decoration: 'season1_throne' }, claimed: false },

  // Tier 21-25
  { tier: 21, free: { coins: 600, gems: 10, hintTokens: 2 }, premium: { coins: 1200, gems: 25, hintTokens: 3 }, claimed: false },
  { tier: 22, free: { coins: 600, gems: 10, hintTokens: 0 }, premium: { coins: 1200, gems: 25, hintTokens: 2 }, claimed: false },
  { tier: 23, free: { coins: 650, gems: 15, hintTokens: 2 }, premium: { coins: 1300, gems: 30, hintTokens: 4, decoration: 'season1_stainedglass' }, claimed: false },
  { tier: 24, free: { coins: 650, gems: 10, hintTokens: 2 }, premium: { coins: 1300, gems: 25, hintTokens: 3 }, claimed: false },
  { tier: 25, free: { coins: 1000, gems: 40, hintTokens: 5, badge: 'mastery_25' }, premium: { coins: 2000, gems: 80, hintTokens: 10, decoration: 'season1_fountain' }, claimed: false },

  // Tier 26-30: Final stretch
  { tier: 26, free: { coins: 700, gems: 15, hintTokens: 2 }, premium: { coins: 1400, gems: 30, hintTokens: 4 }, claimed: false },
  { tier: 27, free: { coins: 700, gems: 15, hintTokens: 2 }, premium: { coins: 1400, gems: 35, hintTokens: 4 }, claimed: false },
  { tier: 28, free: { coins: 800, gems: 20, hintTokens: 3 }, premium: { coins: 1600, gems: 40, hintTokens: 5, decoration: 'season1_observatory' }, claimed: false },
  { tier: 29, free: { coins: 800, gems: 20, hintTokens: 3 }, premium: { coins: 1600, gems: 40, hintTokens: 5 }, claimed: false },
  { tier: 30, free: { coins: 1500, gems: 50, hintTokens: 8, badge: 'mastery_champion' }, premium: { coins: 3000, gems: 100, hintTokens: 15, badge: 'mastery_champion_premium', decoration: 'season1_grand_statue' }, claimed: false },
];

export const getMasteryTierForXP = (xp: number): number => {
  return Math.min(Math.floor(xp / MASTERY_XP_PER_TIER), MASTERY_MAX_TIER);
};

export const getXPProgressInTier = (xp: number): { current: number; needed: number } => {
  const tierXP = xp % MASTERY_XP_PER_TIER;
  return { current: tierXP, needed: MASTERY_XP_PER_TIER };
};
