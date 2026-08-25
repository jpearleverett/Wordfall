/**
 * Rewarded Ads Service
 *
 * Singleton service that manages rewarded video ads. Wraps a real ad SDK
 * (expo-ads-admob or react-native-google-mobile-ads) when available, and
 * falls back to a mock/scaffold experience during development.
 *
 * The mock mode simulates a 5-second "ad" via a Promise-based countdown
 * so the full UI flow works without a real SDK installed.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AD_CONFIG } from '../constants';
import { getRemoteNumberClamped } from './remoteConfig';
import { logger } from '../utils/logger';
import { analytics } from './analytics';
import { crashReporter } from './crashReporting';

// ── Reward type definitions ────────────────────────────────────────────────────

export type AdType = 'rewarded' | 'interstitial';

export type AdRewardType =
  | 'hint_reward'
  | 'undo_reward'
  | 'spin_reward'
  | 'coins_reward'
  | 'double_reward'
  | 'life_reward';

export interface AdRewardResult {
  rewarded: boolean;
  rewardType: AdRewardType;
}

/** What each reward type grants — consumed by EconomyContext.processAdReward */
export const AD_REWARD_VALUES: Record<AdRewardType, { currency: string; amount: number }> = {
  hint_reward: { currency: 'hintTokens', amount: 1 },
  undo_reward: { currency: 'undoTokens', amount: 1 },
  spin_reward: { currency: 'spins', amount: 1 },
  coins_reward: { currency: 'coins', amount: 50 },
  double_reward: { currency: 'double', amount: 2 },
  life_reward: { currency: 'lives', amount: 1 },
};

// ── Daily tracking persistence ─────────────────────────────────────────────────

const AD_TRACKING_KEY = '@wordfall_ad_tracking';

interface AdTracking {
  date: string; // YYYY-MM-DD
  viewCount: number;
  coinAdCount: number; // separate cap for coins_reward (max 3/day)
  lifeAdCount: number; // separate cap for life_reward (max 3/day — hard-energy)
  lastAdTime: number; // timestamp of last ad shown
  interstitialCount: number; // separate cap for interstitials (max 5/day)
  lastInterstitialTime: number; // timestamp of last interstitial shown
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadTracking(): Promise<AdTracking> {
  try {
    const stored = await AsyncStorage.getItem(AD_TRACKING_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AdTracking;
      if (parsed.date === todayKey()) return parsed;
    }
  } catch {
    // Ignore — fall through to default
  }
  return { date: todayKey(), viewCount: 0, coinAdCount: 0, lifeAdCount: 0, lastAdTime: 0, interstitialCount: 0, lastInterstitialTime: 0 };
}

async function saveTracking(tracking: AdTracking): Promise<void> {
  try {
    await AsyncStorage.setItem(AD_TRACKING_KEY, JSON.stringify(tracking));
  } catch {
    logger.warn('[Ads] Failed to persist ad tracking');
  }
}

// ── AdManager singleton ────────────────────────────────────────────────────────


/**
 * Ad frequency caps, resolved from Remote Config with the compile-time
 * AD_CONFIG value as the fallback.
 *
 * `maxAdsPerDay`, `maxInterstitialsPerDay` and `interstitialIntervalMs` were
 * declared as Remote Config keys and then never read — the caps were pure
 * constants. Ad pacing is the single riskiest dial in the game for store
 * rating (too many ads is the most common one-star complaint in the genre)
 * and it was the one thing that could not be corrected without shipping a
 * release. The RC defaults deliberately equal the constants, so this changes
 * nothing until someone chooses to move it.
 *
 * A non-positive or non-finite remote value falls back rather than being
 * honoured: a cap of 0 would silently disable rewarded ads entirely (players
 * lose a free-currency path with no explanation), and NaN compares false
 * against everything, which would remove the cap altogether.
 */
function adCap(
  key: 'maxAdsPerDay' | 'maxInterstitialsPerDay' | 'interstitialIntervalMs',
  fallback: number,
): number {
  // Upper bounds are as important as lower ones here: an accidental 1000
  // ads/day is not a cap at all, and a multi-hour interstitial interval
  // silently removes the format's revenue. Ranges are wide enough for any
  // real tuning decision and narrow enough to catch a slipped digit.
  const bounds = {
    maxAdsPerDay: [1, 50],
    maxInterstitialsPerDay: [1, 30],
    interstitialIntervalMs: [10_000, 1_800_000],
  } as const;
  const [min, max] = bounds[key];
  return getRemoteNumberClamped(key, fallback, min, max);
}

/**
 * How long to wait for an ad to load before giving up. A no-fill or dead
 * network must resolve the caller's promise (rewarded:false) — never hang
 * the button that triggered it.
 */
const AD_LOAD_TIMEOUT_MS = 15_000;

/**
 * Minimum gap between automatic rewarded-preload retries after a failure,
 * so a no-fill region doesn't re-request on every render that asks
 * `canShowAd()`.
 */
const PRELOAD_RETRY_INTERVAL_MS = 30_000;

class AdManager {
  private static instance: AdManager;
  private adsRemoved = false;
  private rewardedAdReady = false;
  private initialized = false;
  private useMock = true;

  /**
   * Native mode only: a RewardedAd instance that has fired LOADED and is
   * waiting to be shown. `rewardedAdReady` mirrors whether this cache is
   * populated (in mock mode it stays permanently true instead).
   */
  private preloadedRewardedAd: any = null;
  /** Guard so only one preload runs at a time */
  private preloadingRewarded = false;
  /** Timestamp of the last failed preload — throttles automatic retries */
  private lastPreloadFailureAt = 0;
  private tracking: AdTracking = { date: todayKey(), viewCount: 0, coinAdCount: 0, lifeAdCount: 0, lastAdTime: 0, interstitialCount: 0, lastInterstitialTime: 0 };

  /**
   * Consent + audience state used to build AdMob `RequestOptions`.
   * `npaOnly` true when user hasn't consented to personalized ads (EU, opt-out,
   * or ATT denied on iOS). `childDirected` and `underAge` come from the app's
   * Play Console / App Store target-audience declaration.
   */
  private npaOnly = true;
  private childDirected = false;
  private underAge = false;

  /** Listeners for ad-availability state changes */
  private adReadyListeners: Array<(ready: boolean) => void> = [];

  /** Mock ad listener — set by the UI layer to show a simulated ad modal */
  private mockAdResolver: ((watched: boolean) => void) | null = null;
  private onShowMockAd: ((rewardType: AdRewardType, resolve: (watched: boolean) => void) => void) | null = null;

  private constructor() {}

  /**
   * Update the ad consent + audience flags. Call from the consent flow
   * (Google UMP for EU) and from app start once the target audience is known.
   * Every subsequent ad request is built with these flags.
   */
  setAdConsent(opts: {
    allowPersonalizedAds?: boolean;
    childDirected?: boolean;
    underAgeOfConsent?: boolean;
  }): void {
    if (opts.allowPersonalizedAds !== undefined) {
      this.npaOnly = !opts.allowPersonalizedAds;
    }
    if (opts.childDirected !== undefined) {
      this.childDirected = opts.childDirected;
    }
    if (opts.underAgeOfConsent !== undefined) {
      this.underAge = opts.underAgeOfConsent;
    }
  }

  private buildRequestOptions(): {
    requestNonPersonalizedAdsOnly: boolean;
    tagForChildDirectedTreatment: boolean;
    tagForUnderAgeOfConsent: boolean;
  } {
    return {
      requestNonPersonalizedAdsOnly: this.npaOnly,
      tagForChildDirectedTreatment: this.childDirected,
      tagForUnderAgeOfConsent: this.underAge,
    };
  }

  static getInstance(): AdManager {
    if (!AdManager.instance) {
      AdManager.instance = new AdManager();
    }
    return AdManager.instance;
  }

  // ── Initialisation ──────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this.initialized) return;

    // Load daily tracking
    this.tracking = await loadTracking();

    // iOS: request App Tracking Transparency BEFORE initializing Google Mobile
    // Ads. If the user declines, we force non-personalized ads. No-op on
    // Android and on iOS versions without the API.
    await this.runTrackingTransparencyFlow();

    try {
      // Attempt react-native-google-mobile-ads. Default export is a callable
      // `MobileAds()` that returns the module instance (v15+/v16 API).
      const mobileAds = await import('react-native-google-mobile-ads' as string);

      // Consent gate: Google UMP SDK (shipped inside react-native-google-mobile-ads).
      // Must run before MobileAds().initialize() for EU (GDPR) compliance.
      await this.runConsentFlow(mobileAds);

      const defaultExport = mobileAds?.default;
      const instance = typeof defaultExport === 'function' ? defaultExport() : defaultExport;
      if (instance && typeof instance.initialize === 'function') {
        await instance.initialize();
        this.useMock = false;
        void this.preloadRewardedAd();
        logger.log('[Ads] Native ad module (react-native-google-mobile-ads) initialised');
        crashReporter.addBreadcrumb('AdMob initialized', 'ads');
      }
    } catch (e) {
      this.useMock = true;
      logger.log('[Ads] No ad SDK available — using mock mode');
      crashReporter.addBreadcrumb(
        `AdMob init failed: ${e instanceof Error ? e.message : String(e)}`,
        'ads',
      );
    }

    // In mock mode the rewarded ad is always "ready"
    if (this.useMock) {
      this.rewardedAdReady = true;
    }

    this.initialized = true;
  }

  /**
   * iOS 14.5+: prompt App Tracking Transparency. If denied or unavailable,
   * force non-personalized ads (no IDFA passed to AdMob). No-op on other
   * platforms / older iOS. Never throws.
   */
  private async runTrackingTransparencyFlow(): Promise<void> {
    try {
      const { Platform } = await import('react-native');
      if (Platform.OS !== 'ios') return;

      const ATT = await import('expo-tracking-transparency' as string).catch(() => null);
      if (!ATT?.requestTrackingPermissionsAsync) {
        // Module not installed — force NPA to stay safe.
        this.setAdConsent({ allowPersonalizedAds: false });
        return;
      }

      const { status } = await ATT.requestTrackingPermissionsAsync();
      const authorized = status === 'granted';
      this.setAdConsent({ allowPersonalizedAds: authorized });
      crashReporter.addBreadcrumb(`ATT status=${status}`, 'ads');
    } catch (e) {
      // Never let ATT failure crash ad init. Force NPA on error.
      this.setAdConsent({ allowPersonalizedAds: false });
      crashReporter.addBreadcrumb(
        `ATT flow failed: ${e instanceof Error ? e.message : String(e)}`,
        'ads',
      );
    }
  }

  /**
   * Runs the Google UMP consent flow for GDPR / CCPA jurisdictions.
   * Outcome updates `this.npaOnly`. If the UMP module is missing (older SDKs)
   * or the call throws, we default to non-personalized ads to stay safe.
   */
  private async runConsentFlow(mobileAds: any): Promise<void> {
    try {
      // UMP lives at `AdsConsent` on react-native-google-mobile-ads v13+.
      const AdsConsent = mobileAds?.AdsConsent;
      if (!AdsConsent) {
        // No UMP module — keep npaOnly=true (safer default).
        crashReporter.addBreadcrumb('AdsConsent module unavailable — defaulting to NPA', 'ads');
        return;
      }

      const info = await AdsConsent.requestInfoUpdate();
      if (info?.isConsentFormAvailable) {
        await AdsConsent.showForm?.();
      }

      // After the form: check whether personalized ads are allowed.
      let allowPersonalized = false;
      try {
        const purposes = await AdsConsent.getPurposeConsents?.();
        // Purpose 1 is "store and/or access information on a device" — required for personalized ads.
        allowPersonalized = typeof purposes === 'string' && purposes.charAt(0) === '1';
      } catch {
        allowPersonalized = false;
      }

      this.setAdConsent({ allowPersonalizedAds: allowPersonalized });
      crashReporter.addBreadcrumb(
        `UMP consent processed, personalized=${allowPersonalized}`,
        'ads',
      );
    } catch (e) {
      crashReporter.addBreadcrumb(
        `UMP consent flow failed: ${e instanceof Error ? e.message : String(e)}`,
        'ads',
      );
      // On failure, force NPA to be safe.
      this.setAdConsent({ allowPersonalizedAds: false });
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Show a rewarded ad. Returns true if the user watched to completion.
   * Respects daily cap, cooldown, and ad-free purchase.
   */
  async showRewardedAd(rewardType: AdRewardType): Promise<AdRewardResult> {
    await this.init();

    // User paid to remove ads — grant reward without showing anything
    if (this.adsRemoved) {
      return { rewarded: true, rewardType };
    }

    // Refresh tracking if day rolled over
    if (this.tracking.date !== todayKey()) {
      this.tracking = { date: todayKey(), viewCount: 0, coinAdCount: 0, lifeAdCount: 0, lastAdTime: 0, interstitialCount: 0, lastInterstitialTime: 0 };
    }

    // Daily cap check
    if (this.tracking.viewCount >= adCap('maxAdsPerDay', AD_CONFIG.MAX_ADS_PER_DAY)) {
      logger.log('[Ads] Daily ad cap reached');
      return { rewarded: false, rewardType };
    }

    // Coins-specific daily cap (max 3 per day)
    if (rewardType === 'coins_reward' && this.tracking.coinAdCount >= AD_CONFIG.MAX_COIN_ADS_PER_DAY) {
      logger.log('[Ads] Daily coin ad cap reached');
      return { rewarded: false, rewardType };
    }

    // Life-specific daily cap (max 3 per day — hard-energy Phase 4B)
    if (rewardType === 'life_reward' && this.tracking.lifeAdCount >= AD_CONFIG.MAX_LIFE_ADS_PER_DAY) {
      logger.log('[Ads] Daily life ad cap reached');
      return { rewarded: false, rewardType };
    }

    // Cooldown check
    const now = Date.now();
    if (now - this.tracking.lastAdTime < AD_CONFIG.REWARDED_COOLDOWN_MS) {
      logger.log('[Ads] Ad cooldown active');
      return { rewarded: false, rewardType };
    }

    let result: AdRewardResult;

    if (this.useMock) {
      result = await this.mockShowRewardedAd(rewardType);
    } else {
      result = await this.nativeShowRewardedAd(rewardType);
    }

    // Update tracking on success
    if (result.rewarded) {
      this.tracking.viewCount++;
      this.tracking.lastAdTime = Date.now();
      if (rewardType === 'coins_reward') {
        this.tracking.coinAdCount++;
      }
      if (rewardType === 'life_reward') {
        this.tracking.lifeAdCount++;
      }
      await saveTracking(this.tracking);
      void analytics.trackAdWatched('rewarded', rewardType);
    }

    return result;
  }

  /** Whether a rewarded ad is preloaded and ready to show */
  isRewardedAdReady(): boolean {
    return this.rewardedAdReady && !this.adsRemoved;
  }

  /** Whether the player has purchased ad removal */
  getAdsRemoved(): boolean {
    return this.adsRemoved;
  }

  /** Set ad-free status (called when player purchases ad removal) */
  setAdsRemoved(removed: boolean): void {
    this.adsRemoved = removed;
    this.notifyListeners();
  }

  /** Check if the player can watch a coin ad today */
  canWatchCoinAd(): boolean {
    if (this.adsRemoved) return false;
    if (this.tracking.date !== todayKey()) return true; // new day
    return this.tracking.coinAdCount < AD_CONFIG.MAX_COIN_ADS_PER_DAY;
  }

  /** How many coin ads remain today */
  coinAdsRemaining(): number {
    if (this.tracking.date !== todayKey()) return AD_CONFIG.MAX_COIN_ADS_PER_DAY;
    return Math.max(0, AD_CONFIG.MAX_COIN_ADS_PER_DAY - this.tracking.coinAdCount);
  }

  /** How many total ads remain today */
  adsRemaining(): number {
    const cap = adCap('maxAdsPerDay', AD_CONFIG.MAX_ADS_PER_DAY);
    if (this.tracking.date !== todayKey()) return cap;
    return Math.max(0, cap - this.tracking.viewCount);
  }

  /** Whether cooldown has elapsed since last ad */
  isCooldownElapsed(): boolean {
    return Date.now() - this.tracking.lastAdTime >= AD_CONFIG.REWARDED_COOLDOWN_MS;
  }

  /** Whether an ad can be shown right now (all checks combined) */
  canShowAd(rewardType?: AdRewardType): boolean {
    // Native mode: opportunistically re-preload after a failure so ad entry
    // points come back once fill returns (fire-and-forget, throttled).
    this.maybeRefreshRewardedPreload();
    if (this.adsRemoved) return false;
    if (!this.rewardedAdReady) return false;
    if (!this.isCooldownElapsed()) return false;
    if (this.tracking.date === todayKey() && this.tracking.viewCount >= adCap('maxAdsPerDay', AD_CONFIG.MAX_ADS_PER_DAY)) return false;
    if (rewardType === 'coins_reward' && !this.canWatchCoinAd()) return false;
    return true;
  }

  // ── Interstitial ads ────────────────────────────────────────────────────

  /**
   * Check whether an interstitial ad can be shown right now.
   * Respects ad-free purchase, daily cap (5), and minimum interval (90s).
   */
  canShowInterstitial(): boolean {
    if (this.adsRemoved) return false;

    // Refresh tracking if day rolled over
    if (this.tracking.date !== todayKey()) return true; // new day, all caps reset

    if (this.tracking.interstitialCount >= adCap('maxInterstitialsPerDay', AD_CONFIG.MAX_INTERSTITIALS_PER_DAY)) return false;

    const now = Date.now();
    if (now - this.tracking.lastInterstitialTime < adCap('interstitialIntervalMs', AD_CONFIG.INTERSTITIAL_INTERVAL_MS)) return false;

    return true;
  }

  /**
   * Show an interstitial ad. Returns true if it was shown successfully.
   * Respects ad-free purchase, daily cap, and minimum interval.
   */
  async showInterstitialAd(): Promise<boolean> {
    await this.init();

    if (this.adsRemoved) return false;

    // Refresh tracking if day rolled over
    if (this.tracking.date !== todayKey()) {
      this.tracking = { date: todayKey(), viewCount: 0, coinAdCount: 0, lifeAdCount: 0, lastAdTime: 0, interstitialCount: 0, lastInterstitialTime: 0 };
    }

    // Daily cap check
    if (this.tracking.interstitialCount >= adCap('maxInterstitialsPerDay', AD_CONFIG.MAX_INTERSTITIALS_PER_DAY)) {
      logger.log('[Ads] Daily interstitial cap reached');
      return false;
    }

    // Minimum interval check
    const now = Date.now();
    if (now - this.tracking.lastInterstitialTime < adCap('interstitialIntervalMs', AD_CONFIG.INTERSTITIAL_INTERVAL_MS)) {
      logger.log('[Ads] Interstitial interval not elapsed');
      return false;
    }

    let shown = false;

    if (this.useMock) {
      // Mock mode: resolve immediately (no modal needed for interstitials)
      logger.log('[Ads] Mock interstitial ad shown (instant)');
      shown = true;
    } else {
      shown = await this.nativeShowInterstitialAd();
    }

    if (shown) {
      this.tracking.interstitialCount++;
      this.tracking.lastInterstitialTime = Date.now();
      await saveTracking(this.tracking);
      void analytics.trackAdWatched('interstitial', 'none');
    }

    return shown;
  }

  /** How many interstitial ads remain today */
  interstitialsRemaining(): number {
    if (this.tracking.date !== todayKey()) return adCap('maxInterstitialsPerDay', AD_CONFIG.MAX_INTERSTITIALS_PER_DAY);
    return Math.max(0, adCap('maxInterstitialsPerDay', AD_CONFIG.MAX_INTERSTITIALS_PER_DAY) - this.tracking.interstitialCount);
  }

  // ── Native ad plumbing (react-native-google-mobile-ads v16) ────────────
  //
  // v16 contract (see node_modules/react-native-google-mobile-ads/src/ads/
  // MobileAd.ts): `addAdEventListener` THROWS on an unknown event name,
  // `RewardedAd` additionally throws on AdEventType.LOADED (rewarded ads
  // load via RewardedAdEventType.LOADED = 'rewarded_loaded'), and `show()`
  // throws synchronously when the ad has not loaded. Every path below is
  // therefore: create → listen → load() → wait for LOADED → show() → wait
  // for CLOSED, with EARNED_REWARD (which fires BEFORE closed) captured as
  // a flag along the way. Nothing here may reject — callers await these
  // promises unprotected.

  /** Event-name constants, resolved from the module with string fallbacks. */
  private adEventNames(mobileAds: any) {
    return {
      loaded: mobileAds?.AdEventType?.LOADED ?? 'loaded',
      rewardedLoaded: mobileAds?.RewardedAdEventType?.LOADED ?? 'rewarded_loaded',
      earnedReward: mobileAds?.RewardedAdEventType?.EARNED_REWARD ?? 'rewarded_earned_reward',
      error: mobileAds?.AdEventType?.ERROR ?? 'error',
      closed: mobileAds?.AdEventType?.CLOSED ?? 'closed',
      paid: mobileAds?.AdEventType?.PAID ?? 'paid',
    };
  }

  private subscribeAdEvent(
    ad: any,
    type: string,
    cb: (payload?: any) => void,
    unsubs: Array<() => void>,
  ): void {
    const unsub = ad.addAdEventListener(type, cb);
    if (typeof unsub === 'function') unsubs.push(unsub);
  }

  /**
   * load() the ad and resolve true once LOADED fires, false on ERROR or
   * after AD_LOAD_TIMEOUT_MS (no-fill / offline must not hang the UI).
   * Never rejects; removes its listeners on settle.
   */
  private loadAd(mobileAds: any, ad: any, kind: 'rewarded' | 'interstitial'): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const unsubs: Array<() => void> = [];
      const settle = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        for (const unsub of unsubs) {
          try {
            unsub();
          } catch {
            // Listener already removed — ignore
          }
        }
        resolve(ok);
      };
      try {
        const events = this.adEventNames(mobileAds);
        const loadedEvent = kind === 'rewarded' ? events.rewardedLoaded : events.loaded;
        this.subscribeAdEvent(ad, loadedEvent, () => settle(true), unsubs);
        this.subscribeAdEvent(
          ad,
          events.error,
          (err: unknown) => {
            crashReporter.addBreadcrumb(
              `${kind} ad failed to load: ${err instanceof Error ? err.message : String(err)}`,
              'ads',
            );
            settle(false);
          },
          unsubs,
        );
        timer = setTimeout(() => {
          crashReporter.addBreadcrumb(`${kind} ad load timed out`, 'ads');
          settle(false);
        }, AD_LOAD_TIMEOUT_MS);
        ad.load();
      } catch (e) {
        crashReporter.addBreadcrumb(
          `${kind} ad load setup failed: ${e instanceof Error ? e.message : String(e)}`,
          'ads',
        );
        settle(false);
      }
    });
  }

  /**
   * show() an ALREADY-LOADED ad and resolve when it closes or errors.
   * `completed` = the ad ran and closed normally; `earned` = the user
   * earned the reward (rewarded ads only — EARNED_REWARD fires before
   * CLOSED, and also survives an error-after-earn, matching AdMob's own
   * crediting). show()'s synchronous throw and rejected promise are both
   * absorbed. Never rejects; removes its listeners on settle.
   */
  private showLoadedAd(
    mobileAds: any,
    ad: any,
    kind: 'rewarded' | 'interstitial',
  ): Promise<{ completed: boolean; earned: boolean }> {
    return new Promise<{ completed: boolean; earned: boolean }>((resolve) => {
      let settled = false;
      let earned = false;
      const unsubs: Array<() => void> = [];
      const settle = (completed: boolean) => {
        if (settled) return;
        settled = true;
        for (const unsub of unsubs) {
          try {
            unsub();
          } catch {
            // Listener already removed — ignore
          }
        }
        resolve({ completed, earned });
      };
      try {
        const events = this.adEventNames(mobileAds);
        if (kind === 'rewarded') {
          this.subscribeAdEvent(ad, events.earnedReward, () => {
            earned = true;
          }, unsubs);
        }
        this.subscribeAdEvent(ad, events.closed, () => settle(true), unsubs);
        this.subscribeAdEvent(
          ad,
          events.error,
          (err: unknown) => {
            crashReporter.addBreadcrumb(
              `${kind} ad error during show: ${err instanceof Error ? err.message : String(err)}`,
              'ads',
            );
            settle(false);
          },
          unsubs,
        );
        // AdMob impression-level revenue event (v15+). `data` includes
        // { valueMicros, currency, precision } when available.
        this.subscribeAdEvent(ad, events.paid, (data: any) => {
          const valueMicros = Number(data?.valueMicros ?? 0);
          const estimated = valueMicros ? valueMicros / 1_000_000 : 0;
          void analytics.trackAdRevenue(kind, estimated);
        }, unsubs);

        let shown: unknown;
        try {
          shown = ad.show();
        } catch (err) {
          // show() throws synchronously when the ad is not (or no longer) loaded.
          crashReporter.addBreadcrumb(
            `${kind} ad show() threw: ${err instanceof Error ? err.message : String(err)}`,
            'ads',
          );
          settle(false);
          return;
        }
        if (shown && typeof (shown as Promise<void>).catch === 'function') {
          (shown as Promise<void>).catch((err: unknown) => {
            crashReporter.addBreadcrumb(
              `${kind} ad show() rejected: ${err instanceof Error ? err.message : String(err)}`,
              'ads',
            );
            settle(false);
          });
        }
      } catch (e) {
        crashReporter.addBreadcrumb(
          `${kind} ad show setup failed: ${e instanceof Error ? e.message : String(e)}`,
          'ads',
        );
        settle(false);
      }
    });
  }

  // ── Native interstitial implementation ─────────────────────────────────

  private async nativeShowInterstitialAd(): Promise<boolean> {
    try {
      const mobileAds = await import('react-native-google-mobile-ads' as string);
      if (mobileAds?.InterstitialAd) {
        const ad = mobileAds.InterstitialAd.createForAdRequest(
          AD_CONFIG.INTERSTITIAL_AD_UNIT_ID,
          this.buildRequestOptions(),
        );
        const loaded = await this.loadAd(mobileAds, ad, 'interstitial');
        if (!loaded) {
          logger.warn('[Ads] Failed to show native interstitial ad');
          return false;
        }
        const { completed } = await this.showLoadedAd(mobileAds, ad, 'interstitial');
        return completed;
      }
    } catch (e) {
      crashReporter.addBreadcrumb(
        `Interstitial ad flow failed: ${e instanceof Error ? e.message : String(e)}`,
        'ads',
      );
    }
    logger.warn('[Ads] Failed to show native interstitial ad');
    return false;
  }

  // ── Mock ad UI integration ──────────────────────────────────────────────

  /**
   * Register a callback the UI layer uses to show a mock ad modal.
   * The callback receives the reward type and a resolver function.
   * Call `resolve(true)` when the mock ad "completes", or `resolve(false)` if dismissed.
   */
  setMockAdHandler(handler: (rewardType: AdRewardType, resolve: (watched: boolean) => void) => void): void {
    this.onShowMockAd = handler;
  }

  // ── Listener management ─────────────────────────────────────────────────

  onAdReadyChange(listener: (ready: boolean) => void): () => void {
    this.adReadyListeners.push(listener);
    return () => {
      this.adReadyListeners = this.adReadyListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    const ready = this.isRewardedAdReady();
    this.adReadyListeners.forEach((l) => l(ready));
  }

  // ── Native ad implementation ────────────────────────────────────────────

  private async nativeShowRewardedAd(rewardType: AdRewardType): Promise<AdRewardResult> {
    try {
      const mobileAds = await import('react-native-google-mobile-ads' as string);
      if (!mobileAds?.RewardedAd) {
        return { rewarded: false, rewardType };
      }

      // Prefer the preloaded instance — no load latency for the player.
      let ad = this.takePreloadedRewardedAd();

      if (!ad) {
        // Nothing cached (or the cache went stale) — fresh load-and-show.
        ad = mobileAds.RewardedAd.createForAdRequest(
          AD_CONFIG.REWARDED_AD_UNIT_ID,
          this.buildRequestOptions(),
        );
        const loaded = await this.loadAd(mobileAds, ad, 'rewarded');
        if (!loaded) {
          return { rewarded: false, rewardType };
        }
      }

      const { earned } = await this.showLoadedAd(mobileAds, ad, 'rewarded');
      // Warm the next ad so the following tap shows instantly.
      void this.preloadRewardedAd();
      return { rewarded: earned, rewardType };
    } catch (e) {
      crashReporter.addBreadcrumb(
        `Rewarded ad flow failed: ${e instanceof Error ? e.message : String(e)}`,
        'ads',
      );
      return { rewarded: false, rewardType };
    }
  }

  /**
   * Consume the cached preloaded rewarded ad, if any. Clearing
   * `rewardedAdReady` here keeps `isRewardedAdReady()` honest until the
   * next preload lands. A cached instance whose `loaded` flag has gone
   * false (closed/expired) cannot be show()n again — discard it so the
   * caller falls back to a fresh load instead of hitting show()'s throw.
   */
  private takePreloadedRewardedAd(): any {
    const ad = this.preloadedRewardedAd;
    if (!ad) return null;
    this.preloadedRewardedAd = null;
    this.rewardedAdReady = false;
    this.notifyListeners();
    return ad.loaded === false ? null : ad;
  }

  /**
   * Load a rewarded ad ahead of the tap that shows it. In native mode
   * `rewardedAdReady` reflects the REAL loaded state of the cached
   * instance; in mock mode the ad is always "ready" (unchanged behavior).
   * Never rejects — init() and the post-show warmup call this
   * fire-and-forget.
   */
  private async preloadRewardedAd(): Promise<void> {
    if (this.useMock) {
      this.rewardedAdReady = true;
      this.notifyListeners();
      return;
    }
    if (this.preloadingRewarded || this.preloadedRewardedAd) return;
    this.preloadingRewarded = true;
    try {
      const mobileAds = await import('react-native-google-mobile-ads' as string);
      if (!mobileAds?.RewardedAd) return;
      const ad = mobileAds.RewardedAd.createForAdRequest(
        AD_CONFIG.REWARDED_AD_UNIT_ID,
        this.buildRequestOptions(),
      );
      const loaded = await this.loadAd(mobileAds, ad, 'rewarded');
      if (loaded) {
        this.preloadedRewardedAd = ad;
        this.rewardedAdReady = true;
        this.lastPreloadFailureAt = 0;
      } else {
        this.rewardedAdReady = false;
        this.lastPreloadFailureAt = Date.now();
      }
      this.notifyListeners();
    } catch (e) {
      this.rewardedAdReady = false;
      this.lastPreloadFailureAt = Date.now();
      crashReporter.addBreadcrumb(
        `Rewarded ad preload failed: ${e instanceof Error ? e.message : String(e)}`,
        'ads',
      );
      this.notifyListeners();
    } finally {
      this.preloadingRewarded = false;
    }
  }

  /**
   * Native-mode self-heal: if the last preload failed (no fill / offline at
   * app start) and nothing is cached or in flight, quietly try again the
   * next time the UI asks whether an ad is available — otherwise a single
   * failed preload would hide every ad entry point until the next app
   * start. Throttled by PRELOAD_RETRY_INTERVAL_MS.
   */
  private maybeRefreshRewardedPreload(): void {
    if (this.useMock || !this.initialized || this.adsRemoved) return;
    if (this.preloadedRewardedAd || this.preloadingRewarded) return;
    if (Date.now() - this.lastPreloadFailureAt < PRELOAD_RETRY_INTERVAL_MS) return;
    void this.preloadRewardedAd();
  }

  // ── Mock implementation ─────────────────────────────────────────────────

  private async mockShowRewardedAd(rewardType: AdRewardType): Promise<AdRewardResult> {
    // If the UI layer registered a handler, use it (shows a real modal)
    if (this.onShowMockAd) {
      return new Promise<AdRewardResult>((resolve) => {
        this.onShowMockAd!(rewardType, (watched: boolean) => {
          resolve({ rewarded: watched, rewardType });
        });
      });
    }

    // Fallback: simple delay-based simulation (no UI)
    logger.log(`[Ads] Mock rewarded ad showing (reward: ${rewardType})...`);
    await new Promise<void>((r) => setTimeout(r, 2000));
    logger.log('[Ads] Mock rewarded ad completed — granting reward');
    return { rewarded: true, rewardType };
  }
}

export const adManager = AdManager.getInstance();
