/**
 * Game Modes Integration Test
 *
 * Tests all 10 game modes: config validation, unlock ordering,
 * board generation per mode, and mode-specific mechanics.
 */

import { MODE_CONFIGS, getLevelConfig } from '../constants';
import { generateBoard, generateDailyBoard } from '../engine/boardGenerator';
import { findWordInGrid } from '../engine/solver';
import { GameMode, BoardConfig } from '../types';

const ALL_MODES: GameMode[] = [
  'classic',
  'daily',
  'noGravity',
  'relax',
  'timePressure',
  'gravityFlip',
  'shrinkingBoard',
  'perfectSolve',
  'weekly',
  'expert',
];

describe('Game Modes Integration', () => {
  describe('mode config validation', () => {
    it('all 10 modes have configs defined', () => {
      for (const mode of ALL_MODES) {
        expect(MODE_CONFIGS[mode]).toBeDefined();
      }
      expect(Object.keys(MODE_CONFIGS).length).toBe(10);
    });

    it('every mode config has required fields', () => {
      for (const mode of ALL_MODES) {
        const config = MODE_CONFIGS[mode];
        expect(config.id).toBe(mode);
        expect(config.name).toBeTruthy();
        expect(config.description).toBeTruthy();
        expect(config.icon).toBeTruthy();
        expect(config.color).toBeTruthy();
        expect(config.unlockLevel).toBeGreaterThanOrEqual(1);
        expect(config.rules).toBeDefined();
        expect(typeof config.rules.hasTimer).toBe('boolean');
        expect(typeof config.rules.hasMoveLimit).toBe('boolean');
        expect(typeof config.rules.allowHints).toBe('boolean');
        expect(typeof config.rules.allowUndo).toBe('boolean');
        expect(typeof config.rules.unlimitedUndo).toBe('boolean');
        expect(config.rules.scoreMultiplier).toBeGreaterThan(0);
        expect(typeof config.rules.comboMode).toBe('boolean');
      }
    });

    it('mode names are unique', () => {
      const names = Object.values(MODE_CONFIGS).map(c => c.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe('unlock level ordering', () => {
    it('unlock levels are in ascending or grouped order', () => {
      // Verify specific unlock levels from GDD
      expect(MODE_CONFIGS.classic.unlockLevel).toBe(1);
      expect(MODE_CONFIGS.daily.unlockLevel).toBe(1);
      expect(MODE_CONFIGS.noGravity.unlockLevel).toBeLessThanOrEqual(5);
      expect(MODE_CONFIGS.relax.unlockLevel).toBeLessThanOrEqual(5);
      expect(MODE_CONFIGS.timePressure.unlockLevel).toBeLessThanOrEqual(10);
      expect(MODE_CONFIGS.gravityFlip.unlockLevel).toBeLessThanOrEqual(12);
      expect(MODE_CONFIGS.shrinkingBoard.unlockLevel).toBeLessThanOrEqual(12);
      expect(MODE_CONFIGS.perfectSolve.unlockLevel).toBeLessThanOrEqual(15);
      expect(MODE_CONFIGS.weekly.unlockLevel).toBeLessThanOrEqual(12);
      expect(MODE_CONFIGS.expert.unlockLevel).toBe(30);
    });

    it('classic and daily are always available (level 1)', () => {
      expect(MODE_CONFIGS.classic.unlockLevel).toBe(1);
      expect(MODE_CONFIGS.daily.unlockLevel).toBe(1);
    });

    it('expert has the highest unlock level', () => {
      const maxUnlock = Math.max(...Object.values(MODE_CONFIGS).map(c => c.unlockLevel));
      expect(MODE_CONFIGS.expert.unlockLevel).toBe(maxUnlock);
    });
  });

  describe('score multipliers', () => {
    it('all modes have valid positive score multipliers', () => {
      for (const mode of ALL_MODES) {
        expect(MODE_CONFIGS[mode].rules.scoreMultiplier).toBeGreaterThan(0);
      }
    });

    it('harder modes have higher score multipliers', () => {
      // Expert and perfectSolve should have highest multipliers
      expect(MODE_CONFIGS.expert.rules.scoreMultiplier).toBeGreaterThanOrEqual(MODE_CONFIGS.classic.rules.scoreMultiplier);
      expect(MODE_CONFIGS.perfectSolve.rules.scoreMultiplier).toBeGreaterThanOrEqual(MODE_CONFIGS.classic.rules.scoreMultiplier);
      // Relax should have lowest
      expect(MODE_CONFIGS.relax.rules.scoreMultiplier).toBeLessThanOrEqual(MODE_CONFIGS.classic.rules.scoreMultiplier);
    });
  });

  describe('mode-specific rules', () => {
    it('timePressure has timer enabled with valid duration', () => {
      expect(MODE_CONFIGS.timePressure.rules.hasTimer).toBe(true);
      expect(MODE_CONFIGS.timePressure.rules.timerSeconds).toBeGreaterThan(0);
    });

    it('relax has unlimited undo and hints', () => {
      expect(MODE_CONFIGS.relax.rules.unlimitedUndo).toBe(true);
      expect(MODE_CONFIGS.relax.rules.allowHints).toBe(true);
      expect(MODE_CONFIGS.relax.rules.allowUndo).toBe(true);
    });

    it('expert disables hints and undos', () => {
      expect(MODE_CONFIGS.expert.rules.allowHints).toBe(false);
      expect(MODE_CONFIGS.expert.rules.allowUndo).toBe(false);
    });

    it('perfectSolve disables hints and undos', () => {
      expect(MODE_CONFIGS.perfectSolve.rules.allowHints).toBe(false);
      expect(MODE_CONFIGS.perfectSolve.rules.allowUndo).toBe(false);
    });

    it('classic allows hints and undos', () => {
      expect(MODE_CONFIGS.classic.rules.allowHints).toBe(true);
      expect(MODE_CONFIGS.classic.rules.allowUndo).toBe(true);
    });

    it('non-timed modes do not have timer', () => {
      const nonTimedModes: GameMode[] = ['classic', 'noGravity', 'relax', 'gravityFlip', 'shrinkingBoard', 'perfectSolve', 'expert'];
      for (const mode of nonTimedModes) {
        expect(MODE_CONFIGS[mode].rules.hasTimer).toBe(false);
      }
    });
  });

  describe('board generation per mode', () => {
    const easyConfig: BoardConfig = {
      rows: 5, cols: 5, wordCount: 2, minWordLength: 3, maxWordLength: 4, difficulty: 'easy',
    };

    it('classic mode generates valid board', () => {
      const board = generateBoard(easyConfig, 42, 'classic');
      expect(board.words.length).toBeGreaterThanOrEqual(2);
      for (const wp of board.words) {
        const paths = findWordInGrid(board.grid, wp.word, 1);
        expect(paths.length).toBeGreaterThan(0);
      }
    });

    it('noGravity mode generates valid board', () => {
      const board = generateBoard(easyConfig, 42, 'noGravity');
      expect(board.words.length).toBeGreaterThanOrEqual(2);
      for (const wp of board.words) {
        const paths = findWordInGrid(board.grid, wp.word, 1);
        expect(paths.length).toBeGreaterThan(0);
      }
    });

    it('gravityFlip mode generates valid board', () => {
      const config: BoardConfig = {
        rows: 6, cols: 5, wordCount: 3, minWordLength: 3, maxWordLength: 4, difficulty: 'medium',
      };
      const board = generateBoard(config, 42, 'gravityFlip');
      expect(board.words.length).toBeGreaterThanOrEqual(2);
      for (const wp of board.words) {
        const paths = findWordInGrid(board.grid, wp.word, 1);
        expect(paths.length).toBeGreaterThan(0);
      }
    });

    it('shrinkingBoard generates board with >= 3 words and large enough grid', () => {
      const config: BoardConfig = {
        rows: 6, cols: 6, wordCount: 3, minWordLength: 3, maxWordLength: 4, difficulty: 'medium',
      };
      const board = generateBoard(config, 42, 'shrinkingBoard');
      // shrinkingBoard enforces min 3 words and adds buffer rows/cols
      expect(board.words.length).toBeGreaterThanOrEqual(3);
      expect(board.grid.length).toBeGreaterThanOrEqual(5);
      expect(board.grid[0].length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('daily mode determinism', () => {
    it('same date produces same board (verified across 3 calls)', () => {
      const dateStr = '2026-04-04';
      const boards = [
        generateDailyBoard(dateStr),
        generateDailyBoard(dateStr),
        generateDailyBoard(dateStr),
      ];
      const words0 = boards[0].words.map(w => w.word).sort();
      for (let i = 1; i < boards.length; i++) {
        const words = boards[i].words.map(w => w.word).sort();
        expect(words).toEqual(words0);
      }
    });

    it('daily board has correct dimensions (7x6 per generateDailyBoard)', () => {
      const board = generateDailyBoard('2026-06-15');
      expect(board.grid.length).toBe(7);
      expect(board.grid[0].length).toBe(6);
    });

    it('daily board words are all findable', () => {
      const board = generateDailyBoard('2026-04-04');
      for (const wp of board.words) {
        const paths = findWordInGrid(board.grid, wp.word, 1);
        expect(paths.length).toBeGreaterThan(0);
      }
    });
  });

  describe('board generation reliability across seeds', () => {
    it('generates valid boards for 10 seeds across 3 different modes', () => {
      const modes: GameMode[] = ['classic', 'noGravity', 'gravityFlip'];
      const config: BoardConfig = {
        rows: 6, cols: 5, wordCount: 3, minWordLength: 3, maxWordLength: 4, difficulty: 'medium',
      };

      for (const mode of modes) {
        for (let seed = 100; seed <= 1000; seed += 100) {
          const board = generateBoard(config, seed, mode);
          expect(board).toBeDefined();
          expect(board.words.length).toBeGreaterThanOrEqual(2);

          // Verify at least the first word is findable
          const firstWord = board.words[0];
          const paths = findWordInGrid(board.grid, firstWord.word, 1);
          expect(paths.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('skill gates', () => {
    it('modes with skill gates have valid gate requirements', () => {
      for (const mode of ALL_MODES) {
        const gate = MODE_CONFIGS[mode].rules.skillGate;
        if (gate) {
          // Skill gates should have positive values
          if (gate.perfectSolves !== undefined) {
            expect(gate.perfectSolves).toBeGreaterThan(0);
          }
          if (gate.minStars !== undefined) {
            expect(gate.minStars).toBeGreaterThan(0);
          }
          if (gate.puzzlesSolved !== undefined) {
            expect(gate.puzzlesSolved).toBeGreaterThan(0);
          }
        }
      }
    });

    it('beginner modes (classic, daily, noGravity, relax) have no skill gates', () => {
      const beginnerModes: GameMode[] = ['classic', 'daily', 'noGravity', 'relax'];
      for (const mode of beginnerModes) {
        expect(MODE_CONFIGS[mode].rules.skillGate).toBeUndefined();
      }
    });
  });
});
