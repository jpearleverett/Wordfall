import { DailyMission, CollectionReward } from '../types';

// ── Mission Templates ───────────────────────────────────────────────────────

export interface MissionTemplate {
  id: string;
  description: string;
  type: DailyMission['type'];
  target: number;
  reward: CollectionReward;
  weight: number; // Higher = more likely to appear
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  // Find Words
  {
    id: 'find_10_words',
    description: 'Find 10 words in any mode',
    type: 'findWords',
    target: 10,
    reward: { coins: 100, gems: 2, hintTokens: 1 },
    weight: 10,
  },
  {
    id: 'find_25_words',
    description: 'Find 25 words in any mode',
    type: 'findWords',
    target: 25,
    reward: { coins: 200, gems: 3, hintTokens: 2 },
    weight: 8,
  },
  {
    id: 'find_50_words',
    description: 'Find 50 words in any mode',
    type: 'findWords',
    target: 50,
    reward: { coins: 400, gems: 5, hintTokens: 3 },
    weight: 4,
  },

  // Complete Puzzles
  {
    id: 'complete_3_puzzles',
    description: 'Complete 3 puzzles',
    type: 'completePuzzles',
    target: 3,
    reward: { coins: 150, gems: 2, hintTokens: 1 },
    weight: 10,
  },
  {
    id: 'complete_5_puzzles',
    description: 'Complete 5 puzzles',
    type: 'completePuzzles',
    target: 5,
    reward: { coins: 250, gems: 3, hintTokens: 2 },
    weight: 7,
  },
  {
    id: 'complete_10_puzzles',
    description: 'Complete 10 puzzles',
    type: 'completePuzzles',
    target: 10,
    reward: { coins: 500, gems: 5, hintTokens: 3 },
    weight: 3,
  },

  // Achieve Combo
  {
    id: 'achieve_3x_combo',
    description: 'Achieve a 3x combo',
    type: 'achieveCombo',
    target: 3,
    reward: { coins: 150, gems: 2, hintTokens: 1 },
    weight: 8,
  },
  {
    id: 'achieve_5x_combo',
    description: 'Achieve a 5x combo',
    type: 'achieveCombo',
    target: 5,
    reward: { coins: 300, gems: 5, hintTokens: 2 },
    weight: 5,
  },
  {
    id: 'achieve_8x_combo',
    description: 'Achieve an 8x combo',
    type: 'achieveCombo',
    target: 8,
    reward: { coins: 500, gems: 10, hintTokens: 3 },
    weight: 2,
  },

  // No Hints
  {
    id: 'no_hints_1',
    description: 'Complete a puzzle without hints',
    type: 'noHints',
    target: 1,
    reward: { coins: 200, gems: 3, hintTokens: 2 },
    weight: 8,
  },
  {
    id: 'no_hints_3',
    description: 'Complete 3 puzzles without hints',
    type: 'noHints',
    target: 3,
    reward: { coins: 400, gems: 5, hintTokens: 3 },
    weight: 4,
  },

  // Perfect Solve
  {
    id: 'perfect_solve_1',
    description: 'Achieve a perfect solve',
    type: 'perfectSolve',
    target: 1,
    reward: { coins: 300, gems: 5, hintTokens: 2 },
    weight: 6,
  },
  {
    id: 'perfect_solve_3',
    description: 'Achieve 3 perfect solves',
    type: 'perfectSolve',
    target: 3,
    reward: { coins: 600, gems: 10, hintTokens: 5 },
    weight: 2,
  },

  // Use Mode
  {
    id: 'play_cascade',
    description: 'Play a Cascade mode puzzle',
    type: 'useMode',
    target: 1,
    reward: { coins: 150, gems: 2, hintTokens: 1 },
    weight: 6,
  },
  {
    id: 'play_time_pressure',
    description: 'Play a Time Pressure puzzle',
    type: 'useMode',
    target: 1,
    reward: { coins: 150, gems: 2, hintTokens: 1 },
    weight: 6,
  },
  {
    id: 'play_limited_moves',
    description: 'Play a Limited Moves puzzle',
    type: 'useMode',
    target: 1,
    reward: { coins: 150, gems: 2, hintTokens: 1 },
    weight: 6,
  },
  {
    id: 'play_relax',
    description: 'Play a Relax mode puzzle',
    type: 'useMode',
    target: 1,
    reward: { coins: 100, gems: 1, hintTokens: 1 },
    weight: 6,
  },
  {
    id: 'play_expert',
    description: 'Complete an Expert mode puzzle',
    type: 'useMode',
    target: 1,
    reward: { coins: 400, gems: 5, hintTokens: 3 },
    weight: 3,
  },
  {
    id: 'play_3_different_modes',
    description: 'Play 3 different game modes',
    type: 'useMode',
    target: 3,
    reward: { coins: 300, gems: 5, hintTokens: 2 },
    weight: 5,
  },

  // Complete Daily
  {
    id: 'complete_daily',
    description: 'Complete the Daily Challenge',
    type: 'completePuzzles',
    target: 1,
    reward: { coins: 200, gems: 3, hintTokens: 2 },
    weight: 10,
  },

  // Earn Stars
  {
    id: 'earn_5_stars',
    description: 'Earn 5 stars total',
    type: 'completePuzzles',
    target: 2,
    reward: { coins: 200, gems: 3, hintTokens: 1 },
    weight: 7,
  },
  {
    id: 'earn_3_star_rating',
    description: 'Get a 3-star rating on any puzzle',
    type: 'perfectSolve',
    target: 1,
    reward: { coins: 250, gems: 3, hintTokens: 2 },
    weight: 7,
  },
];

/**
 * Generate a set of daily missions using weighted random selection.
 * Returns 3 unique missions.
 */
export function generateDailyMissions(count: number = 3, seed?: number): DailyMission[] {
  // Create a weighted pool
  const pool: MissionTemplate[] = [];
  for (const template of MISSION_TEMPLATES) {
    for (let i = 0; i < template.weight; i++) {
      pool.push(template);
    }
  }

  // Simple seeded random for deterministic daily missions
  let rng = seed ?? Date.now();
  const random = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return rng / 0x7fffffff;
  };

  // Pick unique missions
  const selected: MissionTemplate[] = [];
  const usedIds = new Set<string>();

  while (selected.length < count && pool.length > 0) {
    const idx = Math.floor(random() * pool.length);
    const template = pool[idx];
    if (!usedIds.has(template.id)) {
      usedIds.add(template.id);
      selected.push(template);
    }
    pool.splice(idx, 1);
  }

  return selected.map((t) => ({
    id: t.id,
    description: t.description,
    target: t.target,
    progress: 0,
    completed: false,
    type: t.type,
    reward: t.reward,
  }));
}

/**
 * Get a deterministic seed for today's missions.
 */
export function getTodayMissionSeed(): number {
  const today = new Date().toISOString().split('T')[0];
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    const char = today.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
