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

// ─── 1. Streak Reminder ──────────────────────────────────────────────────────

/** Local hour the streak reminder fires on a day the streak is at risk. */
const STREAK_REMINDER_HOUR = 20;

/**
 * Seconds until the next 8 PM on a day the player has NOT already played.
 * Returns null when no reminder should be scheduled.
 *
 * The reminder used to be a repeating daily trigger, which meant it fired on
 * every single day including ones the player had already played — telling
 * someone who finished a puzzle at 8 AM that their streak "expires tonight"
 * is not just noise, it is false. Irrelevant notifications are the main
 * reason players turn the channel off, and once it's off the whole
 * re-engagement surface is gone, so the fix is worth more than the ping.
 *
 * Exported for testing: the arithmetic is date-boundary logic and the cost of
 * getting it wrong is either silence or a lie.
 */
export function streakReminderDelaySeconds(
  currentStreak: number,
  lastPlayDate: string,
  now: Date = new Date(),
): number | null {
  if (currentStreak <= 0) return null;

  const target = new Date(now);
  target.setHours(STREAK_REMINDER_HOUR, 0, 0, 0);

  // "Today" must mean the same thing here as it does to the streak itself.
  // PlayerProgressContext records lastPlayDate as `toISOString().split('T')[0]`
  // — a UTC day — so the comparison is UTC even though the reminder fires at
  // 8 PM local. Using a local day here instead would make the reminder
  // disagree with the system it is reporting on, which is how you end up
  // pinging someone whose streak is already safe.
  const playedToday = lastPlayDate === now.toISOString().split('T')[0];
  if (playedToday || target.getTime() <= now.getTime()) {
    // Either today is already safe, or 8 PM has passed — aim at tomorrow. A
    // player who plays every morning therefore keeps rolling the reminder
    // forward one day at a time and never sees it; one who skips a day gets
    // it exactly on the evening it becomes true.
    target.setDate(target.getDate() + 1);
  }

  const seconds = Math.round((target.getTime() - now.getTime()) / 1000);
  return seconds > 0 ? seconds : null;
}

/**
 * Schedule the streak reminder for the next evening the streak is actually
 * at risk. Call after the streak is updated (updateStreak in PlayerContext
 * or App.tsx) and on app open. Cancels if the streak is 0.
 */
export async function triggerStreakReminder(
  currentStreak: number,
  lastPlayDate: string = '',
): Promise<void> {
  const seconds = streakReminderDelaySeconds(currentStreak, lastPlayDate);
  if (seconds === null) {
    await notificationManager.cancel('streak_reminder');
    return;
  }
  await notificationManager.schedule(
    'streak_reminder',
    { type: 'timeInterval', seconds },
    { streak: currentStreak },
  );
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

// ─── 7. Social Proof ───────────────────────────────────────────────────────

/**
 * Schedule an immediate notification when a friend completes a chapter
 * or achieves a milestone. Provides social proof to encourage the player
 * to keep playing.
 *
 * @param friendName - Display name of the friend
 * @param event - What the friend did (e.g. "completed Chapter 5", "earned Gold Star prestige")
 * @param detail - Additional context for the notification body
 */
export async function triggerSocialProofNotification(
  friendName: string,
  event: string,
  detail: string,
): Promise<void> {
  if (!friendName || !event) return;

  await notificationManager.schedule(
    'friend_activity',
    { type: 'timeInterval', seconds: 1 },
    { friendName, level: detail },
  );
}

// ─── 9. Friend Beat Score ───────────────────────────────────────────────────

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
