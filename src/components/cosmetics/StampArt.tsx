/**
 * StampArt — illustrated collectible postage stamp for the Seasonal Stamps
 * album.
 *
 * Blind-panel fix #2 ("mostly-empty pastel field around a tiny flat icon
 * with an illegible baked caption; nine stamps read as one washed-out
 * card"). What changed:
 *
 *  - The artwork now fills ~66% of the stamp face (was ~46%), so the stamp
 *    reads as a PICTURE inside a paper border rather than a logo on a card.
 *  - The micro name caption baked into the frame is GONE — the album card
 *    below already prints the name at a legible size. Its band is now what a
 *    real stamp puts there: an engraved denomination over a thin foil rule.
 *  - Every stamp derives a FULL-STRENGTH color wash for its picture panel
 *    from its own motif family (sun/heat → amber, wave → teal, palm → green,
 *    frost → ice, blossom → pink …), so a sheet of nine shows nine colors.
 *    The perforated paper border stays neutral parchment so the wash reads
 *    as the printed area, not as a tinted card.
 *  - The foil sheen is per-stamp, not per-template (`stampSheen`): angle,
 *    band width, centre offset and opacity all derive from the sheet index,
 *    and ~1 stamp in 3 prints MATTE with no streak at all — the panel's
 *    "identical diagonal gloss streak in the same position" complaint.
 *  - Rarity tiers dress the frame: `rare` adds a foil-gradient inner frame
 *    plus corner rosettes, `epic` adds a serrated gold outer edge and two
 *    sparkles. `stampRarity(index, total)` derives the tier by sheet
 *    position (every 5th rare, the album's last epic).
 *
 * Unearned stamps keep the identical die-cut silhouette but ghost out —
 * gray paper, dashed panel, '?' watermark — so an album page reads as a
 * sheet awaiting stamps rather than a grid of missing images.
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
import type { GameIconName } from '../icons/GameIcon';
import { stampIconName } from '../icons/iconsStamps';
import { sheenVector, stampSheen, stampSheenIndex } from './stampSheen';

/** Neutral parchment papers — variety lives in the panel wash, not here. */
export const STAMP_PAPERS = ['#f3ece0', '#efe8dc', '#f2ebe2', '#ece6da'];

const GHOST_PAPER = '#646b7e';
const INK = '#3d3428';
const POSTMARK_INK = '#20263c';
const GOLD = '#f0c33c';

// ── Picture panel (viewBox units) ───────────────────────────────────────────
const PANEL = { x: 8.5, y: 8.5, w: 83, h: 85 };
const PANEL_CY = PANEL.y + PANEL.h / 2; // 51
/** Motif share of the stamp face — the panel's whole reason to exist. */
const MOTIF_SCALE = 0.66;

export type StampRarity = 'common' | 'rare' | 'epic';

/**
 * Sheet position → rarity tier. Every fifth stamp is rare and the album's
 * last stamp is its epic capstone, so a page has rhythm instead of nine
 * identical frames.
 */
export function stampRarity(index: number, total: number): StampRarity {
  if (total > 0 && index === total - 1) return 'epic';
  return (index + 1) % 5 === 0 ? 'rare' : 'common';
}

// ── Per-motif color families ────────────────────────────────────────────────
const FAMILIES: Array<[string, GameIconName[]]> = [
  // warm amber — sun, heat, fire, gold
  ['#f2a12c', [
    'stampSun', 'stampHeatwave', 'stampSunrise', 'stampSunflower', 'stampBee',
    'stampLemonade', 'stampCorn', 'stampCandle', 'stampAmber', 'stampHarvestMoon',
    'stampStarTrail', 'stampCrown', 'stampTrophy', 'stampFireworks', 'stampFireflyJar',
  ]],
  // ember orange — autumn, canvas, embers
  ['#e0702a', [
    'stampCampfire', 'stampAutumnLeaf', 'stampPumpkin', 'stampCocoa', 'stampKite',
    'stampUmbrella', 'stampParasol', 'stampSled', 'stampBeachBall',
  ]],
  // ocean teal — water in motion
  ['#1f9fc4', [
    'stampWave', 'stampWaterfall', 'stampSailboat', 'stampSurfboard', 'stampDewdrop',
    'stampSongbird', 'stampFrozenLake',
  ]],
  // foliage green
  ['#3fa25a', [
    'stampSeedling', 'stampFern', 'stampPalm', 'stampEvergreen', 'stampHolly',
    'stampAurora',
  ]],
  // ice blue — frost and vapor
  ['#6fbfe8', [
    'stampSnowflake', 'stampIceCrystal', 'stampSnowman', 'stampMist', 'stampRainCloud',
  ]],
  // blossom pink
  ['#e87fb0', ['stampBlossom', 'stampFlowerCrown', 'stampIceCream', 'stampCoral']],
  // dusk violet
  ['#8b74e8', ['stampButterfly', 'stampCrescentMoon']],
  // warm sand / bark
  ['#cfa15c', ['stampSandcastle', 'stampPaw', 'stampAcorn', 'stampOwl']],
  // crimson
  ['#d8483f', ['stampApple', 'stampMushroom', 'stampGift', 'stampMitten']],
];

const WASH_BY_MOTIF: Partial<Record<GameIconName, string>> = (() => {
  const out: Partial<Record<GameIconName, string>> = {};
  for (const [hue, motifs] of FAMILIES) for (const m of motifs) out[m] = hue;
  return out;
})();

/** Full-strength wash hue for a motif, falling back to the caller's accent. */
export function stampWashColor(motif: GameIconName | null, fallback: string): string {
  return (motif && WASH_BY_MOTIF[motif]) || fallback;
}

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

/** Tiny 5-point star (rare-tier corner rosette). */
function star(cx: number, cy: number, r: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    d += `${i === 0 ? 'M' : 'L'}${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }
  return d + 'Z';
}

/** Four-point sparkle (epic-tier glint). */
function sparkle(cx: number, cy: number, r: number): string {
  const w = r * 0.28;
  return (
    `M${cx},${cy - r} Q${cx + w},${cy - w} ${cx + r},${cy} ` +
    `Q${cx + w},${cy + w} ${cx},${cy + r} ` +
    `Q${cx - w},${cy + w} ${cx - r},${cy} ` +
    `Q${cx - w},${cy - w} ${cx},${cy - r} Z`
  );
}

export interface StampArtProps {
  /**
   * Catalog stamp id (e.g. 'su26_4'). Preferred: resolves bespoke art that
   * matches the stamp's NAME via STAMP_ICON_BY_ID, and drives the panel's
   * color wash. The stored `icon` emoji is only a fallback.
   */
  stampId?: string;
  /** Stored emoji glyph from the album catalog (resolved via GameIcon). */
  icon: string;
  /**
   * Stamp display name. No longer engraved into the frame (the album card
   * prints it at a legible size) — kept so callers need no change and so
   * the name is available for future engraving/tooltips.
   */
  name?: string;
  earned: boolean;
  accent?: string;
  /** Rendered width; height is width × 1.2 (portrait stamp). */
  size?: number;
  /** Parchment hue — rotate STAMP_PAPERS by index for an album-page feel. */
  paperTint?: string;
  /** Engraved denomination printed under the picture panel. */
  value?: string;
  /** Frame dressing tier — see `stampRarity(index, total)`. */
  rarity?: StampRarity;
  /**
   * Sheet position. Drives the foil sheen (angle / width / offset / opacity,
   * or matte paper on ~1 in 3) so no two neighbouring stamps carry the same
   * gloss streak. Falls back to a hash of `stampId` when omitted.
   */
  index?: number;
  style?: StyleProp<ViewStyle>;
}

export default function StampArt({
  stampId,
  icon,
  earned,
  accent = COLORS.purple,
  size = 86,
  paperTint = STAMP_PAPERS[0],
  value = '1',
  rarity = 'common',
  index,
  style,
}: StampArtProps) {
  const ids = useMemo(
    () => ({
      paper: gradId('stampPaper'),
      wash: gradId('stampWash'),
      lit: gradId('stampLit'),
      foil: gradId('stampFoil'),
      gold: gradId('stampGold'),
      sheen: gradId('stampSheen'),
    }),
    [],
  );
  const motif = stampIconName(stampId);
  const wash = stampWashColor(motif, accent);
  const paper = earned ? paperTint : GHOST_PAPER;
  const h = size * 1.2;
  const iconSize = size * MOTIF_SCALE;
  const iconTop = h * (PANEL_CY / 120) - iconSize / 2;
  const rare = rarity === 'rare' || rarity === 'epic';
  const epic = rarity === 'epic';
  // Per-position foil streak — null on the matte stamps.
  const sheen = useMemo(() => stampSheen(stampSheenIndex(index, stampId)), [index, stampId]);
  const sheenDir = sheen ? sheenVector(sheen.angle) : null;

  return (
    <View style={[{ width: size, height: h }, style]} pointerEvents="none">
      <Svg width={size} height={h} viewBox="0 0 100 120">
        <Defs>
          <LinearGradient id={ids.paper} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={shade(paper, 14)} />
            <Stop offset="0.55" stopColor={paper} />
            <Stop offset="1" stopColor={shade(paper, -18)} />
          </LinearGradient>
          {/* Full-strength printed-panel wash in the motif's own family. */}
          <LinearGradient id={ids.wash} x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor={shade(wash, 58)} />
            <Stop offset="0.48" stopColor={shade(wash, 4)} />
            <Stop offset="1" stopColor={shade(wash, -60)} />
          </LinearGradient>
          <RadialGradient id={ids.lit} cx="0.5" cy="0.44" r="0.62">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.42" />
            <Stop offset="0.55" stopColor="#ffffff" stopOpacity="0.12" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.16" />
          </RadialGradient>
          <LinearGradient id={ids.foil} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={shade(wash, 96)} />
            <Stop offset="0.5" stopColor={wash} />
            <Stop offset="1" stopColor={shade(wash, -40)} />
          </LinearGradient>
          <LinearGradient id={ids.gold} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#fff0b0" />
            <Stop offset="0.42" stopColor={GOLD} />
            <Stop offset="0.7" stopColor="#fff3c0" />
            <Stop offset="1" stopColor="#a97a12" />
          </LinearGradient>
          {sheen && sheenDir && (
            <LinearGradient
              id={ids.sheen}
              x1={String(sheenDir.x1)}
              y1={String(sheenDir.y1)}
              x2={String(sheenDir.x2)}
              y2={String(sheenDir.y2)}
            >
              <Stop
                offset={String(Math.max(0, sheen.center - sheen.width))}
                stopColor="#ffffff"
                stopOpacity="0"
              />
              <Stop
                offset={String(sheen.center)}
                stopColor="#ffffff"
                stopOpacity={String(sheen.opacity)}
              />
              <Stop
                offset={String(Math.min(1, sheen.center + sheen.width))}
                stopColor="#ffffff"
                stopOpacity="0"
              />
            </LinearGradient>
          )}
        </Defs>

        {/* Drop shadow so the die-cut paper lifts off the card. */}
        <Path d={STAMP_OUTLINE} fill="rgba(0,0,0,0.4)" translateY={2} />
        {/* Perforated paper body — neutral parchment at every rarity. */}
        <Path
          d={STAMP_OUTLINE}
          fill={`url(#${ids.paper})`}
          stroke={shade(paper, -48)}
          strokeWidth={0.8}
          strokeOpacity={0.45}
        />
        {/* Epic: serrated gold edge traced onto the die-cut itself. */}
        {earned && epic && (
          <>
            <Path
              d={STAMP_OUTLINE}
              fill="none"
              stroke={`url(#${ids.gold})`}
              strokeWidth={2.6}
              strokeLinejoin="round"
            />
            <Path
              d={STAMP_OUTLINE}
              fill="none"
              stroke="#7d5a0c"
              strokeWidth={0.5}
              strokeOpacity={0.55}
            />
          </>
        )}

        {earned ? (
          <>
            {/* ── Picture panel: the stamp's printed area ── */}
            <Rect
              x={PANEL.x}
              y={PANEL.y}
              width={PANEL.w}
              height={PANEL.h}
              fill={`url(#${ids.wash})`}
            />
            <Rect
              x={PANEL.x}
              y={PANEL.y}
              width={PANEL.w}
              height={PANEL.h}
              fill={`url(#${ids.lit})`}
            />
            {/* Engraved hairline inside the panel. */}
            <Rect
              x={PANEL.x + 2.6}
              y={PANEL.y + 2.6}
              width={PANEL.w - 5.2}
              height={PANEL.h - 5.2}
              fill="none"
              stroke="#ffffff"
              strokeOpacity={0.3}
              strokeWidth={0.6}
            />
            {/* Panel edge — foil for rare/epic, plain ink otherwise. */}
            <Rect
              x={PANEL.x}
              y={PANEL.y}
              width={PANEL.w}
              height={PANEL.h}
              fill="none"
              stroke={rare ? `url(#${ids.foil})` : shade(wash, -78)}
              strokeWidth={rare ? 2 : 1.1}
            />
            {rare && (
              <G fill={`url(#${epic ? ids.gold : ids.foil})`}>
                <Path d={star(PANEL.x + 4.4, PANEL.y + 4.4, 3.1)} />
                <Path d={star(PANEL.x + PANEL.w - 4.4, PANEL.y + 4.4, 3.1)} />
                <Path d={star(PANEL.x + 4.4, PANEL.y + PANEL.h - 4.4, 3.1)} />
                <Path d={star(PANEL.x + PANEL.w - 4.4, PANEL.y + PANEL.h - 4.4, 3.1)} />
              </G>
            )}

            {/* ── Denomination band: thin foil rule + engraved value ── */}
            <G stroke={`url(#${ids.foil})`} strokeWidth={1} strokeLinecap="round">
              <Path d="M17,99 H43 M57,99 H83" />
            </G>
            <Path
              d="M50,96.2 L53,99 L50,101.8 L47,99 Z"
              fill={`url(#${epic ? ids.gold : ids.foil})`}
            />
            <SvgText
              x={50}
              y={112}
              fontSize={10.5}
              fontWeight="bold"
              letterSpacing={1.2}
              textAnchor="middle"
              fill={INK}
              opacity={0.82}
            >
              {`${value}¢`}
            </SvgText>

            {/* Foil sheen, angled + placed by sheet position; matte stamps
                (~1 in 3) skip it entirely so the sheet has paper variety. */}
            {sheen && <Path d={STAMP_OUTLINE} fill={`url(#${ids.sheen})`} />}

            {/* Rotated ink postmark overlapping the top-right corner. */}
            <G rotation={-16} origin="82, 19">
              <Circle
                cx={82}
                cy={19}
                r={14}
                fill="none"
                stroke={POSTMARK_INK}
                strokeWidth={1.6}
                strokeOpacity={0.42}
                strokeDasharray="11,5,17,7"
              />
              <Circle
                cx={82}
                cy={19}
                r={10.5}
                fill="none"
                stroke={POSTMARK_INK}
                strokeWidth={1.1}
                strokeOpacity={0.38}
                strokeDasharray="8,6,13,8"
              />
              <Path
                d="M46,13.5 H66 M43,19 H64 M46,24.5 H66"
                stroke={POSTMARK_INK}
                strokeWidth={1.5}
                strokeOpacity={0.34}
                strokeDasharray="5,3"
              />
            </G>

            {/* Epic sparkles, on the paper margin so they never fight the art. */}
            {epic && (
              <G fill="#fff6cc">
                <Path d={sparkle(13.5, 100.5, 4.2)} opacity={0.95} />
                <Path d={sparkle(86.5, 103, 3.1)} opacity={0.8} />
              </G>
            )}
          </>
        ) : (
          <>
            {/* Ghost stamp: same die-cut, dashed panel + '?' watermark. */}
            <Rect
              x={PANEL.x}
              y={PANEL.y}
              width={PANEL.w}
              height={PANEL.h}
              fill="rgba(16,20,34,0.22)"
            />
            <Rect
              x={PANEL.x}
              y={PANEL.y}
              width={PANEL.w}
              height={PANEL.h}
              fill="none"
              stroke="rgba(24,29,48,0.55)"
              strokeWidth={1.2}
              strokeDasharray="4,3.5"
            />
            <SvgText
              x={50}
              y={PANEL_CY + 17}
              fontSize={46}
              fontWeight="bold"
              textAnchor="middle"
              fill="rgba(20,24,40,0.32)"
            >
              ?
            </SvgText>
            <Path
              d="M17,99 H83"
              stroke="rgba(24,29,48,0.4)"
              strokeWidth={0.9}
              strokeLinecap="round"
            />
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
          {motif ? (
            <GameIcon name={motif} size={iconSize} />
          ) : (
            <GameIcon glyph={icon} size={iconSize} />
          )}
        </View>
      )}
    </View>
  );
}
