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

// ─── Flash Sale System ─────────────────────────────────────────────────────

export interface FlashSale {
  /** Product ID from the shop catalog */
  productId: string;
  /** Discount percentage (40-60) */
  discountPercent: number;
  /** Original price in USD */
  originalPrice: number;
  /** Discounted sale price in USD */
  salePrice: number;
  /** Display string for original price */
  originalPriceDisplay: string;
  /** Display string for sale price */
  salePriceDisplay: string;
  /** When the flash sale expires (end of day UTC) */
  expiresAt: Date;
}

interface FlashSaleCandidate {
  productId: string;
  name: string;
  priceUSD: number;
  discountPercent: number;
}

const FLASH_SALE_CANDIDATES: FlashSaleCandidate[] = [
  { productId: 'starter_pack', name: 'Starter Pack', priceUSD: 1.99, discountPercent: 50 },
  { productId: 'adventurer_pack', name: 'Adventurer Pack', priceUSD: 3.99, discountPercent: 40 },
  { productId: 'explorer_bundle', name: 'Explorer Bundle', priceUSD: 6.99, discountPercent: 45 },
  { productId: 'hint_bundle_25', name: '25 Hints', priceUSD: 1.99, discountPercent: 50 },
  { productId: 'undo_bundle_25', name: '25 Undos', priceUSD: 1.99, discountPercent: 50 },
  { productId: 'gems_250', name: '250 Gems', priceUSD: 4.99, discountPercent: 40 },
  { productId: 'gems_500', name: '500 Gems', priceUSD: 9.99, discountPercent: 45 },
  { productId: 'booster_crate', name: 'Booster Crate', priceUSD: 4.99, discountPercent: 50 },
  { productId: 'champion_pack', name: 'Champion Pack', priceUSD: 14.99, discountPercent: 40 },
  { productId: 'chapter_bundle', name: 'Chapter Bundle', priceUSD: 2.99, discountPercent: 60 },
  { productId: 'daily_value_pack', name: 'Daily Value Pack', priceUSD: 0.99, discountPercent: 50 },
  { productId: 'gems_120', name: '120 Gems', priceUSD: 2.99, discountPercent: 45 },
];

/**
 * Returns a deterministic flash sale for a given date.
 * Rotates daily through the candidate pool with 40-60% discounts.
 * Uses date-based hashing for determinism.
 */
export function getFlashSale(date: Date): FlashSale {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const ch = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  const index = Math.abs(hash) % FLASH_SALE_CANDIDATES.length;
  const candidate = FLASH_SALE_CANDIDATES[index];

  const salePrice = Math.round(candidate.priceUSD * (1 - candidate.discountPercent / 100) * 100) / 100;

  // Expires at end of day UTC
  const expiresAt = new Date(date);
  expiresAt.setUTCHours(23, 59, 59, 999);

  return {
    productId: candidate.productId,
    discountPercent: candidate.discountPercent,
    originalPrice: candidate.priceUSD,
    salePrice,
    originalPriceDisplay: `$${candidate.priceUSD.toFixed(2)}`,
    salePriceDisplay: `$${salePrice.toFixed(2)}`,
    expiresAt,
  };
}
