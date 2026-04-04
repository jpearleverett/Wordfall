/**
 * Event Manager Service
 *
 * Singleton service that manages active events at runtime.
 * Determines active events on app start, tracks per-player event progress,
 * computes combined reward multipliers, and handles event reward claiming.
 */

import {
  getActiveEventLayers,
  getMiniEventForDate,
  isWeekendBlitz as checkWeekendBlitz,
  MiniEvent,
  WinStreakState,
  DEFAULT_WIN_STREAK_STATE,
  ActiveEventLayers,
} from '../data/eventLayers';
import { getCurrentEvent, getEventForWeek } from '../data/events';
import { GameEvent, EventRewardTier } from '../types';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ActiveEvent {
  id: string;
  type: 'main' | 'mini' | 'weekend_blitz' | 'win_streak';
  name: string;
  description: string;
  icon: string;
  progress: number;
  endTime: number;
  rewards: EventRewardTierDisplay[];
  multipliers: EventMultipliers;
}

export interface EventRewardTierDisplay {
  tier: string;
  threshold: number;
  rewards: { coins?: number; gems?: number; hintTokens?: number; badge?: string; decoration?: string };
  claimed: boolean;
  reached: boolean;
}

export interface EventMultipliers {
  coins: number;
  xp: number;
  rareTileChance: number;
}

export interface EventProgress {
  [eventId: string]: {
    progress: number;
    claimedTiers: string[];
    startedAt: number;
  };
}

export interface EventReward {
  coins?: number;
  gems?: number;
  hintTokens?: number;
  badge?: string;
  decoration?: string;
}

// ─── Singleton ─────────────────────────────────────────────────────────────

class EventManager {
  private static instance: EventManager;
  private eventProgress: EventProgress = {};
  private cachedLayers: ActiveEventLayers | null = null;
  private lastRefreshDate: string = '';

  private constructor() {}

  static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  /**
   * Initialize the event manager on app start.
   * Loads saved progress and computes active events.
   */
  init(savedProgress?: EventProgress): void {
    if (savedProgress) {
      this.eventProgress = { ...savedProgress };
    }
    this.refreshLayers();
  }

  /**
   * Refresh the active event layers based on current date.
   */
  private refreshLayers(): void {
    const today = new Date().toISOString().split('T')[0];
    if (today === this.lastRefreshDate && this.cachedLayers) return;

    this.cachedLayers = getActiveEventLayers(today, DEFAULT_WIN_STREAK_STATE);
    this.lastRefreshDate = today;
  }

  /**
   * Get the current date string.
   */
  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get all currently active events with time remaining and progress.
   */
  getActiveEvents(): ActiveEvent[] {
    this.refreshLayers();
    const events: ActiveEvent[] = [];
    const now = Date.now();
    const today = this.getToday();

    // 1. Main weekly event
    const mainEvent = getCurrentEvent();
    if (mainEvent) {
      const endDate = new Date(mainEvent.endDate + 'T23:59:59');
      const endTime = endDate.getTime();
      if (endTime > now) {
        const eventId = mainEvent.id;
        const progress = this.getProgress(eventId);
        events.push({
          id: eventId,
          type: 'main',
          name: mainEvent.name,
          description: mainEvent.description,
          icon: this.getEventTypeIcon(mainEvent.type),
          progress,
          endTime,
          rewards: this.buildRewardTiers(mainEvent.rewards, progress, eventId),
          multipliers: this.getMainEventMultipliers(mainEvent),
        });
      }
    }

    // 2. Mini event
    const miniEvent = getMiniEventForDate(today);
    if (miniEvent) {
      const todayDate = new Date(today);
      const endTime = todayDate.getTime() + miniEvent.durationHours * 60 * 60 * 1000;
      if (endTime > now) {
        const eventId = `mini_${miniEvent.id}_${today}`;
        const progress = this.getProgress(eventId);
        events.push({
          id: eventId,
          type: 'mini',
          name: miniEvent.name,
          description: miniEvent.description,
          icon: miniEvent.icon,
          progress,
          endTime,
          rewards: miniEvent.rewards.map((r, i) => ({
            tier: ['bronze', 'silver', 'gold'][i] || `tier_${i}`,
            threshold: r.threshold,
            rewards: r.reward,
            claimed: this.isTierClaimed(eventId, ['bronze', 'silver', 'gold'][i] || `tier_${i}`),
            reached: progress >= r.threshold,
          })),
          multipliers: this.getMiniEventMultipliers(miniEvent),
        });
      }
    }

    // 3. Weekend Blitz
    if (checkWeekendBlitz()) {
      const now2 = new Date();
      // End of Sunday 23:59:59
      const dayOfWeek = now2.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      const endOfBlitz = new Date(now2);
      endOfBlitz.setDate(endOfBlitz.getDate() + daysUntilSunday);
      endOfBlitz.setHours(23, 59, 59, 999);

      const blitzId = `weekend_blitz_${today}`;
      events.push({
        id: blitzId,
        type: 'weekend_blitz',
        name: 'Weekend Blitz',
        description: 'Double XP and increased rare tile drops all weekend!',
        icon: '\u{1F525}',
        progress: this.getProgress(blitzId),
        endTime: endOfBlitz.getTime(),
        rewards: [
          { tier: 'bronze', threshold: 3, rewards: { coins: 200 }, claimed: this.isTierClaimed(blitzId, 'bronze'), reached: this.getProgress(blitzId) >= 3 },
          { tier: 'silver', threshold: 7, rewards: { coins: 500, gems: 5 }, claimed: this.isTierClaimed(blitzId, 'silver'), reached: this.getProgress(blitzId) >= 7 },
          { tier: 'gold', threshold: 12, rewards: { coins: 1000, gems: 15 }, claimed: this.isTierClaimed(blitzId, 'gold'), reached: this.getProgress(blitzId) >= 12 },
        ],
        multipliers: { coins: 1, xp: 2, rareTileChance: 2 },
      });
    }

    return events;
  }

  /**
   * Get combined multipliers from all active events.
   * Only the highest multiplier per type is used (e.g., 2x coins from event A and 1.5x from event B = 2x total).
   */
  getEventMultipliers(): EventMultipliers {
    const events = this.getActiveEvents();
    let coins = 1;
    let xp = 1;
    let rareTileChance = 1;

    for (const event of events) {
      coins = Math.max(coins, event.multipliers.coins);
      xp = Math.max(xp, event.multipliers.xp);
      rareTileChance = Math.max(rareTileChance, event.multipliers.rareTileChance);
    }

    return { coins, xp, rareTileChance };
  }

  /**
   * Update progress for an event.
   */
  updateEventProgress(eventId: string, progressType: string, amount: number): void {
    if (!this.eventProgress[eventId]) {
      this.eventProgress[eventId] = {
        progress: 0,
        claimedTiers: [],
        startedAt: Date.now(),
      };
    }

    // progressType determines how to apply the amount:
    // 'score' — adds to raw progress total
    // 'puzzles' — increments puzzle count
    // 'stars' — adds star count
    // 'perfect' — increments perfect count
    this.eventProgress[eventId].progress += amount;
  }

  /**
   * Get available rewards based on current progress for an event.
   */
  getEventRewards(eventId: string): EventReward[] {
    const events = this.getActiveEvents();
    const event = events.find(e => e.id === eventId);
    if (!event) return [];

    return event.rewards
      .filter(r => r.reached && !r.claimed)
      .map(r => r.rewards);
  }

  /**
   * Claim a reward tier for an event.
   * Returns the rewards if successfully claimed, null if already claimed or not reached.
   */
  claimEventReward(eventId: string, tier: string): EventReward | null {
    if (!this.eventProgress[eventId]) {
      return null;
    }

    if (this.eventProgress[eventId].claimedTiers.includes(tier)) {
      return null;
    }

    const events = this.getActiveEvents();
    const event = events.find(e => e.id === eventId);
    if (!event) return null;

    const rewardTier = event.rewards.find(r => r.tier === tier);
    if (!rewardTier || !rewardTier.reached) return null;

    this.eventProgress[eventId].claimedTiers.push(tier);
    return rewardTier.rewards;
  }

  /**
   * Claim the exclusive reward for an event (e.g., cosmetic frame at Gold tier).
   * Returns true if successfully claimed, false if already claimed or no progress exists.
   */
  claimExclusiveReward(eventId: string): boolean {
    if (!this.eventProgress[eventId]) {
      this.eventProgress[eventId] = {
        progress: 0,
        claimedTiers: [],
        startedAt: Date.now(),
      };
    }

    if (this.eventProgress[eventId].claimedTiers.includes('exclusive')) {
      return false;
    }

    this.eventProgress[eventId].claimedTiers.push('exclusive');
    return true;
  }

  /**
   * Check if it's currently a weekend (Saturday/Sunday).
   */
  isWeekendBlitz(): boolean {
    return checkWeekendBlitz();
  }

  /**
   * Get the label for the most impactful active event multiplier.
   * Returns null if no multipliers are active.
   */
  getActiveMultiplierLabel(): string | null {
    const multipliers = this.getEventMultipliers();
    const labels: string[] = [];

    if (multipliers.coins > 1) labels.push(`${multipliers.coins}x COINS!`);
    if (multipliers.xp > 1) labels.push(`${multipliers.xp}x XP!`);
    if (multipliers.rareTileChance > 1) labels.push('RARE TILE BOOST!');

    if (labels.length === 0) return null;

    // If weekend blitz, use that label
    if (checkWeekendBlitz()) return 'WEEKEND BLITZ!';

    return labels[0];
  }

  /**
   * Get a serializable snapshot of event progress for persistence.
   */
  getProgressSnapshot(): EventProgress {
    return { ...this.eventProgress };
  }

  /**
   * Called on each puzzle completion — updates all active event progress.
   */
  onPuzzleComplete(score: number, stars: number, isPerfect: boolean): void {
    const events = this.getActiveEvents();
    for (const event of events) {
      switch (event.type) {
        case 'main':
          this.updateEventProgress(event.id, 'score', score);
          break;
        case 'mini':
          // Mini events track based on their bonus type
          this.updateEventProgress(event.id, 'score', score);
          break;
        case 'weekend_blitz':
          this.updateEventProgress(event.id, 'puzzles', 1);
          break;
      }
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private getProgress(eventId: string): number {
    return this.eventProgress[eventId]?.progress ?? 0;
  }

  private isTierClaimed(eventId: string, tier: string): boolean {
    return this.eventProgress[eventId]?.claimedTiers?.includes(tier) ?? false;
  }

  private buildRewardTiers(
    tiers: EventRewardTier[],
    progress: number,
    eventId: string,
  ): EventRewardTierDisplay[] {
    return tiers.map(t => ({
      tier: t.tier,
      threshold: t.threshold,
      rewards: t.rewards,
      claimed: this.isTierClaimed(eventId, t.tier),
      reached: progress >= t.threshold,
    }));
  }

  private getMainEventMultipliers(event: GameEvent): EventMultipliers {
    // Main events don't have direct multipliers by default,
    // but some event types imply bonuses
    const rules = event.rules;
    return {
      coins: rules.scoreMultiplier ?? 1,
      xp: rules.xpMultiplier ?? 1,
      rareTileChance: 1,
    };
  }

  private getMiniEventMultipliers(mini: MiniEvent): EventMultipliers {
    switch (mini.bonusType) {
      case 'double_coins':
        return { coins: mini.multiplier, xp: 1, rareTileChance: 1 };
      case 'double_stars':
        return { coins: 1, xp: mini.multiplier, rareTileChance: 1 };
      case 'rare_tile_boost':
        return { coins: 1, xp: 1, rareTileChance: mini.multiplier };
      case 'xp_surge':
        return { coins: 1, xp: mini.multiplier, rareTileChance: 1 };
      case 'bonus_hints':
        return { coins: 1, xp: 1, rareTileChance: 1 };
      default:
        return { coins: 1, xp: 1, rareTileChance: 1 };
    }
  }

  private getEventTypeIcon(type: string): string {
    switch (type) {
      case 'speedSolve': return '\u{26A1}';
      case 'perfectClear': return '\u{2B50}';
      case 'clubRally': return '\u{1F3C6}';
      case 'gravityFlipChampionship': return '\u{1F30D}';
      case 'mysteryWords': return '\u{1F50D}';
      case 'retroRewind': return '\u{1F579}\u{FE0F}';
      case 'themeWeek': return '\u{1F3A8}';
      case 'expertGauntlet': return '\u{2694}\u{FE0F}';
      case 'communityMilestone': return '\u{1F30D}';
      case 'seasonFinale': return '\u{1F389}';
      default: return '\u{1F3AE}';
    }
  }
}

// Export singleton instance
export const eventManager = EventManager.getInstance();
