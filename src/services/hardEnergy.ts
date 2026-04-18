import { getRemoteBoolean } from './remoteConfig';

/**
 * Hard-energy decision site — Remote Config flag accessor only.
 *
 * The full integration (life debit, regen, NoLivesModal, ad-credit) lives in
 * `src/hooks/useHardEnergy.ts`, which composes this flag with EconomyContext
 * lives state. Components and screens should use that hook, not the helpers
 * below — those exist as a non-React entry point for service-layer code that
 * needs a quick canPlay check without a hook.
 *
 * Default OFF in Remote Config. Flipping the flag enables the hook's life
 * debit path; soft-energy (coins/gems) economy continues to run unchanged.
 */

export function isHardEnergyEnabled(): boolean {
  return getRemoteBoolean('hardEnergyEnabled');
}

/**
 * Non-hook canPlay check for service-layer callers. React components should
 * use `useHardEnergy()` instead, which actually debits a life via
 * `economy.spendLife()`. This stub returns `canPlay: true` whenever the
 * flag is off (the production case today) and conservatively allows play
 * when on — the hook is the source of truth for life accounting.
 */
export function tryStartLevel(): { canPlay: boolean; livesRemaining?: number } {
  if (!isHardEnergyEnabled()) return { canPlay: true };
  return { canPlay: true };
}

/**
 * Non-hook level-failed signal. The real life debit happens in
 * `useHardEnergy.startLevel()` via `economy.spendLife()` — this stub is a
 * no-op kept for any service-layer caller that wants to fire-and-forget.
 */
export function onLevelFailed(): void {
  if (!isHardEnergyEnabled()) return;
}

/**
 * Non-hook next-life accessor. Components should read
 * `useHardEnergy().nextLifeAtMs` instead, which threads through
 * `economy.nextLifeTime`. Returns null here because the service layer has
 * no EconomyContext access.
 */
export function getNextLifeAtMs(): number | null {
  return null;
}
