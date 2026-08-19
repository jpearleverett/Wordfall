import { OnboardingMilestone } from '../types';

/**
 * Guided first-session milestones shown as a prominent banner on HomeScreen.
 * Each milestone triggers once when the player reaches the specified level,
 * guiding them through the first 5 levels with clear next-actions.
 */
export const ONBOARDING_MILESTONES: OnboardingMilestone[] = [
  {
    id: 'first_puzzle',
    triggerLevel: 1,
    message: 'Play your first real puzzle!',
    ctaLabel: 'PLAY NOW',
    action: 'play',
    icon: '🎮',
  },
  // NOTE: milestones must have DISTINCT triggerLevels — getNextMilestone
  // returns the highest eligible entry, so two at the same level means the
  // earlier one can effectively never display (the shadowed 'keep_going'
  // that used to sit at level 2 was deleted for exactly this reason).
  {
    id: 'mystery_wheel',
    triggerLevel: 2,
    message: 'You earned a Mystery Wheel spin!',
    ctaLabel: 'SPIN NOW',
    action: 'open_wheel',
    icon: '🎡',
  },
  {
    id: 'try_relax',
    // Relax actually unlocks at level 2 (MODE_CONFIGS); the banner fires at
    // 3 so it doesn't collide with the wheel milestone and stays true.
    triggerLevel: 3,
    message: 'New mode unlocked: Relax! No pressure, unlimited undos.',
    ctaLabel: 'TRY IT',
    action: 'try_mode',
    icon: '🌿',
  },
  {
    id: 'collections_intro',
    triggerLevel: 4,
    message: 'Your word collections are growing! Check them out.',
    ctaLabel: 'VIEW',
    action: 'open_collections',
    icon: '📖',
  },
  {
    id: 'library_tease',
    triggerLevel: 5,
    message: 'You earned a Library decoration! Unlock the Library at Level 9.',
    ctaLabel: 'KEEP PLAYING',
    action: 'tease_library',
    icon: '📚',
  },
  {
    id: 'try_booster',
    triggerLevel: 6,
    message: 'Boosters unlocked! Try using one on a tough puzzle.',
    ctaLabel: 'PLAY',
    action: 'play',
    icon: '⚡',
  },
  {
    id: 'weekly_goals_intro',
    triggerLevel: 7,
    message: 'Weekly goals are live! Complete them for bonus gems.',
    ctaLabel: 'VIEW GOALS',
    action: 'open_goals',
    icon: '📋',
  },
  {
    id: 'no_gravity_intro',
    triggerLevel: 8,
    message: 'No Gravity mode: letters stay put! Give it a try.',
    ctaLabel: 'TRY IT',
    action: 'try_mode',
    icon: '🚀',
  },
  {
    id: 'library_unlocked',
    triggerLevel: 9,
    message: 'The Grand Library is open! Place your first decoration.',
    ctaLabel: 'EXPLORE',
    action: 'open_library',
    icon: '📚',
  },
  {
    id: 'events_live',
    triggerLevel: 10,
    message: 'Events are live! Compete for exclusive rewards this week.',
    ctaLabel: 'VIEW EVENTS',
    action: 'open_events',
    icon: '🏆',
  },
  {
    id: 'time_pressure_tease',
    triggerLevel: 12,
    message: 'Time Pressure mode: race the clock for 1.5x score!',
    ctaLabel: 'TRY IT',
    action: 'try_mode',
    icon: '⏱',
  },
  {
    id: 'halfway_hero',
    triggerLevel: 15,
    message: "Level 15! You're halfway to Expert mode.",
    ctaLabel: 'KEEP GOING',
    action: 'play',
    icon: '🌟',
  },
];

/**
 * Get the next milestone to show for the current player state.
 * Returns null if all milestones are completed or none are available yet.
 *
 * Skips milestones the player has clearly outgrown — only shows
 * the most relevant milestone for the current level, not stale ones
 * from earlier levels that were never tapped.
 */
export function getNextMilestone(
  currentLevel: number,
  completedMilestones: string[],
): OnboardingMilestone | null {
  // Filter to milestones whose triggerLevel is reached and not yet completed.
  // A milestone also EXPIRES once the player is more than GRACE levels past
  // it — a level-160 player must not see "Level 15! You're halfway to
  // Expert mode." next to a "Play Level 160" CTA (Aug 2026 blind review
  // flagged the contradiction). Onboarding is over when it's outgrown.
  const GRACE = 5;
  const eligible = ONBOARDING_MILESTONES.filter(
    (m) =>
      m.triggerLevel <= currentLevel &&
      currentLevel <= m.triggerLevel + GRACE &&
      !completedMilestones.includes(m.id),
  );
  if (eligible.length === 0) return null;

  // Return the milestone closest to (but not exceeding) the current level.
  // This ensures we show the most relevant/recent milestone, not stale ones
  // from levels the player already passed without tapping the banner.
  return eligible[eligible.length - 1];
}
