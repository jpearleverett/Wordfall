import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from 'react';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { crashReporter } from '../services/crashReporting';
import {
  getLinkedGoogleEmail,
  isGoogleSignInAvailable,
  linkAnonymousToGoogle,
  signOutGoogle,
  type GoogleLinkResult,
} from '../services/googleAuth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
  /** Email of the linked Google account, or `null` if the user is anonymous / unlinked. */
  linkedEmail: string | null;
  /** True when Google Sign-In is available (native module loaded + web client ID set). */
  canLinkGoogle: boolean;
  /** Launch the Google Sign-In → `linkWithCredential` flow. */
  linkGoogle: () => Promise<GoogleLinkResult>;
  /** Sign out of Firebase + Google. A fresh anonymous session is created immediately afterwards. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAnonymous: true,
  linkedEmail: null,
  canLinkGoogle: false,
  linkGoogle: async () => ({ ok: false, error: 'Auth not initialised' }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Skip Firebase auth when using placeholder keys
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        // Auto sign in anonymously
        try {
          await signInAnonymously(auth);
        } catch (e) {
          if (__DEV__) console.warn('Anonymous auth failed:', e);
          crashReporter.captureException(
            e instanceof Error ? e : new Error(String(e)),
            { tags: { operation: 'signInAnonymously' } },
          );
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const linkGoogle = useCallback(async (): Promise<GoogleLinkResult> => {
    const result = await linkAnonymousToGoogle();
    if (result.ok) {
      // Force an immediate user refresh so `linkedEmail` / `isAnonymous`
      // propagate before the next auth-state tick.
      setUser(result.user);
    }
    return result;
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await signOutGoogle();
    } catch (e) {
      if (__DEV__) console.warn('Sign out failed:', e);
      crashReporter.captureException(
        e instanceof Error ? e : new Error(String(e)),
        { tags: { operation: 'signOut' } },
      );
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAnonymous: user?.isAnonymous ?? true,
      linkedEmail: getLinkedGoogleEmail(user),
      canLinkGoogle: isGoogleSignInAvailable(),
      linkGoogle,
      signOut: signOutUser,
    }),
    [user, loading, linkGoogle, signOutUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
