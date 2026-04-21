/**
 * Firebase Remote Config Service
 *
 * Wraps Firebase Remote Config for live-tuning game parameters without app updates.
 * When Firebase is not configured or the remote-config package is not installed,
 * gracefully falls back to built-in defaults (local-only mode).
 */

import { isFirebaseConfigured } from '../config/firebase';

// ---------------------------------------------------------------------------
// Dynamic import — @react-native-firebase/remote-config may not be installed
// ---------------------------------------------------------------------------
let remoteConfig: any = null;
try {
  remoteConfig = require('@react-native-firebase/remote-config').default;
} catch {
  // Not installed, will use defaults only
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RemoteConfigValues {
  // Economy tuning
  coinsPerEasyPuzzle: number;
  coinsPerMediumPuzzle: number;
  coinsPerHardPuzzle: number;
  coinsPerExpertPuzzle: number;
  gemsPerPerfectClear: number;
  gemsPerDailyCompletion: number;
  // Energy
  maxEnergy: number;
  energyRegenMinutes: number;
  // Ads
  maxAdsPerDay: number;
  maxInterstitialsPerDay: number;
  interstitialIntervalMs: number;
  // Events
  weekendBlitzEnabled: boolean;
  flashSaleEnabled: boolean;
  // Feature flags
  prestigeEnabled: boolean;
  clubsEnabled: boolean;
  mysteryWheelEnabled: boolean;
  // Contextual offers
  hintRescuePrice: number;
  closeFinishPrice: number;
  postPuzzlePrice: number;
  boosterPackGemPrice: number;
  lifeRefillGemPrice: number;
  streakShieldGemPrice: number;
  // Difficulty
  adaptiveDifficultyEnabled: boolean;
  // Phase 4B — hard-energy A/B (default OFF; flip on if soft-launch D7 sags)
  hardEnergyEnabled: boolean;
  // Phase 0 — pricing + LiveOps override hooks (Phase 4D)
  starterBundlePrice: string;
  eventCalendarOverride: string;   // JSON string; empty = use built-in calendar
  dailyDealOverride: string;       // JSON string; empty = use hashed defaults
  interstitialIntervalSeconds: number; // mirror of interstitialIntervalMs but named per plan 0.11
  // Login calendar A/B — '30day' (default) vs '7day' (legacy)
  loginCalendarVariant: string;
  // Phase-offset Login Calendar wrap so perfect-daily players don't hit
  // Login Calendar day-30 + Season Pass rotation on the same calendar day.
  // Applied only when the active variant is '30day'. Default 5 (wrap
  // lands ~5 days before Season Pass rotation). Set 0 to disable.
  loginCalendarOffsetDays: number;
  // Piggy bank slow-fill gem jar (Branch 5)
  piggyBankEnabled: boolean;
  piggyBankFillPerPuzzle: number;
  piggyBankCapacity: number;
  piggyBankPriceUSD: number;
  // Season pass — 50-tier XP ladder (Branch 6)
  seasonPassEnabled: boolean;
  seasonPassDurationDays: number;
  seasonPassXpPerPuzzle: number;
  seasonPassXpMultiplier: number;

  // Referral rewards — Cloud Function grant loop (Branch 7)
  referralEnabled: boolean;
  referralRewardGemsReferrer: number;
  referralRewardGemsReferred: number;
  referralRewardCoinsReferrer: number;
  referralMaxPerDay: number;

  // Shared club goals — Clash-style collective progress (Branch 8)
  sharedClubGoalsEnabled: boolean;
  sharedGoalsPerWeek: number;

  // Friend leaderboard + add-friend search (Branch 9)
  friendsEnabled: boolean;
  maxFriendsPerUser: number;
  friendLeaderboardHomeCardEnabled: boolean;

  // Booster combo synergies (Branch 10)
  boosterCombosEnabled: boolean;
  boosterComboMultiplier: number;
  boosterComboDurationWords: number;

  // Feel polish — invalid-word shake + multi-tile bloom (Branch 11)
  invalidShakeEnabled: boolean;
  tileBloomEnabled: boolean;
  tileBloomParticlesPerTile: number;

  // First-purchase hard-modal offer — interrupts post-puzzle at level
  // [min, max] for non-payers exactly once per user. Set enabled=false to
  // kill the interrupt (offer still available via shelf).
  firstPurchaseModalEnabled: boolean;
  firstPurchaseModalMinLevel: number;
  firstPurchaseModalMaxLevel: number;

  // Launch-readiness wave (April 2026) — kill switches for each new system
  autoAdvanceEnabled: boolean;
  autoAdvanceDelayMs: number;
  closeFinishPremiumEnabled: boolean;
  closeFinishPremiumGemCost: number;
  dailyQuestsEnabled: boolean;
  cosmeticPerksEnabled: boolean;
  streakShieldOfferEnabled: boolean;
  prestigeCeremonyEnabled: boolean;
  /**
   * ID of the currently featured product pinned above the shop grid.
   * Empty string disables the pin. Set via Remote Config without a
   * client rebuild to rotate emphasis weekly.
   */
  featuredProductId: string;
  /**
   * Seasonal chapter overlay JSON. When non-empty, parsed by
   * `parseRemoteChapters` and merged onto the static 40-chapter catalog
   * via `setRemoteChapterOverride`. Chapters must have ids >= 41 (the
   * overlay extends, never replaces, the authored catalog). Malformed
   * JSON is discarded safely and the static catalog is used as-is.
   */
  chapterOverrideJson: string;
  /**
   * Gates the weekly global leaderboard UI. When false, the home
   * entry + WeeklyLeaderboardScreen stay hidden so Ops can light it
   * up mid-soft-launch (or dark it down during an incident).
   */
  weeklyCompetitionEnabled: boolean;
}

export type RemoteConfigKey = keyof RemoteConfigValues;

// ---------------------------------------------------------------------------
// Defaults — must stay in sync with constants.ts ECONOMY_TUNING & AD_CONFIG
// ---------------------------------------------------------------------------

const REMOTE_CONFIG_DEFAULTS: RemoteConfigValues = {
  // Economy tuning
  coinsPerEasyPuzzle: 50,
  coinsPerMediumPuzzle: 100,
  coinsPerHardPuzzle: 200,
  coinsPerExpertPuzzle: 400,
  gemsPerPerfectClear: 5,
  gemsPerDailyCompletion: 2,
  // Energy
  maxEnergy: 30,
  energyRegenMinutes: 15,
  // Ads
  maxAdsPerDay: 10,
  maxInterstitialsPerDay: 5,
  interstitialIntervalMs: 90_000,
  // Events — both default OFF until the weekend-event and flash-sale
  // surfaces are built. Flip via Remote Config once the UI lands
  // (tracked as Phase B17 shop-urgency work + a future weekend-event
  // banner task). Without the UI, these flags are no-ops today.
  weekendBlitzEnabled: false,
  flashSaleEnabled: false,
  // Feature flags
  prestigeEnabled: true,
  clubsEnabled: true,
  mysteryWheelEnabled: true,
  // Contextual offers
  hintRescuePrice: 50,
  closeFinishPrice: 25,
  postPuzzlePrice: 80,
  boosterPackGemPrice: 15,
  lifeRefillGemPrice: 10,
  streakShieldGemPrice: 30,
  // Difficulty — defaults off. Engine has a wiring point for adaptive
  // adjustments (see puzzleGenerator getAdjustedConfig) but the
  // production-ready tuning table is not yet authored. Flip ON via
  // Remote Config once we have soft-launch performance telemetry to
  // calibrate the curve.
  adaptiveDifficultyEnabled: false,
  // Phase 4B — hard-energy off until soft-launch cohort data justifies it
  hardEnergyEnabled: false,
  // Phase 0 / 4D LiveOps overrides — empty strings/0 mean "use built-ins"
  starterBundlePrice: '0.49',
  eventCalendarOverride: '',
  dailyDealOverride: '',
  interstitialIntervalSeconds: 90,
  // Login calendar variant — '30day' escalating cycle by default
  loginCalendarVariant: '30day',
  // Offset the 30-day Login Calendar wrap point by 5 days so it doesn't
  // coincide with the Season Pass 30-day rotation. Ignored for the 7-day
  // A/B variant. Flip to 0 via Remote Config to disable.
  loginCalendarOffsetDays: 5,
  // Piggy bank — 2 gems per puzzle, 200-gem cap, $4.99 to break
  piggyBankEnabled: true,
  piggyBankFillPerPuzzle: 2,
  piggyBankCapacity: 200,
  piggyBankPriceUSD: 4.99,
  // Season pass — 30-day rotation, 100 XP per puzzle, no multiplier by default
  seasonPassEnabled: true,
  seasonPassDurationDays: 30,
  seasonPassXpPerPuzzle: 100,
  seasonPassXpMultiplier: 1.0,

  referralEnabled: true,
  referralRewardGemsReferrer: 25,
  referralRewardGemsReferred: 10,
  referralRewardCoinsReferrer: 500,
  referralMaxPerDay: 50,

  sharedClubGoalsEnabled: true,
  sharedGoalsPerWeek: 1,

  // Friend leaderboard — home widget + displayName search, enabled by default
  friendsEnabled: true,
  maxFriendsPerUser: 100,
  friendLeaderboardHomeCardEnabled: true,

  // Booster combos — 2x score for next 3 words after a two-booster activation
  boosterCombosEnabled: true,
  boosterComboMultiplier: 2.0,
  boosterComboDurationWords: 3,

  // Feel polish — screen shake on invalid word + per-tile bloom particles
  invalidShakeEnabled: true,
  tileBloomEnabled: true,
  tileBloomParticlesPerTile: 2,

  // First-purchase hard-modal offer — interrupt fires post-puzzle at
  // levels 5–6 for non-payers exactly once per user (guarded by
  // `firstPurchaseModalShownAt` in PlayerData).
  firstPurchaseModalEnabled: true,
  firstPurchaseModalMinLevel: 5,
  firstPurchaseModalMaxLevel: 6,

  // Launch-readiness wave — new systems enabled by default, tunable via RC
  autoAdvanceEnabled: true,
  autoAdvanceDelayMs: 3500,
  // closeFinishPremium defaults OFF — price tuning requires live
  // conversion data. Flip ON once soft-launch ARPDAU telemetry
  // justifies and the gem cost has been A/B tuned against decline rate.
  closeFinishPremiumEnabled: false,
  closeFinishPremiumGemCost: 9,
  // Featured-bundle pin shown at the top of the shop. Ops rotates this
  // weekly via Remote Config — empty string means "no pin" so the shop
  // falls back to the static ordering.
  featuredProductId: 'explorer_bundle',
  chapterOverrideJson: '',
  // Weekly leaderboard — off until reward tiers + copy are final and
  // the Cloud Function has been running long enough (1-2 weeks) to
  // produce real leaderboard data for a meaningful screen.
  weeklyCompetitionEnabled: false,
  dailyQuestsEnabled: true,
  cosmeticPerksEnabled: true,
  streakShieldOfferEnabled: true,
  prestigeCeremonyEnabled: true,
};

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let initialized = false;
type ConfigListener = (values: RemoteConfigValues) => void;
const listeners: ConfigListener[] = [];

/** Whether we are running in __DEV__ (Expo / Metro bundler sets this). */
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function canUseRemoteConfig(): boolean {
  return isFirebaseConfigured && remoteConfig !== null;
}

function notifyListeners(): void {
  const values = getAllRemoteValues();
  // Keep the seasonal chapter overlay in sync with the latest RC payload.
  // Doing this inline here (rather than requiring every app startup path
  // to remember to call setRemoteChapterOverride) means fetching a fresh
  // config mid-session also rolls out new seasonal chapters without a
  // reload. Parse errors are swallowed by parseRemoteChapters itself.
  try {
    // Lazy require to avoid a cycle: chapters.ts imports from
    // utils/chapterSchema which is independent, and this file already
    // sits below chapters in the dependency tree.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setRemoteChapterOverride } = require('../data/chapters');
    setRemoteChapterOverride(values.chapterOverrideJson);
  } catch {
    // Chapters module not loaded yet (cold-start race) — the next
    // notifyListeners tick will retry automatically.
  }
  for (const cb of listeners) {
    try {
      cb(values);
    } catch {
      // Listener errors must not crash the app
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize Remote Config with defaults and fetch latest values.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initRemoteConfig(): Promise<void> {
  if (initialized) return;

  if (!canUseRemoteConfig()) {
    initialized = true;
    return;
  }

  try {
    const rc = remoteConfig();

    // In dev, skip cache so changes are picked up immediately.
    // In prod, use a 12-hour cache to avoid excessive fetches.
    const minimumFetchIntervalMillis = isDev ? 0 : 12 * 60 * 60 * 1000;

    await rc.setConfigSettings({ minimumFetchIntervalMillis });
    await rc.setDefaults(REMOTE_CONFIG_DEFAULTS as Record<string, any>);
    await rc.fetchAndActivate();

    initialized = true;
  } catch {
    // Fetch failed (e.g. offline) — defaults are still in place, which is fine.
    initialized = true;
  }
}

/**
 * Get a remote config value by key. Returns the activated remote value if
 * available, otherwise the built-in default.
 */
export function getRemoteValue(key: RemoteConfigKey): string | number | boolean {
  if (!canUseRemoteConfig() || !initialized) {
    return REMOTE_CONFIG_DEFAULTS[key];
  }

  try {
    const rc = remoteConfig();
    const value = rc.getValue(key);
    // Remote Config getValue always returns a wrapper; use the source to
    // decide whether to parse or fall back.
    if (value.getSource() === 'static') {
      return REMOTE_CONFIG_DEFAULTS[key];
    }

    const defaultVal = REMOTE_CONFIG_DEFAULTS[key];
    if (typeof defaultVal === 'boolean') {
      return value.asBoolean();
    }
    if (typeof defaultVal === 'number') {
      return value.asNumber();
    }
    return value.asString();
  } catch {
    return REMOTE_CONFIG_DEFAULTS[key];
  }
}

/**
 * Get a remote config value as a number.
 */
export function getRemoteNumber(key: RemoteConfigKey): number {
  if (!canUseRemoteConfig() || !initialized) {
    return REMOTE_CONFIG_DEFAULTS[key] as number;
  }

  try {
    const rc = remoteConfig();
    return rc.getValue(key).asNumber();
  } catch {
    return REMOTE_CONFIG_DEFAULTS[key] as number;
  }
}

/**
 * Get a remote config value as a boolean.
 */
export function getRemoteBoolean(key: RemoteConfigKey): boolean {
  if (!canUseRemoteConfig() || !initialized) {
    return REMOTE_CONFIG_DEFAULTS[key] as boolean;
  }

  try {
    const rc = remoteConfig();
    return rc.getValue(key).asBoolean();
  } catch {
    return REMOTE_CONFIG_DEFAULTS[key] as boolean;
  }
}

/**
 * Get a remote config value as a string.
 */
export function getRemoteString(key: RemoteConfigKey): string {
  if (!canUseRemoteConfig() || !initialized) {
    return String(REMOTE_CONFIG_DEFAULTS[key]);
  }

  try {
    const rc = remoteConfig();
    return rc.getValue(key).asString();
  } catch {
    return String(REMOTE_CONFIG_DEFAULTS[key]);
  }
}

/**
 * Get all remote config values as a typed object.
 */
export function getAllRemoteValues(): RemoteConfigValues {
  const result = { ...REMOTE_CONFIG_DEFAULTS };

  if (!canUseRemoteConfig() || !initialized) {
    return result;
  }

  try {
    const rc = remoteConfig();
    const all = rc.getAll();

    for (const key of Object.keys(REMOTE_CONFIG_DEFAULTS) as RemoteConfigKey[]) {
      if (all[key]) {
        const defaultVal = REMOTE_CONFIG_DEFAULTS[key];
        if (typeof defaultVal === 'boolean') {
          (result as any)[key] = all[key].asBoolean();
        } else if (typeof defaultVal === 'number') {
          (result as any)[key] = all[key].asNumber();
        } else {
          (result as any)[key] = all[key].asString();
        }
      }
    }
  } catch {
    // Return whatever we have so far (at worst, the defaults).
  }

  return result;
}

/**
 * Register a listener that fires whenever remote config values are activated.
 * Returns an unsubscribe function.
 */
export function addConfigListener(callback: ConfigListener): () => void {
  listeners.push(callback);

  // If Remote Config supports real-time listeners, wire it up.
  let unsubscribeRemote: (() => void) | null = null;
  if (canUseRemoteConfig() && initialized) {
    try {
      const rc = remoteConfig();
      if (typeof rc.onConfigUpdated === 'function') {
        unsubscribeRemote = rc.onConfigUpdated(async () => {
          try {
            await rc.activate();
            notifyListeners();
          } catch {
            // Activation failed — keep existing values
          }
        });
      }
    } catch {
      // Could not attach remote listener — local-only updates still work.
    }
  }

  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
    if (unsubscribeRemote) unsubscribeRemote();
  };
}

/**
 * Force a fresh fetch from the server, bypassing the cache interval.
 */
export async function forceRefresh(): Promise<void> {
  if (!canUseRemoteConfig()) return;

  try {
    const rc = remoteConfig();
    await rc.setConfigSettings({ minimumFetchIntervalMillis: 0 });
    await rc.fetchAndActivate();
    notifyListeners();
  } catch {
    // Refresh failed (e.g. offline) — keep existing values
  }
}
