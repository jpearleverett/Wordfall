export const Dimensions = {
  get: (_dim: string) => ({ width: 375, height: 812 }),
  addEventListener: () => ({ remove: () => {} }),
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
  Platform,
  StyleSheet,
  LayoutAnimation,
  Animated,
};
