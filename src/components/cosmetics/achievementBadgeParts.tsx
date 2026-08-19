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
import { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { DuoGrad, gradId, shade } from '../icons/IconBase';

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

/** Ink used for emblem contours and cast shadows (cool near-black). */
const EMBLEM_INK = '#0b0e1a';

/**
 * MATERIAL pass for a bespoke emblem — the fix for "flat single-colour vector
 * glyphs dropped into a plate".
 *
 * Every emblem is authored once and then re-rendered as a SILHOUETTE several
 * times by feeding a constant paint through its own `c()` prop (the same hook
 * the ghost ramp uses). One authored composition therefore gains, back to
 * front:
 *
 * 1. a soft cast SHADOW dropped onto the enamel field beneath it (two offset
 *    passes so the edge falls off instead of stamping a hard double),
 * 2. a dark INSET OUTLINE — the silhouette grown ~3.5% about the emblem origin,
 *    so the object is bedded into the enamel like cloisonné wire,
 * 3. a bright top-edge CATCHLIGHT — the silhouette lifted 1.6 units and painted
 *    with a top-lit ramp, so only the upward-facing edges catch light,
 * 4. the emblem itself,
 * 5. a two-tone ENAMEL glaze — white over the upper half, ink over the lower —
 *    in user space, so the whole emblem shares ONE light direction instead of
 *    each sub-path shading itself.
 *
 * Locked badges skip the second shadow pass and take a dimmer catchlight: a
 * ghost should read as recessed, not as a lit object.
 */
export function EmblemMaterial({
  Emblem,
  c,
  earned,
}: {
  Emblem: React.ComponentType<EmblemProps>;
  c: (hex: string) => string;
  earned: boolean;
}) {
  const rimId = useMemo(() => gradId('abEmRim'), []);
  const glazeId = useMemo(() => gradId('abEmGlaze'), []);
  const ink = useMemo(() => () => EMBLEM_INK, []);
  const rimPaint = useMemo(() => () => `url(#${rimId})`, [rimId]);
  const glazePaint = useMemo(() => () => `url(#${glazeId})`, [glazeId]);
  const lit = earned ? 0.85 : 0.4;
  return (
    <>
      <Defs>
        {/* top-lit rim ramp, emblem user space (authored around y 16–72) */}
        <LinearGradient id={rimId} gradientUnits="userSpaceOnUse" x1="0" y1="14" x2="0" y2="48">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={lit} />
          <Stop offset="0.45" stopColor="#ffffff" stopOpacity={lit * 0.34} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </LinearGradient>
        {/* two-tone enamel glaze: lit upper, shadowed lower */}
        <LinearGradient id={glazeId} gradientUnits="userSpaceOnUse" x1="0" y1="16" x2="0" y2="72">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={earned ? 0.3 : 0.16} />
          <Stop offset="0.42" stopColor="#ffffff" stopOpacity="0.04" />
          <Stop offset="0.56" stopColor={EMBLEM_INK} stopOpacity="0.05" />
          <Stop offset="1" stopColor={EMBLEM_INK} stopOpacity={earned ? 0.34 : 0.42} />
        </LinearGradient>
      </Defs>
      {earned && (
        <G transform="translate(2.6 4.4)" opacity={0.14}>
          <Emblem c={ink} />
        </G>
      )}
      <G transform="translate(1.3 2.4)" opacity={earned ? 0.24 : 0.3}>
        <Emblem c={ink} />
      </G>
      {/* dark contour: grown about the (50, 44) emblem origin */}
      <G transform="translate(-1.7 -1.5) scale(1.034)" opacity={0.92}>
        <Emblem c={ink} />
      </G>
      <G transform="translate(0 -1.6)">
        <Emblem c={rimPaint} />
      </G>
      <Emblem c={c} />
      <Emblem c={glazePaint} />
    </>
  );
}

/**
 * Dovetailed ribbon banner across the base — the CIRCLE silhouette's dressing
 * (see `SHAPE_DRESSING`; the other five forms wear a swallowtail, sprigs, a
 * nameplate, a sash or a scroll). Cloth only: the tier readout is drawn over
 * it by `TierPips`, so every base shares one pip implementation.
 */
export function RibbonBanner({
  metal,
  cloth,
}: {
  metal: BadgeMetal;
  cloth: string;
}) {
  const id = useMemo(() => gradId('abRib'), []);
  const m = METALS[metal];
  const edge = shade(cloth, -62);
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
    </>
  );
}
