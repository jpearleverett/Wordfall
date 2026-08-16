/**
 * STREAK REMINDER SCHEDULING.
 *
 * The reminder was a repeating daily 8 PM trigger, which meant it fired every
 * single day — including days the player had already played. Its copy reads
 * "Your {streak}-day streak expires tonight!", so on those days the app was
 * telling the player something demonstrably false about their own account.
 * Irrelevant notifications are the main reason people turn the channel off,
 * and once it's off the entire re-engagement surface goes with it.
 *
 * It now targets the next 8 PM on a day the player has NOT played. That is
 * date-boundary arithmetic where both failure modes are bad — schedule too
 * eagerly and it lies, too lazily and it never fires for the players whose
 * streaks are actually in danger — so the logic is a pure exported function
 * and these tests drive it with a fixed clock.
 */
// notificationTriggers pulls in the notification manager, which pulls in
// expo-device — untransformed ESM in this environment. Only the pure
// scheduling arithmetic is under test here, so stub the transport.
jest.mock('../notifications', () => ({
  notificationManager: {
    schedule: jest.fn(),
    cancel: jest.fn(),
    scheduleEnergyFull: jest.fn(),
    scheduleDailyChallenge: jest.fn(),
    scheduleEventEnding: jest.fn(),
    scheduleComebackReminder: jest.fn(),
  },
}));

import { reminderDelaySeconds, streakReminderDelaySeconds } from '../notificationTriggers';

const HOUR = 3600;

/** Local-time Date, since the 8 PM target is local. */
function at(year: number, month: number, day: number, hour: number, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/** The UTC day string, matching StreakData.lastPlayDate's format. */
function utcDay(date: Date): string {
  return date.toISOString().split('T')[0];
}

describe('streakReminderDelaySeconds', () => {
  it('schedules nothing when there is no streak to protect', () => {
    const now = at(2026, 8, 16, 9);
    expect(streakReminderDelaySeconds(0, utcDay(now), now)).toBeNull();
  });

  it('does NOT fire tonight when the player already played today', () => {
    // The bug in one line: a player finishes a puzzle at 8 AM and the old
    // scheduler still warned them at 8 PM that their streak was expiring.
    const now = at(2026, 8, 16, 8);
    const seconds = streakReminderDelaySeconds(5, utcDay(now), now);
    expect(seconds).not.toBeNull();
    // Tomorrow evening, not tonight — comfortably more than the 12 hours
    // until 8 PM today.
    expect(seconds!).toBeGreaterThan(24 * HOUR - 12 * HOUR);
    expect(seconds!).toBeGreaterThan(12 * HOUR);
  });

  it('fires tonight when the player has not played today', () => {
    const now = at(2026, 8, 16, 8);
    const yesterday = at(2026, 8, 15, 8);
    const seconds = streakReminderDelaySeconds(5, utcDay(yesterday), now);
    // 8 AM to 8 PM the same day.
    expect(seconds).toBe(12 * HOUR);
  });

  it('rolls to tomorrow when 8 PM has already passed', () => {
    // Scheduling a trigger in the past either throws or fires instantly;
    // neither is a reminder.
    const now = at(2026, 8, 16, 22);
    const yesterday = at(2026, 8, 15, 8);
    const seconds = streakReminderDelaySeconds(5, utcDay(yesterday), now);
    expect(seconds).toBe(22 * HOUR);
  });

  it('never returns a non-positive delay', () => {
    // Walk a full day at 15-minute steps through both played/not-played
    // states. Every result must be a genuinely future moment.
    const base = at(2026, 8, 16, 0);
    for (let step = 0; step < 96; step++) {
      const now = new Date(base.getTime() + step * 15 * 60 * 1000);
      for (const lastPlay of [utcDay(now), utcDay(at(2026, 8, 15, 8))]) {
        const seconds = streakReminderDelaySeconds(3, lastPlay, now);
        if (seconds !== null) expect(seconds).toBeGreaterThan(0);
      }
    }
  });

  it('never schedules more than a day out', () => {
    // A reminder further away than the streak window is useless — the streak
    // would already be gone by the time it landed.
    const base = at(2026, 8, 16, 0);
    for (let step = 0; step < 96; step++) {
      const now = new Date(base.getTime() + step * 15 * 60 * 1000);
      const seconds = streakReminderDelaySeconds(3, utcDay(now), now);
      expect(seconds!).toBeLessThanOrEqual(44 * HOUR);
    }
  });

  it('rolls forward one day at a time for a player who plays every morning', () => {
    // The intended steady state: someone with a long streak who plays daily
    // should never actually receive this notification, because each morning's
    // play pushes it to the following evening.
    for (let day = 10; day <= 20; day++) {
      const morning = at(2026, 8, day, 8);
      const seconds = streakReminderDelaySeconds(30, utcDay(morning), morning);
      // Always beyond tonight's 8 PM (12 hours away).
      expect(seconds!).toBeGreaterThan(12 * HOUR);
    }
  });
});

/**
 * The daily-challenge reminder shares the same scheduler and had the same
 * defect: a repeating 9 AM trigger announcing "Daily puzzle is ready!" to
 * players who had already finished it that morning.
 */
describe('daily-challenge reminder timing', () => {
  const NINE_AM = 9;

  it('waits until tomorrow when today\'s daily is already done', () => {
    const now = at(2026, 8, 16, 10);
    const seconds = reminderDelaySeconds(NINE_AM, true, now);
    // 10 AM today to 9 AM tomorrow.
    expect(seconds).toBe(23 * HOUR);
  });

  it('fires this morning when the daily is still unplayed', () => {
    const now = at(2026, 8, 16, 7);
    expect(reminderDelaySeconds(NINE_AM, false, now)).toBe(2 * HOUR);
  });

  it('rolls past a 9 AM that has already gone by', () => {
    const now = at(2026, 8, 16, 15);
    expect(reminderDelaySeconds(NINE_AM, false, now)).toBe(18 * HOUR);
  });

  it('always lands in the future, whatever the hour', () => {
    const base = at(2026, 8, 16, 0);
    for (let step = 0; step < 96; step++) {
      const now = new Date(base.getTime() + step * 15 * 60 * 1000);
      for (const done of [true, false]) {
        const seconds = reminderDelaySeconds(NINE_AM, done, now);
        expect(seconds).not.toBeNull();
        expect(seconds!).toBeGreaterThan(0);
        expect(seconds!).toBeLessThanOrEqual(48 * HOUR);
      }
    }
  });
});
