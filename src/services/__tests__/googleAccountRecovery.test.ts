/**
 * Google link/recovery contract.
 *
 * Regression pinned here: `auth/credential-already-in-use` used to call
 * `signInWithCredential` inline and report success. The live Player /
 * Economy providers latch their one-shot cloud hydration for the session,
 * so nothing ever fetched the recovered account's docs while their
 * debounced writers pushed THIS device's anonymous data over that
 * account's cloud save within seconds — freshly stamped, unrecoverable.
 *
 * The contract now: the link call reports CREDENTIAL_IN_USE without
 * touching auth; the caller confirms; `recoverExistingGoogleAccount()`
 * signs in, ADOPTS the account's cloud docs into the local blobs, and
 * reloads. When it cannot reload, it rolls the adoption back and signs
 * out rather than let the anonymous data reach the cloud.
 */

const mockLinkWithCredential = jest.fn();
const mockSignInWithCredential = jest.fn();
const mockAuthSignOut = jest.fn(async () => undefined);
const mockGetDoc = jest.fn();
const mockReloadAsync = jest.fn(async () => undefined);
const mockGoogleSignIn = jest.fn(async () => ({
  idToken: 'id-token-1',
  user: { email: 'player@example.com' },
}));

const mockAuth: { currentUser: unknown; signOut: () => Promise<void> } = {
  currentUser: { uid: 'uid_A', isAnonymous: true },
  signOut: () => mockAuthSignOut(),
};

jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: {
    credential: (token: string) => ({ token }),
    PROVIDER_ID: 'google.com',
  },
  linkWithCredential: (...args: unknown[]) => mockLinkWithCredential(...args),
  signInWithCredential: (...args: unknown[]) => mockSignInWithCredential(...args),
  unlink: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => segments.join('/'),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
}));

jest.mock('../../config/firebase', () => ({
  auth: mockAuth,
  db: {},
  isFirebaseConfigured: true,
}));

jest.mock('../crashReporting', () => ({
  crashReporter: { captureException: jest.fn(), addBreadcrumb: jest.fn() },
}));

jest.mock(
  '@react-native-google-signin/google-signin',
  () => ({
    GoogleSignin: {
      configure: jest.fn(),
      hasPlayServices: jest.fn(async () => true),
      signIn: () => mockGoogleSignIn(),
      signOut: jest.fn(async () => undefined),
    },
  }),
  { virtual: true },
);

jest.mock('expo-updates', () => ({ reloadAsync: () => mockReloadAsync() }), {
  virtual: true,
});

import AsyncStorage from '@react-native-async-storage/async-storage';

let googleAuth: typeof import('../googleAuth');

const PLAYER_KEY = '@wordfall_player';
const ECONOMY_KEY = '@wordfall_economy';

const snapshot = (data: Record<string, unknown> | null) => ({
  exists: () => data !== null,
  data: () => data,
});

beforeAll(() => {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  googleAuth = require('../googleAuth');
});

beforeEach(async () => {
  jest.clearAllMocks();
  mockAuth.currentUser = { uid: 'uid_A', isAnonymous: true };
  mockGoogleSignIn.mockResolvedValue({
    idToken: 'id-token-1',
    user: { email: 'player@example.com' },
  });
  mockReloadAsync.mockResolvedValue(undefined);
  await AsyncStorage.clear();
  // This device's anonymous progress: level 3.
  await AsyncStorage.setItem(
    PLAYER_KEY,
    JSON.stringify({ currentLevel: 3, puzzlesSolved: 2, lastModified: 1000 }),
  );
  await AsyncStorage.setItem(
    ECONOMY_KEY,
    JSON.stringify({ coins: 50, gems: 0, lastModified: 1000 }),
  );
});

/** Drive the link call into its credential-already-in-use branch. */
async function linkIntoConflict() {
  mockLinkWithCredential.mockRejectedValueOnce({ code: 'auth/credential-already-in-use' });
  return googleAuth.linkAnonymousToGoogle();
}

describe('linkAnonymousToGoogle — credential already in use', () => {
  it('reports the conflict WITHOUT signing into the existing account', async () => {
    const result = await linkIntoConflict();
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.code).toBe('CREDENTIAL_IN_USE');
    // The destroyer: signing in here swaps the uid under latched providers.
    expect(mockSignInWithCredential).not.toHaveBeenCalled();
  });
});

describe('recoverExistingGoogleAccount', () => {
  it('adopts the existing account\'s cloud save locally, then reloads', async () => {
    await linkIntoConflict();
    mockSignInWithCredential.mockResolvedValueOnce({
      user: { uid: 'uid_B', email: 'player@example.com', isAnonymous: false },
    });
    mockGetDoc.mockImplementation(async (path: string) =>
      path.endsWith('data/player')
        ? snapshot({ currentLevel: 300, puzzlesSolved: 412, lastModified: 500 })
        : snapshot({ coins: 9000, gems: 250, lastModified: 500 }),
    );

    const result = await googleAuth.recoverExistingGoogleAccount();

    expect(result.ok).toBe(true);
    // Cloud data landed locally (level 300 beat this device's level 3)…
    const player = JSON.parse((await AsyncStorage.getItem(PLAYER_KEY)) ?? '{}');
    expect(player.currentLevel).toBe(300);
    expect(player.lastModified).toBeGreaterThan(500);
    const economy = JSON.parse((await AsyncStorage.getItem(ECONOMY_KEY)) ?? '{}');
    expect(economy.coins).toBe(9000);
    // …and the runtime reloads so the providers re-hydrate from it.
    expect(mockReloadAsync).toHaveBeenCalled();
    expect(mockAuthSignOut).not.toHaveBeenCalled();
  });

  it('rolls back and signs out when the runtime cannot reload', async () => {
    await linkIntoConflict();
    mockSignInWithCredential.mockResolvedValueOnce({
      user: { uid: 'uid_B', email: 'player@example.com', isAnonymous: false },
    });
    mockAuth.currentUser = { uid: 'uid_B', isAnonymous: false };
    mockGetDoc.mockImplementation(async (path: string) =>
      path.endsWith('data/player')
        ? snapshot({ currentLevel: 300, puzzlesSolved: 412, lastModified: 500 })
        : snapshot({ coins: 9000, gems: 250, lastModified: 500 }),
    );
    mockReloadAsync.mockRejectedValueOnce(new Error('no expo-updates'));

    const result = await googleAuth.recoverExistingGoogleAccount();

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.code).toBe('RESTART_REQUIRED');
    // Local blobs restored — no mixed state left behind…
    const player = JSON.parse((await AsyncStorage.getItem(PLAYER_KEY)) ?? '{}');
    expect(player.currentLevel).toBe(3);
    // …and auth is cleared so the anonymous data can never reach uid_B.
    expect(mockAuthSignOut).toHaveBeenCalled();
  });

  it('signs out when the cloud fetch fails instead of leaving the account exposed', async () => {
    await linkIntoConflict();
    mockSignInWithCredential.mockResolvedValueOnce({
      user: { uid: 'uid_B', email: 'player@example.com', isAnonymous: false },
    });
    mockAuth.currentUser = { uid: 'uid_B', isAnonymous: false };
    mockGetDoc.mockRejectedValue(new Error('offline'));

    const result = await googleAuth.recoverExistingGoogleAccount();

    expect(result.ok).toBe(false);
    expect(mockAuthSignOut).toHaveBeenCalled();
    const player = JSON.parse((await AsyncStorage.getItem(PLAYER_KEY)) ?? '{}');
    expect(player.currentLevel).toBe(3);
  });

  it('refuses when no conflict is pending', async () => {
    // Fresh module instance so no earlier test's pending conflict leaks in.
    let fresh!: typeof import('../googleAuth');
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      fresh = require('../googleAuth');
    });
    const result = await fresh.recoverExistingGoogleAccount();
    expect(result.ok).toBe(false);
    expect(mockSignInWithCredential).not.toHaveBeenCalled();
  });
});
