/**
 * Event Manager Service
 *
 * Singleton service that manages active events at runtime.
 * Determines active events on app start, tracks per-player event progress,
 * computes combined reward multipliers, and handles event reward claiming.
 */

import {
  getActiveEventLayers,
  getActiveMiniEvent,
  isWeekendBlitz as checkWeekendBlitz,
  MiniEvent,
  WinStreakState,
  DEFAULT_WIN_STREAK_STATE,
  ActiveEventLayers,
} from '../data/eventLayers';
import { getCurrentEvent, getEventForWeek } from '../data/events';
import { GameEvent, EventRewardTier } from '../types';
import { getRemoteString } from './remoteConfig';

// ─── Remote-Config override (Phase 4D) ────────────────────────────────────
// Schema (documented for non-engineer editors):
// {
//   "events": [
//     {
//       "id": "string",               // unique; prefix "rc_" to avoid collisions
//       "type": "main" | "mini",      // rendered alongside main/mini built-ins
//       "name": "string",
//       "description": "string",
//       "icon": "emoji or glyph",
//       "endTime": <epoch ms>,        // when the event disappears
//       "multipliers": {              // all optional, default 1
//         "coins": 2, "xp": 2, "rareTileChance": 1.5
//       },
//       "progressUnit": "score" | "count",   // optional, default "score":
//                                            //   how puzzle completions accrue
//       "thresholds": [500, 1500, 3000],     // optional shorthand — per-tier
//                                            //   thresholds when a rewards
//                                            //   entry omits its own
//       "rewards": [                         // optional tier ladder; without
//         {                                  //   it the event shows progress
//           "tier": "bronze",                //   but pays nothing (as before)
//           "threshold": 500,
//           "rewards": { "coins": 200, "gems": 5, "hintTokens": 3 }
//         }
//       ]
//     }
//   ]
// }
// If JSON is empty or malformed the built-in calendar is used untouched;
// a malformed rewards/thresholds/progressUnit field degrades that ONE field
// to its safe default (no ladder / 'score') without dropping the event.

export interface RemoteEventTier {
  tier: string;
  threshold: number;
  rewards: { coins?: number; gems?: number; hintTokens?: number };
}

export interface RemoteEventEntry {
  id: string;
  type: 'main' | 'mini';
  name: string;
  description: string;
  icon: string;
  endTime: number;
  multipliers?: Partial<EventMultipliers>;
  /** Unit puzzle completions accrue in: raw score (default) or +1 each. */
  progressUnit?: 'score' | 'count';
  rewards?: RemoteEventTier[];
}

// Remote tiers are ops-authored JSON landing on every device with no build
// to roll back — clamp each payout so a slipped digit cannot mint currency.
const REMOTE_TIER_MAX_GEMS = 100;
const REMOTE_TIER_MAX_COINS = 10_000;
const REMOTE_TIER_MAX_HINTS = 50;
const REMOTE_MAX_TIERS = 8;
const DEFAULT_TIER_NAMES = ['bronze', 'silver', 'gold', 'diamond'];

function clampRemoteAmount(value: unknown, max: number): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(Math.floor(n), max);
}

/**
 * Validate one raw `rewards` array (with optional top-level `thresholds`
 * shorthand) into a clean RemoteEventTier[]. Returns undefined when the
 * ladder as a whole is unusable — the caller then falls back to the
 * no-ladder template behavior instead of shipping a broken ladder.
 */
function parseRemoteRewards(
  rawRewards: unknown,
  rawThresholds: unknown,
): RemoteEventTier[] | undefined {
  if (!Array.isArray(rawRewards) || rawRewards.length === 0) return undefined;
  const thresholds = Array.isArray(rawThresholds) ? rawThresholds : [];
  const tiers: RemoteEventTier[] = [];
  for (let i = 0; i < Math.min(rawRewards.length, REMOTE_MAX_TIERS); i++) {
    const entry = rawRewards[i];
    if (!entry || typeof entry !== 'object') return undefined;
    const e = entry as {
      tier?: unknown;
      threshold?: unknown;
      rewards?: unknown;
    };
    const threshold = Number(e.threshold ?? thresholds[i]);
    if (!Number.isFinite(threshold) || threshold <= 0) return undefined;
    const payload =
      e.rewards && typeof e.rewards === 'object'
        ? (e.rewards as { coins?: unknown; gems?: unknown; hintTokens?: unknown })
        : {};
    const coins = clampRemoteAmount(payload.coins, REMOTE_TIER_MAX_COINS);
    const gems = clampRemoteAmount(payload.gems, REMOTE_TIER_MAX_GEMS);
    const hintTokens = clampRemoteAmount(payload.hintTokens, REMOTE_TIER_MAX_HINTS);
    tiers.push({
      tier:
        typeof e.tier === 'string' && e.tier.length > 0
          ? e.tier
          : DEFAULT_TIER_NAMES[i] ?? `tier_${i}`,
      threshold,
      rewards: {
        ...(coins !== undefined ? { coins } : {}),
        ...(gems !== undefined ? { gems } : {}),
        ...(hintTokens !== undefined ? { hintTokens } : {}),
      },
    });
  }
  // Ascending thresholds and distinct tier names, or the claim ledger
  // (keyed by tier name) and the reached flags stop making sense.
  const names = new Set(tiers.map((t) => t.tier));
  if (names.size !== tiers.length) return undefined;
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].threshold <= tiers[i - 1].threshold) return undefined;
  }
  return tiers;
}

/**
 * Exported for testing. Parses `eventCalendarOverride` into a clean
 * RemoteEventEntry[]. Returns [] on empty, malformed, or wrongly-shaped JSON.
 */
export function parseRemoteEvents(): RemoteEventEntry[] {
  const raw = getRemoteString('eventCalendarOverride');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return [];
    const events = (parsed as { events?: unknown }).events;
    if (!Array.isArray(events)) return [];
    return events
      .filter((e): e is Record<string, unknown> =>
        !!e &&
        typeof e === 'object' &&
        typeof (e as { id?: unknown }).id === 'string' &&
        typeof (e as { endTime?: unknown }).endTime === 'number' &&
        ((e as { type?: unknown }).type === 'main' ||
          (e as { type?: unknown }).type === 'mini'),
      )
      .map((e) => {
        const entry: RemoteEventEntry = {
          id: e.id as string,
          type: e.type as 'main' | 'mini',
          name: typeof e.name === 'string' ? (e.name as string) : '',
          description:
            typeof e.description === 'string' ? (e.description as string) : '',
          icon: typeof e.icon === 'string' ? (e.icon as string) : '',
          endTime: e.endTime as number,
          multipliers: e.multipliers as Partial<EventMultipliers> | undefined,
        };
        if (e.progressUnit === 'score' || e.progressUnit === 'count') {
          entry.progressUnit = e.progressUnit;
        }
        const rewards = parseRemoteRewards(e.rewards, e.thresholds);
        if (rewards) entry.rewards = rewards;
        return entry;
      });
  } catch {
    return [];
  }
}

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
    this.pruneStale();
  }

  /**
   * Drop progress entries for long-dead events. Date-keyed ids (daily
   * streaks, weekend blitzes, weekly events) otherwise accumulate forever
   * and get JSON.stringify'd into every debounced player-data persist —
   * a steadily growing cost on the post-win hot path. Active events are
   * always exempt (a Remote-Config override event may run longer than any
   * built-in), and 14 days comfortably outlives every built-in lifetime.
   */
  private pruneStale(): void {
    const activeIds = new Set(this.getActiveEvents().map(e => e.id));
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    for (const id of Object.keys(this.eventProgress)) {
      if (!activeIds.has(id) && this.eventProgress[id].startedAt < cutoff) {
        delete this.eventProgress[id];
      }
    }
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
      // endDate is a UTC date string (toISOString in events.ts) and the
      // weekly rotation advances on UTC 7-day boundaries — parsing the end
      // as LOCAL time made the event vanish from the screen hours before
      // the rotation actually advanced for anyone east of Greenwich.
      const endDate = new Date(mainEvent.endDate + 'T23:59:59.999Z');
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
    const activeMini = getActiveMiniEvent(today);
    if (activeMini) {
      const miniEvent = activeMini.event;
      // End time and event id are anchored to the event's START date. On day
      // two of a 48-hour event, anchoring to "today" would both extend the
      // window by a day and mint a fresh id — wiping tier progress exactly
      // like the Weekend Blitz Sunday bug below.
      const startDate = new Date(activeMini.startDateStr);
      const endTime = startDate.getTime() + miniEvent.durationHours * 60 * 60 * 1000;
      if (endTime > now) {
        const eventId = `mini_${miniEvent.id}_${activeMini.startDateStr}`;
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
            // Mini tiers are authored with a `hints` key; the claim contract
            // (EventScreen → addHintTokens) only reads `hintTokens`. Map at
            // the boundary — passing r.reward through verbatim silently
            // dropped the hint portion of every mini-event tier at claim.
            rewards: {
              ...(r.reward.coins !== undefined ? { coins: r.reward.coins } : {}),
              ...(r.reward.gems !== undefined ? { gems: r.reward.gems } : {}),
              ...(r.reward.hints !== undefined ? { hintTokens: r.reward.hints } : {}),
            },
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
      // End of Sunday 23:59:59 IN UTC — checkWeekendBlitz decides
      // weekend-ness with getUTCDay, so the countdown must use the same
      // clock. Computing it with local getDay() meant a player east of UTC
      // on UTC-Sunday/local-Monday saw "6 days 23h left" on a blitz that
      // ends within hours.
      const dayOfWeek = now2.getUTCDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      const endOfBlitz = new Date(now2);
      endOfBlitz.setUTCDate(endOfBlitz.getUTCDate() + daysUntilSunday);
      endOfBlitz.setUTCHours(23, 59, 59, 999);

      // Key the blitz to the weekend's SATURDAY (UTC, matching
      // isWeekendBlitz's getUTCDay) — a plain `today` key minted a fresh id
      // on Sunday, resetting progress mid-weekend and letting every tier be
      // claimed twice per weekend.
      const blitzAnchor = new Date();
      if (blitzAnchor.getUTCDay() === 0) {
        blitzAnchor.setUTCDate(blitzAnchor.getUTCDate() - 1);
      }
      const blitzId = `weekend_blitz_${blitzAnchor.toISOString().split('T')[0]}`;
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

    // 4. Remote-Config override events (Phase 4D). Layered on top of the
    // built-ins; the multiplier aggregator takes the max per field so
    // stacking a remote 2x coins with a built-in 1.5x blitz yields 2x.
    for (const remote of parseRemoteEvents()) {
      if (remote.endTime <= now) continue;
      const remoteProgress = this.getProgress(remote.id);
      events.push({
        id: remote.id,
        type: remote.type,
        name: remote.name,
        description: remote.description,
        icon: remote.icon,
        progress: remoteProgress,
        endTime: remote.endTime,
        // Validated remote tier ladder (clamped in parseRemoteRewards) —
        // claimable through the same claimEventReward path as built-ins.
        // Without an authored ladder the overlay stays multiplier-only.
        rewards: (remote.rewards ?? []).map((t) => ({
          tier: t.tier,
          threshold: t.threshold,
          rewards: t.rewards,
          claimed: this.isTierClaimed(remote.id, t.tier),
          reached: remoteProgress >= t.threshold,
        })),
        multipliers: {
          coins: remote.multipliers?.coins ?? 1,
          xp: remote.multipliers?.xp ?? 1,
          rareTileChance: remote.multipliers?.rareTileChance ?? 1,
        },
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

    // progressType is a semantic label only — the caller is responsible for
    // passing `amount` already expressed in the unit the event's tier
    // thresholds are authored in ('score' points, 'puzzles' count, 'stars'
    // count, 'rare_tiles' count). See onPuzzleComplete for the routing.
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
   *
   * Mini-event increments are routed by the active template's bonusType,
   * because each template authors its tier thresholds in a different unit:
   * score for coin_rush / xp_surge (500/1500/3000), STARS for star_shower
   * (10/25/50), PUZZLES for hint_frenzy (5/15/30), RARE TILES for rare_hunt
   * (2/5/10). Feeding raw score to all of them made every star/puzzle/rare
   * tier claimable after a single ordinary puzzle (~1000 points) — a
   * recurring coin + gem faucet on a common path.
   *
   * MAIN events get the same routing by event TYPE: perfectClear authors
   * its thresholds in PERFECT CLEARS (3/7/15/25) and mysteryWords in WORDS
   * FOUND — feeding raw score cleared both ladders' every tier with one
   * ordinary puzzle. Remote-Config overlay events route by their validated
   * `progressUnit` ('score' default, 'count' = +1 per completion).
   *
   * `wordsFound` is the number of words on the completed board; callers that
   * don't pass it simply don't advance a words-authored ladder (safe — the
   * failure mode is under-, never over-crediting).
   */
  onPuzzleComplete(
    score: number,
    stars: number,
    isPerfect: boolean,
    wordsFound: number = 0,
  ): void {
    const events = this.getActiveEvents();
    const activeMini = getActiveMiniEvent(this.getToday());
    const builtinMiniId = activeMini
      ? `mini_${activeMini.event.id}_${activeMini.startDateStr}`
      : null;
    const builtinMain = getCurrentEvent();
    const remoteUnitById = new Map<string, 'score' | 'count'>();
    for (const remote of parseRemoteEvents()) {
      remoteUnitById.set(remote.id, remote.progressUnit ?? 'score');
    }
    const advanceRemote = (eventId: string) => {
      if (remoteUnitById.get(eventId) === 'count') {
        this.updateEventProgress(eventId, 'count', 1);
      } else {
        this.updateEventProgress(eventId, 'score', score);
      }
    };
    for (const event of events) {
      switch (event.type) {
        case 'main':
          if (!builtinMain || event.id !== builtinMain.id) {
            // Remote-Config main overlay — validated progressUnit routing.
            advanceRemote(event.id);
            break;
          }
          switch (builtinMain.type) {
            case 'perfectClear': // thresholds are perfect clears
              if (isPerfect) {
                this.updateEventProgress(event.id, 'perfect_clears', 1);
              }
              break;
            case 'mysteryWords': // thresholds are words found
              if (wordsFound > 0) {
                this.updateEventProgress(event.id, 'words', wordsFound);
              }
              break;
            default: // every other main ladder is authored in score
              this.updateEventProgress(event.id, 'score', score);
          }
          break;
        case 'mini':
          if (event.id !== builtinMiniId || !activeMini) {
            // Remote-Config mini overlay — validated progressUnit routing.
            advanceRemote(event.id);
            break;
          }
          switch (activeMini.event.bonusType) {
            case 'double_stars': // star_shower — thresholds are stars
              this.updateEventProgress(event.id, 'stars', stars);
              break;
            case 'bonus_hints': // hint_frenzy — thresholds are puzzles solved
              this.updateEventProgress(event.id, 'puzzles', 1);
              break;
            case 'rare_tile_boost':
              // rare_hunt — thresholds are rare tiles found; advanced by
              // onRareTileEarned, not by generic completion.
              break;
            default: // coin_rush / xp_surge — thresholds are score-scaled
              this.updateEventProgress(event.id, 'score', score);
          }
          break;
        case 'weekend_blitz':
          this.updateEventProgress(event.id, 'puzzles', 1);
          break;
      }
    }
  }

  /**
   * Called when the player earns a rare tile — advances the active
   * rare_tile_boost mini event (Rare Tile Hunt), whose tier thresholds are
   * authored in rare tiles found. The reward wiring should invoke this right
   * after crediting the tile (player.addRareTile).
   */
  onRareTileEarned(): void {
    const activeMini = getActiveMiniEvent(this.getToday());
    if (!activeMini || activeMini.event.bonusType !== 'rare_tile_boost') return;
    const builtinMiniId = `mini_${activeMini.event.id}_${activeMini.startDateStr}`;
    const active = this.getActiveEvents().find(e => e.id === builtinMiniId);
    if (active) {
      this.updateEventProgress(active.id, 'rare_tiles', 1);
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
