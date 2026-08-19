/**
 * AvatarPortrait — the default player identity art: an illustrated portrait of
 * one of the keepers of the Grand Library.
 *
 * Drawn against a synthwave sunset (sun disc with scanline slits, horizon glow,
 * perspective grid floor) with a strong rim light along the lit edge so the
 * figure SEPARATES from the disc instead of reading as a black blob — which is
 * exactly how the old flat silhouette failed. The face plane, lit cheek,
 * brow/eye line and collar all sit in the mid-to-light value range; only the
 * far cheek and the hood's inner drape go dark.
 *
 * Six variants (`avatarVariants.ts` → `avatarPortraitShapes.ts`) each own a
 * POSE: head angle, shoulder line, hood/hair silhouette and an accessory prop
 * (tile, quill, rune, lantern, spanner, map). They are different characters,
 * not one bust with the ring recoloured. Everything else tints from the passed
 * `accent`, so one prop retints the whole backdrop.
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
  Eye,
  FACE_PLANES,
  PORTRAIT_POSES,
  PaintRole,
  PoseShape,
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

const MIRROR = 'translate(100,0) scale(-1,1)';

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
  const pose = PORTRAIT_POSES[v.pose];
  const plane = FACE_PLANES[pose.plane];
  const ids = useMemo(() => {
    const base = gradId('avatarPortrait');
    return {
      sky: `${base}-sky`,
      sun: `${base}-sun`,
      cloth: `${base}-cloth`,
      collar: `${base}-collar`,
      skin: `${base}-skin`,
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
  const metalHex = safeHex(v.metal, '#f6d98a');
  const skinDeep = shade(v.skin, -80);

  const paint: Record<PaintRole, string> = {
    cloth: v.cloth,
    clothLit,
    clothDeep,
    collar: v.collar,
    collarLit: shade(v.collar, 44),
    collarDeep: shade(v.collar, -74),
    skin: v.skin,
    // Luma guard: skin variants are authored mid-to-light and the lit plane
    // only ever goes lighter, so a face never sinks into the dark backdrop.
    skinLit: shade(v.skin, 44),
    skinDeep,
    feature: shade(v.skin, -122),
    metal: metalHex,
    metalLit: shade(metalHex, 54),
    metalDeep: shade(metalHex, -104),
    paper: '#f6e7c8',
    paperDeep: '#c3a87c',
    accent: accentHex,
    glow,
    rim: rimHex,
    dark: shade(accentHex, -132),
    white: '#ffffff',
  };

  const headTransform = [pose.mirrorHead ? MIRROR : '', pose.headTransform ?? '']
    .filter(Boolean)
    .join(' ');

  const renderShapes = (shapes: PoseShape[] | undefined, key: string) =>
    (shapes ?? []).map((s, i) =>
      s.t === 'c' ? (
        <Circle
          key={`${key}${i}`}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill={s.fill ? paint[s.fill] : 'none'}
          stroke={s.stroke ? paint[s.stroke] : undefined}
          strokeWidth={s.sw}
          opacity={s.op}
        />
      ) : (
        <Path
          key={`${key}${i}`}
          d={s.d}
          fill={s.fill ? paint[s.fill] : 'none'}
          stroke={s.stroke ? paint[s.stroke] : undefined}
          strokeWidth={s.sw}
          strokeLinecap={s.cap ? 'round' : undefined}
          opacity={s.op}
        />
      ),
    );

  const renderEye = (eye: Eye, key: string) => (
    <G key={key} opacity={eye.op}>
      <Ellipse cx={eye.cx} cy={eye.cy} rx={eye.rx} ry={eye.ry} fill="#2b1230" />
      <Circle
        cx={eye.cx - 0.9}
        cy={eye.cy - 0.6}
        r={Math.min(eye.rx, eye.ry) * 0.45}
        fill={glow}
      />
    </G>
  );

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
          <Stop offset="0" stopColor={paint.collarLit} />
          <Stop offset="1" stopColor={paint.collarDeep} />
        </LinearGradient>
        <LinearGradient id={ids.skin} x1="0.1" y1="0.1" x2="0.95" y2="0.9">
          <Stop offset="0" stopColor={paint.skinLit} />
          <Stop offset="0.5" stopColor={v.skin} />
          <Stop offset="1" stopColor={skinDeep} />
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
        {renderShapes(pose.back, 'bk')}

        {/* ── Figure: cloak → hood → face → hood front → collar ── */}
        <Path d={pose.cloak} fill={`url(#${ids.cloth})`} />
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
        {/* Lit plane on the near shoulder — keeps the cloak off flat black.
            It follows the pose's key light, so a mirrored pose mirrors it. */}
        <G transform={pose.mirrorHead ? MIRROR : undefined}>
          <Path
            d="M12 100 C15 86 23 77 34 72.5 L40.5 76 C29.5 82 21.5 90 18.5 100 Z"
            fill={clothLit}
            opacity={0.32}
          />
        </G>
        <Path d={pose.hood} fill={`url(#${ids.cloth})`} />
        {/* Inner hood cavity — the dark the face reads against */}
        <Ellipse cx={50} cy={44} rx={19} ry={22} fill={clothDeep} opacity={0.85} />

        <G transform={headTransform || undefined}>
          <Path d={plane.neck} fill={v.skin} opacity={0.85} />
          <Path d={plane.neck} fill={skinDeep} opacity={0.45} />
          <Path d={plane.face} fill={`url(#${ids.skin})`} />
          <Path d={plane.lit} fill={paint.skinLit} opacity={0.55} />
          <Path d={plane.shadow} fill={skinDeep} opacity={0.5} />
          {/* Brow bar casts the hood's shadow across the forehead */}
          <Path d={plane.browBar} fill={clothDeep} opacity={0.32} />
          <Path
            d={plane.browNear}
            stroke={paint.feature}
            strokeWidth={1.9}
            strokeLinecap="round"
            fill="none"
          />
          {plane.browFar ? (
            <Path
              d={plane.browFar}
              stroke={paint.feature}
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={0.75}
              fill="none"
            />
          ) : null}
          {renderEye(plane.eyeNear, 'eyeN')}
          {plane.eyeFar ? renderEye(plane.eyeFar, 'eyeF') : null}
          <Path
            d={plane.nose}
            stroke={skinDeep}
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
          {plane.mouth ? (
            <Path
              d={plane.mouth}
              stroke={paint.feature}
              strokeWidth={1.3}
              strokeLinecap="round"
              fill="none"
            />
          ) : null}
          <Path
            d={plane.jaw}
            stroke={skinDeep}
            strokeWidth={1}
            opacity={0.5}
            fill="none"
          />
        </G>

        {/* Hood front edge + side drapes overlap the face like real cloth */}
        <Path d={pose.crest} fill={`url(#${ids.cloth})`} />
        <Path d={pose.crest} fill={clothLit} opacity={0.18} />
        <Path d={pose.drapeL} fill={v.cloth} />
        {/* Shadow-side drape stays readable (it carries the oracle's veil) */}
        <Path d={pose.drapeR} fill={v.cloth} />
        <Path d={pose.drapeR} fill={clothDeep} opacity={0.5} />

        {/* Headwear rides the head's angle: veil, goggles, hat brim */}
        {pose.headwear ? (
          <G transform={headTransform || undefined}>{renderShapes(pose.headwear, 'hw')}</G>
        ) : null}

        {/* Collar */}
        <Path d={pose.collar} fill={`url(#${ids.collar})`} />
        <Path
          d={pose.collar}
          stroke={paint.collarLit}
          strokeWidth={0.8}
          opacity={0.5}
          fill="none"
        />

        {/* ── Rim light: the whole point. Lit edge separates from the disc. ── */}
        <Path
          d={pose.rimHead}
          stroke={rimHex}
          strokeWidth={2.4}
          strokeOpacity={0.95}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={pose.rimHead}
          stroke="#ffffff"
          strokeWidth={0.9}
          strokeOpacity={0.5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={pose.rimShoulder}
          stroke={rimHex}
          strokeWidth={2}
          strokeOpacity={0.75}
          strokeLinecap="round"
          fill="none"
        />
        {/* Cool counter-rim, mirrored onto the shadow side for volume */}
        <G transform={MIRROR}>
          <Path
            d={pose.rimHead}
            stroke={glow}
            strokeWidth={1.5}
            strokeOpacity={0.35}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d={pose.rimShoulder}
            stroke={glow}
            strokeWidth={1.2}
            strokeOpacity={0.25}
            strokeLinecap="round"
            fill="none"
          />
        </G>

        {/* ── Accessory prop + the variant's letter on it ── */}
        {renderShapes(pose.prop, 'pr')}
        <SvgText
          x={pose.glyph.x}
          y={pose.glyph.y}
          fontSize={pose.glyph.size}
          fontWeight="bold"
          textAnchor="middle"
          fill={paint[pose.glyph.fill ?? 'dark']}
          transform={
            pose.glyph.rotate
              ? `rotate(${pose.glyph.rotate} ${pose.glyph.x} ${pose.glyph.y})`
              : undefined
          }
        >
          {v.glyph}
        </SvgText>

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
