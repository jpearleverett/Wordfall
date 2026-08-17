import { Board, Grid, Cell, WordPlacement } from '../types';

let tutorialCellId = 10000;
function tCell(letter: string): Cell {
  return { letter, id: `tcell_${++tutorialCellId}` };
}

/**
 * Tutorial A: 4x4 grid, 2 words (GO, HI). Teaches basic tap-to-select.
 * No gravity interaction needed — both words can be found in any order.
 *
 * Grid layout:
 *   G  O  X  P
 *   R  H  I  W
 *   M  L  K  D
 *   B  N  F  T
 */
export function generateTutorialBoardA(): Board {
  tutorialCellId = 10000;
  const grid: Grid = [
    [tCell('G'), tCell('O'), tCell('X'), tCell('P')],
    [tCell('R'), tCell('H'), tCell('I'), tCell('W')],
    [tCell('M'), tCell('L'), tCell('K'), tCell('D')],
    [tCell('B'), tCell('N'), tCell('F'), tCell('T')],
  ];
  const words: WordPlacement[] = [
    {
      word: 'GO',
      positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      direction: 'horizontal',
      found: false,
    },
    {
      word: 'HI',
      positions: [{ row: 1, col: 1 }, { row: 1, col: 2 }],
      direction: 'horizontal',
      found: false,
    },
  ];
  return {
    grid,
    words,
    config: { rows: 4, cols: 4, wordCount: 2, minWordLength: 2, maxWordLength: 2, difficulty: 'easy' },
  };
}

/**
 * Tutorial B: 5x4 grid, 2 words (CAT, DOG). Introduces gravity.
 * CAT is placed in the MIDDLE of the grid (row 2) so that when it's cleared,
 * letters above it (including D,O,G at row 0) visibly fall down.
 * After gravity, DOG ends up at row 1.
 *
 * Grid layout:
 *   D  O  G  X
 *   R  K  W  P
 *   C  A  T  H
 *   M  L  F  N
 *   B  J  Q  S
 *
 * After clearing CAT (row 2, cols 0-2) + gravity:
 *   _  _  _  X
 *   D  O  G  P
 *   R  K  W  H
 *   M  L  F  N
 *   B  J  Q  S
 */
export function generateTutorialBoardB(): Board {
  tutorialCellId = 11000;
  const grid: Grid = [
    [tCell('D'), tCell('O'), tCell('G'), tCell('X')],
    [tCell('R'), tCell('K'), tCell('W'), tCell('P')],
    [tCell('C'), tCell('A'), tCell('T'), tCell('H')],
    [tCell('M'), tCell('L'), tCell('F'), tCell('N')],
    [tCell('B'), tCell('J'), tCell('Q'), tCell('S')],
  ];
  const words: WordPlacement[] = [
    {
      word: 'CAT',
      positions: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
      direction: 'horizontal',
      found: false,
    },
    {
      word: 'DOG',
      positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
      direction: 'horizontal',
      found: false,
    },
  ];
  return {
    grid,
    words,
    config: { rows: 5, cols: 4, wordCount: 2, minWordLength: 3, maxWordLength: 3, difficulty: 'easy' },
  };
}

/**
 * Tutorial C: 5x5 grid, 3 words (SUN, RED, ANT). Teaches gravity dependency.
 * ANT is only findable after SUN is cleared and letters fall.
 *
 * Grid layout:
 *   S  U  N  K  P
 *   R  E  D  W  H
 *   M  L  A  N  T
 *   B  J  Q  F  G
 *   X  V  C  I  O
 */
export function generateTutorialBoardC(): Board {
  tutorialCellId = 12000;
  const grid: Grid = [
    [tCell('S'), tCell('U'), tCell('N'), tCell('K'), tCell('P')],
    [tCell('R'), tCell('E'), tCell('D'), tCell('W'), tCell('H')],
    [tCell('M'), tCell('L'), tCell('A'), tCell('N'), tCell('T')],
    [tCell('B'), tCell('J'), tCell('Q'), tCell('F'), tCell('G')],
    [tCell('X'), tCell('V'), tCell('C'), tCell('I'), tCell('O')],
  ];
  const words: WordPlacement[] = [
    {
      word: 'SUN',
      positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
      direction: 'horizontal',
      found: false,
    },
    {
      word: 'RED',
      positions: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
      direction: 'horizontal',
      found: false,
    },
    {
      word: 'ANT',
      positions: [{ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }],
      direction: 'horizontal',
      found: false,
    },
  ];
  return {
    grid,
    words,
    config: { rows: 5, cols: 5, wordCount: 3, minWordLength: 3, maxWordLength: 3, difficulty: 'easy' },
  };
}

/**
 * Tutorial D: 5x5 grid, 2 words (ICE, TAP). Teaches that ORDER matters —
 * the rule behind the game's only invisible fail state.
 *
 * Boards B and C teach that letters fall and that a fall can REVEAL a word.
 * Neither teaches the consequence that actually ends runs: a fall can also
 * BURY one. A player who has never been shown this reads their first dead
 * board as the game being broken rather than as a move they could have made
 * differently, and that is a churn event rather than a difficulty curve.
 *
 * Grid layout:
 *   I  C  E  K  P
 *   R  W  D  N  H
 *   M  T  Q  F  G
 *   B  A  J  L  S
 *   X  P  V  I  O
 *
 * ICE sits along the top row; TAP runs down column 1 underneath its C.
 *
 * Take TAP first and column 1 collapses by three, dragging the C down to the
 * bottom while I and E stay put — ICE is broken apart and unreachable, with
 * every letter still visible on the board. That is exactly what a real dead
 * end looks like, which is why it is worth showing once under supervision.
 *
 * Take ICE first and nothing moves: the gap is at the top row, so there are
 * no letters above it to fall. TAP is untouched and the board finishes.
 *
 * The asymmetry is the whole lesson, and `tutorialOrderTrap.test.ts` pins it
 * against the real gravity and solver rather than against this comment.
 */
export function generateTutorialBoardD(): Board {
  tutorialCellId = 13000;
  const grid: Grid = [
    [tCell('I'), tCell('C'), tCell('E'), tCell('K'), tCell('P')],
    [tCell('R'), tCell('W'), tCell('D'), tCell('N'), tCell('H')],
    [tCell('M'), tCell('T'), tCell('Q'), tCell('F'), tCell('G')],
    [tCell('B'), tCell('A'), tCell('J'), tCell('L'), tCell('S')],
    [tCell('X'), tCell('P'), tCell('V'), tCell('I'), tCell('O')],
  ];
  const words: WordPlacement[] = [
    {
      word: 'ICE',
      positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
      direction: 'horizontal',
      found: false,
    },
    {
      word: 'TAP',
      positions: [{ row: 2, col: 1 }, { row: 3, col: 1 }, { row: 4, col: 1 }],
      direction: 'vertical',
      found: false,
    },
  ];
  return {
    grid,
    words,
    config: { rows: 5, cols: 5, wordCount: 2, minWordLength: 3, maxWordLength: 3, difficulty: 'easy' },
  };
}

// Keep backward compat — the original function now returns Board C
export function generateTutorialBoard(): Board {
  return generateTutorialBoardC();
}

/** Tutorial step definitions for the guided overlay */
export interface TutorialGuideStep {
  message: string;
  highlightPositions?: { row: number; col: number }[];
  highlightWord?: string;
  waitForAction?: 'tap_cells' | 'word_submitted' | 'gravity_done' | 'dismiss';
  showHandPointer?: boolean;
  /**
   * Keep highlightPositions for input validation (and for the gravity-replay
   * integrity test) but do NOT render them as hints — the player locates the
   * word themselves. This is the difference between teaching word-searching
   * and teaching tap-where-we-point.
   */
  hideHighlight?: boolean;
  delay?: number;
  board?: 'A' | 'B' | 'C' | 'D';
}

/**
 * Streamlined tutorial: 1 board (B), 3 steps.
 * Teaches both selection and gravity in a single board experience.
 *
 * Board B layout: CAT is in the middle row (row 2). D,O,G are at row 0.
 * After clearing CAT, gravity pulls D,O,G down from row 0 to row 1 — a visible drop.
 * Player then finds DOG at its new post-gravity position (row 1).
 *
 * Step 1: Find CAT at row 2 (teaches tap-to-select)
 * Step 2: Observe gravity (D,O,G fall down — dismiss to continue)
 * Step 3: Find DOG at row 1 (post-gravity position) → completes tutorial
 */
export const TUTORIAL_STEPS: TutorialGuideStep[] = [
  {
    message: 'Tap or drag across C, A, T to spell the first word on your list!',
    highlightPositions: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
    highlightWord: 'CAT',
    waitForAction: 'word_submitted',
    showHandPointer: true,
    board: 'B',
  },
  {
    message: 'Letters fall down to fill the gap. This is gravity!',
    waitForAction: 'dismiss',
    delay: 600,
    board: 'B',
  },
  {
    // The real skill loop is read-the-list → scan the grid → trace. This is
    // the one step where the player does it unaided: DOG's post-gravity
    // positions stay authored (input validation + the gravity-replay
    // integrity test) but are not shown, and there is no hand pointer. A
    // 5×4 board keeps the search trivially winnable.
    message: 'DOG is still on your list — find it!',
    highlightPositions: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
    highlightWord: 'DOG',
    waitForAction: 'word_submitted',
    showHandPointer: false,
    hideHighlight: true,
    delay: 300,
    board: 'B',
  },
  // Steps 4-5: the order-matters lesson on board D.
  //
  // Everything above teaches that falling letters REVEAL words. Nothing
  // taught that falling letters can also BURY one, which is the game's only
  // invisible fail state — so a player's first dead board arrived with no
  // concept to attach it to and read as a bug.
  //
  // The player performs the losing move themselves and watches ICE come
  // apart. Being told the rule is forgettable; watching three letters you
  // were about to trace drift out of reach is not. It is safe to teach this
  // way because input is gated to the highlighted cells and the tutorial
  // ends on the demonstration rather than asking them to solve board D.
  {
    message: 'One more rule — order matters. Tap T, A, P.',
    highlightPositions: [{ row: 2, col: 1 }, { row: 3, col: 1 }, { row: 4, col: 1 }],
    highlightWord: 'TAP',
    waitForAction: 'word_submitted',
    showHandPointer: true,
    board: 'D',
  },
  {
    message:
      'ICE just broke apart. I, C and E are all still there — just not touching any more. Clear the word on top first.',
    waitForAction: 'dismiss',
    delay: 700,
    board: 'D',
  },
];

/**
 * Legacy full tutorial steps (7 steps across 3 boards).
 * Kept for backward compatibility with tests and any code referencing them.
 */
export const LEGACY_TUTORIAL_STEPS: TutorialGuideStep[] = [
  // Tutorial A: Tap to Find
  {
    message: 'Welcome! Tap the letters G, O to spell GO.',
    highlightPositions: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
    highlightWord: 'GO',
    waitForAction: 'word_submitted',
    showHandPointer: true,
    board: 'A',
  },
  {
    message: 'Great! Now find HI.',
    highlightPositions: [{ row: 1, col: 1 }, { row: 1, col: 2 }],
    highlightWord: 'HI',
    waitForAction: 'word_submitted',
    showHandPointer: true,
    board: 'A',
  },
  // Tutorial B: Letters Fall
  {
    message: 'Now watch what happens! Find CAT at the top.',
    highlightPositions: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
    highlightWord: 'CAT',
    waitForAction: 'word_submitted',
    showHandPointer: true,
    board: 'B',
  },
  {
    message: 'See how letters fall down? Now find DOG!',
    highlightPositions: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
    waitForAction: 'word_submitted',
    highlightWord: 'DOG',
    showHandPointer: true,
    delay: 800,
    board: 'B',
  },
  // Tutorial C: Order Matters
  {
    message: 'Order matters! Find SUN first to make letters fall.',
    highlightPositions: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
    highlightWord: 'SUN',
    waitForAction: 'word_submitted',
    showHandPointer: true,
    board: 'C',
  },
  {
    message: 'Now find RED.',
    highlightPositions: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
    highlightWord: 'RED',
    waitForAction: 'word_submitted',
    showHandPointer: true,
    board: 'C',
  },
  {
    message: 'Last one! Find ANT to complete the puzzle.',
    highlightPositions: [{ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }],
    highlightWord: 'ANT',
    waitForAction: 'word_submitted',
    showHandPointer: true,
    board: 'C',
  },
];
