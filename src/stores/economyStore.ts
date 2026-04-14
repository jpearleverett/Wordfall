/**
 * economyStore.ts — zustand vanilla store mirror of EconomyContext state.
 *
 * Same rationale as playerStore.ts: today every useEconomy() consumer
 * re-renders on every economy change. Subscribe via
 * `useEconomyStore(selectCoins)` to re-render only when that slice changes.
 *
 * Source of truth remains the Provider's useState. The Provider mirrors
 * `state` into this store via `useEffect([state])`. The 1s persistence
 * debounce, 60s `computeRefilledLives` tick, AppState flush, VIP composition,
 * and one-time `migrateLegacyEntitlements` guard all keep their original
 * semantics because they continue to react to the React state.
 */
import { createContext, useContext } from 'react';
import { createStore, useStore } from 'zustand';
import type { EconomyState, EconomyContextType } from '../contexts/EconomyContext';
import { isTemporaryEntitlementActive } from '../services/commercialEntitlements';
import { computeRefilledLives } from '../utils/lives';
import { LIVES } from '../constants';

// ── Store ────────────────────────────────────────────────────────────────────

export type EconomyStore = ReturnType<typeof createEconomyStore>;

export const createEconomyStore = (initial: EconomyState) =>
  createStore<EconomyState>()(() => initial);

export const EconomyStoreContext = createContext<EconomyStore | null>(null);

export function useEconomyStore<T>(selector: (s: EconomyState) => T): T {
  const store = useContext(EconomyStoreContext);
  if (!store) {
    throw new Error('useEconomyStore must be used inside <EconomyProvider>');
  }
  return useStore(store, selector);
}

// ── Actions ──────────────────────────────────────────────────────────────────

/**
 * Pure dispatch surface. ONLY methods — no state-derived values — so the
 * actions object identity stays stable across normal state churn (currency
 * adds, life ticks, etc.). Read state via useEconomyStore selectors.
 *
 * Computed values previously exposed on the context (`lives`, `isAdFree`,
 * `isVip`, `nextLifeTime`, `starterPackAvailable`, `vipExpiresAt`,
 * `isPremiumPass`, `dailyValuePackExpiry`, `undoTokens`, `totalEarned`,
 * `purchaseHistory`) live in the store; use the corresponding selectors
 * (e.g. `selectLivesCurrent`, `selectIsAdFreeComputed`).
 */
export type EconomyActions = Pick<
  EconomyContextType,
  | 'addCoins'
  | 'spendCoins'
  | 'addGems'
  | 'spendGems'
  | 'addHintTokens'
  | 'spendHintToken'
  | 'addEventStars'
  | 'addLibraryPoints'
  | 'canAfford'
  | 'spendLife'
  | 'refillLives'
  | 'getTimeUntilNextLife'
  | 'processAdReward'
  | 'processPurchase'
  | 'applyValidatedPurchase'
  | 'activateStarterPack'
  | 'addUndoTokens'
  | 'spendUndoToken'
  | 'addBoosterToken'
  | 'spendBoosterToken'
  | 'claimDailyValuePackDrip'
  | 'claimVipDailyRewards'
  | 'checkVipStreak'
  | 'claimVipStreakBonus'
  | 'addLives'
  | 'hasTemporaryEntitlement'
  | 'getTemporaryEntitlementExpiry'
  | 'grantTemporaryEntitlement'
> & { loaded: boolean };

export const EconomyActionsContext = createContext<EconomyActions | null>(null);

export function useEconomyActions(): EconomyActions {
  const a = useContext(EconomyActionsContext);
  if (!a) {
    throw new Error('useEconomyActions must be used inside <EconomyProvider>');
  }
  return a;
}

// ── Pre-built selectors (raw state slices) ───────────────────────────────────

export const selectCoins             = (s: EconomyState) => s.coins;
export const selectGems              = (s: EconomyState) => s.gems;
export const selectHintTokens        = (s: EconomyState) => s.hintTokens;
export const selectEventStars        = (s: EconomyState) => s.eventStars;
export const selectLibraryPoints     = (s: EconomyState) => s.libraryPoints;
export const selectBoosterTokens     = (s: EconomyState) => s.boosterTokens;
export const selectUndoTokens        = (s: EconomyState) => s.undoTokens;

export const selectLivesData         = (s: EconomyState) => s.lives;
export const selectTotalEarned       = (s: EconomyState) => s.totalEarned;
export const selectPurchaseHistory   = (s: EconomyState) => s.purchaseHistory;

export const selectIsAdFreeFlag      = (s: EconomyState) => s.isAdFreeFlag;
export const selectIsPremiumPassFlag = (s: EconomyState) => s.isPremiumPassFlag;
export const selectIsVipSubscriber   = (s: EconomyState) => s.isVipSubscriber;
export const selectVipExpiresAt      = (s: EconomyState) => s.vipExpiresAt;
export const selectVipDailyLastClaim = (s: EconomyState) => s.vipDailyLastClaim;
export const selectVipStreakWeeks    = (s: EconomyState) => s.vipStreakWeeks;
export const selectVipStreakBonusClaimed = (s: EconomyState) => s.vipStreakBonusClaimed;
export const selectStarterPackExpiresAt = (s: EconomyState) => s.starterPackExpiresAt;
export const selectDailyValuePackExpiry = (s: EconomyState) => s.dailyValuePackExpiry;
export const selectTemporaryEntitlements = (s: EconomyState) =>
  s.temporaryEntitlements;

// ── Composite/computed selectors ─────────────────────────────────────────────
// `Date.now()` makes these time-sensitive: the value only changes when the
// next render reads it AND state has changed. Same idempotency guarantee as
// the existing useMemo-based context. Use the action-context computed values
// (`isAdFree`, `isVip`, `lives`, `nextLifeTime`) when you need something
// that's already derived in the Provider.

export const selectIsVipActive = (s: EconomyState) =>
  s.isVipSubscriber && s.vipExpiresAt > Date.now();

export const selectIsAdFreeComputed = (s: EconomyState) =>
  s.isAdFreeFlag
  || (s.isVipSubscriber && s.vipExpiresAt > Date.now())
  || isTemporaryEntitlementActive(s.temporaryEntitlements, 'vip_experience');

export const selectStarterPackAvailable = (s: EconomyState) =>
  s.starterPackExpiresAt > Date.now();

/** Lives.current after refill compute (matches EconomyContext.value.lives). */
export const selectLivesCurrent = (s: EconomyState) =>
  computeRefilledLives(s.lives).current;

/** Timestamp at which the next life will refill, or null if at max. */
export const selectNextLifeTime = (s: EconomyState) => {
  const refilled = computeRefilledLives(s.lives);
  return refilled.current < LIVES.max
    ? s.lives.lastRefillTime + LIVES.refillMinutes * 60 * 1000
    : null;
};
