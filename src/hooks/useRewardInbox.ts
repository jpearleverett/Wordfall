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
 * Claim protocol: journal the reward durably, flip `claimed:true` —
 * firestore.rules permit only the unclaimed → claimed transition touching
 * nothing else, so when two devices race exactly one update succeeds —
 * then credit the local economy from the doc amounts and mark the journal
 * entry credited. A per-uid ref keeps this to one sweep per app run; the
 * server-side flip is what keeps the claim to one device.
 *
 * The journal exists because the server flip is irreversible while the
 * local credit only becomes durable after EconomyContext's ~1s debounced
 * persist: a crash in that window used to destroy the reward outright
 * (claimed:true, never credited, never re-swept). Each sweep first
 * replays journal entries whose claim landed but whose credit never did —
 * see `planJournalReplay` for the exact decision table.
 */
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { firestoreService } from '../services/firestore';
import { analytics } from '../services/analytics';
import { logger } from '../utils/logger';
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

// ─── Crash-safety journal ────────────────────────────────────────────────────

const CLAIM_JOURNAL_KEY = '@wordfall_inbox_claim_journal';
/** Entries for a signed-out uid wait this long for that account's return. */
const JOURNAL_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** One in-flight claim, written durably BEFORE the irreversible server flip. */
export interface InboxClaimJournalEntry {
  id: string;
  uid: string;
  type: 'weekly_leaderboard' | 'club_goal_complete';
  label: string;
  coins: number;
  gems: number;
  decorations: string[];
  /** True once the amounts were applied to the in-memory economy. */
  credited: boolean;
  at: number;
}

async function readJournal(): Promise<InboxClaimJournalEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(CLAIM_JOURNAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as InboxClaimJournalEntry[]) : [];
  } catch (e) {
    logger.warn('[rewardInbox] journal read failed:', e);
    return [];
  }
}

/** Returns false on storage failure so callers can refuse to claim unjournaled. */
async function writeJournal(entries: InboxClaimJournalEntry[]): Promise<boolean> {
  try {
    if (entries.length === 0) {
      await AsyncStorage.removeItem(CLAIM_JOURNAL_KEY);
    } else {
      await AsyncStorage.setItem(CLAIM_JOURNAL_KEY, JSON.stringify(entries));
    }
    return true;
  } catch (e) {
    logger.warn('[rewardInbox] journal write failed:', e);
    return false;
  }
}

/**
 * Decide what to do with journal entries surviving from a previous run.
 * Pure; exported for tests.
 *
 *  - other uid            → keep (replay when that account returns), unless stale
 *  - credited already     → drop (applied in an earlier session; its persist
 *                           has had a full session + app restart to flush)
 *  - still pending server → drop (our claim never landed — the normal claim
 *                           loop will claim + credit it exactly once)
 *  - otherwise            → replay CANDIDATE: likely the claim landed (the
 *                           doc can never be re-swept) and the credit died
 *                           un-persisted. The sweep still verifies the
 *                           doc's own claimed flag before paying, because
 *                           a FAILED pending query also returns [] and
 *                           absence from it alone is not proof.
 */
export function planJournalReplay(
  entries: InboxClaimJournalEntry[],
  uid: string,
  pendingIds: ReadonlySet<string>,
  now: number = Date.now(),
): { credit: InboxClaimJournalEntry[]; keep: InboxClaimJournalEntry[] } {
  const credit: InboxClaimJournalEntry[] = [];
  const keep: InboxClaimJournalEntry[] = [];
  for (const entry of entries) {
    if (entry.uid !== uid) {
      if (now - entry.at < JOURNAL_MAX_AGE_MS) keep.push(entry);
      continue;
    }
    if (entry.credited) continue;
    if (pendingIds.has(entry.id)) continue;
    credit.push(entry);
  }
  return { credit, keep };
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
      const pendingIds = new Set(pending.map((r) => r.id));
      const claimed: ClaimedInboxReward[] = [];

      // Replay pass: credit journal entries whose claim landed in a previous
      // run but whose credit never reached disk. Credit-then-mark ordering —
      // dying between the two replays the still-unflushed credit next open,
      // instead of dropping a marked-but-unpersisted one.
      const replayPlan = planJournalReplay(await readJournal(), userId, pendingIds);
      let journal = [...replayPlan.keep, ...replayPlan.credit];
      // Compact away dropped entries (credited / back-in-pending) eagerly.
      await writeJournal(journal);
      for (const entry of replayPlan.credit) {
        if (cancelled) return;
        // Verify against the reward doc itself before paying: only its own
        // claimed:true proves a previous run burned the claim.
        let claimedOnServer: boolean | null | undefined;
        try {
          const snap = await getDoc(doc(db, 'users', userId, 'rewards', entry.id));
          claimedOnServer = snap.exists() ? snap.data()?.claimed === true : null;
        } catch {
          claimedOnServer = undefined; // unreadable (offline)
        }
        if (claimedOnServer === undefined || claimedOnServer === false) {
          // Offline, or still unclaimed (the pending query must have
          // failed) — keep the entry and retry on a later open.
          continue;
        }
        if (claimedOnServer === null) {
          // Doc gone: no claim can ever have landed on it — nothing owed.
          journal = journal.filter((e) => e !== entry);
          await writeJournal(journal);
          continue;
        }
        if (entry.coins > 0) economyRef.current.addCoins(entry.coins);
        if (entry.gems > 0) economyRef.current.addGems(entry.gems);
        for (const decorationId of entry.decorations ?? []) {
          playerRef.current.unlockDecoration(decorationId);
        }
        entry.credited = true;
        await writeJournal(journal);
        claimed.push({
          type: entry.type,
          label: entry.label,
          coins: entry.coins,
          gems: entry.gems,
          decorations: entry.decorations ?? [],
        });
        void analytics.logEvent('inbox_reward_claimed', {
          reward_type: entry.type,
          coins: entry.coins,
          gems: entry.gems,
          decorations: (entry.decorations ?? []).length,
          replayed: 1,
        });
      }

      for (const reward of pending) {
        if (cancelled) return;
        // Journal the intent durably BEFORE the irreversible server flip so
        // a crash between the claim ack and the debounced economy persist is
        // replayed on the next open instead of destroying the reward. If the
        // journal itself cannot be written, leave the reward unclaimed — it
        // stays pending server-side and is retried on the next open.
        const entry: InboxClaimJournalEntry = {
          id: reward.id,
          uid: userId,
          type: reward.type,
          label: reward.label,
          coins: reward.coins,
          gems: reward.gems,
          decorations: reward.decorations,
          credited: false,
          at: Date.now(),
        };
        journal = [...journal, entry];
        if (!(await writeJournal(journal))) {
          journal = journal.filter((e) => e !== entry);
          continue;
        }
        const won = await firestoreService.markInboxRewardClaimed(userId, reward.id);
        // false = another device claimed it first (or we're offline) — the
        // grant must not happen here or it would double-pay.
        if (!won) {
          journal = journal.filter((e) => e !== entry);
          await writeJournal(journal);
          continue;
        }
        if (reward.coins > 0) economyRef.current.addCoins(reward.coins);
        if (reward.gems > 0) economyRef.current.addGems(reward.gems);
        for (const decorationId of reward.decorations) {
          playerRef.current.unlockDecoration(decorationId);
        }
        // Credit-then-mark (see replay pass); the credited entry is dropped
        // by the next sweep's replay plan once it has provably outlived the
        // persist debounce.
        entry.credited = true;
        await writeJournal(journal);
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
