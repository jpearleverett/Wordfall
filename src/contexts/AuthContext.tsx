import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

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
          console.warn('Anonymous auth failed:', e);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOutUser = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.warn('Sign out failed:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAnonymous: user?.isAnonymous ?? true,
        signOut: signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
