export interface DailyDeal {
  id: string;
  name: string;
  description: string;
  icon: string;
  originalPrice: number;
  salePrice: number;
  currency: 'coins' | 'gems';
  contents: { coins?: number; gems?: number; hintTokens?: number; cosmetic?: string };
  availableHours: number;
}

const DEAL_POOL: DailyDeal[] = [
  {
    id: 'deal_hint_pack',
    name: 'Hint Bonanza',
    description: '5 hints at 60% off!',
    icon: '\u{1F4A1}',
    originalPrice: 250,
    salePrice: 100,
    currency: 'coins',
    contents: { hintTokens: 5 },
    availableHours: 24,
  },
  {
    id: 'deal_gem_pack',
    name: 'Gem Rush',
    description: '15 gems, today only!',
    icon: '\u{1F48E}',
    originalPrice: 500,
    salePrice: 300,
    currency: 'coins',
    contents: { gems: 15 },
    availableHours: 24,
  },
  {
    id: 'deal_starter_boost',
    name: 'Power Start',
    description: 'Coins + hints bundle',
    icon: '\u{1F680}',
    originalPrice: 300,
    salePrice: 150,
    currency: 'coins',
    contents: { coins: 200, hintTokens: 3 },
    availableHours: 12,
  },
  {
    id: 'deal_rare_chance',
    name: 'Lucky Draw',
    description: 'Guaranteed rare tile!',
    icon: '\u{1F3B0}',
    originalPrice: 50,
    salePrice: 25,
    currency: 'gems',
    contents: { cosmetic: 'random_rare_tile' },
    availableHours: 24,
  },
  {
    id: 'deal_mega_coins',
    name: 'Coin Vault',
    description: '500 coins at half price',
    icon: '\u{1FA99}',
    originalPrice: 30,
    salePrice: 15,
    currency: 'gems',
    contents: { coins: 500 },
    availableHours: 24,
  },
];

/**
 * Returns a deterministic daily deal based on the date string (YYYY-MM-DD).
 * Uses a simple hash to pick from the pool.
 */
export function getDailyDeal(date: string): DailyDeal {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    const ch = date.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  const index = Math.abs(hash) % DEAL_POOL.length;
  return DEAL_POOL[index];
}

export { DEAL_POOL };
