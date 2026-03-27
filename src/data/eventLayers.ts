/**
 * Event Layering System
 *
 * Enables multiple simultaneous events running in parallel, each on different
 * time scales. This mirrors top-grossing games like Royal Match and Monopoly GO
 * which run 3-5 concurrent events at any moment.
 *
 * Event Layers:
 * 1. MAIN EVENT — Weekly rotating event from the existing calendar (unchanged)
 * 2. MINI EVENT — 24-48 hour quick events that overlay on top of the main event
 * 3. WEEKEND BLITZ — Automatic Sat-Sun bonus event
 * 4. WIN STREAK — Royal Match-style consecutive win streak with escalating rewards
 * 5. PARTNER EVENT — Cooperative 2-player event (requires Firestore, scaffolded)
 */

import { getCurrentEvent, getEventForWeek, EVENT_TEMPLATES } from './events';
import { GameEvent } from '../types';

// ─── Mini Events (24-48hr overlays) ──────────────────────────────────────────

export interface MiniEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  durationHours: number;
  bonusType: 'double_coins' | 'double_stars' | 'bonus_hints' | 'rare_tile_boost' | 'xp_surge';
  multiplier: number;
  rewards: { threshold: number; reward: { coins?: number; gems?: number; hints?: number } }[];
}

const MINI_EVENT_TEMPLATES: MiniEvent[] = [
  {
    id: 'coin_rush',
    name: 'Coin Rush',
    description: 'All puzzle rewards doubled for the next 24 hours!',
    icon: '\u{1FA99}',
    durationHours: 24,
    bonusType: 'double_coins',
    multiplier: 2,
    rewards: [
      { threshold: 500, reward: { coins: 200 } },
      { threshold: 1500, reward: { coins: 500, gems: 5 } },
      { threshold: 3000, reward: { coins: 1000, gems: 15 } },
    ],
  },
  {
    id: 'star_shower',
    name: 'Star Shower',
    description: 'Earn double stars on every puzzle!',
    icon: '\u{2B50}',
    durationHours: 24,
    bonusType: 'double_stars',
    multiplier: 2,
    rewards: [
      { threshold: 10, reward: { coins: 300 } },
      { threshold: 25, reward: { coins: 600, gems: 5 } },
      { threshold: 50, reward: { coins: 1200, gems: 15 } },
    ],
  },
  {
    id: 'hint_frenzy',
    name: 'Hint Frenzy',
    description: 'Free bonus hints every puzzle for the next 24 hours!',
    icon: '\u{1F4A1}',
    durationHours: 24,
    bonusType: 'bonus_hints',
    multiplier: 1,
    rewards: [
      { threshold: 5, reward: { hints: 5 } },
      { threshold: 15, reward: { hints: 10, coins: 300 } },
      { threshold: 30, reward: { hints: 15, gems: 10 } },
    ],
  },
  {
    id: 'rare_hunt',
    name: 'Rare Tile Hunt',
    description: 'Rare tile drop rates boosted for 48 hours!',
    icon: '\u{1F48E}',
    durationHours: 48,
    bonusType: 'rare_tile_boost',
    multiplier: 3,
    rewards: [
      { threshold: 2, reward: { coins: 400 } },
      { threshold: 5, reward: { coins: 800, gems: 10 } },
      { threshold: 10, reward: { gems: 25 } },
    ],
  },
  {
    id: 'xp_surge',
    name: 'XP Surge',
    description: 'Double mastery XP for 24 hours!',
    icon: '\u{1F680}',
    durationHours: 24,
    bonusType: 'xp_surge',
    multiplier: 2,
    rewards: [
      { threshold: 500, reward: { coins: 300 } },
      { threshold: 1500, reward: { coins: 600, gems: 5 } },
      { threshold: 3000, reward: { coins: 1200, gems: 15 } },
    ],
  },
];

// ─── Win Streak Event (Royal Match-style) ─────────────────────────────────────

export interface WinStreakState {
  currentStreak: number;
  bestStreak: number;
  lastWinDate: string | null;
  rewardsClaimed: number[];
}

export const DEFAULT_WIN_STREAK_STATE: WinStreakState = {
  currentStreak: 0,
  bestStreak: 0,
  lastWinDate: null,
  rewardsClaimed: [],
};

export interface WinStreakTier {
  streak: number;
  reward: { coins?: number; gems?: number; hints?: number; rareTile?: boolean };
  label: string;
}

export const WIN_STREAK_TIERS: WinStreakTier[] = [
  { streak: 2, reward: { coins: 50 }, label: '2 in a row!' },
  { streak: 3, reward: { coins: 100, hints: 1 }, label: 'Hat trick!' },
  { streak: 5, reward: { coins: 200, gems: 3 }, label: 'On fire!' },
  { streak: 7, reward: { coins: 400, gems: 5 }, label: 'Unstoppable!' },
  { streak: 10, reward: { coins: 600, gems: 10, hints: 3 }, label: 'LEGENDARY!' },
  { streak: 15, reward: { gems: 20, rareTile: true }, label: 'GODLIKE!' },
  { streak: 20, reward: { coins: 1000, gems: 30, rareTile: true }, label: 'IMPOSSIBLE!' },
];

/**
 * Update win streak after a puzzle completion.
 * Returns the new state + any newly earned tier rewards.
 */
export function updateWinStreak(
  state: WinStreakState,
  won: boolean,
  today: string,
): { newState: WinStreakState; earnedTiers: WinStreakTier[] } {
  if (!won) {
    return {
      newState: { ...state, currentStreak: 0 },
      earnedTiers: [],
    };
  }

  const newStreak = state.currentStreak + 1;
  const newBest = Math.max(newStreak, state.bestStreak);

  const earnedTiers = WIN_STREAK_TIERS.filter(
    (tier) => newStreak >= tier.streak && !state.rewardsClaimed.includes(tier.streak),
  );

  const newClaimed = [
    ...state.rewardsClaimed,
    ...earnedTiers.map((t) => t.streak),
  ];

  return {
    newState: {
      currentStreak: newStreak,
      bestStreak: newBest,
      lastWinDate: today,
      rewardsClaimed: newClaimed,
    },
    earnedTiers,
  };
}

/**
 * Reset win streak rewards at the start of a new week (keeps streak count).
 */
export function resetWinStreakRewards(state: WinStreakState): WinStreakState {
  return { ...state, rewardsClaimed: [] };
}

// ─── Partner Event (scaffolded for Firestore) ─────────────────────────────────

export interface PartnerEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  partnerIds: [string, string]; // Two player IDs
  sharedGoal: number;
  currentProgress: number;
  expiresAt: string; // ISO date
  rewards: { coins: number; gems: number; exclusiveCosmetic?: string };
}

// ─── Active Event Layer Aggregator ────────────────────────────────────────────

export interface ActiveEventLayers {
  mainEvent: GameEvent | null;
  miniEvent: MiniEvent | null;
  miniEventEndTime: number | null;
  miniEventProgress: number;
  isWeekendBlitz: boolean;
  winStreak: WinStreakState;
  partnerEvent: PartnerEvent | null; // null until Firestore is live
}

/**
 * Deterministically select a mini event for today (seeded by date).
 * Mini events trigger every 2-3 days.
 */
export function getMiniEventForDate(dateStr: string): MiniEvent | null {
  const date = new Date(dateStr);
  const daysSinceEpoch = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));

  // Mini events run every 2-3 days
  if (daysSinceEpoch % 3 !== 0) return null;

  const index = daysSinceEpoch % MINI_EVENT_TEMPLATES.length;
  return MINI_EVENT_TEMPLATES[index];
}

/**
 * Check if today is a weekend (Saturday or Sunday) for Weekend Blitz.
 */
export function isWeekendBlitz(dateStr?: string): boolean {
  const date = dateStr ? new Date(dateStr) : new Date();
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Get all currently active event layers.
 */
export function getActiveEventLayers(
  today: string,
  winStreakState: WinStreakState,
): ActiveEventLayers {
  const mainEvent = getCurrentEvent();
  const miniEvent = getMiniEventForDate(today);

  let miniEventEndTime: number | null = null;
  if (miniEvent) {
    const todayDate = new Date(today);
    miniEventEndTime = todayDate.getTime() + miniEvent.durationHours * 60 * 60 * 1000;
  }

  return {
    mainEvent,
    miniEvent,
    miniEventEndTime,
    miniEventProgress: 0,
    isWeekendBlitz: isWeekendBlitz(today),
    winStreak: winStreakState,
    partnerEvent: null,
  };
}
