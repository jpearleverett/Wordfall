/**
 * createPersistQueue — single-slot, latest-write-wins persistence scheduler.
 *
 * Problem it solves:
 *   EconomyContext + PlayerContext debounce their AsyncStorage + Firestore
 *   writes to coalesce rapid state churn (15+ setData calls per winning
 *   puzzle). The debounce alone doesn't guarantee serialization — if a
 *   Firestore setDoc takes 4 seconds on a flaky network and the debounce
 *   fires a second write 5 seconds later, two setDoc calls can be in
 *   flight simultaneously and land out-of-order. Server-timestamps mask
 *   the issue most of the time but the window exists.
 *
 * Contract:
 *   - enqueue(payload) never awaits. At most ONE write is in flight at a
 *     time. Calls made while a write is in flight replace any earlier
 *     pending payload so only the latest snapshot is eventually written.
 *   - flush(payload) awaits until all pending writes (including the one
 *     in flight plus the caller's new payload) have drained. Use from
 *     AppState 'background' to crash-safe-flush before the OS suspends
 *     the JS thread.
 *   - The underlying write fn is never called concurrently with itself.
 *     Failures are logged but do not halt the queue — the next enqueue
 *     will try again with whatever payload arrived next.
 */

import { logger } from './logger';

type Writer<T> = (payload: T) => Promise<void>;

export interface PersistQueue<T> {
  enqueue(payload: T): void;
  flush(payload: T): Promise<void>;
  /** Test helper — true when a write is currently in flight. */
  isBusy(): boolean;
}

export function createPersistQueue<T>(
  writer: Writer<T>,
  label = 'persist',
): PersistQueue<T> {
  let inFlight = false;
  let pending: T | undefined;
  let pendingDrainPromise: Promise<void> | null = null;
  let pendingDrainResolve: (() => void) | null = null;

  function ensureDrainPromise(): Promise<void> {
    if (pendingDrainPromise) return pendingDrainPromise;
    pendingDrainPromise = new Promise<void>((resolve) => {
      pendingDrainResolve = resolve;
    });
    return pendingDrainPromise;
  }

  function resolveDrainPromise(): void {
    if (pendingDrainResolve) {
      pendingDrainResolve();
      pendingDrainResolve = null;
      pendingDrainPromise = null;
    }
  }

  async function run(): Promise<void> {
    inFlight = true;
    while (pending !== undefined) {
      const payload = pending;
      pending = undefined;
      try {
        await writer(payload);
      } catch (err) {
        logger.warn(`[persistQueue:${label}] write failed`, err);
        // Drop this payload — caller will enqueue the next snapshot.
        // Keeps us from spinning on a persistent failure (offline, etc.).
      }
    }
    inFlight = false;
    resolveDrainPromise();
  }

  return {
    enqueue(payload: T): void {
      pending = payload;
      if (!inFlight) {
        void run();
      }
    },
    flush(payload: T): Promise<void> {
      pending = payload;
      const drain = ensureDrainPromise();
      if (!inFlight) void run();
      return drain;
    },
    isBusy(): boolean {
      return inFlight;
    },
  };
}
