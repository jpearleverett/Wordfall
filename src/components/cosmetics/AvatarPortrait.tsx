/**
 * AvatarPortrait — the default player identity art: an illustrated portrait
 * of the WORD ARCHITECT, the hooded scholar rebuilding the Grand Library.
 *
 * Drawn 3/4 against a synthwave sunset (sun disc with scanline slits, horizon
 * glow, perspective grid floor) with a strong rim light along the lit edge so
 * the figure SEPARATES from the disc instead of reading as a black blob —
 * which is exactly how the old flat silhouette failed. The face plane, lit
 * cheek, brow/eye line and collar all sit in the mid-to-light value range;
 * only the far cheek and the hood's inner drape go dark.
 *
 * Four variants (`avatarVariants.ts`) change hood silhouette AND palette, so
 * different frames host visibly different characters. Everything else tints
 * from the passed `accent`, so one prop retints the whole backdrop.
 *
 * Static art — no animation. Callers own the ring, pulse and glow.
 */
import React, { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { gradId, shade } from '../icons/IconBase';
import {
  AvatarVariantId,
  AvatarVariantSpec,
  resolveAvatarVariant,
} from './avatarVariants';
import {
  BROW_FAR,
  BROW_NEAR,
  FACE,
  FACE_LIT,
  FACE_SHADOW,
  HOOD_SHAPES,
  MOUTH,
  NECK,
  NOSE,
} from './avatarPortraitShapes';

export { resolveAvatarVariant };
export type { AvatarVariantId, AvatarVariantSpec };

const HEX = /^#[0-9a-fA-F]{6}$/;
function safeHex(color: string | undefined | null, fallback: string): string {
  return color && HEX.test(color) ? color : fallback;
}

/** Grid floor rays converge on the sun's center at the horizon. */
const GRID_RAYS = [-46, -12, 14, 33, 67, 86, 112, 146];
const GRID_BANDS: Array<[number, number]> = [
  [67.5, 0.5],
  [72, 0.42],
  [79, 0.32],
  [89, 0.24],
];
const SUN_SLITS: Array<[number, number, number]> = [
  [38, 1.2, 0.45],
  [44, 1.8, 0.58],
  [50, 2.4, 0.7],
  [56, 3, 0.82],
  [61.6, 3.4, 0.9],
];

export interface AvatarPortraitProps {
  /** Rendered edge length in px. The art is square and circle-clipped. */
  size: number;
  /** Backdrop hue (#rrggbb) — usually the equipped theme or frame accent. */
  accent?: string;
  /** Variant id, or any seed (frame id, player id) hashed into a variant. */
  variant?: AvatarVariantId | string;
  /** Rim-light hue; defaults to a lightened accent. Frames pass their metal. */
  rimColor?: string;
  style?: StyleProp<ViewStyle>;
}

const AvatarPortrait: React.FC<AvatarPortraitProps> = ({
  size,
  accent,
  variant,
  rimColor,
  style,
}) => {
  const v = useMemo(() => resolveAvatarVariant(variant), [variant]);
  const shapes = HOOD_SHAPES[v.hood];
  const ids = useMemo(() => {
    const base = gradId('avatarPortrait');
    return {
      sky: `${base}-sky`,
      sun: `${base}-sun`,
      cloth: `${base}-cloth`,
      collar: `${base}-collar`,
      skin: `${base}-skin`,
      tile: `${base}-tile`,
      clip: `${base}-clip`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accentHex = safeHex(accent, '#ff2d95');
  const glow = shade(accentHex, 104);
  const rimHex = safeHex(rimColor, glow);
  // Sky sits well below the sun's value range so the disc reads as a DISC.
  const skyTop = shade(accentHex, -172);
  const skyMid = shade(accentHex, -134);
  const skyBase = shade(accentHex, -192);
  const grid = shade(accentHex, 58);
  const clothLit = shade(v.cloth, 64);
  const clothDeep = shade(v.cloth, -76);
  const collarLit = shade(v.collar, 44);
  const collarDeep = shade(v.collar, -74);
  const skinLit = shade(v.skin, 44);
  const skinDeep = shade(v.skin, -80);
  const feature = shade(v.skin, -122);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={style} pointerEvents="none">
      <Defs>
        <LinearGradient id={ids.sky} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={skyTop} />
          <Stop offset="0.6" stopColor={skyMid} />
          <Stop offset="1" stopColor={skyBase} />
        </LinearGradient>
        <LinearGradient id={ids.sun} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffe6a3" />
          <Stop offset="0.55" stopColor={shade(accentHex, 46)} />
          <Stop offset="1" stopColor={accentHex} />
        </LinearGradient>
        {/* Lit top-left → deep bottom-right so cloth reads as a lit volume. */}
        <LinearGradient id={ids.cloth} x1="0.15" y1="0" x2="0.9" y2="1">
          <Stop offset="0" stopColor={clothLit} />
          <Stop offset="0.42" stopColor={v.cloth} />
          <Stop offset="1" stopColor={clothDeep} />
        </LinearGradient>
        <LinearGradient id={ids.collar} x1="0.1" y1="0" x2="0.9" y2="1">
          <Stop offset="0" stopColor={collarLit} />
          <Stop offset="1" stopColor={collarDeep} />
        </LinearGradient>
        <LinearGradient id={ids.skin} x1="0.1" y1="0.1" x2="0.95" y2="0.9">
          <Stop offset="0" stopColor={skinLit} />
          <Stop offset="0.5" stopColor={v.skin} />
          <Stop offset="1" stopColor={skinDeep} />
        </LinearGradient>
        <LinearGradient id={ids.tile} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fff3d0" />
          <Stop offset="1" stopColor={shade(accentHex, 52)} />
        </LinearGradient>
        <ClipPath id={ids.clip}>
          <Circle cx={50} cy={50} r={50} />
        </ClipPath>
      </Defs>

      <G clipPath={`url(#${ids.clip})`}>
        {/* ── Synthwave backdrop ── */}
        <Rect x={0} y={0} width={100} height={100} fill={`url(#${ids.sky})`} />
        <Circle cx={50} cy={52} r={31} fill={`url(#${ids.sun})`} />
        <Circle
          cx={50}
          cy={52}
          r={31}
          fill="none"
          stroke={glow}
          strokeWidth={0.9}
          strokeOpacity={0.4}
        />
        {SUN_SLITS.map(([y, h, o]) => (
          <Rect key={`s${y}`} x={18} y={y} width={64} height={h} fill={skyBase} opacity={o} />
        ))}
        {/* Horizon: dark ground plane, glow band, then the hot line itself. */}
        <Rect x={0} y={64} width={100} height={36} fill={skyBase} opacity={0.94} />
        <Rect x={0} y={58.5} width={100} height={6.5} fill={accentHex} opacity={0.3} />
        <Rect x={0} y={63.2} width={100} height={1.4} fill={glow} opacity={0.92} />
        {GRID_RAYS.map((x) => (
          <Path
            key={`r${x}`}
            d={`M50 64 L${x} 100`}
            stroke={grid}
            strokeWidth={0.8}
            opacity={0.45}
            fill="none"
          />
        ))}
        {GRID_BANDS.map(([y, o]) => (
          <Path
            key={`b${y}`}
            d={`M0 ${y} H100`}
            stroke={grid}
            strokeWidth={0.8}
            opacity={o}
            fill="none"
          />
        ))}

        {/* ── Figure: cloak → hood → face → hood front → collar ── */}
        <Path d={shapes.cloak} fill={`url(#${ids.cloth})`} />
        {/* Fold shading across the chest */}
        <Path
          d="M30 74 C38 82 44 88 46 100"
          stroke={clothDeep}
          strokeWidth={1.6}
          opacity={0.55}
          fill="none"
        />
        <Path
          d="M70 74 C63 82 57 88 55 100"
          stroke={clothDeep}
          strokeWidth={1.6}
          opacity={0.55}
          fill="none"
        />
        {/* Lit plane on the near shoulder — keeps the cloak off flat black */}
        <Path
          d="M12 100 C15 86 23 77 34 72.5 L40.5 76 C29.5 82 21.5 90 18.5 100 Z"
          fill={clothLit}
          opacity={0.32}
        />
        <Path d={shapes.hood} fill={`url(#${ids.cloth})`} />
        {/* Inner hood cavity — the dark the face reads against */}
        <Ellipse cx={50} cy={44} rx={19} ry={22} fill={clothDeep} opacity={0.85} />

        <Path d={NECK} fill={v.skin} opacity={0.85} />
        <Path d={NECK} fill={skinDeep} opacity={0.45} />
        <Path d={FACE} fill={`url(#${ids.skin})`} />
        <Path d={FACE_LIT} fill={skinLit} opacity={0.55} />
        <Path d={FACE_SHADOW} fill={skinDeep} opacity={0.5} />
        {/* Brow bar casts the hood's shadow across the forehead */}
        <Path
          d="M37.4 39.6 C42 34.6 55 33.4 61.2 38.4 L61.4 42.6 C54 37.6 43 38.4 37.6 43.4 Z"
          fill={clothDeep}
          opacity={0.32}
        />
        <Path d={BROW_NEAR} stroke={feature} strokeWidth={1.9} strokeLinecap="round" fill="none" />
        <Path
          d={BROW_FAR}
          stroke={feature}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.75}
          fill="none"
        />
        {/* Eyes — near eye larger (3/4 turn), each with a warm catchlight */}
        <Ellipse cx={43.6} cy={46.4} rx={2.7} ry={1.8} fill="#2b1230" />
        <Circle cx={42.7} cy={45.8} r={0.85} fill={glow} />
        <Ellipse cx={55.2} cy={45.6} rx={2} ry={1.5} fill="#2b1230" opacity={0.9} />
        <Circle cx={54.5} cy={45.1} r={0.65} fill={glow} opacity={0.85} />
        <Path d={NOSE} stroke={skinDeep} strokeWidth={1.5} strokeLinecap="round" fill="none" />
        <Path d={MOUTH} stroke={feature} strokeWidth={1.3} strokeLinecap="round" fill="none" />
        {/* Jawline turn */}
        <Path
          d="M40.4 55.4 C43 61 47.4 63.6 51.4 62.4"
          stroke={skinDeep}
          strokeWidth={1}
          opacity={0.5}
          fill="none"
        />

        {/* Hood front edge + side drapes overlap the face like real cloth */}
        <Path d={shapes.crest} fill={`url(#${ids.cloth})`} />
        <Path d={shapes.crest} fill={clothLit} opacity={0.18} />
        <Path d={shapes.drapeL} fill={v.cloth} />
        {/* Shadow-side drape stays readable (it carries the oracle's veil) */}
        <Path d={shapes.drapeR} fill={v.cloth} />
        <Path d={shapes.drapeR} fill={clothDeep} opacity={0.5} />

        {/* Collar */}
        <Path d={shapes.collar} fill={`url(#${ids.collar})`} />
        <Path
          d={shapes.collar}
          stroke={collarLit}
          strokeWidth={0.8}
          opacity={0.5}
          fill="none"
        />

        {/* ── Rim light: the whole point. Lit edge separates from the disc. ── */}
        <Path
          d={shapes.rimHead}
          stroke={rimHex}
          strokeWidth={2.4}
          strokeOpacity={0.95}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={shapes.rimHead}
          stroke="#ffffff"
          strokeWidth={0.9}
          strokeOpacity={0.5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={shapes.rimShoulder}
          stroke={rimHex}
          strokeWidth={2}
          strokeOpacity={0.75}
          strokeLinecap="round"
          fill="none"
        />
        {/* Cool counter-rim, mirrored onto the shadow side for volume */}
        <G transform="translate(100,0) scale(-1,1)">
          <Path
            d={shapes.rimHead}
            stroke={glow}
            strokeWidth={1.5}
            strokeOpacity={0.35}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d={shapes.rimShoulder}
            stroke={glow}
            strokeWidth={1.2}
            strokeOpacity={0.25}
            strokeLinecap="round"
            fill="none"
          />
        </G>

        {/* ── Letter-tile motif floating at the shoulder ── */}
        <Circle cx={74} cy={66} r={14} fill={glow} opacity={0.16} />
        <G transform="rotate(-10 74 66)">
          <Rect
            x={65}
            y={57}
            width={18}
            height={18}
            rx={4.5}
            fill={`url(#${ids.tile})`}
            stroke={shade(accentHex, -108)}
            strokeWidth={1.1}
          />
          <Rect x={67} y={59} width={14} height={5} rx={2.5} fill="#ffffff" opacity={0.35} />
          <SvgText
            x={74}
            y={70.6}
            fontSize={11.5}
            fontWeight="bold"
            textAnchor="middle"
            fill={shade(accentHex, -132)}
          >
            {v.glyph}
          </SvgText>
        </G>
        <Circle cx={87} cy={52} r={1.3} fill={glow} opacity={0.7} />
        <Circle cx={82} cy={45} r={0.9} fill={glow} opacity={0.5} />

        {/* Glass sheen + floor vignette */}
        <Rect x={0} y={0} width={100} height={22} fill="#ffffff" opacity={0.05} />
        <Rect x={0} y={86} width={100} height={14} fill="#05000f" opacity={0.22} />
      </G>
      <Circle cx={50} cy={50} r={49.2} stroke="rgba(255,255,255,0.09)" strokeWidth={1} fill="none" />
    </Svg>
  );
};

export default AvatarPortrait;
export { AvatarPortrait };
