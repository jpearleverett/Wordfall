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
  coins: 500,
  gems: 10,
} as const;

/** Rewards the referred player receives on signup */
export const REFERRED_REWARDS = {
  coins: 200,
  gems: 5,
  hintTokens: 3,
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
