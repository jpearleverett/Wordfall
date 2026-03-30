/**
 * Player Segmentation Service
 *
 * Computes multi-dimensional player segments based on behavior data.
 * Used to personalize offers, difficulty, home content, notifications,
 * and mode recommendations.
 */

import { GameMode } from '../types';

// ─── Segment Types ──────────────────────────────────────────────────────────

export type EngagementSegment =
  | 'new_player'
  | 'casual'
  | 'regular'
  | 'hardcore'
  | 'at_risk'
  | 'lapsed'
  | 'returned';

export type SkillSegment =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

export type SpendingSegment =
  | 'non_payer'
  | 'minnow'
  | 'dolphin'
  | 'whale';

export type MotivationSegment =
  | 'completionist'
  | 'competitor'
  | 'explorer'
  | 'social'
  | 'achiever';

export interface PlayerSegments {
  engagement: EngagementSegment;
  skill: SkillSegment;
  spending: SpendingSegment;
  motivations: MotivationSegment[];
  computedAt: string;
}

// ─── Input Data Shape ───────────────────────────────────────────────────────

/** Subset of player + economy data needed for segmentation */
export interface SegmentationInput {
  // Progress
  puzzlesSolved: number;
  currentLevel: number;
  highestLevel: number;
  totalStars: number;
  starsByLevel: Record<number, number>;
  perfectSolves: number;

  // Daily / session tracking
  dailyLoginDates: string[];
  lastActiveDate: string;
  dailyCompleted: string[];

  // Collections
  atlasPages: Record<string, string[]>;
  rareTilesCount: number;
  restoredWings: string[];

  // Social
  clubId: string | null;
  friendIds: string[];
  hintGiftsSentToday: number;
  tileGiftsSentToday: number;

  // Modes
  unlockedModes: string[];
  modeStats: Record<string, { played: number; bestScore: number; wins: number }>;

  // Achievements
  achievementIds: string[];

  // Tooltips (used to detect exploration behavior)
  tooltipsShown: string[];

  // Spending (from economy context)
  totalSpendCents: number;

  // Tracking
  wordsFoundTotal: number;
  modesPlayedThisWeek: string[];

  // Share tracking (approximated from tooltips or other signals)
  sharesCount: number;
}

// ─── Default Segments ───────────────────────────────────────────────────────

export const DEFAULT_SEGMENTS: PlayerSegments = {
  engagement: 'new_player',
  skill: 'beginner',
  spending: 'non_payer',
  motivations: [],
  computedAt: '',
};

// ─── Segment Computation ────────────────────────────────────────────────────

function daysBetween(dateA: string, dateB: string): number {
  if (!dateA || !dateB) return Infinity;
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  if (isNaN(a) || isNaN(b)) return Infinity;
  return Math.abs(Math.floor((b - a) / (1000 * 60 * 60 * 24)));
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getRecentLoginDays(loginDates: string[], windowDays: number): number {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return loginDates.filter(d => d >= cutoffStr).length;
}

function computeAverageStars(starsByLevel: Record<number, number>): number {
  const values = Object.values(starsByLevel);
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function estimatePuzzlesPerSession(
  puzzlesSolved: number,
  loginDates: string[],
): number {
  const uniqueDays = new Set(loginDates).size;
  if (uniqueDays === 0) return 0;
  return puzzlesSolved / uniqueDays;
}

// ── Engagement ──────────────────────────────────────────────────────────────

function computeEngagement(input: SegmentationInput): EngagementSegment {
  const today = getToday();
  const daysSinceActive = daysBetween(input.lastActiveDate, today);

  // New player: < 3 puzzles solved and within first 24 hours
  if (input.puzzlesSolved < 3 && input.dailyLoginDates.length <= 1) {
    return 'new_player';
  }

  // Lapsed: 7+ days since last activity
  if (daysSinceActive >= 7) {
    return 'lapsed';
  }

  // Returned: played today after 3+ days absence
  const playedToday = input.lastActiveDate === today || input.dailyLoginDates.includes(today);
  if (playedToday && input.dailyLoginDates.length >= 2) {
    // Find the second-most-recent login date
    const sortedDates = [...input.dailyLoginDates].sort().reverse();
    const previousDate = sortedDates.find(d => d !== today && d < today);
    if (previousDate && daysBetween(previousDate, today) >= 3) {
      return 'returned';
    }
  }

  // At risk: was regular/hardcore but 2-3 days inactive
  if (daysSinceActive >= 2 && daysSinceActive <= 6) {
    const loginDaysLast14 = getRecentLoginDays(input.dailyLoginDates, 14);
    // Was playing regularly (4+ days in the 2 weeks prior)
    if (loginDaysLast14 >= 4) {
      return 'at_risk';
    }
  }

  // Active player classification based on recent activity
  const sessionsLast7Days = getRecentLoginDays(input.dailyLoginDates, 7);
  const puzzlesPerSession = estimatePuzzlesPerSession(
    input.puzzlesSolved,
    input.dailyLoginDates,
  );

  // Hardcore: daily player, 10+ puzzles per session
  if (sessionsLast7Days >= 6 && puzzlesPerSession >= 10) {
    return 'hardcore';
  }

  // Regular: 4-6 sessions/week, 5-10 puzzles per session
  if (sessionsLast7Days >= 4 && puzzlesPerSession >= 5) {
    return 'regular';
  }

  // Casual: everything else that's active
  return 'casual';
}

// ── Skill ───────────────────────────────────────────────────────────────────

function computeSkill(input: SegmentationInput): SkillSegment {
  const avgStars = computeAverageStars(input.starsByLevel);
  const level = input.highestLevel;

  // Expert: plays expert mode puzzles and level 30+
  const expertModeWins = input.modeStats['expert']?.wins ?? 0;
  if (expertModeWins > 0 && level >= 30) {
    return 'expert';
  }

  // Advanced: average stars > 2.5 and level 25+
  if (avgStars > 2.5 && level >= 25) {
    return 'advanced';
  }

  // Intermediate: average stars 1.5-2.5 and level 10-25
  if (avgStars >= 1.5 && level >= 10) {
    return 'intermediate';
  }

  return 'beginner';
}

// ── Spending ────────────────────────────────────────────────────────────────

function computeSpending(input: SegmentationInput): SpendingSegment {
  const totalDollars = input.totalSpendCents / 100;

  if (totalDollars <= 0) return 'non_payer';
  if (totalDollars < 5) return 'minnow';
  if (totalDollars <= 50) return 'dolphin';
  return 'whale';
}

// ── Motivations ─────────────────────────────────────────────────────────────

function computeMotivations(input: SegmentationInput): MotivationSegment[] {
  const motivations: MotivationSegment[] = [];

  // Completionist: high collection progress, plays all modes
  const atlasPageCount = Object.keys(input.atlasPages).length;
  const atlasWordsFound = Object.values(input.atlasPages)
    .reduce((sum, words) => sum + words.length, 0);
  const modesPlayed = Object.keys(input.modeStats).filter(
    m => input.modeStats[m].played > 0,
  ).length;
  if (
    (atlasWordsFound >= 15 || atlasPageCount >= 3 || input.restoredWings.length >= 2) &&
    modesPlayed >= 3
  ) {
    motivations.push('completionist');
  }

  // Competitor: plays daily challenges, checks leaderboards
  const dailyCount = input.dailyCompleted.length;
  const hasCompetitiveModes =
    (input.modeStats['daily']?.played ?? 0) >= 3 ||
    (input.modeStats['weekly']?.played ?? 0) >= 1;
  if (dailyCount >= 5 || hasCompetitiveModes) {
    motivations.push('competitor');
  }

  // Explorer: tries many modes, reads tooltips
  if (modesPlayed >= 4 || input.tooltipsShown.length >= 3) {
    motivations.push('explorer');
  }

  // Social: gifts often, club member, shares results
  const isSocial =
    input.clubId !== null ||
    input.friendIds.length >= 2 ||
    input.sharesCount >= 3 ||
    input.hintGiftsSentToday >= 1;
  if (isSocial) {
    motivations.push('social');
  }

  // Achiever: focuses on stars and achievements
  const avgStars = computeAverageStars(input.starsByLevel);
  if (
    (avgStars >= 2.5 && input.puzzlesSolved >= 10) ||
    input.achievementIds.length >= 5 ||
    input.perfectSolves >= 10
  ) {
    motivations.push('achiever');
  }

  return motivations;
}

// ─── Main Computation ───────────────────────────────────────────────────────

export function computeSegments(input: SegmentationInput): PlayerSegments {
  return {
    engagement: computeEngagement(input),
    skill: computeSkill(input),
    spending: computeSpending(input),
    motivations: computeMotivations(input),
    computedAt: new Date().toISOString(),
  };
}

// ─── Personalization Hooks ──────────────────────────────────────────────────

export interface OfferTiming {
  delayMs: number;
  frequency: 'low' | 'medium' | 'high';
}

export function getPersonalizedOfferTiming(segments: PlayerSegments): OfferTiming {
  const { engagement, spending } = segments;

  // New players: minimal offers, long delay
  if (engagement === 'new_player') {
    return { delayMs: 60000, frequency: 'low' };
  }

  // At-risk / returned players: more generous offers shown sooner
  if (engagement === 'at_risk' || engagement === 'returned') {
    return { delayMs: 15000, frequency: 'high' };
  }

  // Lapsed players: immediate generous offer on return
  if (engagement === 'lapsed') {
    return { delayMs: 5000, frequency: 'high' };
  }

  // Whales: exclusive offers, moderate frequency
  if (spending === 'whale') {
    return { delayMs: 20000, frequency: 'medium' };
  }

  // Non-payers: softer, less frequent offers
  if (spending === 'non_payer') {
    return { delayMs: 45000, frequency: 'low' };
  }

  // Hardcore players: they know what they want
  if (engagement === 'hardcore') {
    return { delayMs: 30000, frequency: 'low' };
  }

  // Regular / casual default
  return { delayMs: 30000, frequency: 'medium' };
}

export function getPersonalizedDifficulty(
  segments: PlayerSegments,
): 'easier' | 'normal' | 'harder' {
  const { skill, engagement } = segments;

  // Returned/at-risk players: ease them back in
  if (engagement === 'returned' || engagement === 'at_risk') {
    return 'easier';
  }

  // New players always get normal (tutorial handles this)
  if (engagement === 'new_player') {
    return 'normal';
  }

  // Expert skill players who are hardcore: push them
  if (skill === 'expert' && engagement === 'hardcore') {
    return 'harder';
  }

  // Beginners who are casual: keep it gentle
  if (skill === 'beginner' && engagement === 'casual') {
    return 'easier';
  }

  return 'normal';
}

export function getPersonalizedHomeContent(segments: PlayerSegments): string[] {
  const sections: string[] = ['hero', 'play_button'];
  const { engagement, motivations } = segments;

  // New players: minimal UI
  if (engagement === 'new_player') {
    return sections;
  }

  // Always show streak for returning players
  sections.push('streak');

  // Daily rewards for all active players
  sections.push('daily_rewards');

  // At-risk / returned: show welcome back, generous offers
  if (engagement === 'at_risk' || engagement === 'returned' || engagement === 'lapsed') {
    sections.push('welcome_back');
    sections.push('generous_offer');
  }

  // Competitor motivation: emphasize daily challenge and leaderboard
  if (motivations.includes('competitor')) {
    sections.push('daily_challenge');
    sections.push('leaderboard_preview');
  } else {
    sections.push('daily_challenge');
  }

  // Completionist: show collection progress
  if (motivations.includes('completionist')) {
    sections.push('collection_progress');
  }

  // Social players: show friend activity
  if (motivations.includes('social')) {
    sections.push('friend_activity');
  }

  // Established+ content
  if (engagement === 'regular' || engagement === 'hardcore') {
    sections.push('weekly_goals');
    sections.push('missions');
  }

  // Mystery wheel for all active (non-new) players
  sections.push('mystery_wheel');

  // Explorer: highlight new modes
  if (motivations.includes('explorer')) {
    sections.push('mode_spotlight');
  }

  // Always show recommendation and deals for non-new players
  sections.push('recommendation');
  sections.push('daily_deal');

  return sections;
}

export interface NotificationConfig {
  enabledCategories: string[];
  streakReminderHour: number;
  dailyChallengeHour: number;
  comebackDelayDays: number;
  maxPerDay: number;
}

export function getPersonalizedNotifications(
  segments: PlayerSegments,
): NotificationConfig {
  const { engagement, spending } = segments;

  // Hardcore players: minimal notifications
  if (engagement === 'hardcore') {
    return {
      enabledCategories: ['event_starting', 'event_ending', 'friend_activity'],
      streakReminderHour: 21, // later, they'll probably play anyway
      dailyChallengeHour: 9,
      comebackDelayDays: 7,
      maxPerDay: 1,
    };
  }

  // At-risk players: gentle nudges
  if (engagement === 'at_risk') {
    return {
      enabledCategories: [
        'streak_reminder',
        'daily_challenge',
        'mystery_wheel',
        'event_starting',
        'comeback',
      ],
      streakReminderHour: 19, // earlier reminder
      dailyChallengeHour: 9,
      comebackDelayDays: 2,
      maxPerDay: 3,
    };
  }

  // Lapsed players: comeback focused
  if (engagement === 'lapsed') {
    return {
      enabledCategories: ['comeback', 'event_starting'],
      streakReminderHour: 20,
      dailyChallengeHour: 10,
      comebackDelayDays: 1,
      maxPerDay: 2,
    };
  }

  // Returned players: encouraging but not overwhelming
  if (engagement === 'returned') {
    return {
      enabledCategories: [
        'streak_reminder',
        'daily_challenge',
        'energy_full',
        'event_starting',
      ],
      streakReminderHour: 20,
      dailyChallengeHour: 9,
      comebackDelayDays: 3,
      maxPerDay: 2,
    };
  }

  // Non-payers: softer monetization messaging
  if (spending === 'non_payer') {
    return {
      enabledCategories: [
        'streak_reminder',
        'daily_challenge',
        'energy_full',
        'event_starting',
        'mystery_wheel',
      ],
      streakReminderHour: 20,
      dailyChallengeHour: 9,
      comebackDelayDays: 3,
      maxPerDay: 2,
    };
  }

  // Whales: exclusive offer notifications
  if (spending === 'whale') {
    return {
      enabledCategories: [
        'streak_reminder',
        'daily_challenge',
        'event_starting',
        'event_ending',
        'mystery_wheel',
        'friend_activity',
      ],
      streakReminderHour: 20,
      dailyChallengeHour: 9,
      comebackDelayDays: 5,
      maxPerDay: 3,
    };
  }

  // Regular / casual: balanced defaults
  return {
    enabledCategories: [
      'streak_reminder',
      'daily_challenge',
      'energy_full',
      'event_starting',
      'mystery_wheel',
    ],
    streakReminderHour: 20,
    dailyChallengeHour: 9,
    comebackDelayDays: 3,
    maxPerDay: 2,
  };
}

export function getRecommendedMode(segments: PlayerSegments): GameMode {
  const { motivations, skill, engagement } = segments;

  // Competitors: daily/weekly challenges
  if (motivations.includes('competitor')) {
    return 'daily';
  }

  // Achievers with advanced skill: perfectSolve mode
  if (motivations.includes('achiever') && (skill === 'advanced' || skill === 'expert')) {
    return 'perfectSolve';
  }

  // Explorers: suggest a mode they may not have tried
  if (motivations.includes('explorer')) {
    return 'weekly';
  }

  // Expert skill: expert mode
  if (skill === 'expert') {
    return 'expert';
  }

  // At-risk / returned: relaxing experience
  if (engagement === 'at_risk' || engagement === 'returned') {
    return 'relax';
  }

  // New / casual / beginner: classic
  if (engagement === 'new_player' || engagement === 'casual' || skill === 'beginner') {
    return 'classic';
  }

  // Default for regular players
  return 'classic';
}

// ─── Welcome Back Messages ──────────────────────────────────────────────────

export function getWelcomeBackMessage(
  segments: PlayerSegments,
): { title: string; subtitle: string } | null {
  const { engagement } = segments;

  if (engagement === 'returned') {
    return {
      title: 'Welcome Back!',
      subtitle: 'We saved some rewards for you. Great to see you again!',
    };
  }

  if (engagement === 'at_risk') {
    return {
      title: 'We Missed You!',
      subtitle: 'Your streak and puzzles are waiting. Jump back in!',
    };
  }

  if (engagement === 'lapsed') {
    return {
      title: 'Welcome Back, Word Master!',
      subtitle: 'A lot has happened while you were away. Check out your comeback rewards!',
    };
  }

  return null;
}
