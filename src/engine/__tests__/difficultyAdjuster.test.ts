import {
  getAdjustedConfig,
  computeRollingAverage,
  updatePlayerMetrics,
  DEFAULT_PLAYER_METRICS,
} from '../difficultyAdjuster';
import { BoardConfig, PlayerMetrics } from '../../types';

// Suppress __DEV__ console logs
(global as any).__DEV__ = false;

const baseConfig: BoardConfig = {
  rows: 7,
  cols: 6,
  wordCount: 5,
  minWordLength: 3,
  maxWordLength: 5,
  difficulty: 'medium',
};

function makeMetrics(overrides: Partial<PlayerMetrics>): PlayerMetrics {
  return {
    ...DEFAULT_PLAYER_METRICS,
    ...overrides,
  };
}

describe('computeRollingAverage', () => {
  it('returns 0 for empty array', () => {
    expect(computeRollingAverage([])).toBe(0);
  });

  it('returns the value for single-element array', () => {
    expect(computeRollingAverage([3])).toBe(3);
  });

  it('computes correct average', () => {
    expect(computeRollingAverage([1, 2, 3])).toBe(2);
    expect(computeRollingAverage([2, 2, 2, 2])).toBe(2);
  });

  it('handles decimal averages', () => {
    expect(computeRollingAverage([1, 2])).toBe(1.5);
  });
});

describe('getAdjustedConfig - insufficient data', () => {
  it('returns base config unchanged when fewer than 5 results', () => {
    const metrics = makeMetrics({ recentStars: [1, 2, 3, 1] });
    const result = getAdjustedConfig(baseConfig, metrics);
    expect(result.config).toEqual(baseConfig);
    expect(result.direction).toBe('none');
    expect(result.reason).toBe('insufficient_data');
  });

  it('returns base config unchanged with empty metrics', () => {
    const result = getAdjustedConfig(baseConfig, DEFAULT_PLAYER_METRICS);
    expect(result.config).toEqual(baseConfig);
    expect(result.direction).toBe('none');
  });

  it('returns base config unchanged with exactly 4 results', () => {
    const metrics = makeMetrics({ recentStars: [1, 1, 1, 1] });
    const result = getAdjustedConfig(baseConfig, metrics);
    expect(result.direction).toBe('none');
  });
});

describe('getAdjustedConfig - struggling detection', () => {
  it('makes easier when average stars < 1.5', () => {
    const metrics = makeMetrics({
      recentStars: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      averageStars: 1.0,
      consecutiveThreeStars: 0,
      levelAttempts: {},
    });
    const result = getAdjustedConfig(baseConfig, metrics);
    expect(result.direction).toBe('easier');
    expect(result.config.wordCount).toBe(baseConfig.wordCount - 1);
    expect(result.config.maxWordLength).toBe(baseConfig.maxWordLength - 1);
    expect(result.config.rows).toBe(baseConfig.rows + 1);
  });

  it('makes easier when multiple levels have >3 attempts', () => {
    const metrics = makeMetrics({
      recentStars: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      averageStars: 2.0,
      consecutiveThreeStars: 0,
      levelAttempts: { 10: 5, 11: 4, 12: 1, 13: 1, 14: 1 },
    });
    const result = getAdjustedConfig(baseConfig, metrics);
    expect(result.direction).toBe('easier');
  });

  it('does not reduce wordCount below 2', () => {
    const minConfig: BoardConfig = { ...baseConfig, wordCount: 2 };
    const metrics = makeMetrics({
      recentStars: [1, 1, 1, 1, 1],
      averageStars: 1.0,
      consecutiveThreeStars: 0,
      levelAttempts: {},
    });
    const result = getAdjustedConfig(minConfig, metrics);
    expect(result.config.wordCount).toBe(2);
  });

  it('does not reduce maxWordLength below 3', () => {
    const minConfig: BoardConfig = { ...baseConfig, maxWordLength: 3 };
    const metrics = makeMetrics({
      recentStars: [1, 1, 1, 1, 1],
      averageStars: 1.0,
      consecutiveThreeStars: 0,
      levelAttempts: {},
    });
    const result = getAdjustedConfig(minConfig, metrics);
    expect(result.config.maxWordLength).toBe(3);
  });
});

describe('getAdjustedConfig - cruising detection', () => {
  it('makes harder when avgStars > 2.5 and consecutiveThreeStars > 5', () => {
    const metrics = makeMetrics({
      recentStars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      averageStars: 3.0,
      consecutiveThreeStars: 10,
      levelAttempts: {},
    });
    const result = getAdjustedConfig(baseConfig, metrics);
    expect(result.direction).toBe('harder');
    expect(result.config.wordCount).toBe(baseConfig.wordCount + 1);
    expect(result.config.maxWordLength).toBe(baseConfig.maxWordLength + 1);
    expect(result.config.rows).toBeLessThanOrEqual(baseConfig.rows);
  });

  it('does not make harder if avgStars > 2.5 but consecutiveThreeStars <= 5', () => {
    const metrics = makeMetrics({
      recentStars: [3, 3, 2, 3, 3, 3, 2, 3, 3, 3],
      averageStars: 2.8,
      consecutiveThreeStars: 3,
      levelAttempts: {},
    });
    const result = getAdjustedConfig(baseConfig, metrics);
    expect(result.direction).toBe('none');
  });

  it('does not make harder if consecutiveThreeStars > 5 but avgStars <= 2.5', () => {
    const metrics = makeMetrics({
      recentStars: [1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3],
      averageStars: 2.3,
      consecutiveThreeStars: 7,
      levelAttempts: {},
    });
    const result = getAdjustedConfig(baseConfig, metrics);
    expect(result.direction).toBe('none');
  });

  it('caps maxWordLength at 6 when making harder', () => {
    const maxConfig: BoardConfig = { ...baseConfig, maxWordLength: 6 };
    const metrics = makeMetrics({
      recentStars: [3, 3, 3, 3, 3, 3, 3],
      averageStars: 3.0,
      consecutiveThreeStars: 7,
      levelAttempts: {},
    });
    const result = getAdjustedConfig(maxConfig, metrics);
    expect(result.config.maxWordLength).toBe(6);
  });

  it('does not reduce rows below cols when making harder', () => {
    const squareConfig: BoardConfig = { ...baseConfig, rows: 6, cols: 6 };
    const metrics = makeMetrics({
      recentStars: [3, 3, 3, 3, 3, 3, 3],
      averageStars: 3.0,
      consecutiveThreeStars: 7,
      levelAttempts: {},
    });
    const result = getAdjustedConfig(squareConfig, metrics);
    expect(result.config.rows).toBeGreaterThanOrEqual(result.config.cols);
  });
});

describe('getAdjustedConfig - balanced', () => {
  it('returns none when in the sweet spot', () => {
    const metrics = makeMetrics({
      recentStars: [2, 3, 2, 2, 3, 2, 3, 2, 2, 3],
      averageStars: 2.3,
      consecutiveThreeStars: 1,
      levelAttempts: {},
    });
    const result = getAdjustedConfig(baseConfig, metrics);
    expect(result.direction).toBe('none');
    expect(result.reason).toBe('balanced');
    expect(result.config).toEqual(baseConfig);
  });
});

describe('updatePlayerMetrics', () => {
  it('updates recent stars with rolling window of 20', () => {
    let metrics = { ...DEFAULT_PLAYER_METRICS };
    for (let i = 0; i < 25; i++) {
      metrics = updatePlayerMetrics(metrics, i + 1, 2, 60);
    }
    expect(metrics.recentStars.length).toBe(20);
  });

  it('computes averageStars correctly', () => {
    let metrics = { ...DEFAULT_PLAYER_METRICS };
    metrics = updatePlayerMetrics(metrics, 1, 3, 60);
    metrics = updatePlayerMetrics(metrics, 2, 1, 90);
    expect(metrics.averageStars).toBe(2);
  });

  it('tracks consecutive 3-star streak', () => {
    let metrics = { ...DEFAULT_PLAYER_METRICS };
    metrics = updatePlayerMetrics(metrics, 1, 3, 60);
    metrics = updatePlayerMetrics(metrics, 2, 3, 50);
    metrics = updatePlayerMetrics(metrics, 3, 3, 45);
    expect(metrics.consecutiveThreeStars).toBe(3);
  });

  it('resets consecutive 3-star streak on non-3-star result', () => {
    let metrics = { ...DEFAULT_PLAYER_METRICS };
    metrics = updatePlayerMetrics(metrics, 1, 3, 60);
    metrics = updatePlayerMetrics(metrics, 2, 3, 50);
    metrics = updatePlayerMetrics(metrics, 3, 2, 70);
    expect(metrics.consecutiveThreeStars).toBe(0);
  });

  it('tracks level attempts', () => {
    let metrics = { ...DEFAULT_PLAYER_METRICS };
    metrics = updatePlayerMetrics(metrics, 5, 2, 60);
    metrics = updatePlayerMetrics(metrics, 5, 1, 90);
    metrics = updatePlayerMetrics(metrics, 5, 3, 45);
    expect(metrics.levelAttempts[5]).toBe(3);
  });

  it('tracks recent completion times with rolling window', () => {
    let metrics = { ...DEFAULT_PLAYER_METRICS };
    for (let i = 0; i < 25; i++) {
      metrics = updatePlayerMetrics(metrics, i + 1, 2, 60 + i);
    }
    expect(metrics.recentCompletionTimes.length).toBe(20);
  });

  it('computes averageCompletionTime correctly', () => {
    let metrics = { ...DEFAULT_PLAYER_METRICS };
    metrics = updatePlayerMetrics(metrics, 1, 2, 60);
    metrics = updatePlayerMetrics(metrics, 2, 2, 80);
    expect(metrics.averageCompletionTime).toBe(70);
  });
});

describe('DEFAULT_PLAYER_METRICS', () => {
  it('starts with empty data', () => {
    expect(DEFAULT_PLAYER_METRICS.recentStars).toEqual([]);
    expect(DEFAULT_PLAYER_METRICS.recentCompletionTimes).toEqual([]);
    expect(DEFAULT_PLAYER_METRICS.levelAttempts).toEqual({});
    expect(DEFAULT_PLAYER_METRICS.averageStars).toBe(0);
    expect(DEFAULT_PLAYER_METRICS.averageCompletionTime).toBe(0);
    expect(DEFAULT_PLAYER_METRICS.consecutiveThreeStars).toBe(0);
  });
});
