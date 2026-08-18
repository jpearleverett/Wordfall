/**
 * Decoration illustrations — bespoke art for the library collection cards.
 *
 * Same 24×24 material recipe as the rest of the set (gradient bodies, rim
 * strokes, top highlights) but pushed to illustration grade: each piece
 * layers 14–22 shapes with grounded shadows, glows and secondary materials,
 * because these render large (~84px) on collection cards where a generic
 * glyph reads as placeholder art. Every icon depicts its actual decoration:
 * the Reading Chair is a wingback armchair, the Chandelier has arms and
 * candle flames, the Season Banner is a hanging pennant with a "1" emblem.
 */
import React, { useMemo } from 'react';
import Svg, {
  Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop,
} from 'react-native-svg';
import { IconProps, VB, BodyGrad, DuoGrad, gradId, rim, shade, HILITE, HILITE_SOFT } from './IconBase';

const SHADOW = 'rgba(10,6,30,0.30)';
const BRASS = '#d9a441';
const WOOD = '#8a5a30';

/** Soft elliptical ground shadow so pieces sit on the card, not float. */
function Ground({ cx = 12, cy = 21.4, rx = 7, ry = 1.2 }: { cx?: number; cy?: number; rx?: number; ry?: number }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={SHADOW} />;
}

/** Radial glow for lit elements (lamp light, flames, crystal cores). */
function GlowGrad({ id, color }: { id: string; color: string }) {
  return (
    <Defs>
      <RadialGradient id={id} cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0" stopColor={color} stopOpacity="0.8" />
        <Stop offset="1" stopColor={color} stopOpacity="0" />
      </RadialGradient>
    </Defs>
  );
}

/** Wingback reading chair: eared back, rolled arms, cushion, wooden legs. */
export function ArmchairIcon({ size = 24, accent = '#a8434f' }: IconProps) {
  const body = useMemo(() => gradId('chairB'), []);
  const cush = useMemo(() => gradId('chairC'), []);
  const cushTone = shade(accent, 22);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <BodyGrad id={cush} color={cushTone} />
      <Ground rx={8} />
      {/* legs */}
      <Path d="M6 18.8h1.5l-.3 2.7H6.3Z" fill={WOOD} stroke={rim(WOOD)} strokeWidth="0.7" />
      <Path d="M16.5 18.8H18l-.2 2.7h-1.1Z" fill={WOOD} stroke={rim(WOOD)} strokeWidth="0.7" />
      <Path d="M9.2 19.2h1.2l-.2 2h-.8Z" fill={shade(WOOD, -30)} />
      <Path d="M13.6 19.2h1.2l-.2 2h-.8Z" fill={shade(WOOD, -30)} />
      {/* winged back */}
      <Path d="M5.4 16.4V8.6c0-3.4 2.7-5.4 6.6-5.4s6.6 2 6.6 5.4v7.8Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1.1" strokeLinejoin="round" />
      <Path d="M5.4 8.2C4.1 8.9 3.5 10.3 3.6 12.1l1.8 1.2Z" fill={shade(accent, -18)} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M18.6 8.2c1.3.7 1.9 2.1 1.8 3.9l-1.8 1.2Z" fill={shade(accent, -18)} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      {/* tufting */}
      <Path d="M8.6 7.2c.6 1.6.6 3.4 0 5M15.4 7.2c-.6 1.6-.6 3.4 0 5" fill="none" stroke={shade(accent, -40)} strokeWidth="0.8" strokeLinecap="round" />
      <Circle cx="9.9" cy="8.4" r="0.45" fill={shade(accent, -52)} />
      <Circle cx="14.1" cy="8.4" r="0.45" fill={shade(accent, -52)} />
      <Circle cx="12" cy="11" r="0.45" fill={shade(accent, -52)} />
      {/* rolled arms */}
      <Rect x="2.7" y="12.4" width="3.8" height="6.7" rx="1.8" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1.1" />
      <Rect x="17.5" y="12.4" width="3.8" height="6.7" rx="1.8" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1.1" />
      {/* seat cushion */}
      <Rect x="6.2" y="14.3" width="11.6" height="4.6" rx="1.6" fill={`url(#${cush})`} stroke={rim(cushTone)} strokeWidth="1.1" />
      <Path d="M7.6 16.6h8.8" stroke={shade(cushTone, -36)} strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M8.4 4.7c1-.6 2.2-.9 3.6-.9" fill="none" stroke={HILITE} strokeWidth="1.1" strokeLinecap="round" />
    </Svg>
  );
}

/** Brass chandelier: chain, column, four curved arms, lit candles. */
export function ChandelierIcon({ size = 24, accent = '#e8b13f' }: IconProps) {
  const body = useMemo(() => gradId('chandB'), []);
  const glow = useMemo(() => gradId('chandG'), []);
  const dark = shade(accent, -46);
  const flame = (cx: number, cy: number) => (
    <Path
      key={`${cx}-${cy}`}
      d={`M${cx} ${cy}c.5.7.8 1.1.8 1.6a.8.8 0 1 1-1.6 0c0-.5.3-.9.8-1.6Z`}
      fill="#ffd24d" stroke="#e07b1a" strokeWidth="0.5"
    />
  );
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from={shade(accent, 46)} to={shade(accent, -52)} />
      <GlowGrad id={glow} color="#ffd24d" />
      {/* chain */}
      <Path d="M12 0.6v2.6" stroke={dark} strokeWidth="0.9" strokeLinecap="round" />
      <Circle cx="12" cy="1.8" r="0.65" fill="none" stroke={dark} strokeWidth="0.7" />
      <Circle cx="12" cy="3.1" r="0.65" fill="none" stroke={dark} strokeWidth="0.7" />
      {/* warm glow behind the candles */}
      <Ellipse cx="12" cy="12" rx="9" ry="4" fill={`url(#${glow})`} opacity="0.5" />
      {/* column */}
      <Rect x="11.3" y="3.8" width="1.4" height="6.6" rx="0.6" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.7" />
      <Ellipse cx="12" cy="5.3" rx="1.15" ry="0.65" fill={shade(accent, 26)} stroke={rim(accent)} strokeWidth="0.6" />
      <Ellipse cx="12" cy="7.9" rx="0.95" ry="0.55" fill={shade(accent, 26)} stroke={rim(accent)} strokeWidth="0.6" />
      {/* four curved arms */}
      <G stroke={`url(#${body})`} strokeWidth="1.3" strokeLinecap="round" fill="none">
        <Path d="M12 10.2C8.4 10.6 6.3 12.3 6.2 15.2" />
        <Path d="M12 10.2c-2.2.5-3.3 1.7-3.4 4" />
        <Path d="M12 10.2c3.6.4 5.7 2.1 5.8 5" />
        <Path d="M12 10.2c2.2.5 3.3 1.7 3.4 4" />
      </G>
      {/* bobeches + candles + flames */}
      <Ellipse cx="6.2" cy="15.3" rx="1.15" ry="0.55" fill={dark} />
      <Ellipse cx="8.6" cy="14.3" rx="1.05" ry="0.5" fill={dark} />
      <Ellipse cx="15.4" cy="14.3" rx="1.05" ry="0.5" fill={dark} />
      <Ellipse cx="17.8" cy="15.3" rx="1.15" ry="0.55" fill={dark} />
      <Rect x="5.6" y="12.6" width="1.2" height="2.6" rx="0.3" fill="#fdf3dc" stroke="#cbb98d" strokeWidth="0.5" />
      <Rect x="8" y="11.6" width="1.2" height="2.6" rx="0.3" fill="#fdf3dc" stroke="#cbb98d" strokeWidth="0.5" />
      <Rect x="14.8" y="11.6" width="1.2" height="2.6" rx="0.3" fill="#fdf3dc" stroke="#cbb98d" strokeWidth="0.5" />
      <Rect x="17.2" y="12.6" width="1.2" height="2.6" rx="0.3" fill="#fdf3dc" stroke="#cbb98d" strokeWidth="0.5" />
      {flame(6.2, 10.4)}
      {flame(8.6, 9.4)}
      {flame(15.4, 9.4)}
      {flame(17.8, 10.4)}
      {/* bottom finial + drop crystal */}
      <Ellipse cx="12" cy="10.9" rx="1.25" ry="0.85" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.7" />
      <Path d="M12 12l1 1.7-1 3-1-3Z" fill="#cfe6ff" stroke="#8fb8e8" strokeWidth="0.6" strokeLinejoin="round" />
      <Path d="M11.5 13.4l.5-.9.5.9" fill="none" stroke={HILITE} strokeWidth="0.5" />
    </Svg>
  );
}

/** Season banner: pennant hanging from a rod, gold trim, tassels, "1" emblem. */
export function BannerIcon({ size = 24, accent = '#c8353f' }: IconProps) {
  const body = useMemo(() => gradId('bannB'), []);
  const gold = useMemo(() => gradId('bannG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <DuoGrad id={gold} from="#f5cf6e" to="#b0782a" />
      {/* rod + finials */}
      <Rect x="3" y="3.4" width="18" height="1.3" rx="0.65" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.7" />
      <Circle cx="2.9" cy="4.05" r="1.05" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.7" />
      <Circle cx="21.1" cy="4.05" r="1.05" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.7" />
      {/* swallowtail pennant */}
      <Path d="M6.8 5.4h10.4v10.9L12 13.8l-5.2 2.5Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1.1" strokeLinejoin="round" />
      <Path d="M7.9 6.5h8.2v8.1L12 12.7l-4.1 1.9Z" fill="none" stroke="#f5cf6e" strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M6.8 5.4h3.4L8.4 12l-1.6-.8Z" fill={HILITE_SOFT} opacity="0.4" />
      {/* emblem disc with "1" */}
      <Circle cx="12" cy="9.4" r="2.6" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.8" />
      <Path d="M11.1 8.6l1.3-1v4" fill="none" stroke="#6d1a20" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11.2 11.8h2.2" stroke="#6d1a20" strokeWidth="1" strokeLinecap="round" />
      {/* corner tassels */}
      <Path d="M6.8 16.2v1" stroke="#e0b558" strokeWidth="0.6" />
      <Path d="M17.2 16.2v1" stroke="#e0b558" strokeWidth="0.6" />
      <Path d="M6.2 17.2h1.2v1.8l-.6.9-.6-.9Z" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.6" strokeLinejoin="round" />
      <Path d="M16.6 17.2h1.2v1.8l-.6.9-.6-.9Z" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.6" strokeLinejoin="round" />
      {/* rod-end cords */}
      <Path d="M2.9 5.1v1.1M21.1 5.1v1.1" stroke="#e0b558" strokeWidth="0.6" strokeLinecap="round" />
      <Circle cx="2.9" cy="6.7" r="0.55" fill="#f5cf6e" />
      <Circle cx="21.1" cy="6.7" r="0.55" fill="#f5cf6e" />
    </Svg>
  );
}

/** Oak bookend: L-shaped wood block propping three leaning books. */
export function BookendOakIcon({ size = 24, accent = '#a97142' }: IconProps) {
  const oak = useMemo(() => gradId('bendO'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={oak} color={accent} />
      <Ground rx={8.2} cy={21.2} />
      {/* base slab */}
      <Rect x="4.2" y="18.2" width="14.2" height="2.1" rx="0.4" fill={`url(#${oak})`} stroke={rim(accent)} strokeWidth="1" />
      <Path d="M5.4 19.3c2.6-.35 5.4-.35 8.2 0" fill="none" stroke={shade(accent, -38)} strokeWidth="0.55" strokeLinecap="round" />
      {/* books: blue upright, green upright, red leaning on the bookend */}
      <Rect x="5.3" y="8.1" width="2.7" height="10.1" rx="0.4" fill="#3f5fa8" stroke={rim('#3f5fa8')} strokeWidth="0.9" />
      <Rect x="5.7" y="8.5" width="1.9" height="0.75" rx="0.2" fill="#efe6cd" />
      <Path d="M6.7 11.2v4.6" stroke="#f5cf6e" strokeWidth="0.55" strokeLinecap="round" />
      <Rect x="8.3" y="7.5" width="2.5" height="10.7" rx="0.4" fill="#3f8f63" stroke={rim('#3f8f63')} strokeWidth="0.9" />
      <Rect x="8.7" y="7.9" width="1.7" height="0.75" rx="0.2" fill="#efe6cd" />
      <Path d="M9.55 10.6v5.8" stroke="#ffe9a3" strokeWidth="0.55" strokeLinecap="round" />
      <G transform="rotate(13 13 13)">
        <Rect x="11.5" y="7.7" width="2.6" height="10.5" rx="0.4" fill="#b5484d" stroke={rim('#b5484d')} strokeWidth="0.9" />
        <Rect x="11.9" y="8.1" width="1.8" height="0.75" rx="0.2" fill="#efe6cd" />
        <Path d="M12.8 10.9v5.2" stroke="#f5cf6e" strokeWidth="0.55" strokeLinecap="round" />
      </G>
      {/* upright oak panel */}
      <Rect x="15.4" y="8.4" width="3" height="9.9" rx="0.5" fill={`url(#${oak})`} stroke={rim(accent)} strokeWidth="1" />
      <Path d="M16.3 9.8c.5 2.4.5 4.6 0 6.8M17.4 9.4c.4 2.7.4 5.4 0 8" fill="none" stroke={shade(accent, -34)} strokeWidth="0.55" strokeLinecap="round" />
      <Path d="M15.8 8.8h2.2" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" />
    </Svg>
  );
}

/** Banker's lamp: brass base and stem, green glass shade, warm glow. */
export function LampBrassIcon({ size = 24, accent = '#2f8f5b' }: IconProps) {
  const brass = useMemo(() => gradId('lampBr'), []);
  const green = useMemo(() => gradId('lampSh'), []);
  const glow = useMemo(() => gradId('lampGl'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={brass} from={shade(BRASS, 50)} to={shade(BRASS, -55)} />
      <BodyGrad id={green} color={accent} />
      <GlowGrad id={glow} color="#ffd24d" />
      <Ground rx={6.6} />
      {/* warm glow */}
      <Ellipse cx="12" cy="10.6" rx="7.4" ry="3.8" fill={`url(#${glow})`} />
      {/* base */}
      <Ellipse cx="12" cy="19.5" rx="5" ry="1.5" fill={`url(#${brass})`} stroke={rim(BRASS)} strokeWidth="0.9" />
      <Ellipse cx="12" cy="18.7" rx="3.5" ry="1" fill={shade(BRASS, 22)} stroke={rim(BRASS)} strokeWidth="0.6" />
      {/* stem + arms */}
      <Rect x="11.35" y="12.5" width="1.3" height="6.2" rx="0.4" fill={`url(#${brass})`} stroke={rim(BRASS)} strokeWidth="0.6" />
      <Path d="M11.7 13.2v5" stroke={shade(BRASS, 62)} strokeWidth="0.4" />
      <Ellipse cx="12" cy="12.6" rx="1.25" ry="0.55" fill={shade(BRASS, 22)} stroke={rim(BRASS)} strokeWidth="0.55" />
      <Path d="M9.5 12.4c-.4-1.7.1-2.8 1.3-3.5M14.5 12.4c.4-1.7-.1-2.8-1.3-3.5" fill="none" stroke={`url(#${brass})`} strokeWidth="1" strokeLinecap="round" />
      {/* light spilling from under the shade */}
      <Ellipse cx="12" cy="10.3" rx="5.6" ry="1.05" fill="#ffe9a3" opacity="0.9" />
      {/* green glass shade */}
      <Path d="M4.9 10.3c.4-3.3 3.4-5.2 7.1-5.2s6.7 1.9 7.1 5.2c-2.3-1-4.7-1.5-7.1-1.5s-4.8.5-7.1 1.5Z" fill={`url(#${green})`} stroke={rim(accent)} strokeWidth="1.1" strokeLinejoin="round" />
      <Path d="M6.6 8c1-1.1 2.4-1.8 4-2" fill="none" stroke={HILITE} strokeWidth="1" strokeLinecap="round" />
      <Path d="M5.6 10c1.9-.75 4-1.1 6.4-1.1 2.4 0 4.5.35 6.4 1.1" fill="none" stroke={shade(accent, -44)} strokeWidth="0.6" />
      {/* finial + pull chain */}
      <Circle cx="12" cy="4.6" r="0.8" fill={`url(#${brass})`} stroke={rim(BRASS)} strokeWidth="0.6" />
      <Path d="M15.3 11l.7 2.4" stroke={shade(BRASS, -20)} strokeWidth="0.6" strokeLinecap="round" />
      <Circle cx="16.2" cy="14" r="0.55" fill={shade(BRASS, 30)} stroke={rim(BRASS)} strokeWidth="0.5" />
    </Svg>
  );
}

/** Antique globe: parchment sphere in a brass meridian ring on a wood stand. */
export function GlobeAntiqueIcon({ size = 24, accent = '#d8b878' }: IconProps) {
  const parch = useMemo(() => gradId('agloB'), []);
  const wood = useMemo(() => gradId('agloW'), []);
  const land = shade(accent, -76);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={parch} color={accent} />
      <BodyGrad id={wood} color={WOOD} />
      <Ground rx={5.6} cy={21.5} />
      {/* stand */}
      <Ellipse cx="12" cy="20.6" rx="4.5" ry="1.25" fill={`url(#${wood})`} stroke={rim(WOOD)} strokeWidth="0.9" />
      <Ellipse cx="12" cy="20" rx="3" ry="0.85" fill={shade(WOOD, 26)} stroke={rim(WOOD)} strokeWidth="0.6" />
      <Rect x="11.4" y="18" width="1.2" height="2.2" rx="0.3" fill={`url(#${wood})`} stroke={rim(WOOD)} strokeWidth="0.6" />
      {/* tilted globe assembly */}
      <G transform="rotate(16 12 10.4)">
        <Circle cx="12" cy="10.4" r="6.5" fill={`url(#${parch})`} stroke={rim(accent)} strokeWidth="1" />
        {/* continents */}
        <Path d="M8.2 7.4c1.4-1 2.9-1 4 0 .7.7.5 1.7-.5 2.3-1.5.9-3 .7-3.9-.5-.4-.6-.3-1.3.4-1.8Z" fill={land} opacity="0.75" />
        <Path d="M13.3 11.2c1.5-.4 2.8 0 3.4 1 .4.8 0 1.7-1 2.2-1.3.6-2.6.3-3.2-.8-.4-.9-.1-2 .8-2.4Z" fill={land} opacity="0.75" />
        <Path d="M8 12.6c.9-.2 1.6.2 1.8 1 .2.7-.3 1.4-1.1 1.6-.9.2-1.6-.2-1.8-1-.1-.7.3-1.4 1.1-1.6Z" fill={land} opacity="0.65" />
        {/* graticule */}
        <Ellipse cx="12" cy="10.4" rx="6.5" ry="2.3" fill="none" stroke={shade(accent, -42)} strokeWidth="0.55" />
        <Ellipse cx="12" cy="10.4" rx="2.5" ry="6.5" fill="none" stroke={shade(accent, -42)} strokeWidth="0.55" />
        {/* brass meridian ring + axis caps */}
        <Circle cx="12" cy="10.4" r="7.7" fill="none" stroke={BRASS} strokeWidth="1.2" />
        <Circle cx="12" cy="2.7" r="0.7" fill={shade(BRASS, 26)} stroke={rim(BRASS)} strokeWidth="0.55" />
        <Circle cx="12" cy="18.1" r="0.8" fill={shade(BRASS, 26)} stroke={rim(BRASS)} strokeWidth="0.55" />
        <Path d="M7.2 6.4c.9-1.1 2.1-1.9 3.4-2.2" fill="none" stroke={HILITE} strokeWidth="1.1" strokeLinecap="round" />
      </G>
    </Svg>
  );
}

/** Grandfather clock: hooded case, cream face, pendulum mid-swing. */
export function ClockPendulumIcon({ size = 24, accent = '#7a4a26' }: IconProps) {
  const wood = useMemo(() => gradId('clkW'), []);
  const brass = useMemo(() => gradId('clkB'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={wood} color={accent} />
      <DuoGrad id={brass} from={shade(BRASS, 46)} to={shade(BRASS, -50)} />
      <Ground rx={6.4} cy={21.6} />
      {/* case */}
      <Rect x="7.4" y="5.8" width="9.2" height="13.6" rx="0.5" fill={`url(#${wood})`} stroke={rim(accent)} strokeWidth="1.1" />
      <Rect x="6.5" y="19" width="11" height="2.2" rx="0.5" fill={shade(accent, -24)} stroke={rim(accent)} strokeWidth="0.9" />
      {/* hood with arched crown */}
      <Path d="M6.8 6V4.9c0-.55.45-1 1-1h8.4c.55 0 1 .45 1 1V6Z" fill={shade(accent, -14)} stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M7.7 3.9C8.5 2.4 10.1 1.6 12 1.6s3.5.8 4.3 2.3Z" fill={`url(#${wood})`} stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
      <Circle cx="12" cy="1.3" r="0.6" fill={`url(#${brass})`} stroke={rim(BRASS)} strokeWidth="0.5" />
      {/* face */}
      <Circle cx="12" cy="7.4" r="2.8" fill="#f5ecd8" stroke={BRASS} strokeWidth="0.9" />
      <Path d="M12 5.2v.8M12 8.8v.8M9.8 7.4h.8M13.4 7.4h.8" stroke="#6b5636" strokeWidth="0.55" strokeLinecap="round" />
      <Path d="M12 7.4V5.9M12 7.4l1.2.7" stroke="#3c2c14" strokeWidth="0.7" strokeLinecap="round" />
      <Circle cx="12" cy="7.4" r="0.35" fill={BRASS} />
      {/* glazed door showing the pendulum */}
      <Rect x="9.4" y="10.8" width="5.2" height="7.4" rx="2.2" fill="#241238" stroke={BRASS} strokeWidth="0.7" />
      <Path d="M12 11.1l1.4 4.4" stroke={`url(#${brass})`} strokeWidth="0.7" strokeLinecap="round" />
      <Circle cx="13.4" cy="16.2" r="1.4" fill={`url(#${brass})`} stroke={rim(BRASS)} strokeWidth="0.6" />
      <Path d="M12.7 15.7c.2-.3.5-.5.9-.55" fill="none" stroke={HILITE} strokeWidth="0.5" strokeLinecap="round" />
      <Path d="M10 16.9c.4.5 1 .85 1.6 1" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.5" strokeLinecap="round" />
      {/* wood grain + edge light */}
      <Path d="M8.3 6.6v11.6M15.7 6.6v11.6" stroke={shade(accent, -34)} strokeWidth="0.5" />
      <Path d="M7.9 6.4v12" stroke={HILITE_SOFT} strokeWidth="0.5" />
    </Svg>
  );
}

/** Desk telescope: segmented brass tube aimed skyward on a wooden tripod. */
export function TelescopeMiniIcon({ size = 24, accent = '#d9a441' }: IconProps) {
  const brass = useMemo(() => gradId('tminB'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={brass} from={shade(accent, 48)} to={shade(accent, -52)} />
      <Ground rx={7.6} />
      {/* star it points at */}
      <Path d="M20.2 2.2v2.4M19 3.4h2.4" stroke="#ffd24d" strokeWidth="0.7" strokeLinecap="round" />
      <Circle cx="20.2" cy="3.4" r="0.5" fill="#fff3b8" />
      {/* tripod */}
      <Path d="M11.2 13 6.2 21M12.8 13l5 8M12 13.4v7.8" stroke={shade(WOOD, -8)} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M9.4 16.4l5.2 1.2" stroke={shade(WOOD, -30)} strokeWidth="0.7" strokeLinecap="round" />
      <Circle cx="12" cy="12.7" r="1.5" fill={`url(#${brass})`} stroke={rim(accent)} strokeWidth="0.8" />
      {/* tube (drawn level, tilted as a group) */}
      <G transform="rotate(-27 12 11)">
        <Rect x="5" y="9.6" width="12.6" height="3" rx="1.1" fill={`url(#${brass})`} stroke={rim(accent)} strokeWidth="0.9" />
        <Rect x="8.7" y="9.6" width="0.95" height="3" fill={shade(accent, -40)} />
        <Rect x="12.4" y="9.6" width="0.95" height="3" fill={shade(accent, -40)} />
        <Rect x="3.4" y="10.1" width="1.8" height="2" rx="0.55" fill={shade(accent, -26)} stroke={rim(accent)} strokeWidth="0.7" />
        <Rect x="17.3" y="9.2" width="1.9" height="3.8" rx="0.8" fill={shade(accent, -18)} stroke={rim(accent)} strokeWidth="0.8" />
        <Ellipse cx="19" cy="11.1" rx="0.55" ry="1.35" fill="#bfe9ff" stroke={rim(accent)} strokeWidth="0.5" />
        <Path d="M5.6 10.3h11" stroke={HILITE} strokeWidth="0.6" strokeLinecap="round" />
      </G>
    </Svg>
  );
}

/** The Thinker: hunched stone figure, chin on fist, atop a marble plinth. */
export function StatueThinkerIcon({ size = 24, accent = '#9aa7c4' }: IconProps) {
  const stone = useMemo(() => gradId('thkS'), []);
  const marble = useMemo(() => gradId('thkM'), []);
  const marbleTone = shade(accent, -14);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={stone} color={accent} />
      <BodyGrad id={marble} color={marbleTone} />
      <Ground rx={7.4} cy={21.6} />
      {/* plinth */}
      <Rect x="5.8" y="19.4" width="12.4" height="1.7" rx="0.35" fill={`url(#${marble})`} stroke={rim(marbleTone)} strokeWidth="0.9" />
      <Rect x="6.6" y="16.7" width="10.8" height="2.9" fill={`url(#${marble})`} stroke={rim(marbleTone)} strokeWidth="0.9" />
      <Rect x="5.9" y="15.5" width="12.2" height="1.4" rx="0.3" fill={shade(marbleTone, 22)} stroke={rim(marbleTone)} strokeWidth="0.8" />
      <Path d="M8.2 17.4c1.3.7 2.4.8 3.6.3M13.4 18.6c1-.5 2-.5 3.1-.1" fill="none" stroke={shade(marbleTone, -26)} strokeWidth="0.45" strokeLinecap="round" />
      {/* seated figure, facing left */}
      <G stroke={rim(accent)} strokeWidth="0.85" strokeLinejoin="round">
        <Ellipse cx="12.9" cy="10.3" rx="2.4" ry="3.7" transform="rotate(-24 12.9 10.3)" fill={`url(#${stone})`} />
        <Rect x="8.1" y="11.7" width="5.6" height="2.5" rx="1.25" fill={`url(#${stone})`} />
        <Rect x="8.1" y="12.4" width="2" height="3.4" rx="0.95" fill={`url(#${stone})`} />
        <Circle cx="10.4" cy="5.8" r="1.7" fill={`url(#${stone})`} />
        <Path d="M11.6 7.3c-1.6.4-2.6 1.5-2.9 3.2l-.3 1.7 1.8.3.4-1.9c.2-1 .8-1.7 1.7-2.1Z" fill={`url(#${stone})`} />
        <Circle cx="9.5" cy="7.9" r="0.85" fill={`url(#${stone})`} />
      </G>
      <Path d="M9.2 5.1c.4-.5.9-.8 1.5-.85" fill="none" stroke={HILITE} strokeWidth="0.8" strokeLinecap="round" />
      <Path d="M14.6 7.9c.5 1.2.6 2.6.3 4" fill="none" stroke={shade(accent, -38)} strokeWidth="0.6" strokeLinecap="round" />
    </Svg>
  );
}

/** Potted fern: terracotta pot, arching fronds with paired leaflets. */
export function FernPotIcon({ size = 24, accent = '#3f9a5f' }: IconProps) {
  const terra = useMemo(() => gradId('fernP'), []);
  const TERRA = '#c96b3f';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={terra} color={TERRA} />
      <Ground rx={6.2} />
      {/* fronds */}
      <G stroke={accent} strokeWidth="1" strokeLinecap="round" fill="none">
        <Path d="M12 14.6V4.4" />
        <Path d="M11.6 14.6C9.8 11.2 7.6 8.7 4.7 7.1" />
        <Path d="M12.4 14.6c1.8-3.4 4-5.9 6.9-7.5" />
        <Path d="M11.8 14.6c-1.2-4-2.7-6.7-5.1-8.9" />
        <Path d="M12.2 14.6c1.2-4 2.7-6.7 5.1-8.9" />
      </G>
      <G stroke={shade(accent, 32)} strokeWidth="0.7" strokeLinecap="round">
        <Path d="M12 6.4l-1.5-.9M12 6.4l1.5-.9M12 8.6l-1.8-.7M12 8.6l1.8-.7M12 10.8l-1.9-.4M12 10.8l1.9-.4" />
        <Path d="M6.4 8.2l-.2-1.7M7.9 9.7 8.5 8M9.3 11.4l1-1.5M17.6 8.2l.2-1.7M16.1 9.7 15.5 8M14.7 11.4l-1-1.5" />
        <Path d="M8 7.5 6.5 7M16 7.5l1.5-.5M9.2 9.8 7.6 9.6M14.8 9.8l1.6-.2" />
      </G>
      {/* pot */}
      <Ellipse cx="12" cy="14.8" rx="3.7" ry="0.75" fill="#4a3020" />
      <Rect x="7.1" y="14.4" width="9.8" height="2.1" rx="0.75" fill={shade(TERRA, 18)} stroke={rim(TERRA)} strokeWidth="0.9" />
      <Path d="M8 16.5h8l-1 4.4c-.1.5-.5.8-1 .8h-4c-.5 0-.9-.3-1-.8Z" fill={`url(#${terra})`} stroke={rim(TERRA)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M9.2 17.4l.6 3.4" stroke={HILITE_SOFT} strokeWidth="0.8" strokeLinecap="round" />
      <Path d="M17.3 20.6c.8-.5 1.7-.6 2.4-.2-.6.6-1.4.9-2.4.7Z" fill={shade(accent, -20)} />
    </Svg>
  );
}

/** Framed sunset seascape: gilt frame, glowing sun over a darkening sea. */
export function PaintingSunsetIcon({ size = 24, accent = '#d9a441' }: IconProps) {
  const gold = useMemo(() => gradId('psunF'), []);
  const sky = useMemo(() => gradId('psunS'), []);
  const sea = useMemo(() => gradId('psunW'), []);
  const glow = useMemo(() => gradId('psunG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={gold} from={shade(accent, 46)} to={shade(accent, -50)} />
      <Defs>
        <LinearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#e8467c" />
          <Stop offset="0.55" stopColor="#ff7a3c" />
          <Stop offset="1" stopColor="#ffd24d" />
        </LinearGradient>
        <LinearGradient id={sea} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6a4ba8" />
          <Stop offset="1" stopColor="#2c2168" />
        </LinearGradient>
      </Defs>
      <GlowGrad id={glow} color="#fff3b8" />
      {/* wall shadow + frame */}
      <Rect x="4.6" y="5" width="16.6" height="14.6" rx="1.2" fill={SHADOW} />
      <Rect x="3.6" y="4" width="16.8" height="14.8" rx="1.2" fill={`url(#${gold})`} stroke={rim(accent)} strokeWidth="1.1" />
      <Rect x="5.3" y="5.7" width="13.4" height="11.4" fill="none" stroke={shade(accent, -46)} strokeWidth="0.8" />
      {/* canvas */}
      <Rect x="6.1" y="6.5" width="11.8" height="5.9" fill={`url(#${sky})`} />
      <Rect x="6.1" y="12.4" width="11.8" height="3.8" fill={`url(#${sea})`} />
      <Circle cx="12" cy="11.3" r="3.4" fill={`url(#${glow})`} />
      <Circle cx="12" cy="11.3" r="2" fill="#fff3b8" stroke="#ffb800" strokeWidth="0.6" />
      <Path d="M6.1 12.4h11.8" stroke="#ffdf8a" strokeWidth="0.5" />
      {/* reflection + wave glints + clouds */}
      <Path d="M11 13.4h2M11.4 14.3h1.2M11.7 15.2h.6" stroke="#ffcf6e" strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M7.2 13.7h1.7M15.2 14.7h1.8M8 15.4h1.2" stroke="rgba(255,255,255,0.35)" strokeWidth="0.55" strokeLinecap="round" />
      <Path d="M7.3 8.1c.8-.5 1.7-.5 2.4 0" stroke="rgba(255,236,214,0.7)" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <Path d="M14.4 7.2c.7-.4 1.5-.4 2.1 0" stroke="rgba(255,236,214,0.6)" strokeWidth="0.7" strokeLinecap="round" fill="none" />
      {/* corner rosettes */}
      <Circle cx="4.9" cy="5.3" r="0.5" fill={shade(accent, 40)} />
      <Circle cx="19.1" cy="5.3" r="0.5" fill={shade(accent, 40)} />
      <Circle cx="4.9" cy="17.5" r="0.5" fill={shade(accent, 40)} />
      <Circle cx="19.1" cy="17.5" r="0.5" fill={shade(accent, 40)} />
    </Svg>
  );
}

/** Crystal ball: lit glass sphere with inner star, on a clawed bronze stand. */
export function CrystalBallDecorIcon({ size = 24, accent = '#8a5cff' }: IconProps) {
  const orb = useMemo(() => gradId('cbalO'), []);
  const bronze = useMemo(() => gradId('cbalS'), []);
  const glow = useMemo(() => gradId('cbalG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={orb} from={shade(accent, 72)} to={shade(accent, -66)} />
      <DuoGrad id={bronze} from="#b08948" to="#5f4416" />
      <GlowGrad id={glow} color={shade(accent, 96)} />
      <Ground rx={5.8} />
      {/* stand */}
      <Ellipse cx="12" cy="20.5" rx="4.3" ry="1.15" fill={`url(#${bronze})`} stroke={rim('#8a6a30')} strokeWidth="0.8" />
      <Path d="M8.3 17c.5 1.7 2 2.7 3.7 2.7s3.2-1 3.7-2.7c-1.1.8-2.3 1.2-3.7 1.2S9.4 17.8 8.3 17Z" fill={`url(#${bronze})`} stroke={rim('#8a6a30')} strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M8.9 18.9l-1 1.2M15.1 18.9l1 1.2" stroke="#5f4416" strokeWidth="0.9" strokeLinecap="round" />
      {/* sphere */}
      <Circle cx="12" cy="10.7" r="6.4" fill={`url(#${orb})`} stroke={rim(accent)} strokeWidth="1.1" />
      <Circle cx="12" cy="10.2" r="4.4" fill={`url(#${glow})`} />
      {/* inner mist + star */}
      <Path d="M8 11.7c1.5-2.4 3.9-3.4 6.3-2.6 1.5.5 2.2 1.7 1.9 2.9-1.2-.9-2.6-1.1-4-.6" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="0.8" strokeLinecap="round" />
      <Path d="M13.5 6.9l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6Z" fill="#ffffff" />
      <Circle cx="10" cy="13" r="0.45" fill="rgba(255,255,255,0.8)" />
      <Circle cx="15.3" cy="12.2" r="0.35" fill="rgba(255,255,255,0.65)" />
      {/* glass highlight + contact light */}
      <Path d="M8.2 7.7c.8-1.3 2-2.1 3.5-2.4" fill="none" stroke={HILITE} strokeWidth="1.2" strokeLinecap="round" />
      <Ellipse cx="12" cy="16.6" rx="2.6" ry="0.5" fill={shade(accent, -50)} opacity="0.6" />
    </Svg>
  );
}

/** Crown of Wisdom: jeweled gold crown resting on a tasseled velvet cushion. */
export function CrownWisdomIcon({ size = 24, accent = '#e8b13f' }: IconProps) {
  const gold = useMemo(() => gradId('cwisG'), []);
  const cush = useMemo(() => gradId('cwisC'), []);
  const PURPLE = '#7c4dbf';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={gold} from={shade(accent, 46)} to={shade(accent, -48)} />
      <BodyGrad id={cush} color={PURPLE} />
      <Ground rx={8.4} cy={21.6} />
      {/* cushion */}
      <Ellipse cx="12" cy="19.5" rx="7.6" ry="1.7" fill={shade(PURPLE, -40)} />
      <Path d="M4.2 17.3c0-1.9 3.5-3.1 7.8-3.1s7.8 1.2 7.8 3.1c0 .95-.5 1.75-1.4 2.35H5.6c-.9-.6-1.4-1.4-1.4-2.35Z" fill={`url(#${cush})`} stroke={rim(PURPLE)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M6.4 18.9c3.6.9 7.6.9 11.2 0" fill="none" stroke={shade(PURPLE, -34)} strokeWidth="0.6" strokeLinecap="round" />
      <Path d="M5.4 16.2c1.1-.7 2.5-1.1 4.2-1.4" fill="none" stroke={shade(PURPLE, 40)} strokeWidth="0.7" strokeLinecap="round" />
      {/* corner tassels */}
      <Circle cx="4" cy="17.5" r="0.6" fill={shade(accent, 26)} stroke={rim(accent)} strokeWidth="0.5" />
      <Circle cx="20" cy="17.5" r="0.6" fill={shade(accent, 26)} stroke={rim(accent)} strokeWidth="0.5" />
      <Path d="M4 18.1v1.1M20 18.1v1.1" stroke={shade(accent, -6)} strokeWidth="0.6" strokeLinecap="round" />
      {/* crown points + ball tips */}
      <Path d="M6.9 14.6 6.1 9.4l3.1 2.1L12 7l2.9 4.5 3.1-2.1-.8 5.2Z" fill={`url(#${gold})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Circle cx="6.1" cy="8.9" r="0.7" fill={shade(accent, 40)} stroke={rim(accent)} strokeWidth="0.6" />
      <Circle cx="12" cy="6.4" r="0.8" fill={shade(accent, 40)} stroke={rim(accent)} strokeWidth="0.6" />
      <Circle cx="17.9" cy="8.9" r="0.7" fill={shade(accent, 40)} stroke={rim(accent)} strokeWidth="0.6" />
      {/* circlet band + jewels */}
      <Rect x="6.7" y="13.5" width="10.6" height="2" rx="0.7" fill={`url(#${gold})`} stroke={rim(accent)} strokeWidth="0.9" />
      <Circle cx="12" cy="14.5" r="0.85" fill="#e83a5f" stroke={rim('#e83a5f')} strokeWidth="0.5" />
      <Circle cx="9.1" cy="14.5" r="0.6" fill="#31a6e8" stroke={rim('#31a6e8')} strokeWidth="0.5" />
      <Circle cx="14.9" cy="14.5" r="0.6" fill="#35b892" stroke={rim('#35b892')} strokeWidth="0.5" />
      <Path d="M9 8.9l2.4-1.3" stroke={HILITE} strokeWidth="0.8" strokeLinecap="round" />
      <Path d="M7.4 13.9h9.2" stroke={HILITE_SOFT} strokeWidth="0.5" strokeLinecap="round" />
    </Svg>
  );
}
