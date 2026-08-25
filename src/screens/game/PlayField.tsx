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
import { useIsFocused } from '@react-navigation/native';
import { GameGrid } from '../../components/Grid';
import { WordBank } from '../../components/WordBank';
import { useGameStore, useGameDispatch } from '../../stores/gameStore';
import { CellPosition, GameMode, GameState } from '../../types';
import { matchesWord } from '../../hooks/useGame';
import { profilerOnRender, perfMark } from '../../utils/perfInstrument';
import { tapHaptic } from '../../services/haptics';
import { soundManager } from '../../services/sound';
import { clearTimeoutHandles } from '../../utils/animationLifecycle';
import { isLastWordTensionActive } from '../../utils/gameMotion';

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
  /** Fired when a gravity fall fully settles (GameScreen plays the landing haptic) */
  onGravitySettled?: () => void;
  /** Chapter accent color tinting the grid's neon frame (see Grid.frameAccent) */
  frameAccent?: string;
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
  onGravitySettled,
  frameAccent,
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
  // Idle-glint gate: the layer's self-rescheduling timer chain must stop
  // when the board isn't visible gameplay — result overlay up (status not
  // 'playing') or GameScreen blurred under a pushed route (freezeOnBlur
  // suspends rendering but not timers).
  const isFocused = useIsFocused();
  const glintActive = useGameStore(s => s.status) === 'playing' && isFocused;

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
  const tapSoundTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => () => {
    clearTimeoutHandles(tapSoundTimersRef.current);
  }, []);

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
            const timer = setTimeout(() => {
              tapSoundTimersRef.current.delete(timer);
              void soundManager.playSound('tap', { rate });
            }, i * 22);
            tapSoundTimersRef.current.add(timer);
          }
        }
      }
      dispatch({ type: 'SELECT_CELLS', positions });
    },
    [dispatch, onCellInteraction],
  );

  // ── A lifted trace STAYS lit ───────────────────────────────────────────
  // Letting go of a partial trace is normal play — you spot three letters of
  // a five-letter word, lift, and think. Auto-clearing on lift threw that
  // input away and made the board feel like it was fighting you.
  //
  // The trace is now cleared only by the player:
  //   • tap or drag back over any selected letter → deselects from there on
  //     (applySelectionStep in useGame.ts truncates at the tapped index)
  //   • tap a non-adjacent letter → starts a fresh trace there
  //   • completing a listed word → auto-submit clears it
  // There is no lift-release timer, so nothing races the 50ms auto-submit
  // and no exploratory trace is ever discarded behind the player's back.

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
            validWord={showValidFlash}
            maxHeight={gridAreaHeight}
            wildcardCells={wildcardCells}
            spotlightDimmedCells={spotlightDimmedSet}
            bonusCellId={bonusCellId}
            gravityDirection={mode === 'gravityFlip' ? gravityDirection : undefined}
            onGravitySettled={onGravitySettled}
            glintActive={glintActive}
            frameAccent={frameAccent}
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
interface ConnectedWordBankProps {
  /**
   * When true (victory/failure overlay is up) the word band is fully hidden
   * and non-interactive. Layout is preserved (opacity, not unmount) so the
   * grid behind the overlay doesn't visibly reflow during the overlay's
   * fade-in. Without this, the chips' Android elevation could paint them
   * on top of the completion overlay — chips floating over the victory
   * modal and "following" its scroll.
   */
  hidden?: boolean;
}

function ConnectedWordBankImpl({ hidden = false }: ConnectedWordBankProps) {
  const selectedCells = useGameStore(useShallow((s: GameState) => s.selectedCells));
  const grid = useGameStore(s => s.board.grid);
  const words = useGameStore(useShallow((s: GameState) => s.board.words));
  const wildcardCells = useGameStore(useShallow((s: GameState) => s.wildcardCells));
  const status = useGameStore(s => s.status);

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

  const tensionActive = useMemo(
    () =>
      isLastWordTensionActive(
        words.length,
        words.filter((word) => !word.found).length,
        status,
      ),
    [status, words],
  );

  return (
    <View
      style={[styles.wordArea, hidden && styles.wordAreaHidden]}
      pointerEvents={hidden ? 'none' : 'auto'}
    >
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
    // minHeight (not a fixed height): with 6+ words the wrapped chip panel
    // grows past 86px, and a fixed height let the overflow paint on top of
    // the grid below. Auto-sizing pushes the gridArea down instead — the
    // grid re-measures via onLayout and shrinks its cells to fit.
    minHeight: 86,
  },
  wordAreaHidden: {
    opacity: 0,
  },
});
