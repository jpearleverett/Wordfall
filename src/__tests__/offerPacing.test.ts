/**
 * Purchase-offer pacing.
 *
 * GameScreen gates offers to one per level, but that was the only limit —
 * no grace period, no session cap, no cooldown. A player six minutes into
 * their first session could be shown a purchase offer on level 2, then
 * another on 3, 4, 5, indefinitely. That is the pattern players describe as
 * "the game keeps asking me for money"; it costs retention and store rating
 * and converts worse than fewer, better-timed prompts.
 */
const mockNumbers = new Map<string, number>();
jest.mock('../services/remoteConfig', () => ({
  getRemoteNumber: (key: string): number => mockNumbers.get(key) ?? 0,
  getRemoteBoolean: (): boolean => true,
  getRemoteString: (): string => '',
}));

import {
  canShowOfferNow,
  recordOfferShown,
  offersShownThisSession,
  resetOfferPacing,
} from '../utils/offerPacing';

const MINUTE = 60_000;

beforeEach(() => {
  mockNumbers.clear();
  resetOfferPacing();
});

describe('offer pacing — grace period', () => {
  it('shows nothing to a player who has barely started', () => {
    for (let solved = 0; solved < 6; solved++) {
      expect(canShowOfferNow(solved, 0)).toBe(false);
    }
  });

  it('opens up once the player has actually played the loop', () => {
    expect(canShowOfferNow(6, 0)).toBe(true);
  });

  it('honours a Remote Config override of the grace period', () => {
    mockNumbers.set('offerMinLevel', 20);
    expect(canShowOfferNow(10, 0)).toBe(false);
    expect(canShowOfferNow(20, 0)).toBe(true);
  });
});

describe('offer pacing — session cap', () => {
  it('stops after the per-session limit', () => {
    let now = 0;
    for (let i = 0; i < 3; i++) {
      expect(canShowOfferNow(50, now)).toBe(true);
      recordOfferShown(now);
      now += 60 * MINUTE; // well past any cooldown
    }
    expect(canShowOfferNow(50, now)).toBe(false);
    expect(offersShownThisSession()).toBe(3);
  });

  it('resets on a new session', () => {
    let now = 0;
    for (let i = 0; i < 3; i++) {
      recordOfferShown(now);
      now += 60 * MINUTE;
    }
    expect(canShowOfferNow(50, now)).toBe(false);
    resetOfferPacing();
    expect(canShowOfferNow(50, now)).toBe(true);
  });
});

describe('offer pacing — cooldown', () => {
  it('blocks a second offer immediately after the first', () => {
    expect(canShowOfferNow(50, 0)).toBe(true);
    recordOfferShown(0);
    expect(canShowOfferNow(50, 1 * MINUTE)).toBe(false);
    expect(canShowOfferNow(50, 7 * MINUTE)).toBe(false);
  });

  it('allows one again after the cooldown elapses', () => {
    recordOfferShown(0);
    expect(canShowOfferNow(50, 9 * MINUTE)).toBe(true);
  });

  it('honours a Remote Config override of the cooldown', () => {
    mockNumbers.set('offerCooldownMinutes', 30);
    recordOfferShown(0);
    expect(canShowOfferNow(50, 20 * MINUTE)).toBe(false);
    expect(canShowOfferNow(50, 31 * MINUTE)).toBe(true);
  });
});

describe('offer pacing — worst case', () => {
  it('a full first session can never exceed the cap', () => {
    // Simulate an eager player finishing 40 puzzles back to back. Before
    // pacing existed this path could surface an offer on every level.
    let shown = 0;
    let now = 0;
    for (let puzzle = 1; puzzle <= 40; puzzle++) {
      if (canShowOfferNow(puzzle, now)) {
        recordOfferShown(now);
        shown++;
      }
      now += 90_000; // ~90s per puzzle
    }
    expect(shown).toBeLessThanOrEqual(3);
  });
});
