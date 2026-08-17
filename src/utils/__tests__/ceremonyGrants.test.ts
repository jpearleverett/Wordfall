/**
 * A CEREMONY'S DISPLAYED REWARD MUST BE THE REWARD THAT WAS PAID.
 *
 * Streak milestones and Atlas completions rendered "+coins / +gems" numbers
 * that no code path credited, and the win-streak tier table was defined and
 * never paid at all. A full-screen celebration of currency the player did
 * not receive is worse than none — anyone who checks their balance concludes
 * the game stole from them.
 *
 * Grants now happen when a ceremony is POPPED for display (pop removes it
 * from the persisted queue, so exactly-once), driven by this pure function.
 * These tests pin the amounts to the same tables the ceremonies display
 * from, and pin the exclusion list — types whose flows already grant would
 * double-pay if this function returned amounts for them.
 */
import { ceremonyEconomyGrant, ceremonyGrantLabel } from '../ceremonyGrants';
import { STREAK } from '../../constants';
import { WIN_STREAK_TIERS } from '../../data/eventLayers';
import { ATLAS_PAGES } from '../../data/collections';
import type { CeremonyItem } from '../../types';

describe('streak milestones pay what the table shows', () => {
  it.each(Object.entries(STREAK.milestoneRewards))('%s-day milestone', (days, reward) => {
    const ceremony: CeremonyItem = {
      type: 'streak_milestone',
      data: { streakCount: Number(days), reward },
    };
    const grant = ceremonyEconomyGrant(ceremony);
    // StreakMilestoneCeremony renders these exact fields; the grant must
    // match them or the celebration lies.
    expect(grant).not.toBeNull();
    expect(grant!.coins).toBe(reward.coins);
    expect(grant!.gems).toBe(reward.gems);
  });
});

describe('atlas completion pays the page reward', () => {
  it.each(ATLAS_PAGES.map((p) => [p.id, p] as const))('%s', (_id, page) => {
    const ceremony: CeremonyItem = {
      type: 'collection_complete',
      data: { icon: page.icon, name: page.category, reward: page.reward },
    };
    const grant = ceremonyEconomyGrant(ceremony);
    expect(grant).not.toBeNull();
    expect(grant!.coins).toBe(page.reward.coins ?? 0);
    expect(grant!.gems).toBe(page.reward.gems ?? 0);
    expect(grant!.hintTokens).toBe(page.reward.hintTokens ?? 0);
  });
});

describe('win-streak milestones pay the tier table', () => {
  // The milestones PlayerContext queues ceremonies for. Every one must have
  // a tier behind it, or the celebration pays nothing again.
  const CEREMONY_MILESTONES = [3, 5, 7, 10, 15, 20];

  it.each(CEREMONY_MILESTONES)('streak %d has a paying tier', (streak) => {
    const ceremony: CeremonyItem = {
      type: 'win_streak_milestone',
      data: { streak, label: 'x' },
    };
    const grant = ceremonyEconomyGrant(ceremony);
    expect(grant).not.toBeNull();
    const tier = WIN_STREAK_TIERS.find((t) => t.streak === streak)!;
    expect(tier).toBeDefined();
    expect(grant!.coins).toBe(tier.reward.coins ?? 0);
    expect(grant!.gems).toBe(tier.reward.gems ?? 0);
    expect(grant!.hintTokens).toBe(tier.reward.hints ?? 0);
    expect(grant!.rareTile).toBe(tier.reward.rareTile === true);
  });

  it('a streak with no tier grants nothing rather than guessing', () => {
    const grant = ceremonyEconomyGrant({
      type: 'win_streak_milestone',
      data: { streak: 4, label: 'x' },
    });
    expect(grant).toBeNull();
  });
});

describe('wing restoration pays its bonus', () => {
  it('grants the 1000c/25g the ceremony displays', () => {
    const grant = ceremonyEconomyGrant({
      type: 'wing_complete',
      data: { wingId: 'nature', wingName: 'Nature', reward: { coins: 1000, gems: 25 } },
    });
    expect(grant).toEqual({ coins: 1000, gems: 25, hintTokens: 0, rareTile: false });
  });

  it('a legacy queued ceremony without a reward grants nothing', () => {
    // Ceremonies queued before this fix are still in players' persisted
    // queues with only {wingId, wingName} — they must show without paying
    // rather than NaN-ing.
    expect(
      ceremonyEconomyGrant({ type: 'wing_complete', data: { wingId: 'arts', wingName: 'arts' } }),
    ).toBeNull();
  });
});

describe('types whose own flows already grant are excluded', () => {
  // Granting any of these here would double-pay:
  // daily_quest_claim is credited at claim time in App.tsx; the wheel
  // jackpot is credited by the spin flow; the rest display no amounts.
  const EXCLUDED: CeremonyItem[] = [
    { type: 'daily_quest_claim', data: { reward: { coins: 999, gems: 99 } } },
    { type: 'mystery_wheel_jackpot', data: { reward: { coins: 999 } } },
    { type: 'first_win', data: { coins: 100 } },
    { type: 'mode_unlock', data: {} },
    { type: 'feature_unlock', data: {} },
    { type: 'achievement', data: { reward: { coins: 200, gems: 5 } } },
  ];

  it.each(EXCLUDED.map((c) => [c.type, c] as const))('%s', (_type, ceremony) => {
    expect(ceremonyEconomyGrant(ceremony)).toBeNull();
  });
});

describe('defensive shapes', () => {
  it('missing reward data grants nothing instead of NaN', () => {
    expect(ceremonyEconomyGrant({ type: 'streak_milestone', data: {} })).toBeNull();
    expect(ceremonyEconomyGrant({ type: 'collection_complete', data: {} })).toBeNull();
  });

  it('an all-zero reward is null, not a zero-grant', () => {
    expect(
      ceremonyEconomyGrant({ type: 'streak_milestone', data: { reward: {} } }),
    ).toBeNull();
  });
});

describe('the label matches the grant', () => {
  it('formats every non-zero component and only those', () => {
    expect(ceremonyGrantLabel({ coins: 200, gems: 3, hintTokens: 0, rareTile: false })).toBe(
      '+200 coins · +3 gems',
    );
    expect(ceremonyGrantLabel({ coins: 0, gems: 20, hintTokens: 1, rareTile: true })).toBe(
      '+20 gems · +1 hint · +1 rare tile',
    );
  });
});
