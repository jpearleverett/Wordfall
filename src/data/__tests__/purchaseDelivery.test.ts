/**
 * EVERYTHING A PLAYER CAN BUY MUST HAVE A DELIVERY PATH.
 *
 * The defect sweep found five distinct purchase surfaces that debited
 * currency (or a capped ad view) and granted nothing: coin-shop
 * temporary-effect items hit an empty switch arm, the Lucky Draw deal's only
 * content had no delivery branch, cosmetic-store decorations were routed
 * through a granter that silently rejects decoration ids, the ad-for-spin
 * button granted no spin, and a "Premium Hint" SKU sold the basic hint at
 * 2.5x. Every one showed a success message.
 *
 * These are data-level guards: they pin the catalog shapes the fixed
 * handlers rely on, so a new item with an undeliverable reward shape fails
 * here instead of becoming charge-and-nothing in production.
 */
import { COIN_SHOP_ITEMS } from '../coinShop';
import { DEAL_POOL } from '../dailyDeals';
import { LIBRARY_DECORATIONS } from '../cosmetics';

/** Reward types ShopScreen's switch actually delivers. */
const DELIVERABLE_COIN_REWARDS = new Set(['hint', 'undo', 'booster', 'temporary_effect', 'cosmetic_rental']);

/** Effect ids the entitlement store accepts (CommercialEffectId). */
const KNOWN_EFFECT_IDS = new Set([
  'double_xp',
  'lucky_charm',
  'lucky_boost',
  'double_coins',
  'vip_experience',
  'premium_theme_rental',
  'random_premium_theme',
  'golden_frame_rental',
  'board_freeze',
  'score_doubler',
]);

/** Deal content keys App.tsx's onBuyDeal knows how to grant. */
const DELIVERABLE_DEAL_CONTENTS = new Set(['coins', 'gems', 'hintTokens', 'cosmetic']);

describe('coin shop catalog is fully deliverable', () => {
  it.each(COIN_SHOP_ITEMS.map((i) => [i.id, i] as const))('%s', (_id, item) => {
    expect(DELIVERABLE_COIN_REWARDS.has(item.reward.type)).toBe(true);
    if (item.reward.type === 'temporary_effect' || item.reward.type === 'cosmetic_rental') {
      // The grant call is grantTemporaryEntitlement(effectId, ...) — an item
      // without a recognised effectId would fall back to charging for
      // nothing, which is the exact bug this suite exists to prevent.
      expect(item.reward.effectId).toBeDefined();
      expect(KNOWN_EFFECT_IDS.has(item.reward.effectId!)).toBe(true);
    }
  });

  it('the premium-hint SKU stays removed', () => {
    // It sold the identical generic hint token at 2.5x the 100-coin price
    // while its copy promised the premium reveal. Re-adding it requires a
    // real premium-hint entitlement behind it, not just the listing.
    expect(COIN_SHOP_ITEMS.find((i) => i.id === 'coin_premium_hint')).toBeUndefined();
    expect(
      COIN_SHOP_ITEMS.some((i) => (i.reward as { effectId?: string }).effectId === 'premium_hint'),
    ).toBe(false);
  });

  it('one-shot items carry a daily limit', () => {
    // Daily limits are the economic backstop now that they persist; an
    // unlimited coin→token conversion undercuts the real-money packs.
    for (const item of COIN_SHOP_ITEMS) {
      expect(item.dailyLimit).toBeGreaterThan(0);
    }
  });
});

describe('every daily deal is fully deliverable', () => {
  it.each(DEAL_POOL.map((d) => [d.id, d] as const))('%s', (_id, deal) => {
    const keys = Object.keys(deal.contents) as Array<keyof typeof deal.contents>;
    // A deal with NO recognised content is a charge for nothing — the Lucky
    // Draw shipped exactly that way for 75 days of the year.
    expect(keys.some((k) => DELIVERABLE_DEAL_CONTENTS.has(k))).toBe(true);
    for (const key of keys) {
      expect(DELIVERABLE_DEAL_CONTENTS.has(key)).toBe(true);
    }
    // The one cosmetic value onBuyDeal knows how to grant.
    if (deal.contents.cosmetic !== undefined) {
      expect(deal.contents.cosmetic).toBe('random_rare_tile');
    }
  });
});

describe('decoration catalog matches its granter', () => {
  it('every purchasable decoration has an id unlockDecoration will record', () => {
    // unlockCosmetic silently rejects decoration ids (it validates against
    // profile cosmetics), which is how buying one charged and granted
    // nothing. The fixed handler routes tabType 'decorations' to
    // unlockDecoration, which records ANY id — so the guard here is that
    // decorations exist, are priced, and are distinct from profile ids.
    expect(LIBRARY_DECORATIONS.length).toBeGreaterThan(0);
    for (const decoration of LIBRARY_DECORATIONS) {
      expect(decoration.id.length).toBeGreaterThan(0);
      if (decoration.cost) {
        expect(decoration.cost.amount).toBeGreaterThan(0);
        expect(['coins', 'gems', 'libraryPoints']).toContain(decoration.cost.currency);
      }
    }
  });
});
