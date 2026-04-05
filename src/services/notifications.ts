/**
 * Push Notification Service
 *
 * Implements the "external trigger" layer of the Hooked Model.
 * Without push notifications, retention relies entirely on player habit (pull-only).
 *
 * This service provides both local notifications (scheduled on-device, no server needed)
 * and scaffolding for remote push notifications (requires Firebase Cloud Functions).
 *
 * For Android: Add Firebase Cloud Messaging (FCM) credentials
 * For iOS: Configure Apple Push Notification service (APNs) in Apple Developer account
 */

import { logger } from '../utils/logger';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationTriggerInput } from 'expo-notifications';

// expo-notifications crashes in Expo Go since SDK 53.
// Lazy-load the module and gracefully degrade when unavailable.
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  logger.warn('[Notifications] expo-notifications not available (Expo Go?). Notifications disabled.');
}

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

// ─── Storage Keys ────────────────────────────────────────────────────────────

const PUSH_TOKEN_STORAGE_KEY = '@wordfall_push_token';
const DEVICE_TOKEN_STORAGE_KEY = '@wordfall_device_push_token';

// ─── Android Notification Channel ─────────────────────────────────────────────

const ANDROID_CHANNEL_ID = 'wordfall-default';

async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android' && Notifications) {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Wordfall',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00d4ff',
      sound: 'default',
    });
  }
}

// ─── Foreground Notification Handler ──────────────────────────────────────────

// Configure how notifications are handled when the app is in the foreground.
// This must be called before any notifications are received.
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ─── Notification Manager ──────────────────────────────────────────────────────

class NotificationManager {
  private initialized = false;
  private permissionGranted = false;
  private expoPushToken: string | null = null;
  private scheduledIds: Map<string, string> = new Map(); // category -> notification ID

  /**
   * Initialize notification permissions and token.
   * Call this once on app startup.
   *
   * Gracefully handles permission denial -- returns false and skips all
   * future scheduling calls without crashing.
   */
  async init(): Promise<boolean> {
    try {
      if (!Notifications) {
        logger.log('[Notifications] Module not available — running in Expo Go or notifications unsupported');
        this.initialized = true;
        this.permissionGranted = false;
        return false;
      }

      // Physical device check -- push tokens are unavailable on simulators
      if (!Device.isDevice) {
        logger.log('[Notifications] Not a physical device, skipping push token registration');
        // Still allow local notifications on simulator for dev/testing
      }

      // Set up Android notification channel (required for Android 8+)
      await setupAndroidChannel();

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.log('[Notifications] Permission denied by user — notifications disabled');
        this.initialized = true;
        this.permissionGranted = false;
        return false;
      }

      this.permissionGranted = true;

      // Get Expo push token for remote notifications (physical devices only)
      if (Device.isDevice) {
        try {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;
          const tokenData = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined,
          );
          this.expoPushToken = tokenData.data;
          logger.log('[Notifications] Push token:', this.expoPushToken);
        } catch (tokenError) {
          // Push token failure is non-fatal -- local notifications still work
          logger.warn('[Notifications] Failed to get push token (local notifications still work):', tokenError);
        }
      }

      this.initialized = true;
      console.log('[Notifications] Initialized successfully');
      return true;
    } catch (error) {
      logger.warn('[Notifications] Init failed:', error);
      this.initialized = true; // Mark initialized so we don't retry
      this.permissionGranted = false;
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
    if (!this.initialized || !this.permissionGranted || !Notifications) return null;

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
      // Cancel existing notification for this category to avoid duplicates
      const existingId = this.scheduledIds.get(category);
      if (existingId) {
        await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {
          // Ignore cancel errors for already-fired or expired notifications
        });
      }

      // Build the expo-notifications trigger object
      const channelId = Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined;
      let expoTrigger: NotificationTriggerInput;

      if (trigger.type === 'timeInterval') {
        expoTrigger = {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: trigger.seconds,
          repeats: trigger.repeats ?? false,
          channelId,
        };
      } else if (trigger.type === 'daily') {
        expoTrigger = {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: trigger.hour,
          minute: trigger.minute,
          channelId,
        };
      } else {
        // weekly
        expoTrigger = {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: trigger.weekday,
          hour: trigger.hour,
          minute: trigger.minute,
          channelId,
        };
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { category },
          sound: 'default',
          ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
        },
        trigger: expoTrigger,
      });

      this.scheduledIds.set(category, id);
      console.log(`[Notifications] Scheduled (${category}): ${title} — ${body}`);
      return id;
    } catch (error) {
      logger.warn('[Notifications] Schedule failed:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification by category.
   */
  async cancel(category: NotificationCategory): Promise<void> {
    const existingId = this.scheduledIds.get(category);
    if (!existingId) return;

    try {
      if (Notifications) await Notifications.cancelScheduledNotificationAsync(existingId);
    } catch {
      // Notification may have already fired or been dismissed
    }

    this.scheduledIds.delete(category);
    console.log(`[Notifications] Cancelled: ${category}`);
  }

  /**
   * Cancel all scheduled notifications.
   */
  async cancelAll(): Promise<void> {
    try {
      if (Notifications) await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // Ignore errors
    }

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

  // ─── Remote Push Notification Support ───────────────────────────────────

  /**
   * Register for remote push notifications.
   * Gets both Expo push token and device push token, stores in AsyncStorage.
   * Returns the Expo push token string, or null if unavailable.
   */
  async registerForRemotePush(): Promise<string | null> {
    if (!Notifications) {
      console.log('[Notifications] Module not available — cannot register for remote push');
      return null;
    }

    if (!this.permissionGranted) {
      console.log('[Notifications] Permission not granted — cannot register for remote push');
      return null;
    }

    try {
      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const expoPushTokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      const expoToken = expoPushTokenData.data;
      this.expoPushToken = expoToken;

      // Get device push token (FCM for Android, APNs for iOS)
      let deviceToken: string | null = null;
      try {
        const devicePushTokenData = await Notifications.getDevicePushTokenAsync();
        deviceToken = typeof devicePushTokenData.data === 'string'
          ? devicePushTokenData.data
          : JSON.stringify(devicePushTokenData.data);
      } catch (deviceTokenError) {
        logger.warn('[Notifications] Failed to get device push token:', deviceTokenError);
      }

      // Store tokens in AsyncStorage
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, expoToken);
      if (deviceToken) {
        await AsyncStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, deviceToken);
      }

      console.log('[Notifications] Remote push registered — Expo token:', expoToken);
      return expoToken;
    } catch (error) {
      logger.warn('[Notifications] Failed to register for remote push:', error);
      return null;
    }
  }

  /**
   * Get the stored push token from AsyncStorage.
   * Returns null if no token has been registered.
   */
  async getPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    } catch (error) {
      logger.warn('[Notifications] Failed to read push token:', error);
      return null;
    }
  }

  /**
   * Send the push token to the server (Firestore) for remote notification delivery.
   * Falls back silently if Firebase/Firestore is not available.
   */
  async sendTokenToServer(token: string, userId: string): Promise<void> {
    try {
      const { isFirebaseConfigured } = await import('../config/firebase');
      if (!isFirebaseConfigured) {
        logger.log('[Notifications] Firebase not configured — token not sent to server');
        return;
      }

      const { getFirestore, doc, setDoc } = await import('firebase/firestore');
      const { getApp } = await import('firebase/app');

      const app = getApp();
      const db = getFirestore(app);

      await setDoc(doc(db, 'users', userId, 'tokens', 'push'), {
        token,
        platform: Platform.OS,
        updatedAt: Date.now(),
      });

      console.log('[Notifications] Push token sent to server for user:', userId);
    } catch (error) {
      // Silent fallback — remote push is best-effort
      logger.warn('[Notifications] Failed to send token to server:', error);
    }
  }

  /**
   * Handle an incoming remote notification payload.
   * Routes the notification data to the appropriate handler based on category.
   */
  handleRemoteNotification(data: Record<string, unknown>): void {
    const category = data.category as NotificationCategory | undefined;

    if (__DEV__) {
      console.log('[Notifications] Remote notification received:', data);
    }

    // Route based on category if present
    if (category && NOTIFICATION_TEMPLATES[category]) {
      console.log(`[Notifications] Handling remote notification category: ${category}`);
    }

    // The notification data is available for the app to act on.
    // Callers can use addForegroundListener / addResponseListener
    // to react to specific notification payloads in the UI layer.
  }

  /**
   * Whether notification permissions were granted.
   */
  isPermissionGranted(): boolean {
    return this.permissionGranted;
  }

  /**
   * Add a listener for when a notification is received while the app is foregrounded.
   * Returns a subscription that should be removed on cleanup.
   */
  addForegroundListener(
    callback: (notification: any) => void,
  ): { remove: () => void } {
    if (!Notifications) return { remove: () => {} };
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add a listener for when the user taps a notification.
   * Returns a subscription that should be removed on cleanup.
   */
  addResponseListener(
    callback: (response: any) => void,
  ): { remove: () => void } {
    if (!Notifications) return { remove: () => {} };
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export const notificationManager = new NotificationManager();
