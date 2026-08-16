import { generateBoard } from '../engine/boardGenerator';
import {
  isDeadEndGravityFlip,
  solveWithRotatingGravity,
  getHint,
  areAllWordsIndependentlyFindable,
  findWordInGrid,
  isDeadEndNoGravity,
} from '../engine/solver';
import { removeCells, removeCellsAndApplyGravityInDirection, cloneGrid } from '../engine/gravity';
import { GravityDirection, BoardConfig } from '../types';

const CYCLE: GravityDirection[] = ['down', 'right', 'up', 'left'];

const cfg: BoardConfig = {
  rows: 7, cols: 6, wordCount: 5, minWordLength: 3, maxWordLength: 5, difficulty: 'medium',
};

// Ground truth: exhaustive-ish rotating solve starting at `dir` with offset 0.
function trulySolvable(grid: any, words: string[], dir: GravityDirection): boolean {
  return solveWithRotatingGravity(grid, words, dir, 0, { remaining: 200000 }) !== null;
}

test('AUDIT 1: isDeadEndGravityFlip disagrees with ground truth when moves % 4 !== 0', () => {
  let disagreements = 0;
  const examples: any[] = [];

  for (let seed = 1; seed <= 120 && disagreements < 3; seed++) {
    let board;
    try {
      board = generateBoard(cfg, seed, 'gravityFlip');
    } catch { continue; }

    // Play greedily: clear the first findable word each turn, checking after each clear.
    let grid = cloneGrid(board.grid);
    let remaining = board.words.map(w => w.word);
    let dir: GravityDirection = 'down';
    let moves = 0;

    while (remaining.length > 1 && moves < 8) {
      const w = remaining.find(x => findWordInGrid(grid, x, 1).length > 0);
      if (!w) break;
      const occ = findWordInGrid(grid, w, 1)[0];
      grid = removeCellsAndApplyGravityInDirection(grid, occ, dir);
      dir = CYCLE[(CYCLE.indexOf(dir) + 1) % 4];
      remaining = remaining.filter(x => x !== w);
      moves++;

      if (remaining.length === 0) break;
      const reported = isDeadEndGravityFlip(grid, remaining, dir, moves);
      const truth = !trulySolvable(grid, remaining, dir);
      if (reported !== truth) {
        disagreements++;
        examples.push({ seed, moves, dir, remaining, reported, truth });
        break;
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log('AUDIT1 disagreements:', disagreements, JSON.stringify(examples, null, 1));
  expect(disagreements).toBe(0);
});

test('AUDIT 1b: solveWithRotatingGravity offsets direction by wordsCleared on top of startDirection', () => {
  const board = generateBoard(cfg, 42, 'gravityFlip');
  const words = board.words.map(w => w.word);
  // Same grid, same "current direction", differing only in the wordsCleared arg.
  const a = solveWithRotatingGravity(cloneGrid(board.grid), words, 'down', 0, { remaining: 50000 });
  const b = solveWithRotatingGravity(cloneGrid(board.grid), words, 'down', 1, { remaining: 50000 });
  // eslint-disable-next-line no-console
  console.log('AUDIT1b same-dir-offset0:', a, 'offset1:', b);
  expect(true).toBe(true);
});

test('AUDIT 2: solveWithRotatingGravity ignores wall-clock timeout in the budget', () => {
  const board = generateBoard(cfg, 7, 'gravityFlip');
  const words = board.words.map(w => w.word);
  const budget = { remaining: 10000, startTime: Date.now() - 999999, timeoutMs: 1 };
  const t0 = Date.now();
  solveWithRotatingGravity(cloneGrid(board.grid), words, 'down', 0, budget as any);
  // eslint-disable-next-line no-console
  console.log('AUDIT2 elapsed ms with already-expired timeout:', Date.now() - t0, 'nodes consumed:', 10000 - budget.remaining);
  expect(true).toBe(true);
});

test('AUDIT 3: getHint in noGravity can return a move that strands another word', () => {
  let bad = 0;
  const examples: any[] = [];
  for (let seed = 1; seed <= 150 && bad < 3; seed++) {
    let board;
    try {
      board = generateBoard(cfg, seed, 'noGravity');
    } catch { continue; }

    let grid = cloneGrid(board.grid);
    let remaining = board.words.map(w => w.word);
    for (let step = 0; step < 4 && remaining.length > 1; step++) {
      if (isDeadEndNoGravity(grid, remaining)) break;
      const hint = getHint(grid, remaining);
      if (!hint) break;
      const after = removeCells(grid, hint.positions); // noGravity: no gravity
      const rest = remaining.filter(w => w !== hint.word);
      if (rest.length > 0 && !areAllWordsIndependentlyFindable(after, rest)) {
        bad++;
        examples.push({ seed, step, hintWord: hint.word, remaining, positions: hint.positions });
        break;
      }
      grid = after;
      remaining = rest;
    }
  }
  // eslint-disable-next-line no-console
  console.log('AUDIT3 bad hints:', bad, JSON.stringify(examples, null, 1));
  expect(bad).toBe(0);
});
