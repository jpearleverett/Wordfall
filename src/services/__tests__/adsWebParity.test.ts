/**
 * THE WEB SHIM MUST IMPLEMENT THE WHOLE NATIVE AD SURFACE.
 *
 * Metro resolves `ads.web.ts` ahead of `ads.ts` for web, so the web bundle
 * only ever sees the shim. Nothing type-checks that substitution: `tsc` sees
 * the two files independently, call sites import `'../services/ads'` and get
 * the NATIVE types, and jest resolves the native module too. A method present
 * on `AdManager` and missing on `WebAdManager` is therefore invisible to
 * typecheck, to the unit suites, and to `expo export` — it only surfaces as a
 * `TypeError: ... is not a function` in the browser, at the moment the screen
 * that calls it mounts.
 *
 * That is exactly what happened: `canClaimAdReward` shipped native-only, and
 * because GameScreen calls it during render, EVERY level crashed to the
 * ErrorBoundary on web. `canShowInterstitial`, `showInterstitialAd` and
 * `getAdsRemoved` were missing the same way and would have crashed next.
 *
 * So: compare the two prototypes directly. Adding a public method to
 * `ads.ts` without adding it to `ads.web.ts` fails here.
 */

// ads.ts pulls in the real ad SDK at module scope. The parity check only
// reads prototype shape, so a permissive stub is enough — no behaviour from
// this mock is exercised.
jest.mock('react-native-google-mobile-ads', () => {
  class FakeAd {
    static createForAdRequest() {
      return new FakeAd();
    }
    addAdEventListener() {
      return () => {};
    }
    load() {}
    show() {}
    loaded = false;
  }
  return {
    __esModule: true,
    default: () => ({
      initialize: () => Promise.resolve(),
      setRequestConfiguration: () => Promise.resolve(),
    }),
    AdEventType: { LOADED: 'loaded', ERROR: 'error', CLOSED: 'closed', OPENED: 'opened' },
    RewardedAdEventType: { LOADED: 'rewarded_loaded', EARNED_REWARD: 'rewarded_earned_reward' },
    RewardedAd: FakeAd,
    InterstitialAd: FakeAd,
    TestIds: { REWARDED: 'test-rewarded', INTERSTITIAL: 'test-interstitial' },
    MaxAdContentRating: { G: 'G', PG: 'PG', T: 'T', MA: 'MA' },
  };
});

import * as fs from 'fs';
import * as path from 'path';
import { adManager as webAdManager } from '../ads.web';

const SRC_ROOT = path.resolve(__dirname, '../..');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__mocks__') continue;
      sourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Every `adManager.<method>` reached from app code. This is the real
 * contract — not the native class's full prototype, which also carries
 * TypeScript `private` helpers that are runtime-visible but never called
 * across the module boundary and have no business in the shim.
 */
function calledMethods(): Map<string, string[]> {
  const calls = new Map<string, string[]>();
  const files = sourceFiles(SRC_ROOT).filter(
    (f) => !f.includes('__tests__') && !f.endsWith('services/ads.ts') && !f.endsWith('services/ads.web.ts'),
  );
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\badManager\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
      const name = match[1];
      const where = path.relative(SRC_ROOT, file);
      const seen = calls.get(name) ?? [];
      if (!seen.includes(where)) seen.push(where);
      calls.set(name, seen);
    }
  }
  return calls;
}

describe('ads.web.ts covers the native ad surface', () => {
  it('implements every adManager method the app actually calls', () => {
    const calls = calledMethods();

    // Guard the guard: if the scan finds nothing, the regex or the walk
    // broke and this suite would pass vacuously forever.
    expect(calls.size).toBeGreaterThan(3);

    const missing = [...calls.entries()]
      .filter(([name]) => typeof (webAdManager as unknown as Record<string, unknown>)[name] !== 'function')
      .map(([name, files]) => `${name}  <- ${files.join(', ')}`);

    // Reported with call sites, because the fix is "add this to ads.web.ts"
    // and knowing which screen crashes tells you what the stub must return.
    expect(missing).toEqual([]);
  });

  it('re-exports every module-level export the native module has', () => {
    // The adManager scan above only sees `adManager.<method>` call sites, so
    // FREE FUNCTIONS are invisible to it — which is how
    // `isInterstitialOnAutoAdvanceEnabled` went missing after
    // `canClaimAdReward` was fixed. GameScreen imports it by name and calls it
    // on the zero-tap auto-advance branch, where an undefined import throws
    // inside a setTimeout, past the ErrorBoundary, after the victory overlay
    // has been dismissed. Diff the module surfaces directly.
    const nativeSrc = fs.readFileSync(path.join(SRC_ROOT, 'services/ads.ts'), 'utf8');
    const webSrc = fs.readFileSync(path.join(SRC_ROOT, 'services/ads.web.ts'), 'utf8');
    const names = (src: string) => new Set(
      [...src.matchAll(/^export\s+(?:async\s+)?(?:function|const|class|type|interface)\s+([A-Za-z0-9_]+)/gm)]
        .map((m) => m[1]),
    );

    const native = names(nativeSrc);
    const web = names(webSrc);
    expect(native.size).toBeGreaterThan(3);   // guard the guard

    const missing = [...native].filter((n) => !web.has(n)).sort();
    expect(missing).toEqual([]);
  });

  it('exports the same reward-value table', () => {
    // EconomyContext.processAdReward reads AD_REWARD_VALUES from whichever
    // module resolved, so a drift here mispays web players.
    const nativeValues = jest.requireActual('../ads').AD_REWARD_VALUES;
    const webValues = jest.requireActual('../ads.web').AD_REWARD_VALUES;
    expect(Object.keys(webValues).sort()).toEqual(Object.keys(nativeValues).sort());
    expect(webValues).toEqual(nativeValues);
  });

  it('never reports an ad or a claimable reward as available', () => {
    // The shim's whole contract: no ad SDK, so nothing is watchable and
    // nothing is claimable. A `true` here would render a dead button.
    expect(webAdManager.canShowAd('hint_reward')).toBe(false);
    expect(webAdManager.canClaimAdReward('hint_reward')).toBe(false);
    expect(webAdManager.canShowInterstitial()).toBe(false);
    expect(webAdManager.isRewardedAdReady()).toBe(false);
  });

  it('remembers ad-free status so the upsell is not pitched to a buyer', () => {
    expect(webAdManager.getAdsRemoved()).toBe(false);
    webAdManager.setAdsRemoved(true);
    expect(webAdManager.getAdsRemoved()).toBe(true);
    // Still no claimable reward — web cannot grant one even for a buyer.
    expect(webAdManager.canClaimAdReward('hint_reward')).toBe(false);
    webAdManager.setAdsRemoved(false);
  });
});
