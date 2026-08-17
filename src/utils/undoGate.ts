/**
 * Decide where an undo comes from when the player taps undo.
 *
 * There are two pools: `undosLeft` lives in the game store (granted into the
 * current puzzle — notably by the free stuck rescue), and `undoTokens` lives
 * in the economy (bought/earned inventory, spent one per undo).
 *
 * This is a pure function because the gate was previously inlined in
 * GameScreen's handleUndo as `if (undoTokens <= 0) return;` — which ignored
 * the game-store pool entirely. The free stuck rescue only fires when
 * `undoTokens <= 0` (that is its trigger condition), then grants a
 * game-store undo and shows a "FREE UNDO — ON US" banner... whose tap was
 * swallowed by that early return. A labeled gift the player could see and
 * not use — strictly worse than no gift.
 */
export type UndoSource =
  /** Relax mode: undos are free, spend nothing. */
  | 'free'
  /** A game-store undo is already granted (free rescue) — spend nothing. */
  | 'granted'
  /** Spend one economy token, grant it into the game store, then undo. */
  | 'token'
  /** Nothing to spend from either pool. */
  | 'blocked';

export function resolveUndoSource(
  mode: string,
  undosLeft: number,
  undoTokens: number,
): UndoSource {
  if (mode === 'relax') return 'free';
  // Granted undos first: they are puzzle-scoped and vanish on retry/next
  // level, while tokens persist — consuming the expiring pool before the
  // durable one is strictly in the player's favour.
  if (undosLeft > 0) return 'granted';
  if (undoTokens > 0) return 'token';
  return 'blocked';
}
