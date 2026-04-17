/**
 * Colorblind-safe palette overrides.
 *
 * Four modes:
 *   - off            → designer defaults (synthwave / Miami Vice)
 *   - deuteranopia   → red-green CVD (most common ~6% male)
 *   - protanopia     → red-green CVD (less common, similar remap)
 *   - tritanopia     → blue-yellow CVD (rare)
 *
 * Strategy: the game's core hue pairs that carry meaning are
 *   selected (magenta)  vs  hint (gold)  vs  found (green)  vs  error (coral)
 *
 * Under deutan/protan, magenta & coral look similar, and gold & green lose
 * contrast against each other. Under tritan, the gold/cyan axis flattens.
 *
 * We do not recolor the entire UI — only the semantic tokens that game
 * feedback depends on. The synthwave vibe is preserved in backgrounds.
 */

import type { ColorblindMode } from '../contexts/SettingsContext';

/** Keys in `COLORS` that carry gameplay meaning and may need overriding. */
export interface ColorOverrides {
  cellSelected: string;
  cellHint: string;
  cellFound: string;
  wordFound: string;
  wordActive: string;
  wordPending: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  accentGlow: string;
  gold: string;
  goldLight: string;
  goldGlow: string;
  green: string;
  greenGlow: string;
  coral: string;
  coralGlow: string;
}

/**
 * Deuteranopia / Protanopia palette:
 * Shift red-green pairs onto blue-yellow axis.
 *   selected → bright cyan (was magenta)
 *   hint     → warm orange-yellow (unchanged — safe)
 *   found    → saturated blue (was green)
 *   error    → deep orange (was coral)
 * All pairs remain visually distinct under a CVD simulation.
 */
const DEUTAN_PALETTE: ColorOverrides = {
  cellSelected: '#00bfff',
  cellHint: '#ffb800',
  cellFound: '#0a2350',
  wordFound: '#3392ff',
  wordActive: '#00bfff',
  wordPending: '#b08cda',
  accent: '#00bfff',
  accentLight: '#6ad0ff',
  accentDark: '#0088cc',
  accentGlow: 'rgba(0, 191, 255, 0.55)',
  gold: '#ffb800',
  goldLight: '#ffd24d',
  goldGlow: 'rgba(255, 184, 0, 0.50)',
  green: '#3392ff',
  greenGlow: 'rgba(51, 146, 255, 0.50)',
  coral: '#ff6a00',
  coralGlow: 'rgba(255, 106, 0, 0.45)',
};

/**
 * Protanopia (red-blind) is close enough to deutan that the same remap
 * works. We keep a separate entry for clarity + future fine-tuning.
 */
const PROTAN_PALETTE: ColorOverrides = {
  ...DEUTAN_PALETTE,
  // Nudge warm hue slightly so "error" still reads as "wrong" to protans.
  coral: '#ff5a1f',
  coralGlow: 'rgba(255, 90, 31, 0.45)',
};

/**
 * Tritanopia palette:
 * Blue-yellow confusion. Gold/cyan collapse — use magenta/green axis.
 *   selected → magenta (keep)
 *   hint     → bright pink (was gold)
 *   found    → bright green (keep)
 *   error    → red-orange (adjust)
 */
const TRITAN_PALETTE: ColorOverrides = {
  cellSelected: '#ff2d95',
  cellHint: '#ff71c0',
  cellFound: '#143a22',
  wordFound: '#00ff87',
  wordActive: '#ff2d95',
  wordPending: '#d0c8e0',
  accent: '#ff2d95',
  accentLight: '#ff6eb8',
  accentDark: '#cc1a72',
  accentGlow: 'rgba(255, 45, 149, 0.55)',
  gold: '#ff71c0',
  goldLight: '#ffa6d8',
  goldGlow: 'rgba(255, 113, 192, 0.50)',
  green: '#00ff87',
  greenGlow: 'rgba(0, 255, 135, 0.50)',
  coral: '#ff3a1a',
  coralGlow: 'rgba(255, 58, 26, 0.45)',
};

const PALETTES: Record<Exclude<ColorblindMode, 'off'>, ColorOverrides> = {
  deuteranopia: DEUTAN_PALETTE,
  protanopia: PROTAN_PALETTE,
  tritanopia: TRITAN_PALETTE,
};

/**
 * Resolve palette overrides for a given mode. Returns null for "off" so
 * callers can skip work cheaply.
 */
export function getColorblindOverrides(
  mode: ColorblindMode,
): ColorOverrides | null {
  if (mode === 'off') return null;
  return PALETTES[mode];
}

/**
 * Human-readable labels for the Settings screen.
 */
export const COLORBLIND_MODE_LABELS: Record<ColorblindMode, string> = {
  off: 'Off (default)',
  deuteranopia: 'Deuteranopia (red-green)',
  protanopia: 'Protanopia (red-green)',
  tritanopia: 'Tritanopia (blue-yellow)',
};
