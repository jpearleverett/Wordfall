/**
 * Funnel Tracker — instruments key conversion funnels for analytics.
 */
import { analytics } from './analytics';
import { logger } from '../utils/logger';

type FunnelStep =
  | 'app_open' | 'tutorial_start' | 'tutorial_board_a' | 'tutorial_board_b'
  | 'tutorial_board_c' | 'tutorial_complete'
  | 'first_puzzle_start' | 'first_puzzle_complete' | 'first_word_found' | 'first_chain'
  | 'day1_return' | 'day3_return' | 'day7_return' | 'day14_return' | 'day30_return'
  | 'first_hint_used' | 'first_hint_ran_out'
  | 'shop_view' | 'iap_initiated' | 'iap_completed' | 'iap_failed'
  | 'ad_offered' | 'ad_watched' | 'ad_skipped'
  | 'mode_unlocked' | 'second_mode_played'
  | 'collection_started' | 'first_rare_tile'
  | 'club_viewed' | 'club_joined'
  | 'streak_day_3' | 'streak_day_7' | 'streak_day_14' | 'streak_day_30'
  | 'level_5_reached' | 'level_10_reached' | 'level_20_reached' | 'level_50_reached'
  | 'premium_pass_viewed' | 'premium_pass_purchased';

class FunnelTracker {
  private static instance: FunnelTracker;

  static getInstance(): FunnelTracker {
    if (!FunnelTracker.instance) {
      FunnelTracker.instance = new FunnelTracker();
    }
    return FunnelTracker.instance;
  }

  async trackStep(step: FunnelStep, metadata?: Record<string, unknown>): Promise<void> {
    await analytics.logEvent('session_start' as any, {
      _funnel: step,
      ...metadata,
      client_timestamp: Date.now(),
    });

    if (__DEV__) {
      logger.log(`[Funnel] ${step}`, metadata);
    }
  }

  async trackOnboarding(step: 'start' | 'board_a' | 'board_b' | 'board_c' | 'complete'): Promise<void> {
    const stepMap: Record<string, FunnelStep> = {
      start: 'tutorial_start',
      board_a: 'tutorial_board_a',
      board_b: 'tutorial_board_b',
      board_c: 'tutorial_board_c',
      complete: 'tutorial_complete',
    };
    await this.trackStep(stepMap[step]);
  }

  async trackRetention(daysSinceInstall: number): Promise<void> {
    const milestones: [number, FunnelStep][] = [
      [1, 'day1_return'], [3, 'day3_return'], [7, 'day7_return'],
      [14, 'day14_return'], [30, 'day30_return'],
    ];
    for (const [day, step] of milestones) {
      if (daysSinceInstall >= day) {
        await this.trackStep(step, { daysSinceInstall });
      }
    }
  }

  async trackPurchase(step: 'shop_view' | 'iap_initiated' | 'iap_completed' | 'iap_failed', productId?: string): Promise<void> {
    await this.trackStep(step, { productId });
  }

  async trackLevelMilestone(level: number): Promise<void> {
    const milestones: [number, FunnelStep][] = [
      [5, 'level_5_reached'], [10, 'level_10_reached'],
      [20, 'level_20_reached'], [50, 'level_50_reached'],
    ];
    for (const [threshold, step] of milestones) {
      if (level >= threshold) {
        await this.trackStep(step, { level });
      }
    }
  }
}

export const funnelTracker = FunnelTracker.getInstance();
export type { FunnelStep };
