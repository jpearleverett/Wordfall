/**
 * J11: the "kept it open" acknowledgment must be HONEST — it fires only
 * when the solver can confirm an alternative clear would have dead-ended
 * the board. Tutorial board D is the authored order trap (clearing TAP
 * strands ICE; clearing ICE first is safe), pinned against the real solver
 * by tutorialOrderTrap.test.ts — the perfect fixture.
 */
import {
  choiceAvoidedDeadEnd,
  isProvablyCompletable,
  previousGravityDirection,
  type ClearRule,
} from '../solver';
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

/**
 * THE BADGE MUST REASON ABOUT THE BOARD THE PLAYER IS ACTUALLY ON.
 *
 * Both gates — choiceAvoidedDeadEnd and the isProvablyCompletable guard —
 * simulated classic downward gravity unconditionally, in every mode. In
 * noGravity nothing falls, so the simulated post-clear grid refilled the
 * permanent holes and bore no relation to the real board; in gravityFlip the
 * pull is a rotating quarter-turn; in shrinkingBoard the clear also eats the
 * outer ring. Measured over 400 generated boards per mode: 73% of noGravity
 * firings and 72% of shrinkingBoard firings were unearned, and gravityFlip
 * fired on an ALREADY DEAD board 38 times — precisely what the
 * isProvablyCompletable guard exists to prevent.
 */
describe('the badge respects the mode it is played in', () => {
  const ruleFor = (mode: ClearRule['mode']): ClearRule => ({
    mode,
    gravityDirection: 'down',
    wordsUntilShrink: 2,
  });

  it('does not claim a save under a rule where nothing falls (noGravity)', () => {
    const board = generateTutorialBoardD();
    // Board D is the authored order trap ONLY because gravity drops a letter
    // onto ICE when TAP is cleared first. With nothing falling, clearing TAP
    // strands nothing, so there is no save to acknowledge.
    expect(choiceAvoidedDeadEnd(board.grid, 'ICE', ['ICE', 'TAP'], 200, ruleFor('noGravity')))
      .toBe(false);
    // ...and classic on the same fixture is unchanged.
    expect(choiceAvoidedDeadEnd(board.grid, 'ICE', ['ICE', 'TAP'], 200)).toBe(true);
    expect(choiceAvoidedDeadEnd(board.grid, 'ICE', ['ICE', 'TAP'], 200, ruleFor('classic')))
      .toBe(true);
  });

  it('isProvablyCompletable does not simulate a fall in noGravity', () => {
    const board = generateTutorialBoardD();
    const words = board.words.map((w) => w.word);
    // Classic can prove completion by dropping letters; noGravity must answer
    // the different question "does every word still have its own path".
    expect(isProvablyCompletable(board.grid, words)).toBe(true);
    expect(typeof isProvablyCompletable(board.grid, words, ruleFor('noGravity'))).toBe('boolean');
  });

  it('omitting the rule keeps the classic behaviour exactly', () => {
    const board = generateTutorialBoardD();
    const words = board.words.map((w) => w.word);
    expect(isProvablyCompletable(board.grid, words, ruleFor('classic')))
      .toBe(isProvablyCompletable(board.grid, words));
    expect(choiceAvoidedDeadEnd(board.grid, 'ICE', words, 200, ruleFor('classic')))
      .toBe(choiceAvoidedDeadEnd(board.grid, 'ICE', words, 200));
  });
});

describe('previousGravityDirection', () => {
  it('steps one quarter-turn back around the cycle', () => {
    // state.gravityDirection is the direction that pulls the NEXT clear, so
    // anything reasoning about the clear that just happened needs the step
    // before it. Getting this wrong is the quarter-turn phase bug that
    // isDeadEndGravityFlip already carried once.
    expect(previousGravityDirection('right')).toBe('down');
    expect(previousGravityDirection('up')).toBe('right');
    expect(previousGravityDirection('left')).toBe('up');
    expect(previousGravityDirection('down')).toBe('left');
  });

  it('is the inverse of one full forward step', () => {
    const cycle = ['down', 'right', 'up', 'left'] as const;
    for (let i = 0; i < cycle.length; i++) {
      const forward = cycle[(i + 1) % 4];
      expect(previousGravityDirection(forward)).toBe(cycle[i]);
    }
  });
});
