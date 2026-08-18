/**
 * AchievementBadge — premium SVG medallion for the 19 achievements.
 *
 * Composition (back to front): accent glow (earned only) → enamel disc in the
 * achievement family's accent → bespoke emblem (one per achievement id, from
 * `achievementEmblems1/2`) → riveted metal ring (bronze / silver / gold by
 * tier) → dovetailed ribbon banner with 1–3 tier stars.
 *
 * Unearned badges render as carved stone: slate metal, dark enamel, the same
 * emblem re-toned through a luminance→slate ramp (`stoneOf`) — a silhouette
 * with depth, not an opacity fade — and a starless ribbon.
 *
 * Art assignments live in `achievementBadgeCatalog` (pure data, test-pinned);
 * integration code can read `ACHIEVEMENT_BADGE_ART` re-exported here.
 */
import React, { useMemo } from 'react';
import Svg from 'react-native-svg';
import { shade } from '../icons/IconBase';
import {
  ABVB,
  BadgeGlow,
  BadgeMetal,
  EmblemProps,
  EnamelDisc,
  MetalRing,
  RibbonBanner,
  stoneOf,
} from './achievementBadgeParts';
import {
  ACHIEVEMENT_BADGE_ART,
  AchievementBadgeArt,
  AchievementEmblem,
  resolveAchievementBadgeArt,
} from './achievementBadgeCatalog';
import {
  BoltClockEmblem,
  BrainEmblem,
  ChainEmblem,
  FlameEmblem,
  JigsawEmblem,
  LensEmblem,
  ScoreBarsEmblem,
  SunriseEmblem,
  TriStarEmblem,
} from './achievementEmblems1';
import {
  AtlasEmblem,
  CompassEmblem,
  CrownGemsEmblem,
  GemTileEmblem,
  OwlEmblem,
  PeakEmblem,
  StarClusterEmblem,
  StopwatchEmblem,
  TempleEmblem,
  WingedShoeEmblem,
} from './achievementEmblems2';

const EMBLEMS: Record<AchievementEmblem, React.ComponentType<EmblemProps>> = {
  lens: LensEmblem,
  jigsaw: JigsawEmblem,
  triStar: TriStarEmblem,
  scoreBars: ScoreBarsEmblem,
  boltClock: BoltClockEmblem,
  brain: BrainEmblem,
  chain: ChainEmblem,
  flame: FlameEmblem,
  sunrise: SunriseEmblem,
  atlas: AtlasEmblem,
  gemTile: GemTileEmblem,
  temple: TempleEmblem,
  crownGems: CrownGemsEmblem,
  compass: CompassEmblem,
  stopwatch: StopwatchEmblem,
  peak: PeakEmblem,
  starCluster: StarClusterEmblem,
  owl: OwlEmblem,
  wingedShoe: WingedShoeEmblem,
};

export type AchievementTierLevel = 'bronze' | 'silver' | 'gold';

export interface AchievementBadgeProps {
  achievementId: string;
  size: number;
  earned: boolean;
  /** Highest tier reached; defaults to bronze for an earned badge. */
  tier?: AchievementTierLevel;
}

const identity = (hex: string) => hex;
const STONE_ENAMEL = '#4e5266';
const STONE_CLOTH = '#3f4356';
const TIER_STARS: Record<AchievementTierLevel, number> = { bronze: 1, silver: 2, gold: 3 };

export function AchievementBadge({ achievementId, size, earned, tier }: AchievementBadgeProps) {
  const art = useMemo(() => resolveAchievementBadgeArt(achievementId), [achievementId]);
  const metal: BadgeMetal = earned ? tier ?? 'bronze' : 'stone';
  const Emblem = EMBLEMS[art.emblem];
  const c = earned ? identity : stoneOf;
  return (
    <Svg width={size} height={size} viewBox={ABVB}>
      {earned && <BadgeGlow accent={art.accent} />}
      <EnamelDisc tone={earned ? art.accent : STONE_ENAMEL} />
      <Emblem c={c} />
      <MetalRing metal={metal} />
      <RibbonBanner
        metal={metal}
        cloth={earned ? shade(art.accent, -28) : STONE_CLOTH}
        stars={earned ? TIER_STARS[tier ?? 'bronze'] : 0}
      />
    </Svg>
  );
}

export { ACHIEVEMENT_BADGE_ART, resolveAchievementBadgeArt };
export type { AchievementBadgeArt, AchievementEmblem };
