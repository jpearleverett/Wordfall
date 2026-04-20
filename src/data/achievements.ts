export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'puzzle' | 'collection' | 'streak' | 'mode' | 'mastery';
  tiers: AchievementTier[];
  hidden?: boolean;
}

export interface AchievementTier {
  level: 'bronze' | 'silver' | 'gold';
  threshold: number;
  reward: { coins: number; gems: number };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Puzzle achievements
  {
    id: 'word_finder',
    name: 'Word Finder',
    description: 'Find words across all puzzles',
    icon: '📝',
    category: 'puzzle',
    tiers: [
      { level: 'bronze', threshold: 50, reward: { coins: 200, gems: 5 } },
      { level: 'silver', threshold: 250, reward: { coins: 500, gems: 15 } },
      { level: 'gold', threshold: 1000, reward: { coins: 1500, gems: 50 } },
    ],
  },
  {
    id: 'puzzle_solver',
    name: 'Puzzle Solver',
    description: 'Complete puzzles',
    icon: '🧩',
    category: 'puzzle',
    tiers: [
      { level: 'bronze', threshold: 10, reward: { coins: 200, gems: 5 } },
      { level: 'silver', threshold: 50, reward: { coins: 500, gems: 15 } },
      { level: 'gold', threshold: 200, reward: { coins: 1500, gems: 50 } },
    ],
  },
  {
    id: 'perfect_player',
    name: 'Perfect Player',
    description: 'Get perfect 3-star clears',
    icon: '✨',
    category: 'puzzle',
    tiers: [
      { level: 'bronze', threshold: 5, reward: { coins: 300, gems: 10 } },
      { level: 'silver', threshold: 25, reward: { coins: 800, gems: 25 } },
      { level: 'gold', threshold: 100, reward: { coins: 2000, gems: 75 } },
    ],
  },
  {
    id: 'high_scorer',
    name: 'High Scorer',
    description: 'Accumulate total score',
    icon: '🏅',
    category: 'puzzle',
    tiers: [
      { level: 'bronze', threshold: 5000, reward: { coins: 250, gems: 5 } },
      { level: 'silver', threshold: 25000, reward: { coins: 600, gems: 20 } },
      { level: 'gold', threshold: 100000, reward: { coins: 2000, gems: 60 } },
    ],
  },
  // Streak achievements
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Maintain a daily streak',
    icon: '🔥',
    category: 'streak',
    tiers: [
      { level: 'bronze', threshold: 7, reward: { coins: 300, gems: 10 } },
      { level: 'silver', threshold: 30, reward: { coins: 1000, gems: 30 } },
      { level: 'gold', threshold: 100, reward: { coins: 3000, gems: 100 } },
    ],
  },
  {
    id: 'daily_devotee',
    name: 'Daily Devotee',
    description: 'Complete daily challenges',
    icon: '☀️',
    category: 'streak',
    tiers: [
      { level: 'bronze', threshold: 7, reward: { coins: 200, gems: 5 } },
      { level: 'silver', threshold: 30, reward: { coins: 500, gems: 15 } },
      { level: 'gold', threshold: 100, reward: { coins: 1500, gems: 50 } },
    ],
  },

  // Collection achievements
  {
    id: 'atlas_scholar',
    name: 'Atlas Scholar',
    description: 'Complete Word Atlas pages',
    icon: '📚',
    category: 'collection',
    tiers: [
      { level: 'bronze', threshold: 3, reward: { coins: 400, gems: 10 } },
      { level: 'silver', threshold: 6, reward: { coins: 1000, gems: 30 } },
      { level: 'gold', threshold: 12, reward: { coins: 3000, gems: 100 } },
    ],
  },
  {
    id: 'tile_collector',
    name: 'Tile Collector',
    description: 'Collect rare tiles',
    icon: '💎',
    category: 'collection',
    tiers: [
      { level: 'bronze', threshold: 10, reward: { coins: 300, gems: 10 } },
      { level: 'silver', threshold: 26, reward: { coins: 800, gems: 25 } },
      { level: 'gold', threshold: 52, reward: { coins: 2000, gems: 75 } },
    ],
  },
  {
    id: 'library_restorer',
    name: 'Library Restorer',
    description: 'Restore library wings',
    icon: '🏛️',
    category: 'collection',
    tiers: [
      { level: 'bronze', threshold: 2, reward: { coins: 500, gems: 15 } },
      { level: 'silver', threshold: 5, reward: { coins: 1200, gems: 40 } },
      { level: 'gold', threshold: 8, reward: { coins: 3000, gems: 100 } },
    ],
  },

  // Mode achievements
  {
    id: 'mode_explorer',
    name: 'Mode Explorer',
    description: 'Play different game modes',
    icon: '🎮',
    category: 'mode',
    tiers: [
      { level: 'bronze', threshold: 3, reward: { coins: 200, gems: 5 } },
      { level: 'silver', threshold: 6, reward: { coins: 500, gems: 15 } },
      { level: 'gold', threshold: 10, reward: { coins: 1500, gems: 50 } },
    ],
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Win time pressure puzzles',
    icon: '⏱️',
    category: 'mode',
    tiers: [
      { level: 'bronze', threshold: 5, reward: { coins: 300, gems: 10 } },
      { level: 'silver', threshold: 20, reward: { coins: 800, gems: 25 } },
      { level: 'gold', threshold: 50, reward: { coins: 2000, gems: 75 } },
    ],
  },

  // Mastery achievements
  {
    id: 'level_climber',
    name: 'Level Climber',
    description: 'Reach higher levels',
    icon: '🏔️',
    category: 'mastery',
    tiers: [
      { level: 'bronze', threshold: 10, reward: { coins: 300, gems: 10 } },
      { level: 'silver', threshold: 25, reward: { coins: 800, gems: 25 } },
      { level: 'gold', threshold: 50, reward: { coins: 2000, gems: 75 } },
    ],
  },
  {
    id: 'star_collector',
    name: 'Star Collector',
    description: 'Earn total stars',
    icon: '⭐',
    category: 'mastery',
    tiers: [
      { level: 'bronze', threshold: 30, reward: { coins: 300, gems: 10 } },
      { level: 'silver', threshold: 100, reward: { coins: 800, gems: 30 } },
      { level: 'gold', threshold: 300, reward: { coins: 2500, gems: 80 } },
    ],
  },

  // Hidden achievements
  {
    id: 'speed_solver',
    name: 'Lightning Fast',
    description: 'Solve a puzzle in under 30 seconds',
    icon: '⚡',
    category: 'puzzle',
    hidden: true,
    tiers: [
      { level: 'bronze', threshold: 1, reward: { coins: 300, gems: 10 } },
      { level: 'silver', threshold: 5, reward: { coins: 800, gems: 25 } },
      { level: 'gold', threshold: 20, reward: { coins: 2000, gems: 75 } },
    ],
  },
  {
    id: 'no_hint_master',
    name: 'Pure Genius',
    description: 'Win puzzles without using any hints',
    icon: '🧠',
    category: 'puzzle',
    hidden: true,
    tiers: [
      { level: 'bronze', threshold: 10, reward: { coins: 400, gems: 10 } },
      { level: 'silver', threshold: 50, reward: { coins: 1000, gems: 30 } },
      { level: 'gold', threshold: 200, reward: { coins: 3000, gems: 100 } },
    ],
  },
  {
    id: 'combo_king',
    name: 'Combo King',
    description: 'Achieve a combo chain of N words',
    icon: '🔗',
    category: 'puzzle',
    hidden: true,
    tiers: [
      { level: 'bronze', threshold: 4, reward: { coins: 300, gems: 10 } },
      { level: 'silver', threshold: 6, reward: { coins: 800, gems: 30 } },
      { level: 'gold', threshold: 10, reward: { coins: 2000, gems: 75 } },
    ],
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Play between midnight and 5am',
    icon: '🦉',
    category: 'mastery',
    hidden: true,
    tiers: [
      { level: 'bronze', threshold: 1, reward: { coins: 200, gems: 5 } },
      { level: 'silver', threshold: 5, reward: { coins: 500, gems: 15 } },
      { level: 'gold', threshold: 20, reward: { coins: 1500, gems: 50 } },
    ],
  },
  {
    id: 'collector_supreme',
    name: 'Collector Supreme',
    description: 'Collect rare tiles',
    icon: '👑',
    category: 'collection',
    hidden: true,
    tiers: [
      { level: 'bronze', threshold: 20, reward: { coins: 500, gems: 15 } },
      { level: 'silver', threshold: 40, reward: { coins: 1500, gems: 50 } },
      { level: 'gold', threshold: 78, reward: { coins: 5000, gems: 150 } },
    ],
  },
  {
    id: 'marathon_player',
    name: 'Marathon Player',
    description: 'Solve puzzles in a single session',
    icon: '🏃',
    category: 'mastery',
    hidden: true,
    tiers: [
      { level: 'bronze', threshold: 10, reward: { coins: 400, gems: 10 } },
      { level: 'silver', threshold: 25, reward: { coins: 1000, gems: 30 } },
      { level: 'gold', threshold: 50, reward: { coins: 3000, gems: 100 } },
    ],
  },
];

/** Check which achievement tier a value qualifies for */
export function getAchievementTier(
  achievement: AchievementDef,
  value: number,
): 'bronze' | 'silver' | 'gold' | null {
  for (let i = achievement.tiers.length - 1; i >= 0; i--) {
    if (value >= achievement.tiers[i].threshold) {
      return achievement.tiers[i].level;
    }
  }
  return null;
}

/** Get the achievement tier ID string (e.g., "word_finder_gold") */
export function getAchievementTierId(achievementId: string, tier: string): string {
  return `${achievementId}_${tier}`;
}
