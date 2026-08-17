/**
 * The reward-inbox sweep credits weekly-leaderboard and club-goal payouts
 * silently on app open; buildInboxRewardCeremony is the visible half. It is
 * display-only (the sweep has already granted), so what matters here is:
 * it fires exactly when something was actually credited, and its label
 * matches the credited totals.
 */
import { buildInboxRewardCeremony } from '../useRewardInbox';

const weekly = (over: Partial<{ coins: number; gems: number; decorations: string[]; label: string }> = {}) => ({
  type: 'weekly_leaderboard' as const,
  label: over.label ?? 'Weekly leaderboard — Gold tier',
  coins: over.coins ?? 500,
  gems: over.gems ?? 10,
  decorations: over.decorations ?? [],
});

const clubGoal = (over: Partial<{ coins: number; gems: number; decorations: string[]; label: string }> = {}) => ({
  type: 'club_goal_complete' as const,
  label: over.label ?? 'Club Word Hunt',
  coins: over.coins ?? 200,
  gems: over.gems ?? 0,
  decorations: over.decorations ?? [],
});

describe('buildInboxRewardCeremony', () => {
  it('returns null for an empty batch or all-zero rewards', () => {
    expect(buildInboxRewardCeremony([])).toBeNull();
    expect(
      buildInboxRewardCeremony([weekly({ coins: 0, gems: 0, decorations: [] })]),
    ).toBeNull();
  });

  it('single reward: uses its own label as the title and sums into rewardLabel', () => {
    const ceremony = buildInboxRewardCeremony([weekly()]);
    expect(ceremony).not.toBeNull();
    expect(ceremony!.type).toBe('inbox_reward');
    expect(ceremony!.data.rewardType).toBe('weekly_leaderboard');
    expect(ceremony!.data.title).toBe('Weekly leaderboard — Gold tier');
    expect(ceremony!.data.rewardLabel).toBe('+500 coins · +10 gems');
  });

  it('aggregates multiple rewards into one ceremony with combined totals', () => {
    const ceremony = buildInboxRewardCeremony([
      weekly({ coins: 500, gems: 10 }),
      clubGoal({ coins: 200 }),
      clubGoal({ coins: 0, gems: 0, decorations: ['deco_fountain'] }),
    ]);
    expect(ceremony).not.toBeNull();
    expect(ceremony!.data.rewardType).toBe('mixed');
    expect(ceremony!.data.title).toBe('3 rewards were waiting for you!');
    expect(ceremony!.data.rewardLabel).toBe('+700 coins · +10 gems · +1 decoration');
  });

  it('same-type batch keeps the specific rewardType for the ribbon', () => {
    const ceremony = buildInboxRewardCeremony([clubGoal(), clubGoal()]);
    expect(ceremony!.data.rewardType).toBe('club_goal_complete');
  });

  it('decorations alone are still worth celebrating', () => {
    const ceremony = buildInboxRewardCeremony([
      clubGoal({ coins: 0, gems: 0, decorations: ['a', 'b'] }),
    ]);
    expect(ceremony).not.toBeNull();
    expect(ceremony!.data.rewardLabel).toBe('+2 decorations');
  });
});
