import { useReducer, useCallback, useRef } from 'react';
import {
  GameState,
  GameAction,
  Board,
  CellPosition,
  Direction,
  WordPlacement,
} from '../types';
import { removeCellsAndApplyGravity, cloneGrid } from '../engine/gravity';
import { findWordInGrid, isDeadEnd, getHint } from '../engine/solver';
import { INITIAL_HINTS, INITIAL_UNDOS, SCORE } from '../constants';

function createInitialState(board: Board, level: number): GameState {
  return {
    board: {
      ...board,
      words: board.words.map(w => ({ ...w, found: false })),
    },
    selectedCells: [],
    selectionDirection: null,
    score: 0,
    moves: 0,
    hintsLeft: INITIAL_HINTS,
    undosLeft: INITIAL_UNDOS,
    history: [],
    status: 'playing',
    level,
    combo: 0,
    maxCombo: 0,
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

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_CELL': {
      if (state.status !== 'playing') return state;
      const { position } = action;
      const { selectedCells, selectionDirection, board } = state;

      // Check if cell has a letter
      if (!board.grid[position.row]?.[position.col]) return state;

      // If tapping an already selected cell, deselect from that point
      const existingIndex = selectedCells.findIndex(
        c => c.row === position.row && c.col === position.col
      );
      if (existingIndex >= 0) {
        // Deselect this and all after it
        const newSelected = selectedCells.slice(0, existingIndex);
        return {
          ...state,
          selectedCells: newSelected,
          selectionDirection: newSelected.length < 2 ? null : selectionDirection,
        };
      }

      // If no cells selected, start selection
      if (selectedCells.length === 0) {
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
        return {
          ...state,
          selectedCells: [position],
          selectionDirection: null,
        };
      }

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
      const { selectedCells, board } = state;
      if (selectedCells.length === 0) return state;

      const word = getSelectedWord(board.grid, selectedCells);

      // Check if it matches a remaining target word
      const wordIndex = board.words.findIndex(
        w => !w.found && w.word === word
      );

      if (wordIndex === -1) {
        // Not a target word - clear selection
        return { ...state, selectedCells: [], selectionDirection: null };
      }

      // Word found! Save history for undo
      const historyEntry = {
        grid: cloneGrid(board.grid),
        words: board.words.map(w => ({ ...w })),
      };

      // Remove letters and apply gravity
      const newGrid = removeCellsAndApplyGravity(board.grid, selectedCells);

      // Update word status
      const newWords = board.words.map((w, i) =>
        i === wordIndex ? { ...w, found: true } : { ...w }
      );

      // Calculate score
      const comboLevel = state.combo + 1;
      const baseScore =
        SCORE.wordFound + word.length * SCORE.bonusPerLetter;
      const comboBonus = Math.floor(
        baseScore * (comboLevel - 1) * SCORE.comboMultiplier
      );
      const wordScore = baseScore + comboBonus;

      // Check win condition
      const allFound = newWords.every(w => w.found);

      const newState: GameState = {
        ...state,
        board: { ...board, grid: newGrid, words: newWords },
        selectedCells: [],
        selectionDirection: null,
        score: state.score + wordScore,
        moves: state.moves + 1,
        combo: comboLevel,
        maxCombo: Math.max(state.maxCombo, comboLevel),
        history: [...state.history, historyEntry],
        status: allFound ? 'won' : 'playing',
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

      // Select the hint word's positions
      return {
        ...state,
        selectedCells: hint.positions,
        selectionDirection:
          hint.positions.length >= 2 &&
          hint.positions[0].row === hint.positions[1].row
            ? 'horizontal'
            : 'vertical',
        hintsLeft: state.hintsLeft - 1,
      };
    }

    case 'UNDO_MOVE': {
      if (state.history.length === 0 || state.status !== 'playing')
        return state;
      if (state.undosLeft <= 0) return state;

      const lastHistory = state.history[state.history.length - 1];

      // Find which word was last found and un-find it
      const newWords = lastHistory.words;

      return {
        ...state,
        board: {
          ...state.board,
          grid: lastHistory.grid,
          words: newWords,
        },
        selectedCells: [],
        selectionDirection: null,
        moves: state.moves - 1,
        undosLeft: state.undosLeft - 1,
        history: state.history.slice(0, -1),
        combo: 0,
      };
    }

    case 'NEW_GAME':
      return createInitialState(action.board, action.level);

    case 'RESET_COMBO':
      return { ...state, combo: 0 };

    default:
      return state;
  }
}

export function useGame(initialBoard: Board, level: number) {
  const [state, dispatch] = useReducer(
    gameReducer,
    createInitialState(initialBoard, level)
  );

  const selectCell = useCallback((position: CellPosition) => {
    dispatch({ type: 'SELECT_CELL', position });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const submitWord = useCallback(() => {
    dispatch({ type: 'SUBMIT_WORD' });
  }, []);

  const useHint = useCallback(() => {
    dispatch({ type: 'USE_HINT' });
  }, []);

  const undoMove = useCallback(() => {
    dispatch({ type: 'UNDO_MOVE' });
  }, []);

  const newGame = useCallback((board: Board, newLevel: number) => {
    dispatch({ type: 'NEW_GAME', board, level: newLevel });
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
      ? state.hintsLeft >= INITIAL_HINTS && state.moves <= totalWords
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
    useHint,
    undoMove,
    newGame,
    currentWord,
    isValidWord,
    isStuck,
    stars,
    foundWords,
    totalWords,
    remainingWords,
  };
}
