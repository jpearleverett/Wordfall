import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { withRetry } from '../services/retry';
import { useSettings } from './SettingsContext';
import { LIVES } from '../constants';
import { AdRewardType, AD_REWARD_VALUES } from '../services/ads';
import { getProductById } from '../data/shopProducts';
import { getVipStreakBonus } from '../data/vipBenefits';
import {
  DEFAULT_SEASON_PASS_STATE,
  SEASON_PASS_TIERS,
  SeasonPassState,
  getSeasonPassTier,
} from '../data/seasonPass';
import { getRemoteBoolean, getRemoteNumber } from '../services/remoteConfig';
import { analytics } from '../services/analytics';
import { checkSeasonExpiry } from '../services/seasonRotation';
import { logger } from '../utils/logger';
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
import { createPersistQueue } from '../utils/persistQueue';

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
  /** Slow-fill gem jar — fills on puzzle complete, broken via IAP. */
  piggyBank: {
    gems: number;
    lastFillAt: number;
    capacity: number;
  };
  /** Season pass — 50-tier free + premium XP ladder, rotates every 30 days. */
  seasonPass: SeasonPassState;
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
  /**
   * Claim this week's VIP streak bonus. Returns the cosmetic earned at the
   * current tier (if any) so the caller can unlock it on PlayerContext.
   * Returns `null` if the bonus was not claimable (already claimed, no VIP,
   * or no tier reached).
   */
  claimVipStreakBonus: () => { cosmetic?: { type: string; id: string } } | null;
  // Piggy bank — slow-fill gem jar
  piggyBank: IAPState['piggyBank'];
  /** Add gems to the piggy bank, capped at the Remote-Config capacity. */
  addPiggyBankGems: (amount: number) => void;
  /** Drain the piggy bank into the main gem balance. Returns the amount credited. */
  breakPiggyBank: () => number;
  // Season pass — 50-tier XP ladder (free + premium)
  seasonPass: SeasonPassState;
  /** Grant season pass XP; auto-bumps currentTier when thresholds are crossed. */
  addSeasonPassXp: (amount: number) => void;
  /**
   * Claim a tier's reward in one of the two lanes. Returns the reward that
   * was granted (for UI ceremony), or null if the tier wasn't claimable.
   * Currency/consumable rewards are credited automatically; cosmetic rewards
   * surface via the returned descriptor for PlayerContext.unlockCosmetic().
   */
  claimSeasonPassTier: (
    tier: number,
    lane: 'free' | 'premium',
  ) => { cosmetic?: { type: string; id: string } } | null;
  /** Unlock the premium lane for the current season (after IAP validated). */
  unlockSeasonPassPremium: () => void;
  /** Replace the season state (used by season rotation on expiry). */
  resetSeasonPass: (next: SeasonPassState) => void;
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
  piggyBank: {
    gems: 0,
    lastFillAt: 0,
    capacity: 200, // default; refreshed from Remote Config at fill time
  },
  seasonPass: DEFAULT_SEASON_PASS_STATE,
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
  claimVipStreakBonus: () => null,
  piggyBank: DEFAULT_ECONOMY.piggyBank,
  seasonPass: DEFAULT_ECONOMY.seasonPass,
  addPiggyBankGems: () => {},
  breakPiggyBank: () => 0,
  addSeasonPassXp: () => {},
  claimSeasonPassTier: () => null,
  unlockSeasonPassPremium: () => {},
  resetSeasonPass: () => {},
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
        logger.warn('Failed to load economy from AsyncStorage:', e);
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
        logger.warn('Firestore economy sync failed, using local data:', e);
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
  //
  // The debounce coalesces rapid bursts; the persistQueue below serializes the
  // actual write so two slow Firestore round-trips can't overlap and land
  // out-of-order.
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef(state);
  // Keep the ref in sync during render so canAfford / other ref-readers
  // never see stale state (effects run after commit, which is too late).
  latestStateRef.current = state;

  const userRef = useRef(user);
  userRef.current = user;
  const persistQueueRef = useRef(
    createPersistQueue<EconomyState>(async (payload) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        logger.warn('Failed to save economy to AsyncStorage:', e);
      }
      const u = userRef.current;
      if (u) {
        try {
          const docRef = doc(db, 'users', u.uid, 'economy', 'current');
          // Route through withRetry so transient network errors are
          // retried with exponential backoff AND the sync-status bus
          // lights up NotSyncedBanner when writes keep failing.
          await withRetry(() => setDoc(docRef, payload, { merge: true }), {
            label: 'economy-firestore',
          });
        } catch (e) {
          logger.warn('Failed to sync economy to Firestore:', e);
        }
      }
    }, 'economy'),
  );

  useEffect(() => {
    if (!loaded) return;

    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistQueueRef.current.enqueue(latestStateRef.current);
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
        void persistQueueRef.current.flush(latestStateRef.current);
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

  // Season rotation: on load and on every foreground, check if the stored
  // season has expired; if so, install the fresh default season state.
  useEffect(() => {
    if (!loaded) return;

    const runCheck = () => {
      const pass = latestStateRef.current.seasonPass;
      if (!pass) return;
      const result = checkSeasonExpiry(pass);
      if (result.expired && result.nextSeason) {
        setState((prev) => ({ ...prev, seasonPass: result.nextSeason! }));
      }
    };

    runCheck();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') runCheck();
    });
    return () => subscription.remove();
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

  const addPiggyBankGems = useCallback((amount: number) => {
    if (amount <= 0) return;
    if (!getRemoteBoolean('piggyBankEnabled')) return;
    const capacity = Math.max(0, Math.round(getRemoteNumber('piggyBankCapacity')));
    setState((prev) => {
      const current = prev.piggyBank?.gems ?? 0;
      if (current >= capacity) return prev;
      const nextGems = Math.min(capacity, current + amount);
      if (nextGems === current) return prev;
      return {
        ...prev,
        piggyBank: {
          gems: nextGems,
          lastFillAt: Date.now(),
          capacity,
        },
      };
    });
  }, []);

  const breakPiggyBank = useCallback((): number => {
    let granted = 0;
    setState((prev) => {
      const gems = prev.piggyBank?.gems ?? 0;
      if (gems <= 0) return prev;
      granted = gems;
      return {
        ...prev,
        gems: prev.gems + gems,
        piggyBank: {
          ...prev.piggyBank,
          gems: 0,
          lastFillAt: Date.now(),
        },
        totalEarned: {
          ...prev.totalEarned,
          gems: prev.totalEarned.gems + gems,
        },
      };
    });
    return granted;
  }, []);

  // ── Season pass ────────────────────────────────────────────────────────

  const addSeasonPassXp = useCallback((amount: number) => {
    if (amount <= 0) return;
    if (!getRemoteBoolean('seasonPassEnabled')) return;
    const multiplier = getRemoteNumber('seasonPassXpMultiplier') || 1;
    const xpDelta = Math.round(amount * multiplier);
    let unlockedTiers: number[] = [];
    setState((prev) => {
      const current = prev.seasonPass ?? DEFAULT_SEASON_PASS_STATE;
      const nextXP = current.currentXP + xpDelta;
      const nextTier = getSeasonPassTier(nextXP);
      if (nextTier > current.currentTier) {
        unlockedTiers = [];
        for (let t = current.currentTier + 1; t <= nextTier; t++) unlockedTiers.push(t);
      }
      return {
        ...prev,
        seasonPass: {
          ...current,
          currentXP: nextXP,
          currentTier: nextTier,
        },
      };
    });
    for (const tier of unlockedTiers) {
      void analytics.logEvent('season_pass_tier_unlocked', { tier });
    }
  }, []);

  const claimSeasonPassTier = useCallback(
    (tier: number, lane: 'free' | 'premium') => {
      let grant: { cosmetic?: { type: string; id: string } } | null = null;
      setState((prev) => {
        const pass = prev.seasonPass ?? DEFAULT_SEASON_PASS_STATE;
        if (tier < 1 || tier > SEASON_PASS_TIERS.length) return prev;
        if (tier > pass.currentTier) return prev;
        if (lane === 'premium' && !pass.isPremium) return prev;
        const claimedList =
          lane === 'free' ? pass.claimedFreeTiers : pass.claimedPremiumTiers;
        if (claimedList.includes(tier)) return prev;

        const tierDef = SEASON_PASS_TIERS[tier - 1];
        const reward = lane === 'free' ? tierDef.freeReward : tierDef.premiumReward;

        const next: EconomyState = {
          ...prev,
          totalEarned: { ...prev.totalEarned },
          boosterTokens: { ...prev.boosterTokens },
        };

        switch (reward.type) {
          case 'coins': {
            const amt = reward.amount ?? 0;
            next.coins += amt;
            next.totalEarned.coins += amt;
            break;
          }
          case 'gems': {
            const amt = reward.amount ?? 0;
            next.gems += amt;
            next.totalEarned.gems += amt;
            break;
          }
          case 'hints': {
            const amt = reward.amount ?? 0;
            next.hintTokens += amt;
            next.totalEarned.hintTokens += amt;
            break;
          }
          case 'booster': {
            const amt = reward.amount ?? 1;
            next.boosterTokens.wildcardTile += amt;
            break;
          }
          case 'rare_tile':
          case 'mystery_box':
            // Inventory-only rewards surface via the returned descriptor;
            // there's no numeric slot to bump in EconomyState today. The
            // Shop/Inventory surfaces owning these are gated on the higher
            // premium-lane flag — wiring them is out of scope for B2.
            break;
          case 'cosmetic':
            if (reward.cosmeticId) {
              grant = { cosmetic: { type: 'frame', id: reward.cosmeticId } };
            }
            break;
        }

        next.seasonPass = {
          ...pass,
          claimedFreeTiers:
            lane === 'free' ? [...pass.claimedFreeTiers, tier] : pass.claimedFreeTiers,
          claimedPremiumTiers:
            lane === 'premium'
              ? [...pass.claimedPremiumTiers, tier]
              : pass.claimedPremiumTiers,
        };
        grant = grant ?? {};
        void analytics.logEvent('season_pass_tier_claimed', {
          tier,
          lane,
          reward_type: reward.type,
        });
        return next;
      });
      return grant;
    },
    [],
  );

  const unlockSeasonPassPremium = useCallback(() => {
    setState((prev) => {
      const pass = prev.seasonPass ?? DEFAULT_SEASON_PASS_STATE;
      if (pass.isPremium) return prev;
      return {
        ...prev,
        seasonPass: { ...pass, isPremium: true },
      };
    });
  }, []);

  const resetSeasonPass = useCallback((next: SeasonPassState) => {
    setState((prev) => ({ ...prev, seasonPass: next }));
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
      case 'lives':
        setState((prev) => ({
          ...prev,
          lives: {
            current: Math.min(prev.lives.current + def.amount, LIVES.max),
            lastRefillTime: Date.now(),
          },
        }));
        break;
      default:
        logger.warn('[Economy] Unknown ad reward currency:', def.currency);
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
      let next = result.nextState;
      // Season pass premium — unlock the premium lane for the current season.
      if (applied && productId === 'season_pass_premium') {
        const pass = next.seasonPass ?? DEFAULT_SEASON_PASS_STATE;
        next = { ...next, seasonPass: { ...pass, isPremium: true } };
      }
      return next;
    });

    if (applied && productId === 'season_pass_premium') {
      void analytics.logEvent('season_pass_premium_purchased', {});
    }

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

  /**
   * Claim the VIP streak bonus for the current tier. Returns the tier's
   * cosmetic descriptor (if any) so the caller can unlock it on the
   * profile catalog. Returns `null` if the bonus was not claimable.
   */
  const claimVipStreakBonus = useCallback((): { cosmetic?: { type: string; id: string } } | null => {
    let result: { cosmetic?: { type: string; id: string } } | null = null;

    setState((prev) => {
      if (prev.vipStreakBonusClaimed) return prev;

      const bonus = getVipStreakBonus(prev.vipStreakWeeks);
      if (!bonus) return prev;

      result = bonus.extraReward?.id
        ? { cosmetic: { type: bonus.extraReward.type, id: bonus.extraReward.id } }
        : {};
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

    return result;
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
      piggyBank: state.piggyBank ?? DEFAULT_ECONOMY.piggyBank,
      addPiggyBankGems,
      breakPiggyBank,
      seasonPass: state.seasonPass ?? DEFAULT_ECONOMY.seasonPass,
      addSeasonPassXp,
      claimSeasonPassTier,
      unlockSeasonPassPremium,
      resetSeasonPass,
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
      addPiggyBankGems,
      breakPiggyBank,
      addSeasonPassXp,
      claimSeasonPassTier,
      unlockSeasonPassPremium,
      resetSeasonPass,
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
      addPiggyBankGems,
      breakPiggyBank,
      addSeasonPassXp,
      claimSeasonPassTier,
      unlockSeasonPassPremium,
      resetSeasonPass,
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
      addPiggyBankGems,
      breakPiggyBank,
      addSeasonPassXp,
      claimSeasonPassTier,
      unlockSeasonPassPremium,
      resetSeasonPass,
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
