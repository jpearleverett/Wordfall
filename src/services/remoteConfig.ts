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
  // Events
  weekendBlitzEnabled: true,
  flashSaleEnabled: true,
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
  // Difficulty
  adaptiveDifficultyEnabled: true,
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
