/**
 * Round-trip + validation tests for the puzzle-snapshot persistence
 * module. Proves that an in-flight game state survives a
 * save → load cycle, that stale or terminal snapshots are discarded,
 * and that target mismatch triggers a clear.
 */

const storage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(async (k: string, v: string) => {
      storage.set(k, v);
    }),
    getItem: jest.fn(async (k: string) => storage.get(k) ?? null),
    removeItem: jest.fn(async (k: string) => {
      storage.delete(k);
    }),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import {
  loadPuzzleSnapshot,
  savePuzzleSnapshot,
  clearPuzzleSnapshot,
  shouldSaveSnapshot,
  snapshotMatchesTarget,
} from '../puzzleSnapshot';
import type { GameState, PuzzleSnapshot } from '../../types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base: GameState = {
    board: {
      grid: [[{ letter: 'A', id: 'a1' }]],
      words: [
        { word: 'A', positions: [{ row: 0, col: 0 }], direction: 'horizontal', found: false },
      ],
      config: { rows: 1, cols: 1, wordCount: 1, minWordLength: 1, maxWordLength: 1, difficulty: 'easy' },
    },
    selectedCells: [],
    selectionDirection: null,
    score: 0,
    moves: 0,
    maxMoves: 0,
    hintsLeft: 0,
    hintsUsed: 0,
    undosLeft: 0,
    history: [],
    status: 'playing',
    level: 3,
    mode: 'timePressure',
    timeRemaining: 60,
    perfectRun: true,
    gravityDirection: 'down',
    shrinkCount: 0,
    wordsUntilShrink: 2,
    wildcardCells: [],
    wildcardMode: false,
    spotlightActive: false,
    spotlightLetters: [],
    boosterCounts: { wildcardTile: 0, spotlight: 0, smartShuffle: 0 },
    lastInvalidTap: null,
    lastSelectionResetTap: null,
    solveSequence: [],
    puzzleStartTime: 1_700_000_000_000,
    scoreDoubler: false,
    boardFreezeActive: false,
    premiumHintUsed: false,
    boostersUsedThisPuzzle: [],
    activeComboType: null,
    comboWordsRemaining: 0,
    comboMultiplier: 1,
    captureReplay: false,
    completionId: null,
  };
  return { ...base, ...overrides };
}

beforeEach(() => {
  storage.clear();
});

describe('puzzleSnapshot', () => {
  it('round-trips an in-progress game state', async () => {
    const state = makeState({ moves: 3, score: 500 });

    await savePuzzleSnapshot(state, 1);
    const loaded = await loadPuzzleSnapshot();

    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(1);
    expect(loaded!.level).toBe(state.level);
    expect(loaded!.mode).toBe(state.mode);
    expect(loaded!.state.score).toBe(500);
    expect(loaded!.state.moves).toBe(3);
    expect(loaded!.state.timeRemaining).toBe(60);
  });

  it('does not save when status is terminal', async () => {
    const wonState = makeState({ status: 'won', score: 100 });

    await savePuzzleSnapshot(wonState, 1);
    const loaded = await loadPuzzleSnapshot();

    expect(loaded).toBeNull();
  });

  it('does not save pristine new-game state', async () => {
    const freshState = makeState(); // moves 0, score 0, no found words

    await savePuzzleSnapshot(freshState, 1);
    const loaded = await loadPuzzleSnapshot();

    expect(loaded).toBeNull();
  });

  it('discards stale-version snapshots on load', async () => {
    storage.set(
      'wordfall.puzzleSnapshot.v1',
      JSON.stringify({
        version: 99,
        savedAtMs: Date.now(),
        level: 1,
        mode: 'classic',
        chapterId: 1,
        state: makeState({ moves: 1 }),
      }),
    );

    const loaded = await loadPuzzleSnapshot();
    expect(loaded).toBeNull();
    expect(storage.has('wordfall.puzzleSnapshot.v1')).toBe(false);
  });

  it('discards terminal-state snapshots that leaked into storage', async () => {
    const wonSnapshot: PuzzleSnapshot = {
      version: 1,
      savedAtMs: Date.now(),
      level: 1,
      mode: 'classic',
      chapterId: 1,
      state: makeState({ status: 'won' }),
    };
    storage.set('wordfall.puzzleSnapshot.v1', JSON.stringify(wonSnapshot));

    const loaded = await loadPuzzleSnapshot();
    expect(loaded).toBeNull();
  });

  it('shouldSaveSnapshot reflects meaningful progress', () => {
    expect(shouldSaveSnapshot(makeState())).toBe(false);
    expect(shouldSaveSnapshot(makeState({ moves: 1 }))).toBe(true);
    expect(shouldSaveSnapshot(makeState({ hintsUsed: 1 }))).toBe(true);
    expect(shouldSaveSnapshot(makeState({ score: 50 }))).toBe(true);
    expect(shouldSaveSnapshot(makeState({ status: 'won', moves: 1 }))).toBe(false);
  });

  it('snapshotMatchesTarget gates hydrate correctly', () => {
    const snap: PuzzleSnapshot = {
      version: 1,
      savedAtMs: 0,
      level: 5,
      mode: 'classic',
      chapterId: 1,
      state: makeState({ level: 5, mode: 'classic' }),
    };
    expect(snapshotMatchesTarget(snap, 5, 'classic')).toBe(true);
    expect(snapshotMatchesTarget(snap, 6, 'classic')).toBe(false);
    expect(snapshotMatchesTarget(snap, 5, 'timePressure')).toBe(false);
  });

  it('clearPuzzleSnapshot removes the stored snapshot', async () => {
    await savePuzzleSnapshot(makeState({ moves: 1 }), 1);
    expect(storage.has('wordfall.puzzleSnapshot.v1')).toBe(true);

    await clearPuzzleSnapshot();
    expect(storage.has('wordfall.puzzleSnapshot.v1')).toBe(false);
  });

  it('recovers from corrupted JSON in storage', async () => {
    storage.set('wordfall.puzzleSnapshot.v1', '{not-valid-json');

    const loaded = await loadPuzzleSnapshot();
    expect(loaded).toBeNull();
    expect(storage.has('wordfall.puzzleSnapshot.v1')).toBe(false);
  });
});
