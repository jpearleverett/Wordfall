/**
 * Achievement-badge art catalog: assigns every achievement in
 * `src/data/achievements.ts` a bespoke emblem plus an enamel accent per
 * achievement family (puzzle / streak / collection / mode / mastery), so each
 * badge reads as a distinct premium medallion rather than a recolored generic.
 *
 * Pure data + resolver (no SVG imports) so tests can pin full catalog
 * coverage without pulling in react-native-svg — same pattern as
 * `frameArtCatalog`. The SVG renders live in `achievementEmblems1/2.tsx` and
 * are assembled by `AchievementBadge.tsx`.
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

export interface AchievementBadgeArt {
  /** Enamel-disc hue (#rrggbb), shared per achievement family. */
  accent: string;
  /** Which bespoke emblem composition to render. */
  emblem: AchievementEmblem;
}

/** Enamel accent per achievement category (family). */
export const ACHIEVEMENT_FAMILY_ACCENTS = {
  puzzle: '#cf2d6e',
  streak: '#e0561c',
  collection: '#8f3fd1',
  mode: '#2278d8',
  mastery: '#0fa87a',
} as const;

const art = (accent: string, emblem: AchievementEmblem): AchievementBadgeArt => ({ accent, emblem });
const A = ACHIEVEMENT_FAMILY_ACCENTS;

/** Explicit art assignment for every achievement id in the catalog. */
export const ACHIEVEMENT_BADGE_ART: Record<string, AchievementBadgeArt> = {
  // ── Puzzle ──
  word_finder: art(A.puzzle, 'lens'),
  puzzle_solver: art(A.puzzle, 'jigsaw'),
  perfect_player: art(A.puzzle, 'triStar'),
  high_scorer: art(A.puzzle, 'scoreBars'),
  speed_solver: art(A.puzzle, 'boltClock'),
  no_hint_master: art(A.puzzle, 'brain'),
  combo_king: art(A.puzzle, 'chain'),
  // ── Streak ──
  streak_master: art(A.streak, 'flame'),
  daily_devotee: art(A.streak, 'sunrise'),
  // ── Collection ──
  atlas_scholar: art(A.collection, 'atlas'),
  tile_collector: art(A.collection, 'gemTile'),
  library_restorer: art(A.collection, 'temple'),
  collector_supreme: art(A.collection, 'crownGems'),
  // ── Mode ──
  mode_explorer: art(A.mode, 'compass'),
  speed_demon: art(A.mode, 'stopwatch'),
  // ── Mastery ──
  level_climber: art(A.mastery, 'peak'),
  star_collector: art(A.mastery, 'starCluster'),
  night_owl: art(A.mastery, 'owl'),
  marathon_player: art(A.mastery, 'wingedShoe'),
};

/** Fallback for ids not (yet) in the explicit map. */
export const DEFAULT_BADGE_ART: AchievementBadgeArt = art(COLORS.accent, 'triStar');

/** Resolve the badge art for any achievement id (unknowns included). */
export function resolveAchievementBadgeArt(achievementId: string): AchievementBadgeArt {
  return ACHIEVEMENT_BADGE_ART[achievementId] ?? DEFAULT_BADGE_ART;
}
