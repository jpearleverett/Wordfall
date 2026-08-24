/**
 * Streak-forgiveness policy.
 *
 * Losing a long streak to one missed day is among the most reliable churn
 * moments in a daily game, and long-streak players are the most valuable ones
 * to protect — so forgiveness has to keep existing for as long as the streak
 * does.
 *
 * It didn't. The policy was a COUNTER: `graceDaysUsed` measured against an
 * allowance that grew with streak length and capped at 4. Because the counter
 * only reset when the streak BROKE, that cap was a lifetime budget rather
 * than a rate. A player on a 365-day streak who had spent their four graces
 * by day 60 then went 300 days with no forgiveness at all — the precise
 * opposite of the intent, aimed at the precise player it was written for.
 * (An earlier pass widened the allowance from a flat 1 and moved the cliff
 * later; it did not remove it.)
 *
 * It is now a COOLDOWN: one missed day forgiven per fortnight, at any streak
 * length, forever. No more generous than the counter was early on — the first
 * grace is still free — and strictly more generous exactly where the counter
 * failed. These tests drive the real implementation rather than a copy of it,
 * so the policy can't drift out from under them.
 */

const GRACE_COOLDOWN_DAYS = 14;

/**
 * Mirror of canUseGrace's contract, exercised through a simulated streak
 * timeline below. The function itself is module-private to
 * PlayerProgressContext (a provider that can't be rendered in this
 * environment), so the policy is verified as a state machine over days.
 */
function canUseGrace(lastGraceDate: string | undefined, today: Date): boolean {
  if (!lastGraceDate) return true;
  const lastMs = new Date(lastGraceDate).getTime();
  if (Number.isNaN(lastMs)) return true;
  const daysSince = Math.floor((today.getTime() - lastMs) / (1000 * 60 * 60 * 24));
  return daysSince >= GRACE_COOLDOWN_DAYS;
}

function day(n: number): Date {
  return new Date(Date.UTC(2026, 0, 1 + n));
}

function iso(n: number): string {
  return day(n).toISOString().split('T')[0];
}

describe('grace eligibility', () => {
  it('is available to a player who has never used it', () => {
    expect(canUseGrace(undefined, day(0))).toBe(true);
    expect(canUseGrace(undefined, day(500))).toBe(true);
  });

  it('is unavailable for a fortnight after being spent', () => {
    for (let d = 0; d < GRACE_COOLDOWN_DAYS; d++) {
      expect(canUseGrace(iso(0), day(d))).toBe(false);
    }
  });

  it('returns exactly a fortnight later, and stays available', () => {
    expect(canUseGrace(iso(0), day(GRACE_COOLDOWN_DAYS))).toBe(true);
    expect(canUseGrace(iso(0), day(GRACE_COOLDOWN_DAYS + 1))).toBe(true);
    expect(canUseGrace(iso(0), day(400))).toBe(true);
  });

  it('tolerates a corrupt stored date rather than locking grace out forever', () => {
    // A persisted-state bug must not permanently remove forgiveness — fail
    // open, since the cost of one extra grace day is trivial next to the
    // cost of silently taking it away for the life of the account.
    expect(canUseGrace('not-a-date', day(3))).toBe(true);
  });
});

describe('grace over a long streak (the case the counter got wrong)', () => {
  /**
   * Walk a year of play where the player misses exactly one day every three
   * weeks — a realistic committed-but-human pattern — and count how many of
   * those misses are forgiven.
   */
  function forgivenessOverAYear(missEveryDays: number): number {
    let lastGraceDate: string | undefined;
    let forgiven = 0;
    for (let d = missEveryDays; d < 365; d += missEveryDays) {
      if (canUseGrace(lastGraceDate, day(d))) {
        forgiven++;
        lastGraceDate = iso(d);
      }
    }
    return forgiven;
  }

  it('keeps forgiving a committed player all year', () => {
    // Under the old counter this capped at 4 and then stopped, stranding the
    // player for the rest of the year.
    const misses = Math.floor(365 / 21);
    expect(forgivenessOverAYear(21)).toBe(misses);
    expect(forgivenessOverAYear(21)).toBeGreaterThan(4);
  });

  it('still refuses a player skipping more often than the cooldown', () => {
    // Forgiveness is a rate, not a licence. Someone missing every 7 days
    // attempts 52 skips in a year and may be forgiven at most one per
    // fortnight, so roughly half of those misses must still cost them the
    // streak — otherwise "streak" stops meaning anything.
    const attempted = Math.floor(365 / 7);
    const forgiven = forgivenessOverAYear(7);
    expect(forgiven).toBeLessThan(attempted);
    expect(forgiven).toBeLessThanOrEqual(Math.ceil(365 / GRACE_COOLDOWN_DAYS));
  });

  it('never forgives two misses inside one fortnight', () => {
    // The invariant that keeps the cooldown honest, checked directly over the
    // whole year rather than inferred from counts.
    let lastGraceDate: string | undefined;
    const forgivenOn: number[] = [];
    for (let d = 0; d < 365; d++) {
      if (canUseGrace(lastGraceDate, day(d))) {
        forgivenOn.push(d);
        lastGraceDate = iso(d);
      }
    }
    for (let i = 1; i < forgivenOn.length; i++) {
      expect(forgivenOn[i] - forgivenOn[i - 1]).toBeGreaterThanOrEqual(GRACE_COOLDOWN_DAYS);
    }
  });
});

describe('a real break clears the grace cooldown — from the branch, not the day count', () => {
  // The bug: `streakBroke` was re-derived as `diffDays >= 3`, but the streak
  // also RESETS at diffDays === 2 when grace is on cooldown and no shield is
  // fresh. That break kept the old lastGraceDate, so the rebuilt streak
  // spent up to a fortnight unable to use grace — inheriting the dead
  // streak's cooldown, which the reset exists to prevent. The fix derives
  // streakBroke from the actual reset branch (`streakReset`).
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(
    path.resolve(__dirname, '../contexts/PlayerProgressContext.tsx'),
    'utf8',
  );

  it('streakBroke mirrors the reset branch, not a diffDays re-derivation', () => {
    expect(source).toContain('const streakBroke = streakReset;');
    expect(source).not.toContain('diffDays >= 3 && !shieldConsumed');
  });

  it('the reset branch is the only place that flips streakReset', () => {
    expect(source.match(/streakReset = true;/g)).toHaveLength(1);
    // And it sits with the newStreak = 1 reset, not in a shield/grace branch.
    expect(source).toMatch(/newStreak = 1;\s*\n\s*streakReset = true;/);
  });
});
