import {
  getGameRouteMotion,
  getStackMotionOptions,
  getTabAnimation,
} from '../motionOptions';

test('reduced motion disables spatial stack and tab transitions', () => {
  expect(getStackMotionOptions(true).animation).toBe('none');
  expect(getTabAnimation(true)).toBe('none');
});

test('normal motion retains the Wordfall stack spring and tab shift', () => {
  const options = getStackMotionOptions(false);
  expect(options.animation).not.toBe('none');
  expect(options.cardStyleInterpolator).toBeDefined();
  expect(options.transitionSpec?.open.animation).toBe('spring');
  expect(getTabAnimation(false)).toBe('shift');
});

test('same-route Game replacement uses fade only for normal motion', () => {
  expect(getGameRouteMotion(true, true).animation).toBe('none');
  expect(getGameRouteMotion(true, false).cardStyleInterpolator).toBeDefined();
  expect(getGameRouteMotion(false, false)).toEqual({});
});
