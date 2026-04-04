import {
  MEGA_BUNDLES,
  getDynamicOffers,
  getFlashSale,
  isOfferExpired,
  getDiscountedPrice,
} from '../dynamicPricing';
import type { SpendingSegment, EngagementSegment } from '../../services/playerSegmentation';

describe('MEGA_BUNDLES data', () => {
  it('contains exactly 3 bundles', () => {
    expect(MEGA_BUNDLES.length).toBe(3);
  });

  it('each bundle has required fields', () => {
    for (const bundle of MEGA_BUNDLES) {
      expect(bundle.id).toBeTruthy();
      expect(bundle.storeProductId).toBeTruthy();
      expect(bundle.name).toBeTruthy();
      expect(bundle.description).toBeTruthy();
      expect(bundle.fallbackPrice).toBeTruthy();
      expect(bundle.fallbackPriceAmount).toBeGreaterThan(0);
      expect(bundle.category).toBe('bundles');
      expect(bundle.rewards).toBeDefined();
    }
  });

  it('bundles are priced at $14.99, $19.99, $29.99', () => {
    const prices = MEGA_BUNDLES.map(b => b.fallbackPriceAmount);
    expect(prices).toContain(14.99);
    expect(prices).toContain(19.99);
    expect(prices).toContain(29.99);
  });

  it('each bundle has coin and gem rewards', () => {
    for (const bundle of MEGA_BUNDLES) {
      expect(bundle.rewards.coins).toBeGreaterThan(0);
      expect(bundle.rewards.gems).toBeGreaterThan(0);
    }
  });
});

describe('getDynamicOffers', () => {
  it('returns 1-3 offers', () => {
    const segments: SpendingSegment[] = ['non_payer', 'minnow', 'dolphin', 'whale'];
    const engagements: EngagementSegment[] = ['new_player', 'casual', 'regular', 'hardcore', 'lapsed', 'at_risk', 'returned'];

    for (const spending of segments) {
      for (const engagement of engagements) {
        const offers = getDynamicOffers(spending, engagement, 15);
        expect(offers.length).toBeGreaterThanOrEqual(1);
        expect(offers.length).toBeLessThanOrEqual(3);
      }
    }
  });

  it('lapsed players get a welcome back offer', () => {
    const offers = getDynamicOffers('non_payer', 'lapsed', 5);
    expect(offers.length).toBeGreaterThanOrEqual(1);
    expect(offers[0].badge).toBe('WELCOME BACK');
    expect(offers[0].discountPercent).toBe(70);
  });

  it('non_payer gets starter_pack offer', () => {
    const offers = getDynamicOffers('non_payer', 'regular', 5);
    expect(offers.some(o => o.productId === 'starter_pack')).toBe(true);
  });

  it('whale gets VIP exclusive offer', () => {
    const offers = getDynamicOffers('whale', 'regular', 5);
    expect(offers.some(o => o.badge === 'VIP EXCLUSIVE')).toBe(true);
  });

  it('each offer has required fields', () => {
    const offers = getDynamicOffers('minnow', 'regular', 10);
    for (const offer of offers) {
      expect(offer.productId).toBeTruthy();
      expect(offer.discountPercent).toBeGreaterThanOrEqual(0);
      expect(offer.discountPercent).toBeLessThanOrEqual(70);
      expect(offer.expiresInHours).toBeGreaterThan(0);
      expect(offer.priority).toBeGreaterThanOrEqual(1);
    }
  });

  it('offers are sorted by priority', () => {
    const offers = getDynamicOffers('dolphin', 'regular', 15);
    for (let i = 1; i < offers.length; i++) {
      expect(offers[i].priority).toBeGreaterThanOrEqual(offers[i - 1].priority);
    }
  });
});

describe('getFlashSale', () => {
  it('is deterministic for the same date', () => {
    const date = new Date('2026-06-15T12:00:00Z');
    const sale1 = getFlashSale(date);
    const sale2 = getFlashSale(date);
    expect(sale1).toEqual(sale2);
  });

  it('returns FlashSale or null', () => {
    const date = new Date('2026-03-20T10:00:00Z');
    const sale = getFlashSale(date);
    if (sale !== null) {
      expect(sale.productId).toBeTruthy();
      expect(sale.name).toBeTruthy();
      expect(sale.icon).toBeTruthy();
      expect(sale.description).toBeTruthy();
      expect(sale.originalPrice).toBeTruthy();
      expect(sale.originalPriceAmount).toBeGreaterThan(0);
      expect(sale.discountPercent).toBeGreaterThan(0);
      expect(sale.salePrice).toBeTruthy();
      expect(sale.hoursRemaining).toBeGreaterThanOrEqual(0);
    }
  });

  it('some days have sales and some do not across a range', () => {
    let hasSale = false;
    let hasNull = false;
    for (let d = 1; d <= 30; d++) {
      const date = new Date(`2026-05-${d.toString().padStart(2, '0')}T12:00:00Z`);
      const sale = getFlashSale(date);
      if (sale) hasSale = true;
      else hasNull = true;
    }
    expect(hasSale).toBe(true);
    expect(hasNull).toBe(true);
  });

  it('sale price is less than original price', () => {
    // Try several dates to find one with a sale
    for (let d = 1; d <= 60; d++) {
      const date = new Date(`2026-04-${(d % 28 + 1).toString().padStart(2, '0')}T12:00:00Z`);
      const sale = getFlashSale(date);
      if (sale) {
        const saleAmount = parseFloat(sale.salePrice.replace('$', ''));
        expect(saleAmount).toBeLessThan(sale.originalPriceAmount);
        break;
      }
    }
  });
});

describe('isOfferExpired', () => {
  it('returns false when within the expiry window', () => {
    const now = Date.now();
    expect(isOfferExpired(now - 1000, 24)).toBe(false);
  });

  it('returns true when past the expiry window', () => {
    const now = Date.now();
    const twoDaysAgo = now - 48 * 60 * 60 * 1000 - 1000;
    expect(isOfferExpired(twoDaysAgo, 24)).toBe(true);
  });

  it('returns false for offer just created', () => {
    expect(isOfferExpired(Date.now(), 1)).toBe(false);
  });

  it('handles edge case at exactly the expiry boundary', () => {
    const expiresInHours = 2;
    const createdAt = Date.now() - expiresInHours * 60 * 60 * 1000 - 1;
    expect(isOfferExpired(createdAt, expiresInHours)).toBe(true);
  });
});

describe('getDiscountedPrice', () => {
  it('returns correct original price formatting', () => {
    const result = getDiscountedPrice(9.99, 50);
    expect(result.original).toBe('$9.99');
  });

  it('returns correct discounted price', () => {
    const result = getDiscountedPrice(10.00, 50);
    expect(result.discounted).toBe('$5.00');
  });

  it('returns correct savings string', () => {
    const result = getDiscountedPrice(10.00, 30);
    expect(result.savings).toBe('30% OFF');
  });

  it('handles 0% discount', () => {
    const result = getDiscountedPrice(4.99, 0);
    expect(result.discounted).toBe('$4.99');
    expect(result.savings).toBe('0% OFF');
  });

  it('handles large discount', () => {
    const result = getDiscountedPrice(100.00, 70);
    expect(result.discounted).toBe('$30.00');
    expect(result.savings).toBe('70% OFF');
  });
});
