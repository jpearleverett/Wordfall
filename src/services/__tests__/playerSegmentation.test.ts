import {
  computeSegments,
  getPersonalizedOfferTiming,
  getPersonalizedDifficulty,
  getPersonalizedHomeContent,
  getPersonalizedNotifications,
  getRecommendedMode,
  getWelcomeBackMessage,
  DEFAULT_SEGMENTS,
  SegmentationInput,
  PlayerSegments,
} from '../playerSegmentation';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function makeInput(overrides: Partial<SegmentationInput> = {}): SegmentationInput {
  const todayStr = today();
  return {
    puzzlesSolved: 50,
    currentLevel: 15,
    highestLevel: 15,
    totalStars: 100,
    starsByLevel: { 1: 3, 2: 2, 3: 3, 4: 2, 5: 3 },
    perfectSolves: 5,
    dailyLoginDates: [todayStr, daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4)],
    lastActiveDate: todayStr,
    dailyCompleted: [todayStr],
    atlasPages: { page1: ['WORD', 'TEST'] },
    rareTilesCount: 3,
    restoredWings: [],
    clubId: null,
    friendIds: [],
    hintGiftsSentToday: 0,
    tileGiftsSentToday: 0,
    unlockedModes: ['classic', 'daily'],
    modeStats: { classic: { played: 40, bestScore: 5000, wins: 35 } },
    achievementIds: [],
    tooltipsShown: [],
    totalSpendCents: 0,
    wordsFoundTotal: 200,
    modesPlayedThisWeek: ['classic'],
    sharesCount: 0,
    ...overrides,
  };
}

function makeSegments(overrides: Partial<PlayerSegments> = {}): PlayerSegments {
  return {
    engagement: 'regular',
    skill: 'intermediate',
    spending: 'non_payer',
    motivations: [],
    computedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── computeSegments ──────────────────────────────────────────────────────────

describe('computeSegments', () => {
  it('classifies new_player with 0 puzzles and 1 login', () => {
    const input = makeInput({
      puzzlesSolved: 0,
      currentLevel: 1,
      highestLevel: 1,
      totalStars: 0,
      dailyLoginDates: [today()],
      lastActiveDate: today(),
    });
    const segments = computeSegments(input);
    expect(segments.engagement).toBe('new_player');
    expect(segments.skill).toBe('beginner');
  });

  it('classifies lapsed player (last active 10 days ago)', () => {
    const input = makeInput({
      lastActiveDate: daysAgo(10),
      dailyLoginDates: [daysAgo(10), daysAgo(11)],
    });
    const segments = computeSegments(input);
    expect(segments.engagement).toBe('lapsed');
  });

  it('classifies casual player (few sessions, low puzzles per session)', () => {
    const input = makeInput({
      puzzlesSolved: 6,
      dailyLoginDates: [today(), daysAgo(1), daysAgo(4)],
      lastActiveDate: today(),
    });
    const segments = computeSegments(input);
    expect(segments.engagement).toBe('casual');
  });

  it('classifies regular player (4+ sessions in 7 days, 5+ puzzles/session)', () => {
    const input = makeInput({
      puzzlesSolved: 50,
      dailyLoginDates: [
        today(), daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4),
        daysAgo(5), daysAgo(6), daysAgo(7), daysAgo(8), daysAgo(9),
      ],
      lastActiveDate: today(),
    });
    const segments = computeSegments(input);
    expect(['regular', 'hardcore']).toContain(segments.engagement);
  });

  it('classifies hardcore player (6+ sessions, 10+ puzzles/session)', () => {
    const input = makeInput({
      puzzlesSolved: 100,
      dailyLoginDates: [
        today(), daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4),
        daysAgo(5), daysAgo(6),
      ],
      lastActiveDate: today(),
    });
    const segments = computeSegments(input);
    expect(segments.engagement).toBe('hardcore');
  });

  it('classifies spending segments correctly', () => {
    expect(computeSegments(makeInput({ totalSpendCents: 0 })).spending).toBe('non_payer');
    expect(computeSegments(makeInput({ totalSpendCents: 199 })).spending).toBe('minnow');
    expect(computeSegments(makeInput({ totalSpendCents: 2500 })).spending).toBe('dolphin');
    expect(computeSegments(makeInput({ totalSpendCents: 10000 })).spending).toBe('whale');
  });

  it('returns a computedAt timestamp', () => {
    const segments = computeSegments(makeInput());
    expect(segments.computedAt).toBeTruthy();
    expect(new Date(segments.computedAt).getTime()).not.toBeNaN();
  });
});

// ── getPersonalizedOfferTiming ────────────────────────────────────────────────

describe('getPersonalizedOfferTiming', () => {
  it('returns low frequency for new_player', () => {
    const timing = getPersonalizedOfferTiming(makeSegments({ engagement: 'new_player' }));
    expect(timing.frequency).toBe('low');
  });

  it('returns high frequency for lapsed', () => {
    const timing = getPersonalizedOfferTiming(makeSegments({ engagement: 'lapsed' }));
    expect(timing.frequency).toBe('high');
  });

  it('returns high frequency for at_risk', () => {
    const timing = getPersonalizedOfferTiming(makeSegments({ engagement: 'at_risk' }));
    expect(timing.frequency).toBe('high');
  });

  it('returns high frequency for returned', () => {
    const timing = getPersonalizedOfferTiming(makeSegments({ engagement: 'returned' }));
    expect(timing.frequency).toBe('high');
  });

  it('returns a valid OfferTiming object', () => {
    const timing = getPersonalizedOfferTiming(makeSegments());
    expect(timing).toHaveProperty('delayMs');
    expect(timing).toHaveProperty('frequency');
    expect(typeof timing.delayMs).toBe('number');
    expect(['low', 'medium', 'high']).toContain(timing.frequency);
  });
});

// ── getPersonalizedDifficulty ─────────────────────────────────────────────────

describe('getPersonalizedDifficulty', () => {
  it('returns easier for returned players', () => {
    expect(getPersonalizedDifficulty(makeSegments({ engagement: 'returned' }))).toBe('easier');
  });

  it('returns easier for at_risk players', () => {
    expect(getPersonalizedDifficulty(makeSegments({ engagement: 'at_risk' }))).toBe('easier');
  });

  it('returns harder for expert + hardcore', () => {
    expect(
      getPersonalizedDifficulty(makeSegments({ skill: 'expert', engagement: 'hardcore' })),
    ).toBe('harder');
  });

  it('returns normal for new_player', () => {
    expect(getPersonalizedDifficulty(makeSegments({ engagement: 'new_player' }))).toBe('normal');
  });

  it('returns easier for beginner + casual', () => {
    expect(
      getPersonalizedDifficulty(makeSegments({ skill: 'beginner', engagement: 'casual' })),
    ).toBe('easier');
  });
});

// ── getRecommendedMode ────────────────────────────────────────────────────────

describe('getRecommendedMode', () => {
  it('returns daily for competitor motivation', () => {
    expect(
      getRecommendedMode(makeSegments({ motivations: ['competitor'] })),
    ).toBe('daily');
  });

  it('returns expert for expert skill without special motivations', () => {
    expect(
      getRecommendedMode(makeSegments({ skill: 'expert', motivations: [] })),
    ).toBe('expert');
  });

  it('returns classic for new_player', () => {
    expect(
      getRecommendedMode(makeSegments({ engagement: 'new_player', motivations: [] })),
    ).toBe('classic');
  });

  it('returns relax for at_risk players', () => {
    expect(
      getRecommendedMode(
        makeSegments({ engagement: 'at_risk', skill: 'intermediate', motivations: [] }),
      ),
    ).toBe('relax');
  });

  it('returns perfectSolve for achiever + expert', () => {
    expect(
      getRecommendedMode(makeSegments({ motivations: ['achiever'], skill: 'expert' })),
    ).toBe('perfectSolve');
  });
});

// ── getWelcomeBackMessage ────────────────────────────────────────────────────

describe('getWelcomeBackMessage', () => {
  it('returns a message for returned engagement', () => {
    const msg = getWelcomeBackMessage(makeSegments({ engagement: 'returned' }));
    expect(msg).not.toBeNull();
    expect(msg!.title).toBeTruthy();
    expect(msg!.subtitle).toBeTruthy();
  });

  it('returns a message for at_risk engagement', () => {
    const msg = getWelcomeBackMessage(makeSegments({ engagement: 'at_risk' }));
    expect(msg).not.toBeNull();
  });

  it('returns a message for lapsed engagement', () => {
    const msg = getWelcomeBackMessage(makeSegments({ engagement: 'lapsed' }));
    expect(msg).not.toBeNull();
  });

  it('returns null for regular engagement', () => {
    expect(getWelcomeBackMessage(makeSegments({ engagement: 'regular' }))).toBeNull();
  });

  it('returns null for hardcore engagement', () => {
    expect(getWelcomeBackMessage(makeSegments({ engagement: 'hardcore' }))).toBeNull();
  });

  it('returns null for new_player engagement', () => {
    expect(getWelcomeBackMessage(makeSegments({ engagement: 'new_player' }))).toBeNull();
  });
});

// ── DEFAULT_SEGMENTS ─────────────────────────────────────────────────────────

describe('DEFAULT_SEGMENTS', () => {
  it('has expected default values', () => {
    expect(DEFAULT_SEGMENTS.engagement).toBe('new_player');
    expect(DEFAULT_SEGMENTS.skill).toBe('beginner');
    expect(DEFAULT_SEGMENTS.spending).toBe('non_payer');
    expect(DEFAULT_SEGMENTS.motivations).toEqual([]);
  });
});
