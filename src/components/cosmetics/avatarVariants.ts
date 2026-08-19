/**
 * Avatar variant catalog — the palette + silhouette spec behind
 * `AvatarPortrait`. The player character is the WORD ARCHITECT: a hooded
 * scholar rebuilding the Grand Library, drawn 3/4 against a synthwave sunset.
 *
 * Four variants exist so different profile frames host visibly different
 * portraits (the store's six frame cards used to enclose the identical dark
 * bust). Each variant changes BOTH the hood/cloak silhouette and the cloth /
 * skin palette, so they read as different characters at 44px, not recolors.
 *
 * Pure data + resolver (no SVG imports) so tests can pin coverage without
 * pulling in react-native-svg — same split as `frameArtCatalog`.
 */

export type AvatarVariantId = 'architect' | 'scribe' | 'oracle' | 'warden';

/** Silhouette family. Drives hood, drape, cloak, collar and rim geometry. */
export type HoodStyle = 'peaked' | 'round' | 'broad' | 'wrapped';

export interface AvatarVariantSpec {
  id: AvatarVariantId;
  hood: HoodStyle;
  /** Hood + cloak base cloth (#rrggbb). Lit/shadow stops derive from it. */
  cloth: string;
  /** Collar / trim cloth — always lighter than `cloth` so the neck reads. */
  collar: string;
  /** Mid skin tone. Deliberately mid-to-light; the lit cheek goes lighter. */
  skin: string;
  /** Letter on the floating tile motif by the shoulder. */
  glyph: string;
}

const spec = (
  id: AvatarVariantId,
  hood: HoodStyle,
  cloth: string,
  collar: string,
  skin: string,
  glyph: string,
): AvatarVariantSpec => ({ id, hood, cloth, collar, skin, glyph });

export const AVATAR_VARIANTS: Record<AvatarVariantId, AvatarVariantSpec> = {
  // Peaked violet cowl — the canonical Word Architect.
  architect: spec('architect', 'peaked', '#5b3fb0', '#9b7bff', '#e8b088', 'A'),
  // Round teal hood, slimmer mantle — the archivist scribe.
  scribe: spec('scribe', 'round', '#1f6f86', '#46c9dc', '#d9975f', 'W'),
  // Wrapped plum shawl with a trailing veil.
  oracle: spec('oracle', 'wrapped', '#8a2f6d', '#e470b4', '#f2c69c', 'O'),
  // Broad bronze mantle, hood pushed back off the brow.
  warden: spec('warden', 'broad', '#7a4a1f', '#e0aa5e', '#e0a172', 'R'),
};

export const AVATAR_VARIANT_ORDER: AvatarVariantId[] = [
  'architect',
  'scribe',
  'oracle',
  'warden',
];

/**
 * Stable FNV-1a hash so a given frame id always picks the same variant.
 * The avalanche tail matters: raw FNV over ids that share long suffixes
 * (`*_frame`, `*_ring`) clumped 10 of 25 catalog frames onto one figure,
 * which is the "every frame shows the same avatar" complaint all over again.
 */
export function hashAvatarSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return Math.abs(h >>> 0);
}

/**
 * Resolve a portrait variant. An explicit variant id wins; anything else
 * (a frame id, a player id, undefined) hashes deterministically into the
 * four-variant rotation so callers never have to pick by hand.
 */
export function resolveAvatarVariant(seed?: string | null): AvatarVariantSpec {
  if (!seed) return AVATAR_VARIANTS.architect;
  const direct = AVATAR_VARIANTS[seed as AvatarVariantId];
  if (direct) return direct;
  const idx = hashAvatarSeed(seed) % AVATAR_VARIANT_ORDER.length;
  return AVATAR_VARIANTS[AVATAR_VARIANT_ORDER[idx]];
}
