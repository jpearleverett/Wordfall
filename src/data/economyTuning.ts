/**
 * Remotely tunable economy values.
 *
 * A soft launch exists to calibrate the economy, and these knobs were
 * declared as Remote Config keys (`coinsPerEasyPuzzle` … `gemsPerPerfectClear`)
 * and then read by nothing — so every balance change meant shipping a
 * release and waiting for players to update.
 *
 * They live here, in one module, rather than inline at each call site for a
 * specific reason: the reward hook GRANTS the payout and the victory screen
 * DISPLAYS it, from two separate computations. While both read the same
 * constant that was harmless. The moment one of them reads a remote value
 * and the other doesn't, the game can award one number and show another —
 * which players read as the game cheating them, and which no test would
 * catch because both halves are individually correct.
 */
import { ECONOMY } from '../constants';
import { getRemoteNumberClamped } from '../services/remoteConfig';

export type EconomyDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

const COIN_KEYS = {
  easy: 'coinsPerEasyPuzzle',
  medium: 'coinsPerMediumPuzzle',
  hard: 'coinsPerHardPuzzle',
  expert: 'coinsPerExpertPuzzle',
} as const;

/**
 * Base coin payout for completing a puzzle at this difficulty, before star
 * bonus, event multipliers and cosmetic/prestige factors.
 *
 * Bounds are generous enough for any real balance decision — a tenfold
 * economy rebalance still fits — and tight enough that a mistyped console
 * value falls back to the shipped constant instead of paying out a fortune.
 * The realistic failure here is not abuse, it is a slipped digit or an empty
 * field parsed as zero, landing on every device at once with no build to
 * roll back.
 */
export function puzzleCoinPayout(difficulty: EconomyDifficulty): number {
  return getRemoteNumberClamped(
    COIN_KEYS[difficulty],
    ECONOMY.puzzleCompleteCoins[difficulty],
    0,
    10_000,
  );
}

/** Total coins for a completed puzzle including the per-star bonus. */
export function puzzleCoinReward(difficulty: EconomyDifficulty, stars: number): number {
  return puzzleCoinPayout(difficulty) + stars * ECONOMY.starBonus;
}

/** Gems awarded for a flawless clear. */
export function perfectClearGems(): number {
  return getRemoteNumberClamped('gemsPerPerfectClear', ECONOMY.perfectClearGems, 0, 100);
}

/**
 * The difficulty band a level falls into. Duplicated in two places before
 * this (the reward hook and the victory screen) with the same thresholds —
 * which is exactly the kind of pair that drifts apart silently.
 */
export function economyDifficultyForLevel(level: number): EconomyDifficulty {
  if (level <= 5) return 'easy';
  if (level <= 15) return 'medium';
  if (level <= 30) return 'hard';
  return 'expert';
}
