/**
 * Side objectives per GDD Section 7:
 * - Par challenges: Solve in N moves or fewer for bonus star
 * - No-hint streaks: Complete 5 puzzles without hints
 * - Speed runs: Complete a chapter under cumulative time target
 */

export interface SideObjective {
  id: string;
  type: 'par' | 'noHintStreak' | 'speedRun' | 'themeMaster';
  name: string;
  description: string;
  icon: string;
  target: number;
  reward: { coins: number; gems?: number; badge?: string };
}

export const SIDE_OBJECTIVES: SideObjective[] = [
  // Par challenges — solve in exactly word count moves
  {
    id: 'par_easy',
    type: 'par',
    name: 'Par Player',
    description: 'Solve 10 easy puzzles at par (minimum moves)',
    icon: '🎯',
    target: 10,
    reward: { coins: 500, gems: 10, badge: 'par_easy' },
  },
  {
    id: 'par_medium',
    type: 'par',
    name: 'Par Expert',
    description: 'Solve 10 medium puzzles at par',
    icon: '🎯',
    target: 10,
    reward: { coins: 1000, gems: 20, badge: 'par_medium' },
  },
  {
    id: 'par_hard',
    type: 'par',
    name: 'Par Master',
    description: 'Solve 10 hard puzzles at par',
    icon: '🎯',
    target: 10,
    reward: { coins: 2000, gems: 40, badge: 'par_hard' },
  },

  // No-hint streaks
  {
    id: 'no_hint_5',
    type: 'noHintStreak',
    name: 'Independent Thinker',
    description: 'Complete 5 puzzles in a row without hints',
    icon: '🧠',
    target: 5,
    reward: { coins: 300, badge: 'independent_5' },
  },
  {
    id: 'no_hint_10',
    type: 'noHintStreak',
    name: 'Self-Reliant',
    description: 'Complete 10 puzzles in a row without hints',
    icon: '🧠',
    target: 10,
    reward: { coins: 750, gems: 15, badge: 'self_reliant' },
  },
  {
    id: 'no_hint_25',
    type: 'noHintStreak',
    name: 'Hint Free',
    description: 'Complete 25 puzzles in a row without hints',
    icon: '🧠',
    target: 25,
    reward: { coins: 2000, gems: 50, badge: 'hint_free' },
  },

  // Speed runs
  {
    id: 'speed_chapter_1',
    type: 'speedRun',
    name: 'Quick Starter',
    description: 'Complete Chapter 1 in under 10 minutes total',
    icon: '⚡',
    target: 600,
    reward: { coins: 500, gems: 10, badge: 'quick_starter' },
  },
  {
    id: 'speed_chapter_5',
    type: 'speedRun',
    name: 'Speed Reader',
    description: 'Complete Chapter 5 in under 15 minutes total',
    icon: '⚡',
    target: 900,
    reward: { coins: 1000, gems: 25, badge: 'speed_reader' },
  },

  // Theme master
  {
    id: 'theme_nature',
    type: 'themeMaster',
    name: 'Nature Master',
    description: 'Find all nature-themed words across atlas pages',
    icon: '🌿',
    target: 1,
    reward: { coins: 1500, gems: 30, badge: 'nature_master' },
  },
  {
    id: 'theme_science',
    type: 'themeMaster',
    name: 'Science Master',
    description: 'Find all science-themed words across atlas pages',
    icon: '🔬',
    target: 1,
    reward: { coins: 1500, gems: 30, badge: 'science_master' },
  },
];
