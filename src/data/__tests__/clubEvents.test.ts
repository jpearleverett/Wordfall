import {
  CLUB_GOAL_TEMPLATES,
  CLUB_LEADERBOARD_REWARDS,
  generateClubGoal,
  getClubGoalProgress,
  getReachedTiers,
  getClubGoalTimeRemaining,
  formatTimeRemaining,
  getClubLeaderboardReward,
  ClubGoalContribution,
} from '../clubEvents';

describe('CLUB_GOAL_TEMPLATES data', () => {
  it('contains exactly 8 templates', () => {
    expect(CLUB_GOAL_TEMPLATES.length).toBe(8);
  });

  it('every template has required fields', () => {
    for (const template of CLUB_GOAL_TEMPLATES) {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.icon).toBeTruthy();
      expect(template.baseTarget).toBeGreaterThan(0);
      expect(template.trackingKey).toBeTruthy();
      expect([3, 7]).toContain(template.durationDays);
    }
  });

  it('every template has unique id', () => {
    const ids = CLUB_GOAL_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every template has exactly 3 reward tiers (bronze, silver, gold)', () => {
    for (const template of CLUB_GOAL_TEMPLATES) {
      expect(template.rewardTiers).toHaveLength(3);
      expect(template.rewardTiers[0].tier).toBe('bronze');
      expect(template.rewardTiers[1].tier).toBe('silver');
      expect(template.rewardTiers[2].tier).toBe('gold');
    }
  });

  it('reward tier thresholds are ascending', () => {
    for (const template of CLUB_GOAL_TEMPLATES) {
      expect(template.rewardTiers[0].threshold).toBeLessThan(template.rewardTiers[1].threshold);
      expect(template.rewardTiers[1].threshold).toBeLessThan(template.rewardTiers[2].threshold);
    }
  });

  it('gold tier rewards include an exclusive frame', () => {
    for (const template of CLUB_GOAL_TEMPLATES) {
      const goldTier = template.rewardTiers.find(t => t.tier === 'gold')!;
      expect(goldTier.rewards.exclusiveFrame).toBeTruthy();
    }
  });
});

describe('CLUB_LEADERBOARD_REWARDS data', () => {
  it('contains exactly 5 reward tiers', () => {
    expect(CLUB_LEADERBOARD_REWARDS.length).toBe(5);
  });

  it('every reward has coins and gems', () => {
    for (const reward of CLUB_LEADERBOARD_REWARDS) {
      expect(reward.coins).toBeGreaterThan(0);
      expect(reward.gems).toBeGreaterThan(0);
      expect(reward.rankRange).toHaveLength(2);
      expect(reward.rankRange[0]).toBeLessThanOrEqual(reward.rankRange[1]);
    }
  });

  it('rank 1 has an exclusive frame', () => {
    expect(CLUB_LEADERBOARD_REWARDS[0].exclusiveFrame).toBeTruthy();
  });
});

describe('generateClubGoal', () => {
  it('returns a valid ActiveClubGoal', () => {
    const goal = generateClubGoal('bronze', 10);
    expect(goal.goalId).toBeTruthy();
    expect(goal.template).toBeDefined();
    expect(goal.target).toBeGreaterThan(0);
    expect(goal.startDate).toBeTruthy();
    expect(goal.endDate).toBeTruthy();
    expect(goal.contributions).toEqual([]);
    expect(goal.rewardsClaimed).toEqual([]);
  });

  it('scales target with member count', () => {
    const smallClub = generateClubGoal('bronze', 5);
    const largeClub = generateClubGoal('bronze', 20);
    // Same tier, same template (deterministic by date) => larger club has higher target
    expect(largeClub.target).toBeGreaterThan(smallClub.target);
  });

  it('scales target with club tier', () => {
    const bronzeGoal = generateClubGoal('bronze', 10);
    const diamondGoal = generateClubGoal('diamond', 10);
    // Diamond tier multiplier is higher
    expect(diamondGoal.target).toBeGreaterThanOrEqual(bronzeGoal.target);
  });
});

describe('getClubGoalProgress', () => {
  it('sums contributions correctly', () => {
    const contributions: ClubGoalContribution[] = [
      { userId: 'a', displayName: 'Alice', avatarId: '1', amount: 50 },
      { userId: 'b', displayName: 'Bob', avatarId: '2', amount: 30 },
      { userId: 'c', displayName: 'Charlie', avatarId: '3', amount: 20 },
    ];
    const progress = getClubGoalProgress(contributions);
    expect(progress.total).toBe(100);
    expect(progress.contributorCount).toBe(3);
  });

  it('sorts contributors by amount descending', () => {
    const contributions: ClubGoalContribution[] = [
      { userId: 'a', displayName: 'Alice', avatarId: '1', amount: 10 },
      { userId: 'b', displayName: 'Bob', avatarId: '2', amount: 50 },
      { userId: 'c', displayName: 'Charlie', avatarId: '3', amount: 30 },
    ];
    const progress = getClubGoalProgress(contributions);
    expect(progress.topContributors[0].displayName).toBe('Bob');
    expect(progress.topContributors[1].displayName).toBe('Charlie');
    expect(progress.topContributors[2].displayName).toBe('Alice');
  });

  it('returns top 3 contributors even with more than 3', () => {
    const contributions: ClubGoalContribution[] = [
      { userId: 'a', displayName: 'A', avatarId: '1', amount: 10 },
      { userId: 'b', displayName: 'B', avatarId: '2', amount: 20 },
      { userId: 'c', displayName: 'C', avatarId: '3', amount: 30 },
      { userId: 'd', displayName: 'D', avatarId: '4', amount: 40 },
      { userId: 'e', displayName: 'E', avatarId: '5', amount: 50 },
    ];
    const progress = getClubGoalProgress(contributions);
    expect(progress.topContributors).toHaveLength(3);
    expect(progress.contributorCount).toBe(5);
  });

  it('handles empty contributions', () => {
    const progress = getClubGoalProgress([]);
    expect(progress.total).toBe(0);
    expect(progress.topContributors).toEqual([]);
    expect(progress.contributorCount).toBe(0);
  });
});

describe('getReachedTiers', () => {
  it('returns empty array when no tiers are reached', () => {
    const goal = generateClubGoal('bronze', 10);
    const reached = getReachedTiers(goal, 0);
    expect(reached).toEqual([]);
  });

  it('returns bronze when progress passes bronze threshold', () => {
    const goal = generateClubGoal('bronze', 10);
    // Bronze threshold is 0.5 = 50% of target
    const bronzeProgress = goal.target * 0.5;
    const reached = getReachedTiers(goal, bronzeProgress);
    expect(reached).toContain('bronze');
  });

  it('returns all tiers when progress meets target', () => {
    const goal = generateClubGoal('bronze', 10);
    const reached = getReachedTiers(goal, goal.target);
    expect(reached).toContain('bronze');
    expect(reached).toContain('silver');
    expect(reached).toContain('gold');
    expect(reached).toHaveLength(3);
  });

  it('returns bronze and silver but not gold at 75%', () => {
    const goal = generateClubGoal('bronze', 10);
    const progress = goal.target * 0.75;
    const reached = getReachedTiers(goal, progress);
    expect(reached).toContain('bronze');
    expect(reached).toContain('silver');
    expect(reached).not.toContain('gold');
  });
});

describe('formatTimeRemaining', () => {
  it('returns "Ended" for 0 ms', () => {
    expect(formatTimeRemaining(0)).toBe('Ended');
  });

  it('returns "Ended" for negative ms', () => {
    expect(formatTimeRemaining(-1000)).toBe('Ended');
  });

  it('returns "Xd Xh" format for 24+ hours', () => {
    const ms = 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000; // 2d 5h
    expect(formatTimeRemaining(ms)).toBe('2d 5h');
  });

  it('returns "Xh Xm" format for less than 24 hours', () => {
    const ms = 5 * 60 * 60 * 1000 + 30 * 60 * 1000; // 5h 30m
    expect(formatTimeRemaining(ms)).toBe('5h 30m');
  });

  it('returns "1d 0h" for exactly 24 hours', () => {
    const ms = 24 * 60 * 60 * 1000;
    expect(formatTimeRemaining(ms)).toBe('1d 0h');
  });
});

describe('getClubLeaderboardReward', () => {
  it('rank 1 gets the champion reward with exclusive frame', () => {
    const reward = getClubLeaderboardReward(1);
    expect(reward).not.toBeNull();
    expect(reward!.exclusiveFrame).toBe('frame_club_champion');
    expect(reward!.coins).toBeGreaterThan(0);
    expect(reward!.gems).toBeGreaterThan(0);
  });

  it('rank 50 gets the last tier reward', () => {
    const reward = getClubLeaderboardReward(50);
    expect(reward).not.toBeNull();
    expect(reward!.coins).toBeGreaterThan(0);
  });

  it('rank 51 returns null', () => {
    expect(getClubLeaderboardReward(51)).toBeNull();
  });

  it('rank 100 returns null', () => {
    expect(getClubLeaderboardReward(100)).toBeNull();
  });

  it('ranks within each range get the correct reward', () => {
    // Rank 2-3 should get same reward
    const rank2 = getClubLeaderboardReward(2);
    const rank3 = getClubLeaderboardReward(3);
    expect(rank2).toEqual(rank3);

    // Rank 4-10 should get same reward
    const rank4 = getClubLeaderboardReward(4);
    const rank10 = getClubLeaderboardReward(10);
    expect(rank4).toEqual(rank10);
  });
});

describe('getClubGoalTimeRemaining', () => {
  it('returns 0 for past dates', () => {
    const pastDate = '2020-01-01';
    expect(getClubGoalTimeRemaining(pastDate)).toBe(0);
  });

  it('returns positive value for future dates', () => {
    const futureDate = '2030-12-31';
    expect(getClubGoalTimeRemaining(futureDate)).toBeGreaterThan(0);
  });
});
