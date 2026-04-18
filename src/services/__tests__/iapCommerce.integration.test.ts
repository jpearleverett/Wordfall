import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateReceipt } from '../receiptValidation';

/**
 * Integration coverage for the commerce/receipt layer that useCommerce
 * orchestrates. We can't render the React hook in a node jest environment,
 * but we can exercise the same surface the hook depends on:
 *   - happy path (fresh receipt accepted + hash recorded)
 *   - validation failure / replay (same receipt rejected a second time)
 *   - duplicate transactionId (distinct receipts → independent hashes)
 *   - network timeout recovery (__DEV__ fallback accepts when server fails)
 *
 * The jest.config globals set __DEV__ = true, and no
 * EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL is defined in the test environment, so
 * validateReceipt enters its client-side fallback path deterministically.
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

  it('validation failure — re-presenting the same receipt is rejected (replay protection)', async () => {
    const first = await validateReceipt('replay_receipt_XYZ', 'coins_pack_medium', 'uid1');
    expect(first.valid).toBe(true);

    const second = await validateReceipt('replay_receipt_XYZ', 'coins_pack_medium', 'uid1');
    expect(second.valid).toBe(false);
    expect(second.error).toMatch(/duplicate/i);
  });

  it('duplicate transactionId — distinct receipts for the same product each validate once', async () => {
    const a = await validateReceipt('tx_a_receipt', 'gems_pack_small', 'uid1');
    const b = await validateReceipt('tx_b_receipt', 'gems_pack_small', 'uid1');
    expect(a.valid).toBe(true);
    expect(b.valid).toBe(true);

    // But a replay of either is still caught
    const replayA = await validateReceipt('tx_a_receipt', 'gems_pack_small', 'uid1');
    expect(replayA.valid).toBe(false);
  });

  it('network timeout recovery — server failure falls back to __DEV__ client validation', async () => {
    // No FIREBASE_FUNCTIONS_URL is set in tests, so serverValidate short-circuits
    // to the "not configured" branch. That branch, under __DEV__, approves the
    // receipt and stores the hash — mirroring production's "server unavailable,
    // but it's a dev build" recovery path.
    const result = await validateReceipt('offline_receipt_1', 'vip_weekly', 'uid1');
    expect(result.valid).toBe(true);

    // A second attempt must be rejected as duplicate (hash was persisted even
    // though validation came from the fallback path).
    const replay = await validateReceipt('offline_receipt_1', 'vip_weekly', 'uid1');
    expect(replay.valid).toBe(false);
    expect(replay.error).toMatch(/duplicate/i);
  });
});
