import {
  LOGIN_CALENDAR_REWARDS,
  LOGIN_CALENDAR_REWARDS_7,
  LOGIN_CALENDAR_REWARDS_30,
  getActiveLoginCalendar,
  getLoginCalendarDay,
  getLoginCalendarVariant,
  getLoginCycleLength,
  getNextLoginRewardPreview,
} from '../loginCalendar';
import * as remoteConfig from '../../services/remoteConfig';

describe('LOGIN_CALENDAR_REWARDS_30 data', () => {
  it('contains exactly 30 rewards', () => {
    expect(LOGIN_CALENDAR_REWARDS_30.length).toBe(30);
  });

  it('covers days 1 through 30', () => {
    const days = LOGIN_CALENDAR_REWARDS_30.map((r) => r.day);
    expect(days).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it('every reward has required fields', () => {
    for (const reward of LOGIN_CALENDAR_REWARDS_30) {
      expect(reward.day).toBeGreaterThan(0);
      expect(reward.day).toBeLessThanOrEqual(30);
      expect(reward.label).toBeTruthy();
      expect(reward.icon).toBeTruthy();
      expect(reward.rewards).toBeDefined();
    }
  });

  it('day 7 is a milestone with rare tile + gems', () => {
    const day7 = LOGIN_CALENDAR_REWARDS_30.find((r) => r.day === 7);
    expect(day7).toBeDefined();
    expect(day7!.rewards.coins).toBe(200);
    expect(day7!.rewards.gems).toBe(10);
    expect(day7!.rewards.rareTile).toBe(true);
  });

  it('day 14 is a mid-cycle milestone', () => {
    const day14 = LOGIN_CALENDAR_REWARDS_30.find((r) => r.day === 14);
    expect(day14).toBeDefined();
    expect(day14!.rewards.coins).toBe(400);
    expect(day14!.rewards.gems).toBe(25);
  });

  it('day 21 unlocks a cosmetic frame', () => {
    const day21 = LOGIN_CALENDAR_REWARDS_30.find((r) => r.day === 21);
    expect(day21).toBeDefined();
    expect(day21!.rewards.cosmetic).toBeTruthy();
  });

  it('day 30 is the grand prize with exclusive cosmetic + rare tile', () => {
    const day30 = LOGIN_CALENDAR_REWARDS_30.find((r) => r.day === 30);
    expect(day30).toBeDefined();
    expect(day30!.rewards.coins).toBe(1000);
    expect(day30!.rewards.gems).toBe(100);
    expect(day30!.rewards.rareTile).toBe(true);
    expect(day30!.rewards.cosmetic).toBeTruthy();
    expect(day30!.label).toMatch(/GRAND PRIZE/i);
  });

  it('rewards generally escalate across weeks', () => {
    const day1 = LOGIN_CALENDAR_REWARDS_30[0];
    const day30 = LOGIN_CALENDAR_REWARDS_30[29];
    expect(day30.rewards.coins!).toBeGreaterThan(day1.rewards.coins!);
  });
});

describe('LOGIN_CALENDAR_REWARDS_7 (legacy A/B variant)', () => {
  it('contains exactly 7 rewards', () => {
    expect(LOGIN_CALENDAR_REWARDS_7.length).toBe(7);
  });

  it('day 7 is the jackpot with rareTile', () => {
    const day7 = LOGIN_CALENDAR_REWARDS_7.find((r) => r.day === 7);
    expect(day7).toBeDefined();
    expect(day7!.rewards.rareTile).toBe(true);
    expect(day7!.label).toBe('JACKPOT!');
  });
});

describe('LOGIN_CALENDAR_REWARDS default export', () => {
  it('points at the 30-day table (current default)', () => {
    expect(LOGIN_CALENDAR_REWARDS).toBe(LOGIN_CALENDAR_REWARDS_30);
  });
});

describe('variant selection', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('defaults to 30day when Remote Config returns nothing', () => {
    expect(getLoginCalendarVariant()).toBe('30day');
    expect(getLoginCycleLength()).toBe(30);
    expect(getActiveLoginCalendar()).toBe(LOGIN_CALENDAR_REWARDS_30);
  });

  it('switches to 7day when Remote Config returns "7day"', () => {
    jest.spyOn(remoteConfig, 'getRemoteString').mockReturnValue('7day');
    expect(getLoginCalendarVariant()).toBe('7day');
    expect(getLoginCycleLength()).toBe(7);
    expect(getActiveLoginCalendar()).toBe(LOGIN_CALENDAR_REWARDS_7);
  });

  it('falls back to 30day for any unknown RC value', () => {
    jest.spyOn(remoteConfig, 'getRemoteString').mockReturnValue('bogus');
    expect(getLoginCalendarVariant()).toBe('30day');
  });
});

describe('getLoginCalendarDay (30-day default)', () => {
  it('returns correct reward for days 1-30', () => {
    for (let day = 1; day <= 30; day++) {
      const reward = getLoginCalendarDay(day);
      expect(reward.day).toBe(day);
    }
  });

  it('wraps day 31 to day 1', () => {
    expect(getLoginCalendarDay(31).day).toBe(1);
  });

  it('wraps day 60 to day 30', () => {
    expect(getLoginCalendarDay(60).day).toBe(30);
  });

  it('wraps day 61 to day 1', () => {
    expect(getLoginCalendarDay(61).day).toBe(1);
  });

  it('clamps day 0 to day 1', () => {
    const reward = getLoginCalendarDay(0);
    expect(reward.day).toBe(1);
  });

  it('clamps negative day to day 1', () => {
    const reward = getLoginCalendarDay(-5);
    expect(reward.day).toBe(1);
  });
});

describe('getLoginCalendarDay (7-day variant)', () => {
  beforeEach(() => {
    jest.spyOn(remoteConfig, 'getRemoteString').mockReturnValue('7day');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns correct reward for days 1-7', () => {
    for (let day = 1; day <= 7; day++) {
      const reward = getLoginCalendarDay(day);
      expect(reward.day).toBe(day);
    }
  });

  it('wraps day 8 to day 1', () => {
    expect(getLoginCalendarDay(8).day).toBe(1);
  });

  it('wraps day 14 to day 7', () => {
    expect(getLoginCalendarDay(14).day).toBe(7);
  });

  it('wraps day 15 to day 1', () => {
    expect(getLoginCalendarDay(15).day).toBe(1);
  });
});

describe('getNextLoginRewardPreview (30-day default)', () => {
  it('returns day 2 reward when current day is 1', () => {
    expect(getNextLoginRewardPreview(1).day).toBe(2);
  });

  it('returns day 30 reward when current day is 29', () => {
    expect(getNextLoginRewardPreview(29).day).toBe(30);
  });

  it('wraps to day 1 reward when current day is 30', () => {
    expect(getNextLoginRewardPreview(30).day).toBe(1);
  });

  it('wraps correctly past a full cycle (day 60 → day 1)', () => {
    expect(getNextLoginRewardPreview(60).day).toBe(1);
  });
});
