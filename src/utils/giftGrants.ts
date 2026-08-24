/**
 * giftGrants — the single canonical conversion from a gift document to
 * economy goods.
 *
 * Both claim surfaces (ClubScreen's GiftInbox and the HomeScreen claim-all
 * banner in App.tsx) MUST route through this mapper. They used to disagree:
 * the Home banner turned 'tile' — and, via a bare else, even 'life' — gifts
 * into random rare collection letters, while the club inbox granted a
 * wildcardTile booster token / lives, so the value of the same gift depended
 * on which screen claimed it. The GiftInbox mapping is the contract (see the
 * usage notes in src/services/gifts.ts): hint → hint tokens, tile →
 * wildcardTile booster token, life → lives, amount clamped to [1, 10].
 */

export type GiftGrantType = 'hint' | 'tile' | 'life';

/** The subset of economy actions a gift grant can touch. */
export interface GiftGrantActions {
  addHintTokens: (amount: number) => void;
  addBoosterToken: (
    type: 'wildcardTile' | 'spotlight' | 'smartShuffle',
    amount?: number,
  ) => void;
  addLives: (count: number) => void;
}

/**
 * Server-side gifts carry amounts 1–10; clamp defensively on claim so a
 * malformed or legacy document can never over-grant.
 */
export function clampGiftAmount(amount: number | undefined | null): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return 1;
  return Math.max(1, Math.min(Math.floor(amount), 10));
}

/**
 * Apply one gift's grant through the injected economy actions.
 *
 * Returns the granted `{ type, amount }` so callers can summarize (e.g. the
 * claim-all alert), or null for an unknown type — which grants nothing.
 * Exhaustive by design: never add a bare-else fallthrough here.
 */
export function applyGiftGrant(
  gift: { type: string; amount?: number },
  actions: GiftGrantActions,
): { type: GiftGrantType; amount: number } | null {
  const amount = clampGiftAmount(gift.amount);
  switch (gift.type as GiftGrantType) {
    case 'hint':
      actions.addHintTokens(amount);
      return { type: 'hint', amount };
    case 'tile':
      actions.addBoosterToken('wildcardTile', amount);
      return { type: 'tile', amount };
    case 'life':
      actions.addLives(amount);
      return { type: 'life', amount };
    default:
      return null;
  }
}
