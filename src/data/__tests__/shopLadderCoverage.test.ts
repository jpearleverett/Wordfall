/**
 * A SKU in the catalog that no shelf renders is a product that cannot be
 * bought, and this screen has now shipped that bug three times: the gem
 * ladder's 120 / 400 / 1000 tiers, then the per-booster packs, then the whole
 * top of the hint and undo ladders. Each was found by hand, months apart.
 *
 * Two properties, both of which the hint/undo pass violated:
 *
 *  1. COVERAGE — every consumable SKU is either on a shelf or explicitly
 *     excluded with a reason.
 *  2. NO DOMINATED TIER — a rendered ladder never contains a rung that gives
 *     less for the same or more money than another rung of the same ladder.
 *     Six of the eight dark hint/undo SKUs were dominated: `hint_master` sold
 *     30 hints for $4.99 beside 50 hints for $2.99. Rendering them would have
 *     "fixed" the coverage bug by putting six traps on the shelf, so they are
 *     deleted from the catalog instead. There is no price at which showing a
 *     dominated tier helps anyone.
 *
 * ShopScreen's ladders are module-private consts, so this reads the source —
 * the same approach screenReachability and defectLedger take.
 */
import * as fs from 'fs';
import * as path from 'path';
import { SHOP_PRODUCTS } from '../shopProducts';

const SHOP_SCREEN = path.join(__dirname, '../../screens/ShopScreen.tsx');

/** SKUs deliberately not on a consumable shelf. Each needs a reason. */
const NOT_ON_A_SHELF: Record<string, string> = {
  booster_crate: 'Rendered as its own full-width trio row rather than a ladder rung.',
  streak_freeze: 'Sold from the streak-shield contextual offer, not the shop grid.',
};

describe('shop ladder coverage', () => {
  const source = fs.readFileSync(SHOP_SCREEN, 'utf8');
  const rendered = new Set(
    [...source.matchAll(/iapProductId: '([a-z0-9_]+)'/g)].map((m) => m[1]),
  );

  it('every consumable SKU reaches a shelf', () => {
    const dark = SHOP_PRODUCTS.filter(
      (p) => p.category === 'consumables' && !rendered.has(p.id) && !(p.id in NOT_ON_A_SHELF),
    ).map((p) => `${p.id} (${p.fallbackPrice})`);
    expect(dark).toEqual([]);
  });

  it('the exclusion list does not outlive its entries', () => {
    for (const id of Object.keys(NOT_ON_A_SHELF)) {
      expect(SHOP_PRODUCTS.some((p) => p.id === id)).toBe(true);
    }
  });

  it('no ladder offers a rung that is beaten by a cheaper one', () => {
    // Compare only rungs of the SAME ladder — products paying out the same
    // set of reward keys. A hint pack and a wildcard pack are not comparable;
    // 25 hints for $1.99 versus 15 hints for $1.99 is.
    const rungs = SHOP_PRODUCTS.filter((p) => rendered.has(p.id) && p.category === 'consumables')
      .map((p) => {
        const rewards = p.rewards as Record<string, number | undefined>;
        const keys = Object.keys(rewards).filter((k) => typeof rewards[k] === 'number').sort();
        return { id: p.id, price: p.fallbackPriceAmount, ladder: keys.join('+'), rewards, keys };
      });

    const dominated: string[] = [];
    for (const a of rungs) {
      for (const b of rungs) {
        if (a.id === b.id || a.ladder !== b.ladder) continue;
        if (b.price > a.price) continue;
        const atLeastAsMuch = a.keys.every((k) => (b.rewards[k] ?? 0) >= (a.rewards[k] ?? 0));
        const strictlyMore = a.keys.some((k) => (b.rewards[k] ?? 0) > (a.rewards[k] ?? 0));
        if (atLeastAsMuch && strictlyMore) {
          dominated.push(`${a.id} ($${a.price}) is beaten by ${b.id} ($${b.price})`);
        }
      }
    }
    expect(dominated).toEqual([]);
  });

  it('the six dominated SKUs stay deleted', () => {
    for (const id of [
      'hint_starter', 'hint_bundle_15', 'hint_master',
      'undo_starter', 'undo_bundle_15', 'undo_master',
    ]) {
      expect(SHOP_PRODUCTS.some((p) => p.id === id)).toBe(false);
    }
  });
});
