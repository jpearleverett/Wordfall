/**
 * secureStorage — SecureStore-ACTIVE path.
 *
 * Two regressions pinned here:
 * 1. Key legality: both live callers use '@'-prefixed keys, which
 *    expo-secure-store rejects (/^[\w.-]+$/, "Invalid key provided to
 *    SecureStore"). Every call used to throw and silently fall back to
 *    plaintext AsyncStorage — the receipt-hardening migration could never
 *    activate. secureStorage must map keys to legal ones so the
 *    SecureStore path actually runs.
 * 2. Torn chunk writes: replacing a multi-chunk value used to overwrite
 *    the live shards in place while the count still pointed at them; a
 *    crash mid-write made the reader join new+old shards into one corrupt
 *    string (consumers JSON.parse it, throw, and the receipt list reads
 *    as empty). Generational shards + an atomic pointer flip must leave
 *    the complete old value readable instead.
 */

const VALID_KEY = /^[\w.-]+$/;

// Map-backed scripted mock enforcing SecureStore's real key rule; writes
// can be told to fail after N successes to simulate a crash mid-write.
const store = new Map<string, string>();
let failAfterWrites = Infinity;
let writesSeen = 0;

function checkKey(key: string) {
  if (!VALID_KEY.test(key)) {
    throw new Error(`Invalid key provided to SecureStore: ${key}`);
  }
}

jest.mock(
  'expo-secure-store',
  () => ({
    getItemAsync: jest.fn(async (key: string) => {
      checkKey(key);
      return store.has(key) ? store.get(key)! : null;
    }),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      checkKey(key);
      writesSeen += 1;
      if (writesSeen > failAfterWrites) throw new Error('simulated crash');
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      checkKey(key);
      store.delete(key);
    }),
  }),
  { virtual: true },
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '../secureStorage';

describe('secureStorage (SecureStore active)', () => {
  beforeEach(async () => {
    store.clear();
    failAfterWrites = Infinity;
    writesSeen = 0;
    await AsyncStorage.clear();
  });

  it('reports secure=true when the module is linked', () => {
    expect(secureStorage.isSecure()).toBe(true);
  });

  it("stores '@'-prefixed caller keys in SecureStore, not the AsyncStorage fallback", async () => {
    await secureStorage.setItem('@wordfall_iap_receipts', 'receipt-blob');
    // The value landed in SecureStore under a legal key…
    const secureKeys = [...store.keys()];
    expect(secureKeys.some((k) => k.includes('wordfall_iap_receipts'))).toBe(true);
    expect([...store.values()]).toContain('receipt-blob');
    // …and did NOT fall back to plaintext AsyncStorage.
    expect(await AsyncStorage.getItem('@wordfall_iap_receipts')).toBeNull();
    expect(await secureStorage.getItem('@wordfall_iap_receipts')).toBe('receipt-blob');
  });

  it("migrates a legacy AsyncStorage value under a '@' key into SecureStore on first read", async () => {
    await AsyncStorage.setItem('@wordfall_receipt_hashes', 'hash-list');
    expect(await secureStorage.getItem('@wordfall_receipt_hashes')).toBe('hash-list');
    // The migration write must have succeeded (it used to throw on the key).
    expect([...store.values()]).toContain('hash-list');
  });

  it("round-trips a multi-chunk value under a '@' key", async () => {
    const big = 'x'.repeat(9000); // 5 chunks at 1800
    await secureStorage.setItem('@wordfall_iap_receipts', big);
    expect(await secureStorage.getItem('@wordfall_iap_receipts')).toBe(big);
  });

  it('removeItem clears a chunked value completely', async () => {
    await secureStorage.setItem('@big', 'y'.repeat(4000));
    await secureStorage.removeItem('@big');
    expect(await secureStorage.getItem('@big')).toBeNull();
  });

  it('a crash mid-rewrite of a chunked value never yields a mixed old/new string', async () => {
    const oldValue = 'A'.repeat(9000); // 5 chunks
    const newValue = 'B'.repeat(10800); // 6 chunks
    await secureStorage.setItem('safe_key', oldValue);

    // Fail the rewrite after 2 successful shard writes — the crash window
    // that used to leave count=5 pointing at 2 new + 3 old shards.
    writesSeen = 0;
    failAfterWrites = 2;
    await secureStorage.setItem('safe_key', newValue).catch(() => undefined);
    failAfterWrites = Infinity;

    const got = await secureStorage.getItem('safe_key');
    // The complete old value (or nothing) — never a torn A/B mix.
    expect(got === null || got === oldValue || got === newValue).toBe(true);
    expect(got).toBe(oldValue);
  });

  it('a completed rewrite replaces the value and retires the old generation', async () => {
    const oldValue = 'A'.repeat(9000);
    const newValue = 'B'.repeat(10800);
    await secureStorage.setItem('safe_key', oldValue);
    await secureStorage.setItem('safe_key', newValue);
    expect(await secureStorage.getItem('safe_key')).toBe(newValue);
    // No shard containing old-generation content survives GC.
    expect([...store.values()].some((v) => v.includes('A'))).toBe(false);
  });

  it('shrinking a chunked value to a single shard keeps reads consistent', async () => {
    await secureStorage.setItem('shrink_key', 'C'.repeat(4000));
    await secureStorage.setItem('shrink_key', 'small');
    expect(await secureStorage.getItem('shrink_key')).toBe('small');
  });
});
