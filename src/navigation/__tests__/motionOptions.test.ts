import {
  getGameRouteMotion,
  getStackMotionOptions,
  getTabAnimation,
  getTabIndicatorPlan,
  getTabVisibilityPlan,
  shouldResetGameRouteMarker,
  shouldUnmountTabBar,
} from '../motionOptions';

test('reduced motion disables spatial stack and tab transitions', () => {
  expect(getStackMotionOptions(true).animation).toBe('none');
  expect(getTabAnimation(true)).toBe('none');
});

test('normal motion retains the Wordfall stack spring and tab shift', () => {
  const options = getStackMotionOptions(false);
  expect(options.animation).not.toBe('none');
  expect(options.cardStyleInterpolator).toBeDefined();
  expect(options.headerShown).toBe(false);
  expect(options.cardStyle).toEqual({ backgroundColor: '#0a0015' });
  expect(options.freezeOnBlur).toBe(true);
  expect(options.transitionSpec?.open).toEqual({
    animation: 'spring',
    config: {
      stiffness: 120,
      damping: 20,
      mass: 1,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    },
  });
  const close = options.transitionSpec?.close;
  expect(close?.animation).toBe('timing');
  if (!close || close.animation !== 'timing') throw new Error('Expected timing close spec');
  expect(close.config.duration).toBe(320);
  const closeEasing = close.config.easing;
  expect(closeEasing?.(0)).toBe(0);
  expect(closeEasing?.(0.5)).toBe(0.875);
  expect(closeEasing?.(1)).toBe(1);
  expect(getTabAnimation(false)).toBe('shift');
});

test('same-route Game replacement uses fade only for normal motion', () => {
  expect(getGameRouteMotion(true, true).animation).toBe('none');
  const fade = getGameRouteMotion(true, false);
  expect(fade.cardStyleInterpolator).toBeDefined();
  expect(fade.transitionSpec).toEqual({
    open: { animation: 'timing', config: { duration: 180 } },
    close: { animation: 'timing', config: { duration: 180 } },
  });
  expect(getGameRouteMotion(false, false)).toEqual({});
});

test('tab indicator begins at its active target and only springs for normal motion', () => {
  expect(getTabIndicatorPlan(100, 2, true)).toEqual({
    target: 240,
    animate: false,
  });
  expect(getTabIndicatorPlan(100, 1, false)).toEqual({
    target: 140,
    animate: true,
  });
});

test('tab visibility plans preserve exits and settle reduced motion immediately', () => {
  expect(getTabVisibilityPlan(true, false)).toEqual({
    target: 0,
    duration: 140,
    ensureMounted: false,
    unmountOnFinish: true,
    pointerEvents: 'none',
  });
  expect(getTabVisibilityPlan(false, false)).toEqual({
    target: 1,
    duration: 180,
    ensureMounted: true,
    unmountOnFinish: false,
    pointerEvents: 'auto',
  });
  expect(getTabVisibilityPlan(true, true)).toEqual({
    target: 0,
    duration: 0,
    ensureMounted: false,
    unmountOnFinish: true,
    pointerEvents: 'none',
  });
  expect(getTabVisibilityPlan(false, true)).toEqual({
    target: 1,
    duration: 0,
    ensureMounted: true,
    unmountOnFinish: false,
    pointerEvents: 'auto',
  });
});

test('a stale hide callback cannot unmount a newly shown tab bar', () => {
  expect(shouldUnmountTabBar(true, true, false)).toBe(false);
  expect(shouldUnmountTabBar(false, true, true)).toBe(false);
  expect(shouldUnmountTabBar(true, true, true)).toBe(true);
});

test('replacement marker resets only after an opening transition and restores back motion', () => {
  expect(shouldResetGameRouteMarker(true, false)).toBe(true);
  expect(shouldResetGameRouteMarker(true, true)).toBe(false);
  expect(shouldResetGameRouteMarker(false, false)).toBe(false);
  expect(getGameRouteMotion(false, false)).toEqual({});
});
