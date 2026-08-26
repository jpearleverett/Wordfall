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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ECONOMY } from '../constants';
import { getRemoteNumberClamped } from '../services/remoteConfig';
import { getWeekId } from '../utils/weekId';
import { logger } from '../utils/logger';

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

// ---------------------------------------------------------------------------
// Faucet ledger — per-period caps on repeatable free-currency grants
// ---------------------------------------------------------------------------
//
// Two faucets need state that survives an app restart but is not part of the
// cloud-synced player profile (a restart must not reopen a spent cap, and
// adding profile fields for a local clamp is overkill):
//
//  1. Flawless-clear gems: capped per UTC day (`dailyFlawlessGemCap` RC key).
//     Without a cap, replaying easy levels flawlessly is an unbounded gem
//     faucet — ~40+ gems/day for a committed player against a 3/day target.
//  2. The weekly board's completion payout: the weekly board is
//     deterministic all week and freely replayable (there is no
//     `weeklyCompleted` array on the profile, unlike the daily's
//     `dailyCompleted`), so first-completion-of-the-week is recorded here.
//
// Same shape as the ad-cap tracking in services/ads.ts: a synchronous
// in-memory copy, hydrated once from AsyncStorage (fire-and-forget at module
// load), written through on every mutation. The claim functions are
// synchronous because the reward hook grants inline on puzzle completion.
// The only race — a grant landing before hydration finishes — is resolved
// toward the PERSISTED count (max wins), so a fast restart can never widen
// the cap.

const FAUCET_LEDGER_KEY = '@wordfall_faucet_ledger';

interface FaucetLedger {
  /** UTC day (YYYY-MM-DD) the flawless-gem counter belongs to. */
  flawlessGemDate: string;
  /** Gems already granted for flawless clears on `flawlessGemDate`. */
  flawlessGemsGranted: number;
  /** Week id (utils/weekId) whose weekly board completion has been paid. */
  weeklyPaidWeekId: string;
  /** UTC day (YYYY-MM-DD) the aggregate metered-gem counter belongs to. */
  meteredGemDate: string;
  /** Gems granted on `meteredGemDate` across ALL metered faucet sources. */
  meteredGemsGranted: number;
}

const EMPTY_LEDGER: FaucetLedger = {
  flawlessGemDate: '',
  flawlessGemsGranted: 0,
  weeklyPaidWeekId: '',
  meteredGemDate: '',
  meteredGemsGranted: 0,
};

let ledger: FaucetLedger = { ...EMPTY_LEDGER };
let hydration: Promise<void> | null = null;

function todayUtcKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function persistLedger(): void {
  AsyncStorage.setItem(FAUCET_LEDGER_KEY, JSON.stringify(ledger)).catch(() => {
    logger.warn('[EconomyTuning] failed to persist faucet ledger');
  });
}

/** Idempotent one-time hydration; kicked at module load, awaitable in tests. */
export function hydrateFaucetLedger(): Promise<void> {
  if (hydration) return hydration;
  hydration = (async () => {
    try {
      const raw = await AsyncStorage.getItem(FAUCET_LEDGER_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<FaucetLedger>;
      // Merge toward the tighter cap: a pre-hydration grant this session and
      // the persisted count for the same day resolve to the larger figure.
      if (
        typeof parsed.flawlessGemDate === 'string' &&
        parsed.flawlessGemDate === todayUtcKey()
      ) {
        const persistedCount = Math.max(0, Number(parsed.flawlessGemsGranted) || 0);
        if (ledger.flawlessGemDate === parsed.flawlessGemDate) {
          ledger.flawlessGemsGranted = Math.max(ledger.flawlessGemsGranted, persistedCount);
        } else if (!ledger.flawlessGemDate) {
          ledger.flawlessGemDate = parsed.flawlessGemDate;
          ledger.flawlessGemsGranted = persistedCount;
        }
      }
      const currentWeek = getWeekId();
      if (parsed.weeklyPaidWeekId === currentWeek && ledger.weeklyPaidWeekId !== currentWeek) {
        ledger.weeklyPaidWeekId = currentWeek;
      }
      // Metered-gem counter: same max-wins merge as the flawless counter.
      if (
        typeof parsed.meteredGemDate === 'string' &&
        parsed.meteredGemDate === todayUtcKey()
      ) {
        const persistedMetered = Math.max(0, Number(parsed.meteredGemsGranted) || 0);
        if (ledger.meteredGemDate === parsed.meteredGemDate) {
          ledger.meteredGemsGranted = Math.max(ledger.meteredGemsGranted, persistedMetered);
        } else if (!ledger.meteredGemDate) {
          ledger.meteredGemDate = parsed.meteredGemDate;
          ledger.meteredGemsGranted = persistedMetered;
        }
      }
    } catch {
      // Corrupt or unreadable — start fresh; worst case one extra payout.
    }
  })();
  return hydration;
}
void hydrateFaucetLedger();

/** Test-only: reset the in-memory ledger (and mark hydration as done). */
export function __resetFaucetLedgerForTests(next: Partial<FaucetLedger> = {}): void {
  ledger = { ...EMPTY_LEDGER, ...next };
  hydration = Promise.resolve();
}

/**
 * Per-UTC-day ceiling on flawless-clear gems. Clamp [0, 100]: 0 is a valid
 * "no flawless gems" setting, while an unclamped console slip (an extra
 * zero) would silently reopen the faucet on every device at once.
 */
export function flawlessGemDailyCap(): number {
  return getRemoteNumberClamped('dailyFlawlessGemCap', 5, 0, 100);
}

/**
 * Claim gems for a flawless clear against today's cap. Returns the amount
 * actually grantable (possibly 0) and records it — callers credit exactly
 * the returned figure so the granted number, the displayed number, and the
 * persisted counter can never disagree.
 */
export function claimFlawlessGems(requested: number): number {
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  const today = todayUtcKey();
  if (ledger.flawlessGemDate !== today) {
    ledger.flawlessGemDate = today;
    ledger.flawlessGemsGranted = 0;
  }
  const grant = Math.min(requested, Math.max(0, flawlessGemDailyCap() - ledger.flawlessGemsGranted));
  if (grant > 0) {
    ledger.flawlessGemsGranted += grant;
    persistLedger();
  }
  return grant;
}

/**
 * Per-UTC-day ceiling on the AGGREGATE of the recurring meta gem faucets
 * (daily quests, mystery wheel, bonus chest, weekly goals). Individually
 * each looks small; together they averaged 12-25 gems/day against the 3/day
 * design target (`dailyGemDripTarget`), which erased gem-SKU demand for
 * every engaged player. Same clamp rationale as the flawless cap.
 */
export function meteredGemDailyCap(): number {
  return getRemoteNumberClamped('dailyTotalGemCap', 10, 0, 200);
}

/**
 * Claim gems from a RECURRING meta faucet against the shared daily cap.
 * Returns the grantable amount (possibly 0); callers credit exactly the
 * return value, same contract as `claimFlawlessGems`.
 *
 * ONLY for recurring faucets, where clamped overflow simply reappears in
 * tomorrow's budget. One-time grants (achievement tiers, milestone
 * ceremonies, purchases, VIP drip) must NOT route through this — a one-time
 * reward eaten by a daily cap is lost forever.
 *
 * `source` is a stable slug for telemetry at the call site ('daily_quest',
 * 'mystery_wheel', 'bonus_chest', 'weekly_goal').
 */
export function claimMeteredGems(requested: number, source: string): number {
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  const today = todayUtcKey();
  if (ledger.meteredGemDate !== today) {
    ledger.meteredGemDate = today;
    ledger.meteredGemsGranted = 0;
  }
  const grant = Math.min(requested, Math.max(0, meteredGemDailyCap() - ledger.meteredGemsGranted));
  if (grant > 0) {
    ledger.meteredGemsGranted += grant;
    persistLedger();
  } else {
    logger.info(`[EconomyTuning] metered gem faucet '${source}' clamped (cap reached)`);
  }
  return grant;
}

/** Gems still grantable today across the metered faucets (UI affordance). */
export function meteredGemsRemainingToday(): number {
  const today = todayUtcKey();
  const spent = ledger.meteredGemDate === today ? ledger.meteredGemsGranted : 0;
  return Math.max(0, meteredGemDailyCap() - spent);
}

/**
 * First-completion gate for the weekly board. Returns true exactly once per
 * week id (and marks the week paid); every later completion of the same
 * deterministic board returns false so the reward hook pays nothing.
 * Local-only by design — the worst a reinstall can do is re-earn ONE weekly
 * payout, which is not worth a profile schema change.
 */
export function claimWeeklyBoardPayout(weekId: string = getWeekId()): boolean {
  if (ledger.weeklyPaidWeekId === weekId) return false;
  ledger.weeklyPaidWeekId = weekId;
  persistLedger();
  return true;
}
