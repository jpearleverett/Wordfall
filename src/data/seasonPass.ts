/**
 * Season / Battle Pass System
 *
 * 30-tier pass with free and premium reward lanes. Each season lasts 30 days.
 * Players earn XP by completing puzzles, earning stars, solving dailies, and
 * achieving perfect clears. Every 5th tier is a milestone with bigger rewards.
 * Tier 30 premium gives an exclusive cosmetic frame.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PassReward {
  type: 'coins' | 'gems' | 'hints' | 'cosmetic' | 'rare_tile' | 'booster' | 'mystery_box';
  amount?: number;
  cosmeticId?: string;
  label: string;
  icon: string;
}

export interface SeasonPassTier {
  level: number;
  xpRequired: number;
  freeReward: PassReward;
  premiumReward: PassReward;
}

export interface SeasonPassState {
  seasonId: string;
  currentXP: number;
  currentTier: number;
  isPremium: boolean;
  claimedFreeTiers: number[];
  claimedPremiumTiers: number[];
  seasonStartDate: string;
  seasonEndDate: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const PREMIUM_PASS_PRICE_GEMS = 500;
export const XP_PER_PUZZLE = 100;
export const XP_PER_STAR = 50;
export const XP_PER_DAILY = 200;
export const XP_PER_PERFECT = 150;

/** Base XP for tier 1; each subsequent tier requires slightly more */
const BASE_XP_PER_TIER = 200;
const XP_GROWTH_FACTOR = 1.08;

function xpForTier(tier: number): number {
  return Math.round(BASE_XP_PER_TIER * Math.pow(XP_GROWTH_FACTOR, tier - 1));
}

// ─── 30 Tier Definitions ────────────────────────────────────────────────────

function isMilestone(tier: number): boolean {
  return tier % 5 === 0;
}

function buildFreeReward(tier: number): PassReward {
  if (isMilestone(tier)) {
    // Milestone free rewards are bigger
    if (tier === 10) return { type: 'booster', amount: 2, label: '2 Boosters', icon: '\u{1F500}' };
    if (tier === 15) return { type: 'coins', amount: 500, label: '500 Coins', icon: '\u{1FA99}' };
    if (tier === 20) return { type: 'hints', amount: 10, label: '10 Hints', icon: '\u{1F4A1}' };
    if (tier === 25) return { type: 'coins', amount: 750, label: '750 Coins', icon: '\u{1FA99}' };
    if (tier === 30) return { type: 'mystery_box', amount: 1, label: 'Mystery Box', icon: '\u{1F381}' };
    // tier 5
    return { type: 'coins', amount: 300, label: '300 Coins', icon: '\u{1FA99}' };
  }

  // Regular tiers alternate between coins, hints, and boosters
  const cycle = tier % 3;
  if (cycle === 1) {
    const amount = 50 + tier * 5;
    return { type: 'coins', amount, label: `${amount} Coins`, icon: '\u{1FA99}' };
  }
  if (cycle === 2) {
    const amount = 1 + Math.floor(tier / 10);
    return { type: 'hints', amount, label: `${amount} Hint${amount > 1 ? 's' : ''}`, icon: '\u{1F4A1}' };
  }
  return { type: 'booster', amount: 1, label: '1 Booster', icon: '\u{1F500}' };
}

function buildPremiumReward(tier: number): PassReward {
  if (tier === 30) {
    // Max tier: exclusive cosmetic frame
    return {
      type: 'cosmetic',
      cosmeticId: 'frame_season_champion',
      label: 'Season Champion Frame',
      icon: '\u{1F451}',
    };
  }

  if (isMilestone(tier)) {
    // Milestone premium rewards
    if (tier === 5) return { type: 'gems', amount: 25, label: '25 Gems', icon: '\u{1F48E}' };
    if (tier === 10) return { type: 'rare_tile', amount: 1, label: 'Rare Tile', icon: '\u{2B50}' };
    if (tier === 15) {
      return {
        type: 'cosmetic',
        cosmeticId: 'title_season_explorer',
        label: 'Season Explorer Title',
        icon: '\u{1F3C5}',
      };
    }
    if (tier === 20) return { type: 'gems', amount: 50, label: '50 Gems', icon: '\u{1F48E}' };
    if (tier === 25) return { type: 'rare_tile', amount: 2, label: '2 Rare Tiles', icon: '\u{2B50}' };
  }

  // Regular premium tiers alternate between gems, cosmetics, and rare tiles
  const cycle = tier % 4;
  if (cycle === 1) {
    const amount = 5 + Math.floor(tier / 5) * 3;
    return { type: 'gems', amount, label: `${amount} Gems`, icon: '\u{1F48E}' };
  }
  if (cycle === 2) {
    return { type: 'rare_tile', amount: 1, label: 'Rare Tile', icon: '\u{2B50}' };
  }
  if (cycle === 3) {
    const cosmeticId = `season_deco_${tier}`;
    return {
      type: 'cosmetic',
      cosmeticId,
      label: 'Season Decoration',
      icon: '\u{2728}',
    };
  }
  // cycle 0
  const amount = 8 + Math.floor(tier / 6) * 2;
  return { type: 'gems', amount, label: `${amount} Gems`, icon: '\u{1F48E}' };
}

export const SEASON_PASS_TIERS: SeasonPassTier[] = Array.from({ length: 30 }, (_, i) => {
  const level = i + 1;
  return {
    level,
    xpRequired: xpForTier(level),
    freeReward: buildFreeReward(level),
    premiumReward: buildPremiumReward(level),
  };
});

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Get the tier a player has reached based on total XP earned this season.
 * Returns 0 if not enough XP for tier 1.
 */
export function getSeasonPassTier(xp: number): number {
  let remaining = xp;
  for (let i = 0; i < SEASON_PASS_TIERS.length; i++) {
    remaining -= SEASON_PASS_TIERS[i].xpRequired;
    if (remaining < 0) return i; // 0-indexed tier count = tiers completed
  }
  return 30; // Max tier
}

/**
 * Get XP progress within the current tier.
 */
export function getXPProgress(
  xp: number,
  tier: number,
): { current: number; required: number; percent: number } {
  // XP already consumed by completed tiers
  let consumed = 0;
  for (let i = 0; i < tier && i < SEASON_PASS_TIERS.length; i++) {
    consumed += SEASON_PASS_TIERS[i].xpRequired;
  }

  if (tier >= 30) {
    return { current: 0, required: 0, percent: 100 };
  }

  const required = SEASON_PASS_TIERS[tier].xpRequired;
  const current = Math.max(0, xp - consumed);
  const percent = Math.min(100, Math.round((current / required) * 100));

  return { current, required, percent };
}

/**
 * Get the current season based on the current date.
 * Each season is 30 days. Season 1 starts on Jan 1, 2026.
 */
export function getCurrentSeason(): {
  id: string;
  startDate: string;
  endDate: string;
  name: string;
  theme: string;
} {
  const epoch = new Date('2026-01-01T00:00:00Z').getTime();
  const now = Date.now();
  const msPerSeason = 30 * 24 * 60 * 60 * 1000;
  const seasonIndex = Math.floor((now - epoch) / msPerSeason);
  const seasonNumber = Math.max(1, seasonIndex + 1);

  const startMs = epoch + seasonIndex * msPerSeason;
  const endMs = startMs + msPerSeason;

  const startDate = new Date(startMs).toISOString().split('T')[0];
  const endDate = new Date(endMs).toISOString().split('T')[0];

  // Rotate themes
  const themes = [
    { name: 'Celestial Voyage', theme: 'celestial' },
    { name: 'Ocean Depths', theme: 'ocean' },
    { name: 'Enchanted Forest', theme: 'forest' },
    { name: 'Crystal Caverns', theme: 'crystal' },
    { name: 'Solar Flare', theme: 'solar' },
    { name: 'Mystic Garden', theme: 'garden' },
  ];
  const { name, theme } = themes[seasonIndex % themes.length];

  return {
    id: `season_${seasonNumber}`,
    startDate,
    endDate,
    name: `Season ${seasonNumber}: ${name}`,
    theme,
  };
}

// ─── Default State ──────────────────────────────────────────────────────────

const currentSeason = getCurrentSeason();

export const DEFAULT_SEASON_PASS_STATE: SeasonPassState = {
  seasonId: currentSeason.id,
  currentXP: 0,
  currentTier: 0,
  isPremium: false,
  claimedFreeTiers: [],
  claimedPremiumTiers: [],
  seasonStartDate: currentSeason.startDate,
  seasonEndDate: currentSeason.endDate,
};
