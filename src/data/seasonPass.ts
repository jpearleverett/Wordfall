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

// ─── Season numbering + season-scoped cosmetic ids ─────────────────────────

/** Season epoch — season 1 starts Jan 1 2026 UTC; each season is 30 days. */
const SEASON_EPOCH_MS = Date.UTC(2026, 0, 1);
const MS_PER_SEASON = 30 * 24 * 60 * 60 * 1000;

/** 1-based season number for `now` (clamped to 1 for pre-epoch clocks). */
export function getCurrentSeasonNumber(now: number = Date.now()): number {
  return Math.max(1, Math.floor((now - SEASON_EPOCH_MS) / MS_PER_SEASON) + 1);
}

/**
 * Season-scope a premium cosmetic id. Season 1 keeps the original unsuffixed
 * ids (players already own them under those ids); later seasons append
 * `_s{n}` so each season's track mints a DISTINCT ownership id instead of
 * re-selling the exact cosmetic a season-1 finisher already owns.
 * `data/cosmetics.ts` resolves the suffixed ids back to the base art/rarity
 * with a season-decorated display name.
 */
export function seasonCosmeticId(baseId: string, seasonNumber: number): string {
  return seasonNumber <= 1 ? baseId : `${baseId}_s${seasonNumber}`;
}

// ─── 50 Tier Definitions ────────────────────────────────────────────────────

export const MAX_SEASON_TIER = 50;

function isMilestone(tier: number): boolean {
  return tier % 5 === 0;
}

function buildFreeReward(tier: number): PassReward {
  if (isMilestone(tier)) {
    // Milestone free rewards are bigger (coin rewards nerfed ~20% from original)
    if (tier === 5) return { type: 'coins', amount: 240, label: '240 Coins', icon: '\u{1FA99}' };
    if (tier === 10) return { type: 'booster', amount: 2, label: '2 Boosters', icon: '\u{1F500}' };
    if (tier === 15) return { type: 'coins', amount: 400, label: '400 Coins', icon: '\u{1FA99}' };
    if (tier === 20) return { type: 'hints', amount: 8, label: '8 Hints', icon: '\u{1F4A1}' };
    if (tier === 25) return { type: 'coins', amount: 600, label: '600 Coins', icon: '\u{1FA99}' };
    if (tier === 30) return { type: 'mystery_box', amount: 1, label: 'Mystery Box', icon: '\u{1F381}' };
    if (tier === 35) return { type: 'booster', amount: 3, label: '3 Boosters', icon: '\u{1F500}' };
    if (tier === 40) return { type: 'hints', amount: 12, label: '12 Hints', icon: '\u{1F4A1}' };
    if (tier === 45) return { type: 'coins', amount: 800, label: '800 Coins', icon: '\u{1FA99}' };
    if (tier === 50) return { type: 'mystery_box', amount: 2, label: '2 Mystery Boxes', icon: '\u{1F381}' };
  }

  // Regular tiers alternate between coins, hints, and boosters (~20% nerf on coins)
  const cycle = tier % 3;
  if (cycle === 1) {
    const amount = Math.round((40 + tier * 4) / 5) * 5; // ~20% less than original
    return { type: 'coins', amount, label: `${amount} Coins`, icon: '\u{1FA99}' };
  }
  if (cycle === 2) {
    const amount = 1 + Math.floor(tier / 12);
    return { type: 'hints', amount, label: `${amount} Hint${amount > 1 ? 's' : ''}`, icon: '\u{1F4A1}' };
  }
  return { type: 'booster', amount: 1, label: '1 Booster', icon: '\u{1F500}' };
}

function buildPremiumReward(tier: number, seasonNumber: number): PassReward {
  // Tier 50: legendary set (frame + title + decoration)
  if (tier === 50) {
    return {
      type: 'cosmetic',
      cosmeticId: seasonCosmeticId('set_season_legend', seasonNumber),
      label: 'Legendary Season Set (Frame + Title + Decoration)',
      icon: '\u{1F451}',
    };
  }

  // Exclusive cosmetics at milestone tiers 10, 20, 30, 40
  if (tier === 10) {
    return {
      type: 'cosmetic',
      cosmeticId: seasonCosmeticId('frame_season_bronze', seasonNumber),
      label: 'Season Bronze Frame',
      icon: '\u{1F3C5}',
    };
  }
  if (tier === 20) {
    return {
      type: 'cosmetic',
      cosmeticId: seasonCosmeticId('title_season_explorer', seasonNumber),
      label: 'Season Explorer Title',
      icon: '\u{1F3C5}',
    };
  }
  if (tier === 30) {
    return {
      type: 'cosmetic',
      cosmeticId: seasonCosmeticId('frame_season_champion', seasonNumber),
      label: 'Season Champion Frame',
      icon: '\u{1F451}',
    };
  }
  if (tier === 40) {
    return {
      type: 'cosmetic',
      cosmeticId: seasonCosmeticId('deco_season_master', seasonNumber),
      label: 'Season Master Decoration',
      icon: '\u{2728}',
    };
  }

  // Premium-exclusive gems at every 5th tier (non-cosmetic milestones)
  if (isMilestone(tier)) {
    if (tier === 5) return { type: 'gems', amount: 15, label: '15 Gems', icon: '\u{1F48E}' };
    if (tier === 15) return { type: 'gems', amount: 20, label: '20 Gems', icon: '\u{1F48E}' };
    if (tier === 25) return { type: 'gems', amount: 25, label: '25 Gems', icon: '\u{1F48E}' };
    if (tier === 35) return { type: 'gems', amount: 25, label: '25 Gems', icon: '\u{1F48E}' };
    if (tier === 45) return { type: 'gems', amount: 30, label: '30 Gems', icon: '\u{1F48E}' };
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
    const cosmeticId = seasonCosmeticId(`season_deco_${tier}`, seasonNumber);
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

/**
 * Build the 50-tier ladder for a given season. Only the premium cosmetic
 * IDS vary by season (see seasonCosmeticId) — XP curve, currency amounts and
 * labels are identical across seasons.
 */
export function buildSeasonPassTiers(seasonNumber: number): SeasonPassTier[] {
  return Array.from({ length: MAX_SEASON_TIER }, (_, i) => {
    const level = i + 1;
    return {
      level,
      xpRequired: xpForTier(level),
      freeReward: buildFreeReward(level),
      premiumReward: buildPremiumReward(level, seasonNumber),
    };
  });
}

/**
 * The CURRENT season's ladder. Evaluated at module load — a season rollover
 * mid-session keeps serving the old season's cosmetic ids until the next
 * app start, which is harmless: the rotation reset itself (seasonRotation)
 * also lands on app foreground, and cosmetics.ts resolves any season's
 * suffixed ids regardless.
 */
export const SEASON_PASS_TIERS: SeasonPassTier[] =
  buildSeasonPassTiers(getCurrentSeasonNumber());

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
  return MAX_SEASON_TIER; // Max tier
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

  if (tier >= MAX_SEASON_TIER) {
    return { current: 0, required: 0, percent: 100 };
  }

  const required = SEASON_PASS_TIERS[tier].xpRequired;
  const current = Math.max(0, xp - consumed);
  const percent = Math.min(100, Math.round((current / required) * 100));

  return { current, required, percent };
}

/**
 * Total XP consumed by completing tiers 1..tier (the XP "boundary" at which
 * `getSeasonPassTier` first reports that tier). Clamped to the 50-tier
 * ladder.
 */
export function cumulativeXpForTier(tier: number): number {
  const capped = Math.max(0, Math.min(Math.floor(tier), MAX_SEASON_TIER));
  let total = 0;
  for (let i = 0; i < capped; i++) {
    total += SEASON_PASS_TIERS[i].xpRequired;
  }
  return total;
}

/**
 * XP needed from `currentXP` to land EXACTLY on the boundary `skips` tiers
 * ahead — the amount the gem tier-skip purchase grants. Partial progress
 * into the current tier counts toward the first skip (a skip completes the
 * tier in progress, it does not add a full tier's XP on top). Returns 0 at
 * or past the tier-50 ceiling, and never a negative number.
 */
export function xpNeededForTierSkips(currentXP: number, skips: number): number {
  const safeXP = Math.max(0, currentXP);
  const currentTier = getSeasonPassTier(safeXP);
  const targetTier = Math.min(currentTier + Math.max(0, Math.floor(skips)), MAX_SEASON_TIER);
  return Math.max(0, cumulativeXpForTier(targetTier) - safeXP);
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
  const now = Date.now();
  const seasonIndex = Math.floor((now - SEASON_EPOCH_MS) / MS_PER_SEASON);
  const seasonNumber = getCurrentSeasonNumber(now);

  const startMs = SEASON_EPOCH_MS + seasonIndex * MS_PER_SEASON;
  const endMs = startMs + MS_PER_SEASON;

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
