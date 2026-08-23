export const Dimensions = {
  get: (_dim: string) => ({ width: 375, height: 812 }),
  addEventListener: () => ({ remove: () => {} }),
};

type ReduceMotionListener = (enabled: boolean) => void;

let reduceMotionEnabled = false;
const reduceMotionListeners = new Set<ReduceMotionListener>();

export function __setReduceMotionEnabled(enabled: boolean): void {
  reduceMotionEnabled = enabled;
  reduceMotionListeners.forEach((listener) => listener(enabled));
}

export const AccessibilityInfo = {
  isReduceMotionEnabled: () => Promise.resolve(reduceMotionEnabled),
  addEventListener: (
    event: string,
    listener: ReduceMotionListener,
  ) => {
    if (event === 'reduceMotionChanged') {
      reduceMotionListeners.add(listener);
    }
    return {
      remove: () => {
        reduceMotionListeners.delete(listener);
      },
    };
  },
  announceForAccessibility: (_message: string) => {},
};

export const Platform = {
  OS: 'ios',
  select: (obj: any) => obj.ios ?? obj.default,
};

export const StyleSheet = {
  create: (styles: any) => styles,
  flatten: (style: any) => style,
};

export const LayoutAnimation = {
  configureNext: () => {},
  Presets: { easeInEaseOut: {} },
};

export const Animated = {
  Value: class {
    _value: number;
    constructor(v: number) { this._value = v; }
    setValue(v: number) { this._value = v; }
    interpolate() { return this; }
  },
  timing: () => ({ start: (cb?: () => void) => cb?.() }),
  spring: () => ({ start: (cb?: () => void) => cb?.() }),
  sequence: () => ({ start: (cb?: () => void) => cb?.() }),
  parallel: () => ({ start: (cb?: () => void) => cb?.() }),
  View: 'Animated.View',
  Text: 'Animated.Text',
};

export default {
  Dimensions,
  AccessibilityInfo,
  Platform,
  StyleSheet,
  LayoutAnimation,
  Animated,
};
