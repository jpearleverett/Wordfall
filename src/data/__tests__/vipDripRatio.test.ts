/**
 * VIP drip economics (Aug 2026 retune) — pins the ratio contract described
 * in shopProducts.ts next to the vip_* definitions.
 *
 * Invariant: the total gem drip a subscriber collects over one billing
 * period, divided by the tier's price, must land between 1.2× and 2.0× the
 * everyday gem-pack rate (gems_250: 250 gems / $4.99 ≈ 50 gems/$), and the
 * per-dollar value must ASCEND with tier length so the annual tier is the
 * clear long-term deal without dwarfing the gem SKUs.
 *
 * Why: the old 50/75/100 gems/day drip put the annual tier at ~730 gems/$
 * — 14.6× the pack rate — which made every gem SKU irrational next to a
 * subscription and turned VIP into a gem-economy destroyer. If a retune moves
 * these numbers, it must move them INSIDE the band, not delete the test.
 */
import { getProductById } from '../shopProducts';

const DAYS: Record<string, number> = {
  vip_weekly: 7,
  vip_monthly: 30,
  vip_annual: 365,
};

function gemsPerDollar(tierId: string): number {
  const product = getProductById(tierId)!;
  const drip = product.rewards.dailyDrip!;
  return ((drip.gems ?? 0) * DAYS[tierId]) / product.fallbackPriceAmount;
}

describe('VIP daily drip value ratios', () => {
  const packRate = (() => {
    const gems250 = getProductById('gems_250')!;
    return (gems250.rewards.gems ?? 0) / gems250.fallbackPriceAmount; // ≈ 50.1 gems/$
  })();

  it.each(['vip_weekly', 'vip_monthly', 'vip_annual'])(
    '%s drips 1.2×–2.0× the gems_250 pack rate per dollar',
    (tierId) => {
      const ratio = gemsPerDollar(tierId) / packRate;
      expect(ratio).toBeGreaterThanOrEqual(1.2);
      expect(ratio).toBeLessThanOrEqual(2.0);
    },
  );

  it('per-dollar value ascends with tier length (annual is the best deal)', () => {
    const weekly = gemsPerDollar('vip_weekly');
    const monthly = gemsPerDollar('vip_monthly');
    const annual = gemsPerDollar('vip_annual');
    expect(monthly).toBeGreaterThan(weekly);
    expect(annual).toBeGreaterThan(monthly);
  });

  it('descriptions advertise the exact drip the claim credits', () => {
    for (const tierId of Object.keys(DAYS)) {
      const product = getProductById(tierId)!;
      const drip = product.rewards.dailyDrip!;
      expect(product.description).toContain(`${drip.gems} daily gems`);
      expect(product.description).toContain(`${drip.hintTokens} daily hints`);
    }
  });
});
