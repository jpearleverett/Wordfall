/**
 * R6 (fun backlog): the single "almost done" meta goal for the Home screen.
 *
 * A level-50 player has plenty left (chapter gates, wing restorations,
 * mastery tiers) but none of it was visible from the screen they open — the
 * only long-arc goal on Home was the season pass, which resets monthly, so
 * felt progression read as a treadmill. This picks ONE concrete goal with a
 * progress bar: the next chapter star gate the player hasn't cleared, or —
 * when every nearby gate is already met — mastery of the current chapter.
 *
 * Pure function of already-loaded state; no I/O.
 */
import { getAllChapters, getChapterForLevel } from './chapters';

export interface NextGoal {
  icon: string;
  /** e.g. "Unlock Chapter 5: Summit Trail" */
  title: string;
  /** e.g. "4 stars to go" */
  detail: string;
  /** 0..1 */
  progress: number;
}

const PUZZLES_PER_CHAPTER = 15;
const MAX_STARS_PER_CHAPTER = PUZZLES_PER_CHAPTER * 3;

export function getNextGoal(
  totalStars: number,
  currentLevel: number,
  starsByLevel: Record<number, number>,
): NextGoal | null {
  const chapters = getAllChapters();
  const current = getChapterForLevel(currentLevel);
  if (!current) return null;

  // The next unmet star gate within the next three chapters — close enough
  // to feel reachable, far enough to be worth a bar.
  const upcomingGate = chapters.find(
    (c) =>
      c.id > current.id &&
      c.id <= current.id + 3 &&
      c.requiredStars > totalStars,
  );
  if (upcomingGate) {
    const remaining = upcomingGate.requiredStars - totalStars;
    return {
      icon: upcomingGate.icon,
      title: `Unlock Chapter ${upcomingGate.id}: ${upcomingGate.name}`,
      detail: `${remaining} star${remaining === 1 ? '' : 's'} to go`,
      progress: Math.min(1, totalStars / upcomingGate.requiredStars),
    };
  }

  // Every nearby gate already met — offer mastery of the current chapter
  // (3-starring its 15 levels) instead of showing nothing.
  const firstLevel = (current.id - 1) * PUZZLES_PER_CHAPTER + 1;
  let chapterStars = 0;
  for (let lvl = firstLevel; lvl < firstLevel + PUZZLES_PER_CHAPTER; lvl++) {
    chapterStars += starsByLevel[lvl] ?? 0;
  }
  if (chapterStars >= MAX_STARS_PER_CHAPTER) return null; // fully mastered
  return {
    icon: current.icon,
    title: `Master ${current.name}`,
    detail: `${chapterStars}/${MAX_STARS_PER_CHAPTER} stars in this chapter`,
    progress: chapterStars / MAX_STARS_PER_CHAPTER,
  };
}
