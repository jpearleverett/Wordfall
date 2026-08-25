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
}));

jest.mock('../analytics', () => ({
  analytics: {
    trackAdWatched: jest.fn(async () => {}),
    trackAdRevenue: jest.fn(async () => {}),
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
    expect(fake.instances).toHaveLength(1);
    expect(fake.instances[0].loaded).toBe(true);
    expect(adManager.isRewardedAdReady()).toBe(true);
    // Consent flags (ATT denied in this suite) flow into the request.
    expect(fake.instances[0].requestOptions).toMatchObject({
      requestNonPersonalizedAdsOnly: true,
    });

    const result = await adManager.showRewardedAd('coins_reward');
    expect(result).toEqual({ rewarded: true, rewardType: 'coins_reward' });
    await flush();

    // The cached instance was shown as-is (single load), and the next ad
    // was preloaded behind it.
    expect(fake.instances[0].showCallCount).toBe(1);
    expect(fake.instances[0].loadCallCount).toBe(1);
    expect(fake.instances).toHaveLength(2);
    expect(fake.instances[1].loaded).toBe(true);
    expect(fake.instances[1].showCallCount).toBe(0);
    expect(adManager.isRewardedAdReady()).toBe(true);
  });

  it('falls back to a fresh load when the cached ad is no longer loaded (show() would throw)', async () => {
    const { adManager, fake } = await freshAdManager();
    // Simulate expiry/invalidation of the cached instance.
    fake.instances[0].emit('closed');
    expect(fake.instances[0].loaded).toBe(false);

    const result = await adManager.showRewardedAd('hint_reward');
    expect(result).toEqual({ rewarded: true, rewardType: 'hint_reward' });
    expect(fake.instances[0].showCallCount).toBe(0);
    expect(fake.instances[1].kind).toBe('rewarded');
    expect(fake.instances[1].showCallCount).toBe(1);
  });
});

describe('interstitial show path', () => {
  it('happy path: load → LOADED → show → CLOSED resolves true and counts the view', async () => {
    const { adManager, fake } = await freshAdManager();
    const shown = await adManager.showInterstitialAd();
    expect(shown).toBe(true);
    expect(adManager.interstitialsRemaining()).toBe(4);
    const interstitials = fake.instances.filter((i: any) => i.kind === 'interstitial');
    expect(interstitials).toHaveLength(1);
    expect(interstitials[0].loadCallCount).toBe(1);
    expect(interstitials[0].showCallCount).toBe(1);
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
