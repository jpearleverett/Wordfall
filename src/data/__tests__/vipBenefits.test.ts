import {
  VIP_STREAK_BONUSES,
  getVipStreakBonus,
  getNextVipStreakMilestone,
  getVipStreakProgress,
} from '../vipBenefits';
import { hasFrame, hasTitle } from '../cosmetics';

describe('VIP_STREAK_BONUSES', () => {
  it('covers every documented tier (1, 2, 4, 8, 12, 26)', () => {
    const weeks = VIP_STREAK_BONUSES.map((b) => b.weeksRequired);
    expect(weeks).toEqual([1, 2, 4, 8, 12, 26]);
  });

  it('is sorted ascending by weeksRequired (progress math depends on it)', () => {
    for (let i = 1; i < VIP_STREAK_BONUSES.length; i++) {
      expect(VIP_STREAK_BONUSES[i].weeksRequired).toBeGreaterThan(
        VIP_STREAK_BONUSES[i - 1].weeksRequired,
      );
    }
  });

  it('rewards escalate in gems and hints across tiers', () => {
    for (let i = 1; i < VIP_STREAK_BONUSES.length; i++) {
      expect(VIP_STREAK_BONUSES[i].bonusGems).toBeGreaterThan(
        VIP_STREAK_BONUSES[i - 1].bonusGems,
      );
      expect(VIP_STREAK_BONUSES[i].bonusHints).toBeGreaterThan(
        VIP_STREAK_BONUSES[i - 1].bonusHints,
      );
    }
  });

  it('every tier has a cosmetic extraReward', () => {
    for (const tier of VIP_STREAK_BONUSES) {
      expect(tier.extraReward).toBeDefined();
      expect(tier.extraReward!.id).toBeTruthy();
      expect(['title', 'frame', 'decoration']).toContain(tier.extraReward!.type);
    }
  });

  it('every frame/title cosmetic is registered in the catalog', () => {
    for (const tier of VIP_STREAK_BONUSES) {
      const extra = tier.extraReward;
      if (!extra?.id) continue;
      if (extra.type === 'frame') {
        expect(hasFrame(extra.id)).toBe(true);
      }
      if (extra.type === 'title') {
        expect(hasTitle(extra.id)).toBe(true);
      }
    }
  });

  it('cosmetic IDs are unique across tiers', () => {
    const ids = VIP_STREAK_BONUSES.map((t) => t.extraReward?.id).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getVipStreakBonus', () => {
  it('returns null for zero weeks', () => {
    expect(getVipStreakBonus(0)).toBeNull();
  });

  it('returns the week-1 tier for weeks 1-1', () => {
    expect(getVipStreakBonus(1)!.weeksRequired).toBe(1);
  });

  it('returns the week-4 tier when 4 <= weeks < 8', () => {
    expect(getVipStreakBonus(4)!.weeksRequired).toBe(4);
    expect(getVipStreakBonus(7)!.weeksRequired).toBe(4);
  });

  it('returns the max tier for very long streaks', () => {
    expect(getVipStreakBonus(100)!.weeksRequired).toBe(26);
  });
});

describe('getNextVipStreakMilestone', () => {
  it('returns the week-1 tier for brand-new subscribers', () => {
    expect(getNextVipStreakMilestone(0)!.weeksRequired).toBe(1);
  });

  it('returns the next tier when mid-ladder (week 6 → 8)', () => {
    expect(getNextVipStreakMilestone(6)!.weeksRequired).toBe(8);
  });

  it('returns null when at or past the top tier', () => {
    expect(getNextVipStreakMilestone(26)).toBeNull();
    expect(getNextVipStreakMilestone(52)).toBeNull();
  });
});

describe('getVipStreakProgress', () => {
  it('reports 0 progress at the start of a new tier segment', () => {
    const p = getVipStreakProgress(4);
    expect(p.next).toBe(8);
    expect(p.progress).toBeCloseTo(0, 5);
  });

  it('reports full progress at the max tier', () => {
    expect(getVipStreakProgress(26).progress).toBe(1);
    expect(getVipStreakProgress(100).progress).toBe(1);
  });

  it('reports partial progress mid-segment', () => {
    // Week 6, range is 4→8, so progress = (6-4) / (8-4) = 0.5
    const p = getVipStreakProgress(6);
    expect(p.next).toBe(8);
    expect(p.progress).toBeCloseTo(0.5, 5);
  });
});
