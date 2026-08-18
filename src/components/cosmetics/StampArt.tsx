/**
 * StampArt — illustrated collectible postage stamp for the Seasonal Stamps
 * album (blind-panel fix: "flat glyphs in identical dark squares").
 *
 * Draws in a 100×120 portrait viewBox: a serrated/perforated outline
 * (semicircular scallop cut-outs on all four edges), cream parchment paper
 * with a subtle vertical gradient, a thin engraved double inner frame, the
 * stamp's full-color GameIcon artwork large over a soft accent-wash
 * vignette, a tiny value mark in one corner, and — once earned — a rotated
 * ink postmark (broken concentric arcs + cancel bars) overlapping the
 * top-right corner plus a diagonal rarity-foil sheen. Unearned stamps keep
 * the same die-cut silhouette but ghost out: gray paper, dashed inner
 * frame, big '?' watermark — so the album page reads as awaiting stamps.
 */
import React, { useMemo } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { COLORS } from '../../constants';
import { gradId, shade } from '../icons/IconBase';
import GameIcon from '../icons/GameIcon';

/** Rotating parchment hues so a sheet of stamps reads as a real album page. */
export const STAMP_PAPERS = ['#f2e8cf', '#e9eed9', '#f3e2d8', '#e4e9ef'];

const GHOST_PAPER = '#646b7e';
const INK = '#3d3428';
const POSTMARK_INK = '#20263c';

// ── Perforation geometry (computed once) ────────────────────────────────────
const PX0 = 3;
const PY0 = 3;
const PX1 = 97;
const PY1 = 117;
const PR = 3; // scallop radius

/**
 * One straight edge with semicircular cut-outs, traversed clockwise.
 * Axis-aligned only; sweep-flag 0 makes every arc dip into the paper.
 */
function perfEdge(x0: number, y0: number, x1: number, y1: number, notches: number): string {
  const ux = Math.sign(x1 - x0);
  const uy = Math.sign(y1 - y0);
  const seg = (Math.abs(x1 - x0) + Math.abs(y1 - y0)) / notches;
  let d = '';
  for (let i = 0; i < notches; i++) {
    const c = (i + 0.5) * seg;
    const sx = x0 + ux * (c - PR);
    const sy = y0 + uy * (c - PR);
    const ex = x0 + ux * (c + PR);
    const ey = y0 + uy * (c + PR);
    d += `L${sx.toFixed(2)},${sy.toFixed(2)} A${PR},${PR} 0 0 0 ${ex.toFixed(2)},${ey.toFixed(2)} `;
  }
  return d + `L${x1},${y1} `;
}

const STAMP_OUTLINE =
  `M${PX0},${PY0} ` +
  perfEdge(PX0, PY0, PX1, PY0, 7) +
  perfEdge(PX1, PY0, PX1, PY1, 9) +
  perfEdge(PX1, PY1, PX0, PY1, 7) +
  perfEdge(PX0, PY1, PX0, PY0, 9) +
  'Z';

/** Tiny 5-point star path (value-mark rosette). */
function star(cx: number, cy: number, r: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    d += `${i === 0 ? 'M' : 'L'}${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }
  return d + 'Z';
}

export interface StampArtProps {
  /** Stored emoji glyph from the album catalog (resolved via GameIcon). */
  icon: string;
  /** Stamp display name — engraved in tiny caps along the base. */
  name: string;
  earned: boolean;
  accent?: string;
  /** Rendered width; height is width × 1.2 (portrait stamp). */
  size?: number;
  /** Parchment hue — rotate STAMP_PAPERS by index for an album-page feel. */
  paperTint?: string;
  /** Tiny corner denomination (e.g. sheet position). */
  value?: string;
  style?: StyleProp<ViewStyle>;
}

export default function StampArt({
  icon,
  name,
  earned,
  accent = COLORS.purple,
  size = 86,
  paperTint = STAMP_PAPERS[0],
  value = '1',
  style,
}: StampArtProps) {
  const ids = useMemo(
    () => ({
      paper: gradId('stampPaper'),
      wash: gradId('stampWash'),
      foil: gradId('stampFoil'),
      sheen: gradId('stampSheen'),
    }),
    [],
  );
  const paper = earned ? paperTint : GHOST_PAPER;
  const h = size * 1.2;
  const iconSize = size * 0.46;
  // Icon centered on the artwork field (viewBox y≈56 of 120).
  const iconTop = h * (56 / 120) - iconSize / 2;

  return (
    <View style={[{ width: size, height: h }, style]} pointerEvents="none">
      <Svg width={size} height={h} viewBox="0 0 100 120">
        <Defs>
          <LinearGradient id={ids.paper} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={shade(paper, 16)} />
            <Stop offset="0.55" stopColor={paper} />
            <Stop offset="1" stopColor={shade(paper, -16)} />
          </LinearGradient>
          <RadialGradient id={ids.wash} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={accent} stopOpacity="0.3" />
            <Stop offset="0.65" stopColor={accent} stopOpacity="0.12" />
            <Stop offset="1" stopColor={accent} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id={ids.foil} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={shade(accent, 84)} />
            <Stop offset="0.5" stopColor={accent} />
            <Stop offset="1" stopColor={shade(accent, -36)} />
          </LinearGradient>
          <LinearGradient id={ids.sheen} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0.36" stopColor="#ffffff" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.16" />
            <Stop offset="0.64" stopColor="#ffffff" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Drop shadow so the die-cut paper lifts off the card. */}
        <Path d={STAMP_OUTLINE} fill="rgba(0,0,0,0.4)" translateY={2} />
        {/* Perforated paper body. */}
        <Path
          d={STAMP_OUTLINE}
          fill={`url(#${ids.paper})`}
          stroke={shade(paper, -48)}
          strokeWidth={0.8}
          strokeOpacity={0.45}
        />

        {earned ? (
          <>
            {/* Accent wash vignette behind the artwork. */}
            <Circle cx={50} cy={56} r={34} fill={`url(#${ids.wash})`} />
            {/* Engraved double frame — outer line in rarity foil. */}
            <Rect
              x={9.5}
              y={9.5}
              width={81}
              height={101}
              fill="none"
              stroke={`url(#${ids.foil})`}
              strokeWidth={1.5}
            />
            <Rect
              x={13}
              y={13}
              width={74}
              height={94}
              fill="none"
              stroke={INK}
              strokeOpacity={0.32}
              strokeWidth={0.6}
            />
            {/* Value corner mark: numeral + foil star rosette. */}
            <SvgText
              x={17}
              y={24}
              fontSize={9.5}
              fontWeight="bold"
              fill={INK}
              opacity={0.85}
            >
              {value}
            </SvgText>
            <Path d={star(27, 20.5, 3.4)} fill={`url(#${ids.foil})`} />
            {/* Engraved name plate along the base. */}
            <SvgText
              x={50}
              y={103.5}
              fontSize={6.4}
              fontWeight="bold"
              letterSpacing={0.8}
              textAnchor="middle"
              fill={INK}
              opacity={0.7}
            >
              {name.toUpperCase()}
            </SvgText>
            {/* Diagonal rarity-foil sheen across the whole stamp. */}
            <Path d={STAMP_OUTLINE} fill={`url(#${ids.sheen})`} />
            {/* Rotated ink postmark overlapping the top-right corner. */}
            <G rotation={-16} origin="82, 19">
              <Circle
                cx={82}
                cy={19}
                r={14}
                fill="none"
                stroke={POSTMARK_INK}
                strokeWidth={1.6}
                strokeOpacity={0.5}
                strokeDasharray="11,5,17,7"
              />
              <Circle
                cx={82}
                cy={19}
                r={10.5}
                fill="none"
                stroke={POSTMARK_INK}
                strokeWidth={1.1}
                strokeOpacity={0.45}
                strokeDasharray="8,6,13,8"
              />
              {/* Cancel bars trailing left of the ring. */}
              <Path
                d="M46,13.5 H66 M43,19 H64 M46,24.5 H66"
                stroke={POSTMARK_INK}
                strokeWidth={1.5}
                strokeOpacity={0.42}
                strokeDasharray="5,3"
              />
            </G>
          </>
        ) : (
          <>
            {/* Ghost stamp: dashed frame + big '?' watermark. */}
            <Rect
              x={9.5}
              y={9.5}
              width={81}
              height={101}
              fill="none"
              stroke="rgba(24,29,48,0.55)"
              strokeWidth={1.2}
              strokeDasharray="4,3.5"
            />
            <SvgText
              x={50}
              y={74}
              fontSize={46}
              fontWeight="bold"
              textAnchor="middle"
              fill="rgba(20,24,40,0.32)"
            >
              ?
            </SvgText>
          </>
        )}
      </Svg>

      {/* Full-color artwork — GameIcon hosts its own Svg, so overlay it. */}
      {earned && (
        <View
          style={{
            position: 'absolute',
            top: iconTop,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          <GameIcon glyph={icon} size={iconSize} />
        </View>
      )}
    </View>
  );
}
