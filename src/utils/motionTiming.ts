import { Animated, Easing } from 'react-native';

type EasingFn = (value: number) => number;

/**
 * A native-driven timing that holds still for `delayMs` before it starts
 * moving — without touching the JS thread to do it.
 *
 * `Animated.delay(ms)`, and the `delay` field of a timing config, are the same
 * thing under the hood: `TimingAnimation.start` schedules the animation with
 * `setTimeout(start, this._delay)` on the JS thread, and the native animation
 * config it sends over has no delay of its own. So a staggered burst of N
 * elements is N JS timers plus, if the delay is expressed as
 * `Animated.sequence([Animated.delay(d), timing])`, N native -> JS -> native
 * round trips to advance between the two segments.
 *
 * That is a bad trade for anything staggered across a word clear: the delays
 * all land in the exact window where the JS thread is busiest (spawning
 * particles, playing sound, logging analytics, and a beat later running the
 * dead-end solver), so the stagger that was supposed to read as a wave arrives
 * bunched and late.
 *
 * RN compiles a timing's easing into a frames array
 * (`frames[i] = easing(i / numFrames)`) that the native driver plays back on
 * its own. Extending the duration by the delay and flattening the leading
 * portion of the curve to zero produces exactly the same motion, entirely
 * natively, in one animation.
 *
 * **PRECONDITION: the animation must be INVISIBLE at progress zero.**
 *
 * The driver is pinned at exactly 0 for the whole lead-in, so anything driven
 * by it is frozen in its zero state, on screen, for that long. For a particle
 * whose opacity starts at 0 that is genuinely "not there yet". For anything
 * already visible at zero — a fade-OUT, a stamp, a tile standing in for one
 * that was just removed — it is the opposite of a delay: instead of arriving
 * late it arrives immediately and then stands still, which reads as a stuck
 * duplicate of whatever it is covering.
 *
 * If the thing is visible at zero, stagger its DURATION instead and let every
 * instance start on the same frame.
 */
export function delayedTiming(
  value: Animated.Value,
  config: {
    toValue: number;
    delay: number;
    duration: number;
    easing?: EasingFn;
  },
): Animated.CompositeAnimation {
  // RN's own Animated.timing default, so swapping a call over to this helper
  // never silently changes its curve.
  const { toValue, delay, duration, easing = Easing.inOut(Easing.ease) } = config;
  const total = delay + duration;
  const holdFraction = total > 0 ? delay / total : 0;
  return Animated.timing(value, {
    toValue,
    duration: total,
    easing:
      holdFraction <= 0
        ? easing
        : (t: number) =>
            t <= holdFraction ? 0 : easing((t - holdFraction) / (1 - holdFraction)),
    useNativeDriver: true,
  });
}
