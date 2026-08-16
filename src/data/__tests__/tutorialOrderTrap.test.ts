/**
 * TUTORIAL BOARD D — the order-matters lesson.
 *
 * Wordfall has exactly one invisible fail state: clear words in the wrong
 * order and gravity buries what's left, with every letter still on screen.
 * Boards B and C teach that letters fall and that falling can REVEAL a word.
 * Nothing taught the opposite, so a player's first dead board arrived with no
 * prior concept to attach it to — which reads as a broken puzzle, not a
 * mistake they made.
 *
 * Board D exists to show the bad order once, under supervision. That only
 * works if the trap is real, so these tests assert it against the actual
 * gravity and solver rather than against the ASCII diagram in the source.
 * If someone edits a letter in that grid, this fails rather than quietly
 * turning the lesson into a board where both orders work.
 */
import {
  generateTutorialBoardA,
  generateTutorialBoardB,
  generateTutorialBoardC,
  generateTutorialBoardD,
  TUTORIAL_STEPS,
} from '../tutorialBoards';
import { findWordInGrid, isDeadEnd } from '../../engine/solver';
import { removeCellsAndApplyGravity } from '../../engine/gravity';
import type { Grid } from '../../types';

function clear(grid: Grid, word: string): Grid {
  const occurrences = findWordInGrid(grid, word, 1);
  if (occurrences.length === 0) throw new Error(`${word} not findable`);
  return removeCellsAndApplyGravity(grid, occurrences[0]);
}

describe('tutorial board D (order matters)', () => {
  it('starts with both words traceable', () => {
    // The trap has to be a real choice. If only one word were findable at
    // the start there would be no decision to teach.
    const board = generateTutorialBoardD();
    expect(findWordInGrid(board.grid, 'ICE', 1).length).toBeGreaterThan(0);
    expect(findWordInGrid(board.grid, 'TAP', 1).length).toBeGreaterThan(0);
  });

  it('ICE first solves the board', () => {
    const board = generateTutorialBoardD();
    const afterIce = clear(board.grid, 'ICE');
    expect(isDeadEnd(afterIce, ['TAP'])).toBe(false);
    expect(findWordInGrid(afterIce, 'TAP', 1).length).toBeGreaterThan(0);
  });

  it('TAP first strands ICE — the lesson', () => {
    const board = generateTutorialBoardD();
    const afterTap = clear(board.grid, 'TAP');
    // Not merely unsolvable-in-some-order: ICE must be genuinely untraceable,
    // because that is the state the player has to recognize later.
    expect(findWordInGrid(afterTap, 'ICE', 1)).toHaveLength(0);
    expect(isDeadEnd(afterTap, ['ICE'])).toBe(true);
  });

  it('the stranded letters are all still on the board', () => {
    // This is what makes a dead end confusing in the real game and why it is
    // worth showing once: nothing disappears. I, C and E are all still
    // visible, just no longer adjacent.
    const board = generateTutorialBoardD();
    const afterTap = clear(board.grid, 'TAP');
    const letters = afterTap
      .flat()
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .map((c) => c.letter);
    for (const letter of ['I', 'C', 'E']) {
      expect(letters).toContain(letter);
    }
  });

  it('has exactly one winning order, so the choice is meaningful', () => {
    const board = generateTutorialBoardD();
    const orders: Array<[string, string]> = [
      ['ICE', 'TAP'],
      ['TAP', 'ICE'],
    ];
    const winning = orders.filter(([first, second]) => {
      try {
        const after = clear(board.grid, first);
        return findWordInGrid(after, second, 1).length > 0;
      } catch {
        return false;
      }
    });
    expect(winning).toHaveLength(1);
    expect(winning[0][0]).toBe('ICE');
  });
});

/**
 * The tutorial is the first minute of the app, and its input is gated to the
 * highlighted cells: a step whose highlight doesn't match a real letter run
 * is not a cosmetic bug, it is an unrecoverable screen on a brand-new
 * install. The step list and the boards live in separate exports and nothing
 * ties them together at compile time, so this does it at test time.
 */
describe('tutorial step integrity', () => {
  const generators = {
    A: generateTutorialBoardA,
    B: generateTutorialBoardB,
    C: generateTutorialBoardC,
    D: generateTutorialBoardD,
  } as const;

  it('every step names a board that exists', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.board).toBeDefined();
      expect(generators[step.board as keyof typeof generators]).toBeDefined();
    }
  });

  it('every tappable step highlights exactly the letters of its word', () => {
    // Replays the tutorial the way the screen does — clearing highlighted
    // cells and applying gravity — so highlights are checked against the
    // board state the player will actually be looking at, not the pristine
    // one. A step that highlights stale pre-gravity positions is exactly the
    // failure this catches.
    let grid: Grid | null = null;
    let currentBoard: string | null = null;

    for (const step of TUTORIAL_STEPS) {
      if (step.board !== currentBoard) {
        currentBoard = step.board as string;
        grid = generators[currentBoard as keyof typeof generators]().grid;
      }
      if (step.waitForAction !== 'word_submitted') continue;

      expect(step.highlightPositions).toBeDefined();
      expect(step.highlightWord).toBeDefined();
      const positions = step.highlightPositions!;
      expect(positions).toHaveLength(step.highlightWord!.length);

      const spelled = positions
        .map((p) => grid![p.row]?.[p.col]?.letter ?? '?')
        .join('');
      expect(spelled).toBe(step.highlightWord);

      grid = removeCellsAndApplyGravity(grid!, positions);
    }
  });

  it('ends on a step the player can actually complete', () => {
    // A trailing dismiss step only works because advanceTutorialStep
    // transitions to the celebrate phase at the last index. If someone
    // appends a step type with no completion path the tutorial soft-locks,
    // so pin the two shapes that are known to be wired.
    const last = TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];
    expect(['dismiss', 'word_submitted']).toContain(last.waitForAction);
  });

  it('teaches the burying rule, not just the revealing one', () => {
    // The regression this guards is a silent one: dropping board D leaves a
    // tutorial that still works and still feels complete, while quietly
    // going back to never explaining the game's only invisible fail state.
    expect(TUTORIAL_STEPS.some((s) => s.board === 'D')).toBe(true);
  });
});
