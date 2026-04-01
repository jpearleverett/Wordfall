/**
 * Coin Shop — Consumable Items (Coin Sinks)
 *
 * Gives players meaningful ways to spend hoarded coins on gameplay consumables,
 * temporary effects, and cosmetic rentals. Daily limits prevent hoarding exploits
 * while keeping the economy flowing.
 */

export interface CoinShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  costCoins: number;
  reward: {
    type: 'booster' | 'hint' | 'undo' | 'temporary_effect' | 'cosmetic_rental';
    boosterType?: 'wildcardTile' | 'spotlight' | 'smartShuffle';
    amount?: number;
    durationMinutes?: number;
    effectId?: string;
  };
  category: 'boosters' | 'consumables' | 'temporary';
  dailyLimit?: number;
}

export const COIN_SHOP_ITEMS: CoinShopItem[] = [
  // ─── Consumables ───────────────────────────────────────────────────────────
  {
    id: 'coin_hint_1',
    name: '1 Hint Token',
    description: 'Reveals the next word on the board.',
    icon: '💡',
    costCoins: 100,
    reward: { type: 'hint', amount: 1 },
    category: 'consumables',
    dailyLimit: 5,
  },
  {
    id: 'coin_hint_3',
    name: '3 Hint Tokens',
    description: 'A bundle of hints for tricky puzzles.',
    icon: '💡',
    costCoins: 250,
    reward: { type: 'hint', amount: 3 },
    category: 'consumables',
    dailyLimit: 3,
  },
  {
    id: 'coin_undo_1',
    name: '1 Undo Token',
    description: 'Take back your last move.',
    icon: '↩️',
    costCoins: 100,
    reward: { type: 'undo', amount: 1 },
    category: 'consumables',
    dailyLimit: 5,
  },
  {
    id: 'coin_undo_3',
    name: '3 Undo Tokens',
    description: 'A bundle of undos for when you need a do-over.',
    icon: '↩️',
    costCoins: 250,
    reward: { type: 'undo', amount: 3 },
    category: 'consumables',
    dailyLimit: 3,
  },

  // ─── Boosters ──────────────────────────────────────────────────────────────
  {
    id: 'coin_spotlight',
    name: 'Spotlight Booster',
    description: 'Highlights a word on the board.',
    icon: '👁️',
    costCoins: 200,
    reward: { type: 'booster', boosterType: 'spotlight', amount: 1 },
    category: 'boosters',
    dailyLimit: 3,
  },
  {
    id: 'coin_shuffle',
    name: 'Smart Shuffle',
    description: 'Randomizes filler letters for fresh possibilities.',
    icon: '🔀',
    costCoins: 200,
    reward: { type: 'booster', boosterType: 'smartShuffle', amount: 1 },
    category: 'boosters',
    dailyLimit: 3,
  },
  {
    id: 'coin_wildcard',
    name: 'Wildcard Tile',
    description: 'Place a tile that matches any letter.',
    icon: '⭐',
    costCoins: 300,
    reward: { type: 'booster', boosterType: 'wildcardTile', amount: 1 },
    category: 'boosters',
    dailyLimit: 2,
  },

  // ─── Temporary Effects ─────────────────────────────────────────────────────
  {
    id: 'coin_double_xp',
    name: '2x XP (30 min)',
    description: 'Double your XP earned for the next 30 minutes.',
    icon: '⚡',
    costCoins: 500,
    reward: { type: 'temporary_effect', durationMinutes: 30, effectId: 'double_xp' },
    category: 'temporary',
    dailyLimit: 1,
  },
  {
    id: 'coin_lucky_charm',
    name: 'Lucky Charm (1 hr)',
    description: '+10% rare tile drop rate for the next hour.',
    icon: '🍀',
    costCoins: 750,
    reward: { type: 'temporary_effect', durationMinutes: 60, effectId: 'lucky_charm' },
    category: 'temporary',
    dailyLimit: 1,
  },
  {
    id: 'coin_theme_rental',
    name: 'Premium Theme (24h)',
    description: 'Rent a premium visual theme for 24 hours.',
    icon: '🎨',
    costCoins: 1000,
    reward: { type: 'cosmetic_rental', durationMinutes: 1440, effectId: 'premium_theme_rental' },
    category: 'temporary',
    dailyLimit: 1,
  },
];

/**
 * Check whether a coin shop item can be purchased given today's purchase counts.
 * Returns true if the item exists and the daily limit has not been reached.
 */
export function canPurchaseCoinItem(
  itemId: string,
  purchasesToday: Record<string, number>,
): boolean {
  const item = COIN_SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return false;

  if (item.dailyLimit !== undefined) {
    const todayCount = purchasesToday[itemId] ?? 0;
    if (todayCount >= item.dailyLimit) return false;
  }

  return true;
}

/**
 * Filter coin shop items by category.
 */
export function getCoinShopByCategory(category: string): CoinShopItem[] {
  return COIN_SHOP_ITEMS.filter(item => item.category === category);
}
