// ─── Referral System ────────────────────────────────────────────────────────
// Generates referral codes, defines reward tiers, and tracks milestones.

export interface ReferralMilestone {
  /** Number of successful referrals required */
  count: number;
  /** Reward label shown in UI */
  label: string;
  /** Icon emoji */
  icon: string;
  /** Rewards granted */
  rewards: {
    coins?: number;
    gems?: number;
    cosmeticId?: string;
    cosmeticType?: 'frame' | 'title';
  };
}

// ─── Reward Constants ───────────────────────────────────────────────────────

/** Rewards the referrer receives per successful referral (friend completes 1st puzzle) */
export const REFERRER_REWARDS = {
  coins: 1000,
  gems: 20,
} as const;

/** Rewards the referred player receives on signup */
export const REFERRED_REWARDS = {
  coins: 400,
  gems: 10,
  hintTokens: 5,
} as const;

// ─── Milestones ─────────────────────────────────────────────────────────────

export const REFERRAL_MILESTONES: ReferralMilestone[] = [
  {
    count: 3,
    label: 'Social Spark',
    icon: '🔥',
    rewards: { coins: 1000 },
  },
  {
    count: 5,
    label: 'Social Butterfly',
    icon: '🦋',
    rewards: { cosmeticId: 'frame_social_butterfly', cosmeticType: 'frame' },
  },
  {
    count: 10,
    label: 'The Networker',
    icon: '🌐',
    rewards: { cosmeticId: 'title_networker', cosmeticType: 'title' },
  },
  {
    count: 15,
    label: 'The Ambassador',
    icon: '🏅',
    rewards: { coins: 5000, cosmeticId: 'title_ambassador', cosmeticType: 'title' },
  },
  {
    count: 25,
    label: 'Referral Champion',
    icon: '🏆',
    rewards: { coins: 10000, gems: 200, cosmeticId: 'frame_referral_champion', cosmeticType: 'frame' },
  },
];

// ─── Code Generation ────────────────────────────────────────────────────────

/**
 * Generates a deterministic 6-character alphanumeric referral code from a user ID.
 * Uses a simple hash to produce a stable, short code.
 */
export function generateReferralCode(userId: string): string {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0; // 32-bit int
  }
  // Use absolute value and convert to base-CHARS string
  hash = Math.abs(hash);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[hash % CHARS.length];
    hash = Math.floor(hash / CHARS.length) + (i + 1) * 7; // mix in position
  }
  return code;
}

// ─── Reward Helpers ─────────────────────────────────────────────────────────

/**
 * Returns the referrer per-referral rewards (constant).
 */
export function getReferralRewards(_count: number) {
  return { ...REFERRER_REWARDS };
}

/**
 * Returns all milestone definitions.
 */
export function getReferralMilestones(): ReferralMilestone[] {
  return REFERRAL_MILESTONES;
}

/**
 * Returns unclaimed milestones that the player has reached.
 */
export function getClaimableMilestones(
  referralCount: number,
  claimedMilestones: number[],
): ReferralMilestone[] {
  return REFERRAL_MILESTONES.filter(
    (m) => referralCount >= m.count && !claimedMilestones.includes(m.count),
  );
}

/**
 * Returns the next milestone the player is working toward, or null if all are claimed.
 */
export function getNextMilestone(
  referralCount: number,
): ReferralMilestone | null {
  return REFERRAL_MILESTONES.find((m) => referralCount < m.count) ?? null;
}

/**
 * Returns progress information toward the next milestone for UI display.
 * If all milestones are reached, returns progress as 1 (100%).
 */
export function getNextMilestoneProgress(
  referralCount: number,
): { current: number; next: number; progress: number } {
  const nextMilestone = getNextMilestone(referralCount);
  if (!nextMilestone) {
    // All milestones reached
    const lastCount = REFERRAL_MILESTONES[REFERRAL_MILESTONES.length - 1]?.count ?? 0;
    return { current: referralCount, next: lastCount, progress: 1 };
  }
  // Find the previous milestone count (or 0 if this is the first)
  const milestoneIndex = REFERRAL_MILESTONES.indexOf(nextMilestone);
  const prevCount = milestoneIndex > 0 ? REFERRAL_MILESTONES[milestoneIndex - 1].count : 0;
  const range = nextMilestone.count - prevCount;
  const progressInRange = referralCount - prevCount;
  return {
    current: referralCount,
    next: nextMilestone.count,
    progress: range > 0 ? Math.min(progressInRange / range, 1) : 0,
  };
}
