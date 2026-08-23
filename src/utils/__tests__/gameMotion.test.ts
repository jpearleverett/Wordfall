import {
  getPuzzleCompleteMotionPolicy,
  getWordBankMotionPolicy,
  isLastWordTensionActive,
} from '../gameMotion';

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

describe('WordBank motion policy', () => {
  test.each([
    ['two-word board', 2, 'playing'],
    ['three-word board', 3, 'playing'],
    ['failed board', 6, 'failed'],
    ['timed-out board', 6, 'timeout'],
  ] as const)('%s disables every final-word emphasis channel', (_label, total, status) => {
    const tensionActive = isLastWordTensionActive(total, 1, status);

    expect(getWordBankMotionPolicy(tensionActive, false)).toMatchObject({
      showLastWordEmphasis: false,
      animateLastWordLoop: false,
      animateLastWordOvershoot: false,
    });
  });

  test('eligible normal motion enables all final-word emphasis channels', () => {
    const policy = getWordBankMotionPolicy(true, false);

    expect(policy).toMatchObject({
      showLastWordEmphasis: true,
      animateLastWordLoop: true,
      animateLastWordOvershoot: true,
      animateTrace: true,
      animateFoundChip: true,
    });
  });

  test('reduced motion keeps static tension meaning and settles trace motion', () => {
    const policy = getWordBankMotionPolicy(true, true);

    expect(policy).toMatchObject({
      showLastWordEmphasis: true,
      animateLastWordLoop: false,
      animateLastWordOvershoot: false,
      animateTrace: false,
      animateFoundChip: false,
      settledTraceValue: 1,
    });
  });
});

describe('PuzzleComplete motion policy', () => {
  test('reduced or unresolved motion starts every semantic surface settled', () => {
    expect(getPuzzleCompleteMotionPolicy(true, 4321)).toEqual({
      animateDecorations: false,
      animateEntrance: false,
      animateStars: false,
      animateScore: false,
      state: {
        overlayOpacity: 1,
        cardTranslateY: 0,
        ribbonProgress: 1,
        statsProgress: 1,
        actionsProgress: 1,
        glitchProgress: 0,
        cardScale: 1,
        cardOpacity: 1,
        flawlessBadgeScale: 1,
        flawlessBadgeOpacity: 1,
        starsRevealed: true,
        displayedScore: 4321,
      },
    });
  });

  test('normal motion preserves the existing choreography start state', () => {
    expect(getPuzzleCompleteMotionPolicy(false, 4321)).toEqual({
      animateDecorations: true,
      animateEntrance: true,
      animateStars: true,
      animateScore: true,
      state: {
        overlayOpacity: 0,
        cardTranslateY: 30,
        ribbonProgress: 0,
        statsProgress: 0,
        actionsProgress: 0,
        glitchProgress: 0,
        cardScale: 0.93,
        cardOpacity: 0,
        flawlessBadgeScale: 0.6,
        flawlessBadgeOpacity: 0,
        starsRevealed: false,
        displayedScore: 0,
      },
    });
  });
});
