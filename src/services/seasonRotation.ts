/**
 * seasonRotation.ts — detects season expiry and resets the season pass state.
 *
 * Called on app foreground / mount. If `seasonEndDate` is in the past, we
 * archive the old season's claim history into analytics and reset the pass
 * to a fresh `DEFAULT_SEASON_PASS_STATE` derived from `getCurrentSeason()`.
 *
 * Claim history is intentionally *not* persisted across seasons — a new
 * season starts everyone at tier 0 with empty `claimedFreeTiers` /
 * `claimedPremiumTiers`. The analytics event captures the archive for
 * post-mortem dashboarding.
 */
import {
  DEFAULT_SEASON_PASS_STATE,
  SeasonPassState,
  getCurrentSeason,
} from '../data/seasonPass';
import { analytics } from './analytics';

export interface SeasonRotationResult {
  /** True when the current season has expired and a reset is needed. */
  expired: boolean;
  /** The fresh season state to install if `expired`. Null otherwise. */
  nextSeason: SeasonPassState | null;
}

/**
 * Compare the stored season's end date to `now`. If the season has expired
 * AND the current calendar season differs from the stored one, return the
 * new default state for the caller to apply via `resetSeasonPass()`.
 */
export function checkSeasonExpiry(
  current: SeasonPassState,
  now: number = Date.now(),
): SeasonRotationResult {
  const endMs = new Date(current.seasonEndDate).getTime();
  if (!Number.isFinite(endMs) || endMs > now) {
    return { expired: false, nextSeason: null };
  }

  const newSeason = getCurrentSeason();
  if (newSeason.id === current.seasonId) {
    // Same season still active (clock skew or end-date-at-midnight edge); skip.
    return { expired: false, nextSeason: null };
  }

  void analytics.logEvent('season_pass_season_rolled', {
    from_season: current.seasonId,
    to_season: newSeason.id,
    final_tier: current.currentTier,
    final_xp: current.currentXP,
    free_claimed: current.claimedFreeTiers.length,
    premium_claimed: current.claimedPremiumTiers.length,
    was_premium: current.isPremium,
  });

  return {
    expired: true,
    nextSeason: {
      ...DEFAULT_SEASON_PASS_STATE,
      seasonId: newSeason.id,
      seasonStartDate: newSeason.startDate,
      seasonEndDate: newSeason.endDate,
    },
  };
}
