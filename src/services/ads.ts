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
  | 'double_reward';

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
};

// ── Daily tracking persistence ─────────────────────────────────────────────────

const AD_TRACKING_KEY = '@wordfall_ad_tracking';

interface AdTracking {
  date: string; // YYYY-MM-DD
  viewCount: number;
  coinAdCount: number; // separate cap for coins_reward (max 3/day)
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
  return { date: todayKey(), viewCount: 0, coinAdCount: 0, lastAdTime: 0, interstitialCount: 0, lastInterstitialTime: 0 };
}

async function saveTracking(tracking: AdTracking): Promise<void> {
  try {
    await AsyncStorage.setItem(AD_TRACKING_KEY, JSON.stringify(tracking));
  } catch {
    logger.warn('[Ads] Failed to persist ad tracking');
  }
}

// ── AdManager singleton ────────────────────────────────────────────────────────

class AdManager {
  private static instance: AdManager;
  private adsRemoved = false;
  private rewardedAdReady = false;
  private initialized = false;
  private useMock = true;
  private tracking: AdTracking = { date: todayKey(), viewCount: 0, coinAdCount: 0, lastAdTime: 0, interstitialCount: 0, lastInterstitialTime: 0 };

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
        this.preloadRewardedAd();
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
      this.tracking = { date: todayKey(), viewCount: 0, coinAdCount: 0, lastAdTime: 0, interstitialCount: 0, lastInterstitialTime: 0 };
    }

    // Daily cap check
    if (this.tracking.viewCount >= AD_CONFIG.MAX_ADS_PER_DAY) {
      logger.log('[Ads] Daily ad cap reached');
      return { rewarded: false, rewardType };
    }

    // Coins-specific daily cap (max 3 per day)
    if (rewardType === 'coins_reward' && this.tracking.coinAdCount >= AD_CONFIG.MAX_COIN_ADS_PER_DAY) {
      logger.log('[Ads] Daily coin ad cap reached');
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
    if (this.tracking.date !== todayKey()) return AD_CONFIG.MAX_ADS_PER_DAY;
    return Math.max(0, AD_CONFIG.MAX_ADS_PER_DAY - this.tracking.viewCount);
  }

  /** Whether cooldown has elapsed since last ad */
  isCooldownElapsed(): boolean {
    return Date.now() - this.tracking.lastAdTime >= AD_CONFIG.REWARDED_COOLDOWN_MS;
  }

  /** Whether an ad can be shown right now (all checks combined) */
  canShowAd(rewardType?: AdRewardType): boolean {
    if (this.adsRemoved) return false;
    if (!this.rewardedAdReady) return false;
    if (!this.isCooldownElapsed()) return false;
    if (this.tracking.date === todayKey() && this.tracking.viewCount >= AD_CONFIG.MAX_ADS_PER_DAY) return false;
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

    if (this.tracking.interstitialCount >= AD_CONFIG.MAX_INTERSTITIALS_PER_DAY) return false;

    const now = Date.now();
    if (now - this.tracking.lastInterstitialTime < AD_CONFIG.INTERSTITIAL_INTERVAL_MS) return false;

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
      this.tracking = { date: todayKey(), viewCount: 0, coinAdCount: 0, lastAdTime: 0, interstitialCount: 0, lastInterstitialTime: 0 };
    }

    // Daily cap check
    if (this.tracking.interstitialCount >= AD_CONFIG.MAX_INTERSTITIALS_PER_DAY) {
      logger.log('[Ads] Daily interstitial cap reached');
      return false;
    }

    // Minimum interval check
    const now = Date.now();
    if (now - this.tracking.lastInterstitialTime < AD_CONFIG.INTERSTITIAL_INTERVAL_MS) {
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
    if (this.tracking.date !== todayKey()) return AD_CONFIG.MAX_INTERSTITIALS_PER_DAY;
    return Math.max(0, AD_CONFIG.MAX_INTERSTITIALS_PER_DAY - this.tracking.interstitialCount);
  }

  // ── Native interstitial implementation ─────────────────────────────────

  private async nativeShowInterstitialAd(): Promise<boolean> {
    try {
      const mobileAds = await import('react-native-google-mobile-ads' as string);
      if (mobileAds.InterstitialAd) {
        return new Promise<boolean>((resolve) => {
          const ad = mobileAds.InterstitialAd.createForAdRequest(
            AD_CONFIG.INTERSTITIAL_AD_UNIT_ID,
            this.buildRequestOptions(),
          );
          ad.addAdEventListener('closed', () => resolve(true));
          // AdMob impression-level revenue event (v15+). `data` includes
          // { valueMicros, currency, precision } when available.
          ad.addAdEventListener?.('paid', (data: any) => {
            const valueMicros = Number(data?.valueMicros ?? 0);
            const estimated = valueMicros ? valueMicros / 1_000_000 : 0;
            void analytics.trackAdRevenue('interstitial', estimated);
          });
          ad.addAdEventListener('error', (err: unknown) => {
            crashReporter.addBreadcrumb(
              `Interstitial ad error: ${err instanceof Error ? err.message : String(err)}`,
              'ads',
            );
            resolve(false);
          });
          ad.load();
          ad.show().catch((err: unknown) => {
            crashReporter.addBreadcrumb(
              `Interstitial ad show() rejected: ${err instanceof Error ? err.message : String(err)}`,
              'ads',
            );
            resolve(false);
          });
        });
      }
    } catch (e) {
      crashReporter.addBreadcrumb(
        `Interstitial ad import failed: ${e instanceof Error ? e.message : String(e)}`,
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
      if (mobileAds.RewardedAd) {
        const result: AdRewardResult = await new Promise<AdRewardResult>((resolve) => {
          const ad = mobileAds.RewardedAd.createForAdRequest(
            AD_CONFIG.REWARDED_AD_UNIT_ID,
            this.buildRequestOptions(),
          );
          ad.addAdEventListener('rewarded', () => {
            resolve({ rewarded: true, rewardType });
          });
          ad.addAdEventListener('closed', () => {
            resolve({ rewarded: false, rewardType });
          });
          ad.addAdEventListener?.('paid', (data: any) => {
            const valueMicros = Number(data?.valueMicros ?? 0);
            const estimated = valueMicros ? valueMicros / 1_000_000 : 0;
            void analytics.trackAdRevenue('rewarded', estimated);
          });
          ad.addAdEventListener('error', (err: unknown) => {
            crashReporter.addBreadcrumb(
              `Rewarded ad error: ${err instanceof Error ? err.message : String(err)}`,
              'ads',
            );
            resolve({ rewarded: false, rewardType });
          });
          ad.load();
          ad.show().catch((err: unknown) => {
            crashReporter.addBreadcrumb(
              `Rewarded ad show() rejected: ${err instanceof Error ? err.message : String(err)}`,
              'ads',
            );
            resolve({ rewarded: false, rewardType });
          });
        });
        this.preloadRewardedAd();
        return result;
      }
    } catch (e) {
      crashReporter.addBreadcrumb(
        `Rewarded ad import failed: ${e instanceof Error ? e.message : String(e)}`,
        'ads',
      );
    }
    return { rewarded: false, rewardType };
  }

  private async preloadRewardedAd(): Promise<void> {
    if (this.useMock) {
      this.rewardedAdReady = true;
      this.notifyListeners();
      return;
    }
    // Preloading requires react-native-google-mobile-ads — skip if unavailable
    this.rewardedAdReady = true;
    this.notifyListeners();
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
