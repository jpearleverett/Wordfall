/**
 * J11: the "kept it open" acknowledgment must be HONEST — it fires only
 * when the solver can confirm an alternative clear would have dead-ended
 * the board. Tutorial board D is the authored order trap (clearing TAP
 * strands ICE; clearing ICE first is safe), pinned against the real solver
 * by tutorialOrderTrap.test.ts — the perfect fixture.
 */
import { choiceAvoidedDeadEnd } from '../solver';
import { generateTutorialBoardD, generateTutorialBoardB } from '../../data/tutorialBoards';

describe('choiceAvoidedDeadEnd', () => {
  it('confirms the safe choice on the authored order trap (board D)', () => {
    const board = generateTutorialBoardD();
    // Player cleared ICE; the alternative (TAP) would have buried ICE.
    expect(
      choiceAvoidedDeadEnd(board.grid, 'ICE', ['ICE', 'TAP'], 200),
    ).toBe(true);
  });

  it('stays quiet when every alternative also works (board B)', () => {
    const board = generateTutorialBoardB();
    const words = board.words.map((w) => w.word);
    // Board B (CAT above DOG) solves in either order — no dead-ending
    // alternative exists, so no badge regardless of which word was cleared.
    for (const found of words) {
      expect(choiceAvoidedDeadEnd(board.grid, found, words, 200)).toBe(false);
    }
  });

  it('stays quiet with no alternatives (last word)', () => {
    const board = generateTutorialBoardD();
    expect(choiceAvoidedDeadEnd(board.grid, 'ICE', ['ICE'], 200)).toBe(false);
  });

  it('returns false (inconclusive) on an exhausted budget rather than guessing', () => {
    const board = generateTutorialBoardD();
    expect(choiceAvoidedDeadEnd(board.grid, 'ICE', ['ICE', 'TAP'], 0)).toBe(false);
  });
});
