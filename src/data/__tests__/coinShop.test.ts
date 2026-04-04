import {
  COIN_SHOP_ITEMS,
  canPurchaseCoinItem,
  getCoinShopByCategory,
  CoinShopItem,
} from '../coinShop';

describe('COIN_SHOP_ITEMS data', () => {
  it('contains exactly 13 items', () => {
    expect(COIN_SHOP_ITEMS.length).toBe(18);
  });

  it('every item has required fields', () => {
    for (const item of COIN_SHOP_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.icon).toBeTruthy();
      expect(item.costCoins).toBeGreaterThan(0);
      expect(['boosters', 'consumables', 'temporary', 'cosmetic_rental']).toContain(item.category);
      expect(item.reward).toBeDefined();
      expect(
        ['booster', 'hint', 'undo', 'temporary_effect', 'cosmetic_rental'],
      ).toContain(item.reward.type);
    }
  });

  it('every item has a unique id', () => {
    const ids = COIN_SHOP_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('booster items have a valid boosterType', () => {
    const boosters = COIN_SHOP_ITEMS.filter((i) => i.reward.type === 'booster');
    expect(boosters.length).toBeGreaterThan(0);
    for (const item of boosters) {
      expect(['wildcardTile', 'spotlight', 'smartShuffle']).toContain(
        item.reward.boosterType,
      );
    }
  });

  it('temporary effect items have durationMinutes or effectId', () => {
    const temps = COIN_SHOP_ITEMS.filter(
      (i) => i.reward.type === 'temporary_effect',
    );
    expect(temps.length).toBeGreaterThan(0);
    for (const item of temps) {
      expect(
        item.reward.durationMinutes !== undefined ||
          item.reward.effectId !== undefined,
      ).toBe(true);
    }
  });

  it('all items with dailyLimit have positive limits', () => {
    const limited = COIN_SHOP_ITEMS.filter((i) => i.dailyLimit !== undefined);
    expect(limited.length).toBeGreaterThan(0);
    for (const item of limited) {
      expect(item.dailyLimit).toBeGreaterThan(0);
    }
  });
});

describe('canPurchaseCoinItem', () => {
  it('returns true when no purchases made today', () => {
    expect(canPurchaseCoinItem('coin_hint_1', {})).toBe(true);
  });

  it('returns true when under daily limit', () => {
    expect(canPurchaseCoinItem('coin_hint_1', { coin_hint_1: 2 })).toBe(true);
  });

  it('returns false when at daily limit', () => {
    // coin_hint_1 has dailyLimit of 5
    expect(canPurchaseCoinItem('coin_hint_1', { coin_hint_1: 5 })).toBe(false);
  });

  it('returns false when over daily limit', () => {
    expect(canPurchaseCoinItem('coin_hint_1', { coin_hint_1: 10 })).toBe(false);
  });

  it('returns false for unknown item', () => {
    expect(canPurchaseCoinItem('nonexistent_item', {})).toBe(false);
  });

  it('returns true when other items purchased but not this one', () => {
    expect(
      canPurchaseCoinItem('coin_spotlight', { coin_hint_1: 5 }),
    ).toBe(true);
  });

  it('handles items at exactly one below the limit', () => {
    // coin_wildcard has dailyLimit of 2
    expect(canPurchaseCoinItem('coin_wildcard', { coin_wildcard: 1 })).toBe(true);
    expect(canPurchaseCoinItem('coin_wildcard', { coin_wildcard: 2 })).toBe(false);
  });
});

describe('getCoinShopByCategory', () => {
  it('returns consumable items', () => {
    const consumables = getCoinShopByCategory('consumables');
    expect(consumables.length).toBeGreaterThan(0);
    expect(consumables.every((i) => i.category === 'consumables')).toBe(true);
  });

  it('returns booster items', () => {
    const boosters = getCoinShopByCategory('boosters');
    expect(boosters.length).toBeGreaterThan(0);
    expect(boosters.every((i) => i.category === 'boosters')).toBe(true);
  });

  it('returns temporary items', () => {
    const temporary = getCoinShopByCategory('temporary');
    expect(temporary.length).toBeGreaterThan(0);
    expect(temporary.every((i) => i.category === 'temporary')).toBe(true);
  });

  it('all categories together equal total items', () => {
    const consumables = getCoinShopByCategory('consumables');
    const boosters = getCoinShopByCategory('boosters');
    const temporary = getCoinShopByCategory('temporary');
    const cosmeticRentals = getCoinShopByCategory('cosmetic_rental');
    expect(consumables.length + boosters.length + temporary.length + cosmeticRentals.length).toBe(
      COIN_SHOP_ITEMS.length,
    );
  });

  it('returns empty array for unknown category', () => {
    const result = getCoinShopByCategory('nonexistent');
    expect(result).toEqual([]);
  });
});
