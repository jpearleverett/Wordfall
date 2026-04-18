/**
 * secureStorage — AsyncStorage-compatible wrapper that prefers
 * `expo-secure-store` (Android Keystore / iOS Keychain) when the native
 * module is available, and falls back to AsyncStorage otherwise.
 *
 * Motivation: AsyncStorage lives in an unencrypted SharedPreferences file
 * on Android. A rooted device can edit it and re-inject stale purchase
 * receipts to claim VIP / AdRemoval on restore. Server-side validation
 * (validateReceipt Cloud Function) is still the source of truth, but
 * raising the bar on the client removes the easiest tamper path.
 *
 * Activation: this module is a no-op until `expo-secure-store` is
 * installed via `npm install expo-secure-store` + a fresh dev client
 * APK. Until then the fallback keeps the current behaviour so nothing
 * breaks on existing builds.
 *
 * Migration: on first read of a key, if SecureStore does not have it
 * but AsyncStorage does, the value is copied over (so next launch after
 * the native package lands automatically upgrades in place) and the
 * value is returned. No caller action needed.
 *
 * Size: expo-secure-store on iOS uses Keychain which has a per-item
 * limit of ~4 KB; Android EncryptedSharedPreferences has no practical
 * limit. For the ≤ 4 KB safe path, values over CHUNK_SIZE are split
 * into N shards stored as `${key}__chunk_${i}` with `${key}__chunks`
 * holding the count.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

// Dynamically require so tsc + bundler don't hard-fail when the native
// package isn't installed. When the package lands, activation is automatic.
let secureStore: SecureStoreModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('expo-secure-store');
  if (mod && typeof mod.getItemAsync === 'function') {
    secureStore = mod as SecureStoreModule;
  }
} catch {
  secureStore = null;
}

const CHUNK_SIZE = 1800; // leave headroom under the 2 KB iOS Keychain cap
const CHUNK_COUNT_SUFFIX = '__chunks';

function chunkKey(key: string, idx: number): string {
  return `${key}__chunk_${idx}`;
}

async function secureSet(key: string, value: string): Promise<void> {
  if (!secureStore) throw new Error('SecureStore not available');
  if (value.length <= CHUNK_SIZE) {
    // Single-shard — write the value directly and clear any stale chunk map.
    await secureStore.setItemAsync(key, value);
    await secureStore.deleteItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`).catch(() => undefined);
    return;
  }
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  // Write chunks first, then the count (so a crash mid-write doesn't
  // leave a partial-count pointing at stale chunks).
  for (let i = 0; i < chunks.length; i++) {
    await secureStore.setItemAsync(chunkKey(key, i), chunks[i]);
  }
  await secureStore.setItemAsync(
    `${key}${CHUNK_COUNT_SUFFIX}`,
    String(chunks.length),
  );
  // Also clear the single-shard slot if a shorter value was previously stored.
  await secureStore.deleteItemAsync(key).catch(() => undefined);
}

async function secureGet(key: string): Promise<string | null> {
  if (!secureStore) throw new Error('SecureStore not available');
  const countRaw = await secureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`);
  if (countRaw) {
    const count = parseInt(countRaw, 10);
    if (Number.isFinite(count) && count > 0) {
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await secureStore.getItemAsync(chunkKey(key, i));
        if (part === null) return null; // missing chunk — treat as absent
        parts.push(part);
      }
      return parts.join('');
    }
  }
  return secureStore.getItemAsync(key);
}

async function secureDelete(key: string): Promise<void> {
  if (!secureStore) throw new Error('SecureStore not available');
  const countRaw = await secureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`);
  if (countRaw) {
    const count = parseInt(countRaw, 10) || 0;
    for (let i = 0; i < count; i++) {
      await secureStore.deleteItemAsync(chunkKey(key, i)).catch(() => undefined);
    }
    await secureStore.deleteItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`).catch(() => undefined);
  }
  await secureStore.deleteItemAsync(key).catch(() => undefined);
}

export const secureStorage = {
  /**
   * Reads the key from SecureStore when available; on a first-call miss
   * migrates any existing AsyncStorage value into SecureStore and returns
   * it. Falls back to AsyncStorage when the native module isn't linked.
   */
  async getItem(key: string): Promise<string | null> {
    if (!secureStore) {
      return AsyncStorage.getItem(key);
    }
    try {
      const existing = await secureGet(key);
      if (existing !== null) return existing;
      // Migration path: pull from AsyncStorage if present and copy over.
      const legacy = await AsyncStorage.getItem(key);
      if (legacy !== null) {
        try {
          await secureSet(key, legacy);
        } catch (err) {
          logger.warn('[secureStorage] Migration write failed:', err);
        }
        return legacy;
      }
      return null;
    } catch (err) {
      logger.warn('[secureStorage] getItem failed, falling back:', err);
      return AsyncStorage.getItem(key);
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!secureStore) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    try {
      await secureSet(key, value);
      // Clear any stale AsyncStorage copy so migration doesn't re-read it.
      await AsyncStorage.removeItem(key).catch(() => undefined);
    } catch (err) {
      logger.warn('[secureStorage] setItem failed, falling back:', err);
      await AsyncStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (!secureStore) {
      await AsyncStorage.removeItem(key);
      return;
    }
    try {
      await secureDelete(key);
    } catch (err) {
      logger.warn('[secureStorage] removeItem failed:', err);
    }
    // Also remove legacy AsyncStorage copy to prevent resurrection.
    await AsyncStorage.removeItem(key).catch(() => undefined);
  },

  /** True when the native SecureStore module is linked. */
  isSecure(): boolean {
    return secureStore !== null;
  },
};
