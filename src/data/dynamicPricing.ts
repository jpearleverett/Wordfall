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
import { getRemoteString } from '../services/remoteConfig';

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
    // First-purchase impulse offer at $0.49 (shown at level 5-8)
    if (playerLevel >= 5 && playerLevel <= 15) {
      offers.push({
        productId: 'first_purchase_special',
        discountPercent: 75,
        badge: 'WELCOME GIFT',
        expiresInHours: 168, // 7 days
        priority: 0,
      });
    }
    offers.push({
      productId: 'starter_pack',
      discountPercent: 30,
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
        productId: 'gems_500',
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

// ─── Flash Sale ─────────────────────────────────────────────────────────────

export interface FlashSale {
  /** Product to put on flash sale */
  productId: string;
  /** Display name */
  name: string;
  /** Icon emoji */
  icon: string;
  /** Description */
  description: string;
  /** Original price string (e.g. "$4.99") */
  originalPrice: string;
  /** Original numeric price */
  originalPriceAmount: number;
  /** Discount percentage */
  discountPercent: number;
  /** Discounted price string */
  salePrice: string;
  /** Hours remaining until midnight */
  hoursRemaining: number;
}

const FLASH_SALE_POOL: {
  productId: string;
  name: string;
  icon: string;
  description: string;
  originalPrice: string;
  originalPriceAmount: number;
  discountPercent: number;
}[] = [
  {
    productId: 'starter_pack',
    name: 'Starter Pack',
    icon: '\u{1F381}',
    description: '500 Coins + 50 Gems + 10 Hints + Exclusive Decoration',
    originalPrice: '$4.99',
    originalPriceAmount: 4.99,
    discountPercent: 60,
  },
  {
    productId: 'hint_bundle_50',
    name: '50 Hints Mega Pack',
    icon: '\u{1F4A1}',
    description: '50 Hints to power through any puzzle',
    originalPrice: '$2.99',
    originalPriceAmount: 2.99,
    discountPercent: 40,
  },
  {
    productId: 'gems_250',
    name: '250 Gems',
    icon: '\u{1F48E}',
    description: '250 Gems for cosmetics, spins & more',
    originalPrice: '$4.99',
    originalPriceAmount: 4.99,
    discountPercent: 50,
  },
  {
    productId: 'chapter_bundle',
    name: 'Chapter Bundle',
    icon: '\u{1F4D6}',
    description: 'Theme decoration + 20 gems + 10 hints + Board Preview',
    originalPrice: '$2.99',
    originalPriceAmount: 2.99,
    discountPercent: 35,
  },
  {
    productId: 'gems_500',
    name: '500 Gems',
    icon: '\u{1F48E}',
    description: '500 Gems — the biggest gem pack available',
    originalPrice: '$9.99',
    originalPriceAmount: 9.99,
    discountPercent: 40,
  },
];

/**
 * Remote-Config-driven daily deal override. JSON schema (Phase 4D):
 * {
 *   "productId": "starter_pack",
 *   "name": "Launch Week Deal",
 *   "icon": "🎁",
 *   "description": "500 Coins + 50 Gems + 10 Hints",
 *   "originalPriceAmount": 4.99,
 *   "discountPercent": 50,
 *   "endTime": <epoch ms, optional — when set, hoursRemaining reflects it>,
 *   "disabled": false   // set true to force "no deal today"
 * }
 * If empty or malformed, fall through to the built-in hashed default.
 */
interface RemoteDailyDeal {
  productId: string;
  name: string;
  icon: string;
  description: string;
  originalPriceAmount: number;
  discountPercent: number;
  endTime?: number;
  disabled?: boolean;
  originalPrice?: string;
}

function parseRemoteDailyDeal(): RemoteDailyDeal | null {
  const raw = getRemoteString('dailyDealOverride');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const d = parsed as Partial<RemoteDailyDeal>;
    if (d.disabled === true) return { ...d, disabled: true } as RemoteDailyDeal;
    if (
      typeof d.productId !== 'string' ||
      typeof d.name !== 'string' ||
      typeof d.icon !== 'string' ||
      typeof d.description !== 'string' ||
      typeof d.originalPriceAmount !== 'number' ||
      typeof d.discountPercent !== 'number'
    ) {
      return null;
    }
    if (
      d.originalPriceAmount <= 0 ||
      d.discountPercent < 0 ||
      d.discountPercent > 90
    ) {
      return null;
    }
    return d as RemoteDailyDeal;
  } catch {
    return null;
  }
}

/**
 * Deterministically pick a flash sale for a given date.
 * Returns null roughly 30% of days (no sale).
 *
 * Honors the `dailyDealOverride` Remote Config key: authoring a JSON blob
 * there swaps the deal globally without a rebuild (`disabled: true` suppresses
 * the default hashed deal for the day).
 */
export function getFlashSale(date: Date): FlashSale | null {
  // Remote-Config kill switch: short-circuits the full flash-sale
  // surface (both the hashed default and any override). dailyDealOverride
  // remains the granular "swap the deal" lever; this flag is the
  // coarse on/off.
  // Lazy require to sidestep the remoteConfig -> dynamicPricing cycle
  // that existed before this file began consuming RC.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getRemoteBoolean } = require('../services/remoteConfig') as {
    getRemoteBoolean: (key: string) => boolean;
  };
  if (!getRemoteBoolean('flashSaleEnabled')) return null;

  const override = parseRemoteDailyDeal();
  if (override?.disabled) return null;
  if (override) {
    const saleAmount = override.originalPriceAmount * (1 - override.discountPercent / 100);
    const hoursRemaining = override.endTime
      ? Math.max(0, Math.ceil((override.endTime - date.getTime()) / 3600000))
      : (() => {
          const midnight = new Date(date);
          midnight.setHours(23, 59, 59, 999);
          return Math.max(0, Math.ceil((midnight.getTime() - date.getTime()) / 3600000));
        })();
    return {
      productId: override.productId,
      name: override.name,
      icon: override.icon,
      description: override.description,
      originalPrice: override.originalPrice ?? `$${override.originalPriceAmount.toFixed(2)}`,
      originalPriceAmount: override.originalPriceAmount,
      discountPercent: override.discountPercent,
      salePrice: `$${saleAmount.toFixed(2)}`,
      hoursRemaining,
    };
  }

  const dayOfYear =
    Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  // Use day-of-year as seed — deterministic per day
  const hash = (dayOfYear * 2654435761) >>> 0;

  // ~30% of days have no flash sale
  if (hash % 10 < 3) return null;

  const index = hash % FLASH_SALE_POOL.length;
  const item = FLASH_SALE_POOL[index];

  // Calculate hours remaining until midnight
  const now = date;
  const midnight = new Date(now);
  midnight.setHours(23, 59, 59, 999);
  const hoursRemaining = Math.max(0, Math.ceil((midnight.getTime() - now.getTime()) / 3600000));

  const saleAmount = item.originalPriceAmount * (1 - item.discountPercent / 100);

  return {
    ...item,
    salePrice: `$${saleAmount.toFixed(2)}`,
    hoursRemaining,
  };
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
