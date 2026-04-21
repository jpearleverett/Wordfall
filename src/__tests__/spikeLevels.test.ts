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
  it('returns true for every 5th level from 5 upward', () => {
    for (const level of [5, 10, 15, 20, 65]) {
      expect(isBreatherLevel(level)).toBe(true);
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
  it('level 5 is a breather (drops to level 1 config)', () => {
    const breather = getLevelConfig(5);
    const level1 = getLevelConfig(1);
    expect(breather).toEqual(level1);
  });

  it('level 10 is a breather (drops to level 6 config)', () => {
    const breather = getLevelConfig(10);
    const level6 = getLevelConfig(6);
    expect(breather).toEqual(level6);
  });
});
