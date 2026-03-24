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

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
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

    // Firebase Analytics integration hook when SDK is configured for this app target.
    // Example: await logEvent(getAnalytics(), event, params);
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
}

export const analytics = Analytics.getInstance();
export type { AnalyticsEvent, BufferedEvent };
