type AnalyticsEvent =
  | 'puzzle_start' | 'puzzle_complete' | 'puzzle_fail' | 'puzzle_abandon'
  | 'daily_login' | 'streak_count' | 'session_start' | 'session_end'
  | 'iap_purchase' | 'ad_watched' | 'hint_used' | 'undo_used'
  | 'club_join' | 'friend_challenge_sent' | 'gift_sent'
  | 'gravity_interaction' | 'dead_end_hit' | 'wrong_order_attempt' | 'chain_count'
  | 'atlas_word_found' | 'rare_tile_earned' | 'stamp_collected'
  | 'mode_started' | 'booster_used' | 'collection_completed'
  | 'chapter_completed' | 'level_up' | 'tutorial_step';

class Analytics {
  private static instance: Analytics;

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  async logEvent(event: AnalyticsEvent, params?: Record<string, unknown>): Promise<void> {
    if (__DEV__) {
      console.log(`[Analytics] ${event}`, params);
    }
    // Firebase Analytics integration when configured
    // import { getAnalytics, logEvent } from 'firebase/analytics';
  }

  async setUserId(userId: string): Promise<void> {
    if (__DEV__) {
      console.log(`[Analytics] setUserId: ${userId}`);
    }
  }

  async setUserProperty(name: string, value: string): Promise<void> {
    if (__DEV__) {
      console.log(`[Analytics] setUserProperty: ${name}=${value}`);
    }
  }
}

export const analytics = Analytics.getInstance();
