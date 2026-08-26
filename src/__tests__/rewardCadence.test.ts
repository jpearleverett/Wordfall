/**
 * Reward-cadence guard.
 *
 * A player should never go a long stretch of levels with no scheduled
 * payoff. The onboarding arc was dense — a bonus almost every level to 15 —
 * and then everything stopped: feature unlocks end at level 10, mode unlocks
 * at 22, and the only remaining scheduled reward was a chapter completion
 * every 15 levels. Levels 23-29 and 31-44 delivered nothing at all, right
 * where the D1-to-D7 habit is still forming.
 *
 * These tests pin the drumbeat so a future edit to the tables cannot quietly
 * reopen a dead stretch.
 */
import {
  EARLY_GAME_BONUSES,
  FEATURE_UNLOCK_SCHEDULE,
  MODE_CONFIGS,
  getScheduledLevelBonus,
} from '../constants';

/** Levels at which the player receives *something* scheduled. */
function scheduledRewardLevels(through = 1000): Set<number> {
  const levels = new Set<number>();
  for (let level = 1; level <= through; level++) {
    if (getScheduledLevelBonus(level)) levels.add(level);
  }
  for (const f of FEATURE_UNLOCK_SCHEDULE) levels.add(f.unlockLevel);
  for (const mode of Object.values(MODE_CONFIGS)) {
    const unlock = (mode as { unlockLevel?: number }).unlockLevel;
    if (typeof unlock === 'number') levels.add(unlock);
  }
  // Chapter completions land every 15 levels.
  for (let level = 15; level <= through; level += 15) levels.add(level);
  return levels;
}

/** Longest run of consecutive levels with no scheduled reward, within a range. */
function longestDryStretch(from: number, to: number): { length: number; endsAt: number } {
  const rewarded = scheduledRewardLevels();
  let run = 0;
  let worst = 0;
  let worstEnd = from;
  for (let level = from; level <= to; level++) {
    if (rewarded.has(level)) {
      run = 0;
    } else {
      run++;
      if (run > worst) {
        worst = run;
        worstEnd = level;
      }
    }
  }
  return { length: worst, endsAt: worstEnd };
}

describe('reward cadence', () => {
  it('the onboarding arc (1-15) pays out almost every level', () => {
    const rewarded = scheduledRewardLevels();
    let count = 0;
    for (let level = 1; level <= 15; level++) if (rewarded.has(level)) count++;
    expect(count).toBeGreaterThanOrEqual(13);
  });

  it('no dead stretch longer than 5 levels through level 60', () => {
    // Was 7 (levels 23-29) before the sustained schedule landed.
    const { length } = longestDryStretch(16, 60);
    expect(length).toBeLessThanOrEqual(5);
  });

  it('no dead stretch longer than 9 levels through level 150', () => {
    // Cadence widens to every 10 levels past 60 — deliberate, since sessions
    // are longer by then and chapter completions carry more weight.
    const { length } = longestDryStretch(61, 150);
    expect(length).toBeLessThanOrEqual(9);
  });

  it('no dead stretch longer than 14 levels through level 1000', () => {
    // The schedule used to end dead at L150, leaving the entire L151-1000
    // band with only the every-15-levels chapter completion — this guard
    // extends with the procedural drumbeat so it cannot silently regress.
    const { length, endsAt } = longestDryStretch(151, 1000);
    expect({ length, endsAt }).toEqual(expect.objectContaining({ length: expect.any(Number) }));
    expect(length).toBeLessThanOrEqual(14);
  });

  it('the post-150 drumbeat is consumable-weighted, with currency confined to centuries', () => {
    for (let level = 151; level <= 1000; level++) {
      const bonus = getScheduledLevelBonus(level);
      if (!bonus) continue;
      if (level % 100 !== 0) {
        // Non-century milestones must not pay raw currency — the Aug 2026
        // faucet cuts drained a 2-3x surplus; the drumbeat must not refill it.
        expect(bonus.coins ?? 0).toBe(0);
        expect(bonus.gems ?? 0).toBe(0);
        expect((bonus.hints ?? 0) + (bonus.wheelSpins ?? 0)).toBeGreaterThan(0);
      } else {
        expect(bonus.coins ?? 0).toBeLessThanOrEqual(250);
        expect(bonus.gems ?? 0).toBeLessThanOrEqual(10);
      }
    }
  });

  it('milestone gifts stay proportionate to the economy', () => {
    // A hint refill is 50 coins and a booster 200. Gifts should buy a couple
    // of concrete things without becoming a faucet.
    for (const bonus of EARLY_GAME_BONUSES) {
      if (bonus.coins) expect(bonus.coins).toBeLessThanOrEqual(600);
      if (bonus.gems) expect(bonus.gems).toBeLessThanOrEqual(20);
      if (bonus.hints) expect(bonus.hints).toBeLessThanOrEqual(3);
      if (bonus.wheelSpins) expect(bonus.wheelSpins).toBeLessThanOrEqual(1);
    }
  });

  it('every bonus level is unique (no double grant on one level)', () => {
    const seen = new Set<number>();
    for (const bonus of EARLY_GAME_BONUSES) {
      expect(seen.has(bonus.level)).toBe(false);
      seen.add(bonus.level);
    }
  });
});
