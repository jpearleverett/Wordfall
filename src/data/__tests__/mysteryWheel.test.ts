import {
  WHEEL_SEGMENTS,
  MYSTERY_BOX_REWARDS,
  DEFAULT_MYSTERY_WHEEL_STATE,
  spinWheel,
  openMysteryBox,
  checkFreeSpin,
  SPIN_COST_GEMS,
  SPIN_BUNDLE_COST_GEMS,
  SPIN_BUNDLE_COUNT,
  MysteryWheelState,
} from '../mysteryWheel';

describe('WHEEL_SEGMENTS data', () => {
  it('has 11 segments', () => {
    expect(WHEEL_SEGMENTS).toHaveLength(11);
  });

  it('every segment has required fields', () => {
    for (const seg of WHEEL_SEGMENTS) {
      expect(seg.id).toBeTruthy();
      expect(seg.label).toBeTruthy();
      expect(seg.icon).toBeTruthy();
      expect(seg.weight).toBeGreaterThan(0);
      expect(seg.color).toBeTruthy();
      expect(['common', 'uncommon', 'rare', 'epic', 'legendary']).toContain(seg.rarity);
      expect(seg.reward).toBeDefined();
    }
  });

  it('weights sum to 100', () => {
    const totalWeight = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it('has reasonable rarity distribution', () => {
    const byRarity: Record<string, number> = {};
    for (const seg of WHEEL_SEGMENTS) {
      byRarity[seg.rarity] = (byRarity[seg.rarity] || 0) + seg.weight;
    }
    // Common should have the most weight
    expect(byRarity['common']).toBeGreaterThan(byRarity['rare'] || 0);
    expect(byRarity['common']).toBeGreaterThan(byRarity['epic'] || 0);
  });

  it('has unique segment ids', () => {
    const ids = WHEEL_SEGMENTS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each segment reward has at least one reward type', () => {
    for (const seg of WHEEL_SEGMENTS) {
      const r = seg.reward;
      const hasReward =
        (r.coins && r.coins > 0) ||
        (r.gems && r.gems > 0) ||
        (r.hints && r.hints > 0) ||
        r.rareTile ||
        r.mysteryBox ||
        r.booster ||
        r.xpMultiplier ||
        r.cosmetic;
      expect(hasReward).toBeTruthy();
    }
  });
});

describe('MYSTERY_BOX_REWARDS', () => {
  it('has rewards defined', () => {
    expect(MYSTERY_BOX_REWARDS.length).toBeGreaterThan(0);
  });

  it('every reward has positive weight', () => {
    for (const r of MYSTERY_BOX_REWARDS) {
      expect(r.weight).toBeGreaterThan(0);
    }
  });

  it('every reward has a label and icon', () => {
    for (const r of MYSTERY_BOX_REWARDS) {
      expect(r.label).toBeTruthy();
      expect(r.icon).toBeTruthy();
    }
  });
});

describe('spinWheel', () => {
  const baseState: MysteryWheelState = {
    ...DEFAULT_MYSTERY_WHEEL_STATE,
    spinsAvailable: 10,
  };

  it('returns a valid segment', () => {
    const result = spinWheel(baseState);
    expect(result.segment).toBeDefined();
    expect(result.segment.id).toBeTruthy();
    expect(result.segmentIndex).toBeGreaterThanOrEqual(0);
    expect(result.segmentIndex).toBeLessThan(WHEEL_SEGMENTS.length);
  });

  it('decrements spinsAvailable', () => {
    const result = spinWheel(baseState);
    expect(result.updatedState.spinsAvailable).toBe(baseState.spinsAvailable - 1);
  });

  it('increments totalSpins', () => {
    const result = spinWheel(baseState);
    expect(result.updatedState.totalSpins).toBe(baseState.totalSpins + 1);
  });

  it('updates lastJackpotSpin when rare+ segment is hit', () => {
    // Run many spins until we hit a rare+
    let state = { ...baseState, spinsAvailable: 1000 };
    let hitJackpot = false;
    for (let i = 0; i < 200; i++) {
      const result = spinWheel(state);
      const isRarePlus = ['rare', 'epic', 'legendary'].includes(result.segment.rarity);
      if (isRarePlus) {
        expect(result.updatedState.lastJackpotSpin).toBe(result.updatedState.totalSpins);
        hitJackpot = true;
        break;
      }
      state = { ...result.updatedState, spinsAvailable: 1000 };
    }
    expect(hitJackpot).toBe(true);
  });

  it('pity system guarantees rare+ within 25 spins', () => {
    // Start with no jackpot history, spin 25 times
    let state: MysteryWheelState = {
      ...DEFAULT_MYSTERY_WHEEL_STATE,
      spinsAvailable: 100,
      totalSpins: 0,
      lastJackpotSpin: 0,
    };

    let gotRarePlus = false;
    for (let i = 0; i < 25; i++) {
      const result = spinWheel(state);
      if (['rare', 'epic', 'legendary'].includes(result.segment.rarity)) {
        gotRarePlus = true;
        break;
      }
      state = { ...result.updatedState, spinsAvailable: 100 };
    }
    expect(gotRarePlus).toBe(true);
  });

  it('pity system forces rare+ at exact pity limit', () => {
    // Set state so we're at the pity limit
    const pityState: MysteryWheelState = {
      ...DEFAULT_MYSTERY_WHEEL_STATE,
      spinsAvailable: 10,
      totalSpins: 24, // Next spin will be #25
      lastJackpotSpin: 0, // No jackpot in 24 spins
      jackpotPity: 25,
    };

    const result = spinWheel(pityState);
    const isRarePlus = ['rare', 'epic', 'legendary'].includes(result.segment.rarity);
    expect(isRarePlus).toBe(true);
  });

  it('returns different segments across many spins (not always the same)', () => {
    let state = { ...baseState, spinsAvailable: 1000 };
    const segmentIds = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const result = spinWheel(state);
      segmentIds.add(result.segment.id);
      state = { ...result.updatedState, spinsAvailable: 1000 };
    }
    // Should hit at least 3 different segments in 50 spins
    expect(segmentIds.size).toBeGreaterThanOrEqual(3);
  });
});

describe('openMysteryBox', () => {
  it('returns a valid reward', () => {
    const result = openMysteryBox();
    expect(result.label).toBeTruthy();
    expect(result.icon).toBeTruthy();
    expect(result.reward).toBeDefined();
  });

  it('returns rewards from the MYSTERY_BOX_REWARDS table', () => {
    const validLabels = new Set(MYSTERY_BOX_REWARDS.map(r => r.label));
    // Run several times to account for randomness
    for (let i = 0; i < 20; i++) {
      const result = openMysteryBox();
      expect(validLabels.has(result.label)).toBe(true);
    }
  });
});

describe('checkFreeSpin', () => {
  it('increments puzzlesSinceLastSpin when below threshold', () => {
    const state: MysteryWheelState = {
      ...DEFAULT_MYSTERY_WHEEL_STATE,
      puzzlesSinceLastSpin: 3,
    };
    const result = checkFreeSpin(state);
    expect(result.puzzlesSinceLastSpin).toBe(4);
    expect(result.spinsAvailable).toBe(state.spinsAvailable);
  });

  it('awards free spin at threshold (6 puzzles)', () => {
    const state: MysteryWheelState = {
      ...DEFAULT_MYSTERY_WHEEL_STATE,
      puzzlesSinceLastSpin: 5, // Will become 6 = puzzlesPerFreeSpin
      spinsAvailable: 0,
    };
    const result = checkFreeSpin(state);
    expect(result.spinsAvailable).toBe(1);
    expect(result.puzzlesSinceLastSpin).toBe(0);
  });

  it('resets puzzlesSinceLastSpin after awarding spin', () => {
    const state: MysteryWheelState = {
      ...DEFAULT_MYSTERY_WHEEL_STATE,
      puzzlesSinceLastSpin: 5,
    };
    const result = checkFreeSpin(state);
    expect(result.puzzlesSinceLastSpin).toBe(0);
  });

  it('accumulates spins if player already has some', () => {
    const state: MysteryWheelState = {
      ...DEFAULT_MYSTERY_WHEEL_STATE,
      puzzlesSinceLastSpin: 5,
      spinsAvailable: 3,
    };
    const result = checkFreeSpin(state);
    expect(result.spinsAvailable).toBe(4);
  });

  it('does not award spin at count below threshold', () => {
    const state: MysteryWheelState = {
      ...DEFAULT_MYSTERY_WHEEL_STATE,
      puzzlesSinceLastSpin: 3,
      spinsAvailable: 2,
    };
    const result = checkFreeSpin(state);
    expect(result.spinsAvailable).toBe(2);
    expect(result.puzzlesSinceLastSpin).toBe(4);
  });
});

describe('constants', () => {
  it('SPIN_COST_GEMS is 15', () => {
    expect(SPIN_COST_GEMS).toBe(15);
  });

  it('SPIN_BUNDLE_COST_GEMS is 60 (discount from 5 * 15)', () => {
    expect(SPIN_BUNDLE_COST_GEMS).toBe(60);
    expect(SPIN_BUNDLE_COST_GEMS).toBeLessThan(SPIN_COST_GEMS * SPIN_BUNDLE_COUNT);
  });

  it('SPIN_BUNDLE_COUNT is 5', () => {
    expect(SPIN_BUNDLE_COUNT).toBe(5);
  });

  it('DEFAULT_MYSTERY_WHEEL_STATE has correct defaults', () => {
    expect(DEFAULT_MYSTERY_WHEEL_STATE.spinsAvailable).toBe(1);
    expect(DEFAULT_MYSTERY_WHEEL_STATE.puzzlesSinceLastSpin).toBe(0);
    expect(DEFAULT_MYSTERY_WHEEL_STATE.puzzlesPerFreeSpin).toBe(6);
    expect(DEFAULT_MYSTERY_WHEEL_STATE.totalSpins).toBe(0);
    expect(DEFAULT_MYSTERY_WHEEL_STATE.lastJackpotSpin).toBe(0);
    expect(DEFAULT_MYSTERY_WHEEL_STATE.jackpotPity).toBe(25);
  });
});
