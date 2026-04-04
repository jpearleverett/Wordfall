import {
  getCurrentRotatingItems,
  getTimeRemainingHours,
  getRarityColor,
} from '../rotatingShop';

describe('getCurrentRotatingItems', () => {
  it('returns 2 or 3 items', () => {
    const items = getCurrentRotatingItems('2025-05-10');
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.length).toBeLessThanOrEqual(3);
  });

  it('is deterministic - same date returns the same items', () => {
    const items1 = getCurrentRotatingItems('2025-06-15');
    const items2 = getCurrentRotatingItems('2025-06-15');
    expect(items1.map(i => i.id)).toEqual(items2.map(i => i.id));
  });

  it('items in the same 48h window are the same', () => {
    // Two consecutive days should be in the same 48h window
    // Day-of-year pairs that share the same floor(dayOfYear/2) value
    // e.g. Jan 2 (dayOfYear=2) and Jan 3 (dayOfYear=3) -> window=1
    const items1 = getCurrentRotatingItems('2025-01-02');
    const items2 = getCurrentRotatingItems('2025-01-03');
    expect(items1.map(i => i.id)).toEqual(items2.map(i => i.id));
  });

  it('different windows can produce different items', () => {
    const allIds = new Set<string>();
    for (let month = 1; month <= 12; month++) {
      const date = `2025-${String(month).padStart(2, '0')}-01`;
      const items = getCurrentRotatingItems(date);
      items.forEach(i => allIds.add(i.id));
    }
    expect(allIds.size).toBeGreaterThanOrEqual(2);
  });

  it('each returned item has required fields', () => {
    const items = getCurrentRotatingItems('2025-03-20');
    for (const item of items) {
      expect(typeof item.id).toBe('string');
      expect(typeof item.name).toBe('string');
      expect(typeof item.description).toBe('string');
      expect(typeof item.icon).toBe('string');
      expect(['theme', 'frame', 'title', 'decoration']).toContain(item.type);
      expect(['rare', 'epic', 'legendary']).toContain(item.rarity);
      expect(typeof item.gemCost).toBe('number');
      expect(item.gemCost).toBeGreaterThan(0);
      expect(typeof item.availableHours).toBe('number');
      expect(typeof item.returnsInDays).toBe('number');
    }
  });

  it('returns no duplicate items', () => {
    const items = getCurrentRotatingItems('2025-07-04');
    const ids = items.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getTimeRemainingHours', () => {
  it('returns a positive number', () => {
    const hours = getTimeRemainingHours('2025-05-10');
    expect(hours).toBeGreaterThan(0);
  });

  it('returns at most 48 hours', () => {
    const hours = getTimeRemainingHours('2025-05-10');
    expect(hours).toBeLessThanOrEqual(48);
  });

  it('returns a number (not NaN)', () => {
    const hours = getTimeRemainingHours('2025-08-22');
    expect(typeof hours).toBe('number');
    expect(isNaN(hours)).toBe(false);
  });
});

describe('getRarityColor', () => {
  it('returns correct color for rare', () => {
    expect(getRarityColor('rare')).toBe('#5c9ead');
  });

  it('returns correct color for epic', () => {
    expect(getRarityColor('epic')).toBe('#a855f7');
  });

  it('returns correct color for legendary', () => {
    expect(getRarityColor('legendary')).toBe('#ffd700');
  });
});
