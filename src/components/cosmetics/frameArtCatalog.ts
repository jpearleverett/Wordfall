/**
 * Frame-art catalog: assigns every profile frame in `PROFILE_FRAMES` one of
 * the 12 bespoke ring designs plus an accent color, so each cosmetic reads as
 * a distinct premium item rather than a recolored border.
 *
 * Pure data + resolver (no SVG imports) so tests can pin full catalog
 * coverage without pulling in react-native-svg. Unknown / future-seeded ids
 * fall back by rarity: common → simple ring, rare → neonCircuit,
 * epic → crystal, legendary → gilded.
 */
import { COLORS } from '../../constants';
import { getFrame, resolveLegacyCosmeticId } from '../../data/cosmetics';

export type FrameDesign =
  | 'simple'
  | 'bronzeBand'
  | 'silverBand'
  | 'goldBand'
  | 'diamondRing'
  | 'laurel'
  | 'gilded'
  | 'neonCircuit'
  | 'crystal'
  | 'flame'
  | 'wave'
  | 'starOrbit'
  | 'vine'
  | 'royal'
  | 'cosmic'
  | 'chrome'
  | 'holo';

export interface FrameArtSpec {
  design: FrameDesign;
  /** Primary hue for the design's gradients (#rrggbb). */
  accent: string;
}

const spec = (design: FrameDesign, accent: string): FrameArtSpec => ({ design, accent });

/** Explicit art assignment for every frame id in the catalog (incl. seeds). */
export const FRAME_ART: Record<string, FrameArtSpec> = {
  // ── Base progression rings — each metal reads as its own material ──
  default: spec('simple', COLORS.rarityCommon),
  bronze_ring: spec('bronzeBand', '#cd8a4e'),
  silver_ring: spec('silverBand', '#c3cbd9'),
  gold_ring: spec('goldBand', '#ffb800'),
  diamond_ring: spec('diamondRing', '#9fd8ff'),
  // ── Wing / mastery frames ──
  nature_frame: spec('vine', '#4caf50'),
  science_frame: spec('neonCircuit', '#39d5ff'),
  ocean_frame: spec('wave', '#29b6f6'),
  fire_frame: spec('flame', '#ff6d2a'),
  space_frame: spec('cosmic', '#7c4dff'),
  streak_30_frame: spec('flame', '#ff9500'),
  perfect_frame: spec('chrome', '#e2e8f4'),
  legend_frame: spec('laurel', '#ffb800'),
  season_champion_frame: spec('laurel', '#ffd24d'),
  golden_collector_frame: spec('gilded', '#ffb800'),
  // ── Cosmetic store ──
  starlight_frame: spec('starOrbit', '#ffe27a'),
  inferno_frame: spec('flame', '#ff3d1f'),
  aurora_borealis_frame: spec('holo', '#7dffd4'),
  crystal_frame: spec('crystal', '#8fd0ff'),
  obsidian_frame: spec('chrome', '#6b6f8a'),
  rainbow_prismatic_frame: spec('holo', '#ff5f9e'),
  steampunk_gears_frame: spec('gilded', '#d9a441'),
  digital_matrix_frame: spec('neonCircuit', '#39ff8e'),
  golden_crown_frame: spec('royal', '#a8202c'),
  celestial_halo_frame: spec('starOrbit', '#fff1b8'),
  // ── Rotating shop / packs / bundles ──
  frame_celestial: spec('cosmic', '#9fa8ff'),
  frame_dragonscale: spec('flame', '#3ddc84'),
  frame_frozen_ivy: spec('vine', '#7fd8e8'),
  frame_champion_exclusive: spec('laurel', '#ffd24d'),
  frame_royal_legendary: spec('royal', '#c8102e'),
  frame_whale_legendary: spec('wave', '#3f7bff'),
  frame_whale_diamond: spec('crystal', '#a8e6ff'),
  frame_event_exclusive: spec('starOrbit', '#ff2d95'),
  frame_season_exclusive: spec('gilded', '#c84dff'),
  frame_super_bundle: spec('chrome', '#9aa6ff'),
  frame_diamond_epic: spec('crystal', '#9fd8ff'),
  frame_diamond_legendary: spec('crystal', '#cfeeff'),
  frame_platinum_epic: spec('chrome', '#cdd6e8'),
  frame_platinum_legendary: spec('chrome', '#e6ecf8'),
  frame_platinum_mythic: spec('holo', '#cdd6ff'),
  frame_vip_exclusive: spec('gilded', '#ff2d95'),
  frame_gold_mega: spec('gilded', '#ffc63a'),
  frame_diamond_mega: spec('crystal', '#b5e6ff'),
  frame_legendary_ultimate: spec('holo', '#ffb800'),
  // ── Event exclusives ──
  speed_demon_frame: spec('neonCircuit', '#ffd93b'),
  gravity_flip_crown_frame: spec('royal', '#5e35b1'),
  nature_bloom_frame: spec('vine', '#58c15e'),
  cosmic_frame: spec('cosmic', '#c84dff'),
  // ── Prestige ──
  prestige_bronze: spec('bronzeBand', '#cd8a4e'),
  prestige_silver: spec('silverBand', '#c9d2e0'),
  prestige_diamond: spec('diamondRing', '#bfe3ff'),
  // ── Referrals ──
  frame_social_butterfly: spec('vine', '#ff77c8'),
  frame_referral_champion: spec('laurel', '#ffcf5e'),
  // ── VIP streak ──
  vip_silver: spec('chrome', '#c9d2e0'),
  vip_gold: spec('gilded', '#ffc63a'),
  // ── Seasonal quests ──
  spring_bloom_frame: spec('vine', '#6ecf72'),
  solar_expedition_frame: spec('starOrbit', '#ffb800'),
  harvest_chronicle_frame: spec('vine', '#d9a441'),
  frost_legacy_frame: spec('crystal', '#a8dcff'),
  // ── Grand challenges ──
  frame_legendary: spec('laurel', '#ffb800'),
  frame_speed: spec('neonCircuit', '#39d5ff'),
  // ── Season pass ──
  frame_season_bronze: spec('bronzeBand', '#cd8a4e'),
  frame_season_champion: spec('laurel', '#ffd24d'),
  // ── Seasonal wheels ──
  frame_cherry_blossom: spec('vine', '#ffa5c8'),
  frame_beach_sunset: spec('wave', '#ff9550'),
  frame_golden_harvest: spec('vine', '#e8b13f'),
  frame_winter_frost: spec('crystal', '#bfe9ff'),
  // ── Login calendar ──
  login_21_frame: spec('starOrbit', '#7de0ff'),
  // ── Star milestones ──
  frame_bronze_star: spec('starOrbit', '#cd8a4e'),
  frame_silver_star: spec('starOrbit', '#c9d2e0'),
  frame_gold_star: spec('starOrbit', '#ffd24d'),
};

/** Rarity fallback for ids not (yet) in the explicit map. */
const RARITY_FALLBACK: Record<string, FrameArtSpec> = {
  common: spec('simple', COLORS.rarityCommon),
  rare: spec('neonCircuit', COLORS.rarityRare),
  epic: spec('crystal', COLORS.rarityEpic),
  legendary: spec('gilded', COLORS.rarityLegendary),
};

/** Resolve the art spec for any frame id (legacy ids + unknowns included). */
export function resolveFrameArt(frameId: string): FrameArtSpec {
  const id = resolveLegacyCosmeticId(frameId);
  const explicit = FRAME_ART[id];
  if (explicit) return explicit;
  const rarity = getFrame(id)?.rarity;
  return (rarity && RARITY_FALLBACK[rarity]) || RARITY_FALLBACK.common;
}
