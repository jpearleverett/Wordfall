import { useCallback, useEffect, useRef, useState } from 'react';
import { CeremonyItem } from '../types';
import { analytics } from '../services/analytics';

/** Maximum ceremonies to show per puzzle completion to prevent modal fatigue */
const MAX_CEREMONIES_PER_BATCH = 2;

interface UseCeremonyQueueOptions {
  /** Function to pop the next ceremony from the player context queue */
  popCeremony: () => CeremonyItem | null;
  /** Current length of the pending ceremonies array */
  pendingCeremonyCount: number;
  /** Whether the player data has finished loading */
  loaded: boolean;
  /** Whether a blocking modal (e.g. welcome-back) is currently shown */
  isBlocked: boolean;
}

interface UseCeremonyQueueResult {
  activeCeremony: CeremonyItem | null;
  handleDismissCeremony: () => void;
  /** Manually trigger processing of the next ceremony (e.g. after welcome-back modal closes) */
  processNext: () => void;
  /** Reset the per-batch counter (call when returning to HomeScreen to process deferred ceremonies) */
  resetBatchCounter: () => void;
}

/**
 * Manages the sequential processing of ceremony modals.
 * Ceremonies are popped from the PlayerContext queue one at a time.
 * When one is dismissed, the next fires after a 300ms delay.
 *
 * To prevent modal fatigue, at most MAX_CEREMONIES_PER_BATCH ceremonies
 * are shown per batch. Remaining ceremonies are deferred until
 * resetBatchCounter() is called (typically on HomeScreen mount).
 */
export function useCeremonyQueue({
  popCeremony,
  pendingCeremonyCount,
  loaded,
  isBlocked,
}: UseCeremonyQueueOptions): UseCeremonyQueueResult {
  const [activeCeremony, setActiveCeremony] = useState<CeremonyItem | null>(null);
  const ceremonyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ceremonyShownAtRef = useRef<number>(0);
  // Track ceremonies shown in the current batch to enforce cap
  const batchCountRef = useRef<number>(0);
  // Ref to always have the latest popCeremony in setTimeout callbacks
  const popCeremonyRef = useRef(popCeremony);
  popCeremonyRef.current = popCeremony;

  // Process pending ceremonies when loaded, unblocked, and queue has items.
  // Single effect prevents race condition where two effects both pop ceremonies.
  useEffect(() => {
    if (loaded && !isBlocked && !activeCeremony && pendingCeremonyCount > 0) {
      if (batchCountRef.current >= MAX_CEREMONIES_PER_BATCH) {
        // Cap reached — defer remaining ceremonies to next batch (HomeScreen return)
        return;
      }
      const next = popCeremony();
      if (next) {
        batchCountRef.current += 1;
        setActiveCeremony(next);
      }
    }
  }, [loaded, pendingCeremonyCount, activeCeremony, isBlocked, popCeremony]);

  // Track when a ceremony is displayed
  useEffect(() => {
    if (activeCeremony) {
      ceremonyShownAtRef.current = Date.now();
      void analytics.trackCeremonyShown(activeCeremony.type);
    }
  }, [activeCeremony]);

  // Cleanup ceremony timer on unmount
  useEffect(() => {
    return () => {
      if (ceremonyTimerRef.current) clearTimeout(ceremonyTimerRef.current);
    };
  }, []);

  const handleDismissCeremony = useCallback(() => {
    if (activeCeremony) {
      const durationMs = Date.now() - ceremonyShownAtRef.current;
      void analytics.trackCeremonyDismissed(activeCeremony.type, durationMs);
    }
    setActiveCeremony(null);
    // Check for more ceremonies after a short delay (use ref to avoid stale closure)
    ceremonyTimerRef.current = setTimeout(() => {
      if (batchCountRef.current >= MAX_CEREMONIES_PER_BATCH) {
        // Cap reached — remaining will fire on next batch
        return;
      }
      const next = popCeremonyRef.current();
      if (next) {
        batchCountRef.current += 1;
        setActiveCeremony(next);
      }
    }, 300);
  }, [activeCeremony]);

  const processNext = useCallback(() => {
    const next = popCeremony();
    if (next) {
      batchCountRef.current += 1;
      setActiveCeremony(next);
    }
  }, [popCeremony]);

  const resetBatchCounter = useCallback(() => {
    batchCountRef.current = 0;
  }, []);

  return { activeCeremony, handleDismissCeremony, processNext, resetBatchCounter };
}
