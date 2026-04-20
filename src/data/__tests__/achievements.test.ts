import { ACHIEVEMENTS, getAchievementTier, getAchievementTierId, AchievementDef } from '../achievements';

describe('ACHIEVEMENTS data', () => {
  it('contains 19 achievements (13 standard + 6 hidden)', () => {
    // chain_reaction removed as part of the Option A dopamine refactor
    // (chains no longer exist as a mechanic — see agent_docs/game_mechanics.md).
    expect(ACHIEVEMENTS.length).toBe(19);
    const hidden = ACHIEVEMENTS.filter(a => a.hidden);
    const standard = ACHIEVEMENTS.filter(a => !a.hidden);
    expect(hidden.length).toBe(6);
    expect(standard.length).toBe(13);
  });

  it('every achievement has a valid structure', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.id).toBeTruthy();
      expect(achievement.name).toBeTruthy();
      expect(achievement.description).toBeTruthy();
      expect(achievement.icon).toBeTruthy();
      expect(['puzzle', 'collection', 'streak', 'mode', 'mastery']).toContain(achievement.category);
      expect(achievement.tiers).toHaveLength(3);
    }
  });

  it('every achievement has unique id', () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('tiers are in order bronze -> silver -> gold with ascending thresholds', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.tiers[0].level).toBe('bronze');
      expect(achievement.tiers[1].level).toBe('silver');
      expect(achievement.tiers[2].level).toBe('gold');

      expect(achievement.tiers[0].threshold).toBeLessThan(achievement.tiers[1].threshold);
      expect(achievement.tiers[1].threshold).toBeLessThan(achievement.tiers[2].threshold);
    }
  });

  it('every tier has positive coin and gem rewards', () => {
    for (const achievement of ACHIEVEMENTS) {
      for (const tier of achievement.tiers) {
        expect(tier.reward.coins).toBeGreaterThan(0);
        expect(tier.reward.gems).toBeGreaterThan(0);
      }
    }
  });

  it('gold rewards are greater than silver, which are greater than bronze', () => {
    for (const achievement of ACHIEVEMENTS) {
      const [bronze, silver, gold] = achievement.tiers;
      expect(silver.reward.coins).toBeGreaterThan(bronze.reward.coins);
      expect(gold.reward.coins).toBeGreaterThan(silver.reward.coins);
      expect(silver.reward.gems).toBeGreaterThan(bronze.reward.gems);
      expect(gold.reward.gems).toBeGreaterThan(silver.reward.gems);
    }
  });

  it('hidden achievements have the correct ids', () => {
    const hiddenIds = ACHIEVEMENTS.filter(a => a.hidden).map(a => a.id);
    expect(hiddenIds).toContain('speed_solver');
    expect(hiddenIds).toContain('no_hint_master');
    expect(hiddenIds).toContain('combo_king');
    expect(hiddenIds).toContain('night_owl');
    expect(hiddenIds).toContain('collector_supreme');
    expect(hiddenIds).toContain('marathon_player');
  });

  it('covers all 5 categories', () => {
    const categories = new Set(ACHIEVEMENTS.map(a => a.category));
    expect(categories).toEqual(new Set(['puzzle', 'collection', 'streak', 'mode', 'mastery']));
  });
});

describe('getAchievementTier', () => {
  const wordFinder = ACHIEVEMENTS.find(a => a.id === 'word_finder')!;

  it('returns null when value is below bronze threshold', () => {
    expect(getAchievementTier(wordFinder, 0)).toBeNull();
    expect(getAchievementTier(wordFinder, 49)).toBeNull();
  });

  it('returns bronze when value meets bronze threshold', () => {
    expect(getAchievementTier(wordFinder, 50)).toBe('bronze');
    expect(getAchievementTier(wordFinder, 100)).toBe('bronze');
    expect(getAchievementTier(wordFinder, 249)).toBe('bronze');
  });

  it('returns silver when value meets silver threshold', () => {
    expect(getAchievementTier(wordFinder, 250)).toBe('silver');
    expect(getAchievementTier(wordFinder, 500)).toBe('silver');
    expect(getAchievementTier(wordFinder, 999)).toBe('silver');
  });

  it('returns gold when value meets gold threshold', () => {
    expect(getAchievementTier(wordFinder, 1000)).toBe('gold');
    expect(getAchievementTier(wordFinder, 5000)).toBe('gold');
  });

  it('works with threshold of 1 (hidden achievements)', () => {
    const speedSolver = ACHIEVEMENTS.find(a => a.id === 'speed_solver')!;
    expect(getAchievementTier(speedSolver, 0)).toBeNull();
    expect(getAchievementTier(speedSolver, 1)).toBe('bronze');
    expect(getAchievementTier(speedSolver, 5)).toBe('silver');
    expect(getAchievementTier(speedSolver, 20)).toBe('gold');
  });

  it('works for every achievement at exact thresholds', () => {
    for (const achievement of ACHIEVEMENTS) {
      for (const tier of achievement.tiers) {
        const result = getAchievementTier(achievement, tier.threshold);
        expect(result).toBe(tier.level);
      }
    }
  });
});

describe('getAchievementTierId', () => {
  it('returns correct tier ID format', () => {
    expect(getAchievementTierId('word_finder', 'bronze')).toBe('word_finder_bronze');
    expect(getAchievementTierId('word_finder', 'silver')).toBe('word_finder_silver');
    expect(getAchievementTierId('word_finder', 'gold')).toBe('word_finder_gold');
  });

  it('works for hidden achievements', () => {
    expect(getAchievementTierId('speed_solver', 'gold')).toBe('speed_solver_gold');
  });
});
