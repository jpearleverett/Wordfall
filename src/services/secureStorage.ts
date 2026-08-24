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
 * Keys: SecureStore rejects any key outside [A-Za-z0-9._-] — and both
 * live callers use '@'-prefixed AsyncStorage-style keys. Callers keep
 * their keys; this module maps each to a SecureStore-legal key (see
 * `toSecureKey`) for every SecureStore operation, while the original key
 * is still used for the AsyncStorage legacy read/remove.
 *
 * Migration: on first read of a key, if SecureStore does not have it
 * but AsyncStorage does, the value is copied over (so next launch after
 * the native package lands automatically upgrades in place) and the
 * value is returned. No caller action needed.
 *
 * Size: expo-secure-store on iOS uses Keychain which has a per-item
 * limit of ~4 KB; Android EncryptedSharedPreferences has no practical
 * limit. For the ≤ 4 KB safe path, values over CHUNK_SIZE are split into
 * N shards. Shards live in a GENERATION-suffixed keyspace
 * (`${key}__g${g}__chunk_${i}`) and `${key}__chunks` holds a single
 * `${g}:${count}` pointer that is flipped as the last write — replacing
 * a chunked value never overwrites the live generation's shards in
 * place, so a crash mid-write leaves the pointer aimed at the old, fully
 * intact generation instead of letting the reader join new and old
 * shards into one corrupt string.
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

/**
 * SecureStore throws 'Invalid key provided to SecureStore' for any key not
 * matching /^[\w.-]+$/. Both consumers ('@wordfall_iap_receipts',
 * '@wordfall_receipt_hashes') carry a '@' prefix, which used to make every
 * SecureStore call throw and silently fall back to plaintext AsyncStorage —
 * the migration this module exists for could never activate. Map the
 * caller's key to a legal one for all SecureStore operations.
 */
function toSecureKey(key: string): string {
  return key.replace(/[^\w.-]/g, '_');
}

interface ChunkPointer {
  /** -1 = legacy un-generationed keyspace (`${key}__chunk_${i}`). */
  generation: number;
  count: number;
}

/** Pointer format: `${generation}:${count}`; a bare integer is legacy. */
function parseChunkPointer(raw: string | null): ChunkPointer | null {
  if (!raw) return null;
  const sep = raw.indexOf(':');
  if (sep === -1) {
    const legacyCount = parseInt(raw, 10);
    if (Number.isFinite(legacyCount) && legacyCount > 0) {
      return { generation: -1, count: legacyCount };
    }
    return null;
  }
  const generation = parseInt(raw.slice(0, sep), 10);
  const count = parseInt(raw.slice(sep + 1), 10);
  if (!Number.isFinite(generation) || !Number.isFinite(count) || count <= 0) {
    return null;
  }
  return { generation, count };
}

function chunkKey(key: string, generation: number, idx: number): string {
  return generation < 0
    ? `${key}__chunk_${idx}`
    : `${key}__g${generation}__chunk_${idx}`;
}

/** Best-effort GC of a retired generation's shards. */
async function deleteChunks(key: string, pointer: ChunkPointer): Promise<void> {
  if (!secureStore) return;
  for (let i = 0; i < pointer.count; i++) {
    await secureStore
      .deleteItemAsync(chunkKey(key, pointer.generation, i))
      .catch(() => undefined);
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (!secureStore) throw new Error('SecureStore not available');
  const pointerKey = `${key}${CHUNK_COUNT_SUFFIX}`;
  const oldPointer = parseChunkPointer(await secureStore.getItemAsync(pointerKey));
  if (value.length <= CHUNK_SIZE) {
    // Single-shard — write the value, then retire any chunked predecessor.
    // Until the pointer delete lands the reader still returns the complete
    // OLD chunked value, never a mix.
    await secureStore.setItemAsync(key, value);
    if (oldPointer) {
      await secureStore.deleteItemAsync(pointerKey).catch(() => undefined);
      await deleteChunks(key, oldPointer);
    }
    return;
  }
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  // Torn-write guard: write the NEW generation's shards first, then flip
  // the pointer in one atomic write. The old generation's shards are never
  // touched until the flip is durable, so a crash at any point leaves the
  // reader seeing either the complete old value or the complete new one —
  // the previous in-place scheme let it join new chunks 0..k with old
  // chunks k+1..M-1 into one corrupt string.
  const generation =
    oldPointer && oldPointer.generation >= 0
      ? (oldPointer.generation + 1) % 2
      : 0;
  for (let i = 0; i < chunks.length; i++) {
    await secureStore.setItemAsync(chunkKey(key, generation, i), chunks[i]);
  }
  await secureStore.setItemAsync(pointerKey, `${generation}:${chunks.length}`);
  // The flip is durable — everything below is garbage collection.
  if (oldPointer) {
    await deleteChunks(key, oldPointer);
  }
  // Also clear the single-shard slot if a shorter value was previously stored.
  await secureStore.deleteItemAsync(key).catch(() => undefined);
}

async function secureGet(key: string): Promise<string | null> {
  if (!secureStore) throw new Error('SecureStore not available');
  const pointer = parseChunkPointer(
    await secureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`),
  );
  if (pointer) {
    const parts: string[] = [];
    for (let i = 0; i < pointer.count; i++) {
      const part = await secureStore.getItemAsync(chunkKey(key, pointer.generation, i));
      if (part === null) return null; // missing chunk — treat as absent
      parts.push(part);
    }
    return parts.join('');
  }
  return secureStore.getItemAsync(key);
}

async function secureDelete(key: string): Promise<void> {
  if (!secureStore) throw new Error('SecureStore not available');
  const pointer = parseChunkPointer(
    await secureStore
      .getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`)
      .catch(() => null),
  );
  if (pointer) {
    await deleteChunks(key, pointer);
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
      const existing = await secureGet(toSecureKey(key));
      if (existing !== null) return existing;
      // Migration path: pull from AsyncStorage (under the caller's original
      // key) if present and copy over.
      const legacy = await AsyncStorage.getItem(key);
      if (legacy !== null) {
        try {
          await secureSet(toSecureKey(key), legacy);
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
      await secureSet(toSecureKey(key), value);
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
      await secureDelete(toSecureKey(key));
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
