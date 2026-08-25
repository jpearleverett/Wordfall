/**
 * Season-scoped premium cosmetics + gem tier-skip XP math.
 *
 * The season pass used to rotate only the DISPLAY name each season while the
 * premium cosmetic ids stayed fixed (frame_season_bronze, set_season_legend,
 * season_deco_{tier}...) — so season 2 re-sold season-1 finishers cosmetics
 * they already owned. Each season now mints `_s{n}`-suffixed ids (season 1
 * keeps the original bare ids), and cosmetics.ts resolves any suffixed id
 * back to the base art/rarity with a season-decorated display name.
 *
 * The tier-skip purchase relies on xpNeededForTierSkips granting EXACTLY the
 * XP to the boundary `skips` tiers ahead — pinned here property-style.
 */

import {
  MAX_SEASON_TIER,
  SEASON_PASS_TIERS,
  buildSeasonPassTiers,
  cumulativeXpForTier,
  getCurrentSeasonNumber,
  getSeasonPassTier,
  seasonCosmeticId,
  xpNeededForTierSkips,
} from '../seasonPass';
import {
  getFrame,
  getTitle,
  getTitleLabel,
  hasFrame,
  hasTitle,
  isProfileCosmeticId,
} from '../cosmetics';

const cosmeticIds = (season: number): string[] =>
  buildSeasonPassTiers(season)
    .map((t) => t.premiumReward.cosmeticId)
    .filter((id): id is string => !!id);

describe('season-scoped cosmetic ids', () => {
  it('season 1 keeps the original unsuffixed ids', () => {
    const ids = cosmeticIds(1);
    expect(ids).toContain('frame_season_bronze');
    expect(ids).toContain('title_season_explorer');
    expect(ids).toContain('frame_season_champion');
    expect(ids).toContain('deco_season_master');
    expect(ids).toContain('set_season_legend');
    for (const id of ids) {
      expect(id).not.toMatch(/_s\d+$/);
    }
  });

  it('season 2+ suffixes every premium cosmetic id with _s{n}', () => {
    const ids = cosmeticIds(2);
    expect(ids).toContain('frame_season_bronze_s2');
    expect(ids).toContain('title_season_explorer_s2');
    expect(ids).toContain('frame_season_champion_s2');
    expect(ids).toContain('deco_season_master_s2');
    expect(ids).toContain('set_season_legend_s2');
    for (const id of ids) {
      expect(id).toMatch(/_s2$/);
    }
  });

  it('cosmetic ids are pairwise DISTINCT across seasons (nothing re-sold)', () => {
    const s1 = new Set(cosmeticIds(1));
    const s2 = new Set(cosmeticIds(2));
    const s3 = new Set(cosmeticIds(3));
    for (const id of s2) {
      expect(s1.has(id)).toBe(false);
      expect(s3.has(id)).toBe(false);
    }
  });

  it('only cosmetic IDS vary by season — XP curve and currency amounts do not', () => {
    const s1 = buildSeasonPassTiers(1);
    const s2 = buildSeasonPassTiers(2);
    for (let i = 0; i < MAX_SEASON_TIER; i++) {
      expect(s2[i].xpRequired).toBe(s1[i].xpRequired);
      expect(s2[i].freeReward).toEqual(s1[i].freeReward);
      expect(s2[i].premiumReward.type).toBe(s1[i].premiumReward.type);
      expect(s2[i].premiumReward.amount).toBe(s1[i].premiumReward.amount);
    }
  });

  it('seasonCosmeticId leaves season 1 bare and suffixes later seasons', () => {
    expect(seasonCosmeticId('frame_season_bronze', 1)).toBe('frame_season_bronze');
    expect(seasonCosmeticId('frame_season_bronze', 7)).toBe('frame_season_bronze_s7');
  });

  it('getCurrentSeasonNumber: 30-day seasons from Jan 1 2026, clamped to 1', () => {
    const epoch = Date.UTC(2026, 0, 1);
    const day = 24 * 60 * 60 * 1000;
    expect(getCurrentSeasonNumber(epoch)).toBe(1);
    expect(getCurrentSeasonNumber(epoch + 29 * day)).toBe(1);
    expect(getCurrentSeasonNumber(epoch + 30 * day)).toBe(2);
    expect(getCurrentSeasonNumber(epoch + 65 * day)).toBe(3);
    expect(getCurrentSeasonNumber(epoch - 10 * day)).toBe(1);
  });

  it('SEASON_PASS_TIERS is the current season build', () => {
    const expected = buildSeasonPassTiers(getCurrentSeasonNumber());
    expect(SEASON_PASS_TIERS.map((t) => t.premiumReward.cosmeticId)).toEqual(
      expected.map((t) => t.premiumReward.cosmeticId),
    );
  });
});

describe('cosmetics.ts resolves _s{n} suffixed ids', () => {
  it('getFrame resolves a suffixed frame to base art/rarity + decorated name + distinct id', () => {
    const base = getFrame('frame_season_bronze');
    const s3 = getFrame('frame_season_bronze_s3');
    expect(base).toBeDefined();
    expect(s3).toBeDefined();
    expect(s3!.id).toBe('frame_season_bronze_s3');
    expect(s3!.rarity).toBe(base!.rarity);
    expect(s3!.name).toContain(base!.name);
    expect(s3!.name).toContain('Season 3');
    expect(s3!.id).not.toBe(base!.id);
  });

  it('getTitle / getTitleLabel resolve a suffixed title (ProfileScreen path)', () => {
    const base = getTitle('title_season_explorer');
    const s4 = getTitle('title_season_explorer_s4');
    expect(base).toBeDefined();
    expect(s4).toBeDefined();
    expect(s4!.id).toBe('title_season_explorer_s4');
    expect(s4!.title).toContain(base!.title);
    expect(s4!.title).toContain('Season 4');
    expect(getTitleLabel('title_season_explorer_s4')).toBe(s4!.title);
  });

  it('has*/isProfileCosmeticId accept suffixed ids (unlockCosmetic gate)', () => {
    expect(hasFrame('frame_season_champion_s2')).toBe(true);
    expect(hasTitle('title_season_explorer_s9')).toBe(true);
    expect(isProfileCosmeticId('frame_season_bronze_s2')).toBe(true);
  });

  it('does NOT invent entries for unknown bases or non-suffix ids', () => {
    expect(getFrame('no_such_frame_s2')).toBeUndefined();
    expect(getFrame('frame_season_bronze_s')).toBeUndefined();
    expect(getTitle('nope_s3')).toBeUndefined();
  });

  it('returns a stable identity for repeated lookups (memo-friendly)', () => {
    expect(getFrame('frame_season_bronze_s5')).toBe(getFrame('frame_season_bronze_s5'));
    expect(getTitle('title_season_explorer_s5')).toBe(getTitle('title_season_explorer_s5'));
  });
});

describe('tier-skip XP math', () => {
  it('cumulativeXpForTier sums the ladder (0 at tier 0, clamped at 50)', () => {
    expect(cumulativeXpForTier(0)).toBe(0);
    expect(cumulativeXpForTier(1)).toBe(SEASON_PASS_TIERS[0].xpRequired);
    expect(cumulativeXpForTier(2)).toBe(
      SEASON_PASS_TIERS[0].xpRequired + SEASON_PASS_TIERS[1].xpRequired,
    );
    expect(cumulativeXpForTier(99)).toBe(cumulativeXpForTier(MAX_SEASON_TIER));
  });

  it('grants exactly the XP to the next boundary (partial progress counts)', () => {
    // Fresh season: tier 1 costs 200 XP.
    expect(xpNeededForTierSkips(0, 1)).toBe(SEASON_PASS_TIERS[0].xpRequired);
    // 150 XP into tier 1 → only the remaining 50 is needed.
    expect(xpNeededForTierSkips(150, 1)).toBe(SEASON_PASS_TIERS[0].xpRequired - 150);
    // Two skips from zero = tier 1 + tier 2 costs.
    expect(xpNeededForTierSkips(0, 2)).toBe(
      SEASON_PASS_TIERS[0].xpRequired + SEASON_PASS_TIERS[1].xpRequired,
    );
  });

  it('landing on the boundary advances EXACTLY the skipped tiers (property)', () => {
    const samples = [0, 150, 200, 1234, 5678, 20000, 60000];
    for (const xp of samples) {
      for (const skips of [1, 5]) {
        const before = getSeasonPassTier(xp);
        const grant = xpNeededForTierSkips(xp, skips);
        const after = getSeasonPassTier(xp + grant);
        expect(after).toBe(Math.min(before + skips, MAX_SEASON_TIER));
        if (before + skips <= MAX_SEASON_TIER && grant > 0) {
          // One less XP must NOT reach the target — the grant is exact.
          expect(getSeasonPassTier(xp + grant - 1)).toBeLessThan(after);
        }
      }
    }
  });

  it('returns 0 at or past the tier-50 ceiling and never negative', () => {
    const maxed = cumulativeXpForTier(MAX_SEASON_TIER);
    expect(xpNeededForTierSkips(maxed, 1)).toBe(0);
    expect(xpNeededForTierSkips(maxed + 500, 5)).toBe(0);
    expect(xpNeededForTierSkips(-100, 1)).toBe(SEASON_PASS_TIERS[0].xpRequired);
  });
});
