/**
 * Claim-on-app-open reader for the server-granted reward-inbox types no
 * dedicated surface covers:
 *   - weekly_leaderboard   (distributeWeeklyRewards, Sunday close)
 *   - club_goal_complete   (onPuzzleComplete personal club-goal payouts)
 *
 * Referral and shared-goal rewards have their own claim UIs. These two
 * were written by the server and read by NO client query, so the grants
 * sat invisible and unclaimable forever (`claimed:false`, and clients
 * cannot delete inbox docs).
 *
 * Claim protocol: flip `claimed:true` FIRST — firestore.rules permit only
 * the unclaimed → claimed transition touching nothing else, so when two
 * devices race exactly one update succeeds — then credit the local economy
 * from the doc amounts. A per-uid ref keeps this to one sweep per app run;
 * the server-side flip is what makes the grant exactly-once.
 */
import { useEffect, useRef } from 'react';
import { firestoreService } from '../services/firestore';
import { analytics } from '../services/analytics';
import { CeremonyItem } from '../types';

interface InboxEconomyActions {
  addCoins: (n: number) => void;
  addGems: (n: number) => void;
}

interface InboxPlayerActions {
  unlockDecoration: (decorationId: string) => void;
  queueCeremony: (ceremony: CeremonyItem) => void;
}

interface ClaimedInboxReward {
  type: 'weekly_leaderboard' | 'club_goal_complete';
  label: string;
  coins: number;
  gems: number;
  decorations: string[];
}

/**
 * Pure builder for the post-sweep celebration ceremony. Exported for tests.
 * Returns null when the claimed batch carries nothing worth celebrating
 * (all-zero amounts and no decorations).
 */
export function buildInboxRewardCeremony(
  claimed: ClaimedInboxReward[],
): CeremonyItem | null {
  const coins = claimed.reduce((sum, r) => sum + r.coins, 0);
  const gems = claimed.reduce((sum, r) => sum + r.gems, 0);
  const decorations = claimed.reduce((sum, r) => sum + r.decorations.length, 0);
  if (coins <= 0 && gems <= 0 && decorations <= 0) return null;

  const labelParts: string[] = [];
  if (coins > 0) labelParts.push(`+${coins.toLocaleString()} coins`);
  if (gems > 0) labelParts.push(`+${gems.toLocaleString()} gems`);
  if (decorations > 0) {
    labelParts.push(`+${decorations} decoration${decorations > 1 ? 's' : ''}`);
  }

  const types = new Set(claimed.map((r) => r.type));
  const single = claimed.length === 1 ? claimed[0] : null;
  const rewardType = types.size === 1 ? claimed[0].type : 'mixed';

  return {
    type: 'inbox_reward',
    data: {
      rewardType,
      icon:
        rewardType === 'weekly_leaderboard'
          ? '\u{1F3C6}'
          : rewardType === 'club_goal_complete'
            ? '\u{1F3E0}'
            : '\u{1F4E5}',
      title: single
        ? single.label
        : `${claimed.length} rewards were waiting for you!`,
      description: single
        ? 'Your reward has been added to your stash.'
        : 'Rewards you earned while you were away have been added to your stash.',
      rewardLabel: labelParts.join(' · '),
    },
  };
}

export function useRewardInboxClaim(
  userId: string | null | undefined,
  economy: InboxEconomyActions,
  player: InboxPlayerActions,
): void {
  const sweptForUid = useRef<string | null>(null);
  // Latest-action refs so the sweep effect doesn't re-run when the context
  // value objects are recreated on unrelated renders.
  const economyRef = useRef(economy);
  const playerRef = useRef(player);
  useEffect(() => {
    economyRef.current = economy;
    playerRef.current = player;
  }, [economy, player]);

  useEffect(() => {
    if (!userId || sweptForUid.current === userId) return;
    if (!firestoreService.isAvailable()) return;
    sweptForUid.current = userId;
    let cancelled = false;

    (async () => {
      const pending = await firestoreService.getPendingInboxRewards(userId);
      const claimed: typeof pending = [];
      for (const reward of pending) {
        if (cancelled) return;
        const won = await firestoreService.markInboxRewardClaimed(userId, reward.id);
        // false = another device claimed it first (or we're offline) — the
        // grant must not happen here or it would double-pay.
        if (!won) continue;
        if (reward.coins > 0) economyRef.current.addCoins(reward.coins);
        if (reward.gems > 0) economyRef.current.addGems(reward.gems);
        for (const decorationId of reward.decorations) {
          playerRef.current.unlockDecoration(decorationId);
        }
        claimed.push(reward);
        void analytics.logEvent('inbox_reward_claimed', {
          reward_type: reward.type,
          coins: reward.coins,
          gems: reward.gems,
          decorations: reward.decorations.length,
        });
      }

      // Surface what was credited. One ceremony per sweep: a single reward
      // shows its own label; several collapse into an aggregate so a player
      // returning after a long gap isn't stacked with modals. Display-only —
      // the amounts above are already granted, so `inbox_reward` is on the
      // ceremonyEconomyGrant exclusion list.
      if (claimed.length > 0 && !cancelled) {
        const ceremony = buildInboxRewardCeremony(claimed);
        if (ceremony) playerRef.current.queueCeremony(ceremony);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
