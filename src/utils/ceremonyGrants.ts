/**
 * The economy grant a ceremony's displayed reward corresponds to.
 *
 * A ceremony presents a reward the game has ALREADY given — that is the
 * contract the rest of this branch works to. Three ceremony types broke it:
 * streak milestones and Atlas collection completions rendered "+500 coins /
 * +10 gems" numbers that no code path credited, and win-streak milestones
 * had a whole reward table (WIN_STREAK_TIERS) defined and never paid. The
 * player was shown a full-screen celebration of currency they did not get,
 * which is worse than no celebration: anyone who checks their balance
 * concludes the game stole from them.
 *
 * This is a pure function so the grant and the display can be driven from
 * the SAME source: App.tsx applies it when a ceremony is popped for showing
 * (pop removes it from the persisted queue, so the grant is exactly-once),
 * and the router can render a reward label from it. Types deliberately NOT
 * handled here because their reward is granted by their own flow already —
 * granting them again would double-pay:
 *   - daily_quest_claim   → claimDailyQuest returns the reward to App.tsx,
 *                           which credits it at claim time
 *   - mystery_wheel_jackpot → the wheel spin flow grants the segment
 *   - season_pass_complete / feature unlocks → no currency amounts are
 *                           displayed
 *   - inbox_reward        → useRewardInboxClaim credits the amounts at the
 *                           rules-enforced unclaimed→claimed transition and
 *                           only then queues the ceremony (display-only)
 */
import { CeremonyItem } from '../types';
import { WIN_STREAK_TIERS } from '../data/eventLayers';

export interface CeremonyGrant {
  coins: number;
  gems: number;
  hintTokens: number;
  rareTile: boolean;
}

function normalize(reward: {
  coins?: number;
  gems?: number;
  hintTokens?: number;
  hints?: number;
  rareTile?: boolean;
}): CeremonyGrant {
  return {
    coins: reward.coins ?? 0,
    gems: reward.gems ?? 0,
    // The win-streak table calls them `hints`, everything else `hintTokens`.
    hintTokens: reward.hintTokens ?? reward.hints ?? 0,
    rareTile: reward.rareTile === true,
  };
}

function isEmpty(grant: CeremonyGrant): boolean {
  return grant.coins === 0 && grant.gems === 0 && grant.hintTokens === 0 && !grant.rareTile;
}

/**
 * Escalating flawless-streak milestone rewards. Fixed table through 20,
 * then a repeating grant every 10 (30/40/50…) so the ladder never dead-ends
 * at "Max milestone reached!".
 */
export function flawlessMilestoneGrant(streak: number): CeremonyGrant | null {
  const fixed: Record<number, { coins: number; gems: number }> = {
    3: { coins: 50, gems: 0 },
    5: { coins: 100, gems: 5 },
    7: { coins: 150, gems: 10 },
    10: { coins: 300, gems: 20 },
    15: { coins: 500, gems: 30 },
    20: { coins: 800, gems: 50 },
  };
  const entry =
    fixed[streak] ??
    (streak > 20 && streak % 10 === 0 ? { coins: 400, gems: 25 } : null);
  if (!entry) return null;
  return normalize(entry);
}

/** Returns the amounts to credit for this ceremony, or null when nothing is owed. */
export function ceremonyEconomyGrant(ceremony: CeremonyItem): CeremonyGrant | null {
  switch (ceremony.type) {
    case 'streak_milestone': {
      const reward = ceremony.data?.reward;
      if (!reward) return null;
      const grant = normalize(reward);
      return isEmpty(grant) ? null : grant;
    }
    case 'wing_complete': {
      // Restoring a library wing (all 5 of its chapters). The 1000c/25g
      // bonus was authored in a method nothing called; the reachable
      // detection path queued the ceremony with no reward at all.
      const reward = ceremony.data?.reward;
      if (!reward) return null;
      const grant = normalize(reward);
      return isEmpty(grant) ? null : grant;
    }
    case 'collection_complete': {
      const reward = ceremony.data?.reward;
      if (!reward) return null;
      const grant = normalize(reward);
      return isEmpty(grant) ? null : grant;
    }
    case 'flawless_streak_milestone': {
      // The headline dopamine system used to celebrate with NOTHING attached
      // — full-screen ceremony, zero currency. Escalating grants, resolved
      // from the milestone here so display and credit share one source.
      // Milestones are re-earnable per streak run (rewardsClaimed resets on
      // break), so amounts are tuned as "nice", not "jackpot".
      const grant = flawlessMilestoneGrant(Number(ceremony.data?.streak) || 0);
      return grant && !isEmpty(grant) ? grant : null;
    }
    case 'quest_step_complete': {
      // Seasonal quest step rewards used to be credited in the router's
      // onDismiss — a swipe-away or process death between pop and dismiss
      // silently ate the reward, and a re-rendered dismiss could double-pay.
      // Pop-time grant here makes it exactly-once like every other type.
      const grant = normalize({
        coins: Number(ceremony.data?.rewardCoins) || 0,
        gems: Number(ceremony.data?.rewardGems) || 0,
      });
      return isEmpty(grant) ? null : grant;
    }
    case 'win_streak_milestone': {
      // The ceremony carries only {streak, label}; the amounts live in the
      // tier table. Looking them up here means the grant and any displayed
      // label cannot disagree. (Tier 2 in that table has no matching
      // ceremony milestone and remains unpaid dead data — documented in
      // eventLayers, not silently granted here.)
      const tier = WIN_STREAK_TIERS.find((t) => t.streak === ceremony.data?.streak);
      if (!tier) return null;
      const grant = normalize(tier.reward);
      return isEmpty(grant) ? null : grant;
    }
    default:
      return null;
  }
}

/** Short human label for a grant, e.g. "+200 coins · +3 gems". */
export function ceremonyGrantLabel(grant: CeremonyGrant): string {
  const parts: string[] = [];
  if (grant.coins > 0) parts.push(`+${grant.coins} coins`);
  if (grant.gems > 0) parts.push(`+${grant.gems} gems`);
  if (grant.hintTokens > 0) parts.push(`+${grant.hintTokens} hint${grant.hintTokens > 1 ? 's' : ''}`);
  if (grant.rareTile) parts.push('+1 rare tile');
  return parts.join(' · ');
}
