import { gameReducer, createInitialState } from '../useGame';
import { Board, GameState, GameAction, Grid, Cell, WordPlacement, BoardConfig } from '../../types';

function makeCell(letter: string, id?: string): Cell {
  return { letter, id: id ?? `cell_${letter}_${Math.random().toString(36).slice(2, 6)}` };
}

function makeGrid(template: (string | null)[][]): Grid {
  return template.map(row =>
    row.map(letter => (letter !== null ? makeCell(letter) : null))
  );
}

function makeBoard(gridTemplate: (string | null)[][], words: string[]): Board {
  const grid = makeGrid(gridTemplate);
  const placements: WordPlacement[] = words.map(word => ({
    word,
    positions: [],
    direction: 'horizontal' as const,
    found: false,
  }));
  const config: BoardConfig = {
    rows: gridTemplate.length,
    cols: gridTemplate[0].length,
    wordCount: words.length,
    minWordLength: 3,
    maxWordLength: 5,
    difficulty: 'easy',
  };
  return { grid, words: placements, config };
}

// Helper: create a board where GO and HI are findable
function makeSimpleBoard(): Board {
  const grid: Grid = [
    [makeCell('G', 'g1'), makeCell('O', 'o1')],
    [makeCell('H', 'h1'), makeCell('I', 'i1')],
  ];
  const words: WordPlacement[] = [
    { word: 'GO', positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }], direction: 'horizontal', found: false },
    { word: 'HI', positions: [{ row: 1, col: 0 }, { row: 1, col: 1 }], direction: 'horizontal', found: false },
  ];
  const config: BoardConfig = {
    rows: 2, cols: 2, wordCount: 2, minWordLength: 2, maxWordLength: 2, difficulty: 'easy',
  };
  return { grid, words, config };
}

describe('createInitialState', () => {
  it('creates initial state with correct defaults', () => {
    const board = makeSimpleBoard();
    const state = createInitialState(board, 1);
    expect(state.status).toBe('playing');
    expect(state.score).toBe(0);
    expect(state.moves).toBe(0);
    expect(state.combo).toBe(0);
    expect(state.selectedCells).toEqual([]);
    expect(state.level).toBe(1);
    expect(state.mode).toBe('classic');
    expect(state.history).toEqual([]);
    expect(state.perfectRun).toBe(true);
  });

  it('applies mode-specific hint/undo counts', () => {
    const board = makeSimpleBoard();
    const expertState = createInitialState(board, 1, 'expert');
    expect(expertState.hintsLeft).toBe(0);
    expect(expertState.undosLeft).toBe(0);

    const relaxState = createInitialState(board, 1, 'relax');
    expect(relaxState.hintsLeft).toBe(99);
    expect(relaxState.undosLeft).toBe(99);
  });

  it('sets time remaining for timed mode', () => {
    const board = makeSimpleBoard();
    const state = createInitialState(board, 1, 'timePressure', 0, 120);
    expect(state.timeRemaining).toBe(120);
  });

  it('initializes gravity direction for gravityFlip mode', () => {
    const board = makeSimpleBoard();
    const state = createInitialState(board, 1, 'gravityFlip');
    expect(state.gravityDirection).toBe('down');
  });

  it('initializes booster counts at 0 (persistent inventory)', () => {
    const board = makeSimpleBoard();
    const state = createInitialState(board, 1);
    expect(state.boosterCounts.wildcardTile).toBe(0);
    expect(state.boosterCounts.spotlight).toBe(0);
    expect(state.boosterCounts.smartShuffle).toBe(0);
  });
});

describe('gameReducer - SELECT_CELL', () => {
  it('starts selection on first cell tap', () => {
    const board = makeSimpleBoard();
    const state = createInitialState(board, 1);
    const action: GameAction = { type: 'SELECT_CELL', position: { row: 0, col: 0 } };
    const newState = gameReducer(state, action);
    expect(newState.selectedCells).toEqual([{ row: 0, col: 0 }]);
  });

  it('adds adjacent cell to selection', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 1 } });
    expect(state.selectedCells).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
  });

  it('resets selection on non-adjacent tap (starts new from tapped cell)', () => {
    const grid: Grid = [
      [makeCell('A', 'a'), makeCell('B', 'b'), makeCell('C', 'c')],
      [makeCell('D', 'd'), makeCell('E', 'e'), makeCell('F', 'f')],
      [makeCell('G', 'g'), makeCell('H', 'h'), makeCell('I', 'i')],
    ];
    const board: Board = {
      grid,
      words: [{ word: 'AEI', positions: [], direction: 'horizontal', found: false }],
      config: { rows: 3, cols: 3, wordCount: 1, minWordLength: 3, maxWordLength: 3, difficulty: 'easy' },
    };
    let state = createInitialState(board, 1);
    // Select top-left
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    // Tap non-adjacent cell (row 2, col 2 is not adjacent to row 0, col 0)
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 2, col: 2 } });
    // Should start new selection from (2,2)
    expect(state.selectedCells).toEqual([{ row: 2, col: 2 }]);
  });

  it('ignores taps on null cells', () => {
    const grid: Grid = [
      [makeCell('A', 'a'), null],
      [null, makeCell('B', 'b')],
    ];
    const board: Board = {
      grid,
      words: [{ word: 'AB', positions: [], direction: 'horizontal', found: false }],
      config: { rows: 2, cols: 2, wordCount: 1, minWordLength: 2, maxWordLength: 2, difficulty: 'easy' },
    };
    let state = createInitialState(board, 1);
    // Tap on null cell
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 1 } });
    expect(state.selectedCells).toEqual([]);
  });

  it('deselects from tapped cell when already selected', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 1 } });
    // Tap first cell again — deselects from that point
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    expect(state.selectedCells).toEqual([]);
  });

  it('does nothing when game is not playing', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    state = { ...state, status: 'won' };
    const newState = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    expect(newState.selectedCells).toEqual([]);
  });
});

describe('gameReducer - SUBMIT_WORD', () => {
  it('submits a valid word and scores points', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    // Select G-O
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 1 } });
    state = gameReducer(state, { type: 'SUBMIT_WORD' });
    expect(state.score).toBeGreaterThan(0);
    expect(state.moves).toBe(1);
    expect(state.board.words.find(w => w.word === 'GO')?.found).toBe(true);
    expect(state.selectedCells).toEqual([]);
  });

  it('clears selection for invalid word', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    // Select just G (not a target word)
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    state = gameReducer(state, { type: 'SUBMIT_WORD' });
    expect(state.selectedCells).toEqual([]);
    expect(state.score).toBe(0);
  });

  it('detects win condition when all words found', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    // Find GO
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 1 } });
    state = gameReducer(state, { type: 'SUBMIT_WORD' });
    // Find HI
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 1, col: 0 } });
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 1, col: 1 } });
    state = gameReducer(state, { type: 'SUBMIT_WORD' });
    expect(state.status).toBe('won');
  });

  it('does nothing with empty selection', () => {
    const board = makeSimpleBoard();
    const state = createInitialState(board, 1);
    const newState = gameReducer(state, { type: 'SUBMIT_WORD' });
    expect(newState).toEqual(state);
  });
});

describe('gameReducer - USE_HINT', () => {
  it('decrements hints on use', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    // Grant a hint token (now comes from persistent economy)
    state = gameReducer(state, { type: 'GRANT_HINT' });
    const initialHints = state.hintsLeft;
    const newState = gameReducer(state, { type: 'USE_HINT' });
    expect(newState.hintsLeft).toBe(initialHints - 1);
    expect(newState.selectedCells.length).toBeGreaterThan(0);
  });

  it('does nothing when no hints remain', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    state = { ...state, hintsLeft: 0 };
    const newState = gameReducer(state, { type: 'USE_HINT' });
    expect(newState).toEqual(state);
  });

  it('marks perfectRun as false', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    // Grant a hint token first
    state = gameReducer(state, { type: 'GRANT_HINT' });
    expect(state.perfectRun).toBe(true);
    const newState = gameReducer(state, { type: 'USE_HINT' });
    expect(newState.perfectRun).toBe(false);
  });
});

describe('gameReducer - UNDO_MOVE', () => {
  it('restores previous state', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    // Grant an undo token (now comes from persistent economy)
    state = gameReducer(state, { type: 'GRANT_UNDO' });
    // Find GO
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 1 } });
    state = gameReducer(state, { type: 'SUBMIT_WORD' });
    expect(state.moves).toBe(1);

    // Undo
    state = gameReducer(state, { type: 'UNDO_MOVE' });
    expect(state.moves).toBe(0);
    expect(state.board.words.every(w => !w.found)).toBe(true);
  });

  it('does nothing with no history', () => {
    const board = makeSimpleBoard();
    const state = createInitialState(board, 1);
    const newState = gameReducer(state, { type: 'UNDO_MOVE' });
    expect(newState).toEqual(state);
  });

  it('does nothing when no undos remain', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    // Submit a word first to have history
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 1 } });
    state = gameReducer(state, { type: 'SUBMIT_WORD' });
    state = { ...state, undosLeft: 0 };
    const newState = gameReducer(state, { type: 'UNDO_MOVE' });
    expect(newState.moves).toBe(1); // Not undone
  });
});

describe('gameReducer - NEW_GAME', () => {
  it('resets state with new board', () => {
    const board1 = makeSimpleBoard();
    let state = createInitialState(board1, 1);
    state = { ...state, score: 500, moves: 5 };

    const board2 = makeSimpleBoard();
    state = gameReducer(state, { type: 'NEW_GAME', board: board2, level: 2 });
    expect(state.score).toBe(0);
    expect(state.moves).toBe(0);
    expect(state.level).toBe(2);
    expect(state.status).toBe('playing');
  });
});

describe('gameReducer - TICK_TIMER', () => {
  it('decrements time remaining', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1, 'timePressure', 0, 60);
    state = gameReducer(state, { type: 'TICK_TIMER' });
    expect(state.timeRemaining).toBe(59);
  });

  it('sets timeout status when time runs out', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1, 'timePressure', 0, 1);
    state = gameReducer(state, { type: 'TICK_TIMER' });
    expect(state.timeRemaining).toBe(0);
    expect(state.status).toBe('timeout');
  });

  it('does nothing when not playing', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1, 'timePressure', 0, 60);
    state = { ...state, status: 'won' };
    const newState = gameReducer(state, { type: 'TICK_TIMER' });
    expect(newState.timeRemaining).toBe(60);
  });
});

describe('gameReducer - scoring', () => {
  it('calculates score correctly for word found', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 1 } });
    state = gameReducer(state, { type: 'SUBMIT_WORD' });
    // SCORE.wordFound(100) + word.length(2) * SCORE.bonusPerLetter(20) = 140
    expect(state.score).toBe(140);
  });

  it('applies combo multiplier on consecutive words', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    // Find GO
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 1 } });
    state = gameReducer(state, { type: 'SUBMIT_WORD' });
    const scoreAfterFirst = state.score;
    // Find HI (combo level 2, so bonus = 50% of base)
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 1, col: 0 } });
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 1, col: 1 } });
    state = gameReducer(state, { type: 'SUBMIT_WORD' });
    // Second word should have combo bonus
    expect(state.score).toBeGreaterThan(scoreAfterFirst + 140);
  });

  it('gravityFlip mode rotates direction after word', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1, 'gravityFlip');
    expect(state.gravityDirection).toBe('down');
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 1 } });
    state = gameReducer(state, { type: 'SUBMIT_WORD' });
    expect(state.gravityDirection).toBe('right');
  });
});

describe('gameReducer - perfectSolve mode', () => {
  it('fails on wrong word submission', () => {
    const grid: Grid = [
      [makeCell('C', 'c'), makeCell('A', 'a'), makeCell('T', 't')],
      [makeCell('X', 'x'), makeCell('Y', 'y'), makeCell('Z', 'z')],
    ];
    const board: Board = {
      grid,
      words: [{ word: 'CAT', positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], direction: 'horizontal', found: false }],
      config: { rows: 2, cols: 3, wordCount: 1, minWordLength: 3, maxWordLength: 3, difficulty: 'easy' },
    };
    let state = createInitialState(board, 1, 'perfectSolve');
    // Select wrong letters XY
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 1, col: 0 } });
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 1, col: 1 } });
    state = gameReducer(state, { type: 'SUBMIT_WORD' });
    expect(state.status).toBe('failed');
  });
});

describe('gameReducer - CLEAR_SELECTION', () => {
  it('clears selected cells', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    expect(state.selectedCells.length).toBe(1);
    state = gameReducer(state, { type: 'CLEAR_SELECTION' });
    expect(state.selectedCells).toEqual([]);
  });
});

describe('gameReducer - SPOTLIGHT_ACTIVATE', () => {
  it('activates spotlight and computes relevant letters', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    // Grant a spotlight booster first (now comes from persistent economy)
    state = gameReducer(state, { type: 'GRANT_BOOSTER', booster: 'spotlight' });
    expect(state.boosterCounts.spotlight).toBe(1);
    state = gameReducer(state, { type: 'SPOTLIGHT_ACTIVATE' });
    expect(state.spotlightActive).toBe(true);
    expect(state.spotlightLetters.length).toBeGreaterThan(0);
    expect(state.boosterCounts.spotlight).toBe(0);
  });
});

describe('gameReducer - RESET_COMBO', () => {
  it('resets combo to 0', () => {
    const board = makeSimpleBoard();
    let state = createInitialState(board, 1);
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    state = gameReducer(state, { type: 'SELECT_CELL', position: { row: 0, col: 1 } });
    state = gameReducer(state, { type: 'SUBMIT_WORD' });
    expect(state.combo).toBe(1);
    state = gameReducer(state, { type: 'RESET_COMBO' });
    expect(state.combo).toBe(0);
  });
});
