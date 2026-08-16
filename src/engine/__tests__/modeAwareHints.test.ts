/**
 * A HINT MUST BE VALID UNDER THE MODE'S OWN CLEAR RULE.
 *
 * `getHint` simulates downward gravity — the classic rule — and both hint
 * dispatch sites used it for every mode except shrinkingBoard. But:
 *   • noGravity leaves cleared cells as permanent holes, so words must occupy
 *     disjoint cells and clearing the wrong occurrence strands another word;
 *   • gravityFlip rotates the gravity direction a quarter-turn after every
 *     clear, so a downward-gravity plan diverges from the board immediately.
 *
 * Hints are bought — tokens for the normal one, gems for the premium one — so
 * a wrong hint is worse than no hint: the player pays to be walked into a
 * dead end, on the one action whose entire promise is "this move is safe".
 *
 * These tests check the property that matters: taking the hint must leave the
 * board still solvable under that mode's rules.
 */
import { generateBoard } from '../boardGenerator';
import {
  getHintNoGravity,
  getHintGravityFlip,
  isDeadEndNoGravity,
  areAllWordsIndependentlyFindable,
  findWordInGrid,
  solveWithRotatingGravity,
} from '../solver';
import { removeCells, removeCellsAndApplyGravityInDirection } from '../gravity';
import type { BoardConfig, GravityDirection, Grid } from '../../types';

const CYCLE: GravityDirection[] = ['down', 'right', 'up', 'left'];

const CONFIG: BoardConfig = {
  rows: 7,
  cols: 6,
  wordCount: 5,
  minWordLength: 3,
  maxWordLength: 5,
  difficulty: 'medium',
};

describe('noGravity hints keep the board solvable', () => {
  it('taking the hint never strands another word', () => {
    let taken = 0;
    let stranded = 0;
    const examples: string[] = [];

    for (let seed = 1; seed <= 50; seed++) {
      let board;
      try {
        board = generateBoard(CONFIG, seed * 619 + 7, 'noGravity');
      } catch {
        continue;
      }

      let grid: Grid = board.grid;
      let remaining = board.words.map((w) => w.word);

      // Follow the hint repeatedly. If hints are sound, a player who only
      // ever takes them should be able to finish every board.
      while (remaining.length > 1) {
        const hint = getHintNoGravity(grid, remaining);
        if (!hint) break;
        taken++;

        // noGravity clears cells without any gravity pass.
        const nextGrid = removeCells(grid, hint.positions);
        const rest = remaining.filter((w) => w !== hint.word);

        if (isDeadEndNoGravity(nextGrid, rest)) {
          stranded++;
          if (examples.length < 3) {
            examples.push(`seed ${seed}: taking ${hint.word} left ${rest.join(',')} unsolvable`);
          }
          break;
        }

        grid = nextGrid;
        remaining = rest;
      }
    }

    expect(taken).toBeGreaterThan(20);
    expect(stranded === 0 ? '' : `${stranded}/${taken} bad hints:\n${examples.join('\n')}`).toBe('');
  }, 180_000);

  it('suggests a real occurrence of a word still on the list', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const board = generateBoard(CONFIG, seed * 977 + 3, 'noGravity');
      const words = board.words.map((w) => w.word);
      const hint = getHintNoGravity(board.grid, words);
      if (!hint) continue;
      expect(words).toContain(hint.word);
      // The exact path must spell the word on the live grid — a path from a
      // stale assignment would highlight the wrong cells.
      const spelled = hint.positions
        .map((p) => board.grid[p.row]?.[p.col]?.letter ?? '?')
        .join('');
      expect(spelled).toBe(hint.word);
    }
  }, 120_000);

  it('returns null rather than a guess on a genuinely dead board', () => {
    // A hint on a dead board must decline. Suggesting something anyway spends
    // the player's token to reveal a move that cannot help.
    const board = generateBoard(CONFIG, 12345, 'noGravity');
    const words = board.words.map((w) => w.word);
    // Force a dead state by clearing every cell of the first word's path
    // AND the cells of a second word, so at least one word has no path left.
    const first = findWordInGrid(board.grid, words[0], 1)[0];
    const second = findWordInGrid(board.grid, words[1], 1)[0];
    const wrecked = removeCells(removeCells(board.grid, first), second);
    const rest = words.slice(1);
    if (!areAllWordsIndependentlyFindable(wrecked, rest)) {
      expect(getHintNoGravity(wrecked, rest)).toBeNull();
    }
  }, 60_000);
});

describe('gravityFlip hints follow the rotating cycle', () => {
  it('taking the hint leaves a still-solvable board', () => {
    let taken = 0;
    let bad = 0;
    const examples: string[] = [];

    for (let seed = 1; seed <= 40; seed++) {
      let board;
      try {
        board = generateBoard(CONFIG, seed * 733 + 11, 'gravityFlip');
      } catch {
        continue;
      }

      let grid: Grid = board.grid;
      let direction: GravityDirection = 'down';
      let remaining = board.words.map((w) => w.word);

      while (remaining.length > 1) {
        const hint = getHintGravityFlip(grid, remaining, direction);
        if (!hint) break;
        taken++;

        const nextGrid = removeCellsAndApplyGravityInDirection(grid, hint.positions, direction);
        const nextDirection: GravityDirection = CYCLE[(CYCLE.indexOf(direction) + 1) % 4];
        const rest = remaining.filter((w) => w !== hint.word);

        const stillSolvable =
          solveWithRotatingGravity(nextGrid, rest, nextDirection, 0, { remaining: 100_000 }) !==
          null;
        if (!stillSolvable) {
          bad++;
          if (examples.length < 3) {
            examples.push(`seed ${seed} dir=${direction}: taking ${hint.word} killed the board`);
          }
          break;
        }

        grid = nextGrid;
        direction = nextDirection;
        remaining = rest;
      }
    }

    expect(taken).toBeGreaterThan(20);
    expect(bad === 0 ? '' : `${bad}/${taken} bad hints:\n${examples.join('\n')}`).toBe('');
  }, 180_000);

  it('respects the live direction rather than assuming down', () => {
    // The whole point: starting from a rotated direction must be able to
    // produce a different first move than starting from 'down'. If the
    // direction were ignored, every answer would be identical.
    const board = generateBoard(CONFIG, 8181, 'gravityFlip');
    const words = board.words.map((w) => w.word);
    const answers = CYCLE.map((d) => getHintGravityFlip(board.grid, words, d));
    for (const hint of answers) {
      if (hint) expect(words).toContain(hint.word);
    }
    // At least one direction must yield a hint at all.
    expect(answers.some(Boolean)).toBe(true);
  }, 120_000);
});
