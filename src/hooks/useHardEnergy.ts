/**
 * useHardEnergy — Phase 4B flip-on hook.
 *
 * Composes `EconomyContext` lives + Remote Config `hardEnergyEnabled` into a
 * minimal surface the GameScreen can call on board start and failure.
 *
 * While the flag is false (default) every method is a no-op that reports
 * `canPlay: true`. Once a Remote Config experiment flips it on for a cohort,
 * `startLevel()` debits a life (via `economy.spendLife()`) and returns
 * `{ started: false }` when no lives remain, so the UI can surface
 * `NoLivesModal`.
 */
import { useCallback } from 'react';
import {
  useEconomyActions,
  useEconomyStore,
  selectLivesCurrent,
  selectNextLifeTime,
} from '../stores/economyStore';
import { LIVES } from '../constants';
import { getRemoteBoolean } from '../services/remoteConfig';

export interface HardEnergySnapshot {
  enabled: boolean;
  canPlay: boolean;
  livesRemaining: number;
  livesMax: number;
  /** Epoch ms at which the next life refills, or null when full / disabled. */
  nextLifeAtMs: number | null;
  /** Gem cost for a full refill (from `LIVES.gemRefillCost`). */
  gemRefillCost: number;
}

export interface HardEnergyApi extends HardEnergySnapshot {
  /**
   * Attempt to start a level. When hard energy is on and no lives are
   * available, returns `{ started: false }` — the caller should open
   * `NoLivesModal`. Otherwise debits a life (when enabled) and returns
   * `{ started: true }`.
   */
  startLevel: () => { started: boolean };
  /** Buy a full refill with gems (forwards to `economy.refillLives`). */
  refillWithGems: () => boolean;
  /** Credit one life from a rewarded-ad reward. Caps at `LIVES.max`. */
  creditAdLife: () => void;
}

export function useHardEnergy(): HardEnergyApi {
  // Narrow zustand subscriptions replace the full `useEconomy()` read so
  // life ticks / coin / VIP / season-pass mutations no longer re-render
  // callers of this hook (GameScreenWrapper + NoLivesModal).
  const livesCurrent = useEconomyStore(selectLivesCurrent);
  const nextLifeTime = useEconomyStore(selectNextLifeTime);
  const { spendLife, refillLives, addLives } = useEconomyActions();
  const enabled = getRemoteBoolean('hardEnergyEnabled');

  const livesRemaining = enabled ? livesCurrent : LIVES.max;
  const canPlay = !enabled || livesRemaining > 0;
  const nextLifeAtMs = enabled ? nextLifeTime : null;

  const startLevel = useCallback((): { started: boolean } => {
    if (!enabled) return { started: true };
    const ok = spendLife();
    return { started: ok };
  }, [enabled, spendLife]);

  const refillWithGems = useCallback((): boolean => {
    if (!enabled) return false;
    return refillLives();
  }, [enabled, refillLives]);

  const creditAdLife = useCallback((): void => {
    if (!enabled) return;
    addLives(1);
  }, [enabled, addLives]);

  return {
    enabled,
    canPlay,
    livesRemaining,
    livesMax: LIVES.max,
    nextLifeAtMs,
    gemRefillCost: LIVES.gemRefillCost,
    startLevel,
    refillWithGems,
    creditAdLife,
  };
}
