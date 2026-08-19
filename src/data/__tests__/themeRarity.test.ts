import { COSMETIC_THEMES, getTheme, getThemeRarity, getThemesByRarity } from '../cosmetics';
import { CosmeticRarity } from '../../types';

const TIERS: CosmeticRarity[] = ['common', 'rare', 'epic', 'legendary'];

/** Themes with no `cost` are bundle/IAP-only grants — they can never be earned in-game. */
const BUNDLE_ONLY_IDS = COSMETIC_THEMES.filter((t) => t.id !== 'default' && !t.cost).map((t) => t.id);

describe('cosmetic theme rarity', () => {
  it('gives every theme a valid rarity tier', () => {
    for (const theme of COSMETIC_THEMES) {
      expect(TIERS).toContain(theme.rarity);
    }
  });

  it('spans all four tiers with a meaningful distribution', () => {
    const counts = Object.fromEntries(
      TIERS.map((tier) => [tier, COSMETIC_THEMES.filter((t) => t.rarity === tier).length]),
    ) as Record<CosmeticRarity, number>;

    // Every tier populated — a store that only ever prints "RARE" is the bug this guards.
    for (const tier of TIERS) {
      expect(counts[tier]).toBeGreaterThan(0);
    }
    // No single tier may swallow the catalog.
    for (const tier of TIERS) {
      expect(counts[tier]).toBeLessThan(COSMETIC_THEMES.length * 0.6);
    }
    // Legendary stays scarce; common stays an on-ramp.
    expect(counts.legendary).toBeLessThanOrEqual(5);
    expect(counts.common).toBeGreaterThanOrEqual(3);
    expect(TIERS.reduce((sum, tier) => sum + counts[tier], 0)).toBe(COSMETIC_THEMES.length);
  });

  it('keeps rarity consistent with how a theme is acquired', () => {
    for (const theme of COSMETIC_THEMES) {
      if (theme.id === 'default') {
        expect(theme.rarity).toBe('common');
        continue;
      }
      if (!theme.cost) {
        // Bundle/IAP-exclusive — top of the ladder.
        expect(theme.rarity).toBe('legendary');
        continue;
      }
      if (theme.cost.currency === 'coins') {
        // Coin themes are the earnable lane: never legendary.
        expect(theme.rarity === 'common' || theme.rarity === 'rare').toBe(true);
        expect(theme.rarity).toBe(theme.cost.amount <= 2000 ? 'common' : 'rare');
      }
      if (theme.cost.currency === 'gems') {
        expect(theme.rarity === 'rare' || theme.rarity === 'epic' || theme.rarity === 'legendary').toBe(true);
        // Premium gem themes outrank the entry gem tier.
        if (theme.cost.amount >= 200) expect(theme.rarity).toBe('legendary');
        else if (theme.cost.amount >= 75) expect(theme.rarity).toBe('epic');
        else expect(theme.rarity).toBe('rare');
      }
    }
  });

  it('marks bundle-exclusive themes legendary', () => {
    expect(BUNDLE_ONLY_IDS).toEqual(expect.arrayContaining(['theme_whale_exclusive', 'theme_legendary_neon']));
    for (const id of BUNDLE_ONLY_IDS) {
      expect(getTheme(id)?.rarity).toBe('legendary');
    }
  });

  it('exposes rarity through helpers, defaulting unknown ids to common', () => {
    expect(getThemeRarity('theme_legendary_neon')).toBe('legendary');
    expect(getThemeRarity('default_theme')).toBe('common'); // legacy alias resolves to `default`
    expect(getThemeRarity('not_a_real_theme')).toBe('common');

    const regrouped = TIERS.flatMap((tier) => getThemesByRarity(tier));
    expect(regrouped).toHaveLength(COSMETIC_THEMES.length);
    for (const tier of TIERS) {
      for (const theme of getThemesByRarity(tier)) {
        expect(theme.rarity).toBe(tier);
      }
    }
  });
});
