/**
 * REMOTELY TUNABLE ECONOMY — the clamps, and the grant/display agreement.
 *
 * The coin and gem payout keys were declared as Remote Config and read by
 * nothing, so the economy a soft launch exists to calibrate could only be
 * retuned by shipping a release. Wiring them introduces two risks worth
 * pinning:
 *
 *  1. A remote value is typed by a human into a web console. The realistic
 *     failure is not abuse but a slip — an extra zero, an empty field parsed
 *     as 0, a unit confusion — landing on every device at once with no build
 *     to roll back. Out-of-range and non-finite values must fall back.
 *
 *  2. The reward hook GRANTS the payout and the victory screen DISPLAYS it,
 *     from two separate computations. While both read the same constant that
 *     was harmless; the moment one reads a remote value and the other doesn't,
 *     the game awards one number and shows another. Both halves stay
 *     individually correct, so nothing fails — the player just sees the game
 *     shortchange them.
 */
import {
  economyDifficultyForLevel,
  perfectClearGems,
  puzzleCoinPayout,
  puzzleCoinReward,
} from '../economyTuning';
import { ECONOMY } from '../../constants';
import { getRemoteNumberClamped } from '../../services/remoteConfig';

describe('payouts fall back to the shipped constants', () => {
  // Firebase is unconfigured in tests, so every remote read returns the
  // built-in default — which is exactly the "nobody has tuned anything yet"
  // state that must match the constants byte for byte.
  it.each(['easy', 'medium', 'hard', 'expert'] as const)(
    '%s coin payout matches ECONOMY',
    (difficulty) => {
      expect(puzzleCoinPayout(difficulty)).toBe(ECONOMY.puzzleCompleteCoins[difficulty]);
    },
  );

  it('perfect-clear gems match ECONOMY', () => {
    expect(perfectClearGems()).toBe(ECONOMY.perfectClearGems);
  });

  it('the reward includes the star bonus', () => {
    expect(puzzleCoinReward('easy', 3)).toBe(
      ECONOMY.puzzleCompleteCoins.easy + 3 * ECONOMY.starBonus,
    );
    expect(puzzleCoinReward('expert', 0)).toBe(ECONOMY.puzzleCompleteCoins.expert);
  });
});

describe('getRemoteNumberClamped rejects what a slipped digit produces', () => {
  it('falls back rather than returning an out-of-range value', () => {
    // With Firebase unconfigured the read yields the default (50 for
    // coinsPerEasyPuzzle). A range that excludes it must produce the caller's
    // fallback, proving the bound is enforced rather than decorative.
    expect(getRemoteNumberClamped('coinsPerEasyPuzzle', 777, 0, 10)).toBe(777);
    expect(getRemoteNumberClamped('coinsPerEasyPuzzle', 777, 1000, 5000)).toBe(777);
  });

  it('accepts a value inside the range', () => {
    expect(getRemoteNumberClamped('coinsPerEasyPuzzle', 777, 0, 10_000)).toBe(50);
  });

  it('treats the bounds as inclusive', () => {
    const value = getRemoteNumberClamped('coinsPerEasyPuzzle', 777, 0, 10_000);
    expect(getRemoteNumberClamped('coinsPerEasyPuzzle', 777, value, value)).toBe(value);
  });
});

describe('difficulty banding is shared, not duplicated', () => {
  it('matches the thresholds both call sites used', () => {
    // These exact boundaries were copy-pasted in the reward hook and the
    // victory screen. Two copies of a threshold is how a level ends up
    // paying "hard" and displaying "medium".
    expect(economyDifficultyForLevel(1)).toBe('easy');
    expect(economyDifficultyForLevel(5)).toBe('easy');
    expect(economyDifficultyForLevel(6)).toBe('medium');
    expect(economyDifficultyForLevel(15)).toBe('medium');
    expect(economyDifficultyForLevel(16)).toBe('hard');
    expect(economyDifficultyForLevel(30)).toBe('hard');
    expect(economyDifficultyForLevel(31)).toBe('expert');
    expect(economyDifficultyForLevel(600)).toBe('expert');
  });

  it('never returns a band the payout table lacks', () => {
    for (let level = 1; level <= 700; level++) {
      const band = economyDifficultyForLevel(level);
      expect(ECONOMY.puzzleCompleteCoins[band]).toBeGreaterThan(0);
      expect(Number.isFinite(puzzleCoinPayout(band))).toBe(true);
    }
  });
});
