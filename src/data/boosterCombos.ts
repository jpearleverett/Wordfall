/**
 * Booster combo synergies — when two boosters are active within the same
 * puzzle, fire a combo effect with bonus feedback + score multiplier.
 *
 * Pairing logic:
 *   wildcardTile + spotlight  → Eagle Eye   (2x score on next N words)
 *   wildcardTile + smartShuffle → Lucky Roll (2x score on next N words)
 *   spotlight    + smartShuffle → Power Surge (2x score on next N words)
 *
 * The multiplier and duration are Remote-Config-driven so they can be tuned
 * in soft launch without a rebuild. The visual "pulse-highlight post-shuffle"
 * and "guaranteed-perfect-fit wildcard after shuffle" behaviours described
 * in the original plan are deferred — the 2x multiplier + celebratory banner
 * carry the primary dopamine hit.
 */

export type BoosterType = 'wildcardTile' | 'spotlight' | 'smartShuffle';

export type ComboType = 'eagleEye' | 'luckyRoll' | 'powerSurge';

export interface ComboDefinition {
  id: ComboType;
  name: string;
  tagline: string;
  /** Ordered booster pair that triggers this combo; order-insensitive at runtime. */
  pair: [BoosterType, BoosterType];
  /** Emoji/icon shown in the banner. Swap for custom art when commissioned. */
  icon: string;
}

export const COMBO_DEFINITIONS: Record<ComboType, ComboDefinition> = {
  eagleEye: {
    id: 'eagleEye',
    name: 'Eagle Eye',
    tagline: 'Wildcard + Spotlight — every tile counts',
    pair: ['wildcardTile', 'spotlight'],
    icon: '\uD83E\uDD85',
  },
  luckyRoll: {
    id: 'luckyRoll',
    name: 'Lucky Roll',
    tagline: 'Wildcard + Shuffle — the dice favor you',
    pair: ['wildcardTile', 'smartShuffle'],
    icon: '\uD83C\uDFB2',
  },
  powerSurge: {
    id: 'powerSurge',
    name: 'Power Surge',
    tagline: 'Spotlight + Shuffle — full field awareness',
    pair: ['spotlight', 'smartShuffle'],
    icon: '\u26A1',
  },
};

/**
 * Resolve a combo from an unordered pair of booster types. Returns null when
 * the pair isn't a recognized combo (e.g. the same booster twice, or a
 * future booster we haven't mapped).
 */
export function resolveCombo(a: BoosterType, b: BoosterType): ComboType | null {
  if (a === b) return null;
  for (const def of Object.values(COMBO_DEFINITIONS)) {
    const [p, q] = def.pair;
    if ((p === a && q === b) || (p === b && q === a)) return def.id;
  }
  return null;
}

/**
 * Given the set of boosters used so far this puzzle and the booster that was
 * just activated, return the combo to trigger (or null). A combo fires once
 * per new booster activation — if three boosters end up used in one puzzle,
 * the second activation triggers its combo and the third activation triggers
 * a new combo against one of the earlier two (whichever pairs most recently).
 */
export function detectCombo(
  priorBoosters: BoosterType[],
  justActivated: BoosterType,
): ComboType | null {
  // Pair the newly-activated booster with the most-recent distinct prior
  // booster. Last-write-wins gives predictable tapability: a player who taps
  // Spotlight → Wildcard → Shuffle gets Eagle Eye on tap 2 and Lucky Roll on
  // tap 3, never a stale Eagle Eye that never expired.
  for (let i = priorBoosters.length - 1; i >= 0; i--) {
    const prior = priorBoosters[i];
    if (prior === justActivated) continue;
    const combo = resolveCombo(prior, justActivated);
    if (combo) return combo;
  }
  return null;
}
