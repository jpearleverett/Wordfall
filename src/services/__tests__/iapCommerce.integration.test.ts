import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateReceipt } from '../receiptValidation';
import {
  applyCatalogPurchase,
  type CommercialStateShape,
} from '../commercialEntitlements';

/**
 * Integration coverage for the commerce/receipt layer that useCommerce
 * orchestrates. We can't render the React hook in a node jest environment,
 * but we can exercise the same surface the hook depends on:
 *   - happy path (fresh receipt accepted + hash recorded)
 *   - receipt redelivery (same receipt re-presented → alreadyValidated)
 *   - duplicate transactionId (distinct receipts → independent hashes)
 *   - network timeout recovery (__DEV__ fallback accepts when server fails)
 *   - double-grant protection (the fulfilment ledger, not the hash store)
 *
 * The jest.config globals set __DEV__ = true, and no
 * EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL is defined in the test environment, so
 * validateReceipt enters its client-side fallback path deterministically.
 *
 * NOTE ON THE REDELIVERY CONTRACT (changed Aug 2026): a LOCAL receipt-hash
 * hit no longer returns valid:false. Local hashes are only ever written
 * after this device validated the receipt successfully, so a hit means Play
 * Billing redelivered a purchase — most often because acknowledge/consume
 * failed last time. Rejecting it made the purchase permanently
 * unacknowledgeable, and Google auto-refunds anything unacknowledged for 3
 * days. Anti-replay now lives where it belongs:
 *   1. the SERVER rejects cross-user / cross-product receipt reuse
 *      (functions/src/index.ts — same user+product answers idempotently),
 *   2. the FULFILMENT LEDGER refuses to grant a transactionId that is
 *      already in purchaseHistory (pinned by the last test below).
 */
describe('commerce integration (receiptValidation)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('happy path — fresh receipt validates and records hash', async () => {
    const result = await validateReceipt('fresh_receipt_ABC', 'coins_pack_small', 'uid1');
    expect(result.valid).toBe(true);
    // Hash must persist so a replay is caught next call
    const stored = await AsyncStorage.getItem('@wordfall_receipt_hashes');
    expect(stored).not.toBeNull();
    expect(stored!.length).toBeGreaterThan(0);
  });

  it('redelivery — re-presenting the same receipt reports alreadyValidated, not failure', async () => {
    const first = await validateReceipt('replay_receipt_XYZ', 'coins_pack_medium', 'uid1');
    expect(first.valid).toBe(true);
    expect(first.alreadyValidated).toBeFalsy();

    // Must stay valid so iap.ts can retry acknowledge/consume — an
    // unacknowledged purchase is auto-refunded by Google after 3 days.
    const second = await validateReceipt('replay_receipt_XYZ', 'coins_pack_medium', 'uid1');
    expect(second.valid).toBe(true);
    expect(second.alreadyValidated).toBe(true);
  });

  it('duplicate transactionId — distinct receipts for the same product each validate once', async () => {
    const a = await validateReceipt('tx_a_receipt', 'gems_pack_small', 'uid1');
    const b = await validateReceipt('tx_b_receipt', 'gems_pack_small', 'uid1');
    expect(a.valid).toBe(true);
    expect(b.valid).toBe(true);
    // Distinct receipts are independent — neither is flagged as a redelivery.
    expect(a.alreadyValidated).toBeFalsy();
    expect(b.alreadyValidated).toBeFalsy();

    // A redelivery of either is still recognized as one.
    const replayA = await validateReceipt('tx_a_receipt', 'gems_pack_small', 'uid1');
    expect(replayA.alreadyValidated).toBe(true);
  });

  it('network timeout recovery — server failure falls back to __DEV__ client validation', async () => {
    // No FIREBASE_FUNCTIONS_URL is set in tests, so serverValidate short-circuits
    // to the "not configured" branch. That branch, under __DEV__, approves the
    // receipt and stores the hash — mirroring production's "server unavailable,
    // but it's a dev build" recovery path.
    const result = await validateReceipt('offline_receipt_1', 'coins_pack_small', 'uid1');
    expect(result.valid).toBe(true);

    // A second attempt is recognized as a redelivery (the hash was persisted
    // even though validation came from the fallback path).
    const replay = await validateReceipt('offline_receipt_1', 'coins_pack_small', 'uid1');
    expect(replay.valid).toBe(true);
    expect(replay.alreadyValidated).toBe(true);
  });

  it('subscriptions never take the local redelivery shortcut', async () => {
    // The shortcut cannot supply `expiresAt`, and a redelivery is NOT
    // necessarily an already-fulfilled purchase — the app can die between
    // validation and fulfilment, in which case the caller still grants from
    // this result. applyCatalogPurchase falls back to 7 days when expiresAt
    // is missing, so taking the shortcut would hand an annual VIP buyer one
    // week. Subscriptions must always go out for a real expiry.
    const first = await validateReceipt('sub_receipt_1', 'vip_annual', 'uid1');
    expect(first.valid).toBe(true);

    const replay = await validateReceipt('sub_receipt_1', 'vip_annual', 'uid1');
    expect(replay.alreadyValidated).toBeFalsy();
  });

  it('double-grant protection — the fulfilment ledger refuses a repeated transactionId', () => {
    // This is the layer that actually protects currency now that a local
    // hash hit no longer hard-fails validation. Play redelivers a purchase
    // with a STABLE transaction id, so a second fulfilment attempt for the
    // same id must grant nothing.
    const base: CommercialStateShape = {
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
    };

    const first = applyCatalogPurchase(base, 'coins_500', {
      transactionId: 'tx_stable_1',
      now: 1,
    });
    expect(first.applied).toBe(true);
    expect(first.nextState.coins).toBeGreaterThan(0);

    const replay = applyCatalogPurchase(first.nextState, 'coins_500', {
      transactionId: 'tx_stable_1',
      now: 2,
    });
    expect(replay.applied).toBe(false);
    // Not a single extra coin.
    expect(replay.nextState.coins).toBe(first.nextState.coins);
    expect(replay.grants.cosmetics).toEqual([]);
    expect(replay.grants.decorations).toEqual([]);
  });
});
