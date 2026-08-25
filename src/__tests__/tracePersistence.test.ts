/**
 * A lifted trace stays lit.
 *
 * Dragging three letters of a five-letter word and letting go used to throw
 * the selection away ~180ms later. An earlier pass narrowed that to "only
 * clear traces that can't still become a word", which still discarded
 * exploratory input the player was mid-thought about. The rule now is
 * simply: the player clears the trace, nothing else does.
 *
 * Deselection is retracing — tapping or dragging back over a selected
 * letter truncates the trace there — which the reducer has always
 * supported. These tests pin both halves so neither can regress.
 */
import fs from 'fs';
import path from 'path';
import { gameReducer } from '../hooks/useGame';
import { GameState, Grid } from '../types';

const ROOT = path.resolve(__dirname, '../..');

function cell(id: string, letter: string) {
  return { id, letter };
}

// C A T
// X Y Z
const grid: Grid = [
  [cell('c1', 'C'), cell('c2', 'A'), cell('c3', 'T')],
  [cell('c4', 'X'), cell('c5', 'Y'), cell('c6', 'Z')],
];

function baseState(): GameState {
  return {
    board: {
      grid,
      words: [
        { word: 'CAT', positions: [], direction: 'horizontal', found: false },
        { word: 'CAXY', positions: [], direction: 'horizontal', found: false },
      ],
      config: { rows: 2, cols: 3, wordCount: 2, minWordLength: 3, maxWordLength: 4, difficulty: 'easy' },
    },
    selectedCells: [],
    selectionDirection: null,
    status: 'playing',
    wildcardCells: [],
    wildcardMode: false,
    boosterCounts: { wildcardTile: 0, spotlight: 0, smartShuffle: 0 },
    boostersUsedThisPuzzle: [],
    lastInvalidTap: null,
    lastSelectionResetTap: null,
  } as unknown as GameState;
}

function select(state: GameState, row: number, col: number): GameState {
  return gameReducer(state, { type: 'SELECT_CELL', position: { row, col } });
}

describe('retracing is how a trace is cleared', () => {
  it('tapping a selected letter truncates the trace from that letter on', () => {
    let s = baseState();
    s = select(s, 0, 0); // C
    s = select(s, 0, 1); // A
    s = select(s, 0, 2); // T -> but CAT would auto-submit via GameScreen, not here
    expect(s.selectedCells).toHaveLength(3);

    // Retrace back over the SECOND letter: everything from it onward drops,
    // leaving just the first letter lit.
    s = select(s, 0, 1);
    expect(s.selectedCells).toEqual([{ row: 0, col: 0 }]);
  });

  it('tapping the first letter empties the trace', () => {
    let s = baseState();
    s = select(s, 0, 0);
    s = select(s, 0, 1);
    s = select(s, 0, 0);
    expect(s.selectedCells).toEqual([]);
  });

  it('a partial trace survives arbitrarily many unrelated reducer ticks', () => {
    // Nothing in the reducer expires a selection on its own — only the
    // player's next input changes it.
    let s = baseState();
    s = select(s, 0, 0);
    s = select(s, 0, 1); // "CA" — a partial trace, mid-thought
    const partial = s.selectedCells;
    for (let i = 0; i < 50; i++) {
      s = gameReducer(s, { type: 'TICK_TIMER' });
    }
    expect(s.selectedCells).toEqual(partial);
  });

  it('a non-adjacent tap starts a fresh trace instead of extending', () => {
    let s = baseState();
    s = select(s, 0, 0); // C
    s = select(s, 1, 2); // Z — not adjacent to C
    expect(s.selectedCells).toEqual([{ row: 1, col: 2 }]);
  });
});

describe('PlayField does not release a lifted trace', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'src/screens/game/PlayField.tsx'),
    'utf8',
  );

  it('dispatches no CLEAR_SELECTION of its own', () => {
    expect(source).not.toContain("type: 'CLEAR_SELECTION'");
  });

  it('wires no drag-end release handler', () => {
    expect(source).not.toMatch(/onDragEnd=\{/);
    expect(source).not.toMatch(/releaseTimerRef/);
  });
});
