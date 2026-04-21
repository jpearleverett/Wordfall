/**
 * Phase V1.1 — retry helper + syncStatus.
 *
 * Covers:
 *   1. Success first try — no retry, status ends idle.
 *   2. Transient failure then success — retries, status ends idle.
 *   3. Permanent error (permission-denied) — no retry, status ends failed.
 *   4. Exhausts attempts — throws, status ends failed.
 *   5. syncStatus subscribe/emit reports a monotonic pendingOps count.
 */
import { withRetry } from '../retry';
import {
  __resetSyncStatusForTest,
  getSyncStatus,
  subscribeSyncStatus,
} from '../syncStatus';

jest.mock('../../utils/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), log: jest.fn() },
}));

describe('withRetry', () => {
  beforeEach(() => {
    __resetSyncStatusForTest();
  });

  it('resolves on first try without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(withRetry(fn, { label: 'test-ok' })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(getSyncStatus().state).toBe('idle');
    expect(getSyncStatus().failureCount).toBe(0);
  });

  it('retries on transient error then succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValue('eventually');
    await expect(
      withRetry(fn, { label: 'test-transient', baseDelayMs: 1, maxDelayMs: 2 }),
    ).resolves.toBe('eventually');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(getSyncStatus().state).toBe('idle');
    expect(getSyncStatus().failureCount).toBe(0);
  });

  it('does NOT retry permanent errors AND does not flag them as sync failures', async () => {
    // Permanent errors (permission-denied, unauthenticated, etc.) are
    // config/auth bugs, not connectivity issues. Retrying won't fix
    // them, and marking them as sync failures would light up
    // NotSyncedBanner with misleading "we'll retry when you're back
    // online" copy. Contract: throw to the caller, keep sync status
    // clean so the banner stays dark.
    const err: Error & { code?: string } = new Error('forbidden');
    err.code = 'permission-denied';
    const fn = jest.fn().mockRejectedValue(err);
    await expect(
      withRetry(fn, { label: 'test-perm', baseDelayMs: 1, maxDelayMs: 2 }),
    ).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(getSyncStatus().state).toBe('idle');
    expect(getSyncStatus().failureCount).toBe(0);
  });

  it('throws after exhausting attempts, marks status failed', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('flaky'));
    await expect(
      withRetry(fn, {
        label: 'test-exhaust',
        attempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 2,
      }),
    ).rejects.toThrow('flaky');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(getSyncStatus().state).toBe('failed');
    expect(getSyncStatus().failureCount).toBe(1);
  });

  it('resets failureCount to 0 on a later success', async () => {
    const fail = jest.fn().mockRejectedValue(new Error('temporary'));
    await expect(
      withRetry(fail, {
        label: 'test-reset-1',
        attempts: 1,
        baseDelayMs: 1,
        maxDelayMs: 2,
      }),
    ).rejects.toThrow('temporary');
    expect(getSyncStatus().failureCount).toBe(1);

    const ok = jest.fn().mockResolvedValue('ok');
    await withRetry(ok, { label: 'test-reset-2' });
    expect(getSyncStatus().failureCount).toBe(0);
    expect(getSyncStatus().state).toBe('idle');
  });

  it('emits subscriber updates for pending and completion transitions', async () => {
    const seen: string[] = [];
    const unsub = subscribeSyncStatus((s) => seen.push(s.state));
    const fn = jest.fn().mockResolvedValue(42);
    await withRetry(fn, { label: 'test-emit' });
    unsub();
    expect(seen).toContain('pending');
    expect(seen[seen.length - 1]).toBe('idle');
  });
});
