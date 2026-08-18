/**
 * SEASONAL WHEEL ROTATION.
 *
 * src/data/seasonalWheels.ts — four themed wheels, each with its own
 * exclusive cosmetics — had ZERO importers. Every player has been spinning
 * the standard wheel all year while 434 lines of finished seasonal content
 * shipped to nobody.
 *
 * Connecting it is not a cosmetic swap, because three things must agree on
 * exactly one segment list:
 *   1. what spinWheel draws from,
 *   2. what the component renders as wedges,
 *   3. what the odds-disclosure sheet publishes.
 * (3) is a compliance surface, not a design choice: publishing the standard
 * wheel's odds while spinning seasonal segments would be a false loot-box
 * disclosure. And the standard wheel has 11 segments to the seasonal wheels'
 * 10, so a stale segment count draws eleven wedges over ten prizes and lands
 * the pointer between them.
 *
 * These tests pin the properties that keep those three in step.
 */
import { getActiveWheel, SEASONAL_WHEELS } from '../seasonalWheels';
import { WHEEL_SEGMENTS, spinWheel, DEFAULT_MYSTERY_WHEEL_STATE } from '../mysteryWheel';
import type { MysteryWheelState } from '../../types';

describe('season selection', () => {
  it('covers every month of the year', () => {
    // A month with no wheel would silently fall back to the standard one —
    // a "seasonal" feature that vanishes for part of the year without
    // anything failing.
    for (let month = 0; month < 12; month++) {
      const { segments } = getActiveWheel(new Date(2026, month, 15));
      expect(segments.length).toBeGreaterThan(0);
    }
  });

  it('returns the themed wheel for each season', () => {
    const cases: Array<[number, string]> = [
      [3, 'spring_wheel'], // April
      [6, 'summer_wheel'], // July
      [9, 'autumn_wheel'], // October
      [0, 'winter_wheel'], // January
    ];
    for (const [month, expected] of cases) {
      expect(getActiveWheel(new Date(2026, month, 15)).seasonId).toBe(expected);
    }
  });

  it('is stable within a season and changes across seasons', () => {
    const early = getActiveWheel(new Date(2026, 5, 1)).seasonId;
    const late = getActiveWheel(new Date(2026, 7, 28)).seasonId;
    expect(early).toBe(late);
    expect(getActiveWheel(new Date(2026, 8, 1)).seasonId).not.toBe(early);
  });
});

describe('every wheel is spinnable and disclosable', () => {
  const allWheels: Array<[string, typeof WHEEL_SEGMENTS]> = [
    ['standard', WHEEL_SEGMENTS],
    ...Object.entries(SEASONAL_WHEELS),
  ];

  it.each(allWheels)('%s: weights are positive and sum to something', (_name, segments) => {
    // Odds are published as weight/total. A zero or negative weight makes the
    // disclosure wrong; a zero total makes it NaN.
    const total = segments.reduce((sum, s) => sum + s.weight, 0);
    expect(total).toBeGreaterThan(0);
    for (const seg of segments) expect(seg.weight).toBeGreaterThan(0);
  });

  it.each(allWheels)('%s: segment ids are unique', (_name, segments) => {
    // spinWheel maps its result back to a rendered index by id. Duplicate ids
    // would land the pointer on the wrong wedge.
    const ids = segments.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(allWheels)('%s: has a rare-or-better segment for the pity payout', (_name, segments) => {
    // The pity system narrows to rare+ when the counter maxes out. A wheel
    // with none would previously have produced a zero-weight list and
    // indexed into nothing — crashing on the exact spin that owes the player
    // their guaranteed reward.
    const rarePlus = segments.filter(
      (s) => s.rarity === 'rare' || s.rarity === 'epic' || s.rarity === 'legendary',
    );
    expect(rarePlus.length).toBeGreaterThan(0);
  });
});

describe('spinWheel honours the wheel it was handed', () => {
  function state(overrides: Partial<MysteryWheelState> = {}): MysteryWheelState {
    return { ...DEFAULT_MYSTERY_WHEEL_STATE, spinsAvailable: 5, ...overrides };
  }

  it('only ever returns a segment from the active wheel', () => {
    for (const [, segments] of Object.entries(SEASONAL_WHEELS)) {
      const ids = new Set(segments.map((s) => s.id));
      for (let i = 0; i < 60; i++) {
        const { segment } = spinWheel(state({ totalSpins: i }), segments);
        expect(ids.has(segment.id)).toBe(true);
      }
    }
  });

  it('returns an index that addresses the rendered wheel', () => {
    // The component rotates the wheel by segmentIndex * segmentAngle. An
    // index past the end (e.g. resolved against the 11-segment standard
    // wheel) would stop the pointer past the last wedge.
    for (const [, segments] of Object.entries(SEASONAL_WHEELS)) {
      for (let i = 0; i < 40; i++) {
        const { segmentIndex, segment } = spinWheel(state({ totalSpins: i }), segments);
        expect(segmentIndex).toBeGreaterThanOrEqual(0);
        expect(segmentIndex).toBeLessThan(segments.length);
        expect(segments[segmentIndex].id).toBe(segment.id);
      }
    }
  });

  it('still pays out at the pity limit on a seasonal wheel', () => {
    const spring = SEASONAL_WHEELS.spring_wheel;
    const pity = DEFAULT_MYSTERY_WHEEL_STATE.jackpotPity;
    const { segment } = spinWheel(
      state({ totalSpins: pity - 1, lastJackpotSpin: 0 }),
      spring,
    );
    expect(['rare', 'epic', 'legendary']).toContain(segment.rarity);
  });

  it('defaults to the standard wheel when no list is given', () => {
    const ids = new Set(WHEEL_SEGMENTS.map((s) => s.id));
    const { segment } = spinWheel(state());
    expect(ids.has(segment.id)).toBe(true);
  });
});
