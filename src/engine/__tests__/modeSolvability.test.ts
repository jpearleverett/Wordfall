/**
 * A GENERATED BOARD MUST BE SOLVABLE UNDER THE MODE IT WAS GENERATED FOR.
 *
 * Two bugs on this branch came from a mode's clear rule being simulated with
 * the WRONG mechanic: the gravityFlip dead-end detector ran a quarter-turn
 * out of phase, and hints for noGravity/gravityFlip planned against downward
 * gravity. Both were one layer above generation.
 *
 * Generation itself dispatches correctly today — noGravity validates with
 * areAllWordsIndependentlyFindable, gravityFlip with isSolvableGravityFlip,
 * shrinkingBoard with isSolvableShrinkingBoard — but that dispatch is a
 * single `if` chain, and a board that ships unsolvable is unwinnable from the
 * first move with no signal that anything is wrong. The player just loses.
 *
 * So this checks the end-to-end property rather than the dispatch: take what
 * the generator actually returns and confirm a solution exists under that
 * mode's real rules.
 */
import { generateBoard } from '../boardGenerator';
import {
  areAllWordsIndependentlyFindable,
  isSolvableGravityFlip,
  isSolvableShrinkingBoard,
  isSolvable,
  findWordInGrid,
} from '../solver';
import type { BoardConfig, GameMode } from '../../types';

const CONFIG: BoardConfig = {
  rows: 7,
  cols: 6,
  wordCount: 5,
  minWordLength: 3,
  maxWordLength: 5,
  difficulty: 'medium',
};

/** Does a solution exist under this mode's own clear rule? */
function solvableForMode(mode: GameMode, board: ReturnType<typeof generateBoard>): boolean {
  const words = board.words.map((w) => w.word);
  switch (mode) {
    case 'noGravity':
      return areAllWordsIndependentlyFindable(board.grid, words);
    case 'gravityFlip':
      return isSolvableGravityFlip(board.grid, words, 'down');
    case 'shrinkingBoard':
      return isSolvableShrinkingBoard(board.grid, words, 2, 2000);
    default: {
      // isSolvable takes a word -> positions map, used to skip re-searching
      // for placements the generator already knows.
      const positions = new Map(board.words.map((w) => [w.word, w.positions]));
      return isSolvable(board.grid, words, positions, 2000);
    }
  }
}

// Every mode the generator is asked for. 'daily' and 'weekly' are excluded
// only because they have dedicated generators with their own suites
// (sharedBoards.test.ts) — every mode that goes through generateBoard is here.
const MODES: GameMode[] = [
  'classic',
  'noGravity',
  'gravityFlip',
  'shrinkingBoard',
  'timePressure',
  'expert',
  'relax',
  'perfectSolve',
];

describe('generated boards are solvable under their own mode', () => {
  it.each(MODES)('%s', (mode) => {
    let generated = 0;
    let unsolvable = 0;
    const examples: string[] = [];

    for (let seed = 1; seed <= 25; seed++) {
      let board;
      try {
        board = generateBoard(CONFIG, seed * 1013 + 29, mode);
      } catch {
        // Generation is allowed to give up on a seed; that surfaces as the
        // board-gen timeout banner rather than an unwinnable puzzle.
        continue;
      }
      generated++;

      if (!solvableForMode(mode, board)) {
        unsolvable++;
        if (examples.length < 3) {
          examples.push(`seed ${seed}: ${board.words.map((w) => w.word).join(',')}`);
        }
      }
    }

    // The suite is only meaningful if generation actually produced boards.
    expect(generated).toBeGreaterThan(10);
    expect(
      unsolvable === 0
        ? ''
        : `${unsolvable}/${generated} unsolvable ${mode} boards:\n${examples.join('\n')}`,
    ).toBe('');
  }, 240_000);
});

describe('every word on the list is present at generation time', () => {
  it.each(MODES)('%s', (mode) => {
    // Weaker than solvability but catches a different failure: a find-list
    // entry that was never placed. The player would hunt for a word that is
    // not on the board at all, which reads as the game being broken rather
    // than hard.
    for (let seed = 1; seed <= 15; seed++) {
      let board;
      try {
        board = generateBoard(CONFIG, seed * 617 + 43, mode);
      } catch {
        continue;
      }
      for (const placement of board.words) {
        expect(findWordInGrid(board.grid, placement.word, 1).length).toBeGreaterThan(0);
      }
    }
  }, 180_000);
});
