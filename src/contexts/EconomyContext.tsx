import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { LIVES } from '../constants';
import { AdRewardType, AD_REWARD_VALUES } from '../services/ads';
import { getProductById, ProductRewards } from '../data/shopProducts';

interface Economy {
  coins: number;
  gems: number;
  hintTokens: number;
  eventStars: number;
  libraryPoints: number;
  /** Persistent booster token counts */
  boosterTokens: { wildcardTile: number; spotlight: number; smartShuffle: number };
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

interface IAPState {
  /** Whether the user has purchased ad removal */
  isAdFreeFlag: boolean;
  /** Whether the user has purchased the premium pass */
  isPremiumPassFlag: boolean;
  /** Daily value pack expiry timestamp (0 = not active) */
  dailyValuePackExpiry: number;
  /** Last date daily value pack drip was claimed (YYYY-MM-DD) */
  dailyValuePackLastClaim: string;
  /** Starter pack available until this timestamp (0 = expired/not tracked) */
  starterPackExpiresAt: number;
  /** Undo tokens (separate from hint tokens) */
  undoTokens: number;
  /** Whether the user has an active VIP weekly subscription */
  isVipSubscriber: boolean;
  /** VIP subscription expiry timestamp (0 = not active) */
  vipExpiresAt: number;
  /** Last date VIP daily rewards were claimed (YYYY-MM-DD) */
  vipDailyLastClaim: string;
}

interface EconomyState extends Economy, IAPState {
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
  // Ad reward processing
  processAdReward: (rewardType: AdRewardType) => void;
  isAdFree: boolean;
  // IAP
  processPurchase: (productId: string) => void;
  isPremiumPass: boolean;
  dailyValuePackExpiry: number;
  starterPackAvailable: boolean;
  undoTokens: number;
  addUndoTokens: (amount: number) => void;
  spendUndoToken: () => boolean;
  addBoosterToken: (type: 'wildcardTile' | 'spotlight' | 'smartShuffle', amount?: number) => void;
  spendBoosterToken: (type: 'wildcardTile' | 'spotlight' | 'smartShuffle') => boolean;
  claimDailyValuePackDrip: () => boolean;
  isVip: boolean;
  vipExpiresAt: number;
  claimVipDailyRewards: () => boolean;
  addLives: (count: number) => void;
}

const STORAGE_KEY = '@wordfall_economy';

/** 72 hours in milliseconds (starter pack availability window) */
const STARTER_PACK_WINDOW_MS = 72 * 60 * 60 * 1000;

const DEFAULT_ECONOMY: EconomyState = {
  coins: 500,
  gems: 10,
  hintTokens: 5,
  eventStars: 0,
  libraryPoints: 0,
  boosterTokens: { wildcardTile: 2, spotlight: 2, smartShuffle: 2 },
  totalEarned: {
    coins: 500,
    gems: 10,
    hintTokens: 5,
    eventStars: 0,
    libraryPoints: 0,
  },
  purchaseHistory: [],
  lives: {
    current: LIVES.max,
    lastRefillTime: Date.now(),
  },
  // IAP state
  isAdFreeFlag: false,
  isPremiumPassFlag: false,
  dailyValuePackExpiry: 0,
  dailyValuePackLastClaim: '',
  starterPackExpiresAt: Date.now() + STARTER_PACK_WINDOW_MS,
  undoTokens: 5,
  isVipSubscriber: false,
  vipExpiresAt: 0,
  vipDailyLastClaim: '',
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
  processAdReward: () => {},
  isAdFree: false,
  processPurchase: () => {},
  isPremiumPass: false,
  dailyValuePackExpiry: 0,
  starterPackAvailable: true,
  undoTokens: 0,
  addUndoTokens: () => {},
  spendUndoToken: () => false,
  addBoosterToken: () => {},
  spendBoosterToken: () => false,
  claimDailyValuePackDrip: () => false,
  isVip: false,
  vipExpiresAt: 0,
  claimVipDailyRewards: () => false,
  addLives: () => {},
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

  // ── Ad reward processing ─────────────────────────────────────────────────
  const processAdReward = useCallback((rewardType: AdRewardType) => {
    const def = AD_REWARD_VALUES[rewardType];
    if (!def) return;
    switch (def.currency) {
      case 'coins':
        addCoins(def.amount);
        break;
      case 'hintTokens':
        addHintTokens(def.amount);
        break;
      case 'spins':
        // Spins are handled by PlayerContext — caller should call player.updateMysteryWheel
        break;
      case 'double':
        // Double reward is a multiplier — caller handles the actual doubling
        break;
      default:
        console.warn('[Economy] Unknown ad reward currency:', def.currency);
    }
  }, [addCoins, addHintTokens]);

  // ── Undo tokens ────────────────────────────────────────────────────────────

  const addUndoTokens = useCallback((amount: number) => {
    setState((prev) => ({ ...prev, undoTokens: prev.undoTokens + amount }));
  }, []);

  const spendUndoToken = useCallback((): boolean => {
    let success = false;
    setState((prev) => {
      if (prev.undoTokens > 0) {
        success = true;
        return { ...prev, undoTokens: prev.undoTokens - 1 };
      }
      return prev;
    });
    return success;
  }, []);

  // ── Booster tokens ────────────────────────────────────────────────────────

  const addBoosterToken = useCallback((type: 'wildcardTile' | 'spotlight' | 'smartShuffle', amount = 1) => {
    setState((prev) => ({
      ...prev,
      boosterTokens: {
        ...prev.boosterTokens,
        [type]: (prev.boosterTokens?.[type] ?? 0) + amount,
      },
    }));
  }, []);

  const spendBoosterToken = useCallback((type: 'wildcardTile' | 'spotlight' | 'smartShuffle'): boolean => {
    let success = false;
    setState((prev) => {
      const current = prev.boosterTokens?.[type] ?? 0;
      if (current > 0) {
        success = true;
        return {
          ...prev,
          boosterTokens: { ...prev.boosterTokens, [type]: current - 1 },
        };
      }
      return prev;
    });
    return success;
  }, []);

  // ── IAP purchase processing ───────────────────────────────────────────────

  const processPurchase = useCallback((productId: string) => {
    const product = getProductById(productId);
    if (!product) {
      console.warn('[Economy] Unknown product for processPurchase:', productId);
      return;
    }

    const rewards = product.rewards;

    setState((prev) => {
      const next = { ...prev };

      // Award currencies
      if (rewards.coins) {
        next.coins += rewards.coins;
        next.totalEarned = { ...next.totalEarned, coins: next.totalEarned.coins + rewards.coins };
      }
      if (rewards.gems) {
        next.gems += rewards.gems;
        next.totalEarned = { ...next.totalEarned, gems: next.totalEarned.gems + rewards.gems };
      }
      if (rewards.hintTokens) {
        next.hintTokens += rewards.hintTokens;
        next.totalEarned = { ...next.totalEarned, hintTokens: next.totalEarned.hintTokens + rewards.hintTokens };
      }
      if (rewards.undoTokens) {
        next.undoTokens += rewards.undoTokens;
      }

      // Set flags (premiumPass, adsRemoved, vipSubscriber)
      if (rewards.flags) {
        if (rewards.flags.premiumPass) {
          next.isPremiumPassFlag = true;
        }
        if (rewards.flags.adsRemoved) {
          next.isAdFreeFlag = true;
        }
        if (rewards.flags.vipSubscriber) {
          next.isVipSubscriber = true;
          next.vipExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
          next.vipDailyLastClaim = ''; // reset so they can claim today
        }
      }

      // Daily value pack — set expiry
      if (rewards.dripDays) {
        next.dailyValuePackExpiry = Date.now() + rewards.dripDays * 24 * 60 * 60 * 1000;
        next.dailyValuePackLastClaim = ''; // reset so they can claim today
      }

      // Record purchase in history
      next.purchaseHistory = [
        ...next.purchaseHistory,
        {
          id: `iap_${productId}_${Date.now()}`,
          item: productId,
          currency: 'USD',
          amount: product.fallbackPriceAmount,
          timestamp: Date.now(),
        },
      ];

      return next;
    });

    // Note: decorations and boosters from rewards need to be handled by
    // the caller (e.g. PlayerContext) since EconomyContext doesn't manage those.
    console.log(`[Economy] Processed purchase: ${productId}`);
  }, []);

  /** Claim today's daily value pack drip rewards. Returns true if claimed. */
  const claimDailyValuePackDrip = useCallback((): boolean => {
    const today = new Date().toISOString().slice(0, 10);
    let claimed = false;

    setState((prev) => {
      // Not active or already claimed today
      if (prev.dailyValuePackExpiry <= Date.now()) return prev;
      if (prev.dailyValuePackLastClaim === today) return prev;

      // Find the daily value pack product for drip values
      const product = getProductById('daily_value_pack');
      const drip = product?.rewards.dailyDrip;
      if (!drip) return prev;

      claimed = true;
      const next = { ...prev, dailyValuePackLastClaim: today };

      if (drip.coins) {
        next.coins += drip.coins;
        next.totalEarned = { ...next.totalEarned, coins: next.totalEarned.coins + drip.coins };
      }
      if (drip.gems) {
        next.gems += drip.gems;
        next.totalEarned = { ...next.totalEarned, gems: next.totalEarned.gems + drip.gems };
      }
      if (drip.hintTokens) {
        next.hintTokens += drip.hintTokens;
        next.totalEarned = { ...next.totalEarned, hintTokens: next.totalEarned.hintTokens + drip.hintTokens };
      }

      return next;
    });

    return claimed;
  }, []);

  /** Claim today's VIP daily rewards (50 gems + 3 hints). Returns true if claimed. */
  const claimVipDailyRewards = useCallback((): boolean => {
    const today = new Date().toISOString().slice(0, 10);
    let claimed = false;

    setState((prev) => {
      // Not active or expired or already claimed today
      if (!prev.isVipSubscriber || prev.vipExpiresAt <= Date.now()) return prev;
      if (prev.vipDailyLastClaim === today) return prev;

      claimed = true;
      return {
        ...prev,
        vipDailyLastClaim: today,
        gems: prev.gems + 50,
        hintTokens: prev.hintTokens + 3,
        totalEarned: {
          ...prev.totalEarned,
          gems: prev.totalEarned.gems + 50,
          hintTokens: prev.totalEarned.hintTokens + 3,
        },
      };
    });

    return claimed;
  }, []);

  const addLives = useCallback((count: number): void => {
    setState((prev) => ({
      ...prev,
      lives: {
        current: Math.min(prev.lives.current + count, LIVES.max),
        lastRefillTime: Date.now(),
      },
    }));
  }, []);

  // Compute active VIP status (subscribed and not expired)
  const isVipActive = state.isVipSubscriber && state.vipExpiresAt > Date.now();

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
        boosterTokens: state.boosterTokens ?? { wildcardTile: 2, spotlight: 2, smartShuffle: 2 },
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
        processAdReward,
        isAdFree: state.isAdFreeFlag || isVipActive,
        processPurchase,
        isPremiumPass: state.isPremiumPassFlag,
        dailyValuePackExpiry: state.dailyValuePackExpiry,
        starterPackAvailable: state.starterPackExpiresAt > Date.now(),
        undoTokens: state.undoTokens,
        addUndoTokens,
        spendUndoToken,
        addBoosterToken,
        spendBoosterToken,
        claimDailyValuePackDrip,
        isVip: isVipActive,
        vipExpiresAt: state.vipExpiresAt,
        claimVipDailyRewards,
        addLives,
      }}
    >
      {children}
    </EconomyContext.Provider>
  );
}

export const useEconomy = () => useContext(EconomyContext);
