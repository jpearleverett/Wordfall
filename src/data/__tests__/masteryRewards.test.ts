import {
  MASTERY_REWARDS,
  MASTERY_MAX_TIER,
  MASTERY_XP_PER_TIER,
  getMasteryTierForXP,
  getXPProgressInTier,
  currentSeason,
  seasonEndDate,
  daysRemaining,
} from '../masteryRewards';

describe('MASTERY_REWARDS data', () => {
  it('contains exactly 30 tiers', () => {
    expect(MASTERY_REWARDS.length).toBe(30);
  });

  it('MASTERY_MAX_TIER is 30', () => {
    expect(MASTERY_MAX_TIER).toBe(30);
  });

  it('MASTERY_XP_PER_TIER is 500', () => {
    expect(MASTERY_XP_PER_TIER).toBe(500);
  });

  it('tiers are numbered 1 through 30 in order', () => {
    for (let i = 0; i < MASTERY_REWARDS.length; i++) {
      expect(MASTERY_REWARDS[i].tier).toBe(i + 1);
    }
  });

  it('every tier has free and premium rewards', () => {
    for (const reward of MASTERY_REWARDS) {
      expect(reward.free).toBeDefined();
      expect(reward.premium).toBeDefined();
      expect(reward.free.coins).toBeGreaterThanOrEqual(0);
      expect(reward.premium.coins).toBeGreaterThanOrEqual(0);
    }
  });

  it('premium rewards are equal to or better than free rewards in coins', () => {
    for (const reward of MASTERY_REWARDS) {
      expect(reward.premium.coins).toBeGreaterThanOrEqual(reward.free.coins);
    }
  });

  it('tier 30 has the highest free coin reward', () => {
    const lastTier = MASTERY_REWARDS[MASTERY_REWARDS.length - 1];
    for (const reward of MASTERY_REWARDS.slice(0, -1)) {
      expect(lastTier.free.coins).toBeGreaterThanOrEqual(reward.free.coins);
    }
  });

  it('every tier has claimed set to false', () => {
    for (const reward of MASTERY_REWARDS) {
      expect(reward.claimed).toBe(false);
    }
  });

  it('milestone tiers (5, 10, 15, 20, 25, 30) have badges in free rewards', () => {
    const milestoneTiers = [5, 10, 15, 20, 25, 30];
    for (const tierNum of milestoneTiers) {
      const reward = MASTERY_REWARDS.find(r => r.tier === tierNum)!;
      expect(reward.free.badge).toBeTruthy();
    }
  });
});

describe('getMasteryTierForXP', () => {
  it('returns 0 for 0 XP', () => {
    expect(getMasteryTierForXP(0)).toBe(0);
  });

  it('returns 1 for exactly 500 XP', () => {
    expect(getMasteryTierForXP(500)).toBe(1);
  });

  it('returns 1 for 999 XP', () => {
    expect(getMasteryTierForXP(999)).toBe(1);
  });

  it('returns 2 for 1000 XP', () => {
    expect(getMasteryTierForXP(1000)).toBe(2);
  });

  it('caps at 30 for very high XP', () => {
    expect(getMasteryTierForXP(999999)).toBe(30);
  });

  it('caps at MASTERY_MAX_TIER', () => {
    expect(getMasteryTierForXP(MASTERY_MAX_TIER * MASTERY_XP_PER_TIER + 1000)).toBe(MASTERY_MAX_TIER);
  });

  it('returns 0 for XP less than 500', () => {
    expect(getMasteryTierForXP(499)).toBe(0);
    expect(getMasteryTierForXP(250)).toBe(0);
    expect(getMasteryTierForXP(1)).toBe(0);
  });
});

describe('getXPProgressInTier', () => {
  it('returns 0 current for 0 XP', () => {
    const progress = getXPProgressInTier(0);
    expect(progress.current).toBe(0);
    expect(progress.needed).toBe(500);
  });

  it('returns correct modulo for mid-tier XP', () => {
    const progress = getXPProgressInTier(750);
    expect(progress.current).toBe(250);
    expect(progress.needed).toBe(500);
  });

  it('returns 0 current for XP exactly on a tier boundary', () => {
    const progress = getXPProgressInTier(1000);
    expect(progress.current).toBe(0);
    expect(progress.needed).toBe(500);
  });

  it('needed is always MASTERY_XP_PER_TIER', () => {
    const progress = getXPProgressInTier(1234);
    expect(progress.needed).toBe(MASTERY_XP_PER_TIER);
  });
});

describe('currentSeason', () => {
  it('returns Spring for April', () => {
    const result = currentSeason(new Date('2026-04-15'));
    expect(result).toContain('Spring Blossom');
    expect(result).toContain('2026');
  });

  it('returns Summer for July', () => {
    const result = currentSeason(new Date('2026-07-01'));
    expect(result).toContain('Summer Solstice');
    expect(result).toContain('2026');
  });

  it('returns Autumn for October', () => {
    const result = currentSeason(new Date('2026-10-15'));
    expect(result).toContain('Autumn Harvest');
    expect(result).toContain('2026');
  });

  it('returns Winter for January', () => {
    const result = currentSeason(new Date('2026-01-15'));
    expect(result).toContain('Winter Wonderland');
    expect(result).toContain('2026');
  });

  it('includes the year in the result', () => {
    const result = currentSeason(new Date('2027-06-01'));
    expect(result).toContain('2027');
  });
});

describe('seasonEndDate', () => {
  it('returns a Date object', () => {
    const end = seasonEndDate(new Date('2026-04-15'));
    expect(end).toBeInstanceOf(Date);
  });

  it('returns end of June for an April date (Spring: Apr-Jun)', () => {
    const end = seasonEndDate(new Date('2026-04-15'));
    expect(end.getMonth()).toBe(5); // June (0-indexed)
    expect(end.getDate()).toBe(30); // Last day of June
  });

  it('returns end of September for a July date (Summer: Jul-Sep)', () => {
    const end = seasonEndDate(new Date('2026-07-01'));
    expect(end.getMonth()).toBe(8); // September (0-indexed)
    expect(end.getDate()).toBe(30); // Last day of September
  });

  it('end date is in the future relative to the input date', () => {
    const input = new Date('2026-04-01');
    const end = seasonEndDate(input);
    expect(end.getTime()).toBeGreaterThan(input.getTime());
  });
});

describe('daysRemaining', () => {
  it('returns a positive number for a date within the season', () => {
    const result = daysRemaining(new Date('2026-04-01'));
    expect(result).toBeGreaterThan(0);
  });

  it('returns 0 or more (never negative)', () => {
    const result = daysRemaining(new Date('2026-06-30'));
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('returns more days at the beginning of a season than the end', () => {
    const early = daysRemaining(new Date('2026-04-01'));
    const late = daysRemaining(new Date('2026-06-25'));
    expect(early).toBeGreaterThan(late);
  });
});
