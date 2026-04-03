/**
 * Dynamic Pricing by Player Segment
 *
 * Shows different offers to different player segments to maximize
 * conversion without alienating non-payers or under-serving whales.
 */

import {
  SpendingSegment,
  EngagementSegment,
} from '../services/playerSegmentation';
import { ShopProduct } from './shopProducts';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DynamicOffer {
  /** Product ID from shopProducts or mega bundles */
  productId: string;
  /** Discount percentage (0-70) */
  discountPercent: number;
  /** Optional badge text ("BEST VALUE", "POPULAR", "VIP EXCLUSIVE") */
  badge?: string;
  /** How long this offer is available (hours) */
  expiresInHours: number;
  /** Sort priority (lower = shown first) */
  priority: number;
}

export interface FlashSale {
  /** Product ID on sale */
  productId: string;
  /** Discount percentage (40-60) */
  discountPercent: number;
  /** Display label */
  label: string;
  /** ISO date string when the sale expires (end of the day UTC) */
  expiresAt: string;
}

// ─── Mega Bundles (for dolphins and whales) ──────────────────────────────────

export const MEGA_BUNDLES: ShopProduct[] = [
  {
    id: 'mega_bundle_gold' as any,
    storeProductId: 'wordfall_mega_gold',
    name: 'Gold Mega Bundle',
    description: '2500 Coins + 150 Gems + 25 Hints + 10 Undos + Exclusive Frame',
    fallbackPrice: '$14.99',
    fallbackPriceAmount: 14.99,
    category: 'bundles',
    rewards: {
      coins: 2500,
      gems: 150,
      hintTokens: 25,
      undoTokens: 10,
      decorations: ['frame_gold_mega'],
    },
    isNonConsumable: false,
    originalPrice: '$24.99',
    icon: '👑',
  },
  {
    id: 'mega_bundle_diamond' as any,
    storeProductId: 'wordfall_mega_diamond',
    name: 'Diamond Mega Bundle',
    description: '5000 Coins + 300 Gems + 50 Hints + 20 Undos + Diamond Frame + Title',
    fallbackPrice: '$19.99',
    fallbackPriceAmount: 19.99,
    category: 'bundles',
    rewards: {
      coins: 5000,
      gems: 300,
      hintTokens: 50,
      undoTokens: 20,
      decorations: ['frame_diamond_mega', 'title_diamond_collector'],
    },
    isNonConsumable: false,
    originalPrice: '$39.99',
    icon: '💎',
  },
  {
    id: 'mega_bundle_ultimate' as any,
    storeProductId: 'wordfall_mega_ultimate',
    name: 'Ultimate Bundle',
    description: '10000 Coins + 500 Gems + 100 Hints + 50 Undos + All Boosters + Legendary Set',
    fallbackPrice: '$29.99',
    fallbackPriceAmount: 29.99,
    category: 'bundles',
    rewards: {
      coins: 10000,
      gems: 500,
      hintTokens: 100,
      undoTokens: 50,
      boosters: [
        { type: 'wildcardTile', count: 10 },
        { type: 'spotlight', count: 10 },
        { type: 'smartShuffle', count: 10 },
      ],
      decorations: ['frame_legendary_ultimate', 'title_ultimate_solver', 'theme_legendary_neon'],
    },
    isNonConsumable: false,
    originalPrice: '$59.99',
    icon: '🔥',
  },
];

// ─── Offer Strategy Logic ────────────────────────────────────────────────────

/**
 * Returns 1-3 dynamic offers personalized to the player's spending
 * and engagement segments.
 */
export function getDynamicOffers(
  spending: SpendingSegment,
  engagement: EngagementSegment,
  playerLevel: number,
): DynamicOffer[] {
  const offers: DynamicOffer[] = [];

  // ── Lapsed players: aggressive win-back ──
  if (engagement === 'lapsed') {
    offers.push({
      productId: 'starter_pack',
      discountPercent: 70,
      badge: 'WELCOME BACK',
      expiresInHours: 48,
      priority: 1,
    });
    if (playerLevel >= 10) {
      offers.push({
        productId: 'gems_250',
        discountPercent: 50,
        badge: 'COMEBACK DEAL',
        expiresInHours: 48,
        priority: 2,
      });
    }
    return offers;
  }

  // ── At-risk / returned players: generous deals ──
  if (engagement === 'at_risk' || engagement === 'returned') {
    offers.push({
      productId: spending === 'non_payer' ? 'starter_pack' : 'chapter_bundle',
      discountPercent: 50,
      badge: 'LIMITED TIME',
      expiresInHours: 24,
      priority: 1,
    });
    if (spending !== 'non_payer') {
      offers.push({
        productId: 'gems_500',
        discountPercent: 40,
        badge: 'SPECIAL OFFER',
        expiresInHours: 24,
        priority: 2,
      });
    }
    return offers;
  }

  // ── Non-payers: low-commitment entry point ──
  if (spending === 'non_payer') {
    offers.push({
      productId: 'starter_pack',
      discountPercent: 50,
      badge: 'BEST VALUE',
      expiresInHours: 72,
      priority: 1,
    });
    if (playerLevel >= 8) {
      offers.push({
        productId: 'hint_bundle_10',
        discountPercent: 20,
        expiresInHours: 72,
        priority: 3,
      });
    }
    return offers;
  }

  // ── Minnows: mid-tier bundles ──
  if (spending === 'minnow') {
    offers.push({
      productId: 'chapter_bundle',
      discountPercent: 25,
      badge: 'POPULAR',
      expiresInHours: 48,
      priority: 1,
    });
    offers.push({
      productId: 'gems_250',
      discountPercent: 20,
      expiresInHours: 48,
      priority: 2,
    });
    return offers;
  }

  // ── Dolphins: premium bundles ──
  if (spending === 'dolphin') {
    offers.push({
      productId: 'mega_bundle_gold',
      discountPercent: 15,
      badge: 'EXCLUSIVE',
      expiresInHours: 24,
      priority: 1,
    });
    offers.push({
      productId: 'premium_pass',
      discountPercent: 20,
      badge: 'PREMIUM DEAL',
      expiresInHours: 48,
      priority: 2,
    });
    return offers;
  }

  // ── Whales: VIP mega bundles ──
  if (spending === 'whale') {
    offers.push({
      productId: 'ultimate_whale',
      discountPercent: 10,
      badge: 'VIP EXCLUSIVE',
      expiresInHours: 24,
      priority: 1,
    });
    offers.push({
      productId: 'royal_collection',
      discountPercent: 15,
      badge: 'VIP DEAL',
      expiresInHours: 24,
      priority: 2,
    });
    if (playerLevel >= 20) {
      offers.push({
        productId: 'mega_bundle_ultimate',
        discountPercent: 10,
        expiresInHours: 48,
        priority: 3,
      });
    }
    return offers;
  }

  // Default fallback
  offers.push({
    productId: 'starter_pack',
    discountPercent: 20,
    expiresInHours: 72,
    priority: 1,
  });

  return offers;
}

/**
 * Check if a dynamic offer has expired.
 */
export function isOfferExpired(
  offerCreatedAt: number,
  expiresInHours: number,
): boolean {
  const expiryMs = expiresInHours * 60 * 60 * 1000;
  return Date.now() - offerCreatedAt > expiryMs;
}

/**
 * Get the display price after discount.
 */
export function getDiscountedPrice(
  basePriceUSD: number,
  discountPercent: number,
): { original: string; discounted: string; savings: string } {
  const discounted = basePriceUSD * (1 - discountPercent / 100);
  return {
    original: `$${basePriceUSD.toFixed(2)}`,
    discounted: `$${discounted.toFixed(2)}`,
    savings: `${discountPercent}% OFF`,
  };
}

// ─── Flash Sales ────────────────────────────────────────────────────────────

/**
 * Rotating daily flash sale — a different product each day of the week with
 * 40-60% discount, expiring at end of day UTC.
 * Returns null if something goes wrong (defensive).
 */
const FLASH_SALE_ROTATION: { productId: string; label: string; discountPercent: number }[] = [
  { productId: 'hint_bundle_25', label: 'Hint Flash Sale', discountPercent: 50 },
  { productId: 'gems_250', label: 'Gem Rush', discountPercent: 40 },
  { productId: 'chapter_bundle', label: 'Chapter Deal', discountPercent: 55 },
  { productId: 'undo_bundle_25', label: 'Undo Blowout', discountPercent: 50 },
  { productId: 'starter_pack', label: 'Starter Flash', discountPercent: 60 },
  { productId: 'gems_500', label: 'Mega Gem Sale', discountPercent: 45 },
  { productId: 'royal_collection', label: 'Royal Flash Deal', discountPercent: 40 },
];

export function getFlashSale(date: Date): FlashSale | null {
  try {
    const dayOfWeek = date.getUTCDay(); // 0 (Sun) – 6 (Sat)
    const rotation = FLASH_SALE_ROTATION[dayOfWeek];
    if (!rotation) return null;

    // Expires at end of the current UTC day
    const endOfDay = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23, 59, 59, 999,
    ));

    return {
      productId: rotation.productId,
      discountPercent: rotation.discountPercent,
      label: rotation.label,
      expiresAt: endOfDay.toISOString(),
    };
  } catch {
    return null;
  }
}
