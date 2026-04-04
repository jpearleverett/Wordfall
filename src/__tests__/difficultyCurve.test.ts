/**
 * Difficulty Curve Integration Test
 *
 * Tests the full difficulty system: level config progression, breather levels,
 * difficulty tiers, adaptive difficulty, and board generation for all levels.
 */

import { getLevelConfig, getDifficultyTier, getBreatherConfig } from '../constants';
import { getAdjustedConfig, DEFAULT_PLAYER_METRICS, updatePlayerMetrics } from '../engine/difficultyAdjuster';
import { generateBoard } from '../engine/boardGenerator';
import { findWordInGrid } from '../engine/solver';
import { BoardConfig } from '../types';

describe('Difficulty Curve Integration', () => {
  describe('getLevelConfig returns valid configs for levels 1-100', () => {
    it('every level 1-100 returns a valid BoardConfig', () => {
      for (let level = 1; level <= 100; level++) {
        const config = getLevelConfig(level);
        expect(config.rows).toBeGreaterThanOrEqual(4);
        expect(config.rows).toBeLessThanOrEqual(10);
        expect(config.cols).toBeGreaterThanOrEqual(4);
        expect(config.cols).toBeLessThanOrEqual(8);
        expect(config.wordCount).toBeGreaterThanOrEqual(2);
        expect(config.wordCount).toBeLessThanOrEqual(10);
        expect(config.minWordLength).toBeGreaterThanOrEqual(3);
        expect(config.maxWordLength).toBeGreaterThanOrEqual(config.minWordLength);
        expect(config.maxWordLength).toBeLessThanOrEqual(6);
        expect(['easy', 'medium', 'hard', 'expert']).toContain(config.difficulty);
      }
    });
  });

  describe('difficulty is generally non-decreasing', () => {
    it('complexity (rows * cols * wordCount) generally increases from level 1 to 50', () => {
      function complexity(config: BoardConfig): number {
        return config.rows * config.cols * config.wordCount;
      }

      // Check that level 50 is harder than level 1
      const config1 = getLevelConfig(1);
      const config50 = getLevelConfig(50);
      expect(complexity(config50)).toBeGreaterThan(complexity(config1));

      // Check broad trend: average complexity of levels 40-50 > average of levels 1-10
      let earlySum = 0;
      let lateSum = 0;
      for (let l = 1; l <= 10; l++) earlySum += complexity(getLevelConfig(l));
      for (let l = 40; l <= 50; l++) lateSum += complexity(getLevelConfig(l));
      expect(lateSum / 11).toBeGreaterThan(earlySum / 10);
    });

    it('word count never decreases by more than 2 between adjacent non-breather levels', () => {
      let prevConfig = getLevelConfig(1);
      for (let level = 2; level <= 100; level++) {
        const config = getLevelConfig(level);
        const isBreather = level > 1 && level % 5 === 0;
        if (!isBreather) {
          // Non-breather levels should not drop word count by more than 1
          expect(config.wordCount).toBeGreaterThanOrEqual(prevConfig.wordCount - 1);
        }
        prevConfig = config;
      }
    });
  });

  describe('breather level pacing', () => {
    it('every 5th level (10, 15, 20, 25, 30) is easier than the level before it', () => {
      const breatherLevels = [10, 15, 20, 25, 30, 35, 40, 45, 50];
      for (const level of breatherLevels) {
        const breatherConfig = getLevelConfig(level);
        const prevConfig = getLevelConfig(level - 1);
        // Breather should have fewer or equal words + same or smaller grid
        const breatherComplexity = breatherConfig.rows * breatherConfig.cols * breatherConfig.wordCount;
        const prevComplexity = prevConfig.rows * prevConfig.cols * prevConfig.wordCount;
        expect(breatherComplexity).toBeLessThanOrEqual(prevComplexity);
      }
    });

    it('getBreatherConfig returns easier config than the given level', () => {
      for (const level of [10, 20, 30, 40]) {
        const normalConfig = getLevelConfig(level);
        const breatherConfig = getBreatherConfig(level);
        const normalComplexity = normalConfig.rows * normalConfig.cols * normalConfig.wordCount;
        const breatherComplexity = breatherConfig.rows * breatherConfig.cols * breatherConfig.wordCount;
        expect(breatherComplexity).toBeLessThanOrEqual(normalComplexity);
      }
    });
  });

  describe('difficulty tiers', () => {
    it('levels 1-5 are easy', () => {
      for (let level = 1; level <= 5; level++) {
        expect(getDifficultyTier(level)).toBe('easy');
      }
    });

    it('levels 6-15 include medium', () => {
      let hasMedium = false;
      for (let level = 6; level <= 15; level++) {
        if (getDifficultyTier(level) === 'medium') hasMedium = true;
      }
      expect(hasMedium).toBe(true);
    });

    it('levels 16-30 include hard', () => {
      let hasHard = false;
      for (let level = 16; level <= 30; level++) {
        if (getDifficultyTier(level) === 'hard') hasHard = true;
      }
      expect(hasHard).toBe(true);
    });

    it('levels 31+ are expert', () => {
      for (let level = 31; level <= 50; level++) {
        expect(getDifficultyTier(level)).toBe('expert');
      }
    });

    it('difficulty tiers never go backwards (easy -> medium -> hard -> expert)', () => {
      const tierOrder = { easy: 0, medium: 1, hard: 2, expert: 3 };
      let maxTier = 0;
      for (let level = 1; level <= 100; level++) {
        const tier = getDifficultyTier(level);
        const tierNum = tierOrder[tier];
        expect(tierNum).toBeGreaterThanOrEqual(maxTier);
        maxTier = Math.max(maxTier, tierNum);
      }
    });
  });

  describe('adaptive difficulty', () => {
    it('returns no adjustment with insufficient data (< 5 results)', () => {
      const metrics = {
        ...DEFAULT_PLAYER_METRICS,
        recentStars: [2, 2, 2, 2], // only 4 results
      };
      const baseConfig = getLevelConfig(10);
      const result = getAdjustedConfig(baseConfig, metrics);
      expect(result.direction).toBe('none');
      expect(result.reason).toBe('insufficient_data');
      expect(result.config).toEqual(baseConfig);
    });

    it('makes easier when player is struggling (avgStars < 1.5)', () => {
      const metrics = {
        ...DEFAULT_PLAYER_METRICS,
        recentStars: [1, 1, 1, 1, 1, 1, 1],
        averageStars: 1.0,
        consecutiveThreeStars: 0,
      };
      const baseConfig = getLevelConfig(15);
      const result = getAdjustedConfig(baseConfig, metrics);
      expect(result.direction).toBe('easier');
      // Easier: -1 word, -1 maxWordLength, +1 row
      expect(result.config.wordCount).toBe(Math.max(2, baseConfig.wordCount - 1));
      expect(result.config.rows).toBe(baseConfig.rows + 1);
    });

    it('makes harder when player is cruising (avgStars > 2.5, 6+ consecutive 3-stars)', () => {
      const metrics = {
        ...DEFAULT_PLAYER_METRICS,
        recentStars: [3, 3, 3, 3, 3, 3, 3],
        averageStars: 3.0,
        consecutiveThreeStars: 7,
      };
      const baseConfig = getLevelConfig(15);
      const result = getAdjustedConfig(baseConfig, metrics);
      expect(result.direction).toBe('harder');
      // Harder: +1 word, +1 maxWordLength, -1 row (floor at cols)
      expect(result.config.wordCount).toBe(baseConfig.wordCount + 1);
    });

    it('no adjustment when in sweet spot', () => {
      const metrics = {
        ...DEFAULT_PLAYER_METRICS,
        recentStars: [2, 3, 2, 3, 2, 2, 3],
        averageStars: 2.43,
        consecutiveThreeStars: 1,
      };
      const baseConfig = getLevelConfig(15);
      const result = getAdjustedConfig(baseConfig, metrics);
      expect(result.direction).toBe('none');
      expect(result.reason).toBe('balanced');
    });

    it('adjustments are bounded (never more than +/-1 from base)', () => {
      const baseConfig = getLevelConfig(20);

      // Easier adjustment
      const easyMetrics = {
        ...DEFAULT_PLAYER_METRICS,
        recentStars: [1, 1, 1, 1, 1],
        averageStars: 1.0,
        consecutiveThreeStars: 0,
      };
      const easier = getAdjustedConfig(baseConfig, easyMetrics);
      expect(easier.config.wordCount).toBeGreaterThanOrEqual(baseConfig.wordCount - 1);
      expect(easier.config.rows).toBeLessThanOrEqual(baseConfig.rows + 1);

      // Harder adjustment
      const hardMetrics = {
        ...DEFAULT_PLAYER_METRICS,
        recentStars: [3, 3, 3, 3, 3, 3, 3],
        averageStars: 3.0,
        consecutiveThreeStars: 7,
      };
      const harder = getAdjustedConfig(baseConfig, hardMetrics);
      expect(harder.config.wordCount).toBeLessThanOrEqual(baseConfig.wordCount + 1);
      expect(harder.config.rows).toBeGreaterThanOrEqual(baseConfig.rows - 1);
    });
  });

  describe('updatePlayerMetrics', () => {
    it('maintains rolling window of 20', () => {
      let metrics = DEFAULT_PLAYER_METRICS;
      // Add 25 results
      for (let i = 0; i < 25; i++) {
        metrics = updatePlayerMetrics(metrics, i + 1, 2, 30);
      }
      expect(metrics.recentStars.length).toBe(20);
      expect(metrics.recentCompletionTimes.length).toBe(20);
    });

    it('correctly computes consecutive 3-star streak', () => {
      let metrics = DEFAULT_PLAYER_METRICS;
      // Add some 2-star results then 3-star results
      metrics = updatePlayerMetrics(metrics, 1, 2, 30);
      metrics = updatePlayerMetrics(metrics, 2, 2, 25);
      metrics = updatePlayerMetrics(metrics, 3, 3, 20);
      metrics = updatePlayerMetrics(metrics, 4, 3, 18);
      metrics = updatePlayerMetrics(metrics, 5, 3, 15);
      expect(metrics.consecutiveThreeStars).toBe(3);
    });

    it('resets consecutive streak on non-3-star result', () => {
      let metrics = DEFAULT_PLAYER_METRICS;
      metrics = updatePlayerMetrics(metrics, 1, 3, 20);
      metrics = updatePlayerMetrics(metrics, 2, 3, 20);
      metrics = updatePlayerMetrics(metrics, 3, 2, 25); // breaks streak
      expect(metrics.consecutiveThreeStars).toBe(0);
    });

    it('tracks level attempts correctly', () => {
      let metrics = DEFAULT_PLAYER_METRICS;
      metrics = updatePlayerMetrics(metrics, 5, 1, 60);
      metrics = updatePlayerMetrics(metrics, 5, 2, 45);
      metrics = updatePlayerMetrics(metrics, 5, 3, 30);
      expect(metrics.levelAttempts[5]).toBe(3);
    });
  });

  describe('board generation succeeds for level configs 1-50', () => {
    it('generateBoard succeeds for every level config', () => {
      for (let level = 1; level <= 50; level++) {
        const config = getLevelConfig(level);
        const board = generateBoard(config, level * 31);
        expect(board).toBeDefined();
        expect(board.words.length).toBeGreaterThanOrEqual(2);
        expect(board.grid.length).toBeGreaterThanOrEqual(4);

        // At least verify the first word is findable
        const firstWord = board.words[0];
        const paths = findWordInGrid(board.grid, firstWord.word, 1);
        expect(paths.length).toBeGreaterThan(0);
      }
    }, 30000); // 30s timeout for this test
  });
});
