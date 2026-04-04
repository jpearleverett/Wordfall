import {
  REFERRER_REWARDS,
  REFERRED_REWARDS,
  REFERRAL_MILESTONES,
  generateReferralCode,
  getReferralRewards,
  getReferralMilestones,
  getClaimableMilestones,
  getNextMilestone,
  getNextMilestoneProgress,
} from '../referralSystem';

describe('Referral reward constants', () => {
  it('REFERRER_REWARDS has correct values', () => {
    expect(REFERRER_REWARDS.coins).toBe(1000);
    expect(REFERRER_REWARDS.gems).toBe(20);
  });

  it('REFERRED_REWARDS has correct values', () => {
    expect(REFERRED_REWARDS.coins).toBe(400);
    expect(REFERRED_REWARDS.gems).toBe(10);
    expect(REFERRED_REWARDS.hintTokens).toBe(5);
  });
});

describe('REFERRAL_MILESTONES data', () => {
  it('has 5 milestones', () => {
    expect(REFERRAL_MILESTONES.length).toBe(5);
  });

  it('milestones have ascending counts', () => {
    for (let i = 1; i < REFERRAL_MILESTONES.length; i++) {
      expect(REFERRAL_MILESTONES[i].count).toBeGreaterThan(
        REFERRAL_MILESTONES[i - 1].count,
      );
    }
  });

  it('milestones are at counts 3, 5, 10, 15, 25', () => {
    const counts = REFERRAL_MILESTONES.map((m) => m.count);
    expect(counts).toEqual([3, 5, 10, 15, 25]);
  });

  it('every milestone has required fields', () => {
    for (const m of REFERRAL_MILESTONES) {
      expect(m.count).toBeGreaterThan(0);
      expect(m.label).toBeTruthy();
      expect(m.icon).toBeTruthy();
      expect(m.rewards).toBeDefined();
    }
  });
});

describe('generateReferralCode', () => {
  const VALID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  it('returns a 6-character string', () => {
    const code = generateReferralCode('user123');
    expect(code.length).toBe(6);
  });

  it('is deterministic for the same userId', () => {
    const code1 = generateReferralCode('user123');
    const code2 = generateReferralCode('user123');
    expect(code1).toBe(code2);
  });

  it('only uses valid characters (no I/O/0/1)', () => {
    const codes = [
      generateReferralCode('user1'),
      generateReferralCode('user2'),
      generateReferralCode('testABC'),
      generateReferralCode('longUserId12345'),
    ];
    for (const code of codes) {
      for (const char of code) {
        expect(VALID_CHARS).toContain(char);
      }
    }
  });

  it('generates different codes for different users', () => {
    const code1 = generateReferralCode('alice');
    const code2 = generateReferralCode('bob');
    expect(code1).not.toBe(code2);
  });
});

describe('getReferralRewards', () => {
  it('returns referrer rewards object', () => {
    const rewards = getReferralRewards(1);
    expect(rewards.coins).toBe(1000);
    expect(rewards.gems).toBe(20);
  });

  it('returns same rewards regardless of count', () => {
    const rewards1 = getReferralRewards(1);
    const rewards5 = getReferralRewards(5);
    expect(rewards1).toEqual(rewards5);
  });
});

describe('getReferralMilestones', () => {
  it('returns all milestones', () => {
    const milestones = getReferralMilestones();
    expect(milestones.length).toBe(5);
    expect(milestones).toEqual(REFERRAL_MILESTONES);
  });
});

describe('getClaimableMilestones', () => {
  it('returns no milestones when referralCount is 0', () => {
    const result = getClaimableMilestones(0, []);
    expect(result).toEqual([]);
  });

  it('returns milestone at count 3 when referralCount is 3', () => {
    const result = getClaimableMilestones(3, []);
    expect(result.length).toBe(1);
    expect(result[0].count).toBe(3);
  });

  it('returns multiple milestones when count exceeds several thresholds', () => {
    const result = getClaimableMilestones(10, []);
    expect(result.length).toBe(3); // 3, 5, 10
    expect(result.map((m) => m.count)).toEqual([3, 5, 10]);
  });

  it('excludes already claimed milestones', () => {
    const result = getClaimableMilestones(10, [3, 5]);
    expect(result.length).toBe(1);
    expect(result[0].count).toBe(10);
  });

  it('returns empty when all reached milestones are claimed', () => {
    const result = getClaimableMilestones(10, [3, 5, 10]);
    expect(result).toEqual([]);
  });

  it('returns all milestones when count is 25 and none claimed', () => {
    const result = getClaimableMilestones(25, []);
    expect(result.length).toBe(5);
  });
});

describe('getNextMilestone', () => {
  it('returns first milestone when referralCount is 0', () => {
    const next = getNextMilestone(0);
    expect(next).not.toBeNull();
    expect(next!.count).toBe(3);
  });

  it('returns milestone at 5 when referralCount is 3', () => {
    const next = getNextMilestone(3);
    expect(next).not.toBeNull();
    expect(next!.count).toBe(5);
  });

  it('returns milestone at 5 when referralCount is 4', () => {
    const next = getNextMilestone(4);
    expect(next).not.toBeNull();
    expect(next!.count).toBe(5);
  });

  it('returns null when all milestones are reached', () => {
    const next = getNextMilestone(25);
    expect(next).toBeNull();
  });

  it('returns null when count exceeds all milestones', () => {
    const next = getNextMilestone(100);
    expect(next).toBeNull();
  });
});

describe('getNextMilestoneProgress', () => {
  it('returns progress toward first milestone', () => {
    const progress = getNextMilestoneProgress(1);
    expect(progress.current).toBe(1);
    expect(progress.next).toBe(3);
    expect(progress.progress).toBeCloseTo(1 / 3);
  });

  it('returns 0 progress at start', () => {
    const progress = getNextMilestoneProgress(0);
    expect(progress.current).toBe(0);
    expect(progress.next).toBe(3);
    expect(progress.progress).toBe(0);
  });

  it('returns progress between milestones (3 to 5)', () => {
    const progress = getNextMilestoneProgress(4);
    expect(progress.current).toBe(4);
    expect(progress.next).toBe(5);
    // Range is 5-3 = 2, progress is 4-3 = 1, so 1/2
    expect(progress.progress).toBeCloseTo(0.5);
  });

  it('returns 100% progress when all milestones reached', () => {
    const progress = getNextMilestoneProgress(25);
    expect(progress.progress).toBe(1);
  });

  it('returns 100% progress when count exceeds all milestones', () => {
    const progress = getNextMilestoneProgress(50);
    expect(progress.current).toBe(50);
    expect(progress.progress).toBe(1);
  });
});
