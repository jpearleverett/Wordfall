/**
 * R6 (fun backlog): the single "almost done" meta goal for the Home screen.
 *
 * A level-50 player has plenty left (chapter gates, wing restorations,
 * mastery tiers) but none of it was visible from the screen they open — the
 * only long-arc goal on Home was the season pass, which resets monthly, so
 * felt progression read as a treadmill. This picks ONE concrete goal with a
 * progress bar, in priority order:
 *
 *   1. Wing restoration — when the player is within 2 chapters of finishing
 *      a Grand Library wing, the long-arc story goal wins the slot.
 *   2. The next chapter star gate the player hasn't cleared.
 *   3. Mastery of the current chapter (when every nearby gate is met).
 *
 * Pure function of already-loaded state; no I/O.
 */
import { getAllChapters, getChapterForLevel } from './chapters';
import { getWing } from './library';
import { GameIconName } from '../components/icons/GameIcon';

export interface NextGoal {
  kind: 'wing' | 'chapter_gate' | 'chapter_mastery';
  /** Emoji glyph (chapter icon) — legacy path, resolved via GameIcon glyph. */
  icon: string;
  /** Direct GameIcon name — set for wing goals (the wing's emblem). */
  iconName?: GameIconName;
  /** Wing accent color — set for wing goals; tints the card/progress bar. */
  accent?: string;
  /** Set for wing goals. */
  wingId?: string;
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

  // Wing restoration: when the finish line of the current wing is close
  // (final 2 chapters), surface the Grand Library story goal ahead of star
  // gates. Guard on the wing's chapter range actually containing the
  // current chapter so procedural/annex wingIds (whose fallback range is
  // synthetic) never claim the slot.
  const wing = getWing(current.wingId);
  const [wingStart, wingEnd] = wing.chapters;
  if (current.id >= wingStart && current.id <= wingEnd) {
    const chaptersToGo = wingEnd - current.id + 1; // current chapter counts
    if (chaptersToGo <= 2) {
      const firstWingLevel = (wingStart - 1) * PUZZLES_PER_CHAPTER + 1;
      const totalWingLevels = (wingEnd - wingStart + 1) * PUZZLES_PER_CHAPTER;
      const progress = Math.max(
        0,
        Math.min(0.99, (currentLevel - firstWingLevel) / totalWingLevels),
      );
      return {
        kind: 'wing',
        icon: current.icon,
        iconName: wing.icon,
        accent: wing.accent,
        wingId: wing.id,
        title: `Restore the ${wing.name} Wing`,
        detail: `${chaptersToGo} chapter${chaptersToGo === 1 ? '' : 's'} to go`,
        progress,
      };
    }
  }

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
      kind: 'chapter_gate',
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
    kind: 'chapter_mastery',
    icon: current.icon,
    title: `Master ${current.name}`,
    detail: `${chapterStars}/${MAX_STARS_PER_CHAPTER} stars in this chapter`,
    progress: chapterStars / MAX_STARS_PER_CHAPTER,
  };
}
