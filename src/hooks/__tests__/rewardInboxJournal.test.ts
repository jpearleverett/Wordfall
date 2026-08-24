/**
 * planJournalReplay — the crash-recovery half of the inbox claim protocol.
 *
 * The server-side claimed flip is irreversible and the local credit only
 * becomes durable after EconomyContext's ~1s debounced persist, so a crash
 * between the two used to destroy the reward (claimed:true, never credited,
 * never re-swept). The journal is written before the flip; this plan decides,
 * on the next sweep, which surviving entries must be credited exactly once.
 */
import { planJournalReplay, InboxClaimJournalEntry } from '../useRewardInbox';

const entry = (
  over: Partial<InboxClaimJournalEntry> = {},
): InboxClaimJournalEntry => ({
  id: over.id ?? 'reward_1',
  uid: over.uid ?? 'uid_A',
  type: over.type ?? 'weekly_leaderboard',
  label: over.label ?? 'Weekly leaderboard — Gold tier',
  coins: over.coins ?? 500,
  gems: over.gems ?? 10,
  decorations: over.decorations ?? [],
  credited: over.credited ?? false,
  at: over.at ?? Date.now(),
});

describe('planJournalReplay', () => {
  it('credits an uncredited entry whose reward is no longer pending (claim landed, credit lost)', () => {
    const plan = planJournalReplay([entry()], 'uid_A', new Set());
    expect(plan.credit).toHaveLength(1);
    expect(plan.credit[0].id).toBe('reward_1');
    expect(plan.keep).toHaveLength(0);
  });

  it('drops an entry whose reward is still pending server-side — the claim never landed and the normal loop owns it', () => {
    const plan = planJournalReplay([entry()], 'uid_A', new Set(['reward_1']));
    expect(plan.credit).toHaveLength(0);
    expect(plan.keep).toHaveLength(0);
  });

  it('drops an already-credited entry instead of paying it twice', () => {
    const plan = planJournalReplay([entry({ credited: true })], 'uid_A', new Set());
    expect(plan.credit).toHaveLength(0);
    expect(plan.keep).toHaveLength(0);
  });

  it('replaying the same surviving entry across restarts credits at most once', () => {
    // Open 1 crashes after crediting the replay (entry marked credited).
    const first = planJournalReplay([entry()], 'uid_A', new Set());
    expect(first.credit).toHaveLength(1);
    const afterCredit = { ...first.credit[0], credited: true };
    // Open 2 sees the credited marker and never credits again.
    const second = planJournalReplay([afterCredit], 'uid_A', new Set());
    expect(second.credit).toHaveLength(0);
    expect(second.keep).toHaveLength(0);
  });

  it("keeps another uid's fresh entry for that account's return, without crediting it", () => {
    const other = entry({ uid: 'uid_B' });
    const plan = planJournalReplay([other], 'uid_A', new Set());
    expect(plan.credit).toHaveLength(0);
    expect(plan.keep).toEqual([other]);
  });

  it("expires another uid's entry after the max age", () => {
    const now = Date.now();
    const stale = entry({ uid: 'uid_B', at: now - 31 * 24 * 60 * 60 * 1000 });
    const plan = planJournalReplay([stale], 'uid_A', new Set(), now);
    expect(plan.credit).toHaveLength(0);
    expect(plan.keep).toHaveLength(0);
  });

  it('handles a mixed journal in one pass', () => {
    const toCredit = entry({ id: 'r_lost' });
    const stillPending = entry({ id: 'r_pending' });
    const alreadyCredited = entry({ id: 'r_done', credited: true });
    const foreign = entry({ id: 'r_other', uid: 'uid_B' });
    const plan = planJournalReplay(
      [toCredit, stillPending, alreadyCredited, foreign],
      'uid_A',
      new Set(['r_pending']),
    );
    expect(plan.credit.map((e) => e.id)).toEqual(['r_lost']);
    expect(plan.keep.map((e) => e.id)).toEqual(['r_other']);
  });
});
