/**
 * Per-stamp panel wash — the fix for "six of the nine stamps share the same
 * amber/orange gradient, so the grid reads as one uniform colour block".
 *
 * The previous rule keyed the wash purely off the motif FAMILY (sun → amber,
 * wave → teal …). That is correct for a mixed sheet and catastrophic for a
 * seasonal one: the Summer album is sun / heat / beach / ice-cream / tropical
 * almost all the way down, so a family-keyed sheet collapsed onto one hue.
 *
 * So the family hue is now only the STARTING point, and — this is the load
 * bearing part — its influence is deliberately CAPPED. Two stamps that touch
 * on the page can belong to any two families, so an unbounded family hue can
 * always cancel out whatever the index rotation adds; a guarantee is only
 * possible if the family contributes less than the index step. Hence:
 *
 *  - INDEX drives hue: a 5-step ring at `HUE_STEP_DEG` = 72°. Anchored on
 *    amber those land on amber / mint / teal / violet / rose, so a sheet of
 *    nine shows four cool complements alongside the ambers. 72° is chosen
 *    because it maximises the smallest gap over the offsets that can touch on
 *    a 3-column page (i±1, i±2, i±3, i±4); k·72 mod 360 is never below 72.
 *  - FAMILY tints, within ±`FAMILY_TINT_DEG` = 18°, plus its own saturation
 *    and weight. Warm families still print warmer than icy ones, but the
 *    worst case a neighbouring pair can lose is 2×18°, leaving 36° of hue
 *    separation — comfortably visible.
 *  - VALUE alternates light/deep on parity, so the two stamps that DO share a
 *    ring hue (i and i+5) still print at different weights.
 *
 * Hue has period 5 and value period 2, so the wash only repeats every 10
 * stamps. In the album's 3-column grid no touching pair — horizontal (i±1),
 * vertical (i±3) or diagonal (i±2, i±4) — is ever ≡0 mod 5, so no two stamps
 * the eye can compare side by side ever share a wash.
 *
 * Pure math + data, no SVG imports (the same reason `stampArtMap` is split out
 * of `iconsStamps`), so the collectible tests can import it directly.
 */
import type { GameIconName } from '../icons/GameIcon';

// ── Per-motif color families: the STARTING hue, before the index rotation ────
const FAMILIES: Array<[string, GameIconName[]]> = [
  // warm amber — sun, heat, fire, gold
  ['#f2a12c', [
    'stampSun', 'stampHeatwave', 'stampSunrise', 'stampSunflower', 'stampBee',
    'stampLemonade', 'stampCorn', 'stampCandle', 'stampAmber', 'stampHarvestMoon',
    'stampStarTrail', 'stampCrown', 'stampTrophy', 'stampFireworks', 'stampFireflyJar',
  ]],
  // ember orange — autumn, canvas, embers
  ['#e0702a', [
    'stampCampfire', 'stampAutumnLeaf', 'stampPumpkin', 'stampCocoa', 'stampKite',
    'stampUmbrella', 'stampParasol', 'stampSled', 'stampBeachBall',
  ]],
  // ocean teal — water in motion
  ['#1f9fc4', [
    'stampWave', 'stampWaterfall', 'stampSailboat', 'stampSurfboard', 'stampDewdrop',
    'stampSongbird', 'stampFrozenLake',
  ]],
  // foliage green
  ['#3fa25a', [
    'stampSeedling', 'stampFern', 'stampPalm', 'stampEvergreen', 'stampHolly',
    'stampAurora',
  ]],
  // ice blue — frost and vapor
  ['#6fbfe8', [
    'stampSnowflake', 'stampIceCrystal', 'stampSnowman', 'stampMist', 'stampRainCloud',
  ]],
  // blossom pink
  ['#e87fb0', ['stampBlossom', 'stampFlowerCrown', 'stampIceCream', 'stampCoral']],
  // dusk violet
  ['#8b74e8', ['stampButterfly', 'stampCrescentMoon']],
  // warm sand / bark
  ['#cfa15c', ['stampSandcastle', 'stampPaw', 'stampAcorn', 'stampOwl']],
  // crimson
  ['#d8483f', ['stampApple', 'stampMushroom', 'stampGift', 'stampMitten']],
];

const WASH_BY_MOTIF: Partial<Record<GameIconName, string>> = (() => {
  const out: Partial<Record<GameIconName, string>> = {};
  for (const [hue, motifs] of FAMILIES) for (const m of motifs) out[m] = hue;
  return out;
})();

/**
 * Family hue for a motif, falling back to the caller's accent. This is only
 * the seed — `stampWashPalette` rotates it by sheet position.
 */
export function stampWashColor(motif: GameIconName | null, fallback: string): string {
  return (motif && WASH_BY_MOTIF[motif]) || fallback;
}

export interface StampWash {
  /** Final panel hue in degrees (0–359) — family hue plus the index rotation. */
  hue: number;
  /** Mid stop: the panel's true printed colour. */
  base: string;
  /** Top stop. */
  light: string;
  /** Bottom stop. */
  deep: string;
  /** Ink for hairlines/edges that must stay legible on `base`. */
  ink: string;
  /** True on the light-value half of the alternation, false on the deep half. */
  lightValue: boolean;
}

/** Degrees of hue the ring advances per sheet position. */
export const HUE_STEP_DEG = 72;
/** Hard cap on how far a motif family may pull the wash off the ring. */
export const FAMILY_TINT_DEG = 18;
/** Where the ring starts: the album's signature amber. */
export const ANCHOR_HUE = 36;
/** The ring itself, as offsets from the anchor — five well-separated bands. */
export const WASH_HUE_STEPS = [0, 1, 2, 3, 4].map((k) => k * HUE_STEP_DEG);

/** Alternating print weights: a light panel, then a deep one. */
const VALUE_STEPS = [
  { light: 0.075, sat: 0.94 },
  { light: -0.085, sat: 1.1 },
];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** #rrggbb → {h: 0–360, s: 0–1, l: 0–1}. Non-hex input degrades to gray. */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return { h: 0, s: 0, l: 0.5 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = 60 * (((g - b) / d) % 6);
  else if (max === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  return { h: ((h % 360) + 360) % 360, s: clamp(s, 0, 1), l };
}

/** {h,s,l} → #rrggbb. */
export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 1);
  const ll = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  const seg = Math.floor(hh / 60) % 6;
  const rgb =
    seg === 0 ? [c, x, 0]
    : seg === 1 ? [x, c, 0]
    : seg === 2 ? [0, c, x]
    : seg === 3 ? [0, x, c]
    : seg === 4 ? [x, 0, c]
    : [c, 0, x];
  const hex = rgb
    .map((v) => Math.round(clamp(v + m, 0, 1) * 255).toString(16).padStart(2, '0'))
    .join('');
  return `#${hex}`;
}

/**
 * How far this motif family pulls the wash off the ring, in degrees. Clamped
 * to ±FAMILY_TINT_DEG: warm families skew one way, icy ones the other, but
 * none can pull far enough to collide with a neighbour's ring position.
 */
export function familyTint(family: string): number {
  const rel = (((hexToHsl(family).h - ANCHOR_HUE) % 360) + 540) % 360 - 180;
  return (rel / 180) * FAMILY_TINT_DEG;
}

/** Final panel hue for a family colour at a sheet position. */
export function stampWashHue(family: string, index: number): number {
  const i = Math.abs(Math.trunc(index));
  const step = WASH_HUE_STEPS[i % WASH_HUE_STEPS.length];
  return (((ANCHOR_HUE + familyTint(family) + step) % 360) + 360) % 360;
}

/**
 * Full gradient palette for a stamp's picture panel. `family` is the motif's
 * family hue (the starting point); `index` is the sheet position.
 */
export function stampWashPalette(family: string, index: number): StampWash {
  const i = Math.abs(Math.trunc(index));
  const src = hexToHsl(family);
  const v = VALUE_STEPS[i % VALUE_STEPS.length];
  const hue = stampWashHue(family, i);
  // Clamped into a printable band so no panel goes neon and none goes muddy.
  const sat = clamp(src.s * v.sat, 0.36, 0.8);
  const lit = clamp(src.l + v.light, 0.36, 0.66);
  return {
    hue,
    base: hslToHex(hue, sat, lit),
    light: hslToHex(hue, sat * 0.84, clamp(lit + 0.25, 0, 0.93)),
    deep: hslToHex(hue, clamp(sat * 1.06, 0, 1), clamp(lit - 0.27, 0.07, 1)),
    ink: hslToHex(hue, clamp(sat * 1.1, 0, 1), clamp(lit - 0.31, 0.05, 1)),
    lightValue: i % 2 === 0,
  };
}

/** Shortest distance between two hues, in degrees (0–180). */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}
