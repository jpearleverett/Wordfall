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

interface InboxEconomyActions {
  addCoins: (n: number) => void;
  addGems: (n: number) => void;
}

interface InboxPlayerActions {
  unlockDecoration: (decorationId: string) => void;
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
        void analytics.logEvent('inbox_reward_claimed', {
          reward_type: reward.type,
          coins: reward.coins,
          gems: reward.gems,
          decorations: reward.decorations.length,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
