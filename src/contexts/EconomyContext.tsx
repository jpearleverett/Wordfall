import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { LIVES } from '../constants';
import { AdRewardType, AD_REWARD_VALUES } from '../services/ads';
import { getProductById } from '../data/shopProducts';
import { getVipStreakBonus } from '../data/vipBenefits';
import {
  activateTemporaryEntitlement,
  applyCatalogPurchase,
  CommercialEffectId,
  CommercialPurchaseRecord,
  isTemporaryEntitlementActive,
  LEGACY_ENTITLEMENT_MIGRATION_VERSION,
  migrateLegacyEntitlements,
  PlayerGrantSummary,
  PurchaseFulfillmentOptions,
} from '../services/commercialEntitlements';
import {
  EconomyStoreContext,
  EconomyActionsContext,
  createEconomyStore,
  type EconomyStore,
  type EconomyActions,
} from '../stores/economyStore';
import { computeRefilledLives } from '../utils/lives';

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

type PurchaseRecord = CommercialPurchaseRecord;

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
  /** Consecutive weeks subscribed to VIP */
  vipStreakWeeks: number;
  /** Whether the weekly VIP streak bonus has been claimed this week */
  vipStreakBonusClaimed: boolean;
  /** Timestamp of last VIP streak check/increment */
  vipStreakLastChecked: number;
  /** Time-bound temporary effects and rentals */
  temporaryEntitlements: Partial<Record<CommercialEffectId, number>>;
  /** One-time migration guard for legacy settings-owned entitlements */
  entitlementMigrationVersion: number;
}

export interface EconomyState extends Economy, IAPState {
  totalEarned: TotalEarned;
  purchaseHistory: PurchaseRecord[];
  lives: LivesData;
}

export interface EconomyContextType extends Economy {
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
  applyValidatedPurchase: (
    productId: string,
    options?: PurchaseFulfillmentOptions,
  ) => { grants: PlayerGrantSummary; applied: boolean };
  isPremiumPass: boolean;
  dailyValuePackExpiry: number;
  starterPackAvailable: boolean;
  starterPackExpiresAt: number;
  activateStarterPack: () => void;
  undoTokens: number;
  addUndoTokens: (amount: number) => void;
  spendUndoToken: () => boolean;
  addBoosterToken: (type: 'wildcardTile' | 'spotlight' | 'smartShuffle', amount?: number) => void;
  spendBoosterToken: (type: 'wildcardTile' | 'spotlight' | 'smartShuffle') => boolean;
  claimDailyValuePackDrip: () => boolean;
  isVip: boolean;
  vipExpiresAt: number;
  claimVipDailyRewards: () => boolean;
  checkVipStreak: () => number;
  claimVipStreakBonus: () => boolean;
  addLives: (count: number) => void;
  hasTemporaryEntitlement: (effectId: CommercialEffectId) => boolean;
  getTemporaryEntitlementExpiry: (effectId: CommercialEffectId) => number;
  grantTemporaryEntitlement: (effectId: CommercialEffectId, durationMinutes: number) => void;
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
  starterPackExpiresAt: 0, // Deferred: activated after STARTER_PACK_DELAY_PUZZLES puzzles
  undoTokens: 5,
  isVipSubscriber: false,
  vipExpiresAt: 0,
  vipDailyLastClaim: '',
  vipStreakWeeks: 0,
  vipStreakBonusClaimed: false,
  vipStreakLastChecked: 0,
  temporaryEntitlements: {},
  entitlementMigrationVersion: 0,
};

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
  applyValidatedPurchase: () => ({ grants: { cosmetics: [], decorations: [] }, applied: false }),
  isPremiumPass: false,
  dailyValuePackExpiry: 0,
  starterPackAvailable: true,
  starterPackExpiresAt: 0,
  activateStarterPack: () => {},
  undoTokens: 0,
  addUndoTokens: () => {},
  spendUndoToken: () => false,
  addBoosterToken: () => {},
  spendBoosterToken: () => false,
  claimDailyValuePackDrip: () => false,
  isVip: false,
  vipExpiresAt: 0,
  claimVipDailyRewards: () => false,
  checkVipStreak: () => 0,
  claimVipStreakBonus: () => false,
  addLives: () => {},
  hasTemporaryEntitlement: () => false,
  getTemporaryEntitlementExpiry: () => 0,
  grantTemporaryEntitlement: () => {},
});

export function EconomyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const settings = useSettings();
  const [state, setState] = useState<EconomyState>(DEFAULT_ECONOMY);
  const [loaded, setLoaded] = useState(false);

  // Zustand store mirror — see src/stores/economyStore.ts. Consumers that
  // call useEconomyStore(selector) only re-render when their slice changes.
  // The useState above remains the write source of truth so the 1s debounce,
  // 60s life-refill tick, AppState flush, and entitlement migration are all
  // unchanged.
  const storeRef = useRef<EconomyStore | null>(null);
  if (!storeRef.current) storeRef.current = createEconomyStore(DEFAULT_ECONOMY);
  useEffect(() => {
    storeRef.current!.setState(state, true);
  }, [state]);

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

  // One-time migration from legacy settings-owned purchase flags.
  useEffect(() => {
    if (!loaded || !settings.loaded) return;
    if (state.entitlementMigrationVersion >= LEGACY_ENTITLEMENT_MIGRATION_VERSION) return;

    setState((prev) =>
      migrateLegacyEntitlements(prev, {
        adsRemoved: settings.adsRemoved,
        premiumPass: settings.premiumPass,
      }).nextState
    );
  }, [
    loaded,
    settings.loaded,
    settings.adsRemoved,
    settings.premiumPass,
    state.entitlementMigrationVersion,
  ]);

  // Debounce persistence. Economy state churns many times per puzzle (currency,
  // life tick, booster counts, etc.) — writing to AsyncStorage + Firestore on
  // every mutation would JSON.stringify the full state blob 50+ times per game,
  // blocking the JS thread. Batch to one write per second of quiet.
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef(state);
  // Keep the ref in sync during render so canAfford / other ref-readers
  // never see stale state (effects run after commit, which is too late).
  latestStateRef.current = state;
  useEffect(() => {
    if (!loaded) return;

    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      (async () => {
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(latestStateRef.current));
        } catch (e) {
          console.warn('Failed to save economy to AsyncStorage:', e);
        }
        if (user) {
          try {
            const docRef = doc(db, 'users', user.uid, 'economy', 'current');
            await setDoc(docRef, latestStateRef.current, { merge: true });
          } catch (e) {
            console.warn('Failed to sync economy to Firestore:', e);
          }
        }
      })();
    }, 1000);

    // Intentionally no cleanup here — we want the timer to persist across
    // rapid state changes so writes coalesce. Background/unmount flush below.
  }, [state, loaded, user]);

  // Crash-safety: flush any pending write on backgrounding or unmount.
  useEffect(() => {
    if (!loaded) return;

    const flushPendingPersist = () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
        void AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(latestStateRef.current),
        ).catch((e) => {
          console.warn('Failed to flush economy on background:', e);
        });
      }
    };

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        flushPendingPersist();
      }
    });

    return () => {
      subscription.remove();
      flushPendingPersist();
    };
  }, [loaded]);

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

  // Read latest state via ref so canAfford has stable identity across the
  // many state mutations economy goes through. Behavior is unchanged because
  // latestStateRef is updated synchronously in the persist effect above on
  // every state change.
  const canAfford = useCallback(
    (currency: 'coins' | 'gems', amount: number): boolean => {
      return latestStateRef.current[currency] >= amount;
    },
    [],
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
    const livesNow = computeRefilledLives(latestStateRef.current.lives);
    if (livesNow.current >= LIVES.max) return 0;
    const refillMs = LIVES.refillMinutes * 60 * 1000;
    const elapsed = Date.now() - livesNow.lastRefillTime;
    const remaining = refillMs - (elapsed % refillMs);
    return Math.max(0, remaining);
  }, []);

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

  // ── Purchase fulfilment ───────────────────────────────────────────────────

  const applyValidatedPurchase = useCallback((
    productId: string,
    options: PurchaseFulfillmentOptions = {},
  ): { grants: PlayerGrantSummary; applied: boolean } => {
    let grants: PlayerGrantSummary = { cosmetics: [], decorations: [] };
    let applied = false;

    setState((prev) => {
      const result = applyCatalogPurchase(prev, productId, options);
      grants = result.grants;
       applied = result.applied;
      return result.nextState;
    });

    return { grants, applied };
  }, []);

  const processPurchase = useCallback((productId: string) => {
    void applyValidatedPurchase(productId, { source: 'purchase' });
  }, [applyValidatedPurchase]);

  const grantTemporaryEntitlement = useCallback((
    effectId: CommercialEffectId,
    durationMinutes: number,
  ): void => {
    setState((prev) => activateTemporaryEntitlement(prev, effectId, durationMinutes));
  }, []);

  const hasTemporaryEntitlement = useCallback((effectId: CommercialEffectId): boolean => {
    return isTemporaryEntitlementActive(
      latestStateRef.current.temporaryEntitlements,
      effectId,
    );
  }, []);

  const getTemporaryEntitlementExpiry = useCallback((effectId: CommercialEffectId): number => {
    return latestStateRef.current.temporaryEntitlements[effectId] ?? 0;
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

  /** Check and update VIP streak. Increments weekly, resets if lapsed. Returns current streak weeks. */
  const checkVipStreak = useCallback((): number => {
    let currentWeeks = 0;

    setState((prev) => {
      const now = Date.now();

      // If VIP is not active, reset streak
      if (!prev.isVipSubscriber || prev.vipExpiresAt <= now) {
        if (prev.vipStreakWeeks === 0 && !prev.vipStreakBonusClaimed) return prev;
        currentWeeks = 0;
        return {
          ...prev,
          vipStreakWeeks: 0,
          vipStreakBonusClaimed: false,
        };
      }

      // VIP is active — check if 7+ days since last check
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (prev.vipStreakLastChecked > 0 && now - prev.vipStreakLastChecked < sevenDaysMs) {
        currentWeeks = prev.vipStreakWeeks;
        return prev;
      }

      // Increment streak
      const newWeeks = prev.vipStreakWeeks + 1;
      currentWeeks = newWeeks;
      return {
        ...prev,
        vipStreakWeeks: newWeeks,
        vipStreakLastChecked: now,
        vipStreakBonusClaimed: false,
      };
    });

    return currentWeeks;
  }, []);

  /** Claim the VIP streak bonus for the current tier. Returns true if claimed. */
  const claimVipStreakBonus = useCallback((): boolean => {
    let claimed = false;

    setState((prev) => {
      if (prev.vipStreakBonusClaimed) return prev;

      const bonus = getVipStreakBonus(prev.vipStreakWeeks);
      if (!bonus) return prev;

      claimed = true;
      return {
        ...prev,
        vipStreakBonusClaimed: true,
        gems: prev.gems + bonus.bonusGems,
        hintTokens: prev.hintTokens + bonus.bonusHints,
        totalEarned: {
          ...prev.totalEarned,
          gems: prev.totalEarned.gems + bonus.bonusGems,
          hintTokens: prev.totalEarned.hintTokens + bonus.bonusHints,
        },
      };
    });

    return claimed;
  }, []);

  /** Claim today's VIP daily rewards (50 gems + 3 hints). Returns true if claimed. */
  const claimVipDailyRewards = useCallback((): boolean => {
    // Ensure streak is up to date before claiming daily rewards
    checkVipStreak();

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
  }, [checkVipStreak]);

  const activateStarterPack = useCallback((): void => {
    setState((prev) => ({
      ...prev,
      starterPackExpiresAt: Date.now() + STARTER_PACK_WINDOW_MS,
    }));
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
  const hasVipExperience = isTemporaryEntitlementActive(state.temporaryEntitlements, 'vip_experience');

  const currentLives = computeRefilledLives(state.lives).current;
  const nextLifeTime = currentLives < LIVES.max
    ? state.lives.lastRefillTime + LIVES.refillMinutes * 60 * 1000
    : null;

  const value = useMemo(
    () => ({
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
      isAdFree: state.isAdFreeFlag || isVipActive || hasVipExperience,
      processPurchase,
      applyValidatedPurchase,
      isPremiumPass: state.isPremiumPassFlag,
      dailyValuePackExpiry: state.dailyValuePackExpiry,
      starterPackAvailable: state.starterPackExpiresAt > Date.now(),
      starterPackExpiresAt: state.starterPackExpiresAt,
      activateStarterPack,
      undoTokens: state.undoTokens,
      addUndoTokens,
      spendUndoToken,
      addBoosterToken,
      spendBoosterToken,
      claimDailyValuePackDrip,
      isVip: isVipActive,
      vipExpiresAt: state.vipExpiresAt,
      claimVipDailyRewards,
      checkVipStreak,
      claimVipStreakBonus,
      addLives,
      hasTemporaryEntitlement,
      getTemporaryEntitlementExpiry,
      grantTemporaryEntitlement,
    }),
    [
      state,
      loaded,
      currentLives,
      nextLifeTime,
      isVipActive,
      addCoins,
      spendCoins,
      addGems,
      spendGems,
      addHintTokens,
      spendHintToken,
      addEventStars,
      addLibraryPoints,
      canAfford,
      spendLife,
      refillLives,
      getTimeUntilNextLife,
      processAdReward,
      hasVipExperience,
      processPurchase,
      applyValidatedPurchase,
      activateStarterPack,
      addUndoTokens,
      spendUndoToken,
      addBoosterToken,
      spendBoosterToken,
      claimDailyValuePackDrip,
      claimVipDailyRewards,
      checkVipStreak,
      claimVipStreakBonus,
      addLives,
      hasTemporaryEntitlement,
      getTemporaryEntitlementExpiry,
      grantTemporaryEntitlement,
    ],
  );

  // Pure-method dispatch bag. State-derived values are NOT included — they're
  // exposed via store selectors (selectLivesCurrent, selectIsAdFreeComputed,
  // selectIsVipActive, etc.) so that consumers reading e.g. coins via a
  // selector don't re-render when undoTokens churns. This memo's identity is
  // stable across normal state churn because every dep is a stable callback;
  // it only changes when one of the underlying useCallback identities does.
  const actions = useMemo<EconomyActions>(
    () => ({
      loaded,
      addCoins,
      spendCoins,
      addGems,
      spendGems,
      addHintTokens,
      spendHintToken,
      addEventStars,
      addLibraryPoints,
      canAfford,
      spendLife,
      refillLives,
      getTimeUntilNextLife,
      processAdReward,
      processPurchase,
      applyValidatedPurchase,
      activateStarterPack,
      addUndoTokens,
      spendUndoToken,
      addBoosterToken,
      spendBoosterToken,
      claimDailyValuePackDrip,
      claimVipDailyRewards,
      checkVipStreak,
      claimVipStreakBonus,
      addLives,
      hasTemporaryEntitlement,
      getTemporaryEntitlementExpiry,
      grantTemporaryEntitlement,
    }),
    [
      loaded,
      addCoins,
      spendCoins,
      addGems,
      spendGems,
      addHintTokens,
      spendHintToken,
      addEventStars,
      addLibraryPoints,
      canAfford,
      spendLife,
      refillLives,
      getTimeUntilNextLife,
      processAdReward,
      processPurchase,
      applyValidatedPurchase,
      activateStarterPack,
      addUndoTokens,
      spendUndoToken,
      addBoosterToken,
      spendBoosterToken,
      claimDailyValuePackDrip,
      claimVipDailyRewards,
      checkVipStreak,
      claimVipStreakBonus,
      addLives,
      hasTemporaryEntitlement,
      getTemporaryEntitlementExpiry,
      grantTemporaryEntitlement,
    ],
  );

  return (
    <EconomyStoreContext.Provider value={storeRef.current}>
      <EconomyActionsContext.Provider value={actions}>
        <EconomyContext.Provider value={value}>{children}</EconomyContext.Provider>
      </EconomyActionsContext.Provider>
    </EconomyStoreContext.Provider>
  );
}

export const useEconomy = () => useContext(EconomyContext);
