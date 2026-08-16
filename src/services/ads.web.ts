/**
 * Web stand-in for `ads.ts`.
 *
 * Metro resolves `foo.web.ts` ahead of `foo.ts` when bundling for web, so
 * this file is the ONLY thing web builds see — the native module is never
 * reached. Android and iOS bundles are completely unaffected.
 *
 * WHY THIS EXISTS: `react-native-google-mobile-ads` imports React Native
 * internals (`../specs/components/...NativeComponent`) that have no web
 * implementation, and `App.tsx` imports `src/services/ads` at the top
 * level, so a single unavoidable import chain made `expo export --platform
 * web` fail outright. That mattered because the web build is the only way
 * to play the game without installing a dev-client APK.
 *
 * There are no ads on web: every entry point resolves to "no ad available",
 * which callers already handle (the same path runs when the daily cap is
 * hit or when a device has no fill). Nothing here fakes a reward.
 */
import { logger } from '../utils/logger';

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

/** Must stay in sync with ads.ts — consumed by EconomyContext.processAdReward. */
export const AD_REWARD_VALUES: Record<AdRewardType, { currency: string; amount: number }> = {
  hint_reward: { currency: 'hintTokens', amount: 1 },
  undo_reward: { currency: 'undoTokens', amount: 1 },
  spin_reward: { currency: 'spins', amount: 1 },
  coins_reward: { currency: 'coins', amount: 50 },
  double_reward: { currency: 'double', amount: 2 },
  life_reward: { currency: 'lives', amount: 1 },
};

type MockAdHandler = (
  rewardType: AdRewardType,
  resolve: (watched: boolean) => void,
) => void;

class WebAdManager {
  private mockHandler: MockAdHandler | null = null;

  async init(): Promise<void> {
    logger.log('[Ads] Web build — ad SDK not available, ads disabled');
  }

  setAdConsent(_opts: Record<string, unknown>): void {}

  setAdsRemoved(_removed: boolean): void {}

  canWatchCoinAd(): boolean {
    return false;
  }

  coinAdsRemaining(): number {
    return 0;
  }

  canShowAd(_rewardType?: AdRewardType): boolean {
    return false;
  }

  /**
   * Honours a mock handler if one was installed (the dev/test path in
   * ads.ts does the same), otherwise reports no fill. Never grants a reward
   * on its own — a web player must not be able to mint currency.
   */
  async showRewardedAd(rewardType: AdRewardType): Promise<AdRewardResult> {
    if (this.mockHandler) {
      const watched = await new Promise<boolean>((resolve) => {
        this.mockHandler?.(rewardType, resolve);
      });
      return { rewarded: watched, rewardType };
    }
    return { rewarded: false, rewardType };
  }

  setMockAdHandler(handler: MockAdHandler): void {
    this.mockHandler = handler;
  }
}

export const adManager = new WebAdManager();
