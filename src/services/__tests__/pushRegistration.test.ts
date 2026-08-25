/**
 * PUSH TOKEN REGISTRATION — the default-install path.
 *
 * Two independent breaks left the server-push channel reaching 0% of
 * installs (Aug 2026 sweep):
 *
 * 1. registerForRemotePush had exactly ONE call site — the Settings
 *    toggle's false→true transition effect, which skips first render.
 *    notificationsEnabled defaults to TRUE, so a default install never
 *    took that transition and users/{uid}/pushToken/current was never
 *    written. init() fetched the Expo token into memory and dropped it.
 *
 * 2. The client saved the token under the field name `expoToken` while the
 *    server (sendPushToUser in functions/src/social.ts) read
 *    `tokenData.token` — so even a toggled user's push returned no_token.
 *
 * These tests pin the repaired contract: init() persists the token on the
 * default path (waiting for Firebase auth if sign-in is still in flight),
 * writes BOTH `token` (canonical, what the server reads) and `expoToken`
 * (legacy/migration), honors an explicit notificationsEnabled=false, and
 * the toggle-off path deletes the Firestore doc.
 */

// ─── Mock expo modules (isDevice: TRUE — token path must run) ───────────────

const mockGetExpoPushTokenAsync = jest.fn(async () => ({
  data: 'ExponentPushToken[test]',
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
  getDevicePushTokenAsync: jest.fn(async () => ({ data: 'device-token' })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'notif-1'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
    DAILY: 'daily',
    WEEKLY: 'weekly',
  },
}));

jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: null } }));
jest.mock('../remoteConfig', () => ({ getRemoteNumber: jest.fn(() => 0) }));

// ─── Mock device storage (settings key + token cache) ───────────────────────

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

// ─── Mock Firebase (config, firestore, auth) ────────────────────────────────

const mockAuthState: { currentUser: { uid: string } | null } = {
  currentUser: { uid: 'user-1' },
};
const mockFirebaseFlags = { configured: true };

jest.mock('../../config/firebase', () => ({
  get isFirebaseConfigured() {
    return mockFirebaseFlags.configured;
  },
  get auth() {
    return mockAuthState;
  },
}));

const mockSetDoc = jest.fn(async (..._args: unknown[]) => {});
const mockDeleteDoc = jest.fn(async (..._args: unknown[]) => {});

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: (_db: unknown, ...segments: string[]) => ({ __path: segments.join('/') }),
  setDoc: mockSetDoc,
  deleteDoc: mockDeleteDoc,
}));

jest.mock('firebase/app', () => ({ getApp: jest.fn(() => ({})) }));

const mockAuthListeners: Array<(user: { uid: string } | null) => void> = [];

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (
    _auth: unknown,
    cb: (user: { uid: string } | null) => void,
  ) => {
    mockAuthListeners.push(cb);
    return () => {
      const idx = mockAuthListeners.indexOf(cb);
      if (idx >= 0) mockAuthListeners.splice(idx, 1);
    };
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const SETTINGS_KEY = '@wordfall_settings';
const TOKEN_DOC_PATH = 'users/user-1/pushToken/current';

type NotificationsModule = typeof import('../notifications');

/** Drain the fire-and-forget registration chain (dynamic imports + writes). */
async function flushAsync(): Promise<void> {
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 25; i++) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
  }
}

/** One call = one fresh app process (per-process registration guard resets). */
async function bootProcess(): Promise<NotificationsModule> {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../notifications') as NotificationsModule;
  await mod.notificationManager.init();
  await flushAsync();
  return mod;
}

function setDocPayloads(): Array<{ path: string; data: Record<string, unknown> }> {
  return mockSetDoc.mock.calls.map((c: unknown[]) => ({
    path: (c[0] as { __path: string }).__path,
    data: c[1] as Record<string, unknown>,
  }));
}

beforeEach(() => {
  mockSetDoc.mockClear();
  mockDeleteDoc.mockClear();
  mockGetExpoPushTokenAsync.mockClear();
  mockAuthListeners.length = 0;
  mockAuthState.currentUser = { uid: 'user-1' };
  mockFirebaseFlags.configured = true;
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('default-path registration from init()', () => {
  it('persists the token on a fresh install (no stored settings — default ON)', async () => {
    await bootProcess();

    const writes = setDocPayloads().filter((w) => w.path === TOKEN_DOC_PATH);
    expect(writes).toHaveLength(1);
    expect(writes[0].data.token).toBe('ExponentPushToken[test]');
  });

  it('writes BOTH field names: canonical `token` (server-read) and legacy `expoToken`', async () => {
    await bootProcess();

    const [write] = setDocPayloads().filter((w) => w.path === TOKEN_DOC_PATH);
    expect(write).toBeDefined();
    // The server (sendPushToUser) reads `token ?? expoToken`. `token` is the
    // canonical field going forward; `expoToken` stays for migration.
    expect(write.data.token).toBe('ExponentPushToken[test]');
    expect(write.data.expoToken).toBe('ExponentPushToken[test]');
    expect(write.data.deviceToken).toBe('device-token');
  });

  it('registers when persisted settings explicitly enable notifications', async () => {
    mockStorage[SETTINGS_KEY] = JSON.stringify({ notificationsEnabled: true });
    await bootProcess();
    expect(setDocPayloads().some((w) => w.path === TOKEN_DOC_PATH)).toBe(true);
  });

  it('does NOT register when the user has toggled notifications OFF', async () => {
    mockStorage[SETTINGS_KEY] = JSON.stringify({ notificationsEnabled: false });
    await bootProcess();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('treats unreadable settings as the default (enabled) rather than dropping the channel', async () => {
    mockStorage[SETTINGS_KEY] = 'not json{{';
    await bootProcess();
    expect(setDocPayloads().some((w) => w.path === TOKEN_DOC_PATH)).toBe(true);
  });

  it('registers only once per process even if init() runs again', async () => {
    const mod = await bootProcess();
    await mod.notificationManager.init();
    await flushAsync();

    const writes = setDocPayloads().filter((w) => w.path === TOKEN_DOC_PATH);
    expect(writes).toHaveLength(1);
  });

  it('skips Firestore persistence when Firebase is not configured', async () => {
    mockFirebaseFlags.configured = false;
    await bootProcess();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe('registration waits for auth', () => {
  it('defers until anonymous sign-in completes, then registers and detaches', async () => {
    mockAuthState.currentUser = null;
    await bootProcess();

    // No uid yet: nothing written, one auth listener parked.
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockAuthListeners).toHaveLength(1);

    // Sign-in completes.
    mockAuthListeners[0]({ uid: 'late-user' });
    await flushAsync();

    const writes = setDocPayloads().filter(
      (w) => w.path === 'users/late-user/pushToken/current',
    );
    expect(writes).toHaveLength(1);
    expect(writes[0].data.token).toBe('ExponentPushToken[test]');
    // One-shot: the listener unsubscribed itself after registering.
    expect(mockAuthListeners).toHaveLength(0);
  });

  it('honors a toggle-off that happened while waiting for auth', async () => {
    mockAuthState.currentUser = null;
    await bootProcess();
    expect(mockAuthListeners).toHaveLength(1);

    // Player opens Settings and turns notifications off before sign-in lands.
    mockStorage[SETTINGS_KEY] = JSON.stringify({ notificationsEnabled: false });
    mockAuthListeners[0]({ uid: 'late-user' });
    await flushAsync();

    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe('settings toggle paths', () => {
  it('toggle-off deletes users/{uid}/pushToken/current so server pushes stop', async () => {
    const mod = await bootProcess();
    mockDeleteDoc.mockClear();

    await mod.notificationManager.deletePushToken('user-1');

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    const ref = mockDeleteDoc.mock.calls[0][0] as { __path: string };
    expect(ref.__path).toBe(TOKEN_DOC_PATH);
  });

  it('toggle-on re-registers via registerForRemotePush with both field names', async () => {
    // Simulate the SettingsContext false→true transition call.
    mockStorage[SETTINGS_KEY] = JSON.stringify({ notificationsEnabled: false });
    const mod = await bootProcess();
    expect(mockSetDoc).not.toHaveBeenCalled();

    mockStorage[SETTINGS_KEY] = JSON.stringify({ notificationsEnabled: true });
    await mod.notificationManager.registerForRemotePush('user-1');

    const writes = setDocPayloads().filter((w) => w.path === TOKEN_DOC_PATH);
    expect(writes).toHaveLength(1);
    expect(writes[0].data.token).toBe('ExponentPushToken[test]');
    expect(writes[0].data.expoToken).toBe('ExponentPushToken[test]');
  });
});

describe('isPushRegistrationEnabled', () => {
  it('defaults to true with no stored settings', async () => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../notifications') as NotificationsModule;
    await expect(mod.isPushRegistrationEnabled()).resolves.toBe(true);
  });

  it('is false only for an explicit notificationsEnabled: false', async () => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../notifications') as NotificationsModule;

    mockStorage[SETTINGS_KEY] = JSON.stringify({ notificationsEnabled: false });
    await expect(mod.isPushRegistrationEnabled()).resolves.toBe(false);

    mockStorage[SETTINGS_KEY] = JSON.stringify({ sfxVolume: 0.5 });
    await expect(mod.isPushRegistrationEnabled()).resolves.toBe(true);
  });
});
