/**
 * Core game icons — currency, boosters, rewards, status. See IconBase for
 * the shared material recipe. All icons draw in a 24×24 viewBox.
 */
import React, { useMemo } from 'react';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import { IconProps, VB, BodyGrad, DuoGrad, gradId, rim, shade, HILITE, HILITE_SOFT } from './IconBase';

export function CoinIcon({ size = 24, accent = '#ffb800' }: IconProps) {
  const id = useMemo(() => gradId('coin'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Circle cx="12" cy="12" r="10" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" />
      <Circle cx="12" cy="12" r="6.6" fill="none" stroke={shade(accent, -40)} strokeWidth="1.3" />
      <Path d="M12 8.2v7.6M9.8 10.2c0-1 1-1.6 2.2-1.6s2.2.6 2.2 1.5c0 2.4-4.4 1.5-4.4 3.9 0 .9 1 1.6 2.2 1.6s2.2-.6 2.2-1.6" stroke={shade(accent, -66)} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <Path d="M6 7.4c1.3-1.7 3.4-2.8 5.6-2.9" stroke={HILITE} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function GemIcon({ size = 24, accent = '#7c5cff' }: IconProps) {
  const id = useMemo(() => gradId('gem'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M6.2 4h11.6L22 9.4 12 21 2 9.4Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M2 9.4h20M8.6 9.4 12 21l3.4-11.6M6.2 4l2.4 5.4M17.8 4l-2.4 5.4" stroke={shade(accent, -52)} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
      <Path d="M7.2 5.2 9 8.4" stroke={HILITE} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}

export function HintBulbIcon({ size = 24, accent = '#ffd24d' }: IconProps) {
  const id = useMemo(() => gradId('bulb'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M12 2.6a6.8 6.8 0 0 1 3.7 12.5c-.7.5-1.1 1.1-1.1 1.9h-5.2c0-.8-.4-1.4-1.1-1.9A6.8 6.8 0 0 1 12 2.6Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M10 9.2l2 2.2 2-2.2" stroke={shade(accent, -70)} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 11.4V17" stroke={shade(accent, -70)} strokeWidth="1.4" strokeLinecap="round" />
      <Rect x="9.4" y="18.2" width="5.2" height="1.7" rx="0.85" fill={shade(accent, -30)} stroke={rim(accent)} strokeWidth="1" />
      <Rect x="10" y="20.6" width="4" height="1.5" rx="0.75" fill={shade(accent, -55)} stroke={rim(accent)} strokeWidth="1" />
      <Path d="M8.3 5.4c.9-.9 2-1.5 3.2-1.6" stroke={HILITE} strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

const STAR_PTS = '12,2.4 14.9,8.6 21.6,9.4 16.7,14 18,20.7 12,17.4 6,20.7 7.3,14 2.4,9.4 9.1,8.6';

export function StarIcon({ size = 24, accent = '#ffb800' }: IconProps) {
  const id = useMemo(() => gradId('star'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Polygon points={STAR_PTS} fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M9.2 8.9 12 3.6" stroke={HILITE} strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  );
}

/** 8-point sparkle burst — the set's generic "special" mark and fallback. */
export function SparkleIcon({ size = 24, accent = '#c84dff' }: IconProps) {
  const id = useMemo(() => gradId('spark'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M12 2c.9 4.3 2 5.9 5.4 6.6C14 9.3 12.9 11 12 15.2 11.1 11 10 9.3 6.6 8.6 10 7.9 11.1 6.3 12 2Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.2" strokeLinejoin="round" />
      <Path d="M18.4 13.2c.5 2.4 1.1 3.3 3 3.7-1.9.4-2.5 1.3-3 3.7-.5-2.4-1.1-3.3-3-3.7 1.9-.4 2.5-1.3 3-3.7Z" fill={shade(accent, 40)} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Circle cx="6.4" cy="17.4" r="1.7" fill={shade(accent, 70)} stroke={rim(accent)} strokeWidth="1" />
    </Svg>
  );
}

export function TrophyIcon({ size = 24, accent = '#ffb800' }: IconProps) {
  const id = useMemo(() => gradId('trophy'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M7 3h10v6.2a5 5 0 0 1-10 0Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M7 4.6H3.6c0 3.4 1.4 5.4 3.8 5.8M17 4.6h3.4c0 3.4-1.4 5.4-3.8 5.8" fill="none" stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M12 14.2v3" stroke={shade(accent, -30)} strokeWidth="2.2" />
      <Path d="M8.6 20.8c0-2 1.5-3.4 3.4-3.4s3.4 1.4 3.4 3.4Z" fill={shade(accent, -20)} stroke={rim(accent)} strokeWidth="1.3" strokeLinejoin="round" />
      <Path d="M8.6 4.4c.8-.5 1.9-.8 3-.8" stroke={HILITE} strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

const MEDAL_COLORS: Record<string, string> = { gold: '#ffb800', silver: '#c9d2e8', bronze: '#d0854a' };

export function MedalIcon({ size = 24, accent, metal = 'gold' }: IconProps & { metal?: 'gold' | 'silver' | 'bronze' }) {
  const c = accent ?? MEDAL_COLORS[metal];
  const id = useMemo(() => gradId('medal'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={c} />
      <Path d="M8 2h3l1.6 5L14 2h3l-3.4 8h-3.2Z" fill={shade(c, -35)} stroke={rim(c)} strokeWidth="1.2" strokeLinejoin="round" />
      <Circle cx="12" cy="15.4" r="6.2" fill={`url(#${id})`} stroke={rim(c)} strokeWidth="1.4" />
      <Circle cx="12" cy="15.4" r="4" fill="none" stroke={shade(c, -44)} strokeWidth="1.2" />
      <Polygon points="12,12.6 12.9,14.5 15,14.7 13.5,16.1 13.9,18.2 12,17.2 10.1,18.2 10.5,16.1 9,14.7 11.1,14.5" fill={shade(c, 60)} />
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
      <Path d="M12 2.4c.6 3.4 2.4 4.7 4.4 6.9 1.6 1.8 2.4 3.5 2.4 5.5A6.8 6.8 0 0 1 12 21.6a6.8 6.8 0 0 1-6.8-6.8c0-2.6 1.3-4.4 2.9-6.1-.1 1.5.3 2.5 1.3 3.2-.3-3.7 1-6.3 2.6-9.5Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M12 10.8c1.9 2 3 3.2 3 5a3 3 0 0 1-6 0c0-1.8 1.1-3 3-5Z" fill={`url(#${core})`} />
    </Svg>
  );
}

export function BoltIcon({ size = 24, accent = '#00e5ff' }: IconProps) {
  const id = useMemo(() => gradId('bolt'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M13.6 2 5.4 13.4h4.8L10.4 22l8.2-11.4h-4.8Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M12.4 4.6 8.4 10.2" stroke={HILITE} strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  );
}

export function UndoIcon({ size = 24, accent = '#00e5ff' }: IconProps) {
  const id = useMemo(() => gradId('undo'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M12.6 5a8 8 0 0 1 0 16 8 8 0 0 1-7.4-4.9" fill="none" stroke={`url(#${id})`} strokeWidth="2.6" strokeLinecap="round" />
      <Polygon points="12.9,1.2 6.4,5 12.9,8.8" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
    </Svg>
  );
}

export function ShuffleIcon({ size = 24, accent = '#ff7a1a' }: IconProps) {
  const id = useMemo(() => gradId('shuf'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M3 7.4h3.4c4.8 0 6.4 9.2 11.2 9.2H20M3 16.6h3.4c1.9 0 3.2-1.4 4.3-3M20 7.4h-2.4c-1.9 0-3.2 1.4-4.3 3" fill="none" stroke={`url(#${id})`} strokeWidth="2.3" strokeLinecap="round" />
      <Polygon points="18.6,4.6 22.6,7.4 18.6,10.2" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
      <Polygon points="18.6,13.8 22.6,16.6 18.6,19.4" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
    </Svg>
  );
}

export function EyeIcon({ size = 24, accent = '#00f5d4' }: IconProps) {
  const id = useMemo(() => gradId('eye'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M2 12c2.6-4.6 6-6.9 10-6.9S19.4 7.4 22 12c-2.6 4.6-6 6.9-10 6.9S4.6 16.6 2 12Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="3.9" fill={shade(accent, -78)} stroke={rim(accent)} strokeWidth="1" />
      <Circle cx="13.3" cy="10.7" r="1.2" fill={HILITE} />
    </Svg>
  );
}

export function CheckIcon({ size = 24, accent = '#00e676' }: IconProps) {
  const id = useMemo(() => gradId('check'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M4 13.2 9.4 18.6 20 6.4" fill="none" stroke={`url(#${id})`} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CrossIcon({ size = 24, accent = '#ff4466' }: IconProps) {
  const id = useMemo(() => gradId('cross'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M6 6l12 12M18 6 6 18" stroke={`url(#${id})`} strokeWidth="3.2" strokeLinecap="round" />
    </Svg>
  );
}

export function LockIcon({ size = 24, accent = '#c9d2e8' }: IconProps) {
  const id = useMemo(() => gradId('lock'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M7.4 10V7.6a4.6 4.6 0 0 1 9.2 0V10" fill="none" stroke={shade(accent, -20)} strokeWidth="2.4" />
      <Rect x="4.8" y="9.8" width="14.4" height="11" rx="2.6" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" />
      <Circle cx="12" cy="14.6" r="1.7" fill={shade(accent, -80)} />
      <Path d="M12 15.6v2.6" stroke={shade(accent, -80)} strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}

export function CrownIcon({ size = 24, accent = '#ffb800' }: IconProps) {
  const id = useMemo(() => gradId('crown'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M3.4 8.2 7.6 12l4.4-7 4.4 7 4.2-3.8-1.6 10H5Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Rect x="5" y="18.6" width="14" height="2.4" rx="1.2" fill={shade(accent, -25)} stroke={rim(accent)} strokeWidth="1.1" />
      <Circle cx="12" cy="13.6" r="1.4" fill="#ff2d95" stroke={rim(accent)} strokeWidth="0.8" />
      <Circle cx="7.9" cy="14.6" r="1" fill="#00e5ff" stroke={rim(accent)} strokeWidth="0.7" />
      <Circle cx="16.1" cy="14.6" r="1" fill="#00e5ff" stroke={rim(accent)} strokeWidth="0.7" />
    </Svg>
  );
}

export function GiftIcon({ size = 24, accent = '#ff2d95' }: IconProps) {
  const id = useMemo(() => gradId('gift'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Rect x="4" y="10.6" width="16" height="10.4" rx="1.8" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" />
      <Rect x="3" y="6.8" width="18" height="4.4" rx="1.6" fill={shade(accent, 26)} stroke={rim(accent)} strokeWidth="1.4" />
      <Path d="M12 6.8V21M12 6.6C10 2.8 5.6 3.4 6.6 6c.6 1.6 3.2 1.2 5.4.6M12 6.6c2-3.8 6.4-3.2 5.4-.6-.6 1.6-3.2 1.2-5.4.6" fill="none" stroke="#ffd24d" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}

export function ChestIcon({ size = 24, accent = '#c98b3f' }: IconProps) {
  const id = useMemo(() => gradId('chest'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M4 10.2C4 6.8 7 4.6 12 4.6s8 2.2 8 5.6v1H4Z" fill={shade(accent, 22)} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Rect x="4" y="11.2" width="16" height="9" rx="1.6" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" />
      <Path d="M4 11.2h16" stroke={rim(accent)} strokeWidth="1.1" />
      <Rect x="10.4" y="9.4" width="3.2" height="5.4" rx="1" fill="#ffd24d" stroke={rim(accent)} strokeWidth="1.1" />
      <Circle cx="12" cy="12" r="0.8" fill={rim(accent)} />
    </Svg>
  );
}

export function HeartIcon({ size = 24, accent = '#ff4466' }: IconProps) {
  const id = useMemo(() => gradId('heart'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M12 20.6C6.2 16.4 3 13.2 3 9.4 3 6.6 5.2 4.6 7.8 4.6c1.7 0 3.2.8 4.2 2.3 1-1.5 2.5-2.3 4.2-2.3 2.6 0 4.8 2 4.8 4.8 0 3.8-3.2 7-9 11.2Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M6.2 7.2c.5-.6 1.2-1 2-1.1" stroke={HILITE} strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function WheelIcon({ size = 24, accent = '#c84dff' }: IconProps) {
  const id = useMemo(() => gradId('wheel'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Circle cx="12" cy="12.6" r="9" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" />
      <Path d="M12 3.6v18M3 12.6h18M5.6 6.2l12.8 12.8M18.4 6.2 5.6 19" stroke={shade(accent, -52)} strokeWidth="1.2" />
      <Circle cx="12" cy="12.6" r="2.6" fill="#ffd24d" stroke={rim(accent)} strokeWidth="1.1" />
      <Polygon points="12,0.4 14,3.4 10,3.4" fill="#ffd24d" stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
    </Svg>
  );
}

export function DiceIcon({ size = 24, accent = '#00e5ff' }: IconProps) {
  const id = useMemo(() => gradId('dice'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" />
      <Circle cx="8.2" cy="8.2" r="1.6" fill={shade(accent, -80)} />
      <Circle cx="15.8" cy="8.2" r="1.6" fill={shade(accent, -80)} />
      <Circle cx="12" cy="12" r="1.6" fill={shade(accent, -80)} />
      <Circle cx="8.2" cy="15.8" r="1.6" fill={shade(accent, -80)} />
      <Circle cx="15.8" cy="15.8" r="1.6" fill={shade(accent, -80)} />
    </Svg>
  );
}

export function CloverIcon({ size = 24, accent = '#35b892' }: IconProps) {
  const id = useMemo(() => gradId('clover'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <G stroke={rim(accent)} strokeWidth="1.1">
        <Circle cx="8.4" cy="8.4" r="4" fill={`url(#${id})`} />
        <Circle cx="15.6" cy="8.4" r="4" fill={`url(#${id})`} />
        <Circle cx="8.4" cy="15" r="4" fill={`url(#${id})`} />
        <Circle cx="15.6" cy="15" r="4" fill={`url(#${id})`} />
      </G>
      <Path d="M12 12.6c.4 3.4 1.4 5.8 3.6 8" fill="none" stroke={shade(accent, -55)} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

export function HourglassIcon({ size = 24, accent = '#ffd24d' }: IconProps) {
  const id = useMemo(() => gradId('hour'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M6 3h12M6 21h12M7.4 3c0 4 1.8 6.4 4.6 9-2.8 2.6-4.6 5-4.6 9M16.6 3c0 4-1.8 6.4-4.6 9 2.8 2.6 4.6 5 4.6 9" fill="none" stroke={shade(accent, -35)} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M9.4 6.2h5.2L12 9.6ZM12 15l2.8 4.2H9.2Z" fill={`url(#${id})`} />
    </Svg>
  );
}

export function TargetIcon({ size = 24, accent = '#ff4466' }: IconProps) {
  const id = useMemo(() => gradId('target'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Circle cx="12" cy="12" r="9.2" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" />
      <Circle cx="12" cy="12" r="5.9" fill="#f5f0ff" stroke={rim(accent)} strokeWidth="1" />
      <Circle cx="12" cy="12" r="2.7" fill={shade(accent, 10)} stroke={rim(accent)} strokeWidth="1" />
    </Svg>
  );
}

export function CalendarIcon({ size = 24, accent = '#00e5ff' }: IconProps) {
  const id = useMemo(() => gradId('cal'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Rect x="3.4" y="5" width="17.2" height="16" rx="3" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" />
      <Path d="M3.4 9.6h17.2" stroke={rim(accent)} strokeWidth="1.2" />
      <Path d="M8 2.8v3.4M16 2.8v3.4" stroke={shade(accent, -40)} strokeWidth="2" strokeLinecap="round" />
      <Path d="M9.4 14.4l2 2 3.4-3.8" fill="none" stroke={shade(accent, -78)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function BellIcon({ size = 24, accent = '#ffd24d' }: IconProps) {
  const id = useMemo(() => gradId('bell'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M12 3a6 6 0 0 1 6 6c0 3.6.9 5.3 2.1 6.6H3.9C5.1 14.3 6 12.6 6 9a6 6 0 0 1 6-6Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M9.6 18.6a2.5 2.5 0 0 0 4.8 0" fill="none" stroke={shade(accent, -30)} strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="12" cy="2.8" r="1.1" fill={shade(accent, -20)} stroke={rim(accent)} strokeWidth="0.8" />
    </Svg>
  );
}

export function KeyIcon({ size = 24, accent = '#ffb800' }: IconProps) {
  const id = useMemo(() => gradId('key'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Circle cx="8" cy="8" r="5" fill="none" stroke={`url(#${id})`} strokeWidth="2.6" />
      <Path d="M11.6 11.6 20 20M17 17l2.6-2.6M14.4 14.4l2.2-2.2" stroke={`url(#${id})`} strokeWidth="2.6" strokeLinecap="round" />
    </Svg>
  );
}

export function InfinityIcon({ size = 24, accent = '#c84dff' }: IconProps) {
  const id = useMemo(() => gradId('inf'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M12 12c-2-2.8-3.4-4.2-5.4-4.2a4.2 4.2 0 0 0 0 8.4c2 0 3.4-1.4 5.4-4.2Zm0 0c2 2.8 3.4 4.2 5.4 4.2a4.2 4.2 0 0 0 0-8.4c-2 0-3.4 1.4-5.4 4.2Z" fill="none" stroke={`url(#${id})`} strokeWidth="2.4" strokeLinecap="round" />
    </Svg>
  );
}

export function TicketIcon({ size = 24, accent = '#ff7a1a' }: IconProps) {
  const id = useMemo(() => gradId('ticket'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M3 8c0-1.1.9-2 2-2h14a2 2 0 0 1 2 2v2.2a1.8 1.8 0 0 0 0 3.6V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.2a1.8 1.8 0 0 0 0-3.6Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M14.6 6v12" stroke={shade(accent, -50)} strokeWidth="1.3" strokeDasharray="2 2.2" />
      <Polygon points="8.6,9.2 9.5,11 11.4,11.2 10,12.5 10.4,14.4 8.6,13.4 6.8,14.4 7.2,12.5 5.8,11.2 7.7,11" fill={shade(accent, 62)} />
    </Svg>
  );
}
