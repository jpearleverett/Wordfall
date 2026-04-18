import { GoogleAuthProvider, linkWithCredential, signInWithCredential, unlink, User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';
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

/**
 * Link the currently-signed-in anonymous Firebase user to a Google account.
 * On success the UID is preserved and `user.isAnonymous` becomes `false`.
 *
 * If the Google credential is already linked to a DIFFERENT Firebase user
 * (e.g. the player previously linked on another device), we fall back to
 * `signInWithCredential` so the player recovers their existing progression
 * instead of being locked out. The caller should warn that local anonymous
 * progress on the current device will be abandoned in that case.
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
        // typically the same player from a previous device. Recover them.
        const signedIn = await signInWithCredential(auth, credential);
        return { ok: true, user: signedIn.user, email: signedIn.user.email ?? null };
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
