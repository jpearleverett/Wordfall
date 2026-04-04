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
