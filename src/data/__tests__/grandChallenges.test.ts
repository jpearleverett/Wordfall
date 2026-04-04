import {
  GRAND_CHALLENGES,
  isGrandChallengeAvailable,
  generateActiveGrandChallenges,
  GrandChallenge,
} from '../grandChallenges';

describe('GRAND_CHALLENGES data', () => {
  it('contains exactly 10 challenges', () => {
    expect(GRAND_CHALLENGES.length).toBe(10);
  });

  it('every challenge has a unique id', () => {
    const ids = GRAND_CHALLENGES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every challenge has required fields', () => {
    for (const challenge of GRAND_CHALLENGES) {
      expect(challenge.id).toBeTruthy();
      expect(challenge.name).toBeTruthy();
      expect(challenge.description).toBeTruthy();
      expect(challenge.icon).toBeTruthy();
      expect(challenge.durationDays).toBeGreaterThan(0);
      expect(challenge.target).toBeGreaterThan(0);
      expect(challenge.trackingKey).toBeTruthy();
      expect(['normal', 'hard', 'legendary']).toContain(challenge.difficulty);
    }
  });

  it('every challenge has positive coin and gem rewards', () => {
    for (const challenge of GRAND_CHALLENGES) {
      expect(challenge.reward.coins).toBeGreaterThan(0);
      expect(challenge.reward.gems).toBeGreaterThan(0);
    }
  });

  it('has challenges of all three difficulty tiers', () => {
    const difficulties = new Set(GRAND_CHALLENGES.map((c) => c.difficulty));
    expect(difficulties.has('normal')).toBe(true);
    expect(difficulties.has('hard')).toBe(true);
    expect(difficulties.has('legendary')).toBe(true);
  });

  it('legendary challenges have cosmetic rewards', () => {
    const legendary = GRAND_CHALLENGES.filter(
      (c) => c.difficulty === 'legendary',
    );
    expect(legendary.length).toBeGreaterThan(0);
    for (const challenge of legendary) {
      expect(challenge.reward.cosmetic).toBeTruthy();
    }
  });
});

describe('isGrandChallengeAvailable', () => {
  const normalChallenge = GRAND_CHALLENGES.find(
    (c) => c.difficulty === 'normal',
  )!;
  const hardChallenge = GRAND_CHALLENGES.find(
    (c) => c.difficulty === 'hard',
  )!;
  const legendaryChallenge = GRAND_CHALLENGES.find(
    (c) => c.difficulty === 'legendary',
  )!;

  it('normal challenges are always available', () => {
    expect(isGrandChallengeAvailable(normalChallenge, 1)).toBe(true);
    expect(isGrandChallengeAvailable(normalChallenge, 10)).toBe(true);
    expect(isGrandChallengeAvailable(normalChallenge, 50)).toBe(true);
  });

  it('hard challenges require level 15', () => {
    expect(isGrandChallengeAvailable(hardChallenge, 1)).toBe(false);
    expect(isGrandChallengeAvailable(hardChallenge, 14)).toBe(false);
    expect(isGrandChallengeAvailable(hardChallenge, 15)).toBe(true);
    expect(isGrandChallengeAvailable(hardChallenge, 30)).toBe(true);
  });

  it('legendary challenges require level 30', () => {
    expect(isGrandChallengeAvailable(legendaryChallenge, 1)).toBe(false);
    expect(isGrandChallengeAvailable(legendaryChallenge, 15)).toBe(false);
    expect(isGrandChallengeAvailable(legendaryChallenge, 29)).toBe(false);
    expect(isGrandChallengeAvailable(legendaryChallenge, 30)).toBe(true);
    expect(isGrandChallengeAvailable(legendaryChallenge, 50)).toBe(true);
  });
});

describe('generateActiveGrandChallenges', () => {
  it('returns 2 challenges for low-level players', () => {
    const challenges = generateActiveGrandChallenges(5);
    expect(challenges.length).toBe(2);
  });

  it('returns 2 challenges for players below level 30', () => {
    const challenges = generateActiveGrandChallenges(29);
    expect(challenges.length).toBe(2);
  });

  it('returns 3 challenges for level 30+ players', () => {
    const challenges = generateActiveGrandChallenges(30);
    expect(challenges.length).toBe(3);
  });

  it('returns 3 challenges for high-level players', () => {
    const challenges = generateActiveGrandChallenges(50);
    expect(challenges.length).toBe(3);
  });

  it('only returns challenges available for the player level', () => {
    const challenges = generateActiveGrandChallenges(10);
    for (const challenge of challenges) {
      expect(isGrandChallengeAvailable(challenge, 10)).toBe(true);
    }
  });

  it('level 1 player only gets normal difficulty challenges', () => {
    const challenges = generateActiveGrandChallenges(1);
    for (const challenge of challenges) {
      expect(challenge.difficulty).toBe('normal');
    }
  });

  it('returns valid GrandChallenge objects', () => {
    const challenges = generateActiveGrandChallenges(30);
    for (const challenge of challenges) {
      expect(challenge.id).toBeTruthy();
      expect(challenge.name).toBeTruthy();
      expect(challenge.target).toBeGreaterThan(0);
      expect(challenge.reward.coins).toBeGreaterThan(0);
    }
  });
});
