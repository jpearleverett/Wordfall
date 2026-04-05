/**
 * Enhanced analytics events for soft-launch data collection.
 * These events provide granular data for optimizing retention,
 * monetization, and game balance before global launch.
 */

import { trackEvent, trackUserProperty } from './analytics';

// ─── Retention Funnel Events ─────────────────────────────────────────────────

export function trackFirstSessionFunnel(
  step:
    | 'app_open'
    | 'onboarding_start'
    | 'tutorial_complete'
    | 'first_puzzle_start'
    | 'first_puzzle_complete'
    | 'second_puzzle_start'
    | 'session_end',
): void {
  trackEvent('ftue_funnel', { step, timestamp: Date.now() });
}

export function trackSessionMetrics(data: {
  sessionDuration: number;
  puzzlesPlayed: number;
  wordsFound: number;
  hintsUsed: number;
  undosUsed: number;
  boostersUsed: number;
  adsWatched: number;
  coinsEarned: number;
  coinsSpent: number;
  gemsEarned: number;
  gemsSpent: number;
}): void {
  trackEvent('session_summary', data);
}

// ─── Monetization Events ─────────────────────────────────────────────────────

export function trackOfferShown(data: {
  offerType: string;
  offerPrice: number;
  playerLevel: number;
  sessionNumber: number;
  playerSegment: string;
  triggerContext: string;
}): void {
  trackEvent('offer_impression', data);
}

export function trackOfferDecision(data: {
  offerType: string;
  decision: 'accepted' | 'dismissed' | 'expired';
  timeToDecision: number;
  playerSegment: string;
}): void {
  trackEvent('offer_decision', data);
}

export function trackPaywall(data: {
  paywallType: 'hint_empty' | 'energy_empty' | 'gem_gate' | 'ad_prompt';
  playerLevel: number;
  puzzlesSolved: number;
  totalSpend: number;
  outcome: 'converted' | 'watched_ad' | 'abandoned' | 'used_free_option';
}): void {
  trackEvent('paywall_encounter', data);
}

// ─── Difficulty & Balance Events ─────────────────────────────────────────────

export function trackDifficultyPerception(data: {
  level: number;
  mode: string;
  attempts: number;
  timeToComplete: number;
  hintsUsed: number;
  undosUsed: number;
  deadEndsHit: number;
  stars: number;
  playerRating?: 'too_easy' | 'just_right' | 'too_hard';
}): void {
  trackEvent('difficulty_perception', data);
}

export function trackChurnRisk(data: {
  consecutiveFailures: number;
  daysSinceLastPlay: number;
  sessionCount: number;
  totalSpend: number;
  lastFeatureUsed: string;
}): void {
  trackEvent('churn_risk_signal', data);
  if (data.consecutiveFailures >= 3) {
    trackUserProperty('churn_risk', 'high');
  } else if (data.daysSinceLastPlay >= 3) {
    trackUserProperty('churn_risk', 'medium');
  }
}

// ─── Social Events ───────────────────────────────────────────────────────────

export function trackSocialAction(
  action:
    | 'share'
    | 'challenge_sent'
    | 'challenge_accepted'
    | 'club_joined'
    | 'club_created'
    | 'friend_added'
    | 'gift_sent'
    | 'referral_shared',
): void {
  trackEvent('social_action', { action, timestamp: Date.now() });
}

// ─── Feature Discovery ──────────────────────────────────────────────────────

export function trackFeatureDiscovery(
  feature: string,
  source: 'organic' | 'tooltip' | 'tutorial' | 'notification' | 'deep_link',
): void {
  trackEvent('feature_discovery', { feature, source, timestamp: Date.now() });
}

// ─── A/B Test Result Tracking ────────────────────────────────────────────────

export function trackExperimentConversion(
  experimentId: string,
  conversionEvent: string,
  value?: number,
): void {
  trackEvent('experiment_conversion', { experimentId, conversionEvent, value });
}
