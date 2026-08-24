import { GoogleAuthProvider, linkWithCredential, signInWithCredential, unlink, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db, isFirebaseConfigured } from '../config/firebase';
import { crashReporter } from './crashReporting';

/**
 * Google Sign-In + Firebase link flow.
 *
 * Native module (`@react-native-google-signin/google-signin`) is loaded lazily
 * so dev builds without the native binding installed do not crash at import.
 * A proper EAS APK rebuild is required before the real linking flow works on
 * device — until then, {@link isGoogleSignInAvailable} returns `false` and the
 * Settings UI surfaces a "rebuild required" hint.
 *
 * Link model: the user is anonymous by default. When they tap "Link Google
 * Account" we call `linkWithCredential(currentUser, googleCredential)` which
 * upgrades the same UID to a permanent Google identity — preserving all paid
 * progression (`adsRemoved`, VIP subscription, cosmetics). Without this, a
 * wiped device = lost paid progression = refund risk.
 *
 * Required external setup (tracked in `agent_docs/setup.md`):
 *   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` env var (OAuth 2.0 Web Client ID from
 *     Google Cloud Console → Credentials, matching the Firebase project).
 *   - Play Console App-signing SHA-1 registered on the Firebase project's
 *     Android app record.
 *   - "Google" provider enabled in Firebase → Authentication → Sign-in method.
 *   - `@react-native-google-signin/google-signin` installed via EAS build.
 */

type GoogleSignInUser = {
  idToken: string | null;
  user: { email?: string | null; name?: string | null };
};

type GoogleSignInModule = {
  configure: (opts: { webClientId: string; offlineAccess?: boolean }) => void;
  hasPlayServices: (opts?: { showPlayServicesUpdateDialog?: boolean }) => Promise<boolean>;
  signIn: () => Promise<GoogleSignInUser>;
  signOut: () => Promise<void>;
  isSignedIn?: () => Promise<boolean>;
};

let cachedModule: GoogleSignInModule | null = null;
let cachedLoadAttempted = false;
let cachedConfigured = false;

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

function loadNativeModule(): GoogleSignInModule | null {
  if (cachedLoadAttempted) return cachedModule;
  cachedLoadAttempted = true;
  try {
    // Lazy require — dev builds without the native module installed do not
    // crash at app startup.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-google-signin/google-signin');
    cachedModule = (mod?.GoogleSignin ?? mod?.default?.GoogleSignin ?? null) as GoogleSignInModule | null;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

function ensureConfigured(): GoogleSignInModule | null {
  const mod = loadNativeModule();
  if (!mod) return null;
  if (!WEB_CLIENT_ID) return null;
  if (!cachedConfigured) {
    try {
      mod.configure({ webClientId: WEB_CLIENT_ID, offlineAccess: false });
      cachedConfigured = true;
    } catch (e) {
      crashReporter.captureException(
        e instanceof Error ? e : new Error(String(e)),
        { tags: { operation: 'googleSignIn.configure' } },
      );
      return null;
    }
  }
  return mod;
}

/**
 * True only when the native module is present, configured, and Firebase is
 * wired. Settings UI should hide or disable the "Link Google Account" row when
 * this is false.
 */
export function isGoogleSignInAvailable(): boolean {
  if (!isFirebaseConfigured) return false;
  if (!WEB_CLIENT_ID) return false;
  return loadNativeModule() !== null;
}

export type GoogleLinkResult =
  | { ok: true; user: User; email: string | null }
  | { ok: false; error: string; code?: string };

// Local persistence keys the recovery path adopts cloud data into. MUST
// stay in sync with PlayerContext / EconomyContext STORAGE_KEY.
const PLAYER_STORAGE_KEY = '@wordfall_player';
const ECONOMY_STORAGE_KEY = '@wordfall_economy';

// Held between a CREDENTIAL_IN_USE result and the caller's confirmed
// recoverExistingGoogleAccount() call. Google ID tokens are short-lived,
// so this never outlives the sign-in interaction it belongs to.
let pendingRecoveryIdToken: string | null = null;

/**
 * Link the currently-signed-in anonymous Firebase user to a Google account.
 * On success the UID is preserved and `user.isAnonymous` becomes `false`.
 *
 * If the Google credential is already linked to a DIFFERENT Firebase user
 * (e.g. the player previously linked on another device), this returns
 * `code: 'CREDENTIAL_IN_USE'` WITHOUT signing in. The caller must warn the
 * player (local anonymous progress on this device will be abandoned) and
 * then call {@link recoverExistingGoogleAccount}, which signs into the
 * existing account and ADOPTS its cloud data. Signing in directly here was
 * a data destroyer: the live Player/Economy providers keep their one-shot
 * cloud hydration latched across a uid swap, so their debounced writers
 * pushed this device's anonymous data over the existing account's cloud
 * save within seconds — freshly stamped, unrecoverable from any device.
 */
export async function linkAnonymousToGoogle(): Promise<GoogleLinkResult> {
  if (!isFirebaseConfigured) {
    return { ok: false, error: 'Sign-in is unavailable — Firebase is not configured.' };
  }
  const mod = ensureConfigured();
  if (!mod) {
    return {
      ok: false,
      error: 'Google Sign-In is not available in this build. Please update the app.',
      code: 'NATIVE_MODULE_MISSING',
    };
  }
  try {
    await mod.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await mod.signIn();
    const idToken = result?.idToken ?? null;
    if (!idToken) {
      return { ok: false, error: 'Google Sign-In did not return an ID token.' };
    }
    const credential = GoogleAuthProvider.credential(idToken);
    const currentUser = auth.currentUser;
    try {
      if (currentUser && currentUser.isAnonymous) {
        const linked = await linkWithCredential(currentUser, credential);
        return { ok: true, user: linked.user, email: linked.user.email ?? null };
      }
      if (currentUser && !currentUser.isAnonymous) {
        return { ok: false, error: 'This device is already signed in to a permanent account.' };
      }
      const signedIn = await signInWithCredential(auth, credential);
      return { ok: true, user: signedIn.user, email: signedIn.user.email ?? null };
    } catch (linkErr: unknown) {
      const err = linkErr as { code?: string };
      if (err?.code === 'auth/credential-already-in-use') {
        // The Google account is already bound to another Firebase user —
        // typically the same player from a previous device. Do NOT sign in
        // here: surface the conflict so the caller can confirm, then run
        // recoverExistingGoogleAccount() to adopt that account's cloud data
        // instead of overwriting it (see the doc comment above).
        pendingRecoveryIdToken = idToken;
        return {
          ok: false,
          code: 'CREDENTIAL_IN_USE',
          error: 'This Google account already has a Wordfall profile in the cloud.',
        };
      }
      throw linkErr;
    }
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code === 'SIGN_IN_CANCELLED' || err?.code === '-5') {
      return { ok: false, error: 'Sign-in cancelled.', code: 'CANCELLED' };
    }
    crashReporter.captureException(
      e instanceof Error ? e : new Error(String(e)),
      { tags: { operation: 'googleSignIn.link' } },
    );
    return {
      ok: false,
      error: err?.message ?? 'Could not complete Google Sign-In. Please try again.',
      code: err?.code,
    };
  }
}

/**
 * Complete a CREDENTIAL_IN_USE recovery after the caller has warned the
 * player: sign into the EXISTING Firebase account the Google credential is
 * bound to, then ADOPT that account's cloud data on this device.
 *
 * Adoption mechanics: the account's player + economy docs are fetched the
 * moment auth lands (before the live providers' debounced writers can push
 * this device's anonymous data over them), written into the local
 * AsyncStorage blobs with a fresh lastModified stamp, and the JS runtime is
 * reloaded so every provider re-hydrates from them. The fresh stamp makes
 * the adopted blob win the post-reload lastModified reconciliation, which
 * also heals any write that raced in before the reload. When the build
 * cannot reload (no expo-updates), the adoption is rolled back and auth is
 * signed out — with auth cleared, firestore.rules refuse the anonymous
 * data pushes — so the existing account's cloud save is never destroyed.
 */
export async function recoverExistingGoogleAccount(): Promise<GoogleLinkResult> {
  if (!isFirebaseConfigured) {
    return { ok: false, error: 'Sign-in is unavailable — Firebase is not configured.' };
  }
  const idToken = pendingRecoveryIdToken;
  if (!idToken) {
    return { ok: false, error: 'No account recovery is pending. Please try signing in again.' };
  }
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const signedIn = await signInWithCredential(auth, credential);
    const uid = signedIn.user.uid;

    const [playerSnap, economySnap] = await Promise.all([
      getDoc(doc(db, 'users', uid, 'data', 'player')),
      getDoc(doc(db, 'users', uid, 'economy', 'current')),
    ]);

    const adoptions: Array<[string, string]> = [];
    if (playerSnap.exists()) {
      adoptions.push([
        PLAYER_STORAGE_KEY,
        JSON.stringify({ ...playerSnap.data(), lastModified: Date.now() }),
      ]);
    }
    if (economySnap.exists()) {
      adoptions.push([
        ECONOMY_STORAGE_KEY,
        JSON.stringify({ ...economySnap.data(), lastModified: Date.now() }),
      ]);
    }

    if (adoptions.length === 0) {
      // The account exists but has no cloud save — nothing to clobber, and
      // this device's progress becomes its save. Safe to stay signed in.
      pendingRecoveryIdToken = null;
      return { ok: true, user: signedIn.user, email: signedIn.user.email ?? null };
    }

    // Snapshot the current local blobs so the no-reload path can roll the
    // adoption back instead of leaving mixed state behind.
    const priorLocal = await Promise.all(
      adoptions.map(async ([key]) => [key, await AsyncStorage.getItem(key)] as const),
    );
    for (const [key, value] of adoptions) {
      await AsyncStorage.setItem(key, value);
    }

    try {
      // Reload so providers re-hydrate from the adopted blobs (same lazy
      // require pattern as ErrorBoundary — dev builds lack the module).
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Updates = require('expo-updates');
      await Updates.reloadAsync();
      pendingRecoveryIdToken = null;
      return { ok: true, user: signedIn.user, email: signedIn.user.email ?? null };
    } catch {
      // No reload available: the running providers still hold the anonymous
      // data and WILL push it over the recovered account within seconds.
      // Roll back and sign out rather than destroy the cloud save.
      for (const [key, value] of priorLocal) {
        if (value === null) await AsyncStorage.removeItem(key).catch(() => undefined);
        else await AsyncStorage.setItem(key, value).catch(() => undefined);
      }
      await auth.signOut().catch(() => undefined);
      return {
        ok: false,
        code: 'RESTART_REQUIRED',
        error:
          'This version of Wordfall cannot switch accounts in place. Your cloud progress is safe — please update the app and try again.',
      };
    }
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    crashReporter.captureException(
      e instanceof Error ? e : new Error(String(e)),
      { tags: { operation: 'googleSignIn.recover' } },
    );
    // If auth landed but the cloud fetch failed, staying signed in would
    // clobber the account — sign out to protect it before reporting.
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      await auth.signOut().catch(() => undefined);
    }
    return {
      ok: false,
      error:
        err?.message ??
        'Could not download your cloud save. Check your connection and try again.',
      code: err?.code,
    };
  }
}

/**
 * Sign out of both Firebase and Google on the device. Firebase's next
 * `onAuthStateChanged` tick will auto re-create an anonymous session via
 * AuthContext, so the player keeps local progression but loses cloud sync
 * until they link again.
 */
export async function signOutGoogle(): Promise<void> {
  const mod = loadNativeModule();
  if (mod) {
    try {
      await mod.signOut();
    } catch {
      // non-fatal — Firebase sign-out below is what matters for auth state
    }
  }
  try {
    await auth.signOut();
  } catch (e) {
    crashReporter.captureException(
      e instanceof Error ? e : new Error(String(e)),
      { tags: { operation: 'googleSignIn.signOut' } },
    );
  }
}

/**
 * Unlink the Google provider from the current Firebase user. Leaves the UID
 * intact but converts the user back to anonymous (if that was the only
 * provider). Rarely needed in normal flows — mostly for "unlink and re-link a
 * different Google account" support cases.
 */
export async function unlinkGoogleFromCurrentUser(): Promise<{ ok: boolean; error?: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser) return { ok: false, error: 'No signed-in user.' };
  try {
    await unlink(currentUser, GoogleAuthProvider.PROVIDER_ID);
    return { ok: true };
  } catch (e) {
    crashReporter.captureException(
      e instanceof Error ? e : new Error(String(e)),
      { tags: { operation: 'googleSignIn.unlink' } },
    );
    return { ok: false, error: e instanceof Error ? e.message : 'Could not unlink Google account.' };
  }
}

/** Returns the linked Google email (if any) for the current Firebase user. */
export function getLinkedGoogleEmail(user: User | null): string | null {
  if (!user) return null;
  const googleProvider = user.providerData.find((p) => p.providerId === 'google.com');
  return googleProvider?.email ?? null;
}
