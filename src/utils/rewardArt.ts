/**
 * rewardArt — shared visual-escalation helpers for the progression screens
 * (MasteryScreen / SeasonPassScreen).
 *
 * Blind-panel round 2 flagged two recurring defects:
 *
 * 1. "Reward rows repeat identical coin orbs" — every tier drew the same
 *    small `coin` / `gem` / `hint` glyph regardless of amount. These helpers
 *    map an amount onto the escalating denomination art already in the
 *    GameIcon registry (coin → coinStack → coinPile → coinChestSpill …), so
 *    a 1200-coin tier physically out-riches a 100-coin one, and every 5th
 *    "bundle" tier leads with a chest (bronze free lane / gold premium).
 *    (SeasonPassScreen keeps its own finer per-band ramp — see the ladder
 *    comment at the top of that file — these helpers serve MasteryScreen
 *    and any future track with a single global amount range.)
 *
 * 2. "Gold premium accents clash with the neon palette" — the flat saturated
 *    #ffb800 CTA/chip gold sat raw against magenta/violet. The PREMIUM_*
 *    tokens below re-key premium chrome into the synthwave family: a warm
 *    amber → coral → magenta-leaning gradient, thin white-alpha inner
 *    border, and a softer glow (shadowOpacity ≤ 0.4).
 */
import { ViewStyle } from 'react-native';
import { GameIconName } from '../components/icons/GameIcon';

// ─── Amount → escalating reward art ────────────────────────────────────────

/** Coins: pocket change → stack → pile → spilling chest. */
export function coinArtName(amount: number): GameIconName {
  if (amount > 900) return 'coinChestSpill';
  if (amount > 400) return 'coinPile';
  if (amount >= 150) return 'coinStack';
  return 'coin';
}

/** Gems: single → pair → cluster → hoard. */
export function gemArtName(amount: number): GameIconName {
  if (amount >= 20) return 'gemHoard';
  if (amount >= 10) return 'gemCluster';
  if (amount >= 5) return 'gemPair';
  return 'gemSingle';
}

/** Hints: one bulb → trio. */
export function hintArtName(amount: number): GameIconName {
  return amount >= 2 ? 'hintBulbTrio' : 'hint';
}

/** Milestone bundle chest: bronze on the free lane, gold on premium. */
export function milestoneChestName(lane: 'free' | 'premium'): GameIconName {
  return lane === 'premium' ? 'chestGold' : 'chestBronze';
}

// ─── Premium chrome tokens (synthwave-harmonized gold) ─────────────────────

/** Warm amber → coral → magenta-leaning two-and-a-half-stop CTA fill. */
export const PREMIUM_CTA_GRADIENT = ['#ffc94d', '#ff8a5c', '#ff6b7a'] as const;

/** Accent hue for premium borders / glows (the gradient's coral midpoint). */
export const PREMIUM_ACCENT = '#ff8a5c';

/** Warm amber for PREMIUM chip text — reads gold without the raw #ffb800. */
export const PREMIUM_TEXT = '#ffc94d';

/** Soft warm text glow to replace the saturated goldGlow on premium copy. */
export const PREMIUM_TEXT_GLOW = 'rgba(255,138,92,0.45)';

/** Thin white-alpha inner border that seats the gradient into dark panels. */
export const PREMIUM_INNER_BORDER = 'rgba(255,255,255,0.35)';

/** Softer premium glow — deliberately under SHADOWS.glow's 0.5 opacity. */
export const PREMIUM_GLOW: ViewStyle = {
  shadowColor: PREMIUM_ACCENT,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 8,
};
