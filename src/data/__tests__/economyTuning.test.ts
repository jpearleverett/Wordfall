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
  __resetFaucetLedgerForTests,
  claimFlawlessGems,
  claimWeeklyBoardPayout,
  economyDifficultyForLevel,
  flawlessGemDailyCap,
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

describe('the August 2026 faucet collapse holds', () => {
  // The old payouts (50/100/200/400, +25/star, 5 gems per flawless) paid a
  // committed free player 7,500-10,000 coins and 50-90 gems a day against
  // sink demand under 1,000 coins / 20 gems. These pins are the collapsed
  // faucet — anyone raising them is reopening it and must retune the sinks
  // in the same change.
  it('base coin payouts are 10/15/25/40', () => {
    expect(ECONOMY.puzzleCompleteCoins).toEqual({ easy: 10, medium: 15, hard: 25, expert: 40 });
  });

  it('star bonus is 5', () => {
    expect(ECONOMY.starBonus).toBe(5);
  });

  it('a flawless clear pays 1 gem', () => {
    expect(ECONOMY.perfectClearGems).toBe(1);
  });

  it('flawless gems cap at 5 per UTC day by default', () => {
    expect(flawlessGemDailyCap()).toBe(5);
  });
});

describe('getRemoteNumberClamped rejects what a slipped digit produces', () => {
  it('falls back rather than returning an out-of-range value', () => {
    // With Firebase unconfigured the read yields the default (10 for
    // coinsPerEasyPuzzle). A range that excludes it must produce the caller's
    // fallback, proving the bound is enforced rather than decorative.
    expect(getRemoteNumberClamped('coinsPerEasyPuzzle', 777, 0, 5)).toBe(777);
    expect(getRemoteNumberClamped('coinsPerEasyPuzzle', 777, 1000, 5000)).toBe(777);
  });

  it('accepts a value inside the range', () => {
    expect(getRemoteNumberClamped('coinsPerEasyPuzzle', 777, 0, 10_000)).toBe(10);
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

describe('claimFlawlessGems — per-UTC-day cap', () => {
  const TODAY = new Date().toISOString().slice(0, 10);

  beforeEach(() => __resetFaucetLedgerForTests());

  it('grants the requested amount while under the cap', () => {
    expect(claimFlawlessGems(1)).toBe(1);
    expect(claimFlawlessGems(1)).toBe(1);
  });

  it('stops granting once the daily cap (default 5) is spent', () => {
    let total = 0;
    for (let i = 0; i < 10; i++) total += claimFlawlessGems(1);
    expect(total).toBe(5);
    expect(claimFlawlessGems(1)).toBe(0);
  });

  it('partially grants a request that straddles the cap', () => {
    expect(claimFlawlessGems(4)).toBe(4);
    // 4 already granted; a 3-gem request yields only the 1 remaining.
    expect(claimFlawlessGems(3)).toBe(1);
    expect(claimFlawlessGems(3)).toBe(0);
  });

  it('a spent cap from an earlier day resets for today', () => {
    __resetFaucetLedgerForTests({ flawlessGemDate: '2020-01-01', flawlessGemsGranted: 999 });
    expect(claimFlawlessGems(2)).toBe(2);
  });

  it('a spent cap from TODAY stays spent (restart cannot widen it)', () => {
    __resetFaucetLedgerForTests({ flawlessGemDate: TODAY, flawlessGemsGranted: 5 });
    expect(claimFlawlessGems(2)).toBe(0);
  });

  it('rejects nonsense requests without touching the ledger', () => {
    expect(claimFlawlessGems(0)).toBe(0);
    expect(claimFlawlessGems(-3)).toBe(0);
    expect(claimFlawlessGems(NaN)).toBe(0);
    expect(claimFlawlessGems(5)).toBe(5);
  });
});

describe('claimWeeklyBoardPayout — one payout per week id', () => {
  beforeEach(() => __resetFaucetLedgerForTests());

  it('pays the first completion of a week and refuses every later one', () => {
    expect(claimWeeklyBoardPayout('2026_W34')).toBe(true);
    expect(claimWeeklyBoardPayout('2026_W34')).toBe(false);
    expect(claimWeeklyBoardPayout('2026_W34')).toBe(false);
  });

  it('a new week reopens the payout', () => {
    expect(claimWeeklyBoardPayout('2026_W34')).toBe(true);
    expect(claimWeeklyBoardPayout('2026_W35')).toBe(true);
  });

  it('defaults to the current week id', () => {
    expect(claimWeeklyBoardPayout()).toBe(true);
    expect(claimWeeklyBoardPayout()).toBe(false);
  });
});
