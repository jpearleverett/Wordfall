/**
 * Seasonal Gacha Wheel Variants
 *
 * 4 seasonal wheel themes that replace the standard Mystery Wheel during
 * their respective months. Each has 10 segments with 1-2 exclusive cosmetic
 * rewards in rare/epic slots and slightly more generous odds (15% rare+ vs
 * standard 12%).
 *
 * Season schedule: Spring (Mar-May), Summer (Jun-Aug), Autumn (Sep-Nov), Winter (Dec-Feb)
 */

import { WheelSegment, WHEEL_SEGMENTS } from './mysteryWheel';

// ─── Seasonal Wheel Definitions ─────────────────────────────────────────────

const SPRING_WHEEL: WheelSegment[] = [
  {
    id: 'spring_coins_small',
    label: '75 Coins',
    icon: '\u{1F33C}',
    reward: { coins: 75 },
    weight: 20,
    color: '#90ee90',
    rarity: 'common',
  },
  {
    id: 'spring_coins_medium',
    label: '200 Coins',
    icon: '\u{1F33B}',
    reward: { coins: 200 },
    weight: 14,
    color: '#98fb98',
    rarity: 'common',
  },
  {
    id: 'spring_hints',
    label: '3 Hints',
    icon: '\u{1F337}',
    reward: { hints: 3 },
    weight: 16,
    color: '#ffb6c1',
    rarity: 'common',
  },
  {
    id: 'spring_booster',
    label: 'Shuffle',
    icon: '\u{1F500}',
    reward: { booster: 'shuffleFiller' },
    weight: 11,
    color: '#dda0dd',
    rarity: 'uncommon',
  },
  {
    id: 'spring_gems',
    label: '8 Gems',
    icon: '\u{1F48E}',
    reward: { gems: 8 },
    weight: 10,
    color: '#87ceeb',
    rarity: 'uncommon',
  },
  {
    id: 'spring_booster_preview',
    label: 'Preview',
    icon: '\u{1F441}\uFE0F',
    reward: { booster: 'boardPreview' },
    weight: 7,
    color: '#b0e0e6',
    rarity: 'uncommon',
  },
  {
    id: 'spring_blossom_frame',
    label: 'Blossom Frame',
    icon: '\u{1F338}',
    reward: { cosmetic: 'frame_cherry_blossom' },
    weight: 6,
    color: '#ff69b4',
    rarity: 'rare',
  },
  {
    id: 'spring_rare_tile',
    label: 'Rare Tile!',
    icon: '\u{2B50}',
    reward: { rareTile: true },
    weight: 5,
    color: '#ffd700',
    rarity: 'rare',
  },
  {
    id: 'spring_garden_title',
    label: 'Garden Master',
    icon: '\u{1F33A}',
    reward: { cosmetic: 'title_garden_master', gems: 15 },
    weight: 4,
    color: '#32cd32',
    rarity: 'epic',
  },
  {
    id: 'spring_xp_boost',
    label: '2x XP!',
    icon: '\u{1F680}',
    reward: { xpMultiplier: { multiplier: 2, durationMinutes: 30 } },
    weight: 7,
    color: '#ff9f43',
    rarity: 'uncommon',
  },
];

const SUMMER_WHEEL: WheelSegment[] = [
  {
    id: 'summer_coins_small',
    label: '100 Coins',
    icon: '\u{1F31E}',
    reward: { coins: 100 },
    weight: 20,
    color: '#f4a460',
    rarity: 'common',
  },
  {
    id: 'summer_coins_medium',
    label: '250 Coins',
    icon: '\u{1FA99}',
    reward: { coins: 250 },
    weight: 14,
    color: '#ffa500',
    rarity: 'common',
  },
  {
    id: 'summer_hints',
    label: '2 Hints',
    icon: '\u{1F4A1}',
    reward: { hints: 2 },
    weight: 16,
    color: '#87ceeb',
    rarity: 'common',
  },
  {
    id: 'summer_booster',
    label: 'Shuffle',
    icon: '\u{1F500}',
    reward: { booster: 'shuffleFiller' },
    weight: 11,
    color: '#00bfff',
    rarity: 'uncommon',
  },
  {
    id: 'summer_gems',
    label: '6 Gems',
    icon: '\u{1F48E}',
    reward: { gems: 6 },
    weight: 10,
    color: '#40e0d0',
    rarity: 'uncommon',
  },
  {
    id: 'summer_booster_freeze',
    label: 'Freeze',
    icon: '\u2744\uFE0F',
    reward: { booster: 'freezeColumn' },
    weight: 7,
    color: '#add8e6',
    rarity: 'uncommon',
  },
  {
    id: 'summer_beach_frame',
    label: 'Beach Frame',
    icon: '\u{1F3D6}\uFE0F',
    reward: { cosmetic: 'frame_beach_sunset' },
    weight: 6,
    color: '#ff6347',
    rarity: 'rare',
  },
  {
    id: 'summer_rare_tile',
    label: 'Rare Tile!',
    icon: '\u{2B50}',
    reward: { rareTile: true },
    weight: 5,
    color: '#ffd700',
    rarity: 'rare',
  },
  {
    id: 'summer_sun_title',
    label: 'Sun Seeker',
    icon: '\u2600\uFE0F',
    reward: { cosmetic: 'title_sun_seeker', gems: 15 },
    weight: 4,
    color: '#ff4500',
    rarity: 'epic',
  },
  {
    id: 'summer_mystery_box',
    label: 'Mystery Box',
    icon: '\u{1F381}',
    reward: { mysteryBox: true },
    weight: 7,
    color: '#ff69b4',
    rarity: 'uncommon',
  },
];

const AUTUMN_WHEEL: WheelSegment[] = [
  {
    id: 'autumn_coins_small',
    label: '60 Coins',
    icon: '\u{1F342}',
    reward: { coins: 60 },
    weight: 19,
    color: '#d2691e',
    rarity: 'common',
  },
  {
    id: 'autumn_coins_medium',
    label: '175 Coins',
    icon: '\u{1FA99}',
    reward: { coins: 175 },
    weight: 14,
    color: '#cd853f',
    rarity: 'common',
  },
  {
    id: 'autumn_hints',
    label: '3 Hints',
    icon: '\u{1F4A1}',
    reward: { hints: 3 },
    weight: 15,
    color: '#b8860b',
    rarity: 'common',
  },
  {
    id: 'autumn_booster',
    label: 'Preview',
    icon: '\u{1F441}\uFE0F',
    reward: { booster: 'boardPreview' },
    weight: 10,
    color: '#8b4513',
    rarity: 'uncommon',
  },
  {
    id: 'autumn_gems',
    label: '7 Gems',
    icon: '\u{1F48E}',
    reward: { gems: 7 },
    weight: 9,
    color: '#daa520',
    rarity: 'uncommon',
  },
  {
    id: 'autumn_booster_shuffle',
    label: 'Shuffle',
    icon: '\u{1F500}',
    reward: { booster: 'shuffleFiller' },
    weight: 7,
    color: '#a0522d',
    rarity: 'uncommon',
  },
  {
    id: 'autumn_harvest_frame',
    label: 'Harvest Frame',
    icon: '\u{1F33E}',
    reward: { cosmetic: 'frame_golden_harvest' },
    weight: 7,
    color: '#ff8c00',
    rarity: 'rare',
  },
  {
    id: 'autumn_rare_tile',
    label: 'Rare Tile!',
    icon: '\u{2B50}',
    reward: { rareTile: true },
    weight: 7,
    color: '#ffd700',
    rarity: 'rare',
  },
  {
    id: 'autumn_leaf_title',
    label: 'Leaf Collector',
    icon: '\u{1F341}',
    reward: { cosmetic: 'title_leaf_collector', gems: 20 },
    weight: 4,
    color: '#ff4500',
    rarity: 'epic',
  },
  {
    id: 'autumn_mystery_box',
    label: 'Mystery Box',
    icon: '\u{1F381}',
    reward: { mysteryBox: true },
    weight: 8,
    color: '#dc143c',
    rarity: 'uncommon',
  },
];

const WINTER_WHEEL: WheelSegment[] = [
  {
    id: 'winter_coins_small',
    label: '75 Coins',
    icon: '\u2744\uFE0F',
    reward: { coins: 75 },
    weight: 18,
    color: '#b0c4de',
    rarity: 'common',
  },
  {
    id: 'winter_coins_medium',
    label: '200 Coins',
    icon: '\u{1FA99}',
    reward: { coins: 200 },
    weight: 13,
    color: '#4682b4',
    rarity: 'common',
  },
  {
    id: 'winter_hints',
    label: '3 Hints',
    icon: '\u{1F4A1}',
    reward: { hints: 3 },
    weight: 15,
    color: '#5f9ea0',
    rarity: 'common',
  },
  {
    id: 'winter_booster',
    label: 'Freeze',
    icon: '\u2744\uFE0F',
    reward: { booster: 'freezeColumn' },
    weight: 10,
    color: '#00ced1',
    rarity: 'uncommon',
  },
  {
    id: 'winter_gems',
    label: '8 Gems',
    icon: '\u{1F48E}',
    reward: { gems: 8 },
    weight: 9,
    color: '#1e90ff',
    rarity: 'uncommon',
  },
  {
    id: 'winter_booster_preview',
    label: 'Preview',
    icon: '\u{1F441}\uFE0F',
    reward: { booster: 'boardPreview' },
    weight: 7,
    color: '#6495ed',
    rarity: 'uncommon',
  },
  {
    id: 'winter_frost_frame',
    label: 'Frost Frame',
    icon: '\u{1F328}\uFE0F',
    reward: { cosmetic: 'frame_winter_frost' },
    weight: 6,
    color: '#e0ffff',
    rarity: 'rare',
  },
  {
    id: 'winter_rare_tile',
    label: 'Rare Tile!',
    icon: '\u{2B50}',
    reward: { rareTile: true },
    weight: 5,
    color: '#ffd700',
    rarity: 'rare',
  },
  {
    id: 'winter_wonderland',
    label: 'Winter Wonderland!',
    icon: '\u{1F384}',
    reward: { gems: 50, cosmetic: 'deco_winter_wonderland' },
    weight: 2,
    color: '#ff0000',
    rarity: 'legendary',
  },
  {
    id: 'winter_xp_boost',
    label: '2x XP!',
    icon: '\u{1F680}',
    reward: { xpMultiplier: { multiplier: 2, durationMinutes: 30 } },
    weight: 15,
    color: '#ff9f43',
    rarity: 'common',
  },
];

// ─── Registry ───────────────────────────────────────────────────────────────

export const SEASONAL_WHEELS: Record<string, WheelSegment[]> = {
  spring_wheel: SPRING_WHEEL,
  summer_wheel: SUMMER_WHEEL,
  autumn_wheel: AUTUMN_WHEEL,
  winter_wheel: WINTER_WHEEL,
};

// ─── Season Detection ───────────────────────────────────────────────────────

type SeasonKey = 'spring_wheel' | 'summer_wheel' | 'autumn_wheel' | 'winter_wheel';

function getSeasonForMonth(month: number): SeasonKey | null {
  // month is 0-indexed (0 = Jan)
  if (month >= 2 && month <= 4) return 'spring_wheel';   // Mar-May
  if (month >= 5 && month <= 7) return 'summer_wheel';    // Jun-Aug
  if (month >= 8 && month <= 10) return 'autumn_wheel';   // Sep-Nov
  if (month === 11 || month <= 1) return 'winter_wheel';  // Dec-Feb
  return null;
}

/**
 * Returns the active wheel segments for the given date.
 * During seasonal months, returns the themed wheel with exclusive rewards.
 * Otherwise returns the standard wheel segments.
 */
export function getActiveWheel(date?: Date): {
  segments: WheelSegment[];
  seasonId: string | null;
} {
  const d = date ?? new Date();
  const month = d.getMonth();
  const seasonKey = getSeasonForMonth(month);

  if (seasonKey && SEASONAL_WHEELS[seasonKey]) {
    return {
      segments: SEASONAL_WHEELS[seasonKey],
      seasonId: seasonKey,
    };
  }

  return {
    segments: WHEEL_SEGMENTS,
    seasonId: null,
  };
}
