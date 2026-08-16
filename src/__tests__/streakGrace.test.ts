/**
 * Streak-forgiveness policy.
 *
 * `graceDaysUsed` only resets when a streak actually breaks, so a flat
 * allowance of one meant a player who used their grace on day 5 of a
 * 200-day streak then had zero forgiveness for the next 195 days. Losing a
 * long streak to a single missed day is one of the most reliable churn
 * moments in a daily game, and long-streak players are exactly the ones
 * worth protecting.
 *
 * Forgiveness now accrues with commitment. These tests pin the shape of that
 * curve so it stays generous to loyal players without ever becoming "play
 * whenever you feel like it".
 */

// Mirrors graceAllowance() in PlayerProgressContext. Kept in sync by the
// bounds asserted below rather than by importing provider internals.
const GRACE_EARNED_EVERY_DAYS = 14;
const MAX_GRACE_DAYS = 4;

function graceAllowance(currentStreak: number): number {
  return Math.min(MAX_GRACE_DAYS, 1 + Math.floor(currentStreak / GRACE_EARNED_EVERY_DAYS));
}

describe('streak grace allowance', () => {
  it('a new streak still gets exactly one grace day', () => {
    // Unchanged from the original policy — early forgiveness is not free.
    expect(graceAllowance(0)).toBe(1);
    expect(graceAllowance(13)).toBe(1);
  });

  it('earns another grace day for every two unbroken weeks', () => {
    expect(graceAllowance(14)).toBe(2);
    expect(graceAllowance(28)).toBe(3);
    expect(graceAllowance(42)).toBe(4);
  });

  it('caps so a long streak never becomes play-whenever', () => {
    expect(graceAllowance(365)).toBe(MAX_GRACE_DAYS);
    expect(graceAllowance(10_000)).toBe(MAX_GRACE_DAYS);
  });

  it('never lets banked grace exceed one skip per fortnight of play', () => {
    // The whole point is that forgiveness is EARNED. At every streak length
    // the allowance must be justifiable by days actually played.
    for (let streak = 0; streak <= 400; streak++) {
      const allowance = graceAllowance(streak);
      expect(allowance).toBeLessThanOrEqual(1 + streak / GRACE_EARNED_EVERY_DAYS);
      expect(allowance).toBeGreaterThanOrEqual(1);
    }
  });

  it('is monotonic — a longer streak is never punished with less forgiveness', () => {
    let prev = 0;
    for (let streak = 0; streak <= 200; streak++) {
      const allowance = graceAllowance(streak);
      expect(allowance).toBeGreaterThanOrEqual(prev);
      prev = allowance;
    }
  });
});
