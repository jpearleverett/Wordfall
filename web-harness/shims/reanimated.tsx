/**
 * Harness shim for react-native-reanimated.
 *
 * Provides just enough of the API surface for the components we render
 * in the harness. Animations are flattened to static initial values —
 * we snapshot the post-settled frame, not the mid-flight one, which is
 * what we want for visual regression anyway.
 *
 * Swap in real Reanimated later by running `npm run harness:build` with
 * the Babel plugin enabled; this file is the lightweight default.
 */
import * as React from 'react';
import { Animated, View } from 'react-native';

// ── Shared values ──────────────────────────────────────────────────────
// In real Reanimated, `sharedValue.value = x` mutates a UI-thread ref
// with zero React re-render cost. The harness needs re-renders for the
// snapshot to reflect the settled state, so we back the "value" setter
// with a useState bump — the getter stays a plain property read.
export function useSharedValue<T>(initial: T): { value: T } {
  const [, bump] = React.useState(0);
  const ref = React.useRef<{ value: T }>(null as any);
  if (ref.current === null) {
    const box = { _v: initial };
    ref.current = Object.defineProperty(
      {} as { value: T },
      'value',
      {
        get: () => box._v,
        set: (v: T) => {
          box._v = v;
          bump((n) => n + 1);
        },
        enumerable: true,
      },
    );
  }
  return ref.current;
}

// ── Animation drivers — all return the terminal value synchronously ──
// The harness captures a still frame, so final values are what matter.
export function withTiming<T>(
  target: T,
  _config?: unknown,
  cb?: (finished: boolean) => void,
): T {
  if (cb) cb(true);
  return target;
}
export function withSpring<T>(
  target: T,
  _config?: unknown,
  cb?: (finished: boolean) => void,
): T {
  if (cb) cb(true);
  return target;
}
export function withSequence<T>(...steps: T[]): T {
  // Return the last step, which is where the sequence settles.
  return steps[steps.length - 1];
}
export function withDelay<T>(_ms: number, value: T): T {
  return value;
}
export function withRepeat<T>(value: T, _n?: number, _reverse?: boolean): T {
  return value;
}

// ── useAnimatedStyle: evaluate the worklet once, apply the result ─────
// React warns if we call a hook conditionally, so we always run the
// factory — it accesses shared-values by .value, which are plain refs.
export function useAnimatedStyle<T extends Record<string, unknown>>(
  fn: () => T,
  _deps?: unknown[],
): T {
  return fn();
}

export function interpolate(
  input: number,
  inputRange: number[],
  outputRange: number[],
): number {
  // Linear interpolation — good enough for the static frame.
  for (let i = 0; i < inputRange.length - 1; i++) {
    const a = inputRange[i]!;
    const b = inputRange[i + 1]!;
    if (input >= a && input <= b) {
      const t = (input - a) / (b - a || 1);
      const oa = outputRange[i]!;
      const ob = outputRange[i + 1]!;
      return oa + (ob - oa) * t;
    }
  }
  if (input <= inputRange[0]!) return outputRange[0]!;
  return outputRange[outputRange.length - 1]!;
}

// ── Animated.View / Animated.Text bridged to plain react-native ──────
const AnimatedView = Animated.View;
const AnimatedText = Animated.Text;

export default {
  View: AnimatedView,
  Text: AnimatedText,
  createAnimatedComponent: <P extends object>(Component: React.ComponentType<P>) =>
    Animated.createAnimatedComponent(Component as any),
};

export const Easing = {
  linear: (t: number) => t,
  ease: (t: number) => t,
  out: () => (t: number) => t,
  in: () => (t: number) => t,
  inOut: () => (t: number) => t,
  cubic: (t: number) => t * t * t,
  bezier: () => (t: number) => t,
};

export function cancelAnimation<T>(_sv: { value: T }): void {}
export function runOnJS<T extends (...a: any[]) => any>(fn: T): T {
  return fn;
}
export function runOnUI<T extends (...a: any[]) => any>(fn: T): T {
  return fn;
}
