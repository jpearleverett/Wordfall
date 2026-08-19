/**
 * AchievementBadge — premium SVG trophy for the 19 achievements.
 *
 * Every achievement carries a bespoke emblem plus one of SIX distinct
 * medallion SILHOUETTES (round medallion / heater shield / scalloped rosette /
 * hexagonal plaque / laurel-wreath disc / banner-draped crest), spread so no
 * more than four badges share a form and each form mixes families — the wall
 * reads as a varied trophy case, never one asset with a swapped inner glyph.
 *
 * Two things the badge deliberately does NOT do: float, and stay small. The
 * medallion is centered on (50, 43.5) at radius 38.5 in a 100×100 box, so the
 * frame reaches ~86% of the card's width, and `emblemFit` blows each emblem up
 * until its own authored radius fills the silhouette's safe circle — 55–69% of
 * the box, and the same apparent size for every badge on a given form.
 *
 * Composition (back to front): gold ray burst (gold tier only) → accent glow
 * (earned) → enameled plate (body gradient
 * under a radial enamel bloom, so it reads as enamel over metal, not a vector
 * fill) → engraved dashed silhouette echo (locked) → bespoke emblem (from
 * `achievementEmblems1/2`, fitted per silhouette)
 * → riveted metal frame (hammered copper / brushed steel / rich gold by tier,
 * slate when locked) → tier surface dressing (hammer facets · brushed
 * striations + specular sweep · sparkles) → dovetailed ribbon with 1–3 tier
 * stars, gem-set at gold → padlock chip (locked).
 *
 * Locked badges are TINTED GHOSTS, not gray stone: the emblem re-tones
 * through a luminance ramp pulled toward the badge's own family accent
 * (`ghostRamp`), over an accent-tinted dark slate enamel (`ghostEnamel`) and
 * ribbon (`ghostCloth`) — every locked badge still teases its specific art
 * and family color.
 *
 * Art assignments live in `achievementBadgeCatalog` (pure data, test-pinned);
 * integration code can read `ACHIEVEMENT_BADGE_ART` re-exported here.
 */
import React, { useMemo } from 'react';
import Svg, { G } from 'react-native-svg';
import { shade } from '../icons/IconBase';
import { ABVB, BadgeGlow, BadgeMetal, EmblemProps, RibbonBanner } from './achievementBadgeParts';
import {
  BadgeFrame,
  BadgePlate,
  GhostEcho,
  GoldRayBurst,
  LockChip,
  TierDressing,
  emblemFit,
} from './achievementBadgeShapes';
import {
  ACHIEVEMENT_BADGE_ART,
  AchievementBadgeArt,
  AchievementEmblem,
  BadgeShape,
  ghostCloth,
  ghostEnamel,
  ghostRamp,
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
const TIER_STARS: Record<AchievementTierLevel, number> = { bronze: 1, silver: 2, gold: 3 };

export function AchievementBadge({ achievementId, size, earned, tier }: AchievementBadgeProps) {
  const art = useMemo(() => resolveAchievementBadgeArt(achievementId), [achievementId]);
  const metal: BadgeMetal = earned ? tier ?? 'bronze' : 'stone';
  const Emblem = EMBLEMS[art.emblem];
  const c = useMemo(() => (earned ? identity : ghostRamp(art.accent)), [earned, art.accent]);
  return (
    <Svg width={size} height={size} viewBox={ABVB}>
      {earned && metal === 'gold' && <GoldRayBurst />}
      {earned && <BadgeGlow accent={art.accent} />}
      <BadgePlate shape={art.shape} tone={earned ? art.accent : ghostEnamel(art.accent)} />
      {!earned && <GhostEcho shape={art.shape} accent={art.accent} />}
      <G transform={emblemFit(art.shape, art.emblem)}>
        <Emblem c={c} />
      </G>
      <BadgeFrame shape={art.shape} metal={metal} />
      {earned && <TierDressing shape={art.shape} metal={metal} />}
      <RibbonBanner
        metal={metal}
        cloth={earned ? shade(art.accent, -28) : ghostCloth(art.accent)}
        stars={earned ? TIER_STARS[tier ?? 'bronze'] : 0}
        gem={earned && metal === 'gold'}
      />
      {!earned && <LockChip />}
    </Svg>
  );
}

export { ACHIEVEMENT_BADGE_ART, resolveAchievementBadgeArt };
export type { AchievementBadgeArt, AchievementEmblem, BadgeShape };
