/**
 * Retry helper for flaky network/Firestore writes.
 *
 * Wraps a promise-returning fn with exponential-backoff retries and routes
 * start/success/failure signals through `syncStatus` so the UI can surface
 * a "changes not synced" indicator when recent writes keep failing.
 *
 * Contract:
 *   - Resolves with the fn's value on success.
 *   - Throws only after all attempts are exhausted. Callers that want to
 *     fire-and-forget should wrap in try/catch — retry.ts does NOT swallow
 *     (the existing firestore.ts `logFirestoreError` sites already do that).
 *   - Skips retry for errors that look permanent (permission-denied,
 *     invalid-argument, unauthenticated) — retrying those is pointless and
 *     wastes Firebase quota.
 */
import { logger } from '../utils/logger';
import { markSyncPending, markSyncSuccess, markSyncFailure } from './syncStatus';

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
}

const DEFAULTS: Required<Omit<RetryOptions, 'label'>> = {
  attempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 4000,
};

const PERMANENT_CODES = new Set([
  'permission-denied',
  'invalid-argument',
  'unauthenticated',
  'not-found',
  'already-exists',
  'failed-precondition',
]);

function isPermanent(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return typeof code === 'string' && PERMANENT_CODES.has(code);
}

function backoff(attempt: number, base: number, cap: number): number {
  const exp = base * 2 ** attempt;
  const capped = Math.min(exp, cap);
  // Full jitter: [0, capped]
  return Math.floor(Math.random() * capped);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { attempts, baseDelayMs, maxDelayMs } = { ...DEFAULTS, ...opts };
  const label = opts.label ?? 'op';
  markSyncPending(label);
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const value = await fn();
      markSyncSuccess(label);
      return value;
    } catch (err) {
      lastErr = err;
      if (isPermanent(err) || i === attempts - 1) break;
      const wait = backoff(i, baseDelayMs, maxDelayMs);
      logger.warn(
        `[retry] ${label} attempt ${i + 1}/${attempts} failed, retrying in ${wait}ms`,
        err,
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  markSyncFailure(label, lastErr);
  throw lastErr;
}
