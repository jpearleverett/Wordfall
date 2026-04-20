/**
 * Daily Quests — rotating 3-task layer on top of the existing meta systems.
 *
 * Each day at local midnight, 3 quests are seeded from the template pool.
 * Rotation is deterministic per UID + date so the same player on the same day
 * always sees the same 3 quests (even offline / across devices).
 *
 * Event matchers: the progress tracker calls `matchQuestEvent(quest, event)`
 * from `useRewardWiring` hooks (puzzle_complete, word_found, booster_used,
 * etc.). Each template defines an O(1) matcher so every progress event stays
 * cheap no matter how many quests are active.
 */

export type DailyQuestEventType =
  | 'puzzle_complete'       // fires on any successful puzzle completion
  | 'word_found'            // fires every time the player solves a word
  | 'flawless_complete'     // puzzle completed without hints/undo/shuffle
  | 'booster_used'          // any booster activation
  | 'hint_skipped_puzzle'   // puzzle completed without using any hints
  | 'mode_played'           // puzzle started in a specific mode
  | 'daily_challenge_done'  // daily puzzle completed
  | 'fast_solve'            // puzzle completed in < target seconds
  | 'flawless_streak_hit';  // flawless streak reached a target

export interface DailyQuestEvent {
  type: DailyQuestEventType;
  /** Optional length (for word_found → wordLength); seconds (fast_solve); count (flawless_streak_hit); etc. */
  value?: number;
  /** Mode name, for mode_played events. */
  mode?: string;
}

export interface DailyQuestReward {
  coins?: number;
  gems?: number;
  hintTokens?: number;
  boosterTokens?: number; // any booster, grants to wildcardTile for simplicity
  xp?: number;
}

export interface DailyQuestTemplate {
  id: string;
  /** Short label shown on the quest card */
  title: string;
  /** Optional longer description if the title isn't self-explanatory */
  description: string;
  /** Target count to complete the quest */
  target: number;
  reward: DailyQuestReward;
  /** Matcher called for every quest-progress event; returns the increment to
   * add to the quest's progress (0 = no change). */
  matcher: (event: DailyQuestEvent) => number;
}

export interface DailyQuest {
  templateId: string;
  progress: number;
  claimed: boolean;
}

export interface DailyQuestsState {
  /** ISO date (YYYY-MM-DD) the quests were seeded for (player's local date). */
  date: string;
  quests: DailyQuest[];
}

export const DEFAULT_DAILY_QUESTS_STATE: DailyQuestsState = {
  date: '',
  quests: [],
};

// ─── Template pool ─────────────────────────────────────────────────────────
// 15 templates ensures 3/day rotation with low repetition for returning players.

export const DAILY_QUEST_TEMPLATES: DailyQuestTemplate[] = [
  {
    id: 'solve_3',
    title: 'Solve 3 puzzles',
    description: 'Win any 3 puzzles today.',
    target: 3,
    reward: { coins: 100 },
    matcher: (e) => (e.type === 'puzzle_complete' ? 1 : 0),
  },
  {
    id: 'long_words_5',
    title: 'Find 5 long words',
    description: 'Solve 5 words with 6 or more letters.',
    target: 5,
    reward: { coins: 50, xp: 5 },
    matcher: (e) => (e.type === 'word_found' && (e.value ?? 0) >= 6 ? 1 : 0),
  },
  {
    id: 'no_hints_1',
    title: 'Solve without hints',
    description: 'Complete any puzzle without using a hint.',
    target: 1,
    reward: { hintTokens: 2 },
    matcher: (e) => (e.type === 'hint_skipped_puzzle' ? 1 : 0),
  },
  {
    id: 'use_booster',
    title: 'Use a booster',
    description: 'Activate any booster during a puzzle.',
    target: 1,
    reward: { coins: 50 },
    matcher: (e) => (e.type === 'booster_used' ? 1 : 0),
  },
  {
    id: 'time_pressure',
    title: 'Play Time Pressure',
    description: 'Complete a puzzle in Time Pressure mode.',
    target: 1,
    reward: { gems: 10 },
    matcher: (e) => (e.type === 'mode_played' && e.mode === 'timePressure' ? 1 : 0),
  },
  {
    id: 'flawless_streak_3',
    title: '3 flawless in a row',
    description: 'Reach a flawless streak of 3 today.',
    target: 1,
    reward: { coins: 100, boosterTokens: 1 },
    matcher: (e) => (e.type === 'flawless_streak_hit' && (e.value ?? 0) >= 3 ? 1 : 0),
  },
  {
    id: 'daily_challenge',
    title: 'Solve the Daily Challenge',
    description: "Complete today's Daily Challenge puzzle.",
    target: 1,
    reward: { gems: 5 },
    matcher: (e) => (e.type === 'daily_challenge_done' ? 1 : 0),
  },
  {
    id: 'big_word',
    title: 'Find a 7+ letter word',
    description: 'Solve any word that is 7 letters or longer.',
    target: 1,
    reward: { coins: 50 },
    matcher: (e) => (e.type === 'word_found' && (e.value ?? 0) >= 7 ? 1 : 0),
  },
  {
    id: 'fast_solve_90',
    title: 'Fast finish',
    description: 'Complete any puzzle in under 90 seconds.',
    target: 1,
    reward: { gems: 10 },
    matcher: (e) => (e.type === 'fast_solve' && (e.value ?? Infinity) <= 90 ? 1 : 0),
  },
  {
    id: 'flawless_1',
    title: 'Flawless solve',
    description: 'Win a puzzle without hints, undos, or shuffle.',
    target: 1,
    reward: { gems: 5, coins: 50 },
    matcher: (e) => (e.type === 'flawless_complete' ? 1 : 0),
  },
  {
    id: 'find_15_words',
    title: 'Find 15 words',
    description: 'Solve 15 words across any puzzles today.',
    target: 15,
    reward: { coins: 80 },
    matcher: (e) => (e.type === 'word_found' ? 1 : 0),
  },
  {
    id: 'solve_5',
    title: 'Solve 5 puzzles',
    description: 'A good run — win 5 puzzles today.',
    target: 5,
    reward: { coins: 150, xp: 10 },
    matcher: (e) => (e.type === 'puzzle_complete' ? 1 : 0),
  },
  {
    id: 'play_expert',
    title: 'Play Expert mode',
    description: 'Complete an Expert-mode puzzle.',
    target: 1,
    reward: { gems: 10 },
    matcher: (e) => (e.type === 'mode_played' && e.mode === 'expert' ? 1 : 0),
  },
  {
    id: 'use_2_boosters',
    title: 'Use 2 boosters',
    description: 'Activate any 2 boosters today.',
    target: 2,
    reward: { coins: 75 },
    matcher: (e) => (e.type === 'booster_used' ? 1 : 0),
  },
  {
    id: 'mega_word',
    title: 'Find an 8+ letter word',
    description: 'Solve any word that is 8 letters or longer.',
    target: 1,
    reward: { gems: 5, coins: 40 },
    matcher: (e) => (e.type === 'word_found' && (e.value ?? 0) >= 8 ? 1 : 0),
  },
];

// ─── Deterministic daily rotation ──────────────────────────────────────────

/**
 * FNV-1a 32-bit hash — deterministic, small, and good enough for quest
 * rotation. Seeded with the player's UID + ISO date so the same player on
 * the same day always gets the same 3 quests.
 */
function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG — deterministic, fast, acceptable distribution for a
 * 3-of-15 pick. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick `count` distinct templates deterministically for (uid, date).
 * Falls back to the first `count` templates if the pool is smaller than
 * requested (shouldn't happen in practice).
 */
export function pickDailyQuests(
  uid: string,
  date: string,
  count: number = 3,
): DailyQuest[] {
  const pool = DAILY_QUEST_TEMPLATES.slice();
  const rand = mulberry32(fnv1a(`${uid}::${date}`));
  const picked: DailyQuest[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rand() * pool.length);
    const template = pool.splice(idx, 1)[0];
    picked.push({ templateId: template.id, progress: 0, claimed: false });
  }
  return picked;
}

export function getQuestTemplate(id: string): DailyQuestTemplate | undefined {
  return DAILY_QUEST_TEMPLATES.find((t) => t.id === id);
}

/** Return today's ISO date (YYYY-MM-DD) in local time. */
export function getTodayLocal(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
