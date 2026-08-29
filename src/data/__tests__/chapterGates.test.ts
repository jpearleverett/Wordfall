/**
 * Chapter star gates are a GUARD RAIL, never a wall — and that is deliberate.
 *
 * `requiredStars` is enforced for real: crossing into a chapter whose gate you
 * have not met clamps you to the last level of the one you are in
 * (`PlayerProgressContext.recordPuzzleComplete`). But it can never fire on the
 * authored ladder. Stars are an ASSIST TIER — 3 for a clean solve, 2 for one
 * assist, 1 for more — so a win is worth at least one star, and reaching
 * chapter N means winning 15(N-1) levels against a gate of 6(N-1). Two and a
 * half times the slack, at every boundary, forever.
 *
 * WHY IT SHOULD STAY THAT WAY. To bind, a gate has to demand more than one
 * star per level, i.e. at most one assist per level. Stars here measure assist
 * usage, not skill, so a binding gate walls off precisely the players who buy
 * hints — and the rest of the game is pushing that cohort the other way:
 * FailBreatherOffer hands out free hints after two fails, the adaptive easer
 * triggers at averageStars < 2.4, and the rescue ladder exists to sell
 * assists. A binding star gate would make the shop sell a consumable that
 * damages the player's own progression, which is the one thing an F2P economy
 * must never do.
 *
 * So this suite pins the property rather than the numbers: raise a gate past
 * the ceiling and you get a failing assertion pointing at this argument,
 * instead of rediscovering it from a support ticket.
 */
import { CHAPTERS } from '../chapters';
import { generateProceduralChapter } from '../../engine/puzzleGenerator';

const LEVELS_PER_CHAPTER = 15;
const MIN_STARS_PER_WIN = 1;

describe('chapter star gates', () => {
  it('never demand more stars than the levels before them are guaranteed to pay', () => {
    for (const chapter of CHAPTERS) {
      const levelsBefore = (chapter.id - 1) * LEVELS_PER_CHAPTER;
      const guaranteed = levelsBefore * MIN_STARS_PER_WIN;
      // Named in the failure message so a violation says WHICH chapter.
      expect(`ch${chapter.id} ${chapter.name}: ${chapter.requiredStars} <= ${guaranteed}`)
        .toBe(`ch${chapter.id} ${chapter.name}: ${Math.min(chapter.requiredStars, guaranteed)} <= ${guaranteed}`);
    }
  });

  it('holds for the procedural tail as well', () => {
    // Procedural chapters start at 41; 40 is the last curated one.
    for (let id = CHAPTERS.length + 1; id <= CHAPTERS.length + 60; id++) {
      const chapter = generateProceduralChapter(id);
      const levelsBefore = (chapter.id - 1) * LEVELS_PER_CHAPTER;
      expect(chapter.requiredStars).toBeLessThanOrEqual(levelsBefore * MIN_STARS_PER_WIN);
    }
  });

  it('a one-star-per-level player clears every authored gate', () => {
    // The worst player who still finishes every level: one star each.
    let earned = 0;
    for (const chapter of CHAPTERS) {
      expect(earned).toBeGreaterThanOrEqual(chapter.requiredStars);
      earned += LEVELS_PER_CHAPTER * MIN_STARS_PER_WIN;
    }
  });
});
