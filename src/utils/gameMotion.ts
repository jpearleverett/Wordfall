export function isLastWordTensionActive(
  totalWords: number,
  remainingWords: number,
  status: string,
): boolean {
  return totalWords >= 4 && remainingWords === 1 && status === 'playing';
}

export interface WordBankMotionPolicy {
  showLastWordEmphasis: boolean;
  animateLastWordLoop: boolean;
  animateLastWordOvershoot: boolean;
  animateTrace: boolean;
  animateFoundChip: boolean;
  settledTraceValue: 1;
}

export function getWordBankMotionPolicy(
  tensionActive: boolean,
  reduceMotion: boolean,
): WordBankMotionPolicy {
  const motionAllowed = !reduceMotion;
  return {
    showLastWordEmphasis: tensionActive,
    animateLastWordLoop: tensionActive && motionAllowed,
    animateLastWordOvershoot: tensionActive && motionAllowed,
    animateTrace: motionAllowed,
    animateFoundChip: motionAllowed,
    settledTraceValue: 1,
  };
}

export interface PuzzleCompleteMotionPolicy {
  animateDecorations: boolean;
  animateEntrance: boolean;
  animateStars: boolean;
  animateScore: boolean;
  state: {
    overlayOpacity: number;
    cardTranslateY: number;
    ribbonProgress: number;
    statsProgress: number;
    actionsProgress: number;
    glitchProgress: number;
    cardScale: number;
    cardOpacity: number;
    flawlessBadgeScale: number;
    flawlessBadgeOpacity: number;
    starsRevealed: boolean;
    displayedScore: number;
  };
}

export function getPuzzleCompleteMotionPolicy(
  reduceMotion: boolean,
  finalScore: number,
): PuzzleCompleteMotionPolicy {
  const animate = !reduceMotion;
  return {
    animateDecorations: animate,
    animateEntrance: animate,
    animateStars: animate,
    animateScore: animate,
    state: {
      overlayOpacity: animate ? 0 : 1,
      cardTranslateY: animate ? 30 : 0,
      ribbonProgress: animate ? 0 : 1,
      statsProgress: animate ? 0 : 1,
      actionsProgress: animate ? 0 : 1,
      glitchProgress: 0,
      cardScale: animate ? 0.93 : 1,
      cardOpacity: animate ? 0 : 1,
      flawlessBadgeScale: animate ? 0.6 : 1,
      flawlessBadgeOpacity: animate ? 0 : 1,
      starsRevealed: !animate,
      displayedScore: animate ? 0 : finalScore,
    },
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Mirrors GRACE_COOLDOWN_DAYS in PlayerProgressContext. */
const GRACE_COOLDOWN_DAYS = 14;
/** Local hour after which "your streak expires tonight" is honest copy. */
const STREAK_RISK_LOCAL_HOUR = 18;
const STREAK_SHIELD_MIN_STREAK = 3;

export interface StreakShieldOfferSnapshot {
  currentStreak: number;
  /** UTC day stamp ('YYYY-MM-DD') the streak was last credited — not a timestamp. */
  lastPlayDate?: string;
  streakShieldAvailable: boolean;
  lastGraceDate?: string;
  recentBreak?: { brokenAtMs: number } | null;
}

function utcDayStamp(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function graceAvailableAt(lastGraceDate: string | undefined, nowMs: number): boolean {
  if (!lastGraceDate) return true;
  const lastMs = new Date(lastGraceDate).getTime();
  if (!Number.isFinite(lastMs)) return true;
  return (nowMs - lastMs) / DAY_MS >= GRACE_COOLDOWN_DAYS;
}

/**
 * Whether the in-game streak-shield upsell has a real risk to point at.
 *
 * `lastPlayDate` is a UTC day stamp and `updateStreak()` banks today's day at
 * app open, so subtracting it from `Date.now()` and calling the result "hours
 * since last play" degenerates into "the UTC clock passed 20:00" — the offer
 * fired every evening on streaks that were already secured. A banked day
 * cannot expire tonight, so compare day stamps, then require an actual risk
 * signal (grace on cooldown, or the local day nearly over) the same way
 * HomeScreen's sibling trigger does.
 */
export function streakShieldOfferDue(
  streaks: StreakShieldOfferSnapshot | null | undefined,
  now: Date,
): boolean {
  if (!streaks) return false;
  if (streaks.currentStreak < STREAK_SHIELD_MIN_STREAK) return false;
  // Already protected — selling a second shield is charging for nothing.
  if (streaks.streakShieldAvailable) return false;
  if (!streaks.lastPlayDate) return false;
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) return false;
  // Never sell prevention on a comeback day: PostStreakBreakOffer owns the
  // 24h window after a break (same guard HomeScreen applies).
  const brokenAtMs = streaks.recentBreak?.brokenAtMs;
  if (typeof brokenAtMs === 'number' && nowMs - brokenAtMs < DAY_MS) return false;
  // Today's streak day is already banked → nothing expires tonight.
  if (streaks.lastPlayDate >= utcDayStamp(now)) return false;
  return (
    !graceAvailableAt(streaks.lastGraceDate, nowMs) ||
    now.getHours() >= STREAK_RISK_LOCAL_HOUR
  );
}

export interface MotionEligibilitySnapshot {
  reduceMotion: boolean;
  resolved: boolean;
}

/**
 * A mounted result may lose motion eligibility, but it can never gain it.
 * Passing `undefined` starts a new mount from the current shared snapshot.
 */
export function transitionMotionEligibility(
  current: boolean | undefined,
  snapshot: MotionEligibilitySnapshot,
): boolean {
  const snapshotEligible = snapshot.resolved && !snapshot.reduceMotion;
  return current === undefined
    ? snapshotEligible
    : current && snapshotEligible;
}
