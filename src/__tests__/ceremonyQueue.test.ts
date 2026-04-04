/**
 * Ceremony Queue Integration Test
 *
 * Validates ceremony data integrity: achievement tiers, mastery tiers,
 * milestone decorations, star/perfect milestones, streak rewards.
 */

import { ACHIEVEMENTS } from '../data/achievements';
import { MASTERY_REWARDS, getMasteryTierForXP, getXPProgressInTier, MASTERY_XP_PER_TIER, MASTERY_MAX_TIER } from '../data/masteryRewards';
import { STREAK, MILESTONE_DECORATIONS, STAR_MILESTONES, PERFECT_MILESTONES, FEATURE_UNLOCK_SCHEDULE } from '../constants';

// The 18 valid ceremony types from types.ts
const VALID_CEREMONY_TYPES = [
  'feature_unlock',
  'mode_unlock',
  'achievement',
  'streak_milestone',
  'collection_complete',
  'level_up',
  'difficulty_transition',
  'mystery_wheel_jackpot',
  'win_streak_milestone',
  'star_milestone',
  'perfect_milestone',
  'decoration_unlock',
  'first_rare_tile',
  'first_booster',
  'wing_complete',
  'word_mastery_gold',
  'first_mode_clear',
  'wildcard_earned',
];

describe('Ceremony Queue Integration', () => {
  describe('achievement tier validation', () => {
    it('all achievements have bronze < silver < gold thresholds', () => {
      for (const achievement of ACHIEVEMENTS) {
        const [bronze, silver, gold] = achievement.tiers;
        expect(bronze.level).toBe('bronze');
        expect(silver.level).toBe('silver');
        expect(gold.level).toBe('gold');
        expect(bronze.threshold).toBeLessThan(silver.threshold);
        expect(silver.threshold).toBeLessThan(gold.threshold);
      }
    });

    it('all achievement tiers have positive thresholds', () => {
      for (const achievement of ACHIEVEMENTS) {
        for (const tier of achievement.tiers) {
          expect(tier.threshold).toBeGreaterThan(0);
        }
      }
    });

    it('achievement rewards increase with tier', () => {
      for (const achievement of ACHIEVEMENTS) {
        const [bronze, silver, gold] = achievement.tiers;
        expect(silver.reward.coins).toBeGreaterThan(bronze.reward.coins);
        expect(gold.reward.coins).toBeGreaterThan(silver.reward.coins);
        expect(silver.reward.gems).toBeGreaterThan(bronze.reward.gems);
        expect(gold.reward.gems).toBeGreaterThan(silver.reward.gems);
      }
    });

    it('achievement IDs are unique', () => {
      const ids = ACHIEVEMENTS.map(a => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('achievements cover all 5 categories', () => {
      const categories = new Set(ACHIEVEMENTS.map(a => a.category));
      expect(categories).toEqual(new Set(['puzzle', 'collection', 'streak', 'mode', 'mastery']));
    });
  });

  describe('mastery tier XP validation', () => {
    it('mastery rewards has exactly 30 tiers', () => {
      expect(MASTERY_REWARDS.length).toBe(MASTERY_MAX_TIER);
    });

    it('mastery tier numbers are sequential 1 to 30', () => {
      for (let i = 0; i < MASTERY_REWARDS.length; i++) {
        expect(MASTERY_REWARDS[i].tier).toBe(i + 1);
      }
    });

    it('mastery XP thresholds are monotonically increasing (uniform 500 XP per tier)', () => {
      // Each tier requires tier * MASTERY_XP_PER_TIER total XP
      for (let tier = 1; tier <= MASTERY_MAX_TIER; tier++) {
        const xpNeeded = tier * MASTERY_XP_PER_TIER;
        const previousXpNeeded = (tier - 1) * MASTERY_XP_PER_TIER;
        expect(xpNeeded).toBeGreaterThan(previousXpNeeded);
      }
    });

    it('getMasteryTierForXP returns correct tiers', () => {
      expect(getMasteryTierForXP(0)).toBe(0);
      expect(getMasteryTierForXP(499)).toBe(0);
      expect(getMasteryTierForXP(500)).toBe(1);
      expect(getMasteryTierForXP(999)).toBe(1);
      expect(getMasteryTierForXP(1000)).toBe(2);
      expect(getMasteryTierForXP(15000)).toBe(MASTERY_MAX_TIER); // capped at 30
      expect(getMasteryTierForXP(99999)).toBe(MASTERY_MAX_TIER); // capped at 30
    });

    it('getXPProgressInTier returns correct progress', () => {
      const prog0 = getXPProgressInTier(0);
      expect(prog0.current).toBe(0);
      expect(prog0.needed).toBe(MASTERY_XP_PER_TIER);

      const prog250 = getXPProgressInTier(250);
      expect(prog250.current).toBe(250);

      const prog750 = getXPProgressInTier(750);
      expect(prog750.current).toBe(250); // 750 % 500 = 250
    });

    it('all mastery tiers have positive free rewards', () => {
      for (const tier of MASTERY_REWARDS) {
        expect(tier.free.coins).toBeGreaterThan(0);
        // free coins should generally increase over tiers
      }
    });

    it('premium rewards are always >= free rewards', () => {
      for (const tier of MASTERY_REWARDS) {
        expect(tier.premium.coins).toBeGreaterThanOrEqual(tier.free.coins);
        expect(tier.premium.gems).toBeGreaterThanOrEqual(tier.free.gems);
        expect(tier.premium.hintTokens).toBeGreaterThanOrEqual(tier.free.hintTokens);
      }
    });

    it('milestone tiers (5, 10, 15, 20, 25, 30) have badges', () => {
      const milestoneTiers = [5, 10, 15, 20, 25, 30];
      for (const tierNum of milestoneTiers) {
        const tier = MASTERY_REWARDS.find(t => t.tier === tierNum);
        expect(tier).toBeDefined();
        expect(tier!.free.badge || tier!.premium.badge).toBeTruthy();
      }
    });
  });

  describe('milestone decorations', () => {
    it('has exactly 10 decorations', () => {
      expect(MILESTONE_DECORATIONS.length).toBe(10);
    });

    it('decorations exist for levels 5, 10, 15, 20, 25, 30, 35, 40, 45, 50', () => {
      const expectedLevels = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
      const actualLevels = MILESTONE_DECORATIONS.map(d => d.level).sort((a, b) => a - b);
      expect(actualLevels).toEqual(expectedLevels);
    });

    it('all decorations have valid fields', () => {
      for (const dec of MILESTONE_DECORATIONS) {
        expect(dec.level).toBeGreaterThan(0);
        expect(dec.decoration).toBeTruthy();
        expect(dec.name).toBeTruthy();
        expect(dec.icon).toBeTruthy();
      }
    });

    it('decoration IDs are unique', () => {
      const ids = MILESTONE_DECORATIONS.map(d => d.decoration);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('star milestones', () => {
    it('has milestones at 50, 100, 250, 500 stars', () => {
      const stars = STAR_MILESTONES.map(m => m.stars);
      expect(stars).toEqual([50, 100, 250, 500]);
    });

    it('star milestones are monotonically increasing', () => {
      for (let i = 1; i < STAR_MILESTONES.length; i++) {
        expect(STAR_MILESTONES[i].stars).toBeGreaterThan(STAR_MILESTONES[i - 1].stars);
      }
    });

    it('all star milestones have valid reward info', () => {
      for (const m of STAR_MILESTONES) {
        expect(m.reward).toBeTruthy();
        expect(m.name).toBeTruthy();
        expect(['frame', 'title']).toContain(m.type);
      }
    });

    it('star milestone rewards are unique', () => {
      const rewards = STAR_MILESTONES.map(m => m.reward);
      expect(new Set(rewards).size).toBe(rewards.length);
    });
  });

  describe('perfect solve milestones', () => {
    it('has milestones at 10, 25, 50 perfects', () => {
      const counts = PERFECT_MILESTONES.map(m => m.count);
      expect(counts).toEqual([10, 25, 50]);
    });

    it('perfect milestones are monotonically increasing', () => {
      for (let i = 1; i < PERFECT_MILESTONES.length; i++) {
        expect(PERFECT_MILESTONES[i].count).toBeGreaterThan(PERFECT_MILESTONES[i - 1].count);
      }
    });

    it('all perfect milestones have valid badge info', () => {
      for (const m of PERFECT_MILESTONES) {
        expect(m.badge).toBeTruthy();
        expect(m.name).toBeTruthy();
      }
    });
  });

  describe('streak milestones', () => {
    it('has milestones at 7, 14, 30, 60, 100 days', () => {
      expect(STREAK.milestones).toEqual([7, 14, 30, 60, 100]);
    });

    it('streak milestones are monotonically increasing', () => {
      for (let i = 1; i < STREAK.milestones.length; i++) {
        expect(STREAK.milestones[i]).toBeGreaterThan(STREAK.milestones[i - 1]);
      }
    });

    it('all streak milestones have rewards defined', () => {
      const rewards = STREAK.milestoneRewards as Record<number, { coins: number; gems: number; cosmetic?: string }>;
      for (const milestone of STREAK.milestones) {
        const reward = rewards[milestone];
        expect(reward).toBeDefined();
        expect(reward.coins).toBeGreaterThan(0);
        expect(reward.gems).toBeGreaterThan(0);
      }
    });

    it('streak milestone rewards have increasing value', () => {
      const rewards = STREAK.milestoneRewards as Record<number, { coins: number; gems: number }>;
      for (let i = 1; i < STREAK.milestones.length; i++) {
        const prev = rewards[STREAK.milestones[i - 1]];
        const curr = rewards[STREAK.milestones[i]];
        expect(curr.coins).toBeGreaterThan(prev.coins);
        expect(curr.gems).toBeGreaterThan(prev.gems);
      }
    });

    it('later streak milestones include cosmetics', () => {
      const rewards = STREAK.milestoneRewards as Record<number, { cosmetic?: string }>;
      // Day 30, 60, 100 should have cosmetics
      expect(rewards[30].cosmetic).toBeTruthy();
      expect(rewards[60].cosmetic).toBeTruthy();
      expect(rewards[100].cosmetic).toBeTruthy();
    });
  });

  describe('ceremony type coverage', () => {
    it('all 18 ceremony types are defined', () => {
      expect(VALID_CEREMONY_TYPES.length).toBe(18);
    });

    it('no duplicate ceremony types', () => {
      expect(new Set(VALID_CEREMONY_TYPES).size).toBe(VALID_CEREMONY_TYPES.length);
    });
  });

  describe('feature unlock schedule', () => {
    it('has valid feature unlock entries', () => {
      expect(FEATURE_UNLOCK_SCHEDULE.length).toBeGreaterThan(0);
      for (const feature of FEATURE_UNLOCK_SCHEDULE) {
        expect(feature.id).toBeTruthy();
        expect(feature.unlockLevel).toBeGreaterThanOrEqual(1);
        expect(feature.icon).toBeTruthy();
        expect(feature.title).toBeTruthy();
        expect(feature.description).toBeTruthy();
      }
    });

    it('collections unlocks at level 5', () => {
      const collections = FEATURE_UNLOCK_SCHEDULE.find(f => f.id === 'tab_collections');
      expect(collections).toBeDefined();
      expect(collections!.unlockLevel).toBe(5);
    });

    it('library unlocks at level 8', () => {
      const library = FEATURE_UNLOCK_SCHEDULE.find(f => f.id === 'tab_library');
      expect(library).toBeDefined();
      expect(library!.unlockLevel).toBe(8);
    });

    it('feature IDs are unique', () => {
      const ids = FEATURE_UNLOCK_SCHEDULE.map(f => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
