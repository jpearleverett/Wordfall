/**
 * One ceremony transition policy for every full-screen ceremony/offer modal.
 *
 * Before this hook each ceremony owned a private overlay fade + card scale,
 * its own dismiss wiring, and its own (usually missing) reduced-motion
 * handling — nine slightly different entrances, none interrupt-safe. The
 * shared policy gives every ceremony:
 *
 * - one entrance (overlay fade + card scale spring) started on mount
 * - one short exit, faster than the entrance, then the real dismiss
 * - instant settle + instant dismiss under reduced motion
 * - `animateDecorations` for gating confetti/sparkle/pulse layers
 * - stop-on-unmount for both composites (an interrupted exit never calls
 *   a stale onDismiss — see the `finished` guard)
 *
 * The motion plan is pure and unit-tested (ceremonyTransition.test.ts).
 * The hook applies it with legacy RN Animated on the native driver
 * (transform/opacity only) rather than Reanimated: ceremonies keep
 * Reanimated for their inner decorations, but the shared root transition
 * lives on `Animated.View` from react-native so this module stays
 * importable under the jest react-native mock (there is no reanimated
 * mapping) and the entrance/exit can be stopped synchronously on unmount.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
import { useReduceMotion } from './useReduceMotion';

/**
 * Shared z-index for ceremony overlay roots so layer order is deterministic.
 * 200 preserves the historical ordering: ceremonies sit above all screen
 * content, below the transient BoardGen (9999) / NotSynced (9998) strips.
 */
export const CEREMONY_LAYER = 200;

export interface CeremonyMotionPlan {
  initialOpacity: number;
  initialScale: number;
  enterDurationMs: number;
  exitDurationMs: number;
  animateDecorations: boolean;
}

export function getCeremonyMotionPlan(reduceMotion: boolean): CeremonyMotionPlan {
  return reduceMotion
    ? {
        initialOpacity: 1,
        initialScale: 1,
        enterDurationMs: 0,
        exitDurationMs: 0,
        animateDecorations: false,
      }
    : {
        initialOpacity: 0,
        initialScale: 0.94,
        enterDurationMs: 260,
        exitDurationMs: 160,
        animateDecorations: true,
      };
}

export interface CeremonyTransition {
  reduceMotion: boolean;
  /** Gate confetti / sparkles / pulse loops on this, not on reduceMotion
   *  directly, so the decoration policy stays in one place. */
  animateDecorations: boolean;
  /** Spread onto the full-screen backdrop `Animated.View` (react-native). */
  overlayStyle: { opacity: Animated.Value };
  /** Spread onto the ceremony card `Animated.View` (react-native). */
  cardStyle: { transform: Array<{ scale: Animated.Value }> };
  /** Fade/scale out (or instantly under reduced motion), then dismiss. */
  requestDismiss: () => void;
}

export function useCeremonyTransition(onDismiss: () => void): CeremonyTransition {
  const reduceMotion = useReduceMotion();
  // The plan at mount decides initial values; live preference changes apply
  // to the NEXT ceremony rather than snapping one already on screen.
  const planRef = useRef<CeremonyMotionPlan | null>(null);
  if (planRef.current === null) {
    planRef.current = getCeremonyMotionPlan(reduceMotion);
  }
  const plan = planRef.current;

  const overlayOpacity = useRef(new Animated.Value(plan.initialOpacity)).current;
  const cardScale = useRef(new Animated.Value(plan.initialScale)).current;
  const dismissing = useRef(false);
  const runningExit = useRef<Animated.CompositeAnimation | null>(null);

  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (plan.enterDurationMs === 0) return undefined; // mounted settled
    const entrance = Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: plan.enterDurationMs,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]);
    entrance.start();
    return () => {
      entrance.stop();
      runningExit.current?.stop();
      runningExit.current = null;
    };
    // Mount-only: the plan is latched for this ceremony's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestDismiss = useCallback(() => {
    if (dismissing.current) return;
    dismissing.current = true;
    if (plan.exitDurationMs === 0) {
      onDismissRef.current();
      return;
    }
    const exit = Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: plan.exitDurationMs,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.96,
        duration: plan.exitDurationMs,
        useNativeDriver: true,
      }),
    ]);
    runningExit.current = exit;
    exit.start(({ finished }) => {
      runningExit.current = null;
      if (finished) {
        onDismissRef.current();
      } else {
        // Interrupted (unmount or a competing stop): never dismiss a
        // successor ceremony on a stale callback.
        dismissing.current = false;
      }
    });
    // plan is latched per-mount; overlayOpacity/cardScale are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.exitDurationMs]);

  const overlayStyle = useMemo(() => ({ opacity: overlayOpacity }), [overlayOpacity]);
  const cardStyle = useMemo(
    () => ({ transform: [{ scale: cardScale }] }),
    [cardScale],
  );

  return {
    reduceMotion,
    animateDecorations: plan.animateDecorations,
    overlayStyle,
    cardStyle,
    requestDismiss,
  };
}
