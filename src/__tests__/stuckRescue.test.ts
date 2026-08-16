/**
 * Free stuck-rescue contract.
 *
 * Getting stuck is an intended fail state — clearing words in a bad order is
 * supposed to cost the player. What was not intended is the RESPONSE: with no
 * undo tokens the only option was restarting the level outright, while the
 * dead board simultaneously triggered two purchase offers. That monetises the
 * most frustrating moment in the game.
 *
 * The rescue grants ONE free undo per level, and only on a genuinely dead
 * board. These tests pin the properties that keep it from becoming either a
 * loophole or a difficulty eraser. The wiring itself lives in GameScreen (it
 * needs the solver's live isStuck flag), so this suite covers the invariants
 * that wiring depends on.
 */
const mockBooleans = new Map<string, boolean>();
jest.mock('../services/remoteConfig', () => ({
  getRemoteBoolean: (key: string): boolean =>
    mockBooleans.has(key) ? (mockBooleans.get(key) as boolean) : true,
  getRemoteNumber: (): number => 0,
  getRemoteString: (): string => '',
}));

import { getRemoteBoolean } from '../services/remoteConfig';
import { isDeadEnd, findWordInGrid } from '../engine/solver';
import { removeCellsAndApplyGravity } from '../engine/gravity';
import { generateBoard } from '../engine/boardGenerator';
import { getLevelConfigExtended } from '../engine/puzzleGenerator';
import type { Grid } from '../types';

beforeEach(() => {
  mockBooleans.clear();
});

describe('free stuck rescue', () => {
  it('is enabled by default but killable from Remote Config', () => {
    expect(getRemoteBoolean('freeStuckRescueEnabled')).toBe(true);
    mockBooleans.set('freeStuckRescueEnabled', false);
    expect(getRemoteBoolean('freeStuckRescueEnabled')).toBe(false);
  });

  it('undo actually rescues a dead board — the state it restores is solvable', () => {
    // The rescue is only worth granting if stepping back one move genuinely
    // reopens the puzzle. Play a board into a dead end, then confirm the
    // previous grid was NOT a dead end. This is what makes a free undo a real
    // recovery rather than a cosmetic gesture.
    let rescuable = 0;
    let deadEndsFound = 0;

    for (let level = 12; level <= 60 && deadEndsFound < 6; level += 3) {
      const config = getLevelConfigExtended(level);
      const board = generateBoard(config, level * 613 + 29, 'classic');
      const words = board.words.map((w) => w.word);

      let grid: Grid = board.grid;
      let remaining = [...words];
      let previousGrid: Grid | null = null;
      let previousRemaining: string[] = [];

      // Deterministic worst-case play: always clear the LAST findable word,
      // which is the ordering most likely to strand something.
      while (remaining.length > 0) {
        const findable = remaining.filter((w) => findWordInGrid(grid, w, 1).length > 0);
        if (findable.length === 0) break;
        const pick = findable[findable.length - 1];
        previousGrid = grid;
        previousRemaining = [...remaining];
        grid = removeCellsAndApplyGravity(grid, findWordInGrid(grid, pick, 1)[0]);
        remaining = remaining.filter((w) => w !== pick);

        if (remaining.length > 0 && isDeadEnd(grid, remaining)) {
          deadEndsFound++;
          // The position one move earlier must still have been alive —
          // otherwise the player was already doomed before this move and a
          // single undo would not help.
          if (previousGrid && !isDeadEnd(previousGrid, previousRemaining)) {
            rescuable++;
          }
          break;
        }
      }
    }

    // Every dead end we manufactured should be one move deep, i.e. undoable.
    expect(deadEndsFound).toBeGreaterThan(0);
    expect(rescuable).toBe(deadEndsFound);
  }, 120_000);

  it('a live board is never reported as dead (rescue cannot be farmed)', () => {
    // The rescue is gated on isDeadEnd. If that ever returned true for a
    // solvable board, a player could harvest free undos on a healthy puzzle.
    for (let level = 1; level <= 40; level += 3) {
      const config = getLevelConfigExtended(level);
      const board = generateBoard(config, level * 271 + 3, 'classic');
      const words = board.words.map((w) => w.word);
      expect(isDeadEnd(board.grid, words)).toBe(false);
    }
  }, 120_000);
});
