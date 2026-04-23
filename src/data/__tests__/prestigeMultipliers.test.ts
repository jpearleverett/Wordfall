import {
  getPrestigeXpMultiplier,
  getPrestigeCoinMultiplier,
  getPrestigeGemMultiplier,
} from '../prestigeSystem';

/**
 * Tier 6 B3 — unit tests covering the prestige multiplier helpers that
 * `useRewardWiring` now composes on top of cosmetic bonuses. These fire
 * the dead code that was wired up in Tier 6 and pin the interpretation of
 * the `permanentBonuses` string-ID encoding.
 */
describe('getPrestigeXpMultiplier', () => {
  it('returns 1.0 for non-prestiged players', () => {
    expect(getPrestigeXpMultiplier(0)).toBe(1.0);
  });

  it('returns 1.5 at prestige 1', () => {
    expect(getPrestigeXpMultiplier(1)).toBe(1.5);
  });

  it('returns 3.0 at prestige 5 (legendary)', () => {
    expect(getPrestigeXpMultiplier(5)).toBe(3.0);
  });

  it('falls back to 1.0 for out-of-range tiers', () => {
    expect(getPrestigeXpMultiplier(99)).toBe(1.0);
  });
});

describe('getPrestigeCoinMultiplier', () => {
  it('returns 1.0 with no permanent bonuses', () => {
    expect(getPrestigeCoinMultiplier([])).toBe(1.0);
  });

  it('adds coin_bonus value directly', () => {
    // Level 2 grants coin_bonus, value 0.25 → +25%
    expect(getPrestigeCoinMultiplier(['coin_bonus_0.25'])).toBeCloseTo(1.25, 5);
  });

  it('adds all_bonus value', () => {
    // Level 5 grants all_bonus, value 0.1 → +10% to coin
    expect(getPrestigeCoinMultiplier(['all_bonus_0.1'])).toBeCloseTo(1.1, 5);
  });

  it('stacks coin_bonus and all_bonus additively', () => {
    // Full prestige 5 player accumulates: coin_bonus 0.25 + all_bonus 0.1 = 1.35
    expect(
      getPrestigeCoinMultiplier([
        'hint_bonus_1',
        'coin_bonus_0.25',
        'rare_tile_bonus_0.02',
        'gem_bonus_1',
        'all_bonus_0.1',
      ]),
    ).toBeCloseTo(1.35, 5);
  });

  it('ignores unrelated bonus types', () => {
    expect(
      getPrestigeCoinMultiplier([
        'hint_bonus_1',
        'rare_tile_bonus_0.02',
        'gem_bonus_1',
      ]),
    ).toBe(1.0);
  });
});

describe('getPrestigeGemMultiplier', () => {
  it('returns 1.0 with no permanent bonuses', () => {
    expect(getPrestigeGemMultiplier([])).toBe(1.0);
  });

  it('treats gem_bonus as a direct multiplier', () => {
    // Level 4 grants gem_bonus, value 1 → +100% (i.e. 2x gems)
    expect(getPrestigeGemMultiplier(['gem_bonus_1'])).toBeCloseTo(2.0, 5);
  });

  it('stacks gem_bonus and all_bonus', () => {
    expect(
      getPrestigeGemMultiplier(['gem_bonus_1', 'all_bonus_0.1']),
    ).toBeCloseTo(2.1, 5);
  });

  it('ignores coin_bonus', () => {
    expect(getPrestigeGemMultiplier(['coin_bonus_0.25'])).toBe(1.0);
  });
});
