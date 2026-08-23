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
 * This hook reads the central motion-preference store so every
 * animation site can degrade gracefully with one `const reduceMotion
 * = useReduceMotion();` call. Consumers skip the animation entirely
 * (jump to final state) rather than running a shorter one — a
 * vestibular-sensitive player benefits more from "no confetti" than
 * from "less confetti".
 */
import { useMotionPreference } from '../services/motionPreference';

export function useReduceMotion(): boolean {
  return useMotionPreference().reduceMotion;
}
