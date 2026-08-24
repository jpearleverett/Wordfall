/**
 * Validated-score submission resilience.
 *
 * With `leaderboardValidationEnabled` defaulting true, all three leaderboard
 * submissions (daily / weekly / event) go through the `submitValidatedScore`
 * callable. These paths originally awaited the callable exactly once and
 * swallowed any error — a network blip or cold-start timeout permanently
 * dropped the score (the daily can only be completed once per day; weekly and
 * event totals accumulate server-side per call). The fix wraps the callable
 * in the standard withRetry policy with the `functions/` code prefix
 * normalized so the permanent-error short-circuit still applies:
 *   - transient codes (unavailable, internal, deadline-exceeded) retry;
 *   - validator rejections (permission-denied plausibility bounces,
 *     invalid-argument) fail fast with a single attempt;
 *   - the legacy direct write is NOT attempted while validation is on.
 */

jest.mock('../../config/firebase', () => ({
  isFirebaseConfigured: true,
  db: {},
  default: {},
}));

const callableMock = jest.fn();

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => callableMock),
}));

const setDocMock = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  updateDoc: jest.fn(),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'ts'),
  onSnapshot: jest.fn(() => () => {}),
  increment: jest.fn((n: number) => n),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
  writeBatch: jest.fn(() => ({ set: jest.fn(), update: jest.fn(), delete: jest.fn(), commit: jest.fn() })),
  runTransaction: jest.fn(),
  Timestamp: { now: () => ({ seconds: 0, nanoseconds: 0 }) },
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  documentId: jest.fn(() => '__name__'),
  getFirestore: jest.fn(() => ({})),
}));

jest.mock('firebase/app', () => ({}), { virtual: true });

jest.mock('../remoteConfig', () => ({
  getRemoteBoolean: jest.fn(() => true), // leaderboardValidationEnabled = on
}));

import { firestoreService } from '../firestore';

describe('validated-score submissions retry transient callable failures', () => {
  let randomSpy: jest.SpyInstance;

  beforeEach(() => {
    callableMock.mockReset();
    setDocMock.mockReset();
    // Full-jitter backoff is Math.random() * cap — pin to 0 so retries are
    // immediate and the test doesn't sleep.
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it('submitDailyScore retries a transient failure and succeeds', async () => {
    callableMock
      .mockRejectedValueOnce({ code: 'functions/unavailable', message: 'try later' })
      .mockResolvedValueOnce({ data: { ok: true, scope: 'daily', written: true } });

    await firestoreService.submitDailyScore('uid_1', 5000, 3, 2, 'Tester');

    expect(callableMock).toHaveBeenCalledTimes(2);
    expect(callableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'daily', score: 5000 }),
    );
    // No direct-write fallback while validation is on.
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('submitWeeklyScore does NOT retry a permanent validator rejection', async () => {
    callableMock.mockRejectedValue({
      code: 'functions/permission-denied',
      message: 'Score exceeds plausible ceiling for this level',
    });

    await firestoreService.submitWeeklyScore('uid_1', 999999, 'Tester', 42, 'classic');

    expect(callableMock).toHaveBeenCalledTimes(1);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('submitEventScore exhausts retries on persistent transient failure without throwing', async () => {
    callableMock.mockRejectedValue({ code: 'functions/internal', message: 'boom' });

    await expect(
      firestoreService.submitEventScore('event_1', 'uid_1', 1200, 'Tester', 7, 'classic'),
    ).resolves.toBeUndefined();

    // withRetry default = 3 attempts.
    expect(callableMock).toHaveBeenCalledTimes(3);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('submitWeeklyScore retries then lands the cumulative delta once', async () => {
    callableMock
      .mockRejectedValueOnce({ code: 'functions/deadline-exceeded', message: 'slow' })
      .mockResolvedValueOnce({ data: { ok: true, scope: 'weekly', written: true } });

    await firestoreService.submitWeeklyScore('uid_1', 300, 'Tester', 5, 'expert');

    expect(callableMock).toHaveBeenCalledTimes(2);
    expect(callableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: 'weekly', score: 300, level: 5, mode: 'expert' }),
    );
  });
});
