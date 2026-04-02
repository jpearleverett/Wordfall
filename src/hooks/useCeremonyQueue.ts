import { useCallback, useEffect, useRef, useState } from 'react';
import { CeremonyItem } from '../types';
import { analytics } from '../services/analytics';

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
}

/**
 * Manages the sequential processing of ceremony modals.
 * Ceremonies are popped from the PlayerContext queue one at a time.
 * When one is dismissed, the next fires after a 300ms delay.
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
  // Ref to always have the latest popCeremony in setTimeout callbacks
  const popCeremonyRef = useRef(popCeremony);
  popCeremonyRef.current = popCeremony;

  // Process pending ceremonies when loaded, unblocked, and queue has items.
  // Single effect prevents race condition where two effects both pop ceremonies.
  useEffect(() => {
    if (loaded && !isBlocked && !activeCeremony && pendingCeremonyCount > 0) {
      const next = popCeremony();
      if (next) setActiveCeremony(next);
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
      const next = popCeremonyRef.current();
      if (next) setActiveCeremony(next);
    }, 300);
  }, [activeCeremony]);

  const processNext = useCallback(() => {
    const next = popCeremony();
    if (next) setActiveCeremony(next);
  }, [popCeremony]);

  return { activeCeremony, handleDismissCeremony, processNext };
}
