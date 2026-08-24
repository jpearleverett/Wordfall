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
    expect(getVipDailyDrip([])).toEqual({ gems: 50, hintTokens: 3 });
  });

  it('returns the monthly drip for a history ending in vip_monthly', () => {
    expect(getVipDailyDrip([record('starter_pack'), record('vip_monthly')])).toEqual({
      gems: 75,
      hintTokens: 5,
    });
  });

  it('returns the annual drip for a history ending in vip_annual', () => {
    expect(getVipDailyDrip([record('vip_weekly'), record('vip_annual')])).toEqual({
      gems: 100,
      hintTokens: 8,
    });
  });

  it('uses the most recent vip_* record, ignoring later non-vip purchases', () => {
    expect(
      getVipDailyDrip([record('vip_annual'), record('vip_weekly'), record('gems_500')]),
    ).toEqual({ gems: 50, hintTokens: 3 });
  });

  it('tolerates malformed records (missing/non-string item)', () => {
    expect(getVipDailyDrip([{}, { item: 42 }, record('vip_monthly')])).toEqual({
      gems: 75,
      hintTokens: 5,
    });
  });
});
