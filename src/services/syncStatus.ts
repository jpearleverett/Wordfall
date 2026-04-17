/**
 * Sync-status signal — tiny subscribable store the UI reads to decide
 * whether to show a "changes not synced" banner.
 *
 * Model:
 *   - state: 'idle' when nothing in flight and no recent failure
 *           'pending' when >=1 write is in flight
 *           'failed'  when the most recent completed write failed
 *   - failureCount: number of consecutive failures; a successful write
 *     resets to 0. Used by the UI to escalate tone (one blip vs sustained
 *     outage).
 *   - lastSyncedAt: ms since epoch of the most recent successful write.
 *
 * Consumers get state via `useSyncStatus()` / `useSyncStatusSelector()`
 * (below), which wrap React 18's useSyncExternalStore — the canonical
 * concurrent-mode-safe subscription primitive. That avoids the tearing
 * issues that plain useState + useEffect(subscribe) can hit under
 * Suspense / transitions / startTransition.
 */
import { useSyncExternalStore } from 'react';

export type SyncState = 'idle' | 'pending' | 'failed';

export interface SyncSnapshot {
  state: SyncState;
  pendingOps: number;
  failureCount: number;
  lastSyncedAt: number | null;
  lastError: string | null;
}

type Listener = (s: SyncSnapshot) => void;

const snapshot: SyncSnapshot = {
  state: 'idle',
  pendingOps: 0,
  failureCount: 0,
  lastSyncedAt: null,
  lastError: null,
};

const listeners = new Set<Listener>();

function emit(): void {
  // Shallow clone so consumers using referential-equality checks
  // (React, useSyncExternalStore) rerender on every update.
  const s: SyncSnapshot = { ...snapshot };
  for (const l of listeners) {
    try {
      l(s);
    } catch {
      // listener isolation
    }
  }
}

function recompute(): void {
  if (snapshot.pendingOps > 0) snapshot.state = 'pending';
  else if (snapshot.failureCount > 0) snapshot.state = 'failed';
  else snapshot.state = 'idle';
}

export function markSyncPending(_label: string): void {
  snapshot.pendingOps += 1;
  recompute();
  emit();
}

export function markSyncSuccess(_label: string): void {
  if (snapshot.pendingOps > 0) snapshot.pendingOps -= 1;
  snapshot.failureCount = 0;
  snapshot.lastError = null;
  snapshot.lastSyncedAt = Date.now();
  recompute();
  emit();
}

export function markSyncFailure(_label: string, err: unknown): void {
  if (snapshot.pendingOps > 0) snapshot.pendingOps -= 1;
  snapshot.failureCount += 1;
  snapshot.lastError =
    (err as { message?: string })?.message ?? String(err ?? 'Unknown error');
  recompute();
  emit();
}

export function getSyncStatus(): SyncSnapshot {
  return { ...snapshot };
}

export function subscribeSyncStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper — not for production use. */
export function __resetSyncStatusForTest(): void {
  snapshot.state = 'idle';
  snapshot.pendingOps = 0;
  snapshot.failureCount = 0;
  snapshot.lastSyncedAt = null;
  snapshot.lastError = null;
  emit();
}

// ── React hooks ──────────────────────────────────────────────────────────────

// useSyncExternalStore demands a stable getSnapshot reference — otherwise
// React treats every call as a change and infinite-loops. We track the
// latest emitted snapshot in a module-scoped cache so getSnapshot can
// return a stable object reference between emit() calls.
let cachedSnapshot: SyncSnapshot = { ...snapshot };
function refreshCache(): void {
  cachedSnapshot = { ...snapshot };
}
function getCachedSnapshot(): SyncSnapshot {
  return cachedSnapshot;
}
listeners.add(refreshCache);

function subscribe(listener: () => void): () => void {
  return subscribeSyncStatus(() => listener());
}

/**
 * React hook form — returns the current SyncSnapshot and re-renders on
 * any change. For slice-only subscriptions use useSyncStatusSelector.
 */
export function useSyncStatus(): SyncSnapshot {
  return useSyncExternalStore(subscribe, getCachedSnapshot, getCachedSnapshot);
}

/**
 * Selector-aware hook. Re-renders only when the selected slice changes
 * under strict equality. Example:
 *   const showBanner = useSyncStatusSelector(s => s.state === 'failed');
 */
export function useSyncStatusSelector<T>(selector: (s: SyncSnapshot) => T): T {
  const full = useSyncExternalStore(subscribe, getCachedSnapshot, getCachedSnapshot);
  return selector(full);
}
