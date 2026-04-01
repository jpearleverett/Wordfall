/**
 * Login Calendar — 7-day repeating reward cycle with escalating rewards.
 * Players claim one reward per day; the cycle repeats after day 7.
 */

export interface LoginCalendarReward {
  day: number;
  rewards: {
    coins?: number;
    gems?: number;
    hints?: number;
    rareTile?: boolean;
  };
  label: string;
  icon: string;
}

export const LOGIN_CALENDAR_REWARDS: LoginCalendarReward[] = [
  {
    day: 1,
    rewards: { coins: 100 },
    label: '100 Coins',
    icon: '🪙',
  },
  {
    day: 2,
    rewards: { hints: 2 },
    label: '2 Hints',
    icon: '💡',
  },
  {
    day: 3,
    rewards: { coins: 200 },
    label: '200 Coins',
    icon: '🪙',
  },
  {
    day: 4,
    rewards: { gems: 5 },
    label: '5 Gems',
    icon: '💎',
  },
  {
    day: 5,
    rewards: { hints: 3, coins: 300 },
    label: '3 Hints + 300 Coins',
    icon: '🎁',
  },
  {
    day: 6,
    rewards: { gems: 10 },
    label: '10 Gems',
    icon: '💎',
  },
  {
    day: 7,
    rewards: { coins: 500, gems: 15, rareTile: true },
    label: 'JACKPOT!',
    icon: '🏆',
  },
];

/**
 * Returns the reward definition for a given cycle day (1-7).
 * Wraps around so day 8 → day 1, day 14 → day 7, etc.
 */
export function getLoginCalendarDay(loginCycleDay: number): LoginCalendarReward {
  const wrappedDay = ((loginCycleDay - 1) % 7) + 1;
  const reward = LOGIN_CALENDAR_REWARDS.find((r) => r.day === wrappedDay);
  // Should never happen, but fallback to day 1
  return reward ?? LOGIN_CALENDAR_REWARDS[0];
}

/**
 * Returns a preview of tomorrow's reward (for retention hook display).
 * Given the current cycle day, returns what the next day's reward will be.
 */
export function getNextLoginRewardPreview(currentDay: number): LoginCalendarReward {
  return getLoginCalendarDay(currentDay + 1);
}
