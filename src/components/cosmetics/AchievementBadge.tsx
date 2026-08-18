/**
 * AchievementBadge — premium SVG trophy for the 19 achievements.
 *
 * Each achievement family gets its own medallion SILHOUETTE (puzzle = circle
 * medallion, collection/mode = heater shield, streak/mastery = star-scallop
 * rosette) and enamel accent, with a bespoke emblem per achievement — so the
 * wall reads as a varied trophy case, never a repeated placeholder.
 *
 * Composition (back to front): gold ray burst (gold tier only) → accent glow
 * (earned) → dashed silhouette echo (locked) → enamel plate → bespoke emblem
 * (from `achievementEmblems1/2`, fitted per silhouette) → riveted metal frame
 * (bronze / silver / gold by tier, slate when locked) → silver ring gleam
 * (silver tier only) → dovetailed ribbon with 1–3 tier stars → padlock chip
 * (locked).
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
  EMBLEM_FIT,
  GhostEcho,
  GoldRayBurst,
  LockChip,
  SilverGleam,
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
      {!earned && <GhostEcho shape={art.shape} accent={art.accent} />}
      <BadgePlate shape={art.shape} tone={earned ? art.accent : ghostEnamel(art.accent)} />
      <G transform={EMBLEM_FIT[art.shape]}>
        <Emblem c={c} />
      </G>
      <BadgeFrame shape={art.shape} metal={metal} />
      {earned && metal === 'silver' && <SilverGleam shape={art.shape} />}
      <RibbonBanner
        metal={metal}
        cloth={earned ? shade(art.accent, -28) : ghostCloth(art.accent)}
        stars={earned ? TIER_STARS[tier ?? 'bronze'] : 0}
      />
      {!earned && <LockChip />}
    </Svg>
  );
}

export { ACHIEVEMENT_BADGE_ART, resolveAchievementBadgeArt };
export type { AchievementBadgeArt, AchievementEmblem, BadgeShape };
