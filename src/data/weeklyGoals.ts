export interface WeeklyGoalTemplate {
  id: string;
  description: string;
  target: number;
  /**
   * Only keys that useRewardWiring actually calls
   * `updateWeeklyGoalProgress` with. 'words_found' and 'modes_played' used
   * to be in this union and had six templates — but nothing ever updated
   * them, so those goals sat frozen at 0 all week (~60% of weeks drew at
   * least one). The seasonal-quest system tracks those two keys through its
   * own path; weekly goals must stick to the wired five unless the wiring
   * gains the key first.
   */
  trackingKey: 'puzzles_solved' | 'total_score' | 'stars_earned' | 'daily_completed' | 'perfect_solves';
  reward: { coins: number; gems: number };
}

export const WEEKLY_GOAL_TEMPLATES: WeeklyGoalTemplate[] = [
  {
    id: 'weekly_puzzles_10',
    description: 'Solve 10 puzzles this week',
    target: 10,
    trackingKey: 'puzzles_solved',
    reward: { coins: 250, gems: 5 },
  },
  {
    id: 'weekly_puzzles_20',
    description: 'Solve 20 puzzles this week',
    target: 20,
    trackingKey: 'puzzles_solved',
    reward: { coins: 500, gems: 10 },
  },
  {
    id: 'weekly_score_5k',
    description: 'Earn 5,000 total score this week',
    target: 5000,
    trackingKey: 'total_score',
    reward: { coins: 200, gems: 4 },
  },
  {
    id: 'weekly_score_15k',
    description: 'Earn 15,000 total score this week',
    target: 15000,
    trackingKey: 'total_score',
    reward: { coins: 400, gems: 8 },
  },
  {
    id: 'weekly_stars_15',
    description: 'Earn 15 stars this week',
    target: 15,
    trackingKey: 'stars_earned',
    reward: { coins: 300, gems: 6 },
  },
  {
    id: 'weekly_daily_5',
    description: 'Complete 5 daily challenges',
    target: 5,
    trackingKey: 'daily_completed',
    reward: { coins: 250, gems: 5 },
  },
  {
    id: 'weekly_perfect_3',
    description: 'Get 3 perfect solves',
    target: 3,
    trackingKey: 'perfect_solves',
    reward: { coins: 350, gems: 8 },
  },
  {
    id: 'weekly_stars_10',
    description: 'Earn 10 stars this week',
    target: 10,
    trackingKey: 'stars_earned',
    reward: { coins: 200, gems: 4 },
  },
  {
    id: 'weekly_daily_3',
    description: 'Complete 3 daily challenges',
    target: 3,
    trackingKey: 'daily_completed',
    reward: { coins: 200, gems: 4 },
  },
  {
    id: 'weekly_stars_40',
    description: 'Earn 40 stars this week',
    target: 40,
    trackingKey: 'stars_earned',
    reward: { coins: 500, gems: 10 },
  },
  {
    id: 'weekly_stars_30',
    description: 'Earn 30 stars this week',
    target: 30,
    trackingKey: 'stars_earned',
    reward: { coins: 400, gems: 8 },
  },
  {
    id: 'weekly_stars_50',
    description: 'Earn 50 stars this week',
    target: 50,
    trackingKey: 'stars_earned',
    reward: { coins: 600, gems: 13 },
  },
  {
    id: 'weekly_daily_7',
    description: 'Complete all 7 daily challenges',
    target: 7,
    trackingKey: 'daily_completed',
    reward: { coins: 500, gems: 10 },
  },
  {
    id: 'weekly_perfect_5',
    description: 'Get 5 perfect solves',
    target: 5,
    trackingKey: 'perfect_solves',
    reward: { coins: 450, gems: 9 },
  },
  {
    id: 'weekly_perfect_10',
    description: 'Get 10 perfect solves',
    target: 10,
    trackingKey: 'perfect_solves',
    reward: { coins: 750, gems: 15 },
  },
  {
    id: 'weekly_score_30k',
    description: 'Earn 30,000 total score this week',
    target: 30000,
    trackingKey: 'total_score',
    reward: { coins: 600, gems: 13 },
  },
  {
    id: 'weekly_score_50k',
    description: 'Earn 50,000 total score this week',
    target: 50000,
    trackingKey: 'total_score',
    reward: { coins: 750, gems: 15 },
  },
  {
    id: 'weekly_puzzles_30',
    description: 'Solve 30 puzzles this week',
    target: 30,
    trackingKey: 'puzzles_solved',
    reward: { coins: 600, gems: 13 },
  },
  {
    id: 'weekly_puzzles_50',
    description: 'Solve 50 puzzles this week',
    target: 50,
    trackingKey: 'puzzles_solved',
    reward: { coins: 1000, gems: 18 },
  },
  {
    id: 'weekly_score_10k',
    description: 'Earn 10,000 total score this week',
    target: 10000,
    trackingKey: 'total_score',
    reward: { coins: 300, gems: 6 },
  },
  {
    id: 'weekly_perfect_4',
    description: 'Get 4 perfect solves',
    target: 4,
    trackingKey: 'perfect_solves',
    reward: { coins: 400, gems: 8 },
  },
  {
    id: 'weekly_puzzles_40',
    description: 'Solve 40 puzzles this week',
    target: 40,
    trackingKey: 'puzzles_solved',
    reward: { coins: 750, gems: 15 },
  },
  {
    id: 'weekly_puzzles_75',
    description: 'Solve 75 puzzles this week',
    target: 75,
    trackingKey: 'puzzles_solved',
    reward: { coins: 1250, gems: 20 },
  },
  {
    id: 'weekly_score_100k',
    description: 'Earn 100,000 total score this week',
    target: 100000,
    trackingKey: 'total_score',
    reward: { coins: 1000, gems: 20 },
  },
];

export interface WeeklyGoal {
  templateId: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  trackingKey: string;
  reward: { coins: number; gems: number };
}

export interface WeeklyGoalsState {
  goals: WeeklyGoal[];
  weekStart: string;
  allCompleteBonus: { coins: number; gems: number };
}

/**
 * The Monday of the current week as a UTC date string.
 *
 * MUST be computed entirely in UTC. The old version found Monday with
 * LOCAL getDay()/setDate() and then serialized with toISOString() (UTC):
 * for any non-UTC player near the day boundary the two disagree, so the
 * stored weekStart didn't match the recomputed one and isNewWeek() reset
 * the player's weekly goals — wiping earned progress mid-week.
 */
function currentWeekStartUTC(now: Date = new Date()): string {
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + mondayOffset);
  return monday.toISOString().split('T')[0];
}

/** Generate 3 random weekly goals */
export function generateWeeklyGoals(): WeeklyGoalsState {
  const weekStart = currentWeekStartUTC();

  // Shuffle and pick 3
  const shuffled = [...WEEKLY_GOAL_TEMPLATES].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  return {
    goals: selected.map((t) => ({
      templateId: t.id,
      description: t.description,
      target: t.target,
      progress: 0,
      completed: false,
      trackingKey: t.trackingKey,
      reward: t.reward,
    })),
    weekStart,
    allCompleteBonus: { coins: 250, gems: 8 },
  };
}

/** Check if it's a new week compared to stored weekStart */
export function isNewWeek(weekStart: string): boolean {
  return currentWeekStartUTC() !== weekStart;
}
