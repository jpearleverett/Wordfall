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
  {
    id: 'keep_going',
    triggerLevel: 2,
    message: 'Great solve! Keep the momentum going.',
    ctaLabel: 'NEXT PUZZLE',
    action: 'play_again',
    icon: '🔥',
  },
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
 */
export function getNextMilestone(
  currentLevel: number,
  completedMilestones: string[],
): OnboardingMilestone | null {
  return ONBOARDING_MILESTONES.find(
    (m) => m.triggerLevel <= currentLevel && !completedMilestones.includes(m.id),
  ) ?? null;
}
