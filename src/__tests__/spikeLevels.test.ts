/**
 * Tests for the challenge-spike pacing layer inside getLevelConfig.
 *
 * Contract the game-design layer is relying on:
 *   - Spikes only fire from level 13 upward (no punishing early-game).
 *   - Spikes fire on every level divisible by 13 (13, 26, 39, 52, ...).
 *   - Breather cadence (every 5th level) ALWAYS wins when a level
 *     is both a breather and a spike — the player-friendly read.
 *   - Spike transformation: +1 wordCount, +1 maxWordLength capped at
 *     6. Nothing else changes (rows/cols stay stable so the player
 *     doesn't lose layout).
 *   - Remote Config `spikeLevelsEnabled` is respected as a kill switch.
 */

const mockBooleans = new Map<string, boolean>();

jest.mock('../services/remoteConfig', () => ({
  getRemoteBoolean: (key: string): boolean =>
    mockBooleans.has(key) ? (mockBooleans.get(key) as boolean) : true,
}));

import {
  getLevelConfig,
  isSpikeLevel,
  isBreatherLevel,
} from '../constants';

beforeEach(() => {
  mockBooleans.clear();
});

describe('isSpikeLevel', () => {
  it('returns false for levels below 13 (learning phase guard)', () => {
    for (const level of [1, 2, 5, 10, 12]) {
      expect(isSpikeLevel(level)).toBe(false);
    }
  });

  it('returns true for level 13 (first spike)', () => {
    expect(isSpikeLevel(13)).toBe(true);
  });

  it('returns true for every multiple of 13 >= 13 except breather collisions', () => {
    // 65 = LCM(5, 13) — breather wins.
    for (const level of [13, 26, 39, 52]) {
      expect(isSpikeLevel(level)).toBe(true);
    }
    expect(isSpikeLevel(65)).toBe(false);
  });

  it('returns false when the RC kill switch is off', () => {
    mockBooleans.set('spikeLevelsEnabled', false);
    expect(isSpikeLevel(13)).toBe(false);
    expect(isSpikeLevel(26)).toBe(false);
  });
});

describe('isBreatherLevel', () => {
  it('returns true for every 5th level from 15 upward', () => {
    for (const level of [15, 20, 25, 65]) {
      expect(isBreatherLevel(level)).toBe(true);
    }
  });

  // Breathers are relief valves for accumulated fatigue, so they are
  // suppressed during the learning phase (symmetric with SPIKE_MIN_LEVEL).
  // A breather replays the phase config from 4 levels earlier; the early
  // bands are only 2-3 levels wide, so level 5 used to replay the LEVEL 1
  // board verbatim and level 10 replayed level 6 — a visible downgrade
  // four puzzles in, when the player has no fatigue to relieve and is
  // still deciding whether the game has depth.
  it('returns false during the early-game learning phase', () => {
    for (const level of [5, 10]) {
      expect(isBreatherLevel(level)).toBe(false);
    }
  });

  it('returns false for level 1 and non-multiples', () => {
    for (const level of [1, 2, 4, 7, 13]) {
      expect(isBreatherLevel(level)).toBe(false);
    }
  });
});

describe('getLevelConfig — spike transformation', () => {
  it('spike transformation adds +1 wordCount and bumps maxWordLength', () => {
    // Compare spike-on vs spike-off at the SAME level so we isolate the
    // transformation from the phase-based ramp.
    mockBooleans.set('spikeLevelsEnabled', false);
    const offConfig = getLevelConfig(13);

    mockBooleans.set('spikeLevelsEnabled', true);
    const onConfig = getLevelConfig(13);

    expect(onConfig.wordCount).toBe(offConfig.wordCount + 1);
    expect(onConfig.maxWordLength).toBeGreaterThanOrEqual(offConfig.maxWordLength);
    // rows/cols stay stable so the grid doesn't reflow on spike.
    expect(onConfig.rows).toBe(offConfig.rows);
    expect(onConfig.cols).toBe(offConfig.cols);
  });

  it('maxWordLength caps at 6 even when base is already at cap', () => {
    // Level 39 is a spike; base config at level 39 already has maxWordLength 6.
    const spike = getLevelConfig(39);
    expect(spike.maxWordLength).toBeLessThanOrEqual(6);
  });

  it('breather wins over spike at level 65 (LCM of 5 and 13)', () => {
    const spike = getLevelConfig(65);
    const breatherOnly = getLevelConfig(60);
    // 65 is a breather — it should look like the ramp at level ~61, NOT
    // have the +1 wordCount / +1 maxWordLength of a spike.
    expect(spike.wordCount).toBe(breatherOnly.wordCount);
    expect(spike.maxWordLength).toBe(breatherOnly.maxWordLength);
  });

  it('RC kill switch disables the spike transformation', () => {
    mockBooleans.set('spikeLevelsEnabled', false);
    const base = getLevelConfig(12);
    const would_be_spike = getLevelConfig(13);
    // With spike off, level 13 is just a normal ramp step (not spiked).
    // Specifically: wordCount should NOT be bumped by +1 relative to the
    // non-spike phase value at level 13.
    expect(would_be_spike.wordCount).toBeLessThanOrEqual(base.wordCount + 1);
    // And shouldn't have the spike delta applied on top of the phase.
    mockBooleans.set('spikeLevelsEnabled', true);
    const spiked = getLevelConfig(13);
    expect(spiked.wordCount).toBeGreaterThan(would_be_spike.wordCount);
  });
});

describe('getLevelConfig — breather still behaves', () => {
  it('level 15 is a breather (drops to level 11 config)', () => {
    const breather = getLevelConfig(15);
    const level11 = getLevelConfig(11);
    expect(breather).toEqual(level11);
  });

  it('level 20 is a breather (drops to level 16 config)', () => {
    const breather = getLevelConfig(20);
    const level16 = getLevelConfig(16);
    expect(breather).toEqual(level16);
  });

  // The early game must never hand back a board the player already beat.
  it('no level in 1-14 replays an earlier level\'s exact board', () => {
    const seen = new Map<string, number>();
    for (let level = 1; level <= 14; level++) {
      const c = getLevelConfig(level);
      const key = `${c.rows}x${c.cols}w${c.wordCount}len${c.minWordLength}-${c.maxWordLength}`;
      const firstSeenAt = seen.get(key);
      if (firstSeenAt !== undefined) {
        // Consecutive levels may share a band; a NON-adjacent repeat is the
        // regression we care about (e.g. old L5 replaying L1).
        expect(level - firstSeenAt).toBeLessThanOrEqual(3);
      } else {
        seen.set(key, level);
      }
    }
  });

  it('difficulty never decreases across the first 14 levels', () => {
    const order = { easy: 0, medium: 1, hard: 2, expert: 3 } as const;
    let prev = 0;
    for (let level = 1; level <= 14; level++) {
      const tier = order[getLevelConfig(level).difficulty];
      expect(tier).toBeGreaterThanOrEqual(prev);
      prev = tier;
    }
  });
});
