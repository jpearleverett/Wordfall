/**
 * Push Notification Service
 *
 * Implements the "external trigger" layer of the Hooked Model.
 * Without push notifications, retention relies entirely on player habit (pull-only).
 *
 * SETUP REQUIRED:
 * 1. Run: npx expo install expo-notifications expo-device expo-constants
 * 2. Add "expo-notifications" to app.json plugins array
 * 3. For Android: Add Firebase Cloud Messaging (FCM) credentials
 * 4. For iOS: Configure Apple Push Notification service (APNs) in Apple Developer account
 *
 * This service provides both local notifications (scheduled on-device, no server needed)
 * and scaffolding for remote push notifications (requires Firebase Cloud Functions).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  trigger: NotificationTrigger;
  data?: Record<string, unknown>;
}

export type NotificationTrigger =
  | { type: 'timeInterval'; seconds: number; repeats?: boolean }
  | { type: 'daily'; hour: number; minute: number }
  | { type: 'weekly'; weekday: number; hour: number; minute: number };

export type NotificationCategory =
  | 'streak_reminder'
  | 'energy_full'
  | 'event_starting'
  | 'event_ending'
  | 'daily_challenge'
  | 'friend_activity'
  | 'comeback'
  | 'mystery_wheel'
  | 'win_streak';

// ─── Notification Templates ────────────────────────────────────────────────────

const NOTIFICATION_TEMPLATES: Record<NotificationCategory, { titles: string[]; bodies: string[] }> = {
  streak_reminder: {
    titles: ['Don\'t lose your streak!', 'Streak alert!', 'Keep it going!'],
    bodies: [
      'Your {streak}-day streak expires tonight! Play one puzzle to keep it alive.',
      'Just one puzzle to protect your streak. You\'ve got this!',
      '{streak} days strong! Don\'t break the chain.',
    ],
  },
  energy_full: {
    titles: ['Lives restored!', 'Ready to play!', 'All lives full!'],
    bodies: [
      'Your lives are full again. Time for some word puzzles!',
      'You\'ve got 5 lives waiting. Let\'s find some words!',
      'Full energy! A fresh set of puzzles awaits.',
    ],
  },
  event_starting: {
    titles: ['New event: {eventName}!', 'Event alert!', '{eventName} starts now!'],
    bodies: [
      '{eventName} just started! Compete for exclusive rewards.',
      'A new event is live! Don\'t miss the {eventName} exclusive rewards.',
      'Ready for {eventName}? Exclusive rewards are up for grabs!',
    ],
  },
  event_ending: {
    titles: ['Event ending soon!', 'Last chance!', '{eventName} ends today!'],
    bodies: [
      '{eventName} ends in {hours} hours! Claim your rewards before it\'s too late.',
      'Time is running out on {eventName}. Don\'t miss the exclusive rewards!',
      'Only {hours} hours left in {eventName}!',
    ],
  },
  daily_challenge: {
    titles: ['Daily puzzle is ready!', 'New daily challenge!', 'Today\'s puzzle awaits!'],
    bodies: [
      'A fresh daily puzzle is waiting. Can you get 3 stars?',
      'Today\'s daily challenge is live. Beat your friends!',
      'New day, new words! Your daily puzzle is ready.',
    ],
  },
  friend_activity: {
    titles: ['{friendName} needs help!', 'Friend alert!', '{friendName} sent you a gift!'],
    bodies: [
      '{friendName} sent you a hint gift! Open Wordfall to claim it.',
      '{friendName} beat your score on Level {level}. Can you take it back?',
      'Your friend {friendName} just completed a partner event task. Your turn!',
    ],
  },
  comeback: {
    titles: ['We miss you!', 'Welcome back rewards waiting!', 'Your words await!'],
    bodies: [
      'It\'s been a while! Come back for a special welcome package.',
      'We saved some rewards for you. Come see what\'s waiting!',
      'Your streak is waiting to restart. Plus, comeback bonus rewards!',
    ],
  },
  mystery_wheel: {
    titles: ['Free spin available!', 'Mystery Wheel ready!', 'Spin to win!'],
    bodies: [
      'You earned a free Mystery Wheel spin! What will you win?',
      'Your Mystery Wheel has a free spin waiting. Don\'t miss out!',
      'Spin the Mystery Wheel for a chance at rare rewards!',
    ],
  },
  win_streak: {
    titles: ['You\'re on a roll!', 'Win streak active!', 'Keep winning!'],
    bodies: [
      'You\'re on a {streak}-win streak! Keep it going for bigger rewards.',
      'Your win streak is still alive. One more win for the next reward tier!',
      '{streak} wins in a row! The rewards keep getting better.',
    ],
  },
};

// ─── Notification Manager ──────────────────────────────────────────────────────

class NotificationManager {
  private initialized = false;
  private expoPushToken: string | null = null;
  private scheduledIds: Map<string, string> = new Map(); // category -> notification ID

  /**
   * Initialize notification permissions and token.
   * Call this once on app startup.
   *
   * IMPORTANT: This is a scaffold. Full implementation requires:
   * - expo-notifications package installed
   * - expo-device for device checks
   * - expo-constants for project ID
   * Replace the placeholder code below with actual Expo Notifications API calls.
   */
  async init(): Promise<boolean> {
    try {
      // Placeholder — replace with actual implementation after installing expo-notifications:
      //
      // import * as Notifications from 'expo-notifications';
      // import * as Device from 'expo-device';
      // import Constants from 'expo-constants';
      //
      // if (!Device.isDevice) return false;
      //
      // const { status: existingStatus } = await Notifications.getPermissionsAsync();
      // let finalStatus = existingStatus;
      // if (existingStatus !== 'granted') {
      //   const { status } = await Notifications.requestPermissionsAsync();
      //   finalStatus = status;
      // }
      // if (finalStatus !== 'granted') return false;
      //
      // const token = await Notifications.getExpoPushTokenAsync({
      //   projectId: Constants.expirationDetails?.projectId,
      // });
      // this.expoPushToken = token.data;
      //
      // // Configure notification handler
      // Notifications.setNotificationHandler({
      //   handleNotification: async () => ({
      //     shouldShowAlert: true,
      //     shouldPlaySound: true,
      //     shouldSetBadge: true,
      //   }),
      // });

      this.initialized = true;
      console.log('[Notifications] Initialized (scaffold mode)');
      return true;
    } catch (error) {
      console.warn('[Notifications] Init failed:', error);
      return false;
    }
  }

  /**
   * Schedule a local notification.
   */
  async schedule(
    category: NotificationCategory,
    trigger: NotificationTrigger,
    templateVars?: Record<string, string | number>,
  ): Promise<string | null> {
    if (!this.initialized) return null;

    const template = NOTIFICATION_TEMPLATES[category];
    const titleIdx = Math.floor(Math.random() * template.titles.length);
    const bodyIdx = Math.floor(Math.random() * template.bodies.length);

    let title = template.titles[titleIdx];
    let body = template.bodies[bodyIdx];

    // Replace template variables
    if (templateVars) {
      for (const [key, value] of Object.entries(templateVars)) {
        title = title.replace(`{${key}}`, String(value));
        body = body.replace(`{${key}}`, String(value));
      }
    }

    try {
      // Placeholder — replace with actual Expo Notifications scheduling:
      //
      // import * as Notifications from 'expo-notifications';
      //
      // // Cancel existing notification for this category
      // const existingId = this.scheduledIds.get(category);
      // if (existingId) {
      //   await Notifications.cancelScheduledNotificationAsync(existingId);
      // }
      //
      // const expoTrigger = trigger.type === 'timeInterval'
      //   ? { seconds: trigger.seconds, repeats: trigger.repeats }
      //   : trigger.type === 'daily'
      //   ? { hour: trigger.hour, minute: trigger.minute, repeats: true }
      //   : { weekday: trigger.weekday, hour: trigger.hour, minute: trigger.minute, repeats: true };
      //
      // const id = await Notifications.scheduleNotificationAsync({
      //   content: { title, body, data: { category } },
      //   trigger: expoTrigger,
      // });
      //
      // this.scheduledIds.set(category, id);
      // return id;

      const mockId = `notif_${category}_${Date.now()}`;
      this.scheduledIds.set(category, mockId);
      console.log(`[Notifications] Scheduled: ${title} — ${body}`);
      return mockId;
    } catch (error) {
      console.warn('[Notifications] Schedule failed:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification by category.
   */
  async cancel(category: NotificationCategory): Promise<void> {
    const existingId = this.scheduledIds.get(category);
    if (!existingId) return;

    // Placeholder:
    // await Notifications.cancelScheduledNotificationAsync(existingId);

    this.scheduledIds.delete(category);
    console.log(`[Notifications] Cancelled: ${category}`);
  }

  /**
   * Cancel all scheduled notifications.
   */
  async cancelAll(): Promise<void> {
    // Placeholder:
    // await Notifications.cancelAllScheduledNotificationsAsync();

    this.scheduledIds.clear();
    console.log('[Notifications] All cancelled');
  }

  // ─── Convenience Schedulers ───────────────────────────────────────────────

  /** Schedule streak expiry warning at 8 PM local time */
  async scheduleStreakReminder(currentStreak: number): Promise<void> {
    await this.schedule('streak_reminder', { type: 'daily', hour: 20, minute: 0 }, {
      streak: currentStreak,
    });
  }

  /** Schedule energy-full notification after refill time */
  async scheduleEnergyFull(secondsUntilFull: number): Promise<void> {
    if (secondsUntilFull <= 0) return;
    await this.schedule('energy_full', { type: 'timeInterval', seconds: secondsUntilFull });
  }

  /** Schedule daily challenge reminder at 9 AM */
  async scheduleDailyChallenge(): Promise<void> {
    await this.schedule('daily_challenge', { type: 'daily', hour: 9, minute: 0 });
  }

  /** Schedule event ending warning */
  async scheduleEventEnding(eventName: string, hoursLeft: number): Promise<void> {
    const seconds = Math.max((hoursLeft - 2) * 3600, 60); // Notify 2 hours before end
    await this.schedule('event_ending', { type: 'timeInterval', seconds }, {
      eventName,
      hours: 2,
    });
  }

  /** Schedule mystery wheel reminder */
  async scheduleMysteryWheelReminder(): Promise<void> {
    await this.schedule('mystery_wheel', { type: 'timeInterval', seconds: 3600 }); // 1 hour later
  }

  /** Schedule comeback notification for inactive players (3 days) */
  async scheduleComebackReminder(): Promise<void> {
    await this.schedule('comeback', { type: 'timeInterval', seconds: 3 * 24 * 3600 });
  }

  /**
   * Get the Expo push token for remote notifications.
   * Send this token to your backend (Firebase) to enable server-sent pushes.
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }
}

export const notificationManager = new NotificationManager();
