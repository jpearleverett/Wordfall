/**
 * Shop product catalog.
 *
 * Defines all IAP products, their rewards, categories, and store product IDs.
 * Store IDs use "wordfall_" prefix to match App Store / Play Store listings.
 */

import { IAPProductId } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProductCategory = 'bundles' | 'currency' | 'consumables' | 'premium' | 'subscription';

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
  /** Optional original price to show a discount (display string, e.g. "$4.99") */
  originalPrice?: string;
  /** Numeric original price; lets UI compute % off without re-parsing */
  originalPriceAmount?: number;
  icon: string;
}

// ─── Product definitions ─────────────────────────────────────────────────────

export const SHOP_PRODUCTS: ShopProduct[] = [
  // ── First Purchase Special (impulse tier) ──────────────────────────────
  {
    id: 'first_purchase_special',
    storeProductId: 'wordfall_first_purchase',
    name: 'Welcome Gift',
    description: '200 Coins + 25 Gems + 5 Hints — One-time special!',
    fallbackPrice: '$0.49',
    fallbackPriceAmount: 0.49,
    category: 'bundles',
    rewards: {
      coins: 200,
      gems: 25,
      hintTokens: 5,
    },
    isNonConsumable: true,
    originalPrice: '$1.99',
    originalPriceAmount: 1.99,
    icon: '🎁',
  },

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
    originalPriceAmount: 4.99,
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
    originalPrice: '$4.99',
    originalPriceAmount: 4.99,
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
    originalPrice: '$1.99',
    originalPriceAmount: 1.99,
    icon: '\u{1F4E6}',
  },

  // ── Mid-Tier Bundles ─────────────────────────────────────────────────────
  {
    id: 'adventurer_pack',
    storeProductId: 'wordfall_adventurer_pack',
    name: 'Adventurer Pack',
    description: '750 Coins + 30 Gems + 10 Hints',
    fallbackPrice: '$3.99',
    fallbackPriceAmount: 3.99,
    category: 'bundles',
    rewards: {
      coins: 750,
      gems: 30,
      hintTokens: 10,
    },
    isNonConsumable: false,
    originalPrice: '$6.99',
    originalPriceAmount: 6.99,
    icon: '\u{1F3D4}\u{FE0F}',
  },
  {
    id: 'explorer_bundle',
    storeProductId: 'wordfall_explorer_bundle',
    name: 'Explorer Bundle',
    description: '1500 Coins + 75 Gems + 20 Hints + 3 of Each Booster',
    fallbackPrice: '$6.99',
    fallbackPriceAmount: 6.99,
    category: 'bundles',
    rewards: {
      coins: 1500,
      gems: 75,
      hintTokens: 20,
      boosters: [
        { type: 'wildcardTile', count: 3 },
        { type: 'spotlight', count: 3 },
        { type: 'smartShuffle', count: 3 },
      ],
    },
    isNonConsumable: false,
    originalPrice: '$12.99',
    originalPriceAmount: 12.99,
    icon: '\u{1F9ED}',
  },

  // ── Consumables: Hints ───────────────────────────────────────────────────
  {
    id: 'hint_starter',
    storeProductId: 'wordfall_hint_starter',
    name: 'Hint Starter',
    description: 'A starter pack of 5 hint tokens',
    fallbackPrice: '$0.99',
    fallbackPriceAmount: 0.99,
    category: 'consumables',
    rewards: { hintTokens: 5 },
    isNonConsumable: false,
    originalPrice: '$1.99',
    originalPriceAmount: 1.99,
    icon: '\u{1F4A1}',
  },
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
    originalPrice: '$1.99',
    originalPriceAmount: 1.99,
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
    originalPrice: '$2.99',
    originalPriceAmount: 2.99,
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
    originalPrice: '$4.99',
    originalPriceAmount: 4.99,
    icon: '\u{1F4A1}',
  },
  {
    id: 'hint_bundle_15',
    storeProductId: 'wordfall_hint_15',
    name: '15 Hints',
    description: 'A handy bundle of 15 hint tokens',
    fallbackPrice: '$1.99',
    fallbackPriceAmount: 1.99,
    category: 'consumables',
    rewards: { hintTokens: 15 },
    isNonConsumable: false,
    originalPrice: '$2.99',
    originalPriceAmount: 2.99,
    icon: '\u{1F4A1}',
  },
  {
    id: 'hint_master',
    storeProductId: 'wordfall_hint_master',
    name: 'Hint Master',
    description: 'A master collection of 30 hint tokens',
    fallbackPrice: '$4.99',
    fallbackPriceAmount: 4.99,
    category: 'consumables',
    rewards: { hintTokens: 30 },
    isNonConsumable: false,
    originalPrice: '$7.99',
    originalPriceAmount: 7.99,
    icon: '\u{1F4A1}',
  },
  {
    id: 'hint_legend',
    storeProductId: 'wordfall_hint_legend',
    name: 'Hint Legend',
    description: 'A legendary stockpile of 75 hint tokens',
    fallbackPrice: '$9.99',
    fallbackPriceAmount: 9.99,
    category: 'consumables',
    rewards: { hintTokens: 75 },
    isNonConsumable: false,
    originalPrice: '$14.99',
    originalPriceAmount: 14.99,
    icon: '\u{1F4A1}',
  },

  // ── Consumables: Undos ───────────────────────────────────────────────────
  {
    id: 'undo_starter',
    storeProductId: 'wordfall_undo_starter',
    name: 'Undo Starter',
    description: 'A starter pack of 5 undo tokens',
    fallbackPrice: '$0.99',
    fallbackPriceAmount: 0.99,
    category: 'consumables',
    rewards: { undoTokens: 5 },
    isNonConsumable: false,
    originalPrice: '$1.99',
    originalPriceAmount: 1.99,
    icon: '\u21A9\uFE0F',
  },
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
    originalPrice: '$1.99',
    originalPriceAmount: 1.99,
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
    originalPrice: '$2.99',
    originalPriceAmount: 2.99,
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
    originalPrice: '$4.99',
    originalPriceAmount: 4.99,
    icon: '\u21A9\uFE0F',
  },
  {
    id: 'undo_bundle_15',
    storeProductId: 'wordfall_undo_15',
    name: '15 Undos',
    description: 'A handy bundle of 15 undo tokens',
    fallbackPrice: '$2.99',
    fallbackPriceAmount: 2.99,
    category: 'consumables',
    rewards: { undoTokens: 15 },
    isNonConsumable: false,
    originalPrice: '$4.99',
    originalPriceAmount: 4.99,
    icon: '\u21A9\uFE0F',
  },
  {
    id: 'undo_master',
    storeProductId: 'wordfall_undo_master',
    name: 'Undo Master',
    description: 'A master collection of 30 undo tokens',
    fallbackPrice: '$4.99',
    fallbackPriceAmount: 4.99,
    category: 'consumables',
    rewards: { undoTokens: 30 },
    isNonConsumable: false,
    originalPrice: '$7.99',
    originalPriceAmount: 7.99,
    icon: '\u21A9\uFE0F',
  },
  {
    id: 'undo_legend',
    storeProductId: 'wordfall_undo_legend',
    name: 'Undo Legend',
    description: 'A legendary stockpile of 75 undo tokens',
    fallbackPrice: '$9.99',
    fallbackPriceAmount: 9.99,
    category: 'consumables',
    rewards: { undoTokens: 75 },
    isNonConsumable: false,
    originalPrice: '$14.99',
    originalPriceAmount: 14.99,
    icon: '\u21A9\uFE0F',
  },

  // ── Consumables: Boosters ──────────────────────────────────────────────
  {
    id: 'booster_crate',
    storeProductId: 'wordfall_booster_crate',
    name: 'Booster Crate',
    description: '5 of each booster type — Wildcard, Spotlight, Shuffle',
    fallbackPrice: '$4.99',
    fallbackPriceAmount: 4.99,
    category: 'consumables',
    rewards: {
      boosters: [
        { type: 'wildcardTile', count: 5 },
        { type: 'spotlight', count: 5 },
        { type: 'smartShuffle', count: 5 },
      ],
    },
    isNonConsumable: false,
    originalPrice: '$7.99',
    originalPriceAmount: 7.99,
    icon: '\u{1F4E6}',
  },

  // ── Piggy Bank (slow-fill gem jar) ───────────────────────────────────────
  // Rewards are dynamic — the accumulated gem count lives in
  // EconomyState.piggyBank and is granted by breakPiggyBank(), not by the
  // generic applyProduct reward path. The rewards.gems value here only
  // satisfies the "has at least one reward" invariant for SHOP_PRODUCTS tests.
  {
    id: 'piggy_bank_break',
    storeProductId: 'wordfall_piggy_bank_break',
    name: 'Break the Piggy Bank',
    description: 'Claim every gem you\u2019ve saved up in the jar.',
    fallbackPrice: '$4.99',
    fallbackPriceAmount: 4.99,
    category: 'currency',
    rewards: { gems: 1 },
    isNonConsumable: false,
    originalPrice: '$7.49',
    originalPriceAmount: 7.49,
    icon: '\u{1FAD9}',
  },

  // ── Currency: Gems ───────────────────────────────────────────────────────
  {
    id: 'gems_30',
    storeProductId: 'wordfall_gems_30',
    name: 'Pocket Gems',
    description: 'A small pouch of 30 gems',
    fallbackPrice: '$0.99',
    fallbackPriceAmount: 0.99,
    category: 'currency',
    rewards: { gems: 30 },
    isNonConsumable: false,
    originalPrice: '$1.99',
    originalPriceAmount: 1.99,
    icon: '\u{1F48E}',
  },
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
    originalPrice: '$1.99',
    originalPriceAmount: 1.99,
    icon: '\u{1F48E}',
  },
  {
    id: 'gems_120',
    storeProductId: 'wordfall_gems_120',
    name: '120 Gems',
    description: 'A stash of 120 gems',
    fallbackPrice: '$2.99',
    fallbackPriceAmount: 2.99,
    category: 'currency',
    rewards: { gems: 120 },
    isNonConsumable: false,
    originalPrice: '$4.99',
    originalPriceAmount: 4.99,
    icon: '\u{1F48E}',
  },
  {
    id: 'gems_200',
    storeProductId: 'wordfall_gems_200',
    name: 'Gem Pouch',
    description: 'A generous pouch of 200 gems',
    fallbackPrice: '$4.99',
    fallbackPriceAmount: 4.99,
    category: 'currency',
    rewards: { gems: 200 },
    isNonConsumable: false,
    originalPrice: '$7.99',
    originalPriceAmount: 7.99,
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
    originalPrice: '$7.99',
    originalPriceAmount: 7.99,
    icon: '\u{1F48E}',
  },
  {
    id: 'gems_400',
    storeProductId: 'wordfall_gems_400',
    name: '400 Gems',
    description: 'A vault of 400 gems',
    fallbackPrice: '$7.99',
    fallbackPriceAmount: 7.99,
    category: 'currency',
    rewards: { gems: 400 },
    isNonConsumable: false,
    originalPrice: '$11.99',
    originalPriceAmount: 11.99,
    icon: '\u{1F48E}',
  },
  {
    id: 'gems_500',
    storeProductId: 'wordfall_gems_500',
    name: '500 Gems',
    description: 'A treasury of 500 gems',
    fallbackPrice: '$9.99',
    fallbackPriceAmount: 9.99,
    category: 'currency',
    rewards: { gems: 500 },
    isNonConsumable: false,
    originalPrice: '$14.99',
    originalPriceAmount: 14.99,
    icon: '\u{1F48E}',
  },
  {
    id: 'gems_1000',
    storeProductId: 'wordfall_gems_1000',
    name: 'Gem Hoard',
    description: 'A massive hoard of 1000 gems',
    fallbackPrice: '$19.99',
    fallbackPriceAmount: 19.99,
    category: 'currency',
    rewards: { gems: 1000 },
    isNonConsumable: false,
    originalPrice: '$29.99',
    originalPriceAmount: 29.99,
    icon: '\u{1F48E}',
  },

  // ── Currency: Coins ─────────────────────────────────────────────────────
  {
    id: 'coins_500',
    storeProductId: 'wordfall_coins_500',
    name: 'Coin Pouch',
    description: 'A pouch of 500 coins',
    fallbackPrice: '$0.99',
    fallbackPriceAmount: 0.99,
    category: 'currency',
    rewards: { coins: 500 },
    isNonConsumable: false,
    originalPrice: '$1.99',
    originalPriceAmount: 1.99,
    icon: '\u{1FA99}',
  },
  {
    id: 'coins_2000',
    storeProductId: 'wordfall_coins_2000',
    name: 'Coin Chest',
    description: 'A chest of 2000 coins',
    fallbackPrice: '$2.99',
    fallbackPriceAmount: 2.99,
    category: 'currency',
    rewards: { coins: 2000 },
    isNonConsumable: false,
    originalPrice: '$4.99',
    originalPriceAmount: 4.99,
    icon: '\u{1FA99}',
  },
  {
    id: 'coins_5000',
    storeProductId: 'wordfall_coins_5000',
    name: 'Coin Vault',
    description: 'A vault of 5000 coins',
    fallbackPrice: '$4.99',
    fallbackPriceAmount: 4.99,
    category: 'currency',
    rewards: { coins: 5000 },
    isNonConsumable: false,
    originalPrice: '$7.99',
    originalPriceAmount: 7.99,
    icon: '\u{1FA99}',
  },

  // ── Premium ──────────────────────────────────────────────────────────────
  {
    id: 'champion_pack',
    storeProductId: 'wordfall_champion_pack',
    name: 'Champion Pack',
    description: '4000 Coins + 200 Gems + 50 Hints + 10 of Each Booster + Exclusive Champion Frame',
    fallbackPrice: '$14.99',
    fallbackPriceAmount: 14.99,
    category: 'premium',
    rewards: {
      coins: 4000,
      gems: 200,
      hintTokens: 50,
      boosters: [
        { type: 'wildcardTile', count: 10 },
        { type: 'spotlight', count: 10 },
        { type: 'smartShuffle', count: 10 },
      ],
      decorations: ['frame_champion_exclusive'],
    },
    isNonConsumable: false,
    originalPrice: '$24.99',
    originalPriceAmount: 24.99,
    icon: '\u{1F3C6}',
  },
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
    originalPrice: '$7.99',
    originalPriceAmount: 7.99,
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
    originalPrice: '$7.99',
    originalPriceAmount: 7.99,
    icon: '\u{1F6AB}',
  },

  // ── Whale-Tier Bundles ───────────────────────────────────────────────────
  {
    id: 'royal_collection',
    storeProductId: 'wordfall_royal_collection',
    name: 'Royal Collection',
    description: '8000 Coins + 400 Gems + 75 Hints + 30 Undos + 10 of Each Booster + Legendary Frame & Title',
    fallbackPrice: '$49.99',
    fallbackPriceAmount: 49.99,
    category: 'bundles',
    rewards: {
      coins: 8000,
      gems: 400,
      hintTokens: 75,
      undoTokens: 30,
      boosters: [
        { type: 'wildcardTile', count: 10 },
        { type: 'spotlight', count: 10 },
        { type: 'smartShuffle', count: 10 },
      ],
      decorations: ['frame_royal_legendary', 'title_royal_collector'],
    },
    isNonConsumable: false,
    originalPrice: '$79.99',
    originalPriceAmount: 79.99,
    icon: '\u{1F451}',
  },
  {
    id: 'ultimate_whale',
    storeProductId: 'wordfall_ultimate_whale',
    name: 'Ultimate Whale Pack',
    description: '30000 Coins + 1500 Gems + 300 Hints + 150 Undos + 50 of Each Booster + 5 Legendary Cosmetics',
    fallbackPrice: '$99.99',
    fallbackPriceAmount: 99.99,
    category: 'bundles',
    rewards: {
      coins: 30000,
      gems: 1500,
      hintTokens: 300,
      undoTokens: 150,
      boosters: [
        { type: 'wildcardTile', count: 50 },
        { type: 'spotlight', count: 50 },
        { type: 'smartShuffle', count: 50 },
      ],
      decorations: ['frame_whale_legendary', 'title_whale_supreme', 'theme_whale_exclusive', 'frame_whale_diamond', 'decoration_whale_trophy'],
    },
    isNonConsumable: false,
    originalPrice: '$199.99',
    originalPriceAmount: 199.99,
    icon: '\u{1F525}',
  },

  // ── Themed / Seasonal Bundles ─────────────────────────────────────────
  {
    id: 'weekend_warrior',
    storeProductId: 'wordfall_weekend_warrior',
    name: 'Weekend Warrior',
    description: '1000 Coins + 50 Gems + 10 Hints + 5 Undos',
    fallbackPrice: '$3.99',
    fallbackPriceAmount: 3.99,
    category: 'bundles',
    rewards: {
      coins: 1000,
      gems: 50,
      hintTokens: 10,
      undoTokens: 5,
    },
    isNonConsumable: false,
    originalPrice: '$5.99',
    originalPriceAmount: 5.99,
    icon: '\u2694\uFE0F',
  },
  {
    id: 'weekly_champion',
    storeProductId: 'wordfall_weekly_champion',
    name: 'Weekly Champion',
    description: '2500 Coins + 100 Gems + 20 Hints + 10 Undos + 3 Each Booster',
    fallbackPrice: '$7.99',
    fallbackPriceAmount: 7.99,
    category: 'bundles',
    rewards: {
      coins: 2500,
      gems: 100,
      hintTokens: 20,
      undoTokens: 10,
      boosters: [
        { type: 'wildcardTile', count: 3 },
        { type: 'spotlight', count: 3 },
        { type: 'smartShuffle', count: 3 },
      ],
    },
    isNonConsumable: false,
    originalPrice: '$11.99',
    originalPriceAmount: 11.99,
    icon: '\u{1F3C6}',
  },
  {
    id: 'event_special',
    storeProductId: 'wordfall_event_special',
    name: 'Event Special',
    description: '3000 Coins + 150 Gems + 30 Hints + 15 Undos + 5 Each Booster + Exclusive Event Frame',
    fallbackPrice: '$9.99',
    fallbackPriceAmount: 9.99,
    category: 'bundles',
    rewards: {
      coins: 3000,
      gems: 150,
      hintTokens: 30,
      undoTokens: 15,
      boosters: [
        { type: 'wildcardTile', count: 5 },
        { type: 'spotlight', count: 5 },
        { type: 'smartShuffle', count: 5 },
      ],
      decorations: ['frame_event_exclusive'],
    },
    isNonConsumable: false,
    originalPrice: '$14.99',
    originalPriceAmount: 14.99,
    icon: '\u{1F389}',
  },
  {
    id: 'season_pass_bundle',
    storeProductId: 'wordfall_season_pass_bundle',
    name: 'Season Pass Bundle',
    description: '5000 Coins + 300 Gems + 50 Hints + 25 Undos + 10 Each Booster + Season Frame & Title',
    fallbackPrice: '$19.99',
    fallbackPriceAmount: 19.99,
    category: 'premium',
    rewards: {
      coins: 5000,
      gems: 300,
      hintTokens: 50,
      undoTokens: 25,
      boosters: [
        { type: 'wildcardTile', count: 10 },
        { type: 'spotlight', count: 10 },
        { type: 'smartShuffle', count: 10 },
      ],
      decorations: ['frame_season_exclusive', 'title_season_champion'],
    },
    isNonConsumable: false,
    originalPrice: '$29.99',
    originalPriceAmount: 29.99,
    icon: '\u{1F31F}',
  },

  // ── Value Packs ─────────────────────────────────────────────────────────
  {
    id: 'quick_boost',
    storeProductId: 'wordfall_quick_boost',
    name: 'Quick Boost',
    description: '300 Coins + 15 Gems + 5 Hints',
    fallbackPrice: '$1.99',
    fallbackPriceAmount: 1.99,
    category: 'bundles',
    rewards: {
      coins: 300,
      gems: 15,
      hintTokens: 5,
    },
    isNonConsumable: false,
    originalPrice: '$2.99',
    originalPriceAmount: 2.99,
    icon: '\u26A1',
  },
  {
    id: 'power_pack',
    storeProductId: 'wordfall_power_pack',
    name: 'Power Pack',
    description: '1500 Coins + 80 Gems + 15 Hints + 5 Each Booster',
    fallbackPrice: '$5.99',
    fallbackPriceAmount: 5.99,
    category: 'bundles',
    rewards: {
      coins: 1500,
      gems: 80,
      hintTokens: 15,
      boosters: [
        { type: 'wildcardTile', count: 5 },
        { type: 'spotlight', count: 5 },
        { type: 'smartShuffle', count: 5 },
      ],
    },
    isNonConsumable: false,
    originalPrice: '$8.99',
    originalPriceAmount: 8.99,
    icon: '\u{1F4AA}',
  },
  {
    id: 'super_bundle',
    storeProductId: 'wordfall_super_bundle',
    name: 'Super Bundle',
    description: '3500 Coins + 175 Gems + 35 Hints + 15 Undos + 8 Each Booster + Exclusive Frame',
    fallbackPrice: '$11.99',
    fallbackPriceAmount: 11.99,
    category: 'premium',
    rewards: {
      coins: 3500,
      gems: 175,
      hintTokens: 35,
      undoTokens: 15,
      boosters: [
        { type: 'wildcardTile', count: 8 },
        { type: 'spotlight', count: 8 },
        { type: 'smartShuffle', count: 8 },
      ],
      decorations: ['frame_super_bundle'],
    },
    isNonConsumable: false,
    originalPrice: '$17.99',
    originalPriceAmount: 17.99,
    icon: '\u{1F4E6}',
  },

  // ── Whale / Premium Packs ──────────────────────────────────────────────
  {
    id: 'diamond_collection',
    storeProductId: 'wordfall_diamond_collection',
    name: 'Diamond Collection',
    description: '12000 Coins + 600 Gems + 100 Hints + 50 Undos + 20 Each Booster + 2 Frames & Title',
    fallbackPrice: '$29.99',
    fallbackPriceAmount: 29.99,
    category: 'bundles',
    rewards: {
      coins: 12000,
      gems: 600,
      hintTokens: 100,
      undoTokens: 50,
      boosters: [
        { type: 'wildcardTile', count: 20 },
        { type: 'spotlight', count: 20 },
        { type: 'smartShuffle', count: 20 },
      ],
      decorations: ['frame_diamond_epic', 'frame_diamond_legendary', 'title_diamond_collector'],
    },
    isNonConsumable: false,
    originalPrice: '$49.99',
    originalPriceAmount: 49.99,
    icon: '\u{1F48E}',
  },
  {
    id: 'platinum_pack',
    storeProductId: 'wordfall_platinum_pack',
    name: 'Platinum Pack',
    description: '20000 Coins + 1000 Gems + 200 Hints + 100 Undos + 30 Each Booster + 3 Frames, 2 Titles & Decoration',
    fallbackPrice: '$74.99',
    fallbackPriceAmount: 74.99,
    category: 'bundles',
    rewards: {
      coins: 20000,
      gems: 1000,
      hintTokens: 200,
      undoTokens: 100,
      boosters: [
        { type: 'wildcardTile', count: 30 },
        { type: 'spotlight', count: 30 },
        { type: 'smartShuffle', count: 30 },
      ],
      decorations: [
        'frame_platinum_epic',
        'frame_platinum_legendary',
        'frame_platinum_mythic',
        'title_platinum_elite',
        'title_platinum_supreme',
        'decoration_platinum_exclusive',
      ],
    },
    isNonConsumable: false,
    originalPrice: '$119.99',
    originalPriceAmount: 119.99,
    icon: '\u{1F525}',
  },

  // ── Subscription ────────────────────────────────────────────────────────
  {
    id: 'vip_weekly',
    storeProductId: 'wordfall_vip_weekly',
    name: 'VIP Weekly',
    description: 'Ad-free + 50 daily gems + 3 daily hints + exclusive VIP frame + 2x XP boost',
    fallbackPrice: '$4.99/week',
    fallbackPriceAmount: 4.99,
    category: 'subscription',
    rewards: {
      flags: { adsRemoved: true, vipSubscriber: true },
      dailyDrip: { gems: 50, hintTokens: 3 },
      decorations: ['frame_vip_exclusive'],
    },
    isNonConsumable: false,
    icon: '\u{1F48E}',
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
