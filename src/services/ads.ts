/**
 * Ad manager service.
 *
 * Wraps a rewarded-ad SDK when available. Falls back to mock ads in
 * development or when no ad SDK is installed.
 */

export type AdRewardType = 'hint' | 'life' | 'coins';

export interface AdRewardResult {
  rewarded: boolean;
  rewardType: AdRewardType;
}

class AdManager {
  private static instance: AdManager;
  private adsRemoved = false;
  private rewardedAdReady = false;
  private initialized = false;
  private useMock = true;

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

    try {
      // Attempt to load an ad SDK (e.g. expo-ads-admob or react-native-google-mobile-ads).
      // When available, initialise it and preload a rewarded ad.
      // For now, no ad SDK is installed so we always fall back to mock.
      const adModule = await import('expo-ads-admob' as string);
      if (adModule && typeof adModule.setTestDeviceIDAsync === 'function') {
        await adModule.setTestDeviceIDAsync('EMULATOR');
        this.useMock = false;
        this.preloadRewardedAd();
        console.log('[Ads] Native ad module initialised');
      }
    } catch {
      this.useMock = true;
      console.log('[Ads] No ad SDK available, using mock mode');
    }

    // In mock mode the rewarded ad is always "ready"
    if (this.useMock) {
      this.rewardedAdReady = true;
    }

    this.initialized = true;
  }

  // ── Rewarded ads ────────────────────────────────────────────────────────

  async showRewardedAd(rewardType: AdRewardType = 'hint'): Promise<AdRewardResult> {
    await this.init();

    if (this.adsRemoved) {
      // User paid to remove ads — grant the reward without showing anything
      return { rewarded: true, rewardType };
    }

    if (this.useMock) {
      return this.mockShowRewardedAd(rewardType);
    }

    try {
      const adModule = await import('expo-ads-admob' as string);
      const result: AdRewardResult = await new Promise<AdRewardResult>((resolve) => {
        adModule.AdMobRewarded.setAdUnitID('ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyy'); // placeholder
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

      // Preload next ad
      this.preloadRewardedAd();
      return result;
    } catch {
      return { rewarded: false, rewardType };
    }
  }

  isRewardedAdReady(): boolean {
    return this.rewardedAdReady && !this.adsRemoved;
  }

  setAdsRemoved(removed: boolean): void {
    this.adsRemoved = removed;
  }

  getAdsRemoved(): boolean {
    return this.adsRemoved;
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private async preloadRewardedAd(): Promise<void> {
    if (this.useMock) {
      this.rewardedAdReady = true;
      return;
    }
    try {
      const adModule = await import('expo-ads-admob' as string);
      this.rewardedAdReady = false;
      await adModule.AdMobRewarded.requestAdAsync();
      this.rewardedAdReady = true;
    } catch {
      this.rewardedAdReady = false;
    }
  }

  // ── Mock implementation ─────────────────────────────────────────────────

  private async mockShowRewardedAd(rewardType: AdRewardType): Promise<AdRewardResult> {
    console.log(`[Ads] Mock rewarded ad showing (reward: ${rewardType})...`);

    // Simulate a 2-second ad viewing experience
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    console.log('[Ads] Mock rewarded ad completed — granting reward');
    return { rewarded: true, rewardType };
  }
}

export const adManager = AdManager.getInstance();
