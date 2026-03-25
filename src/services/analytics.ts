import AsyncStorage from '@react-native-async-storage/async-storage';

type AnalyticsEvent =
  | 'puzzle_start' | 'puzzle_complete' | 'puzzle_fail' | 'puzzle_abandon'
  | 'daily_login' | 'streak_count' | 'session_start' | 'session_end'
  | 'iap_purchase' | 'ad_watched' | 'hint_used' | 'undo_used'
  | 'club_join' | 'friend_challenge_sent' | 'gift_sent'
  | 'gravity_interaction' | 'dead_end_hit' | 'wrong_order_attempt' | 'chain_count'
  | 'atlas_word_found' | 'rare_tile_earned' | 'stamp_collected'
  | 'mode_started' | 'booster_used' | 'collection_completed'
  | 'chapter_completed' | 'level_up' | 'tutorial_step';

interface BufferedEvent {
  id: string;
  event: AnalyticsEvent;
  timestamp: number;
  params?: Record<string, unknown>;
}

interface AnalyticsState {
  userId: string | null;
  sessionId: string | null;
  sessionStartedAt: number | null;
  buffer: BufferedEvent[];
  userProperties: Record<string, string>;
}

const STORAGE_KEY = '@wordfall_analytics_buffer_v1';
const MAX_BUFFER = 300;
const FLUSH_INTERVAL_MS = 60_000; // Auto-flush every 60 seconds

class Analytics {
  private static instance: Analytics;
  private state: AnalyticsState = {
    userId: null,
    sessionId: null,
    sessionStartedAt: null,
    buffer: [],
    userProperties: {},
  };
  private loaded = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private firebaseAnalytics: any = null;
  private firestore: any = null;

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  /**
   * Initialize Firebase Analytics and Firestore integrations.
   * Call this once after Firebase app is initialized.
   * Silently degrades if Firebase is not configured.
   */
  async initFirebase(): Promise<void> {
    try {
      // Dynamically import Firebase modules so the app works without them
      const { getAnalytics, logEvent: fbLogEvent } = await import('firebase/analytics');
      const { getFirestore, collection, addDoc } = await import('firebase/firestore');
      const { getApp } = await import('firebase/app');

      const app = getApp();
      this.firebaseAnalytics = { instance: getAnalytics(app), logEvent: fbLogEvent };
      this.firestore = { instance: getFirestore(app), collection, addDoc };

      console.log('[Analytics] Firebase Analytics and Firestore connected');
    } catch (error) {
      // Firebase not configured or not available — use buffer-only mode
      console.log('[Analytics] Firebase not available, using local buffer only');
    }

    // Start auto-flush timer
    this.startAutoFlush();
  }

  private startAutoFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flush().catch(err =>
        console.warn('[Analytics] Auto-flush failed:', err)
      );
    }, FLUSH_INTERVAL_MS);
  }

  private stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AnalyticsState>;
        this.state = {
          ...this.state,
          ...parsed,
          buffer: Array.isArray(parsed.buffer) ? parsed.buffer : [],
          userProperties: parsed.userProperties ?? {},
        };
      }
    } catch (error) {
      console.warn('[Analytics] Failed to load buffered events:', error);
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('[Analytics] Failed to persist buffered events:', error);
    }
  }

  private makeEventId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private appendEvent(event: AnalyticsEvent, params?: Record<string, unknown>): void {
    const payload: BufferedEvent = {
      id: this.makeEventId(),
      event,
      timestamp: Date.now(),
      params: {
        ...params,
        userId: this.state.userId,
        sessionId: this.state.sessionId,
      },
    };

    this.state.buffer = [...this.state.buffer, payload].slice(-MAX_BUFFER);
  }

  /**
   * Flush buffered events to Firestore `analytics_events` collection.
   * Events that are successfully written are removed from the local buffer.
   * Falls back silently if Firestore is not available.
   */
  async flush(): Promise<number> {
    await this.ensureLoaded();
    const eventsToFlush = [...this.state.buffer];

    if (eventsToFlush.length === 0) return 0;

    if (this.firestore) {
      try {
        const { instance: db, collection: col, addDoc } = this.firestore;
        const analyticsCol = col(db, 'analytics_events');

        // Write events in batches of 50 to avoid overwhelming Firestore
        const batchSize = 50;
        let flushed = 0;

        for (let i = 0; i < eventsToFlush.length; i += batchSize) {
          const batch = eventsToFlush.slice(i, i + batchSize);
          const writePromises = batch.map((evt: BufferedEvent) =>
            addDoc(analyticsCol, {
              ...evt,
              userProperties: { ...this.state.userProperties },
              flushedAt: Date.now(),
            })
          );
          await Promise.all(writePromises);
          flushed += batch.length;
        }

        // Clear flushed events from buffer
        const flushedIds = new Set(eventsToFlush.map((e: BufferedEvent) => e.id));
        this.state.buffer = this.state.buffer.filter(e => !flushedIds.has(e.id));
        await this.persist();

        if (__DEV__) {
          console.log(`[Analytics] Flushed ${flushed} events to Firestore`);
        }

        return flushed;
      } catch (error) {
        console.warn('[Analytics] Firestore flush failed, events retained in buffer:', error);
        return 0;
      }
    }

    if (__DEV__) {
      console.log(`[Analytics] No Firestore connection, ${eventsToFlush.length} events buffered locally`);
    }
    return 0;
  }

  async startSession(source: 'app_launch' | 'foreground' = 'app_launch'): Promise<void> {
    await this.ensureLoaded();
    if (this.state.sessionId) return;

    this.state.sessionId = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    this.state.sessionStartedAt = Date.now();
    this.appendEvent('session_start', { source });
    await this.persist();

    if (__DEV__) {
      console.log('[Analytics] session_start', { sessionId: this.state.sessionId, source });
    }
  }

  async endSession(reason: 'background' | 'manual' = 'background'): Promise<void> {
    await this.ensureLoaded();
    if (!this.state.sessionId) return;

    const durationMs = this.state.sessionStartedAt
      ? Date.now() - this.state.sessionStartedAt
      : 0;

    this.appendEvent('session_end', { reason, durationMs });
    this.state.sessionId = null;
    this.state.sessionStartedAt = null;

    // Flush on session end to capture the full session
    await this.flush();
    await this.persist();

    if (__DEV__) {
      console.log('[Analytics] session_end', { reason, durationMs });
    }
  }

  async logEvent(event: AnalyticsEvent, params?: Record<string, unknown>): Promise<void> {
    await this.ensureLoaded();

    // Auto-open a session when gameplay events start firing.
    if (!this.state.sessionId && event !== 'session_start' && event !== 'session_end') {
      await this.startSession('foreground');
    }

    this.appendEvent(event, params);
    await this.persist();

    if (__DEV__) {
      console.log(`[Analytics] ${event}`, params);
    }

    // Send to Firebase Analytics if available
    if (this.firebaseAnalytics) {
      try {
        this.firebaseAnalytics.logEvent(
          this.firebaseAnalytics.instance,
          event,
          params ?? {},
        );
      } catch (error) {
        // Firebase Analytics logging is best-effort
        console.warn('[Analytics] Firebase logEvent failed:', error);
      }
    }
  }

  async setUserId(userId: string): Promise<void> {
    await this.ensureLoaded();
    this.state.userId = userId;
    await this.persist();

    if (__DEV__) {
      console.log(`[Analytics] setUserId: ${userId}`);
    }
  }

  async setUserProperty(name: string, value: string): Promise<void> {
    await this.ensureLoaded();
    this.state.userProperties[name] = value;
    await this.persist();

    if (__DEV__) {
      console.log(`[Analytics] setUserProperty: ${name}=${value}`);
    }
  }

  async getBufferedEvents(limit = 100): Promise<BufferedEvent[]> {
    await this.ensureLoaded();
    return this.state.buffer.slice(-Math.max(1, limit));
  }

  async clearBufferedEvents(): Promise<void> {
    await this.ensureLoaded();
    this.state.buffer = [];
    await this.persist();
  }

  /**
   * Clean up timers. Call when the app is being destroyed.
   */
  destroy(): void {
    this.stopAutoFlush();
  }
}

export const analytics = Analytics.getInstance();
export type { AnalyticsEvent, BufferedEvent };
