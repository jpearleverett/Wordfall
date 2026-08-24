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
import { ShopProduct, getProductById } from './shopProducts';
import { getRemoteString } from '../services/remoteConfig';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DynamicOffer {
  /**
   * Product ID — MUST exist in SHOP_PRODUCTS. Anything else is
   * unpurchasable (iap.ts can't map it to a store SKU and
   * applyCatalogPurchase would deliver nothing), so the offer card
   * would be a dead end.
   */
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
//
// WARNING: these bundles are NOT purchasable today. They were never merged
// into SHOP_PRODUCTS, so getProductById() can't resolve them, iap.ts can't
// map their ids to registered store SKUs, and applyCatalogPurchase would
// return applied:false even if a charge somehow completed. Do NOT point a
// DynamicOffer (or any other purchase surface) at these ids until they are
// merged into SHOP_PRODUCTS and the wordfall_mega_* SKUs are registered in
// Play Console.

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
 * Tier 6 B6 — 4-tier comeback ladder keyed off `daysSinceActive`.
 *
 *  - Day 2–3 ("lightly lapsed"): 50% off starter, 24h "COME BACK"
 *  - Day 4–7 ("lapsed"): 70% off starter, 48h "WELCOME BACK"
 *  - Day 8–14 ("deeply lapsed"): 75% off first-purchase-special + 100 gems, 48h "WE MISS YOU"
 *  - Day 15+ ("churned"): 30% off Champion Pack + cosmetic frame, 72h "LAST CALL"
 *
 * Returns an empty array when the player is still Day-0 or Day-1 active;
 * callers should fall through to the standard segment-based branches.
 */
function lapsedLadder(daysSinceActive: number, playerLevel: number): DynamicOffer[] {
  if (daysSinceActive < 2) return [];

  if (daysSinceActive <= 3) {
    // Lightly lapsed: soft 50% nudge
    const offers: DynamicOffer[] = [{
      productId: 'starter_pack',
      discountPercent: 50,
      badge: 'COME BACK',
      expiresInHours: 24,
      priority: 1,
    }];
    if (playerLevel >= 10) {
      offers.push({
        productId: 'gems_250',
        discountPercent: 30,
        expiresInHours: 24,
        priority: 2,
      });
    }
    return offers;
  }

  if (daysSinceActive <= 7) {
    // Classic 4-7 day lapsed window
    const offers: DynamicOffer[] = [{
      productId: 'starter_pack',
      discountPercent: 70,
      badge: 'WELCOME BACK',
      expiresInHours: 48,
      priority: 1,
    }];
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

  if (daysSinceActive <= 14) {
    // Deeply lapsed: pull out the first-purchase special + extra gems
    return [
      {
        productId: 'first_purchase_special',
        discountPercent: 75,
        badge: 'WE MISS YOU',
        expiresInHours: 48,
        priority: 0,
      },
      {
        productId: 'gems_500',
        discountPercent: 40,
        badge: 'COMEBACK BONUS',
        expiresInHours: 48,
        priority: 1,
      },
    ];
  }

  // Day 15+: churned tier — premium bundle at 30% + cosmetic frame hook.
  // champion_pack, NOT mega_bundle_gold: the mega bundles were never merged
  // into SHOP_PRODUCTS, so pointing here at one made the flagship winback
  // offer a dead end (wrong price shown, purchase always failed). Champion
  // Pack is the same $14.99 price point with an exclusive frame.
  return [
    {
      productId: 'champion_pack',
      discountPercent: 30,
      badge: 'LAST CALL',
      expiresInHours: 72,
      priority: 0,
    },
    {
      productId: 'starter_pack',
      discountPercent: 60,
      badge: 'RETURNING PLAYER',
      expiresInHours: 72,
      priority: 1,
    },
  ];
}

/**
 * Returns 1-3 dynamic offers personalized to the player's spending
 * and engagement segments.
 */
export function getDynamicOffers(
  spending: SpendingSegment,
  engagement: EngagementSegment,
  playerLevel: number,
  daysSinceActive?: number,
): DynamicOffer[] {
  const offers: DynamicOffer[] = [];

  // ── Tier 6 B6 — 4-tier comeback ladder ──
  // Wordscapes / Royal Match tier comeback offers by time-away so the
  // discount deepens as the player drifts. We key off the optional
  // `daysSinceActive` so we can distinguish Day-2 ("lightly lapsed" — still
  // in `at_risk`), Day-4–7 (entering `lapsed`), Day-8–14 ("deeply lapsed"),
  // and Day-15+ ("churned"). Callers that don't have the raw days-since
  // value fall through to the legacy engagement-based branches below.
  if (typeof daysSinceActive === 'number') {
    const ladder = lapsedLadder(daysSinceActive, playerLevel);
    if (ladder.length > 0) return ladder;
  }

  // ── Legacy win-back (Day 7+ only — retained for callers pre-Tier-6) ──
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
      // champion_pack, NOT mega_bundle_gold — see the churned-tier note in
      // lapsedLadder(): the mega bundles are not in SHOP_PRODUCTS and can't
      // be purchased.
      productId: 'champion_pack',
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
  /** Anchor price string (the SHOP_PRODUCTS originalPrice, e.g. "$4.99") */
  originalPrice: string;
  /** Anchor numeric price */
  originalPriceAmount: number;
  /** Discount percentage derived from anchor vs. real price */
  discountPercent: number;
  /**
   * The advertised buy price — ALWAYS the product's real charged price
   * (SHOP_PRODUCTS fallbackPriceAmount, USD). There is no discounted-SKU
   * mechanism: the store sheet charges the SKU's registered price, so the
   * card must never advertise a number the store won't honor. UI should
   * prefer the live currency-localized `iapManager.getPrice(productId)`
   * over this fallback string at render time.
   */
  salePrice: string;
  /** Hours remaining until midnight */
  hoursRemaining: number;
}

// Pricing invariant: the advertised sale price must equal the price the
// store actually charges (the product's SHOP_PRODUCTS fallbackPriceAmount),
// with the strike-through anchored at the catalog originalPriceAmount and
// discountPercent = the rounded anchor→real ratio. getFlashSale() derives
// all three from the catalog, so the fields here are display fallbacks
// only — keep them in sync with SHOP_PRODUCTS anyway to avoid confusion.
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
    discountPercent: 60, // real $1.99 vs $4.99 anchor
  },
  {
    productId: 'hint_bundle_50',
    name: '50 Hints Mega Pack',
    icon: '\u{1F4A1}',
    description: '50 Hints to power through any puzzle',
    originalPrice: '$4.99',
    originalPriceAmount: 4.99,
    discountPercent: 40, // real $2.99 vs $4.99 anchor
  },
  {
    productId: 'gems_250',
    name: '250 Gems',
    icon: '\u{1F48E}',
    description: '250 Gems for cosmetics, spins & more',
    originalPrice: '$7.99',
    originalPriceAmount: 7.99,
    discountPercent: 38, // real $4.99 vs $7.99 anchor
  },
  {
    productId: 'chapter_bundle',
    name: 'Chapter Bundle',
    icon: '\u{1F4D6}',
    description: 'Theme decoration + 20 gems + 10 hints + Board Preview',
    originalPrice: '$4.99',
    originalPriceAmount: 4.99,
    discountPercent: 40, // real $2.99 vs $4.99 anchor
  },
  {
    productId: 'gems_500',
    name: '500 Gems',
    icon: '\u{1F48E}',
    description: '500 Gems — the biggest gem pack available',
    originalPrice: '$14.99',
    originalPriceAmount: 14.99,
    discountPercent: 33, // real $9.99 vs $14.99 anchor
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
 * Resolve the truthful pricing triple for a flash-sale product. The sale
 * price is ALWAYS the price the store actually charges (the catalog
 * fallbackPriceAmount — there is no discounted-SKU mechanism), the anchor
 * is the catalog originalPrice, and the discount badge is derived from the
 * two. `preferredAnchor` lets an RC override author a custom anchor; a
 * value at or below the real price is ignored in favor of the catalog
 * anchor so the badge can never overstate the deal. Returns null for a
 * product that isn't in SHOP_PRODUCTS — an unpurchasable id must never be
 * advertised.
 */
function resolveSalePricing(
  productId: string,
  preferredAnchor?: number,
  preferredAnchorLabel?: string,
): {
  saleAmount: number;
  anchorAmount: number;
  anchorLabel: string;
  discountPercent: number;
} | null {
  const product = getProductById(productId);
  if (!product) return null;

  const saleAmount = product.fallbackPriceAmount;
  const catalogAnchor =
    product.originalPriceAmount !== undefined && product.originalPriceAmount > saleAmount
      ? product.originalPriceAmount
      : undefined;
  const anchorAmount =
    preferredAnchor !== undefined && preferredAnchor > saleAmount
      ? preferredAnchor
      : catalogAnchor ?? saleAmount;

  let anchorLabel: string;
  if (anchorAmount === preferredAnchor && preferredAnchorLabel) {
    anchorLabel = preferredAnchorLabel;
  } else if (anchorAmount === product.originalPriceAmount && product.originalPrice) {
    anchorLabel = product.originalPrice;
  } else {
    anchorLabel = `$${anchorAmount.toFixed(2)}`;
  }

  const discountPercent =
    anchorAmount > saleAmount
      ? Math.round((1 - saleAmount / anchorAmount) * 100)
      : 0;

  return { saleAmount, anchorAmount, anchorLabel, discountPercent };
}

/**
 * Deterministically pick a flash sale for a given date.
 * Returns null roughly 30% of days (no sale).
 *
 * Honors the `dailyDealOverride` Remote Config key: authoring a JSON blob
 * there swaps the deal globally without a rebuild (`disabled: true` suppresses
 * the default hashed deal for the day). An override naming a product that is
 * not in SHOP_PRODUCTS (unpurchasable) falls through to the hashed default.
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
    // Enforce the pricing invariant on RC-authored deals too: the deal is
    // rendered only when its product is purchasable, the advertised price
    // is the product's real charged price (the store will not honor
    // anything else), and the discount badge is derived from the validated
    // anchor. An unfulfillable override falls through to the hashed default
    // instead of advertising a deal that can't be bought.
    const pricing = resolveSalePricing(
      override.productId,
      override.originalPriceAmount,
      override.originalPrice,
    );
    if (pricing) {
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
        originalPrice: pricing.anchorLabel,
        originalPriceAmount: pricing.anchorAmount,
        discountPercent: pricing.discountPercent,
        salePrice: `$${pricing.saleAmount.toFixed(2)}`,
        hoursRemaining,
      };
    }
  }

  const dayOfYear =
    Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  // Use day-of-year as seed — deterministic per day
  const hash = (dayOfYear * 2654435761) >>> 0;

  // ~30% of days have no flash sale
  if (hash % 10 < 3) return null;

  const index = hash % FLASH_SALE_POOL.length;
  const item = FLASH_SALE_POOL[index];

  // Derive all pricing from the catalog so the advertised buy price is the
  // price the store actually charges — the pool's own numbers are display
  // fallbacks that must never disagree with SHOP_PRODUCTS. A pool entry
  // that drifted out of the catalog yields "no sale today" over a lie.
  const pricing = resolveSalePricing(item.productId);
  if (!pricing) return null;

  // Calculate hours remaining until midnight
  const now = date;
  const midnight = new Date(now);
  midnight.setHours(23, 59, 59, 999);
  const hoursRemaining = Math.max(0, Math.ceil((midnight.getTime() - now.getTime()) / 3600000));

  return {
    productId: item.productId,
    name: item.name,
    icon: item.icon,
    description: item.description,
    originalPrice: pricing.anchorLabel,
    originalPriceAmount: pricing.anchorAmount,
    discountPercent: pricing.discountPercent,
    salePrice: `$${pricing.saleAmount.toFixed(2)}`,
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
