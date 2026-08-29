/**
 * R6: Home's single "almost done" meta goal. The picker must always find
 * something concrete for an active player — a nearby wing restoration, else
 * mastery of the current chapter — and its numbers must agree with the
 * chapter data it reads.
 *
 * The chapter-star-gate goal it used to offer is gone. Gates cannot bind
 * (6 x (id - 1) required against 15 x (id - 1) levels earned at a one-star
 * minimum), so it promised a lock the game does not have.
 */
import { getNextGoal } from '../nextGoal';
import { getAllChapters, getChapterForLevel } from '../chapters';

describe('getNextGoal', () => {
  it('never offers a chapter star gate, because none can bind', () => {
    // A player at level 5 with zero stars is the most gate-eligible state
    // there is, and even they must not be shown one.
    for (const [stars, level] of [[0, 5], [3, 12], [40, 40], [200, 200]] as const) {
      const goal = getNextGoal(stars, level, {});
      expect(goal).not.toBeNull();
      expect(goal!.kind).not.toBe('chapter_gate');
      expect(goal!.title).not.toMatch(/^Unlock Chapter/);
      expect(goal!.detail).not.toMatch(/stars? to go$/);
    }
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
