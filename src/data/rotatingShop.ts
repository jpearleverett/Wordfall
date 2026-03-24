/**
 * Rotating cosmetic shop — time-limited exclusive items with FOMO messaging.
 *
 * Items rotate on a deterministic schedule (seeded by date) so all players
 * see the same featured items on the same day.
 */

export interface RotatingItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'theme' | 'frame' | 'title' | 'decoration';
  rarity: 'rare' | 'epic' | 'legendary';
  gemCost: number;
  availableHours: number;
  returnsInDays: number;
}

// ─── Item pool ───────────────────────────────────────────────────────────────

const ROTATING_POOL: RotatingItem[] = [
  {
    id: 'theme_aurora',
    name: 'Aurora Borealis',
    description: 'Northern lights shimmer across every tile',
    icon: '\u{1F30C}',
    type: 'theme',
    rarity: 'legendary',
    gemCost: 200,
    availableHours: 48,
    returnsInDays: 180,
  },
  {
    id: 'frame_celestial',
    name: 'Celestial Frame',
    description: 'Stars and moons orbit your profile',
    icon: '\u2B50',
    type: 'frame',
    rarity: 'epic',
    gemCost: 100,
    availableHours: 48,
    returnsInDays: 120,
  },
  {
    id: 'title_wordsmith',
    name: 'Grand Wordsmith',
    description: 'An exclusive title for true masters',
    icon: '\u{1F4DC}',
    type: 'title',
    rarity: 'legendary',
    gemCost: 150,
    availableHours: 48,
    returnsInDays: 180,
  },
  {
    id: 'decoration_crystal_globe',
    name: 'Crystal Globe',
    description: 'A shimmering globe for your library',
    icon: '\u{1F52E}',
    type: 'decoration',
    rarity: 'epic',
    gemCost: 80,
    availableHours: 48,
    returnsInDays: 90,
  },
  {
    id: 'frame_dragonscale',
    name: 'Dragonscale Frame',
    description: 'Forged in mythical fire',
    icon: '\u{1F525}',
    type: 'frame',
    rarity: 'legendary',
    gemCost: 180,
    availableHours: 48,
    returnsInDays: 180,
  },
  {
    id: 'theme_neon_city',
    name: 'Neon City',
    description: 'Cyberpunk glow on every surface',
    icon: '\u{1F3D9}\uFE0F',
    type: 'theme',
    rarity: 'epic',
    gemCost: 120,
    availableHours: 48,
    returnsInDays: 120,
  },
  {
    id: 'decoration_enchanted_lantern',
    name: 'Enchanted Lantern',
    description: 'A softly floating lantern for your shelf',
    icon: '\u{1FA94}',
    type: 'decoration',
    rarity: 'rare',
    gemCost: 60,
    availableHours: 48,
    returnsInDays: 60,
  },
  {
    id: 'title_legend',
    name: 'Living Legend',
    description: 'They whisper your name in the halls',
    icon: '\u{1F3C6}',
    type: 'title',
    rarity: 'legendary',
    gemCost: 175,
    availableHours: 48,
    returnsInDays: 180,
  },
  {
    id: 'frame_frozen_ivy',
    name: 'Frozen Ivy Frame',
    description: 'Winter vines frame your portrait',
    icon: '\u2744\uFE0F',
    type: 'frame',
    rarity: 'rare',
    gemCost: 70,
    availableHours: 48,
    returnsInDays: 60,
  },
  {
    id: 'decoration_starfall_mobile',
    name: 'Starfall Mobile',
    description: 'Dangling stars that catch the light',
    icon: '\u{1F320}',
    type: 'decoration',
    rarity: 'epic',
    gemCost: 90,
    availableHours: 48,
    returnsInDays: 90,
  },
  {
    id: 'theme_sakura',
    name: 'Sakura Bloom',
    description: 'Petals drift across a warm twilight',
    icon: '\u{1F338}',
    type: 'theme',
    rarity: 'epic',
    gemCost: 130,
    availableHours: 48,
    returnsInDays: 120,
  },
  {
    id: 'decoration_obsidian_hourglass',
    name: 'Obsidian Hourglass',
    description: 'Time flows in dark sands',
    icon: '\u231B',
    type: 'decoration',
    rarity: 'legendary',
    gemCost: 160,
    availableHours: 48,
    returnsInDays: 180,
  },
];

// ─── Deterministic date hash (Mulberry32-style) ──────────────────────────────

function dateSeed(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = Math.imul(31, h) + dateStr.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns the 2-day window string for a given date.
 * Items rotate every 48 hours, aligned to even calendar days.
 */
function getRotationWindow(dateStr: string): string {
  const d = new Date(dateStr);
  const dayOfYear = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  const window = Math.floor(dayOfYear / 2);
  return `${d.getFullYear()}-${window}`;
}

/**
 * Get 2-3 rotating shop items for the given date string (YYYY-MM-DD).
 */
export function getCurrentRotatingItems(date: string): RotatingItem[] {
  const windowKey = getRotationWindow(date);
  const seed = dateSeed(windowKey);
  const rng = mulberry32(seed);

  // Pick 3 items without replacement
  const pool = [...ROTATING_POOL];
  const count = rng() < 0.4 ? 2 : 3; // 40% chance of 2, 60% chance of 3
  const picked: RotatingItem[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return picked;
}

/**
 * Hours remaining for items in the current rotation window.
 */
export function getTimeRemainingHours(date: string): number {
  const d = new Date(date);
  const dayOfYear = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  const windowStart = Math.floor(dayOfYear / 2) * 2;
  const windowEndDay = windowStart + 2;

  const startOfYear = new Date(d.getFullYear(), 0, 0).getTime();
  const windowEndMs = startOfYear + windowEndDay * 86_400_000;

  const remainingMs = Math.max(0, windowEndMs - d.getTime());
  return Math.ceil(remainingMs / 3_600_000);
}

/**
 * Rarity-based accent colour for UI highlights.
 */
export function getRarityColor(rarity: RotatingItem['rarity']): string {
  switch (rarity) {
    case 'rare':
      return '#5c9ead';
    case 'epic':
      return '#a855f7';
    case 'legendary':
      return '#ffd700';
  }
}
