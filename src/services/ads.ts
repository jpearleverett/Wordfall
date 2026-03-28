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
import Constants from 'expo-constants';
import { AD_CONFIG } from '../constants';

// Detect Expo Go — ad SDKs require native modules unavailable in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// ── Reward type definitions ────────────────────────────────────────────────────

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
  return { date: todayKey(), viewCount: 0, coinAdCount: 0, lastAdTime: 0 };
}

async function saveTracking(tracking: AdTracking): Promise<void> {
  try {
    await AsyncStorage.setItem(AD_TRACKING_KEY, JSON.stringify(tracking));
  } catch {
    console.warn('[Ads] Failed to persist ad tracking');
  }
}

// ── AdManager singleton ────────────────────────────────────────────────────────

class AdManager {
  private static instance: AdManager;
  private adsRemoved = false;
  private rewardedAdReady = false;
  private initialized = false;
  private useMock = true;
  private tracking: AdTracking = { date: todayKey(), viewCount: 0, coinAdCount: 0, lastAdTime: 0 };

  /** Listeners for ad-availability state changes */
  private adReadyListeners: Array<(ready: boolean) => void> = [];

  /** Mock ad listener — set by the UI layer to show a simulated ad modal */
  private mockAdResolver: ((watched: boolean) => void) | null = null;
  private onShowMockAd: ((rewardType: AdRewardType, resolve: (watched: boolean) => void) => void) | null = null;

  private constructor() {}

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

    try {
      // In Expo Go, ad SDKs are not available — skip and use mock mode
      if (isExpoGo) {
        throw new Error('Expo Go detected — ad SDKs unavailable');
      }
      // Attempt to load expo-ads-admob
      const adModule = await import('expo-ads-admob' as string);
      if (adModule && typeof adModule.setTestDeviceIDAsync === 'function') {
        await adModule.setTestDeviceIDAsync('EMULATOR');
        this.useMock = false;
        this.preloadRewardedAd();
        console.log('[Ads] Native ad module (expo-ads-admob) initialised');
      }
    } catch {
      try {
        // Attempt react-native-google-mobile-ads as fallback
        const mobileAds = await import('react-native-google-mobile-ads' as string);
        if (mobileAds && typeof mobileAds.default?.initialize === 'function') {
          await mobileAds.default.initialize();
          this.useMock = false;
          this.preloadRewardedAd();
          console.log('[Ads] Native ad module (react-native-google-mobile-ads) initialised');
        }
      } catch {
        this.useMock = true;
        console.log('[Ads] No ad SDK available — using mock mode');
      }
    }

    // In mock mode the rewarded ad is always "ready"
    if (this.useMock) {
      this.rewardedAdReady = true;
    }

    this.initialized = true;
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
      this.tracking = { date: todayKey(), viewCount: 0, coinAdCount: 0, lastAdTime: 0 };
    }

    // Daily cap check
    if (this.tracking.viewCount >= AD_CONFIG.MAX_ADS_PER_DAY) {
      console.log('[Ads] Daily ad cap reached');
      return { rewarded: false, rewardType };
    }

    // Coins-specific daily cap (max 3 per day)
    if (rewardType === 'coins_reward' && this.tracking.coinAdCount >= AD_CONFIG.MAX_COIN_ADS_PER_DAY) {
      console.log('[Ads] Daily coin ad cap reached');
      return { rewarded: false, rewardType };
    }

    // Cooldown check
    const now = Date.now();
    if (now - this.tracking.lastAdTime < AD_CONFIG.REWARDED_COOLDOWN_MS) {
      console.log('[Ads] Ad cooldown active');
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
      // Try expo-ads-admob first
      const adModule = await import('expo-ads-admob' as string);
      const result: AdRewardResult = await new Promise<AdRewardResult>((resolve) => {
        adModule.AdMobRewarded.setAdUnitID(AD_CONFIG.REWARDED_AD_UNIT_ID);
        adModule.AdMobRewarded.addEventListener('rewarded', () => {
          resolve({ rewarded: true, rewardType });
        });
        adModule.AdMobRewarded.addEventListener('adDismissed', () => {
          resolve({ rewarded: false, rewardType });
        });
        adModule.AdMobRewarded.showAdAsync().catch(() => {
          resolve({ rewarded: false, rewardType });
        });
      });
      this.preloadRewardedAd();
      return result;
    } catch {
      return { rewarded: false, rewardType };
    }
  }

  private async preloadRewardedAd(): Promise<void> {
    if (this.useMock) {
      this.rewardedAdReady = true;
      this.notifyListeners();
      return;
    }
    try {
      const adModule = await import('expo-ads-admob' as string);
      this.rewardedAdReady = false;
      this.notifyListeners();
      await adModule.AdMobRewarded.requestAdAsync();
      this.rewardedAdReady = true;
      this.notifyListeners();
    } catch {
      this.rewardedAdReady = false;
      this.notifyListeners();
    }
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
    console.log(`[Ads] Mock rewarded ad showing (reward: ${rewardType})...`);
    await new Promise<void>((r) => setTimeout(r, 2000));
    console.log('[Ads] Mock rewarded ad completed — granting reward');
    return { rewarded: true, rewardType };
  }
}

export const adManager = AdManager.getInstance();
