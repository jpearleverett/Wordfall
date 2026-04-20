/**
 * Login Calendar — escalating reward cycle (default 30-day, A/B with 7-day).
 *
 * Cycle length is driven by `loginCalendarVariant` Remote Config knob:
 *  - '30day' (default) — weekly milestones at day 7/14/21, grand jackpot at day 30
 *  - '7day'            — legacy Phase 0 calendar, still a valid A/B variant
 *
 * Rewards below mirror `ECONOMY.loginRewards` in `src/constants.ts` so the
 * HomeScreen grid and the `App.tsx` claim path stay in lockstep. When the
 * Remote Config variant is '7day' the wrap point is day 7 (days 8+ collapse
 * back onto week 1). When '30day' wrap is day 30.
 */

import { getRemoteNumber, getRemoteString } from '../services/remoteConfig';

export interface LoginCalendarReward {
  day: number;
  rewards: {
    coins?: number;
    gems?: number;
    hints?: number;
    rareTile?: boolean;
    cosmetic?: string;
  };
  label: string;
  icon: string;
}

export type LoginCalendarVariant = '7day' | '30day';

/** 30-day escalating calendar. Tiers:
 *  Week 1 (days 1-7)   — onboarding ramp, day-7 milestone (200 coins + 10 gems + rare tile)
 *  Week 2 (days 8-14)  — mid-cycle pull, day-14 milestone (400 coins + 25 gems)
 *  Week 3 (days 15-21) — escalating rewards, day-21 unlocks cosmetic frame
 *  Week 4 (days 22-30) — peak rewards, day-30 grand prize (1000 coins + 100 gems + exclusive)
 */
export const LOGIN_CALENDAR_REWARDS_30: LoginCalendarReward[] = [
  // Week 1
  { day: 1,  rewards: { coins: 50 },                       label: '50 Coins',             icon: '🪙' },
  { day: 2,  rewards: { coins: 75 },                       label: '75 Coins',             icon: '🪙' },
  { day: 3,  rewards: { coins: 100, hints: 2 },            label: '100 Coins + 2 Hints',  icon: '💡' },
  { day: 4,  rewards: { coins: 125 },                      label: '125 Coins',            icon: '🪙' },
  { day: 5,  rewards: { coins: 150, gems: 5 },             label: '150 Coins + 5 Gems',   icon: '💎' },
  { day: 6,  rewards: { coins: 175, hints: 3 },            label: '175 Coins + 3 Hints',  icon: '💡' },
  { day: 7,  rewards: { coins: 200, gems: 10, rareTile: true }, label: 'Week 1 Milestone!', icon: '🏆' },
  // Week 2
  { day: 8,  rewards: { coins: 100, gems: 3 },             label: '100 Coins + 3 Gems',   icon: '💎' },
  { day: 9,  rewards: { coins: 125 },                      label: '125 Coins',            icon: '🪙' },
  { day: 10, rewards: { coins: 150, hints: 2 },            label: '150 Coins + 2 Hints',  icon: '💡' },
  { day: 11, rewards: { coins: 175, gems: 5 },             label: '175 Coins + 5 Gems',   icon: '💎' },
  { day: 12, rewards: { coins: 200 },                      label: '200 Coins',            icon: '🪙' },
  { day: 13, rewards: { coins: 250, hints: 3 },            label: '250 Coins + 3 Hints',  icon: '💡' },
  { day: 14, rewards: { coins: 400, gems: 25 },            label: 'Week 2 Milestone!',    icon: '🏆' },
  // Week 3
  { day: 15, rewards: { coins: 150, gems: 5 },             label: '150 Coins + 5 Gems',   icon: '💎' },
  { day: 16, rewards: { coins: 200, hints: 2 },            label: '200 Coins + 2 Hints',  icon: '💡' },
  { day: 17, rewards: { coins: 250, gems: 8 },             label: '250 Coins + 8 Gems',   icon: '💎' },
  { day: 18, rewards: { coins: 300, hints: 3 },            label: '300 Coins + 3 Hints',  icon: '💡' },
  { day: 19, rewards: { coins: 350, gems: 10 },            label: '350 Coins + 10 Gems',  icon: '💎' },
  { day: 20, rewards: { coins: 400, hints: 5 },            label: '400 Coins + 5 Hints',  icon: '💡' },
  { day: 21, rewards: { coins: 600, gems: 50, cosmetic: 'login_21_frame' }, label: 'Week 3 — Frame Unlock!', icon: '🎨' },
  // Week 4 / finale
  { day: 22, rewards: { coins: 200, gems: 8 },             label: '200 Coins + 8 Gems',   icon: '💎' },
  { day: 23, rewards: { coins: 250, hints: 3 },            label: '250 Coins + 3 Hints',  icon: '💡' },
  { day: 24, rewards: { coins: 300, gems: 10 },            label: '300 Coins + 10 Gems',  icon: '💎' },
  { day: 25, rewards: { coins: 350, hints: 5 },            label: '350 Coins + 5 Hints',  icon: '💡' },
  { day: 26, rewards: { coins: 400, gems: 15 },            label: '400 Coins + 15 Gems',  icon: '💎' },
  { day: 27, rewards: { coins: 450, hints: 5 },            label: '450 Coins + 5 Hints',  icon: '💡' },
  { day: 28, rewards: { coins: 500, gems: 20 },            label: '500 Coins + 20 Gems',  icon: '💎' },
  { day: 29, rewards: { coins: 500, gems: 25 },            label: '500 Coins + 25 Gems',  icon: '💎' },
  { day: 30, rewards: { coins: 1000, gems: 100, rareTile: true, cosmetic: 'login_30_exclusive' }, label: 'GRAND PRIZE!', icon: '🏆' },
];

/** Legacy 7-day calendar, still available as an A/B variant. */
export const LOGIN_CALENDAR_REWARDS_7: LoginCalendarReward[] = [
  { day: 1, rewards: { coins: 100 },                    label: '100 Coins',           icon: '🪙' },
  { day: 2, rewards: { hints: 2 },                      label: '2 Hints',             icon: '💡' },
  { day: 3, rewards: { coins: 200 },                    label: '200 Coins',           icon: '🪙' },
  { day: 4, rewards: { gems: 5 },                       label: '5 Gems',              icon: '💎' },
  { day: 5, rewards: { hints: 3, coins: 300 },          label: '3 Hints + 300 Coins', icon: '🎁' },
  { day: 6, rewards: { gems: 10 },                      label: '10 Gems',             icon: '💎' },
  { day: 7, rewards: { coins: 500, gems: 15, rareTile: true }, label: 'JACKPOT!',     icon: '🏆' },
];

/** Default export matches the active variant so imports stay stable. */
export const LOGIN_CALENDAR_REWARDS: LoginCalendarReward[] = LOGIN_CALENDAR_REWARDS_30;

/** Read the active variant from Remote Config (default '30day'). */
export function getLoginCalendarVariant(): LoginCalendarVariant {
  const v = getRemoteString('loginCalendarVariant');
  return v === '7day' ? '7day' : '30day';
}

/** Returns the reward table for the currently active cycle variant. */
export function getActiveLoginCalendar(): LoginCalendarReward[] {
  return getLoginCalendarVariant() === '7day'
    ? LOGIN_CALENDAR_REWARDS_7
    : LOGIN_CALENDAR_REWARDS_30;
}

/** Cycle length (7 or 30) for the active variant. */
export function getLoginCycleLength(): number {
  return getActiveLoginCalendar().length;
}

/**
 * Days to shift the Login Calendar wrap point so it doesn't coincide with
 * the Season Pass 30-day rotation. Only applies to the 30-day variant —
 * the 7-day A/B leaves wrap at day 7 to keep that variant's semantics intact.
 *
 * When offset > 0: new-player first login shows as `offset + 1` on the
 * calendar grid (richer rewards than day 1). Wrap happens after
 * `(cycleLength - offset)` distinct login days, so a perfect daily player
 * hits the Day-30 grand prize ~5 calendar days before the Season Pass
 * rotation instead of on the same day.
 */
export function getLoginCalendarOffsetDays(): number {
  if (getLoginCalendarVariant() !== '30day') return 0;
  const raw = getRemoteNumber('loginCalendarOffsetDays');
  const length = LOGIN_CALENDAR_REWARDS_30.length;
  // Clamp to [0, length-1] so we never produce a negative or wrap-breaking
  // value regardless of what Remote Config returns.
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(length - 1, Math.floor(raw)));
}

/**
 * Returns the reward definition for a given cycle day.
 * Wraps around the active cycle length: day (n+1) → day 1, etc.
 * Handles day <= 0 by clamping to day 1.
 */
export function getLoginCalendarDay(loginCycleDay: number): LoginCalendarReward {
  const table = getActiveLoginCalendar();
  const length = table.length;
  const safe = Math.max(1, Math.floor(loginCycleDay));
  const wrappedDay = ((safe - 1) % length) + 1;
  const reward = table.find((r) => r.day === wrappedDay);
  return reward ?? table[0];
}

/**
 * Returns a preview of tomorrow's reward (for retention hook display).
 * Given the current cycle day, returns what the next day's reward will be.
 */
export function getNextLoginRewardPreview(currentDay: number): LoginCalendarReward {
  return getLoginCalendarDay(currentDay + 1);
}
