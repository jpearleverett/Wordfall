import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
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
import { findWordInGrid, isWordInGrid, isDeadEnd, isDeadEndGravityFlip, isDeadEndNoGravity, getHint, isSolvable, isSolvableGravityFlip, areAllWordsIndependentlyFindable, getHintShrinkingBoard, isDeadEndShrinkingBoard } from '../engine/solver';
import { INITIAL_HINTS, INITIAL_UNDOS, SCORE, MODE_CONFIGS } from '../constants';
import { instrumentReducer } from '../utils/perfInstrument';
import { createGameStore, GameStore } from '../stores/gameStore';
import {
  loadPuzzleSnapshot,
  savePuzzleSnapshot,
  clearPuzzleSnapshot,
  snapshotMatchesTarget,
} from '../services/puzzleSnapshot';

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
  captureReplay: boolean = false,
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
    mode,
    timeRemaining,
    perfectRun: true,
    gravityDirection: 'down',
    shrinkCount: 0,
    wordsUntilShrink: 2,
    wildcardCells: [],
    wildcardMode: false,
    spotlightActive: false,
    spotlightLetters: [],
    boosterCounts: {
      wildcardTile: 0,
      spotlight: 0,
      smartShuffle: 0,
    },
    lastInvalidTap: null,
    lastSelectionResetTap: null,
    solveSequence: [],
    puzzleStartTime: Date.now(),
    scoreDoubler: false,
    boardFreezeActive: false,
    premiumHintUsed: false,
    boostersUsedThisPuzzle: [],
    activeComboType: null,
    comboWordsRemaining: 0,
    comboMultiplier: 1,
    captureReplay,
  };
}

// Shared sentinel used when captureReplay is false so every solve step can
// share the same empty 2D array reference instead of allocating fresh ones.
const EMPTY_SNAPSHOT: string[][] = [];

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
 * Exported for reuse in PlayField's wildcard-aware validity check.
 */
export function matchesWord(
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
  mode: GameMode,
): number {
  let total = SCORE.wordFound + word.length * SCORE.bonusPerLetter;

  const modeConfig = MODE_CONFIGS[mode];
  if (modeConfig) {
    total = Math.floor(total * modeConfig.rules.scoreMultiplier);
  }

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

/**
 * Pure selection step. Given a state and a newly-pressed position, returns
 * the next state. Extracted so both SELECT_CELL and SELECT_CELLS (batched)
 * can apply the same logic without duplication. Preserves exact semantics
 * of the original SELECT_CELL case so existing tests continue to pass.
 */
function applySelectionStep(state: GameState, position: CellPosition): GameState {
  if (state.status !== 'playing') return state;
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
    const nextUsed = state.boostersUsedThisPuzzle.includes('wildcardTile')
      ? state.boostersUsedThisPuzzle
      : [...state.boostersUsedThisPuzzle, 'wildcardTile'];
    return {
      ...state,
      board: { ...board, grid: newGrid },
      wildcardMode: false,
      wildcardCells: [position],
      boosterCounts: { ...state.boosterCounts, wildcardTile: state.boosterCounts.wildcardTile - 1 },
      boostersUsedThisPuzzle: nextUsed,
    };
  }

  if (!board.grid[position.row]?.[position.col]) return state;

  // Only rewrite lastInvalidTap / lastSelectionResetTap when the target value
  // differs from the current one. Writing `null` over an already-null field
  // creates a new state object reference for GameScreen's zustand subscribers
  // to compare, and (worse) causes a re-render when the previous value was
  // non-null even though the user was just making another normal tap.
  const clearInvalidTap = state.lastInvalidTap === null
    ? undefined
    : { lastInvalidTap: null };
  const clearSelectionResetTap = state.lastSelectionResetTap === null
    ? undefined
    : { lastSelectionResetTap: null };

  // If tapping an already selected cell, deselect from that point
  const existingIndex = selectedCells.findIndex(
    c => c.row === position.row && c.col === position.col
  );
  if (existingIndex >= 0) {
    const newSelected = selectedCells.slice(0, existingIndex);
    return {
      ...state,
      ...clearInvalidTap,
      ...clearSelectionResetTap,
      selectedCells: newSelected,
      selectionDirection: newSelected.length < 2 ? null : selectionDirection,
    };
  }

  // If no cells selected, start selection
  if (selectedCells.length === 0) {
    return {
      ...state,
      ...clearInvalidTap,
      ...clearSelectionResetTap,
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
    // A non-adjacent tap resets the selection and records the tap as a
    // "selection reset" marker so GameScreen can flash it. The reset tap
    // intentionally overrides the clear above.
    return {
      ...state,
      ...clearInvalidTap,
      selectedCells: [position],
      selectionDirection: null,
      lastSelectionResetTap: position,
    };
  }

  const newSelected = [...selectedCells, position];
  return {
    ...state,
    ...clearInvalidTap,
    ...clearSelectionResetTap,
    selectedCells: newSelected,
    selectionDirection: newDir,
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_CELL': {
      return applySelectionStep(state, action.position);
    }

    case 'SELECT_CELLS': {
      // Batched selection from the Grid pan handler. The handler collects
      // cell crossings during a single animation frame and dispatches them
      // once here, producing one new state object regardless of how many
      // cells were traversed. Semantics are identical to N back-to-back
      // SELECT_CELL dispatches.
      if (action.positions.length === 0) return state;
      let next = state;
      for (let i = 0; i < action.positions.length; i++) {
        next = applySelectionStep(next, action.positions[i]);
      }
      return next;
    }

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedCells: [],
        selectionDirection: null,
        lastInvalidTap: null,
        lastSelectionResetTap: null,
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

      // Score (base + optional score doubler + optional booster-combo multiplier)
      let wordScore = calculateScore(matchingWord.word, mode);
      const scoreDoublerConsumed = state.scoreDoubler;
      if (scoreDoublerConsumed) {
        wordScore *= 2;
      }
      const boosterComboActive = state.comboWordsRemaining > 0 && state.comboMultiplier > 1;
      if (boosterComboActive) {
        wordScore = Math.floor(wordScore * state.comboMultiplier);
      }
      const nextComboWordsRemaining = boosterComboActive
        ? state.comboWordsRemaining - 1
        : state.comboWordsRemaining;
      const comboExpired = boosterComboActive && nextComboWordsRemaining <= 0;

      // Check win condition
      const allFound = newWords.every(w => w.found);
      const newMoves = state.moves + 1;
      let newStatus: GameStatus = allFound ? 'won' : 'playing';

      // Shrinking board: apply shrink after every 2 words
      let newShrinkCount = state.shrinkCount;
      let newWordsUntilShrink = state.wordsUntilShrink - 1;
      let newBoardFreezeActive = state.boardFreezeActive;

      if (mode === 'shrinkingBoard' && !allFound && newWordsUntilShrink <= 0) {
        if (state.boardFreezeActive) {
          // Board freeze active — skip shrink this turn, consume the freeze
          newBoardFreezeActive = false;
          newWordsUntilShrink = 2; // reset countdown without shrinking
        } else {
          // Time to shrink — remove outer ring, no gravity (cells stay in place).
          // The "did we just make the puzzle unwinnable?" check
          // (areAllWordsIndependentlyFindable, ~N × DFS over the grid) used
          // to run synchronously here, blocking the frame the shrink
          // animates on. It's now deferred to a useEffect keyed on
          // shrinkCount which dispatches MARK_FAILED if the shrink was
          // lethal. The failure modal animates in over ~200ms so a
          // one-frame deferral is invisible.
          const outerRing = getOuterRing(newGrid);
          if (outerRing.length > 0) {
            newGrid = removeCells(newGrid, outerRing);
            newShrinkCount = state.shrinkCount + 1;
          }
          newWordsUntilShrink = 2; // reset countdown
        }
      }

      // Clean up wildcard if it was used in this word
      const wildcardSet = new Set(state.wildcardCells.map(c => `${c.row},${c.col}`));
      const usedWildcard = selectedCells.some(c => wildcardSet.has(`${c.row},${c.col}`));
      const newWildcardCells = usedWildcard ? [] : state.wildcardCells;

      // Record solve step for replay. Snapshot capture is opt-in
      // (captureReplay on state) because gridToSnapshot is ~1ms per call and
      // most puzzles never have their replay viewed. Dailies/events opt in.
      const captureReplay = state.captureReplay;
      const solveStep: SolveStep = {
        wordFound: matchingWord.word,
        cellPositions: selectedCells.map(c => [c.row, c.col] as [number, number]),
        gridStateBefore: captureReplay ? gridToSnapshot(board.grid) : EMPTY_SNAPSHOT,
        gridStateAfter: captureReplay ? gridToSnapshot(newGrid) : EMPTY_SNAPSHOT,
        timestamp: Date.now() - state.puzzleStartTime,
        score: wordScore,
      };

      return {
        ...state,
        board: { ...board, grid: newGrid, words: newWords },
        selectedCells: [],
        selectionDirection: null,
        score: state.score + wordScore,
        moves: newMoves,
        history: [...state.history, historyEntry],
        status: newStatus,
        gravityDirection: newGravityDirection,
        shrinkCount: newShrinkCount,
        wordsUntilShrink: newWordsUntilShrink,
        wildcardCells: newWildcardCells,
        spotlightActive: false,
        spotlightLetters: [],
        solveSequence: [...state.solveSequence, solveStep],
        scoreDoubler: scoreDoublerConsumed ? false : state.scoreDoubler,
        boardFreezeActive: newBoardFreezeActive,
        comboWordsRemaining: comboExpired ? 0 : nextComboWordsRemaining,
        activeComboType: comboExpired ? null : state.activeComboType,
        comboMultiplier: comboExpired ? 1 : state.comboMultiplier,
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
        perfectRun: false,
        status: 'playing',
        gravityDirection: prevDirection,
        shrinkCount: prevShrinkCount,
        wordsUntilShrink: prevWordsUntilShrink,
        // Reset temporary booster states since board changed
        spotlightActive: false,
        spotlightLetters: [],
        wildcardMode: false,
        wildcardCells: [],
      };
    }

    case 'NEW_GAME':
      return createInitialState(
        action.board,
        action.level,
        action.mode || 'classic',
        action.maxMoves || 0,
        action.timeRemaining || 0,
        // Carry captureReplay across NEW_GAME so successive puzzles in a
        // session inherit the flag (daily replays stay daily; classic stays
        // lightweight).
        state.captureReplay,
      );

    case 'HYDRATE_FROM_SNAPSHOT':
      // Restore a prior in-flight puzzle. The serialized snapshot already
      // contains a complete GameState; we trust it verbatim here and rely
      // on GameScreen to only dispatch this action when the stored snapshot
      // matches the intended level/mode. Clears transient fields that
      // shouldn't survive the background -> foreground transition.
      return {
        ...action.state,
        selectedCells: [],
        selectionDirection: null,
        lastInvalidTap: null,
        lastSelectionResetTap: null,
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
      const nextUsed = state.boostersUsedThisPuzzle.includes('wildcardTile')
        ? state.boostersUsedThisPuzzle
        : [...state.boostersUsedThisPuzzle, 'wildcardTile'];
      return {
        ...state,
        wildcardMode: false,
        wildcardCells: [position],
        boosterCounts: { ...state.boosterCounts, wildcardTile: state.boosterCounts.wildcardTile - 1 },
        boostersUsedThisPuzzle: nextUsed,
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

      const nextUsed = state.boostersUsedThisPuzzle.includes('spotlight')
        ? state.boostersUsedThisPuzzle
        : [...state.boostersUsedThisPuzzle, 'spotlight'];
      return {
        ...state,
        spotlightActive: true,
        spotlightLetters: [...relevantLetters],
        boosterCounts: { ...state.boosterCounts, spotlight: state.boosterCounts.spotlight - 1 },
        boostersUsedThisPuzzle: nextUsed,
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

      // Single-pass shuffle (Fix D, April 2026). Because wordCellSet is
      // preserved, every remaining word's path is identical after the
      // shuffle — so `isWordInGrid` is guaranteed to succeed for all of
      // them. We still run the check on the first attempt as a
      // defence-in-depth assertion; only in the (impossible at current
      // time of writing) case where the assertion fails do we fall back
      // to the legacy multi-attempt loop. This cuts the worst-case
      // booster latency from 10 × N × DFS scans to N × DFS scans.
      const randomiseNonWordCells = (src: typeof grid) => {
        const out = cloneGrid(src);
        for (let r = 0; r < out.length; r++) {
          for (let c = 0; c < out[0].length; c++) {
            if (out[r][c] && !wordCellSet.has(`${r},${c}`)) {
              const useVowel = Math.random() < 0.35;
              const pool = useVowel ? vowels : consonants;
              out[r][c] = {
                ...out[r][c]!,
                letter: pool[Math.floor(Math.random() * pool.length)],
              };
            }
          }
        }
        return out;
      };

      const applyShuffle = (newGrid: typeof grid) => {
        const nextUsed = state.boostersUsedThisPuzzle.includes('smartShuffle')
          ? state.boostersUsedThisPuzzle
          : [...state.boostersUsedThisPuzzle, 'smartShuffle'];
        return {
          ...state,
          board: { ...state.board, grid: newGrid },
          boosterCounts: { ...state.boosterCounts, smartShuffle: state.boosterCounts.smartShuffle - 1 },
          // Reset spotlight since board letters changed
          spotlightActive: false,
          spotlightLetters: [],
          boostersUsedThisPuzzle: nextUsed,
        };
      };

      const firstAttempt = randomiseNonWordCells(grid);
      if (remainingWords.every(w => isWordInGrid(firstAttempt, w))) {
        return applyShuffle(firstAttempt);
      }

      // Defensive fallback: the assertion only fires if a word path overlapped
      // itself and got disturbed by the shuffle. Retry up to 9 more times.
      for (let attempt = 1; attempt < 10; attempt++) {
        const newGrid = randomiseNonWordCells(grid);
        if (remainingWords.every(w => isWordInGrid(newGrid, w))) {
          return applyShuffle(newGrid);
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

    case 'GRANT_BOOSTER': {
      const { booster } = action;
      return {
        ...state,
        boosterCounts: {
          ...state.boosterCounts,
          [booster]: (state.boosterCounts[booster as keyof typeof state.boosterCounts] ?? 0) + 1,
        },
      };
    }

    case 'USE_PREMIUM_HINT': {
      if (state.status !== 'playing') return state;

      const remainingWords = state.board.words
        .filter(w => !w.found)
        .map(w => w.word);

      // Premium hint: reveal the exact next word (same as USE_HINT but marked as premium)
      const hint = state.mode === 'shrinkingBoard'
        ? getHintShrinkingBoard(state.board.grid, remainingWords, state.wordsUntilShrink)
        : getHint(state.board.grid, remainingWords);
      if (!hint) return state;

      return {
        ...state,
        selectedCells: hint.positions,
        selectionDirection: null,
        premiumHintUsed: true,
        // Premium hints do not consume hint tokens or count as hintsUsed (no star penalty)
      };
    }

    case 'ACTIVATE_SCORE_DOUBLER': {
      if (state.status !== 'playing') return state;
      return {
        ...state,
        scoreDoubler: true,
      };
    }

    case 'ACTIVATE_BOARD_FREEZE': {
      if (state.status !== 'playing') return state;
      return {
        ...state,
        boardFreezeActive: true,
      };
    }

    case 'ACTIVATE_BOOSTER_COMBO': {
      if (state.status !== 'playing') return state;
      const { comboType, multiplier, wordsDuration } = action;
      return {
        ...state,
        activeComboType: comboType,
        comboMultiplier: multiplier,
        comboWordsRemaining: wordsDuration,
      };
    }

    case 'EXPIRE_BOOSTER_COMBO': {
      return {
        ...state,
        activeComboType: null,
        comboMultiplier: 1,
        comboWordsRemaining: 0,
      };
    }

    case 'MARK_FAILED': {
      // Dispatched from the deferred shrink-solvability effect. Ignore
      // stale checks (an older shrink number) so a slow check from N-1
      // can't retroactively fail the player after they've already
      // recovered in the N-th shrink.
      if (state.status !== 'playing') return state;
      if (action.shrinkCount !== state.shrinkCount) return state;
      return { ...state, status: 'failed' };
    }

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
  captureReplay: boolean = false,
) {
  // Create a zustand store wrapping the existing gameReducer. Created once on
  // mount — subsequent puzzles are loaded via NEW_GAME dispatch which resets
  // the store state without recreating the store instance.
  const store = useMemo(
    () => createGameStore(initialBoard, level, mode, maxMoves, timeLimit, captureReplay),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── In-puzzle state persistence (crash / background recovery) ────────
  // On first mount, try to hydrate from a snapshot that matches the
  // target (level, mode). While the player is playing, save a snapshot
  // on AppState 'background' so an OS kill during a background pause
  // doesn't lose the puzzle. Clear the snapshot on terminal status
  // ('won' | 'failed' | 'timeout') so next launch starts fresh.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const snap = await loadPuzzleSnapshot();
      if (cancelled || !snap) return;
      if (!snapshotMatchesTarget(snap, level, mode)) {
        // Stale snapshot for a different level/mode — discard so the
        // next mount of a matching level can start clean.
        await clearPuzzleSnapshot();
        return;
      }
      store.dispatch({ type: 'HYDRATE_FROM_SNAPSHOT', state: snap.state });
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (next: AppStateStatus) => {
      if (next !== 'background' && next !== 'inactive') return;
      const current = store.getState();
      // chapterId isn't threaded through useGame — we pass level as a
      // stand-in. The snapshot's own level is what we actually match on.
      void savePuzzleSnapshot(current, level);
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [store, level]);

  // ── Narrow selectors for effects that need reactive reads ────────────
  const status = useStore(store, s => s.status);
  const timeRemaining = useStore(store, s => s.timeRemaining);
  const grid = useStore(store, s => s.board.grid);
  const words = useStore(store, useShallow((s: GameState) => s.board.words));
  const gravityDirection = useStore(store, s => s.gravityDirection);
  const moves = useStore(store, s => s.moves);
  const wordsUntilShrink = useStore(store, s => s.wordsUntilShrink);
  const hintsUsed = useStore(store, s => s.hintsUsed);
  const shrinkCount = useStore(store, s => s.shrinkCount);

  // ── Derived (changes per word, not per tap) ──────────────────────────
  const foundWords = useMemo(() => words.filter(w => w.found).length, [words]);
  const totalWords = words.length;
  const remainingWords = useMemo(
    () => words.filter(w => !w.found).map(w => w.word),
    [words],
  );
  const solveSequence = useStore(store, useShallow((s: GameState) => s.solveSequence));

  // Clear the persistence snapshot as soon as the puzzle reaches a
  // terminal state so next launch starts fresh instead of prompting
  // a resume for a puzzle that's already done.
  useEffect(() => {
    if (status === 'won' || status === 'failed' || status === 'timeout') {
      void clearPuzzleSnapshot();
    }
  }, [status]);

  // ── Deferred shrink-solvability check (Fix B) ────────────────────────
  // The reducer performs the shrink synchronously (so the visual board
  // shrink is in the same frame as the word clear) but does NOT check
  // whether the shrink left the puzzle solvable — that's ~N × DFS of
  // `areAllWordsIndependentlyFindable` and was the top reducer-time
  // contributor in shrinkingBoard mode. We run the check here in an
  // effect, one commit later, and dispatch `MARK_FAILED` if the puzzle
  // became unwinnable. The failure modal animates in over ~200ms so a
  // one-frame deferral is invisible to the player.
  useEffect(() => {
    if (mode !== 'shrinkingBoard') return;
    if (shrinkCount === 0) return;
    if (status !== 'playing') return;
    if (remainingWords.length === 0) return;

    const stillSolvable = areAllWordsIndependentlyFindable(grid, remainingWords);
    if (!stillSolvable) {
      store.dispatch({ type: 'MARK_FAILED', shrinkCount });
    }
    // We intentionally depend on `shrinkCount` rather than `grid` so the
    // check only runs when the board actually shrank (not on every word).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shrinkCount]);

  // ── Stars ────────────────────────────────────────────────────────────
  const stars =
    status === 'won'
      ? hintsUsed === 0 && moves <= totalWords
        ? 3
        : hintsUsed <= 1 && moves <= totalWords + 1
        ? 2
        : 1
      : 0;

  // ── Timer for timed modes ────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'timePressure' || status !== 'playing' || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      if (store.getState().status === 'playing') {
        store.dispatch({ type: 'TICK_TIMER' });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, status, timeRemaining <= 0, store]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── isStuck (debounced DFS — mode-aware) ─────────────────────────────
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    if (status !== 'playing' || remainingWords.length === 0) {
      setIsStuck(false);
      return;
    }

    const DEBOUNCE_MS = 500;

    if (mode === 'shrinkingBoard') {
      const timer = setTimeout(() => {
        setIsStuck(isDeadEndShrinkingBoard(grid, remainingWords, wordsUntilShrink));
      }, DEBOUNCE_MS);
      return () => clearTimeout(timer);
    }

    if (mode === 'noGravity') {
      const timer = setTimeout(() => {
        setIsStuck(isDeadEndNoGravity(grid, remainingWords));
      }, DEBOUNCE_MS);
      return () => clearTimeout(timer);
    }

    if (mode === 'gravityFlip') {
      const timer = setTimeout(() => {
        setIsStuck(isDeadEndGravityFlip(grid, remainingWords, gravityDirection, moves));
      }, DEBOUNCE_MS);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setIsStuck(isDeadEnd(grid, remainingWords));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [foundWords, status, grid, remainingWords, mode, gravityDirection, moves, wordsUntilShrink]);

  // ── Action dispatchers (all stable — store.dispatch never changes) ───
  const selectCell = useCallback((position: CellPosition) => {
    store.dispatch({ type: 'SELECT_CELL', position });
  }, [store]);

  const selectCells = useCallback((positions: CellPosition[]) => {
    if (positions.length === 0) return;
    store.dispatch({ type: 'SELECT_CELLS', positions });
  }, [store]);

  const clearSelection = useCallback(() => {
    store.dispatch({ type: 'CLEAR_SELECTION' });
  }, [store]);

  const submitWord = useCallback(() => {
    store.dispatch({ type: 'SUBMIT_WORD' });
  }, [store]);

  const useHintAction = useCallback(() => {
    store.dispatch({ type: 'USE_HINT' });
  }, [store]);

  const undoMove = useCallback(() => {
    store.dispatch({ type: 'UNDO_MOVE' });
  }, [store]);

  const grantHint = useCallback(() => {
    store.dispatch({ type: 'GRANT_HINT' });
  }, [store]);

  const grantUndo = useCallback(() => {
    store.dispatch({ type: 'GRANT_UNDO' });
  }, [store]);

  const grantBooster = useCallback((booster: 'wildcardTile' | 'spotlight' | 'smartShuffle') => {
    store.dispatch({ type: 'GRANT_BOOSTER', booster });
  }, [store]);

  const newGame = useCallback((board: Board, newLevel: number, newMode?: GameMode, newMaxMoves?: number, newTimeLimit?: number) => {
    store.dispatch({ type: 'NEW_GAME', board, level: newLevel, mode: newMode, maxMoves: newMaxMoves, timeRemaining: newTimeLimit });
  }, [store]);

  const activateWildcard = useCallback(() => {
    store.dispatch({ type: 'USE_BOOSTER', booster: 'wildcardTile' });
  }, [store]);

  const activateSpotlight = useCallback(() => {
    store.dispatch({ type: 'USE_BOOSTER', booster: 'spotlight' });
  }, [store]);

  const activateSmartShuffle = useCallback(() => {
    store.dispatch({ type: 'USE_BOOSTER', booster: 'smartShuffle' });
  }, [store]);

  const useBooster = useCallback((booster: string) => {
    store.dispatch({ type: 'USE_BOOSTER', booster });
  }, [store]);

  const usePremiumHint = useCallback(() => {
    store.dispatch({ type: 'USE_PREMIUM_HINT' });
  }, [store]);

  const activateScoreDoubler = useCallback(() => {
    store.dispatch({ type: 'ACTIVATE_SCORE_DOUBLER' });
  }, [store]);

  const activateBoardFreeze = useCallback(() => {
    store.dispatch({ type: 'ACTIVATE_BOARD_FREEZE' });
  }, [store]);

  const activateBoosterCombo = useCallback(
    (comboType: string, multiplier: number, wordsDuration: number) => {
      store.dispatch({ type: 'ACTIVATE_BOOSTER_COMBO', comboType, multiplier, wordsDuration });
    },
    [store],
  );

  const expireBoosterCombo = useCallback(() => {
    store.dispatch({ type: 'EXPIRE_BOOSTER_COMBO' });
  }, [store]);

  return {
    store,
    selectCell,
    selectCells,
    clearSelection,
    submitWord,
    useHint: useHintAction,
    undoMove,
    grantHint,
    grantUndo,
    grantBooster,
    newGame,
    activateWildcard,
    activateSpotlight,
    activateSmartShuffle,
    useBooster,
    usePremiumHint,
    activateScoreDoubler,
    activateBoardFreeze,
    activateBoosterCombo,
    expireBoosterCombo,
    isStuck,
    stars,
    foundWords,
    totalWords,
    remainingWords,
    solveSequence,
  };
}
