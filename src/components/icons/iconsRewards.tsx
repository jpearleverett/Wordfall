/**
 * Reward renders — illustration-grade currency + loot art for reward
 * ladders (Season Pass tiers, ceremonies, offers). Same recipe as
 * iconsDecor: 24-viewBox, gradient bodies, facet/specular highlights, and
 * a soft grounded shadow so each render sits on its card like a small
 * trophy instead of a flat glyph. Each currency has an escalation trio
 * (single → stack → pile, single → cluster → hoard) so bigger amounts
 * visibly read as bigger treasure up the ladder.
 */
import React, { useMemo } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import {
  IconProps, VB, DuoGrad, gradId, rim, shade, HILITE, HILITE_SOFT,
} from './IconBase';
import { Ground, GlowGrad, BRASS, WOOD } from './iconsDecor';

const GOLD = '#ffb800';
const GEM_PINK = '#e84fd0';
const GEM_CYAN = '#31c8e8';
const GEM_PURPLE = '#a86ae8';
const GEM_TEAL = '#3fe8a0';
const GEM_ICE = '#8fe6ff';
const GEM_TOPAZ = '#ffc24d';
const GEM_VIOLET = '#8b3fe0';
const LEATHER = '#8a5636';

/** Tiny 4-point sparkle centered on (x, y). */
function Spark({ x, y, s = 1, o = 0.9 }: { x: number; y: number; s?: number; o?: number }) {
  const a = 0.35 * s;
  const b = 0.85 * s;
  return (
    <Path
      d={`M${x} ${y - a - b}l${a} ${b} ${b} ${a} -${b} ${a} -${a} ${b} -${a} -${b} -${b} -${a} ${b} -${a}Z`}
      fill="#ffffff"
      opacity={o}
    />
  );
}

/** One side-view coin (squat cylinder) for stacks and piles. */
function CoinCyl({
  cx, y, rx, h, top, side, edge, ring,
}: {
  cx: number; y: number; rx: number; h: number;
  top: string; side: string; edge: string; ring: string;
}) {
  const ry = rx * 0.34;
  return (
    <G>
      <Path
        d={`M${cx - rx} ${y}v${h}a${rx} ${ry} 0 0 0 ${rx * 2} 0v-${h}`}
        fill={side}
        stroke={edge}
        strokeWidth="0.75"
      />
      <Ellipse cx={cx} cy={y} rx={rx} ry={ry} fill={top} stroke={edge} strokeWidth="0.75" />
      <Ellipse cx={cx} cy={y} rx={rx * 0.62} ry={ry * 0.62} fill="none" stroke={ring} strokeWidth="0.5" />
    </G>
  );
}

/** Small brilliant-cut gem: table → girdle → culet with facet strokes. */
function MiniGem({
  cx, y, w, h, fill, edge, dark, lite,
}: {
  cx: number; y: number; w: number; h: number;
  fill: string; edge: string; dark: string; lite: string;
}) {
  const tw = w * 0.54;
  const gy = y + h * 0.36;
  return (
    <G>
      <Path
        d={`M${cx - tw / 2} ${y}h${tw}L${cx + w / 2} ${gy}L${cx} ${y + h}L${cx - w / 2} ${gy}Z`}
        fill={fill}
        stroke={edge}
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
      <Path
        d={`M${cx - tw / 2} ${y}h${tw}L${cx + tw * 0.3} ${gy}L${cx - tw * 0.3} ${gy}Z`}
        fill={lite}
        opacity="0.5"
      />
      <Path
        d={`M${cx - w / 2} ${gy}h${w}M${cx - tw / 2} ${y}L${cx - tw * 0.3} ${gy}L${cx} ${y + h}M${cx + tw / 2} ${y}L${cx + tw * 0.3} ${gy}L${cx} ${y + h}`}
        fill="none"
        stroke={dark}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <Path
        d={`M${cx - tw * 0.32} ${y + h * 0.1}l${tw * 0.36} -${h * 0.04}`}
        stroke="#ffffff"
        strokeWidth="0.7"
        strokeLinecap="round"
        opacity="0.9"
      />
    </G>
  );
}

/** Single lit coin, face-on: milled edge, embossed star, specular sweep. */
export function CoinSmallIcon({ size = 24, accent = GOLD }: IconProps) {
  const body = useMemo(() => gradId('cnsB'), []);
  const glow = useMemo(() => gradId('cnsG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from={shade(accent, 58)} to={shade(accent, -46)} />
      <GlowGrad id={glow} color="#ffd24d" />
      <Ground rx={6.4} cy={21.4} />
      <Circle cx="12" cy="11.4" r="9.4" fill={`url(#${glow})`} opacity="0.55" />
      <Circle cx="12" cy="11.4" r="7.6" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1.1" />
      {/* milled edge ticks */}
      <G stroke={shade(accent, -30)} strokeWidth="0.55" strokeLinecap="round" opacity="0.8">
        <Path d="M12 4.5v1.1M12 17.6v1.1M5.5 11.4h1.1M17.4 11.4h1.1M7.4 6.8l.8.8M15.8 15.2l.8.8M16.6 6.8l-.8.8M8.2 15.2l-.8.8" />
      </G>
      {/* inner face ring */}
      <Circle cx="12" cy="11.4" r="5.5" fill={shade(accent, 8)} opacity="0.35" />
      <Circle cx="12" cy="11.4" r="5.5" fill="none" stroke={shade(accent, -34)} strokeWidth="0.7" />
      {/* embossed star */}
      <Path
        d="M12 8.1l1.05 2.1 2.35.35-1.7 1.65.4 2.35L12 13.45l-2.1 1.1.4-2.35-1.7-1.65 2.35-.35Z"
        fill={shade(accent, 34)}
        stroke={shade(accent, -38)}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      {/* specular sweep */}
      <Path d="M6.7 8.4c1-2.1 2.6-3.3 4.8-3.7" fill="none" stroke={HILITE} strokeWidth="1" strokeLinecap="round" />
      <Spark x={17.6} y={5.2} s={1} />
      <Spark x={5.4} y={16.6} s={0.7} o={0.7} />
    </Svg>
  );
}

/** Three stacked gold coins with one face-on coin leaning against them. */
export function CoinStackIcon({ size = 24, accent = GOLD }: IconProps) {
  const top = useMemo(() => gradId('cstT'), []);
  const side = useMemo(() => gradId('cstS'), []);
  const face = useMemo(() => gradId('cstF'), []);
  const glow = useMemo(() => gradId('cstG'), []);
  const edge = rim(accent);
  const ring = shade(accent, -26);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={top} from={shade(accent, 62)} to={shade(accent, 4)} />
      <DuoGrad id={side} from={shade(accent, -8)} to={shade(accent, -52)} />
      <DuoGrad id={face} from={shade(accent, 56)} to={shade(accent, -44)} />
      <GlowGrad id={glow} color="#ffd24d" />
      <Ground rx={7.8} cy={21.5} />
      <Ellipse cx="12" cy="14" rx="9.4" ry="7.4" fill={`url(#${glow})`} opacity="0.5" />
      <CoinCyl cx={8.9} y={17.2} rx={4.7} h={2.3} top={`url(#${top})`} side={`url(#${side})`} edge={edge} ring={ring} />
      <CoinCyl cx={8.6} y={14.6} rx={4.7} h={2.3} top={`url(#${top})`} side={`url(#${side})`} edge={edge} ring={ring} />
      <CoinCyl cx={8.9} y={12} rx={4.7} h={2.3} top={`url(#${top})`} side={`url(#${side})`} edge={edge} ring={ring} />
      {/* leaning face coin */}
      <G transform="rotate(14 17 15.2)">
        <Ellipse cx="17" cy="15.2" rx="3.7" ry="4.5" fill={`url(#${face})`} stroke={edge} strokeWidth="0.85" />
        <Ellipse cx="17" cy="15.2" rx="2.5" ry="3.2" fill="none" stroke={ring} strokeWidth="0.5" />
        <Path
          d="M17 12.9l.75 1.5 1.65.25-1.2 1.15.3 1.65-1.5-.8-1.5.8.3-1.65-1.2-1.15 1.65-.25Z"
          fill={shade(accent, 30)}
          stroke={shade(accent, -36)}
          strokeWidth="0.45"
          strokeLinejoin="round"
        />
      </G>
      {/* top-coin specular */}
      <Path d="M5.4 11.1c.9-.65 2-.98 3.3-1" fill="none" stroke={HILITE} strokeWidth="0.85" strokeLinecap="round" />
      <Spark x={5.2} y={7.9} s={0.8} o={0.75} />
      <Spark x={18.9} y={8.4} s={1.05} />
    </Svg>
  );
}

/** Pyramid pile of six gold coins with sparkles — the big coin payout. */
export function CoinPileIcon({ size = 24, accent = GOLD }: IconProps) {
  const top = useMemo(() => gradId('cplT'), []);
  const side = useMemo(() => gradId('cplS'), []);
  const glow = useMemo(() => gradId('cplG'), []);
  const edge = rim(accent);
  const ring = shade(accent, -26);
  const t = `url(#${top})`;
  const s = `url(#${side})`;
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={top} from={shade(accent, 62)} to={shade(accent, 4)} />
      <DuoGrad id={side} from={shade(accent, -8)} to={shade(accent, -52)} />
      <GlowGrad id={glow} color="#ffd24d" />
      <Ground rx={8.6} cy={21.6} ry={1.3} />
      <Ellipse cx="12" cy="15" rx="10" ry="6.8" fill={`url(#${glow})`} opacity="0.55" />
      {/* bottom row */}
      <CoinCyl cx={7.2} y={16.9} rx={3.9} h={1.9} top={t} side={s} edge={edge} ring={ring} />
      <CoinCyl cx={16.8} y={16.9} rx={3.9} h={1.9} top={t} side={s} edge={edge} ring={ring} />
      <CoinCyl cx={12} y={17.6} rx={4.1} h={2} top={t} side={s} edge={edge} ring={ring} />
      {/* second row */}
      <CoinCyl cx={9.4} y={14.3} rx={3.9} h={1.9} top={t} side={s} edge={edge} ring={ring} />
      <CoinCyl cx={14.7} y={14.5} rx={3.9} h={1.9} top={t} side={s} edge={edge} ring={ring} />
      {/* crown coin */}
      <CoinCyl cx={12} y={11.7} rx={4.1} h={2} top={t} side={s} edge={edge} ring={ring} />
      <Ellipse cx={12} cy={11.7} rx={2.5} ry={0.85} fill={shade(accent, 26)} opacity="0.8" />
      {/* speculars */}
      <Path d="M4.2 16.4c.7-.7 1.6-1.15 2.7-1.35" fill="none" stroke={HILITE_SOFT} strokeWidth="0.8" strokeLinecap="round" />
      <Path d="M8.5 10.9c1-.6 2.2-.9 3.5-.9" fill="none" stroke={HILITE} strokeWidth="0.85" strokeLinecap="round" />
      <Spark x={17.9} y={9.2} s={1.1} />
      <Spark x={5.6} y={8.6} s={0.75} o={0.75} />
      <Spark x={20.3} y={13.4} s={0.7} o={0.7} />
    </Svg>
  );
}

/**
 * Cinched leather pouch with coins brimming out of the neck — the
 * mid-ladder coin payout. Bag silhouette, not another coin stack, so a
 * mid-tier coin reward can never read as a resized early one.
 */
export function CoinPouchIcon({ size = 24, accent = GOLD }: IconProps) {
  const hide = useMemo(() => gradId('cpuB'), []);
  const top = useMemo(() => gradId('cpuT'), []);
  const side = useMemo(() => gradId('cpuS'), []);
  const glow = useMemo(() => gradId('cpuG'), []);
  const edge = rim(accent);
  const ring = shade(accent, -26);
  const CORD = '#e0b25a';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={hide} from={shade(LEATHER, 34)} to={shade(LEATHER, -44)} />
      <DuoGrad id={top} from={shade(accent, 62)} to={shade(accent, 4)} />
      <DuoGrad id={side} from={shade(accent, -8)} to={shade(accent, -52)} />
      <GlowGrad id={glow} color="#ffd24d" />
      <Ground rx={8.2} cy={21.6} ry={1.3} />
      <Ellipse cx="12" cy="9.4" rx="8.6" ry="6.4" fill={`url(#${glow})`} opacity="0.5" />
      {/* coins brimming out of the neck */}
      <CoinCyl cx={9.4} y={6.6} rx={3} h={1.4} top={`url(#${top})`} side={`url(#${side})`} edge={edge} ring={ring} />
      <CoinCyl cx={14.6} y={6.9} rx={3} h={1.4} top={`url(#${top})`} side={`url(#${side})`} edge={edge} ring={ring} />
      <CoinCyl cx={12} y={4.9} rx={3.2} h={1.5} top={`url(#${top})`} side={`url(#${side})`} edge={edge} ring={ring} />
      {/* pouch body */}
      <Path
        d="M8.5 10.6c-2 1.5-3.2 3.6-3.2 5.6 0 2.8 2.8 4.6 6.7 4.6s6.7-1.8 6.7-4.6c0-2-1.2-4.1-3.2-5.6Z"
        fill={`url(#${hide})`}
        stroke={rim(LEATHER)}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* neck + drawstring */}
      <Path d="M8.4 8.9h7.2l-.6 2.1H9Z" fill={shade(LEATHER, -14)} stroke={rim(LEATHER)} strokeWidth="0.85" strokeLinejoin="round" />
      <Path d="M7.9 9.8h8.2" stroke={CORD} strokeWidth="1.1" strokeLinecap="round" />
      <Path d="M7.9 9.8l-1.5 1.8M16.1 9.8l1.5 1.8" stroke={CORD} strokeWidth="0.8" strokeLinecap="round" />
      {/* stamped coin sigil on the hide */}
      <Circle cx="12" cy="15.9" r="2.9" fill="none" stroke={shade(accent, -10)} strokeWidth="0.75" opacity="0.85" />
      <Path
        d="M12 13.7l.72 1.45 1.6.24-1.16 1.13.27 1.6L12 17.36l-1.43.76.27-1.6-1.16-1.13 1.6-.24Z"
        fill={shade(accent, 20)}
        stroke={shade(accent, -40)}
        strokeWidth="0.45"
        strokeLinejoin="round"
      />
      <Path d="M7.4 13.4c.5-1.1 1.2-2 2.2-2.7" fill="none" stroke={HILITE_SOFT} strokeWidth="0.85" strokeLinecap="round" />
      <Spark x={18.8} y={5.4} s={1} />
      <Spark x={5.2} y={5} s={0.7} o={0.7} />
    </Svg>
  );
}

/**
 * Open treasure chest overflowing with coins down the front lip — the
 * top-band coin payout. Reads as a hoard you broke into, not a tidy stack.
 */
export function CoinChestSpillIcon({ size = 24, accent = GOLD }: IconProps) {
  const wood = useMemo(() => gradId('ccsW'), []);
  const met = useMemo(() => gradId('ccsM'), []);
  const top = useMemo(() => gradId('ccsT'), []);
  const side = useMemo(() => gradId('ccsS'), []);
  const glow = useMemo(() => gradId('ccsG'), []);
  const MAHOG = '#9a4630';
  const edge = rim(accent);
  const ring = shade(accent, -26);
  const t = `url(#${top})`;
  const s = `url(#${side})`;
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={wood} from={shade(MAHOG, 32)} to={shade(MAHOG, -40)} />
      <DuoGrad id={met} from="#ffe066" to={shade(accent, -34)} />
      <DuoGrad id={top} from={shade(accent, 62)} to={shade(accent, 4)} />
      <DuoGrad id={side} from={shade(accent, -8)} to={shade(accent, -52)} />
      <GlowGrad id={glow} color="#ffd24d" />
      <Ground rx={9} cy={21.7} ry={1.3} />
      <Ellipse cx="12" cy="11.4" rx="10.4" ry="8.4" fill={`url(#${glow})`} opacity="0.7" />
      {/* thrown-back lid */}
      <G transform="rotate(-13 12 8)">
        <Path
          d="M5.2 8.7V7.4c0-2.6 3-4.4 6.8-4.4s6.8 1.8 6.8 4.4v1.3Z"
          fill={`url(#${wood})`}
          stroke={rim(MAHOG)}
          strokeWidth="0.95"
          strokeLinejoin="round"
        />
        <Rect x="4.9" y="8.4" width="14.2" height="1.5" rx="0.5" fill={`url(#${met})`} stroke={rim(accent)} strokeWidth="0.7" />
        <Path d="M8.4 4.2c-1.3.8-2.1 1.9-2.3 3.2" fill="none" stroke={HILITE_SOFT} strokeWidth="0.75" strokeLinecap="round" />
      </G>
      {/* chest body + dark interior */}
      <Rect x="4.4" y="12.8" width="15.2" height="7.6" rx="1.2" fill={`url(#${wood})`} stroke={rim(MAHOG)} strokeWidth="1" />
      <Ellipse cx="12" cy="13" rx="7" ry="1.9" fill="#1c0a1f" opacity="0.85" />
      <Rect x="4" y="15.4" width="16" height="1.7" rx="0.55" fill={`url(#${met})`} stroke={rim(accent)} strokeWidth="0.7" />
      {/* coins heaped in the mouth */}
      <CoinCyl cx={8.3} y={12.1} rx={3.1} h={1.4} top={t} side={s} edge={edge} ring={ring} />
      <CoinCyl cx={15.7} y={12.2} rx={3.1} h={1.4} top={t} side={s} edge={edge} ring={ring} />
      <CoinCyl cx={12} y={10.7} rx={3.4} h={1.5} top={t} side={s} edge={edge} ring={ring} />
      {/* spill over the front lip */}
      <CoinCyl cx={5.4} y={18.5} rx={2.7} h={1.3} top={t} side={s} edge={edge} ring={ring} />
      <CoinCyl cx={18.7} y={18.8} rx={2.5} h={1.2} top={t} side={s} edge={edge} ring={ring} />
      <CoinCyl cx={8} y={19.6} rx={2.7} h={1.3} top={t} side={s} edge={edge} ring={ring} />
      <Spark x={18.6} y={4.6} s={1.15} />
      <Spark x={4.6} y={6.4} s={0.8} o={0.8} />
      <Spark x={20.8} y={12.2} s={0.7} o={0.7} />
    </Svg>
  );
}

/** Single faceted gem — brilliant cut with lit table and glints. */
export function GemSingleIcon({ size = 24, accent = GEM_PINK }: IconProps) {
  const body = useMemo(() => gradId('gsgB'), []);
  const glow = useMemo(() => gradId('gsgG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from={shade(accent, 62)} to={shade(accent, -48)} />
      <GlowGrad id={glow} color={shade(accent, 70)} />
      <Ground rx={6.2} cy={21.4} />
      <Circle cx="12" cy="11.6" r="9" fill={`url(#${glow})`} opacity="0.6" />
      {/* body */}
      <Path
        d="M8.3 5.4h7.4l3.9 4.6L12 20.2 4.4 10Z"
        fill={`url(#${body})`}
        stroke={rim(accent)}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* facet fills: lit table, lit left crown, shaded right crown */}
      <Path d="M8.3 5.4h7.4l-1 4.6H9.3Z" fill={shade(accent, 52)} opacity="0.55" />
      <Path d="M8.3 5.4 4.4 10h4.9Z" fill={shade(accent, 34)} opacity="0.5" />
      <Path d="M15.7 5.4 19.6 10h-4.9Z" fill={shade(accent, -26)} opacity="0.55" />
      {/* girdle + pavilion strokes */}
      <Path
        d="M4.4 10h15.2M9.3 10 12 20.2 14.7 10M8.3 5.4l1 4.6M15.7 5.4l-1 4.6"
        fill="none"
        stroke={shade(accent, -44)}
        strokeWidth="0.55"
        strokeLinejoin="round"
      />
      {/* speculars */}
      <Path d="M9.2 6.4l1.4-.6" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" />
      <Path d="M6.9 10.9l3.1 5.8" stroke="rgba(255,255,255,0.35)" strokeWidth="0.7" strokeLinecap="round" />
      <Spark x={16.9} y={4.4} s={1.05} />
      <Spark x={5.2} y={13.9} s={0.7} o={0.7} />
    </Svg>
  );
}

/** Cluster of three gems — pink centerpiece flanked by cyan + violet. */
export function GemClusterIcon({ size = 24, accent = GEM_PINK }: IconProps) {
  const pink = useMemo(() => gradId('gclP'), []);
  const cyan = useMemo(() => gradId('gclC'), []);
  const purp = useMemo(() => gradId('gclV'), []);
  const glow = useMemo(() => gradId('gclG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={pink} from={shade(accent, 60)} to={shade(accent, -46)} />
      <DuoGrad id={cyan} from={shade(GEM_CYAN, 60)} to={shade(GEM_CYAN, -46)} />
      <DuoGrad id={purp} from={shade(GEM_PURPLE, 56)} to={shade(GEM_PURPLE, -48)} />
      <GlowGrad id={glow} color={shade(accent, 66)} />
      <Ground rx={8} cy={21.5} ry={1.25} />
      <Ellipse cx="12" cy="13" rx="9.8" ry="7.8" fill={`url(#${glow})`} opacity="0.55" />
      <MiniGem cx={6} y={11.8} w={6.6} h={7.8} fill={`url(#${cyan})`} edge={rim(GEM_CYAN)} dark={shade(GEM_CYAN, -42)} lite={shade(GEM_CYAN, 55)} />
      <MiniGem cx={18} y={12.2} w={6.2} h={7.2} fill={`url(#${purp})`} edge={rim(GEM_PURPLE)} dark={shade(GEM_PURPLE, -44)} lite={shade(GEM_PURPLE, 52)} />
      <MiniGem cx={12} y={6.8} w={10.6} h={13} fill={`url(#${pink})`} edge={rim(accent)} dark={shade(accent, -44)} lite={shade(accent, 55)} />
      <Spark x={16.7} y={5} s={1.05} />
      <Spark x={4.6} y={9.2} s={0.7} o={0.75} />
      <Spark x={20.2} y={10.2} s={0.65} o={0.7} />
    </Svg>
  );
}

/** Five gems heaped on a mound — the gem jackpot render. */
export function GemHoardIcon({ size = 24, accent = GEM_PINK }: IconProps) {
  const pink = useMemo(() => gradId('ghdP'), []);
  const cyan = useMemo(() => gradId('ghdC'), []);
  const purp = useMemo(() => gradId('ghdV'), []);
  const gold = useMemo(() => gradId('ghdA'), []);
  const teal = useMemo(() => gradId('ghdT'), []);
  const glow = useMemo(() => gradId('ghdG'), []);
  const MOUND = '#463a66';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={pink} from={shade(accent, 60)} to={shade(accent, -46)} />
      <DuoGrad id={cyan} from={shade(GEM_CYAN, 60)} to={shade(GEM_CYAN, -46)} />
      <DuoGrad id={purp} from={shade(GEM_PURPLE, 56)} to={shade(GEM_PURPLE, -48)} />
      <DuoGrad id={gold} from={shade(GOLD, 56)} to={shade(GOLD, -44)} />
      <DuoGrad id={teal} from={shade(GEM_TEAL, 54)} to={shade(GEM_TEAL, -46)} />
      <GlowGrad id={glow} color={shade(accent, 66)} />
      <Ground rx={8.8} cy={21.7} ry={1.3} />
      <Ellipse cx="12" cy="12.4" rx="10.2" ry="8.2" fill={`url(#${glow})`} opacity="0.5" />
      {/* mound */}
      <Path d="M3.4 20.6c.9-2.6 3.1-4 8.6-4s7.7 1.4 8.6 4Z" fill={MOUND} stroke={rim(MOUND)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M5.9 19.2c1.6-.9 3.6-1.4 6.1-1.4" fill="none" stroke={shade(MOUND, 26)} strokeWidth="0.6" strokeLinecap="round" />
      {/* back gems */}
      <MiniGem cx={5.9} y={10.8} w={5.8} h={7} fill={`url(#${cyan})`} edge={rim(GEM_CYAN)} dark={shade(GEM_CYAN, -42)} lite={shade(GEM_CYAN, 55)} />
      <MiniGem cx={18.1} y={11.2} w={5.6} h={6.6} fill={`url(#${purp})`} edge={rim(GEM_PURPLE)} dark={shade(GEM_PURPLE, -44)} lite={shade(GEM_PURPLE, 52)} />
      {/* crown gem */}
      <MiniGem cx={12} y={5.6} w={9.8} h={12.4} fill={`url(#${pink})`} edge={rim(accent)} dark={shade(accent, -44)} lite={shade(accent, 55)} />
      {/* front small gems */}
      <MiniGem cx={8.7} y={14.8} w={4.6} h={5.4} fill={`url(#${gold})`} edge={rim(GOLD)} dark={shade(GOLD, -42)} lite={shade(GOLD, 55)} />
      <MiniGem cx={15.4} y={15.1} w={4.4} h={5} fill={`url(#${teal})`} edge={rim(GEM_TEAL)} dark={shade(GEM_TEAL, -44)} lite={shade(GEM_TEAL, 52)} />
      <Spark x={16.6} y={3.9} s={1.1} />
      <Spark x={4.4} y={8} s={0.75} o={0.75} />
      <Spark x={20.6} y={8.9} s={0.65} o={0.7} />
    </Svg>
  );
}

/**
 * Four aquamarine stones on an ice shelf — the mid-ladder gem cluster.
 * Deliberately a DIFFERENT silhouette + hue family from GemCluster (pink
 * trio) so a mid-tier gem payout never reads as a recolored early one.
 */
export function GemCyanIcon({ size = 24, accent = GEM_CYAN }: IconProps) {
  const main = useMemo(() => gradId('gcyM'), []);
  const pale = useMemo(() => gradId('gcyP'), []);
  const ice = useMemo(() => gradId('gcyI'), []);
  const glow = useMemo(() => gradId('gcyG'), []);
  const SHELF = '#2a6f92';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={main} from={shade(accent, 62)} to={shade(accent, -46)} />
      <DuoGrad id={pale} from={shade(GEM_ICE, 34)} to={shade(GEM_ICE, -62)} />
      <DuoGrad id={ice} from={shade(SHELF, 30)} to={shade(SHELF, -40)} />
      <GlowGrad id={glow} color={shade(accent, 66)} />
      <Ground rx={8.4} cy={21.7} ry={1.25} />
      <Ellipse cx="12" cy="12.6" rx="10" ry="8" fill={`url(#${glow})`} opacity="0.55" />
      {/* ice shelf the cluster grows out of */}
      <Path
        d="M3.5 20.7l2.5-3.4h12l2.5 3.4Z"
        fill={`url(#${ice})`}
        stroke={rim(SHELF)}
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
      <Path d="M6.7 18.5h6.2" stroke={shade(GEM_ICE, -6)} strokeWidth="0.55" strokeLinecap="round" opacity="0.65" />
      {/* flanking stones */}
      <MiniGem cx={6.1} y={10.2} w={6} h={7.2} fill={`url(#${pale})`} edge={rim(GEM_ICE)} dark={shade(GEM_ICE, -62)} lite="#ffffff" />
      <MiniGem cx={17.9} y={10.6} w={5.8} h={6.8} fill={`url(#${main})`} edge={rim(accent)} dark={shade(accent, -44)} lite={shade(accent, 55)} />
      {/* crown spire */}
      <MiniGem cx={12} y={4.9} w={10} h={12.6} fill={`url(#${main})`} edge={rim(accent)} dark={shade(accent, -44)} lite={shade(accent, 58)} />
      {/* front chip */}
      <MiniGem cx={12} y={14.4} w={5} h={5.8} fill={`url(#${pale})`} edge={rim(GEM_ICE)} dark={shade(GEM_ICE, -62)} lite="#ffffff" />
      <Spark x={17.2} y={4.2} s={1.05} />
      <Spark x={4.6} y={7.6} s={0.75} o={0.75} />
      <Spark x={20.4} y={8.4} s={0.65} o={0.7} />
    </Svg>
  );
}

/** Three topaz stones raised on a gold plinth — the mid-ladder gem prize. */
export function GemGoldTrioIcon({ size = 24, accent = GEM_TOPAZ }: IconProps) {
  const stone = useMemo(() => gradId('ggtS'), []);
  const plinth = useMemo(() => gradId('ggtP'), []);
  const glow = useMemo(() => gradId('ggtG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={stone} from={shade(accent, 60)} to={shade(accent, -48)} />
      <DuoGrad id={plinth} from={shade(GOLD, 52)} to={shade(GOLD, -50)} />
      <GlowGrad id={glow} color={shade(accent, 60)} />
      <Ground rx={8.8} cy={21.7} ry={1.3} />
      <Ellipse cx="12" cy="12.2" rx="10.2" ry="8.2" fill={`url(#${glow})`} opacity="0.55" />
      {/* plinth base + cap */}
      <Rect x="3.4" y="18.1" width="17.2" height="2.6" rx="0.8" fill={`url(#${plinth})`} stroke={rim(GOLD)} strokeWidth="0.85" />
      <Rect x="4.9" y="16.5" width="14.2" height="1.8" rx="0.6" fill={shade(GOLD, 22)} stroke={rim(GOLD)} strokeWidth="0.7" />
      <Path d="M5.6 19.2h5.2" stroke={shade(GOLD, 52)} strokeWidth="0.5" strokeLinecap="round" />
      {/* trio */}
      <MiniGem cx={6.5} y={9.9} w={6} h={6.9} fill={`url(#${stone})`} edge={rim(accent)} dark={shade(accent, -46)} lite={shade(accent, 52)} />
      <MiniGem cx={17.5} y={10.1} w={5.8} h={6.7} fill={`url(#${stone})`} edge={rim(accent)} dark={shade(accent, -46)} lite={shade(accent, 52)} />
      <MiniGem cx={12} y={4.4} w={9.6} h={12.4} fill={`url(#${stone})`} edge={rim(accent)} dark={shade(accent, -46)} lite={shade(accent, 58)} />
      <Spark x={17.8} y={3.6} s={1.1} />
      <Spark x={4.4} y={6.6} s={0.75} o={0.75} />
      <Spark x={20.6} y={14.6} s={0.65} o={0.7} />
    </Svg>
  );
}

/** Amethyst geode cracked open, five violet stones inside — late-ladder hoard. */
export function GemVioletIcon({ size = 24, accent = GEM_VIOLET }: IconProps) {
  const crown = useMemo(() => gradId('gvlC'), []);
  const side = useMemo(() => gradId('gvlS'), []);
  const shell = useMemo(() => gradId('gvlH'), []);
  const glow = useMemo(() => gradId('gvlG'), []);
  const ROCK = '#3b2a55';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={crown} from={shade(accent, 64)} to={shade(accent, -46)} />
      <DuoGrad id={side} from={shade(GEM_PURPLE, 56)} to={shade(GEM_PURPLE, -48)} />
      <DuoGrad id={shell} from={shade(ROCK, 26)} to={shade(ROCK, -26)} />
      <GlowGrad id={glow} color={shade(accent, 72)} />
      <Ground rx={9} cy={21.7} ry={1.3} />
      <Ellipse cx="12" cy="12.6" rx="10.4" ry="8.4" fill={`url(#${glow})`} opacity="0.6" />
      {/* geode shell + hollow */}
      <Path d="M2.9 20.7a9.1 9.1 0 0 1 18.2 0Z" fill={`url(#${shell})`} stroke={rim(ROCK)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M4.9 20.7a7.1 7.1 0 0 1 14.2 0Z" fill="#1a0d31" opacity="0.92" />
      {/* crystal teeth on the inner rim */}
      <Path
        d="M6 18.6l.85-1.6.85 1.6ZM8.5 16.5l.8-1.7.8 1.7ZM14 16.3l.85-1.7.85 1.7ZM16.4 18.4l.8-1.6.8 1.6Z"
        fill={shade(accent, 46)}
        opacity="0.75"
      />
      {/* hoard */}
      <MiniGem cx={8.1} y={13.4} w={5.2} h={6.6} fill={`url(#${side})`} edge={rim(GEM_PURPLE)} dark={shade(GEM_PURPLE, -46)} lite={shade(GEM_PURPLE, 52)} />
      <MiniGem cx={15.9} y={13.7} w={5} h={6.3} fill={`url(#${side})`} edge={rim(GEM_PURPLE)} dark={shade(GEM_PURPLE, -46)} lite={shade(GEM_PURPLE, 52)} />
      <MiniGem cx={12} y={8.4} w={8.6} h={11.4} fill={`url(#${crown})`} edge={rim(accent)} dark={shade(accent, -46)} lite={shade(accent, 58)} />
      <MiniGem cx={10.1} y={16.9} w={3.8} h={3.8} fill={`url(#${crown})`} edge={rim(accent)} dark={shade(accent, -46)} lite={shade(accent, 52)} />
      <MiniGem cx={14} y={17.1} w={3.6} h={3.6} fill={`url(#${side})`} edge={rim(GEM_PURPLE)} dark={shade(GEM_PURPLE, -46)} lite={shade(GEM_PURPLE, 52)} />
      <Spark x={17.6} y={5.2} s={1.15} />
      <Spark x={4.2} y={9} s={0.8} o={0.8} />
      <Spark x={20.6} y={10.4} s={0.7} o={0.7} />
    </Svg>
  );
}

/** Glowing hint bulb on a brass display base — the hint-pack reward. */
export function HintBulbRewardIcon({ size = 24, accent = '#ffd24d' }: IconProps) {
  const glass = useMemo(() => gradId('hbwB'), []);
  const brass = useMemo(() => gradId('hbwM'), []);
  const glow = useMemo(() => gradId('hbwG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={glass} from={shade(accent, 56)} to={shade(accent, -22)} />
      <DuoGrad id={brass} from={shade(BRASS, 46)} to={shade(BRASS, -46)} />
      <GlowGrad id={glow} color="#ffe89a" />
      <Ground rx={6.4} cy={21.6} />
      <Circle cx="12" cy="9.3" r="8.6" fill={`url(#${glow})`} opacity="0.8" />
      {/* light rays */}
      <Path
        d="M12 1v1.9M5.1 3.9l1.35 1.35M18.9 3.9l-1.35 1.35M2.9 9.9h1.9M19.2 9.9h1.9"
        stroke={shade(accent, 26)}
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* glass bulb */}
      <Circle cx="12" cy="9.3" r="5.3" fill={`url(#${glass})`} stroke="#c8871a" strokeWidth="0.9" />
      <Path
        d="M10.4 12.3v-2l.85.9.75-1.6.75 1.6.85-.9v2"
        fill="none"
        stroke="#a85c10"
        strokeWidth="0.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M8.6 7.1c.65-1 1.65-1.6 3-1.85" fill="none" stroke={HILITE} strokeWidth="0.95" strokeLinecap="round" />
      {/* brass collar + threads */}
      <Rect x="9.6" y="14" width="4.8" height="3.5" rx="0.9" fill={`url(#${brass})`} stroke={rim(BRASS)} strokeWidth="0.8" />
      <Path d="M9.7 15.1h4.6M9.7 16.2h4.6" stroke={shade(BRASS, -38)} strokeWidth="0.55" />
      <Path d="M10.1 14.6c1-.25 2-.25 3 0" fill="none" stroke={shade(BRASS, 50)} strokeWidth="0.5" strokeLinecap="round" />
      {/* contact tip + display base */}
      <Rect x="10.8" y="17.5" width="2.4" height="1.1" rx="0.5" fill={shade(BRASS, -18)} stroke={rim(BRASS)} strokeWidth="0.6" />
      <Rect x="7.9" y="18.6" width="8.2" height="2.2" rx="0.8" fill={`url(#${brass})`} stroke={rim(BRASS)} strokeWidth="0.8" />
      <Path d="M8.7 19.3h3.4" stroke={shade(BRASS, 48)} strokeWidth="0.5" strokeLinecap="round" />
      <Spark x={17.3} y={4.3} s={1} />
      <Spark x={6.3} y={13.2} s={0.65} o={0.7} />
    </Svg>
  );
}

/** Small wooden crate, iron corners, glowing bolt sigil — booster reward. */
export function BoosterCrateIcon({ size = 24, accent = '#ffd24d' }: IconProps) {
  const wood = useMemo(() => gradId('bcrB'), []);
  const bolt = useMemo(() => gradId('bcrL'), []);
  const glow = useMemo(() => gradId('bcrG'), []);
  const IRON = '#8a8fa8';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={wood} from={shade(WOOD, 34)} to={shade(WOOD, -34)} />
      <DuoGrad id={bolt} from={shade(accent, 24)} to={shade(accent, -52)} />
      <GlowGrad id={glow} color="#ffd24d" />
      <Ground rx={7.8} cy={21.6} />
      {/* crate body */}
      <Rect x="4.6" y="7.6" width="14.8" height="12.8" rx="1.1" fill={`url(#${wood})`} stroke={rim(WOOD)} strokeWidth="1" />
      {/* plank seams + grain */}
      <Path d="M4.8 11.8h14.4M4.8 16.2h14.4" stroke={shade(WOOD, -28)} strokeWidth="0.6" />
      <Path d="M6.2 9.6c1.7-.3 3.4-.3 5.2 0M13.4 18.3c1.4-.25 2.8-.25 4.2 0" fill="none" stroke={shade(WOOD, 22)} strokeWidth="0.5" strokeLinecap="round" />
      {/* lid plank */}
      <Rect x="3.8" y="5.8" width="16.4" height="2.5" rx="0.8" fill={shade(WOOD, 16)} stroke={rim(WOOD)} strokeWidth="0.9" />
      <Path d="M5 6.6h4.2" stroke={shade(WOOD, 42)} strokeWidth="0.55" strokeLinecap="round" />
      {/* iron corner brackets */}
      <Path
        d="M4.6 10.4V8.7l1.7-.1M19.4 10.4V8.7l-1.7-.1M4.6 17.6v1.7l1.7.1M19.4 17.6v1.7l-1.7.1"
        fill="none"
        stroke={IRON}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* bolt sigil plate */}
      <Circle cx="12" cy="14" r="4.4" fill={`url(#${glow})`} opacity="0.7" />
      <Circle cx="12" cy="14" r="3.7" fill="rgba(16,6,30,0.6)" stroke="#ffd24d" strokeWidth="0.75" />
      <Path
        d="M13 11.4l-2.5 3.2h1.7l-1.1 2.9 2.7-3.5h-1.7Z"
        fill={`url(#${bolt})`}
        stroke="#c8871a"
        strokeWidth="0.55"
        strokeLinejoin="round"
      />
      <Spark x={18.6} y={4.2} s={0.95} />
      <Spark x={5.2} y={4.6} s={0.65} o={0.7} />
    </Svg>
  );
}

/** Shared closed-chest body: domed lid, banded body, strap + lock plate. */
function ClosedChest({
  woodFill, metalFill, woodHue, metalHue,
}: {
  woodFill: string; metalFill: string; woodHue: string; metalHue: string;
}) {
  return (
    <G>
      {/* body */}
      <Rect x="4.3" y="11.4" width="15.4" height="8.8" rx="1.2" fill={woodFill} stroke={rim(woodHue)} strokeWidth="1" />
      <Path d="M4.5 16h15" stroke={shade(woodHue, -26)} strokeWidth="0.55" />
      {/* domed lid */}
      <Path
        d="M4.3 11.4v-1.6c0-3.2 3.4-5.4 7.7-5.4s7.7 2.2 7.7 5.4v1.6Z"
        fill={woodFill}
        stroke={rim(woodHue)}
        strokeWidth="1"
      />
      <Path d="M8.1 5.6c-1.5.9-2.4 2.1-2.6 3.6" fill="none" stroke={HILITE_SOFT} strokeWidth="0.8" strokeLinecap="round" />
      {/* metal mid band */}
      <Rect x="3.9" y="10.6" width="16.2" height="1.9" rx="0.6" fill={metalFill} stroke={rim(metalHue)} strokeWidth="0.75" />
      {/* center strap over lid + body */}
      <Rect x="10" y="4.4" width="4" height="15.8" rx="0.9" fill={metalFill} stroke={rim(metalHue)} strokeWidth="0.75" />
      <Path d="M10.9 4.9c.7-.15 1.5-.15 2.2 0" fill="none" stroke={shade(metalHue, 46)} strokeWidth="0.55" strokeLinecap="round" />
      {/* lock plate + keyhole */}
      <Rect x="10.3" y="10.4" width="3.4" height="3.9" rx="0.8" fill={metalFill} stroke={rim(metalHue)} strokeWidth="0.7" />
      <Circle cx="12" cy="11.9" r="0.75" fill="#241238" />
      <Path d="M12 12.3l-.6 1.5h1.2Z" fill="#241238" />
      {/* band rivets */}
      <Circle cx="5.4" cy="11.55" r="0.4" fill={shade(metalHue, 40)} />
      <Circle cx="18.6" cy="11.55" r="0.4" fill={shade(metalHue, 40)} />
    </G>
  );
}

/** Closed bronze-trimmed oak chest — mystery-box reward. */
export function ChestBronzeIcon({ size = 24, accent = '#c07a3e' }: IconProps) {
  const wood = useMemo(() => gradId('cbzW'), []);
  const met = useMemo(() => gradId('cbzM'), []);
  const glow = useMemo(() => gradId('cbzG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={wood} from={shade(WOOD, 30)} to={shade(WOOD, -36)} />
      <DuoGrad id={met} from={shade(accent, 44)} to={shade(accent, -44)} />
      <GlowGrad id={glow} color={shade(accent, 60)} />
      <Ground rx={8.2} cy={21.6} ry={1.25} />
      <Ellipse cx="12" cy="12.2" rx="9.6" ry="8" fill={`url(#${glow})`} opacity="0.4" />
      <ClosedChest woodFill={`url(#${wood})`} metalFill={`url(#${met})`} woodHue={WOOD} metalHue={accent} />
      <Spark x={18.4} y={5.2} s={0.8} o={0.8} />
    </Svg>
  );
}

/** Closed gold-trimmed mahogany chest with gem inlay — the grand chest. */
export function ChestGoldIcon({ size = 24, accent = GOLD }: IconProps) {
  const wood = useMemo(() => gradId('cgdW'), []);
  const met = useMemo(() => gradId('cgdM'), []);
  const glow = useMemo(() => gradId('cgdG'), []);
  const MAHOG = '#9a4630';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={wood} from={shade(MAHOG, 32)} to={shade(MAHOG, -38)} />
      <DuoGrad id={met} from="#ffe066" to={shade(accent, -34)} />
      <GlowGrad id={glow} color="#ffd24d" />
      <Ground rx={8.2} cy={21.6} ry={1.25} />
      <Ellipse cx="12" cy="12" rx="10.2" ry="8.6" fill={`url(#${glow})`} opacity="0.65" />
      <ClosedChest woodFill={`url(#${wood})`} metalFill={`url(#${met})`} woodHue={MAHOG} metalHue={accent} />
      {/* gem inlay on the lock */}
      <Path d="M12 10.6l1.1.9-.45 1.4h-1.3l-.45-1.4Z" fill={GEM_PINK} stroke={rim(GEM_PINK)} strokeWidth="0.5" strokeLinejoin="round" />
      <Path d="M11.6 11.2l.4-.35" stroke="#ffffff" strokeWidth="0.45" strokeLinecap="round" />
      <Spark x={18.7} y={4.6} s={1.05} />
      <Spark x={5.2} y={6.4} s={0.7} o={0.75} />
      <Spark x={20.6} y={12.6} s={0.65} o={0.7} />
    </Svg>
  );
}
