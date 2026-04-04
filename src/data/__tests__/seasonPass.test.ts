import {
  SEASON_PASS_TIERS,
  MAX_SEASON_TIER,
  PREMIUM_PASS_PRICE_GEMS,
  XP_PER_PUZZLE,
  XP_PER_STAR,
  XP_PER_DAILY,
  XP_PER_PERFECT,
  getSeasonPassTier,
  getXPProgress,
  getCurrentSeason,
} from '../seasonPass';

describe('SEASON_PASS_TIERS data', () => {
  it('contains exactly 50 tiers', () => {
    expect(SEASON_PASS_TIERS.length).toBe(50);
  });

  it('MAX_SEASON_TIER is 50', () => {
    expect(MAX_SEASON_TIER).toBe(50);
  });

  it('PREMIUM_PASS_PRICE_GEMS is 500', () => {
    expect(PREMIUM_PASS_PRICE_GEMS).toBe(500);
  });

  it('has correct XP constants', () => {
    expect(XP_PER_PUZZLE).toBe(100);
    expect(XP_PER_STAR).toBe(50);
    expect(XP_PER_DAILY).toBe(200);
    expect(XP_PER_PERFECT).toBe(150);
  });

  it('every tier has level, xpRequired, freeReward, and premiumReward', () => {
    for (const tier of SEASON_PASS_TIERS) {
      expect(tier.level).toBeGreaterThanOrEqual(1);
      expect(tier.level).toBeLessThanOrEqual(50);
      expect(tier.xpRequired).toBeGreaterThan(0);
      expect(tier.freeReward).toBeDefined();
      expect(tier.freeReward.type).toBeTruthy();
      expect(tier.freeReward.label).toBeTruthy();
      expect(tier.freeReward.icon).toBeTruthy();
      expect(tier.premiumReward).toBeDefined();
      expect(tier.premiumReward.type).toBeTruthy();
      expect(tier.premiumReward.label).toBeTruthy();
      expect(tier.premiumReward.icon).toBeTruthy();
    }
  });

  it('tiers have ascending level numbers from 1 to 50', () => {
    for (let i = 0; i < SEASON_PASS_TIERS.length; i++) {
      expect(SEASON_PASS_TIERS[i].level).toBe(i + 1);
    }
  });

  it('milestone tiers (10, 20, 30, 40, 50) have cosmetic premium rewards', () => {
    const milestoneLevels = [10, 20, 30, 40, 50];
    for (const level of milestoneLevels) {
      const tier = SEASON_PASS_TIERS.find(t => t.level === level)!;
      expect(tier.premiumReward.type).toBe('cosmetic');
      expect(tier.premiumReward.cosmeticId).toBeTruthy();
    }
  });

  it('tier 50 premium reward is the legendary season set', () => {
    const tier50 = SEASON_PASS_TIERS[49];
    expect(tier50.premiumReward.type).toBe('cosmetic');
    expect(tier50.premiumReward.cosmeticId).toBe('set_season_legend');
  });
});

describe('getSeasonPassTier', () => {
  it('returns 0 for 0 XP', () => {
    expect(getSeasonPassTier(0)).toBe(0);
  });

  it('returns 0 when XP is below tier 1 threshold', () => {
    expect(getSeasonPassTier(1)).toBe(0);
  });

  it('returns 1 when XP exactly meets tier 1 threshold', () => {
    const tier1XP = SEASON_PASS_TIERS[0].xpRequired;
    expect(getSeasonPassTier(tier1XP)).toBe(1);
  });

  it('increases with more XP', () => {
    const lowTier = getSeasonPassTier(500);
    const highTier = getSeasonPassTier(5000);
    expect(highTier).toBeGreaterThan(lowTier);
  });

  it('caps at 50 for very high XP', () => {
    expect(getSeasonPassTier(999999)).toBe(50);
  });

  it('never exceeds MAX_SEASON_TIER', () => {
    expect(getSeasonPassTier(9999999)).toBe(MAX_SEASON_TIER);
  });
});

describe('getXPProgress', () => {
  it('returns correct progress for tier 0', () => {
    const progress = getXPProgress(100, 0);
    expect(progress.current).toBe(100);
    expect(progress.required).toBe(SEASON_PASS_TIERS[0].xpRequired);
    expect(progress.percent).toBeGreaterThanOrEqual(0);
    expect(progress.percent).toBeLessThanOrEqual(100);
  });

  it('returns 100 percent at max tier', () => {
    const progress = getXPProgress(999999, MAX_SEASON_TIER);
    expect(progress.percent).toBe(100);
  });

  it('percent is between 0 and 100', () => {
    const progress = getXPProgress(300, 1);
    expect(progress.percent).toBeGreaterThanOrEqual(0);
    expect(progress.percent).toBeLessThanOrEqual(100);
  });

  it('current XP is non-negative', () => {
    const progress = getXPProgress(0, 0);
    expect(progress.current).toBeGreaterThanOrEqual(0);
  });
});

describe('getCurrentSeason', () => {
  it('returns an object with id, startDate, endDate, name, and theme', () => {
    const season = getCurrentSeason();
    expect(season.id).toBeTruthy();
    expect(season.startDate).toBeTruthy();
    expect(season.endDate).toBeTruthy();
    expect(season.name).toBeTruthy();
    expect(season.theme).toBeTruthy();
  });

  it('id follows season_N format', () => {
    const season = getCurrentSeason();
    expect(season.id).toMatch(/^season_\d+$/);
  });

  it('startDate and endDate are valid date strings', () => {
    const season = getCurrentSeason();
    expect(new Date(season.startDate).getTime()).not.toBeNaN();
    expect(new Date(season.endDate).getTime()).not.toBeNaN();
  });

  it('endDate is after startDate', () => {
    const season = getCurrentSeason();
    const start = new Date(season.startDate).getTime();
    const end = new Date(season.endDate).getTime();
    expect(end).toBeGreaterThan(start);
  });

  it('name contains the season number', () => {
    const season = getCurrentSeason();
    const match = season.id.match(/season_(\d+)/);
    expect(match).not.toBeNull();
    const num = match![1];
    expect(season.name).toContain(`Season ${num}`);
  });

  it('theme is one of the valid themes', () => {
    const season = getCurrentSeason();
    const validThemes = ['celestial', 'ocean', 'forest', 'crystal', 'solar', 'garden'];
    expect(validThemes).toContain(season.theme);
  });
});
