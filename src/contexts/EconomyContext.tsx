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
import { stripUndefinedDeep } from '../utils/firestoreSanitize';
import { iapManager } from '../services/iap';
import { firestoreService } from '../services/firestore';
import {
  creditLives,
  settleSeasonPassReward,
  shouldAdoptCloudEconomy,
  type SeasonPassClaimGrant,
} from './economySync';

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
  /**
   * Stamped by the persist writer on every save. The Firestore sync-in
   * compares it against the cloud doc so a stale cloud snapshot can never
   * clobber fresher local currency/entitlements (same convention as
   * PlayerContext). Optional: legacy blobs without it compare as 0.
   */
  lastModified?: number;
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
  spendLibraryPoints: (amount: number) => boolean;
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
   * Currency/consumable rewards (including rolled mystery-box contents) are
   * credited automatically; cosmetic and rare-tile rewards surface via the
   * returned descriptor for PlayerContext.unlockCosmetic() / addRareTile().
   */
  claimSeasonPassTier: (
    tier: number,
    lane: 'free' | 'premium',
  ) => SeasonPassClaimGrant | null;
  /** Unlock the premium lane for the current season (after IAP validated). */
  unlockSeasonPassPremium: () => void;
  /** Replace the season state (used by season rotation on expiry). */
  resetSeasonPass: (next: SeasonPassState) => void;
  addLives: (count: number) => void;
  hasTemporaryEntitlement: (effectId: CommercialEffectId) => boolean;
  getTemporaryEntitlementExpiry: (effectId: CommercialEffectId) => number;
  grantTemporaryEntitlement: (effectId: CommercialEffectId, durationMinutes: number) => void;
  /** Clear a temporary entitlement after its one-shot effect has been applied in-game. */
  consumeTemporaryEntitlement: (effectId: CommercialEffectId) => void;
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
  spendLibraryPoints: () => false,
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
  consumeTemporaryEntitlement: () => {},
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

  // ── Server-authoritative VIP reconciliation ────────────────────────────
  // onSubscriptionRenew writes vipActive/vipExpiresAt/vipUpdatedAt on every
  // Apple SSN v2 + Google RTDN event, and until now NOTHING read them: a
  // subscription renewed while the app was closed never extended locally,
  // and one that lapsed, cancelled, or was refunded server-side kept its
  // benefits until the stale local expiry ran out. Runs once per sign-in
  // after local state has loaded, so it can never race the AsyncStorage
  // hydrate and revive a cleared flag.
  useEffect(() => {
    if (!loaded || !user?.uid) return;
    let cancelled = false;
    (async () => {
      const server = await firestoreService.getServerVipStatus(user.uid);
      if (cancelled || !server) return;
      setState((prev) => {
        if (server.vipActive) {
          // Extend only — a server expiry BEHIND the local one means the
          // local record is fresher (a purchase this session that the
          // server hasn't processed yet).
          if (server.vipExpiresAt <= prev.vipExpiresAt && prev.isVipSubscriber) return prev;
          return {
            ...prev,
            isVipSubscriber: true,
            vipExpiresAt: Math.max(prev.vipExpiresAt, server.vipExpiresAt),
          };
        }
        // Server says inactive. Only revoke when the server's decision is
        // NEWER than the newest local VIP purchase, so an in-flight local
        // purchase is never wiped by a stale server record.
        if (!prev.isVipSubscriber) return prev;
        const newestLocalVipPurchase = prev.purchaseHistory.reduce(
          (latest, r) =>
            typeof r?.item === 'string' && r.item.startsWith('vip_')
              ? Math.max(latest, r.timestamp ?? 0)
              : latest,
          0,
        );
        if (server.vipUpdatedAtMs <= newestLocalVipPurchase) return prev;
        return { ...prev, isVipSubscriber: false, vipExpiresAt: 0 };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, user?.uid]);

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

  // Sync with Firestore when user is available. Runs at most once per app
  // session — re-triggers (e.g. a Google account link swapping `user`)
  // previously re-applied a snapshot from before the session's earnings.
  const initialEconomySyncDone = useRef(false);
  useEffect(() => {
    if (!user || !loaded || initialEconomySyncDone.current) return;
    initialEconomySyncDone.current = true;

    const syncFromFirestore = async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'economy', 'current');
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const firestoreData = snapshot.data() as Partial<EconomyState>;
          // Use whichever data is more recent (PlayerContext convention).
          // The old blind spread let a stale cloud snapshot (written before
          // the previous session's last local save) silently revert coins,
          // gems, entitlement flags, and purchaseHistory. Adoption is
          // STRICT recency (see shouldAdoptCloudEconomy): the writer stamps
          // one Date.now() into both stores, so on `>=` the byte-equal
          // stamps re-adopted the previous snapshot on every launch and
          // reverted any mutation made between hydration and this getDoc
          // resolving. An unstamped local blob (fresh install / legacy
          // save) still lets cloud win, keeping the migration behavior.
          setState((prev) => {
            const localModified = prev.lastModified || 0;
            const cloudModified = firestoreData.lastModified || 0;
            if (shouldAdoptCloudEconomy(localModified, cloudModified)) {
              const next = { ...prev, ...firestoreData };
              // Never adopt a stale cloud lives block verbatim — recompute
              // refills for the time elapsed since it was written.
              if (next.lives) next.lives = computeRefilledLives(next.lives);
              return next;
            }
            return prev;
          });
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
  // TWO queues, deliberately (PlayerContext convention: 'player-local' vs
  // 'player-firestore'). Offline, the Firebase JS SDK's setDoc promise never
  // settles — it resolves only on backend ack — so a fused writer wedged the
  // single serialized queue forever after the first offline persist: every
  // later snapshot of the offline session silently skipped AsyncStorage and
  // the whole session's economy rolled back on the next launch.
  const persistLocalQueueRef = useRef(
    createPersistQueue<EconomyState>(async (stamped) => {
      // AsyncStorage-only writer — MUST never await a network promise.
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
      } catch (e) {
        logger.warn('Failed to save economy to AsyncStorage:', e);
      }
    }, 'economy-local'),
  );
  const persistCloudQueueRef = useRef(
    createPersistQueue<EconomyState>(async (stamped) => {
      const u = userRef.current;
      if (!u) return;
      try {
        const docRef = doc(db, 'users', u.uid, 'economy', 'current');
        // Route through withRetry so transient network errors are
        // retried with exponential backoff AND the sync-status bus
        // lights up NotSyncedBanner when writes keep failing.
        // Same guard as the player payload: setDoc throws on nested
        // undefined and the throw lands in a fire-and-forget queue, so an
        // optional field hydrating as undefined would silently stop every
        // economy save.
        await withRetry(() => setDoc(docRef, stripUndefinedDeep(stamped), { merge: true }), {
          label: 'economy-firestore',
        });
      } catch (e) {
        logger.warn('Failed to sync economy to Firestore:', e);
      }
    }, 'economy-firestore'),
  );

  // Stamp ONCE per snapshot so the local blob and the cloud doc carry the
  // identical recency marker the Firestore sync-in compares against, then
  // hand the same stamped payload to both queues. Returns when the LOCAL
  // write has drained (flush mode); the cloud flush is fire-and-forget —
  // offline it may never settle and must not gate the local write.
  const persistEconomy = useCallback(
    (payload: EconomyState, flush = false): Promise<void> => {
      const stamped = { ...payload, lastModified: Date.now() };
      if (flush) {
        const localDone = persistLocalQueueRef.current.flush(stamped);
        void persistCloudQueueRef.current.flush(stamped);
        return localDone;
      }
      persistLocalQueueRef.current.enqueue(stamped);
      persistCloudQueueRef.current.enqueue(stamped);
      return Promise.resolve();
    },
    [],
  );

  useEffect(() => {
    if (!loaded) return;

    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      void persistEconomy(latestStateRef.current);
    }, 1000);

    // Intentionally no cleanup here — we want the timer to persist across
    // rapid state changes so writes coalesce. Background/unmount flush below.
  }, [state, loaded, user, persistEconomy]);

  // Crash-safety: flush any pending write on backgrounding or unmount.
  useEffect(() => {
    if (!loaded) return;

    const flushPendingPersist = () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
        void persistEconomy(latestStateRef.current, true);
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
  }, [loaded, persistEconomy]);

  // IAP fulfilment durability: give the IAP layer a hook that forces the
  // just-granted economy state into AsyncStorage BEFORE it consumes the
  // store-side purchase. Without it, a crash in the 1s debounce window
  // after a consumable grant lost the purchase unrecoverably — consumed
  // purchases vanish from getAvailablePurchases, so Restore and the
  // pending-purchase recovery pass both come up empty.
  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;
  useEffect(() => {
    return iapManager.onFulfillmentFlush(async () => {
      // Never flush pre-hydration defaults over a real stored blob.
      if (!loadedRef.current) return;
      await persistEconomy(latestStateRef.current, true);
    });
  }, [persistEconomy]);

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
    (tier: number, lane: 'free' | 'premium'): SeasonPassClaimGrant | null => {
      // Decide claimability synchronously from the latest committed state
      // (the file's latestStateRef pattern, same as claimVipDailyRewards) —
      // the old version derived the return value from a variable mutated
      // inside the setState updater, which React only runs eagerly on an
      // empty queue, so a claim landing in a busy batch returned null and
      // dropped its item grants.
      const cur = latestStateRef.current;
      const pass = cur.seasonPass ?? DEFAULT_SEASON_PASS_STATE;
      if (tier < 1 || tier > SEASON_PASS_TIERS.length) return null;
      if (tier > pass.currentTier) return null;
      if (lane === 'premium' && !pass.isPremium) return null;
      const claimedList =
        lane === 'free' ? pass.claimedFreeTiers : pass.claimedPremiumTiers;
      if (claimedList.includes(tier)) return null;

      const tierDef = SEASON_PASS_TIERS[tier - 1];
      const reward = lane === 'free' ? tierDef.freeReward : tierDef.premiumReward;

      // Settle ONCE outside the updater so mystery-box rolls are pinned
      // (updaters can re-run) and item rewards actually reach the caller:
      // 'rare_tile' and 'mystery_box' previously fell through an empty
      // switch arm — the tier was marked claimed, analytics logged a claim,
      // and nothing was delivered (ten premium tiers behind the 500-gem
      // pass, plus the free mystery-box tiers 30/50).
      const { credit, grant } = settleSeasonPassReward(reward);

      const applyClaim = (prev: EconomyState): EconomyState => {
        const prevPass = prev.seasonPass ?? DEFAULT_SEASON_PASS_STATE;
        const prevClaimed =
          lane === 'free' ? prevPass.claimedFreeTiers : prevPass.claimedPremiumTiers;
        // Double-claim safety net if state moved between check and commit.
        if (prevClaimed.includes(tier)) return prev;
        return {
          ...prev,
          coins: prev.coins + credit.coins,
          gems: prev.gems + credit.gems,
          hintTokens: prev.hintTokens + credit.hintTokens,
          boosterTokens: {
            wildcardTile:
              (prev.boosterTokens?.wildcardTile ?? 0) + credit.boosterTokens.wildcardTile,
            spotlight:
              (prev.boosterTokens?.spotlight ?? 0) + credit.boosterTokens.spotlight,
            smartShuffle:
              (prev.boosterTokens?.smartShuffle ?? 0) + credit.boosterTokens.smartShuffle,
          },
          totalEarned: {
            ...prev.totalEarned,
            coins: prev.totalEarned.coins + credit.coins,
            gems: prev.totalEarned.gems + credit.gems,
            hintTokens: prev.totalEarned.hintTokens + credit.hintTokens,
          },
          seasonPass: {
            ...prevPass,
            claimedFreeTiers:
              lane === 'free'
                ? [...prevPass.claimedFreeTiers, tier]
                : prevPass.claimedFreeTiers,
            claimedPremiumTiers:
              lane === 'premium'
                ? [...prevPass.claimedPremiumTiers, tier]
                : prevPass.claimedPremiumTiers,
          },
        };
      };

      // Advance the ref synchronously (applyValidatedPurchase pattern) so a
      // second tap before the re-render can't claim the same tier again.
      latestStateRef.current = applyClaim(latestStateRef.current);
      setState(applyClaim);

      void analytics.logEvent('season_pass_tier_claimed', {
        tier,
        lane,
        reward_type: reward.type,
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

  const spendLibraryPoints = useCallback((amount: number): boolean => {
    let success = false;
    setState((prev) => {
      if (prev.libraryPoints >= amount) {
        success = true;
        return { ...prev, libraryPoints: prev.libraryPoints - amount };
      }
      return prev;
    });
    return success;
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
        // Deliberate no-op: the doubler's grant depends on the completion's
        // authoritative totals (totalCoinsAwarded/totalGemsAwarded), which
        // only GameScreen has. GameScreen credits the real coins+gems delta
        // itself after the ad resolves (exactly-once per completion, see
        // handleWatchAdForDoubleReward) — crediting anything here as well
        // would double-pay.
        break;
      case 'time':
        // Deliberate no-op: the timeout continue is applied by the game
        // reducer (EXTEND_TIME) from GameScreen's handler, not the wallet —
        // there is no currency to credit here.
        break;
      case 'lives':
        // creditLives banks accrued refills first and keeps the refill
        // anchor below max — the old raw add + lastRefillTime reset made a
        // rewarded-ad life cost up to a full refill interval of regen.
        setState((prev) => ({
          ...prev,
          lives: creditLives(prev.lives, def.amount),
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
    // Pin the timestamp so the eager computation (return value) and the
    // queued updater (authoritative state) agree exactly.
    const opts = { ...options, now: options.now ?? Date.now() };

    // Compute the outcome eagerly from the latest known state. The old
    // version derived the return value from variables mutated inside the
    // setState updater, which React only runs eagerly on an empty queue —
    // every call after the first in one batch (the multi-item restore
    // loop) returned applied:false with empty grants, silently dropping
    // cosmetic/decoration/streak-shield content for those purchases.
    const eager = applyCatalogPurchase(latestStateRef.current, productId, opts);

    if (eager.applied) {
      let eagerNext = eager.nextState;
      // Season pass premium — unlock the premium lane for the current season.
      if (productId === 'season_pass_premium') {
        const pass = eagerNext.seasonPass ?? DEFAULT_SEASON_PASS_STATE;
        eagerNext = { ...eagerNext, seasonPass: { ...pass, isPremium: true } };
      }
      // Advance the ref synchronously so back-to-back calls in the same
      // batch chain their eager computations — this is what makes the
      // in-batch transactionId dedup see earlier items of the batch.
      latestStateRef.current = eagerNext;
    }

    setState((prev) => {
      // Recompute against the authoritative prev with the same pinned
      // opts; transactionId dedup makes replays no-ops, so state can
      // never double-apply even if eager and queued disagree.
      const result = applyCatalogPurchase(prev, productId, opts);
      if (!result.applied) return prev;
      let next = result.nextState;
      if (productId === 'season_pass_premium') {
        const pass = next.seasonPass ?? DEFAULT_SEASON_PASS_STATE;
        next = { ...next, seasonPass: { ...pass, isPremium: true } };
      }
      return next;
    });

    if (eager.applied && productId === 'season_pass_premium') {
      void analytics.logEvent('season_pass_premium_purchased', {});
    }

    return { grants: eager.grants, applied: eager.applied };
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

  /**
   * One-shot effects (board freeze, score doubler) are stored as expiry
   * timestamps but semantically are "next puzzle" items. GameScreen calls
   * this after dispatching the in-game activation, so the entitlement can't
   * apply twice — the expiry window only exists so an unused purchase
   * survives an app restart.
   */
  const consumeTemporaryEntitlement = useCallback((effectId: CommercialEffectId): void => {
    setState((prev) => ({
      ...prev,
      temporaryEntitlements: { ...prev.temporaryEntitlements, [effectId]: 0 },
    }));
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

  // Daily Value Pack drip auto-claim. The pack sells a 7-day daily drip,
  // but no screen or app-open handler ever called claimDailyValuePackDrip —
  // the $0.99 SKU charged real money and delivered nothing (the product has
  // no immediate rewards either). Claim on load, on every foreground, and
  // when a purchase activates the pack (the expiry dep re-fires the
  // effect). The claim itself enforces the once-per-calendar-day and
  // expiry gates, so re-runs are no-ops.
  useEffect(() => {
    if (!loaded) return;

    const runDripClaim = () => {
      if (latestStateRef.current.dailyValuePackExpiry > Date.now()) {
        claimDailyValuePackDrip();
      }
    };

    runDripClaim();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') runDripClaim();
    });
    return () => subscription.remove();
  }, [loaded, state.dailyValuePackExpiry, claimDailyValuePackDrip]);

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

    // Decide claimability synchronously from the latest committed state
    // (the file's latestStateRef pattern, same as canAfford). The previous
    // version derived the return value from a flag mutated inside the
    // setState updater — React only runs updaters eagerly when the queue is
    // empty, and checkVipStreak() just queued one, so on every
    // streak-increment day the claim GRANTED but returned false and the
    // shop showed "Already Claimed" to a paying subscriber. None of the
    // fields read here are touched by checkVipStreak's queued update.
    const cur = latestStateRef.current;
    const claimable =
      cur.isVipSubscriber &&
      cur.vipExpiresAt > Date.now() &&
      cur.vipDailyLastClaim !== today;
    if (!claimable) return false;

    setState((prev) => {
      // Double-grant safety net if state moved between check and commit
      if (!prev.isVipSubscriber || prev.vipExpiresAt <= Date.now()) return prev;
      if (prev.vipDailyLastClaim === today) return prev;

      // Pay the TIER the player bought. This was hardcoded to the weekly
      // tier's 50 gems / 3 hints, so monthly subscribers were shorted 25
      // gems and 2 hints a day and annual subscribers 50 gems and 5 hints —
      // every day of a subscription whose store listing promises the larger
      // number. The tier is recovered from the most recent vip_* purchase
      // record; its declared rewards.dailyDrip is the same source the shop
      // copy renders from, so the promise and the payout cannot diverge.
      const drip = (() => {
        for (let i = prev.purchaseHistory.length - 1; i >= 0; i--) {
          const record = prev.purchaseHistory[i];
          if (typeof record?.item === 'string' && record.item.startsWith('vip_')) {
            const product = getProductById(record.item);
            const declared = product?.rewards?.dailyDrip;
            if (declared) {
              return { gems: declared.gems ?? 0, hintTokens: declared.hintTokens ?? 0 };
            }
            break;
          }
        }
        // No purchase record (e.g. server-side renewal restored the flag
        // without a local record): the weekly tier is the conservative floor.
        return { gems: 50, hintTokens: 3 };
      })();

      return {
        ...prev,
        vipDailyLastClaim: today,
        gems: prev.gems + drip.gems,
        hintTokens: prev.hintTokens + drip.hintTokens,
        totalEarned: {
          ...prev.totalEarned,
          gems: prev.totalEarned.gems + drip.gems,
          hintTokens: prev.totalEarned.hintTokens + drip.hintTokens,
        },
      };
    });

    return true;
  }, [checkVipStreak]);

  const activateStarterPack = useCallback((): void => {
    setState((prev) => ({
      ...prev,
      starterPackExpiresAt: Date.now() + STARTER_PACK_WINDOW_MS,
    }));
  }, []);

  const addLives = useCallback((count: number): void => {
    // Bank accrued refills, then credit — mirrors spendLife's
    // computeRefilledLives-first pattern (see creditLives in economySync).
    setState((prev) => ({
      ...prev,
      lives: creditLives(prev.lives, count),
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
      spendLibraryPoints,
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
      consumeTemporaryEntitlement,
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
      spendLibraryPoints,
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
      consumeTemporaryEntitlement,
    ],
  );

  // Pure-method dispatch bag. State-derived values are NOT included — they're
  // exposed via store selectors (selectLivesCurrent, selectIsAdFreeComputed,
  // selectIsVipActive, etc.) so that consumers reading e.g. coins via a
  // selector don't re-render when undoTokens churns. This memo's identity is
  // stable across normal state churn because every dep is a stable callback;
  // it only changes when one of the underlying useCallback identities does.
  // Widened inline with spendLibraryPoints: EconomyActions is a Pick over
  // EconomyContextType defined in economyStore.ts; the intersection keeps the
  // spend method flowing through the actions bag without loosening the type.
  const actions = useMemo<EconomyActions & Pick<EconomyContextType, 'spendLibraryPoints'>>(
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
      spendLibraryPoints,
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
      consumeTemporaryEntitlement,
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
      spendLibraryPoints,
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
      consumeTemporaryEntitlement,
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
