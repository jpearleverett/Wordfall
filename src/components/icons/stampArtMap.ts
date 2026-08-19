/**
 * Seasonal-stamp id → motif name (data only, so tests can import it without
 * pulling the SVG renders through the JSX-preserving tsconfig).
 * Re-exported from iconsStamps.tsx, which owns the artwork itself.
 */
import type { GameIconName } from './GameIcon';

/**
 * Stamp id → motif. Every id in SEASONAL_ALBUMS is pinned to art matching
 * its NAME (never its stored emoji, which is what produced 'Ice Cream'
 * rendering an apple and 'Tropical' rendering a pine tree). Where a name
 * has no dedicated motif it maps to the nearest thematically-correct one
 * — e.g. 'Sun Shield' → parasol, 'Scarecrow' → corn field.
 * `stampArtCoverage.test.ts` fails if a stamp id is missing or unknown.
 */
export const STAMP_ICON_BY_ID: Record<string, GameIconName> = {
  // ── Spring 2026 ──
  sp26_1: 'stampBlossom',      // First Bloom
  sp26_2: 'stampRainCloud',    // Spring Rain
  sp26_3: 'stampSunflower',    // Garden Party
  sp26_4: 'stampButterfly',    // Butterfly
  sp26_5: 'stampSeedling',     // Green Thumb
  sp26_6: 'stampCampfire',     // Spring Streak
  sp26_7: 'stampFern',         // Nature Walk
  sp26_8: 'stampTrophy',       // Spring Master
  sp26_9: 'stampRainCloud',    // Raindrop
  sp26_10: 'stampSongbird',    // Bird Song
  sp26_11: 'stampFlowerCrown', // Flower Crown
  sp26_12: 'stampPaw',         // Muddy Paws
  sp26_13: 'stampSunrise',     // Fresh Start
  sp26_14: 'stampBee',         // Pollen Trail
  sp26_15: 'stampDewdrop',     // Dewdrop
  sp26_16: 'stampFern',        // Vine Climber
  sp26_17: 'stampBlossom',     // Cherry Tree
  sp26_18: 'stampUmbrella',    // April Showers
  sp26_19: 'stampSunflower',   // May Bloom
  sp26_20: 'stampCrown',       // Spring Legend
  // ── Summer 2026 ──
  su26_1: 'stampSun',          // Sunshine
  su26_2: 'stampParasol',      // Beach Day
  su26_3: 'stampWave',         // Ocean Wave
  su26_4: 'stampIceCream',     // Ice Cream
  su26_5: 'stampStarTrail',    // Stargazer
  su26_6: 'stampHeatwave',     // Summer Heat (never a second plain sun disc)
  su26_7: 'stampPalm',         // Tropical
  su26_8: 'stampCrown',        // Summer King
  su26_9: 'stampSandcastle',   // Sandcastle
  su26_10: 'stampFireflyJar',  // Firefly
  su26_11: 'stampWaterfall',   // Waterfall
  su26_12: 'stampSailboat',    // Sunset Sail
  su26_13: 'stampBeachBall',   // Pool Party
  su26_14: 'stampSandcastle',  // Hot Sand
  su26_15: 'stampCoral',       // Coral Reef
  su26_16: 'stampSurfboard',   // Surf Rider
  su26_17: 'stampLemonade',    // Lemonade
  su26_18: 'stampParasol',     // Sun Shield
  su26_19: 'stampWave',        // Tidal Wave
  su26_20: 'stampTrophy',      // Summer Legend
  // ── Autumn 2026 ──
  au26_1: 'stampAutumnLeaf',   // Falling Leaf
  au26_2: 'stampPumpkin',      // Harvest
  au26_3: 'stampCandle',       // Cozy Night
  au26_4: 'stampCocoa',        // Pumpkin Spice
  au26_5: 'stampMist',         // Fog Walker
  au26_6: 'stampKite',         // Autumn Wind
  au26_7: 'stampSunrise',      // Golden Hour
  au26_8: 'stampTrophy',       // Autumn Legend
  au26_9: 'stampApple',        // Apple Harvest
  au26_10: 'stampCorn',        // Scarecrow
  au26_11: 'stampAmber',       // Amber Glow
  au26_12: 'stampMushroom',    // Mushroom
  au26_13: 'stampRainCloud',   // Rainy Day
  au26_14: 'stampAcorn',       // Acorn
  au26_15: 'stampCampfire',    // Bonfire
  au26_16: 'stampAutumnLeaf',  // Crimson Leaf
  au26_17: 'stampOwl',         // Owl Night
  au26_18: 'stampCorn',        // Corn Maze
  au26_19: 'stampHarvestMoon', // Harvest Moon
  au26_20: 'stampCrown',       // Autumn Champion
  // ── Winter 2026 ──
  wi26_1: 'stampSnowflake',    // First Snow
  wi26_2: 'stampCampfire',     // Warm Hearth
  wi26_3: 'stampGift',         // Gift Giver
  wi26_4: 'stampIceCrystal',   // Ice Crystal
  wi26_5: 'stampSnowman',      // Snow Angel
  wi26_6: 'stampCrescentMoon', // Midnight
  wi26_7: 'stampCrown',        // Frost King
  wi26_8: 'stampTrophy',       // Winter Champion
  wi26_9: 'stampSnowflake',    // Snowflake
  wi26_10: 'stampCocoa',       // Hot Cocoa
  wi26_11: 'stampIceCrystal',  // Icicle
  wi26_12: 'stampSled',        // Sleigh Ride
  wi26_13: 'stampAurora',      // Northern Light
  wi26_14: 'stampSnowman',     // Snowman
  wi26_15: 'stampEvergreen',   // Pine Forest
  wi26_16: 'stampFrozenLake',  // Frozen Lake
  wi26_17: 'stampMitten',      // Wool Scarf
  wi26_18: 'stampHolly',       // Mistletoe
  wi26_19: 'stampFireworks',   // New Year
  wi26_20: 'stampCrown',       // Winter Legend
};

/** Motif name for a stamp id, or null when the id is not a seasonal stamp. */
export function stampIconName(stampId: string | undefined): GameIconName | null {
  if (!stampId) return null;
  return STAMP_ICON_BY_ID[stampId] ?? null;
}
