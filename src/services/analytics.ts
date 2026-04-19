import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

// ── Event types ──
export type AnalyticsEventName =
  // Core retention
  | 'app_open'
  | 'tutorial_step'
  | 'tutorial_complete'
  // Puzzle lifecycle
  | 'puzzle_start'
  | 'puzzle_complete'
  | 'puzzle_fail'
  | 'puzzle_abandon'
  // In-game actions
  | 'hint_used'
  | 'booster_used'
  | 'dead_end_detected'
  // Offers & monetization
  | 'offer_shown'
  | 'offer_accepted'
  | 'offer_dismissed'
  | 'mystery_wheel_spin'
  | 'iap_initiated'
  | 'iap_completed'
  | 'ad_watched'
  // Progression & social
  | 'daily_challenge_complete'
  | 'streak_broken'
  | 'achievement_earned'
  | 'ceremony_shown'
  | 'ceremony_dismissed'
  | 'feature_unlocked'
  | 'screen_view'
  | 'club_joined'
  | 'share_tapped'
  // Session
  | 'session_end'
  // A/B testing
  | 'experiment_assigned'
  // Revenue & funnel tracking
  | 'iap_revenue'
  | 'ad_revenue'
  | 'retention_check'
  | 'funnel_step'
  | 'cohort_event'
  // Difficulty tuning (Phase 3.5 — seed for plan task 3.7)
  | 'difficulty_telemetry'
  // Legacy events (kept for backward compat with existing callsites)
  | 'mode_started'
  | 'daily_login'
  | 'streak_count'
  | 'session_start'
  | 'undo_used'
  | 'chain_count'
  | 'gravity_interaction'
  | 'rare_tile_earned'
  | 'atlas_word_found'
  | 'stamp_collected'
  | 'mode_played'
  | 'event_participated'
  | 'collection_completed'
  | 'club_join'
  | 'friend_challenge_sent'
  | 'gift_sent'
  | 'wrong_order_attempt'
  | 'iap_purchase'
  | 'level_up'
  | 'tutorial_step'
  | 'piggy_bank_filled'
  | 'piggy_bank_offer_shown'
  | 'piggy_bank_broken'
  | 'season_pass_xp_gained'
  | 'season_pass_tier_unlocked'
  | 'season_pass_tier_claimed'
  | 'season_pass_premium_purchased'
  | 'season_pass_season_rolled'
  | 'referral_code_applied'
  | 'referral_success_grant'
  | 'referral_reward_claimed'
  | 'shared_goal_progress'
  | 'shared_goal_completed'
  | 'shared_goal_reward_claimed'
  | 'friend_request_sent'
  | 'friend_request_accepted'
  | 'friend_search_performed'
  | 'friend_leaderboard_viewed'
  | 'booster_combo_activated'
  | 'booster_combo_expired';

export type EventParams = Record<string, unknown>;

export interface StoredEvent {
  id: string;
  event: AnalyticsEventName;
  timestamp: number;
  params?: EventParams;
  userId: string | null;
  sessionId: string | null;
}

interface AnalyticsState {
  userId: string | null;
  sessionId: string | null;
  sessionStartedAt: number | null;
  sessionNumber: number;
  installTimestamp: number;
  userProperties: Record<string, string>;
  experiments: Record<string, string>; // experimentName -> variant
}

interface RetentionMetrics {
  d1: boolean | null;
  d7: boolean | null;
  d30: boolean | null;
  installDate: string | null;
  appOpenDates: string[];
}

// ── Storage keys ──
const STORAGE_KEY_STATE = '@wordfall_analytics_state_v2';
const STORAGE_KEY_EVENTS = '@wordfall_analytics_events_v2';
const STORAGE_KEY_RETENTION = '@wordfall_analytics_retention_v2';

const MAX_LOCAL_EVENTS = 5000;
const FLUSH_INTERVAL_MS = 60_000;
const EVENT_RETENTION_DAYS = 7;
const EVENT_PERSIST_DEBOUNCE_MS = 1500;

// ── Deterministic hash for A/B testing ──
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

class Analytics {
  private static instance: Analytics;
  private state: AnalyticsState = {
    userId: null,
    sessionId: null,
    sessionStartedAt: null,
    sessionNumber: 0,
    installTimestamp: 0,
    userProperties: {},
    experiments: {},
  };
  private loaded = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private firebaseAnalytics: any = null;
  private firestore: any = null;
  private useFirebase = false;
  private bufferedEvents: StoredEvent[] = [];
  private eventsLoaded = false;
  private eventsDirty = false;
  private eventsPersistTimer: ReturnType<typeof setTimeout> | null = null;
  private eventsPersistPromise: Promise<void> = Promise.resolve();
  /**
   * User-controlled opt-out. When false, `logEvent` short-circuits and native
   * Firebase Analytics collection is disabled. Default: true (enabled). The
   * UI layer flips this based on the "Analytics" toggle in Settings.
   */
  private analyticsEnabled = true;

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  // ─────────────────────────────────────────
  // Initialization
  // ─────────────────────────────────────────

  async initFirebase(): Promise<void> {
    await this.ensureLoaded();

    try {
      const { isFirebaseConfigured } = await import('../config/firebase');

      if (!isFirebaseConfigured) {
        logger.log('[Analytics] Firebase not configured, using local storage only');
        this.startAutoFlush();
        return;
      }

      // Firestore (JS SDK) works on all platforms — always wire it up for event flushing
      const { getFirestore, collection, addDoc } = await import('firebase/firestore');
      const { getApp } = await import('firebase/app');
      const app = getApp();
      this.firestore = { instance: getFirestore(app), collection, addDoc };
      this.useFirebase = true;

      // Mobile Analytics: prefer the native @react-native-firebase/analytics module.
      // On web, fall back to the JS SDK's firebase/analytics with isSupported() guard.
      const { Platform } = await import('react-native');

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        try {
          const nativeAnalyticsModule = await import('@react-native-firebase/analytics');
          const nativeAnalytics = nativeAnalyticsModule.default();
          this.firebaseAnalytics = {
            instance: nativeAnalytics,
            logEvent: (_inst: any, name: string, params?: Record<string, unknown>) =>
              nativeAnalytics.logEvent(name, params as any),
            setUserId: (_inst: any, userId: string) => nativeAnalytics.setUserId(userId),
            setUserProperties: (_inst: any, props: Record<string, string>) =>
              nativeAnalytics.setUserProperties(props),
          };
          logger.log('[Analytics] React Native Firebase Analytics connected (native)');
        } catch (nativeError) {
          logger.log('[Analytics] @react-native-firebase/analytics not available — events will only be mirrored to Firestore');
        }
      } else {
        // Web path
        try {
          const { getAnalytics, isSupported, logEvent: fbLogEvent, setUserId: fbSetUserId, setUserProperties: fbSetUserProperties } = await import('firebase/analytics');
          const supported = await isSupported();
          if (supported) {
            this.firebaseAnalytics = {
              instance: getAnalytics(app),
              logEvent: fbLogEvent,
              setUserId: fbSetUserId,
              setUserProperties: fbSetUserProperties,
            };
            logger.log('[Analytics] Firebase Analytics connected (web)');
          } else {
            logger.log('[Analytics] Firebase Analytics unsupported on this web environment — using Firestore event stream only');
          }
        } catch (analyticsError) {
          logger.log('[Analytics] firebase/analytics not available — using Firestore event stream only');
        }
      }
    } catch (error) {
      logger.log('[Analytics] Firebase not available, using local storage only');
    }

    this.startAutoFlush();
  }

  // ─────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_STATE);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AnalyticsState>;
        this.state = {
          ...this.state,
          ...parsed,
          userProperties: parsed.userProperties ?? {},
          experiments: parsed.experiments ?? {},
        };
      }
      // Set install timestamp if first run
      if (!this.state.installTimestamp) {
        this.state.installTimestamp = Date.now();
      }
    } catch (error) {
      logger.warn('[Analytics] Failed to load state:', error);
    }
    this.loaded = true;
  }

  private async persistState(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(this.state));
    } catch (error) {
      logger.warn('[Analytics] Failed to persist state:', error);
    }
  }

  private async ensureEventsLoaded(): Promise<void> {
    if (this.eventsLoaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_EVENTS);
      if (raw) {
        this.bufferedEvents = JSON.parse(raw) as StoredEvent[];
      }
    } catch (error) {
      logger.warn('[Analytics] Failed to load events:', error);
    }
    this.eventsLoaded = true;
  }

  private async loadEvents(): Promise<StoredEvent[]> {
    await this.ensureEventsLoaded();
    return this.bufferedEvents;
  }

  private scheduleEventsPersist(delayMs: number = EVENT_PERSIST_DEBOUNCE_MS): void {
    if (this.eventsPersistTimer) {
      clearTimeout(this.eventsPersistTimer);
    }
    this.eventsPersistTimer = setTimeout(() => {
      this.eventsPersistTimer = null;
      void this.persistEventsNow();
    }, delayMs);
  }

  private async persistEventsNow(): Promise<void> {
    await this.ensureEventsLoaded();
    if (!this.eventsDirty) return;

    const snapshot = [...this.bufferedEvents];
    this.eventsDirty = false;

    const persist = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(snapshot));
      } catch (error) {
        this.eventsDirty = true;
        logger.warn('[Analytics] Failed to persist events:', error);
      }
    };

    this.eventsPersistPromise = this.eventsPersistPromise.then(persist, persist);
    await this.eventsPersistPromise;

    if (this.eventsDirty && !this.eventsPersistTimer) {
      this.scheduleEventsPersist(0);
    }
  }

  private async persistEvents(events: StoredEvent[], immediate: boolean = true): Promise<void> {
    await this.ensureEventsLoaded();
    this.bufferedEvents = events;
    this.eventsDirty = true;
    if (immediate) {
      await this.persistEventsNow();
      return;
    }
    this.scheduleEventsPersist();
  }

  private async loadRetention(): Promise<RetentionMetrics> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_RETENTION);
      if (raw) return JSON.parse(raw) as RetentionMetrics;
    } catch (error) {
      logger.warn('[Analytics] Failed to load retention:', error);
    }
    return { d1: null, d7: null, d30: null, installDate: null, appOpenDates: [] };
  }

  private async persistRetention(r: RetentionMetrics): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_RETENTION, JSON.stringify(r));
    } catch (error) {
      logger.warn('[Analytics] Failed to persist retention:', error);
    }
  }

  // ─────────────────────────────────────────
  // Auto-flush & pruning
  // ─────────────────────────────────────────

  private startAutoFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flush().catch(err =>
        logger.warn('[Analytics] Auto-flush failed:', err)
      );
    }, FLUSH_INTERVAL_MS);
  }

  private stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /** Remove events older than EVENT_RETENTION_DAYS */
  private async pruneOldEvents(): Promise<void> {
    const events = await this.loadEvents();
    const cutoff = Date.now() - (EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const pruned = events.filter(e => e.timestamp >= cutoff);
    if (pruned.length !== events.length) {
      await this.persistEvents(pruned);
      if (__DEV__) {
        logger.log(`[Analytics] Pruned ${events.length - pruned.length} old events`);
      }
    }
  }

  // ─────────────────────────────────────────
  // Event logging (core)
  // ─────────────────────────────────────────

  private makeEventId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Set whether analytics collection is enabled. When false:
   * - logEvent() becomes a no-op
   * - @react-native-firebase/analytics is told to stop collecting via
   *   setAnalyticsCollectionEnabled(false) (disables auto-collection of
   *   AAID / IDFA and removes pending events from the local buffer).
   */
  async setEnabled(enabled: boolean): Promise<void> {
    this.analyticsEnabled = enabled;
    if (this.firebaseAnalytics?.instance?.setAnalyticsCollectionEnabled) {
      try {
        await this.firebaseAnalytics.instance.setAnalyticsCollectionEnabled(enabled);
      } catch (e) {
        logger.warn('[Analytics] setAnalyticsCollectionEnabled failed:', e);
      }
    }
  }

  isEnabled(): boolean {
    return this.analyticsEnabled;
  }

  async logEvent(event: AnalyticsEventName | string, params?: EventParams): Promise<void> {
    if (!this.analyticsEnabled) return;
    await this.ensureLoaded();
    await this.ensureEventsLoaded();

    // Auto-open a session when events start firing outside a session
    if (!this.state.sessionId && event !== 'app_session_start' && event !== 'session_end') {
      await this.startSession('foreground');
    }

    const storedEvent: StoredEvent = {
      id: this.makeEventId(),
      event: event as AnalyticsEventName,
      timestamp: Date.now(),
      params,
      userId: this.state.userId,
      sessionId: this.state.sessionId,
    };

    this.bufferedEvents.push(storedEvent);
    if (this.bufferedEvents.length > MAX_LOCAL_EVENTS) {
      this.bufferedEvents = this.bufferedEvents.slice(this.bufferedEvents.length - MAX_LOCAL_EVENTS);
    }
    this.eventsDirty = true;
    this.scheduleEventsPersist();

    if (__DEV__) {
      logger.log(`[Analytics] ${event}`, params ?? '');
    }

    // Forward to Firebase Analytics if available
    if (this.useFirebase && this.firebaseAnalytics) {
      try {
        this.firebaseAnalytics.logEvent(
          this.firebaseAnalytics.instance,
          event,
          params ?? {},
        );
      } catch (error) {
        // Firebase Analytics logging is best-effort
        if (__DEV__) {
          logger.warn('[Analytics] Firebase logEvent failed:', error);
        }
      }
    }
  }

  // ─────────────────────────────────────────
  // Session management
  // ─────────────────────────────────────────

  async startSession(source: 'app_launch' | 'foreground' = 'app_launch'): Promise<void> {
    await this.ensureLoaded();
    if (this.state.sessionId) return;

    this.state.sessionNumber += 1;
    this.state.sessionId = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    this.state.sessionStartedAt = Date.now();
    await this.persistState();

    await this.logEvent('app_session_start' as any, { source });

    if (__DEV__) {
      logger.log('[Analytics] app_session_start', { sessionId: this.state.sessionId, source });
    }
  }

  async endSession(reason: 'background' | 'manual' = 'background'): Promise<void> {
    await this.ensureLoaded();
    if (!this.state.sessionId) return;

    const durationSeconds = this.state.sessionStartedAt
      ? Math.round((Date.now() - this.state.sessionStartedAt) / 1000)
      : 0;

    await this.logEvent('session_end', { reason, duration_seconds: durationSeconds });
    this.state.sessionId = null;
    this.state.sessionStartedAt = null;
    await this.persistState();

    // Flush on session end
    await this.flush();

    if (__DEV__) {
      logger.log('[Analytics] session_end', { reason, durationSeconds });
    }
  }

  // ─────────────────────────────────────────
  // App open & retention tracking
  // ─────────────────────────────────────────

  async trackAppOpen(): Promise<void> {
    await this.ensureLoaded();

    const daysSinceInstall = this.state.installTimestamp
      ? Math.floor((Date.now() - this.state.installTimestamp) / (24 * 60 * 60 * 1000))
      : 0;

    await this.logEvent('app_open', {
      session_number: this.state.sessionNumber,
      days_since_install: daysSinceInstall,
    });

    // Update retention tracking
    const retention = await this.loadRetention();
    const today = new Date().toISOString().split('T')[0];

    if (!retention.installDate) {
      retention.installDate = today;
    }

    if (!retention.appOpenDates.includes(today)) {
      retention.appOpenDates.push(today);
      // Keep only last 60 days of dates
      if (retention.appOpenDates.length > 60) {
        retention.appOpenDates = retention.appOpenDates.slice(-60);
      }
    }

    // Calculate retention metrics
    if (retention.installDate) {
      const installDate = new Date(retention.installDate);
      const dayAfterInstall = (days: number): string => {
        const d = new Date(installDate);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      };

      const d1Date = dayAfterInstall(1);
      const d7Date = dayAfterInstall(7);
      const d30Date = dayAfterInstall(30);

      // Only mark as true/false once the day has passed
      if (today >= d1Date && retention.d1 === null) {
        retention.d1 = retention.appOpenDates.includes(d1Date);
      }
      if (today >= d7Date && retention.d7 === null) {
        retention.d7 = retention.appOpenDates.includes(d7Date);
      }
      if (today >= d30Date && retention.d30 === null) {
        retention.d30 = retention.appOpenDates.includes(d30Date);
      }
    }

    await this.persistRetention(retention);
  }

  // ─────────────────────────────────────────
  // Typed convenience methods
  // ─────────────────────────────────────────

  async trackTutorialStep(stepName: string, completed: boolean): Promise<void> {
    await this.logEvent('tutorial_step', { step_name: stepName, completed });
  }

  async trackTutorialComplete(durationSeconds: number): Promise<void> {
    await this.logEvent('tutorial_complete', { duration_seconds: durationSeconds });
  }

  async trackPuzzleStart(level: number, mode: string, difficulty: string): Promise<void> {
    await this.logEvent('puzzle_start', { level, mode, difficulty });
  }

  async trackPuzzleComplete(params: {
    level: number;
    mode: string;
    stars: number;
    duration_seconds: number;
    hints_used: number;
    undos_used: number;
    words_found: number;
    score: number;
  }): Promise<void> {
    await this.logEvent('puzzle_complete', params);
  }

  async trackPuzzleFail(params: {
    level: number;
    mode: string;
    words_remaining: number;
    attempts_on_level: number;
  }): Promise<void> {
    await this.logEvent('puzzle_fail', params);
  }

  /**
   * Fire a difficulty-tuning telemetry sample. Called on both win and loss
   * so `difficultyAdjuster.ts` thresholds can be retuned against observed
   * distributions (plan task 3.7). Pair with user segment via
   * `setUserProperty('difficulty_tier', ...)` elsewhere.
   */
  async trackDifficultyTelemetry(params: {
    mode: string;
    level: number;
    outcome: 'win' | 'fail' | 'timeout' | 'abandon';
    stars?: number;
    attempts?: number;
    hints_used?: number;
    undos_used?: number;
    max_combo?: number;
    chain_count?: number;
    time_ms?: number;
    words_found?: number;
    words_total?: number;
    adjuster_tier?: string;
  }): Promise<void> {
    await this.logEvent('difficulty_telemetry', params);
  }

  async trackPuzzleAbandon(params: {
    level: number;
    mode: string;
    words_found: number;
    duration_seconds: number;
  }): Promise<void> {
    await this.logEvent('puzzle_abandon', params);
  }

  async trackHintUsed(level: number, hintsRemaining: number, timeSincePuzzleStart: number): Promise<void> {
    await this.logEvent('hint_used', { level, hints_remaining: hintsRemaining, time_since_puzzle_start: timeSincePuzzleStart });
  }

  async trackBoosterUsed(boosterType: string, level: number, firstEver: boolean): Promise<void> {
    await this.logEvent('booster_used', { booster_type: boosterType, level, first_ever: firstEver });
  }

  async trackDeadEndDetected(level: number, wordsRemaining: number): Promise<void> {
    await this.logEvent('dead_end_detected', { level, words_remaining: wordsRemaining });
  }

  async trackOfferShown(offerType: string, context: string): Promise<void> {
    await this.logEvent('offer_shown', { offer_type: offerType, context });
  }

  async trackOfferAccepted(offerType: string, context: string): Promise<void> {
    await this.logEvent('offer_accepted', { offer_type: offerType, context });
  }

  async trackOfferDismissed(offerType: string, context: string): Promise<void> {
    await this.logEvent('offer_dismissed', { offer_type: offerType, context });
  }

  async trackMysteryWheelSpin(resultType: string, isFree: boolean, totalSpins: number): Promise<void> {
    await this.logEvent('mystery_wheel_spin', { result_type: resultType, is_free: isFree, total_spins: totalSpins });
  }

  async trackIAPInitiated(productId: string, price: number): Promise<void> {
    await this.logEvent('iap_initiated', { product_id: productId, price });
  }

  async trackIAPCompleted(productId: string, price: number, revenue: number): Promise<void> {
    await this.logEvent('iap_completed', { product_id: productId, price, revenue });
  }

  async trackAdWatched(adType: string, rewardType: string): Promise<void> {
    await this.logEvent('ad_watched', { ad_type: adType, reward_type: rewardType });
  }

  async trackDailyChallengeComplete(streakLength: number): Promise<void> {
    await this.logEvent('daily_challenge_complete', { streak_length: streakLength });
  }

  async trackStreakBroken(previousLength: number): Promise<void> {
    await this.logEvent('streak_broken', { previous_length: previousLength });
  }

  async trackAchievementEarned(achievementId: string, tier: string): Promise<void> {
    await this.logEvent('achievement_earned', { achievement_id: achievementId, tier });
  }

  async trackCeremonyShown(ceremonyType: string): Promise<void> {
    await this.logEvent('ceremony_shown', { ceremony_type: ceremonyType });
  }

  async trackCeremonyDismissed(ceremonyType: string, durationShownMs: number): Promise<void> {
    await this.logEvent('ceremony_dismissed', { ceremony_type: ceremonyType, duration_shown_ms: durationShownMs });
  }

  async trackSessionEnd(durationSeconds: number, puzzlesPlayed: number, coinsEarned: number): Promise<void> {
    await this.logEvent('session_end', { duration_seconds: durationSeconds, puzzles_played: puzzlesPlayed, coins_earned: coinsEarned });
  }

  async trackFeatureUnlocked(featureId: string, playerLevel: number): Promise<void> {
    await this.logEvent('feature_unlocked', { feature_id: featureId, player_level: playerLevel });
  }

  async trackScreenView(screenName: string): Promise<void> {
    await this.logEvent('screen_view', { screen_name: screenName });
  }

  async trackClubJoined(clubId: string): Promise<void> {
    await this.logEvent('club_joined', { club_id: clubId });
  }

  async trackShareTapped(shareType: 'puzzle' | 'streak' | 'collection'): Promise<void> {
    await this.logEvent('share_tapped', { share_type: shareType });
  }

  // ─────────────────────────────────────────
  // Revenue & funnel tracking
  // ─────────────────────────────────────────

  /** Track IAP revenue for a completed purchase */
  async trackRevenue(productId: string, amount: number, currency: string): Promise<void> {
    await this.logEvent('iap_revenue', {
      product_id: productId,
      amount,
      currency,
      timestamp: Date.now(),
    });
  }

  /** Track estimated ad revenue (from AdMob or mediation) */
  async trackAdRevenue(adType: string, estimatedRevenue: number): Promise<void> {
    await this.logEvent('ad_revenue', {
      ad_type: adType,
      estimated_revenue: estimatedRevenue,
      currency: 'USD',
      timestamp: Date.now(),
    });
  }

  /** Track retention check for D1/D7/D30 metrics */
  async trackRetention(daysSinceInstall: number): Promise<void> {
    await this.logEvent('retention_check', {
      days_since_install: daysSinceInstall,
      is_d1: daysSinceInstall === 1,
      is_d7: daysSinceInstall === 7,
      is_d30: daysSinceInstall === 30,
    });
  }

  /** Track a funnel step for conversion analysis */
  async trackFunnel(funnelName: string, step: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.logEvent('funnel_step', {
      funnel_name: funnelName,
      step,
      timestamp: Date.now(),
      ...metadata,
    });
  }

  /** Track a cohort-specific event for cohort analysis */
  async trackCohort(cohortId: string, event: string): Promise<void> {
    await this.logEvent('cohort_event', {
      cohort_id: cohortId,
      cohort_event: event,
      timestamp: Date.now(),
    });
  }

  // ─────────────────────────────────────────
  // User identity & properties
  // ─────────────────────────────────────────

  async setUserId(userId: string): Promise<void> {
    await this.ensureLoaded();
    this.state.userId = userId;
    await this.persistState();

    if (this.useFirebase && this.firebaseAnalytics) {
      try {
        this.firebaseAnalytics.setUserId(this.firebaseAnalytics.instance, userId);
      } catch (_) { /* best effort */ }
    }

    if (__DEV__) {
      logger.log(`[Analytics] setUserId: ${userId}`);
    }
  }

  async setUserProperty(name: string, value: string): Promise<void> {
    await this.ensureLoaded();
    this.state.userProperties[name] = value;
    await this.persistState();

    if (this.useFirebase && this.firebaseAnalytics) {
      try {
        this.firebaseAnalytics.setUserProperties(
          this.firebaseAnalytics.instance,
          { [name]: value },
        );
      } catch (_) { /* best effort */ }
    }

    if (__DEV__) {
      logger.log(`[Analytics] setUserProperty: ${name}=${value}`);
    }
  }

  /** Get all current user properties */
  async getUserProperties(): Promise<Record<string, string>> {
    await this.ensureLoaded();
    return { ...this.state.userProperties };
  }

  /** Batch-update all standard user properties at once */
  async updateUserProperties(props: {
    player_level?: number;
    total_puzzles_solved?: number;
    days_since_install?: number;
    player_stage?: 'new' | 'early' | 'established' | 'veteran';
    is_payer?: boolean;
    total_spend?: number;
    /** Phase 4.11 — Firebase A/B segmentation for hard-energy cohort */
    hard_energy_enabled?: boolean;
  }): Promise<void> {
    await this.ensureLoaded();

    const nextProps = Object.entries(props).filter(([, value]) => value !== undefined);
    if (nextProps.length === 0) return;

    for (const [key, value] of nextProps) {
      this.state.userProperties[key] = String(value);
    }

    await this.persistState();

    if (this.useFirebase && this.firebaseAnalytics) {
      try {
        this.firebaseAnalytics.setUserProperties(
          this.firebaseAnalytics.instance,
          Object.fromEntries(nextProps.map(([key, value]) => [key, String(value)])),
        );
      } catch (_) { /* best effort */ }
    }

    if (__DEV__) {
      for (const [key, value] of nextProps) {
        logger.log(`[Analytics] setUserProperty: ${key}=${String(value)}`);
      }
    }
  }

  // ─────────────────────────────────────────
  // A/B Testing
  // ─────────────────────────────────────────

  /**
   * Get a deterministic variant assignment for an experiment.
   * Uses a hash of (userId + experimentName) to assign consistently.
   * Once assigned, the variant is persisted and an experiment_assigned event is logged.
   */
  async getVariant(experimentName: string, variants: string[]): Promise<string> {
    await this.ensureLoaded();

    if (variants.length === 0) {
      throw new Error('[Analytics] getVariant called with empty variants array');
    }

    // Return existing assignment if present
    if (this.state.experiments[experimentName]) {
      return this.state.experiments[experimentName];
    }

    // Deterministic assignment based on userId + experimentName
    const seed = `${this.state.userId ?? 'anonymous'}_${experimentName}`;
    const index = simpleHash(seed) % variants.length;
    const variant = variants[index];

    // Persist assignment
    this.state.experiments[experimentName] = variant;
    await this.persistState();

    // Log assignment event
    await this.logEvent('experiment_assigned', {
      experiment_name: experimentName,
      variant,
    });

    if (__DEV__) {
      logger.log(`[Analytics] Experiment "${experimentName}" -> variant "${variant}"`);
    }

    return variant;
  }

  /** Get all currently assigned experiments */
  getActiveExperiments(): Record<string, string> {
    return { ...this.state.experiments };
  }

  // ─────────────────────────────────────────
  // Flush to Firestore (when Firebase is configured)
  // ─────────────────────────────────────────

  async flush(): Promise<number> {
    await this.ensureLoaded();
    await this.ensureEventsLoaded();

    // Prune old events first
    await this.pruneOldEvents();
    await this.persistEventsNow();

    if (!this.useFirebase || !this.firestore) {
      if (__DEV__) {
        logger.log(`[Analytics] Local mode — ${this.bufferedEvents.length} events stored`);
      }
      return 0;
    }

    const events = [...this.bufferedEvents];
    if (events.length === 0) return 0;

    try {
      const { instance: db, collection: col, addDoc } = this.firestore;
      const analyticsCol = col(db, 'analytics_events');

      const batchSize = 50;
      let flushed = 0;

      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        const writePromises = batch.map((evt: StoredEvent) =>
          addDoc(analyticsCol, {
            ...evt,
            userProperties: { ...this.state.userProperties },
            flushedAt: Date.now(),
          })
        );
        await Promise.all(writePromises);
        flushed += batch.length;
      }

      // Clear flushed events from local storage
      const flushedIds = new Set(events.map((e: StoredEvent) => e.id));
      const remaining = this.bufferedEvents.filter(e => !flushedIds.has(e.id));
      await this.persistEvents(remaining);

      if (__DEV__) {
        logger.log(`[Analytics] Flushed ${flushed} events to Firestore`);
      }

      return flushed;
    } catch (error) {
      logger.warn('[Analytics] Firestore flush failed, events retained locally:', error);
      return 0;
    }
  }

  // ─────────────────────────────────────────
  // Local analytics: export & retention
  // ─────────────────────────────────────────

  /** Export all locally stored events as JSON (for debugging or manual upload) */
  async exportEvents(): Promise<{
    events: StoredEvent[];
    userProperties: Record<string, string>;
    experiments: Record<string, string>;
    retention: RetentionMetrics;
    exportedAt: number;
  }> {
    await this.ensureLoaded();
    const events = [...await this.loadEvents()];
    const retention = await this.loadRetention();

    return {
      events,
      userProperties: { ...this.state.userProperties },
      experiments: { ...this.state.experiments },
      retention,
      exportedAt: Date.now(),
    };
  }

  /** Get local retention metrics (D1, D7, D30 based on app_open dates) */
  async getRetentionMetrics(): Promise<RetentionMetrics> {
    return this.loadRetention();
  }

  /** Get all buffered events (backward compat + debugging) */
  async getBufferedEvents(limit = 100): Promise<StoredEvent[]> {
    const events = await this.loadEvents();
    return events.slice(-Math.max(1, limit));
  }

  /** Clear all locally stored events */
  async clearBufferedEvents(): Promise<void> {
    await this.persistEvents([]);
  }

  /** Get the current session number */
  getSessionNumber(): number {
    return this.state.sessionNumber;
  }

  /** Get days since install */
  getDaysSinceInstall(): number {
    if (!this.state.installTimestamp) return 0;
    return Math.floor((Date.now() - this.state.installTimestamp) / (24 * 60 * 60 * 1000));
  }

  /**
   * Clean up timers and flush remaining events. Call when the app is being destroyed.
   */
  async destroy(): Promise<void> {
    this.stopAutoFlush();
    if (this.eventsPersistTimer) {
      clearTimeout(this.eventsPersistTimer);
      this.eventsPersistTimer = null;
    }
    await this.persistEventsNow();
    try {
      await this.flush();
    } catch (e) {
      if (__DEV__) logger.warn('[Analytics] Final flush on destroy failed:', e);
    }
  }
}

export const analytics = Analytics.getInstance();
export type { StoredEvent as BufferedEvent, RetentionMetrics };
