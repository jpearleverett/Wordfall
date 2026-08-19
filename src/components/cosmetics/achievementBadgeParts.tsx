/**
 * Shared chrome for the achievement badges: the metal palette (bronze /
 * silver / gold / stone), the accent glow backplate and the ribbon banner.
 *
 * Materials escalate unmistakably by tier, which is why each metal carries a
 * full multi-stop `stops` ramp rather than a light/dark pair:
 * - bronze  warm hammered COPPER, deliberately flat-ish (narrow tonal range)
 * - silver  cool BRUSHED STEEL — bright skylight, dark core, second bounce
 * - gold    rich GOLD with a hot rim and a deep amber base
 * - stone   locked slate
 * The surface treatments that ride on top of those ramps (hammer facets,
 * brushed striations + specular sweep, ray burst + sparkles) live in
 * `achievementBadgeShapes.tsx`.
 *
 * Badges draw in a 100×100 viewBox with the medallion centered at (50, 43.5)
 * and a base radius of 38.5, so the ribbon banner fits along the base
 * (y 78–98). Emblems draw inside the enamel plate — keep their shapes within
 * r≈28 of (50, 44); `EMBLEM_FIT` scales them up per silhouette.
 */
import React, { useMemo } from 'react';
import { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { DuoGrad, gradId, shade } from '../icons/IconBase';
import { star5 } from './frameArtParts';

export const ABVB = '0 0 100 100';

/** Props every bespoke emblem receives. `c` maps a #rrggbb literal to its
 * display color: identity when earned, the accent-tinted ghost ramp
 * (`ghostRamp` in the catalog) when unearned — so a single authored
 * composition yields both the full-color and the tinted-ghost version
 * (with tonal depth preserved, not just opacity). */
export interface EmblemProps {
  c: (hex: string) => string;
}

export type BadgeMetal = 'bronze' | 'silver' | 'gold' | 'stone';

interface MetalSpec {
  /** Brightest tone — ribbon stars, frame highlights. */
  light: string;
  /** Dark rim/outline for every metal part. */
  rimC: string;
  /** Rivet / stud / bead fill. */
  stud: string;
  /** Full vertical ramp for the frame band (see the per-tier notes above). */
  stops: Array<[number, string]>;
}

export const METALS: Record<BadgeMetal, MetalSpec> = {
  bronze: {
    light: '#e8a670',
    rimC: '#4a2510',
    stud: '#b06a33',
    // Flat-ish copper: shallow ramp, no hot specular stop.
    stops: [
      [0, '#e2a06a'],
      [0.42, '#c07840'],
      [0.74, '#a35f2c'],
      [1, '#8a4d22'],
    ],
  },
  silver: {
    light: '#f7fbff',
    rimC: '#3d465c',
    stud: '#aeb8cb',
    // Brushed steel: skylight, roll-off, dark core, floor bounce, deep base.
    stops: [
      [0, '#fdfeff'],
      [0.26, '#d7e0ee'],
      [0.5, '#8d99b0'],
      [0.72, '#cbd5e4'],
      [1, '#69738a'],
    ],
  },
  gold: {
    light: '#fff0a8',
    rimC: '#5a3400',
    stud: '#e0a71a',
    // Rich gold: hot rim, saturated body, amber core, second glint, deep base.
    stops: [
      [0, '#fff4bd'],
      [0.24, '#ffd85e'],
      [0.5, '#e8a416'],
      [0.74, '#ffcf4a'],
      [1, '#9c5c00'],
    ],
  },
  stone: {
    light: '#9aa0b4',
    rimC: '#272b3a',
    stud: '#5f6579',
    stops: [
      [0, '#9aa0b4'],
      [0.5, '#6a7086'],
      [1, '#454a5e'],
    ],
  },
};

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
      <Circle cx={50} cy={45} r={50} fill={`url(#${id})`} />
    </>
  );
}

const STAR_ROWS: Record<number, number[]> = { 1: [50], 2: [43, 57], 3: [37.5, 50, 62.5] };

/** Faceted ice gem set into the ribbon — the GOLD tier's centerpiece. */
function RibbonGem() {
  return (
    <>
      <Path d="M50 80.4 L56 84.8 L50 91.8 L44 84.8 Z" fill="#8fe6ff" stroke="#0e5f78" strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M50 80.4 L56 84.8 L50 86.2 Z" fill="#e4f9ff" opacity={0.95} />
      <Path d="M44 84.8 L50 86.2 L50 91.8 Z" fill="#4fc4ea" opacity={0.85} />
      <Path d="M46.4 84.4 L49 82.2" stroke="#ffffff" strokeWidth={1.1} strokeLinecap="round" opacity={0.9} />
    </>
  );
}

/**
 * Dovetailed ribbon banner across the base; `stars` (0–3) marks the tier and
 * `gem` swaps the center star for a set gem (gold tier).
 */
export function RibbonBanner({
  metal,
  cloth,
  stars,
  gem,
}: {
  metal: BadgeMetal;
  cloth: string;
  stars: number;
  gem?: boolean;
}) {
  const id = useMemo(() => gradId('abRib'), []);
  const m = METALS[metal];
  const edge = shade(cloth, -62);
  const positions = (STAR_ROWS[stars] ?? []).filter((x) => !(gem && x === 50));
  return (
    <>
      <DuoGrad id={id} from={shade(cloth, 26)} to={shade(cloth, -30)} />
      {/* dovetail tails */}
      <Path d="M8 81 H26 V97 H8 L15.5 89 Z" fill={shade(cloth, -34)} stroke={edge} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M92 81 H74 V97 H92 L84.5 89 Z" fill={shade(cloth, -34)} stroke={edge} strokeWidth={1.2} strokeLinejoin="round" />
      {/* fold shadows under the front band */}
      <Path d="M21 94.4 L21 98.4 L26.4 94.8 Z" fill={shade(cloth, -70)} />
      <Path d="M79 94.4 L79 98.4 L73.6 94.8 Z" fill={shade(cloth, -70)} />
      {/* front band with a gentle belly */}
      <Path d="M21 78.5 H79 V93.6 Q50 99.2 21 93.6 Z" fill={`url(#${id})`} stroke={edge} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M23.5 81 H76.5" stroke={m.light} strokeWidth={1} opacity={0.75} />
      <Path d="M23.5 91.6 Q50 96.8 76.5 91.6" stroke={m.light} strokeWidth={1} opacity={0.55} fill="none" />
      {positions.map((x) => (
        <Path key={x} d={star5(x, 86.2, 4.8, 2)} fill={m.light} stroke={m.rimC} strokeWidth={0.9} strokeLinejoin="round" />
      ))}
      {gem && <RibbonGem />}
    </>
  );
}
