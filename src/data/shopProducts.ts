/**
 * Shop product catalog.
 *
 * Defines all IAP products, their rewards, categories, and store product IDs.
 * Store IDs use "wordfall_" prefix to match App Store / Play Store listings.
 */

import { IAPProductId } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProductCategory = 'bundles' | 'currency' | 'consumables' | 'premium';

export interface ProductRewards {
  coins?: number;
  gems?: number;
  hintTokens?: number;
  undoTokens?: number;
  decorations?: string[];
  boosters?: { type: string; count: number }[];
  /** Flags to set (e.g. premiumPass, adsRemoved) */
  flags?: Record<string, boolean>;
  /** Daily drip duration in days (for daily value pack) */
  dripDays?: number;
  /** Daily drip rewards (awarded each day) */
  dailyDrip?: { coins?: number; gems?: number; hintTokens?: number };
}

export interface ShopProduct {
  /** Internal product ID used by the app */
  id: IAPProductId;
  /** Store product ID (Apple / Google) */
  storeProductId: string;
  name: string;
  description: string;
  /** Fallback price string when store prices aren't available */
  fallbackPrice: string;
  /** Fallback numeric price in USD */
  fallbackPriceAmount: number;
  category: ProductCategory;
  /** What the player receives on purchase */
  rewards: ProductRewards;
  /** Whether this is a one-time (non-consumable) purchase */
  isNonConsumable: boolean;
  /** Optional original price to show a discount */
  originalPrice?: string;
  icon: string;
}

// ─── Product definitions ─────────────────────────────────────────────────────

export const SHOP_PRODUCTS: ShopProduct[] = [
  // ── Bundles ──────────────────────────────────────────────────────────────
  {
    id: 'starter_pack',
    storeProductId: 'wordfall_starter_pack',
    name: 'Starter Pack',
    description: '500 Coins + 50 Gems + 10 Hints + Exclusive Decoration',
    fallbackPrice: '$1.99',
    fallbackPriceAmount: 1.99,
    category: 'bundles',
    rewards: {
      coins: 500,
      gems: 50,
      hintTokens: 10,
      decorations: ['starter_bookend'],
    },
    isNonConsumable: false,
    originalPrice: '$4.99',
    icon: '\u{1F381}',
  },
  {
    id: 'chapter_bundle',
    storeProductId: 'wordfall_chapter_bundle',
    name: 'Chapter Bundle',
    description: 'Theme decoration + 20 Gems + 10 Hints + 1 Board Preview',
    fallbackPrice: '$2.99',
    fallbackPriceAmount: 2.99,
    category: 'bundles',
    rewards: {
      gems: 20,
      hintTokens: 10,
      decorations: ['chapter_decoration'],
      boosters: [{ type: 'boardPreview', count: 1 }],
    },
    isNonConsumable: false,
    icon: '\u{1F4D6}',
  },
  {
    id: 'daily_value_pack',
    storeProductId: 'wordfall_daily_value',
    name: 'Daily Value Pack',
    description: 'Bonus rewards every day for 7 days',
    fallbackPrice: '$0.99',
    fallbackPriceAmount: 0.99,
    category: 'bundles',
    rewards: {
      dripDays: 7,
      dailyDrip: { coins: 100, gems: 5, hintTokens: 3 },
    },
    isNonConsumable: false,
    icon: '\u{1F4E6}',
  },

  // ── Consumables: Hints ───────────────────────────────────────────────────
  {
    id: 'hint_bundle_10',
    storeProductId: 'wordfall_hint_10',
    name: '10 Hints',
    description: 'A small bundle of 10 hint tokens',
    fallbackPrice: '$0.99',
    fallbackPriceAmount: 0.99,
    category: 'consumables',
    rewards: { hintTokens: 10 },
    isNonConsumable: false,
    icon: '\u{1F4A1}',
  },
  {
    id: 'hint_bundle_25',
    storeProductId: 'wordfall_hint_25',
    name: '25 Hints',
    description: 'A medium bundle of 25 hint tokens',
    fallbackPrice: '$1.99',
    fallbackPriceAmount: 1.99,
    category: 'consumables',
    rewards: { hintTokens: 25 },
    isNonConsumable: false,
    icon: '\u{1F4A1}',
  },
  {
    id: 'hint_bundle_50',
    storeProductId: 'wordfall_hint_50',
    name: '50 Hints',
    description: 'A large bundle of 50 hint tokens',
    fallbackPrice: '$2.99',
    fallbackPriceAmount: 2.99,
    category: 'consumables',
    rewards: { hintTokens: 50 },
    isNonConsumable: false,
    icon: '\u{1F4A1}',
  },

  // ── Consumables: Undos ───────────────────────────────────────────────────
  {
    id: 'undo_bundle_10',
    storeProductId: 'wordfall_undo_10',
    name: '10 Undos',
    description: 'A small bundle of 10 undo tokens',
    fallbackPrice: '$0.99',
    fallbackPriceAmount: 0.99,
    category: 'consumables',
    rewards: { undoTokens: 10 },
    isNonConsumable: false,
    icon: '\u21A9\uFE0F',
  },
  {
    id: 'undo_bundle_25',
    storeProductId: 'wordfall_undo_25',
    name: '25 Undos',
    description: 'A medium bundle of 25 undo tokens',
    fallbackPrice: '$1.99',
    fallbackPriceAmount: 1.99,
    category: 'consumables',
    rewards: { undoTokens: 25 },
    isNonConsumable: false,
    icon: '\u21A9\uFE0F',
  },
  {
    id: 'undo_bundle_50',
    storeProductId: 'wordfall_undo_50',
    name: '50 Undos',
    description: 'A large bundle of 50 undo tokens',
    fallbackPrice: '$2.99',
    fallbackPriceAmount: 2.99,
    category: 'consumables',
    rewards: { undoTokens: 50 },
    isNonConsumable: false,
    icon: '\u21A9\uFE0F',
  },

  // ── Currency: Gems ───────────────────────────────────────────────────────
  {
    id: 'gems_50',
    storeProductId: 'wordfall_gems_50',
    name: '50 Gems',
    description: 'A pouch of 50 gems',
    fallbackPrice: '$0.99',
    fallbackPriceAmount: 0.99,
    category: 'currency',
    rewards: { gems: 50 },
    isNonConsumable: false,
    icon: '\u{1F48E}',
  },
  {
    id: 'gems_250',
    storeProductId: 'wordfall_gems_250',
    name: '250 Gems',
    description: 'A chest of 250 gems',
    fallbackPrice: '$4.99',
    fallbackPriceAmount: 4.99,
    category: 'currency',
    rewards: { gems: 250 },
    isNonConsumable: false,
    icon: '\u{1F48E}',
  },
  {
    id: 'gems_500',
    storeProductId: 'wordfall_gems_500',
    name: '500 Gems',
    description: 'A vault of 500 gems',
    fallbackPrice: '$9.99',
    fallbackPriceAmount: 9.99,
    category: 'currency',
    rewards: { gems: 500 },
    isNonConsumable: false,
    icon: '\u{1F48E}',
  },

  // ── Premium ──────────────────────────────────────────────────────────────
  {
    id: 'premium_pass',
    storeProductId: 'wordfall_premium_pass',
    name: 'Premium Pass',
    description: 'Unlock premium mastery rewards this season',
    fallbackPrice: '$4.99',
    fallbackPriceAmount: 4.99,
    category: 'premium',
    rewards: { flags: { premiumPass: true } },
    isNonConsumable: true,
    icon: '\u{1F451}',
  },
  {
    id: 'ad_removal',
    storeProductId: 'wordfall_ad_removal',
    name: 'Remove Ads',
    description: 'Enjoy an ad-free experience forever',
    fallbackPrice: '$4.99',
    fallbackPriceAmount: 4.99,
    category: 'premium',
    rewards: { flags: { adsRemoved: true } },
    isNonConsumable: true,
    icon: '\u{1F6AB}',
  },
];

// ─── Lookup helpers ──────────────────────────────────────────────────────────

const productMap = new Map<string, ShopProduct>();
const storeIdToProductMap = new Map<string, ShopProduct>();

for (const product of SHOP_PRODUCTS) {
  productMap.set(product.id, product);
  storeIdToProductMap.set(product.storeProductId, product);
}

/** Get a product definition by internal ID */
export function getProductById(id: string): ShopProduct | undefined {
  return productMap.get(id);
}

/** Get a product definition by store product ID */
export function getProductByStoreId(storeId: string): ShopProduct | undefined {
  return storeIdToProductMap.get(storeId);
}

/** Get the rewards for a product by internal ID */
export function getProductRewards(id: string): ProductRewards | undefined {
  return productMap.get(id)?.rewards;
}

/** Get all products in a category */
export function getProductsByCategory(category: ProductCategory): ShopProduct[] {
  return SHOP_PRODUCTS.filter((p) => p.category === category);
}

/** Get all store product IDs for fetching from the store */
export function getAllStoreProductIds(): string[] {
  return SHOP_PRODUCTS.map((p) => p.storeProductId);
}

/** Map a store product ID back to the internal product ID */
export function storeIdToInternalId(storeId: string): IAPProductId | undefined {
  return storeIdToProductMap.get(storeId)?.id;
}

/** Map an internal product ID to the store product ID */
export function internalIdToStoreId(id: IAPProductId): string | undefined {
  return productMap.get(id)?.storeProductId;
}

/** Get all non-consumable product IDs (for restore purchases) */
export function getNonConsumableIds(): IAPProductId[] {
  return SHOP_PRODUCTS.filter((p) => p.isNonConsumable).map((p) => p.id);
}
