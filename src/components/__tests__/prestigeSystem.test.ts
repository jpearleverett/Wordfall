import {
  canPrestige,
  getPrestigeRewards,
  getPrestigeMultiplier,
  getNextPrestigeRequirement,
  getPrestigeSummary,
  PRESTIGE_LEVELS,
  DEFAULT_PRESTIGE_STATE,
} from '../../data/prestigeSystem';

describe('Prestige System', () => {
  describe('PRESTIGE_LEVELS', () => {
    it('has 5 prestige levels', () => {
      expect(PRESTIGE_LEVELS.length).toBe(5);
    });

    it('all levels require level 100', () => {
      PRESTIGE_LEVELS.forEach((level) => {
        expect(level.requiredPlayerLevel).toBe(100);
      });
    });

    it('XP multipliers increase with each prestige', () => {
      for (let i = 1; i < PRESTIGE_LEVELS.length; i++) {
        expect(PRESTIGE_LEVELS[i].xpMultiplier).toBeGreaterThan(PRESTIGE_LEVELS[i - 1].xpMultiplier);
      }
    });

    it('each level has a cosmetic reward', () => {
      PRESTIGE_LEVELS.forEach((level) => {
        expect(level.cosmeticReward).toBeDefined();
        expect(level.cosmeticReward.type).toBeTruthy();
        expect(level.cosmeticReward.id).toBeTruthy();
      });
    });

    it('each level has permanent bonuses', () => {
      PRESTIGE_LEVELS.forEach((level) => {
        expect(level.permanentBonuses.length).toBeGreaterThan(0);
      });
    });
  });

  describe('canPrestige', () => {
    it('returns false when player level is below 100', () => {
      expect(canPrestige(99, 0)).toBe(false);
      expect(canPrestige(50, 0)).toBe(false);
    });

    it('returns true when player is at level 100 with prestige 0', () => {
      expect(canPrestige(100, 0)).toBe(true);
    });

    it('returns true when player level exceeds 100', () => {
      expect(canPrestige(150, 0)).toBe(true);
    });

    it('returns false when max prestige reached', () => {
      expect(canPrestige(100, 5)).toBe(false);
    });

    it('allows prestige at levels 1-4', () => {
      expect(canPrestige(100, 1)).toBe(true);
      expect(canPrestige(100, 4)).toBe(true);
    });
  });

  describe('getPrestigeRewards', () => {
    it('returns rewards for valid prestige levels', () => {
      const rewards = getPrestigeRewards(1);
      expect(rewards).not.toBeNull();
      expect(rewards!.label).toBe('Bronze Star');
    });

    it('returns null for invalid prestige level', () => {
      expect(getPrestigeRewards(0)).toBeNull();
      expect(getPrestigeRewards(6)).toBeNull();
    });
  });

  describe('getPrestigeMultiplier', () => {
    it('returns 1.0 for prestige 0', () => {
      expect(getPrestigeMultiplier(0)).toBe(1.0);
    });

    it('returns correct multipliers', () => {
      expect(getPrestigeMultiplier(1)).toBe(1.5);
      expect(getPrestigeMultiplier(3)).toBe(2.0);
      expect(getPrestigeMultiplier(5)).toBe(3.0);
    });
  });

  describe('getPrestigeSummary', () => {
    it('lists what player keeps and loses', () => {
      const summary = getPrestigeSummary(1);
      expect(summary.keeps.length).toBeGreaterThan(0);
      expect(summary.loses.length).toBeGreaterThan(0);
      expect(summary.gains.length).toBeGreaterThan(0);
    });

    it('keeps include cosmetics and achievements', () => {
      const summary = getPrestigeSummary(1);
      expect(summary.keeps.some((k) => k.includes('cosmetics'))).toBe(true);
      expect(summary.keeps.some((k) => k.includes('Achievement'))).toBe(true);
    });

    it('loses include player level', () => {
      const summary = getPrestigeSummary(1);
      expect(summary.loses.some((l) => l.includes('level'))).toBe(true);
    });
  });

  describe('DEFAULT_PRESTIGE_STATE', () => {
    it('starts at prestige 0', () => {
      expect(DEFAULT_PRESTIGE_STATE.prestigeLevel).toBe(0);
      expect(DEFAULT_PRESTIGE_STATE.totalPrestiges).toBe(0);
      expect(DEFAULT_PRESTIGE_STATE.permanentBonuses).toEqual([]);
    });
  });
});
