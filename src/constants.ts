import { Dimensions, Platform } from 'react-native';
import { BoardConfig, Difficulty, GameMode, ModeConfig } from './types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Layout
export const GRID_PADDING = 12;
export const CELL_GAP = 4;
export const MAX_GRID_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;
export const CELL_SIZE = (col: number) =>
  Math.floor((MAX_GRID_WIDTH - CELL_GAP * (col - 1)) / col);

// Colors — SYNTHWAVE / MIAMI VICE palette
export const COLORS = {
  bg: '#0a0015',
  bgLight: '#150028',
  surface: '#1a0a2e',
  surfaceLight: '#2d1452',

  cellDefault: '#2a1548',
  cellSelected: '#ff2d95',
  cellHint: '#ffb800',
  cellFound: '#1a3a2a',

  textPrimary: '#f0e6ff',
  textSecondary: '#b08cda',
  // WCAG AA: raised from #6b4d8a (~2.5:1 on bg) to #a08cc7 (~4.5:1). (F2)
  textMuted: '#a08cc7',

  accent: '#ff2d95',
  accentLight: '#ff6eb8',
  accentDark: '#cc1a72',
  accentGlow: 'rgba(255, 45, 149, 0.55)',
  gold: '#ffb800',
  goldLight: '#ffd24d',
  goldGlow: 'rgba(255, 184, 0, 0.50)',
  green: '#00ff87',
  greenGlow: 'rgba(0, 255, 135, 0.50)',
  coral: '#ff4466',
  coralGlow: 'rgba(255, 68, 102, 0.45)',
  purple: '#c84dff',
  purpleLight: '#e0a0ff',
  purpleGlow: 'rgba(200, 77, 255, 0.50)',
  orange: '#ff6a00',
  orangeGlow: 'rgba(255, 106, 0, 0.45)',
  teal: '#00f5d4',
  tealGlow: 'rgba(0, 245, 212, 0.50)',
  pink: '#ff2d95',
  pinkGlow: 'rgba(255, 45, 149, 0.50)',
  cyan: '#00e5ff',
  cyanGlow: 'rgba(0, 229, 255, 0.50)',

  wordFound: '#00ff87',
  wordPending: '#b08cda',
  wordActive: '#ff2d95',

  star: '#ffb800',
  starEmpty: '#2a1548',

  buttonPrimary: '#ff2d95',
  // WCAG AA: raised from #2d1452 (~2:1 vs bg) to #4a2380 (~3.4:1, acceptable
  // for large control fills; labels still rely on textPrimary). (F2)
  buttonSecondary: '#4a2380',
  buttonDanger: '#ff4466',
  buttonGold: '#ffb800',

  rarityCommon: '#b08cda',
  rarityRare: '#00e5ff',
  rarityEpic: '#c84dff',
  rarityLegendary: '#ffb800',

  tierBronze: '#d4893a',
  tierSilver: '#d0d8e8',
  tierGold: '#ffb800',
  tierDiamond: '#00e5ff',

  tabActive: '#ff2d95',
  // WCAG AA: raised from #6b4d8a to #a08cc7 to match textMuted. (F2)
  tabInactive: '#a08cc7',

  surface2: '#2d1452',
  surfaceGlass: 'rgba(26, 10, 46, 0.88)',
  // WCAG AA: raised from 0.06 alpha to 0.12 for visible boundaries. (F2)
  borderSubtle: 'rgba(255,255,255,0.12)',
  borderMedium: 'rgba(255,255,255,0.12)',
  borderAccent: 'rgba(255,45,149,0.30)',
  textTertiary: '#4a2d6b',

  // Synthwave extended palette
  chrome: '#d4e0f7',
  chromeDark: '#8a9ab5',
  chromeHighlight: '#eef2ff',
  sunset: '#ff6b35',
  sunsetDeep: '#cc4400',
  sunsetWarm: '#ff9f43',
  neonTube: '#ff2d95',
  scanLine: 'rgba(255,255,255,0.03)',
  vhsStatic: 'rgba(255,255,255,0.02)',
  mountainSilhouette: '#1a0533',
  horizonGlow: 'rgba(255,45,149,0.35)',

  // Interaction states — use these instead of ad-hoc opacity on disabled
  // controls so the dimmed look is consistent app-wide.
  buttonDisabled: 'rgba(255,255,255,0.20)',
  textDisabled: 'rgba(240,230,255,0.40)',
  borderDisabled: 'rgba(255,255,255,0.08)',
};

// Gradient presets — synthwave / Miami
export const GRADIENTS = {
  tile: {
    default: ['rgba(42,21,72,0.80)', 'rgba(26,10,46,0.85)', 'rgba(35,15,60,0.82)'] as const,
    selected: ['#ff2d95', '#e91e8c', '#c84dff'] as const,
    valid: ['#00ff87', '#00e676', '#00cc6a'] as const,
    hint: ['#ffd24d', '#ffb800', '#ff9500'] as const,
    frozen: ['rgba(0,229,255,0.30)', 'rgba(0,180,216,0.25)', 'rgba(0,140,180,0.30)'] as const,
    wildcard: ['#ffd700', '#ff9500', '#ff2d95'] as const,
  },
  button: {
    primary: ['#ff2d95', '#e91e8c', '#c84dff'] as const,
    gold: ['#ffd24d', '#ffb800', '#ff9500'] as const,
    danger: ['#ff4466', '#ff2d55', '#ee1a3a'] as const,
    green: ['#00ff87', '#00e676', '#00cc6a'] as const,
  },
  surface: ['#1a0a2e', '#120620'] as const,
  surfaceCard: ['rgba(45,20,82,0.88)', 'rgba(26,10,46,0.92)'] as const,
  header: ['rgba(45,20,82,0.80)', 'rgba(20,8,38,0.85)'] as const,
  bg: ['#08000f', '#0a0015', '#12002a'] as const,
  grid: ['rgba(42,21,72,0.50)', 'rgba(26,10,46,0.45)', 'rgba(35,15,60,0.48)'] as const,
  gridBorder: ['rgba(255,45,149,0.25)', 'rgba(200,77,255,0.20)', 'rgba(0,229,255,0.15)'] as const,
  victoryCard: ['#2d1452', '#1a0a2e', '#120620'] as const,
  scorePanel: ['#150028', '#1a0a2e'] as const,
  tabBar: ['#1a0a2e', '#0a0015'] as const,

  synthwave: {
    sky: ['#08000f', '#1a0533', '#3d1055', '#2a0845', '#150030'] as const,
    sun: ['#ff2d95', '#ff6eb8', '#c84dff', '#00e5ff', '#00b4d8'] as const,
    sunInner: ['rgba(255,45,149,0.9)', 'rgba(255,110,184,0.6)', 'rgba(200,77,255,0.4)', 'rgba(0,229,255,0.2)'] as const,
    ground: ['#1a0533', '#0d0020', '#060010'] as const,
    gridLine: ['rgba(255,45,149,0.5)', 'rgba(200,77,255,0.3)', 'rgba(0,229,255,0.15)'] as const,
    // New synthwave materials
    sunBands: ['#ff1493', '#ff2d95', '#ff6b35', '#ffb800', '#ff6b35', '#ff2d95'] as const,
    chrome: ['#d4e0f7', '#8a9ab5', '#d4e0f7'] as const,
    neonTube: ['rgba(255,45,149,0.0)', 'rgba(255,45,149,0.8)', 'rgba(255,45,149,0.0)'] as const,
    crtScreen: ['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.1)'] as const,
    holographic: ['#ff2d95', '#c84dff', '#00e5ff', '#00ff87', '#ffb800'] as const,
    mountainFar: ['#2a0845', '#1a0533'] as const,
    mountainNear: ['#1a0533', '#0d0020'] as const,
    aurora: ['rgba(0,229,255,0.12)', 'rgba(200,77,255,0.08)', 'rgba(0,245,212,0.06)'] as const,
  },

  tileSurface: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)'] as const,
  glassOverlay: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.0)'] as const,
  boardGlow: ['rgba(255,45,149,0.08)', 'rgba(200,77,255,0.05)', 'transparent'] as const,
  goldShine: ['rgba(255,210,77,0.3)', 'rgba(255,184,0,0.1)', 'transparent'] as const,
  celebrationOverlay: ['rgba(255,45,149,0.08)', 'transparent', 'rgba(200,77,255,0.06)'] as const,
};

// Shadow presets
export const SHADOWS = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 14,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  }),
  neonGlow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 14,
  }),
  neonEdge: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  }),
  chromeDepth: {
    shadowColor: '#8a9ab5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
};

// Difficulty configs
export const DIFFICULTY_CONFIGS: Record<Difficulty, BoardConfig> = {
  easy: {
    rows: 6,
    cols: 5,
    wordCount: 3,
    minWordLength: 3,
    maxWordLength: 4,
    difficulty: 'easy',
  },
  medium: {
    rows: 7,
    cols: 6,
    wordCount: 5,
    minWordLength: 3,
    maxWordLength: 5,
    difficulty: 'medium',
  },
  hard: {
    rows: 8,
    cols: 7,
    wordCount: 6,
    minWordLength: 3,
    maxWordLength: 6,
    difficulty: 'hard',
  },
  expert: {
    rows: 9,
    cols: 7,
    wordCount: 8,
    minWordLength: 4,
    maxWordLength: 6,
    difficulty: 'expert',
  },
};

// Level progression — smooth per-level ramp with breather + spike pacing.
// Inspired by Candy Crush / Royal Match: gradual increase broken up by
// periodic easy "breather" levels AND periodic hard "spike" levels so
// strong players don't see a perfectly flat ramp.
//
//   - Breather: every 5th level (sawtooth, drops 4 levels of difficulty).
//                Always wins if a breather and a spike would collide on
//                the same level — the player-friendly reading.
//   - Spike:    every 13th level from level 13 onwards. Adds one word
//                and extends max word length by 1. Coprime with 5 so
//                breather/spike collisions only happen at LCM = 65,
//                and even there the breather takes precedence.
//
// Both intervals are compile-time constants. The `spikeLevelsEnabled`
// Remote Config flag (consumed by isSpikeLevel) lets Ops dark-launch
// the spike system if live telemetry shows unexpected fail-rate
// spikes on spike levels.
const BREATHER_INTERVAL = 5;
const SPIKE_INTERVAL = 13;
const SPIKE_MIN_LEVEL = 13; // no spikes during early-game learning phase
/**
 * No breathers during the learning phase either — symmetric with
 * SPIKE_MIN_LEVEL and for the same reason.
 *
 * A breather plays the phase config from 4 levels earlier. Once the bands
 * are wide (level 20+) that lands in the same or an adjacent band, so it
 * reads as a gentle dip — exactly the intended relief valve. But the early
 * bands are only 2-3 levels wide, so level 5 replayed the LEVEL 1 board
 * verbatim and level 10 replayed level 6. A player four puzzles in is not
 * fatigued; handing them a visibly smaller board reads as losing progress
 * at precisely the moment they are deciding whether the game has depth.
 */
const BREATHER_MIN_LEVEL = 12;

export function isBreatherLevel(level: number): boolean {
  return level >= BREATHER_MIN_LEVEL && level % BREATHER_INTERVAL === 0;
}

/**
 * Whether the player's current level is a designed "challenge spike" —
 * intentionally harder than the surrounding ramp so strong players get
 * a break from monotony. Breather levels always win when the two
 * intervals would collide (e.g. level 65 = LCM). Honors the
 * `spikeLevelsEnabled` Remote Config flag as a kill switch.
 *
 * Exposed so UI can render a "⚡ CHALLENGE" badge next to the level
 * label (GameScreen consumes it).
 */
export function isSpikeLevel(level: number): boolean {
  if (level < SPIKE_MIN_LEVEL) return false;
  if (isBreatherLevel(level)) return false;
  if (level % SPIKE_INTERVAL !== 0) return false;
  // Lazy require to avoid a constants -> services cycle.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getRemoteBoolean } = require('./services/remoteConfig') as {
    getRemoteBoolean: (key: string) => boolean;
  };
  return getRemoteBoolean('spikeLevelsEnabled');
}

/** Apply spike-level transformation: one more word + one longer word. */
function applySpike(base: BoardConfig): BoardConfig {
  return {
    ...base,
    wordCount: base.wordCount + 1,
    maxWordLength: Math.min(6, base.maxWordLength + 1),
  };
}

/** Base phase-driven board config for the given level, ignoring spike/breather. */
function getPhaseConfig(effectiveLevel: number): BoardConfig {
  // Phase 1: Tutorial / Easy (levels 1-7) — every band changes something
  // visible. This used to be three IDENTICAL 5x4 two-word boards at L1-L3,
  // so a new player's first three puzzles looked the same; and with only
  // 2x3 letters clearing out of 20 cells, gravity barely moved anything —
  // under-selling the one mechanic that separates Wordfall from every other
  // word search, during the exact minutes that decide D1 retention.
  if (effectiveLevel <= 2) {
    // Learn the trace gesture on the smallest possible board.
    return { rows: 5, cols: 4, wordCount: 2, minWordLength: 3, maxWordLength: 3, difficulty: 'easy' };
  }
  if (effectiveLevel <= 4) {
    // Third word + a taller board: now ~9 of 25 cells clear, so the fall is
    // unmistakable. This is the "oh, the board CHANGES" moment.
    return { rows: 5, cols: 5, wordCount: 3, minWordLength: 3, maxWordLength: 4, difficulty: 'easy' };
  }
  // L5-L10 used to be the SAME 6x5 grid six levels running (the only
  // visible change was one extra word chip at L8) — the identical-boards
  // churn problem the L1-L3 comment above describes, reintroduced in the
  // exact window where a first session's "is this going anywhere?" read is
  // formed. Now the grid shape changes at least every two levels, and L7
  // introduces the first 5-letter word (an emotional highlight per the
  // mechanics doc — long words are satisfying to trace, not harder).
  if (effectiveLevel <= 6) {
    return { rows: 6, cols: 5, wordCount: 3, minWordLength: 3, maxWordLength: 4, difficulty: 'easy' };
  }
  if (effectiveLevel <= 7) {
    // First 5-letter word on a wider board.
    return { rows: 6, cols: 6, wordCount: 3, minWordLength: 3, maxWordLength: 5, difficulty: 'easy' };
  }
  if (effectiveLevel <= 9) {
    // Bigger canvas — a two-level preview of the phase-3 board size.
    return { rows: 7, cols: 6, wordCount: 4, minWordLength: 3, maxWordLength: 4, difficulty: 'medium' };
  }
  if (effectiveLevel <= 10) {
    // Back to the compact grid: L10 is a breather slot (every 5th level
    // must dip — difficultyCurve pins it), and the shape change itself
    // keeps the variety cadence.
    return { rows: 6, cols: 5, wordCount: 4, minWordLength: 3, maxWordLength: 4, difficulty: 'medium' };
  }
  // Phase 3: Building confidence (levels 11-15) — 4-5 words, longer words creep in
  if (effectiveLevel <= 12) {
    return { rows: 6, cols: 6, wordCount: 4, minWordLength: 3, maxWordLength: 5, difficulty: 'medium' };
  }
  if (effectiveLevel <= 15) {
    return { rows: 7, cols: 6, wordCount: 5, minWordLength: 3, maxWordLength: 5, difficulty: 'medium' };
  }
  // Phase 4: Mid-game (levels 16-22) — grid grows, word count climbs
  if (effectiveLevel <= 18) {
    return { rows: 7, cols: 6, wordCount: 5, minWordLength: 3, maxWordLength: 5, difficulty: 'hard' };
  }
  if (effectiveLevel <= 22) {
    return { rows: 7, cols: 7, wordCount: 5, minWordLength: 3, maxWordLength: 6, difficulty: 'hard' };
  }
  // Phase 5: Late mid-game (levels 23-30) — 6 words, bigger grids
  if (effectiveLevel <= 26) {
    return { rows: 8, cols: 7, wordCount: 6, minWordLength: 3, maxWordLength: 6, difficulty: 'hard' };
  }
  if (effectiveLevel <= 30) {
    return { rows: 8, cols: 7, wordCount: 6, minWordLength: 3, maxWordLength: 6, difficulty: 'hard' };
  }
  // Phase 6: Expert (levels 31-40) — harder word constraints, more words
  if (effectiveLevel <= 35) {
    return { rows: 8, cols: 7, wordCount: 7, minWordLength: 3, maxWordLength: 6, difficulty: 'expert' };
  }
  if (effectiveLevel <= 40) {
    return { rows: 9, cols: 7, wordCount: 7, minWordLength: 4, maxWordLength: 6, difficulty: 'expert' };
  }
  // Phase 7: Endgame (levels 41+). Previously a single constant config
  // (9×7, 8 words) for every level 41–600 — a 560-level flatline. Now a
  // texture cycle: board shape + word-length window rotate per 15-level
  // chapter so the long haul keeps changing feel, while the word-count
  // base still ramps slowly for overall progression. Invariants honored:
  // rows ≤ 10, cols ≤ 8, wordCount ≤ 10, maxWordLength ≤ 6, and adjacent
  // non-breather levels never drop word count by more than 1.
  const chapterIdx = Math.floor((effectiveLevel - 1) / 15);
  const wordBase = effectiveLevel >= 116 ? 8 : 7;
  switch (chapterIdx % 4) {
    case 0: // wide — standard mix (56 cells)
      return { rows: 8, cols: 7, wordCount: wordBase, minWordLength: 3, maxWordLength: 6, difficulty: 'expert' };
    case 1: // tall + narrow — many short words, long gravity columns (54 cells;
      // capped a word lower than wide so chapter profiles that clamp the
      // length window upward don't push fill ratio past what placement
      // can comfortably satisfy)
      return { rows: 9, cols: 6, wordCount: wordBase - 1, minWordLength: 3, maxWordLength: 5, difficulty: 'expert' };
    case 2: // compact — fewer but longer words, tight board (49 cells)
      return { rows: 7, cols: 7, wordCount: wordBase - 1, minWordLength: 4, maxWordLength: 6, difficulty: 'expert' };
    default: // large — the classic endgame board (63 cells). minWordLength 3
      // keeps placement fast at the 8-word base; chapter profiles + the
      // longWords bias still skew the list long where that's the theme.
      return { rows: 9, cols: 7, wordCount: wordBase, minWordLength: 3, maxWordLength: 6, difficulty: 'expert' };
  }
}

export function getLevelConfig(level: number): BoardConfig {
  const isBreather = isBreatherLevel(level);
  const effectiveLevel = isBreather ? Math.max(1, level - 4) : level;
  const base = getPhaseConfig(effectiveLevel);
  const applySpikeThisLevel = !isBreather && isSpikeLevel(level);
  return applySpikeThisLevel ? applySpike(base) : base;
}

// Legacy helper: get the broad difficulty tier for a level (used for rewards, UI labels)
export function getDifficultyTier(level: number): Difficulty {
  if (level <= 5) return 'easy';
  if (level <= 15) return 'medium';
  if (level <= 30) return 'hard';
  return 'expert';
}

// Mode configurations
export const MODE_CONFIGS: Record<GameMode, ModeConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Solve all listed words',
    icon: '📖',
    color: COLORS.accent,
    unlockLevel: 1,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 1,
      comboMode: false,
    },
  },
  shrinkingBoard: {
    id: 'shrinkingBoard',
    name: 'Shrinking Board',
    description: 'Board shrinks every 2 words',
    icon: '🔻',
    color: COLORS.coral,
    unlockLevel: 4,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 1.25,
      comboMode: false,
      skillGate: { perfectSolves: 2 },
    },
  },
  timePressure: {
    id: 'timePressure',
    name: 'Time Pressure',
    description: 'Beat the clock',
    icon: '⏱️',
    color: COLORS.orange,
    unlockLevel: 8,
    rules: {
      hasTimer: true,
      timerSeconds: 120,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 1.5,
      comboMode: false,
      skillGate: { perfectSolves: 3 },
    },
  },
  perfectSolve: {
    id: 'perfectSolve',
    name: 'Perfect Solve',
    description: 'Zero mistakes, no assists',
    icon: '💎',
    color: COLORS.gold,
    unlockLevel: 14,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: false,
      allowUndo: false,
      unlimitedUndo: false,
      scoreMultiplier: 2,
      comboMode: false,
      skillGate: { perfectSolves: 6, minStars: 20 },
    },
  },
  gravityFlip: {
    id: 'gravityFlip',
    name: 'Gravity Flip',
    description: 'Gravity rotates 90° after each word',
    icon: '🔄',
    color: COLORS.coral,
    unlockLevel: 10,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 1.5,
      comboMode: false,
      skillGate: { minStars: 25 },
    },
  },
  daily: {
    id: 'daily',
    name: 'Daily Challenge',
    description: 'Same puzzle for everyone',
    icon: '☀️',
    color: COLORS.gold,
    unlockLevel: 1,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 1,
      comboMode: false,
    },
  },
  weekly: {
    id: 'weekly',
    name: 'Weekly Special',
    description: 'Curated hard puzzle',
    icon: '🏆',
    color: COLORS.purple,
    unlockLevel: 12,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 1.5,
      comboMode: false,
      skillGate: { puzzlesSolved: 12 },
    },
  },
  noGravity: {
    id: 'noGravity',
    name: 'No Gravity',
    description: 'Letters stay put — pure word finding',
    icon: '🚀',
    color: COLORS.teal,
    unlockLevel: 6,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: false,
      scoreMultiplier: 0.75,
      comboMode: false,
    },
  },
  expert: {
    id: 'expert',
    name: 'Expert',
    description: 'Minimal hints, harder boards',
    icon: '🧠',
    color: COLORS.purple,
    unlockLevel: 22,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: false,
      allowUndo: false,
      unlimitedUndo: false,
      scoreMultiplier: 2,
      comboMode: false,
      skillGate: { perfectSolves: 15, minStars: 60 },
    },
  },
  relax: {
    id: 'relax',
    name: 'Relax',
    description: 'No pressure, unlimited undos',
    icon: '🌿',
    color: COLORS.green,
    unlockLevel: 2,
    rules: {
      hasTimer: false,
      hasMoveLimit: false,
      allowHints: true,
      allowUndo: true,
      unlimitedUndo: true,
      scoreMultiplier: 0.5,
      comboMode: false,
    },
  },
};

// Early game bonus rewards (awarded on top of normal puzzle rewards)
export const EARLY_GAME_BONUSES: {
  level: number;
  coins?: number;
  gems?: number;
  hints?: number;
  wheelSpins?: number;
  guaranteedRareTile?: boolean;
}[] = [
  { level: 1, coins: 100, gems: 5, wheelSpins: 1 },       // First-win jackpot feeling
  { level: 2, coins: 50 },                                   // Small coin top-up
  { level: 3, hints: 2 },                                   // Replenish consumables
  { level: 4, gems: 3, coins: 75 },                         // Collections unlock reward
  { level: 5, guaranteedRareTile: true },                    // First rare tile ceremony
  { level: 6, hints: 2, coins: 100 },                       // Boosters unlock bonus
  { level: 7, gems: 5 },                                    // Gem injection at weekly goals
  { level: 8, coins: 100, gems: 2 },                        // No Gravity unlock treat
  { level: 9, gems: 3, hints: 1 },                          // Library unlock bonus
  { level: 10, coins: 200 },                                // End of early game milestone
  { level: 12, gems: 5, coins: 100 },                       // Time Pressure unlock
  { level: 15, coins: 150, gems: 5 },                       // Mid-game milestone

  // ── Sustained milestone cadence (levels 20+) ──────────────────────────
  //
  // Everything above fires in the first 15 levels, and the other scheduled
  // payoffs run out just as fast: feature unlocks stop at level 10, mode
  // unlocks at level 22. Past that the only scheduled reward in the entire
  // game was a chapter completion every 15 levels — so a player who got
  // through the onboarding arc hit a content cliff at exactly the point
  // where the D1-to-D7 habit is still forming, and stretches like 23-29 and
  // 31-44 handed out nothing at all.
  //
  // Every 5 levels to 60, then every 10 to 150. Values stay in line with the
  // existing milestones (~150-300 coins, 3-8 gems) rather than escalating —
  // this is a steady drumbeat of "the game noticed", not an economy faucet.
  // A hint refill is 50 coins and a booster 200, so each gift is worth a
  // couple of concrete things the player can immediately spend.
  { level: 20, coins: 200, gems: 5 },
  { level: 25, coins: 200, hints: 2 },
  { level: 30, coins: 250, gems: 8 },                       // Chapter 2 complete
  { level: 35, coins: 200, gems: 5 },
  { level: 40, coins: 250, hints: 2, wheelSpins: 1 },
  { level: 45, coins: 250, gems: 8 },                       // Chapter 3 complete
  { level: 50, coins: 300, gems: 10, wheelSpins: 1 },       // Half-century marker
  { level: 55, coins: 250, hints: 2 },
  { level: 60, coins: 300, gems: 8 },                       // Chapter 4 complete
  { level: 70, coins: 300, gems: 8 },
  { level: 80, coins: 300, hints: 3, wheelSpins: 1 },
  { level: 90, coins: 350, gems: 10 },
  { level: 100, coins: 500, gems: 15, wheelSpins: 1 },      // Century marker
  { level: 110, coins: 350, gems: 8 },
  { level: 120, coins: 350, hints: 3 },
  { level: 130, coins: 400, gems: 10 },
  { level: 140, coins: 400, hints: 3, wheelSpins: 1 },
  { level: 150, coins: 600, gems: 20, wheelSpins: 1 },      // Sesquicentennial
];

// Starter pack activation delay — don't start the 72hr timer until player
// has solved enough puzzles to understand the value of items
export const STARTER_PACK_DELAY_PUZZLES = 5;

// Scoring
export const SCORE = {
  wordFound: 100,
  bonusPerLetter: 20,
  perfectClear: 500,
  noHints: 200,
  starThresholds: [0.5, 0.75, 1.0],
  timeBonus: 10, // points per second remaining
};

// Hints & Undos
export const INITIAL_HINTS = 3;
export const INITIAL_UNDOS = 3;
export const HINTS_PER_AD = 1;

// Animation
export const ANIM = {
  gravityDuration: 300,
  gravityBounce: 50,
  gravityStagger: 30,
  cellSelectDuration: 150,
  wordFoundDuration: 500,
  celebrationDuration: 1200,
  starAnimDelay: [200, 500, 800],
  // Synthwave effects
  glitchDuration: 150,
  neonFlickerDuration: 80,
  chromeSweepDuration: 2000,
  scanLinePeriod: 4000,
  selectionRippleDuration: 300,
  neonOverchargeDuration: 100,
  gridDissolveDelay: 30, // per-tile stagger
  victoryPhase1: 500,
  victoryPhase2: 700,
  victoryPhase3: 800,
  victoryPhase4: 1500,
  crtShutdownDuration: 200,
  tabSlideSpeed: 250,
  trailFadeDuration: 400,
  gravityTrailDuration: 500,
};

// Economy
// August 2026 faucet collapse: a committed free player was earning
// 7,500–10,000 coins and 50–90 gems per day against sink demand under
// 1,000 coins / 20 gems, so nothing in the shop ever felt scarce. Base
// payouts were cut ~5x (50/100/200/400 → 10/15/25/40, star bonus 25 → 5,
// perfect-clear gems 5 → 1) to meet the ECONOMY_TUNING targets below.
// These are the shipped defaults; live values flow through
// data/economyTuning.ts (Remote Config keys coinsPer*Puzzle /
// gemsPerPerfectClear) so the cut can be re-tuned without a release.
export const ECONOMY = {
  puzzleCompleteCoins: {
    easy: 10,
    medium: 15,
    hard: 25,
    expert: 40,
  },
  starBonus: 5,
  comboBonus: 10,
  perfectClearGems: 1,
  dailyCompleteCoins: 150,
  dailyCompleteGems: 2,
  streakBonusMultiplier: 0.1, // +10% per streak day
  loginRewards: [
    // Week 1
    { day: 1, coins: 50 },
    { day: 2, coins: 75 },
    { day: 3, coins: 100, hints: 2 },
    { day: 4, coins: 125 },
    { day: 5, coins: 150, gems: 5 },
    { day: 6, coins: 175, hints: 3 },
    { day: 7, coins: 200, gems: 10, rareTile: true },
    // Week 2
    { day: 8, coins: 100, gems: 3 },
    { day: 9, coins: 125 },
    { day: 10, coins: 150, hints: 2 },
    { day: 11, coins: 175, gems: 5 },
    { day: 12, coins: 200 },
    { day: 13, coins: 250, hints: 3 },
    { day: 14, coins: 400, gems: 25 },
    // Week 3
    { day: 15, coins: 150, gems: 5 },
    { day: 16, coins: 200, hints: 2 },
    { day: 17, coins: 250, gems: 8 },
    { day: 18, coins: 300, hints: 3 },
    { day: 19, coins: 350, gems: 10 },
    { day: 20, coins: 400, hints: 5 },
    { day: 21, coins: 600, gems: 50, cosmetic: 'login_21_frame' },
    // Week 4+
    { day: 22, coins: 200, gems: 8 },
    { day: 23, coins: 250, hints: 3 },
    { day: 24, coins: 300, gems: 10 },
    { day: 25, coins: 350, hints: 5 },
    { day: 26, coins: 400, gems: 15 },
    { day: 27, coins: 450, hints: 5 },
    { day: 28, coins: 500, gems: 20 },
    { day: 29, coins: 500, gems: 25 },
    { day: 30, coins: 1000, gems: 100, cosmetic: 'login_30_exclusive', rareTile: true },
  ] as { day: number; coins: number; gems?: number; hints?: number; rareTile?: boolean; cosmetic?: string }[],
  loginRewardCycleLength: 30,
  loginRewardRepeatMultiplier: 1.5,
  hintCost: 50, // coins per hint refill
  undoCost: 50,
  streakShieldCost: 500, // coins
};

// Cosmetic & Mode Coin Pricing
export const COSMETIC_COIN_PRICES: Record<string, number> = {
  common: 500,
  rare: 1500,
  epic: 3000,
  legendary: 5000,
};

export const BOOSTER_COIN_COST = 200;

/** Coin cost for entering premium modes (expert, weekly) */
export const SPECIAL_MODE_ENTRY_COST = 100;

// Lives / Energy
export const LIVES = {
  max: 5,
  refillMinutes: 30,
  gemRefillCost: 10,
};

// Puzzle Energy (soft scarcity — NOT a hard wall)
export const ENERGY = {
  MAX: 30,
  REGEN_MINUTES: 15,
  FREE_MODES: ['daily', 'relax'] as string[],
  BONUS_PLAYS_AFTER_ZERO: 3,
  AD_REFILL_AMOUNT: 5,
  GEM_REFILL_COST: 10,
};

// Streak
export const STREAK = {
  graceDays: 1,
  shieldCooldownDays: 30,
  // D2-D6 is where daily habits form, and the old ladder ([7,14,30,60,100])
  // paid NOTHING before day 7 — while the flawless streak celebrated at
  // 3 and 5. New tiers fill the front (3, 5, 10) and the old 16-day
  // 14→30 hole (21) plus 30→60 (45). updateStreak iterates this array
  // generically and ceremonyEconomyGrant pays from the reward objects, so
  // this is a pure data change.
  milestones: [3, 5, 7, 10, 14, 21, 30, 45, 60, 100],
  milestoneRewards: {
    3: { coins: 150, gems: 0 },
    5: { coins: 250, gems: 5 },
    7: { coins: 500, gems: 10 },
    10: { coins: 600, gems: 15 },
    14: { coins: 1000, gems: 25 },
    21: { coins: 1500, gems: 35 },
    30: { coins: 2500, gems: 50, cosmetic: 'streak_30_frame' },
    45: { coins: 3500, gems: 75 },
    60: { coins: 5000, gems: 100, cosmetic: 'streak_60_title' },
    100: { coins: 10000, gems: 200, cosmetic: 'streak_100_badge' },
  },
};

// Collection
export const COLLECTION = {
  rareTilePityTimer: 10, // guaranteed within 10 puzzles
  rareTileBaseChance: 0.08, // 8% base chance
  rareTileHardBonus: 0.03, // +3% for hard/expert (was 10%)
  rareTilePerfectBonus: 0.05, // +5% for perfect clears (was 15%)
  duplicatesForWildcard: 5,
  giftTilesPerDay: 3,
  atlasMasteryMax: 5, // max mastery level per word (unlocks gold border at max)
};

// Club settings
export const CLUB = {
  minMembers: 10,
  maxMembers: 30,
  autoKickInactiveDays: 14, // auto-kick after 14 days of inactivity
};

// Comeback rewards
export const COMEBACK = {
  day3: { coins: 200, hints: 5 },
  day7: { coins: 500, gems: 10, hints: 10 },
  day30: { coins: 1000, gems: 25, hints: 20, premiumHintDays: 3, doubleRewardDays: 3 },
};

// Mastery track
export const MASTERY = {
  tiersPerSeason: 30,
  premiumPassPrice: '$4.99',
};

// Library
export const LIBRARY = {
  wingsCount: 8,
  shelvesPerWing: 5,
  decorationSlots: 3,
  wingNames: ['Nature', 'Science', 'Mythology', 'Ocean', 'Arts', 'Space', 'History', 'Elements'],
  wingIcons: ['🌿', '🔬', '⚡', '🌊', '🎨', '🚀', '📜', '🔥'],
  wingChapters: [
    [1, 5],
    [6, 10],
    [11, 15],
    [16, 20],
    [21, 25],
    [26, 30],
    [31, 35],
    [36, 40],
  ],
};

// Milestone decoration unlocks (every 5 levels per GDD)
export const MILESTONE_DECORATIONS: { level: number; decoration: string; name: string; icon: string }[] = [
  { level: 5, decoration: 'bookend_oak', name: 'Oak Bookend', icon: '📚' },
  { level: 10, decoration: 'lamp_brass', name: 'Brass Lamp', icon: '💡' },
  { level: 15, decoration: 'globe_antique', name: 'Antique Globe', icon: '🌍' },
  { level: 20, decoration: 'clock_pendulum', name: 'Pendulum Clock', icon: '🕰️' },
  { level: 25, decoration: 'telescope_mini', name: 'Mini Telescope', icon: '🔭' },
  { level: 30, decoration: 'statue_thinker', name: 'The Thinker', icon: '🤔' },
  { level: 35, decoration: 'plant_fern', name: 'Library Fern', icon: '🌿' },
  { level: 40, decoration: 'painting_sunset', name: 'Sunset Painting', icon: '🖼️' },
  { level: 45, decoration: 'crystal_ball', name: 'Crystal Ball', icon: '🔮' },
  { level: 50, decoration: 'crown_wisdom', name: 'Crown of Wisdom', icon: '👑' },
];

// Star milestone cosmetic rewards (per GDD: 50/100/250/500)
export const STAR_MILESTONES: { stars: number; reward: string; name: string; type: 'frame' | 'title' }[] = [
  { stars: 50, reward: 'frame_bronze_star', name: 'Bronze Star Frame', type: 'frame' },
  { stars: 100, reward: 'frame_silver_star', name: 'Silver Star Frame', type: 'frame' },
  { stars: 250, reward: 'title_star_collector', name: 'Star Collector', type: 'title' },
  { stars: 500, reward: 'frame_gold_star', name: 'Gold Star Frame', type: 'frame' },
];

// Perfect solve milestone badges (per GDD: 10/25/50)
export const PERFECT_MILESTONES: { count: number; badge: string; name: string }[] = [
  { count: 10, badge: 'badge_perfect_10', name: 'Perfect Bronze' },
  { count: 25, badge: 'badge_perfect_25', name: 'Perfect Silver' },
  { count: 50, badge: 'badge_perfect_50', name: 'Perfect Gold' },
];

// Shop
export const SHOP_ITEMS = {
  starterPack: {
    id: 'starter_pack',
    price: '$1.99',
    coins: 500,
    gems: 50,
    hints: 10,
    decoration: 'starter_bookend',
    expiresHours: 72,
  },
  hintBundles: [
    { id: 'hint_10', count: 10, price: '$0.99' },
    { id: 'hint_25', count: 25, price: '$1.99', bestValue: true },
    { id: 'hint_50', count: 50, price: '$2.99' },
  ],
  undoBundles: [
    { id: 'undo_10', count: 10, price: '$0.99' },
    { id: 'undo_25', count: 25, price: '$1.99', bestValue: true },
    { id: 'undo_50', count: 50, price: '$2.99' },
  ],
  dailyValuePack: {
    id: 'daily_value',
    price: '$0.99/day',
    duration: 7,
    dailyCoins: 100,
    dailyGems: 5,
    dailyHints: 3,
    availableAfterDay: 3,
    autoEnds: true,
  },
  premiumPass: { id: 'premium_pass', price: '$4.99/season' },
  adRemoval: { id: 'ad_removal', price: '$4.99' },
  chapterBundle: {
    id: 'chapter_bundle',
    price: '$2.99',
    gems: 20,
    hints: 10,
    decoration: true,
    smartShuffle: 1,
  },
};

// Feature unlock schedule (progressive disclosure)
export const FEATURE_UNLOCK_SCHEDULE: {
  id: string;
  unlockLevel: number;
  icon: string;
  title: string;
  description: string;
  accentColor: string;
}[] = [
  { id: 'tab_play', unlockLevel: 1, icon: '▶', title: 'Play', description: 'Access game modes', accentColor: COLORS.accent },
  { id: 'tab_collections', unlockLevel: 4, icon: '◆', title: 'Collections Unlocked!', description: 'Discover Word Atlas, Rare Tiles, and Seasonal Stamps. Collect them all!', accentColor: COLORS.gold },
  { id: 'boosters', unlockLevel: 6, icon: '⚡', title: 'Boosters Unlocked!', description: 'Use Freeze, Preview, and Shuffle to gain the edge on tough puzzles.', accentColor: COLORS.teal },
  { id: 'weekly_goals', unlockLevel: 7, icon: '📋', title: 'Weekly Goals!', description: 'Complete weekly objectives for bonus gems and exclusive rewards.', accentColor: COLORS.green },
  { id: 'tab_library', unlockLevel: 9, icon: '❏', title: 'The Grand Library!', description: 'Restore 8 wings of the ancient library. Place decorations and build your sanctuary.', accentColor: COLORS.purple },
  { id: 'events', unlockLevel: 10, icon: '🏆', title: 'Events Unlocked!', description: 'Compete in weekly events for exclusive rewards and climb the leaderboards.', accentColor: COLORS.coral },
];

// Breather difficulty config — drops the player back ~3-4 levels worth of
// difficulty. Bypasses the spike layer so we don't accidentally hand the
// player a harder-than-base puzzle when their would-be target lands on a
// spike level (e.g. breather at level 30 otherwise recursed through the
// spike at level 26, producing a breather that was harder than normal).
export function getBreatherConfig(level: number): BoardConfig {
  const easierLevel = Math.max(1, level - 4);
  return getPhaseConfig(easierLevel);
}

// Events
export const EVENT_SCHEDULE = {
  weeklyResetDay: 1, // Monday
  weekendBlitzStart: 6, // Saturday
  weekendBlitzEnd: 0, // Sunday
  dailyResetHourUTC: 0,
};

// Typography — Neon Intelligence design system
// Fonts: SpaceGrotesk (display) + Inter (body)
export const FONTS = {
  display: 'SpaceGrotesk_700Bold',
  // Baloo 2 Bold (700) instead of ExtraBold (800) — ExtraBold rendered
  // too thick on tile letters and read as "fat" rather than friendly.
  // Bold keeps the rounded friendliness without the bulk.
  displayRounded: 'Baloo2_700Bold',
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};

export const TYPOGRAPHY = {
  displayHero: { fontFamily: FONTS.display, fontSize: 48, letterSpacing: 2 },
  displayLarge: { fontFamily: FONTS.display, fontSize: 36, letterSpacing: 1.5 },
  screenTitle: { fontFamily: FONTS.display, fontSize: 28, letterSpacing: 1 },
  sectionTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 20, letterSpacing: 0.5 },
  bodyLarge: { fontFamily: FONTS.bodyRegular, fontSize: 16, letterSpacing: 0.2 },
  body: { fontFamily: FONTS.bodyRegular, fontSize: 15, letterSpacing: 0.2 },
  bodySmall: { fontFamily: FONTS.bodyRegular, fontSize: 13, letterSpacing: 0.2 },
  bodyMedium: { fontFamily: FONTS.bodyMedium, fontSize: 15, letterSpacing: 0.2 },
  bodySemiBold: { fontFamily: FONTS.bodySemiBold, fontSize: 15, letterSpacing: 0.2 },
  bodyBold: { fontFamily: FONTS.bodyBold, fontSize: 15, letterSpacing: 0.2 },
  label: { fontFamily: FONTS.bodySemiBold, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  labelSmall: { fontFamily: FONTS.bodySemiBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  caption: { fontFamily: FONTS.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
  score: { fontFamily: FONTS.display, fontSize: 22, letterSpacing: 0.5 },
  comboText: { fontFamily: FONTS.display, fontSize: 28, letterSpacing: 1 },
  tileLetter: { fontFamily: FONTS.display, letterSpacing: 0.8 },
  // Synthwave typography presets
  chromeTitle: { fontFamily: FONTS.display, fontSize: 36, letterSpacing: 4 },
  neonDisplay: { fontFamily: FONTS.display, fontSize: 48, letterSpacing: 6 },
  arcadeScore: { fontFamily: FONTS.display, fontSize: 40, letterSpacing: 2 },
  vhsLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' as const },
  neonCounter: { fontFamily: FONTS.display, fontSize: 32, letterSpacing: 1 },
};

// Spacing scale — every margin/padding should resolve to one of these.
export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

// Border radius scale — 6 tiers, each with a named role. The April audit
// found 34 distinct ad-hoc radius values across screens; new code should
// resolve to one of these (sm: badges/chips, md: inputs/small buttons,
// lg: buttons/list rows, xl: cards/panels, xxl: hero cards/modals).
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 999,
};

// Materials — synthwave material definitions for component styling
export const MATERIALS = {
  chrome: {
    textShadowColor: '#d4e0f7',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 20,
  },
  neonTube: {
    borderWidth: 1.5,
    glowRadius: 12,
    glowOpacity: 0.6,
  },
  crtGlass: {
    scanLineSpacing: 3,
    scanLineOpacity: 0.03,
    vignetteOpacity: 0.15,
  },
  holographic: {
    sweepSpeed: 2000,
    shimmerOpacity: 0.3,
  },
};

// Background evolution by player level
export const BACKGROUND_EVOLUTION = {
  easy: { starCount: 10, sunScale: 1.0, gridSpeed: 8000, mountains: 0, meteor: false, aurora: false },
  medium: { starCount: 15, sunScale: 1.1, gridSpeed: 6500, mountains: 1, meteor: false, aurora: false },
  hard: { starCount: 20, sunScale: 1.2, gridSpeed: 5000, mountains: 2, meteor: true, aurora: false },
  expert: { starCount: 25, sunScale: 1.3, gridSpeed: 4000, mountains: 2, meteor: true, aurora: true },
} as const;

// Ad configuration — rewarded ads tuning
//
// Ad unit IDs are platform-specific: an Android ad unit will not load against
// an iOS app ID and vice versa. We resolve at module init via Platform.OS,
// reading the platform-specific env var first and falling back to Google's
// public test unit IDs (which work on both platforms) so dev / unconfigured
// builds always show test ads instead of crashing.
const env = (typeof process !== 'undefined' ? (process as any).env : {}) ?? {};
const ADMOB_REWARDED_ID =
  (Platform.OS === 'ios'
    ? env.EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS
    : env.EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID) ||
  env.EXPO_PUBLIC_ADMOB_REWARDED_ID || // legacy / shared fallback
  'ca-app-pub-3940256099942544/5224354917'; // Google test rewarded unit
const ADMOB_INTERSTITIAL_ID =
  (Platform.OS === 'ios'
    ? env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS
    : env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID) ||
  env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID || // legacy / shared fallback
  'ca-app-pub-3940256099942544/1033173712'; // Google test interstitial unit

export const AD_CONFIG = {
  /** AdMob rewarded ad unit ID (resolved by platform; falls back to Google test ID) */
  REWARDED_AD_UNIT_ID: ADMOB_REWARDED_ID,
  /** AdMob interstitial ad unit ID (resolved by platform; falls back to Google test ID) */
  INTERSTITIAL_AD_UNIT_ID: ADMOB_INTERSTITIAL_ID,
  /** Maximum total rewarded ads a player can watch per day */
  MAX_ADS_PER_DAY: 10,
  /** Maximum "watch ad for coins" ads per day */
  MAX_COIN_ADS_PER_DAY: 3,
  /** Maximum "watch ad for +1 life" ads per day (hard-energy Phase 4B) */
  MAX_LIFE_ADS_PER_DAY: 3,
  /** Minimum cooldown between rewarded ads (ms) */
  REWARDED_COOLDOWN_MS: 30_000, // 30 seconds
  /** Maximum interstitial ads per day */
  MAX_INTERSTITIALS_PER_DAY: 5,
  /** Minimum interval between interstitial ads (ms) */
  INTERSTITIAL_INTERVAL_MS: 90_000, // 90 seconds
};

// Economy Tuning — central knobs for balancing the free-to-play economy.
//
// This block is the SPEC for the free-currency faucets. As of August 2026
// the load-bearing targets are actually enforced, not just declared:
//  - `coinsPerDifficulty` / `gemsPerPerfectClear` are the shipped defaults of
//    ECONOMY.puzzleCompleteCoins / ECONOMY.perfectClearGems, granted through
//    data/economyTuning.ts (puzzleCoinPayout / perfectClearGems) and
//    RC-overridable via coinsPer*Puzzle / gemsPerPerfectClear.
//  - `dailyGemDripTarget` is enforced by the `dailyFlawlessGemCap` Remote
//    Config key (default 5/day) via claimFlawlessGems() in
//    data/economyTuning.ts — flawless-clear gems stop at the cap, and the
//    remaining drip (gemsPerDailyCompletion, wheel EV ~2 gems/spin) is
//    bounded per day by design.
//  - Daily/weekly board REPLAYS pay nothing (useRewardWiring gates base
//    coins, flawless gems, piggy fill, season XP, and puzzlesSolved-derived
//    progress behind first-completion flags), so the deterministic shared
//    boards cannot be farmed.
// `targetEarnSpendRatio`, `freeHintRunoutLevel`, `firstPurchasePressureLevel`
// and `freePlayerGemGateDays` remain calibration targets for soft-launch
// telemetry rather than code-enforced values.
export const ECONOMY_TUNING = {
  // Coins earned vs spent ratio target: 1.5:1 (earn 50% more than spend)
  targetEarnSpendRatio: 1.5,
  // Hint scarcity threshold: player should run out of free hints by level 8-10
  freeHintRunoutLevel: 9,
  // First purchase pressure point: level 12-15 (player hits real difficulty)
  firstPurchasePressureLevel: 13,
  // Gem drip rate: ~2-5 gems per day for active free player
  dailyGemDripTarget: 3,
  // Days until free player hits gem gate: 14-21 days
  freePlayerGemGateDays: 17,
  // Coins awarded per difficulty tier (mirrors ECONOMY.puzzleCompleteCoins)
  coinsPerDifficulty: {
    easy: 10,
    medium: 15,
    hard: 25,
    expert: 40,
  } as Record<string, number>,
  // Gem awards (mirror ECONOMY.perfectClearGems / ECONOMY.dailyCompleteGems)
  gemsPerPerfectClear: 1,
  gemsPerDailyCompletion: 2,
  // Rare tile pity timer (matches COLLECTION.rareTilePityTimer)
  rareTilePityTimer: 10,
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };
