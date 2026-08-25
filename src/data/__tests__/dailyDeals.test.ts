import { getDailyDeal, DEAL_POOL } from '../dailyDeals';

describe('DEAL_POOL', () => {
  it('contains exactly 5 deals', () => {
    expect(DEAL_POOL).toHaveLength(5);
  });

  it('each deal has all required fields', () => {
    for (const deal of DEAL_POOL) {
      expect(typeof deal.id).toBe('string');
      expect(typeof deal.name).toBe('string');
      expect(typeof deal.description).toBe('string');
      expect(typeof deal.icon).toBe('string');
      expect(typeof deal.originalPrice).toBe('number');
      expect(typeof deal.salePrice).toBe('number');
      expect(['coins', 'gems']).toContain(deal.currency);
      expect(typeof deal.contents).toBe('object');
      expect(typeof deal.availableHours).toBe('number');
    }
  });

  it('each deal has salePrice less than originalPrice', () => {
    for (const deal of DEAL_POOL) {
      expect(deal.salePrice).toBeLessThan(deal.originalPrice);
    }
  });

  it('each deal has a unique id', () => {
    const ids = DEAL_POOL.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each deal has positive availableHours', () => {
    for (const deal of DEAL_POOL) {
      expect(deal.availableHours).toBeGreaterThan(0);
    }
  });

  it('coins→gems conversion is never cheaper than 100 coins per gem', () => {
    // The Gem Rush deal shipped at 20:1 (15 gems for 300 coins), which made
    // the soft currency a hard-currency printer and collapsed the two-tier
    // economy. Any coin-priced deal that grants gems must price them at a
    // real premium — at least 100 coins per gem.
    for (const deal of DEAL_POOL) {
      if (deal.currency === 'coins' && (deal.contents.gems ?? 0) > 0) {
        expect(deal.salePrice / deal.contents.gems!).toBeGreaterThanOrEqual(100);
      }
    }
  });

  it('a coins→gems→coins round trip always loses value (no arbitrage loop)', () => {
    // Cheapest coins-per-gem across coin-priced gem deals, and highest
    // coins-per-gem across gem-priced coin deals: buying gems with coins and
    // converting back must never profit.
    const buyGemRates = DEAL_POOL
      .filter((d) => d.currency === 'coins' && (d.contents.gems ?? 0) > 0)
      .map((d) => d.salePrice / d.contents.gems!);
    const sellGemRates = DEAL_POOL
      .filter((d) => d.currency === 'gems' && (d.contents.coins ?? 0) > 0)
      .map((d) => d.contents.coins! / d.salePrice);
    for (const buy of buyGemRates) {
      for (const sell of sellGemRates) {
        expect(sell).toBeLessThan(buy);
      }
    }
  });
});

describe('getDailyDeal', () => {
  it('returns a valid DailyDeal for a given date', () => {
    const deal = getDailyDeal('2025-01-15');
    expect(deal).toHaveProperty('id');
    expect(deal).toHaveProperty('name');
    expect(deal).toHaveProperty('description');
    expect(deal).toHaveProperty('icon');
    expect(deal).toHaveProperty('originalPrice');
    expect(deal).toHaveProperty('salePrice');
    expect(deal).toHaveProperty('currency');
    expect(deal).toHaveProperty('contents');
    expect(deal).toHaveProperty('availableHours');
  });

  it('is deterministic - same date always returns the same deal', () => {
    const deal1 = getDailyDeal('2025-03-10');
    const deal2 = getDailyDeal('2025-03-10');
    expect(deal1.id).toBe(deal2.id);
    expect(deal1.name).toBe(deal2.name);
    expect(deal1.salePrice).toBe(deal2.salePrice);
  });

  it('different dates can produce different deals', () => {
    const ids = new Set<string>();
    for (let i = 1; i <= 30; i++) {
      const date = `2025-04-${String(i).padStart(2, '0')}`;
      ids.add(getDailyDeal(date).id);
    }
    expect(ids.size).toBeGreaterThanOrEqual(2);
  });

  it('returned deal is always from the DEAL_POOL', () => {
    const poolIds = new Set(DEAL_POOL.map(d => d.id));
    for (let i = 1; i <= 31; i++) {
      const deal = getDailyDeal(`2025-06-${String(i).padStart(2, '0')}`);
      expect(poolIds.has(deal.id)).toBe(true);
    }
  });

  it('returned deal has salePrice < originalPrice', () => {
    const deal = getDailyDeal('2025-12-25');
    expect(deal.salePrice).toBeLessThan(deal.originalPrice);
  });
});
