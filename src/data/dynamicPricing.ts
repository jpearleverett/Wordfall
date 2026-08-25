/**
 * Dynamic Pricing by Player Segment
 *
 * Shows different offers to different player segments to maximize
 * conversion without alienating non-payers or under-serving whales.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SpendingSegment,
  EngagementSegment,
} from '../services/playerSegmentation';
import { ShopProduct, getProductById } from './shopProducts';
import { getRemoteString } from '../services/remoteConfig';
import { logger } from '../utils/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DynamicOffer {
  /**
   * Product ID — MUST exist in SHOP_PRODUCTS. Anything else is
   * unpurchasable (iap.ts can't map it to a store SKU and
   * applyCatalogPurchase would deliver nothing), so the offer card
   * would be a dead end. Deep-discount offers point at REAL sale-variant
   * SKUs (starter_pack_sale_70, …) so the advertised price is the price
   * the store sheet charges.
   */
  productId: string;
  /**
   * Discount percentage — ALWAYS derived from the catalog anchor vs. the
   * real charged price by getDynamicOffers (never freehand), so the badge
   * can never overstate the deal.
   */
  discountPercent: number;
  /** Optional badge text ("BEST VALUE", "POPULAR", "VIP EXCLUSIVE") */
  badge?: string;
  /** How long this offer is available (hours) */
  expiresInHours: number;
  /** Sort priority (lower = shown first) */
  priority: number;
  /**
   * Epoch ms the offer window opened. Segment offers are derived per
   * render, so this is anchored to the start of the current UTC day —
   * stable across remounts — while the follow-up offer anchors to the
   * actual first-purchase timestamp. Feed it to isOfferExpired /
   * offerExpiresAt for filtering and real countdowns.
   */
  createdAt: number;
}

/** Epoch ms at which an offer stops being available. */
export function offerExpiresAt(offer: Pick<DynamicOffer, 'createdAt' | 'expiresInHours'>): number {
  return offer.createdAt + offer.expiresInHours * 60 * 60 * 1000;
}

/** Start of the current UTC day — the stable anchor for derived offers. */
function startOfUtcDayMs(now: number = Date.now()): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
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
 * Offer under construction — discountPercent and createdAt are stamped by
 * getDynamicOffers from the catalog, never authored per-branch, so a
 * branch literal can never advertise a % the store won't honor.
 */
type OfferSeed = Omit<DynamicOffer, 'createdAt' | 'discountPercent'>;

/**
 * Tier 6 B6 — 4-tier comeback ladder keyed off `daysSinceActive`.
 *
 * Deep discounts point at REAL sale-variant SKUs (see shopProducts.ts):
 *  - Day 2–3 ("lightly lapsed"): starter @ real 50% off, 24h "COME BACK"
 *  - Day 4–7 ("lapsed"): starter @ real 70% off, 48h "WELCOME BACK"
 *  - Day 8–14 ("deeply lapsed"): first-purchase-special (real 75% anchor) + gems, 48h "WE MISS YOU"
 *  - Day 15+ ("churned"): Champion Pack (catalog anchor) + starter @ real 60% off, 72h "LAST CALL"
 *
 * Returns an empty array when the player is still Day-0 or Day-1 active;
 * callers should fall through to the standard segment-based branches.
 */
function lapsedLadder(daysSinceActive: number, playerLevel: number): OfferSeed[] {
  if (daysSinceActive < 2) return [];

  if (daysSinceActive <= 3) {
    // Lightly lapsed: soft 50% nudge (real sale variant)
    const offers: OfferSeed[] = [{
      productId: 'starter_pack_sale_50',
      badge: 'COME BACK',
      expiresInHours: 24,
      priority: 1,
    }];
    if (playerLevel >= 10) {
      offers.push({
        productId: 'gems_250_sale_30',
        expiresInHours: 24,
        priority: 2,
      });
    }
    return offers;
  }

  if (daysSinceActive <= 7) {
    // Classic 4-7 day lapsed window (real 70% / 50% sale variants)
    const offers: OfferSeed[] = [{
      productId: 'starter_pack_sale_70',
      badge: 'WELCOME BACK',
      expiresInHours: 48,
      priority: 1,
    }];
    if (playerLevel >= 10) {
      offers.push({
        productId: 'gems_250_sale_50',
        badge: 'COMEBACK DEAL',
        expiresInHours: 48,
        priority: 2,
      });
    }
    return offers;
  }

  if (daysSinceActive <= 14) {
    // Deeply lapsed: pull out the first-purchase special + extra gems.
    // first_purchase_special's catalog anchor already delivers a real 75%
    // ($0.49 vs $1.99); the gems ride the real 40%-off gems_500 variant.
    return [
      {
        productId: 'first_purchase_special',
        badge: 'WE MISS YOU',
        expiresInHours: 48,
        priority: 0,
      },
      {
        productId: 'gems_500_sale_40',
        badge: 'COMEBACK BONUS',
        expiresInHours: 48,
        priority: 1,
      },
    ];
  }

  // Day 15+: churned tier — premium bundle + cosmetic frame hook.
  // champion_pack, NOT mega_bundle_gold: the mega bundles were never merged
  // into SHOP_PRODUCTS, so pointing here at one made the flagship winback
  // offer a dead end (wrong price shown, purchase always failed). Champion
  // Pack is the same $14.99 price point with an exclusive frame; its badge
  // derives from the catalog anchor ($14.99 vs $24.99 → 40%).
  return [
    {
      productId: 'champion_pack',
      badge: 'LAST CALL',
      expiresInHours: 72,
      priority: 0,
    },
    {
      productId: 'starter_pack_sale_60',
      badge: 'RETURNING PLAYER',
      expiresInHours: 72,
      priority: 1,
    },
  ];
}

/**
 * Truthful discount badge for a catalog product: the rounded ratio of its
 * real charged price against its catalog anchor. 0 when there is no anchor.
 */
function catalogDiscountPercent(productId: string): number {
  const pricing = resolveSalePricing(productId);
  return pricing?.discountPercent ?? 0;
}

/**
 * Returns 1-3 dynamic offers personalized to the player's spending
 * and engagement segments.
 *
 * Every returned offer is normalized against the catalog: discountPercent
 * is DERIVED from the product's anchor vs. its real charged price (deep
 * discounts ride real sale-variant SKUs), and createdAt is anchored to the
 * start of the current UTC day so expiry survives remounts. An offer whose
 * product is missing from SHOP_PRODUCTS is dropped rather than rendered as
 * a dead end.
 */
export function getDynamicOffers(
  spending: SpendingSegment,
  engagement: EngagementSegment,
  playerLevel: number,
  daysSinceActive?: number,
): DynamicOffer[] {
  const createdAt = startOfUtcDayMs();
  return buildDynamicOffers(spending, engagement, playerLevel, daysSinceActive)
    .filter((seed) => getProductById(seed.productId) !== undefined)
    .map((seed) => ({
      ...seed,
      discountPercent: catalogDiscountPercent(seed.productId),
      createdAt,
    }));
}

function buildDynamicOffers(
  spending: SpendingSegment,
  engagement: EngagementSegment,
  playerLevel: number,
  daysSinceActive?: number,
): OfferSeed[] {
  const offers: OfferSeed[] = [];

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
      productId: 'starter_pack_sale_70',
      badge: 'WELCOME BACK',
      expiresInHours: 48,
      priority: 1,
    });
    if (playerLevel >= 10) {
      offers.push({
        productId: 'gems_250_sale_50',
        badge: 'COMEBACK DEAL',
        expiresInHours: 48,
        priority: 2,
      });
    }
    return offers;
  }

  // ── At-risk / returned players: generous deals (real 50%/40% variants) ──
  if (engagement === 'at_risk' || engagement === 'returned') {
    offers.push({
      productId: spending === 'non_payer' ? 'starter_pack_sale_50' : 'chapter_bundle_sale_50',
      badge: 'LIMITED TIME',
      expiresInHours: 24,
      priority: 1,
    });
    if (spending !== 'non_payer') {
      offers.push({
        productId: 'gems_500_sale_40',
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
        badge: 'WELCOME GIFT',
        expiresInHours: 168, // 7 days
        priority: 0,
      });
    }
    offers.push({
      productId: 'starter_pack',
      badge: 'BEST VALUE',
      expiresInHours: 72,
      priority: 1,
    });
    if (playerLevel >= 8) {
      offers.push({
        productId: 'hint_bundle_10',
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
      badge: 'POPULAR',
      expiresInHours: 48,
      priority: 1,
    });
    offers.push({
      productId: 'gems_250',
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
      badge: 'EXCLUSIVE',
      expiresInHours: 24,
      priority: 1,
    });
    offers.push({
      productId: 'premium_pass',
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
      badge: 'VIP EXCLUSIVE',
      expiresInHours: 24,
      priority: 1,
    });
    offers.push({
      productId: 'royal_collection',
      badge: 'VIP DEAL',
      expiresInHours: 24,
      priority: 2,
    });
    if (playerLevel >= 20) {
      offers.push({
        productId: 'gems_500',
        expiresInHours: 48,
        priority: 3,
      });
    }
    return offers;
  }

  // Default fallback
  offers.push({
    productId: 'starter_pack',
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
 *
 * Sale-variant SKUs (shopProducts.ts `saleVariantOf`) flow through here
 * like any other product: their fallbackPriceAmount IS the genuinely
 * discounted charged price and their anchor is the base SKU's everyday
 * price, so mapping an offer to its variant keeps displayed == charged.
 * Exported so shop surfaces (featured cards) derive pricing from the
 * catalog through one choke point instead of hardcoding numbers.
 */
export function resolveSalePricing(
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
 * Check if a dynamic offer has expired. The production filter for every
 * offer surface (For You carousel, follow-up offer) — pass an offer's
 * createdAt + expiresInHours. `now` is injectable for tests.
 */
export function isOfferExpired(
  offerCreatedAt: number,
  expiresInHours: number,
  now: number = Date.now(),
): boolean {
  const expiryMs = expiresInHours * 60 * 60 * 1000;
  return now - offerCreatedAt > expiryMs;
}

// ─── Second-purchase follow-up offer ────────────────────────────────────────
//
// Nothing used to fire after a first purchase completed — the highest-value
// conversion moment in F2P (a payer's second purchase is the best LTV
// predictor) had no surface. useCommerce records the FIRST successful
// real-money purchase here; for the next 48h the shop's "For You" carousel
// surfaces one "thanks — next one's better" follow-up at a real price
// (second_purchase_special, strictly better value than starter_pack at the
// same $1.99). Same persistence pattern as economyTuning's faucet ledger:
// synchronous in-memory copy, hydrated once from AsyncStorage, written
// through on mutation.

export const SECOND_PURCHASE_OFFER_PRODUCT_ID = 'second_purchase_special';
const FOLLOWUP_WINDOW_HOURS = 48;
const FOLLOWUP_LEDGER_KEY = '@wordfall_purchase_followup';

interface FollowupLedger {
  /** Epoch ms of the player's first successful real-money purchase. */
  firstPurchaseAt: number;
  /** True once the follow-up SKU itself was bought (offer never resurfaces). */
  converted: boolean;
}

let followupLedger: FollowupLedger | null = null;
let followupHydration: Promise<void> | null = null;

function persistFollowupLedger(): void {
  AsyncStorage.setItem(FOLLOWUP_LEDGER_KEY, JSON.stringify(followupLedger)).catch(() => {
    logger.warn('[DynamicPricing] failed to persist follow-up ledger');
  });
}

/** Idempotent one-time hydration; kicked at module load, awaitable in UI/tests. */
export function hydratePurchaseFollowup(): Promise<void> {
  if (followupHydration) return followupHydration;
  followupHydration = (async () => {
    try {
      const raw = await AsyncStorage.getItem(FOLLOWUP_LEDGER_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<FollowupLedger>;
      if (typeof parsed.firstPurchaseAt !== 'number' || parsed.firstPurchaseAt <= 0) return;
      if (followupLedger === null) {
        followupLedger = {
          firstPurchaseAt: parsed.firstPurchaseAt,
          converted: parsed.converted === true,
        };
      } else {
        // A purchase landed before hydration finished — keep the earliest
        // window start and never un-convert.
        followupLedger = {
          firstPurchaseAt: Math.min(followupLedger.firstPurchaseAt, parsed.firstPurchaseAt),
          converted: followupLedger.converted || parsed.converted === true,
        };
      }
    } catch {
      // Corrupt ledger — treat as fresh; worst case one repeat follow-up.
    }
  })();
  return followupHydration;
}
void hydratePurchaseFollowup();

/** Test-only: reset the in-memory ledger (and mark hydration as done). */
export function __resetPurchaseFollowupForTests(next: FollowupLedger | null = null): void {
  followupLedger = next;
  followupHydration = Promise.resolve();
}

/**
 * Record a successful REAL-MONEY purchase (useCommerce.purchaseProduct
 * only — restores/migrations must not open the window). Returns what the
 * purchase meant for the follow-up funnel so the caller can fire the
 * matching analytics event:
 *  - 'first_purchase'      → the 48h follow-up window just opened
 *  - 'followup_converted'  → the follow-up SKU itself was bought
 *  - null                  → neither (later ordinary purchase)
 */
export function recordPurchaseForFollowup(
  productId: string,
  now: number = Date.now(),
): 'first_purchase' | 'followup_converted' | null {
  if (productId === SECOND_PURCHASE_OFFER_PRODUCT_ID) {
    followupLedger = {
      firstPurchaseAt: followupLedger?.firstPurchaseAt ?? now,
      converted: true,
    };
    persistFollowupLedger();
    return 'followup_converted';
  }
  if (followupLedger === null) {
    followupLedger = { firstPurchaseAt: now, converted: false };
    persistFollowupLedger();
    return 'first_purchase';
  }
  return null;
}

/**
 * The live "thanks — next one's better" offer, or null when there is no
 * open window (no first purchase yet, already converted, expired, or the
 * SKU is missing from the catalog). Expiry runs through the same
 * isOfferExpired path as every dynamic offer; createdAt is the actual
 * first-purchase timestamp so the countdown is real.
 */
export function getSecondPurchaseFollowupOffer(now: number = Date.now()): DynamicOffer | null {
  if (!followupLedger || followupLedger.converted) return null;
  const product = getProductById(SECOND_PURCHASE_OFFER_PRODUCT_ID);
  if (!product) return null;
  const createdAt = followupLedger.firstPurchaseAt;
  if (isOfferExpired(createdAt, FOLLOWUP_WINDOW_HOURS, now)) return null;
  return {
    productId: SECOND_PURCHASE_OFFER_PRODUCT_ID,
    discountPercent: resolveSalePricing(SECOND_PURCHASE_OFFER_PRODUCT_ID)?.discountPercent ?? 0,
    badge: 'THANK YOU',
    expiresInHours: FOLLOWUP_WINDOW_HOURS,
    priority: 0,
    createdAt,
  };
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
