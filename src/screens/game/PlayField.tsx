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
import { useShallow } from 'zustand/react/shallow';
import { GameGrid } from '../../components/Grid';
import { WordBank } from '../../components/WordBank';
import { useGameStore, useGameDispatch } from '../../stores/gameStore';
import { CellPosition, GameMode, GameState, GravityDirection } from '../../types';
import { CELL_GAP, MAX_GRID_WIDTH, COLORS } from '../../constants';
import { matchesWord } from '../../hooks/useGame';
import { profilerOnRender, perfMark } from '../../utils/perfInstrument';
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
  /** Moved cells for post-gravity highlight */
  movedCells: CellPosition[];
  /** Bonus coin tile (variable reward) — cell ID, travels with gravity */
  bonusCellId?: string | null;
}

function buildRemainingWordSet(words: Array<{ word: string; found: boolean }>): Set<string> {
  return new Set(words.filter((word) => !word.found).map((word) => word.word));
}

/**
 * Shared wildcard-aware validity check used by both PlayField (to drive
 * the valid-word flash) and ConnectedWordBank (to style the current word).
 * Extracted so the two components' memoization logic stays in one place.
 */
function computeIsValidWord(
  currentWord: string,
  selectedCells: CellPosition[],
  wildcardCells: CellPosition[],
  words: Array<{ word: string; found: boolean }>,
  remainingWordSet: Set<string>,
  rawWord?: string,
): boolean {
  if (selectedCells.length === 0) return false;
  if (wildcardCells.length === 0) return remainingWordSet.has(currentWord);
  const compareWord = rawWord ?? currentWord;
  return words.some(w => !w.found && matchesWord(compareWord, w.word, selectedCells, wildcardCells));
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
  movedCells,
  bonusCellId = null,
}: PlayFieldProps) {
  const dispatch = useGameDispatch();

  // ── Narrow selectors — only these trigger PlayField re-renders ─────────
  const selectedCells = useGameStore(useShallow((s: GameState) => s.selectedCells));
  const grid = useGameStore(s => s.board.grid);
  const words = useGameStore(useShallow((s: GameState) => s.board.words));
  const wildcardCells = useGameStore(useShallow((s: GameState) => s.wildcardCells));
  const wildcardMode = useGameStore(s => s.wildcardMode);
  const gravityDirection = useGameStore(s => s.gravityDirection);

  // ── Derived state ─────────────────────────────────────────────────────
  const currentWord = useMemo(
    () => selectedCells.map(({ row, col }) => grid[row]?.[col]?.letter ?? '').join(''),
    [grid, selectedCells],
  );

  const remainingWordSet = useMemo(() => buildRemainingWordSet(words), [words]);

  // Wildcard-aware validity check — when wildcards are active, fall back to
  // matchesWord which skips letter comparison for wildcard cell positions.
  const isValidWord = useMemo(
    () => computeIsValidWord(currentWord, selectedCells, wildcardCells, words, remainingWordSet),
    [selectedCells, currentWord, wildcardCells, words, remainingWordSet],
  );

  // ── Notify GameScreen of valid-word / selection changes ────────────────
  useEffect(() => {
    onValidWordChange?.(isValidWord, currentWord.length);
  }, [isValidWord, currentWord.length, onValidWordChange]);

  useEffect(() => {
    onSelectionLengthChange?.(selectedCells.length);
    // Mirror for the tap-feedback handlers below — lets them read the live
    // trace length without taking selectedCells as a dependency (which would
    // recreate the callbacks on every tap).
    selectionLenRef.current = selectedCells.length;
  }, [selectedCells.length, onSelectionLengthChange]);

  // ── Shared empty array for stable prop identity ───────────────────────
  const EMPTY_CELL_ARRAY = useMemo<CellPosition[]>(() => [], []);

  // ── Tap feedback throttle ─────────────────────────────────────────────
  const lastTapFeedbackAt = useRef(0);
  const selectionLenRef = useRef(0);

  // Rising tap scale: each cell added to the trace plays a slightly
  // higher-pitched tap (Wordscapes-style momentum feedback). +6% per cell,
  // capped at +48% so long traces don't squeak.
  const tapRateForTrace = useCallback(
    () => 1 + Math.min(8, selectionLenRef.current) * 0.06,
    [],
  );

  const handleCellPress = useCallback(
    (position: CellPosition) => {
      perfMark('tap');
      onCellInteraction?.();
      const now = Date.now();
      if (now - lastTapFeedbackAt.current > 40) {
        lastTapFeedbackAt.current = now;
        void tapHaptic();
        void soundManager.playSound('tap', { rate: tapRateForTrace() });
      }
      dispatch({ type: 'SELECT_CELL', position });
    },
    [dispatch, onCellInteraction, tapRateForTrace],
  );

  const handleCellsPress = useCallback(
    (positions: CellPosition[]) => {
      if (positions.length === 0) return;
      perfMark('tap');
      onCellInteraction?.();
      const now = Date.now();
      if (now - lastTapFeedbackAt.current > 40) {
        lastTapFeedbackAt.current = now;
        // ONE haptic per batch (haptic spam is worse than audio spam), but
        // the rising-pitch ladder plays per cell: a confident swipe across a
        // 7-letter word used to collapse to a single tap sound — the moment
        // of highest fluency went mute while hesitant tracing got the full
        // ladder. Stagger one tap per crossed cell at 22ms with the rate
        // stepping per index, capped at 4 so a pathological drag can't
        // machine-gun.
        void tapHaptic();
        const baseLen = selectionLenRef.current;
        const count = Math.min(positions.length, 4);
        for (let i = 0; i < count; i++) {
          const rate = 1 + Math.min(8, baseLen + i) * 0.06;
          if (i === 0) {
            void soundManager.playSound('tap', { rate });
          } else {
            setTimeout(() => {
              void soundManager.playSound('tap', { rate });
            }, i * 22);
          }
        }
      }
      dispatch({ type: 'SELECT_CELLS', positions });
    },
    [dispatch, onCellInteraction],
  );

  // ── Release a dead trace on finger lift ────────────────────────────────
  // A drag that ends without matching a word used to leave the tiles lit
  // indefinitely; the only ways out were a non-adjacent tap (which fired the
  // invalid-word error treatment — a punishment for normal exploratory play)
  // or an adjacent tap that silently APPENDED to the dead trace. Now a
  // multi-cell drag releases ~180ms after lift: long enough that the 50ms
  // auto-submit timer always wins on a valid word, short enough to read as a
  // clean release. Single taps never release (didTraceMultiple=false) so
  // tap-by-tap selection keeps working, and a new gesture cancels the timer
  // so fast consecutive traces are never clipped.
  const isValidWordRef = useRef(false);
  useEffect(() => {
    isValidWordRef.current = isValidWord;
  }, [isValidWord]);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleDragStart = useCallback(() => {
    if (releaseTimerRef.current) {
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
  }, []);
  const handleDragEnd = useCallback(
    (didTraceMultiple: boolean) => {
      if (!didTraceMultiple) return;
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = setTimeout(() => {
        releaseTimerRef.current = null;
        // A valid word is mid-auto-submit — SUBMIT_WORD clears the selection.
        if (isValidWordRef.current) return;
        if (selectionLenRef.current === 0) return;
        // Silent by design: releasing an exploratory trace is normal play,
        // not an error (game_mechanics.md — invalid submissions don't exist).
        dispatch({ type: 'CLEAR_SELECTION' });
      }, 180);
    },
    [dispatch],
  );
  useEffect(
    () => () => {
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    },
    [],
  );

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
            wildcardCells={wildcardCells}
            spotlightDimmedCells={spotlightDimmedSet}
            bonusCellId={bonusCellId}
            gravityDirection={mode === 'gravityFlip' ? gravityDirection : undefined}
            noGravityLayout={mode === 'noGravity' || mode === 'shrinkingBoard'}
            fallAnimMap={fallAnimMap}
            wildcardMode={wildcardMode}
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
  const selectedCells = useGameStore(useShallow((s: GameState) => s.selectedCells));
  const grid = useGameStore(s => s.board.grid);
  const words = useGameStore(useShallow((s: GameState) => s.board.words));
  const wildcardCells = useGameStore(useShallow((s: GameState) => s.wildcardCells));

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

  // Wildcard-aware validity: use raw letters + matchesWord for wildcard comparison.
  // Shares the core logic with PlayField via computeIsValidWord so the two
  // components can't drift apart.
  const rawWord = useMemo(
    () => selectedCells.map(({ row, col }) => grid[row]?.[col]?.letter ?? '').join(''),
    [selectedCells, grid],
  );
  const isValidWord = useMemo(
    () => computeIsValidWord(currentWord, selectedCells, wildcardCells, words, remainingWordSet, rawWord),
    [selectedCells, currentWord, wildcardCells, words, remainingWordSet, rawWord],
  );

  // Tier 6 B7 — mirror GameScreen's tension trigger so the final chip
  // coordinates its overshoot + glow with the BGM swap + haptic moment.
  const tensionActive = useMemo(() => {
    return words.filter((w) => !w.found).length === 1;
  }, [words]);

  return (
    <View style={styles.wordArea}>
      <React.Profiler id="WordBank" onRender={profilerOnRender}>
        <WordBank
          words={words}
          currentWord={currentWord}
          isValidWord={isValidWord}
          tensionActive={tensionActive}
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
