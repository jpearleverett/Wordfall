import { useReducer, useCallback, useRef, useEffect } from 'react';
import {
  GameState,
  GameAction,
  Board,
  CellPosition,
  Direction,
  WordPlacement,
  GameMode,
  GameStatus,
} from '../types';
import { removeCellsAndApplyGravity, removeCells, applyGravity, cloneGrid } from '../engine/gravity';
import { findWordInGrid, isDeadEnd, getHint } from '../engine/solver';
import { INITIAL_HINTS, INITIAL_UNDOS, SCORE } from '../constants';
import { soundManager } from '../services/sound';
import { tapHaptic, wordFoundHaptic, comboHaptic, errorHaptic, successHaptic } from '../services/haptics';

/**
 * Apply gravity but skip frozen columns — letters in frozen columns stay in place.
 */
function applyGravityWithFrozen(grid: (import('../types').Cell | null)[][], frozenCols: number[]): (import('../types').Cell | null)[][] {
  if (frozenCols.length === 0) return applyGravity(grid);

  const rows = grid.length;
  const cols = grid[0].length;
  const newGrid: (import('../types').Cell | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );

  for (let col = 0; col < cols; col++) {
    if (frozenCols.includes(col)) {
      // Copy column as-is (no gravity)
      for (let row = 0; row < rows; row++) {
        newGrid[row][col] = grid[row][col];
      }
    } else {
      // Normal gravity: compact cells to bottom
      const cells: import('../types').Cell[] = [];
      for (let row = 0; row < rows; row++) {
        if (grid[row][col] !== null) {
          cells.push(grid[row][col]!);
        }
      }
      const startRow = rows - cells.length;
      for (let i = 0; i < cells.length; i++) {
        newGrid[startRow + i][col] = cells[i];
      }
    }
  }

  return newGrid;
}

function getHintsForMode(mode: GameMode): number {
  switch (mode) {
    case 'expert':
    case 'perfectSolve':
      return 0;
    case 'relax':
      return 99;
    default:
      return INITIAL_HINTS;
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
      return INITIAL_UNDOS;
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
    undosLeft: getUndosForMode(mode),
    history: [],
    status: 'playing',
    level,
    combo: 0,
    maxCombo: 0,
    mode,
    timeRemaining,
    cascadeMultiplier: 1,
    perfectRun: true,
    chainCount: 0,
    frozenColumns: [],
    previewGrid: null,
    boosterCounts: {
      freezeColumn: 2,
      boardPreview: 1,
      shuffleFiller: 1,
    },
  };
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
  dir: Direction | null
): { adjacent: boolean; direction: Direction | null } {
  const rowDiff = Math.abs(a.row - b.row);
  const colDiff = Math.abs(a.col - b.col);

  if (rowDiff === 0 && colDiff === 1) {
    if (dir === null || dir === 'horizontal') {
      return { adjacent: true, direction: 'horizontal' };
    }
  }
  if (rowDiff === 1 && colDiff === 0) {
    if (dir === null || dir === 'vertical') {
      return { adjacent: true, direction: 'vertical' };
    }
  }

  return { adjacent: false, direction: dir };
}

function calculateScore(
  word: string,
  comboLevel: number,
  mode: GameMode,
  cascadeMultiplier: number,
): number {
  const baseScore = SCORE.wordFound + word.length * SCORE.bonusPerLetter;
  const comboBonus = Math.floor(baseScore * (comboLevel - 1) * SCORE.comboMultiplier);
  let total = baseScore + comboBonus;

  // Cascade mode multiplier
  if (mode === 'cascade') {
    total = Math.floor(total * cascadeMultiplier);
  }

  // Expert mode bonus
  if (mode === 'expert') {
    total = Math.floor(total * 1.5);
  }

  return total;
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_CELL': {
      if (state.status !== 'playing') return state;
      const { position } = action;
      const { selectedCells, selectionDirection, board } = state;

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
        };
      }

      // If no cells selected, start selection
      if (selectedCells.length === 0) {
        tapHaptic();
        soundManager.playSound('tap');
        return {
          ...state,
          selectedCells: [position],
          selectionDirection: null,
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
        // Start new selection
        tapHaptic();
        soundManager.playSound('tap');
        return {
          ...state,
          selectedCells: [position],
          selectionDirection: null,
        };
      }

      tapHaptic();
      soundManager.playSound('tap');
      const newSelected = [...selectedCells, position];
      return {
        ...state,
        selectedCells: newSelected,
        selectionDirection: newDir,
      };
    }

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedCells: [],
        selectionDirection: null,
      };

    case 'SUBMIT_WORD': {
      if (state.status !== 'playing') return state;
      const { selectedCells, board, mode } = state;
      if (selectedCells.length === 0) return state;

      const word = getSelectedWord(board.grid, selectedCells);

      // Check if it matches a remaining target word
      const wordIndex = board.words.findIndex(
        w => !w.found && w.word === word
      );

      if (wordIndex === -1) {
        // Not a target word - clear selection
        errorHaptic();
        soundManager.playSound('wordInvalid');

        // Perfect solve mode: any wrong tap = fail
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
      wordFoundHaptic();
      soundManager.playSound('wordFound');

      // Save history for undo
      const historyEntry = {
        grid: cloneGrid(board.grid),
        words: board.words.map(w => ({ ...w })),
      };

      // Remove letters and apply gravity (respecting frozen columns)
      const gridAfterRemoval = removeCells(board.grid, selectedCells);
      const newGrid = applyGravityWithFrozen(gridAfterRemoval, state.frozenColumns);

      // Update word status
      const newWords = board.words.map((w, i) =>
        i === wordIndex ? { ...w, found: true } : { ...w }
      );

      // Calculate score
      const comboLevel = state.combo + 1;
      const newCascadeMultiplier = mode === 'cascade'
        ? state.cascadeMultiplier + 0.25
        : state.cascadeMultiplier;
      const wordScore = calculateScore(word, comboLevel, mode, newCascadeMultiplier);

      if (comboLevel > 1) {
        comboHaptic();
        soundManager.playSound('combo');
      }

      // Check win condition
      const allFound = newWords.every(w => w.found);
      const newMoves = state.moves + 1;

      // Check limited moves failure
      let newStatus: GameStatus = allFound ? 'won' : 'playing';
      if (mode === 'limitedMoves' && state.maxMoves > 0 && newMoves >= state.maxMoves && !allFound) {
        newStatus = 'failed';
      }

      if (allFound) {
        successHaptic();
        soundManager.playSound('puzzleComplete');
      }

      const newState: GameState = {
        ...state,
        board: { ...board, grid: newGrid, words: newWords },
        selectedCells: [],
        selectionDirection: null,
        score: state.score + wordScore,
        moves: newMoves,
        combo: comboLevel,
        maxCombo: Math.max(state.maxCombo, comboLevel),
        cascadeMultiplier: newCascadeMultiplier,
        history: [...state.history, historyEntry],
        status: newStatus,
        frozenColumns: [], // Reset frozen columns after each move
        previewGrid: null, // Clear any preview
      };

      return newState;
    }

    case 'USE_HINT': {
      if (state.hintsLeft <= 0 || state.status !== 'playing') return state;

      const remainingWords = state.board.words
        .filter(w => !w.found)
        .map(w => w.word);

      const hint = getHint(state.board.grid, remainingWords);
      if (!hint) return state;

      soundManager.playSound('hintUsed');

      return {
        ...state,
        selectedCells: hint.positions,
        selectionDirection:
          hint.positions.length >= 2 &&
          hint.positions[0].row === hint.positions[1].row
            ? 'horizontal'
            : 'vertical',
        hintsLeft: state.hintsLeft - 1,
        perfectRun: false,
      };
    }

    case 'UNDO_MOVE': {
      if (state.history.length === 0) return state;
      // Allow undo in 'playing' state, or when 'failed' (to recover from dead-ends/perfectSolve)
      if (state.status !== 'playing' && state.status !== 'failed') return state;
      if (state.undosLeft <= 0) return state;

      const lastHistory = state.history[state.history.length - 1];
      soundManager.playSound('undoUsed');

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
        combo: 0,
        cascadeMultiplier: state.mode === 'cascade' ? 1 : state.cascadeMultiplier,
        perfectRun: false,
        status: 'playing', // Reset status so player can continue after undo
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
        cascadeMultiplier: state.mode === 'cascade' ? 1 : state.cascadeMultiplier,
      };

    case 'TICK_TIMER': {
      if (state.status !== 'playing' || state.timeRemaining <= 0) return state;
      const newTime = state.timeRemaining - 1;
      if (newTime <= 0) {
        return { ...state, timeRemaining: 0, status: 'timeout' };
      }
      return { ...state, timeRemaining: newTime };
    }

    case 'SHUFFLE_FILLER': {
      if (state.status !== 'playing') return state;
      // Shuffle all non-word cells
      const { grid, words } = state.board;
      const newGrid = cloneGrid(grid);

      // Collect positions that are part of words
      const wordPositions = new Set<string>();
      words.forEach(w => {
        if (!w.found) {
          // Find where this word currently is
          const occurrences = findWordInGrid(newGrid, w.word);
          if (occurrences.length > 0) {
            occurrences[0].forEach(pos => wordPositions.add(`${pos.row},${pos.col}`));
          }
        }
      });

      // Shuffle non-word cells
      const vowels = 'AEIOU';
      const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
      for (let r = 0; r < newGrid.length; r++) {
        for (let c = 0; c < newGrid[0].length; c++) {
          if (newGrid[r][c] && !wordPositions.has(`${r},${c}`)) {
            const useVowel = Math.random() < 0.35;
            const pool = useVowel ? vowels : consonants;
            newGrid[r][c] = {
              ...newGrid[r][c]!,
              letter: pool[Math.floor(Math.random() * pool.length)],
            };
          }
        }
      }

      return {
        ...state,
        board: { ...state.board, grid: newGrid },
      };
    }

    case 'FREEZE_COLUMN': {
      if (state.status !== 'playing') return state;
      if (state.boosterCounts.freezeColumn <= 0) return state;
      const { col } = action;
      // Toggle frozen column
      const isFrozen = state.frozenColumns.includes(col);
      const newFrozen = isFrozen
        ? state.frozenColumns.filter(c => c !== col)
        : [...state.frozenColumns, col];
      return {
        ...state,
        frozenColumns: newFrozen,
        boosterCounts: isFrozen
          ? { ...state.boosterCounts, freezeColumn: state.boosterCounts.freezeColumn + 1 }
          : { ...state.boosterCounts, freezeColumn: state.boosterCounts.freezeColumn - 1 },
      };
    }

    case 'PREVIEW_MOVE': {
      if (state.status !== 'playing') return state;
      const { positions } = action;
      if (positions.length === 0) {
        // Clear preview
        return { ...state, previewGrid: null };
      }
      // Show what the board would look like after removing these cells
      const previewResult = removeCellsAndApplyGravity(state.board.grid, positions);
      return { ...state, previewGrid: previewResult };
    }

    case 'USE_BOOSTER': {
      if (state.status !== 'playing') return state;
      const { booster } = action;
      if (booster === 'shuffleFiller' && state.boosterCounts.shuffleFiller > 0) {
        // Delegate to SHUFFLE_FILLER logic
        const { grid: bGrid, words: bWords } = state.board;
        const newBGrid = cloneGrid(bGrid);
        const bWordPositions = new Set<string>();
        bWords.forEach(w => {
          if (!w.found) {
            const occurrences = findWordInGrid(newBGrid, w.word);
            if (occurrences.length > 0) {
              occurrences[0].forEach(pos => bWordPositions.add(`${pos.row},${pos.col}`));
            }
          }
        });
        const bVowels = 'AEIOU';
        const bConsonants = 'BCDFGHJKLMNPQRSTVWXYZ';
        for (let r = 0; r < newBGrid.length; r++) {
          for (let c = 0; c < newBGrid[0].length; c++) {
            if (newBGrid[r][c] && !bWordPositions.has(`${r},${c}`)) {
              const useV = Math.random() < 0.35;
              const pool = useV ? bVowels : bConsonants;
              newBGrid[r][c] = {
                ...newBGrid[r][c]!,
                letter: pool[Math.floor(Math.random() * pool.length)],
              };
            }
          }
        }
        return {
          ...state,
          board: { ...state.board, grid: newBGrid },
          boosterCounts: { ...state.boosterCounts, shuffleFiller: state.boosterCounts.shuffleFiller - 1 },
        };
      }
      if (booster === 'boardPreview' && state.boosterCounts.boardPreview > 0) {
        // Board preview is activated — handled via UI state, just track usage
        return {
          ...state,
          boosterCounts: { ...state.boosterCounts, boardPreview: state.boosterCounts.boardPreview - 1 },
        };
      }
      return state;
    }

    default:
      return state;
  }
}

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
  useEffect(() => {
    if (mode !== 'timePressure' || state.status !== 'playing' || state.timeRemaining <= 0) return;

    const interval = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, state.status, state.timeRemaining]);

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

  const newGame = useCallback((board: Board, newLevel: number, newMode?: GameMode, newMaxMoves?: number, newTimeLimit?: number) => {
    dispatch({ type: 'NEW_GAME', board, level: newLevel, mode: newMode, maxMoves: newMaxMoves, timeRemaining: newTimeLimit });
  }, []);

  const shuffleFiller = useCallback(() => {
    dispatch({ type: 'SHUFFLE_FILLER' });
  }, []);

  const freezeColumn = useCallback((col: number) => {
    dispatch({ type: 'FREEZE_COLUMN', col });
  }, []);

  const previewMove = useCallback((positions: CellPosition[]) => {
    dispatch({ type: 'PREVIEW_MOVE', positions });
  }, []);

  const clearPreview = useCallback(() => {
    dispatch({ type: 'PREVIEW_MOVE', positions: [] });
  }, []);

  const useBooster = useCallback((booster: string) => {
    dispatch({ type: 'USE_BOOSTER', booster });
  }, []);

  // Get the currently forming word
  const currentWord = getSelectedWord(state.board.grid, state.selectedCells);

  // Check if current selection matches a target word
  const remainingWords = state.board.words
    .filter(w => !w.found)
    .map(w => w.word);
  const isValidWord = remainingWords.includes(currentWord);

  // Check if we're in a dead-end state
  const isStuck =
    state.status === 'playing' &&
    state.board.words.some(w => !w.found) &&
    isDeadEnd(state.board.grid, remainingWords);

  // Calculate stars
  const totalWords = state.board.words.length;
  const foundWords = state.board.words.filter(w => w.found).length;
  const stars =
    state.status === 'won'
      ? state.perfectRun && state.moves <= totalWords
        ? 3
        : state.moves <= totalWords + 1
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
    newGame,
    shuffleFiller,
    freezeColumn,
    previewMove,
    clearPreview,
    useBooster,
    currentWord,
    isValidWord,
    isStuck,
    stars,
    foundWords,
    totalWords,
    remainingWords,
  };
}
