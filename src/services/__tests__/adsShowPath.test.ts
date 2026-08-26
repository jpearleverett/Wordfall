/**
 * Native ad show-path contract (react-native-google-mobile-ads v16).
 *
 * The v16 MobileAd API has three hard edges the ads service must respect
 * (see node_modules/react-native-google-mobile-ads/src/ads/MobileAd.ts):
 *
 *  - `addAdEventListener` THROWS on an unknown event name, and RewardedAd
 *    additionally throws on AdEventType.LOADED ('loaded') — rewarded ads
 *    load via RewardedAdEventType.LOADED ('rewarded_loaded').
 *  - `show()` THROWS synchronously when the ad has not loaded.
 *  - EARNED_REWARD fires BEFORE CLOSED; a dismissed ad fires CLOSED only.
 *
 * The original implementation subscribed to a nonexistent 'rewarded' event
 * (executor threw, the catch swallowed it, every native rewarded tap
 * resolved rewarded:false instantly) and called load()+show() back to back
 * (show() throws before the ad loads). The fake below mirrors the real
 * library's edges exactly, so a regression back to either bug fails here
 * instead of on device.
 */

jest.mock('react-native-google-mobile-ads', () => {
  const state = {
    script: {
      load: 'success' as 'success' | 'error' | 'hang',
      watch: 'earn' as 'earn' | 'dismiss',
    },
    instances: [] as any[],
  };

  const AdEventType = {
    LOADED: 'loaded',
    ERROR: 'error',
    OPENED: 'opened',
    PAID: 'paid',
    CLICKED: 'clicked',
    CLOSED: 'closed',
  };
  const RewardedAdEventType = {
    LOADED: 'rewarded_loaded',
    EARNED_REWARD: 'rewarded_earned_reward',
  };

  class FakeAd {
    kind: 'rewarded' | 'interstitial';
    adUnitId: string;
    requestOptions: any;
    listeners = new Map<string, Map<number, (payload?: any) => void>>();
    nextListenerId = 0;
    loadedFlag = false;
    loadCalled = false;
    loadCallCount = 0;
    showCallCount = 0;

    constructor(kind: 'rewarded' | 'interstitial', adUnitId: string, requestOptions: any) {
      this.kind = kind;
      this.adUnitId = adUnitId;
      this.requestOptions = requestOptions;
      state.instances.push(this);
    }

    get loaded(): boolean {
      return this.loadedFlag;
    }

    addAdEventListener(type: string, listener: (payload?: any) => void): () => void {
      // Mirrors RewardedAd.addAdEventListener's explicit rejection of the
      // base 'loaded' event for rewarded ads.
      if (this.kind === 'rewarded' && type === AdEventType.LOADED) {
        throw new Error(
          'RewardedAd.addAdEventListener(*) use RewardedAdEventType.LOADED instead of AdEventType.LOADED.',
        );
      }
      const base: string[] = Object.values(AdEventType);
      const rewardedOnly: string[] = Object.values(RewardedAdEventType);
      const valid =
        base.includes(type) || (this.kind === 'rewarded' && rewardedOnly.includes(type));
      if (!valid) {
        throw new Error(
          `${this.kind}.addAdEventListener(*) 'type' expected a valid event type value.`,
        );
      }
      if (typeof listener !== 'function') {
        throw new Error(`${this.kind}.addAdEventListener(_, *) 'listener' expected a function.`);
      }
      const id = this.nextListenerId++;
      if (!this.listeners.has(type)) this.listeners.set(type, new Map());
      this.listeners.get(type)!.set(id, listener);
      return () => {
        this.listeners.get(type)?.delete(id);
      };
    }

    emit(type: string, payload?: any): void {
      // Mirrors MobileAd._handleAdEvent's internal state transitions.
      if (type === AdEventType.LOADED || type === RewardedAdEventType.LOADED) {
        this.loadedFlag = true;
      }
      if (type === AdEventType.CLOSED || type === AdEventType.ERROR) {
        this.loadedFlag = false;
        this.loadCalled = false;
      }
      const map = this.listeners.get(type);
      if (map) Array.from(map.values()).forEach((l) => l(payload));
    }

    load(): void {
      if (this.loadedFlag || this.loadCalled) return;
      this.loadCalled = true;
      this.loadCallCount++;
      const mode = state.script.load;
      // Promise-based (not queueMicrotask) so fake timers can't stall it.
      if (mode === 'success') {
        void Promise.resolve().then(() =>
          this.emit(
            this.kind === 'rewarded' ? RewardedAdEventType.LOADED : AdEventType.LOADED,
            { type: 'coins', amount: 10 },
          ),
        );
      } else if (mode === 'error') {
        void Promise.resolve().then(() =>
          this.emit(AdEventType.ERROR, new Error('[googleMobileAds/no-fill] Ad failed to load')),
        );
      }
      // 'hang': never emits — exercises the caller's load timeout.
    }

    show(): Promise<void> {
      if (!this.loadedFlag) {
        throw new Error(
          `${this.kind}.show() The requested ad has not loaded and could not be shown.`,
        );
      }
      this.showCallCount++;
      void Promise.resolve().then(() => {
        if (this.kind === 'rewarded' && state.script.watch === 'earn') {
          this.emit(RewardedAdEventType.EARNED_REWARD, { type: 'coins', amount: 10 });
        }
        this.emit(AdEventType.PAID, { valueMicros: 12_000, currency: 'USD', precision: 1 });
        this.emit(AdEventType.CLOSED);
      });
      return Promise.resolve();
    }
  }

  return {
    __esModule: true,
    default: () => ({ initialize: async () => {} }),
    AdEventType,
    RewardedAdEventType,
    RewardedAd: {
      createForAdRequest: (adUnitId: string, opts?: any) => new FakeAd('rewarded', adUnitId, opts),
    },
    InterstitialAd: {
      createForAdRequest: (adUnitId: string, opts?: any) =>
        new FakeAd('interstitial', adUnitId, opts),
    },
    __fake: state,
  };
});

jest.mock('../remoteConfig', () => ({
  getRemoteNumberClamped: (_key: string, fallback: number) => fallback,
  getRemoteString: (key: string) => mockRemoteStrings.get(key) ?? '',
  getRemoteBoolean: (key: string) => mockRemoteBooleans.get(key) ?? false,
}));

const mockRemoteStrings = new Map<string, string>();
const mockRemoteBooleans = new Map<string, boolean>();

jest.mock('../analytics', () => ({
  analytics: {
    trackAdWatched: jest.fn(async () => {}),
    trackAdRevenue: jest.fn(async () => {}),
    logEvent: jest.fn(async () => {}),
  },
}));

jest.mock('../crashReporting', () => ({
  crashReporter: { addBreadcrumb: jest.fn() },
}));

jest.mock('../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// The RN mock reports Platform.OS === 'ios', so init() runs the ATT flow.
jest.mock(
  'expo-tracking-transparency',
  () => ({
    requestTrackingPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  }),
  { virtual: true },
);

type AdManagerModule = typeof import('../ads');
type FakeScript = { load?: 'success' | 'error' | 'hang'; watch?: 'earn' | 'dismiss' };

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Instantiate the (fresh) mocked library and return its control state. */
function fakeState(): { script: Required<FakeScript>; instances: any[] } {
  return (require('react-native-google-mobile-ads') as any).__fake;
}

/**
 * The service is a module-level singleton with persisted daily tracking, so
 * every test gets a fresh module registry (which also resets the in-memory
 * AsyncStorage mock and the fake ad library's state).
 */
async function freshAdManager(script?: FakeScript) {
  jest.resetModules();
  const fake = fakeState();
  Object.assign(fake.script, { load: 'success', watch: 'earn' }, script);
  const { adManager } = require('../ads') as AdManagerModule;
  await adManager.init();
  await flush(); // let the init-time preload settle
  return { adManager, fake };
}

afterEach(() => {
  jest.useRealTimers();
});

describe('fake library contract (guards that the other tests mean something)', () => {
  it('throws on unknown event names, on AdEventType.LOADED for rewarded, and on show()-before-load', () => {
    jest.resetModules();
    const lib = require('react-native-google-mobile-ads') as any;
    const ad = lib.RewardedAd.createForAdRequest('unit', {});
    // The exact bug being fixed: 'rewarded' is not a v16 event.
    expect(() => ad.addAdEventListener('rewarded', () => {})).toThrow(/valid event type/);
    expect(() => ad.addAdEventListener('loaded', () => {})).toThrow(/RewardedAdEventType\.LOADED/);
    expect(() => ad.show()).toThrow(/has not loaded/);
    const interstitial = lib.InterstitialAd.createForAdRequest('unit', {});
    expect(() => interstitial.addAdEventListener('rewarded_loaded', () => {})).toThrow(
      /valid event type/,
    );
  });
});

describe('rewarded show path', () => {
  it('happy path: EARNED_REWARD before CLOSED resolves rewarded:true and counts the view', async () => {
    const { adManager } = await freshAdManager();
    const result = await adManager.showRewardedAd('hint_reward');
    expect(result).toEqual({ rewarded: true, rewardType: 'hint_reward' });
    expect(adManager.adsRemaining()).toBe(9);
    const { analytics } = require('../analytics') as any;
    expect(analytics.trackAdWatched).toHaveBeenCalledWith('rewarded', 'hint_reward');
    expect(analytics.trackAdRevenue).toHaveBeenCalledWith('rewarded', 0.012);
  });

  it('close without earning resolves rewarded:false and does not consume the daily cap', async () => {
    const { adManager } = await freshAdManager({ watch: 'dismiss' });
    const result = await adManager.showRewardedAd('hint_reward');
    expect(result).toEqual({ rewarded: false, rewardType: 'hint_reward' });
    expect(adManager.adsRemaining()).toBe(10);
    const { analytics } = require('../analytics') as any;
    expect(analytics.trackAdWatched).not.toHaveBeenCalled();
  });

  it('load error resolves rewarded:false without an unhandled rejection', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);
    try {
      const { adManager } = await freshAdManager({ load: 'error' });
      // Preload failed, so nothing is cached/ready.
      expect(adManager.isRewardedAdReady()).toBe(false);
      const result = await adManager.showRewardedAd('undo_reward');
      expect(result).toEqual({ rewarded: false, rewardType: 'undo_reward' });
      await flush();
      await flush();
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('load timeout resolves rewarded:false instead of hanging the UI', async () => {
    jest.useFakeTimers();
    jest.resetModules();
    const fake = fakeState();
    fake.script.load = 'hang';
    const { adManager } = require('../ads') as AdManagerModule;
    const promise = adManager.showRewardedAd('hint_reward');
    await jest.advanceTimersByTimeAsync(20_000);
    const result = await promise;
    expect(result).toEqual({ rewarded: false, rewardType: 'hint_reward' });
  });
});

describe('rewarded preload', () => {
  it('init preloads a real loaded ad, show consumes it without re-loading, then warms the next', async () => {
    const { adManager, fake } = await freshAdManager();
    // init warms BOTH formats: one rewarded and one interstitial preload.
    const preloadedRewarded = fake.instances.filter((i: any) => i.kind === 'rewarded');
    expect(preloadedRewarded).toHaveLength(1);
    expect(preloadedRewarded[0].loaded).toBe(true);
    expect(adManager.isRewardedAdReady()).toBe(true);
    // Consent flags (ATT denied in this suite) flow into the request.
    expect(preloadedRewarded[0].requestOptions).toMatchObject({
      requestNonPersonalizedAdsOnly: true,
    });

    const result = await adManager.showRewardedAd('coins_reward');
    expect(result).toEqual({ rewarded: true, rewardType: 'coins_reward' });
    await flush();

    // The cached instance was shown as-is (single load), and the next ad
    // was preloaded behind it.
    const rewardeds = fake.instances.filter((i: any) => i.kind === 'rewarded');
    expect(rewardeds[0].showCallCount).toBe(1);
    expect(rewardeds[0].loadCallCount).toBe(1);
    expect(rewardeds).toHaveLength(2);
    expect(rewardeds[1].loaded).toBe(true);
    expect(rewardeds[1].showCallCount).toBe(0);
    expect(adManager.isRewardedAdReady()).toBe(true);
  });

  it('falls back to a fresh load when the cached ad is no longer loaded (show() would throw)', async () => {
    const { adManager, fake } = await freshAdManager();
    // Simulate expiry/invalidation of the cached rewarded instance.
    const cached = fake.instances.find((i: any) => i.kind === 'rewarded');
    cached.emit('closed');
    expect(cached.loaded).toBe(false);

    const result = await adManager.showRewardedAd('hint_reward');
    expect(result).toEqual({ rewarded: true, rewardType: 'hint_reward' });
    expect(cached.showCallCount).toBe(0);
    const fresh = fake.instances.filter((i: any) => i.kind === 'rewarded' && i !== cached);
    expect(fresh.length).toBeGreaterThanOrEqual(1);
    expect(fresh[0].showCallCount).toBe(1);
  });
});

describe('interstitial show path', () => {
  it('happy path: load → LOADED → show → CLOSED resolves true and counts the view', async () => {
    const { adManager, fake } = await freshAdManager();
    const shown = await adManager.showInterstitialAd();
    await flush();
    expect(shown).toBe(true);
    expect(adManager.interstitialsRemaining()).toBe(4);
    // Consume-only path: the instance init preloaded was shown (one load,
    // one show) and a warmed replacement was loaded behind it.
    const interstitials = fake.instances.filter((i: any) => i.kind === 'interstitial');
    expect(interstitials).toHaveLength(2);
    expect(interstitials[0].loadCallCount).toBe(1);
    expect(interstitials[0].showCallCount).toBe(1);
    expect(interstitials[1].loaded).toBe(true);
    expect(interstitials[1].showCallCount).toBe(0);
    const { analytics } = require('../analytics') as any;
    expect(analytics.trackAdRevenue).toHaveBeenCalledWith('interstitial', 0.012);
  });

  it('load error resolves false without counting and without an unhandled rejection', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);
    try {
      const { adManager } = await freshAdManager({ load: 'error' });
      const shown = await adManager.showInterstitialAd();
      expect(shown).toBe(false);
      expect(adManager.interstitialsRemaining()).toBe(5);
      await flush();
      await flush();
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});

describe('ad-free auto-grant caps', () => {
  it('grants without showing an ad but consumes the same daily pool and cooldown as watching', async () => {
    const { adManager, fake } = await freshAdManager();
    adManager.setAdsRemoved(true);
    const before = fake.instances.length;

    const first = await adManager.showRewardedAd('hint_reward');
    expect(first).toEqual({ rewarded: true, rewardType: 'hint_reward' });
    // No ad was created or shown for the grant.
    expect(fake.instances.length).toBe(before);
    // The claim consumed the shared pool…
    expect(adManager.adsRemaining()).toBe(9);
    // …and the shared cooldown now applies exactly as it would to a watcher.
    const second = await adManager.showRewardedAd('hint_reward');
    expect(second.rewarded).toBe(false);
    expect(adManager.canClaimAdReward('hint_reward')).toBe(false);
  });

  it('canClaimAdReward mirrors canShowAd for ad-supported players', async () => {
    const { adManager } = await freshAdManager();
    expect(adManager.canClaimAdReward('hint_reward')).toBe(adManager.canShowAd('hint_reward'));
  });

  it("scoped mode caps consumable auto-grants at 3/day; double_reward stays open", async () => {
    mockRemoteStrings.set('removeAdsAutoGrantScope', 'scoped');
    const realNow = Date.now;
    let clock = realNow();
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    try {
      const { adManager } = await freshAdManager();
      adManager.setAdsRemoved(true);
      // Three consumable grants, stepping past the 30s cooldown each time.
      for (const type of ['hint_reward', 'undo_reward', 'spin_reward'] as const) {
        const r = await adManager.showRewardedAd(type);
        expect(r.rewarded).toBe(true);
        clock += 31_000;
      }
      // 4th consumable is refused by the scoped cap, not the cooldown.
      expect(adManager.canClaimAdReward('hint_reward')).toBe(false);
      const fourth = await adManager.showRewardedAd('hint_reward');
      expect(fourth.rewarded).toBe(false);
      // The non-consumable auto-grants stay available.
      expect(adManager.canClaimAdReward('double_reward')).toBe(true);
      const doubler = await adManager.showRewardedAd('double_reward');
      expect(doubler.rewarded).toBe(true);
    } finally {
      (Date.now as jest.Mock).mockRestore();
      mockRemoteStrings.delete('removeAdsAutoGrantScope');
    }
  });

  it('legacy (default) mode keeps the pre-scoping behavior byte for byte', async () => {
    const realNow = Date.now;
    let clock = realNow();
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    try {
      const { adManager } = await freshAdManager();
      adManager.setAdsRemoved(true);
      // 4+ consumable grants sail through in legacy mode (shared pool only).
      for (let i = 0; i < 4; i++) {
        const r = await adManager.showRewardedAd('hint_reward');
        expect(r.rewarded).toBe(true);
        clock += 31_000;
      }
    } finally {
      (Date.now as jest.Mock).mockRestore();
    }
  });
});
