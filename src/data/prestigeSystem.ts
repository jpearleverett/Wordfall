/**
 * Prestige (New Game+) system.
 *
 * Provides an endgame reset loop for players who have exhausted content.
 * Players reset to level 1 but keep cosmetics, earn permanent bonuses,
 * and unlock exclusive prestige-tier cosmetic rewards.
 *
 * This is DATA + UI only at this stage. The actual reset logic would be
 * wired in PlayerContext later.
 */

import { PrestigeState } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PermanentBonus {
  type: string;
  value: number;
}

export interface PrestigeLevel {
  level: number;        // 1, 2, 3...
  label: string;        // 'Bronze Star', 'Silver Star', etc.
  icon: string;
  requiredPlayerLevel: number; // minimum level to prestige (always 100 from last prestige)
  xpMultiplier: number; // 1.5x, 2.0x, etc.
  permanentBonuses: PermanentBonus[];
  cosmeticReward: { type: string; id: string };
}

// ─── Prestige level definitions ──────────────────────────────────────────────

export const PRESTIGE_LEVELS: PrestigeLevel[] = [
  {
    level: 1,
    label: 'Bronze Star',
    icon: '\u2B50',
    requiredPlayerLevel: 100,
    xpMultiplier: 1.5,
    permanentBonuses: [{ type: 'hint_bonus', value: 1 }],
    cosmeticReward: { type: 'frame', id: 'prestige_bronze' },
  },
  {
    level: 2,
    label: 'Silver Star',
    icon: '\u{1F31F}',
    requiredPlayerLevel: 100,
    xpMultiplier: 1.75,
    permanentBonuses: [{ type: 'coin_bonus', value: 0.25 }],
    cosmeticReward: { type: 'frame', id: 'prestige_silver' },
  },
  {
    level: 3,
    label: 'Gold Star',
    icon: '\u{1F4AB}',
    requiredPlayerLevel: 100,
    xpMultiplier: 2.0,
    permanentBonuses: [{ type: 'rare_tile_bonus', value: 0.02 }],
    cosmeticReward: { type: 'title', id: 'prestige_master' },
  },
  {
    level: 4,
    label: 'Diamond Star',
    icon: '\u2728',
    requiredPlayerLevel: 100,
    xpMultiplier: 2.5,
    permanentBonuses: [{ type: 'gem_bonus', value: 1 }],
    cosmeticReward: { type: 'frame', id: 'prestige_diamond' },
  },
  {
    level: 5,
    label: 'Legendary Star',
    icon: '\u{1F3C6}',
    requiredPlayerLevel: 100,
    xpMultiplier: 3.0,
    permanentBonuses: [{ type: 'all_bonus', value: 0.1 }],
    cosmeticReward: { type: 'decoration', id: 'prestige_legend' },
  },
];

// ─── Default state ───────────────────────────────────────────────────────────

export const DEFAULT_PRESTIGE_STATE: PrestigeState = {
  prestigeLevel: 0,
  totalPrestiges: 0,
  permanentBonuses: [],
};

// ─── Helper functions ────────────────────────────────────────────────────────

/**
 * Check if the player can prestige right now.
 * Requires reaching level 100 (from last prestige point) and not exceeding max prestige.
 */
export function canPrestige(playerLevel: number, currentPrestige: number): boolean {
  if (currentPrestige >= PRESTIGE_LEVELS.length) return false;
  const requirement = getNextPrestigeRequirement(currentPrestige);
  return playerLevel >= requirement;
}

/**
 * Get the prestige level definition for a given prestige level.
 * Returns the prestige tier data including rewards and multipliers.
 */
export function getPrestigeRewards(prestigeLevel: number): PrestigeLevel | null {
  const def = PRESTIGE_LEVELS.find((p) => p.level === prestigeLevel);
  return def ?? null;
}

/**
 * Get the cumulative XP multiplier for a given prestige level.
 * Players at prestige 0 have a 1.0x multiplier.
 */
export function getPrestigeMultiplier(prestigeLevel: number): number {
  if (prestigeLevel <= 0) return 1.0;
  const def = PRESTIGE_LEVELS.find((p) => p.level === prestigeLevel);
  return def?.xpMultiplier ?? 1.0;
}

/**
 * Get the player level required for the next prestige.
 * Always 100 levels from the effective starting point.
 */
export function getNextPrestigeRequirement(currentPrestige: number): number {
  // Each prestige resets to level 1, so the requirement is always level 100
  return 100;
}

/**
 * Get a summary of what the player keeps and loses on prestige.
 */
export function getPrestigeSummary(nextPrestigeLevel: number): {
  keeps: string[];
  loses: string[];
  gains: string[];
} {
  const def = PRESTIGE_LEVELS.find((p) => p.level === nextPrestigeLevel);
  const gains: string[] = [];

  if (def) {
    gains.push(`${def.xpMultiplier}x XP multiplier`);
    gains.push(`${def.cosmeticReward.type}: ${def.cosmeticReward.id}`);
    for (const bonus of def.permanentBonuses) {
      gains.push(`Permanent ${bonus.type} +${bonus.value}`);
    }
  }

  return {
    keeps: [
      'All cosmetics (themes, frames, titles, decorations)',
      'Achievement progress',
      'Collection progress (atlas, rare tiles, stamps)',
      'VIP subscription status',
      'All permanent prestige bonuses',
    ],
    loses: [
      'Player level (reset to 1)',
      'Star ratings per level',
      'Chapter progress',
      'Mode levels',
    ],
    gains,
  };
}
