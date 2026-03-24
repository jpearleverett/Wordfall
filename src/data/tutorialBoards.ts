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
 * After clearing CAT (top row), letters fall visibly.
 *
 * Grid layout:
 *   C  A  T  X
 *   D  O  G  P
 *   R  K  W  H
 *   M  L  F  N
 *   B  J  Q  S
 */
export function generateTutorialBoardB(): Board {
  tutorialCellId = 11000;
  const grid: Grid = [
    [tCell('C'), tCell('A'), tCell('T'), tCell('X')],
    [tCell('D'), tCell('O'), tCell('G'), tCell('P')],
    [tCell('R'), tCell('K'), tCell('W'), tCell('H')],
    [tCell('M'), tCell('L'), tCell('F'), tCell('N')],
    [tCell('B'), tCell('J'), tCell('Q'), tCell('S')],
  ];
  const words: WordPlacement[] = [
    {
      word: 'CAT',
      positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
      direction: 'horizontal',
      found: false,
    },
    {
      word: 'DOG',
      positions: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
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
  delay?: number;
  board?: 'A' | 'B' | 'C';
}

export const TUTORIAL_STEPS: TutorialGuideStep[] = [
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
    highlightWord: 'RED',
    waitForAction: 'word_submitted',
    showHandPointer: true,
    board: 'C',
  },
  {
    message: 'Last one! Find ANT to complete the puzzle.',
    highlightWord: 'ANT',
    waitForAction: 'word_submitted',
    showHandPointer: true,
    board: 'C',
  },
];
