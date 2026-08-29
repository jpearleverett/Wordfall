/**
 * R6 (fun backlog): the single "almost done" meta goal for the Home screen.
 *
 * A level-50 player has plenty left (wing restorations, mastery tiers) but
 * none of it was visible from the screen they open — the only long-arc goal
 * on Home was the season pass, which resets monthly, so felt progression read
 * as a treadmill. This picks ONE concrete goal with a progress bar, in
 * priority order:
 *
 *   1. Wing restoration — when the player is within 2 chapters of finishing
 *      a Grand Library wing, the long-arc story goal wins the slot.
 *   2. Mastery of the current chapter.
 *
 * There used to be a chapter-star-gate goal between those two. It is gone:
 * chapter gates cannot bind (see the note at the branch site), so it promised
 * a lock that does not exist and was unreachable past chapter 2 regardless.
 *
 * Pure function of already-loaded state; no I/O.
 */
import { getAllChapters, getChapterForLevel } from './chapters';
import { getWing } from './library';
import { GameIconName } from '../components/icons/GameIcon';

export interface NextGoal {
  kind: 'wing' | 'chapter_mastery';
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

  // NO chapter-gate goal. `requiredStars` is 6 x (id - 1) while reaching
  // chapter id costs 15 x (id - 1) levels at a one-star minimum, so a gate is
  // satisfied 2.5x over at every boundary and can never be the thing standing
  // between a player and the next chapter. This branch used to promise
  // "Unlock Chapter 3: N stars to go" and was reachable only for chapters 1
  // and 2 — worst case a player holds level-1 stars, so it needed
  // 6(c + 2) > 15(c - 1), i.e. c < 3 — after which it silently fell through
  // to chapter_mastery anyway. Mastery is star-denominated, true at every
  // depth, and actually drives the replay the gate was pretending to.
  //
  // Offer mastery of the current chapter
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
