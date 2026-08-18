/**
 * ThemePreview — illustration-grade mini game-board vignette for a cosmetic
 * theme. Instead of flat color swatches, each theme renders as a tiny slice
 * of gameplay: a rounded backdrop panel washed in the theme's background
 * colors, a 3×2 grid of beveled letter tiles built from the theme's tile
 * ramp, one "found word" tile glowing in the theme accent, and a subtle
 * garnish keyed by the theme's id family (petals, skyline, bubbles, stars…).
 *
 * All colors derive from the theme object's own color fields so every one of
 * the 26 COSMETIC_THEMES previews distinctly, in its true palette.
 */
import React, { useMemo } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { FONTS } from '../../constants';
import { CosmeticTheme } from '../../types';
import { gradId, shade } from '../icons/IconBase';

// ── Design space ────────────────────────────────────────────────────────────
const VW = 160;
const VH = 84;
const TILE = 21;
const GAP = 4;
const GX = 12;
const GY = (VH - (TILE * 2 + GAP)) / 2; // 19
const ROWS: string[][] = [
  ['W', 'O', 'R'],
  ['D', 'F', 'A'],
];
// Found tile ("L") — hero element on the right
const FX = 112;
const FY = 26;
const FS = 28;
const FCX = FX + FS / 2; // 126
const FCY = FY + FS / 2; // 40

type Family =
  | 'sakura'
  | 'skyline'
  | 'bubbles'
  | 'snow'
  | 'embers'
  | 'stars'
  | 'rays'
  | 'ribbon'
  | 'leaves'
  | 'sun'
  | 'sparkle';

function familyFor(id: string): Family {
  if (id.includes('sakura') || id.includes('cherry') || id.includes('blossom')) return 'sakura';
  if (id.includes('sunset') || id.includes('boulevard')) return 'sun';
  if (id.includes('ocean') || id.includes('underwater') || id.includes('whale')) return 'bubbles';
  if (id.includes('neon') || id.includes('tokyo')) return 'skyline';
  if (id.includes('arctic') || id.includes('frost') || id.includes('chrome')) return 'snow';
  if (id.includes('volcanic') || id.includes('lava')) return 'embers';
  if (id.includes('space') || id.includes('cosmic')) return 'stars';
  if (id.includes('golden') || id.includes('gold')) return 'rays';
  if (id.includes('aurora')) return 'ribbon';
  if (id.includes('forest')) return 'leaves';
  return 'sparkle';
}

// ── Tiny vector garnish primitives (unit shapes, placed via transform) ──────
const STAR4 = 'M0 -1 L0.28 -0.28 L1 0 L0.28 0.28 L0 1 L-0.28 0.28 L-1 0 L-0.28 -0.28 Z';
const PETAL =
  'M0 -1 C0.62 -0.72 0.72 0.2 0.16 0.92 C0.05 0.72 -0.12 0.73 -0.24 0.9 C-0.7 0.22 -0.6 -0.7 0 -1 Z';
const LEAF = 'M-1 0 C-0.5 -0.62 0.5 -0.62 1 0 C0.5 0.62 -0.5 0.62 -1 0 Z';

function star4(key: string, x: number, y: number, s: number, fill: string, opacity: number) {
  return (
    <Path
      key={key}
      d={STAR4}
      transform={`translate(${x} ${y}) scale(${s})`}
      fill={fill}
      opacity={opacity}
    />
  );
}

interface Palette {
  bg: string;
  surface: string;
  accent: string;
  accentHi: string;
  accentLo: string;
}

function renderGarnish(family: Family, p: Palette, ids: Record<string, string>): React.ReactNode {
  switch (family) {
    case 'sakura':
      return (
        <G>
          <Path d={PETAL} transform="translate(100 14) rotate(-30) scale(5)" fill={p.accentHi} opacity={0.85} />
          <Path d={PETAL} transform="translate(148 18) rotate(40) scale(3.6)" fill={p.accent} opacity={0.7} />
          <Path d={PETAL} transform="translate(150 60) rotate(120) scale(4.4)" fill={p.accentHi} opacity={0.6} />
          <Circle cx={104} cy={68} r={1} fill={p.accentHi} opacity={0.6} />
        </G>
      );
    case 'skyline': {
      const bldg = shade(p.surface, 20);
      const buildings: [number, number, number][] = [
        [6, 12, 16], [20, 9, 24], [31, 13, 12], [46, 10, 20], [58, 12, 14],
        [72, 9, 22], [83, 14, 10], [99, 10, 18], [111, 12, 26], [125, 9, 14],
        [136, 11, 20], [149, 8, 13],
      ];
      const windows: [number, number][] = [
        [23, 62], [26, 67], [49, 66], [75, 64], [102, 68], [114, 60], [117, 65], [139, 66],
      ];
      return (
        <G>
          {buildings.map(([x, w, h], i) => (
            <Rect key={`b${i}`} x={x} y={82 - h} width={w} height={h} fill={bldg} opacity={0.9} />
          ))}
          <Path d="M116 56 V50" stroke={p.accent} strokeWidth={0.8} opacity={0.8} />
          {windows.map(([x, y], i) => (
            <Rect key={`w${i}`} x={x} y={y} width={1.4} height={1.4} fill={p.accentHi} opacity={0.85} />
          ))}
        </G>
      );
    }
    case 'bubbles': {
      const bubbles: [number, number, number][] = [
        [98, 64, 3], [148, 52, 4.2], [140, 16, 2.4], [104, 18, 1.6],
      ];
      return (
        <G>
          {bubbles.map(([x, y, r], i) => (
            <G key={`bb${i}`}>
              <Circle cx={x} cy={y} r={r} fill={p.accent} opacity={0.14} />
              <Circle cx={x} cy={y} r={r} stroke={p.accentHi} strokeWidth={0.8} opacity={0.75} fill="none" />
              <Circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.24} fill="#ffffff" opacity={0.6} />
            </G>
          ))}
        </G>
      );
    }
    case 'snow': {
      const dots: [number, number, number][] = [
        [100, 14, 1.2], [118, 10, 0.9], [152, 48, 1.1], [96, 66, 1.3], [142, 66, 0.9], [108, 74, 1],
      ];
      return (
        <G>
          {dots.map(([x, y, r], i) => (
            <Circle key={`s${i}`} cx={x} cy={y} r={r} fill="#ffffff" opacity={0.6} />
          ))}
          <G transform="translate(146 22)">
            {[0, 60, 120].map((a) => (
              <Path key={`fl${a}`} d="M-4.5 0 H4.5" stroke={p.accentHi} strokeWidth={0.9} opacity={0.85} transform={`rotate(${a})`} />
            ))}
            <Circle r={1.1} fill={p.accentHi} opacity={0.9} />
          </G>
        </G>
      );
    }
    case 'embers': {
      const embers: [number, number, number][] = [
        [100, 70, 1.5], [146, 62, 1.1], [138, 70, 2], [152, 36, 1.3], [120, 14, 1], [104, 20, 1.2],
      ];
      return (
        <G>
          {embers.map(([x, y, r], i) => (
            <G key={`e${i}`}>
              <Circle cx={x} cy={y} r={r * 2.6} fill={p.accent} opacity={0.16} />
              <Circle cx={x} cy={y} r={r} fill={p.accentHi} opacity={0.9} />
            </G>
          ))}
        </G>
      );
    }
    case 'stars':
      return (
        <G>
          {star4('st1', 146, 18, 4.5, p.accentHi, 0.95)}
          {star4('st2', 98, 62, 3, p.accentHi, 0.7)}
          {star4('st3', 106, 12, 2, p.accent, 0.6)}
          <Circle cx={152} cy={42} r={1.1} fill="#ffffff" opacity={0.7} />
          <Circle cx={144} cy={64} r={0.9} fill="#ffffff" opacity={0.55} />
          <Circle cx={100} cy={24} r={0.7} fill={p.accentHi} opacity={0.6} />
        </G>
      );
    case 'rays':
      return (
        <G>
          <Path d="M156 4 L96 22 L106 30 Z" fill={p.accent} opacity={0.14} />
          <Path d="M156 4 L120 44 L130 50 Z" fill={p.accent} opacity={0.11} />
          <Path d="M156 4 L146 58 L154 60 Z" fill={p.accent} opacity={0.08} />
          <Circle cx={153} cy={7} r={7} fill={p.accent} opacity={0.25} />
          <Circle cx={153} cy={7} r={3} fill={p.accentHi} opacity={0.95} />
        </G>
      );
    case 'ribbon':
      return (
        <G>
          <Path
            d="M6 26 C 40 6, 92 34, 154 12"
            stroke={`url(#${ids.ribbon})`}
            strokeWidth={5.5}
            strokeLinecap="round"
            fill="none"
            opacity={0.5}
          />
          <Path
            d="M6 34 C 44 14, 94 40, 154 20"
            stroke={p.accentHi}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
            opacity={0.3}
          />
        </G>
      );
    case 'leaves':
      return (
        <G>
          <G transform="translate(100 15) rotate(-25) scale(5.6)">
            <Path d={LEAF} fill={shade(p.accent, 20)} opacity={0.85} />
            <Path d="M-0.85 0 H0.85" stroke={p.accentLo} strokeWidth={0.12} opacity={0.8} />
          </G>
          <G transform="translate(149 58) rotate(35) scale(4.6)">
            <Path d={LEAF} fill={p.accent} opacity={0.7} />
            <Path d="M-0.85 0 H0.85" stroke={p.accentLo} strokeWidth={0.12} opacity={0.8} />
          </G>
          <Circle cx={146} cy={20} r={1.1} fill={p.accentHi} opacity={0.6} />
        </G>
      );
    case 'sun':
      return (
        <G>
          <Circle cx={128} cy={22} r={13} fill={`url(#${ids.sun})`} opacity={0.65} />
          <G clipPath={`url(#${ids.sunClip})`}>
            <Rect x={113} y={24} width={30} height={1.5} fill={p.bg} opacity={0.9} />
            <Rect x={113} y={28} width={30} height={1.9} fill={p.bg} opacity={0.9} />
            <Rect x={113} y={32.5} width={30} height={2.3} fill={p.bg} opacity={0.9} />
          </G>
        </G>
      );
    case 'sparkle':
    default:
      return (
        <G>
          {star4('sp1', 146, 20, 4, p.accentHi, 0.9)}
          {star4('sp2', 98, 64, 2.6, p.accentHi, 0.6)}
          <Circle cx={152} cy={44} r={1} fill="#ffffff" opacity={0.6} />
          <Circle cx={104} cy={14} r={0.9} fill={p.accentHi} opacity={0.6} />
        </G>
      );
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export interface ThemePreviewProps {
  /** Full CosmeticTheme, or any object carrying its id + colors. */
  theme: Pick<CosmeticTheme, 'id' | 'colors'>;
  /** Rendered width in px; height keeps the 160:84 vignette aspect. */
  width: number;
  /** Dim the whole vignette (locked / unowned cards). */
  muted?: boolean;
}

export default function ThemePreview({ theme, width, muted }: ThemePreviewProps) {
  const height = Math.round((width * VH) / VW);
  const { bg, surface, accent, cellDefault, cellSelected } = theme.colors;

  const ids = useMemo(() => {
    const base = gradId('themeprev');
    return {
      panel: `${base}-panel`,
      amb: `${base}-amb`,
      tile: `${base}-tile`,
      found: `${base}-found`,
      glow: `${base}-glow`,
      ribbon: `${base}-ribbon`,
      sun: `${base}-sun`,
      sunClip: `${base}-sunclip`,
      clip: `${base}-clip`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const family = familyFor(theme.id);
  const palette: Palette = {
    bg,
    surface,
    accent,
    accentHi: shade(accent, 60),
    accentLo: shade(accent, -60),
  };
  const tileRim = shade(cellDefault, -64);
  const foundRim = shade(cellSelected, -90);
  const foundInk = shade(cellSelected, -122);
  const panelEdge = shade(surface, 46);

  const tiles: React.ReactNode[] = [];
  ROWS.forEach((row, r) =>
    row.forEach((letter, c) => {
      const x = GX + c * (TILE + GAP);
      const y = GY + r * (TILE + GAP);
      tiles.push(
        <G key={`t${r}${c}`}>
          <Rect x={x} y={y + 1.4} width={TILE} height={TILE} rx={5.5} fill="#000000" opacity={0.32} />
          <Rect x={x} y={y} width={TILE} height={TILE} rx={5.5} fill={`url(#${ids.tile})`} stroke={tileRim} strokeWidth={0.8} />
          <Rect x={x + 1.8} y={y + 1.5} width={TILE - 3.6} height={TILE * 0.4} rx={3.6} fill="#ffffff" opacity={0.13} />
          <SvgText
            x={x + TILE / 2}
            y={y + TILE / 2 + 4.3}
            fontSize={12}
            fontFamily={FONTS.display}
            fontWeight="700"
            fill="#ffffff"
            opacity={0.92}
            textAnchor="middle"
          >
            {letter}
          </SvgText>
        </G>,
      );
    }),
  );

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VW} ${VH}`}>
      <Defs>
        <LinearGradient id={ids.panel} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(surface, 16)} />
          <Stop offset="0.45" stopColor={surface} />
          <Stop offset="1" stopColor={bg} />
        </LinearGradient>
        <RadialGradient id={ids.amb} cx="0.5" cy="0" r="0.95">
          <Stop offset="0" stopColor={accent} stopOpacity={0.26} />
          <Stop offset="1" stopColor={accent} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={ids.tile} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(cellDefault, 46)} />
          <Stop offset="0.5" stopColor={cellDefault} />
          <Stop offset="1" stopColor={shade(cellDefault, -40)} />
        </LinearGradient>
        <LinearGradient id={ids.found} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(cellSelected, 58)} />
          <Stop offset="0.5" stopColor={cellSelected} />
          <Stop offset="1" stopColor={shade(cellSelected, -44)} />
        </LinearGradient>
        <RadialGradient id={ids.glow} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={accent} stopOpacity={0.5} />
          <Stop offset="0.6" stopColor={accent} stopOpacity={0.18} />
          <Stop offset="1" stopColor={accent} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={ids.ribbon} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={palette.accentHi} stopOpacity={0.9} />
          <Stop offset="0.55" stopColor={accent} stopOpacity={0.5} />
          <Stop offset="1" stopColor={accent} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={ids.sun} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.accentHi} />
          <Stop offset="1" stopColor={palette.accentLo} />
        </LinearGradient>
        <ClipPath id={ids.clip}>
          <Rect x={0.5} y={0.5} width={VW - 1} height={VH - 1} rx={12} />
        </ClipPath>
        <ClipPath id={ids.sunClip}>
          <Circle cx={128} cy={22} r={13} />
        </ClipPath>
      </Defs>
      <G opacity={muted ? 0.55 : 1}>
        {/* Backdrop panel */}
        <Rect x={0.5} y={0.5} width={VW - 1} height={VH - 1} rx={12} fill={`url(#${ids.panel})`} stroke={panelEdge} strokeWidth={1} />
        <G clipPath={`url(#${ids.clip})`}>
          <Rect x={0.5} y={0.5} width={VW - 1} height={VH - 1} fill={`url(#${ids.amb})`} />
          <Path d="M14 2.2 H146" stroke="#ffffff" strokeWidth={1} strokeLinecap="round" opacity={0.1} />
          {renderGarnish(family, palette, ids)}
        </G>
        {/* Mini letter grid */}
        {tiles}
        {/* Found-word hero tile */}
        <Circle cx={FCX} cy={FCY} r={24} fill={`url(#${ids.glow})`} />
        <G transform={`rotate(-7 ${FCX} ${FCY})`}>
          <Rect x={FX} y={FY + 1.6} width={FS} height={FS} rx={7} fill="#000000" opacity={0.35} />
          <Rect x={FX} y={FY} width={FS} height={FS} rx={7} fill={`url(#${ids.found})`} stroke={foundRim} strokeWidth={1} />
          <Rect x={FX + 2.2} y={FY + 1.8} width={FS - 4.4} height={FS * 0.42} rx={4.6} fill="#ffffff" opacity={0.3} />
          <SvgText
            x={FCX}
            y={FCY + 5.6}
            fontSize={15}
            fontFamily={FONTS.display}
            fontWeight="700"
            fill={foundInk}
            textAnchor="middle"
          >
            L
          </SvgText>
        </G>
        {star4('fspark', 141, 23, 2.6, '#ffffff', 0.85)}
        <Circle cx={146} cy={56} r={1.1} fill={palette.accentHi} opacity={0.8} />
      </G>
    </Svg>
  );
}
