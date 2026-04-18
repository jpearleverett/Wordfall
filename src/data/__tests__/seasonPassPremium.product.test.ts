/**
 * Season pass premium IAP product catalog tests.
 *
 * Unlock-the-lane behaviour is applied inside EconomyContext.applyValidatedPurchase,
 * but the catalog entry itself needs the right shape (price, flags, anchored
 * original price) for Remote Config / pricing / analytics to line up.
 */
import { getProductById } from '../shopProducts';

describe('season_pass_premium product entry', () => {
  const product = getProductById('season_pass_premium');

  it('is registered in the catalog', () => {
    expect(product).toBeDefined();
  });

  it('has a $9.99 fallback price anchored at $14.99', () => {
    expect(product!.fallbackPriceAmount).toBe(9.99);
    expect(product!.fallbackPrice).toBe('$9.99');
    expect(product!.originalPriceAmount).toBe(14.99);
    expect(product!.originalPrice).toBe('$14.99');
  });

  it('sets the seasonPassPremium flag so applyCatalogPurchase can mark it applied', () => {
    expect(product!.rewards.flags?.seasonPassPremium).toBe(true);
  });

  it('uses a real Play Store product id (wordfall_* namespace)', () => {
    expect(product!.storeProductId).toMatch(/^wordfall_/);
  });

  it('is consumable — a new season requires a fresh purchase', () => {
    expect(product!.isNonConsumable).toBe(false);
  });
});
