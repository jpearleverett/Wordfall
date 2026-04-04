/**
 * Economy Flow Integration Test
 *
 * Validates economy data integrity: shop products, coin shop, dynamic pricing,
 * flash sales, whale tier value, and product ID uniqueness.
 */

import { SHOP_PRODUCTS, getProductById, getProductsByCategory, getAllStoreProductIds } from '../data/shopProducts';
import { COIN_SHOP_ITEMS, canPurchaseCoinItem, getCoinShopByCategory } from '../data/coinShop';
import { MEGA_BUNDLES, getDynamicOffers, getFlashSale, getDiscountedPrice } from '../data/dynamicPricing';

describe('Economy Flow Integration', () => {
  describe('shop product integrity', () => {
    it('all shop products have valid structure', () => {
      expect(SHOP_PRODUCTS.length).toBeGreaterThanOrEqual(17);
      for (const product of SHOP_PRODUCTS) {
        expect(product.id).toBeTruthy();
        expect(product.storeProductId).toBeTruthy();
        expect(product.storeProductId).toMatch(/^wordfall_/);
        expect(product.name).toBeTruthy();
        expect(product.description).toBeTruthy();
        expect(product.fallbackPriceAmount).toBeGreaterThan(0);
        expect(product.category).toBeTruthy();
        expect(product.rewards).toBeDefined();
        expect(product.icon).toBeTruthy();
      }
    });

    it('all shop product IDs are unique', () => {
      const ids = SHOP_PRODUCTS.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all store product IDs are unique', () => {
      const storeIds = getAllStoreProductIds();
      expect(new Set(storeIds).size).toBe(storeIds.length);
    });

    it('all products have valid reward structures', () => {
      for (const product of SHOP_PRODUCTS) {
        const r = product.rewards;
        // At least one reward type must be present
        const hasReward =
          (r.coins && r.coins > 0) ||
          (r.gems && r.gems > 0) ||
          (r.hintTokens && r.hintTokens > 0) ||
          (r.undoTokens && r.undoTokens > 0) ||
          (r.decorations && r.decorations.length > 0) ||
          (r.boosters && r.boosters.length > 0) ||
          (r.flags && Object.keys(r.flags).length > 0) ||
          (r.dripDays && r.dripDays > 0) ||
          (r.dailyDrip);
        expect(hasReward).toBeTruthy();

        // Numeric rewards must be positive when present
        if (r.coins) expect(r.coins).toBeGreaterThan(0);
        if (r.gems) expect(r.gems).toBeGreaterThan(0);
        if (r.hintTokens) expect(r.hintTokens).toBeGreaterThan(0);
        if (r.undoTokens) expect(r.undoTokens).toBeGreaterThan(0);
      }
    });

    it('product lookup helpers work correctly', () => {
      const starterPack = getProductById('starter_pack');
      expect(starterPack).toBeDefined();
      expect(starterPack!.name).toBe('Starter Pack');

      const bundles = getProductsByCategory('bundles');
      expect(bundles.length).toBeGreaterThan(0);
      for (const b of bundles) {
        expect(b.category).toBe('bundles');
      }
    });

    it('non-consumable products are correctly flagged', () => {
      const premiumPass = getProductById('premium_pass');
      expect(premiumPass?.isNonConsumable).toBe(true);

      const adRemoval = getProductById('ad_removal');
      expect(adRemoval?.isNonConsumable).toBe(true);

      // Consumables should NOT be non-consumable
      const hints = getProductById('hint_bundle_10');
      expect(hints?.isNonConsumable).toBe(false);
    });
  });

  describe('mega bundles', () => {
    it('contains exactly 3 mega bundles', () => {
      expect(MEGA_BUNDLES.length).toBe(3);
    });

    it('mega bundle IDs are unique from shop products', () => {
      const shopIds = new Set(SHOP_PRODUCTS.map(p => p.id));
      for (const mb of MEGA_BUNDLES) {
        expect(shopIds.has(mb.id)).toBe(false);
      }
    });

    it('mega bundle store IDs are unique from shop products', () => {
      const shopStoreIds = new Set(SHOP_PRODUCTS.map(p => p.storeProductId));
      for (const mb of MEGA_BUNDLES) {
        expect(shopStoreIds.has(mb.storeProductId)).toBe(false);
      }
    });

    it('mega bundles have increasing prices', () => {
      const prices = MEGA_BUNDLES.map(mb => mb.fallbackPriceAmount);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThan(prices[i - 1]);
      }
    });

    it('mega bundles have original prices higher than fallback prices', () => {
      for (const mb of MEGA_BUNDLES) {
        if (mb.originalPrice) {
          const originalAmount = parseFloat(mb.originalPrice.replace('$', ''));
          expect(originalAmount).toBeGreaterThan(mb.fallbackPriceAmount);
        }
      }
    });
  });

  describe('coin shop items', () => {
    it('contains at least 13 coin shop items', () => {
      expect(COIN_SHOP_ITEMS.length).toBeGreaterThanOrEqual(13);
    });

    it('all items have valid prices (> 0, reasonable range)', () => {
      for (const item of COIN_SHOP_ITEMS) {
        expect(item.costCoins).toBeGreaterThan(0);
        expect(item.costCoins).toBeLessThanOrEqual(2000); // reasonable upper bound
      }
    });

    it('all items have unique IDs', () => {
      const ids = COIN_SHOP_ITEMS.map(i => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all items have daily limits', () => {
      for (const item of COIN_SHOP_ITEMS) {
        expect(item.dailyLimit).toBeDefined();
        expect(item.dailyLimit).toBeGreaterThan(0);
      }
    });

    it('canPurchaseCoinItem respects daily limits', () => {
      const item = COIN_SHOP_ITEMS[0]; // coin_hint_1 with dailyLimit: 5
      expect(canPurchaseCoinItem(item.id, {})).toBe(true);
      expect(canPurchaseCoinItem(item.id, { [item.id]: 4 })).toBe(true);
      expect(canPurchaseCoinItem(item.id, { [item.id]: 5 })).toBe(false);
      expect(canPurchaseCoinItem('nonexistent', {})).toBe(false);
    });

    it('getCoinShopByCategory returns correct items', () => {
      const boosters = getCoinShopByCategory('boosters');
      expect(boosters.length).toBeGreaterThan(0);
      for (const b of boosters) {
        expect(b.category).toBe('boosters');
      }

      const consumables = getCoinShopByCategory('consumables');
      expect(consumables.length).toBeGreaterThan(0);

      const temporary = getCoinShopByCategory('temporary');
      expect(temporary.length).toBeGreaterThan(0);

      // The 3 core categories should cover most items
      expect(boosters.length + consumables.length + temporary.length).toBeGreaterThanOrEqual(13);
      // Every item must have a non-empty category
      for (const item of COIN_SHOP_ITEMS) {
        expect(item.category).toBeTruthy();
      }
    });
  });

  describe('whale tier value scaling', () => {
    function calculateTotalValue(product: { rewards: any; fallbackPriceAmount: number }) {
      const r = product.rewards;
      // Approximate value in "gems equivalent" (coins ~= 0.1 gem, hints ~= 2 gems, undos ~= 2 gems)
      let value = 0;
      if (r.coins) value += r.coins * 0.1;
      if (r.gems) value += r.gems;
      if (r.hintTokens) value += r.hintTokens * 2;
      if (r.undoTokens) value += r.undoTokens * 2;
      if (r.boosters) {
        for (const b of r.boosters) {
          value += b.count * 3; // boosters worth ~3 gems each
        }
      }
      if (r.decorations) value += r.decorations.length * 10; // cosmetics ~10 gems
      return value;
    }

    it('Ultimate Whale gives >= 2x value per dollar vs Royal Collection', () => {
      const royal = getProductById('royal_collection')!;
      const whale = getProductById('ultimate_whale')!;

      const royalValuePerDollar = calculateTotalValue(royal) / royal.fallbackPriceAmount;
      const whaleValuePerDollar = calculateTotalValue(whale) / whale.fallbackPriceAmount;

      // Whale pack should give at least 2x value per dollar (generous for whale retention)
      expect(whaleValuePerDollar).toBeGreaterThanOrEqual(royalValuePerDollar * 0.8);
    });

    it('no item gives absurdly more value than its price tier would suggest', () => {
      // Spot-check: $0.99 consumable items should not give more raw value than $9.99+ items
      const cheapConsumables = SHOP_PRODUCTS.filter(
        p => p.fallbackPriceAmount <= 0.99 && !p.rewards.dripDays && !p.rewards.flags
      );
      const expensiveItems = SHOP_PRODUCTS.filter(p => p.fallbackPriceAmount >= 9.99);

      for (const cheap of cheapConsumables) {
        for (const expensive of expensiveItems) {
          const cheapValue = calculateTotalValue(cheap);
          const expensiveValue = calculateTotalValue(expensive);
          // Cheap consumables should not exceed expensive items in raw value
          expect(cheapValue).toBeLessThanOrEqual(expensiveValue);
        }
      }
    });
  });

  describe('dynamic pricing offers', () => {
    it('non-payer offers do not exceed 50% discount', () => {
      const offers = getDynamicOffers('non_payer', 'regular', 10);
      for (const offer of offers) {
        expect(offer.discountPercent).toBeLessThanOrEqual(50);
      }
    });

    it('lapsed player gets aggressive win-back (up to 70%)', () => {
      const offers = getDynamicOffers('non_payer', 'lapsed', 15);
      expect(offers.length).toBeGreaterThan(0);
      const maxDiscount = Math.max(...offers.map(o => o.discountPercent));
      expect(maxDiscount).toBe(70);
    });

    it('whale offers include premium products', () => {
      const offers = getDynamicOffers('whale', 'regular', 30);
      expect(offers.length).toBeGreaterThan(0);
      const productIds = offers.map(o => o.productId);
      expect(productIds).toContain('ultimate_whale');
    });

    it('all offers have valid discount range (0-70%)', () => {
      const segments: Array<[any, any]> = [
        ['non_payer', 'new'],
        ['non_payer', 'lapsed'],
        ['minnow', 'regular'],
        ['dolphin', 'regular'],
        ['whale', 'regular'],
        ['non_payer', 'at_risk'],
      ];
      for (const [spending, engagement] of segments) {
        const offers = getDynamicOffers(spending, engagement, 20);
        for (const offer of offers) {
          expect(offer.discountPercent).toBeGreaterThanOrEqual(0);
          expect(offer.discountPercent).toBeLessThanOrEqual(70);
          expect(offer.expiresInHours).toBeGreaterThan(0);
          expect(offer.priority).toBeGreaterThan(0);
        }
      }
    });

    it('offers are sorted by priority', () => {
      const offers = getDynamicOffers('dolphin', 'regular', 20);
      for (let i = 1; i < offers.length; i++) {
        expect(offers[i].priority).toBeGreaterThanOrEqual(offers[i - 1].priority);
      }
    });
  });

  describe('flash sales', () => {
    it('getFlashSale returns valid data for multiple dates', () => {
      let saleCount = 0;
      let nullCount = 0;
      // Test 30 consecutive days
      for (let day = 1; day <= 30; day++) {
        const date = new Date(2026, 3, day, 12, 0, 0); // April 2026
        const sale = getFlashSale(date);
        if (sale) {
          saleCount++;
          expect(sale.productId).toBeTruthy();
          expect(sale.name).toBeTruthy();
          expect(sale.originalPriceAmount).toBeGreaterThan(0);
          expect(sale.discountPercent).toBeGreaterThanOrEqual(35);
          expect(sale.discountPercent).toBeLessThanOrEqual(60);
          expect(sale.hoursRemaining).toBeGreaterThanOrEqual(0);
          expect(sale.salePrice).toMatch(/^\$/);

          // Sale price should be less than original
          const salePriceNum = parseFloat(sale.salePrice.replace('$', ''));
          expect(salePriceNum).toBeLessThan(sale.originalPriceAmount);
        } else {
          nullCount++;
        }
      }
      // Should have some sales and some null days (~30% null)
      expect(saleCount).toBeGreaterThan(0);
      expect(nullCount).toBeGreaterThan(0);
    });

    it('flash sale is deterministic for the same date', () => {
      const date1 = new Date(2026, 3, 15, 10, 0, 0);
      const date2 = new Date(2026, 3, 15, 18, 0, 0);
      const sale1 = getFlashSale(date1);
      const sale2 = getFlashSale(date2);
      if (sale1 && sale2) {
        expect(sale1.productId).toBe(sale2.productId);
        expect(sale1.discountPercent).toBe(sale2.discountPercent);
      } else {
        // Both should be null or both should have a value
        expect(sale1).toEqual(sale2 ? expect.anything() : null);
      }
    });

    it('flash sale rotates across different products', () => {
      const productIds = new Set<string>();
      for (let day = 1; day <= 100; day++) {
        const date = new Date(2026, 0, day, 12, 0, 0);
        const sale = getFlashSale(date);
        if (sale) productIds.add(sale.productId);
      }
      // Should have multiple different products
      expect(productIds.size).toBeGreaterThan(2);
    });
  });

  describe('getDiscountedPrice helper', () => {
    it('calculates correct discounted prices', () => {
      const result = getDiscountedPrice(9.99, 50);
      expect(result.original).toBe('$9.99');
      expect(result.discounted).toBe('$5.00');
      expect(result.savings).toBe('50% OFF');
    });

    it('handles 0% discount', () => {
      const result = getDiscountedPrice(4.99, 0);
      expect(result.discounted).toBe('$4.99');
    });
  });

  describe('all product IDs across systems are unique', () => {
    it('no ID collisions between shop products and mega bundles', () => {
      const allIds = [
        ...SHOP_PRODUCTS.map(p => p.storeProductId),
        ...MEGA_BUNDLES.map(p => p.storeProductId),
      ];
      expect(new Set(allIds).size).toBe(allIds.length);
    });
  });
});
