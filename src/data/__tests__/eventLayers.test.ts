import {
  getMiniEventForDate,
  isWeekendBlitz,
  getActiveEventLayers,
  updateWinStreak,
  resetWinStreakRewards,
  WIN_STREAK_TIERS,
  DEFAULT_WIN_STREAK_STATE,
  WinStreakState,
} from '../eventLayers';

describe('getMiniEventForDate', () => {
  it('returns a mini event or null depending on the date', () => {
    // Test a range of dates and check that some return events and some return null
    let hasEvent = false;
    let hasNull = false;
    for (let d = 0; d < 10; d++) {
      const date = new Date(2026, 3, 1 + d); // April 2026
      const dateStr = date.toISOString().split('T')[0];
      const result = getMiniEventForDate(dateStr);
      if (result) hasEvent = true;
      else hasNull = true;
    }
    // Should have some days with events and some without (every 3rd day)
    expect(hasEvent).toBe(true);
    expect(hasNull).toBe(true);
  });

  it('returns a valid mini event object when present', () => {
    // Find a date that returns an event
    for (let d = 0; d < 10; d++) {
      const date = new Date(2026, 3, 1 + d);
      const dateStr = date.toISOString().split('T')[0];
      const result = getMiniEventForDate(dateStr);
      if (result) {
        expect(result.id).toBeTruthy();
        expect(result.name).toBeTruthy();
        expect(result.description).toBeTruthy();
        expect(result.icon).toBeTruthy();
        expect(result.durationHours).toBeGreaterThan(0);
        expect(result.multiplier).toBeGreaterThan(0);
        expect(result.rewards.length).toBeGreaterThan(0);
        expect(['double_coins', 'double_stars', 'bonus_hints', 'rare_tile_boost', 'xp_surge']).toContain(result.bonusType);
        break;
      }
    }
  });

  it('is deterministic (same date always returns same result)', () => {
    const dateStr = '2026-04-03';
    const result1 = getMiniEventForDate(dateStr);
    const result2 = getMiniEventForDate(dateStr);
    if (result1 && result2) {
      expect(result1.id).toBe(result2.id);
    } else {
      expect(result1).toEqual(result2);
    }
  });
});

describe('isWeekendBlitz', () => {
  it('returns true for Saturday', () => {
    // 2026-04-04 is a Saturday
    expect(isWeekendBlitz('2026-04-04')).toBe(true);
  });

  it('returns true for Sunday', () => {
    // 2026-04-05 is a Sunday
    expect(isWeekendBlitz('2026-04-05')).toBe(true);
  });

  it('returns false for Monday', () => {
    // 2026-04-06 is a Monday
    expect(isWeekendBlitz('2026-04-06')).toBe(false);
  });

  it('returns false for Wednesday', () => {
    // 2026-04-01 is a Wednesday
    expect(isWeekendBlitz('2026-04-01')).toBe(false);
  });

  it('returns false for Friday', () => {
    // 2026-04-03 is a Friday
    expect(isWeekendBlitz('2026-04-03')).toBe(false);
  });

  it('works without argument (uses current date)', () => {
    const result = isWeekendBlitz();
    expect(typeof result).toBe('boolean');
  });
});

describe('getActiveEventLayers', () => {
  it('returns all layer fields', () => {
    const result = getActiveEventLayers('2026-04-01', DEFAULT_WIN_STREAK_STATE);
    expect(result).toHaveProperty('mainEvent');
    expect(result).toHaveProperty('miniEvent');
    expect(result).toHaveProperty('miniEventEndTime');
    expect(result).toHaveProperty('miniEventProgress');
    expect(result).toHaveProperty('isWeekendBlitz');
    expect(result).toHaveProperty('winStreak');
    expect(result).toHaveProperty('partnerEvent');
  });

  it('partnerEvent is null (scaffolded)', () => {
    const result = getActiveEventLayers('2026-04-01', DEFAULT_WIN_STREAK_STATE);
    expect(result.partnerEvent).toBeNull();
  });

  it('miniEventProgress starts at 0', () => {
    const result = getActiveEventLayers('2026-04-01', DEFAULT_WIN_STREAK_STATE);
    expect(result.miniEventProgress).toBe(0);
  });

  it('correctly reflects weekend blitz status', () => {
    // Saturday
    const satResult = getActiveEventLayers('2026-04-04', DEFAULT_WIN_STREAK_STATE);
    expect(satResult.isWeekendBlitz).toBe(true);

    // Wednesday
    const wedResult = getActiveEventLayers('2026-04-01', DEFAULT_WIN_STREAK_STATE);
    expect(wedResult.isWeekendBlitz).toBe(false);
  });

  it('passes through win streak state', () => {
    const winState: WinStreakState = {
      currentStreak: 5,
      bestStreak: 10,
      lastWinDate: '2026-04-01',
      rewardsClaimed: [2, 3],
    };
    const result = getActiveEventLayers('2026-04-01', winState);
    expect(result.winStreak).toEqual(winState);
  });

  it('sets miniEventEndTime when mini event is active', () => {
    // Find a date with a mini event
    for (let d = 0; d < 10; d++) {
      const date = new Date(2026, 3, 1 + d);
      const dateStr = date.toISOString().split('T')[0];
      const result = getActiveEventLayers(dateStr, DEFAULT_WIN_STREAK_STATE);
      if (result.miniEvent) {
        expect(result.miniEventEndTime).toBeGreaterThan(0);
        break;
      }
    }
  });
});

describe('updateWinStreak', () => {
  it('increments streak on win', () => {
    const { newState } = updateWinStreak(DEFAULT_WIN_STREAK_STATE, true, '2026-04-01');
    expect(newState.currentStreak).toBe(1);
    expect(newState.lastWinDate).toBe('2026-04-01');
  });

  it('resets streak on loss', () => {
    const state: WinStreakState = {
      currentStreak: 5,
      bestStreak: 10,
      lastWinDate: '2026-04-01',
      rewardsClaimed: [],
    };
    const { newState } = updateWinStreak(state, false, '2026-04-02');
    expect(newState.currentStreak).toBe(0);
  });

  it('updates bestStreak when current exceeds it', () => {
    const state: WinStreakState = {
      currentStreak: 4,
      bestStreak: 4,
      lastWinDate: '2026-04-01',
      rewardsClaimed: [],
    };
    const { newState } = updateWinStreak(state, true, '2026-04-02');
    expect(newState.currentStreak).toBe(5);
    expect(newState.bestStreak).toBe(5);
  });

  it('does not decrease bestStreak on loss', () => {
    const state: WinStreakState = {
      currentStreak: 3,
      bestStreak: 10,
      lastWinDate: '2026-04-01',
      rewardsClaimed: [],
    };
    const { newState } = updateWinStreak(state, false, '2026-04-02');
    expect(newState.bestStreak).toBe(10);
  });

  it('earns tier reward at streak milestone', () => {
    // Build up to streak of 3 (hat trick)
    const state: WinStreakState = {
      currentStreak: 2,
      bestStreak: 2,
      lastWinDate: '2026-04-01',
      rewardsClaimed: [2], // Already claimed tier 2
    };
    const { newState, earnedTiers } = updateWinStreak(state, true, '2026-04-02');
    expect(newState.currentStreak).toBe(3);
    // Should earn the tier-3 reward
    const tier3 = earnedTiers.find(t => t.streak === 3);
    expect(tier3).toBeDefined();
    expect(tier3!.label).toBe('Hat trick!');
  });

  it('does not re-award already claimed tiers', () => {
    const state: WinStreakState = {
      currentStreak: 4,
      bestStreak: 5,
      lastWinDate: '2026-04-01',
      rewardsClaimed: [2, 3, 5], // Already claimed these
    };
    const { earnedTiers } = updateWinStreak(state, true, '2026-04-02');
    // streak becomes 5, but tier 5 already claimed
    const tier5 = earnedTiers.find(t => t.streak === 5);
    expect(tier5).toBeUndefined();
  });

  it('returns empty earnedTiers on loss', () => {
    const state: WinStreakState = {
      currentStreak: 5,
      bestStreak: 5,
      lastWinDate: '2026-04-01',
      rewardsClaimed: [],
    };
    const { earnedTiers } = updateWinStreak(state, false, '2026-04-02');
    expect(earnedTiers).toEqual([]);
  });

  it('can earn multiple tiers at once', () => {
    // Jump from 0 to 5 by winning 5 in a row
    let state: WinStreakState = { ...DEFAULT_WIN_STREAK_STATE };
    let allEarned: typeof WIN_STREAK_TIERS = [];
    for (let i = 0; i < 5; i++) {
      const { newState, earnedTiers } = updateWinStreak(state, true, `2026-04-0${i + 1}`);
      state = newState;
      allEarned.push(...earnedTiers);
    }
    // Should have earned tiers at 2, 3, 5
    expect(allEarned.find(t => t.streak === 2)).toBeDefined();
    expect(allEarned.find(t => t.streak === 3)).toBeDefined();
    expect(allEarned.find(t => t.streak === 5)).toBeDefined();
  });
});

describe('resetWinStreakRewards', () => {
  it('clears rewardsClaimed but keeps streak', () => {
    const state: WinStreakState = {
      currentStreak: 7,
      bestStreak: 15,
      lastWinDate: '2026-04-01',
      rewardsClaimed: [2, 3, 5, 7],
    };
    const reset = resetWinStreakRewards(state);
    expect(reset.currentStreak).toBe(7);
    expect(reset.bestStreak).toBe(15);
    expect(reset.rewardsClaimed).toEqual([]);
  });
});

describe('WIN_STREAK_TIERS', () => {
  it('has 7 tiers', () => {
    expect(WIN_STREAK_TIERS).toHaveLength(7);
  });

  it('tiers are in ascending streak order', () => {
    for (let i = 1; i < WIN_STREAK_TIERS.length; i++) {
      expect(WIN_STREAK_TIERS[i].streak).toBeGreaterThan(WIN_STREAK_TIERS[i - 1].streak);
    }
  });

  it('every tier has a label and reward', () => {
    for (const tier of WIN_STREAK_TIERS) {
      expect(tier.label).toBeTruthy();
      expect(tier.reward).toBeDefined();
    }
  });

  it('highest tier streak is 20', () => {
    expect(WIN_STREAK_TIERS[WIN_STREAK_TIERS.length - 1].streak).toBe(20);
  });
});
