/**
 * Silhouette engine for the achievement badges: SIX distinct medallion
 * outlines (round medallion / heater shield / scalloped rosette / hexagonal
 * plaque / laurel-wreath disc / banner-draped crest), each with its own
 * geometry — not one outline with a swapped inner glyph — plus the enameled
 * plate, the riveted metal frame, the per-tier material dressings (hammered
 * copper, brushed-steel sweep, gold ray burst + sparkles) and the locked-state
 * dressings (dashed echo, padlock chip).
 *
 * Layout: 100×100 viewBox, medallion centered on (CX, CY) = (50, 43.5) with
 * base radius R = 38.5, so the frame's outer edge lands at ~42.8 — the art
 * fills its card instead of floating in it. The ribbon banner spans y 78–98
 * and overlays every silhouette's lower tip.
 *
 * Every outline is a function of an absolute radius, so plate / frame / echo
 * are the SAME curve at three scales — a silhouette is added in one place.
 */
import React, { useMemo } from 'react';
import { ClipPath, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Circle, RadialGradient } from 'react-native-svg';
import { gradId, shade, HILITE } from '../icons/IconBase';
import { MetalGrad, leafPath, sparkle4 } from './frameArtParts';
import { AchievementEmblem, BadgeShape, emblemScale, mixHex } from './achievementBadgeCatalog';
import { BadgeMetal, METALS } from './achievementBadgeParts';

export const CX = 50;
export const CY = 43.5;
/** Base outline radius; the frame band strokes across it. */
export const R = 38.5;

const n2 = (v: number) => Math.round(v * 100) / 100;
const X = (r: number, f: number) => n2(CX + r * f);
const Y = (r: number, f: number) => n2(CY + r * f);

/** Point at `fr`×R from the center, `deg` clockwise from straight up. */
function polar(fr: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [n2(CX + R * fr * Math.sin(a)), n2(CY - R * fr * Math.cos(a))];
}

// ── Outline geometry (one function per silhouette) ──────────────────────────

/** Classic round medallion. */
export function discPath(r: number): string {
  const d = n2(r);
  return `M${CX} ${Y(r, -1)} A${d} ${d} 0 1 1 ${CX} ${Y(r, 1)} A${d} ${d} 0 1 1 ${CX} ${Y(r, -1)} Z`;
}

/** Heater shield: shouldered top, straight flanks, pointed base. */
export function shieldPath(r: number): string {
  return [
    `M${X(r, -0.82)} ${Y(r, -0.72)}`,
    `Q${CX} ${Y(r, -0.9)} ${X(r, 0.82)} ${Y(r, -0.72)}`,
    `L${X(r, 0.82)} ${Y(r, -0.02)}`,
    `Q${X(r, 0.82)} ${Y(r, 0.62)} ${CX} ${Y(r, 1)}`,
    `Q${X(r, -0.82)} ${Y(r, 0.62)} ${X(r, -0.82)} ${Y(r, -0.02)}`,
    'Z',
  ].join(' ');
}

/** Scalloped star rosette: 12 petals bulging off a base circle. */
export function rosettePath(r: number, bumps = 12): string {
  const base = r * 0.86;
  const bulge = r * 0.16;
  const pt = (a: number, rad: number) => `${n2(CX + rad * Math.sin(a))} ${n2(CY - rad * Math.cos(a))}`;
  const seg = (Math.PI * 2) / bumps;
  const parts = [`M${pt(0, base)}`];
  for (let i = 0; i < bumps; i++) {
    parts.push(`Q${pt((i + 0.5) * seg, base + bulge)} ${pt((i + 1) * seg, base)}`);
  }
  return `${parts.join(' ')} Z`;
}

/** Hexagonal plaque: hard straight facets, point-top. */
export function hexPath(r: number): string {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return `${n2(CX + r * Math.sin(a))} ${n2(CY - r * Math.cos(a))}`;
  });
  return `M${pts.join(' L')} Z`;
}

/** Laurel disc: a tighter disc — the wreath (drawn by the frame) is the form. */
export function laurelPath(r: number): string {
  return discPath(r * 0.86);
}

/** Banner-draped crest: curled ears, tapered flanks, broad pointed base. */
export function crestPath(r: number): string {
  return [
    `M${X(r, -0.8)} ${Y(r, -0.72)}`,
    `Q${X(r, -0.94)} ${Y(r, -0.5)} ${X(r, -0.84)} ${Y(r, -0.3)}`,
    `L${X(r, -0.76)} ${Y(r, 0.2)}`,
    `Q${X(r, -0.62)} ${Y(r, 0.76)} ${CX} ${Y(r, 1)}`,
    `Q${X(r, 0.62)} ${Y(r, 0.76)} ${X(r, 0.76)} ${Y(r, 0.2)}`,
    `L${X(r, 0.84)} ${Y(r, -0.3)}`,
    `Q${X(r, 0.94)} ${Y(r, -0.5)} ${X(r, 0.8)} ${Y(r, -0.72)}`,
    `Q${CX} ${Y(r, -0.94)} ${X(r, -0.8)} ${Y(r, -0.72)}`,
    'Z',
  ].join(' ');
}

interface ShapeSpec {
  outline: (r: number) => string;
  /** Stud positions as (x, y) fractions of R from the center. */
  studs: Array<[number, number]>;
  /** Enamel gloss ellipse: cx, cy, rx, ry. */
  sheen: [number, number, number, number];
  /** Top specular arc across the frame band. */
  shine: string;
  wreath?: boolean;
  drape?: boolean;
}

const ROSETTE_BEADS: Array<[number, number]> = Array.from({ length: 12 }, (_, i) => [
  0.86 * Math.sin((i * Math.PI) / 6),
  -0.86 * Math.cos((i * Math.PI) / 6),
]).map(([x, y]) => [n2(x), n2(y)]);

const HEX_BOLTS: Array<[number, number]> = Array.from({ length: 6 }, (_, i) => [
  n2(Math.sin((i * Math.PI) / 3)),
  n2(-Math.cos((i * Math.PI) / 3)),
]);

export const SHAPES: Record<BadgeShape, ShapeSpec> = {
  circle: {
    outline: discPath,
    studs: [
      [-0.707, -0.707],
      [0.707, -0.707],
      [-0.707, 0.707],
      [0.707, 0.707],
    ],
    sheen: [50, 23.5, 22, 8.5],
    shine: 'M22.8 16.3 A38.5 38.5 0 0 1 77.2 16.3',
  },
  shield: {
    outline: shieldPath,
    studs: [
      [-0.82, -0.7],
      [0.82, -0.7],
      [-0.82, -0.02],
      [0.82, -0.02],
    ],
    sheen: [50, 24, 22, 8],
    shine: 'M25.5 13.6 Q50 6.5 74.5 13.6',
  },
  rosette: {
    outline: rosettePath,
    studs: ROSETTE_BEADS,
    sheen: [50, 26, 19, 7],
    shine: 'M27.4 19.3 A33.1 33.1 0 0 1 72.6 19.3',
  },
  hex: {
    outline: hexPath,
    studs: HEX_BOLTS,
    sheen: [50, 25, 19.5, 7],
    shine: 'M24.6 20.8 L50 6.1 L75.4 20.8',
  },
  laurel: {
    outline: laurelPath,
    studs: [],
    sheen: [50, 28.5, 16.5, 6.2],
    shine: 'M31.5 16.1 A33.1 33.1 0 0 1 68.5 16.1',
    wreath: true,
  },
  crest: {
    outline: crestPath,
    studs: [
      [0, -0.78],
      [-0.7, 0.14],
      [0.7, 0.14],
    ],
    sheen: [50, 24, 19, 7],
    shine: 'M26.5 15.8 Q50 8.4 73.5 15.8',
    drape: true,
  },
};

/**
 * Emblem fit: scales an emblem authored around (50, 44) up until its content
 * radius fills the silhouette's safe circle, then re-centers it on (CX, CY).
 * Every emblem therefore lands at the SAME apparent size on a given form —
 * 55–69% of the badge box — instead of a flat per-shape factor that clipped
 * the wide emblems and left the compact ones swimming.
 */
export function emblemFit(shape: BadgeShape, emblem: AchievementEmblem): string {
  const s = emblemScale(shape, emblem);
  return `translate(${n2(CX - CX * s)} ${n2(CY - 44 * s)}) scale(${n2(s)})`;
}

const PLATE_R = R * 0.96;

/** Cloth banner draped behind a crest, visible past both flanks. */
function CrestDrape({ tone }: { tone: string }) {
  const cloth = shade(tone, -34);
  const edge = shade(tone, -76);
  const d = 'M24 20 Q8 28 11 46 Q12.5 62 18 71 L29 63 Q22.5 48 25 33 Z';
  return (
    <>
      <Path d={d} fill={cloth} stroke={edge} strokeWidth={1.2} strokeLinejoin="round" />
      <G transform="translate(100 0) scale(-1 1)">
        <Path d={d} fill={shade(tone, -48)} stroke={edge} strokeWidth={1.2} strokeLinejoin="round" />
      </G>
    </>
  );
}

/** Enamel field: body gradient + radial enamel bloom + rim + gloss. */
export function BadgePlate({ shape, tone }: { shape: BadgeShape; tone: string }) {
  const lid = useMemo(() => gradId('abPlate'), []);
  const rid = useMemo(() => gradId('abEnamel'), []);
  const spec = SHAPES[shape];
  const [sx, sy, srx, sry] = spec.sheen;
  return (
    <>
      {spec.drape && <CrestDrape tone={tone} />}
      <Defs>
        <LinearGradient id={lid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(tone, 58)} />
          <Stop offset="0.46" stopColor={tone} />
          <Stop offset="1" stopColor={shade(tone, -60)} />
        </LinearGradient>
        <RadialGradient id={rid} cx="0.5" cy="0.3" r="0.66">
          <Stop offset="0" stopColor={shade(tone, 96)} stopOpacity="0.5" />
          <Stop offset="0.52" stopColor={shade(tone, 24)} stopOpacity="0.14" />
          <Stop offset="1" stopColor={shade(tone, -92)} stopOpacity="0.46" />
        </RadialGradient>
      </Defs>
      <Path d={spec.outline(PLATE_R)} fill={`url(#${lid})`} />
      <Path d={spec.outline(PLATE_R)} fill={`url(#${rid})`} />
      <Path
        d={spec.outline(PLATE_R * 0.9)}
        fill="none"
        stroke={shade(tone, -70)}
        strokeWidth={1.5}
        opacity={0.42}
      />
      <Ellipse cx={sx} cy={sy} rx={srx} ry={sry} fill="#ffffff" opacity={0.12} />
    </>
  );
}

const LEAF_ANGLES = [32, 56, 80, 104, 128, 152];

/** Metal laurel wreath hugging the disc — the laurel silhouette's whole point. */
function LaurelWreath({ metal }: { metal: BadgeMetal }) {
  const m = METALS[metal];
  const leaf = leafPath(10.5, 3.9);
  return (
    <>
      {LEAF_ANGLES.map((deg, i) => {
        const [rx, ry] = polar(0.98, deg);
        const [lx, ly] = polar(0.98, -deg);
        const fill = i % 2 === 0 ? m.light : m.stud;
        return (
          <React.Fragment key={deg}>
            <G transform={`translate(${rx} ${ry}) rotate(${deg - 76})`}>
              <Path d={leaf} fill={fill} stroke={m.rimC} strokeWidth={1} strokeLinejoin="round" />
            </G>
            <G transform={`translate(${lx} ${ly}) rotate(${76 - deg})`}>
              <Path d={leaf} fill={fill} stroke={m.rimC} strokeWidth={1} strokeLinejoin="round" />
            </G>
          </React.Fragment>
        );
      })}
    </>
  );
}

/** Riveted metal frame per silhouette (rim-under stroke gives dark edges). */
export function BadgeFrame({ shape, metal }: { shape: BadgeShape; metal: BadgeMetal }) {
  const id = useMemo(() => gradId('abFrame'), []);
  const m = METALS[metal];
  const spec = SHAPES[shape];
  const band = spec.outline(R);
  return (
    <>
      <MetalGrad id={id} stops={m.stops} />
      <Path d={band} fill="none" stroke={m.rimC} strokeWidth={8.8} strokeLinejoin="round" />
      <Path d={band} fill="none" stroke={`url(#${id})`} strokeWidth={6.2} strokeLinejoin="round" />
      {/* dark rim hugging the band's INNER edge — must clear the emblem, which
          fills the plate out to SHAPE_SAFE_R, so it tracks the band not the plate */}
      <Path d={spec.outline(R * 0.92)} fill="none" stroke={m.rimC} strokeWidth={1.2} opacity={0.9} />
      {spec.wreath && <LaurelWreath metal={metal} />}
      {spec.studs.map(([fx, fy]) => {
        const cx = n2(CX + fx * R);
        const cy = n2(CY + fy * R);
        const rr = spec.studs.length > 6 ? 1.5 : 2.4;
        return (
          <React.Fragment key={`${cx}-${cy}`}>
            <Circle cx={cx} cy={cy} r={rr} fill={m.stud} stroke={m.rimC} strokeWidth={0.8} />
            <Circle cx={cx - rr * 0.28} cy={cy - rr * 0.3} r={rr * 0.3} fill={HILITE} />
          </React.Fragment>
        );
      })}
      <Path
        d={spec.shine}
        stroke={HILITE}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.6}
      />
    </>
  );
}

const GOLD_RAYS: string[] = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6 + Math.PI / 12;
  const len = i % 2 === 0 ? 48 : 41;
  const w = Math.PI / 30;
  const p = (ang: number, r: number) => `${n2(50 + r * Math.sin(ang))} ${n2(45 - r * Math.cos(ang))}`;
  return `M${p(a - w, 24)} L${p(a, len)} L${p(a + w, 24)} Z`;
});

/** Radiant ray burst behind a GOLD-tier medallion — the top-tier flex. */
export function GoldRayBurst() {
  return (
    <>
      {GOLD_RAYS.map((d, i) => (
        <Path key={d} d={d} fill={i % 2 === 0 ? '#ffd24d' : '#ffab2e'} opacity={i % 2 === 0 ? 0.5 : 0.34} />
      ))}
    </>
  );
}

/**
 * Per-tier surface treatment, clipped to the silhouette so it works for all
 * six forms: bronze = hammered copper facets (flat-ish), silver = brushed
 * striations under a bright specular sweep, gold = two sparkles on the frame.
 */
export function TierDressing({ shape, metal }: { shape: BadgeShape; metal: BadgeMetal }) {
  const clip = useMemo(() => gradId('abClip'), []);
  const sweep = useMemo(() => gradId('abSweep'), []);
  const band = SHAPES[shape].outline(R);
  if (metal === 'bronze') {
    return (
      <>
        <Path d={band} fill="none" stroke="#ffffff" strokeWidth={6.4} opacity={0.14} strokeDasharray="3.4 4.6" />
        <Path
          d={band}
          fill="none"
          stroke="#5b3312"
          strokeWidth={6.4}
          opacity={0.22}
          strokeDasharray="1.6 6.4"
          strokeDashoffset={3.4}
        />
      </>
    );
  }
  if (metal === 'silver') {
    return (
      <>
        <Path d={band} fill="none" stroke="#ffffff" strokeWidth={6.4} opacity={0.2} strokeDasharray="0.9 2.1" />
        <Defs>
          <ClipPath id={clip}>
            <Path d={SHAPES[shape].outline(R + 4.4)} />
          </ClipPath>
          <LinearGradient id={sweep} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <G clipPath={`url(#${clip})`}>
          <Rect x={-14} y={12} width={128} height={11} fill={`url(#${sweep})`} transform="rotate(-26 50 43.5)" />
          <Rect x={-14} y={27} width={128} height={4} fill={`url(#${sweep})`} opacity={0.7} transform="rotate(-26 50 43.5)" />
        </G>
      </>
    );
  }
  if (metal === 'gold') {
    const [ax, ay] = polar(1.02, 44);
    const [bx, by] = polar(1.02, -128);
    return (
      <>
        <Path d={band} fill="none" stroke="#fff3b0" strokeWidth={1.6} opacity={0.5} strokeDasharray="7 11" />
        <Path d={sparkle4(ax, ay, 4.4)} fill="#ffffff" opacity={0.95} />
        <Path d={sparkle4(bx, by, 3.2)} fill="#fff3b0" opacity={0.9} />
      </>
    );
  }
  return null;
}

const GHOST_DASH = '2.6 4.2';

/**
 * Dashed silhouette echo engraved on a locked badge's enamel. It runs INSIDE
 * the plate (not as an outer halo) because the medallion now reaches the edge
 * of the viewBox — an outer ring would be clipped at the apex.
 */
export function GhostEcho({ shape, accent }: { shape: BadgeShape; accent: string }) {
  return (
    <Path
      d={SHAPES[shape].outline(PLATE_R * 0.84)}
      fill="none"
      stroke={mixHex(accent, '#7d84a2', 0.45)}
      strokeWidth={1.3}
      strokeDasharray={GHOST_DASH}
      strokeLinejoin="round"
      opacity={0.7}
    />
  );
}

/** Small padlock chip pinned at the medallion's lower-right (locked state). */
export function LockChip() {
  return (
    <>
      <Circle cx={76} cy={70} r={9} fill="#262b3e" stroke="#131622" strokeWidth={1.3} />
      <Circle cx={76} cy={70} r={7.5} fill="none" stroke="#4a5068" strokeWidth={0.9} opacity={0.9} />
      <Path d="M73.2 68.7 v-1.8 a2.8 2.8 0 0 1 5.6 0 v1.8" fill="none" stroke="#c3c9db" strokeWidth={1.6} />
      <Rect x={72.1} y={68.7} width={7.8} height={6.2} rx={1.5} fill="#9aa1b8" stroke="#383e54" strokeWidth={0.9} />
      <Rect x={72.1} y={68.7} width={7.8} height={2.4} rx={1.2} fill="#ffffff" opacity={0.22} />
      <Circle cx={76} cy={71.4} r={1.1} fill="#383e54" />
      <Path d="M76 72 v1.6" stroke="#383e54" strokeWidth={1} strokeLinecap="round" />
    </>
  );
}
