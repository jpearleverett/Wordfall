/**
 * NOTIFICATION MANAGER — cross-restart registry, cohort filter, template copy.
 *
 * Three defects pinned here (Aug 2026 sweep):
 *
 * 1. The category → OS-notification-id registry was in-memory only. One-shot
 *    TIME_INTERVAL notifications are OS-persisted and survive process death,
 *    so after Android killed the process, cancel() early-returned and
 *    schedule() couldn't replace the previous session's pending notification
 *    — stale "your streak expires tonight!" pings fired after the player had
 *    already played, and comeback pings from dead sessions accumulated.
 *    The registry is now persisted to AsyncStorage and rehydrated.
 *
 * 2. isCategoryAllowedForSegment filtered 'comeback' by the CURRENT segment,
 *    but the only segments that enable it (at_risk / lapsed) are assigned on
 *    an app open AFTER an absence — when the pre-scheduled ping should have
 *    already fired. The comeback was unschedulable for every cohort it was
 *    built for, including the 20-hour D1 ping for brand-new installs.
 *
 * 3. friend_activity's three template bodies describe three DIFFERENT events
 *    (gift / beat-score / partner task) but the body was picked at random, so
 *    the live beat-score trigger announced nonexistent gifts ~2/3 of the time.
 *    The row is now derived deterministically from the trigger's payload.
 *
 * Process restarts are simulated with jest.resetModules() + re-require; the
 * mock OS pending list and mock AsyncStorage live in test-file scope, so —
 * like the real OS notification queue and device storage — they survive the
 * "restart" while all module state (the in-memory map) is rebuilt from zero.
 */

import type { PlayerSegments } from '../playerSegmentation';

// ─── Mock OS notification queue (survives jest.resetModules) ────────────────

interface MockPendingNotification {
  id: string;
  content: { title: string; body: string; data: Record<string, unknown> };
  trigger: { type: string; seconds?: number };
}

const mockPending: MockPendingNotification[] = [];
let mockNextId = 1;

const mockScheduleNotificationAsync = jest.fn(async (req: any) => {
  const id = `notif-${mockNextId++}`;
  mockPending.push({ id, content: req.content, trigger: req.trigger });
  return id;
});

const mockCancelScheduledNotificationAsync = jest.fn(async (id: string) => {
  const idx = mockPending.findIndex((n) => n.id === id);
  if (idx >= 0) mockPending.splice(idx, 1);
});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test]' })),
  getDevicePushTokenAsync: jest.fn(async () => ({ data: 'device-token' })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockPending.length = 0;
  }),
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
    DAILY: 'daily',
    WEEKLY: 'weekly',
  },
}));

jest.mock('expo-device', () => ({ isDevice: false }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: null } }));
jest.mock('../remoteConfig', () => ({ getRemoteNumber: jest.fn(() => 0) }));

// ─── Mock device storage (survives jest.resetModules) ───────────────────────
// Overrides the moduleNameMapper mock, whose backing store would be wiped by
// resetModules — real AsyncStorage survives a process restart, so ours must.

const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => (k in mockStorage ? mockStorage[k] : null),
    setItem: async (k: string, v: string) => {
      mockStorage[k] = v;
    },
    removeItem: async (k: string) => {
      delete mockStorage[k];
    },
  },
}));

// ─── Boot helper: one call = one fresh app process ──────────────────────────

type NotificationsModule = typeof import('../notifications');

async function bootProcess(): Promise<NotificationsModule> {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../notifications') as NotificationsModule;
  await mod.notificationManager.init();
  return mod;
}

function segments(overrides: Partial<PlayerSegments> = {}): PlayerSegments {
  return {
    engagement: 'new_player',
    skill: 'beginner',
    spending: 'non_payer',
    motivations: [],
    computedAt: new Date().toISOString(),
    daysSinceActive: 0,
    ...overrides,
  };
}

function pendingByCategory(category: string): MockPendingNotification[] {
  return mockPending.filter((n) => n.content.data.category === category);
}

beforeEach(() => {
  mockPending.length = 0;
  mockScheduleNotificationAsync.mockClear();
  mockCancelScheduledNotificationAsync.mockClear();
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
});

describe('scheduled-id registry survives process restart', () => {
  it('cancels a previous process\'s pending notification', async () => {
    // Session 1: app backgrounds, comeback ping scheduled 3 days out.
    const p1 = await bootProcess();
    await p1.notificationManager.scheduleComebackReminder(50);
    expect(mockPending).toHaveLength(1);
    const firstId = mockPending[0].id;

    // Android kills the process overnight. Session 2: player opens the app
    // (actively playing) — App.tsx cancels the comeback on foreground.
    const p2 = await bootProcess();
    await p2.notificationManager.cancel('comeback');

    // Pre-fix: the fresh process's empty map made cancel() a no-op and the
    // stale "We miss you!" still fired at an active player.
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith(firstId);
    expect(pendingByCategory('comeback')).toHaveLength(0);
  });

  it('replaces instead of duplicating across restarts', async () => {
    const p1 = await bootProcess();
    await p1.notificationManager.scheduleComebackReminder(50);
    const firstId = mockPending[0].id;

    const p2 = await bootProcess();
    await p2.notificationManager.scheduleComebackReminder(50);

    // Exactly one pending comeback — the old one was found and cancelled.
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith(firstId);
    expect(pendingByCategory('comeback')).toHaveLength(1);
    expect(pendingByCategory('comeback')[0].id).not.toBe(firstId);
  });

  it('replaces a stale streak reminder scheduled by a dead process', async () => {
    const p1 = await bootProcess();
    await p1.notificationManager.schedule(
      'streak_reminder',
      { type: 'timeInterval', seconds: 12 * 3600 },
      { streak: 5 },
    );
    expect(pendingByCategory('streak_reminder')).toHaveLength(1);

    // Restart; the player plays, and the trigger reschedules for tomorrow.
    const p2 = await bootProcess();
    await p2.notificationManager.schedule(
      'streak_reminder',
      { type: 'timeInterval', seconds: 36 * 3600 },
      { streak: 6 },
    );

    const reminders = pendingByCategory('streak_reminder');
    expect(reminders).toHaveLength(1);
    expect(reminders[0].trigger.seconds).toBe(36 * 3600);
  });
});

describe('comeback notification reaches its target cohorts', () => {
  it('schedules the 20-hour D1 ping for a brand-new install', async () => {
    const mod = await bootProcess();
    // new_player has no branch in getPersonalizedNotifications and falls
    // through to the non_payer config, which omits 'comeback' — pre-fix the
    // segment filter silently dropped the exact ping built for this cohort.
    mod.setNotificationSegments(segments());
    await mod.notificationManager.scheduleComebackReminder(3);

    const comebacks = pendingByCategory('comeback');
    expect(comebacks).toHaveLength(1);
    expect(comebacks[0].trigger.seconds).toBe(20 * 3600);
  });

  it('schedules the 3-day ping for every active cohort', async () => {
    const cohorts: Array<Pick<PlayerSegments, 'engagement' | 'spending'>> = [
      { engagement: 'casual', spending: 'non_payer' },
      { engagement: 'regular', spending: 'minnow' },
      { engagement: 'hardcore', spending: 'dolphin' },
      { engagement: 'regular', spending: 'whale' },
    ];
    for (const cohort of cohorts) {
      const mod = await bootProcess();
      mockPending.length = 0;
      mod.setNotificationSegments(segments(cohort));
      await mod.notificationManager.scheduleComebackReminder(50);
      expect(pendingByCategory('comeback')).toHaveLength(1);
      expect(pendingByCategory('comeback')[0].trigger.seconds).toBe(3 * 24 * 3600);
    }
  });
});

describe('friend_activity copy matches the actual event', () => {
  const SWEEP = [0, 0.2, 0.34, 0.5, 0.67, 0.8, 0.99];

  it('a beat-score payload always gets the beat-score copy', async () => {
    const mod = await bootProcess();
    // hardcore is a cohort whose segment config enables friend_activity.
    mod.setNotificationSegments(segments({ engagement: 'hardcore', skill: 'expert', spending: 'whale' }));

    const randomSpy = jest.spyOn(Math, 'random');
    try {
      for (const r of SWEEP) {
        randomSpy.mockReturnValue(r);
        await mod.notificationManager.schedule(
          'friend_activity',
          { type: 'timeInterval', seconds: 1 },
          { friendName: 'Alex', level: 30 },
        );
      }
    } finally {
      randomSpy.mockRestore();
    }

    const calls = mockScheduleNotificationAsync.mock.calls.map((c: any[]) => c[0].content);
    expect(calls).toHaveLength(SWEEP.length);
    for (const content of calls) {
      // Pre-fix: random body — "Alex sent you a hint gift!" for a beat-score
      // event ~1/3 of the time, and a mismatched random title on top.
      expect(content.body).toMatch(/beat your score on Level 30/);
      expect(content.title).toBe('Friend alert!');
      // No un-interpolated template slots ever reach the player.
      expect(content.title).not.toMatch(/\{/);
      expect(content.body).not.toMatch(/\{/);
    }
  });

  it('free-text detail never renders into the {level} slot or claims a gift', async () => {
    const mod = await bootProcess();
    mod.setNotificationSegments(segments({ engagement: 'hardcore', skill: 'expert', spending: 'whale' }));

    // triggerSocialProofNotification's payload shape: detail passed as level.
    await mod.notificationManager.schedule(
      'friend_activity',
      { type: 'timeInterval', seconds: 1 },
      { friendName: 'Alex', level: 'completed Chapter 5' },
    );

    const content = mockScheduleNotificationAsync.mock.calls[0][0].content;
    expect(content.body).not.toMatch(/Level completed Chapter 5/);
    expect(content.body).not.toMatch(/gift/i);
    expect(content.body).not.toMatch(/\{/);
  });
});
