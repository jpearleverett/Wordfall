/**
 * Decoration illustrations, part 5 — the five collectible books, each a
 * distinct binding, plus the IAP bundle exclusives. Same recipe as
 * iconsDecor.tsx.
 */
import React, { useMemo } from 'react';
import Svg, {
  Circle, Ellipse, G, Path, Rect,
} from 'react-native-svg';
import { IconProps, VB, BodyGrad, DuoGrad, gradId, rim, shade, HILITE, HILITE_SOFT } from './IconBase';
import { Ground, GlowGrad, BRASS, WOOD } from './iconsDecor';

/** Tome of Nature: green leather, gold corners, embossed leaf, clasp. */
export function TomeNatureIcon({ size = 24, accent = '#3f8f63' }: IconProps) {
  const cover = useMemo(() => gradId('tnatB'), []);
  const gold = useMemo(() => gradId('tnatG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={cover} color={accent} />
      <DuoGrad id={gold} from={shade(BRASS, 44)} to={shade(BRASS, -46)} />
      <Ground rx={6.8} cy={21.5} />
      {/* page block behind cover */}
      <Path d="M17.3 3.9c.8.3 1.3.9 1.3 1.8v13.4c0 .9-.5 1.5-1.3 1.8Z" fill="#efe6cd" stroke="#c2b088" strokeWidth="0.7" />
      <Path d="M17.6 5.4v12.6" stroke="#d8c8a0" strokeWidth="0.4" />
      {/* cover */}
      <Rect x="5.4" y="2.9" width="12.2" height="18" rx="1.2" fill={`url(#${cover})`} stroke={rim(accent)} strokeWidth="1.1" />
      <Rect x="5.4" y="2.9" width="2.1" height="18" rx="1" fill={shade(accent, -22)} stroke={rim(accent)} strokeWidth="0.8" />
      <Path d="M6.4 4.4v15" stroke={shade(accent, -40)} strokeWidth="0.45" />
      {/* gold corners + frame */}
      <Path d="M8.3 2.9h2.2l-2.2 2.2ZM17.6 2.9h-2.2l2.2 2.2ZM8.3 20.9h2.2l-2.2-2.2ZM17.6 20.9h-2.2l2.2-2.2Z" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.5" strokeLinejoin="round" />
      <Rect x="8.7" y="5.2" width="7.2" height="13.4" rx="0.6" fill="none" stroke={shade(BRASS, -4)} strokeWidth="0.6" />
      {/* embossed leaf */}
      <Path d="M12.3 8.2c2 1.1 2.9 2.6 2.6 4.5-.2 1.6-1.2 2.7-2.6 3.3-1.4-.6-2.4-1.7-2.6-3.3-.3-1.9.6-3.4 2.6-4.5Z" fill={shade(accent, 16)} stroke={shade(BRASS, 0)} strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M12.3 9.2v5.8M12.3 10.7l-1.4-.8M12.3 10.7l1.4-.8M12.3 12.6l-1.6-.7M12.3 12.6l1.6-.7" fill="none" stroke={shade(BRASS, 10)} strokeWidth="0.5" strokeLinecap="round" />
      {/* clasp */}
      <Rect x="16.6" y="10.9" width="2.4" height="2.2" rx="0.5" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.6" />
      <Circle cx="17.8" cy="12" r="0.4" fill={shade(BRASS, -34)} />
      <Path d="M8.6 3.9c1.1-.35 2.3-.55 3.6-.6" fill="none" stroke={HILITE_SOFT} strokeWidth="0.8" strokeLinecap="round" />
    </Svg>
  );
}

/** Science journal: teal notebook, elastic band, gold atom, bookmark. */
export function JournalScienceIcon({ size = 24, accent = '#2f8fa8' }: IconProps) {
  const cover = useMemo(() => gradId('jsciB'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={cover} color={accent} />
      <Ground rx={6.8} cy={21.5} />
      {/* page block */}
      <Path d="M17.5 4.1c.7.3 1.1.9 1.1 1.7v13.2c0 .8-.4 1.4-1.1 1.7Z" fill="#f5f0e2" stroke="#c9c0a4" strokeWidth="0.7" />
      {/* cover */}
      <Rect x="5.4" y="3.1" width="12.2" height="17.8" rx="1.6" fill={`url(#${cover})`} stroke={rim(accent)} strokeWidth="1.1" />
      {/* spiral rings */}
      <G stroke={shade(accent, -46)} strokeWidth="0.7" fill="none">
        <Circle cx="5.5" cy="5.6" r="0.75" /><Circle cx="5.5" cy="8.6" r="0.75" />
        <Circle cx="5.5" cy="11.6" r="0.75" /><Circle cx="5.5" cy="14.6" r="0.75" />
        <Circle cx="5.5" cy="17.6" r="0.75" />
      </G>
      {/* gold atom emblem */}
      <G stroke="#f0c05a" strokeWidth="0.75" fill="none">
        <Ellipse cx="11.9" cy="10.4" rx="3.8" ry="1.5" transform="rotate(24 11.9 10.4)" />
        <Ellipse cx="11.9" cy="10.4" rx="3.8" ry="1.5" transform="rotate(-24 11.9 10.4)" />
        <Ellipse cx="11.9" cy="10.4" rx="1.5" ry="3.8" />
      </G>
      <Circle cx="11.9" cy="10.4" r="0.8" fill="#ffd24d" stroke="#c8871a" strokeWidth="0.5" />
      <Circle cx="14.9" cy="9" r="0.4" fill="#ffd24d" />
      <Circle cx="9.2" cy="12.2" r="0.35" fill="#ffd24d" />
      {/* ruled label */}
      <Rect x="8.6" y="15.3" width="6.6" height="2.9" rx="0.4" fill="#f5f0e2" stroke="#c9c0a4" strokeWidth="0.55" />
      <Path d="M9.5 16.3h4.8M9.5 17.3h3.4" stroke="#8fa8b8" strokeWidth="0.45" strokeLinecap="round" />
      {/* elastic band + bookmark */}
      <Rect x="15.4" y="3.1" width="1" height="17.8" fill={shade(accent, -38)} opacity="0.9" />
      <Path d="M10.6 3.1v2.6l.9-.7.9.7V3.1Z" fill="#e8385f" stroke={rim('#e8385f')} strokeWidth="0.5" strokeLinejoin="round" />
      <Path d="M6.9 4.1c1.2-.4 2.5-.6 3.9-.65" fill="none" stroke={HILITE_SOFT} strokeWidth="0.8" strokeLinecap="round" />
    </Svg>
  );
}

/** Codex of Myths: rune-scarred violet binding, iron caps, bolt sigil. */
export function CodexMythIcon({ size = 24, accent = '#5c3aa8' }: IconProps) {
  const cover = useMemo(() => gradId('cmytB'), []);
  const glow = useMemo(() => gradId('cmytG'), []);
  const IRON = '#7a7488';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={cover} color={accent} />
      <GlowGrad id={glow} color="#ffd24d" />
      <Ground rx={6.8} cy={21.5} />
      {/* page block */}
      <Path d="M17.3 4.1c.8.3 1.3.9 1.3 1.8v12.8c0 .9-.5 1.5-1.3 1.8Z" fill="#e2d4b8" stroke="#b09a70" strokeWidth="0.7" />
      {/* cover */}
      <Rect x="5.4" y="3.1" width="12.2" height="17.6" rx="1.1" fill={`url(#${cover})`} stroke={rim(accent)} strokeWidth="1.1" />
      <Rect x="5.4" y="3.1" width="2" height="17.6" rx="1" fill={shade(accent, -24)} stroke={rim(accent)} strokeWidth="0.8" />
      {/* iron corner caps */}
      <Path d="M8 3.1h2.4L8 5.7ZM17.6 3.1h-2.4l2.4 2.6ZM8 20.7h2.4L8 18.1ZM17.6 20.7h-2.4l2.4-2.6Z" fill={IRON} stroke={rim(IRON)} strokeWidth="0.55" strokeLinejoin="round" />
      {/* straps */}
      <Rect x="7.4" y="7.1" width="10.2" height="1.2" fill={shade(IRON, -22)} stroke={rim(IRON)} strokeWidth="0.5" />
      <Rect x="7.4" y="15.9" width="10.2" height="1.2" fill={shade(IRON, -22)} stroke={rim(IRON)} strokeWidth="0.5" />
      <Circle cx="16.4" cy="7.7" r="0.4" fill={shade(IRON, 30)} />
      <Circle cx="16.4" cy="16.5" r="0.4" fill={shade(IRON, 30)} />
      {/* glowing bolt sigil */}
      <Circle cx="12.4" cy="11.9" r="3.3" fill={`url(#${glow})`} opacity="0.8" />
      <Path d="M13.3 9l-2.6 3.4h1.6l-1 3.4 2.8-3.9h-1.6Z" fill="#ffd24d" stroke="#c8871a" strokeWidth="0.6" strokeLinejoin="round" />
      {/* scattered runes */}
      <Path d="M9.3 5.3l.8 1.1M10.1 5.3l-.8 1.1M14.8 5v1.3M14.3 5.4h1M9.5 18.3l.9.9M10.4 18.3l-.9.9M14.6 18.2v1.2" stroke={shade(accent, 66)} strokeWidth="0.5" strokeLinecap="round" />
      <Path d="M8.4 4.2c1.1-.4 2.3-.6 3.6-.65" fill="none" stroke={HILITE_SOFT} strokeWidth="0.8" strokeLinecap="round" />
    </Svg>
  );
}

/** Ocean atlas: open spread — sea chart, compass rose, plotted route. */
export function AtlasOceanIcon({ size = 24, accent = '#3a7bd8' }: IconProps) {
  const cover = useMemo(() => gradId('aoceB'), []);
  const SEA = '#bfe0f0';
  const INK = '#3f6a8a';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={cover} color={accent} />
      <Ground rx={9} cy={20.6} ry={1.1} />
      {/* board covers */}
      <Path d="M2.9 6.2 12 8.4l9.1-2.2v12.2L12 20.6 2.9 18.4Z" fill={`url(#${cover})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      {/* open pages */}
      <Path d="M3.9 5.2c3-.5 5.7-.1 8.1 1.4V19c-2.4-1.5-5.1-1.9-8.1-1.4Z" fill={SEA} stroke="#8fb0c8" strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M20.1 5.2c-3-.5-5.7-.1-8.1 1.4V19c2.4-1.5 5.1-1.9 8.1-1.4Z" fill={shade(SEA, 12)} stroke="#8fb0c8" strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M12 6.6V19" stroke="#8fb0c8" strokeWidth="0.6" />
      {/* left page: coast + waves */}
      <Path d="M4.9 7.1c1.4 0 2.5.6 3.2 1.7.5.9.3 1.8-.6 2.3-1.1.6-2.2.4-2.9-.6" fill="none" stroke={INK} strokeWidth="0.6" strokeLinecap="round" />
      <Path d="M5.2 13.2c.7-.4 1.4-.4 2 0M7.8 14.4c.6-.35 1.2-.35 1.8 0M5 15.6c.6-.35 1.2-.35 1.8 0" fill="none" stroke={INK} strokeWidth="0.5" strokeLinecap="round" />
      {/* right page: compass rose */}
      <Circle cx="16.4" cy="10.3" r="2" fill="none" stroke={INK} strokeWidth="0.5" />
      <Path d="M16.4 7.9v4.8M14 10.3h4.8" stroke={INK} strokeWidth="0.45" />
      <Path d="M16.4 8.6l.6 1.7-.6 1.7-.6-1.7Z" fill="#c8353f" stroke={INK} strokeWidth="0.3" />
      {/* plotted route + X */}
      <Path d="M13.3 14.9c1.5-.5 3-.5 4.6.1" fill="none" stroke="#c8353f" strokeWidth="0.6" strokeDasharray="1 0.9" strokeLinecap="round" />
      <Path d="M18.3 14.5l1 1M19.3 14.5l-1 1" stroke="#c8353f" strokeWidth="0.6" strokeLinecap="round" />
      {/* tiny ship */}
      <Path d="M8.3 17.4h2l-.4.9H8.7Z" fill={WOOD} stroke={rim(WOOD)} strokeWidth="0.4" strokeLinejoin="round" />
      <Path d="M9.3 15.7v1.7M9.3 15.7c.7.3 1 .8.9 1.5h-.9Z" fill="#f5f0e2" stroke={INK} strokeWidth="0.4" strokeLinejoin="round" />
      <Path d="M4.4 6.3c1.2-.2 2.4-.2 3.5.1" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Forbidden book: black-crimson binding, chained shut, watching eye. */
export function ForbiddenBookIcon({ size = 24, accent = '#8a1f3a' }: IconProps) {
  const cover = useMemo(() => gradId('forbB'), []);
  const glow = useMemo(() => gradId('forbG'), []);
  const IRON = '#6e6880';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={cover} from={shade(accent, 14)} to="#1a0a1e" />
      <GlowGrad id={glow} color="#e84fd0" />
      <Ground rx={6.8} cy={21.5} />
      {/* ominous aura */}
      <Ellipse cx="12" cy="11.9" rx="9.2" ry="9.6" fill={`url(#${glow})`} opacity="0.35" />
      {/* page block */}
      <Path d="M17.3 4.1c.8.3 1.3.9 1.3 1.8v12.8c0 .9-.5 1.5-1.3 1.8Z" fill="#c9b898" stroke="#96825c" strokeWidth="0.7" />
      {/* cover */}
      <Rect x="5.4" y="3.1" width="12.2" height="17.6" rx="1.1" fill={`url(#${cover})`} stroke="#4a0f22" strokeWidth="1.1" />
      <Rect x="5.4" y="3.1" width="2" height="17.6" rx="1" fill="#33081a" stroke="#4a0f22" strokeWidth="0.8" />
      {/* watching eye */}
      <Path d="M8.7 11.9c1.1-1.9 2.3-2.8 3.7-2.8s2.6.9 3.7 2.8c-1.1 1.9-2.3 2.8-3.7 2.8s-2.6-.9-3.7-2.8Z" fill="#2a0a30" stroke="#e84fd0" strokeWidth="0.7" strokeLinejoin="round" />
      <Circle cx="12.4" cy="11.9" r="1.25" fill="#e84fd0" />
      <Path d="M12.4 10.8v2.2" stroke="#1a0a1e" strokeWidth="0.8" strokeLinecap="round" />
      <Circle cx="11.9" cy="11.3" r="0.3" fill="#ffffff" opacity="0.9" />
      {/* chains */}
      <G stroke={rim(IRON)} strokeWidth="0.5" fill={IRON}>
        <Ellipse cx="7.2" cy="5.4" rx="0.85" ry="0.6" transform="rotate(38 7.2 5.4)" />
        <Ellipse cx="8.7" cy="6.6" rx="0.85" ry="0.6" transform="rotate(38 8.7 6.6)" />
        <Ellipse cx="10.2" cy="7.8" rx="0.85" ry="0.6" transform="rotate(38 10.2 7.8)" />
        <Ellipse cx="13.4" cy="16.2" rx="0.85" ry="0.6" transform="rotate(38 13.4 16.2)" />
        <Ellipse cx="14.9" cy="17.4" rx="0.85" ry="0.6" transform="rotate(38 14.9 17.4)" />
        <Ellipse cx="16.4" cy="18.6" rx="0.85" ry="0.6" transform="rotate(38 16.4 18.6)" />
      </G>
      {/* padlock */}
      <Rect x="10.4" y="16.9" width="3.4" height="2.9" rx="0.6" fill={shade(IRON, -10)} stroke={rim(IRON)} strokeWidth="0.6" />
      <Path d="M11.1 16.9v-.9a1 1 0 0 1 2 0v.9" fill="none" stroke={shade(IRON, 16)} strokeWidth="0.7" />
      <Circle cx="12.1" cy="18.2" r="0.4" fill="#1a0a1e" />
      <Path d="M8.4 4.2c1.1-.4 2.3-.6 3.6-.65" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" strokeLinecap="round" />
    </Svg>
  );
}

/** Starter bookend: brass owl perched on an L-block, one leaning book. */
export function StarterBookendIcon({ size = 24, accent = '#c8963f' }: IconProps) {
  const brass = useMemo(() => gradId('sbndB'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={brass} from={shade(accent, 44)} to={shade(accent, -48)} />
      <Ground rx={8} cy={21.3} />
      {/* base slab + upright */}
      <Rect x="4.6" y="18.4" width="14.8" height="2" rx="0.4" fill={`url(#${brass})`} stroke={rim(accent)} strokeWidth="0.9" />
      <Rect x="14.9" y="8.9" width="3.2" height="9.5" rx="0.5" fill={`url(#${brass})`} stroke={rim(accent)} strokeWidth="0.9" />
      <Path d="M15.5 9.9v7.6" stroke={shade(accent, 50)} strokeWidth="0.4" />
      {/* leaning book */}
      <G transform="rotate(-12 9.4 13.4)">
        <Rect x="8.1" y="7.9" width="2.7" height="10.4" rx="0.4" fill="#3f5fa8" stroke={rim('#3f5fa8')} strokeWidth="0.9" />
        <Rect x="8.5" y="8.3" width="1.9" height="0.8" rx="0.2" fill="#efe6cd" />
        <Path d="M9.45 11v4.6" stroke="#f5cf6e" strokeWidth="0.55" strokeLinecap="round" />
      </G>
      {/* perched owl */}
      <Ellipse cx="16.5" cy="6.4" rx="2.6" ry="3.1" fill={`url(#${brass})`} stroke={rim(accent)} strokeWidth="0.9" />
      <Path d="M14.6 4.1l-.5-1.4 1.4.55M18.4 4.1l.5-1.4-1.4.55" fill={`url(#${brass})`} stroke={rim(accent)} strokeWidth="0.6" strokeLinejoin="round" />
      <Circle cx="15.6" cy="5.6" r="0.75" fill="#2c1b4e" stroke={shade(accent, 40)} strokeWidth="0.45" />
      <Circle cx="17.4" cy="5.6" r="0.75" fill="#2c1b4e" stroke={shade(accent, 40)} strokeWidth="0.45" />
      <Circle cx="15.8" cy="5.4" r="0.22" fill="#ffffff" />
      <Circle cx="17.6" cy="5.4" r="0.22" fill="#ffffff" />
      <Path d="M16.5 6.2l-.5.8h1Z" fill={shade(accent, -34)} stroke={rim(accent)} strokeWidth="0.4" strokeLinejoin="round" />
      {/* folded wing + feet */}
      <Path d="M14.6 6.6c.4 1.1.4 2.1 0 3.1M18.4 6.6c-.4 1.1-.4 2.1 0 3.1" fill="none" stroke={shade(accent, -32)} strokeWidth="0.55" strokeLinecap="round" />
      <Path d="M15.7 9.3v.7M17.3 9.3v.7" stroke={shade(accent, -40)} strokeWidth="0.6" strokeLinecap="round" />
      <Path d="M15 3.9c.5-.4 1-.6 1.6-.65" fill="none" stroke={HILITE} strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M5.6 19.4h6.2" stroke={shade(accent, 44)} strokeWidth="0.45" strokeLinecap="round" />
    </Svg>
  );
}

/** Chapter marker: enamel medallion with numeral, forked ribbon, on a book. */
export function ChapterMarkerIcon({ size = 24, accent = '#c8353f' }: IconProps) {
  const ribbon = useMemo(() => gradId('chmkR'), []);
  const gold = useMemo(() => gradId('chmkG'), []);
  const BOOK = '#3f5fa8';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={ribbon} color={accent} />
      <DuoGrad id={gold} from={shade(BRASS, 46)} to={shade(BRASS, -48)} />
      <Ground rx={8.6} cy={21.4} ry={1} />
      {/* closed book it marks */}
      <Path d="M3.6 15.4c0-.9.6-1.5 1.5-1.5h13.8c.9 0 1.5.6 1.5 1.5v3.2c0 .9-.6 1.5-1.5 1.5H5.1c-.9 0-1.5-.6-1.5-1.5Z" fill={BOOK} stroke={rim(BOOK)} strokeWidth="1" />
      <Path d="M4.6 14.4h14.8v-.9c0-.5-.4-.9-.9-.9H5.5c-.5 0-.9.4-.9.9Z" fill="#efe6cd" stroke="#c2b088" strokeWidth="0.6" />
      <Path d="M5.3 13.5h13.4M5.3 14h13.4" stroke="#d8c8a0" strokeWidth="0.35" />
      <Path d="M4.8 16.6h4.4" stroke={shade(BOOK, 40)} strokeWidth="0.5" strokeLinecap="round" />
      {/* ribbon down over the pages */}
      <Path d="M10.4 7.4h3.2v9.8l-1.6-1.2-1.6 1.2Z" fill={`url(#${ribbon})`} stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M11.1 8.2v7.4" stroke="#f5cf6e" strokeWidth="0.5" strokeLinecap="round" />
      {/* medallion */}
      <Circle cx="12" cy="6.2" r="3.6" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.9" />
      <Circle cx="12" cy="6.2" r="2.5" fill={shade(accent, -8)} stroke={shade(BRASS, -10)} strokeWidth="0.6" />
      {/* laurel + numeral I */}
      <Path d="M10.2 7.5c-.5-.7-.6-1.4-.4-2.2M13.8 7.5c.5-.7.6-1.4.4-2.2" fill="none" stroke="#f5cf6e" strokeWidth="0.5" strokeLinecap="round" />
      <Path d="M12 4.9v2.6M11.3 4.9h1.4M11.3 7.5h1.4" stroke="#ffe9a3" strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M10.5 4.6c.4-.4.9-.65 1.5-.7" fill="none" stroke={HILITE} strokeWidth="0.7" strokeLinecap="round" />
      {/* jewel at ribbon join */}
      <Circle cx="12" cy="9.9" r="0.6" fill="#31c8e8" stroke={rim('#31c8e8')} strokeWidth="0.45" />
    </Svg>
  );
}

/** Whale trophy: golden whale breaching a wave, dark plinth, plaque. */
export function WhaleTrophyIcon({ size = 24, accent = '#e8b13f' }: IconProps) {
  const gold = useMemo(() => gradId('whtB'), []);
  const glow = useMemo(() => gradId('whtG'), []);
  const DARK = '#33304a';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={gold} from={shade(accent, 48)} to={shade(accent, -50)} />
      <GlowGrad id={glow} color={shade(accent, 66)} />
      <Ground rx={7.4} cy={21.7} ry={1} />
      <Ellipse cx="12" cy="9" rx="8.6" ry="6.6" fill={`url(#${glow})`} opacity="0.45" />
      {/* plinth + plaque */}
      <Rect x="5.4" y="18.9" width="13.2" height="2.4" rx="0.5" fill={DARK} stroke={rim(DARK)} strokeWidth="0.9" />
      <Rect x="6.6" y="16.6" width="10.8" height="2.3" rx="0.4" fill={shade(DARK, 14)} stroke={rim(DARK)} strokeWidth="0.8" />
      <Rect x="9.2" y="19.5" width="5.6" height="1.2" rx="0.25" fill={`url(#${gold})`} stroke={rim(accent)} strokeWidth="0.5" />
      {/* gilded wave */}
      <Path d="M6.4 16.6c-.4-1.6.1-2.7 1.4-3.4 1-.5 1.6-1.2 1.8-2.2.7 1.5.4 2.8-.9 3.8.9.5 1.9.6 3 .3l6.2.2c1 .5 1.6 1.5 1.7 2.9l.2.9H6.6Z" fill={shade(accent, -18)} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" />
      {/* whale body arching */}
      <Path d="M6.9 10.9c1.5-4 4.4-6 8-5.3 3 .6 4.9 2.7 5.2 5.9.2 2-.5 3.4-2 4.4-1.9 1.2-4 1.1-6.4-.2-1.9-1-3.5-2.6-4.8-4.8Z" fill={`url(#${gold})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      {/* tail flukes */}
      <Path d="M7.5 10.5C6 9.9 4.8 10 3.8 10.9c.8.4 1.3.95 1.6 1.7-.9 0-1.6.3-2.2.9 1.6.9 3.1 1 4.6.3Z" fill={`url(#${gold})`} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" />
      {/* belly grooves + eye + fin */}
      <Path d="M9.4 13.6c1.7 1.3 3.5 1.9 5.4 1.9" fill="none" stroke={shade(accent, -38)} strokeWidth="0.5" strokeLinecap="round" />
      <Path d="M10.2 12.4c1.6 1.2 3.3 1.8 5.2 1.9" fill="none" stroke={shade(accent, -30)} strokeWidth="0.45" strokeLinecap="round" />
      <Circle cx="16.7" cy="9.4" r="0.55" fill="#2c1b4e" />
      <Circle cx="16.9" cy="9.2" r="0.18" fill="#ffffff" />
      <Path d="M13.4 12.4c.9.3 1.5.9 1.7 1.8-1 .1-1.8-.2-2.4-.9Z" fill={shade(accent, -14)} stroke={rim(accent)} strokeWidth="0.6" strokeLinejoin="round" />
      {/* spout + shine */}
      <Path d="M13.9 5.2c-.1-1 .2-1.8.9-2.5M14.9 5.3c.4-.8 1-1.3 1.9-1.5" fill="none" stroke="#8fd8f0" strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M9.4 8.1c1.1-1.5 2.6-2.3 4.4-2.4" fill="none" stroke={HILITE} strokeWidth="1" strokeLinecap="round" />
    </Svg>
  );
}

/** Platinum display: silver laurel star in a lit vitrine on black marble. */
export function PlatinumDisplayIcon({ size = 24, accent = '#c9d4e8' }: IconProps) {
  const plat = useMemo(() => gradId('pldB'), []);
  const glow = useMemo(() => gradId('pldG'), []);
  const MARBLE = '#232038';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={plat} from="#f4f8ff" to={shade(accent, -52)} />
      <GlowGrad id={glow} color="#e8f2ff" />
      <Ground rx={7.4} cy={21.7} ry={1} />
      {/* black marble base */}
      <Rect x="5" y="18.6" width="14" height="2.7" rx="0.6" fill={MARBLE} stroke={rim(MARBLE)} strokeWidth="0.9" />
      <Path d="M6.4 19.6c1.4-.4 2.9-.3 4.4.2M13.2 20.2c1.2-.4 2.4-.4 3.6-.1" stroke="#4a4468" strokeWidth="0.45" strokeLinecap="round" fill="none" />
      <Rect x="6.4" y="17" width="11.2" height="1.6" rx="0.4" fill={`url(#${plat})`} stroke={rim(accent)} strokeWidth="0.8" />
      {/* vitrine */}
      <Rect x="6.9" y="3.2" width="10.2" height="13.8" rx="0.9" fill="rgba(210,235,255,0.12)" stroke="#aac8e0" strokeWidth="0.9" />
      <Path d="M8 4.2c-.4 3.8-.4 7.9 0 11.8" fill="none" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M6.9 4.9h10.2" stroke="#aac8e0" strokeWidth="0.45" opacity="0.7" />
      {/* interior glow + platinum star on riser */}
      <Ellipse cx="12" cy="9.6" rx="4.6" ry="4.4" fill={`url(#${glow})`} opacity="0.75" />
      <Rect x="10.1" y="13.4" width="3.8" height="3.4" rx="0.4" fill={shade(MARBLE, 18)} stroke={rim(MARBLE)} strokeWidth="0.7" />
      <Path d="M12 5.4l1.3 2.7 3 .45-2.15 2.1.5 3-2.65-1.4-2.65 1.4.5-3-2.15-2.1 3-.45Z" fill={`url(#${plat})`} stroke="#7a88a8" strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M12 7.2l.75 1.55 1.7.25-1.25 1.2.3 1.75L12 11.1l-1.5.85.3-1.75-1.25-1.2 1.7-.25Z" fill="none" stroke="#7a88a8" strokeWidth="0.45" strokeLinejoin="round" />
      <Path d="M10.9 6.8l.75-.9" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" />
      {/* sparkles */}
      <Path d="M15.4 4.4l.35.85.85.35-.85.35-.35.85-.35-.85-.85-.35.85-.35Z" fill="#ffffff" opacity="0.9" />
      <Circle cx="8.9" cy="7.2" r="0.3" fill="#ffffff" opacity="0.7" />
      <Circle cx="12" cy="2.7" r="0.6" fill={`url(#${plat})`} stroke="#7a88a8" strokeWidth="0.5" />
    </Svg>
  );
}
