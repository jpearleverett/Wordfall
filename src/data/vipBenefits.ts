/**
 * VIP subscription retention system.
 *
 * Defines escalating streak bonuses for consecutive weeks of VIP subscription,
 * giving subscribers increasing reasons to maintain their subscription over time.
 * Addresses the D90+ retention gap where VIP subscribers churn after 2-3 weeks.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VipStreakBonus {
  weeksRequired: number;
  label: string;
  bonusGems: number;
  bonusHints: number;
  extraReward?: { type: string; id?: string };
}

// ─── Streak bonus tiers ──────────────────────────────────────────────────────

export const VIP_STREAK_BONUSES: VipStreakBonus[] = [
  { weeksRequired: 1, label: 'VIP Welcome', bonusGems: 10, bonusHints: 1 },
  { weeksRequired: 2, label: 'Loyal Member', bonusGems: 25, bonusHints: 2 },
  { weeksRequired: 4, label: 'Dedicated VIP', bonusGems: 50, bonusHints: 5, extraReward: { type: 'frame', id: 'vip_silver' } },
  { weeksRequired: 8, label: 'Elite VIP', bonusGems: 100, bonusHints: 10, extraReward: { type: 'frame', id: 'vip_gold' } },
  { weeksRequired: 12, label: 'VIP Champion', bonusGems: 150, bonusHints: 15, extraReward: { type: 'title', id: 'vip_champion' } },
  { weeksRequired: 26, label: 'VIP Legend', bonusGems: 250, bonusHints: 25, extraReward: { type: 'decoration', id: 'vip_trophy' } },
];

// ─── Helper functions ────────────────────────────────────────────────────────

/**
 * Get the highest VIP streak bonus the player has reached.
 * Returns null if the player hasn't reached any milestone yet.
 */
export function getVipStreakBonus(weeks: number): VipStreakBonus | null {
  let best: VipStreakBonus | null = null;
  for (const bonus of VIP_STREAK_BONUSES) {
    if (weeks >= bonus.weeksRequired) {
      best = bonus;
    }
  }
  return best;
}

/**
 * Get the next VIP streak milestone the player is working toward.
 * Returns null if they've reached the highest tier.
 */
export function getNextVipStreakMilestone(weeks: number): VipStreakBonus | null {
  for (const bonus of VIP_STREAK_BONUSES) {
    if (weeks < bonus.weeksRequired) {
      return bonus;
    }
  }
  return null;
}

/**
 * Get progress toward the next VIP streak milestone.
 * Returns { current, next, progress } where progress is 0-1.
 */
export function getVipStreakProgress(weeks: number): { current: number; next: number; progress: number } {
  const nextMilestone = getNextVipStreakMilestone(weeks);
  if (!nextMilestone) {
    // Already at max tier
    const lastTier = VIP_STREAK_BONUSES[VIP_STREAK_BONUSES.length - 1];
    return { current: weeks, next: lastTier.weeksRequired, progress: 1 };
  }

  // Find the previous milestone to calculate relative progress
  let prevWeeks = 0;
  for (const bonus of VIP_STREAK_BONUSES) {
    if (bonus.weeksRequired >= nextMilestone.weeksRequired) break;
    prevWeeks = bonus.weeksRequired;
  }

  const range = nextMilestone.weeksRequired - prevWeeks;
  const elapsed = weeks - prevWeeks;
  return {
    current: weeks,
    next: nextMilestone.weeksRequired,
    progress: range > 0 ? Math.min(elapsed / range, 1) : 1,
  };
}
