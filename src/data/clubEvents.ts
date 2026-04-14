/**
 * Club Cooperative Events
 *
 * 8 club cooperative goal templates for shared club challenges.
 * Goals are selected based on club tier and member count.
 * Rewards distributed to all members upon tier completion.
 */

export interface ClubGoalRewardTier {
  tier: 'bronze' | 'silver' | 'gold';
  threshold: number; // percentage of target (e.g., 0.5 = 50%)
  rewards: {
    coins: number;
    gems: number;
    hintTokens?: number;
    exclusiveFrame?: string;
  };
}

export interface ClubGoalTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  baseTarget: number;
  trackingKey: ClubGoalTrackingKey;
  durationDays: 3 | 7;
  rewardTiers: ClubGoalRewardTier[];
  minClubTier?: 'bronze' | 'silver' | 'gold' | 'diamond';
}

export type ClubGoalTrackingKey =
  | 'words_found'
  | 'stars_earned'
  | 'perfect_solves'
  | 'chains_achieved'
  | 'puzzles_solved'
  | 'total_score'
  | 'hints_free_solves'
  | 'combos_achieved';

export interface ClubGoalContribution {
  userId: string;
  displayName: string;
  avatarId: string;
  amount: number;
}

export interface ActiveClubGoal {
  goalId: string;
  template: ClubGoalTemplate;
  target: number;
  startDate: string;
  endDate: string;
  contributions: ClubGoalContribution[];
  rewardsClaimed: ('bronze' | 'silver' | 'gold')[];
}

// ─── Goal Templates ──────────────────────────────────────────────────────────

export const CLUB_GOAL_TEMPLATES: ClubGoalTemplate[] = [
  {
    id: 'club_word_hunt',
    name: 'Club Word Hunt',
    description: 'Find {target} words collectively as a club',
    icon: '🔤',
    baseTarget: 500,
    trackingKey: 'words_found',
    durationDays: 7,
    rewardTiers: [
      { tier: 'bronze', threshold: 0.5, rewards: { coins: 200, gems: 5 } },
      { tier: 'silver', threshold: 0.75, rewards: { coins: 400, gems: 15, hintTokens: 3 } },
      { tier: 'gold', threshold: 1.0, rewards: { coins: 800, gems: 30, exclusiveFrame: 'frame_club_word_hunt' } },
    ],
  },
  {
    id: 'star_chasers',
    name: 'Star Chasers',
    description: 'Earn {target} stars as a club',
    icon: '⭐',
    baseTarget: 100,
    trackingKey: 'stars_earned',
    durationDays: 7,
    rewardTiers: [
      { tier: 'bronze', threshold: 0.5, rewards: { coins: 250, gems: 5 } },
      { tier: 'silver', threshold: 0.75, rewards: { coins: 500, gems: 20, hintTokens: 5 } },
      { tier: 'gold', threshold: 1.0, rewards: { coins: 1000, gems: 40, exclusiveFrame: 'frame_club_stars' } },
    ],
  },
  {
    id: 'perfect_together',
    name: 'Perfect Together',
    description: 'Achieve {target} perfect solves club-wide',
    icon: '💎',
    baseTarget: 20,
    trackingKey: 'perfect_solves',
    durationDays: 7,
    rewardTiers: [
      { tier: 'bronze', threshold: 0.5, rewards: { coins: 300, gems: 10 } },
      { tier: 'silver', threshold: 0.75, rewards: { coins: 600, gems: 25, hintTokens: 5 } },
      { tier: 'gold', threshold: 1.0, rewards: { coins: 1200, gems: 50, exclusiveFrame: 'frame_club_perfect' } },
    ],
  },
  {
    id: 'chain_masters',
    name: 'Chain Masters',
    description: 'Achieve {target} chains collectively',
    icon: '🔗',
    baseTarget: 50,
    trackingKey: 'chains_achieved',
    durationDays: 3,
    rewardTiers: [
      { tier: 'bronze', threshold: 0.5, rewards: { coins: 150, gems: 5 } },
      { tier: 'silver', threshold: 0.75, rewards: { coins: 300, gems: 10 } },
      { tier: 'gold', threshold: 1.0, rewards: { coins: 600, gems: 20, exclusiveFrame: 'frame_club_chains' } },
    ],
  },
  {
    id: 'puzzle_marathon',
    name: 'Puzzle Marathon',
    description: 'Complete {target} puzzles as a club',
    icon: '🏃',
    baseTarget: 200,
    trackingKey: 'puzzles_solved',
    durationDays: 7,
    rewardTiers: [
      { tier: 'bronze', threshold: 0.5, rewards: { coins: 200, gems: 5 } },
      { tier: 'silver', threshold: 0.75, rewards: { coins: 400, gems: 15, hintTokens: 3 } },
      { tier: 'gold', threshold: 1.0, rewards: { coins: 800, gems: 30, exclusiveFrame: 'frame_club_marathon' } },
    ],
  },
  {
    id: 'score_surge',
    name: 'Score Surge',
    description: 'Reach a combined score of {target} points',
    icon: '🚀',
    baseTarget: 50000,
    trackingKey: 'total_score',
    durationDays: 3,
    rewardTiers: [
      { tier: 'bronze', threshold: 0.5, rewards: { coins: 150, gems: 5 } },
      { tier: 'silver', threshold: 0.75, rewards: { coins: 350, gems: 12 } },
      { tier: 'gold', threshold: 1.0, rewards: { coins: 700, gems: 25, exclusiveFrame: 'frame_club_surge' } },
    ],
  },
  {
    id: 'no_hint_heroes',
    name: 'No-Hint Heroes',
    description: 'Complete {target} puzzles without hints club-wide',
    icon: '🧠',
    baseTarget: 30,
    trackingKey: 'hints_free_solves',
    durationDays: 7,
    rewardTiers: [
      { tier: 'bronze', threshold: 0.5, rewards: { coins: 250, gems: 8 } },
      { tier: 'silver', threshold: 0.75, rewards: { coins: 500, gems: 20, hintTokens: 5 } },
      { tier: 'gold', threshold: 1.0, rewards: { coins: 1000, gems: 40, exclusiveFrame: 'frame_club_nohint' } },
    ],
    minClubTier: 'silver',
  },
  {
    id: 'combo_frenzy',
    name: 'Combo Frenzy',
    description: 'Achieve {target} combos collectively',
    icon: '🔥',
    baseTarget: 80,
    trackingKey: 'combos_achieved',
    durationDays: 3,
    rewardTiers: [
      { tier: 'bronze', threshold: 0.5, rewards: { coins: 150, gems: 5 } },
      { tier: 'silver', threshold: 0.75, rewards: { coins: 300, gems: 12 } },
      { tier: 'gold', threshold: 1.0, rewards: { coins: 600, gems: 25, exclusiveFrame: 'frame_club_combo' } },
    ],
  },
];

// ─── Club Leaderboard Types ──────────────────────────────────────────────────

export interface ClubLeaderboardEntry {
  clubId: string;
  clubName: string;
  clubInitial: string;
  weeklyScore: number;
  memberCount: number;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  rank: number;
}

export interface ClubLeaderboardReward {
  rankRange: [number, number]; // inclusive
  coins: number;
  gems: number;
  exclusiveFrame?: string;
}

export const CLUB_LEADERBOARD_REWARDS: ClubLeaderboardReward[] = [
  { rankRange: [1, 1], coins: 2000, gems: 100, exclusiveFrame: 'frame_club_champion' },
  { rankRange: [2, 3], coins: 1200, gems: 60 },
  { rankRange: [4, 10], coins: 600, gems: 30 },
  { rankRange: [11, 25], coins: 300, gems: 15 },
  { rankRange: [26, 50], coins: 150, gems: 5 },
];

// ─── Functions ───────────────────────────────────────────────────────────────

const TIER_ORDER: Record<string, number> = { bronze: 0, silver: 1, gold: 2, diamond: 3 };

/**
 * Generate a club goal based on club tier and member count.
 * Higher tiers unlock more challenging goals; targets scale with member count.
 */
export function generateClubGoal(
  clubTier: 'bronze' | 'silver' | 'gold' | 'diamond',
  memberCount: number
): ActiveClubGoal {
  // Deterministic selection based on date — same goal for the whole club
  const now = new Date();
  const dateHash = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const template = CLUB_GOAL_TEMPLATES[dateHash % CLUB_GOAL_TEMPLATES.length];

  // Scale target by member count (minimum 5 members worth)
  const effectiveMembers = Math.max(memberCount, 5);
  const tierMultiplier = 1 + TIER_ORDER[clubTier] * 0.25;
  const memberScaling = effectiveMembers / 10; // base target assumes ~10 members
  const target = Math.round(template.baseTarget * memberScaling * tierMultiplier);

  // Calculate start and end dates
  const startDate = now.toISOString().split('T')[0];
  const endDate = new Date(now.getTime() + template.durationDays * 86400000)
    .toISOString()
    .split('T')[0];

  return {
    goalId: `${template.id}_${startDate}`,
    template,
    target,
    startDate,
    endDate,
    contributions: [],
    rewardsClaimed: [],
  };
}

/**
 * Calculate total progress from all member contributions.
 * Returns total amount and sorted contributor list.
 */
export function getClubGoalProgress(contributions: ClubGoalContribution[]): {
  total: number;
  topContributors: ClubGoalContribution[];
  contributorCount: number;
} {
  const total = contributions.reduce((sum, c) => sum + c.amount, 0);
  const sorted = [...contributions].sort((a, b) => b.amount - a.amount);

  return {
    total,
    topContributors: sorted.slice(0, 3),
    contributorCount: contributions.length,
  };
}

/**
 * Get which reward tiers have been reached for a goal.
 */
export function getReachedTiers(
  goal: ActiveClubGoal,
  totalProgress: number
): ('bronze' | 'silver' | 'gold')[] {
  const reached: ('bronze' | 'silver' | 'gold')[] = [];
  for (const rt of goal.template.rewardTiers) {
    if (totalProgress >= goal.target * rt.threshold) {
      reached.push(rt.tier);
    }
  }
  return reached;
}

/**
 * Get time remaining for an active club goal in milliseconds.
 */
export function getClubGoalTimeRemaining(endDate: string): number {
  const end = new Date(endDate + 'T23:59:59').getTime();
  return Math.max(0, end - Date.now());
}

/**
 * Format milliseconds into "Xd Xh" or "Xh Xm" display string.
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Ended';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Get the reward for a given leaderboard rank.
 */
export function getClubLeaderboardReward(rank: number): ClubLeaderboardReward | null {
  for (const reward of CLUB_LEADERBOARD_REWARDS) {
    if (rank >= reward.rankRange[0] && rank <= reward.rankRange[1]) {
      return reward;
    }
  }
  return null;
}
