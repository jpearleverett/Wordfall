import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { LIVES } from '../constants';

interface Economy {
  coins: number;
  gems: number;
  hintTokens: number;
  eventStars: number;
  libraryPoints: number;
}

interface TotalEarned {
  coins: number;
  gems: number;
  hintTokens: number;
  eventStars: number;
  libraryPoints: number;
}

interface PurchaseRecord {
  id: string;
  item: string;
  currency: string;
  amount: number;
  timestamp: number;
}

interface LivesData {
  current: number;
  lastRefillTime: number;
}

interface EconomyState extends Economy {
  totalEarned: TotalEarned;
  purchaseHistory: PurchaseRecord[];
  lives: LivesData;
}

interface EconomyContextType extends Economy {
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  addHintTokens: (amount: number) => void;
  spendHintToken: () => boolean;
  addEventStars: (amount: number) => void;
  addLibraryPoints: (amount: number) => void;
  canAfford: (currency: 'coins' | 'gems', amount: number) => boolean;
  totalEarned: TotalEarned;
  purchaseHistory: PurchaseRecord[];
  loaded: boolean;
  // Lives system
  lives: number;
  maxLives: number;
  nextLifeTime: number | null;
  spendLife: () => boolean;
  refillLives: () => boolean;
  getTimeUntilNextLife: () => number;
}

const STORAGE_KEY = '@wordfall_economy';

const DEFAULT_ECONOMY: EconomyState = {
  coins: 500,
  gems: 10,
  hintTokens: 0,
  eventStars: 0,
  libraryPoints: 0,
  totalEarned: {
    coins: 500,
    gems: 10,
    hintTokens: 0,
    eventStars: 0,
    libraryPoints: 0,
  },
  purchaseHistory: [],
  lives: {
    current: LIVES.max,
    lastRefillTime: Date.now(),
  },
};

/** Calculate how many lives should have refilled since lastRefillTime. */
function computeRefilledLives(livesData: LivesData): LivesData {
  const now = Date.now();
  const elapsed = now - livesData.lastRefillTime;
  const refillMs = LIVES.refillMinutes * 60 * 1000;
  const livesEarned = Math.floor(elapsed / refillMs);

  if (livesEarned <= 0 || livesData.current >= LIVES.max) {
    return livesData;
  }

  const newCurrent = Math.min(livesData.current + livesEarned, LIVES.max);
  const newLastRefill =
    newCurrent >= LIVES.max
      ? now
      : livesData.lastRefillTime + livesEarned * refillMs;

  return { current: newCurrent, lastRefillTime: newLastRefill };
}

const EconomyContext = createContext<EconomyContextType>({
  ...DEFAULT_ECONOMY,
  addCoins: () => {},
  spendCoins: () => false,
  addGems: () => {},
  spendGems: () => false,
  addHintTokens: () => {},
  spendHintToken: () => false,
  addEventStars: () => {},
  addLibraryPoints: () => {},
  canAfford: () => false,
  loaded: false,
  lives: LIVES.max,
  maxLives: LIVES.max,
  nextLifeTime: null,
  spendLife: () => false,
  refillLives: () => false,
  getTimeUntilNextLife: () => 0,
});

export function EconomyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<EconomyState>(DEFAULT_ECONOMY);
  const [loaded, setLoaded] = useState(false);

  // Load from AsyncStorage on mount, computing refilled lives
  useEffect(() => {
    const loadEconomy = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<EconomyState>;
          // Compute refilled lives since last session
          if (parsed.lives) {
            parsed.lives = computeRefilledLives(parsed.lives);
          }
          setState((prev) => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.warn('Failed to load economy from AsyncStorage:', e);
      }
      setLoaded(true);
    };
    loadEconomy();
  }, []);

  // Periodically recalculate lives (every 60 seconds)
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      setState((prev) => {
        const updated = computeRefilledLives(prev.lives);
        if (updated.current === prev.lives.current) return prev;
        return { ...prev, lives: updated };
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, [loaded]);

  // Sync with Firestore when user is available
  useEffect(() => {
    if (!user || !loaded) return;

    const syncFromFirestore = async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'economy', 'current');
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const firestoreData = snapshot.data() as Partial<EconomyState>;
          setState((prev) => ({ ...prev, ...firestoreData }));
        }
      } catch (e) {
        console.warn('Firestore economy sync failed, using local data:', e);
      }
    };

    syncFromFirestore();
  }, [user, loaded]);

  // Persist whenever state changes
  useEffect(() => {
    if (!loaded) return;

    const persist = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to save economy to AsyncStorage:', e);
      }

      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid, 'economy', 'current');
          await setDoc(docRef, state, { merge: true });
        } catch (e) {
          console.warn('Failed to sync economy to Firestore:', e);
        }
      }
    };

    persist();
  }, [state, loaded, user]);

  const addCoins = useCallback((amount: number) => {
    setState((prev) => ({
      ...prev,
      coins: prev.coins + amount,
      totalEarned: {
        ...prev.totalEarned,
        coins: prev.totalEarned.coins + amount,
      },
    }));
  }, []);

  const spendCoins = useCallback((amount: number): boolean => {
    let success = false;
    setState((prev) => {
      if (prev.coins >= amount) {
        success = true;
        return { ...prev, coins: prev.coins - amount };
      }
      return prev;
    });
    return success;
  }, []);

  const addGems = useCallback((amount: number) => {
    setState((prev) => ({
      ...prev,
      gems: prev.gems + amount,
      totalEarned: {
        ...prev.totalEarned,
        gems: prev.totalEarned.gems + amount,
      },
    }));
  }, []);

  const spendGems = useCallback((amount: number): boolean => {
    let success = false;
    setState((prev) => {
      if (prev.gems >= amount) {
        success = true;
        return { ...prev, gems: prev.gems - amount };
      }
      return prev;
    });
    return success;
  }, []);

  const addHintTokens = useCallback((amount: number) => {
    setState((prev) => ({
      ...prev,
      hintTokens: prev.hintTokens + amount,
      totalEarned: {
        ...prev.totalEarned,
        hintTokens: prev.totalEarned.hintTokens + amount,
      },
    }));
  }, []);

  const spendHintToken = useCallback((): boolean => {
    let success = false;
    setState((prev) => {
      if (prev.hintTokens > 0) {
        success = true;
        return { ...prev, hintTokens: prev.hintTokens - 1 };
      }
      return prev;
    });
    return success;
  }, []);

  const addEventStars = useCallback((amount: number) => {
    setState((prev) => ({
      ...prev,
      eventStars: prev.eventStars + amount,
      totalEarned: {
        ...prev.totalEarned,
        eventStars: prev.totalEarned.eventStars + amount,
      },
    }));
  }, []);

  const addLibraryPoints = useCallback((amount: number) => {
    setState((prev) => ({
      ...prev,
      libraryPoints: prev.libraryPoints + amount,
      totalEarned: {
        ...prev.totalEarned,
        libraryPoints: prev.totalEarned.libraryPoints + amount,
      },
    }));
  }, []);

  const canAfford = useCallback(
    (currency: 'coins' | 'gems', amount: number): boolean => {
      return state[currency] >= amount;
    },
    [state],
  );

  // ── Lives ──────────────────────────────────────────────────────────────────

  const spendLife = useCallback((): boolean => {
    let success = false;
    setState((prev) => {
      const updated = computeRefilledLives(prev.lives);
      if (updated.current <= 0) return prev;
      success = true;
      return {
        ...prev,
        lives: {
          current: updated.current - 1,
          lastRefillTime: updated.current >= LIVES.max ? Date.now() : updated.lastRefillTime,
        },
      };
    });
    return success;
  }, []);

  const refillLives = useCallback((): boolean => {
    let success = false;
    setState((prev) => {
      if (prev.gems < LIVES.gemRefillCost) return prev;
      success = true;
      return {
        ...prev,
        gems: prev.gems - LIVES.gemRefillCost,
        lives: {
          current: LIVES.max,
          lastRefillTime: Date.now(),
        },
      };
    });
    return success;
  }, []);

  const getTimeUntilNextLife = useCallback((): number => {
    const livesNow = computeRefilledLives(state.lives);
    if (livesNow.current >= LIVES.max) return 0;
    const refillMs = LIVES.refillMinutes * 60 * 1000;
    const elapsed = Date.now() - livesNow.lastRefillTime;
    const remaining = refillMs - (elapsed % refillMs);
    return Math.max(0, remaining);
  }, [state.lives]);

  const currentLives = computeRefilledLives(state.lives).current;
  const nextLifeTime = currentLives < LIVES.max
    ? state.lives.lastRefillTime + LIVES.refillMinutes * 60 * 1000
    : null;

  return (
    <EconomyContext.Provider
      value={{
        coins: state.coins,
        gems: state.gems,
        hintTokens: state.hintTokens,
        eventStars: state.eventStars,
        libraryPoints: state.libraryPoints,
        totalEarned: state.totalEarned,
        purchaseHistory: state.purchaseHistory,
        addCoins,
        spendCoins,
        addGems,
        spendGems,
        addHintTokens,
        spendHintToken,
        addEventStars,
        addLibraryPoints,
        canAfford,
        loaded,
        lives: currentLives,
        maxLives: LIVES.max,
        nextLifeTime,
        spendLife,
        refillLives,
        getTimeUntilNextLife,
      }}
    >
      {children}
    </EconomyContext.Provider>
  );
}

export const useEconomy = () => useContext(EconomyContext);
