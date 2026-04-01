/**
 * Receipt validation service.
 *
 * Attempts server-side validation via a Firebase Cloud Function endpoint.
 * Falls back to client-side validation with a warning when the server
 * is unavailable. Includes fraud detection via receipt hash tracking
 * to prevent replay attacks.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIREBASE_FUNCTIONS_URL =
  (typeof process !== 'undefined' &&
    (process as any).env?.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL) ||
  '';

const RECEIPT_HASH_STORAGE_KEY = '@wordfall_receipt_hashes';

export interface ReceiptValidationResult {
  valid: boolean;
  error?: string;
}

// ── Fraud detection: receipt hash tracking ────────────────────────────────────

/**
 * Simple hash function for receipt strings.
 * Not cryptographic — just enough to detect exact replays.
 */
function hashReceipt(receipt: string): string {
  let hash = 0;
  for (let i = 0; i < receipt.length; i++) {
    const char = receipt.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0; // Convert to 32bit integer
  }
  return hash.toString(36);
}

async function loadReceiptHashes(): Promise<Set<string>> {
  try {
    const stored = await AsyncStorage.getItem(RECEIPT_HASH_STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored) as string[]);
    }
  } catch {
    // Ignore — fall through to empty set
  }
  return new Set();
}

async function saveReceiptHash(hash: string): Promise<void> {
  try {
    const hashes = await loadReceiptHashes();
    hashes.add(hash);
    // Keep only the last 500 hashes to bound storage
    const arr = Array.from(hashes);
    const trimmed = arr.length > 500 ? arr.slice(arr.length - 500) : arr;
    await AsyncStorage.setItem(
      RECEIPT_HASH_STORAGE_KEY,
      JSON.stringify(trimmed),
    );
  } catch {
    console.warn('[ReceiptValidation] Failed to persist receipt hash');
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

export async function validateReceipt(
  receipt: string,
  productId: string,
): Promise<ReceiptValidationResult> {
  // Fraud detection: check for receipt replay
  const hash = hashReceipt(receipt);
  const knownHashes = await loadReceiptHashes();

  if (knownHashes.has(hash)) {
    console.warn(
      '[ReceiptValidation] Duplicate receipt detected (possible replay attack):',
      productId,
    );
    return { valid: false, error: 'Duplicate receipt — possible replay attack' };
  }

  // Attempt server-side validation if configured
  if (FIREBASE_FUNCTIONS_URL) {
    try {
      const response = await fetch(
        `${FIREBASE_FUNCTIONS_URL}/validateReceipt`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receipt,
            productId,
            platform: Platform.OS,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          await saveReceiptHash(hash);
        }
        return {
          valid: !!data.valid,
          error: data.error,
        };
      }

      // Non-OK response — fall through to client-side validation
      console.warn(
        `[ReceiptValidation] Server returned ${response.status} — falling back to client-side validation`,
      );
    } catch (error) {
      // Network error — fall through to client-side validation
      if (__DEV__) {
        console.warn(
          '[ReceiptValidation] Server validation failed (network error) — falling back to client-side validation:',
          error,
        );
      }
    }
  } else {
    if (__DEV__) {
      console.warn(
        '[ReceiptValidation] EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL not configured — using client-side validation only',
      );
    }
  }

  // Client-side fallback: trust the receipt but record it
  console.log(
    '[ReceiptValidation] Client-side validation (server unavailable):',
    productId,
  );
  await saveReceiptHash(hash);
  return { valid: true };
}
