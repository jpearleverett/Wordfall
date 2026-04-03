/**
 * Notification Triggers
 *
 * Wires push notification scheduling to gameplay events.
 * Each function is idempotent — cancels any previous notification
 * of the same category before scheduling a new one.
 *
 * All scheduling goes through the NotificationManager singleton
 * which handles permission checks, platform differences, and
 * graceful degradation when notifications are unavailable.
 */

import { notificationManager } from './notifications';
import { eventManager } from './eventManager';
import { ENERGY } from '../constants';
import { StreakData } from '../types';

// ─── 1. Streak Reminder ──────────────────────────────────────────────────────

/**
 * Schedule a streak reminder at 8 PM daily.
 * Call after streak is updated (updateStreak in PlayerContext or App.tsx).
 * Only schedules if the player has an active streak (>= 1 day).
 * Cancels if streak is 0.
 */
export async function triggerStreakReminder(currentStreak: number): Promise<void> {
  if (currentStreak <= 0) {
    await notificationManager.cancel('streak_reminder');
    return;
  }
  await notificationManager.scheduleStreakReminder(currentStreak);
}

// ─── 2. Energy Full ──────────────────────────────────────────────────────────

/**
 * Schedule a notification for when energy will be fully refilled.
 * Call when energy drops (after useEnergy in PlayerContext).
 *
 * @param currentEnergy - The current energy count after spending
 * @param maxEnergy - The maximum energy (default from ENERGY.MAX)
 */
export async function triggerEnergyFullNotification(
  currentEnergy: number,
  maxEnergy: number = ENERGY.MAX,
): Promise<void> {
  if (currentEnergy >= maxEnergy) {
    // Energy is already full — cancel any pending notification
    await notificationManager.cancel('energy_full');
    return;
  }

  const energyNeeded = maxEnergy - currentEnergy;
  const secondsUntilFull = energyNeeded * ENERGY.REGEN_MINUTES * 60;
  await notificationManager.scheduleEnergyFull(secondsUntilFull);
}

// ─── 3. Event Starting / Ending ──────────────────────────────────────────────

/**
 * Check for active events and schedule end-of-event reminders.
 * Cancels old event notifications before scheduling new ones.
 * Call on app open (in the loaded useEffect in App.tsx).
 */
export async function triggerEventNotifications(): Promise<void> {
  // Cancel previous event notifications (both starting and ending)
  await notificationManager.cancel('event_starting');
  await notificationManager.cancel('event_ending');

  const activeEvents = eventManager.getActiveEvents();
  if (activeEvents.length === 0) return;

  // Find the main event (highest priority) for the ending reminder
  const mainEvent = activeEvents.find(e => e.type === 'main') || activeEvents[0];
  const now = Date.now();
  const msRemaining = mainEvent.endTime - now;

  if (msRemaining <= 0) return;

  const hoursLeft = msRemaining / (1000 * 60 * 60);

  // Only schedule an ending reminder if the event has more than 2 hours left
  // (the convenience method already subtracts 2 hours from the trigger time)
  if (hoursLeft > 2) {
    await notificationManager.scheduleEventEnding(mainEvent.name, hoursLeft);
  }
}

// ─── 4. Daily Challenge ──────────────────────────────────────────────────────

/**
 * Schedule the daily challenge reminder at 9 AM.
 * Call on app open. The notification service handles idempotency
 * (cancels previous daily_challenge before scheduling).
 */
export async function triggerDailyChallengeReminder(): Promise<void> {
  await notificationManager.scheduleDailyChallenge();
}

// ─── 5. Win Streak Milestone ─────────────────────────────────────────────────

/**
 * Send an immediate local notification congratulating a win streak milestone.
 * Call when a win streak milestone is hit (3/5/7/10/15/20).
 *
 * @param streak - The milestone streak count
 */
export async function triggerWinStreakMilestoneNotification(streak: number): Promise<void> {
  // Schedule with a 1-second delay so it fires almost immediately
  // (instant notifications require a trigger; minimum is 1 second)
  await notificationManager.schedule(
    'win_streak',
    { type: 'timeInterval', seconds: 1 },
    { streak },
  );
}

// ─── 6. Comeback Reminder ────────────────────────────────────────────────────

/**
 * Schedule a comeback notification for 3 days from now.
 * Call when the app goes to background (AppState change handler in App.tsx).
 * The notification service handles cancelling any previous comeback notification.
 */
export async function triggerComebackReminder(): Promise<void> {
  await notificationManager.scheduleComebackReminder();
}

/**
 * Cancel the comeback reminder. Call when app comes to foreground
 * so the player doesn't get a "we miss you" while actively playing.
 */
export async function cancelComebackReminder(): Promise<void> {
  await notificationManager.cancel('comeback');
}

// ─── 7. Streak At Risk ──────────────────────────────────────────────────────

/**
 * Schedule a streak-at-risk notification if the player has a meaningful streak
 * (>= 3 days) and hasn't played in 20+ hours. Fires 2 hours after being called.
 * Call periodically (e.g. on app open or AppState change).
 *
 * @param streak - The player's current streak data
 */
export async function triggerStreakAtRiskNotification(streak: StreakData): Promise<void> {
  // Only care about meaningful streaks
  if (streak.currentStreak < 3) {
    await notificationManager.cancel('streak_reminder');
    return;
  }

  // Check if the last play was 20+ hours ago
  const lastPlayMs = new Date(streak.lastCompletedDate).getTime();
  const hoursSinceLastPlay = (Date.now() - lastPlayMs) / (1000 * 60 * 60);

  if (hoursSinceLastPlay < 20) {
    // Not at risk yet — cancel any pending at-risk notification
    await notificationManager.cancel('streak_reminder');
    return;
  }

  // Schedule a notification 2 hours from now
  const twoHoursInSeconds = 2 * 60 * 60;
  await notificationManager.schedule(
    'streak_reminder',
    { type: 'timeInterval', seconds: twoHoursInSeconds },
    { streak: streak.currentStreak },
  );
}

// ─── 8. Friend Beat Score ───────────────────────────────────────────────────

/**
 * Schedule an immediate notification when a friend beats the player's score
 * on a specific level. Uses the friend_activity notification category.
 *
 * @param friendName - Display name of the friend who beat the score
 * @param level - The level number where the score was beaten
 */
export async function triggerFriendBeatScoreNotification(
  friendName: string,
  level: number,
): Promise<void> {
  // Schedule with a 1-second delay (minimum for time interval triggers)
  await notificationManager.schedule(
    'friend_activity',
    { type: 'timeInterval', seconds: 1 },
    { friendName, level },
  );
}
