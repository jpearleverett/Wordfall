/**
 * In-puzzle state persistence.
 *
 * Before this module existed, a kill-mid-puzzle (OS reclamation in the
 * background, crash, force-quit) dropped the player's progress on the
 * current puzzle entirely — timer remaining, words found, hint/undo
 * spend, booster activations, everything. timePressure mode made this
 * especially punishing: backgrounding for 30s + resume → timer still
 * ticks (intentional anti-cheat, `useGame.ts:245-253`) + state is gone
 * → instant loss.
 *
 * Fix: snapshot the full GameState to AsyncStorage on AppState
 * 'background' / 'inactive', restore on GameScreen mount if a snapshot
 * exists for the current level. Cleared automatically when the puzzle
 * reaches a terminal status ('won' | 'failed' | 'timeout').
 *
 * Safe to call unconditionally — all writes are fire-and-forget and
 * swallow errors (a failed snapshot save is strictly better than a
 * crash). Versioning lets us invalidate stale snapshots after a shape
 * change without a migration.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameState, PuzzleSnapshot } from '../types';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'wordfall.puzzleSnapshot.v1';
const CURRENT_VERSION = 1 as const;

/**
 * True when the state represents an in-flight puzzle worth saving. We skip
 * snapshots for terminal states and for the very-first frame (zero moves,
 * zero selections, timer untouched) to avoid persisting a glorified
 * NEW_GAME state.
 */
export function shouldSaveSnapshot(state: GameState): boolean {
  if (state.status !== 'playing') return false;
  const hasProgress =
    state.moves > 0 ||
    state.hintsUsed > 0 ||
    state.score > 0 ||
    state.board.words.some((w) => w.found);
  return hasProgress;
}

export async function savePuzzleSnapshot(
  state: GameState,
  chapterId: number,
): Promise<void> {
  try {
    if (!shouldSaveSnapshot(state)) {
      // Clean up any stale snapshot rather than leaving one that no longer
      // matches reality (e.g. player just won the puzzle on this tick).
      await clearPuzzleSnapshot();
      return;
    }
    const snapshot: PuzzleSnapshot = {
      version: CURRENT_VERSION,
      savedAtMs: Date.now(),
      level: state.level,
      mode: state.mode,
      chapterId,
      state,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    logger.warn('[puzzleSnapshot] save failed', err);
  }
}

export async function loadPuzzleSnapshot(): Promise<PuzzleSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PuzzleSnapshot;
    if (parsed.version !== CURRENT_VERSION) {
      // Shape changed since this was saved. Discard rather than risk a
      // partially-populated restore.
      await clearPuzzleSnapshot();
      return null;
    }
    if (!parsed.state || parsed.state.status !== 'playing') {
      // Defensive: a terminal snapshot leaked into storage. Treat as empty.
      await clearPuzzleSnapshot();
      return null;
    }
    return parsed;
  } catch (err) {
    logger.warn('[puzzleSnapshot] load failed', err);
    // Best-effort recovery: nuke the slot so subsequent launches aren't
    // stuck in a poison-pill loop.
    await clearPuzzleSnapshot();
    return null;
  }
}

export async function clearPuzzleSnapshot(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort
  }
}

/**
 * True when the snapshot's (level, mode) matches the puzzle the player is
 * about to load. Mismatches discard the snapshot — a snapshot from level 7
 * classic should not restore into a level-12 time-pressure puzzle.
 */
export function snapshotMatchesTarget(
  snapshot: PuzzleSnapshot,
  targetLevel: number,
  targetMode: string,
): boolean {
  return snapshot.level === targetLevel && snapshot.mode === targetMode;
}
