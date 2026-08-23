import { isLastWordTensionActive } from '../gameMotion';

test.each([
  [2, 1, 'playing', false],
  [3, 1, 'playing', false],
  [4, 1, 'playing', true],
  [8, 2, 'playing', false],
  [8, 1, 'complete', false],
] as const)(
  'tension eligibility total=%s remaining=%s status=%s',
  (total, remaining, status, expected) => {
    expect(isLastWordTensionActive(total, remaining, status)).toBe(expected);
  },
);
