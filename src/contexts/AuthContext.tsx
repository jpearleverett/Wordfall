import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from 'react';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { crashReporter } from '../services/crashReporting';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAnonymous: true,
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

  const signOutUser = useCallback(async () => {
    try {
      await auth.signOut();
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
      signOut: signOutUser,
    }),
    [user, loading, signOutUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
