import { Board, Grid, Cell, WordPlacement } from '../types';

let tutorialCellId = 10000;
function tCell(letter: string): Cell {
  return { letter, id: `tcell_${++tutorialCellId}` };
}

/**
 * Pre-built tutorial board: 5x4 grid with 3 easy words (CAT, DOG, SUN).
 * The board is hand-crafted so the words are in obvious positions
 * and the tutorial can guide the player step-by-step.
 *
 * Grid layout:
 *   C  A  T  X
 *   D  O  G  P
 *   S  U  N  Q
 *   B  R  K  W
 *   M  L  F  H
 */
export function generateTutorialBoard(): Board {
  tutorialCellId = 10000;

  const grid: Grid = [
    [tCell('C'), tCell('A'), tCell('T'), tCell('X')],
    [tCell('D'), tCell('O'), tCell('G'), tCell('P')],
    [tCell('S'), tCell('U'), tCell('N'), tCell('Q')],
    [tCell('B'), tCell('R'), tCell('K'), tCell('W')],
    [tCell('M'), tCell('L'), tCell('F'), tCell('H')],
  ];

  const words: WordPlacement[] = [
    {
      word: 'CAT',
      positions: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
      direction: 'horizontal',
      found: false,
    },
    {
      word: 'DOG',
      positions: [
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ],
      direction: 'horizontal',
      found: false,
    },
    {
      word: 'SUN',
      positions: [
        { row: 2, col: 0 },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
      ],
      direction: 'horizontal',
      found: false,
    },
  ];

  return {
    grid,
    words,
    config: {
      rows: 5,
      cols: 4,
      wordCount: 3,
      minWordLength: 3,
      maxWordLength: 3,
      difficulty: 'easy',
    },
  };
}

/** Tutorial step definitions for the guided overlay */
export interface TutorialGuideStep {
  message: string;
  highlightPositions?: { row: number; col: number }[];
  highlightWord?: string;
  waitForAction?: 'tap_cells' | 'word_submitted' | 'gravity_done' | 'dismiss';
  showHandPointer?: boolean;
  delay?: number;
}

export const TUTORIAL_STEPS: TutorialGuideStep[] = [
  {
    message: 'Find the hidden words! Tap the letters C, A, T to spell CAT.',
    highlightPositions: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ],
    highlightWord: 'CAT',
    waitForAction: 'word_submitted',
    showHandPointer: true,
  },
  {
    message: 'Letters fall down to fill gaps. Now find DOG!',
    waitForAction: 'word_submitted',
    highlightWord: 'DOG',
    showHandPointer: true,
    delay: 800,
  },
  {
    message: 'Last one! Find SUN to complete the puzzle.',
    waitForAction: 'word_submitted',
    highlightWord: 'SUN',
    showHandPointer: true,
  },
];
