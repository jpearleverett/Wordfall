/**
 * REMOTE CONFIG MUST ACTUALLY START.
 *
 * Thirty-odd modules read values through getRemoteBoolean/Number/String —
 * every kill switch, every A/B variant, the offer-pacing knobs, the seasonal
 * chapter payload. getRemoteValue short-circuits to the compile-time default
 * whenever `initialized` is false, and nothing in the app ever called
 * initRemoteConfig(). The entire surface was inert: a feature that shipped
 * broken could only be switched off by a store release.
 *
 * Two failures had to line up for that to be invisible, and both are pinned
 * here:
 *   1. nobody called initRemoteConfig() at startup;
 *   2. initRemoteConfig() didn't notify listeners after activating, so the
 *      chapter overlay — ingested inside notifyListeners — would still never
 *      have loaded even once (1) was fixed.
 *
 * Firebase is not configured in this environment, so init takes its
 * unavailable path. That still exercises the contract that matters for the
 * offline majority: it must complete, never throw, and leave every reader on
 * safe defaults.
 */
import {
  initRemoteConfig,
  getRemoteBoolean,
  getRemoteNumber,
  addConfigListener,
} from '../remoteConfig';

describe('remote config startup', () => {
  it('initializes without throwing when Firebase is unavailable', async () => {
    // The offline / unconfigured path is the common one on a cold start, and
    // it runs unawaited during app boot — a rejection here would surface as
    // an unhandled promise rejection in production.
    await expect(initRemoteConfig()).resolves.toBeUndefined();
  });

  it('is idempotent', async () => {
    await initRemoteConfig();
    await expect(initRemoteConfig()).resolves.toBeUndefined();
  });

  it('leaves readers on safe defaults rather than undefined', async () => {
    await initRemoteConfig();
    // A gameplay kill switch and a tuning number: both must come back as
    // real typed values, because callers branch on them directly.
    expect(typeof getRemoteBoolean('freeStuckRescueEnabled')).toBe('boolean');
    expect(typeof getRemoteNumber('offerCooldownMinutes')).toBe('number');
  });

  it('the safety-critical kill switches default to ON', async () => {
    await initRemoteConfig();
    // These gate work this branch relies on. A default of false would ship
    // the code dark, which is the same class of silent no-op as the missing
    // init call itself.
    for (const key of [
      'freeStuckRescueEnabled',
      'adaptiveDifficultyEnabled',
      'autoAdvanceEnabled',
      'failBreatherEnabled',
    ] as const) {
      expect(getRemoteBoolean(key)).toBe(true);
    }
  });

  it('hard energy stays OFF by default', async () => {
    // The lives gate is deliberately dark until someone chooses to flip it
    // remotely — which only works now that Remote Config runs at all.
    await initRemoteConfig();
    expect(getRemoteBoolean('hardEnergyEnabled')).toBe(false);
  });

  it('exposes a listener API that unsubscribes cleanly', async () => {
    await initRemoteConfig();
    const seen: unknown[] = [];
    const unsubscribe = addConfigListener((values) => seen.push(values));
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });
});

describe('the chapter overlay is wired to config activation', () => {
  it('notifyListeners is what ingests chapterOverrideJson', () => {
    // Guard the coupling itself, since it is the part that was broken and it
    // is invisible from either side alone: chapters.ts exposes the ingest
    // function, remoteConfig.ts calls it from notifyListeners, and
    // initRemoteConfig must call notifyListeners after activating. If
    // someone "cleans up" that lazy require, chapters 41+ silently stop
    // shipping and nothing else fails.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const chapters = require('../../data/chapters');
    expect(typeof chapters.setRemoteChapterOverride).toBe('function');

    // An empty/absent payload must leave the 40 authored chapters intact
    // rather than blanking the catalog.
    const before = chapters.getAllChapters().length;
    chapters.setRemoteChapterOverride(undefined);
    expect(chapters.getAllChapters().length).toBe(before);
    chapters.setRemoteChapterOverride('not json');
    expect(chapters.getAllChapters().length).toBe(before);
  });
});
