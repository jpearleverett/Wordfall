/**
 * Daily Free Reward Timers — 4 timed rewards that reset on different intervals.
 * Players can claim each reward once the cooldown has elapsed.
 */

export interface DailyRewardTimer {
  id: string;
  label: string;
  icon: string;
  /** Cooldown interval in milliseconds */
  intervalMs: number;
  reward: {
    coins?: number;
    gems?: number;
    hints?: number;
    spins?: number;
    /** If true, reward is rolled randomly via rollBonusChestReward() */
    random?: boolean;
  };
}

const HOUR = 60 * 60 * 1000;

export const DAILY_REWARD_TIMERS: DailyRewardTimer[] = [
  {
    id: 'free_coins',
    label: 'Free Coins',
    icon: '🪙',
    intervalMs: 4 * HOUR,
    reward: { coins: 100 },
  },
  {
    id: 'free_hint',
    label: 'Free Hint',
    icon: '💡',
    intervalMs: 6 * HOUR,
    reward: { hints: 1 },
  },
  {
    id: 'free_spin',
    label: 'Free Spin',
    icon: '🎰',
    intervalMs: 8 * HOUR,
    reward: { spins: 1 },
  },
  {
    id: 'bonus_chest',
    label: 'Bonus Chest',
    icon: '🎁',
    intervalMs: 12 * HOUR,
    reward: { random: true },
  },
];

/**
 * Returns true if the timer with the given ID can be claimed,
 * i.e. enough time has passed since lastClaimedAt.
 * If lastClaimedAt is 0 or undefined, the timer is claimable.
 */
export function canClaimTimer(timerId: string, lastClaimedAt: number): boolean {
  if (!lastClaimedAt) return true;
  const timer = DAILY_REWARD_TIMERS.find((t) => t.id === timerId);
  if (!timer) return false;
  return Date.now() - lastClaimedAt >= timer.intervalMs;
}

/**
 * Returns the number of milliseconds remaining until the timer can be claimed.
 * Returns 0 if the timer is already claimable.
 */
export function getTimeRemaining(timerId: string, lastClaimedAt: number): number {
  if (!lastClaimedAt) return 0;
  const timer = DAILY_REWARD_TIMERS.find((t) => t.id === timerId);
  if (!timer) return 0;
  const elapsed = Date.now() - lastClaimedAt;
  const remaining = timer.intervalMs - elapsed;
  return Math.max(0, remaining);
}

/**
 * Rolls a random reward for the bonus chest.
 * Weighted distribution:
 *   - 50% chance: coins (200-500, in increments of 50)
 *   - 30% chance: gems (3-8)
 *   - 20% chance: coins + gems combo
 */
export function rollBonusChestReward(): { coins?: number; gems?: number } {
  const roll = Math.random();

  if (roll < 0.5) {
    // Coins only: 200, 250, 300, 350, 400, 450, 500
    const coinTiers = [200, 250, 300, 350, 400, 450, 500];
    const coins = coinTiers[Math.floor(Math.random() * coinTiers.length)];
    return { coins };
  } else if (roll < 0.8) {
    // Gems only: 3-8
    const gems = 3 + Math.floor(Math.random() * 6);
    return { gems };
  } else {
    // Combo: smaller amounts of both
    const coins = 200 + Math.floor(Math.random() * 4) * 50; // 200-350
    const gems = 3 + Math.floor(Math.random() * 4); // 3-6
    return { coins, gems };
  }
}
