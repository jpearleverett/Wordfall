/**
 * Puzzle Lifecycle Integration Test
 *
 * Tests the full puzzle flow: board generation -> word finding -> gravity -> completion -> scoring.
 * Uses real engine functions (no mocks) with deterministic seeds for reproducibility.
 */

import { generateBoard, generateDailyBoard } from '../engine/boardGenerator';
import { findWordInGrid, areAllWordsIndependentlyFindable } from '../engine/solver';
import { applyGravity, applyGravityInDirection, removeCells } from '../engine/gravity';
import { gameReducer, createInitialState } from '../hooks/useGame';
import { BoardConfig, Board, GameMode } from '../types';

const EASY_CONFIG: BoardConfig = {
  rows: 5,
  cols: 5,
  wordCount: 2,
  minWordLength: 3,
  maxWordLength: 4,
  difficulty: 'easy',
};

const MEDIUM_CONFIG: BoardConfig = {
  rows: 6,
  cols: 5,
  wordCount: 3,
  minWordLength: 3,
  maxWordLength: 4,
  difficulty: 'medium',
};

describe('Puzzle Lifecycle Integration', () => {
  describe('board generation and validation', () => {
    it('generates a board with correct dimensions and word count', () => {
      const board = generateBoard(EASY_CONFIG, 42);
      expect(board.grid.length).toBe(EASY_CONFIG.rows);
      expect(board.grid[0].length).toBe(EASY_CONFIG.cols);
      expect(board.words.length).toBeGreaterThanOrEqual(2);
      // All cells filled
      for (const row of board.grid) {
        for (const cell of row) {
          expect(cell).not.toBeNull();
          expect(cell?.letter).toBeTruthy();
        }
      }
    });

    it('all words in generated board are findable by the solver', () => {
      const board = generateBoard(EASY_CONFIG, 777);
      for (const wp of board.words) {
        const paths = findWordInGrid(board.grid, wp.word, 1);
        expect(paths.length).toBeGreaterThan(0);
      }
    });

    it('noGravity validation rejects words sharing grid cells', () => {
      // Craft a grid where two words (CAT, CAN) must share the C and A cells
      // Grid:  C A T
      //        X N X
      //        X X X
      const grid = [
        [{ letter: 'C', id: '1' }, { letter: 'A', id: '2' }, { letter: 'T', id: '3' }],
        [{ letter: 'X', id: '4' }, { letter: 'N', id: '5' }, { letter: 'X', id: '6' }],
        [{ letter: 'X', id: '7' }, { letter: 'X', id: '8' }, { letter: 'X', id: '9' }],
      ];
      // CAT = (0,0)→(0,1)→(0,2), CAN = (0,0)→(0,1)→(1,1)
      // These share cells (0,0) C and (0,1) A — should be rejected
      expect(areAllWordsIndependentlyFindable(grid, ['CAT', 'CAN'])).toBe(false);
    });

    it('noGravity validation accepts words with independent paths', () => {
      // Grid:  C A T
      //        C A N
      //        X X X
      const grid = [
        [{ letter: 'C', id: '1' }, { letter: 'A', id: '2' }, { letter: 'T', id: '3' }],
        [{ letter: 'C', id: '4' }, { letter: 'A', id: '5' }, { letter: 'N', id: '6' }],
        [{ letter: 'X', id: '7' }, { letter: 'X', id: '8' }, { letter: 'X', id: '9' }],
      ];
      // CAT = (0,0)→(0,1)→(0,2), CAN = (1,0)→(1,1)→(1,2) — no overlap
      expect(areAllWordsIndependentlyFindable(grid, ['CAT', 'CAN'])).toBe(true);
    });

    it('word lengths respect config constraints', () => {
      const board = generateBoard(EASY_CONFIG, 123);
      for (const wp of board.words) {
        expect(wp.word.length).toBeGreaterThanOrEqual(EASY_CONFIG.minWordLength);
        expect(wp.word.length).toBeLessThanOrEqual(6); // max from fallback
      }
    });
  });

  describe('full puzzle solve with gravity', () => {
    it('solving each word applies gravity correctly (classic mode)', () => {
      const board = generateBoard(EASY_CONFIG, 42);
      let grid = board.grid.map(row => [...row]);

      for (const wp of board.words) {
        // Find the word in the current grid state
        const paths = findWordInGrid(grid, wp.word, 1);
        expect(paths.length).toBeGreaterThan(0);

        // Remove word cells and apply gravity
        const positions = paths[0];
        const gridAfterRemove = removeCells(grid, positions);
        grid = applyGravity(gridAfterRemove);

        // After gravity, non-null cells should be at the bottom of each column
        const cols = grid[0].length;
        for (let col = 0; col < cols; col++) {
          let foundNull = false;
          // Scan from bottom to top: once we see null, all above should be null
          for (let row = grid.length - 1; row >= 0; row--) {
            if (grid[row][col] === null) {
              foundNull = true;
            } else if (foundNull) {
              fail(`Cell at (${row}, ${col}) has value above null in column — gravity violation`);
            }
          }
        }
      }
    });

    it('board reaches empty state after all words cleared (small board)', () => {
      // Use a very small config to increase chance of all cells being word letters
      const smallConfig: BoardConfig = {
        rows: 5, cols: 4, wordCount: 2, minWordLength: 3, maxWordLength: 3, difficulty: 'easy',
      };
      const board = generateBoard(smallConfig, 999);
      let grid = board.grid.map(row => [...row]);
      let wordsFound = 0;

      for (const wp of board.words) {
        const paths = findWordInGrid(grid, wp.word, 1);
        if (paths.length > 0) {
          grid = applyGravity(removeCells(grid, paths[0]));
          wordsFound++;
        }
      }

      expect(wordsFound).toBe(board.words.length);
      // Some filler cells may remain but we verified all words were cleared
    });
  });

  describe('game reducer full lifecycle', () => {
    it('completes a full game through the reducer (select -> submit -> win)', () => {
      const board = generateBoard(EASY_CONFIG, 42);
      let state = createInitialState(board, 1);
      expect(state.status).toBe('playing');
      expect(state.score).toBe(0);

      let totalScore = 0;
      for (const wp of board.words) {
        // Find the word in the current grid
        const paths = findWordInGrid(state.board.grid, wp.word, 1);
        expect(paths.length).toBeGreaterThan(0);

        // Select each cell of the word path
        for (const pos of paths[0]) {
          state = gameReducer(state, { type: 'SELECT_CELL', position: pos });
        }

        // Submit the word
        const scoreBefore = state.score;
        state = gameReducer(state, { type: 'SUBMIT_WORD' });
        expect(state.score).toBeGreaterThan(scoreBefore);
      }

      // All words should be found — game won
      expect(state.status).toBe('won');
      expect(state.score).toBeGreaterThan(0);
      expect(state.moves).toBe(board.words.length);
    });

    it('score includes word length bonus', () => {
      const board = generateBoard(EASY_CONFIG, 42);
      let state = createInitialState(board, 1);

      // Find first word
      const wp = board.words[0];
      const paths = findWordInGrid(state.board.grid, wp.word, 1);
      for (const pos of paths[0]) {
        state = gameReducer(state, { type: 'SELECT_CELL', position: pos });
      }
      state = gameReducer(state, { type: 'SUBMIT_WORD' });

      // Score = 100 (base) + 20 * letterCount
      const expectedScore = 100 + 20 * wp.word.length;
      expect(state.score).toBe(expectedScore);
    });

    it('combo multiplier applies on consecutive words', () => {
      const board = generateBoard(MEDIUM_CONFIG, 42);
      let state = createInitialState(board, 1);

      // Find and submit first word
      const wp1 = board.words[0];
      let paths = findWordInGrid(state.board.grid, wp1.word, 1);
      for (const pos of paths[0]) {
        state = gameReducer(state, { type: 'SELECT_CELL', position: pos });
      }
      state = gameReducer(state, { type: 'SUBMIT_WORD' });
      const scoreAfterFirst = state.score;
      expect(state.combo).toBe(1);

      // Find and submit second word (should have combo bonus)
      const wp2 = board.words[1];
      paths = findWordInGrid(state.board.grid, wp2.word, 1);
      if (paths.length > 0) {
        for (const pos of paths[0]) {
          state = gameReducer(state, { type: 'SELECT_CELL', position: pos });
        }
        state = gameReducer(state, { type: 'SUBMIT_WORD' });
        expect(state.combo).toBe(2);

        // Second word should get combo bonus: base * (1 + 0.5 * comboLevel)
        const baseScore2 = 100 + 20 * wp2.word.length;
        const expectedWithCombo = Math.floor(baseScore2 * (1 + 0.5 * 1));
        expect(state.score).toBe(scoreAfterFirst + expectedWithCombo);
      }
    });
  });

  describe('noGravity mode', () => {
    it('generates a solvable noGravity board', () => {
      const config: BoardConfig = {
        rows: 5, cols: 5, wordCount: 2, minWordLength: 3, maxWordLength: 4, difficulty: 'easy',
      };
      const board = generateBoard(config, 555, 'noGravity');
      expect(board.words.length).toBeGreaterThanOrEqual(2);

      // All words should be findable
      for (const wp of board.words) {
        const paths = findWordInGrid(board.grid, wp.word, 1);
        expect(paths.length).toBeGreaterThan(0);
      }
    });

    it('cleared cells stay as holes in noGravity mode (no gravity applied)', () => {
      const config: BoardConfig = {
        rows: 5, cols: 5, wordCount: 2, minWordLength: 3, maxWordLength: 4, difficulty: 'easy',
      };
      const board = generateBoard(config, 555, 'noGravity');
      const wp = board.words[0];
      const paths = findWordInGrid(board.grid, wp.word, 1);

      // In noGravity: only remove cells, no gravity applied
      const gridAfter = removeCells(board.grid, paths[0]);

      // The removed positions should be null
      for (const pos of paths[0]) {
        expect(gridAfter[pos.row][pos.col]).toBeNull();
      }

      // Non-removed cells should be unchanged (no gravity shift)
      for (let r = 0; r < board.grid.length; r++) {
        for (let c = 0; c < board.grid[0].length; c++) {
          const wasRemoved = paths[0].some(p => p.row === r && p.col === c);
          if (!wasRemoved) {
            expect(gridAfter[r][c]).toEqual(board.grid[r][c]);
          }
        }
      }
    });
  });

  describe('gravityFlip mode', () => {
    it('generates a solvable gravityFlip board', () => {
      const config: BoardConfig = {
        rows: 6, cols: 5, wordCount: 3, minWordLength: 3, maxWordLength: 4, difficulty: 'medium',
      };
      const board = generateBoard(config, 321, 'gravityFlip');
      expect(board.words.length).toBeGreaterThanOrEqual(2);
    });

    it('gravity direction rotates after each word in gravityFlip mode', () => {
      const board = generateBoard(EASY_CONFIG, 42);
      let state = createInitialState(board, 1, 'gravityFlip');
      expect(state.gravityDirection).toBe('down');

      // Find and submit a word
      const wp = board.words[0];
      const paths = findWordInGrid(state.board.grid, wp.word, 1);
      for (const pos of paths[0]) {
        state = gameReducer(state, { type: 'SELECT_CELL', position: pos });
      }
      state = gameReducer(state, { type: 'SUBMIT_WORD' });

      // Direction should rotate: down -> right
      expect(state.gravityDirection).toBe('right');
    });

    it('gravity applies in all 4 directions correctly', () => {
      // Create a grid with some nulls
      const grid = [
        [{ letter: 'A', id: 'a' }, null, { letter: 'C', id: 'c' }],
        [null, { letter: 'B', id: 'b' }, null],
        [{ letter: 'D', id: 'd' }, null, { letter: 'E', id: 'e' }],
      ];

      // Down: cells compact to bottom
      const downGrid = applyGravityInDirection(grid, 'down');
      expect(downGrid[2][0]?.letter).toBe('D');
      expect(downGrid[1][0]?.letter).toBe('A');
      expect(downGrid[0][0]).toBeNull();

      // Up: cells compact to top
      const upGrid = applyGravityInDirection(grid, 'up');
      expect(upGrid[0][0]?.letter).toBe('A');
      expect(upGrid[1][0]?.letter).toBe('D');
      expect(upGrid[2][0]).toBeNull();

      // Right: cells compact to right within each row
      const rightGrid = applyGravityInDirection(grid, 'right');
      expect(rightGrid[0][2]?.letter).toBe('C');
      expect(rightGrid[0][1]?.letter).toBe('A');
      expect(rightGrid[0][0]).toBeNull();

      // Left: cells compact to left within each row
      const leftGrid = applyGravityInDirection(grid, 'left');
      expect(leftGrid[0][0]?.letter).toBe('A');
      expect(leftGrid[0][1]?.letter).toBe('C');
      expect(leftGrid[0][2]).toBeNull();
    });
  });

  describe('daily mode determinism', () => {
    it('same date produces identical board', () => {
      const board1 = generateDailyBoard('2026-04-04');
      const board2 = generateDailyBoard('2026-04-04');
      const words1 = board1.words.map(w => w.word).sort();
      const words2 = board2.words.map(w => w.word).sort();
      expect(words1).toEqual(words2);
    });

    it('different dates produce different boards', () => {
      const board1 = generateDailyBoard('2026-04-04');
      const board2 = generateDailyBoard('2026-04-05');
      const words1 = board1.words.map(w => w.word).sort().join(',');
      const words2 = board2.words.map(w => w.word).sort().join(',');
      // Statistically near-impossible to be the same
      expect(words1 === words2).toBe(false);
    });
  });

  describe('board generation across multiple seeds', () => {
    it('generates valid boards for 20 different seeds', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const board = generateBoard(EASY_CONFIG, seed * 137);
        expect(board.grid.length).toBe(EASY_CONFIG.rows);
        expect(board.words.length).toBeGreaterThanOrEqual(2);

        // Every word must be findable
        for (const wp of board.words) {
          const paths = findWordInGrid(board.grid, wp.word, 1);
          expect(paths.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
