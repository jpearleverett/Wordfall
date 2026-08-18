/**
 * Decoration illustrations, part 3 — ornaments A (globes, timekeeping,
 * display pieces, event trophies). Same recipe as iconsDecor.tsx.
 */
import React, { useMemo } from 'react';
import Svg, {
  Circle, Ellipse, G, Path, Rect,
} from 'react-native-svg';
import { IconProps, VB, BodyGrad, DuoGrad, gradId, rim, shade, HILITE, HILITE_SOFT } from './IconBase';
import { Ground, GlowGrad, BRASS } from './iconsDecor';

/** World globe: blue ocean sphere, green continents, half-meridian stand. */
export function WorldGlobeIcon({ size = 24, accent = '#3a7bd8' }: IconProps) {
  const sea = useMemo(() => gradId('wglB'), []);
  const base = useMemo(() => gradId('wglS'), []);
  const LAND = '#4fae62';
  const DARK = '#33304a';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={sea} color={accent} />
      <BodyGrad id={base} color={DARK} />
      <Ground rx={5.8} cy={21.5} />
      {/* stand */}
      <Ellipse cx="12" cy="20.7" rx="4.4" ry="1.15" fill={`url(#${base})`} stroke={rim(DARK)} strokeWidth="0.9" />
      <Rect x="11.35" y="18.3" width="1.3" height="2.2" rx="0.4" fill={`url(#${base})`} stroke={rim(DARK)} strokeWidth="0.6" />
      {/* half-meridian arc */}
      <Path d="M12 2.2c4.7 0 8 3.6 8 8.2 0 4.7-3.3 8.2-8 8.2" fill="none" stroke={BRASS} strokeWidth="1.3" strokeLinecap="round" transform="rotate(14 12 10.4)" />
      {/* sphere */}
      <G transform="rotate(14 12 10.4)">
        <Circle cx="12" cy="10.4" r="6.7" fill={`url(#${sea})`} stroke={rim(accent)} strokeWidth="1" />
        {/* continents */}
        <Path d="M8.2 6.6c1.7-.9 3.3-.8 4.3.3.7.8.4 1.8-.7 2.3-.8.4-1 .9-.6 1.7.4.9-.1 1.6-1.1 1.6-1.4 0-2.6-.9-3.2-2.4-.5-1.3 0-2.7 1.3-3.5Z" fill={LAND} stroke={shade(LAND, -40)} strokeWidth="0.5" />
        <Path d="M14.4 10.6c1.5-.3 2.7.3 3.1 1.5.3 1-.2 2-1.3 2.5-1.3.6-2.5.1-3-1.1-.4-1.1.1-2.6 1.2-2.9Z" fill={LAND} stroke={shade(LAND, -40)} strokeWidth="0.5" />
        <Path d="M10.2 14.3c.8-.1 1.4.3 1.5 1 .1.7-.4 1.3-1.2 1.4-.8.1-1.4-.3-1.5-1-.1-.7.4-1.3 1.2-1.4Z" fill={shade(LAND, -12)} />
        <Path d="M15.2 5.3c.7-.2 1.3 0 1.6.6.2.5 0 1-.6 1.2-.7.3-1.3.1-1.6-.5-.2-.5 0-1.1.6-1.3Z" fill={shade(LAND, -12)} />
        {/* graticule + ice cap */}
        <Ellipse cx="12" cy="10.4" rx="6.7" ry="2.3" fill="none" stroke={shade(accent, 42)} strokeWidth="0.45" opacity="0.7" />
        <Path d="M10.1 4.2c1.2-.4 2.6-.4 3.8 0" stroke="#e8f4ff" strokeWidth="1" strokeLinecap="round" fill="none" />
        <Path d="M7 6.7c.9-1.2 2.1-2 3.5-2.4" fill="none" stroke={HILITE} strokeWidth="1.1" strokeLinecap="round" />
        {/* axis caps */}
        <Circle cx="12" cy="3.4" r="0.65" fill={shade(BRASS, 26)} stroke={rim(BRASS)} strokeWidth="0.5" />
        <Circle cx="12" cy="17.4" r="0.7" fill={shade(BRASS, 26)} stroke={rim(BRASS)} strokeWidth="0.5" />
      </G>
    </Svg>
  );
}

/** Hourglass: turned brass frame, glass bulbs, sand mid-fall. */
export function HourglassDecorIcon({ size = 24, accent = '#d9a441' }: IconProps) {
  const brass = useMemo(() => gradId('hgdB'), []);
  const SAND = '#f0c05a';
  const GLASS = 'rgba(190,235,255,0.16)';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={brass} from={shade(accent, 48)} to={shade(accent, -52)} />
      <Ground rx={6.2} />
      {/* frame discs */}
      <Rect x="5.8" y="2.2" width="12.4" height="1.9" rx="0.8" fill={`url(#${brass})`} stroke={rim(accent)} strokeWidth="0.8" />
      <Rect x="5.8" y="19" width="12.4" height="1.9" rx="0.8" fill={`url(#${brass})`} stroke={rim(accent)} strokeWidth="0.8" />
      {/* posts */}
      <Rect x="6.4" y="4.1" width="1.1" height="14.9" rx="0.5" fill={`url(#${brass})`} stroke={rim(accent)} strokeWidth="0.6" />
      <Rect x="16.5" y="4.1" width="1.1" height="14.9" rx="0.5" fill={`url(#${brass})`} stroke={rim(accent)} strokeWidth="0.6" />
      <Path d="M6.7 4.6v13.6" stroke={shade(accent, 56)} strokeWidth="0.35" />
      {/* glass */}
      <Path d="M8.6 4.1h6.8v2.8c0 2.4-1.7 3.6-2.6 4.4-.5.45-.5.95 0 1.4.9.8 2.6 2 2.6 4.4V20H8.6v-2.9c0-2.4 1.7-3.6 2.6-4.4.5-.45.5-.95 0-1.4-.9-.8-2.6-2-2.6-4.4Z" fill={GLASS} stroke="#9fd8e8" strokeWidth="0.85" strokeLinejoin="round" />
      {/* sand: top reservoir, stream, bottom pile */}
      <Path d="M9.6 5.2h4.8v1.6c0 1.5-1.1 2.4-2.4 3.3-1.3-.9-2.4-1.8-2.4-3.3Z" fill={SAND} stroke={shade(SAND, -48)} strokeWidth="0.5" strokeLinejoin="round" />
      <Path d="M12 11v6.4" stroke={SAND} strokeWidth="0.75" strokeLinecap="round" strokeDasharray="1.3 0.8" />
      <Path d="M9.3 19.2c.2-1.9 1.3-3 2.7-3s2.5 1.1 2.7 3Z" fill={SAND} stroke={shade(SAND, -48)} strokeWidth="0.5" strokeLinejoin="round" />
      <Path d="M10.4 5.8h3.2" stroke={shade(SAND, 46)} strokeWidth="0.6" strokeLinecap="round" />
      {/* glass sheen + finial */}
      <Path d="M9.3 5.4c-.3 1.9.2 3.2 1.3 4.4" fill="none" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M9.5 18.9c0-1.6.6-2.7 1.6-3.5" fill="none" stroke={HILITE_SOFT} strokeWidth="0.6" strokeLinecap="round" />
      <Circle cx="12" cy="1.5" r="0.75" fill={`url(#${brass})`} stroke={rim(accent)} strokeWidth="0.6" />
    </Svg>
  );
}

/** Golden bookshelf: gilded case, scroll pediment, jewel-toned tomes. */
export function GoldenShelfIcon({ size = 24, accent = '#e8b13f' }: IconProps) {
  const gold = useMemo(() => gradId('gshB'), []);
  const glow = useMemo(() => gradId('gshG'), []);
  const book = (x: number, y: number, w: number, h: number, c: string, i: number) => (
    <G key={i}>
      <Rect x={x} y={y} width={w} height={h} rx="0.35" fill={c} stroke={rim(c)} strokeWidth="0.6" />
      <Path d={`M${x + w / 2} ${y + 1.1}v${h - 2.2}`} stroke={shade(c, 42)} strokeWidth="0.4" />
    </G>
  );
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={gold} from={shade(accent, 46)} to={shade(accent, -50)} />
      <GlowGrad id={glow} color={shade(accent, 60)} />
      <Ground rx={7.6} cy={21.6} />
      <Ellipse cx="12" cy="12" rx="9.4" ry="8.6" fill={`url(#${glow})`} opacity="0.4" />
      {/* case */}
      <Rect x="5" y="4.6" width="14" height="16" rx="0.8" fill={`url(#${gold})`} stroke={rim(accent)} strokeWidth="1.1" />
      <Rect x="6.4" y="6" width="11.2" height="13.2" rx="0.4" fill="#2c1b4e" stroke={shade(accent, -46)} strokeWidth="0.7" />
      {/* pediment scrolls + finial */}
      <Path d="M5.4 4.6c.2-1.3 1-2 2.2-2.1 1 0 1.6.5 1.6 1.2 0 .55-.4.9-1 .9Z" fill={`url(#${gold})`} stroke={rim(accent)} strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M18.6 4.6c-.2-1.3-1-2-2.2-2.1-1 0-1.6.5-1.6 1.2 0 .55.4.9 1 .9Z" fill={`url(#${gold})`} stroke={rim(accent)} strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M12 1.3l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5Z" fill={shade(accent, 40)} stroke={rim(accent)} strokeWidth="0.4" />
      {/* shelves + books */}
      {book(7.1, 7.2, 1.8, 5, '#b5484d', 0)}
      {book(9.2, 7.8, 1.6, 4.4, '#3f5fa8', 1)}
      {book(11.1, 7.2, 1.9, 5, '#3f8f63', 2)}
      <G transform="rotate(11 15.6 10.2)">{book(14.7, 7.6, 1.7, 4.6, '#7c4dbf', 3)}</G>
      <Rect x="6.4" y="12.2" width="11.2" height="0.9" fill={`url(#${gold})`} stroke={shade(accent, -46)} strokeWidth="0.5" />
      {book(7.4, 13.8, 1.7, 5.4, '#7c4dbf', 4)}
      {book(9.4, 14.4, 1.9, 4.8, '#c8763a', 5)}
      {book(11.6, 13.8, 1.6, 5.4, '#3f5fa8', 6)}
      {book(13.5, 14.6, 1.8, 4.6, '#b5484d', 7)}
      {book(15.6, 14, 1.5, 5.2, '#3f8f63', 8)}
      {/* gilt sheen */}
      <Path d="M5.7 5.4v14.4" stroke={shade(accent, 60)} strokeWidth="0.5" />
      <Path d="M6 5.2h4.6" stroke={HILITE} strokeWidth="0.8" strokeLinecap="round" />
    </Svg>
  );
}

/** Crystal display case: glass vitrine on dark plinth, gem on a riser. */
export function CrystalDisplayIcon({ size = 24, accent = '#4fc8f0' }: IconProps) {
  const plinth = useMemo(() => gradId('cdisP'), []);
  const gem = useMemo(() => gradId('cdisJ'), []);
  const glow = useMemo(() => gradId('cdisG'), []);
  const DARK = '#33304a';
  const JEWEL = '#e84fd0';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={plinth} color={DARK} />
      <DuoGrad id={gem} from={shade(JEWEL, 62)} to={shade(JEWEL, -48)} />
      <GlowGrad id={glow} color={shade(JEWEL, 70)} />
      <Ground rx={7} cy={21.7} ry={1} />
      {/* plinth */}
      <Rect x="5.4" y="18.9" width="13.2" height="2.3" rx="0.5" fill={`url(#${plinth})`} stroke={rim(DARK)} strokeWidth="0.9" />
      <Rect x="6.3" y="16.9" width="11.4" height="2" rx="0.4" fill={shade(DARK, 16)} stroke={rim(DARK)} strokeWidth="0.8" />
      <Path d="M6.4 20h4.4" stroke={HILITE_SOFT} strokeWidth="0.6" strokeLinecap="round" />
      {/* inner glow */}
      <Ellipse cx="12" cy="10.6" rx="5.6" ry="5.2" fill={`url(#${glow})`} opacity="0.7" />
      {/* glass case */}
      <Rect x="6.9" y="3.4" width="10.2" height="13.5" rx="0.9" fill="rgba(190,235,255,0.13)" stroke="#9fd8e8" strokeWidth="0.9" />
      <Path d="M6.9 5.2h10.2" stroke="#9fd8e8" strokeWidth="0.5" opacity="0.7" />
      <Path d="M8 4.4c-.4 3.6-.4 7.6 0 11.6" fill="none" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" />
      <Circle cx="12" cy="2.9" r="0.65" fill={BRASS} stroke={rim(BRASS)} strokeWidth="0.5" />
      {/* riser + gem */}
      <Rect x="9.9" y="14" width="4.2" height="2.9" rx="0.4" fill={shade(DARK, 26)} stroke={rim(DARK)} strokeWidth="0.7" />
      <Path d="M12 6.2l3.2 2.6-1.2 4.3h-4l-1.2-4.3Z" fill={`url(#${gem})`} stroke={rim(JEWEL)} strokeWidth="0.85" strokeLinejoin="round" />
      <Path d="M8.8 8.8h6.4M12 6.2l-1.3 2.6 1.3 4.3 1.3-4.3Z" fill="none" stroke={shade(JEWEL, -52)} strokeWidth="0.5" strokeLinejoin="round" />
      <Path d="M10.4 7.5l1-.8" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" />
      {/* sparkles */}
      <Path d="M15.5 5.4l.35.85.85.35-.85.35-.35.85-.35-.85-.85-.35.85-.35Z" fill="#ffffff" opacity="0.9" />
      <Circle cx="9.1" cy="12.4" r="0.3" fill="#ffffff" opacity="0.7" />
    </Svg>
  );
}

/** Speed trophy: winged silver cup with a bolt mark, streaking forward. */
export function SpeedTrophyIcon({ size = 24, accent = '#b9c8e8' }: IconProps) {
  const silver = useMemo(() => gradId('sptB'), []);
  const wing = useMemo(() => gradId('sptW'), []);
  const DARK = '#33304a';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={silver} from={shade(accent, 44)} to={shade(accent, -58)} />
      <DuoGrad id={wing} from={shade(accent, 60)} to={shade(accent, -30)} />
      <Ground rx={6.8} cy={21.6} />
      {/* speed streaks */}
      <Path d="M2.6 7.8h3.2M1.8 10.2h3.4M2.6 12.6h2.6" stroke={shade(accent, 20)} strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
      {/* wings */}
      <Path d="M7.6 7.4C5.6 6.6 4 6.8 2.8 8c1 .3 1.7.8 2.1 1.5-.9.2-1.6.6-2.1 1.3 1.9.7 3.7.4 4.8-.7Z" fill={`url(#${wing})`} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M16.4 7.4c2-.8 3.6-.6 4.8.6-1 .3-1.7.8-2.1 1.5.9.2 1.6.6 2.1 1.3-1.9.7-3.7.4-4.8-.7Z" fill={`url(#${wing})`} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" />
      {/* cup */}
      <Path d="M7.9 4.4h8.2v3.9c0 3-1.7 5-4.1 5s-4.1-2-4.1-5Z" fill={`url(#${silver})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Ellipse cx="12" cy="4.4" rx="4.1" ry="0.95" fill={shade(accent, 30)} stroke={rim(accent)} strokeWidth="0.7" />
      {/* bolt mark */}
      <Path d="M12.7 6l-2 3h1.4l-.8 2.6 2.2-3.3h-1.4Z" fill="#ffd24d" stroke="#c8871a" strokeWidth="0.5" strokeLinejoin="round" />
      <Path d="M8.7 5.5c-.1 2 .3 3.6 1.2 4.9" fill="none" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" />
      {/* stem + base + plaque */}
      <Path d="M10.9 13.2h2.2l.5 2.4h-3.2Z" fill={`url(#${silver})`} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" />
      <Rect x="7.8" y="15.6" width="8.4" height="1.8" rx="0.5" fill={`url(#${silver})`} stroke={rim(accent)} strokeWidth="0.8" />
      <Rect x="6.8" y="17.4" width="10.4" height="3.4" rx="0.7" fill={DARK} stroke={rim(DARK)} strokeWidth="0.9" />
      <Rect x="9" y="18.3" width="6" height="1.6" rx="0.3" fill={`url(#${silver})`} stroke={rim(accent)} strokeWidth="0.5" />
      <Path d="M9.9 19.1h4.2" stroke={shade(accent, -44)} strokeWidth="0.45" strokeLinecap="round" />
    </Svg>
  );
}

/** Diamond plaque: polished wall tablet, gilt border, mounted brilliant. */
export function DiamondPlaqueIcon({ size = 24, accent = '#3a3560' }: IconProps) {
  const slab = useMemo(() => gradId('dplB'), []);
  const ice = useMemo(() => gradId('dplD'), []);
  const glow = useMemo(() => gradId('dplG'), []);
  const ICE = '#bfe9ff';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={slab} color={accent} />
      <DuoGrad id={ice} from="#ffffff" to="#6fb8e8" />
      <GlowGrad id={glow} color="#dff4ff" />
      {/* wall shadow + tablet */}
      <Rect x="5.4" y="3.6" width="14.6" height="17.4" rx="1.4" fill="rgba(10,6,30,0.30)" />
      <Rect x="4.4" y="2.6" width="14.8" height="17.6" rx="1.4" fill={`url(#${slab})`} stroke={rim(accent)} strokeWidth="1.1" />
      <Rect x="5.9" y="4.1" width="11.8" height="14.6" rx="0.8" fill="none" stroke={BRASS} strokeWidth="0.8" />
      {/* corner screws */}
      <Circle cx="6.3" cy="4.5" r="0.5" fill={shade(BRASS, 26)} stroke={rim(BRASS)} strokeWidth="0.4" />
      <Circle cx="17.3" cy="4.5" r="0.5" fill={shade(BRASS, 26)} stroke={rim(BRASS)} strokeWidth="0.4" />
      <Circle cx="6.3" cy="18.3" r="0.5" fill={shade(BRASS, 26)} stroke={rim(BRASS)} strokeWidth="0.4" />
      <Circle cx="17.3" cy="18.3" r="0.5" fill={shade(BRASS, 26)} stroke={rim(BRASS)} strokeWidth="0.4" />
      {/* diamond on a halo */}
      <Circle cx="11.8" cy="9.6" r="4.2" fill={`url(#${glow})`} opacity="0.8" />
      <Path d="M8.4 8.2l1.7-2h3.4l1.7 2-3.4 4.6Z" fill={`url(#${ice})`} stroke="#3f7ba8" strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M8.4 8.2h6.8M10.1 6.2l.6 2-1.7 0M13.5 6.2l-.6 2h1.7M11.8 12.8l-1.1-4.6h2.2Z" fill="none" stroke="#3f7ba8" strokeWidth="0.5" strokeLinejoin="round" />
      <Path d="M9.6 7l.7-.6" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M14.9 5l.4.95.95.4-.95.4-.4.95-.4-.95-.95-.4.95-.4Z" fill="#ffffff" />
      {/* engraved plate */}
      <Rect x="7.4" y="14.6" width="8.8" height="2.6" rx="0.4" fill={shade(accent, -22)} stroke={BRASS} strokeWidth="0.6" />
      <Path d="M8.4 15.6h6.8M8.4 16.4h4.6" stroke={shade(BRASS, 10)} strokeWidth="0.45" strokeLinecap="round" />
      <Path d="M5.2 3.6l3.6-.4" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" />
    </Svg>
  );
}

/** Rally banner: upright club standard — pole, crossbar, forked drape. */
export function RallyBannerIcon({ size = 24, accent = '#c8353f' }: IconProps) {
  const cloth = useMemo(() => gradId('rbanB'), []);
  const gold = useMemo(() => gradId('rbanG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={cloth} color={accent} />
      <DuoGrad id={gold} from={shade(BRASS, 46)} to={shade(BRASS, -48)} />
      <Ground rx={5.6} cy={21.6} />
      {/* pole + foot */}
      <Ellipse cx="12" cy="20.9" rx="3.4" ry="0.95" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.7" />
      <Rect x="11.5" y="3.4" width="1" height="17.2" rx="0.45" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.55" />
      <Path d="M11.75 4.4v15.4" stroke={shade(BRASS, 52)} strokeWidth="0.3" />
      {/* spearhead finial */}
      <Path d="M12 0.9l1 1.9h-2Z" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.6" strokeLinejoin="round" />
      {/* crossbar + cords */}
      <Rect x="5.6" y="4" width="12.8" height="1" rx="0.5" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.6" />
      <Circle cx="5.5" cy="4.5" r="0.7" fill={shade(BRASS, 24)} stroke={rim(BRASS)} strokeWidth="0.5" />
      <Circle cx="18.5" cy="4.5" r="0.7" fill={shade(BRASS, 24)} stroke={rim(BRASS)} strokeWidth="0.5" />
      {/* drape with forked tail */}
      <Path d="M6.6 5.4h10.8v9.4L14 13.2l-2 2.4-2-2.4-3.4 1.6Z" fill={`url(#${cloth})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M7.6 6.4h8.8v7l-2.4-1.1-2 2.2-2-2.2-2.4 1.1Z" fill="none" stroke="#f5cf6e" strokeWidth="0.6" strokeLinejoin="round" />
      <Path d="M6.6 5.4h3l-1 8.2-2-.8Z" fill={HILITE_SOFT} opacity="0.35" />
      {/* chevron emblem */}
      <Path d="M9.4 8.2l2.6 2 2.6-2M9.4 10.2l2.6 2 2.6-2" fill="none" stroke="#f5cf6e" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      {/* tassels */}
      <Path d="M5.5 5.2v1M18.5 5.2v1" stroke="#e0b558" strokeWidth="0.55" />
      <Path d="M5 6.4h1v1.5l-.5.8-.5-.8Z" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.5" strokeLinejoin="round" />
      <Path d="M18 6.4h1v1.5l-.5.8-.5-.8Z" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.5" strokeLinejoin="round" />
    </Svg>
  );
}

/** Cascade crystal: magenta shard cluster erupting from a rock base. */
export function CascadeCrystalIcon({ size = 24, accent = '#e84fd0' }: IconProps) {
  const gemG = useMemo(() => gradId('cascB'), []);
  const glow = useMemo(() => gradId('cascG'), []);
  const ROCK = '#4a4066';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={gemG} from={shade(accent, 62)} to={shade(accent, -52)} />
      <GlowGrad id={glow} color={shade(accent, 76)} />
      <Ground rx={7} />
      <Ellipse cx="12" cy="11" rx="8.6" ry="7.6" fill={`url(#${glow})`} opacity="0.55" />
      {/* rock base */}
      <Path d="M5.6 20.6l1.3-2.6h10.2l1.3 2.6Z" fill={ROCK} stroke={rim(ROCK)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M7.4 19.5l1-1M12.4 19.8l.8-1.2" stroke={shade(ROCK, -28)} strokeWidth="0.5" strokeLinecap="round" />
      {/* side shards */}
      <Path d="M7.2 18l-1.6-5.4 3.4 1.6.6 3.8Z" fill={`url(#${gemG})`} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M16.8 18l1.6-5.4-3.4 1.6-.6 3.8Z" fill={`url(#${gemG})`} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M6.4 13.6l1.4 4.2M17.6 13.6l-1.4 4.2" stroke={shade(accent, -46)} strokeWidth="0.45" />
      {/* main shard pair */}
      <Path d="M10.3 18 8.9 8.2 12 4l3.1 4.2L13.7 18Z" fill={`url(#${gemG})`} stroke={rim(accent)} strokeWidth="0.95" strokeLinejoin="round" />
      <Path d="M12 4l-.9 4.4.9 9.6.9-9.6Z" fill="none" stroke={shade(accent, -50)} strokeWidth="0.5" strokeLinejoin="round" />
      <Path d="M9.9 8.9l1-3.4" stroke="#ffffff" strokeWidth="0.75" strokeLinecap="round" opacity="0.85" />
      {/* falling glints (the cascade) */}
      <Path d="M5.9 5.4l.4.95.95.4-.95.4-.4.95-.4-.95-.95-.4.95-.4Z" fill="#ffffff" opacity="0.9" />
      <Path d="M18.3 4.2l.35.8.8.35-.8.35-.35.8-.35-.8-.8-.35.8-.35Z" fill="#ffffff" opacity="0.75" />
      <Circle cx="16.9" cy="9.4" r="0.35" fill="#ffffff" opacity="0.8" />
      <Circle cx="6.9" cy="9.8" r="0.3" fill="#ffffff" opacity="0.65" />
    </Svg>
  );
}

/** Mystery orb: levitating shadowed sphere, swirling mist, rune ring. */
export function MysteryOrbIcon({ size = 24, accent = '#6a3bd8' }: IconProps) {
  const orb = useMemo(() => gradId('mysB'), []);
  const glow = useMemo(() => gradId('mysG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={orb} from={shade(accent, 30)} to="#140a2e" />
      <GlowGrad id={glow} color={shade(accent, 70)} />
      {/* hover shadow (floats — no contact) */}
      <Ellipse cx="12" cy="21" rx="4.6" ry="0.95" fill="rgba(10,6,30,0.38)" />
      <Ellipse cx="12" cy="9.8" rx="9" ry="8.2" fill={`url(#${glow})`} opacity="0.5" />
      {/* orb */}
      <Circle cx="12" cy="9.8" r="6.6" fill={`url(#${orb})`} stroke={rim(accent)} strokeWidth="1.1" />
      {/* inner mist swirl */}
      <Path d="M7.6 10.9c1.2-2.7 3.6-4 6.1-3.3 1.7.5 2.6 1.8 2.3 3.2-1.2-1-2.6-1.3-4.1-.8-1.3.4-2.1 1.3-2.3 2.6" fill="none" stroke={shade(accent, 66)} strokeWidth="0.85" strokeLinecap="round" opacity="0.85" />
      <Path d="M10.2 12.9c.8-.9 1.9-1.2 3-.9" fill="none" stroke={shade(accent, 44)} strokeWidth="0.6" strokeLinecap="round" opacity="0.7" />
      {/* question glyph */}
      <Path d="M10.6 7.9c.1-1 .8-1.6 1.7-1.6.95 0 1.6.6 1.6 1.5 0 1.2-1.3 1.3-1.4 2.4" fill="none" stroke="#efe4ff" strokeWidth="0.95" strokeLinecap="round" />
      <Circle cx="12.4" cy="12" r="0.55" fill="#efe4ff" />
      {/* glass highlight + star flecks */}
      <Path d="M8.1 6.8c.8-1.3 2-2.1 3.4-2.4" fill="none" stroke={HILITE} strokeWidth="1.1" strokeLinecap="round" />
      <Circle cx="15.5" cy="13.2" r="0.35" fill="#ffffff" opacity="0.7" />
      <Circle cx="8.3" cy="13.5" r="0.3" fill="#ffffff" opacity="0.55" />
      {/* levitation rune ring */}
      <Ellipse cx="12" cy="18.4" rx="5.6" ry="1.3" fill="none" stroke={shade(accent, 40)} strokeWidth="0.7" opacity="0.85" />
      <Path d="M7.2 17.9l.6.5M12 19.7v-.8M16.8 17.9l-.6.5" stroke={shade(accent, 66)} strokeWidth="0.6" strokeLinecap="round" />
      <Circle cx="9.2" cy="19.2" r="0.3" fill={shade(accent, 76)} />
      <Circle cx="14.8" cy="19.2" r="0.3" fill={shade(accent, 76)} />
    </Svg>
  );
}
