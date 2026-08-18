/**
 * Shared plumbing for Wordfall's custom SVG icon set.
 *
 * Every icon draws in a 24×24 viewBox using the same material recipe so the
 * whole set reads as one hand-crafted family: a saturated vertical gradient
 * body, a darker rim stroke, and a soft white top-highlight. Icons accept a
 * `size` and optional `accent` override; gradients derive light/dark stops
 * from the accent so one prop retints an entire icon.
 */
import React from 'react';
import { Defs, LinearGradient, Stop } from 'react-native-svg';

export interface IconProps {
  size?: number;
  /** Primary hue override (#rrggbb). Icons define a sensible default. */
  accent?: string;
}

export const VB = '0 0 24 24';

/** Clamp helper for derived gradient stops. */
function chan(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** Lighten/darken #rrggbb by adding `amt` to each channel. */
export function shade(hex: string, amt: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = chan(((n >> 16) & 0xff) + amt);
  const g = chan(((n >> 8) & 0xff) + amt);
  const b = chan((n & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Standard 3-stop vertical body gradient: lit top, true mid, deep base.
 * Give each gradient a unique id per icon instance via the `id` prop.
 */
export function BodyGrad({ id, color }: { id: string; color: string }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={shade(color, 66)} />
        <Stop offset="0.45" stopColor={color} />
        <Stop offset="1" stopColor={shade(color, -58)} />
      </LinearGradient>
    </Defs>
  );
}

/** Two-tone gradient with explicit stops (metallics, special materials). */
export function DuoGrad({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={from} />
        <Stop offset="1" stopColor={to} />
      </LinearGradient>
    </Defs>
  );
}

/** Rim stroke color for a given body color. */
export function rim(color: string): string {
  return shade(color, -92);
}

export const HILITE = 'rgba(255,255,255,0.55)';
export const HILITE_SOFT = 'rgba(255,255,255,0.32)';

let uid = 0;
/** Unique-enough gradient id so multiple icon instances never collide. */
export function gradId(name: string): string {
  uid = (uid + 1) % 1_000_000;
  return `wf-${name}-${uid}`;
}
