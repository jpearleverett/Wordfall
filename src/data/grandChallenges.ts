export interface GrandChallenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  durationDays: number;
  target: number;
  trackingKey: string;
  reward: { coins: number; gems: number; cosmetic?: string };
  difficulty: 'normal' | 'hard' | 'legendary';
}

export const GRAND_CHALLENGES: GrandChallenge[] = [
  {
    id: 'grand_100_puzzles',
    name: 'Century Solver',
    description: 'Solve 100 puzzles in 7 days',
    icon: '💯',
    durationDays: 7,
    target: 100,
    trackingKey: 'puzzles_solved',
    reward: { coins: 2000, gems: 50 },
    difficulty: 'normal',
  },
  {
    id: 'grand_500_words',
    name: 'Wordsmith',
    description: 'Find 500 words in 7 days',
    icon: '📖',
    durationDays: 7,
    target: 500,
    trackingKey: 'words_found',
    reward: { coins: 2500, gems: 60 },
    difficulty: 'normal',
  },
  {
    id: 'grand_50_perfect',
    name: 'Perfection',
    description: 'Get 50 perfect solves in 14 days',
    icon: '✨',
    durationDays: 14,
    target: 50,
    trackingKey: 'perfect_solves',
    reward: { coins: 3000, gems: 80, cosmetic: 'title_perfectionist' },
    difficulty: 'hard',
  },
  {
    id: 'grand_all_modes',
    name: 'Mode Master',
    description: 'Win in all 10 modes in 7 days',
    icon: '🎮',
    durationDays: 7,
    target: 10,
    trackingKey: 'unique_modes_won',
    reward: { coins: 2000, gems: 50 },
    difficulty: 'normal',
  },
  {
    id: 'grand_30_streak',
    name: 'Unbreakable',
    description: 'Maintain a 30-day login streak',
    icon: '🔥',
    durationDays: 30,
    target: 30,
    trackingKey: 'login_streak',
    reward: { coins: 5000, gems: 150, cosmetic: 'frame_legendary' },
    difficulty: 'legendary',
  },
  {
    id: 'grand_3star_20',
    name: 'Star Collector',
    description: 'Get 3 stars on 20 levels in 7 days',
    icon: '⭐',
    durationDays: 7,
    target: 20,
    trackingKey: 'three_star_clears',
    reward: { coins: 3000, gems: 75 },
    difficulty: 'hard',
  },
  {
    id: 'grand_score_200k',
    name: 'Score Legend',
    description: 'Earn 200,000 total score in 14 days',
    icon: '🏆',
    durationDays: 14,
    target: 200000,
    trackingKey: 'total_score',
    reward: { coins: 3500, gems: 90 },
    difficulty: 'hard',
  },
  {
    id: 'grand_atlas_3',
    name: 'Scholar',
    description: 'Complete 3 Atlas pages in 14 days',
    icon: '📚',
    durationDays: 14,
    target: 3,
    trackingKey: 'atlas_pages_completed',
    reward: { coins: 3000, gems: 80 },
    difficulty: 'hard',
  },
  {
    id: 'grand_no_hints_50',
    name: 'Pure Mind',
    description: 'Solve 50 puzzles without hints in 14 days',
    icon: '🧠',
    durationDays: 14,
    target: 50,
    trackingKey: 'no_hint_solves',
    reward: { coins: 5000, gems: 120, cosmetic: 'title_genius' },
    difficulty: 'legendary',
  },
  {
    id: 'grand_speed_30',
    name: 'Speed Demon',
    description: 'Solve 30 puzzles under 60 seconds in 7 days',
    icon: '⏱️',
    durationDays: 7,
    target: 30,
    trackingKey: 'speed_solves',
    reward: { coins: 4000, gems: 100, cosmetic: 'frame_speed' },
    difficulty: 'legendary',
  },
];

/** Check if a grand challenge is available for the player's level */
export function isGrandChallengeAvailable(
  challenge: GrandChallenge,
  playerLevel: number,
): boolean {
  switch (challenge.difficulty) {
    case 'normal':
      return true;
    case 'hard':
      return playerLevel >= 15;
    case 'legendary':
      return playerLevel >= 30;
    default:
      return false;
  }
}

/** Generate 2-3 active grand challenges appropriate for the player's level */
export function generateActiveGrandChallenges(
  playerLevel: number,
): GrandChallenge[] {
  const available = GRAND_CHALLENGES.filter((c) =>
    isGrandChallengeAvailable(c, playerLevel),
  );

  // Shuffle available challenges
  const shuffled = [...available].sort(() => Math.random() - 0.5);

  // Pick 2-3 challenges, ensuring difficulty variety when possible
  const count = playerLevel >= 30 ? 3 : 2;
  const selected: GrandChallenge[] = [];
  const usedDifficulties: string[] = [];

  for (const challenge of shuffled) {
    if (selected.length >= count) break;

    // Prefer variety in difficulty, but allow duplicates if needed
    if (!usedDifficulties.includes(challenge.difficulty) || selected.length < count) {
      selected.push(challenge);
      if (!usedDifficulties.includes(challenge.difficulty)) {
        usedDifficulties.push(challenge.difficulty);
      }
    }
  }

  return selected;
}
