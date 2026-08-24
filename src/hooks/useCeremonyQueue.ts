import { useCallback, useEffect, useRef, useState } from 'react';
import { CeremonyItem } from '../types';
import { analytics } from '../services/analytics';
import { soundManager } from '../services/sound';
import { requestActiveCeremonyDismiss } from './useCeremonyTransition';

/** Maximum ceremonies to show per puzzle completion to prevent modal fatigue */
const MAX_CEREMONIES_PER_BATCH = 2;

/**
 * Module-level "a ceremony modal is on screen right now" flag, for consumers
 * that can't reach App's ceremony state (e.g. PuzzleComplete's auto-advance
 * timer, which must not navigate to the next level UNDERNEATH an active
 * first_win modal). Read-only outside this hook; maintained by the effect
 * below. Polling a module flag beats threading a prop through GameScreen for
 * a value only checked at one instant.
 */
let ceremonyVisible = false;
export function isCeremonyVisible(): boolean {
  return ceremonyVisible;
}

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
  useEffect(() => {
    ceremonyVisible = activeCeremony !== null;
    return () => {
      ceremonyVisible = false;
    };
  }, [activeCeremony]);
  // Bumped by resetBatchCounter so the processing effect re-runs. The reset
  // used to only zero a ref — which none of the effect's dependencies
  // observe — so ceremonies deferred by the batch cap stayed stuck until
  // something ELSE happened to change the queue length. The player earned
  // them, then never saw them.
  const [resumeTick, setResumeTick] = useState(0);
  const ceremonyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ceremonyShownAtRef = useRef<number>(0);
  // Track ceremonies shown in the current batch to enforce cap
  const batchCountRef = useRef<number>(0);
  // Track previous pending count to detect new batches (new puzzle completion)
  const prevPendingCountRef = useRef<number>(0);

  // Auto-reset batch counter when new ceremonies are queued (new puzzle completed).
  // This ensures the cap applies per-puzzle, not across consecutive puzzles.
  useEffect(() => {
    if (pendingCeremonyCount > prevPendingCountRef.current && prevPendingCountRef.current === 0) {
      batchCountRef.current = 0;
    }
    prevPendingCountRef.current = pendingCeremonyCount;
  }, [pendingCeremonyCount]);

  // Dismissal starts a short breather before the next ceremony fires; the
  // processing effect respects it (see below) and the dismiss handler
  // schedules a resumeTick bump for when it elapses.
  const cooldownUntilRef = useRef<number>(0);

  // Process pending ceremonies when loaded, unblocked, and queue has items.
  // This effect is the ONLY automatic advance path. It used to share
  // advancement with a 300ms setTimeout inside handleDismissCeremony; the
  // effect fired first (activeCeremony -> null re-runs it immediately), then
  // the timer popped a SECOND ceremony 300ms later and replaced the first —
  // that ceremony's pop-time grant was paid but its celebration never
  // rendered. Single ownership makes the documented breather real and makes
  // a dropped celebration impossible.
  useEffect(() => {
    if (loaded && !isBlocked && !activeCeremony && pendingCeremonyCount > 0) {
      if (batchCountRef.current >= MAX_CEREMONIES_PER_BATCH) {
        // Cap reached — defer remaining ceremonies to next batch (HomeScreen return)
        return;
      }
      if (Date.now() < cooldownUntilRef.current) {
        // Mid-breather: the dismiss handler has already scheduled a
        // resumeTick bump for when the breather ends.
        return;
      }
      const next = popCeremony();
      if (next) {
        batchCountRef.current += 1;
        setActiveCeremony(next);
      }
    }
  }, [loaded, pendingCeremonyCount, activeCeremony, isBlocked, popCeremony, resumeTick]);

  // Track when a ceremony is displayed + set auto-dismiss timer
  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to latest handleDismissCeremony for auto-dismiss callback
  const handleDismissRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (activeCeremony) {
      ceremonyShownAtRef.current = Date.now();
      void analytics.trackCeremonyShown(activeCeremony.type);

      // Duck BGM while a ceremony is on-screen so fanfare cuts through. Auto-
      // dismissal clears the duck via its own timer; manual dismissal resets
      // on handleDismiss below.
      const duckWindow = activeCeremony.autoDismissMs ?? 2500;
      soundManager.duckMusicFor(duckWindow, 0.35);

      // Ceremony-specific fanfare. Add cases here when more ceremony types
      // get dedicated audio; default is no extra sound beyond the BGM duck.
      if (activeCeremony.type === 'flawless_streak_milestone') {
        void soundManager.playSound('flawlessMilestone');
      }

      // Auto-dismiss Tier 2 ceremonies after their specified duration.
      // Route through the mounted ceremony's graceful exit (shared
      // ceremony-transition fade) so the card doesn't hard-cut off screen;
      // ceremonies not on the contract fall back to the direct dismiss.
      if (activeCeremony.autoDismissMs) {
        if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = setTimeout(() => {
          requestActiveCeremonyDismiss(() => handleDismissRef.current());
        }, activeCeremony.autoDismissMs);
      }
    }
    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
    };
  }, [activeCeremony]);

  // Cleanup ceremony timer on unmount
  useEffect(() => {
    return () => {
      if (ceremonyTimerRef.current) clearTimeout(ceremonyTimerRef.current);
    };
  }, []);

  const handleDismissCeremony = useCallback(() => {
    // Cancel any pending auto-dismiss timer (player tapped to dismiss early)
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    if (activeCeremony) {
      const durationMs = Date.now() - ceremonyShownAtRef.current;
      void analytics.trackCeremonyDismissed(activeCeremony.type, durationMs);
    }
    setActiveCeremony(null);
    // Breather before the next ceremony: the processing effect skips pops
    // until this elapses, and the resumeTick bump re-runs it right after.
    // The effect is the only advance path — popping here as well raced it
    // and could eat a celebration (see the effect's comment).
    cooldownUntilRef.current = Date.now() + 300;
    if (ceremonyTimerRef.current) clearTimeout(ceremonyTimerRef.current);
    ceremonyTimerRef.current = setTimeout(() => {
      setResumeTick((t) => t + 1);
    }, 300);
  }, [activeCeremony]);

  // Keep ref in sync so auto-dismiss timer uses latest callback
  handleDismissRef.current = handleDismissCeremony;

  const processNext = useCallback(() => {
    const next = popCeremony();
    if (next) {
      batchCountRef.current += 1;
      setActiveCeremony(next);
    }
  }, [popCeremony]);

  const resetBatchCounter = useCallback(() => {
    batchCountRef.current = 0;
    setResumeTick((t) => t + 1);
  }, []);

  return { activeCeremony, handleDismissCeremony, processNext, resetBatchCounter };
}
