/**
 * Analytics service tests.
 *
 * The Analytics class is a singleton with async methods that use AsyncStorage.
 * We test it by resetting the singleton between tests and using the mock AsyncStorage.
 */

// We need to mock firebase config import used by analytics
jest.mock('../../config/firebase', () => ({
  isFirebaseConfigured: false,
}));

// Mock firebase modules to prevent import errors
jest.mock('firebase/analytics', () => ({}), { virtual: true });
jest.mock('firebase/firestore', () => ({}), { virtual: true });
jest.mock('firebase/app', () => ({}), { virtual: true });

// Suppress __DEV__ console logs
(global as any).__DEV__ = false;

import AsyncStorage from '@react-native-async-storage/async-storage';

// We need to access the class fresh each test, but Analytics is a singleton.
// We'll clear storage between tests and recreate instances by clearing the module cache.

describe('Analytics service', () => {
  beforeEach(async () => {
    // Clear AsyncStorage between tests
    await AsyncStorage.clear();
    // Reset module to get a fresh singleton
    jest.resetModules();
  });

  async function getAnalytics() {
    const mod = await import('../analytics');
    return mod.analytics;
  }

  describe('logEvent', () => {
    it('stores events in AsyncStorage', async () => {
      const analytics = await getAnalytics();
      await analytics.logEvent('puzzle_start', { level: 1 });

      const events = await analytics.getBufferedEvents(100);
      expect(events.length).toBeGreaterThanOrEqual(1);
      // Find our event (there may also be a session_start)
      const puzzleEvent = events.find(e => e.event === 'puzzle_start');
      expect(puzzleEvent).toBeDefined();
      expect(puzzleEvent!.params).toEqual({ level: 1 });
    });

    it('auto-starts a session when logging an event without a session', async () => {
      const analytics = await getAnalytics();
      await analytics.logEvent('puzzle_complete', { level: 1 });

      const events = await analytics.getBufferedEvents(100);
      const sessionStart = events.find(e => e.event === 'app_session_start');
      expect(sessionStart).toBeDefined();
    });

    it('assigns event IDs', async () => {
      const analytics = await getAnalytics();
      await analytics.logEvent('puzzle_start');
      const events = await analytics.getBufferedEvents(100);
      for (const event of events) {
        expect(event.id).toBeTruthy();
        expect(typeof event.id).toBe('string');
      }
    });

    it('records timestamp on events', async () => {
      const analytics = await getAnalytics();
      const before = Date.now();
      await analytics.logEvent('puzzle_start');
      const events = await analytics.getBufferedEvents(100);
      const puzzleEvent = events.find(e => e.event === 'puzzle_start');
      expect(puzzleEvent!.timestamp).toBeGreaterThanOrEqual(before);
    });
  });

  describe('session management', () => {
    it('startSession creates a sessionId', async () => {
      const analytics = await getAnalytics();
      await analytics.startSession('app_launch');
      const events = await analytics.getBufferedEvents(100);
      const sessionEvent = events.find(e => e.event === 'app_session_start');
      expect(sessionEvent).toBeDefined();
      expect(sessionEvent!.sessionId).toBeTruthy();
    });

    it('endSession logs session_end with duration', async () => {
      const analytics = await getAnalytics();
      await analytics.startSession('app_launch');
      await analytics.endSession('background');
      const events = await analytics.getBufferedEvents(100);
      const endEvent = events.find(e => e.event === 'session_end');
      expect(endEvent).toBeDefined();
      expect(endEvent!.params).toHaveProperty('duration_seconds');
    });

    it('increments session number', async () => {
      const analytics = await getAnalytics();
      await analytics.startSession('app_launch');
      await analytics.endSession();
      expect(analytics.getSessionNumber()).toBe(1);
      await analytics.startSession('foreground');
      expect(analytics.getSessionNumber()).toBe(2);
    });

    it('does not start duplicate sessions', async () => {
      const analytics = await getAnalytics();
      await analytics.startSession('app_launch');
      await analytics.startSession('app_launch'); // should be ignored
      expect(analytics.getSessionNumber()).toBe(1);
    });
  });

  describe('user properties', () => {
    it('sets and retrieves user properties', async () => {
      const analytics = await getAnalytics();
      await analytics.setUserProperty('player_level', '10');
      const props = await analytics.getUserProperties();
      expect(props.player_level).toBe('10');
    });

    it('overwrites existing property', async () => {
      const analytics = await getAnalytics();
      await analytics.setUserProperty('player_level', '10');
      await analytics.setUserProperty('player_level', '20');
      const props = await analytics.getUserProperties();
      expect(props.player_level).toBe('20');
    });

    it('getUserProperties returns a copy (not the internal object)', async () => {
      const analytics = await getAnalytics();
      await analytics.setUserProperty('test', 'value');
      const props1 = await analytics.getUserProperties();
      props1.test = 'modified';
      const props2 = await analytics.getUserProperties();
      expect(props2.test).toBe('value');
    });

    it('batch updates user properties', async () => {
      const analytics = await getAnalytics();
      await analytics.updateUserProperties({
        player_level: 15,
        total_puzzles_solved: 42,
        is_payer: true,
      });
      const props = await analytics.getUserProperties();
      expect(props.player_level).toBe('15');
      expect(props.total_puzzles_solved).toBe('42');
      expect(props.is_payer).toBe('true');
    });
  });

  describe('A/B testing - getVariant', () => {
    it('returns a variant from the provided list', async () => {
      const analytics = await getAnalytics();
      const variant = await analytics.getVariant('test_exp', ['A', 'B', 'C']);
      expect(['A', 'B', 'C']).toContain(variant);
    });

    it('returns the same variant on subsequent calls (deterministic)', async () => {
      const analytics = await getAnalytics();
      const variant1 = await analytics.getVariant('test_exp', ['A', 'B', 'C']);
      const variant2 = await analytics.getVariant('test_exp', ['A', 'B', 'C']);
      expect(variant1).toBe(variant2);
    });

    it('throws on empty variants array', async () => {
      const analytics = await getAnalytics();
      await expect(analytics.getVariant('test_exp', [])).rejects.toThrow();
    });

    it('logs experiment_assigned event', async () => {
      const analytics = await getAnalytics();
      await analytics.getVariant('my_experiment', ['control', 'treatment']);
      const events = await analytics.getBufferedEvents(100);
      const assignEvent = events.find(e => e.event === 'experiment_assigned');
      expect(assignEvent).toBeDefined();
      expect(assignEvent!.params).toHaveProperty('experiment_name', 'my_experiment');
    });

    it('different experiments can have different variants', async () => {
      const analytics = await getAnalytics();
      await analytics.getVariant('exp_1', ['A', 'B']);
      await analytics.getVariant('exp_2', ['X', 'Y']);
      const experiments = analytics.getActiveExperiments();
      expect(experiments.exp_1).toBeDefined();
      expect(experiments.exp_2).toBeDefined();
    });
  });

  describe('convenience tracking methods', () => {
    it('trackPuzzleStart logs correct event', async () => {
      const analytics = await getAnalytics();
      await analytics.trackPuzzleStart(5, 'classic', 'medium');
      const events = await analytics.getBufferedEvents(100);
      const event = events.find(e => e.event === 'puzzle_start');
      expect(event).toBeDefined();
      expect(event!.params).toEqual({ level: 5, mode: 'classic', difficulty: 'medium' });
    });

    it('trackPuzzleComplete logs correct event', async () => {
      const analytics = await getAnalytics();
      await analytics.trackPuzzleComplete({
        level: 10,
        mode: 'daily',
        stars: 3,
        duration_seconds: 45,
        hints_used: 0,
        undos_used: 0,
        words_found: 5,
        score: 1200,
      });
      const events = await analytics.getBufferedEvents(100);
      const event = events.find(e => e.event === 'puzzle_complete');
      expect(event).toBeDefined();
      expect(event!.params).toHaveProperty('stars', 3);
      expect(event!.params).toHaveProperty('score', 1200);
    });

    it('trackRevenue logs iap_revenue event', async () => {
      const analytics = await getAnalytics();
      await analytics.trackRevenue('starter_pack', 1.99, 'USD');
      const events = await analytics.getBufferedEvents(100);
      const event = events.find(e => e.event === 'iap_revenue');
      expect(event).toBeDefined();
      expect(event!.params).toHaveProperty('amount', 1.99);
      expect(event!.params).toHaveProperty('currency', 'USD');
    });

    it('trackFunnel logs funnel_step event', async () => {
      const analytics = await getAnalytics();
      await analytics.trackFunnel('onboarding', 'step_2', { skipped: false });
      const events = await analytics.getBufferedEvents(100);
      const event = events.find(e => e.event === 'funnel_step');
      expect(event).toBeDefined();
      expect(event!.params).toHaveProperty('funnel_name', 'onboarding');
      expect(event!.params).toHaveProperty('step', 'step_2');
    });
  });

  describe('buffered events', () => {
    it('clearBufferedEvents empties the buffer', async () => {
      const analytics = await getAnalytics();
      await analytics.logEvent('puzzle_start');
      await analytics.clearBufferedEvents();
      const events = await analytics.getBufferedEvents(100);
      expect(events).toEqual([]);
    });

    it('getBufferedEvents respects limit', async () => {
      const analytics = await getAnalytics();
      for (let i = 0; i < 10; i++) {
        await analytics.logEvent('puzzle_start', { i });
      }
      const events = await analytics.getBufferedEvents(3);
      expect(events.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getDaysSinceInstall', () => {
    it('returns 0 for new install', async () => {
      const analytics = await getAnalytics();
      // Force ensureLoaded
      await analytics.logEvent('app_open');
      expect(analytics.getDaysSinceInstall()).toBe(0);
    });
  });

  describe('flush', () => {
    it('returns 0 when not using Firebase', async () => {
      const analytics = await getAnalytics();
      await analytics.logEvent('puzzle_start');
      const flushed = await analytics.flush();
      expect(flushed).toBe(0);
    });
  });

  describe('destroy', () => {
    it('stops auto-flush timer without error', async () => {
      const analytics = await getAnalytics();
      expect(() => analytics.destroy()).not.toThrow();
    });
  });
});
