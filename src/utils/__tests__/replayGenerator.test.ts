import {
  generateReplayData,
  generateReplayText,
  generateReplayEmoji,
} from '../replayGenerator';
import { SolveStep } from '../../types';

function makeStep(overrides: Partial<SolveStep> = {}): SolveStep {
  return {
    wordFound: 'CAT',
    cellPositions: [[0, 0], [0, 1], [0, 2]],
    gridStateBefore: [
      ['C', 'A', 'T'],
      ['D', 'O', 'G'],
    ],
    gridStateAfter: [
      ['', '', ''],
      ['D', 'O', 'G'],
    ],
    score: 100,
    timestamp: 5000,
    ...overrides,
  };
}

function makeSteps(): SolveStep[] {
  return [
    makeStep({
      wordFound: 'CAT',
      cellPositions: [[0, 0], [0, 1], [0, 2]],
      gridStateBefore: [
        ['C', 'A', 'T'],
        ['D', 'O', 'G'],
      ],
      gridStateAfter: [
        ['', '', ''],
        ['D', 'O', 'G'],
      ],
      timestamp: 3000,
    }),
    makeStep({
      wordFound: 'DOG',
      cellPositions: [[1, 0], [1, 1], [1, 2]],
      gridStateBefore: [
        ['', '', ''],
        ['D', 'O', 'G'],
      ],
      gridStateAfter: [
        ['', '', ''],
        ['', '', ''],
      ],
      timestamp: 7000,
    }),
  ];
}

// ── generateReplayData ───────────────────────────────────────────────────────

describe('generateReplayData', () => {
  it('returns a ReplayData with correct fields', () => {
    const steps = makeSteps();
    const data = generateReplayData(steps, 10, 'classic', 500, 3, true);
    expect(data.level).toBe(10);
    expect(data.mode).toBe('classic');
    expect(data.steps).toBe(steps);
    expect(data.totalScore).toBe(500);
    expect(data.stars).toBe(3);
    expect(data.perfectRun).toBe(true);
  });

  it('sets totalTime from last step timestamp', () => {
    const steps = makeSteps();
    const data = generateReplayData(steps, 5, 'daily', 300, 2, false);
    expect(data.totalTime).toBe(7000);
  });

  it('returns totalTime 0 for empty steps', () => {
    const data = generateReplayData([], 1, 'classic', 0, 0, false);
    expect(data.totalTime).toBe(0);
    expect(data.steps).toEqual([]);
  });
});

// ── generateReplayText ───────────────────────────────────────────────────────

describe('generateReplayText', () => {
  it('includes level number for non-daily', () => {
    const text = generateReplayText(makeSteps(), 10, 3, 500, false);
    expect(text).toContain('Level 10');
  });

  it('includes Daily for daily mode', () => {
    const text = generateReplayText(makeSteps(), 10, 3, 500, true);
    expect(text).toContain('Daily');
    expect(text).not.toContain('Level 10');
  });

  it('includes the score', () => {
    const text = generateReplayText(makeSteps(), 5, 2, 1250, false);
    expect(text).toContain('1,250');
  });

  it('includes star emojis', () => {
    const text = generateReplayText(makeSteps(), 5, 3, 500, false);
    expect(text).toContain('\u2B50');
  });

  it('includes step numbers and words', () => {
    const text = generateReplayText(makeSteps(), 5, 2, 500, false);
    expect(text).toContain('CAT');
    expect(text).toContain('DOG');
  });

  it('includes #Wordfall hashtag', () => {
    const text = generateReplayText(makeSteps(), 5, 2, 500, false);
    expect(text).toContain('#Wordfall');
  });

  it('includes move count', () => {
    const text = generateReplayText(makeSteps(), 5, 2, 500, false);
    expect(text).toContain('2 moves');
  });

  it('handles empty steps gracefully', () => {
    const text = generateReplayText([], 1, 0, 0, false);
    expect(text).toContain('Level 1');
    expect(text).toContain('#Wordfall');
    expect(text).toContain('0 moves');
  });

  it('uses singular "move" for 1 step', () => {
    const text = generateReplayText([makeStep()], 1, 1, 100, false);
    expect(text).toContain('1 move!');
    expect(text).not.toContain('1 moves');
  });
});

// ── generateReplayEmoji ──────────────────────────────────────────────────────

describe('generateReplayEmoji', () => {
  it('includes level for non-daily', () => {
    const emoji = generateReplayEmoji(makeSteps(), 10, 3, 500, false);
    expect(emoji).toContain('Level 10');
  });

  it('includes Daily for daily mode', () => {
    const emoji = generateReplayEmoji(makeSteps(), 10, 3, 500, true);
    expect(emoji).toContain('Daily');
  });

  it('includes star characters (filled and empty)', () => {
    const emoji = generateReplayEmoji(makeSteps(), 5, 2, 500, false);
    // 2 filled stars + 1 empty star
    expect(emoji).toContain('\u2605'); // filled
    expect(emoji).toContain('\u2606'); // empty
  });

  it('includes green squares for selected cells', () => {
    const emoji = generateReplayEmoji(makeSteps(), 5, 2, 500, false);
    expect(emoji).toContain('\uD83D\uDFE9'); // green square
  });

  it('includes white squares for non-selected filled cells', () => {
    const emoji = generateReplayEmoji(makeSteps(), 5, 2, 500, false);
    expect(emoji).toContain('\u2B1C'); // white square
  });

  it('includes black squares for empty cells', () => {
    // The second step has null cells in the first row
    const emoji = generateReplayEmoji(makeSteps(), 5, 2, 500, false);
    expect(emoji).toContain('\u2B1B'); // black square
  });

  it('includes #Wordfall hashtag', () => {
    const emoji = generateReplayEmoji(makeSteps(), 5, 2, 500, false);
    expect(emoji).toContain('#Wordfall');
  });

  it('includes the score', () => {
    const emoji = generateReplayEmoji(makeSteps(), 5, 2, 1250, false);
    expect(emoji).toContain('1,250');
  });

  it('handles empty steps gracefully', () => {
    const emoji = generateReplayEmoji([], 1, 0, 0, false);
    expect(emoji).toContain('Level 1');
    expect(emoji).toContain('#Wordfall');
  });
});
