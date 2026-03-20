export interface WeeklyGoalTemplate {
  id: string;
  description: string;
  target: number;
  trackingKey: 'puzzles_solved' | 'total_score' | 'stars_earned' | 'daily_completed' | 'perfect_solves' | 'words_found' | 'modes_played';
  reward: { coins: number; gems: number };
}

export const WEEKLY_GOAL_TEMPLATES: WeeklyGoalTemplate[] = [
  {
    id: 'weekly_puzzles_10',
    description: 'Solve 10 puzzles this week',
    target: 10,
    trackingKey: 'puzzles_solved',
    reward: { coins: 500, gems: 10 },
  },
  {
    id: 'weekly_puzzles_20',
    description: 'Solve 20 puzzles this week',
    target: 20,
    trackingKey: 'puzzles_solved',
    reward: { coins: 1000, gems: 20 },
  },
  {
    id: 'weekly_score_5k',
    description: 'Earn 5,000 total score this week',
    target: 5000,
    trackingKey: 'total_score',
    reward: { coins: 400, gems: 8 },
  },
  {
    id: 'weekly_score_15k',
    description: 'Earn 15,000 total score this week',
    target: 15000,
    trackingKey: 'total_score',
    reward: { coins: 800, gems: 15 },
  },
  {
    id: 'weekly_stars_15',
    description: 'Earn 15 stars this week',
    target: 15,
    trackingKey: 'stars_earned',
    reward: { coins: 600, gems: 12 },
  },
  {
    id: 'weekly_daily_5',
    description: 'Complete 5 daily challenges',
    target: 5,
    trackingKey: 'daily_completed',
    reward: { coins: 500, gems: 10 },
  },
  {
    id: 'weekly_perfect_3',
    description: 'Get 3 perfect solves',
    target: 3,
    trackingKey: 'perfect_solves',
    reward: { coins: 700, gems: 15 },
  },
  {
    id: 'weekly_modes_3',
    description: 'Play 3 different modes',
    target: 3,
    trackingKey: 'modes_played',
    reward: { coins: 400, gems: 8 },
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

/** Generate 3 random weekly goals */
export function generateWeeklyGoals(): WeeklyGoalsState {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const weekStart = monday.toISOString().split('T')[0];

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
    allCompleteBonus: { coins: 500, gems: 15 },
  };
}

/** Check if it's a new week compared to stored weekStart */
export function isNewWeek(weekStart: string): boolean {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const currentWeekStart = monday.toISOString().split('T')[0];
  return currentWeekStart !== weekStart;
}
