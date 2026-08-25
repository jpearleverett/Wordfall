import {
  SHOP_PRODUCTS,
  getProductById,
  getProductByStoreId,
  getProductRewards,
  getProductsByCategory,
  getAllStoreProductIds,
  getNonConsumableIds,
  storeIdToInternalId,
  internalIdToStoreId,
  getVipDailyDrip,
  getStorefrontShelf,
  bundleContentsFromRewards,
  resolveFeaturedProductId,
  isOfferOnlyProduct,
  ShopProduct,
} from '../shopProducts';

describe('SHOP_PRODUCTS data', () => {
  it('contains the expected number of products', () => {
    // 3 bundles + 3 hints + 3 undos + 3 gems + 2 premium + 1 subscription = 15
    expect(SHOP_PRODUCTS.length).toBeGreaterThanOrEqual(14);
  });

  it('every product has required fields', () => {
    for (const product of SHOP_PRODUCTS) {
      expect(product.id).toBeTruthy();
      expect(product.storeProductId).toBeTruthy();
      expect(product.name).toBeTruthy();
      expect(product.description).toBeTruthy();
      expect(product.fallbackPrice).toBeTruthy();
      expect(product.fallbackPriceAmount).toBeGreaterThan(0);
      expect(['bundles', 'currency', 'consumables', 'premium', 'subscription']).toContain(product.category);
      expect(product.rewards).toBeDefined();
      expect(typeof product.isNonConsumable).toBe('boolean');
      expect(product.icon).toBeTruthy();
    }
  });

  it('every product has unique id', () => {
    const ids = SHOP_PRODUCTS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every product has unique store product id', () => {
    const storeIds = SHOP_PRODUCTS.map(p => p.storeProductId);
    expect(new Set(storeIds).size).toBe(storeIds.length);
  });

  it('all store product IDs use wordfall_ prefix', () => {
    for (const product of SHOP_PRODUCTS) {
      expect(product.storeProductId).toMatch(/^wordfall_/);
    }
  });

  it('every product rewards has at least one reward type', () => {
    for (const product of SHOP_PRODUCTS) {
      const r = product.rewards;
      const hasReward =
        (r.coins && r.coins > 0) ||
        (r.gems && r.gems > 0) ||
        (r.hintTokens && r.hintTokens > 0) ||
        (r.undoTokens && r.undoTokens > 0) ||
        (r.decorations && r.decorations.length > 0) ||
        (r.boosters && r.boosters.length > 0) ||
        r.flags ||
        r.dripDays ||
        r.dailyDrip ||
        r.streakFreezeDays;
      expect(hasReward).toBeTruthy();
    }
  });
});

describe('getProductById', () => {
  it('returns correct product for each known id', () => {
    for (const product of SHOP_PRODUCTS) {
      const found = getProductById(product.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(product.id);
      expect(found!.name).toBe(product.name);
    }
  });

  it('returns undefined for unknown id', () => {
    expect(getProductById('nonexistent_product')).toBeUndefined();
  });

  it('finds starter_pack', () => {
    const starter = getProductById('starter_pack');
    expect(starter).toBeDefined();
    expect(starter!.name).toBe('Starter Pack');
    expect(starter!.rewards.coins).toBe(500);
    expect(starter!.rewards.gems).toBe(50);
    expect(starter!.rewards.hintTokens).toBe(10);
    expect(starter!.rewards.decorations).toContain('starter_bookend');
  });

  it('finds premium_pass', () => {
    const premium = getProductById('premium_pass');
    expect(premium).toBeDefined();
    expect(premium!.isNonConsumable).toBe(true);
    expect(premium!.rewards.flags?.premiumPass).toBe(true);
  });

  it('finds ad_removal', () => {
    const adRemoval = getProductById('ad_removal');
    expect(adRemoval).toBeDefined();
    expect(adRemoval!.isNonConsumable).toBe(true);
    expect(adRemoval!.rewards.flags?.adsRemoved).toBe(true);
  });
});

describe('getProductByStoreId', () => {
  it('returns correct product for each store id', () => {
    for (const product of SHOP_PRODUCTS) {
      const found = getProductByStoreId(product.storeProductId);
      expect(found).toBeDefined();
      expect(found!.id).toBe(product.id);
    }
  });

  it('returns undefined for unknown store id', () => {
    expect(getProductByStoreId('com.unknown.product')).toBeUndefined();
  });
});

describe('getProductRewards', () => {
  it('returns rewards for valid product id', () => {
    const rewards = getProductRewards('hint_bundle_10');
    expect(rewards).toBeDefined();
    expect(rewards!.hintTokens).toBe(10);
  });

  it('returns undefined for unknown id', () => {
    expect(getProductRewards('nonexistent')).toBeUndefined();
  });
});

describe('getProductsByCategory', () => {
  it('returns bundles', () => {
    const bundles = getProductsByCategory('bundles');
    expect(bundles.length).toBeGreaterThanOrEqual(3);
    expect(bundles.every(p => p.category === 'bundles')).toBe(true);
  });

  it('returns consumables (hints + undos)', () => {
    const consumables = getProductsByCategory('consumables');
    expect(consumables.length).toBeGreaterThanOrEqual(6);
    expect(consumables.every(p => p.category === 'consumables')).toBe(true);
  });

  it('returns currency (gems)', () => {
    const currency = getProductsByCategory('currency');
    expect(currency.length).toBeGreaterThanOrEqual(3);
    expect(currency.every(p => p.category === 'currency')).toBe(true);
  });

  it('returns premium products', () => {
    const premium = getProductsByCategory('premium');
    expect(premium.length).toBeGreaterThanOrEqual(2);
    expect(premium.every(p => p.category === 'premium')).toBe(true);
  });

  it('returns empty array for unknown category', () => {
    const result = getProductsByCategory('nonexistent' as any);
    expect(result).toEqual([]);
  });
});

describe('getAllStoreProductIds', () => {
  it('returns all store product IDs', () => {
    const storeIds = getAllStoreProductIds();
    expect(storeIds.length).toBe(SHOP_PRODUCTS.length);
    for (const product of SHOP_PRODUCTS) {
      expect(storeIds).toContain(product.storeProductId);
    }
  });
});

describe('getNonConsumableIds', () => {
  it('returns only non-consumable product IDs', () => {
    const ids = getNonConsumableIds();
    expect(ids.length).toBeGreaterThanOrEqual(2);
    expect(ids).toContain('premium_pass');
    expect(ids).toContain('ad_removal');
    // Consumables should not be in the list
    expect(ids).not.toContain('hint_bundle_10');
  });
});

describe('price anchoring', () => {
  it('every non-subscription product has originalPrice + originalPriceAmount', () => {
    const missing: string[] = [];
    for (const product of SHOP_PRODUCTS) {
      if (product.category === 'subscription') continue;
      if (!product.originalPrice || product.originalPriceAmount == null) {
        missing.push(product.id);
      }
    }
    expect(missing).toEqual([]);
  });

  it('originalPriceAmount is strictly greater than fallbackPriceAmount', () => {
    for (const product of SHOP_PRODUCTS) {
      if (product.originalPriceAmount == null) continue;
      expect(product.originalPriceAmount).toBeGreaterThan(product.fallbackPriceAmount);
    }
  });

  it('discount is between 10% and 80% (store listings block larger claims)', () => {
    for (const product of SHOP_PRODUCTS) {
      if (product.originalPriceAmount == null) continue;
      const discount = 1 - product.fallbackPriceAmount / product.originalPriceAmount;
      expect(discount).toBeGreaterThanOrEqual(0.1);
      expect(discount).toBeLessThanOrEqual(0.8);
    }
  });

  it('originalPrice string parses to a number that matches originalPriceAmount', () => {
    for (const product of SHOP_PRODUCTS) {
      if (product.originalPrice == null || product.originalPriceAmount == null) continue;
      const parsed = parseFloat(product.originalPrice.replace(/[^0-9.]/g, ''));
      expect(parsed).toBeCloseTo(product.originalPriceAmount, 2);
    }
  });
});

describe('storeIdToInternalId / internalIdToStoreId', () => {
  it('converts store ID to internal ID', () => {
    expect(storeIdToInternalId('wordfall_starter_pack')).toBe('starter_pack');
    expect(storeIdToInternalId('wordfall_gems_50')).toBe('gems_50');
  });

  it('converts internal ID to store ID', () => {
    expect(internalIdToStoreId('starter_pack')).toBe('wordfall_starter_pack');
    expect(internalIdToStoreId('gems_50')).toBe('wordfall_gems_50');
  });

  it('returns undefined for unknown IDs', () => {
    expect(storeIdToInternalId('unknown')).toBeUndefined();
    expect(internalIdToStoreId('unknown' as any)).toBeUndefined();
  });

  it('roundtrips correctly for all products', () => {
    for (const product of SHOP_PRODUCTS) {
      const storeId = internalIdToStoreId(product.id);
      expect(storeId).toBe(product.storeProductId);
      const internalId = storeIdToInternalId(storeId!);
      expect(internalId).toBe(product.id);
    }
  });
});

// ─── Catalog contract: every promised cosmetic id must be deliverable ────────
// splitPlayerGrantIds (commercialEntitlements.ts) admits a rewards.decorations
// id only via hasDecoration (LIBRARY_DECORATIONS) or isProfileCosmeticId
// (theme/frame/title catalogs) — any other id is silently DROPPED, i.e. paid
// content that never arrives. vip_monthly/vip_annual shipped exactly that
// (frame_vip_monthly / frame_vip_annual / decoration_vip_annual_trophy,
// defined nowhere); this pins the contract for every current and future
// product.
describe('rewards.decorations catalog contract', () => {
  it('every decorations id resolves in a cosmetic catalog', () => {
    // Lazy import keeps the top of this suite dependency-light.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { hasDecoration, isProfileCosmeticId } = require('../cosmetics') as {
      hasDecoration: (id: string) => boolean;
      isProfileCosmeticId: (id: string) => boolean;
    };
    for (const product of SHOP_PRODUCTS) {
      for (const id of product.rewards.decorations ?? []) {
        const deliverable = hasDecoration(id) || isProfileCosmeticId(id);
        if (!deliverable) {
          throw new Error(
            `${product.id} promises cosmetic '${id}' which exists in no catalog — it would be silently dropped at delivery`,
          );
        }
      }
    }
  });

  it('vip tiers grant the real VIP cosmetics', () => {
    expect(getProductById('vip_monthly')!.rewards.decorations).toEqual(['frame_vip_exclusive']);
    expect(getProductById('vip_annual')!.rewards.decorations).toEqual([
      'frame_vip_exclusive',
      'vip_trophy',
    ]);
  });
});

// ─── getVipDailyDrip — tier-aware VIP daily drip for UI copy ─────────────────
// Mirrors the payout logic inside EconomyContext.claimVipDailyRewards so the
// claim alert / benefits list can never promise different numbers than the
// claim credits.
describe('getVipDailyDrip', () => {
  const record = (item: string) => ({ item });

  it('returns the weekly floor for an empty history', () => {
    expect(getVipDailyDrip([])).toEqual({ gems: 45, hintTokens: 3 });
  });

  it('returns the monthly drip for a history ending in vip_monthly', () => {
    expect(getVipDailyDrip([record('starter_pack'), record('vip_monthly')])).toEqual({
      gems: 25,
      hintTokens: 5,
    });
  });

  it('returns the annual drip for a history ending in vip_annual', () => {
    expect(getVipDailyDrip([record('vip_weekly'), record('vip_annual')])).toEqual({
      gems: 12,
      hintTokens: 8,
    });
  });

  it('uses the most recent vip_* record, ignoring later non-vip purchases', () => {
    expect(
      getVipDailyDrip([record('vip_annual'), record('vip_weekly'), record('gems_500')]),
    ).toEqual({ gems: 45, hintTokens: 3 });
  });

  it('tolerates malformed records (missing/non-string item)', () => {
    expect(getVipDailyDrip([{}, { item: 42 }, record('vip_monthly')])).toEqual({
      gems: 25,
      hintTokens: 5,
    });
  });
});

// ─── Dominated gem SKUs removed (Aug 2026) ───────────────────────────────────
// gems_30 (30 gems / $0.99 while gems_50 gives 50 for the same $0.99) and
// gems_200 (200 / $4.99 while gems_250 gives 250 for the same $4.99) were
// strictly dominated rows — any buyer was simply overcharged.
describe('gem ladder has no dominated SKUs', () => {
  it('gems_30 and gems_200 are gone from the catalog', () => {
    expect(getProductById('gems_30')).toBeUndefined();
    expect(getProductById('gems_200')).toBeUndefined();
  });

  it('no two gem SKUs share a price point with different gem counts', () => {
    const gems = SHOP_PRODUCTS.filter(
      (p) => p.category === 'currency' && p.rewards.gems && !p.rewards.coins &&
        !(p as { saleVariantOf?: string }).saleVariantOf && p.id !== 'piggy_bank_break',
    );
    const byPrice = new Map<number, ShopProduct[]>();
    for (const g of gems) {
      byPrice.set(g.fallbackPriceAmount, [...(byPrice.get(g.fallbackPriceAmount) ?? []), g]);
    }
    for (const [, group] of byPrice) {
      expect(group.length).toBe(1);
    }
  });
});

// ─── season_pass_bundle premium flag (P0 trust fix) ──────────────────────────
describe('season_pass_bundle', () => {
  it('grants the seasonPassPremium flag it is named after', () => {
    const bundle = getProductById('season_pass_bundle');
    expect(bundle).toBeDefined();
    expect(bundle!.rewards.flags?.seasonPassPremium).toBe(true);
  });

  it('matches season_pass_premium in the flag it sets', () => {
    const pass = getProductById('season_pass_premium');
    expect(pass!.rewards.flags?.seasonPassPremium).toBe(true);
  });
});

// ─── Storefront enumeration helpers (opening the dark catalog) ───────────────
describe('getStorefrontShelf', () => {
  it('returns purchasable bundle/premium SKUs sorted cheapest-first', () => {
    const shelf = getStorefrontShelf(['bundles', 'premium']);
    expect(shelf.length).toBeGreaterThan(0);
    for (let i = 1; i < shelf.length; i++) {
      expect(shelf[i].fallbackPriceAmount).toBeGreaterThanOrEqual(shelf[i - 1].fallbackPriceAmount);
    }
  });

  it('surfaces the $14.99–$99.99 shelf to everyone', () => {
    const ids = getStorefrontShelf(['bundles', 'premium']).map((p) => p.id);
    for (const id of ['champion_pack', 'season_pass_bundle', 'diamond_collection', 'royal_collection', 'platinum_pack', 'ultimate_whale']) {
      expect(ids).toContain(id);
    }
  });

  it('never returns offer-only products, sale variants, or subscriptions', () => {
    const shelf = getStorefrontShelf(['bundles', 'premium', 'currency', 'consumables']);
    for (const p of shelf) {
      expect(isOfferOnlyProduct(p)).toBe(false);
      expect(p.category).not.toBe('subscription');
    }
    const ids = shelf.map((p) => p.id);
    expect(ids).not.toContain('first_purchase_special');
    expect(ids).not.toContain('second_purchase_special');
    expect(ids).not.toContain('starter_pack_sale_70');
    expect(ids).not.toContain('vip_weekly');
  });

  it('honors the exclusion list so a SKU never renders twice', () => {
    const ids = getStorefrontShelf(['bundles', 'premium'], ['starter_pack', 'champion_pack']).map(
      (p) => p.id,
    );
    expect(ids).not.toContain('starter_pack');
    expect(ids).not.toContain('champion_pack');
  });
});

describe('bundleContentsFromRewards', () => {
  it('derives the contents strip from the ACTUAL rewards', () => {
    const weekend = getProductById('weekend_warrior')!;
    expect(bundleContentsFromRewards(weekend.rewards)).toEqual([
      { kind: 'coins', label: '1,000' },
      { kind: 'gems', label: '50' },
      { kind: 'hints', label: '10' },
      { kind: 'undos', label: '5' },
    ]);
  });

  it('summarises boosters and decorations', () => {
    const crate = getProductById('booster_crate')!;
    expect(bundleContentsFromRewards(crate.rewards)).toEqual([
      { kind: 'boosters', label: '15 BOOST' },
    ]);
    const starter = getProductById('starter_pack')!;
    expect(bundleContentsFromRewards(starter.rewards)).toEqual([
      { kind: 'coins', label: '500' },
      { kind: 'gems', label: '50' },
      { kind: 'hints', label: '10' },
      { kind: 'decor', label: 'DECOR' },
    ]);
  });

  it('caps at maxEntries and tolerates missing rewards', () => {
    const starter = getProductById('starter_pack')!;
    expect(bundleContentsFromRewards(starter.rewards, 2)).toHaveLength(2);
    expect(bundleContentsFromRewards(undefined)).toEqual([]);
  });
});

describe('resolveFeaturedProductId', () => {
  it('accepts a valid, purchasable catalog id', () => {
    expect(resolveFeaturedProductId('explorer_bundle')).toBe('explorer_bundle');
    expect(resolveFeaturedProductId('weekend_warrior')).toBe('weekend_warrior');
  });

  it('falls back for empty, unknown, offer-only, and subscription ids', () => {
    expect(resolveFeaturedProductId('')).toBe('starter_pack');
    expect(resolveFeaturedProductId(undefined)).toBe('starter_pack');
    expect(resolveFeaturedProductId('mega_bundle_gold')).toBe('starter_pack');
    expect(resolveFeaturedProductId('first_purchase_special')).toBe('starter_pack');
    expect(resolveFeaturedProductId('starter_pack_sale_70')).toBe('starter_pack');
    expect(resolveFeaturedProductId('vip_annual')).toBe('starter_pack');
  });
});
