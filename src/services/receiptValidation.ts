/**
 * Receipt validation service.
 *
 * In production, server-side validation via Firebase Cloud Functions is REQUIRED.
 * Client-side fallback is only permitted in __DEV__ mode.
 * Includes fraud detection via receipt hash tracking to prevent replay attacks.
 */

import { Platform } from 'react-native';
import { logger } from '../utils/logger';
import { crashReporter } from './crashReporting';
import { secureStorage } from './secureStorage';

const FIREBASE_FUNCTIONS_URL =
  (typeof process !== 'undefined' &&
    (process as any).env?.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL) ||
  '';

export function isReceiptValidationConfigured(): boolean {
  return !!FIREBASE_FUNCTIONS_URL;
}

const RECEIPT_HASH_STORAGE_KEY = '@wordfall_receipt_hashes';

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

// ── Types ────────────────────────────────────────────────────────────────────

/** Platform-specific receipt data for Apple App Store */
export interface AppleReceiptData {
  platform: 'ios';
  /** Base64-encoded App Store receipt */
  receipt: string;
  productId: string;
}

/** Platform-specific receipt data for Google Play */
export interface GooglePlayReceiptData {
  platform: 'android';
  /** Purchase token from Google Play */
  receipt: string;
  productId: string;
  /** Package name of the app */
  packageName?: string;
}

export type PlatformReceiptData = AppleReceiptData | GooglePlayReceiptData;

/** Response from server-side validation endpoint */
export interface ServerValidationResponse {
  valid: boolean;
  error?: string;
  /** Product ID confirmed by the store */
  productId?: string;
  /** Subscription expiry timestamp (ms since epoch), present for subscriptions */
  expiresAt?: number;
  /** Whether this is a trial period */
  isTrial?: boolean;
  /** Original transaction ID from the store */
  transactionId?: string;
}

export interface ReceiptValidationResult {
  valid: boolean;
  error?: string;
  /** Subscription expiry timestamp (ms since epoch) */
  expiresAt?: number;
  /** Product ID confirmed by the store */
  productId?: string;
  /** Whether this is a trial period */
  isTrial?: boolean;
  /** Original transaction ID */
  transactionId?: string;
}

export interface SubscriptionValidationResult {
  valid: boolean;
  error?: string;
  /** Subscription expiry date as ISO string */
  expiryDate?: string;
  /** Subscription expiry timestamp (ms since epoch) */
  expiresAt?: number;
  /** Whether the subscription is currently active */
  isActive: boolean;
  /** Whether this is a trial period */
  isTrial?: boolean;
  /** Whether auto-renew is enabled */
  autoRenewing?: boolean;
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
    const stored = await secureStorage.getItem(RECEIPT_HASH_STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored) as string[]);
    }
  } catch {
    // Ignore — fall through to empty set
  }
  return new Set();
}

// Serialize all receipt-hash writes through a single-slot promise chain.
// Without this, two concurrent purchases can both read the same snapshot,
// append their own hash, and race on save(), losing one hash.
let receiptHashWriteChain: Promise<void> = Promise.resolve();

async function saveReceiptHash(hash: string): Promise<void> {
  receiptHashWriteChain = receiptHashWriteChain.then(async () => {
    try {
      const hashes = await loadReceiptHashes();
      hashes.add(hash);
      // Keep only the last 500 hashes to bound storage
      const arr = Array.from(hashes);
      const trimmed = arr.length > 500 ? arr.slice(arr.length - 500) : arr;
      await secureStorage.setItem(
        RECEIPT_HASH_STORAGE_KEY,
        JSON.stringify(trimmed),
      );
    } catch {
      logger.warn('[ReceiptValidation] Failed to persist receipt hash');
    }
  }, () => {
    // Previous write failed — still attempt this one
    // No-op; thenable continues with next task
  });
  await receiptHashWriteChain;
}

// ── Retry logic ──────────────────────────────────────────────────────────────

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with exponential backoff retry.
 * Retries up to MAX_RETRY_ATTEMPTS times on network errors or 5xx responses.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, options);

      // Don't retry client errors (4xx) — only server errors (5xx)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server error — retry with backoff
      lastError = new Error(`Server returned ${response.status}`);
    } catch (error) {
      // Network error — retry with backoff
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < MAX_RETRY_ATTEMPTS - 1) {
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  throw lastError ?? new Error('All retry attempts exhausted');
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Attempt server-side receipt validation with retry logic.
 * Returns null if server is not configured (only valid in __DEV__).
 */
async function serverValidate(
  receipt: string,
  productId: string,
  userId?: string,
): Promise<ServerValidationResponse | null> {
  if (!FIREBASE_FUNCTIONS_URL) {
    return null;
  }

  const response = await fetchWithRetry(
    `${FIREBASE_FUNCTIONS_URL}/validateReceipt`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receipt,
        productId,
        platform: Platform.OS,
        userId,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    return {
      valid: false,
      error: `Server validation failed (${response.status}): ${errorText}`,
    };
  }

  const data: ServerValidationResponse = await response.json();
  return data;
}

/**
 * Validate a purchase receipt.
 *
 * - In production: server-side validation is REQUIRED. If the server is
 *   unavailable or returns an error, the receipt is rejected.
 * - In __DEV__ mode: falls back to client-side validation (trust receipt)
 *   when the server is unavailable, with a warning.
 */
export async function validateReceipt(
  receipt: string,
  productId: string,
  userId?: string,
): Promise<ReceiptValidationResult> {
  // Fraud detection: check for receipt replay
  const hash = hashReceipt(receipt);
  const knownHashes = await loadReceiptHashes();

  if (knownHashes.has(hash)) {
    logger.warn(
      '[ReceiptValidation] Duplicate receipt detected (possible replay attack):',
      productId,
    );
    return { valid: false, error: 'Duplicate receipt — possible replay attack' };
  }

  // Attempt server-side validation
  try {
    const serverResult = await serverValidate(receipt, productId, userId);

    if (serverResult !== null) {
      // Server responded — use its result
      if (serverResult.valid) {
        await saveReceiptHash(hash);
      }
      return {
        valid: !!serverResult.valid,
        error: serverResult.error,
        expiresAt: serverResult.expiresAt,
        productId: serverResult.productId,
        isTrial: serverResult.isTrial,
        transactionId: serverResult.transactionId,
      };
    }

    // Server not configured (FIREBASE_FUNCTIONS_URL is empty)
    if (__DEV__) {
      console.warn(
        '[ReceiptValidation] EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL not configured — using client-side validation only (__DEV__ mode)',
      );
      await saveReceiptHash(hash);
      return { valid: true };
    }

    // Production: no server URL configured — reject
    return {
      valid: false,
      error: 'Server validation unavailable',
    };
  } catch (error) {
    crashReporter.captureException(
      error instanceof Error ? error : new Error(String(error)),
      { tags: { step: 'serverValidate' }, productId },
    );
    // All retries exhausted
    if (__DEV__) {
      console.warn(
        '[ReceiptValidation] Server validation failed after retries — falling back to client-side validation (__DEV__ mode):',
        error,
      );
      await saveReceiptHash(hash);
      return { valid: true };
    }

    // Production: server validation failed — reject the receipt
    return {
      valid: false,
      error: 'Server validation unavailable',
    };
  }
}

/**
 * Validate a VIP subscription receipt.
 *
 * Checks receipt validity and returns subscription status including expiry date.
 * Uses the same server-required-in-production policy as validateReceipt.
 */
export async function validateSubscription(
  receipt: string,
  productId: string,
  userId?: string,
): Promise<SubscriptionValidationResult> {
  const result = await validateReceipt(receipt, productId, userId);

  if (!result.valid) {
    return {
      valid: false,
      error: result.error,
      isActive: false,
    };
  }

  const now = Date.now();
  const expiresAt = result.expiresAt;
  const isActive = expiresAt ? expiresAt > now : true; // If no expiry, assume active (dev fallback)
  const expiryDate = expiresAt ? new Date(expiresAt).toISOString() : undefined;

  return {
    valid: true,
    expiryDate,
    expiresAt,
    isActive,
    isTrial: result.isTrial,
    // autoRenewing is determined server-side and would come from the server response
    // In __DEV__ fallback mode, this remains undefined
  };
}
