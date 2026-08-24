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
    count: 1,
    label: 'First Friend',
    icon: '🤝',
    rewards: { coins: 200, gems: 10 },
  },
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
 *
 * The code is a pure function of a 31-bit hash, and the 6-char space is only
 * ~2^30, so DISTINCT uids collide at birthday-problem rates — a collision is
 * expected, not exceptional, at scale. The `referralCodes/{code}` index doc
 * pins each code to the first uid that registered it (Firestore rules reject
 * a second owner), so a collision left undetected silently credits every
 * referral to the stranger who registered the code first.
 *
 * `salt` exists for the collision-retry protocol: when the upsert of the
 * salt-0 code is rejected because the doc belongs to another uid, the caller
 * regenerates with salt 1, 2, ... (each salt yields an independent code),
 * persists the first code it successfully registers, and shares only that
 * one. salt 0 (the default) is byte-identical to the historical output so
 * every already-registered code, share link, and locally cached
 * `player.referralCode` stays valid.
 */
export function generateReferralCode(userId: string, salt: number = 0): string {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  // salt > 0 re-hashes uid + salt so each retry lands on an unrelated code;
  // salt <= 0 hashes the bare uid, preserving the legacy mapping exactly.
  const source = salt > 0 ? `${userId}#${salt}` : userId;
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source.charCodeAt(i);
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

/**
 * How many salted regenerations the registration retry may attempt before
 * giving up for the session (it retries again on next app open). Collisions
 * are rare per-user, so consecutive collisions across several independent
 * codes almost certainly mean something other than bad luck (e.g. offline).
 */
export const REFERRAL_CODE_MAX_REGEN_ATTEMPTS = 5;

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
