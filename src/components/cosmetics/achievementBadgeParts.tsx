/**
 * Shared chrome for the achievement badges: metal ring, enamel disc, ribbon
 * banner, glow backplate, plus the stone palette used by the unearned state.
 *
 * Badges draw in a 100×100 viewBox. The medallion is centered at (50,44) so
 * the ribbon banner fits along the base (y 76–94). Same material recipe as
 * `iconsDecor` / the frame art: gradient bodies, dark rim strokes, top-light
 * specular arcs, riveted studs. Emblems draw inside the enamel disc — keep
 * their shapes within r≈28 of (50,44).
 */
import React, { useMemo } from 'react';
import { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { BodyGrad, DuoGrad, gradId, shade, HILITE } from '../icons/IconBase';
import { star5 } from './frameArtParts';

export const ABVB = '0 0 100 100';

/** Props every bespoke emblem receives. `c` maps a #rrggbb literal to its
 * display color: identity when earned, the stone ramp when unearned — so a
 * single authored composition yields both the full-color and the carved-stone
 * silhouette version (with tonal depth preserved, not just opacity). */
export interface EmblemProps {
  c: (hex: string) => string;
}

export type BadgeMetal = 'bronze' | 'silver' | 'gold' | 'stone';

interface MetalSpec {
  light: string;
  dark: string;
  rimC: string;
  stud: string;
}

export const METALS: Record<BadgeMetal, MetalSpec> = {
  bronze: { light: '#f0b478', dark: '#8a4d1f', rimC: '#4f2a0e', stud: '#a8642c' },
  silver: { light: '#f2f6fc', dark: '#8c96ac', rimC: '#454e63', stud: '#a5aec2' },
  gold: { light: '#ffe27a', dark: '#b06a00', rimC: '#5e3800', stud: '#d99a12' },
  stone: { light: '#9aa0b4', dark: '#4a4f63', rimC: '#272b3a', stud: '#5f6579' },
};

/** Map any #rrggbb onto a cool slate ramp by luminance, so unearned badges
 * become desaturated stone reliefs that keep their light/shadow structure. */
export function stoneOf(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const mix = (lo: number, hi: number) => Math.round(lo + (hi - lo) * l);
  const rr = mix(0x30, 0xa6);
  const gg = mix(0x34, 0xac);
  const bb = mix(0x46, 0xc0);
  return `#${((rr << 16) | (gg << 8) | bb).toString(16).padStart(6, '0')}`;
}

/** Soft radial accent glow behind an earned badge. */
export function BadgeGlow({ accent }: { accent: string }) {
  const id = useMemo(() => gradId('abGlow'), []);
  return (
    <>
      <Defs>
        <RadialGradient id={id} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={accent} stopOpacity="0.5" />
          <Stop offset="0.7" stopColor={accent} stopOpacity="0.2" />
          <Stop offset="1" stopColor={accent} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={46} r={46} fill={`url(#${id})`} />
    </>
  );
}

/** Enamel field the emblem sits on: lit-top gradient, inner shadow, sheen. */
export function EnamelDisc({ tone }: { tone: string }) {
  const id = useMemo(() => gradId('abDisc'), []);
  return (
    <>
      <BodyGrad id={id} color={tone} />
      <Circle cx={50} cy={44} r={31.6} fill={`url(#${id})`} />
      <Circle cx={50} cy={44} r={29.6} fill="none" stroke={shade(tone, -66)} strokeWidth={1.6} opacity={0.5} />
      <Ellipse cx={50} cy={26.5} rx={20} ry={8} fill="#ffffff" opacity={0.12} />
    </>
  );
}

const STUDS: Array<[number, number]> = [
  [25.3, 19.3],
  [74.7, 19.3],
  [74.7, 68.7],
  [25.3, 68.7],
];

/** Riveted metal band with rims and a top specular arc. */
export function MetalRing({ metal }: { metal: BadgeMetal }) {
  const id = useMemo(() => gradId('abRing'), []);
  const m = METALS[metal];
  return (
    <>
      <DuoGrad id={id} from={m.light} to={m.dark} />
      <Circle cx={50} cy={44} r={35} fill="none" stroke={`url(#${id})`} strokeWidth={7} />
      <Circle cx={50} cy={44} r={38.6} fill="none" stroke={m.rimC} strokeWidth={1.5} />
      <Circle cx={50} cy={44} r={31.4} fill="none" stroke={m.rimC} strokeWidth={1.1} />
      {STUDS.map(([x, y]) => (
        <React.Fragment key={`${x}-${y}`}>
          <Circle cx={x} cy={y} r={2.3} fill={m.stud} stroke={m.rimC} strokeWidth={0.8} />
          <Circle cx={x - 0.6} cy={y - 0.7} r={0.7} fill={HILITE} />
        </React.Fragment>
      ))}
      <Path
        d="M23.2 21.5 A35 35 0 0 1 76.8 21.5"
        stroke={HILITE}
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
        opacity={0.6}
      />
    </>
  );
}

const STAR_ROWS: Record<number, number[]> = { 1: [50], 2: [44.5, 55.5], 3: [40, 50, 60] };

/** Dovetailed ribbon banner across the base; `stars` (0–3) marks the tier. */
export function RibbonBanner({ metal, cloth, stars }: { metal: BadgeMetal; cloth: string; stars: number }) {
  const id = useMemo(() => gradId('abRib'), []);
  const m = METALS[metal];
  const edge = shade(cloth, -62);
  return (
    <>
      <DuoGrad id={id} from={shade(cloth, 26)} to={shade(cloth, -30)} />
      {/* dovetail tails */}
      <Path d="M14 78.5 H30 V93 H14 L20.5 85.75 Z" fill={shade(cloth, -34)} stroke={edge} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M86 78.5 H70 V93 H86 L79.5 85.75 Z" fill={shade(cloth, -34)} stroke={edge} strokeWidth={1.2} strokeLinejoin="round" />
      {/* fold shadows under the front band */}
      <Path d="M26 90.2 L26 93.8 L30.8 90.6 Z" fill={shade(cloth, -70)} />
      <Path d="M74 90.2 L74 93.8 L69.2 90.6 Z" fill={shade(cloth, -70)} />
      {/* front band with a gentle belly */}
      <Path d="M26 76 H74 V89.5 Q50 94.5 26 89.5 Z" fill={`url(#${id})`} stroke={edge} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M28 78.2 H72" stroke={m.light} strokeWidth={1} opacity={0.75} />
      <Path d="M28 87.6 Q50 92.2 72 87.6" stroke={m.light} strokeWidth={1} opacity={0.55} fill="none" />
      {(STAR_ROWS[stars] ?? []).map((x) => (
        <Path key={x} d={star5(x, 83.2, 4.2, 1.75)} fill={m.light} stroke={m.rimC} strokeWidth={0.9} strokeLinejoin="round" />
      ))}
    </>
  );
}
