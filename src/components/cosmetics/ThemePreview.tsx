/**
 * ThemePreview v2 — full-bleed illustration-grade vignette for a cosmetic
 * theme. The whole preview area IS the theme's world: a sky→horizon→ground
 * gradient mixed from the theme's own bg/surface colors pushed toward its
 * accent (so Volcanic reads ember-red, Ocean deep teal, Golden Age warm
 * gold), a synthwave horizon line, large family-keyed garnish (petals,
 * skyline, bubbles, embers, stars…), and a traced word row whose letters
 * vary per theme family (LAVA, WAVE, BLOOM…) with the found tile glowing
 * inline in the row. Three tile arrangements — cascade, arch, scatter —
 * rotate by id hash so compositions differ card to card.
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
const VH = 96;
const HY = 58; // horizon line
const ROW_CY = 53; // word-row vertical center

/** Linear channel mix of two #rrggbb colors. */
function mix(a: string, b: string, t: number): string {
  const pa = /^#([0-9a-fA-F]{6})$/.exec(a);
  const pb = /^#([0-9a-fA-F]{6})$/.exec(b);
  if (!pa || !pb) return a;
  const na = parseInt(pa[1], 16);
  const nb = parseInt(pb[1], 16);
  const ch = (sa: number, sb: number) => Math.round(sa + (sb - sa) * t);
  const r = ch((na >> 16) & 0xff, (nb >> 16) & 0xff);
  const g = ch((na >> 8) & 0xff, (nb >> 8) & 0xff);
  const bl = ch(na & 0xff, nb & 0xff);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

/** Deterministic small hash of a theme id — picks arrangement + found tile. */
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

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

/** Word traced in the preview, keyed by theme family (4-6 letters). */
const FAMILY_WORDS: Record<Family, string> = {
  sakura: 'BLOOM',
  skyline: 'NEON',
  bubbles: 'WAVE',
  snow: 'FROST',
  embers: 'LAVA',
  stars: 'NOVA',
  rays: 'GOLD',
  ribbon: 'AURORA',
  leaves: 'GROVE',
  sun: 'DUSK',
  sparkle: 'WORDS',
};

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

function petal(key: string, x: number, y: number, r: number, s: number, fill: string, o: number) {
  return (
    <Path
      key={key}
      d={PETAL}
      transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
      fill={fill}
      opacity={o}
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
          {petal('p1', 22, 16, -30, 9, p.accentHi, 0.9)}
          {petal('p2', 72, 10, 25, 6, p.accent, 0.7)}
          {petal('p3', 126, 17, 70, 8, p.accentHi, 0.8)}
          {petal('p4', 149, 42, 120, 5, p.accent, 0.55)}
          {petal('p5', 18, 82, 160, 6.5, p.accentHi, 0.6)}
          {petal('p6', 138, 84, 205, 7.5, p.accent, 0.65)}
          <Circle cx={50} cy={26} r={1.4} fill={p.accentHi} opacity={0.7} />
          <Circle cx={102} cy={87} r={1.2} fill={p.accentHi} opacity={0.55} />
          <Circle cx={12} cy={48} r={1} fill={p.accent} opacity={0.5} />
        </G>
      );
    case 'skyline': {
      const bldg = mix(shade(p.bg, 10), p.accent, 0.1);
      const buildings: [number, number, number][] = [
        [0, 14, 26], [16, 10, 38], [28, 15, 20], [45, 11, 32], [58, 13, 24],
        [73, 10, 40], [85, 15, 18], [102, 11, 30], [115, 13, 44], [130, 10, 24],
        [142, 12, 34], [156, 6, 20],
      ];
      const windows: [number, number][] = [
        [19, 64], [22, 70], [48, 68], [61, 76], [76, 60], [79, 66], [105, 70],
        [118, 56], [121, 62], [118, 70], [133, 76], [145, 66], [148, 72], [7, 74],
      ];
      return (
        <G>
          {buildings.map(([x, w, hh], i) => (
            <Rect key={`b${i}`} x={x} y={VH - hh} width={w} height={hh} fill={bldg} opacity={0.92} />
          ))}
          <Path d="M121 52 V42" stroke={p.accent} strokeWidth={1} opacity={0.85} />
          <Path d="M78 56 V48" stroke={p.accent} strokeWidth={0.8} opacity={0.7} />
          {windows.map(([x, y], i) => (
            <Rect key={`w${i}`} x={x} y={y} width={1.8} height={1.8} fill={p.accentHi} opacity={0.85} />
          ))}
        </G>
      );
    }
    case 'bubbles': {
      const bubbles: [number, number, number][] = [
        [16, 20, 4], [40, 11, 2.6], [124, 14, 3.2], [146, 26, 5.5],
        [18, 76, 3.4], [70, 87, 2.4], [118, 80, 4.6], [148, 64, 2.6],
      ];
      return (
        <G>
          <Path d="M28 0 L46 0 L14 44 L4 40 Z" fill="#ffffff" opacity={0.05} />
          <Path d="M92 0 L104 0 L126 40 L116 44 Z" fill="#ffffff" opacity={0.04} />
          {bubbles.map(([x, y, r], i) => (
            <G key={`bb${i}`}>
              <Circle cx={x} cy={y} r={r} fill={p.accent} opacity={0.14} />
              <Circle cx={x} cy={y} r={r} stroke={p.accentHi} strokeWidth={0.9} opacity={0.75} fill="none" />
              <Circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.24} fill="#ffffff" opacity={0.6} />
            </G>
          ))}
        </G>
      );
    }
    case 'snow': {
      const dots: [number, number, number][] = [
        [14, 14, 1.3], [46, 8, 1], [96, 12, 1.2], [150, 40, 1.1], [10, 44, 1],
        [24, 82, 1.4], [64, 88, 1], [104, 84, 1.2], [142, 78, 1], [152, 88, 1.3],
      ];
      const flake = (x: number, y: number, len: number, k: string) => (
        <G key={k} transform={`translate(${x} ${y})`}>
          {[0, 60, 120].map((a) => (
            <Path key={`f${a}`} d={`M${-len} 0 H${len}`} stroke={p.accentHi} strokeWidth={1.3} opacity={0.85} transform={`rotate(${a})`} />
          ))}
          <Circle r={1.6} fill={p.accentHi} opacity={0.9} />
        </G>
      );
      return (
        <G>
          {dots.map(([x, y, r], i) => (
            <Circle key={`s${i}`} cx={x} cy={y} r={r} fill="#ffffff" opacity={0.6} />
          ))}
          {flake(126, 18, 9, 'fl1')}
          {flake(32, 24, 5.5, 'fl2')}
        </G>
      );
    }
    case 'embers': {
      const embers: [number, number, number][] = [
        [14, 84, 2], [40, 78, 1.4], [74, 88, 2.4], [108, 82, 1.6], [136, 86, 2.2],
        [150, 56, 1.4], [22, 26, 1.5], [62, 13, 1.2], [116, 19, 1.8], [146, 11, 1.3],
      ];
      return (
        <G>
          <Rect x={0} y={89} width={VW} height={7} fill={p.accent} opacity={0.3} />
          <Rect x={0} y={93} width={VW} height={3} fill={p.accentHi} opacity={0.32} />
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
          {star4('st1', 134, 15, 7, p.accentHi, 0.95)}
          {star4('st2', 24, 19, 4.5, p.accentHi, 0.8)}
          {star4('st3', 66, 9, 3.5, p.accent, 0.65)}
          {star4('st4', 150, 44, 3, p.accentHi, 0.6)}
          {star4('st5', 44, 85, 3.4, p.accentHi, 0.7)}
          {star4('st6', 116, 88, 2.6, p.accent, 0.55)}
          <Circle cx={10} cy={52} r={1.1} fill="#ffffff" opacity={0.65} />
          <Circle cx={92} cy={18} r={0.9} fill="#ffffff" opacity={0.55} />
          <Circle cx={148} cy={72} r={1} fill="#ffffff" opacity={0.6} />
          <Circle cx={76} cy={90} r={0.8} fill={p.accentHi} opacity={0.6} />
        </G>
      );
    case 'rays':
      return (
        <G>
          <Path d="M150 6 L58 26 L72 38 Z" fill={p.accent} opacity={0.15} />
          <Path d="M150 6 L94 56 L108 62 Z" fill={p.accent} opacity={0.12} />
          <Path d="M150 6 L132 80 L144 82 Z" fill={p.accent} opacity={0.09} />
          <Circle cx={148} cy={10} r={13} fill={p.accent} opacity={0.3} />
          <Circle cx={148} cy={10} r={6} fill={p.accentHi} opacity={0.95} />
          <Circle cx={22} cy={18} r={1.4} fill={p.accentHi} opacity={0.75} />
          <Circle cx={44} cy={84} r={1.2} fill={p.accentHi} opacity={0.6} />
          <Circle cx={12} cy={68} r={1} fill={p.accent} opacity={0.55} />
        </G>
      );
    case 'ribbon':
      return (
        <G>
          <Path
            d="M0 30 C 36 4, 92 40, 160 10"
            stroke={`url(#${ids.ribbon})`}
            strokeWidth={10}
            strokeLinecap="round"
            fill="none"
            opacity={0.5}
          />
          <Path
            d="M0 42 C 44 16, 96 46, 160 22"
            stroke={p.accentHi}
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
            opacity={0.3}
          />
          {star4('rb1', 22, 84, 3, p.accentHi, 0.7)}
          {star4('rb2', 138, 82, 2.4, p.accentHi, 0.55)}
          <Circle cx={80} cy={88} r={1} fill="#ffffff" opacity={0.5} />
        </G>
      );
    case 'leaves': {
      const leaf = (x: number, y: number, r: number, s: number, fill: string, o: number, k: string) => (
        <G key={k} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
          <Path d={LEAF} fill={fill} opacity={o} />
          <Path d="M-0.85 0 H0.85" stroke={p.accentLo} strokeWidth={0.12} opacity={0.8} />
        </G>
      );
      return (
        <G>
          {leaf(24, 16, -25, 9, shade(p.accent, 20), 0.85, 'l1')}
          {leaf(138, 20, 30, 7.5, p.accent, 0.7, 'l2')}
          {leaf(18, 82, 205, 7, p.accent, 0.65, 'l3')}
          {leaf(142, 84, 155, 8.5, shade(p.accent, 20), 0.7, 'l4')}
          <Circle cx={80} cy={12} r={1.3} fill={p.accentHi} opacity={0.6} />
          <Circle cx={104} cy={86} r={1.1} fill={p.accentHi} opacity={0.5} />
        </G>
      );
    }
    case 'sun':
      return (
        <G>
          <Circle cx={116} cy={24} r={20} fill={`url(#${ids.sun})`} opacity={0.7} />
          <G clipPath={`url(#${ids.sunClip})`}>
            <Rect x={94} y={26} width={44} height={1.8} fill={p.bg} opacity={0.9} />
            <Rect x={94} y={32} width={44} height={2.4} fill={p.bg} opacity={0.9} />
            <Rect x={94} y={38.5} width={44} height={3} fill={p.bg} opacity={0.9} />
          </G>
          <Rect x={98} y={HY + 4} width={36} height={2} fill={p.accentHi} opacity={0.22} />
          <Rect x={102} y={HY + 10} width={28} height={1.6} fill={p.accentHi} opacity={0.14} />
          <Rect x={106} y={HY + 16} width={20} height={1.3} fill={p.accentHi} opacity={0.09} />
          <Circle cx={22} cy={20} r={1.3} fill={p.accentHi} opacity={0.65} />
        </G>
      );
    case 'sparkle':
    default:
      return (
        <G>
          {star4('sp1', 134, 16, 6.5, p.accentHi, 0.9)}
          {star4('sp2', 26, 22, 4.2, p.accentHi, 0.7)}
          {star4('sp3', 70, 10, 3, p.accent, 0.6)}
          {star4('sp4', 22, 84, 3.4, p.accentHi, 0.65)}
          {star4('sp5', 128, 86, 2.8, p.accent, 0.55)}
          <Circle cx={152} cy={44} r={1.1} fill="#ffffff" opacity={0.6} />
          <Circle cx={96} cy={88} r={0.9} fill="#ffffff" opacity={0.5} />
          <Circle cx={10} cy={50} r={1} fill={p.accentHi} opacity={0.6} />
        </G>
      );
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export interface ThemePreviewProps {
  /** Full CosmeticTheme, or any object carrying its id + colors. */
  theme: Pick<CosmeticTheme, 'id' | 'colors'>;
  /** Rendered width in px; height keeps the 160:96 vignette aspect. */
  width: number;
  /** Dim the whole vignette (locked / unowned cards). */
  muted?: boolean;
  /** Panel corner radius in viewbox units (default 12; 0 = square full-bleed). */
  cornerRadius?: number;
}

export default function ThemePreview({ theme, width, muted, cornerRadius = 12 }: ThemePreviewProps) {
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

  const h = hashId(theme.id);
  const family = familyFor(theme.id);
  const palette: Palette = {
    bg,
    surface,
    accent,
    accentHi: shade(accent, 60),
    accentLo: shade(accent, -60),
  };
  // The theme's OWN world: sky → glowing horizon → ground, all pushed toward
  // the accent so each theme's hue dominates its card.
  const skyColor = mix(shade(bg, 12), accent, 0.16);
  const horizonColor = mix(shade(surface, 22), accent, 0.36);
  const groundColor = mix(shade(bg, -4), accent, 0.1);
  const tileRim = shade(cellDefault, -64);
  const foundRim = shade(cellSelected, -90);
  const foundInk = shade(cellSelected, -122);
  const panelEdge = mix(shade(surface, 46), accent, 0.2);

  // ── Word row: family-keyed letters, hash-keyed arrangement ────────────────
  const word = FAMILY_WORDS[family];
  const n = word.length;
  const gap = 3;
  const tile = Math.min(24, (VW - 24 - gap * (n - 1)) / n);
  const x0 = (VW - (n * tile + (n - 1) * gap)) / 2;
  const arrangement = h % 3; // 0 cascade · 1 arch · 2 scatter
  const foundIdx = (h >> 3) % n;

  let foundCX = VW / 2;
  let foundCY = ROW_CY;
  const tiles: React.ReactNode[] = [];
  word.split('').forEach((letter, i) => {
    let dy = 0;
    let rot = 0;
    if (arrangement === 0) {
      dy = (i - (n - 1) / 2) * 4.2;
      rot = -5;
    } else if (arrangement === 1) {
      dy = 4 - Math.sin((i / (n - 1)) * Math.PI) * 8;
      rot = (i - (n - 1) / 2) * 2.4;
    } else {
      const hi = h >> (i * 3);
      dy = (hi % 9) - 4;
      rot = ((hi >> 2) % 9) - 4;
    }
    const x = x0 + i * (tile + gap);
    const y = ROW_CY - tile / 2 + dy;
    const cx = x + tile / 2;
    const cy = y + tile / 2;
    const isFound = i === foundIdx;
    if (isFound) {
      foundCX = cx;
      foundCY = cy;
    }
    tiles.push(
      <G
        key={`t${i}`}
        transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${isFound ? 1.16 : 1}) translate(${-cx} ${-cy})`}
      >
        <Rect x={x} y={y + 1.6} width={tile} height={tile} rx={5.5} fill="#000000" opacity={0.32} />
        <Rect
          x={x}
          y={y}
          width={tile}
          height={tile}
          rx={5.5}
          fill={`url(#${isFound ? ids.found : ids.tile})`}
          stroke={isFound ? foundRim : tileRim}
          strokeWidth={isFound ? 1 : 0.8}
        />
        <Rect x={x + 1.8} y={y + 1.5} width={tile - 3.6} height={tile * 0.4} rx={3.6} fill="#ffffff" opacity={isFound ? 0.28 : 0.13} />
        <SvgText
          x={cx}
          y={cy + tile * 0.21}
          fontSize={tile * 0.56}
          fontFamily={FONTS.display}
          fontWeight="700"
          fill={isFound ? foundInk : '#ffffff'}
          opacity={isFound ? 1 : 0.92}
          textAnchor="middle"
        >
          {letter}
        </SvgText>
      </G>,
    );
  });

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VW} ${VH}`}>
      <Defs>
        <LinearGradient id={ids.panel} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={skyColor} />
          <Stop offset="0.6" stopColor={horizonColor} />
          <Stop offset="1" stopColor={groundColor} />
        </LinearGradient>
        <RadialGradient id={ids.amb} cx="0.5" cy="0.6" r="0.75">
          <Stop offset="0" stopColor={accent} stopOpacity={0.3} />
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
          <Stop offset="0" stopColor={accent} stopOpacity={0.55} />
          <Stop offset="0.6" stopColor={accent} stopOpacity={0.2} />
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
          <Rect x={0.5} y={0.5} width={VW - 1} height={VH - 1} rx={cornerRadius} />
        </ClipPath>
        <ClipPath id={ids.sunClip}>
          <Circle cx={116} cy={24} r={20} />
        </ClipPath>
      </Defs>
      <G opacity={muted ? 0.55 : 1}>
        {/* Full-bleed theme world */}
        <Rect x={0.5} y={0.5} width={VW - 1} height={VH - 1} rx={cornerRadius} fill={`url(#${ids.panel})`} stroke={panelEdge} strokeWidth={1} />
        <G clipPath={`url(#${ids.clip})`}>
          <Rect x={0.5} y={0.5} width={VW - 1} height={VH - 1} fill={`url(#${ids.amb})`} />
          <Path d={`M0 ${HY} H${VW}`} stroke={palette.accentHi} strokeWidth={1} opacity={0.4} />
          <Path d="M14 2.2 H146" stroke="#ffffff" strokeWidth={1} strokeLinecap="round" opacity={0.1} />
          {renderGarnish(family, palette, ids)}
          {/* Word row with the found tile glowing inline */}
          <Circle cx={foundCX} cy={foundCY} r={tile * 1.1} fill={`url(#${ids.glow})`} />
          {tiles}
          {star4('fspark', foundCX + tile * 0.66, foundCY - tile * 0.66, 2.8, '#ffffff', 0.9)}
        </G>
      </G>
    </Svg>
  );
}
