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

import { notificationManager, resolveReminderHours } from './notifications';
import { eventManager } from './eventManager';
import { ENERGY } from '../constants';

// ─── 1. Streak Reminder ──────────────────────────────────────────────────────

/** Default local hour for the streak reminder (segment hour wins when set). */
const STREAK_REMINDER_HOUR = 20;
/** Default local hour for the daily-challenge reminder (segment hour wins). */
const DAILY_CHALLENGE_HOUR = 9;

/**
 * Seconds until the next occurrence of `hour` on a day the player has NOT
 * already done the thing being reminded about. Returns null when the target
 * would land in the past.
 *
 * Both reminders used to be REPEATING daily triggers, which meant they fired
 * on every single day including ones the player had already handled. Their
 * copy is written as fact — "Your {streak}-day streak expires tonight",
 * "Daily puzzle is ready!" — so on those days the app was simply wrong about
 * the player's own account. Irrelevant notifications are the main reason
 * people turn the channel off, and once it's off the whole re-engagement
 * surface goes with it, including the pings that would have been true.
 *
 * Exported for testing: this is date-boundary arithmetic where both failure
 * modes are bad. Too eager and it lies; too lazy and it never fires for the
 * players who needed it.
 */
export function reminderDelaySeconds(
  hour: number,
  alreadyDoneToday: boolean,
  now: Date = new Date(),
): number | null {
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);

  if (alreadyDoneToday || target.getTime() <= now.getTime()) {
    // Either today is already covered, or the hour has passed — aim at
    // tomorrow. A player who plays every morning therefore rolls the reminder
    // forward one day at a time and never sees it; one who skips a day gets
    // it exactly when it becomes true.
    target.setDate(target.getDate() + 1);
  }

  const seconds = Math.round((target.getTime() - now.getTime()) / 1000);
  return seconds > 0 ? seconds : null;
}

/**
 * Seconds until the next 8 PM on a day the player has NOT already played.
 * Returns null when there is no streak worth protecting.
 */
export function streakReminderDelaySeconds(
  currentStreak: number,
  lastPlayDate: string,
  now: Date = new Date(),
): number | null {
  if (currentStreak <= 0) return null;
  // "Today" must mean the same thing here as it does to the streak itself.
  // PlayerProgressContext records lastPlayDate as `toISOString().split('T')[0]`
  // — a UTC day — so the comparison is UTC even though the reminder fires at
  // 8 PM local. A local-day comparison here would disagree with the system
  // being reported on, which is how you end up pinging someone whose streak
  // is already safe.
  const playedToday = lastPlayDate === now.toISOString().split('T')[0];
  const hour = resolveReminderHours().streakReminderHour ?? STREAK_REMINDER_HOUR;
  return reminderDelaySeconds(hour, playedToday, now);
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
 * Schedule the daily-challenge reminder for the next 9 AM on a day whose
 * daily is still unplayed. Call on app open and after completing a daily.
 *
 * A new daily unlocks at UTC midnight, so `dailyCompleted` is checked against
 * the UTC day — the same boundary the daily board itself uses. Without this
 * check the reminder was a repeating 9 AM trigger announcing "Daily puzzle is
 * ready!" to players who had finished it at 8.
 */
export async function triggerDailyChallengeReminder(
  dailyCompleted: string[] = [],
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const seconds = reminderDelaySeconds(
    resolveReminderHours().dailyChallengeHour ?? DAILY_CHALLENGE_HOUR,
    dailyCompleted.includes(today),
  );
  if (seconds === null) {
    await notificationManager.cancel('daily_challenge');
    return;
  }
  await notificationManager.schedule('daily_challenge', {
    type: 'timeInterval',
    seconds,
  });
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
 * Schedule a comeback notification — 3 days out, or 20 hours for a player
 * with fewer than 10 puzzles solved (the D1 window decides new installs).
 * Call when the app goes to background (AppState change handler in App.tsx).
 * The notification service handles cancelling any previous comeback notification.
 */
export async function triggerComebackReminder(puzzlesSolved?: number): Promise<void> {
  await notificationManager.scheduleComebackReminder(puzzlesSolved);
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
