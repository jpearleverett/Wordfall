import { useReducer, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GameState,
  GameAction,
  Board,
  CellPosition,
  Direction,
  WordPlacement,
  GameMode,
  GameStatus,
  GravityDirection,
  Grid,
  SolveStep,
} from '../types';
import { removeCells, applyGravity, applyGravityInDirection, removeCellsAndApplyGravityInDirection, cloneGrid } from '../engine/gravity';
import { findWordInGrid, isDeadEnd, isDeadEndGravityFlip, isDeadEndNoGravity, getHint, isSolvable, isSolvableGravityFlip, areAllWordsIndependentlyFindable, getHintShrinkingBoard, isDeadEndShrinkingBoard } from '../engine/solver';
import { INITIAL_HINTS, INITIAL_UNDOS, SCORE, MODE_CONFIGS } from '../constants';

const GRAVITY_CYCLE: GravityDirection[] = ['down', 'right', 'up', 'left'];

function getHintsForMode(mode: GameMode): number {
  switch (mode) {
    case 'expert':
    case 'perfectSolve':
      return 0;
    case 'relax':
      return 99;
    default:
      // Persistent inventory: hints come from economy tokens, not per-level allocation
      return 0;
  }
}

function getUndosForMode(mode: GameMode): number {
  switch (mode) {
    case 'expert':
    case 'perfectSolve':
      return 0;
    case 'relax':
      return 99;
    default:
      // Persistent inventory: undos come from economy tokens, not per-level allocation
      return 0;
  }
}

function createInitialState(
  board: Board,
  level: number,
  mode: GameMode = 'classic',
  maxMoves: number = 0,
  timeRemaining: number = 0,
): GameState {
  return {
    board: {
      ...board,
      words: board.words.map(w => ({ ...w, found: false })),
    },
    selectedCells: [],
    selectionDirection: null,
    score: 0,
    moves: 0,
    maxMoves,
    hintsLeft: getHintsForMode(mode),
    hintsUsed: 0,
    undosLeft: getUndosForMode(mode),
    history: [],
    status: 'playing',
    level,
    combo: 0,
    maxCombo: 0,
    mode,
    timeRemaining,
    perfectRun: true,
    chainCount: 0,
    gravityDirection: 'down',
    shrinkCount: 0,
    wordsUntilShrink: 2,
    wildcardCells: [],
    wildcardMode: false,
    spotlightActive: false,
    spotlightLetters: [],
    boosterCounts: {
      wildcardTile: 1,
      spotlight: 1,
      smartShuffle: 1,
    },
    lastInvalidTap: null,
    solveSequence: [],
    puzzleStartTime: Date.now(),
  };
}

/**
 * Convert a Grid to a 2D string array snapshot for replay.
 */
function gridToSnapshot(grid: Grid): string[][] {
  return grid.map(row =>
    row.map(cell => (cell ? cell.letter : ''))
  );
}

function getSelectedWord(
  grid: (import('../types').Cell | null)[][],
  cells: CellPosition[]
): string {
  return cells
    .map(({ row, col }) => grid[row]?.[col]?.letter ?? '')
    .join('');
}

function areAdjacent(
  a: CellPosition,
  b: CellPosition,
  _dir: Direction | null
): { adjacent: boolean; direction: Direction | null } {
  const rowDiff = Math.abs(a.row - b.row);
  const colDiff = Math.abs(a.col - b.col);
  const isAdjacent = rowDiff <= 1 && colDiff <= 1 && (rowDiff + colDiff > 0);
  if (isAdjacent) {
    return { adjacent: true, direction: null };
  }
  return { adjacent: false, direction: null };
}

/**
 * Check if a word matches, accounting for wildcard cells.
 */
function matchesWord(
  selectedWord: string,
  targetWord: string,
  selectedCells: CellPosition[],
  wildcardCells: CellPosition[]
): boolean {
  if (selectedWord.length !== targetWord.length) return false;
  const wildcardSet = new Set(wildcardCells.map(c => `${c.row},${c.col}`));
  for (let i = 0; i < selectedWord.length; i++) {
    const cellKey = `${selectedCells[i].row},${selectedCells[i].col}`;
    if (wildcardSet.has(cellKey)) continue; // wildcard matches anything
    if (selectedWord[i] !== targetWord[i]) return false;
  }
  return true;
}

function calculateScore(
  word: string,
  comboLevel: number,
  mode: GameMode,
): number {
  const baseScore = SCORE.wordFound + word.length * SCORE.bonusPerLetter;
  const comboBonus = Math.floor(baseScore * (comboLevel - 1) * SCORE.comboMultiplier);
  let total = baseScore + comboBonus;

  // Apply mode score multiplier
  const modeConfig = MODE_CONFIGS[mode];
  if (modeConfig) {
    total = Math.floor(total * modeConfig.rules.scoreMultiplier);
  }

  // Expert mode extra bonus
  if (mode === 'expert') {
    total = Math.floor(total * 1.5);
  }

  return total;
}

/**
 * Compute the outer ring of non-null cells for shrinking board.
 */
function getOuterRing(grid: Grid): CellPosition[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const ring: CellPosition[] = [];

  // Find the bounding box of non-null cells
  let minRow = rows, maxRow = -1, minCol = cols, maxCol = -1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== null) {
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }

  if (maxRow < 0) return ring; // empty grid

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (grid[r][c] !== null && (r === minRow || r === maxRow || c === minCol || c === maxCol)) {
        ring.push({ row: r, col: c });
      }
    }
  }

  return ring;
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_CELL': {
      if (state.status !== 'playing') return state;
      const { position } = action;
      const { selectedCells, selectionDirection, board } = state;

      // If in wildcard placement mode, allow placing on empty cells too
      if (state.wildcardMode) {
        // For empty cells, create a placeholder cell so the wildcard has something to render
        let newGrid = board.grid;
        if (!board.grid[position.row]?.[position.col]) {
          newGrid = board.grid.map(r => [...r]);
          newGrid[position.row][position.col] = {
            id: `wildcard-${position.row}-${position.col}`,
            letter: '*',
          };
        }
        return {
          ...state,
          board: { ...board, grid: newGrid },
          wildcardMode: false,
          wildcardCells: [position],
          boosterCounts: { ...state.boosterCounts, wildcardTile: state.boosterCounts.wildcardTile - 1 },
        };
      }

      if (!board.grid[position.row]?.[position.col]) return state;

      // If tapping an already selected cell, deselect from that point
      const existingIndex = selectedCells.findIndex(
        c => c.row === position.row && c.col === position.col
      );
      if (existingIndex >= 0) {
        const newSelected = selectedCells.slice(0, existingIndex);
        return {
          ...state,
          selectedCells: newSelected,
          selectionDirection: newSelected.length < 2 ? null : selectionDirection,
          lastInvalidTap: null,
        };
      }

      // If no cells selected, start selection
      if (selectedCells.length === 0) {
        return {
          ...state,
          selectedCells: [position],
          selectionDirection: null,
          lastInvalidTap: null,
        };
      }

      // Check adjacency to last selected cell
      const lastCell = selectedCells[selectedCells.length - 1];
      const { adjacent, direction: newDir } = areAdjacent(
        lastCell,
        position,
        selectionDirection
      );

      if (!adjacent) {
        return {
          ...state,
          selectedCells: [position],
          selectionDirection: null,
          lastInvalidTap: position,
        };
      }

      const newSelected = [...selectedCells, position];
      return {
        ...state,
        selectedCells: newSelected,
        selectionDirection: newDir,
        lastInvalidTap: null,
      };
    }

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedCells: [],
        selectionDirection: null,
        lastInvalidTap: null,
        spotlightActive: false,
        spotlightLetters: [],
      };

    case 'SUBMIT_WORD': {
      if (state.status !== 'playing') return state;
      const { selectedCells, board, mode } = state;
      if (selectedCells.length === 0) return state;

      const word = getSelectedWord(board.grid, selectedCells);

      // Check if it matches a remaining target word (wildcard-aware)
      const wordIndex = board.words.findIndex(
        w => !w.found && matchesWord(word, w.word, selectedCells, state.wildcardCells)
      );

      if (wordIndex === -1) {
        // Not a target word
        if (mode === 'perfectSolve') {
          return {
            ...state,
            selectedCells: [],
            selectionDirection: null,
            perfectRun: false,
            status: 'failed',
          };
        }
        return {
          ...state,
          selectedCells: [],
          selectionDirection: null,
          perfectRun: false,
        };
      }

      // Word found!
      const historyEntry = {
        grid: cloneGrid(board.grid),
        words: board.words.map(w => ({ ...w })),
        wordsUntilShrink: state.wordsUntilShrink,
        shrinkCount: state.shrinkCount,
      };

      // Remove letters from grid
      const gridAfterRemoval = removeCells(board.grid, selectedCells);

      // Apply gravity based on mode
      let newGrid: Grid;
      let newGravityDirection = state.gravityDirection;

      if (mode === 'noGravity' || mode === 'shrinkingBoard') {
        // No gravity — cleared cells stay as holes (shrinkingBoard relies on static positions)
        newGrid = gridAfterRemoval;
      } else if (mode === 'gravityFlip') {
        // Gravity in current direction, then rotate
        newGrid = applyGravityInDirection(gridAfterRemoval, state.gravityDirection);
        const currentIdx = GRAVITY_CYCLE.indexOf(state.gravityDirection);
        newGravityDirection = GRAVITY_CYCLE[(currentIdx + 1) % 4];
      } else {
        // Standard downward gravity
        newGrid = applyGravity(gridAfterRemoval);
      }

      // Update word status
      const matchingWord = board.words[wordIndex];
      const newWords = board.words.map((w, i) =>
        i === wordIndex ? { ...w, found: true } : { ...w }
      );

      // Chain detection
      const remainingAfter = board.words.filter(w => !w.found && w.word !== matchingWord.word);
      let newChainCount = state.chainCount;
      if (remainingAfter.length > 0 && mode !== 'noGravity' && mode !== 'shrinkingBoard') {
        const findableBefore = remainingAfter.filter(w => findWordInGrid(gridAfterRemoval, w.word, 1).length > 0);
        const findableAfter = remainingAfter.filter(w => findWordInGrid(newGrid, w.word, 1).length > 0);
        if (findableAfter.length > findableBefore.length) {
          newChainCount = state.chainCount + 1;
        }
      }

      // Score
      const comboLevel = state.combo + 1;
      const wordScore = calculateScore(matchingWord.word, comboLevel, mode);

      // Check win condition
      const allFound = newWords.every(w => w.found);
      const newMoves = state.moves + 1;
      let newStatus: GameStatus = allFound ? 'won' : 'playing';

      // Shrinking board: apply shrink after every 2 words
      let newShrinkCount = state.shrinkCount;
      let newWordsUntilShrink = state.wordsUntilShrink - 1;

      if (mode === 'shrinkingBoard' && !allFound && newWordsUntilShrink <= 0) {
        // Time to shrink — remove outer ring, no gravity (cells stay in place)
        const outerRing = getOuterRing(newGrid);
        if (outerRing.length > 0) {
          newGrid = removeCells(newGrid, outerRing);
          newShrinkCount = state.shrinkCount + 1;

          // Check if remaining words are still findable (no gravity, so check independently)
          const remainingWordStrings = newWords.filter(w => !w.found).map(w => w.word);
          const stillSolvable = areAllWordsIndependentlyFindable(newGrid, remainingWordStrings);
          if (!stillSolvable) {
            newStatus = 'failed';
          }
        }
        newWordsUntilShrink = 2; // reset countdown
      }

      // Clean up wildcard if it was used in this word
      const wildcardSet = new Set(state.wildcardCells.map(c => `${c.row},${c.col}`));
      const usedWildcard = selectedCells.some(c => wildcardSet.has(`${c.row},${c.col}`));
      const newWildcardCells = usedWildcard ? [] : state.wildcardCells;

      // Record solve step for replay
      const solveStep: SolveStep = {
        wordFound: matchingWord.word,
        cellPositions: selectedCells.map(c => [c.row, c.col] as [number, number]),
        gridStateBefore: gridToSnapshot(board.grid),
        gridStateAfter: gridToSnapshot(newGrid),
        timestamp: Date.now() - state.puzzleStartTime,
        score: wordScore,
        combo: comboLevel,
      };

      return {
        ...state,
        board: { ...board, grid: newGrid, words: newWords },
        selectedCells: [],
        selectionDirection: null,
        score: state.score + wordScore,
        moves: newMoves,
        combo: comboLevel,
        maxCombo: Math.max(state.maxCombo, comboLevel),
        chainCount: newChainCount,
        history: [...state.history, historyEntry],
        status: newStatus,
        gravityDirection: newGravityDirection,
        shrinkCount: newShrinkCount,
        wordsUntilShrink: newWordsUntilShrink,
        wildcardCells: newWildcardCells,
        spotlightActive: false,
        spotlightLetters: [],
        solveSequence: [...state.solveSequence, solveStep],
      };
    }

    case 'USE_HINT': {
      if (state.hintsLeft <= 0 || state.status !== 'playing') return state;

      const remainingWords = state.board.words
        .filter(w => !w.found)
        .map(w => w.word);

      // shrinkingBoard: use shrink-aware hint that accounts for future outer ring removals
      const hint = state.mode === 'shrinkingBoard'
        ? getHintShrinkingBoard(state.board.grid, remainingWords, state.wordsUntilShrink)
        : getHint(state.board.grid, remainingWords);
      if (!hint) return state;

      return {
        ...state,
        selectedCells: hint.positions,
        selectionDirection: null,
        hintsLeft: state.hintsLeft - 1,
        hintsUsed: state.hintsUsed + 1,
        perfectRun: false,
      };
    }

    case 'UNDO_MOVE': {
      if (state.history.length === 0) return state;
      if (state.status !== 'playing' && state.status !== 'failed') return state;
      if (state.undosLeft <= 0) return state;

      const lastHistory = state.history[state.history.length - 1];

      // Reverse gravity direction for gravityFlip
      let prevDirection = state.gravityDirection;
      if (state.mode === 'gravityFlip') {
        const currentIdx = GRAVITY_CYCLE.indexOf(state.gravityDirection);
        prevDirection = GRAVITY_CYCLE[(currentIdx + 3) % 4]; // go back one step
      }

      // Restore shrink state from history (exact values, no heuristics)
      const prevShrinkCount = lastHistory.shrinkCount ?? state.shrinkCount;
      const prevWordsUntilShrink = lastHistory.wordsUntilShrink ?? state.wordsUntilShrink;

      return {
        ...state,
        board: {
          ...state.board,
          grid: lastHistory.grid,
          words: lastHistory.words,
        },
        selectedCells: [],
        selectionDirection: null,
        moves: state.moves - 1,
        undosLeft: state.undosLeft - 1,
        history: state.history.slice(0, -1),
        solveSequence: state.solveSequence.slice(0, -1),
        combo: 0,
        perfectRun: false,
        status: 'playing',
        gravityDirection: prevDirection,
        shrinkCount: prevShrinkCount,
        wordsUntilShrink: prevWordsUntilShrink,
      };
    }

    case 'NEW_GAME':
      return createInitialState(
        action.board,
        action.level,
        action.mode || 'classic',
        action.maxMoves || 0,
        action.timeRemaining || 0,
      );

    case 'RESET_COMBO':
      return {
        ...state,
        combo: 0,
      };

    case 'TICK_TIMER': {
      if (state.status !== 'playing' || state.timeRemaining <= 0) return state;
      const newTime = state.timeRemaining - 1;
      if (newTime <= 0) {
        return { ...state, timeRemaining: 0, status: 'timeout' };
      }
      return { ...state, timeRemaining: newTime };
    }

    case 'WILDCARD_PLACE': {
      if (state.status !== 'playing') return state;
      if (!state.wildcardMode) return state;
      const { position } = action;
      return {
        ...state,
        wildcardMode: false,
        wildcardCells: [position],
        boosterCounts: { ...state.boosterCounts, wildcardTile: state.boosterCounts.wildcardTile - 1 },
      };
    }

    case 'SPOTLIGHT_ACTIVATE': {
      if (state.status !== 'playing') return state;
      if (state.boosterCounts.spotlight <= 0) return state;

      // Compute relevant letters from all remaining words
      const relevantLetters = new Set<string>();
      state.board.words.forEach(w => {
        if (!w.found) {
          for (const ch of w.word) relevantLetters.add(ch);
        }
      });

      return {
        ...state,
        spotlightActive: true,
        spotlightLetters: [...relevantLetters],
        boosterCounts: { ...state.boosterCounts, spotlight: state.boosterCounts.spotlight - 1 },
      };
    }

    case 'SMART_SHUFFLE': {
      if (state.status !== 'playing') return state;
      if (state.boosterCounts.smartShuffle <= 0) return state;

      const { grid, words } = state.board;
      const remainingWords = words.filter(w => !w.found).map(w => w.word);

      // Identify cells on remaining word paths
      const wordCellSet = new Set<string>();
      for (const w of remainingWords) {
        const occurrences = findWordInGrid(grid, w, 1);
        if (occurrences.length > 0) {
          occurrences[0].forEach(pos => wordCellSet.add(`${pos.row},${pos.col}`));
        }
      }

      const vowels = 'AEIOU';
      const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';

      // Try up to 10 shuffles to find a solvable board
      for (let attempt = 0; attempt < 10; attempt++) {
        const newGrid = cloneGrid(grid);
        for (let r = 0; r < newGrid.length; r++) {
          for (let c = 0; c < newGrid[0].length; c++) {
            if (newGrid[r][c] && !wordCellSet.has(`${r},${c}`)) {
              const useVowel = Math.random() < 0.35;
              const pool = useVowel ? vowels : consonants;
              newGrid[r][c] = {
                ...newGrid[r][c]!,
                letter: pool[Math.floor(Math.random() * pool.length)],
              };
            }
          }
        }

        // Verify solvability using mode-appropriate solver
        const shuffleValid = (state.mode === 'noGravity' || state.mode === 'shrinkingBoard')
          ? areAllWordsIndependentlyFindable(newGrid, remainingWords)
          : state.mode === 'gravityFlip'
            ? isSolvableGravityFlip(newGrid, remainingWords, state.gravityDirection)
            : isSolvable(newGrid, remainingWords);
        if (shuffleValid) {
          return {
            ...state,
            board: { ...state.board, grid: newGrid },
            boosterCounts: { ...state.boosterCounts, smartShuffle: state.boosterCounts.smartShuffle - 1 },
          };
        }
      }

      // All attempts failed — refund booster (don't decrement)
      return state;
    }

    case 'USE_BOOSTER': {
      if (state.status !== 'playing') return state;
      const { booster } = action;

      if (booster === 'wildcardTile' && state.boosterCounts.wildcardTile > 0) {
        // Enter wildcard placement mode (actual placement happens on next SELECT_CELL)
        return { ...state, wildcardMode: !state.wildcardMode };
      }
      if (booster === 'spotlight' && state.boosterCounts.spotlight > 0) {
        return gameReducer(state, { type: 'SPOTLIGHT_ACTIVATE' });
      }
      if (booster === 'smartShuffle' && state.boosterCounts.smartShuffle > 0) {
        return gameReducer(state, { type: 'SMART_SHUFFLE' });
      }
      return state;
    }

    case 'GRANT_HINT':
      return { ...state, hintsLeft: state.hintsLeft + 1 };

    case 'GRANT_UNDO':
      return { ...state, undosLeft: state.undosLeft + 1 };

    default:
      return state;
  }
}

// Export for testing
export { gameReducer, createInitialState };

export function useGame(
  initialBoard: Board,
  level: number,
  mode: GameMode = 'classic',
  maxMoves: number = 0,
  timeLimit: number = 0,
) {
  const [state, dispatch] = useReducer(
    gameReducer,
    createInitialState(initialBoard, level, mode, maxMoves, timeLimit)
  );

  // Timer for timed modes
  const statusRef = useRef(state.status);
  statusRef.current = state.status;

  useEffect(() => {
    if (mode !== 'timePressure' || state.status !== 'playing' || state.timeRemaining <= 0) return;

    const interval = setInterval(() => {
      if (statusRef.current === 'playing') {
        dispatch({ type: 'TICK_TIMER' });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, state.status]);

  const selectCell = useCallback((position: CellPosition) => {
    dispatch({ type: 'SELECT_CELL', position });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const submitWord = useCallback(() => {
    dispatch({ type: 'SUBMIT_WORD' });
  }, []);

  const useHintAction = useCallback(() => {
    dispatch({ type: 'USE_HINT' });
  }, []);

  const undoMove = useCallback(() => {
    dispatch({ type: 'UNDO_MOVE' });
  }, []);

  const grantHint = useCallback(() => {
    dispatch({ type: 'GRANT_HINT' });
  }, []);

  const grantUndo = useCallback(() => {
    dispatch({ type: 'GRANT_UNDO' });
  }, []);

  const newGame = useCallback((board: Board, newLevel: number, newMode?: GameMode, newMaxMoves?: number, newTimeLimit?: number) => {
    dispatch({ type: 'NEW_GAME', board, level: newLevel, mode: newMode, maxMoves: newMaxMoves, timeRemaining: newTimeLimit });
  }, []);

  const activateWildcard = useCallback(() => {
    dispatch({ type: 'USE_BOOSTER', booster: 'wildcardTile' });
  }, []);

  const activateSpotlight = useCallback(() => {
    dispatch({ type: 'USE_BOOSTER', booster: 'spotlight' });
  }, []);

  const activateSmartShuffle = useCallback(() => {
    dispatch({ type: 'USE_BOOSTER', booster: 'smartShuffle' });
  }, []);

  const useBooster = useCallback((booster: string) => {
    dispatch({ type: 'USE_BOOSTER', booster });
  }, []);

  // Get the currently forming word
  const currentWord = useMemo(
    () => getSelectedWord(state.board.grid, state.selectedCells),
    [state.board.grid, state.selectedCells]
  );

  // Cache remaining words
  const remainingWords = useMemo(
    () => state.board.words.filter(w => !w.found).map(w => w.word),
    [state.board.words]
  );

  // Check if current selection matches a target word (wildcard-aware)
  const isValidWord = useMemo(() => {
    if (state.selectedCells.length === 0) return false;
    return state.board.words.some(
      w => !w.found && matchesWord(currentWord, w.word, state.selectedCells, state.wildcardCells)
    );
  }, [remainingWords, currentWord, state.selectedCells, state.wildcardCells]);

  // Compute isStuck lazily — mode-aware
  const [isStuck, setIsStuck] = useState(false);
  const foundWords = state.board.words.filter(w => w.found).length;

  useEffect(() => {
    if (state.status !== 'playing' || remainingWords.length === 0) {
      setIsStuck(false);
      return;
    }

    // shrinkingBoard: use shrink-aware dead-end detection
    if (mode === 'shrinkingBoard') {
      const timer = setTimeout(() => {
        setIsStuck(isDeadEndShrinkingBoard(state.board.grid, remainingWords, state.wordsUntilShrink));
      }, 100);
      return () => clearTimeout(timer);
    }

    // noGravity: just check if all words still exist in grid
    if (mode === 'noGravity') {
      const timer = setTimeout(() => {
        setIsStuck(isDeadEndNoGravity(state.board.grid, remainingWords));
      }, 100);
      return () => clearTimeout(timer);
    }

    // gravityFlip mode: use rotating gravity dead-end detection
    if (mode === 'gravityFlip') {
      const timer = setTimeout(() => {
        setIsStuck(isDeadEndGravityFlip(state.board.grid, remainingWords, state.gravityDirection, state.moves));
      }, 100);
      return () => clearTimeout(timer);
    }

    // Standard dead-end detection
    const timer = setTimeout(() => {
      setIsStuck(isDeadEnd(state.board.grid, remainingWords));
    }, 100);
    return () => clearTimeout(timer);
  }, [foundWords, state.status, state.board.grid, remainingWords, mode, state.gravityDirection, state.moves, state.wordsUntilShrink]);

  // Calculate stars
  const totalWords = state.board.words.length;
  const stars =
    state.status === 'won'
      ? state.hintsUsed === 0 && state.moves <= totalWords
        ? 3
        : state.hintsUsed <= 1 && state.moves <= totalWords + 1
        ? 2
        : 1
      : 0;

  return {
    state,
    selectCell,
    clearSelection,
    submitWord,
    useHint: useHintAction,
    undoMove,
    grantHint,
    grantUndo,
    newGame,
    activateWildcard,
    activateSpotlight,
    activateSmartShuffle,
    useBooster,
    currentWord,
    isValidWord,
    isStuck,
    stars,
    foundWords,
    totalWords,
    remainingWords,
    lastInvalidTap: state.lastInvalidTap,
    solveSequence: state.solveSequence,
  };
}
