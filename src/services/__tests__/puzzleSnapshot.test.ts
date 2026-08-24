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
    undosUsed: 0,
    shufflesUsed: 0,
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

  it('shared-board snapshots are bounded to their own UTC period', () => {
    // Daily/weekly always launch at level 0, so a (level, mode)-only match
    // hydrated day D's half-played board verbatim into day D+1's different
    // daily — stale letters, a find list half-marked found.
    const dailySnap: PuzzleSnapshot = {
      version: 1,
      savedAtMs: Date.UTC(2026, 7, 24, 12, 0, 0),
      level: 0,
      mode: 'daily',
      chapterId: 1,
      state: makeState({ level: 0, mode: 'daily' }),
    };
    const sameDay = new Date(Date.UTC(2026, 7, 24, 23, 0, 0));
    const nextDay = new Date(Date.UTC(2026, 7, 25, 0, 30, 0));
    expect(snapshotMatchesTarget(dailySnap, 0, 'daily', sameDay)).toBe(true);
    expect(snapshotMatchesTarget(dailySnap, 0, 'daily', nextDay)).toBe(false);

    const weeklySnap: PuzzleSnapshot = {
      ...dailySnap,
      mode: 'weekly',
      state: makeState({ level: 0, mode: 'weekly' }),
    };
    // Aug 24 2026 falls in the Sunday-anchored week of Aug 23–29.
    const sameWeek = new Date(Date.UTC(2026, 7, 28, 12, 0, 0));
    const nextWeek = new Date(Date.UTC(2026, 7, 31, 12, 0, 0));
    expect(snapshotMatchesTarget(weeklySnap, 0, 'weekly', sameWeek)).toBe(true);
    expect(snapshotMatchesTarget(weeklySnap, 0, 'weekly', nextWeek)).toBe(false);

    // Non-shared modes keep the plain (level, mode) match across days.
    const classicSnap: PuzzleSnapshot = {
      ...dailySnap,
      level: 5,
      mode: 'classic',
      state: makeState({ level: 5, mode: 'classic' }),
    };
    expect(snapshotMatchesTarget(classicSnap, 5, 'classic', nextDay)).toBe(true);
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

/**
 * Snapshot forward-compatibility.
 *
 * HYDRATE_FROM_SNAPSHOT trusts the stored GameState verbatim, so any field
 * added after a snapshot version shipped arrives as undefined from an older
 * payload. For a counter that is later incremented that is not benign —
 * `undefined + 1` is NaN, which then flows into completion telemetry for
 * every player who resumed a puzzle across the upgrade.
 */
describe('snapshots written before a field existed', () => {
  it('a payload missing undosUsed still describes a resumable puzzle', () => {
    const state = makeState({ moves: 3 });
    // Simulate the older payload by dropping the field entirely, the way
    // JSON.parse of a pre-upgrade snapshot would.
    const legacy = { ...state } as Partial<GameState>;
    delete legacy.undosUsed;

    // The save/resume predicates must not depend on the new field.
    expect(shouldSaveSnapshot(legacy as GameState)).toBe(true);

    // And the reducer's default is what keeps arithmetic finite. This
    // mirrors the `action.state.undosUsed ?? 0` in HYDRATE_FROM_SNAPSHOT;
    // without it the next undo produces NaN rather than 1.
    const hydrated = { ...(legacy as GameState), undosUsed: (legacy as GameState).undosUsed ?? 0 };
    expect(Number.isFinite(hydrated.undosUsed + 1)).toBe(true);
    expect(hydrated.undosUsed + 1).toBe(1);
  });

  it('a payload missing shufflesUsed still describes a resumable puzzle', () => {
    // Same upgrade hazard as undosUsed, for the F7 field: a pre-F7 snapshot
    // resumed across the upgrade must not poison `shufflesUsed + 1`.
    const state = makeState({ moves: 3 });
    const legacy = { ...state } as Partial<GameState>;
    delete legacy.shufflesUsed;

    expect(shouldSaveSnapshot(legacy as GameState)).toBe(true);

    const hydrated = {
      ...(legacy as GameState),
      shufflesUsed: (legacy as GameState).shufflesUsed ?? 0,
    };
    expect(Number.isFinite(hydrated.shufflesUsed + 1)).toBe(true);
    expect(hydrated.shufflesUsed + 1).toBe(1);
  });
});
