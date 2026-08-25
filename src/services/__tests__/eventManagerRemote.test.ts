/**
 * Tests for the Remote-Config override parser in eventManager.
 * Confirms that malformed / empty / wrongly-shaped JSON never crashes,
 * that valid entries are preserved through the filter, and that the
 * optional `rewards` / `thresholds` / `progressUnit` fields are validated
 * defensively: payouts clamped (gems <= 100), a broken ladder degrades to
 * the no-ladder template behavior WITHOUT dropping the event, and remote
 * ladders are displayable + claimable through the normal event pipeline.
 */

const mockGetRemoteString = jest.fn();

jest.mock('../remoteConfig', () => ({
  getRemoteString: (...args: unknown[]) => mockGetRemoteString(...args),
  getRemoteBoolean: jest.fn(() => false),
  getRemoteNumber: jest.fn(() => 0),
}));

import { eventManager, parseRemoteEvents } from '../eventManager';

describe('parseRemoteEvents', () => {
  beforeEach(() => {
    mockGetRemoteString.mockReset();
  });

  it('returns [] on empty override', () => {
    mockGetRemoteString.mockReturnValue('');
    expect(parseRemoteEvents()).toEqual([]);
  });

  it('returns [] on malformed JSON', () => {
    mockGetRemoteString.mockReturnValue('not json');
    expect(parseRemoteEvents()).toEqual([]);
  });

  it('returns [] when shape is wrong (root not object)', () => {
    mockGetRemoteString.mockReturnValue(JSON.stringify([1, 2, 3]));
    expect(parseRemoteEvents()).toEqual([]);
  });

  it('returns [] when events is not an array', () => {
    mockGetRemoteString.mockReturnValue(JSON.stringify({ events: 'oops' }));
    expect(parseRemoteEvents()).toEqual([]);
  });

  it('filters out entries missing required fields', () => {
    mockGetRemoteString.mockReturnValue(
      JSON.stringify({
        events: [
          { id: 'rc_ok', type: 'main', name: 'n', description: 'd', icon: 'i', endTime: 123 },
          { id: 'rc_bad_type', type: 'super', name: 'n', description: 'd', icon: 'i', endTime: 123 },
          { type: 'main', name: 'missing id', description: 'd', icon: 'i', endTime: 123 },
          { id: 'rc_missing_end', type: 'mini', name: 'n', description: 'd', icon: 'i' },
          null,
        ],
      }),
    );
    const out = parseRemoteEvents();
    expect(out.map((e) => e.id)).toEqual(['rc_ok']);
  });

  it('preserves valid main + mini entries', () => {
    mockGetRemoteString.mockReturnValue(
      JSON.stringify({
        events: [
          { id: 'rc_main_1', type: 'main', name: 'Spring', description: 'd', icon: '🌸', endTime: 1, multipliers: { coins: 2 } },
          { id: 'rc_mini_1', type: 'mini', name: 'Hints', description: 'd', icon: '💡', endTime: 2 },
        ],
      }),
    );
    const out = parseRemoteEvents();
    expect(out).toHaveLength(2);
    expect(out[0].type).toBe('main');
    expect(out[1].type).toBe('mini');
    expect(out[0].multipliers?.coins).toBe(2);
  });
});

function remoteEvent(extra: Record<string, unknown>): string {
  return JSON.stringify({
    events: [
      {
        id: 'rc_x',
        type: 'main',
        name: 'Remote',
        description: 'd',
        icon: '⭐',
        endTime: 4102444800000, // 2100-01-01 — always in the future
        ...extra,
      },
    ],
  });
}

describe('parseRemoteEvents — rewards / thresholds / progressUnit', () => {
  beforeEach(() => {
    mockGetRemoteString.mockReset();
  });

  it('validates a tier ladder and clamps payouts (gems <= 100)', () => {
    mockGetRemoteString.mockReturnValue(
      remoteEvent({
        progressUnit: 'count',
        rewards: [
          { tier: 'bronze', threshold: 3, rewards: { coins: 200, gems: 5, hintTokens: 2 } },
          { threshold: 10, rewards: { coins: 999999, gems: 5000, hintTokens: 400 } },
        ],
      }),
    );
    const [event] = parseRemoteEvents();
    expect(event.progressUnit).toBe('count');
    expect(event.rewards).toHaveLength(2);
    expect(event.rewards![0]).toEqual({
      tier: 'bronze',
      threshold: 3,
      rewards: { coins: 200, gems: 5, hintTokens: 2 },
    });
    // Missing tier name defaults by position; slipped-digit payouts clamp.
    expect(event.rewards![1].tier).toBe('silver');
    expect(event.rewards![1].rewards).toEqual({
      coins: 10_000,
      gems: 100,
      hintTokens: 50,
    });
  });

  it('fills missing per-tier thresholds from the top-level shorthand', () => {
    mockGetRemoteString.mockReturnValue(
      remoteEvent({
        thresholds: [500, 1500, 3000],
        rewards: [
          { rewards: { coins: 100 } },
          { rewards: { gems: 10 } },
          { rewards: { hintTokens: 5 } },
        ],
      }),
    );
    const [event] = parseRemoteEvents();
    expect(event.rewards!.map((t) => t.threshold)).toEqual([500, 1500, 3000]);
    expect(event.rewards!.map((t) => t.tier)).toEqual(['bronze', 'silver', 'gold']);
  });

  it('a broken ladder degrades to no-ladder WITHOUT dropping the event', () => {
    for (const rewards of [
      [{ threshold: 100, rewards: {} }, { threshold: 50, rewards: {} }], // descending
      [{ rewards: { coins: 100 } }], // no threshold anywhere
      ['nonsense'],
      [{ tier: 'a', threshold: 1, rewards: {} }, { tier: 'a', threshold: 2, rewards: {} }], // dup names
    ]) {
      mockGetRemoteString.mockReturnValue(remoteEvent({ rewards }));
      const out = parseRemoteEvents();
      expect(out).toHaveLength(1);
      expect(out[0].rewards).toBeUndefined();
    }
  });

  it('rejects junk progressUnit but keeps the event on the score default', () => {
    mockGetRemoteString.mockReturnValue(remoteEvent({ progressUnit: 'puzzles' }));
    const [event] = parseRemoteEvents();
    expect(event.progressUnit).toBeUndefined();
  });

  it('negative and non-numeric payout values are dropped, not minted', () => {
    mockGetRemoteString.mockReturnValue(
      remoteEvent({
        rewards: [{ threshold: 5, rewards: { coins: -50, gems: 'lots', hintTokens: 0 } }],
      }),
    );
    const [event] = parseRemoteEvents();
    expect(event.rewards![0].rewards).toEqual({});
  });
});

describe('remote events with ladders flow through the normal event pipeline', () => {
  beforeEach(() => {
    mockGetRemoteString.mockReset();
    jest.useFakeTimers();
    // A Tuesday — no weekend blitz; weekendBlitzEnabled is mocked false.
    jest.setSystemTime(new Date(Date.UTC(2026, 1, 3, 12)));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("progressUnit 'count' accrues +1 per completion; tiers display, reach, and claim clamped rewards", () => {
    mockGetRemoteString.mockReturnValue(
      remoteEvent({
        progressUnit: 'count',
        rewards: [
          { tier: 'bronze', threshold: 2, rewards: { coins: 100, gems: 500 } },
          { tier: 'silver', threshold: 10, rewards: { coins: 200 } },
        ],
      }),
    );
    eventManager.init({});

    eventManager.onPuzzleComplete(2400, 3, true, 8);
    eventManager.onPuzzleComplete(1800, 2, false, 7);

    const remote = eventManager.getActiveEvents().find((e) => e.id === 'rc_x');
    expect(remote).toBeDefined();
    // count unit: two completions = 2, not 4,200 points.
    expect(remote!.progress).toBe(2);
    expect(remote!.rewards).toHaveLength(2);
    expect(remote!.rewards[0].reached).toBe(true);
    expect(remote!.rewards[1].reached).toBe(false);

    const claimed = eventManager.claimEventReward('rc_x', 'bronze');
    expect(claimed).toEqual({ coins: 100, gems: 100 }); // gems clamped
    // Claim is once-only.
    expect(eventManager.claimEventReward('rc_x', 'bronze')).toBeNull();
    // Unreached tier refuses to claim.
    expect(eventManager.claimEventReward('rc_x', 'silver')).toBeNull();
  });

  it("default (score) remote events keep accruing raw score", () => {
    mockGetRemoteString.mockReturnValue(
      remoteEvent({ rewards: [{ threshold: 5000, rewards: { coins: 100 } }] }),
    );
    eventManager.init({});
    eventManager.onPuzzleComplete(2400, 3, true, 8);

    const remote = eventManager.getActiveEvents().find((e) => e.id === 'rc_x');
    expect(remote!.progress).toBe(2400);
    expect(remote!.rewards[0].reached).toBe(false);
  });
});
