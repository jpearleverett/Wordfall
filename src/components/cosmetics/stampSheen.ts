/**
 * Per-stamp foil sheen — the fix for "every single card carries the identical
 * diagonal gloss streak in the same position, so the collectibles read as one
 * recolored template".
 *
 * The streak is now derived from the stamp's SHEET POSITION: angle, band
 * width, centre offset and opacity each come from a table of a different
 * length, so consecutive stamps never land on the same combination (the angle
 * table alone guarantees adjacent stamps differ) and the pattern only repeats
 * after 8 × 5 × 6 × 5 = 1200 positions — far past any album page.
 *
 * Roughly one stamp in three is MATTE (no sheen at all). A sheet where every
 * card glints reads as printed foil stock; a sheet that mixes gloss and matte
 * paper reads as a collection of different stamps. The matte rule has period
 * 8 with 3 hits and never selects two neighbours, so matte cards are sprinkled
 * rather than clumped.
 *
 * Pure math, no SVG imports, so it can be pinned by the collectible tests the
 * same way `frameArtCatalog` / `achievementBadgeCatalog` are.
 */

export interface StampSheen {
  /** Streak direction in degrees (0 = left→right, negative tilts the other way). */
  angle: number;
  /** Half-width of the bright band, in gradient-offset units. */
  width: number;
  /** Where along the gradient the band peaks (0–1). */
  center: number;
  /** Peak whiteness of the band. */
  opacity: number;
}

/** Streak directions — both diagonals, plus near-vertical and near-horizontal. */
const ANGLES = [38, -24, 66, 12, -52, 80, 30, -68];
const WIDTHS = [0.07, 0.13, 0.09, 0.17, 0.11];
const CENTERS = [0.5, 0.38, 0.62, 0.45, 0.56, 0.33];
const OPACITIES = [0.2, 0.13, 0.26, 0.16, 0.1];

/** Stable small hash so a stamp with no sheet index still varies by id. */
export function stampSheenIndex(index: number | undefined, stampId?: string): number {
  if (typeof index === 'number' && Number.isFinite(index)) return Math.abs(Math.trunc(index));
  let h = 0;
  for (let i = 0; i < (stampId?.length ?? 0); i++) h = (h * 31 + (stampId as string).charCodeAt(i)) % 1200;
  return h;
}

/** True when this sheet position prints on matte paper (no foil streak). */
export function isMatteStamp(index: number): boolean {
  return (index * 3 + 1) % 8 < 3;
}

/**
 * Sheen spec for a sheet position, or `null` for the matte stamps. Feed it
 * `stampSheenIndex(index, stampId)` so callers that only know the id still
 * get a stable, varied streak.
 */
export function stampSheen(index: number): StampSheen | null {
  const i = Math.abs(Math.trunc(index));
  if (isMatteStamp(i)) return null;
  return {
    angle: ANGLES[i % ANGLES.length],
    width: WIDTHS[i % WIDTHS.length],
    center: CENTERS[i % CENTERS.length],
    opacity: OPACITIES[i % OPACITIES.length],
  };
}

/**
 * Gradient endpoints (objectBoundingBox units) for a streak at `angle`,
 * centered on the stamp so the band sweeps across the whole face.
 */
export function sheenVector(angle: number): { x1: number; y1: number; x2: number; y2: number } {
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a) / 2;
  const dy = Math.sin(a) / 2;
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return { x1: r(0.5 - dx), y1: r(0.5 - dy), x2: r(0.5 + dx), y2: r(0.5 + dy) };
}
