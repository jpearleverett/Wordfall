import {
  LOGIN_CALENDAR_REWARDS,
  getLoginCalendarDay,
  getNextLoginRewardPreview,
} from '../loginCalendar';

describe('LOGIN_CALENDAR_REWARDS data', () => {
  it('contains exactly 7 rewards', () => {
    expect(LOGIN_CALENDAR_REWARDS.length).toBe(7);
  });

  it('covers days 1 through 7', () => {
    const days = LOGIN_CALENDAR_REWARDS.map((r) => r.day);
    expect(days).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('every reward has required fields', () => {
    for (const reward of LOGIN_CALENDAR_REWARDS) {
      expect(reward.day).toBeGreaterThan(0);
      expect(reward.day).toBeLessThanOrEqual(7);
      expect(reward.label).toBeTruthy();
      expect(reward.icon).toBeTruthy();
      expect(reward.rewards).toBeDefined();
    }
  });

  it('day 7 is the jackpot with rareTile', () => {
    const day7 = LOGIN_CALENDAR_REWARDS.find((r) => r.day === 7);
    expect(day7).toBeDefined();
    expect(day7!.rewards.coins).toBe(500);
    expect(day7!.rewards.gems).toBe(15);
    expect(day7!.rewards.rareTile).toBe(true);
    expect(day7!.label).toBe('JACKPOT!');
  });

  it('rewards generally escalate in value', () => {
    const day1 = LOGIN_CALENDAR_REWARDS[0];
    const day7 = LOGIN_CALENDAR_REWARDS[6];
    // Day 1 gives 100 coins, day 7 gives 500 coins + 15 gems + rare tile
    expect(day1.rewards.coins).toBe(100);
    expect(day7.rewards.coins!).toBeGreaterThan(day1.rewards.coins!);
  });
});

describe('getLoginCalendarDay', () => {
  it('returns correct reward for days 1-7', () => {
    for (let day = 1; day <= 7; day++) {
      const reward = getLoginCalendarDay(day);
      expect(reward.day).toBe(day);
    }
  });

  it('wraps day 8 to day 1', () => {
    const reward = getLoginCalendarDay(8);
    expect(reward.day).toBe(1);
  });

  it('wraps day 14 to day 7', () => {
    const reward = getLoginCalendarDay(14);
    expect(reward.day).toBe(7);
  });

  it('wraps day 15 to day 1', () => {
    const reward = getLoginCalendarDay(15);
    expect(reward.day).toBe(1);
  });

  it('handles day 0 gracefully', () => {
    // (0 - 1) % 7 + 1 = (-1 % 7) + 1 — JS modulo behavior
    const reward = getLoginCalendarDay(0);
    expect(reward).toBeDefined();
    expect(reward.day).toBeGreaterThanOrEqual(1);
    expect(reward.day).toBeLessThanOrEqual(7);
  });

  it('returns a valid LoginCalendarReward', () => {
    const reward = getLoginCalendarDay(3);
    expect(reward.day).toBe(3);
    expect(reward.rewards.coins).toBe(200);
    expect(reward.label).toBeTruthy();
  });
});

describe('getNextLoginRewardPreview', () => {
  it('returns day 2 reward when current day is 1', () => {
    const preview = getNextLoginRewardPreview(1);
    expect(preview.day).toBe(2);
  });

  it('returns day 7 reward when current day is 6', () => {
    const preview = getNextLoginRewardPreview(6);
    expect(preview.day).toBe(7);
  });

  it('wraps to day 1 reward when current day is 7', () => {
    const preview = getNextLoginRewardPreview(7);
    expect(preview.day).toBe(1);
  });

  it('wraps correctly for day 14 (shows day 1)', () => {
    const preview = getNextLoginRewardPreview(14);
    expect(preview.day).toBe(1);
  });
});
