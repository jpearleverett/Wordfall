/**
 * Core game icons — currency, boosters, rewards, status. See IconBase for
 * the shared material recipe. All icons draw in a 24×24 viewBox.
 */
import React, { useMemo } from 'react';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import {
  IconProps, VB, BodyGrad, DuoGrad, RadialGrad, Gloss, Gleam, TwinkleStar,
  gradId, rim, shade, outline, HILITE, HILITE_SOFT,
} from './IconBase';

export function CoinIcon({ size = 24, accent = '#ffb800' }: IconProps) {
  const id = useMemo(() => gradId('coin'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} />
      <Circle cx="12" cy="12" r="10" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" />
      <Circle cx="12" cy="12" r="6.7" fill="none" stroke={shade(accent, -46)} strokeWidth="1.3" />
      <Path d="M12 8.2v7.6M9.8 10.2c0-1 1-1.6 2.2-1.6s2.2.6 2.2 1.5c0 2.4-4.4 1.5-4.4 3.9 0 .9 1 1.6 2.2 1.6s2.2-.6 2.2-1.6" stroke={shade(accent, -66)} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <Path d="M7 17.6c1.3 1.5 3 2.3 5 2.3s3.7-.8 5-2.3" stroke={shade(accent, 40)} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity={0.85} />
      <Gloss cx={8.3} cy={7.3} rx={3.3} ry={2.1} rot={-28} />
      <Gleam cx={12.9} cy={5.2} r={0.75} />
      <TwinkleStar cx={19.7} cy={4.1} r={2.1} />
    </Svg>
  );
}

export function GemIcon({ size = 24, accent = '#7c5cff' }: IconProps) {
  const id = useMemo(() => gradId('gem'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M6.2 4h11.6L22 9.4 12 21 2 9.4Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M6.2 4 2 9.4h6.6Z" fill="#ffffff" opacity={0.26} />
      <Path d="M8.6 9.4h6.8L12 21Z" fill={shade(accent, 26)} opacity={0.5} />
      <Path d="M2 9.4h20M8.6 9.4 12 21l3.4-11.6M6.2 4l2.4 5.4M17.8 4l-2.4 5.4" stroke={shade(accent, -52)} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
      <Path d="M5.4 11.2 12 19.5l6.6-8.3" stroke={shade(accent, 40)} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.8} />
      <Gloss cx={8.1} cy={6.3} rx={2.7} ry={1.5} rot={-18} o={0.5} />
      <Gleam cx={14.7} cy={5.6} r={0.7} />
      <TwinkleStar cx={20.3} cy={3.2} r={1.9} />
    </Svg>
  );
}

export function HintBulbIcon({ size = 24, accent = '#ffd24d' }: IconProps) {
  const id = useMemo(() => gradId('bulb'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.42} cy={0.3} />
      <Path d="M12 2.6a6.8 6.8 0 0 1 3.7 12.5c-.7.5-1.1 1.1-1.1 1.9h-5.2c0-.8-.4-1.4-1.1-1.9A6.8 6.8 0 0 1 12 2.6Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M10 9.2l2 2.2 2-2.2" stroke={shade(accent, -70)} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 11.4V17" stroke={shade(accent, -70)} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M8.9 14.7c.9.9 1.9 1.4 3.1 1.4s2.2-.5 3.1-1.4" stroke={shade(accent, 40)} strokeWidth="1.1" strokeLinecap="round" fill="none" opacity={0.85} />
      <Rect x="9.4" y="18.2" width="5.2" height="1.7" rx="0.85" fill={shade(accent, -30)} stroke={outline(accent)} strokeWidth="1.2" />
      <Rect x="10" y="20.6" width="4" height="1.5" rx="0.75" fill={shade(accent, -55)} stroke={outline(accent)} strokeWidth="1.2" />
      <Gloss cx={9.3} cy={5.9} rx={2.4} ry={1.6} rot={-24} />
      <Gleam cx={13.4} cy={4.2} r={0.7} />
    </Svg>
  );
}

const STAR_PTS = '12,2.4 14.9,8.6 21.6,9.4 16.7,14 18,20.7 12,17.4 6,20.7 7.3,14 2.4,9.4 9.1,8.6';

export function StarIcon({ size = 24, accent = '#ffb800' }: IconProps) {
  const id = useMemo(() => gradId('star'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Polygon points={STAR_PTS} fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M12 5.2 13.6 8.9 9 9.6Z" fill="#ffffff" opacity={0.3} />
      <Path d="M7.6 19.2 12 16.8l4.4 2.4" stroke={shade(accent, 40)} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.85} />
      <Gloss cx={9.7} cy={7.9} rx={2.4} ry={1.5} rot={-24} />
      <Gleam cx={13.1} cy={5.4} r={0.7} />
    </Svg>
  );
}

/** 8-point sparkle burst — the set's generic "special" mark and fallback. */
export function SparkleIcon({ size = 24, accent = '#c84dff' }: IconProps) {
  const id = useMemo(() => gradId('spark'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.44} cy={0.34} />
      <Path d="M12 2c.9 4.3 2 5.9 5.4 6.6C14 9.3 12.9 11 12 15.2 11.1 11 10 9.3 6.6 8.6 10 7.9 11.1 6.3 12 2Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M10.2 11.2c.7.8 1.3 2 1.8 3.6" stroke={shade(accent, 40)} strokeWidth="1" strokeLinecap="round" fill="none" opacity={0.85} />
      <Path d="M18.4 13.2c.5 2.4 1.1 3.3 3 3.7-1.9.4-2.5 1.3-3 3.7-.5-2.4-1.1-3.3-3-3.7 1.9-.4 2.5-1.3 3-3.7Z" fill={shade(accent, 40)} stroke={outline(accent)} strokeWidth="1.2" strokeLinejoin="round" />
      <Circle cx="6.4" cy="17.4" r="1.7" fill={shade(accent, 70)} stroke={outline(accent)} strokeWidth="1.2" />
      <Gloss cx={10.6} cy={5.9} rx={1.7} ry={1.1} rot={-28} o={0.5} />
      <Gleam cx={13.2} cy={4.4} r={0.6} />
    </Svg>
  );
}

export function TrophyIcon({ size = 24, accent = '#ffb800' }: IconProps) {
  const id = useMemo(() => gradId('trophy'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.42} cy={0.28} />
      <Path d="M7 4.6H3.6c0 3.4 1.4 5.4 3.8 5.8M17 4.6h3.4c0 3.4-1.4 5.4-3.8 5.8" fill="none" stroke={outline(accent)} strokeWidth="1.9" strokeLinejoin="round" />
      <Path d="M7 3h10v6.2a5 5 0 0 1-10 0Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M9.2 12.2c.8.7 1.7 1.1 2.8 1.1s2-.4 2.8-1.1" stroke={shade(accent, 40)} strokeWidth="1.1" strokeLinecap="round" fill="none" opacity={0.85} />
      <Path d="M12 14.2v3" stroke={shade(accent, -30)} strokeWidth="2.2" />
      <Path d="M8.6 20.8c0-2 1.5-3.4 3.4-3.4s3.4 1.4 3.4 3.4Z" fill={shade(accent, -20)} stroke={outline(accent)} strokeWidth="1.5" strokeLinejoin="round" />
      <Gloss cx={9.5} cy={5.7} rx={2.2} ry={1.5} rot={-20} o={0.5} />
      <Gleam cx={14.4} cy={4.6} r={0.65} />
      <TwinkleStar cx={20.7} cy={2.4} r={1.8} />
    </Svg>
  );
}

const MEDAL_COLORS: Record<string, string> = { gold: '#ffb800', silver: '#c9d2e8', bronze: '#d0854a' };

export function MedalIcon({ size = 24, accent, metal = 'gold' }: IconProps & { metal?: 'gold' | 'silver' | 'bronze' }) {
  const c = accent ?? MEDAL_COLORS[metal];
  const id = useMemo(() => gradId('medal'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={c} />
      <Path d="M8 2h3l1.6 5L14 2h3l-3.4 8h-3.2Z" fill={shade(c, -35)} stroke={outline(c)} strokeWidth="1.8" strokeLinejoin="round" />
      <Circle cx="12" cy="15.4" r="6.2" fill={`url(#${id})`} stroke={outline(c)} strokeWidth="2" />
      <Circle cx="12" cy="15.4" r="4" fill="none" stroke={shade(c, -44)} strokeWidth="1.2" />
      <Polygon points="12,12.6 12.9,14.5 15,14.7 13.5,16.1 13.9,18.2 12,17.2 10.1,18.2 10.5,16.1 9,14.7 11.1,14.5" fill={shade(c, 60)} />
      <Path d="M9.4 19.3c.8.5 1.6.7 2.6.7s1.8-.2 2.6-.7" stroke={shade(c, 40)} strokeWidth="1" strokeLinecap="round" fill="none" opacity={0.85} />
      <Gloss cx={9.7} cy={12.7} rx={1.9} ry={1.2} rot={-26} o={0.5} />
      <Gleam cx={14.5} cy={12.1} r={0.55} />
    </Svg>
  );
}

export function FlameIcon({ size = 24, accent = '#ff7a1a' }: IconProps) {
  const id = useMemo(() => gradId('flame'), []);
  const core = useMemo(() => gradId('flamecore'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <DuoGrad id={core} from="#ffe9a3" to="#ffb800" />
      <Path d="M12 2.4c.6 3.4 2.4 4.7 4.4 6.9 1.6 1.8 2.4 3.5 2.4 5.5A6.8 6.8 0 0 1 12 21.6a6.8 6.8 0 0 1-6.8-6.8c0-2.6 1.3-4.4 2.9-6.1-.1 1.5.3 2.5 1.3 3.2-.3-3.7 1-6.3 2.6-9.5Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M12 10.8c1.9 2 3 3.2 3 5a3 3 0 0 1-6 0c0-1.8 1.1-3 3-5Z" fill={`url(#${core})`} />
      <Path d="M8.3 18.7c1 1 2.2 1.5 3.7 1.5s2.7-.5 3.7-1.5" stroke={shade(accent, 44)} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity={0.85} />
      <Gloss cx={9.2} cy={10.4} rx={1.9} ry={1.3} rot={-28} o={0.42} />
      <Gleam cx={13.3} cy={5.1} r={0.6} />
    </Svg>
  );
}

export function BoltIcon({ size = 24, accent = '#00e5ff' }: IconProps) {
  const id = useMemo(() => gradId('bolt'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M13.6 2 5.4 13.4h4.8L10.4 22l8.2-11.4h-4.8Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M11.6 19.3l4.3-6" stroke={shade(accent, 44)} strokeWidth="1.1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={10.9} cy={5.9} rx={1.7} ry={1.1} rot={-52} o={0.5} />
      <Gleam cx={12.8} cy={3.6} r={0.6} />
    </Svg>
  );
}

export function UndoIcon({ size = 24, accent = '#00e5ff' }: IconProps) {
  const id = useMemo(() => gradId('undo'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      {/* fat dark contour underlay, juicy gradient stroke on top */}
      <Path d="M12.6 5a8 8 0 0 1 0 16 8 8 0 0 1-7.4-4.9" fill="none" stroke={outline(accent)} strokeWidth="5.4" strokeLinecap="round" />
      <Path d="M12.6 5a8 8 0 0 1 0 16 8 8 0 0 1-7.4-4.9" fill="none" stroke={`url(#${id})`} strokeWidth="2.8" strokeLinecap="round" />
      <Polygon points="13.4,0.8 5.8,5 13.4,9.2" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.9" strokeLinejoin="round" />
      {/* bottom bounce light along the lower arc */}
      <Path d="M8.6 19.9c2.6 1.1 5.2.9 7.6-.7" fill="none" stroke={shade(accent, 44)} strokeWidth="1.1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={17.4} cy={7.6} rx={1.7} ry={1} rot={38} o={0.5} />
      <Gleam cx={19.6} cy={9.8} r={0.65} />
    </Svg>
  );
}

export function ShuffleIcon({ size = 24, accent = '#ff7a1a' }: IconProps) {
  const id = useMemo(() => gradId('shuf'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      {/* fat dark contour underlay */}
      <Path d="M3 7.4h3.4c4.8 0 6.4 9.2 11.2 9.2H20M3 16.6h3.4c1.9 0 3.2-1.4 4.3-3M20 7.4h-2.4c-1.9 0-3.2 1.4-4.3 3" fill="none" stroke={outline(accent)} strokeWidth="4.7" strokeLinecap="round" />
      <Path d="M3 7.4h3.4c4.8 0 6.4 9.2 11.2 9.2H20M3 16.6h3.4c1.9 0 3.2-1.4 4.3-3M20 7.4h-2.4c-1.9 0-3.2 1.4-4.3 3" fill="none" stroke={`url(#${id})`} strokeWidth="2.4" strokeLinecap="round" />
      <Polygon points="18.4,4.2 23 7.4 18.4,10.6" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.8" strokeLinejoin="round" />
      <Polygon points="18.4,13.4 23 16.6 18.4,19.8" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.8" strokeLinejoin="round" />
      {/* bounce light riding the lower swoop */}
      <Path d="M8.8 15.9c1.4 1 2.9 1.6 4.6 1.7" fill="none" stroke={shade(accent, 44)} strokeWidth="1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={5.6} cy={7.1} rx={1.6} ry={0.9} rot={-8} o={0.5} />
      <Gleam cx={9.2} cy={5.9} r={0.6} />
    </Svg>
  );
}

export function EyeIcon({ size = 24, accent = '#00f5d4' }: IconProps) {
  const id = useMemo(() => gradId('eye'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.4} cy={0.3} />
      <Path d="M2 12c2.6-4.6 6-6.9 10-6.9S19.4 7.4 22 12c-2.6 4.6-6 6.9-10 6.9S4.6 16.6 2 12Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      {/* bottom bounce light along the lower lid */}
      <Path d="M6.4 15.4c1.7 1.5 3.6 2.3 5.6 2.3s3.9-.8 5.6-2.3" fill="none" stroke={shade(accent, 44)} strokeWidth="1.1" strokeLinecap="round" opacity={0.85} />
      <Circle cx="12" cy="12" r="4.1" fill={shade(accent, -78)} stroke={outline(accent)} strokeWidth="1.3" />
      <Circle cx="12" cy="12" r="1.9" fill={shade(accent, -104)} />
      <Gloss cx={7.2} cy={8.9} rx={2.2} ry={1.2} rot={-20} o={0.42} />
      <Circle cx="13.5" cy="10.5" r="1.15" fill="#ffffff" opacity={0.9} />
      <Gleam cx={10.4} cy={13.4} r={0.5} />
    </Svg>
  );
}

export function CheckIcon({ size = 24, accent = '#00e676' }: IconProps) {
  const id = useMemo(() => gradId('check'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      {/* fat contour under, juicy gradient over */}
      <Path d="M4 13.2 9.4 18.6 20 6.4" fill="none" stroke={outline(accent)} strokeWidth="6.6" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 13.2 9.4 18.6 20 6.4" fill="none" stroke={`url(#${id})`} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* bounce light hugging the lower edge of the long stroke */}
      <Path d="M10.4 16.6 18.6 7.2" fill="none" stroke={shade(accent, 46)} strokeWidth="1.1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={6.1} cy={13.5} rx={1.5} ry={0.9} rot={42} o={0.55} />
      <Gleam cx={18.9} cy={5.6} r={0.65} />
    </Svg>
  );
}

export function CrossIcon({ size = 24, accent = '#ff4466' }: IconProps) {
  const id = useMemo(() => gradId('cross'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      {/* fat contour under, juicy gradient over */}
      <Path d="M6 6l12 12M18 6 6 18" stroke={outline(accent)} strokeWidth="6.4" strokeLinecap="round" />
      <Path d="M6 6l12 12M18 6 6 18" stroke={`url(#${id})`} strokeWidth="3.4" strokeLinecap="round" />
      {/* bounce light on the lower-left arm */}
      <Path d="M8.2 17.2l3-3" stroke={shade(accent, 46)} strokeWidth="1.1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={7.2} cy={6.9} rx={1.5} ry={0.9} rot={45} o={0.55} />
      <Gleam cx={17.4} cy={4.9} r={0.65} />
    </Svg>
  );
}

export function LockIcon({ size = 24, accent = '#c9d2e8' }: IconProps) {
  const id = useMemo(() => gradId('lock'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.36} cy={0.3} />
      {/* shackle: dark contour under, lit metal over */}
      <Path d="M7.4 10V7.6a4.6 4.6 0 0 1 9.2 0V10" fill="none" stroke={outline(accent)} strokeWidth="4.6" />
      <Path d="M7.4 10V7.6a4.6 4.6 0 0 1 9.2 0V10" fill="none" stroke={shade(accent, 4)} strokeWidth="2.3" />
      <Path d="M8.6 8.2a3.4 3.4 0 0 1 3.4-3.5" fill="none" stroke={shade(accent, 66)} strokeWidth="1" strokeLinecap="round" />
      <Rect x="4.8" y="9.8" width="14.4" height="11" rx="2.8" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" />
      {/* bottom bounce light */}
      <Path d="M7 19.2c1.6.6 3.2.9 5 .9s3.4-.3 5-.9" fill="none" stroke={shade(accent, 44)} strokeWidth="1.1" strokeLinecap="round" opacity={0.85} />
      <Circle cx="12" cy="14.5" r="1.8" fill={shade(accent, -84)} />
      <Path d="M12 15.5v2.7" stroke={shade(accent, -84)} strokeWidth="1.8" strokeLinecap="round" />
      <Gloss cx={8.4} cy={12.3} rx={2.3} ry={1.4} rot={-18} o={0.42} />
      <Gleam cx={15.9} cy={11.9} r={0.65} />
    </Svg>
  );
}

export function CrownIcon({ size = 24, accent = '#ffb800' }: IconProps) {
  const id = useMemo(() => gradId('crown'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M3.4 8.2 7.6 12l4.4-7 4.4 7 4.2-3.8-1.6 10H5Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M6.6 17.2c1.7.5 3.5.7 5.4.7s3.7-.2 5.4-.7" stroke={shade(accent, 40)} strokeWidth="1.1" strokeLinecap="round" fill="none" opacity={0.85} />
      <Rect x="5" y="18.6" width="14" height="2.4" rx="1.2" fill={shade(accent, -25)} stroke={outline(accent)} strokeWidth="1.4" />
      <Circle cx="12" cy="13.6" r="1.4" fill="#ff2d95" stroke={outline(accent)} strokeWidth="0.9" />
      <Circle cx="7.9" cy="14.6" r="1" fill="#00e5ff" stroke={outline(accent)} strokeWidth="0.8" />
      <Circle cx="16.1" cy="14.6" r="1" fill="#00e5ff" stroke={outline(accent)} strokeWidth="0.8" />
      <Circle cx="11.6" cy="13.2" r="0.45" fill="#ffffff" opacity={0.9} />
      <Gloss cx={8.3} cy={10.8} rx={2.1} ry={1.3} rot={-20} o={0.42} />
      <Gleam cx={12.5} cy={7.6} r={0.6} />
      <TwinkleStar cx={20.4} cy={3.6} r={1.8} />
    </Svg>
  );
}

export function GiftIcon({ size = 24, accent = '#ff2d95' }: IconProps) {
  const id = useMemo(() => gradId('gift'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Rect x="4" y="10.6" width="16" height="10.4" rx="1.8" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" />
      <Path d="M5.8 19.4c1.9.6 4 .9 6.2.9s4.3-.3 6.2-.9" stroke={shade(accent, 40)} strokeWidth="1.1" strokeLinecap="round" fill="none" opacity={0.85} />
      <Rect x="3" y="6.8" width="18" height="4.4" rx="1.6" fill={shade(accent, 26)} stroke={outline(accent)} strokeWidth="2" />
      <Path d="M12 6.8V21M12 6.6C10 2.8 5.6 3.4 6.6 6c.6 1.6 3.2 1.2 5.4.6M12 6.6c2-3.8 6.4-3.2 5.4-.6-.6 1.6-3.2 1.2-5.4.6" fill="none" stroke={outline('#ffd24d')} strokeWidth="2.8" strokeLinecap="round" />
      <Path d="M12 6.8V21M12 6.6C10 2.8 5.6 3.4 6.6 6c.6 1.6 3.2 1.2 5.4.6M12 6.6c2-3.8 6.4-3.2 5.4-.6-.6 1.6-3.2 1.2-5.4.6" fill="none" stroke="#ffd24d" strokeWidth="1.6" strokeLinecap="round" />
      <Gloss cx={6.9} cy={9.5} rx={2.3} ry={1.3} rot={-16} o={0.4} />
      <Gleam cx={17.1} cy={12.8} r={0.6} />
      <TwinkleStar cx={20.9} cy={3.7} r={1.8} />
    </Svg>
  );
}

export function ChestIcon({ size = 24, accent = '#c98b3f' }: IconProps) {
  const id = useMemo(() => gradId('chest'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M4 10.2C4 6.8 7 4.6 12 4.6s8 2.2 8 5.6v1H4Z" fill={shade(accent, 22)} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      <Rect x="4" y="11.2" width="16" height="9" rx="1.6" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" />
      <Path d="M4 11.2h16" stroke={outline(accent)} strokeWidth="1.2" />
      <Path d="M5.8 18.6c1.9.5 4 .8 6.2.8s4.3-.3 6.2-.8" stroke={shade(accent, 42)} strokeWidth="1.1" strokeLinecap="round" fill="none" opacity={0.85} />
      <Rect x="10.4" y="9.4" width="3.2" height="5.4" rx="1" fill="#ffd24d" stroke={outline(accent)} strokeWidth="1.3" />
      <Circle cx="12" cy="12" r="0.8" fill={outline(accent)} />
      <Gloss cx={8.4} cy={6.7} rx={2.8} ry={1.4} rot={-12} o={0.42} />
      <Gleam cx={14.2} cy={5.7} r={0.65} />
      <TwinkleStar cx={20.6} cy={3.1} r={1.9} />
    </Svg>
  );
}

export function HeartIcon({ size = 24, accent = '#ff4466' }: IconProps) {
  const id = useMemo(() => gradId('heart'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.36} cy={0.34} />
      <Path d="M12 20.6C6.2 16.4 3 13.2 3 9.4 3 6.6 5.2 4.6 7.8 4.6c1.7 0 3.2.8 4.2 2.3 1-1.5 2.5-2.3 4.2-2.3 2.6 0 4.8 2 4.8 4.8 0 3.8-3.2 7-9 11.2Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M7.6 14.7c1.4 1.8 2.9 3.3 4.4 4.6 1.5-1.3 3-2.8 4.4-4.6" stroke={shade(accent, 42)} strokeWidth="1.1" strokeLinecap="round" fill="none" opacity={0.8} />
      <Gloss cx={8.1} cy={7.9} rx={2.6} ry={1.8} rot={-24} o={0.5} />
      <Gleam cx={10.7} cy={5.7} r={0.7} />
    </Svg>
  );
}

export function WheelIcon({ size = 24, accent = '#c84dff' }: IconProps) {
  const id = useMemo(() => gradId('wheel'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} />
      <Circle cx="12" cy="12.6" r="9" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" />
      <Path d="M12 3.6v18M3 12.6h18M5.6 6.2l12.8 12.8M18.4 6.2 5.6 19" stroke={shade(accent, -56)} strokeWidth="1.3" />
      <Circle cx="12" cy="12.6" r="6.4" fill="none" stroke={shade(accent, -44)} strokeWidth="0.9" opacity={0.7} />
      {/* bottom bounce light on the rim */}
      <Path d="M7.4 19.4c1.4 1 2.9 1.6 4.6 1.6s3.2-.6 4.6-1.6" fill="none" stroke={shade(accent, 44)} strokeWidth="1.1" strokeLinecap="round" opacity={0.85} />
      <Circle cx="12" cy="12.6" r="2.7" fill="#ffd24d" stroke={outline('#ffd24d')} strokeWidth="1.4" />
      <Circle cx="11.2" cy="11.8" r="0.7" fill="#ffffff" opacity={0.85} />
      <Polygon points="12,0.3 14.2,3.5 9.8,3.5" fill="#ffd24d" stroke={outline('#ffd24d')} strokeWidth="1.4" strokeLinejoin="round" />
      <Gloss cx={8.2} cy={7.7} rx={2.5} ry={1.5} rot={-24} o={0.4} />
      <Gleam cx={14.9} cy={6.3} r={0.65} />
    </Svg>
  );
}

export function DiceIcon({ size = 24, accent = '#00e5ff' }: IconProps) {
  const id = useMemo(() => gradId('dice'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.34} cy={0.28} />
      <Rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.4" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" />
      {/* bottom bounce light */}
      <Path d="M6.6 19.5c1.7.5 3.5.7 5.4.7s3.7-.2 5.4-.7" fill="none" stroke={shade(accent, 44)} strokeWidth="1.1" strokeLinecap="round" opacity={0.85} />
      <Circle cx="8.2" cy="8.2" r="1.7" fill={shade(accent, -84)} />
      <Circle cx="15.8" cy="8.2" r="1.7" fill={shade(accent, -84)} />
      <Circle cx="12" cy="12" r="1.7" fill={shade(accent, -84)} />
      <Circle cx="8.2" cy="15.8" r="1.7" fill={shade(accent, -84)} />
      <Circle cx="15.8" cy="15.8" r="1.7" fill={shade(accent, -84)} />
      <Circle cx="7.7" cy="7.7" r="0.5" fill="#ffffff" opacity={0.55} />
      <Circle cx="15.3" cy="7.7" r="0.5" fill="#ffffff" opacity={0.55} />
      <Gloss cx={7.6} cy={5.6} rx={2.4} ry={1.2} rot={-14} o={0.42} />
      <Gleam cx={12.6} cy={4.7} r={0.65} />
    </Svg>
  );
}

export function CloverIcon({ size = 24, accent = '#35b892' }: IconProps) {
  const id = useMemo(() => gradId('clover'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.36} cy={0.32} />
      {/* stem first so the leaves sit over its root */}
      <Path d="M12 12.6c.4 3.4 1.4 5.8 3.6 8.2" fill="none" stroke={outline(accent)} strokeWidth="3.6" strokeLinecap="round" />
      <Path d="M12 12.6c.4 3.4 1.4 5.8 3.6 8.2" fill="none" stroke={shade(accent, -30)} strokeWidth="1.7" strokeLinecap="round" />
      <G stroke={outline(accent)} strokeWidth="1.8">
        <Circle cx="8.4" cy="8.4" r="4.1" fill={`url(#${id})`} />
        <Circle cx="15.6" cy="8.4" r="4.1" fill={`url(#${id})`} />
        <Circle cx="8.4" cy="15" r="4.1" fill={`url(#${id})`} />
        <Circle cx="15.6" cy="15" r="4.1" fill={`url(#${id})`} />
      </G>
      {/* leaf creases + bottom bounce light */}
      <Path d="M8.4 6.2v4.4M13.4 8.4h4.4" fill="none" stroke={shade(accent, -46)} strokeWidth="0.8" strokeLinecap="round" opacity={0.7} />
      <Path d="M5.9 17.4c1.4 1.1 3.1 1.4 4.8.9M13.1 18.3c1.7.5 3.4.2 4.8-.9" fill="none" stroke={shade(accent, 46)} strokeWidth="1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={7} cy={6.7} rx={2} ry={1.2} rot={-24} o={0.45} />
      <Gleam cx={14.3} cy={5.6} r={0.65} />
    </Svg>
  );
}

export function HourglassIcon({ size = 24, accent = '#ffd24d' }: IconProps) {
  const id = useMemo(() => gradId('hour'), []);
  const frame = useMemo(() => gradId('hourfr'), []);
  const FRAME = '#c98b3f';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <DuoGrad id={frame} from={shade(FRAME, 46)} to={shade(FRAME, -40)} />
      {/* glass bulbs — cool translucent body with fat contour */}
      <Path d="M6.6 4.6h10.8c0 3.4-1.6 5.5-4.2 7.4 2.6 1.9 4.2 4 4.2 7.4H6.6c0-3.4 1.6-5.5 4.2-7.4-2.6-1.9-4.2-4-4.2-7.4Z" fill="rgba(190,235,255,0.2)" stroke={outline(accent)} strokeWidth="1.9" strokeLinejoin="round" />
      {/* sand: drained top wedge, stream, heaped bottom pile */}
      <Path d="M9.8 6.4h4.4L12 9.4Z" fill={`url(#${id})`} stroke={shade(accent, -62)} strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M12 11.6v5.2" stroke={shade(accent, -8)} strokeWidth="1.1" strokeLinecap="round" />
      <Path d="M12 13.4c2.9 1 4.5 2.7 4.9 5.2H7.1c.4-2.5 2-4.2 4.9-5.2Z" fill={`url(#${id})`} stroke={shade(accent, -62)} strokeWidth="0.7" strokeLinejoin="round" />
      {/* glass sheen + bottom bounce light */}
      <Path d="M8.1 6.2c.1 2.2.9 3.9 2.4 5.4" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1" strokeLinecap="round" />
      <Path d="M9 17.7c1.9.6 4.1.6 6 0" fill="none" stroke={shade(accent, 48)} strokeWidth="1" strokeLinecap="round" opacity={0.85} />
      {/* wooden caps with fat contour */}
      <Rect x="4.6" y="2.4" width="14.8" height="2.6" rx="1.2" fill={`url(#${frame})`} stroke={outline(FRAME)} strokeWidth="1.8" />
      <Rect x="4.6" y="19" width="14.8" height="2.6" rx="1.2" fill={`url(#${frame})`} stroke={outline(FRAME)} strokeWidth="1.8" />
      <Path d="M6.2 3.3h4.2" stroke={shade(FRAME, 62)} strokeWidth="0.8" strokeLinecap="round" />
      <Path d="M6.2 19.9h4.2" stroke={shade(FRAME, 52)} strokeWidth="0.8" strokeLinecap="round" />
      <Gloss cx={9.1} cy={7.3} rx={1.6} ry={1} rot={-26} o={0.4} />
      <Gleam cx={14.3} cy={6.1} r={0.6} />
    </Svg>
  );
}

export function TargetIcon({ size = 24, accent = '#ff4466' }: IconProps) {
  const id = useMemo(() => gradId('target'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} />
      <Circle cx="12" cy="12" r="9.2" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" />
      <Circle cx="12" cy="12" r="5.9" fill="#f5f0ff" stroke={outline(accent)} strokeWidth="1.3" />
      <Path d="M7.7 14.6a5.9 5.9 0 0 0 2.4 2.6" fill="none" stroke="#cfc4e8" strokeWidth="1.1" strokeLinecap="round" />
      <Circle cx="12" cy="12" r="2.8" fill={shade(accent, 6)} stroke={outline(accent)} strokeWidth="1.3" />
      <Circle cx="11.2" cy="11.1" r="0.7" fill="#ffffff" opacity={0.85} />
      {/* bottom bounce light on the outer ring */}
      <Path d="M7.2 18.9c1.4 1 3.1 1.6 4.8 1.6s3.4-.6 4.8-1.6" fill="none" stroke={shade(accent, 44)} strokeWidth="1.1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={7.9} cy={7.2} rx={2.4} ry={1.4} rot={-26} o={0.42} />
      <Gleam cx={14.7} cy={5.8} r={0.65} />
    </Svg>
  );
}

export function CalendarIcon({ size = 24, accent = '#00e5ff' }: IconProps) {
  const id = useMemo(() => gradId('cal'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.36} cy={0.42} />
      <Rect x="3.4" y="5" width="17.2" height="16" rx="3.2" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" />
      {/* header band */}
      <Path d="M3.4 8.2c0-1.8 1.4-3.2 3.2-3.2h10.8c1.8 0 3.2 1.4 3.2 3.2v1.6H3.4Z" fill={shade(accent, -34)} />
      <Path d="M3.4 9.8h17.2" stroke={outline(accent)} strokeWidth="1.3" />
      {/* binder rings punch through the fat contour */}
      <Path d="M8 2.6v3.6M16 2.6v3.6" stroke={outline(accent)} strokeWidth="3.6" strokeLinecap="round" />
      <Path d="M8 2.8v3.2M16 2.8v3.2" stroke={shade(accent, 26)} strokeWidth="1.7" strokeLinecap="round" />
      {/* marked-day check + bottom bounce light */}
      <Path d="M9.2 14.6l2.1 2.1 3.6-4" fill="none" stroke={shade(accent, -84)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.4 19.6c1.8.5 3.7.8 5.6.8s3.8-.3 5.6-.8" fill="none" stroke={shade(accent, 44)} strokeWidth="1.1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={7.8} cy={7} rx={2.4} ry={1} rot={-8} o={0.4} />
      <Gleam cx={12.9} cy={11.7} r={0.6} />
    </Svg>
  );
}

export function BellIcon({ size = 24, accent = '#ffd24d' }: IconProps) {
  const id = useMemo(() => gradId('bell'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.4} cy={0.3} />
      <Circle cx="12" cy="2.9" r="1.3" fill={shade(accent, -16)} stroke={outline(accent)} strokeWidth="1.4" />
      <Path d="M12 3a6 6 0 0 1 6 6c0 3.6.9 5.3 2.1 6.6H3.9C5.1 14.3 6 12.6 6 9a6 6 0 0 1 6-6Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      {/* skirt shadow + bottom bounce light along the lip */}
      <Path d="M5.4 15.6h13.2" stroke={shade(accent, -52)} strokeWidth="1" strokeLinecap="round" opacity={0.8} />
      <Path d="M6.1 14.2c1.8.5 3.7.7 5.9.7s4.1-.2 5.9-.7" fill="none" stroke={shade(accent, 44)} strokeWidth="1" strokeLinecap="round" opacity={0.85} />
      {/* clapper with fat contour */}
      <Path d="M9.6 18.4a2.5 2.5 0 0 0 4.8 0" fill="none" stroke={outline(accent)} strokeWidth="3.8" strokeLinecap="round" />
      <Path d="M9.9 18.4a2.2 2.2 0 0 0 4.2 0" fill="none" stroke={shade(accent, 8)} strokeWidth="1.8" strokeLinecap="round" />
      <Gloss cx={9} cy={6.7} rx={2.3} ry={1.5} rot={-24} o={0.45} />
      <Gleam cx={13.7} cy={4.7} r={0.65} />
    </Svg>
  );
}

export function KeyIcon({ size = 24, accent = '#ffb800' }: IconProps) {
  const id = useMemo(() => gradId('key'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      {/* fat contour underlay for bow + shaft + teeth */}
      <Circle cx="8" cy="8" r="5" fill="none" stroke={outline(accent)} strokeWidth="5" />
      <Path d="M11.6 11.6 20 20M17 17l2.6-2.6M14.4 14.4l2.2-2.2" stroke={outline(accent)} strokeWidth="5" strokeLinecap="round" />
      <Circle cx="8" cy="8" r="5" fill="none" stroke={`url(#${id})`} strokeWidth="2.7" />
      <Path d="M11.6 11.6 20 20M17 17l2.6-2.6M14.4 14.4l2.2-2.2" stroke={`url(#${id})`} strokeWidth="2.7" strokeLinecap="round" />
      {/* lit inner edge of the bow + bounce light on the shaft */}
      <Path d="M4.9 6.4A3.7 3.7 0 0 1 8 4.4" fill="none" stroke={shade(accent, 70)} strokeWidth="1" strokeLinecap="round" />
      <Path d="M14.9 15.9l2.6 2.6" stroke={shade(accent, 44)} strokeWidth="1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={6.3} cy={5.1} rx={1.5} ry={0.9} rot={-38} o={0.5} />
      <Gleam cx={10.6} cy={4.4} r={0.65} />
    </Svg>
  );
}

export function InfinityIcon({ size = 24, accent = '#c84dff' }: IconProps) {
  const id = useMemo(() => gradId('inf'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      {/* fat contour underlay, juicy gradient ribbon on top */}
      <Path d="M12 12c-2-2.8-3.4-4.2-5.4-4.2a4.2 4.2 0 0 0 0 8.4c2 0 3.4-1.4 5.4-4.2Zm0 0c2 2.8 3.4 4.2 5.4 4.2a4.2 4.2 0 0 0 0-8.4c-2 0-3.4 1.4-5.4 4.2Z" fill="none" stroke={outline(accent)} strokeWidth="5" strokeLinecap="round" />
      <Path d="M12 12c-2-2.8-3.4-4.2-5.4-4.2a4.2 4.2 0 0 0 0 8.4c2 0 3.4-1.4 5.4-4.2Zm0 0c2 2.8 3.4 4.2 5.4 4.2a4.2 4.2 0 0 0 0-8.4c-2 0-3.4 1.4-5.4 4.2Z" fill="none" stroke={`url(#${id})`} strokeWidth="2.6" strokeLinecap="round" />
      {/* bounce light along the lower right loop */}
      <Path d="M15.1 15.1c.7.6 1.5 1 2.5 1" fill="none" stroke={shade(accent, 46)} strokeWidth="1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={5.9} cy={8.9} rx={1.5} ry={0.9} rot={-30} o={0.55} />
      <Gleam cx={17.3} cy={7.1} r={0.65} />
    </Svg>
  );
}

export function TicketIcon({ size = 24, accent = '#ff7a1a' }: IconProps) {
  const id = useMemo(() => gradId('ticket'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.34} cy={0.32} />
      <Path d="M3 8c0-1.1.9-2 2-2h14a2 2 0 0 1 2 2v2.2a1.8 1.8 0 0 0 0 3.6V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.2a1.8 1.8 0 0 0 0-3.6Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M14.6 6.6v10.8" stroke={shade(accent, -56)} strokeWidth="1.3" strokeDasharray="2 2.2" />
      <Polygon points="8.6,8.9 9.6,10.9 11.8,11.1 10.2,12.6 10.7,14.7 8.6,13.6 6.5,14.7 7,12.6 5.4,11.1 7.6,10.9" fill={shade(accent, 66)} stroke={shade(accent, -50)} strokeWidth="0.6" strokeLinejoin="round" />
      {/* bottom bounce light */}
      <Path d="M5.4 16.8c2.1.4 4.3.6 6.6.6s4.5-.2 6.6-.6" fill="none" stroke={shade(accent, 44)} strokeWidth="1.1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={7.6} cy={7.9} rx={2.3} ry={1.1} rot={-10} o={0.42} />
      <Gleam cx={17.3} cy={8.1} r={0.65} />
    </Svg>
  );
}
