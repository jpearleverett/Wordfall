/**
 * generateClubGoal must pick its template and stamp its goalId from ONE
 * clock. The template used to be chosen by a LOCAL-date hash while
 * startDate/goalId used the UTC date — club members in different timezones
 * (or one member between UTC and local midnight) computed different
 * templates for the same UTC-dated goalId, contradicting the "same goal for
 * the whole club" invariant the code documents.
 *
 * Jest workers run in UTC and runtime TZ swaps are inert there (jest's
 * process.env is a plain copy), so the guard is two-part: the UTC hash must
 * drive both template and goalId for an injected instant, and the path must
 * never consult the LOCAL calendar (getFullYear/getMonth/getDate) — which is
 * exactly what made the old hash timezone-dependent.
 */

import { generateClubGoal, CLUB_GOAL_TEMPLATES } from '../clubEvents';

describe('generateClubGoal template selection is UTC-anchored', () => {
  it('the UTC date hash drives the template, matching the goalId date', () => {
    // 05:00 UTC on Jan 11 2026 is still Jan 10 in any US timezone — a
    // local-date hash would pick a DIFFERENT template there.
    const now = new Date('2026-01-11T05:00:00.000Z');
    const goal = generateClubGoal('bronze', 10, now);

    const utcTemplate = CLUB_GOAL_TEMPLATES[20260111 % CLUB_GOAL_TEMPLATES.length];
    const previousDayTemplate =
      CLUB_GOAL_TEMPLATES[20260110 % CLUB_GOAL_TEMPLATES.length];
    // Sanity: the two dates genuinely map to different templates, so the
    // assertions below can tell the UTC hash from a drifted local one.
    expect(previousDayTemplate.id).not.toBe(utcTemplate.id);

    expect(goal.template.id).toBe(utcTemplate.id);
    expect(goal.goalId).toBe(`${utcTemplate.id}_2026-01-11`);
    expect(goal.startDate).toBe('2026-01-11');
  });

  it('never consults the LOCAL calendar (the source of the tz split)', () => {
    const spies = [
      jest.spyOn(Date.prototype, 'getFullYear'),
      jest.spyOn(Date.prototype, 'getMonth'),
      jest.spyOn(Date.prototype, 'getDate'),
    ];
    try {
      generateClubGoal('gold', 12, new Date('2026-01-11T05:00:00.000Z'));
      for (const spy of spies) {
        expect(spy).not.toHaveBeenCalled();
      }
    } finally {
      for (const spy of spies) {
        spy.mockRestore();
      }
    }
  });
});
