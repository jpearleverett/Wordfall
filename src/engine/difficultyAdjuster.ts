import { BoardConfig, PlayerMetrics } from '../types';
import { logger } from '../utils/logger';

/**
 * Difficulty adjustment direction — purely internal, never shown to the player.
 */
type AdjustmentDirection = 'easier' | 'harder' | 'none';

interface AdjustmentResult {
  config: BoardConfig;
  direction: AdjustmentDirection;
  reason: string;
}

/**
 * Determines whether the player is struggling, cruising, or in the sweet spot,
 * and applies subtle (max +/-1 step) adjustments to the base board config.
 *
 * The adjustment is invisible to the player — they should perceive natural
 * difficulty variation, not an adaptive system.
 */
export function getAdjustedConfig(
  baseConfig: BoardConfig,
  metrics: PlayerMetrics,
): AdjustmentResult {
  // Not enough data to adjust — need at least 5 recent results
  if (metrics.recentStars.length < 5) {
    return { config: baseConfig, direction: 'none', reason: 'insufficient_data' };
  }

  const { averageStars, consecutiveThreeStars, levelAttempts } = metrics;

  // Count recent levels with >3 attempts (struggling indicator)
  const recentLevelKeys = Object.keys(levelAttempts)
    .map(Number)
    .sort((a, b) => b - a)
    .slice(0, 5);
  const recentMultiAttemptLevels = recentLevelKeys.filter(
    (lvl) => levelAttempts[lvl] > 3,
  ).length;

  // ── Struggling detection ──
  // Average stars below 1.5 OR multiple recent levels with >3 attempts
  if (averageStars < 1.5 || recentMultiAttemptLevels >= 2) {
    const adjusted = makeEasier(baseConfig);
    logger.log(
      `[DifficultyAdjuster] Easing difficulty: avgStars=${averageStars.toFixed(2)}, multiAttemptLevels=${recentMultiAttemptLevels}`,
    );
    return {
      config: adjusted,
      direction: 'easier',
      reason:
        averageStars < 1.5
          ? `low_avg_stars_${averageStars.toFixed(2)}`
          : `multi_attempt_levels_${recentMultiAttemptLevels}`,
    };
  }

  // ── Cruising detection ──
  // High average stars AND a long streak of 3-star clears
  if (averageStars > 2.5 && consecutiveThreeStars > 5) {
    const adjusted = makeHarder(baseConfig);
    logger.log(
      `[DifficultyAdjuster] Increasing difficulty: avgStars=${averageStars.toFixed(2)}, consecutive3Stars=${consecutiveThreeStars}`,
    );
    return {
      config: adjusted,
      direction: 'harder',
      reason: `cruising_avg${averageStars.toFixed(2)}_streak${consecutiveThreeStars}`,
    };
  }

  // ── Sweet spot — no adjustment ──
  logger.log(
    `[DifficultyAdjuster] No adjustment needed: avgStars=${averageStars.toFixed(2)}, consecutive3Stars=${consecutiveThreeStars}`,
  );
  return { config: baseConfig, direction: 'none', reason: 'balanced' };
}

/**
 * Make the board slightly easier (max -1 step from base):
 * - Reduce word count by 1 (floor at 2)
 * - Reduce max word length by 1 (floor at 3)
 * - Add 1 row (more space to work with)
 */
function makeEasier(base: BoardConfig): BoardConfig {
  return {
    ...base,
    wordCount: Math.max(2, base.wordCount - 1),
    maxWordLength: Math.max(3, base.maxWordLength - 1),
    rows: base.rows + 1,
  };
}

/**
 * Make the board slightly harder (max +1 step from base):
 * - Add 1 word
 * - Allow longer words (+1)
 * - Reduce rows by 1 (slightly tighter grid), floor at base cols
 */
function makeHarder(base: BoardConfig): BoardConfig {
  return {
    ...base,
    wordCount: base.wordCount + 1,
    maxWordLength: Math.min(6, base.maxWordLength + 1),
    rows: Math.max(base.cols, base.rows - 1),
  };
}

/**
 * Compute rolling average for a numeric array.
 */
export function computeRollingAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Update player metrics after a puzzle result.
 * Keeps a rolling window of the last 20 results.
 */
export function updatePlayerMetrics(
  current: PlayerMetrics,
  level: number,
  stars: number,
  completionTimeSeconds: number,
): PlayerMetrics {
  const WINDOW = 20;

  // Update recent stars (rolling window)
  const newRecentStars = [...current.recentStars, stars].slice(-WINDOW);
  const newRecentTimes = [
    ...current.recentCompletionTimes,
    completionTimeSeconds,
  ].slice(-WINDOW);

  // Update level attempts
  const newLevelAttempts = {
    ...current.levelAttempts,
    [level]: (current.levelAttempts[level] || 0) + 1,
  };

  // Compute consecutive 3-star streak (from the end)
  let consecutive3Stars = 0;
  for (let i = newRecentStars.length - 1; i >= 0; i--) {
    if (newRecentStars[i] === 3) {
      consecutive3Stars++;
    } else {
      break;
    }
  }

  return {
    levelAttempts: newLevelAttempts,
    averageStars: computeRollingAverage(newRecentStars),
    averageCompletionTime: computeRollingAverage(newRecentTimes),
    consecutiveThreeStars: consecutive3Stars,
    recentStars: newRecentStars,
    recentCompletionTimes: newRecentTimes,
  };
}

/**
 * Default empty metrics for a new player.
 */
export const DEFAULT_PLAYER_METRICS: PlayerMetrics = {
  levelAttempts: {},
  averageStars: 0,
  averageCompletionTime: 0,
  consecutiveThreeStars: 0,
  recentStars: [],
  recentCompletionTimes: [],
};
