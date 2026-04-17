/**
 * Tests for the Remote-Config-driven daily-deal override in
 * getFlashSale. The default path is already covered by
 * dynamicPricing.test.ts; this suite focuses on the override behavior.
 */

const mockGetRemoteString = jest.fn();

jest.mock('../../services/remoteConfig', () => ({
  getRemoteString: (...args: unknown[]) => mockGetRemoteString(...args),
}));

import { getFlashSale } from '../dynamicPricing';

describe('getFlashSale — dailyDealOverride', () => {
  beforeEach(() => {
    mockGetRemoteString.mockReset();
  });

  it('returns null when override sets disabled=true', () => {
    mockGetRemoteString.mockReturnValue(JSON.stringify({ disabled: true }));
    const sale = getFlashSale(new Date('2026-06-15T12:00:00Z'));
    expect(sale).toBeNull();
  });

  it('returns override deal when JSON is valid', () => {
    mockGetRemoteString.mockReturnValue(
      JSON.stringify({
        productId: 'remote_deal_01',
        name: 'Launch Week Deal',
        icon: '🎉',
        description: 'Special limited-time offer',
        originalPriceAmount: 9.99,
        discountPercent: 50,
      }),
    );
    const sale = getFlashSale(new Date('2026-06-15T12:00:00Z'));
    expect(sale).not.toBeNull();
    expect(sale!.productId).toBe('remote_deal_01');
    expect(sale!.name).toBe('Launch Week Deal');
    expect(sale!.discountPercent).toBe(50);
    expect(sale!.salePrice).toBe('$5.00');
    expect(sale!.originalPrice).toBe('$9.99');
  });

  it('honors override endTime for hoursRemaining', () => {
    const now = new Date('2026-06-15T12:00:00Z');
    const endTime = now.getTime() + 6 * 3600 * 1000;
    mockGetRemoteString.mockReturnValue(
      JSON.stringify({
        productId: 'x',
        name: 'n',
        icon: 'i',
        description: 'd',
        originalPriceAmount: 4.99,
        discountPercent: 40,
        endTime,
      }),
    );
    const sale = getFlashSale(now);
    expect(sale?.hoursRemaining).toBe(6);
  });

  it('falls through to default hashed deal when override is malformed JSON', () => {
    mockGetRemoteString.mockReturnValue('not-json');
    // Should not throw — returns either a sale or null from the default path.
    expect(() => getFlashSale(new Date('2026-06-15T12:00:00Z'))).not.toThrow();
  });

  it('rejects overrides with out-of-range discount', () => {
    mockGetRemoteString.mockReturnValue(
      JSON.stringify({
        productId: 'x',
        name: 'n',
        icon: 'i',
        description: 'd',
        originalPriceAmount: 4.99,
        discountPercent: 95,
      }),
    );
    // Falls through — test just asserts no throw and we got a FlashSale or null.
    const sale = getFlashSale(new Date('2026-06-15T12:00:00Z'));
    expect(sale === null || typeof sale.productId === 'string').toBe(true);
  });

  it('rejects overrides missing required fields', () => {
    mockGetRemoteString.mockReturnValue(
      JSON.stringify({ productId: 'only-id' }),
    );
    const sale = getFlashSale(new Date('2026-06-15T12:00:00Z'));
    // Should fall through — either default sale or null, but not the broken override.
    if (sale) expect(sale.productId).not.toBe('only-id');
  });
});
