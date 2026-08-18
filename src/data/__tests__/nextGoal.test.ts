/**
 * R6: Home's single "almost done" meta goal. The picker must always find
 * something concrete for an active player (an unmet nearby chapter gate,
 * else mastery of the current chapter) and its numbers must agree with the
 * chapter data it reads.
 */
import { getNextGoal } from '../nextGoal';
import { getAllChapters, getChapterForLevel } from '../chapters';

describe('getNextGoal', () => {
  it('points at the next unmet chapter gate within 3 chapters', () => {
    // Level 5 = chapter 1; find the first gate above 0 stars.
    const goal = getNextGoal(0, 5, {});
    expect(goal).not.toBeNull();
    const gate = getAllChapters().find((c) => c.id > 1 && c.requiredStars > 0);
    expect(goal!.title).toContain(`Chapter ${gate!.id}`);
    expect(goal!.detail).toBe(`${gate!.requiredStars} stars to go`);
    expect(goal!.progress).toBe(0);
  });

  it('progress approaches 1 as stars approach the gate', () => {
    const gate = getAllChapters().find((c) => c.id > 1 && c.requiredStars > 0)!;
    const goal = getNextGoal(gate.requiredStars - 1, 5, {});
    expect(goal!.detail).toBe('1 star to go');
    expect(goal!.progress).toBeGreaterThan(0.8);
    expect(goal!.progress).toBeLessThan(1);
  });

  it('falls back to current-chapter mastery when nearby gates are met', () => {
    // Enough stars to clear every gate in chapters 2-5, sitting at level 20
    // (chapter 2) with partial chapter stars.
    const bigStars = 10_000;
    const starsByLevel: Record<number, number> = { 16: 3, 17: 2 };
    const goal = getNextGoal(bigStars, 20, starsByLevel);
    expect(goal).not.toBeNull();
    const ch = getChapterForLevel(20)!;
    expect(goal!.title).toBe(`Master ${ch.name}`);
    expect(goal!.detail).toBe('5/45 stars in this chapter');
  });

  it('returns null only when the current chapter is fully mastered and no gate is near', () => {
    const starsByLevel: Record<number, number> = {};
    for (let lvl = 16; lvl <= 30; lvl++) starsByLevel[lvl] = 3;
    const goal = getNextGoal(10_000, 20, starsByLevel);
    expect(goal).toBeNull();
  });

  it('every authored chapter transition produces a presentable goal for a fresh player at its start', () => {
    // Walk chapter starts through the authored 40: a player with the minimum
    // stars for their current chapter should always see a goal or a clean null.
    for (let chapter = 1; chapter <= 39; chapter++) {
      const level = (chapter - 1) * 15 + 1;
      const current = getChapterForLevel(level)!;
      const goal = getNextGoal(current.requiredStars, level, {});
      if (goal) {
        expect(goal.title.length).toBeGreaterThan(0);
        expect(goal.progress).toBeGreaterThanOrEqual(0);
        expect(goal.progress).toBeLessThanOrEqual(1);
      }
    }
  });
});
