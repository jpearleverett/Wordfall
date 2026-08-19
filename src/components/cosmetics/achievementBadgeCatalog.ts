/**
 * Achievement-badge art catalog: assigns every achievement in
 * `src/data/achievements.ts` a bespoke emblem, an enamel accent (per family:
 * puzzle / streak / collection / mode / mastery) AND one of SIX distinct
 * medallion silhouettes, so the trophy wall reads as a varied case — round
 * medallions, heater shields, scalloped rosettes, hexagonal plaques,
 * laurel-wreath discs and banner-draped crests in five family colors —
 * rather than a grid of recolored generics.
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

/**
 * Medallion silhouettes — SIX distinct outline geometries, not one outline
 * with a swapped inner glyph. The wall mixes all six, at most four badges to
 * a form, so no two neighbours read as the same asset:
 *
 * - `circle`  classic round medallion (riveted band)
 * - `shield`  heater shield (pointed base, shouldered top)
 * - `rosette` scalloped star rosette (12 petals + bead studs)
 * - `hex`     hexagonal plaque (hard straight facets, corner bolts)
 * - `laurel`  laurel-wreath disc (small disc inside a leafed wreath)
 * - `crest`   banner-draped crest (curled ears, draped banner across the top)
 */
export type BadgeShape = 'circle' | 'shield' | 'rosette' | 'hex' | 'laurel' | 'crest';

/** Every silhouette on the wall, in "flattest → most ornate" order. */
export const BADGE_SHAPES: readonly BadgeShape[] = [
  'circle',
  'shield',
  'rosette',
  'hex',
  'laurel',
  'crest',
];

/** Ceiling on how many achievements may share one silhouette (pinned by test). */
export const MAX_PER_SHAPE = 4;

export interface AchievementBadgeArt {
  /** Enamel-disc hue (#rrggbb), shared per achievement family. */
  accent: string;
  /** Which bespoke emblem composition to render. */
  emblem: AchievementEmblem;
  /** Medallion silhouette — assigned per achievement, spread across all six. */
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

const art = (
  family: AchievementFamily,
  emblem: AchievementEmblem,
  shape: BadgeShape
): AchievementBadgeArt => ({
  accent: ACHIEVEMENT_FAMILY_ACCENTS[family],
  emblem,
  shape,
});

/**
 * Explicit art assignment for every achievement id.
 *
 * Silhouettes are deliberately NOT keyed off family: a family-keyed map put
 * seven puzzle badges on one outline and made four collection badges
 * (atlas / tile / library / collector) read as the same asset. Shapes are
 * spread so every form carries 3–4 badges drawn from at least two families,
 * with the crest — the most ornate form — reserved for the capstone
 * achievements of their family (supreme collector, streak master, marathon).
 */
export const ACHIEVEMENT_BADGE_ART: Record<string, AchievementBadgeArt> = {
  // ── Puzzle ──
  word_finder: art('puzzle', 'lens', 'circle'),
  puzzle_solver: art('puzzle', 'jigsaw', 'circle'),
  perfect_player: art('puzzle', 'triStar', 'rosette'),
  high_scorer: art('puzzle', 'scoreBars', 'circle'),
  speed_solver: art('puzzle', 'boltClock', 'hex'),
  no_hint_master: art('puzzle', 'brain', 'shield'),
  combo_king: art('puzzle', 'chain', 'laurel'),
  // ── Streak ──
  streak_master: art('streak', 'flame', 'crest'),
  daily_devotee: art('streak', 'sunrise', 'rosette'),
  // ── Collection ──
  atlas_scholar: art('collection', 'atlas', 'shield'),
  tile_collector: art('collection', 'gemTile', 'hex'),
  library_restorer: art('collection', 'temple', 'laurel'),
  collector_supreme: art('collection', 'crownGems', 'crest'),
  // ── Mode ──
  mode_explorer: art('mode', 'compass', 'shield'),
  speed_demon: art('mode', 'stopwatch', 'hex'),
  // ── Mastery ──
  level_climber: art('mastery', 'peak', 'laurel'),
  star_collector: art('mastery', 'starCluster', 'rosette'),
  night_owl: art('mastery', 'owl', 'circle'),
  marathon_player: art('mastery', 'wingedShoe', 'crest'),
};

// ── Emblem sizing (the "art too small" fix) ─────────────────────────────────

/**
 * Authored content radius of each emblem: the greatest distance any of its
 * artwork reaches from the (50, 44) emblem origin, measured off the authored
 * SVG. They differ by 40% (a 3-star fan is compact, a mountain range is not),
 * which is why one flat per-silhouette scale either clipped the big emblems
 * or left the small ones swimming.
 */
export const EMBLEM_RADIUS: Record<AchievementEmblem, number> = {
  lens: 29.4,
  jigsaw: 28.5,
  triStar: 26,
  scoreBars: 30.1,
  boltClock: 26.2,
  brain: 25,
  chain: 27.6,
  flame: 25,
  sunrise: 28.2,
  atlas: 28.8,
  gemTile: 23,
  temple: 30.4,
  crownGems: 26.4,
  compass: 23.9,
  stopwatch: 30.6,
  peak: 32.8,
  starCluster: 28.2,
  owl: 29.2,
  wingedShoe: 29.4,
};

/**
 * Radius the emblem is blown up to fill inside each silhouette — the largest
 * circle that clears that form's enamel plate and stays off the metal band.
 * Because every emblem is scaled TO this radius, the rendered emblem always
 * spans `2 × SHAPE_SAFE_R` of the 100-unit badge box (55–69%), whatever it
 * was authored at.
 */
export const SHAPE_SAFE_R: Record<BadgeShape, number> = {
  circle: 34.5,
  // Shield and crest taper toward the base, so their safe circle is the
  // tightest — it has to clear the flanks, not just the widest point.
  shield: 27.5,
  rosette: 29.5,
  hex: 29.5,
  laurel: 29.5,
  crest: 27.5,
};

/** Uniform-apparent-size scale factor for one emblem on one silhouette. */
export function emblemScale(shape: BadgeShape, emblem: AchievementEmblem): number {
  return SHAPE_SAFE_R[shape] / EMBLEM_RADIUS[emblem];
}

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
