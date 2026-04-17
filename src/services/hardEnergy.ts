import { getRemoteBoolean } from './remoteConfig';

/**
 * Hard-energy system entry point.
 *
 * Shipped in Phase 4B as a Remote-Config-gated A/B with default OFF. While
 * the flag is false the module is a pure no-op; no lives are consumed and
 * the existing soft-energy (coins/gems) economy runs unchanged.
 *
 * The flip-on work in a later phase will add:
 *  - lives / livesMax / livesRegenAt to EconomyContext
 *  - a NoLivesModal with rewarded-ad / gem-refill / clubmate-ask paths
 *  - regen cadence (1/30min, cap 5) + server-truth Firestore sync
 *
 * Keeping the decision site (`isHardEnergyEnabled()`) centralized means we
 * can flip the flag in Remote Config during soft launch without re-deploy.
 */

export function isHardEnergyEnabled(): boolean {
  return getRemoteBoolean('hardEnergyEnabled');
}

/**
 * Called when a player taps "Play" on a level. Under soft energy this is a
 * no-op. Under hard energy it would consume one life and return false if
 * the player is out. Today, always returns `{ canPlay: true }` because the
 * flag is off and we have no lives state yet.
 */
export function tryStartLevel(): { canPlay: boolean; livesRemaining?: number } {
  if (!isHardEnergyEnabled()) return { canPlay: true };
  // TODO(phase-4B-flip): read economy lives + consume one. Treat 0 lives as
  // canPlay=false so the caller can present NoLivesModal.
  return { canPlay: true };
}

/**
 * Called on level failure under hard energy to cost the player a life.
 * Under soft energy this is a no-op.
 */
export function onLevelFailed(): void {
  if (!isHardEnergyEnabled()) return;
  // TODO(phase-4B-flip): debit one life, persist timestamp for regen countdown.
}

/**
 * Time-of-next-life accessor used by NoLivesModal once it ships. Until then
 * we return null so callers can treat "no info" as "soft energy active".
 */
export function getNextLifeAtMs(): number | null {
  return null;
}
