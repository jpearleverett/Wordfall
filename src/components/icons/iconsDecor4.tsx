/**
 * Decoration illustrations, part 4 — ornaments B (arcade, art, science,
 * nautical, monuments). Same recipe as iconsDecor.tsx.
 */
import React, { useMemo } from 'react';
import Svg, {
  Circle, Ellipse, G, Path, Rect,
} from 'react-native-svg';
import { IconProps, VB, BodyGrad, DuoGrad, gradId, rim, shade, HILITE, HILITE_SOFT } from './IconBase';
import { Ground, GlowGrad, BRASS, WOOD } from './iconsDecor';

/** Retro arcade cabinet: glowing marquee, CRT screen, joystick deck. */
export function RetroArcadeIcon({ size = 24, accent = '#7c4dbf' }: IconProps) {
  const cab = useMemo(() => gradId('arcB'), []);
  const glow = useMemo(() => gradId('arcG'), []);
  const SCREEN = '#31e8d8';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={cab} color={accent} />
      <GlowGrad id={glow} color={SCREEN} />
      <Ground rx={6.6} cy={21.7} ry={1} />
      {/* cabinet body */}
      <Path d="M6.2 21V4.2c0-.9.6-1.5 1.5-1.5h8.6c.9 0 1.5.6 1.5 1.5V21Z" fill={`url(#${cab})`} stroke={rim(accent)} strokeWidth="1.1" strokeLinejoin="round" />
      <Path d="M6.9 4v16.8M17.1 4v16.8" stroke={shade(accent, -34)} strokeWidth="0.5" />
      {/* marquee */}
      <Rect x="7.4" y="3.6" width="9.2" height="2.3" rx="0.4" fill="#ffb800" stroke={rim('#ffb800')} strokeWidth="0.7" />
      <Path d="M8.4 4.75h2M11.2 4.75h1.6M13.6 4.75h2" stroke="#8a4a00" strokeWidth="0.7" strokeLinecap="round" />
      {/* screen bezel + CRT */}
      <Rect x="7.6" y="6.7" width="8.8" height="6.4" rx="0.6" fill="#181030" stroke={rim(accent)} strokeWidth="0.7" />
      <Rect x="8.4" y="7.4" width="7.2" height="5" rx="0.4" fill="#0c2438" stroke={shade(SCREEN, -60)} strokeWidth="0.5" />
      <Ellipse cx="12" cy="9.9" rx="4.4" ry="3" fill={`url(#${glow})`} opacity="0.55" />
      {/* pixel invader */}
      <G fill={SCREEN}>
        <Rect x="10.6" y="8.4" width="2.8" height="0.7" />
        <Rect x="9.9" y="9.1" width="4.2" height="0.7" />
        <Rect x="9.9" y="9.8" width="0.7" height="0.7" /><Rect x="13.4" y="9.8" width="0.7" height="0.7" />
        <Rect x="11.3" y="9.8" width="1.4" height="0.7" />
        <Rect x="10.6" y="10.5" width="0.7" height="0.7" /><Rect x="12.7" y="10.5" width="0.7" height="0.7" />
      </G>
      <Path d="M8.7 7.7l1.8-.2" stroke={HILITE_SOFT} strokeWidth="0.6" strokeLinecap="round" />
      {/* control deck */}
      <Path d="M7.6 13.5h8.8l.6 2.4H7Z" fill={shade(accent, -16)} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M9.6 14.6v-1.6" stroke="#e8e2f2" strokeWidth="0.7" strokeLinecap="round" />
      <Circle cx="9.6" cy="12.9" r="0.75" fill="#e8385f" stroke={rim('#e8385f')} strokeWidth="0.5" />
      <Circle cx="13.2" cy="14.7" r="0.65" fill="#ffb800" stroke={rim('#ffb800')} strokeWidth="0.5" />
      <Circle cx="15" cy="14.7" r="0.65" fill="#31c8e8" stroke={rim('#31c8e8')} strokeWidth="0.5" />
      {/* lower panel art */}
      <Rect x="8.2" y="16.9" width="7.6" height="3.4" rx="0.4" fill={shade(accent, -26)} stroke={rim(accent)} strokeWidth="0.7" />
      <Path d="M9.2 19.5l2-1.8 1.4 1 2.2-2" fill="none" stroke={SCREEN} strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Nature painting: gilt frame around sunlit hills and pines. */
export function PaintingForestIcon({ size = 24, accent = '#d9a441' }: IconProps) {
  const gold = useMemo(() => gradId('pforF'), []);
  const glow = useMemo(() => gradId('pforG'), []);
  const SKY_TOP = '#8fd0f0';
  const HILL = '#4fae62';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={gold} from={shade(accent, 46)} to={shade(accent, -50)} />
      <GlowGrad id={glow} color="#fff3b8" />
      {/* wall shadow + frame */}
      <Rect x="4.6" y="5" width="16.6" height="14.6" rx="1.2" fill="rgba(10,6,30,0.30)" />
      <Rect x="3.6" y="4" width="16.8" height="14.8" rx="1.2" fill={`url(#${gold})`} stroke={rim(accent)} strokeWidth="1.1" />
      <Rect x="5.3" y="5.7" width="13.4" height="11.4" fill="none" stroke={shade(accent, -46)} strokeWidth="0.8" />
      {/* sky + sun */}
      <Rect x="6.1" y="6.5" width="11.8" height="6.6" fill={SKY_TOP} />
      <Circle cx="15.4" cy="8.6" r="2.4" fill={`url(#${glow})`} />
      <Circle cx="15.4" cy="8.6" r="1.2" fill="#fff3b8" stroke="#ffd24d" strokeWidth="0.5" />
      <Path d="M7.4 7.7c.8-.5 1.7-.5 2.4 0M9.8 9.1c.7-.4 1.4-.4 2 0" stroke="rgba(255,255,255,0.85)" strokeWidth="0.75" strokeLinecap="round" fill="none" />
      {/* hills */}
      <Path d="M6.1 13.4c1.9-2.2 3.9-3.2 6-2.9 2.3.3 4.2 1.5 5.8 2.9v2.9H6.1Z" fill={shade(HILL, -22)} />
      <Path d="M6.1 14.6c2.2-1.6 4.4-2.2 6.7-1.7 1.9.4 3.6 1.2 5.1 2.4v1H6.1Z" fill={HILL} />
      {/* pines */}
      <Path d="M8.6 14.9l1.3-3 1.3 3Z" fill="#2c6e42" stroke="#1c4a2c" strokeWidth="0.5" strokeLinejoin="round" />
      <Rect x="9.65" y="14.8" width="0.5" height="1" fill={WOOD} />
      <Path d="M12.4 15.4l1.1-2.5 1.1 2.5Z" fill="#2c6e42" stroke="#1c4a2c" strokeWidth="0.5" strokeLinejoin="round" />
      <Rect x="13.25" y="15.3" width="0.5" height="0.9" fill={WOOD} />
      {/* birds + meadow flecks */}
      <Path d="M8.4 8.9c.3-.35.7-.35 1 0M10 8.2c.25-.3.6-.3.85 0" fill="none" stroke="#3a5a78" strokeWidth="0.5" strokeLinecap="round" />
      <Circle cx="8" cy="16.2" r="0.25" fill="#ffd24d" />
      <Circle cx="10.4" cy="16.6" r="0.25" fill="#f0709a" />
      <Circle cx="15.8" cy="16.3" r="0.25" fill="#ffd24d" />
      {/* corner rosettes */}
      <Circle cx="4.9" cy="5.3" r="0.5" fill={shade(accent, 40)} />
      <Circle cx="19.1" cy="5.3" r="0.5" fill={shade(accent, 40)} />
      <Circle cx="4.9" cy="17.5" r="0.5" fill={shade(accent, 40)} />
      <Circle cx="19.1" cy="17.5" r="0.5" fill={shade(accent, 40)} />
    </Svg>
  );
}

/** Lab equipment: bubbling flask, test-tube rack, rising vapors. */
export function LabEquipmentIcon({ size = 24, accent = '#4fd868' }: IconProps) {
  const brew = useMemo(() => gradId('labB'), []);
  const glow = useMemo(() => gradId('labG'), []);
  const GLASS = 'rgba(190,235,255,0.18)';
  const GLASS_RIM = '#9fd8e8';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={brew} from={shade(accent, 40)} to={shade(accent, -44)} />
      <GlowGrad id={glow} color={shade(accent, 66)} />
      <Ground rx={8.4} />
      <Ellipse cx="9.4" cy="15.2" rx="6.4" ry="4.6" fill={`url(#${glow})`} opacity="0.5" />
      {/* Erlenmeyer flask */}
      <Path d="M7.9 4.9h3.4v4.2l3.3 8.4c.4 1.1-.3 2.1-1.5 2.1H6.1c-1.2 0-1.9-1-1.5-2.1l3.3-8.4Z" fill={GLASS} stroke={GLASS_RIM} strokeWidth="0.9" strokeLinejoin="round" />
      <Rect x="7.5" y="4.3" width="4.2" height="1.1" rx="0.5" fill={GLASS} stroke={GLASS_RIM} strokeWidth="0.7" />
      {/* liquid */}
      <Path d="M6.4 13.2h6.4l1.6 4.2c.4 1.1-.3 2.2-1.5 2.2H6.3c-1.2 0-1.9-1.1-1.5-2.2Z" fill={`url(#${brew})`} stroke={shade(accent, -52)} strokeWidth="0.6" strokeLinejoin="round" />
      <Ellipse cx="9.6" cy="13.3" rx="3.2" ry="0.6" fill={shade(accent, 34)} />
      {/* bubbles in + above */}
      <Circle cx="8.4" cy="16.4" r="0.55" fill={shade(accent, 56)} opacity="0.9" />
      <Circle cx="10.8" cy="17.4" r="0.4" fill={shade(accent, 56)} opacity="0.8" />
      <Circle cx="9.8" cy="15" r="0.35" fill={shade(accent, 70)} />
      <Circle cx="9.5" cy="3.1" r="0.5" fill="none" stroke={shade(accent, 40)} strokeWidth="0.5" opacity="0.9" />
      <Circle cx="10.6" cy="1.9" r="0.35" fill="none" stroke={shade(accent, 40)} strokeWidth="0.45" opacity="0.7" />
      <Path d="M6.1 6.1c-.5 2-.9 3.6-1.6 5.4" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" fill="none" />
      {/* test-tube rack */}
      <Rect x="14.2" y="11.4" width="7" height="1.2" rx="0.4" fill={WOOD} stroke={rim(WOOD)} strokeWidth="0.7" />
      <Rect x="14.5" y="12.6" width="1" height="7" fill={shade(WOOD, -16)} stroke={rim(WOOD)} strokeWidth="0.6" />
      <Rect x="19.9" y="12.6" width="1" height="7" fill={shade(WOOD, -16)} stroke={rim(WOOD)} strokeWidth="0.6" />
      <Rect x="14.2" y="19.4" width="7" height="1.2" rx="0.4" fill={WOOD} stroke={rim(WOOD)} strokeWidth="0.7" />
      {/* tubes */}
      <Path d="M16 10.2h1.5v6.6a.75.75 0 1 1-1.5 0Z" fill={GLASS} stroke={GLASS_RIM} strokeWidth="0.6" />
      <Path d="M16 13.6h1.5v3.2a.75.75 0 1 1-1.5 0Z" fill="#e85f9a" stroke="#a83364" strokeWidth="0.45" />
      <Path d="M18.4 10.2h1.5v6.6a.75.75 0 1 1-1.5 0Z" fill={GLASS} stroke={GLASS_RIM} strokeWidth="0.6" />
      <Path d="M18.4 14.6h1.5v2.2a.75.75 0 1 1-1.5 0Z" fill="#4fa8e8" stroke="#2c6ea8" strokeWidth="0.45" />
    </Svg>
  );
}

/** Ship's wheel: eight-spoked oak wheel with brass boss, on a mount. */
export function ShipWheelIcon({ size = 24, accent = '#a97142' }: IconProps) {
  const wood = useMemo(() => gradId('shwB'), []);
  const brass = useMemo(() => gradId('shwH'), []);
  const handle = (angle: number, i: number) => (
    <G key={i} transform={`rotate(${angle} 12 10.6)`}>
      <Rect x="11.45" y="1.1" width="1.1" height="3.1" rx="0.55" fill={`url(#${wood})`} stroke={rim(accent)} strokeWidth="0.55" />
      <Circle cx="12" cy="1.35" r="0.5" fill={shade(accent, 22)} stroke={rim(accent)} strokeWidth="0.4" />
    </G>
  );
  const spoke = (angle: number, i: number) => (
    <Rect key={i} x="11.6" y="4.2" width="0.8" height="12.8" rx="0.4" fill={`url(#${wood})`} stroke={rim(accent)} strokeWidth="0.5" transform={`rotate(${angle} 12 10.6)`} />
  );
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={wood} color={accent} />
      <DuoGrad id={brass} from={shade(BRASS, 46)} to={shade(BRASS, -50)} />
      <Ground rx={6.4} cy={21.6} />
      {/* display mount */}
      <Path d="M9.4 21.2c.4-1.6 1.3-2.6 2.6-2.6s2.2 1 2.6 2.6Z" fill={shade(accent, -22)} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" />
      {/* handles then rim so the rim overlaps their roots */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map(handle)}
      <Circle cx="12" cy="10.6" r="6.6" fill="none" stroke={`url(#${wood})`} strokeWidth="2" />
      <Circle cx="12" cy="10.6" r="7.6" fill="none" stroke={rim(accent)} strokeWidth="0.6" />
      <Circle cx="12" cy="10.6" r="5.6" fill="none" stroke={rim(accent)} strokeWidth="0.6" />
      <Path d="M7.6 6.9c1-1.2 2.3-2 3.8-2.2" fill="none" stroke={HILITE_SOFT} strokeWidth="0.8" strokeLinecap="round" />
      {/* spokes + boss */}
      {[0, 45, 90, 135].map(spoke)}
      <Circle cx="12" cy="10.6" r="2.2" fill={`url(#${brass})`} stroke={rim(BRASS)} strokeWidth="0.8" />
      <Circle cx="12" cy="10.6" r="0.85" fill={shade(BRASS, -30)} stroke={rim(BRASS)} strokeWidth="0.5" />
      <Path d="M10.9 9.7c.3-.35.7-.55 1.1-.6" fill="none" stroke={HILITE} strokeWidth="0.6" strokeLinecap="round" />
    </Svg>
  );
}

/** Gauntlet shield: steel heater shield, gold trim, armored-fist emblem. */
export function GauntletShieldIcon({ size = 24, accent = '#6a7a9c' }: IconProps) {
  const steel = useMemo(() => gradId('gshdB'), []);
  const gold = useMemo(() => gradId('gshdT'), []);
  const fist = useMemo(() => gradId('gshdF'), []);
  const FIST = '#b9c8e8';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={steel} color={accent} />
      <DuoGrad id={gold} from={shade(BRASS, 46)} to={shade(BRASS, -48)} />
      <DuoGrad id={fist} from={shade(FIST, 40)} to={shade(FIST, -48)} />
      <Ground rx={6} cy={21.7} ry={1} />
      {/* shield body */}
      <Path d="M12 1.9c2.7 1.5 5.6 2.2 8.4 2.1 0 8-2.6 13.6-8.4 17.5C6.2 17.6 3.6 12 3.6 4c2.8.1 5.7-.6 8.4-2.1Z" fill={`url(#${steel})`} stroke={rim(accent)} strokeWidth="1.1" strokeLinejoin="round" />
      <Path d="M12 3.8c2.2 1.1 4.5 1.7 6.8 1.8-.2 6.5-2.4 11.1-6.8 14.4C7.6 16.7 5.4 12.1 5.2 5.6c2.3-.1 4.6-.7 6.8-1.8Z" fill="none" stroke={`url(#${gold})`} strokeWidth="0.9" strokeLinejoin="round" />
      {/* rivets */}
      <Circle cx="12" cy="3" r="0.4" fill={shade(BRASS, 24)} />
      <Circle cx="5.1" cy="4.8" r="0.4" fill={shade(BRASS, 24)} />
      <Circle cx="18.9" cy="4.8" r="0.4" fill={shade(BRASS, 24)} />
      <Circle cx="6.7" cy="12.6" r="0.4" fill={shade(BRASS, 24)} />
      <Circle cx="17.3" cy="12.6" r="0.4" fill={shade(BRASS, 24)} />
      {/* gauntlet fist emblem */}
      <Rect x="9.4" y="12.2" width="5.2" height="2.2" rx="0.7" fill={`url(#${fist})`} stroke={rim(FIST)} strokeWidth="0.7" />
      <Path d="M9.8 8.1c0-.5.4-.9.9-.9s.9.4.9.9v4.2h-1.8Z" fill={`url(#${fist})`} stroke={rim(FIST)} strokeWidth="0.6" />
      <Path d="M11.9 7.5c0-.5.4-.9.9-.9s.9.4.9.9v4.8h-1.8Z" fill={`url(#${fist})`} stroke={rim(FIST)} strokeWidth="0.6" />
      <Path d="M14 8.3c0-.5.35-.85.85-.85s.85.35.85.85v4h-1.7Z" fill={`url(#${fist})`} stroke={rim(FIST)} strokeWidth="0.6" />
      <Path d="M9.4 10.4c-.8-.3-1.2-.9-1-1.6.15-.55.75-.8 1.3-.55l.9.5v2Z" fill={`url(#${fist})`} stroke={rim(FIST)} strokeWidth="0.6" strokeLinejoin="round" />
      <Path d="M10.2 13.3h3.6" stroke={shade(FIST, -36)} strokeWidth="0.5" strokeLinecap="round" />
      {/* edge light */}
      <Path d="M6.4 5.9c1.6-.3 3.2-.8 4.6-1.5" fill="none" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" />
    </Svg>
  );
}

/** Community statue: two bronze figures raising a shared star, on marble. */
export function CommunityStatueIcon({ size = 24, accent = '#c88a4a' }: IconProps) {
  const bronze = useMemo(() => gradId('cstB'), []);
  const marble = useMemo(() => gradId('cstM'), []);
  const glow = useMemo(() => gradId('cstG'), []);
  const MARBLE = '#9aa7c4';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={bronze} color={accent} />
      <BodyGrad id={marble} color={MARBLE} />
      <GlowGrad id={glow} color="#ffd24d" />
      <Ground rx={7.2} cy={21.7} ry={1} />
      {/* plinth */}
      <Rect x="5.6" y="19.6" width="12.8" height="1.8" rx="0.35" fill={`url(#${marble})`} stroke={rim(MARBLE)} strokeWidth="0.9" />
      <Rect x="6.6" y="16.9" width="10.8" height="2.7" fill={`url(#${marble})`} stroke={rim(MARBLE)} strokeWidth="0.9" />
      <Path d="M8 18.2c1.2.5 2.3.6 3.4.3M13.6 18c.9-.4 1.9-.4 2.9 0" fill="none" stroke={shade(MARBLE, -26)} strokeWidth="0.45" strokeLinecap="round" />
      {/* star glow + star */}
      <Circle cx="12" cy="4.6" r="3.8" fill={`url(#${glow})`} />
      <Path d="M12 2.1l.8 1.7 1.9.3-1.4 1.3.35 1.9L12 6.4l-1.65.9.35-1.9-1.4-1.3 1.9-.3Z" fill="#ffd24d" stroke="#c8871a" strokeWidth="0.6" strokeLinejoin="round" />
      {/* figures */}
      <G stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round">
        {/* left figure */}
        <Circle cx="9.3" cy="9.4" r="1.35" fill={`url(#${bronze})`} />
        <Path d="M8.2 10.9c1.4-.6 2.6-.3 3.2.8l.9 5.2H7.7l.1-4.6Z" fill={`url(#${bronze})`} />
        <Path d="M9.9 10.8c.5-1.6.9-3 1.2-4.5l.75.5c-.2 1.5-.5 2.9-.9 4.3Z" fill={`url(#${bronze})`} />
        {/* right figure */}
        <Circle cx="14.7" cy="9.4" r="1.35" fill={`url(#${bronze})`} />
        <Path d="M15.8 10.9c-1.4-.6-2.6-.3-3.2.8l-.9 5.2h4.6l-.1-4.6Z" fill={`url(#${bronze})`} />
        <Path d="M14.1 10.8c-.5-1.6-.9-3-1.2-4.5l-.75.5c.2 1.5.5 2.9.9 4.3Z" fill={`url(#${bronze})`} />
      </G>
      <Path d="M8.4 8.6c.25-.35.6-.55 1-.6M13.8 8.6c.25-.35.6-.55 1-.6" fill="none" stroke={HILITE} strokeWidth="0.6" strokeLinecap="round" />
      <Path d="M9 14.2c1.9.7 4.1.7 6 0" fill="none" stroke={shade(accent, -36)} strokeWidth="0.5" strokeLinecap="round" />
    </Svg>
  );
}

/** Season throne: sunburst-back seat, laurel base — the seasonal crown seat. */
export function SeasonThroneIcon({ size = 24, accent = '#e8b13f' }: IconProps) {
  const gold = useMemo(() => gradId('sthrG'), []);
  const cush = useMemo(() => gradId('sthrC'), []);
  const TEAL = '#2f8f8f';
  const ray = (angle: number, i: number) => (
    <Path key={i} d="M12 7.8 10.9 2.6h2.2Z" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.55" strokeLinejoin="round" transform={`rotate(${angle} 12 7.8)`} />
  );
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={gold} from={shade(accent, 46)} to={shade(accent, -48)} />
      <BodyGrad id={cush} color={TEAL} />
      <Ground rx={8} cy={21.7} />
      {/* sunburst back */}
      {[-75, -50, -25, 0, 25, 50, 75].map(ray)}
      <Circle cx="12" cy="7.8" r="3.4" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.9" />
      <Circle cx="12" cy="7.8" r="1.9" fill={shade(accent, 30)} stroke={rim(BRASS)} strokeWidth="0.6" />
      <Path d="M10.9 6.9c.3-.4.7-.6 1.1-.7" fill="none" stroke={HILITE} strokeWidth="0.6" strokeLinecap="round" />
      {/* seat back panel + arms */}
      <Rect x="7.6" y="10.4" width="8.8" height="6" rx="0.8" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="1" />
      <Rect x="5.2" y="11.8" width="2.4" height="6.4" rx="1" fill={shade(accent, -18)} stroke={rim(BRASS)} strokeWidth="0.9" />
      <Rect x="16.4" y="11.8" width="2.4" height="6.4" rx="1" fill={shade(accent, -18)} stroke={rim(BRASS)} strokeWidth="0.9" />
      <Circle cx="6.4" cy="11.6" r="0.85" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.6" />
      <Circle cx="17.6" cy="11.6" r="0.85" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.6" />
      {/* teal cushion */}
      <Rect x="7.8" y="13.6" width="8.4" height="2.9" rx="1.1" fill={`url(#${cush})`} stroke={rim(TEAL)} strokeWidth="0.9" />
      <Path d="M9 15h6" stroke={shade(TEAL, -32)} strokeWidth="0.55" strokeLinecap="round" />
      {/* stepped base + laurel sprigs */}
      <Rect x="6" y="18.2" width="12" height="1.7" rx="0.4" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.8" />
      <Rect x="4.8" y="19.9" width="14.4" height="1.7" rx="0.4" fill={shade(accent, -26)} stroke={rim(BRASS)} strokeWidth="0.8" />
      <Path d="M7 19.1c-.9-.3-1.4-.8-1.6-1.6.8.1 1.4.5 1.8 1.1M17 19.1c.9-.3 1.4-.8 1.6-1.6-.8.1-1.4.5-1.8 1.1" fill="#3f8f63" stroke="#245c3a" strokeWidth="0.45" strokeLinejoin="round" />
    </Svg>
  );
}

/** Ocean globe: a living sea inside a glass sphere, on a coral stand. */
export function OceanGlobeIcon({ size = 24, accent = '#31b8e8' }: IconProps) {
  const water = useMemo(() => gradId('oglB'), []);
  const coral = useMemo(() => gradId('oglS'), []);
  const glow = useMemo(() => gradId('oglG'), []);
  const CORAL = '#e8735f';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={water} from={shade(accent, 52)} to={shade(accent, -56)} />
      <BodyGrad id={coral} color={CORAL} />
      <GlowGrad id={glow} color={shade(accent, 70)} />
      <Ground rx={5.8} />
      <Ellipse cx="12" cy="9.9" rx="8.6" ry="8" fill={`url(#${glow})`} opacity="0.45" />
      {/* coral stand */}
      <Ellipse cx="12" cy="20.3" rx="4.4" ry="1.2" fill={`url(#${coral})`} stroke={rim(CORAL)} strokeWidth="0.8" />
      <Path d="M12 19.6c-.5-1-.4-1.9.2-2.9M12 19.6c-1.2-.4-1.9-1.2-2.1-2.4M12 19.6c1.2-.4 1.9-1.2 2.1-2.4" fill="none" stroke={shade(CORAL, -18)} strokeWidth="0.9" strokeLinecap="round" />
      {/* glass sphere */}
      <Circle cx="12" cy="9.9" r="6.6" fill="rgba(190,235,255,0.10)" stroke="#9fd8e8" strokeWidth="0.95" />
      {/* sea inside */}
      <Path d="M5.9 11.6c1.3-1 2.5-1 3.7-.2 1.3.9 2.6.9 3.9 0 1.3-.9 2.6-.9 3.9 0 .3.2.6.4.8.6a6.6 6.6 0 0 1-12.6 1.6c.1-.7.2-1.4.3-2Z" fill={`url(#${water})`} />
      <Path d="M6.4 11.4c1.1-.8 2.2-.8 3.3 0M11 11.2c1.1-.8 2.2-.8 3.3 0" fill="none" stroke={shade(accent, 60)} strokeWidth="0.6" strokeLinecap="round" />
      {/* fish + bubbles */}
      <Path d="M9.4 14.2c.8-.6 1.6-.6 2.3 0-.7.6-1.5.6-2.3 0Z" fill="#ffd24d" stroke="#c8871a" strokeWidth="0.4" />
      <Path d="M9.4 14.2l-.8-.55v1.1Z" fill="#ffd24d" stroke="#c8871a" strokeWidth="0.4" strokeLinejoin="round" />
      <Circle cx="14.6" cy="13.4" r="0.35" fill="#ffffff" opacity="0.8" />
      <Circle cx="15.3" cy="12.3" r="0.25" fill="#ffffff" opacity="0.65" />
      {/* glass highlight + surface glint */}
      <Path d="M8.1 6.9c.8-1.3 2-2.1 3.5-2.4" fill="none" stroke={HILITE} strokeWidth="1.1" strokeLinecap="round" />
      <Path d="M15.6 6.4c.5.5.9 1.1 1.1 1.7" fill="none" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" />
    </Svg>
  );
}

/** Nature plaque: carved oak shield, enamel leaf, vine border, hung on cord. */
export function NaturePlaqueIcon({ size = 24, accent = '#a97142' }: IconProps) {
  const oak = useMemo(() => gradId('nplB'), []);
  const leaf = useMemo(() => gradId('nplL'), []);
  const LEAF = '#4fae62';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={oak} color={accent} />
      <DuoGrad id={leaf} from={shade(LEAF, 40)} to={shade(LEAF, -40)} />
      {/* hanging cord + nail */}
      <Circle cx="12" cy="1.6" r="0.6" fill={BRASS} stroke={rim(BRASS)} strokeWidth="0.5" />
      <Path d="M12 1.9 7.4 5.6M12 1.9l4.6 3.7" stroke={shade(WOOD, -22)} strokeWidth="0.7" strokeLinecap="round" />
      {/* wall shadow + wooden shield */}
      <Path d="M13 6.4c2.6 0 5 .8 7 2 0 5.6-2.4 9.6-7 12.4-4.6-2.8-7-6.8-7-12.4 2-1.2 4.4-2 7-2Z" fill="rgba(10,6,30,0.30)" />
      <Path d="M12 5.6c2.6 0 5 .8 7 2 0 5.6-2.4 9.6-7 12.4-4.6-2.8-7-6.8-7-12.4 2-1.2 4.4-2 7-2Z" fill={`url(#${oak})`} stroke={rim(accent)} strokeWidth="1.1" strokeLinejoin="round" />
      {/* bark ring + grain */}
      <Path d="M12 7.1c2.1 0 4 .6 5.6 1.6-.1 4.4-2 7.6-5.6 9.9-3.6-2.3-5.5-5.5-5.6-9.9 1.6-1 3.5-1.6 5.6-1.6Z" fill="none" stroke={shade(accent, -30)} strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M7.5 9.2c.5 3 1.6 5.4 3.3 7.2" fill="none" stroke={shade(accent, -22)} strokeWidth="0.45" strokeLinecap="round" />
      <Path d="M7.9 8.1c1.2-.7 2.6-1.1 4.1-1.2" fill="none" stroke={HILITE_SOFT} strokeWidth="0.8" strokeLinecap="round" />
      {/* enamel leaf emblem */}
      <Path d="M12 8.6c2.3 1.2 3.3 2.9 3 5.1-.25 1.8-1.4 3-3 3.7-1.6-.7-2.75-1.9-3-3.7-.3-2.2.7-3.9 3-5.1Z" fill={`url(#${leaf})`} stroke={shade(LEAF, -52)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M12 9.6v6.6M12 11.2l-1.6-.9M12 11.2l1.6-.9M12 13.2l-1.9-.8M12 13.2l1.9-.8" fill="none" stroke={shade(LEAF, -46)} strokeWidth="0.55" strokeLinecap="round" />
      <Path d="M10.5 10.1c.4-.5.9-.9 1.5-1.2" fill="none" stroke={shade(LEAF, 56)} strokeWidth="0.6" strokeLinecap="round" />
      {/* vine flourishes */}
      <Path d="M8.4 17.2c.9.9 1.9 1.6 3 2.2M15.6 17.2c-.9.9-1.9 1.6-3 2.2" fill="none" stroke={shade(LEAF, -10)} strokeWidth="0.6" strokeLinecap="round" />
      <Circle cx="8.9" cy="17.7" r="0.35" fill={LEAF} />
      <Circle cx="15.1" cy="17.7" r="0.35" fill={LEAF} />
    </Svg>
  );
}
