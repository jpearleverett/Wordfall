/**
 * Analytics telemetry-integrity regression tests (Aug 2026 defect sweep):
 *  - flush() is single-flight and never re-sends batches that already landed
 *  - a persisted opt-out reaches the native SDK even when setEnabled() runs
 *    before initFirebase() finishes wiring the module
 *  - concurrent first-tick logEvent calls share one event-store load
 *    (a later-resolving parallel load used to clobber pushed boot events)
 *  - a session persisted by a crashed process is not resurrected on relaunch
 *  - D1/D7/D30 retention day markers use pure UTC arithmetic (no DST skew)
 *
 * Because jest.resetModules() re-evaluates the AsyncStorage mock (fresh
 * store), every test fetches AsyncStorage via dynamic import AFTER the reset
 * so it shares the exact instance the analytics module sees.
 */

jest.mock('../../config/firebase', () => ({
  isFirebaseConfigured: true,
}));

const mockAddDoc = jest.fn();
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(() => ({ id: 'analytics_events' })),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
}), { virtual: true });
jest.mock('firebase/app', () => ({ getApp: jest.fn(() => ({})) }), { virtual: true });

const mockSetCollectionEnabled = jest.fn(async (_enabled: boolean) => {});
jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: () => ({
    logEvent: jest.fn(),
    setUserId: jest.fn(),
    setUserProperties: jest.fn(),
    setAnalyticsCollectionEnabled: (enabled: boolean) => mockSetCollectionEnabled(enabled),
  }),
}));

// Suppress __DEV__ console logs
(global as any).__DEV__ = false;

const STATE_KEY = '@wordfall_analytics_state_v2';
const EVENTS_KEY = '@wordfall_analytics_events_v2';

/** Drain the microtask queue (one macrotask turn). */
const tick = async (): Promise<void> => new Promise(res => setTimeout(res, 0));

async function getStorage() {
  const mod = await import('@react-native-async-storage/async-storage');
  return mod.default;
}

async function getAnalyticsModule() {
  return import('../analytics');
}

describe('Analytics telemetry integrity', () => {
  beforeEach(() => {
    // Fresh singleton + fresh AsyncStorage store per test
    jest.resetModules();
    mockAddDoc.mockReset();
    mockSetCollectionEnabled.mockClear();
  });

  describe('retentionDayDate (UTC day markers)', () => {
    const originalTZ = process.env.TZ;
    afterAll(() => {
      if (originalTZ === undefined) delete process.env.TZ;
      else process.env.TZ = originalTZ;
    });

    it('D7/D30 stay UTC-correct across the US spring-forward', async () => {
      process.env.TZ = 'America/New_York';
      const { retentionDayDate } = await getAnalyticsModule();
      expect(retentionDayDate('2026-02-20', 7)).toBe('2026-02-27');
      // Window crosses the Mar 8 transition — local setDate() gave 2026-03-21
      expect(retentionDayDate('2026-02-20', 30)).toBe('2026-03-22');
    });

    it('D30 stays UTC-correct across the European spring-forward', async () => {
      process.env.TZ = 'Europe/Berlin';
      const { retentionDayDate } = await getAnalyticsModule();
      expect(retentionDayDate('2026-03-05', 30)).toBe('2026-04-04');
    });
  });

  describe('crash-stale sessions', () => {
    it('does not resurrect a session persisted by a crashed process', async () => {
      const storage = await getStorage();
      await storage.setItem(STATE_KEY, JSON.stringify({
        sessionId: 's_stale',
        sessionStartedAt: Date.now() - 86_400_000,
        sessionNumber: 1,
        installTimestamp: Date.now() - 172_800_000,
        userProperties: {},
        experiments: {},
      }));

      const { analytics } = await getAnalyticsModule();
      await analytics.startSession('app_launch');

      const events = await analytics.getBufferedEvents(100);
      const start = events.find(e => e.event === 'app_session_start');
      expect(start).toBeDefined();
      expect(start!.sessionId).not.toBe('s_stale');
      expect(analytics.getSessionNumber()).toBe(2);
    });

    it('never persists the live sessionId/sessionStartedAt', async () => {
      const storage = await getStorage();
      const { analytics } = await getAnalyticsModule();
      await analytics.startSession('app_launch');

      const raw = await storage.getItem(STATE_KEY);
      expect(raw).toBeTruthy();
      const persisted = JSON.parse(raw!);
      expect(persisted.sessionId).toBeNull();
      expect(persisted.sessionStartedAt).toBeNull();
      expect(persisted.sessionNumber).toBe(1);
    });
  });

  describe('opt-out on boot', () => {
    it('applies a pre-init opt-out to the native SDK once initFirebase wires it', async () => {
      const { analytics } = await getAnalyticsModule();

      // Settings hydration wins the race against initFirebase's imports:
      // the native module is not wired yet, so setEnabled cannot reach it.
      await analytics.setEnabled(false);
      expect(mockSetCollectionEnabled).not.toHaveBeenCalled();

      await analytics.initFirebase();
      expect(mockSetCollectionEnabled).toHaveBeenCalledWith(false);

      await analytics.destroy();
    });
  });

  describe('concurrent event-store load', () => {
    it('first-tick logEvent calls share one load and no boot event is dropped', async () => {
      const storage = await getStorage();
      const { analytics } = await getAnalyticsModule();

      const realGetItem = storage.getItem.bind(storage);
      const eventReads: Array<(v: string | null) => void> = [];
      const spy = jest.spyOn(storage, 'getItem').mockImplementation((key: string) => {
        if (key === EVENTS_KEY) {
          return new Promise<string | null>(res => { eventReads.push(res); });
        }
        return realGetItem(key);
      });

      const p1 = analytics.logEvent('app_open');
      const p2 = analytics.logEvent('screen_view');
      await tick();                 // both callers reach the event-store read
      eventReads.shift()?.('[]');   // first read resolves; caller 1 pushes app_open
      await tick();
      eventReads.shift()?.('[]');   // a second read only exists without the
                                    // single-flight guard — its late assignment
                                    // used to clobber caller 1's pushed event
      await Promise.all([p1, p2]);
      spy.mockRestore();

      const events = await analytics.getBufferedEvents(100);
      expect(events.some(e => e.event === 'app_open')).toBe(true);
      expect(events.some(e => e.event === 'screen_view')).toBe(true);
    });
  });

  describe('flush concurrency + partial failure', () => {
    it('overlapping flush calls write each event exactly once', async () => {
      const { analytics } = await getAnalyticsModule();
      await analytics.initFirebase();
      await analytics.logEvent('puzzle_start', { level: 1 });
      await analytics.logEvent('puzzle_complete', { level: 1 });
      await analytics.logEvent('offer_shown', { offer_type: 'x' });

      const resolvers: Array<(v: unknown) => void> = [];
      mockAddDoc.mockImplementation(() => new Promise(res => { resolvers.push(res); }));

      const f1 = analytics.flush();  // snapshots the buffer, blocks on addDoc
      const f2 = analytics.flush();  // must join f1, not snapshot again
      await tick();
      resolvers.splice(0).forEach(res => res({}));
      await tick();
      resolvers.splice(0).forEach(res => res({}));  // second wave only exists pre-fix
      await Promise.all([f1, f2]);

      const written = mockAddDoc.mock.calls.map(call => (call[1] as { id: string }).id);
      expect(written.length).toBeGreaterThan(0);
      expect(new Set(written).size).toBe(written.length);  // no event written twice
      expect(await analytics.getBufferedEvents(100)).toEqual([]);

      await analytics.destroy();
    });

    it('a mid-flush failure does not re-send the batches that already landed', async () => {
      const { analytics } = await getAnalyticsModule();
      await analytics.initFirebase();
      for (let i = 0; i < 60; i++) {
        await analytics.logEvent('funnel_step', { i });
      }

      // Batch 1 (50 events) lands; the first write of batch 2 fails.
      let call = 0;
      mockAddDoc.mockImplementation(() => {
        call++;
        return call === 51 ? Promise.reject(new Error('transient')) : Promise.resolve({});
      });
      await analytics.flush();

      const batch1Ids = mockAddDoc.mock.calls
        .slice(0, 50)
        .map(c => (c[1] as { id: string }).id);

      // Retry with the network healthy again.
      mockAddDoc.mockImplementation(() => Promise.resolve({}));
      await analytics.flush();

      const allIds = mockAddDoc.mock.calls.map(c => (c[1] as { id: string }).id);
      for (const id of batch1Ids) {
        expect(allIds.filter(x => x === id)).toHaveLength(1);
      }
      expect(await analytics.getBufferedEvents(100)).toEqual([]);

      await analytics.destroy();
    });
  });
});
