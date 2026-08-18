/**
 * Achievement-badge art catalog: assigns every achievement in
 * `src/data/achievements.ts` a bespoke emblem, an enamel accent AND a
 * medallion silhouette per achievement family (puzzle / streak / collection /
 * mode / mastery), so the trophy wall reads as a varied case — circle
 * medallions, heater shields and star-scallop rosettes in five family
 * colors — rather than a grid of recolored generics.
 *
 * Also home to the "tinted ghost" color math for the unearned state: a locked
 * badge keeps its own family accent at low saturation (mixed toward dark
 * slate) instead of collapsing to uniform gray, so the wall shows 19 visibly
 * different badges even at 0 earned.
 *
 * Pure data + color math (no SVG imports) so tests can pin full catalog
 * coverage without pulling in react-native-svg — same pattern as
 * `frameArtCatalog`. The SVG renders live in `achievementEmblems1/2.tsx` and
 * `achievementBadgeShapes.tsx`, assembled by `AchievementBadge.tsx`.
 */
import { COLORS } from '../../constants';

/** One bespoke emblem composition per achievement — never shared. */
export type AchievementEmblem =
  | 'lens' // word_finder — magnifier over a letter tile
  | 'jigsaw' // puzzle_solver — glossy puzzle piece
  | 'triStar' // perfect_player — three-star fan
  | 'scoreBars' // high_scorer — ascending podium bars + star
  | 'boltClock' // speed_solver — lightning bolt through a clock
  | 'brain' // no_hint_master — radiant brain
  | 'chain' // combo_king — crowned chain links
  | 'flame' // streak_master — layered streak flame
  | 'sunrise' // daily_devotee — radiant daily sunrise
  | 'atlas' // atlas_scholar — open atlas with route
  | 'gemTile' // tile_collector — faceted rare gem
  | 'temple' // library_restorer — restored library facade
  | 'crownGems' // collector_supreme — jeweled crown
  | 'compass' // mode_explorer — brass compass rose
  | 'stopwatch' // speed_demon — racing stopwatch
  | 'peak' // level_climber — summit flag
  | 'starCluster' // star_collector — star constellation
  | 'owl' // night_owl — owl on a branch under the moon
  | 'wingedShoe'; // marathon_player — winged running shoe

/** Medallion silhouettes — the wall mixes all three. */
export type BadgeShape = 'circle' | 'shield' | 'rosette';

export interface AchievementBadgeArt {
  /** Enamel-disc hue (#rrggbb), shared per achievement family. */
  accent: string;
  /** Which bespoke emblem composition to render. */
  emblem: AchievementEmblem;
  /** Medallion silhouette, shared per achievement family. */
  shape: BadgeShape;
}

/** Enamel accent per achievement category (family). */
export const ACHIEVEMENT_FAMILY_ACCENTS = {
  puzzle: '#cf2d6e',
  streak: '#e0561c',
  collection: '#8f3fd1',
  mode: '#2278d8',
  mastery: '#0fa87a',
} as const;

export type AchievementFamily = keyof typeof ACHIEVEMENT_FAMILY_ACCENTS;

/** Medallion silhouette per achievement family. */
export const ACHIEVEMENT_FAMILY_SHAPES: Record<AchievementFamily, BadgeShape> = {
  puzzle: 'circle',
  streak: 'rosette',
  collection: 'shield',
  mode: 'shield',
  mastery: 'rosette',
};

const art = (family: AchievementFamily, emblem: AchievementEmblem): AchievementBadgeArt => ({
  accent: ACHIEVEMENT_FAMILY_ACCENTS[family],
  emblem,
  shape: ACHIEVEMENT_FAMILY_SHAPES[family],
});

/** Explicit art assignment for every achievement id in the catalog. */
export const ACHIEVEMENT_BADGE_ART: Record<string, AchievementBadgeArt> = {
  // ── Puzzle ──
  word_finder: art('puzzle', 'lens'),
  puzzle_solver: art('puzzle', 'jigsaw'),
  perfect_player: art('puzzle', 'triStar'),
  high_scorer: art('puzzle', 'scoreBars'),
  speed_solver: art('puzzle', 'boltClock'),
  no_hint_master: art('puzzle', 'brain'),
  combo_king: art('puzzle', 'chain'),
  // ── Streak ──
  streak_master: art('streak', 'flame'),
  daily_devotee: art('streak', 'sunrise'),
  // ── Collection ──
  atlas_scholar: art('collection', 'atlas'),
  tile_collector: art('collection', 'gemTile'),
  library_restorer: art('collection', 'temple'),
  collector_supreme: art('collection', 'crownGems'),
  // ── Mode ──
  mode_explorer: art('mode', 'compass'),
  speed_demon: art('mode', 'stopwatch'),
  // ── Mastery ──
  level_climber: art('mastery', 'peak'),
  star_collector: art('mastery', 'starCluster'),
  night_owl: art('mastery', 'owl'),
  marathon_player: art('mastery', 'wingedShoe'),
};

/** Fallback for ids not (yet) in the explicit map. */
export const DEFAULT_BADGE_ART: AchievementBadgeArt = {
  accent: COLORS.accent,
  emblem: 'triStar',
  shape: 'circle',
};

/** Resolve the badge art for any achievement id (unknowns included). */
export function resolveAchievementBadgeArt(achievementId: string): AchievementBadgeArt {
  return ACHIEVEMENT_BADGE_ART[achievementId] ?? DEFAULT_BADGE_ART;
}

// ── Tinted-ghost color math (unearned state) ────────────────────────────────

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

const toHex = ([r, g, b]: Rgb) =>
  `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;

/** Linear mix of two #rrggbb colors; `t` is the weight of `b` (0..1). */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return a;
  return toHex(pa.map((v, i) => Math.round(v + (pb[i] - v) * t)) as Rgb);
}

const GHOST_LO = '#232741'; // deep slate floor of the ghost ramp
const GHOST_HI = '#c9cede'; // lit slate ceiling of the ghost ramp

/**
 * Luminance→tinted-slate ramp for a locked badge's emblem: the authored
 * composition keeps its light/shadow structure but re-tones onto a dim ramp
 * pulled ~40–50% toward the badge's own family accent — a tinted ghost that
 * teases the specific badge rather than a uniform gray relief.
 */
export function ghostRamp(accent: string): (hex: string) => string {
  const lo = parseHex(mixHex(accent, GHOST_LO, 0.72)) ?? [35, 39, 65];
  const hi = parseHex(mixHex(accent, GHOST_HI, 0.5)) ?? [160, 165, 190];
  return (hex: string) => {
    const p = parseHex(hex);
    if (!p) return hex;
    const l = (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255;
    return toHex(lo.map((v, i) => Math.round(v + (hi[i] - v) * l)) as Rgb);
  };
}

/** Dark slate enamel tinted with the badge's family accent (locked state). */
export function ghostEnamel(accent: string): string {
  return mixHex(accent, '#262a3d', 0.6);
}

/** Slate ribbon cloth with a whisper of the family accent (locked state). */
export function ghostCloth(accent: string): string {
  return mixHex(accent, '#343850', 0.62);
}
