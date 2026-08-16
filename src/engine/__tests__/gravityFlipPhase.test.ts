/**
 * GRAVITY FLIP — the dead-end detector must simulate the SAME gravity the
 * game is about to apply.
 *
 * In gravityFlip the gravity direction advances one step of
 * ['down','right','up','left'] after every word cleared. The reducer keeps
 * `state.gravityDirection` as the direction that will be used for the NEXT
 * clear, advancing it immediately after each one — so the live direction
 * already encodes every word cleared so far.
 *
 * isDeadEndGravityFlip was handed BOTH that live direction and the move
 * count, and solveWithRotatingGravity offsets the start direction by the move
 * count on top of it. The offset was therefore applied twice and the
 * simulation ran up to three quarter-turns out of phase with the real board.
 *
 * That is not a cosmetic slip. The detector drives the stuck banner and the
 * free rescue, so out of phase it can announce "no moves left" on a board
 * that is perfectly solvable, or stay silent while the player grinds at one
 * that is already dead. It only surfaced when the three cheap heuristic
 * orderings failed and execution fell through to the backtracking solver —
 * i.e. precisely on the hard boards where the answer matters.
 */
import { generateBoard } from '../boardGenerator';
import {
  isDeadEndGravityFlip,
  solveWithRotatingGravity,
  findWordInGrid,
} from '../solver';
import { removeCellsAndApplyGravityInDirection } from '../gravity';
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

/**
 * Ground truth: is this live position solvable, playing by the reducer's
 * rules from here? The live direction is used as-is for the next clear,
 * with no extra offset — that is the whole point.
 */
function reallySolvable(grid: Grid, words: string[], direction: GravityDirection): boolean {
  return (
    solveWithRotatingGravity(grid, words, direction, 0, { remaining: 200_000 }) !== null
  );
}

/** One clear, applying gravity exactly the way the reducer does. */
function advance(grid: Grid, word: string, direction: GravityDirection) {
  const occurrences = findWordInGrid(grid, word, 1);
  if (occurrences.length === 0) return null;
  const nextGrid = removeCellsAndApplyGravityInDirection(grid, occurrences[0], direction);
  const nextDirection = CYCLE[(CYCLE.indexOf(direction) + 1) % 4];
  return { grid: nextGrid, direction: nextDirection };
}

describe('isDeadEndGravityFlip agrees with the board in front of the player', () => {
  it('never contradicts a ground-truth solve at any point in a playthrough', () => {
    let checked = 0;
    let offPhase = 0;
    const examples: string[] = [];

    for (let seed = 1; seed <= 60; seed++) {
      let board;
      try {
        board = generateBoard(CONFIG, seed * 733 + 11, 'gravityFlip');
      } catch {
        continue;
      }

      let grid: Grid = board.grid;
      let direction: GravityDirection = 'down';
      let remaining = board.words.map((w) => w.word);
      let movesMade = 0;

      // Walk the board forward, clearing the first findable word each time,
      // so later iterations land on move counts that are NOT multiples of 4 —
      // the states where a double-applied offset actually differs.
      while (remaining.length > 1 && movesMade < 4) {
        const findable = remaining.filter((w) => findWordInGrid(grid, w, 1).length > 0);
        if (findable.length === 0) break;

        const truth = !reallySolvable(grid, remaining, direction);
        const reported = isDeadEndGravityFlip(grid, remaining, direction);
        checked++;
        if (truth !== reported) {
          offPhase++;
          if (examples.length < 3) {
            examples.push(
              `seed ${seed} after ${movesMade} moves, dir=${direction}: ` +
                `solver says dead=${reported}, ground truth dead=${truth}`,
            );
          }
        }

        const next = advance(grid, findable[0], direction);
        if (!next) break;
        grid = next.grid;
        direction = next.direction;
        remaining = remaining.filter((w) => w !== findable[0]);
        movesMade++;
      }
    }

    expect(checked).toBeGreaterThan(20);
    expect(
      offPhase === 0
        ? ''
        : `${offPhase}/${checked} disagreements:\n${examples.join('\n')}`,
    ).toBe('');
  }, 180_000);

  it('takes no move count — the live direction is the whole state', () => {
    // The signature is the guard. `currentDirection` fully describes where
    // the cycle is, so there is nothing else to pass; accepting a move count
    // is what let the offset be applied twice. Pinning the arity means
    // re-adding the parameter fails here rather than silently going back out
    // of phase.
    expect(isDeadEndGravityFlip.length).toBe(3);
  });

  it('answers consistently for a given direction', () => {
    const board = generateBoard(CONFIG, 4242, 'gravityFlip');
    const words = board.words.map((w) => w.word);
    for (const direction of CYCLE) {
      const first = isDeadEndGravityFlip(board.grid, words, direction);
      expect(isDeadEndGravityFlip(board.grid, words, direction)).toBe(first);
    }
  }, 120_000);
});
