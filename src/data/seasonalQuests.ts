// ============ SEASONAL QUEST LINE SYSTEM ============
// Multi-week sequential quest narratives for D30+ retention.
// Piggybacks on existing weekly goal tracking keys.

export interface QuestStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  trackingKey: 'puzzles_solved' | 'total_score' | 'stars_earned' | 'perfect_solves' | 'daily_completed' | 'modes_played' | 'words_found';
  target: number;
  rewardCoins: number;
  rewardGems: number;
  rewardExtra?: { type: string; id?: string; amount?: number };
}

export interface SeasonalQuest {
  id: string;
  name: string;
  description: string;
  icon: string;
  steps: QuestStep[];
  finalReward: { coins: number; gems: number; cosmetic?: { type: string; id: string } };
  seasonId: string; // e.g., 'spring_2026'
}

export interface SeasonalQuestState {
  activeQuestId: string | null;
  currentStepIndex: number;
  stepProgress: number; // progress toward current step's target
  completedQuestIds: string[];
  seasonId: string;
}

export const DEFAULT_SEASONAL_QUEST_STATE: SeasonalQuestState = {
  activeQuestId: null,
  currentStepIndex: 0,
  stepProgress: 0,
  completedQuestIds: [],
  seasonId: '',
};

// ── Quest Definitions ───────────────────────────────────────────────────

const SPRING_QUEST: SeasonalQuest = {
  id: 'spring_lexicon_awakening',
  name: 'The Lexicon Awakening',
  description: 'Spring has arrived! Awaken your word mastery through a journey of blooming challenges.',
  icon: '🌸',
  seasonId: 'spring',
  steps: [
    {
      id: 'spring_step_1',
      title: 'First Bloom',
      description: 'Warm up your mind with some springtime puzzles.',
      icon: '🌱',
      trackingKey: 'puzzles_solved',
      target: 10,
      rewardCoins: 200,
      rewardGems: 5,
    },
    {
      id: 'spring_step_2',
      title: 'Growing Roots',
      description: 'Reach for the stars as your skills take root.',
      icon: '🌿',
      trackingKey: 'stars_earned',
      target: 15,
      rewardCoins: 300,
      rewardGems: 10,
    },
    {
      id: 'spring_step_3',
      title: 'Spring Showers',
      description: 'Stay consistent through the April showers.',
      icon: '🌧',
      trackingKey: 'daily_completed',
      target: 3,
      rewardCoins: 400,
      rewardGems: 10,
    },
    {
      id: 'spring_step_4',
      title: 'Full Blossom',
      description: 'Demonstrate mastery with flawless solves.',
      icon: '🌺',
      trackingKey: 'perfect_solves',
      target: 5,
      rewardCoins: 500,
      rewardGems: 15,
    },
    {
      id: 'spring_step_5',
      title: 'Garden Master',
      description: 'Prove yourself as the champion of the spring garden.',
      icon: '🏵',
      trackingKey: 'total_score',
      target: 25000,
      rewardCoins: 750,
      rewardGems: 25,
    },
  ],
  finalReward: {
    coins: 2000,
    gems: 50,
    cosmetic: { type: 'frame', id: 'spring_bloom_frame' },
  },
};

const SUMMER_QUEST: SeasonalQuest = {
  id: 'summer_solar_expedition',
  name: 'Solar Expedition',
  description: 'Embark on a sun-soaked expedition across the wordscape under blazing summer skies.',
  icon: '☀',
  seasonId: 'summer',
  steps: [
    {
      id: 'summer_step_1',
      title: 'Sunrise Start',
      description: 'Begin your expedition with an early morning warm-up.',
      icon: '🌅',
      trackingKey: 'puzzles_solved',
      target: 12,
      rewardCoins: 200,
      rewardGems: 5,
    },
    {
      id: 'summer_step_2',
      title: 'Blazing Trail',
      description: 'Discover words across different game modes.',
      icon: '🔥',
      trackingKey: 'modes_played',
      target: 4,
      rewardCoins: 350,
      rewardGems: 10,
    },
    {
      id: 'summer_step_3',
      title: 'Oasis Found',
      description: 'Uncover a wealth of hidden words in the desert of letters.',
      icon: '🏝',
      trackingKey: 'words_found',
      target: 60,
      rewardCoins: 400,
      rewardGems: 10,
    },
    {
      id: 'summer_step_4',
      title: 'Heat Wave',
      description: 'Push through the heat with daily dedication.',
      icon: '🌡',
      trackingKey: 'daily_completed',
      target: 5,
      rewardCoins: 500,
      rewardGems: 15,
    },
    {
      id: 'summer_step_5',
      title: 'Solar Champion',
      description: 'Reach the summit of the sun with a massive score.',
      icon: '🏆',
      trackingKey: 'total_score',
      target: 30000,
      rewardCoins: 750,
      rewardGems: 25,
    },
  ],
  finalReward: {
    coins: 2000,
    gems: 50,
    cosmetic: { type: 'frame', id: 'solar_expedition_frame' },
  },
};

const AUTUMN_QUEST: SeasonalQuest = {
  id: 'autumn_harvest_chronicle',
  name: 'Harvest Chronicle',
  description: 'Gather the fruits of your labor as the leaves turn golden in this autumn chronicle.',
  icon: '🍂',
  seasonId: 'autumn',
  steps: [
    {
      id: 'autumn_step_1',
      title: 'First Harvest',
      description: 'Begin gathering words from the autumn fields.',
      icon: '🌾',
      trackingKey: 'words_found',
      target: 50,
      rewardCoins: 200,
      rewardGems: 5,
    },
    {
      id: 'autumn_step_2',
      title: 'Golden Leaves',
      description: 'Collect stars like golden leaves falling from the trees.',
      icon: '🍁',
      trackingKey: 'stars_earned',
      target: 20,
      rewardCoins: 350,
      rewardGems: 10,
    },
    {
      id: 'autumn_step_3',
      title: 'Harvest Moon',
      description: 'Solve puzzles under the harvest moon with precision.',
      icon: '🌕',
      trackingKey: 'perfect_solves',
      target: 4,
      rewardCoins: 400,
      rewardGems: 10,
    },
    {
      id: 'autumn_step_4',
      title: 'Cornucopia',
      description: 'Fill your cornucopia with a bountiful score.',
      icon: '🎃',
      trackingKey: 'total_score',
      target: 20000,
      rewardCoins: 500,
      rewardGems: 15,
    },
    {
      id: 'autumn_step_5',
      title: 'Chronicle Keeper',
      description: 'Complete the chronicle with dedication across many puzzles.',
      icon: '📜',
      trackingKey: 'puzzles_solved',
      target: 20,
      rewardCoins: 750,
      rewardGems: 25,
    },
  ],
  finalReward: {
    coins: 2000,
    gems: 50,
    cosmetic: { type: 'frame', id: 'harvest_chronicle_frame' },
  },
};

const WINTER_QUEST: SeasonalQuest = {
  id: 'winter_frost_legacy',
  name: 'Frost Legacy',
  description: 'Brave the frozen wordscape and forge a legacy that will endure through the coldest season.',
  icon: '❄',
  seasonId: 'winter',
  steps: [
    {
      id: 'winter_step_1',
      title: 'First Frost',
      description: 'Step into the cold and complete your first puzzles of the season.',
      icon: '🧊',
      trackingKey: 'puzzles_solved',
      target: 10,
      rewardCoins: 200,
      rewardGems: 5,
    },
    {
      id: 'winter_step_2',
      title: 'Snowfall',
      description: 'Let the words fall like snowflakes around you.',
      icon: '🌨',
      trackingKey: 'words_found',
      target: 70,
      rewardCoins: 350,
      rewardGems: 10,
    },
    {
      id: 'winter_step_3',
      title: 'Frozen Mastery',
      description: 'Show that cold cannot stop your perfect technique.',
      icon: '💎',
      trackingKey: 'perfect_solves',
      target: 6,
      rewardCoins: 400,
      rewardGems: 10,
    },
    {
      id: 'winter_step_4',
      title: 'Blizzard Challenge',
      description: 'Battle through the blizzard with daily perseverance.',
      icon: '⛈',
      trackingKey: 'daily_completed',
      target: 5,
      rewardCoins: 500,
      rewardGems: 15,
    },
    {
      id: 'winter_step_5',
      title: 'Legacy Forged',
      description: 'Forge an unbreakable legacy with a legendary total score.',
      icon: '👑',
      trackingKey: 'total_score',
      target: 35000,
      rewardCoins: 750,
      rewardGems: 25,
    },
  ],
  finalReward: {
    coins: 2000,
    gems: 50,
    cosmetic: { type: 'frame', id: 'frost_legacy_frame' },
  },
};

export const SEASONAL_QUESTS: SeasonalQuest[] = [
  SPRING_QUEST,
  SUMMER_QUEST,
  AUTUMN_QUEST,
  WINTER_QUEST,
];

// ── Helper Functions ────────────────────────────────────────────────────

/** Returns the season string for a given date */
function getSeasonForDate(date: Date): string {
  const month = date.getMonth(); // 0-indexed
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

/** Returns the seasonal quest for the current date */
export function getCurrentSeasonalQuest(date: Date = new Date()): SeasonalQuest {
  const season = getSeasonForDate(date);
  return SEASONAL_QUESTS.find((q) => q.seasonId === season) || SPRING_QUEST;
}

/** Returns progress info for the current quest step */
export function getQuestProgress(
  state: SeasonalQuestState,
  quest: SeasonalQuest,
): { currentStep: QuestStep; progress: number; isComplete: boolean } {
  const stepIndex = Math.min(state.currentStepIndex, quest.steps.length - 1);
  const currentStep = quest.steps[stepIndex];
  const isComplete = state.completedQuestIds.includes(quest.id);

  return {
    currentStep,
    progress: state.stepProgress,
    isComplete,
  };
}

/** Advances to the next step (or marks quest complete if on last step) */
export function advanceQuestStep(state: SeasonalQuestState, quest: SeasonalQuest): SeasonalQuestState {
  const nextIndex = state.currentStepIndex + 1;

  if (nextIndex >= quest.steps.length) {
    // Quest fully complete
    return {
      ...state,
      activeQuestId: null,
      currentStepIndex: 0,
      stepProgress: 0,
      completedQuestIds: [...state.completedQuestIds, quest.id],
    };
  }

  return {
    ...state,
    currentStepIndex: nextIndex,
    stepProgress: 0,
  };
}

/** Checks whether a quest's season is currently active */
export function isQuestSeasonActive(questSeasonId: string, date: Date = new Date()): boolean {
  return getSeasonForDate(date) === questSeasonId;
}
