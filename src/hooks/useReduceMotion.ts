/**
 * Reduce-motion live subscription.
 *
 * Android 12+ and iOS both expose a device-level "Reduce Motion" /
 * "Remove Animations" accessibility setting. Previously only
 * PuzzleComplete's auto-advance delay respected it, which a Play Store
 * accessibility review would (correctly) flag as partial compliance —
 * confetti, gravity trails, ceremony spring-ins, mystery-wheel spin,
 * wing stagger all bypassed the flag.
 *
 * This hook centralises the AccessibilityInfo listener so every
 * animation site can degrade gracefully with one `const reduceMotion
 * = useReduceMotion();` call. Consumers skip the animation entirely
 * (jump to final state) rather than running a shorter one — a
 * vestibular-sensitive player benefits more from "no confetti" than
 * from "less confetti".
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (!cancelled) setEnabled(value);
      })
      .catch(() => {
        // Query failed (unusual, but be resilient). Default to "motion
        // enabled" so we don't accidentally strip animations from
        // players who haven't requested reduced motion.
        if (!cancelled) setEnabled(false);
      });

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (value: boolean) => {
        setEnabled(value);
      },
    );

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return enabled;
}
