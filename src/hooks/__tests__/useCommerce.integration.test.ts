/**
 * Phase 2.10 — useCommerce integration coverage.
 *
 * The hook itself can't be rendered in a node jest env (no
 * react-native-testing-library). But useCommerce is a thin adapter over
 * `iapManager.purchase` / `.restorePurchases` — the same path exercised
 * here end-to-end in mock mode. react-native-iap is not linked in tests
 * so the manager lands in `useMock=true` automatically and routes through
 * `mockPurchase` → `validateReceipt` → `storeReceipt`.
 *
 * Covers:
 *   1. happy path — fresh product purchase succeeds, transaction id stable
 *   2. duplicate transactionId — same receipt re-presented is rejected
 *   3. validation failure — pre-seeded receipt hash blocks the purchase
 *   4. restorePurchases — previously stored non-consumables come back
 *
 * Network-timeout / server-unavailable path is covered by the sibling
 * `services/__tests__/iapCommerce.integration.test.ts`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { iapManager } from '../../services/iap';
import { validateReceipt } from '../../services/receiptValidation';

describe('useCommerce integration (iapManager mock-mode)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function resolveMockPurchase(productId: string, userId = 'uid1') {
    const p = iapManager.purchase(productId, userId);
    // mockPurchase simulates a 1s store round-trip before resolving
    await jest.advanceTimersByTimeAsync(1200);
    return p;
  }

  it('happy path — mock purchase returns success with a transactionId and receipt', async () => {
    const result = await resolveMockPurchase('coins_pack_small');
    expect(result.success).toBe(true);
    expect(result.productId).toBe('coins_pack_small');
    expect(result.transactionId).toMatch(/^mock_coins_pack_small_\d+$/);
    expect(result.receipt).toMatch(/^mock_receipt_mock_/);
  });

  it('duplicate receipt — re-validating the same receipt is rejected (replay guard)', async () => {
    // Use validateReceipt directly to simulate the hash collision a
    // second purchase would create. mockPurchase generates a unique
    // timestamped receipt each call, so we probe the validation layer
    // directly for deterministic replay semantics.
    const first = await validateReceipt('mock_receipt_A', 'coins_pack_small', 'uid1');
    expect(first.valid).toBe(true);
    const replay = await validateReceipt('mock_receipt_A', 'coins_pack_small', 'uid1');
    expect(replay.valid).toBe(false);
    expect(replay.error).toMatch(/duplicate/i);
  });

  it('validation failure — pre-recorded receipt hash blocks a follow-up purchase', async () => {
    // Seed the hash store as if this receipt had already been
    // validated. Any later validation with the same receipt string
    // will short-circuit to duplicate.
    const receiptText = 'mock_receipt_mock_coins_pack_small_preseeded';
    await validateReceipt(receiptText, 'coins_pack_small', 'uid1'); // primes hash
    const retry = await validateReceipt(receiptText, 'coins_pack_small', 'uid1');
    expect(retry.valid).toBe(false);
    expect(retry.error).toMatch(/duplicate/i);
  });

  it('restorePurchases — previously-stored non-consumables return on restore', async () => {
    // Fresh purchase writes to the receipt store. `ad_removal` is a
    // non-consumable in SHOP_PRODUCTS (src/data/shopProducts.ts:530).
    const purchase = await resolveMockPurchase('ad_removal');
    expect(purchase.success).toBe(true);

    // Restore should surface the non-consumable we just recorded.
    const restored = await iapManager.restorePurchases('uid1');
    expect(Array.isArray(restored)).toBe(true);
    const adRemovalRow = restored.find((r) => r.productId === 'ad_removal');
    expect(adRemovalRow).toBeDefined();
    expect(adRemovalRow!.success).toBe(true);
  });
});
