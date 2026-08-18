/**
 * Silhouette-aware chrome for the achievement badges: three medallion shapes
 * (circle / heater shield / star-scallop rosette) with matching enamel plates
 * and riveted metal frames, plus the tier-escalation dressings (gold ray
 * burst, silver ring gleam) and the locked-state dressings (dashed silhouette
 * echo, padlock chip).
 *
 * Same 100×100 viewBox and (50,44) medallion center as
 * `achievementBadgeParts`; the ribbon banner still spans y 76–94 and renders
 * on top of any silhouette's lower tip.
 */
import React, { useMemo } from 'react';
import { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { BodyGrad, DuoGrad, gradId, shade, HILITE } from '../icons/IconBase';
import { sparkle4 } from './frameArtParts';
import { BadgeShape, mixHex } from './achievementBadgeCatalog';
import { BadgeMetal, EnamelDisc, METALS, MetalRing } from './achievementBadgeParts';

const n2 = (v: number) => Math.round(v * 100) / 100;

/** Heater-shield silhouette centered on (50,44); `k` scales about the center. */
export function shieldPath(k = 1): string {
  const x = (v: number) => n2(50 + (v - 50) * k);
  const y = (v: number) => n2(44 + (v - 44) * k);
  return [
    `M${x(18)} ${y(16)}`,
    `Q${x(50)} ${y(9)} ${x(82)} ${y(16)}`,
    `L${x(82)} ${y(42)}`,
    `Q${x(82)} ${y(68)} ${x(50)} ${y(82)}`,
    `Q${x(18)} ${y(68)} ${x(18)} ${y(42)}`,
    'Z',
  ].join(' ');
}

/** Star-scallop outline: `bumps` petals bulging from radius `r` to ≈`r+bulge/2`. */
export function scallopPath(cx: number, cy: number, r: number, bulge: number, bumps: number): string {
  const pt = (a: number, rad: number) => `${n2(cx + rad * Math.sin(a))} ${n2(cy - rad * Math.cos(a))}`;
  const seg = (Math.PI * 2) / bumps;
  const parts = [`M${pt(0, r)}`];
  for (let i = 0; i < bumps; i++) {
    parts.push(`Q${pt((i + 0.5) * seg, r + bulge)} ${pt((i + 1) * seg, r)}`);
  }
  return `${parts.join(' ')} Z`;
}

const ROSETTE_OUTER = scallopPath(50, 44, 30.5, 7, 12);

/** Bead studs sitting in the rosette's scallop notches. */
const ROSETTE_BEADS: Array<[number, number]> = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  return [n2(50 + 30.5 * Math.sin(a)), n2(44 - 30.5 * Math.cos(a))];
});

const SHIELD_STUDS: Array<[number, number]> = [
  [23.4, 18],
  [76.6, 18],
  [18, 40.5],
  [82, 40.5],
];

/**
 * Group transform fitting the r≈28 emblem box (centered on 50,44) inside each
 * silhouette's enamel field. Precomputed `translate(50-50s, cy-44s) scale(s)`.
 */
export const EMBLEM_FIT: Record<BadgeShape, string | undefined> = {
  circle: undefined,
  shield: 'translate(11 7.18) scale(0.78)',
  rosette: 'translate(7 6.16) scale(0.86)',
};

/** Enamel field per silhouette (renders under the emblem). */
export function BadgePlate({ shape, tone }: { shape: BadgeShape; tone: string }) {
  const id = useMemo(() => gradId('abPlate'), []);
  if (shape === 'circle') return <EnamelDisc tone={tone} />;
  if (shape === 'shield') {
    return (
      <>
        <BodyGrad id={id} color={tone} />
        <Path d={shieldPath(0.94)} fill={`url(#${id})`} />
        <Path d={shieldPath(0.85)} fill="none" stroke={shade(tone, -66)} strokeWidth={1.6} opacity={0.5} />
        <Ellipse cx={50} cy={25.5} rx={21} ry={7.5} fill="#ffffff" opacity={0.12} />
      </>
    );
  }
  return (
    <>
      <BodyGrad id={id} color={tone} />
      <Circle cx={50} cy={44} r={27} fill={`url(#${id})`} />
      <Circle cx={50} cy={44} r={25.2} fill="none" stroke={shade(tone, -66)} strokeWidth={1.5} opacity={0.5} />
      <Ellipse cx={50} cy={29} rx={17} ry={6.5} fill="#ffffff" opacity={0.12} />
    </>
  );
}

/** Riveted metal frame per silhouette (rim-under stroke gives dark edges). */
export function BadgeFrame({ shape, metal }: { shape: BadgeShape; metal: BadgeMetal }) {
  const id = useMemo(() => gradId('abFrame'), []);
  const m = METALS[metal];
  if (shape === 'circle') return <MetalRing metal={metal} />;
  if (shape === 'shield') {
    return (
      <>
        <DuoGrad id={id} from={m.light} to={m.dark} />
        <Path d={shieldPath(1)} fill="none" stroke={m.rimC} strokeWidth={8.6} strokeLinejoin="round" />
        <Path d={shieldPath(1)} fill="none" stroke={`url(#${id})`} strokeWidth={6} strokeLinejoin="round" />
        <Path d={shieldPath(0.86)} fill="none" stroke={m.rimC} strokeWidth={1.1} opacity={0.9} />
        {SHIELD_STUDS.map(([x, y]) => (
          <React.Fragment key={`${x}-${y}`}>
            <Circle cx={x} cy={y} r={2.2} fill={m.stud} stroke={m.rimC} strokeWidth={0.8} />
            <Circle cx={x - 0.6} cy={y - 0.7} r={0.7} fill={HILITE} />
          </React.Fragment>
        ))}
        <Path d="M25 14.6 Q50 8.2 75 14.6" stroke={HILITE} strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.6} />
      </>
    );
  }
  return (
    <>
      <DuoGrad id={id} from={m.light} to={m.dark} />
      <Path d={ROSETTE_OUTER} fill="none" stroke={m.rimC} strokeWidth={7.4} strokeLinejoin="round" />
      <Path d={ROSETTE_OUTER} fill="none" stroke={`url(#${id})`} strokeWidth={5} strokeLinejoin="round" />
      <Circle cx={50} cy={44} r={27.4} fill="none" stroke={m.rimC} strokeWidth={1.2} opacity={0.9} />
      {ROSETTE_BEADS.map(([x, y]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.3} fill={m.stud} stroke={m.rimC} strokeWidth={0.6} />
      ))}
      <Path d="M28.4 22.4 A30.5 30.5 0 0 1 71.6 22.4" stroke={HILITE} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.6} />
    </>
  );
}

const GOLD_RAYS: string[] = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6 + Math.PI / 12;
  const len = i % 2 === 0 ? 45 : 38.5;
  const w = Math.PI / 32;
  const px = (ang: number, r: number) => `${n2(50 + r * Math.sin(ang))} ${n2(46 - r * Math.cos(ang))}`;
  return `M${px(a - w, 22)} L${px(a, len)} L${px(a + w, 22)} Z`;
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

const GLEAM_ARCS: Record<BadgeShape, string> = {
  circle: 'M19.2 58.2 A35 35 0 0 1 15.6 38',
  shield: 'M19.8 43 Q19.8 64 44 76.4',
  rosette: 'M22.4 58.6 A30.5 30.5 0 0 1 19.8 40.2',
};

const GLEAM_SPARKS: Record<BadgeShape, Array<[number, number, number]>> = {
  circle: [
    [80, 23, 3.6],
    [22.4, 61.5, 2.4],
  ],
  shield: [
    [78.6, 15.2, 3.4],
    [20.8, 48, 2.3],
  ],
  rosette: [
    [74.4, 20.2, 3.4],
    [24.8, 64, 2.3],
  ],
};

/** Cool gleam sweep + sparks on a SILVER-tier frame. */
export function SilverGleam({ shape }: { shape: BadgeShape }) {
  return (
    <>
      <Path d={GLEAM_ARCS[shape]} fill="none" stroke="#ffffff" strokeWidth={1.7} strokeLinecap="round" opacity={0.65} />
      {GLEAM_SPARKS[shape].map(([x, y, r]) => (
        <Path key={`${x}-${y}`} d={sparkle4(x, y, r)} fill="#ffffff" opacity={0.9} />
      ))}
    </>
  );
}

const GHOST_DASH = '2.6 4.2';

/** Thin dashed silhouette echo teasing a locked badge's final shape. */
export function GhostEcho({ shape, accent }: { shape: BadgeShape; accent: string }) {
  const tint = mixHex(accent, '#7d84a2', 0.45);
  if (shape === 'shield') {
    return (
      <Path
        d={shieldPath(1.13)}
        fill="none"
        stroke={tint}
        strokeWidth={1.3}
        strokeDasharray={GHOST_DASH}
        strokeLinejoin="round"
        opacity={0.75}
      />
    );
  }
  return (
    <Circle
      cx={50}
      cy={44}
      r={shape === 'circle' ? 41.4 : 40.2}
      fill="none"
      stroke={tint}
      strokeWidth={1.3}
      strokeDasharray={GHOST_DASH}
      opacity={0.75}
    />
  );
}

/** Small padlock chip pinned at the medallion's lower-right (locked state). */
export function LockChip() {
  return (
    <>
      <Circle cx={73} cy={67.5} r={8.4} fill="#262b3e" stroke="#131622" strokeWidth={1.3} />
      <Circle cx={73} cy={67.5} r={7} fill="none" stroke="#4a5068" strokeWidth={0.9} opacity={0.9} />
      <Path d="M70.4 66.4 v-1.7 a2.6 2.6 0 0 1 5.2 0 v1.7" fill="none" stroke="#c3c9db" strokeWidth={1.5} />
      <Rect x={69.4} y={66.4} width={7.2} height={5.8} rx={1.4} fill="#9aa1b8" stroke="#383e54" strokeWidth={0.9} />
      <Rect x={69.4} y={66.4} width={7.2} height={2.2} rx={1.1} fill="#ffffff" opacity={0.22} />
      <Circle cx={73} cy={69} r={1.05} fill="#383e54" />
      <Path d="M73 69.6 v1.5" stroke="#383e54" strokeWidth={1} strokeLinecap="round" />
    </>
  );
}
