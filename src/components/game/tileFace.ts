/**
 * The look of a tile's face, in one place.
 *
 * A cleared tile is replaced, on the very next frame, by a dissolving ghost
 * standing at the same pixels. If the two do not agree on every value here,
 * that substitution is a hard one-frame change on every letter of the word at
 * once — the word appears to blink and be redrawn in place rather than to
 * begin dissolving. Sharing the constants is what keeps the handoff invisible;
 * `__tests__/tileFaceParity.test.ts` keeps them from drifting apart again.
 */

/** Valid-word (green) body ramp. */
export const TILE_BODY_VALID: [string, string, string, string, string] = [
  '#33ffaa',
  '#00ff87',
  '#00d96e',
  '#00b85c',
  '#008844',
];

/** Valid-word top highlight. */
export const TILE_HIGHLIGHT_VALID: [string, string] = [
  'rgba(200,255,230,0.65)',
  'rgba(0,255,135,0.0)',
];

export const TILE_GRADIENT_START = { x: 0.2, y: 0 };
export const TILE_GRADIENT_END = { x: 0.8, y: 1 };
export const TILE_HIGHLIGHT_START = { x: 0.5, y: 0 };
export const TILE_HIGHLIGHT_END = { x: 0.5, y: 0.55 };

/** Letter size and corner radius as fractions of the cell. */
export const TILE_LETTER_SIZE_FACTOR = 0.5;
export const TILE_LETTER_SPACING = 0.4;
export const TILE_RADIUS_FACTOR = 0.2;

/**
 * The scale a SELECTED tile rests at.
 *
 * LetterCell springs to this on selection and stays there, so every tile of a
 * traced word is sitting at this scale at the moment it is cleared. A ghost
 * that mounts at 1.0 shrinks all of them ~7% on one frame and then swells past
 * where they were — a pulse, not a dissolve.
 */
export const TILE_SELECTED_REST_SCALE = 1.08;

/** Bevel rim and material bands, shared so the ghost inherits them too. */
export const TILE_BEVEL = {
  width: 1.5,
  top: 'rgba(255,255,255,0.40)',
  left: 'rgba(255,255,255,0.20)',
  right: 'rgba(0,0,0,0.32)',
  bottom: 'rgba(0,0,0,0.46)',
} as const;

export const TILE_SPECULAR = {
  top: 0.06,
  inset: 0.12,
  height: 0.05,
  raised: 'rgba(255,255,255,0.45)',
  resting: 'rgba(255,255,255,0.26)',
} as const;

export const TILE_BOTTOM_SHADE = {
  height: 0.15,
  color: 'rgba(0,0,0,0.35)',
} as const;

/** Inner radius once the 2px border is accounted for. */
export function tileInsetRadius(size: number): number {
  return Math.max(size * TILE_RADIUS_FACTOR - 2, 2);
}
