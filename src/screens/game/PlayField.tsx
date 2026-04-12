/**
 * PlayField — subscribes to the fast-changing selection slice of game state
 * and renders the Grid + WordBank. Extracted from GameScreen so that cell
 * taps (SELECT_CELL dispatches) ONLY re-render this ~50-line component
 * instead of the full 2500-line GameScreen parent.
 *
 * GameScreen provides the zustand store via GameStoreContext. PlayField
 * reads `selectedCells`, `board.grid`, `board.words`, `wildcardCells`, etc.
 * via narrow selectors. GameScreen itself subscribes to coarse slices
 * (status, score, combo) which change per word, not per tap.
 */
import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { GameGrid } from '../../components/Grid';
import { WordBank } from '../../components/WordBank';
import { useGameStore, useGameDispatch } from '../../stores/gameStore';
import { CellPosition, GameMode, GravityDirection } from '../../types';
import { CELL_GAP, MAX_GRID_WIDTH, COLORS } from '../../constants';
import { matchesWord } from '../../hooks/useGame';
import { profilerOnRender, perfMark, perfDragStart, perfDragEnd } from '../../utils/perfInstrument';
import { tapHaptic } from '../../services/haptics';
import { soundManager } from '../../services/sound';

interface PlayFieldProps {
  mode: GameMode;
  /** Callback so GameScreen can reset idle hint timer on cell press */
  onCellInteraction?: () => void;
  /** Callback fired when isValidWord or currentWord changes (lets GameScreen
   *  trigger flash/auto-submit without subscribing to selectedCells). */
  onValidWordChange?: (isValid: boolean, wordLength: number) => void;
  /** Callback fired when selection length changes (for idle-hint timer reset). */
  onSelectionLengthChange?: (length: number) => void;
  /** Grid area height from layout */
  gridAreaHeight: number;
  /** Pass the grid scale animation from GameScreen (Animated.Value, stable ref) */
  gridScaleStyle: any;
  /** Whether the valid-word flash overlay is active (drives hintedCells) */
  showValidFlash: boolean;
  /** Spotlight dimmed cell set (or empty set when inactive) */
  spotlightDimmedSet: Set<string>;
  /** Fall animation map from gravity animation effect */
  fallAnimMap: Map<string, Animated.Value>;
  /** Whether fall animation is active */
  fallActive: boolean;
  /** Moved cells for post-gravity highlight */
  movedCells: CellPosition[];
  /** Whether user is dragging (for grid glow effect) */
  isDragging: boolean;
  /** Setters forwarded from GameScreen */
  setIsDragging: (v: boolean) => void;
}

function buildRemainingWordSet(words: Array<{ word: string; found: boolean }>): Set<string> {
  return new Set(words.filter((word) => !word.found).map((word) => word.word));
}

function PlayFieldImpl({
  mode,
  onCellInteraction,
  onValidWordChange,
  onSelectionLengthChange,
  gridAreaHeight,
  gridScaleStyle,
  showValidFlash,
  spotlightDimmedSet,
  fallAnimMap,
  fallActive,
  movedCells,
  isDragging,
  setIsDragging,
}: PlayFieldProps) {
  const dispatch = useGameDispatch();

  // ── Narrow selectors — only these trigger PlayField re-renders ─────────
  const selectedCells = useGameStore(s => s.selectedCells);
  const grid = useGameStore(s => s.board.grid);
  const words = useGameStore(s => s.board.words);
  const wildcardCells = useGameStore(s => s.wildcardCells);
  const gravityDirection = useGameStore(s => s.gravityDirection);

  // ── Derived state ─────────────────────────────────────────────────────
  const currentWord = useMemo(
    () => selectedCells.map(({ row, col }) => grid[row]?.[col]?.letter ?? '').join(''),
    [grid, selectedCells],
  );

  const remainingWordSet = useMemo(() => buildRemainingWordSet(words), [words]);

  // Wildcard-aware validity check — when wildcards are active, fall back to
  // matchesWord which skips letter comparison for wildcard cell positions.
  const isValidWord = useMemo(() => {
    if (selectedCells.length === 0) return false;
    if (wildcardCells.length === 0) return remainingWordSet.has(currentWord);
    return words.some(w => !w.found && matchesWord(currentWord, w.word, selectedCells, wildcardCells));
  }, [selectedCells, currentWord, wildcardCells, words, remainingWordSet]);

  // ── Notify GameScreen of valid-word / selection changes ────────────────
  useEffect(() => {
    onValidWordChange?.(isValidWord, currentWord.length);
  }, [isValidWord, currentWord.length, onValidWordChange]);

  useEffect(() => {
    onSelectionLengthChange?.(selectedCells.length);
  }, [selectedCells.length, onSelectionLengthChange]);

  // ── Shared empty array for stable prop identity ───────────────────────
  const EMPTY_CELL_ARRAY = useMemo<CellPosition[]>(() => [], []);

  // ── Tap feedback throttle ─────────────────────────────────────────────
  const lastTapFeedbackAt = useRef(0);

  const handleCellPress = useCallback(
    (position: CellPosition) => {
      perfMark('tap');
      onCellInteraction?.();
      const now = Date.now();
      if (now - lastTapFeedbackAt.current > 40) {
        lastTapFeedbackAt.current = now;
        void tapHaptic();
        void soundManager.playSound('tap');
      }
      dispatch({ type: 'SELECT_CELL', position });
    },
    [dispatch, onCellInteraction],
  );

  const handleCellsPress = useCallback(
    (positions: CellPosition[]) => {
      if (positions.length === 0) return;
      perfMark('tap');
      onCellInteraction?.();
      const now = Date.now();
      if (now - lastTapFeedbackAt.current > 40) {
        lastTapFeedbackAt.current = now;
        void tapHaptic();
        void soundManager.playSound('tap');
      }
      dispatch({ type: 'SELECT_CELLS', positions });
    },
    [dispatch, onCellInteraction],
  );

  const handleDragStart = useCallback(() => setIsDragging(true), [setIsDragging]);
  const handleDragEnd = useCallback(() => setIsDragging(false), [setIsDragging]);

  return (
    <>
      {/* Grid wrapper with scale animations */}
      <Animated.View style={gridScaleStyle}>
        <React.Profiler id="Grid" onRender={profilerOnRender}>
          <GameGrid
            grid={grid}
            selectedCells={selectedCells}
            hintedCells={isValidWord ? selectedCells : EMPTY_CELL_ARRAY}
            onCellPress={handleCellPress}
            onCellsPress={handleCellsPress}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            validWord={showValidFlash}
            movedCells={mode === 'noGravity' ? EMPTY_CELL_ARRAY : movedCells}
            maxHeight={gridAreaHeight}
            isDragging={isDragging}
            wildcardCells={wildcardCells}
            spotlightDimmedCells={spotlightDimmedSet}
            gravityDirection={mode === 'gravityFlip' ? gravityDirection : undefined}
            noGravityLayout={mode === 'noGravity' || mode === 'shrinkingBoard'}
            fallAnimMap={fallAnimMap}
            fallActive={fallActive}
          />
        </React.Profiler>
      </Animated.View>
    </>
  );
}

export const PlayField = React.memo(PlayFieldImpl);

/**
 * ConnectedWordBank — reads selection-derived state from the zustand store
 * and renders WordBank. Placed in GameScreen's layout ABOVE the gridArea so
 * it appears in the correct visual position. Only re-renders when the
 * selected word or word-found state changes (per-tap for selection, per-word
 * for found status).
 */
function ConnectedWordBankImpl() {
  const selectedCells = useGameStore(s => s.selectedCells);
  const grid = useGameStore(s => s.board.grid);
  const words = useGameStore(s => s.board.words);
  const wildcardCells = useGameStore(s => s.wildcardCells);

  const wildcardSet = useMemo(
    () => new Set(wildcardCells.map(c => `${c.row},${c.col}`)),
    [wildcardCells],
  );

  // Display word: show ★ for wildcard cell positions
  const currentWord = useMemo(
    () => selectedCells.map(({ row, col }) => {
      if (wildcardSet.has(`${row},${col}`)) return '★';
      return grid[row]?.[col]?.letter ?? '';
    }).join(''),
    [grid, selectedCells, wildcardSet],
  );

  const remainingWordSet = useMemo(() => buildRemainingWordSet(words), [words]);

  // Wildcard-aware validity: use raw letters + matchesWord for wildcard comparison
  const isValidWord = useMemo(() => {
    if (selectedCells.length === 0) return false;
    if (wildcardCells.length === 0) return remainingWordSet.has(currentWord);
    const rawWord = selectedCells.map(({ row, col }) => grid[row]?.[col]?.letter ?? '').join('');
    return words.some(w => !w.found && matchesWord(rawWord, w.word, selectedCells, wildcardCells));
  }, [selectedCells, currentWord, grid, wildcardCells, words, remainingWordSet]);

  return (
    <View style={styles.wordArea}>
      <React.Profiler id="WordBank" onRender={profilerOnRender}>
        <WordBank
          words={words}
          currentWord={currentWord}
          isValidWord={isValidWord}
        />
      </React.Profiler>
    </View>
  );
}

export const ConnectedWordBank = React.memo(ConnectedWordBankImpl);

const styles = StyleSheet.create({
  wordArea: {
    paddingTop: 2,
    paddingBottom: 2,
    height: 86,
  },
});
