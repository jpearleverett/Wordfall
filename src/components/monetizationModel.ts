/**
 * monetizationModel — pure, test-importable logic shared by the in-game
 * monetization surfaces (ContextualOffer, MiniPackSheet, PostLossModal,
 * MysteryWheel odds sheet, GameScreen's offer-accept handlers).
 *
 * Exists for one reason: DISPLAY AND CHARGE MUST READ THE SAME VALUE.
 * The August 2026 monetization audit found three offers whose locale price
 * strings said "5 gems" while the accept handler charged 50 coins, and a
 * post-loss button labeled "$0.99" whose handler silently spent 80 coins.
 * Both halves were individually correct, so no type check or unit test on
 * either side could catch the divergence — pinning both to one constant is
 * the only structural fix. Keep every price a surface renders AND charges
 * in this module.
 *
 * Deliberately free of React/React Native imports so plain ts-jest tests
 * can import it (the components that consume it pull in reanimated / SVG /
 * expo modules that the node test environment cannot resolve).
 */
import { COIN_SHOP_ITEMS, CoinShopItem, canPurchaseCoinItem } from '../data/coinShop';
import { getProductById, ShopProduct } from '../data/shopProducts';
import { getRemoteNumber } from '../services/remoteConfig';

// ── Contextual offer pricing ────────────────────────────────────────────────

/** Mirrors ContextualOffer's OfferType union (that file cannot be imported here). */
export type PricedOfferType =
  | 'hint_rescue'
  | 'close_finish'
  | 'close_finish_premium'
  | 'post_puzzle'
  | 'booster_pack'
  | 'life_refill'
  | 'streak_shield';

export type OfferCurrency = 'coins' | 'gems';

export interface OfferPrice {
  currency: OfferCurrency;
  amount: number;
}

/**
 * Difficulty multiplier for the coin-priced in-run rescue offers. The flat
 * 25/50/80 coin prices predate the 10–40 coins/level payout curve: at easy
 * they were 1–3 levels of income, at expert they were pocket change. Scaling
 * with the difficulty tier already in scope at the call sites keeps the
 * relative cost roughly constant across the curve. Rounded to 5 so prices
 * stay legible ("75", not "62.5" or "63").
 */
export const RESCUE_PRICE_MULTIPLIER: Record<string, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2.5,
  expert: 4,
};

/**
 * The difficulty label freezes at 'expert' from L31 onward while per-level
 * income keeps its late-game shape, so the x4 cap made every rescue trivially
 * cheap for the deepest (highest-LTV) cohort. Two level bands continue the
 * ladder past the label plateau.
 */
export const RESCUE_MULTIPLIER_LEVEL_BANDS: ReadonlyArray<{ minLevel: number; multiplier: number }> = [
  { minLevel: 601, multiplier: 8 },
  { minLevel: 151, multiplier: 6 },
];

export function getRescuePriceMultiplier(difficulty?: string, level?: number): number {
  const base = RESCUE_PRICE_MULTIPLIER[difficulty ?? 'easy'] ?? 1;
  if (typeof level === 'number' && Number.isFinite(level)) {
    for (const band of RESCUE_MULTIPLIER_LEVEL_BANDS) {
      if (level >= band.minLevel) return Math.max(base, band.multiplier);
    }
  }
  return base;
}

/**
 * Hints granted by each coin-priced rescue offer. Display (locale strings
 * interpolate {{count}}) and grant (GameScreen's accept handler) both read
 * this record — same display==charge rule as the prices.
 */
export const OFFER_HINT_GRANTS = {
  hint_rescue: 3,
  close_finish: 1,
  post_puzzle: 5,
} as const;

const OFFER_BASE_PRICES: Record<
  PricedOfferType,
  { currency: OfferCurrency; base: number; scalesWithDifficulty?: boolean }
> = {
  // Coin-priced rescues — scale with difficulty (task: display == charge).
  // Bases hold the per-hint floor at >= ~25c: contextual offers stay a deal
  // relative to the 100c coin-shop hint, but no longer sell at 8-16c/hint,
  // which undercut every hint SKU at exactly the moments of highest intent.
  hint_rescue: { currency: 'coins', base: 80, scalesWithDifficulty: true },
  close_finish: { currency: 'coins', base: 25, scalesWithDifficulty: true },
  post_puzzle: { currency: 'coins', base: 150, scalesWithDifficulty: true },
  // Gem-priced offers — flat.
  booster_pack: { currency: 'gems', base: 15 },
  life_refill: { currency: 'gems', base: 10 },
  streak_shield: { currency: 'gems', base: 30 },
  // Remote-Config-priced escalation; `base` is only the RC fallback shape.
  close_finish_premium: { currency: 'gems', base: 9 },
};

/** Round to the nearest 5, never below 5. */
export function roundPriceToFive(value: number): number {
  return Math.max(5, Math.round(value / 5) * 5);
}

/**
 * The single source for what a contextual offer costs. GameScreen's accept
 * handler charges this; ContextualOffer renders this. `difficulty` is the
 * tier string from `getDifficultyTier(level)` — unknown/absent tiers price
 * at the easy multiplier rather than throwing.
 */
export function getOfferPrice(type: PricedOfferType, difficulty?: string, level?: number): OfferPrice {
  if (type === 'close_finish_premium') {
    // Same read the accept handler has always used — RC-tunable without a build.
    const rc = Math.round(getRemoteNumber('closeFinishPremiumGemCost'));
    return { currency: 'gems', amount: Math.max(1, Number.isFinite(rc) ? rc : OFFER_BASE_PRICES[type].base) };
  }
  const def = OFFER_BASE_PRICES[type];
  if (def.scalesWithDifficulty) {
    const mult = getRescuePriceMultiplier(difficulty, level);
    return { currency: def.currency, amount: roundPriceToFive(def.base * mult) };
  }
  return { currency: def.currency, amount: def.base };
}

// ── Post-loss hint pack ─────────────────────────────────────────────────────

/**
 * The PostLossModal "buy hints" pack. The label used to claim "$0.99" while
 * the handler spent 80 coins — a policy-level trust defect. Label and charge
 * both read this record now.
 */
export const POST_LOSS_HINT_PACK = {
  hintCount: 3,
  costCoins: 120,
} as const;

// ── Timeout continue ────────────────────────────────────────────────────────

/** Seconds granted by the Time Pressure "watch ad → continue" offer. */
export const TIMEOUT_CONTINUE_SECONDS = 30;

/**
 * Gem fallback for the timeout continue once the once-per-attempt ad continue
 * is spent (or ads are unavailable/capped). Same +30s grant as the ad path.
 */
export const TIMEOUT_CONTINUE_GEM_COST = 12;

// ── Partial hint (first-letter reveal) ──────────────────────────────────────

/**
 * Cheaper rung under the 100c full-word hint: reveals only the first cell of
 * a findable word. Priced as a direct coin spend at tap time (no inventory).
 */
export const FIRST_LETTER_HINT_COST_COINS = 40;

// ── Double-reward grant (victory screen "Watch ad to DOUBLE rewards") ───────

/**
 * What the doubler actually grants: a delta equal to the coins+gems already
 * awarded for this completion, making the player's total exactly 2×. The
 * totals are the authoritative post-cap figures from the reward wiring, so a
 * repeat board (0/0) doubles to 0 — correct, and the UI shows it truthfully.
 * Returns null when there is nothing to grant or it was already granted
 * (exactly-once per completion).
 */
export function computeDoubleRewardGrant(
  totalCoinsAwarded: number,
  totalGemsAwarded: number,
  alreadyGranted: boolean,
): { coins: number; gems: number } | null {
  if (alreadyGranted) return null;
  const coins = Number.isFinite(totalCoinsAwarded) ? Math.max(0, Math.floor(totalCoinsAwarded)) : 0;
  const gems = Number.isFinite(totalGemsAwarded) ? Math.max(0, Math.floor(totalGemsAwarded)) : 0;
  if (coins <= 0 && gems <= 0) return null;
  return { coins, gems };
}

// ── Wheel odds disclosure formatting ────────────────────────────────────────

/**
 * Format a wheel-wedge probability for the odds disclosure. The 500-gem
 * jackpot sits at ~0.1% weight since the faucet collapse; a formatter that
 * rounds to zero would turn the disclosure into a false statement on a
 * compliance surface. Widens the decimal count until the printed value is
 * non-zero (capped at 4 places).
 */
export function formatOddsPercent(percent: number): string {
  if (!Number.isFinite(percent) || percent <= 0) return '0%';
  let decimals = 2;
  while (decimals < 4 && Number(percent.toFixed(decimals)) === 0) {
    decimals += 1;
  }
  return `${percent.toFixed(decimals)}%`;
}

// ── Mini pack sheet options ─────────────────────────────────────────────────

export type MiniPackNeed = 'hints' | 'gems' | 'coins' | 'boosters' | 'undo';

export interface MiniPackContext {
  /** Player's current coin balance (drives the affordable flag). */
  coins: number;
  /** A rewarded ad can be shown right now (adManager.canShowAd(...)). */
  adAvailable: boolean;
  /** Remove-Ads owner: the ad option auto-grants without playing an ad. */
  isAdFree: boolean;
  /**
   * Coin-shop purchases already made today ({ [itemId]: count }) — same
   * ledger ShopScreen persists under COIN_SHOP_TRACKING_KEY, so sheet
   * purchases cannot bypass the daily caps that stop unbounded
   * coins→consumables conversion.
   */
  purchasesToday?: Record<string, number>;
  /** Live currency-localized price for an IAP id; catalog fallback otherwise. */
  iapPriceFor?: (productId: string) => string | undefined;
  /**
   * A first-letter partial hint can be delivered right now (mid-run, board
   * can produce a hint, and the opener passed an onPartialHint handler).
   * Adds the cheap 40c rung above the 100c full-word hint.
   */
  partialHintAvailable?: boolean;
}

export type MiniPackOption =
  | {
      kind: 'partial_hint';
      id: 'partial_hint';
      title: string;
      detail: string;
      icon: string;
      costCoins: number;
      affordable: boolean;
    }
  | {
      kind: 'coin_item';
      id: string;
      item: CoinShopItem;
      title: string;
      detail: string;
      icon: string;
      costCoins: number;
      affordable: boolean;
      dailyLimitReached: boolean;
    }
  | {
      kind: 'iap';
      id: string;
      product: ShopProduct;
      title: string;
      detail: string;
      icon: string;
      priceLabel: string;
    }
  | {
      kind: 'ad';
      id: string;
      title: string;
      detail: string;
      icon: string;
      adRewardType: 'hint_reward';
    };

/**
 * AsyncStorage key for the coin-shop daily purchase ledger.
 * DUPLICATED from ShopScreen.tsx (which defines it privately) — the shop
 * screen is outside this change's ownership; exporting it from one shared
 * location is noted for integration. The two literals must stay identical.
 */
export const COIN_SHOP_TRACKING_KEY = '@wordfall_coinshop_daily';

function coinItem(id: string, ctx: MiniPackContext): MiniPackOption | null {
  const item = COIN_SHOP_ITEMS.find((i) => i.id === id);
  if (!item) return null;
  const counts = ctx.purchasesToday ?? {};
  return {
    kind: 'coin_item',
    id: item.id,
    item,
    title: item.name,
    detail: item.description,
    icon: item.icon,
    costCoins: item.costCoins,
    affordable: ctx.coins >= item.costCoins,
    dailyLimitReached: !canPurchaseCoinItem(item.id, counts),
  };
}

function iapOption(productId: string, ctx: MiniPackContext): MiniPackOption | null {
  const product = getProductById(productId);
  if (!product) return null;
  return {
    kind: 'iap',
    id: product.id,
    product,
    title: product.name,
    detail: product.description,
    icon: product.icon,
    priceLabel: ctx.iapPriceFor?.(product.id) ?? product.fallbackPrice,
  };
}

/**
 * Build the option list for one "need". Pure: every conversion path the
 * sheet renders comes from here, so a test can pin that each zero-inventory
 * moment offers coin-shop, IAP, and (where sensible) ad paths.
 */
export function buildMiniPackOptions(need: MiniPackNeed, ctx: MiniPackContext): MiniPackOption[] {
  const options: (MiniPackOption | null)[] = [];
  switch (need) {
    case 'hints':
      if (ctx.partialHintAvailable) {
        // The bottom rung of the precision ladder: reveal just the first
        // letter for 40c. Wordscapes' 100/200/300 tiering is its highest-
        // volume SKU structure; this fills the empty rung under the 100c
        // full-word reveal.
        options.push({
          kind: 'partial_hint',
          id: 'partial_hint',
          title: 'First-Letter Peek',
          detail: 'Lights up the first letter of a findable word — instantly.',
          icon: '\u{1F526}',
          costCoins: FIRST_LETTER_HINT_COST_COINS,
          affordable: ctx.coins >= FIRST_LETTER_HINT_COST_COINS,
        });
      }
      if (ctx.adAvailable || ctx.isAdFree) {
        options.push({
          kind: 'ad',
          id: 'ad_hint',
          title: ctx.isAdFree ? 'Claim a free hint' : 'Watch ad for a hint',
          detail: ctx.isAdFree ? 'Ad-free perk — no ad plays' : '+1 hint token, free',
          icon: '\u{1F3AC}',
          adRewardType: 'hint_reward',
        });
      }
      options.push(coinItem('coin_hint_1', ctx));
      options.push(coinItem('coin_hint_3', ctx));
      options.push(iapOption('hint_bundle_10', ctx));
      break;
    case 'gems':
      // Small / medium / large — ids must exist in SHOP_PRODUCTS (gems_50 is
      // the smallest real SKU; a bad id silently drops the row via the
      // null-filter, so the pin test checks these resolve).
      options.push(iapOption('gems_50', ctx));
      options.push(iapOption('gems_120', ctx));
      options.push(iapOption('gems_500', ctx));
      break;
    case 'coins':
      options.push(iapOption('coins_500', ctx));
      options.push(iapOption('coins_2000', ctx));
      options.push(iapOption('coins_5000', ctx));
      break;
    case 'boosters':
      options.push(coinItem('coin_spotlight', ctx));
      options.push(coinItem('coin_shuffle', ctx));
      options.push(coinItem('coin_wildcard', ctx));
      options.push(iapOption('booster_crate', ctx));
      break;
    case 'undo':
      // Undo demand peaks at the stuck moment; before this need existed a
      // zero-token undo tap silently no-oped (the only consumable with no
      // store bridge). Coin items first, coin liquidity as the fallback.
      options.push(coinItem('coin_undo_1', ctx));
      options.push(coinItem('coin_undo_3', ctx));
      options.push(iapOption('coins_500', ctx));
      break;
  }
  return options.filter((o): o is MiniPackOption => o !== null);
}

/** Record one coin-item purchase in the daily ledger (pure — caller persists). */
export function applyCoinPurchaseToCounts(
  counts: Record<string, number>,
  itemId: string,
): Record<string, number> {
  return { ...counts, [itemId]: (counts[itemId] ?? 0) + 1 };
}
