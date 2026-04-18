/**
 * Piggy Bank (slow-fill gem jar) tests.
 *
 * Covers the break-the-jar code path in `applyCatalogPurchase` and the
 * product catalog entry. The fill path (`addPiggyBankGems`) lives inside
 * the EconomyContext hook and is exercised end-to-end by the Jest Provider
 * tests already; here we verify the pure commerce grant.
 */
import {
  applyCatalogPurchase,
  CommercialStateShape,
} from '../../services/commercialEntitlements';
import { getProductById } from '../shopProducts';

function createBaseState(): CommercialStateShape {
  return {
    coins: 0,
    gems: 0,
    hintTokens: 0,
    eventStars: 0,
    libraryPoints: 0,
    boosterTokens: { wildcardTile: 0, spotlight: 0, smartShuffle: 0 },
    totalEarned: {
      coins: 0,
      gems: 0,
      hintTokens: 0,
      eventStars: 0,
      libraryPoints: 0,
    },
    purchaseHistory: [],
    isAdFreeFlag: false,
    isPremiumPassFlag: false,
    dailyValuePackExpiry: 0,
    dailyValuePackLastClaim: '',
    starterPackExpiresAt: 0,
    undoTokens: 0,
    isVipSubscriber: false,
    vipExpiresAt: 0,
    vipDailyLastClaim: '',
    vipStreakWeeks: 0,
    vipStreakBonusClaimed: false,
    vipStreakLastChecked: 0,
    temporaryEntitlements: {},
    entitlementMigrationVersion: 0,
    piggyBank: { gems: 0, lastFillAt: 0, capacity: 200 },
  };
}

describe('Piggy Bank product', () => {
  it('is registered in the shop catalog', () => {
    const product = getProductById('piggy_bank_break');
    expect(product).toBeDefined();
    expect(product?.fallbackPriceAmount).toBeGreaterThan(0);
    expect(product?.isNonConsumable).toBe(false);
  });

  it('has a struck-through original price (anchoring)', () => {
    const product = getProductById('piggy_bank_break');
    expect(product?.originalPrice).toBeTruthy();
    expect(product?.originalPriceAmount ?? 0).toBeGreaterThan(
      product?.fallbackPriceAmount ?? Infinity,
    );
  });
});

describe('applyCatalogPurchase — piggy_bank_break', () => {
  it('credits the accumulated jar gems and resets to zero', () => {
    const state = createBaseState();
    state.piggyBank = { gems: 137, lastFillAt: 500, capacity: 200 };

    const result = applyCatalogPurchase(state, 'piggy_bank_break', {
      transactionId: 'tx-pb-1',
      now: 1000,
    });

    expect(result.applied).toBe(true);
    expect(result.nextState.gems).toBe(137);
    expect(result.nextState.totalEarned.gems).toBe(137);
    expect(result.nextState.piggyBank?.gems).toBe(0);
    expect(result.nextState.piggyBank?.lastFillAt).toBe(1000);
    expect(result.nextState.piggyBank?.capacity).toBe(200);
  });

  it('does not double-credit the catalog placeholder gems field', () => {
    // piggy_bank_break has rewards.gems=1 so the product passes the
    // "must have at least one reward" invariant elsewhere in the system.
    // The real grant is the jar balance — the placeholder must NOT stack.
    const state = createBaseState();
    state.piggyBank = { gems: 50, lastFillAt: 0, capacity: 200 };

    const result = applyCatalogPurchase(state, 'piggy_bank_break', {
      transactionId: 'tx-pb-2',
      now: 2000,
    });

    expect(result.nextState.gems).toBe(50);
    expect(result.nextState.totalEarned.gems).toBe(50);
  });

  it('breaks an empty jar without crediting or crashing', () => {
    const state = createBaseState();
    state.piggyBank = { gems: 0, lastFillAt: 0, capacity: 200 };

    const result = applyCatalogPurchase(state, 'piggy_bank_break', {
      transactionId: 'tx-pb-3',
      now: 3000,
    });

    expect(result.applied).toBe(true);
    expect(result.nextState.gems).toBe(0);
    expect(result.nextState.totalEarned.gems).toBe(0);
    expect(result.nextState.piggyBank?.gems).toBe(0);
    expect(result.nextState.piggyBank?.lastFillAt).toBe(3000);
  });

  it('records the purchase in history for receipt dedup', () => {
    const state = createBaseState();
    state.piggyBank = { gems: 88, lastFillAt: 0, capacity: 200 };

    const result = applyCatalogPurchase(state, 'piggy_bank_break', {
      transactionId: 'tx-pb-4',
      source: 'purchase',
      amount: 4.99,
      currency: 'USD',
      now: 4000,
    });

    expect(result.nextState.purchaseHistory).toHaveLength(1);
    expect(result.nextState.purchaseHistory[0]).toMatchObject({
      item: 'piggy_bank_break',
      transactionId: 'tx-pb-4',
      amount: 4.99,
      source: 'purchase',
    });
  });

  it('deduplicates repeat purchases with the same transactionId', () => {
    const state = createBaseState();
    state.piggyBank = { gems: 120, lastFillAt: 0, capacity: 200 };

    const first = applyCatalogPurchase(state, 'piggy_bank_break', {
      transactionId: 'tx-pb-dup',
      now: 5000,
    });
    const second = applyCatalogPurchase(first.nextState, 'piggy_bank_break', {
      transactionId: 'tx-pb-dup',
      now: 6000,
    });

    expect(second.applied).toBe(false);
    expect(second.nextState).toBe(first.nextState);
  });
});
