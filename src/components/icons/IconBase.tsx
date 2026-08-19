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
import { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

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

/* ------------------------------------------------------------------ */
/* "Rendered loot" material kit — fat contour, glow core, gloss, glint */
/* ------------------------------------------------------------------ */

/** Very dark contour for the fat outer outline that makes assets pop at 14–24px. */
export function outline(color: string): string {
  return shade(color, -110);
}

/**
 * Radial body gradient with a hot off-center core so round bodies glow like
 * candy. Center sits in the upper-left third by default (lit from above-left).
 */
export function RadialGrad({
  id,
  color,
  cx = 0.38,
  cy = 0.32,
  r = 0.88,
}: {
  id: string;
  color: string;
  cx?: number;
  cy?: number;
  r?: number;
}) {
  return (
    <Defs>
      <RadialGradient id={id} cx={cx} cy={cy} r={r} fx={cx} fy={cy}>
        <Stop offset="0" stopColor={shade(color, 90)} />
        <Stop offset="0.42" stopColor={shade(color, 22)} />
        <Stop offset="0.75" stopColor={color} />
        <Stop offset="1" stopColor={shade(color, -60)} />
      </RadialGradient>
    </Defs>
  );
}

/** Big filled specular blob — the juicy upper-left shine, not a hairline. */
export function Gloss({
  cx,
  cy,
  rx,
  ry,
  rot = -22,
  o = 0.45,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot?: number;
  o?: number;
}) {
  return (
    <Ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill="#ffffff"
      opacity={o}
      transform={`rotate(${rot} ${cx} ${cy})`}
    />
  );
}

/** Tiny 100%-white dot gleam that rides next to the gloss blob. */
export function Gleam({ cx, cy, r = 0.7 }: { cx: number; cy: number; r?: number }) {
  return <Circle cx={cx} cy={cy} r={r} fill="#ffffff" />;
}

/** Small floating 4-point sparkle — the AAA tell hovering on prize icons. */
export function TwinkleStar({
  cx,
  cy,
  r = 1.9,
  color = '#ffffff',
  o = 0.95,
}: {
  cx: number;
  cy: number;
  r?: number;
  color?: string;
  o?: number;
}) {
  const w = r * 0.24;
  const d =
    `M ${cx} ${cy - r} Q ${cx + w} ${cy - w} ${cx + r} ${cy}` +
    ` Q ${cx + w} ${cy + w} ${cx} ${cy + r}` +
    ` Q ${cx - w} ${cy + w} ${cx - r} ${cy}` +
    ` Q ${cx - w} ${cy - w} ${cx} ${cy - r} Z`;
  return <Path d={d} fill={color} opacity={o} />;
}
