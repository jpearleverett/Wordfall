/**
 * THE FREE-RESCUE UNDO MUST ACTUALLY BE TAPPABLE.
 *
 * The free stuck rescue fires only when the player has zero economy undo
 * tokens (that is its trigger), grants one game-store undo, and labels the
 * banner "FREE UNDO — ON US". handleUndo's old gate was `if (undoTokens <= 0)
 * return;` — economy tokens only — so tapping that banner did nothing, in the
 * exact state the rescue exists for. A visible gift that can't be used reads
 * worse than no gift at all.
 *
 * The gate is now a pure function so this state machine is testable without
 * rendering GameScreen.
 */
import { resolveUndoSource } from '../undoGate';

describe('resolveUndoSource', () => {
  it('the rescue state: no tokens, one granted undo — must be usable', () => {
    // This exact combination is what the free stuck rescue produces, and it
    // is the case the old gate blocked.
    expect(resolveUndoSource('classic', 1, 0)).toBe('granted');
  });

  it('normal paid path: no granted undos, tokens available', () => {
    expect(resolveUndoSource('classic', 0, 3)).toBe('token');
  });

  it('prefers the expiring pool over the durable one', () => {
    // Granted undos die with the puzzle; tokens persist across puzzles.
    // Consuming granted-first is strictly player-favourable, and it also
    // means a token is never burned while a free undo sits unused.
    expect(resolveUndoSource('classic', 1, 5)).toBe('granted');
  });

  it('blocks only when both pools are empty', () => {
    expect(resolveUndoSource('classic', 0, 0)).toBe('blocked');
  });

  it('relax mode spends nothing regardless of pools', () => {
    expect(resolveUndoSource('relax', 0, 0)).toBe('free');
    expect(resolveUndoSource('relax', 2, 7)).toBe('free');
  });

  it('token path applies to every non-relax mode', () => {
    for (const mode of ['classic', 'gravityFlip', 'noGravity', 'shrinkingBoard', 'timePressure', 'expert', 'perfectSolve', 'daily', 'weekly']) {
      expect(resolveUndoSource(mode, 0, 1)).toBe('token');
      expect(resolveUndoSource(mode, 0, 0)).toBe('blocked');
    }
  });
});
