/**
 * UNDO MUST PUT THE MODE'S OWN STATE BACK, NOT JUST THE GRID.
 *
 * Most modes carry state beyond the letters: gravityFlip advances a
 * direction through [down, right, up, left] on every clear, shrinkingBoard
 * counts down to the next shrink. Undo restores the grid from history, and
 * has to unwind those counters too.
 *
 * This matters more than it looks. A gravityFlip direction left one step
 * ahead after an undo desyncs the whole rest of the puzzle: every subsequent
 * clear falls the wrong way, and — as the isDeadEndGravityFlip phase bug
 * showed — an off-by-one in that cycle is invisible until the board quietly
 * becomes unwinnable. Nothing throws; the player just loses a puzzle that
 * should have been fine.
 *
 * These drive the real reducer rather than a model of it.
 */
import { gameReducer, createInitialState } from '../useGame';
import type {
  Board,
  BoardConfig,
  Cell,
  GameState,
  Grid,
  GravityDirection,
  WordPlacement,
} from '../../types';

let cellId = 0;
function makeCell(letter: string): Cell {
  return { letter, id: `c${++cellId}` };
}

function makeGrid(rows: string[]): Grid {
  return rows.map((row) => row.split('').map((letter) => makeCell(letter)));
}

/**
 * A 4x4 board with CAT along the top row and DOG directly beneath it.
 *
 * TWO words on purpose: clearing the only word wins the puzzle, and
 * UNDO_MOVE requires status 'playing', so a single-word fixture would have
 * every undo silently refused and every assertion below pass vacuously
 * against an unchanged state.
 *
 * DOG survives the clear under every mode's rule — under downward gravity
 * the gap is in the top row with nothing above it to fall, and under
 * noGravity/shrinkingBoard nothing moves at all — so the board is still
 * playable after the move being undone.
 */
function makeBoard(): Board {
  const grid = makeGrid(['CATX', 'DOGN', 'MTQF', 'BAJL']);
  const words: WordPlacement[] = [
    {
      word: 'CAT',
      positions: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
      direction: 'horizontal',
      found: false,
    },
    {
      word: 'DOG',
      positions: [
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ],
      direction: 'horizontal',
      found: false,
    },
  ];
  const config: BoardConfig = {
    rows: 4,
    cols: 4,
    wordCount: 2,
    minWordLength: 3,
    maxWordLength: 3,
    difficulty: 'easy',
  };
  return { grid, words, config };
}

/**
 * Trace CAT cell by cell and resolve it. There is no submit button in the
 * game — the UI dispatches SUBMIT_WORD the moment the traced path matches a
 * list word — but at the reducer level that dispatch is still the action
 * that clears, applies gravity and pushes onto history.
 */
function clearCat(state: GameState): GameState {
  let next = state;
  for (const position of [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
  ]) {
    next = gameReducer(next, { type: 'SELECT_CELL', position });
  }
  next = gameReducer(next, { type: 'SUBMIT_WORD' });
  // Guard the helper itself: if the trace stopped matching, every assertion
  // below would pass vacuously against an unchanged state.
  if (next.history.length === 0) {
    throw new Error('clearCat did not clear a word — the fixture has drifted');
  }
  if (next.status !== 'playing') {
    throw new Error(`clearCat ended the puzzle (${next.status}) — undo would be refused`);
  }
  return next;
}

function withUndos(state: GameState, count: number): GameState {
  return { ...state, undosLeft: count };
}

describe('undo unwinds gravityFlip direction', () => {
  const CYCLE: GravityDirection[] = ['down', 'right', 'up', 'left'];

  it('a clear advances the direction and undo puts it back', () => {
    const base = withUndos(createInitialState(makeBoard(), 1, 'gravityFlip'), 1);
    expect(base.gravityDirection).toBe('down');

    const afterClear = clearCat(base);
    expect(afterClear.gravityDirection).toBe('right');

    const afterUndo = gameReducer(afterClear, { type: 'UNDO_MOVE' });
    expect(afterUndo.gravityDirection).toBe('down');
  });

  it('unwinds correctly from every point in the cycle', () => {
    // The step-back is (index + 3) % 4. A plain index - 1 would produce -1
    // at 'down' and index into undefined, so the wrap case is the one that
    // matters; check all four rather than only the convenient ones.
    for (const start of CYCLE) {
      const board = makeBoard();
      const base: GameState = {
        ...withUndos(createInitialState(board, 1, 'gravityFlip'), 1),
        gravityDirection: start,
      };
      const afterClear = clearCat(base);
      const expectedNext = CYCLE[(CYCLE.indexOf(start) + 1) % 4];
      expect(afterClear.gravityDirection).toBe(expectedNext);

      const afterUndo = gameReducer(afterClear, { type: 'UNDO_MOVE' });
      expect(afterUndo.gravityDirection).toBe(start);
    }
  });

  it('leaves the direction alone in modes that do not rotate', () => {
    for (const mode of ['classic', 'noGravity', 'relax'] as const) {
      const base = withUndos(createInitialState(makeBoard(), 1, mode), 1);
      const afterClear = clearCat(base);
      expect(afterClear.gravityDirection).toBe('down');
      const afterUndo = gameReducer(afterClear, { type: 'UNDO_MOVE' });
      expect(afterUndo.gravityDirection).toBe('down');
    }
  });
});

describe('undo unwinds the shrinkingBoard counter', () => {
  it('restores wordsUntilShrink rather than leaving it advanced', () => {
    const base = withUndos(createInitialState(makeBoard(), 1, 'shrinkingBoard'), 1);
    const before = base.wordsUntilShrink;

    const afterClear = clearCat(base);
    // The counter must have moved, or this test proves nothing.
    expect(afterClear.wordsUntilShrink).not.toBe(before);

    const afterUndo = gameReducer(afterClear, { type: 'UNDO_MOVE' });
    expect(afterUndo.wordsUntilShrink).toBe(before);
    expect(afterUndo.shrinkCount).toBe(base.shrinkCount);
  });
});

describe('undo accounting', () => {
  it('spends an undo and counts it', () => {
    // undosUsed is not derivable from undosLeft — the free stuck rescue
    // increments undosLeft too, so the two movements cancel. It feeds
    // completion telemetry, so it has to move on the action itself.
    const base = withUndos(createInitialState(makeBoard(), 1, 'classic'), 2);
    const afterUndo = gameReducer(clearCat(base), { type: 'UNDO_MOVE' });
    expect(afterUndo.undosLeft).toBe(1);
    expect(afterUndo.undosUsed).toBe(1);
  });

  it('refuses when there are no undos left, changing nothing', () => {
    const base = withUndos(createInitialState(makeBoard(), 1, 'gravityFlip'), 0);
    const afterClear = clearCat(base);
    const afterUndo = gameReducer(afterClear, { type: 'UNDO_MOVE' });
    // A refused undo must not half-apply — in particular it must not step
    // the gravity cycle back while leaving the grid cleared.
    expect(afterUndo).toBe(afterClear);
  });

  it('clears the perfect-run flag, since an undo is an assist', () => {
    const base = withUndos(createInitialState(makeBoard(), 1, 'classic'), 1);
    expect(base.perfectRun).toBe(true);
    const afterUndo = gameReducer(clearCat(base), { type: 'UNDO_MOVE' });
    expect(afterUndo.perfectRun).toBe(false);
  });
});
