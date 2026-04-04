/**
 * Mystery Wheel — High-variance reward mechanic.
 *
 * Players earn a free spin after every 8 puzzles completed, or can buy spins with gems.
 * The wheel has weighted segments creating genuine uncertainty (variable ratio reinforcement).
 *
 * Design philosophy: Most spins yield small rewards, but the rare jackpot possibility
 * creates the anticipation-dopamine loop that drives engagement.
 */

export interface WheelSegment {
  id: string;
  label: string;
  icon: string;
  reward: WheelReward;
  weight: number; // Higher = more likely. Weights are relative, not percentages.
  color: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface WheelReward {
  coins?: number;
  gems?: number;
  hints?: number;
  rareTile?: boolean;
  cosmetic?: string;
  mysteryBox?: boolean; // Opens a second random reward
  booster?: 'freezeColumn' | 'boardPreview' | 'shuffleFiller';
  xpMultiplier?: { multiplier: number; durationMinutes: number };
}

export interface MysteryWheelState {
  spinsAvailable: number;
  puzzlesSinceLastSpin: number;
  puzzlesPerFreeSpin: number;
  totalSpins: number;
  lastJackpotSpin: number; // Total spin number of last jackpot (for pity)
  jackpotPity: number; // Guaranteed jackpot (rare+) within this many spins
}

export const DEFAULT_MYSTERY_WHEEL_STATE: MysteryWheelState = {
  spinsAvailable: 1, // Start with 1 free spin as a taste
  puzzlesSinceLastSpin: 0,
  puzzlesPerFreeSpin: 8,
  totalSpins: 0,
  lastJackpotSpin: 0,
  jackpotPity: 25, // Guaranteed rare+ within 25 spins
};

/**
 * Standard wheel segments — 10 slices.
 * Weights sum to 100 for easy percentage reasoning.
 */
export const WHEEL_SEGMENTS: WheelSegment[] = [
  {
    id: 'coins_small',
    label: '50 Coins',
    icon: '\u{1FA99}',
    reward: { coins: 50 },
    weight: 21,
    color: '#cd7f32',
    rarity: 'common',
  },
  {
    id: 'coins_medium',
    label: '150 Coins',
    icon: '\u{1FA99}',
    reward: { coins: 150 },
    weight: 15,
    color: '#daa520',
    rarity: 'common',
  },
  {
    id: 'hints_small',
    label: '2 Hints',
    icon: '\u{1F4A1}',
    reward: { hints: 2 },
    weight: 18,
    color: '#5c9ead',
    rarity: 'common',
  },
  {
    id: 'booster_shuffle',
    label: 'Shuffle',
    icon: '\u{1F500}',
    reward: { booster: 'shuffleFiller' },
    weight: 12,
    color: '#6c5ce7',
    rarity: 'uncommon',
  },
  {
    id: 'gems_small',
    label: '5 Gems',
    icon: '\u{1F48E}',
    reward: { gems: 5 },
    weight: 10,
    color: '#00d4ff',
    rarity: 'uncommon',
  },
  {
    id: 'booster_preview',
    label: 'Preview',
    icon: '\u{1F441}\u{FE0F}',
    reward: { booster: 'boardPreview' },
    weight: 8,
    color: '#a855f7',
    rarity: 'uncommon',
  },
  {
    id: 'mystery_box',
    label: 'Mystery Box',
    icon: '\u{1F381}',
    reward: { mysteryBox: true },
    weight: 5,
    color: '#ff6b6b',
    rarity: 'rare',
  },
  {
    id: 'rare_tile',
    label: 'Rare Tile!',
    icon: '\u{2B50}',
    reward: { rareTile: true },
    weight: 4,
    color: '#ffd700',
    rarity: 'rare',
  },
  {
    id: 'gems_jackpot',
    label: '25 Gems!',
    icon: '\u{1F48E}\u{2728}',
    reward: { gems: 25 },
    weight: 3,
    color: '#00ffcc',
    rarity: 'epic',
  },
  {
    id: 'xp_boost',
    label: '2x XP!',
    icon: '\u{1F680}',
    reward: { xpMultiplier: { multiplier: 2, durationMinutes: 30 } },
    weight: 3,
    color: '#ff9f43',
    rarity: 'epic',
  },
  {
    id: 'gems_500_jackpot',
    label: '500 Gems!',
    icon: '\u{1F451}',
    reward: { gems: 500 },
    weight: 1,
    color: '#ffd700',
    rarity: 'legendary',
  },
];

/**
 * Mystery Box secondary reward table — opened when landing on Mystery Box.
 * These are always good-to-great rewards.
 */
export const MYSTERY_BOX_REWARDS: { label: string; icon: string; reward: WheelReward; weight: number }[] = [
  { label: '300 Coins', icon: '\u{1FA99}', reward: { coins: 300 }, weight: 30 },
  { label: '10 Gems', icon: '\u{1F48E}', reward: { gems: 10 }, weight: 25 },
  { label: '5 Hints', icon: '\u{1F4A1}', reward: { hints: 5 }, weight: 20 },
  { label: 'Rare Tile!', icon: '\u{2B50}', reward: { rareTile: true }, weight: 10 },
  { label: 'Freeze Booster', icon: '\u{2744}\u{FE0F}', reward: { booster: 'freezeColumn' }, weight: 10 },
  { label: '50 Gems!!', icon: '\u{1F48E}\u{1F525}', reward: { gems: 50 }, weight: 5 },
];

/**
 * Weighted random selection using cumulative distribution.
 */
export function spinWheel(state: MysteryWheelState): {
  segment: WheelSegment;
  segmentIndex: number;
  updatedState: MysteryWheelState;
} {
  const newTotalSpins = state.totalSpins + 1;
  const spinsSinceJackpot = newTotalSpins - state.lastJackpotSpin;

  // Pity system: if approaching pity limit, boost rare+ weights
  let segments = WHEEL_SEGMENTS;
  if (spinsSinceJackpot >= state.jackpotPity - 3) {
    // Force a rare+ segment when at pity limit
    if (spinsSinceJackpot >= state.jackpotPity) {
      segments = segments.filter((s) => s.rarity === 'rare' || s.rarity === 'epic' || s.rarity === 'legendary');
    }
  }

  const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;

  let selectedIndex = 0;
  for (let i = 0; i < segments.length; i++) {
    random -= segments[i].weight;
    if (random <= 0) {
      selectedIndex = i;
      break;
    }
  }

  const segment = segments[selectedIndex];
  const isJackpot = segment.rarity === 'rare' || segment.rarity === 'epic' || segment.rarity === 'legendary';

  // Find the real index in WHEEL_SEGMENTS (in case we filtered for pity)
  const realIndex = WHEEL_SEGMENTS.findIndex((s) => s.id === segment.id);

  return {
    segment,
    segmentIndex: realIndex >= 0 ? realIndex : selectedIndex,
    updatedState: {
      ...state,
      spinsAvailable: state.spinsAvailable - 1,
      totalSpins: newTotalSpins,
      lastJackpotSpin: isJackpot ? newTotalSpins : state.lastJackpotSpin,
    },
  };
}

/**
 * Roll a mystery box secondary reward.
 */
export function openMysteryBox(): { label: string; icon: string; reward: WheelReward } {
  const totalWeight = MYSTERY_BOX_REWARDS.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;

  for (const entry of MYSTERY_BOX_REWARDS) {
    random -= entry.weight;
    if (random <= 0) {
      return entry;
    }
  }
  return MYSTERY_BOX_REWARDS[0];
}

/**
 * Check if player earned a free spin after completing a puzzle.
 */
export function checkFreeSpin(state: MysteryWheelState): MysteryWheelState {
  const newPuzzleCount = state.puzzlesSinceLastSpin + 1;
  if (newPuzzleCount >= state.puzzlesPerFreeSpin) {
    return {
      ...state,
      spinsAvailable: state.spinsAvailable + 1,
      puzzlesSinceLastSpin: 0,
    };
  }
  return {
    ...state,
    puzzlesSinceLastSpin: newPuzzleCount,
  };
}

/**
 * Check if a daily free spin is available.
 * Players get one free spin per calendar day (in addition to puzzle-earned spins).
 *
 * @param lastDailySpinDate - ISO date string of the last daily spin used (e.g. '2026-04-02')
 * @returns true if the daily free spin has not yet been used today
 */
export function checkDailyFreeSpin(lastDailySpinDate: string): boolean {
  if (!lastDailySpinDate) return true;
  const today = new Date().toISOString().split('T')[0];
  return lastDailySpinDate !== today;
}

/** Cost to buy a single spin with gems */
export const SPIN_COST_GEMS = 15;

/** Cost to buy a 5-pack of spins with gems (discount) */
export const SPIN_BUNDLE_COST_GEMS = 60;
export const SPIN_BUNDLE_COUNT = 5;
