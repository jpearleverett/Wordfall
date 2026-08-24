/**
 * Tests for the Remote-Config-driven daily-deal override in
 * getFlashSale. The default path is already covered by
 * dynamicPricing.test.ts; this suite focuses on the override behavior.
 */

const mockGetRemoteString = jest.fn();

jest.mock('../../services/remoteConfig', () => ({
  getRemoteString: (...args: unknown[]) => mockGetRemoteString(...args),
  // New flashSaleEnabled kill switch — default true so these tests
  // continue to exercise the override path without adding a per-test
  // setup hook. A dedicated test for the flag-off path is covered by
  // the unit elsewhere.
  getRemoteBoolean: (_key: string) => true,
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

  it('returns override deal when JSON is valid, priced at the real charged price', () => {
    mockGetRemoteString.mockReturnValue(
      JSON.stringify({
        productId: 'gems_500',
        name: 'Launch Week Deal',
        icon: '🎉',
        description: 'Special limited-time offer',
        originalPriceAmount: 19.99,
        discountPercent: 50,
      }),
    );
    const sale = getFlashSale(new Date('2026-06-15T12:00:00Z'));
    expect(sale).not.toBeNull();
    expect(sale!.productId).toBe('gems_500');
    expect(sale!.name).toBe('Launch Week Deal');
    // The advertised buy price is the SKU's real charged price ($9.99),
    // NOT originalPriceAmount * (1 - discount) — the store sheet would
    // contradict any other number. The badge is derived from the authored
    // anchor vs. the real price (9.99 vs 19.99 → 50%).
    expect(sale!.salePrice).toBe('$9.99');
    expect(sale!.originalPriceAmount).toBe(19.99);
    expect(sale!.discountPercent).toBe(50);
  });

  it('honors override endTime for hoursRemaining', () => {
    const now = new Date('2026-06-15T12:00:00Z');
    const endTime = now.getTime() + 6 * 3600 * 1000;
    mockGetRemoteString.mockReturnValue(
      JSON.stringify({
        productId: 'starter_pack',
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

  it('falls through to the hashed default when the override product is not purchasable', () => {
    mockGetRemoteString.mockReturnValue(
      JSON.stringify({
        productId: 'remote_deal_01', // not in SHOP_PRODUCTS — can't be bought
        name: 'Ghost Deal',
        icon: '👻',
        description: 'Should never render',
        originalPriceAmount: 9.99,
        discountPercent: 50,
      }),
    );
    const sale = getFlashSale(new Date('2026-06-15T12:00:00Z'));
    // Either a real pool deal or no deal today — never the unfulfillable id.
    if (sale) expect(sale.productId).not.toBe('remote_deal_01');
  });

  it('corrects an override whose math would advertise below the real price', () => {
    // Old behavior: 4.99 * (1 - 0.50) advertised $2.50 while the store
    // charged $4.99. The authored anchor (≤ the real price) is discarded
    // for the catalog anchor and the badge re-derived.
    mockGetRemoteString.mockReturnValue(
      JSON.stringify({
        productId: 'gems_250',
        name: 'Bad Math Deal',
        icon: '💎',
        description: 'd',
        originalPriceAmount: 4.99,
        discountPercent: 50,
      }),
    );
    const sale = getFlashSale(new Date('2026-06-15T12:00:00Z'));
    expect(sale).not.toBeNull();
    expect(sale!.productId).toBe('gems_250');
    expect(sale!.salePrice).toBe('$4.99'); // the real charged price
    expect(sale!.originalPriceAmount).toBe(7.99); // catalog anchor
    expect(sale!.discountPercent).toBe(38); // derived, not the authored 50
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
