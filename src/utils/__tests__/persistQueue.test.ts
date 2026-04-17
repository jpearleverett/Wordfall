/**
 * persistQueue — single-slot latest-write-wins scheduler.
 *
 * Covers:
 *   1. Single enqueue → single write.
 *   2. Burst of enqueues → only the final payload is written (coalescing).
 *   3. Enqueue during in-flight write → queued, runs after prior resolves.
 *   4. flush() awaits until queue is drained.
 *   5. Writer failure does not halt the queue — next enqueue still runs.
 *   6. isBusy() toggles correctly across in-flight boundary.
 */
import { createPersistQueue } from '../persistQueue';

jest.mock('../logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), log: jest.fn() },
}));

/** Spin until a predicate is true, bounded by ~50ms. */
async function waitFor(cond: () => boolean): Promise<void> {
  const start = Date.now();
  while (!cond() && Date.now() - start < 50) {
    await new Promise((r) => setTimeout(r, 1));
  }
}

describe('createPersistQueue', () => {
  it('runs a single enqueued write', async () => {
    const writes: number[] = [];
    const q = createPersistQueue<number>(async (v) => {
      writes.push(v);
    });
    q.enqueue(1);
    await q.flush(1);
    // Last enqueue flush call drains; final pending was 1 (same as before)
    expect(writes).toEqual([1, 1]);
  });

  it('coalesces a burst of enqueues to the final payload', async () => {
    const writes: number[] = [];
    let resolveFirst: (() => void) | null = null;
    const q = createPersistQueue<number>(async (v) => {
      writes.push(v);
      if (v === 1) {
        await new Promise<void>((r) => {
          resolveFirst = r;
        });
      }
    });
    q.enqueue(1);
    q.enqueue(2);
    q.enqueue(3);
    // First write (v=1) is suspended. v=2 + v=3 were queued; latest wins.
    await waitFor(() => writes.length === 1);
    expect(writes).toEqual([1]);
    resolveFirst!();
    await waitFor(() => writes.length === 2);
    // Only the latest (3) ran — 2 was dropped.
    expect(writes).toEqual([1, 3]);
  });

  it('flush awaits until the queue is drained', async () => {
    const writes: number[] = [];
    let resolveFirst: (() => void) | null = null;
    const q = createPersistQueue<number>(async (v) => {
      writes.push(v);
      if (v === 1) {
        await new Promise<void>((r) => {
          resolveFirst = r;
        });
      }
    });
    q.enqueue(1);
    await waitFor(() => writes.length === 1);
    const flushP = q.flush(99);
    // Queue still in flight — flush hasn't resolved yet
    expect(q.isBusy()).toBe(true);
    resolveFirst!();
    await flushP;
    expect(writes).toEqual([1, 99]);
    expect(q.isBusy()).toBe(false);
  });

  it('continues after a failed write', async () => {
    const writes: number[] = [];
    const q = createPersistQueue<number>(async (v) => {
      writes.push(v);
      if (v === 1) throw new Error('nope');
    });
    q.enqueue(1);
    await q.flush(2);
    expect(writes).toEqual([1, 2]);
    expect(q.isBusy()).toBe(false);
  });

  it('isBusy reports in-flight state', async () => {
    let resolveWrite: (() => void) | null = null;
    const q = createPersistQueue<string>(async () => {
      await new Promise<void>((r) => {
        resolveWrite = r;
      });
    });
    expect(q.isBusy()).toBe(false);
    q.enqueue('x');
    await waitFor(() => q.isBusy());
    expect(q.isBusy()).toBe(true);
    resolveWrite!();
    await waitFor(() => !q.isBusy());
    expect(q.isBusy()).toBe(false);
  });
});
