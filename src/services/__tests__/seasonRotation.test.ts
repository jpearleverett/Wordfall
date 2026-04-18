jest.mock('../analytics', () => ({
  analytics: { logEvent: jest.fn() },
}));

import { checkSeasonExpiry } from '../seasonRotation';
import {
  DEFAULT_SEASON_PASS_STATE,
  getCurrentSeason,
  SeasonPassState,
} from '../../data/seasonPass';
import { analytics } from '../analytics';

function makePassState(overrides: Partial<SeasonPassState> = {}): SeasonPassState {
  return {
    ...DEFAULT_SEASON_PASS_STATE,
    ...overrides,
  };
}

describe('checkSeasonExpiry', () => {
  beforeEach(() => {
    (analytics.logEvent as jest.Mock).mockClear();
  });

  it('returns not-expired when endDate is in the future', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
    const pass = makePassState({ seasonEndDate: future });
    const result = checkSeasonExpiry(pass);
    expect(result.expired).toBe(false);
    expect(result.nextSeason).toBeNull();
  });

  it('returns not-expired when seasonId already matches the current season (clock skew)', () => {
    const current = getCurrentSeason();
    const pastDate = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
    const pass = makePassState({
      seasonId: current.id,
      seasonEndDate: pastDate,
    });
    const result = checkSeasonExpiry(pass);
    expect(result.expired).toBe(false);
    expect(result.nextSeason).toBeNull();
  });

  it('returns a fresh default state when stored season has expired and a new season began', () => {
    const current = getCurrentSeason();
    const pastEnd = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
    const pass = makePassState({
      seasonId: 'season_legacy',
      seasonEndDate: pastEnd,
      currentXP: 10_000,
      currentTier: 12,
      isPremium: true,
      claimedFreeTiers: [1, 2, 3],
      claimedPremiumTiers: [1, 2],
    });

    const result = checkSeasonExpiry(pass);
    expect(result.expired).toBe(true);
    expect(result.nextSeason).not.toBeNull();
    expect(result.nextSeason!.seasonId).toBe(current.id);
    expect(result.nextSeason!.currentXP).toBe(0);
    expect(result.nextSeason!.currentTier).toBe(0);
    expect(result.nextSeason!.isPremium).toBe(false);
    expect(result.nextSeason!.claimedFreeTiers).toEqual([]);
    expect(result.nextSeason!.claimedPremiumTiers).toEqual([]);
  });

  it('logs season_pass_season_rolled analytics with final state from the old season', () => {
    const pastEnd = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
    const pass = makePassState({
      seasonId: 'season_legacy',
      seasonEndDate: pastEnd,
      currentXP: 9_500,
      currentTier: 18,
      isPremium: true,
      claimedFreeTiers: [1, 2, 3, 4, 5],
      claimedPremiumTiers: [1, 2],
    });

    checkSeasonExpiry(pass);
    const calls = (analytics.logEvent as jest.Mock).mock.calls;
    const rolled = calls.find(([event]) => event === 'season_pass_season_rolled');
    expect(rolled).toBeDefined();
    const payload = rolled![1];
    expect(payload.from_season).toBe('season_legacy');
    expect(payload.final_tier).toBe(18);
    expect(payload.final_xp).toBe(9_500);
    expect(payload.free_claimed).toBe(5);
    expect(payload.premium_claimed).toBe(2);
    expect(payload.was_premium).toBe(true);
  });

  it('treats an invalid seasonEndDate as not-expired (fail-safe)', () => {
    const pass = makePassState({ seasonEndDate: 'not-a-date' });
    const result = checkSeasonExpiry(pass);
    expect(result.expired).toBe(false);
    expect(result.nextSeason).toBeNull();
  });
});
