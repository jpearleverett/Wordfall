import {
  DAILY_REWARD_TIMERS,
  canClaimTimer,
  getTimeRemaining,
  rollBonusChestReward,
} from '../dailyRewardTimers';

const HOUR = 60 * 60 * 1000;

describe('DAILY_REWARD_TIMERS data', () => {
  it('contains exactly 4 timers', () => {
    expect(DAILY_REWARD_TIMERS.length).toBe(4);
  });

  it('has expected timer IDs', () => {
    const ids = DAILY_REWARD_TIMERS.map((t) => t.id);
    expect(ids).toContain('free_coins');
    expect(ids).toContain('free_hint');
    expect(ids).toContain('free_spin');
    expect(ids).toContain('bonus_chest');
  });

  it('has correct intervals', () => {
    const freeCoins = DAILY_REWARD_TIMERS.find((t) => t.id === 'free_coins');
    const freeHint = DAILY_REWARD_TIMERS.find((t) => t.id === 'free_hint');
    const freeSpin = DAILY_REWARD_TIMERS.find((t) => t.id === 'free_spin');
    const bonusChest = DAILY_REWARD_TIMERS.find((t) => t.id === 'bonus_chest');

    expect(freeCoins!.intervalMs).toBe(4 * HOUR);
    expect(freeHint!.intervalMs).toBe(6 * HOUR);
    expect(freeSpin!.intervalMs).toBe(8 * HOUR);
    expect(bonusChest!.intervalMs).toBe(12 * HOUR);
  });

  it('every timer has required fields', () => {
    for (const timer of DAILY_REWARD_TIMERS) {
      expect(timer.id).toBeTruthy();
      expect(timer.label).toBeTruthy();
      expect(timer.icon).toBeTruthy();
      expect(timer.intervalMs).toBeGreaterThan(0);
      expect(timer.reward).toBeDefined();
    }
  });

  it('bonus_chest has random reward flag', () => {
    const chest = DAILY_REWARD_TIMERS.find((t) => t.id === 'bonus_chest');
    expect(chest!.reward.random).toBe(true);
  });
});

describe('canClaimTimer', () => {
  it('returns true when lastClaimedAt is 0', () => {
    expect(canClaimTimer('free_coins', 0)).toBe(true);
  });

  it('returns true when enough time has passed', () => {
    const now = Date.now();
    const fiveHoursAgo = now - 5 * HOUR;
    expect(canClaimTimer('free_coins', fiveHoursAgo)).toBe(true); // 4h interval
  });

  it('returns false when not enough time has passed', () => {
    const now = Date.now();
    const oneHourAgo = now - 1 * HOUR;
    expect(canClaimTimer('free_coins', oneHourAgo)).toBe(false); // 4h interval
  });

  it('returns true when exactly at the interval boundary', () => {
    const now = Date.now();
    const exactlyFourHoursAgo = now - 4 * HOUR;
    expect(canClaimTimer('free_coins', exactlyFourHoursAgo)).toBe(true);
  });

  it('returns false for unknown timer', () => {
    expect(canClaimTimer('nonexistent', 0)).toBe(true); // lastClaimedAt=0 short-circuits
    // With a real timestamp, unknown timer returns false
    expect(canClaimTimer('nonexistent', Date.now() - HOUR)).toBe(false);
  });

  it('works correctly for each timer', () => {
    const now = Date.now();
    // Just under the interval for each timer
    expect(canClaimTimer('free_hint', now - 5 * HOUR)).toBe(false); // needs 6h
    expect(canClaimTimer('free_hint', now - 7 * HOUR)).toBe(true);
    expect(canClaimTimer('free_spin', now - 7 * HOUR)).toBe(false); // needs 8h
    expect(canClaimTimer('free_spin', now - 9 * HOUR)).toBe(true);
    expect(canClaimTimer('bonus_chest', now - 11 * HOUR)).toBe(false); // needs 12h
    expect(canClaimTimer('bonus_chest', now - 13 * HOUR)).toBe(true);
  });
});

describe('getTimeRemaining', () => {
  it('returns 0 when lastClaimedAt is 0', () => {
    expect(getTimeRemaining('free_coins', 0)).toBe(0);
  });

  it('returns 0 when timer is already claimable', () => {
    const now = Date.now();
    expect(getTimeRemaining('free_coins', now - 5 * HOUR)).toBe(0);
  });

  it('returns positive value when timer is not claimable', () => {
    const now = Date.now();
    const remaining = getTimeRemaining('free_coins', now - 1 * HOUR);
    // Should be approximately 3 hours remaining
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(3 * HOUR + 1000); // small tolerance
  });

  it('returns 0 for unknown timer', () => {
    expect(getTimeRemaining('nonexistent', Date.now())).toBe(0);
  });

  it('never returns negative values', () => {
    const now = Date.now();
    const longAgo = now - 100 * HOUR;
    expect(getTimeRemaining('free_coins', longAgo)).toBe(0);
  });
});

describe('rollBonusChestReward', () => {
  it('returns an object with coins and/or gems', () => {
    // Run multiple times to check structure
    for (let i = 0; i < 20; i++) {
      const reward = rollBonusChestReward();
      expect(typeof reward).toBe('object');
      const hasCoins = reward.coins !== undefined && reward.coins > 0;
      const hasGems = reward.gems !== undefined && reward.gems > 0;
      expect(hasCoins || hasGems).toBe(true);
    }
  });

  it('coins are in expected range when present', () => {
    for (let i = 0; i < 50; i++) {
      const reward = rollBonusChestReward();
      if (reward.coins !== undefined) {
        expect(reward.coins).toBeGreaterThanOrEqual(200);
        expect(reward.coins).toBeLessThanOrEqual(500);
      }
    }
  });

  it('gems are in expected range when present', () => {
    for (let i = 0; i < 50; i++) {
      const reward = rollBonusChestReward();
      if (reward.gems !== undefined) {
        expect(reward.gems).toBeGreaterThanOrEqual(3);
        expect(reward.gems).toBeLessThanOrEqual(8);
      }
    }
  });
});
