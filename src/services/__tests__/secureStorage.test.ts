/**
 * secureStorage — verify AsyncStorage fallback path.
 *
 * In the jest env `expo-secure-store` is not installed, so every call
 * must route cleanly through AsyncStorage with no native dependency.
 * This guarantees production builds that haven't yet had a dev-client
 * rebuild still work identically to before the migration.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '../secureStorage';

describe('secureStorage (fallback path)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('reports secure=false when expo-secure-store is not linked', () => {
    expect(secureStorage.isSecure()).toBe(false);
  });

  it('setItem then getItem round-trips through AsyncStorage', async () => {
    await secureStorage.setItem('unit_test_key', 'hello-world');
    const got = await secureStorage.getItem('unit_test_key');
    expect(got).toBe('hello-world');
    // In fallback mode, AsyncStorage is the backing store
    expect(await AsyncStorage.getItem('unit_test_key')).toBe('hello-world');
  });

  it('getItem on a missing key returns null', async () => {
    const got = await secureStorage.getItem('nope');
    expect(got).toBeNull();
  });

  it('removeItem clears the value', async () => {
    await secureStorage.setItem('remove_me', 'x');
    await secureStorage.removeItem('remove_me');
    expect(await secureStorage.getItem('remove_me')).toBeNull();
  });

  it('preserves legacy AsyncStorage values written before migration', async () => {
    // Simulate a pre-migration build writing directly to AsyncStorage.
    await AsyncStorage.setItem('legacy_key', 'legacy_value');
    // A new build calling secureStorage still surfaces the old value.
    expect(await secureStorage.getItem('legacy_key')).toBe('legacy_value');
  });

  it('round-trips a large JSON payload (~4 KB) without corruption', async () => {
    const big = JSON.stringify(
      Array.from({ length: 100 }, (_, i) => ({
        idx: i,
        receipt: 'x'.repeat(30),
        transactionId: `tx_${i}`,
      })),
    );
    await secureStorage.setItem('big_payload', big);
    const got = await secureStorage.getItem('big_payload');
    expect(got).toBe(big);
  });
});
