/**
 * gameStore.ts — Zustand store wrapping the existing gameReducer.
 *
 * WHY ZUSTAND: React's useReducer returns a new `state` reference on every
 * dispatch. GameScreen (2530 lines) destructures `state` from useGame and
 * re-renders its entire tree on every SELECT_CELL tap — 50-100ms per tap
 * on a ~22-cell grid. With zustand, each component subscribes only to the
 * slice of state it needs (e.g. Grid subscribes to `selectedCells`, the
 * HUD subscribes to `score`). When a cell is tapped, ONLY the components
 * that read `selectedCells` re-render — not the full GameScreen.
 *
 * The existing gameReducer is reused verbatim via zustand's `redux`
 * middleware, so all 37 reducer tests still pass without modification.
 */
import React, { createContext, useContext } from 'react';
import { createStore, useStore } from 'zustand';
import { redux } from 'zustand/middleware';
import {
  GameState,
  GameAction,
  Board,
  GameMode,
  CellPosition,
} from '../types';
import { gameReducer, createInitialState } from '../hooks/useGame';
import { instrumentReducer } from '../utils/perfInstrument';

// ── Store type ──────────────────────────────────────────────────────────────

/** The zustand store shape: GameState + a `dispatch` function. */
export type GameStore = ReturnType<typeof createGameStore>;

// ── Store factory ───────────────────────────────────────────────────────────

/**
 * Create a new game store instance. Called once per GameScreen mount.
 * Uses the `redux` middleware so the existing `gameReducer` is the single
 * source of state transition logic — no duplication, no drift.
 */
export function createGameStore(
  initialBoard: Board,
  level: number,
  mode: GameMode = 'classic',
  maxMoves: number = 0,
  timeLimit: number = 0,
  captureReplay: boolean = false,
) {
  // Wrap with perf instrumentation in dev (same as useGame did).
  const timedReducer = __DEV__
    ? instrumentReducer(gameReducer)
    : gameReducer;

  const initial = createInitialState(initialBoard, level, mode, maxMoves, timeLimit, captureReplay);

  return createStore(redux(timedReducer, initial));
}

// ── React context ───────────────────────────────────────────────────────────

/**
 * Context that carries the per-GameScreen store instance down the tree.
 * The value is the store OBJECT (not the state), so it never changes
 * identity — subscribers use `useStore(store, selector)` internally.
 */
export const GameStoreContext = createContext<GameStore | null>(null);

/**
 * Convenience selector hook. Components call:
 *   const selectedCells = useGameStore(s => s.selectedCells);
 *   const score = useGameStore(s => s.score);
 * and ONLY re-render when the selected slice changes.
 */
export function useGameStore<T>(selector: (state: GameState & { dispatch: (action: GameAction) => void }) => T): T {
  const store = useContext(GameStoreContext);
  if (!store) {
    throw new Error('useGameStore must be used inside <GameStoreContext.Provider>');
  }
  return useStore(store, selector);
}

/**
 * Access the raw dispatch function without subscribing to any state.
 * Identity is stable (zustand guarantees dispatch never changes).
 */
export function useGameDispatch(): (action: GameAction) => void {
  return useGameStore(s => s.dispatch);
}

// ── Pre-built selectors ─────────────────────────────────────────────────────
// Each is a pure function so React can referentially cache the selector
// between renders. Components that use these get the narrowest possible
// subscription and only re-render when their specific slice changes.

export const selectSelectedCells = (s: GameState) => s.selectedCells;
export const selectGrid = (s: GameState) => s.board.grid;
export const selectWords = (s: GameState) => s.board.words;
export const selectStatus = (s: GameState) => s.status;
export const selectScore = (s: GameState) => s.score;
export const selectCombo = (s: GameState) => s.combo;
export const selectMaxCombo = (s: GameState) => s.maxCombo;
export const selectMoves = (s: GameState) => s.moves;
export const selectHintsLeft = (s: GameState) => s.hintsLeft;
export const selectHintsUsed = (s: GameState) => s.hintsUsed;
export const selectUndosLeft = (s: GameState) => s.undosLeft;
export const selectTimeRemaining = (s: GameState) => s.timeRemaining;
export const selectGravityDirection = (s: GameState) => s.gravityDirection;
export const selectWordsUntilShrink = (s: GameState) => s.wordsUntilShrink;
export const selectWildcardMode = (s: GameState) => s.wildcardMode;
export const selectWildcardCells = (s: GameState) => s.wildcardCells;
export const selectSpotlightActive = (s: GameState) => s.spotlightActive;
export const selectSpotlightLetters = (s: GameState) => s.spotlightLetters;
export const selectBoosterCounts = (s: GameState) => s.boosterCounts;
export const selectPerfectRun = (s: GameState) => s.perfectRun;
export const selectLastInvalidTap = (s: GameState) => s.lastInvalidTap;
export const selectHistory = (s: GameState) => s.history;
export const selectSolveSequence = (s: GameState) => s.solveSequence;
export const selectMode = (s: GameState) => s.mode;
export const selectBoardFreezeActive = (s: GameState) => s.boardFreezeActive;
export const selectScoreDoubler = (s: GameState) => s.scoreDoubler;
export const selectBoostersUsedThisPuzzle = (s: GameState) => s.boostersUsedThisPuzzle;
export const selectActiveComboType = (s: GameState) => s.activeComboType;
export const selectComboWordsRemaining = (s: GameState) => s.comboWordsRemaining;
export const selectComboMultiplier = (s: GameState) => s.comboMultiplier;
