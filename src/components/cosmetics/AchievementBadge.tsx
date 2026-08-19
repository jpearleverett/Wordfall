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
 * (earned) → enameled plate (per-badge field tone from `enamelField` under a
 * radial bloom and a rim vignette, so neighbouring badges differ in field
 * color, not just emblem shape) → engraved dashed silhouette echo (locked) →
 * bespoke emblem (from `achievementEmblems1/2`, fitted per silhouette) wrapped
 * in `EmblemMaterial` — cast shadow, dark inset contour, top-edge catchlight
 * and a two-tone enamel glaze, so the magnifier / puzzle piece / compass read
 * as raised cloisonné OBJECTS rather than flat vector glyphs → `GlassDome`
 * (broad upper-third reflection + inner-rim arc, putting field and emblem
 * under one sheet of glass) → riveted metal frame (hammered copper / brushed steel / rich gold by tier,
 * slate when locked) → tier surface dressing (hammer facets · brushed
 * striations + specular sweep · sparkles) → BASE DRESSING → padlock chip
 * (locked).
 *
 * The base dressing varies with the silhouette family (`SHAPE_DRESSING`), so
 * the forms and their dressing vary together instead of six outlines sharing
 * one ribbon: straight banner (circle) · swallowtail ribbon (shield) · laurel
 * sprigs (rosette) · engraved nameplate (hex) · draped sash (laurel) ·
 * parchment scroll (crest). Its pip row is a tier readout, not decoration —
 * bronze one boss, silver two stars, gold two stars flanking a set gem
 * (`TIER_PIPS`), where every badge used to show three stars.
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
import { ABVB, BadgeGlow, BadgeMetal, EmblemMaterial, EmblemProps } from './achievementBadgeParts';
import { BadgeDressingArt } from './achievementBadgeDressing';
import {
  BadgeFrame,
  BadgePlate,
  GhostEcho,
  GlassDome,
  GoldRayBurst,
  LockChip,
  TierDressing,
  emblemFit,
} from './achievementBadgeShapes';
import {
  ACHIEVEMENT_BADGE_ART,
  AchievementBadgeArt,
  AchievementEmblem,
  AchievementTierLevel,
  BadgeShape,
  SHAPE_DRESSING,
  enamelField,
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

export interface AchievementBadgeProps {
  achievementId: string;
  size: number;
  earned: boolean;
  /** Highest tier reached; defaults to bronze for an earned badge. */
  tier?: AchievementTierLevel;
}

const identity = (hex: string) => hex;

export function AchievementBadge({ achievementId, size, earned, tier }: AchievementBadgeProps) {
  const art = useMemo(() => resolveAchievementBadgeArt(achievementId), [achievementId]);
  const metal: BadgeMetal = earned ? tier ?? 'bronze' : 'stone';
  const Emblem = EMBLEMS[art.emblem];
  const c = useMemo(() => (earned ? identity : ghostRamp(art.accent)), [earned, art.accent]);
  const field = useMemo(
    () => enamelField(art.accent, achievementId),
    [art.accent, achievementId]
  );
  return (
    <Svg width={size} height={size} viewBox={ABVB}>
      {earned && metal === 'gold' && <GoldRayBurst />}
      {earned && <BadgeGlow accent={art.accent} />}
      <BadgePlate shape={art.shape} tone={earned ? field : ghostEnamel(field)} />
      {!earned && <GhostEcho shape={art.shape} accent={art.accent} />}
      <G transform={emblemFit(art.shape, art.emblem)}>
        <EmblemMaterial Emblem={Emblem} c={c} earned={earned} />
      </G>
      <GlassDome shape={art.shape} />
      <BadgeFrame shape={art.shape} metal={metal} />
      {earned && <TierDressing shape={art.shape} metal={metal} />}
      <BadgeDressingArt
        dressing={SHAPE_DRESSING[art.shape]}
        metal={metal}
        cloth={earned ? shade(art.accent, -28) : ghostCloth(art.accent)}
        tier={earned ? tier ?? 'bronze' : null}
      />
      {!earned && <LockChip />}
    </Svg>
  );
}

export { ACHIEVEMENT_BADGE_ART, SHAPE_DRESSING, resolveAchievementBadgeArt };
export type { AchievementBadgeArt, AchievementEmblem, AchievementTierLevel, BadgeShape };
