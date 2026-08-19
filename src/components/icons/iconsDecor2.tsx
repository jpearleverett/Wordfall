/**
 * Decoration illustrations, part 2 — furniture & lighting.
 *
 * Same illustration-grade recipe as iconsDecor.tsx (14–22 layered shapes,
 * gradient bodies, rim strokes, top highlights, grounded shadows). Each
 * render depicts its actual catalog item so the collection grid reads as a
 * cabinet of distinct premium objects, not tinted glyph variants.
 */
import React, { useMemo } from 'react';
import Svg, {
  Circle, Ellipse, G, Path, Rect,
} from 'react-native-svg';
import { IconProps, VB, BodyGrad, DuoGrad, gradId, rim, shade, HILITE, HILITE_SOFT } from './IconBase';
import { Ground, GlowGrad, BRASS, WOOD } from './iconsDecor';

/** Oak writing desk: slab top, drawers with brass pulls, quill and inkwell. */
export function OakDeskIcon({ size = 24, accent = '#a97142' }: IconProps) {
  const oak = useMemo(() => gradId('odskB'), []);
  const dark = shade(accent, -26);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={oak} color={accent} />
      <Ground rx={8.6} cy={21.6} />
      {/* legs */}
      <Rect x="4.4" y="15.6" width="1.7" height="5.4" rx="0.4" fill={dark} stroke={rim(accent)} strokeWidth="0.8" />
      <Rect x="17.9" y="15.6" width="1.7" height="5.4" rx="0.4" fill={dark} stroke={rim(accent)} strokeWidth="0.8" />
      {/* drawer apron */}
      <Rect x="4.8" y="11.2" width="14.4" height="4.8" rx="0.6" fill={`url(#${oak})`} stroke={rim(accent)} strokeWidth="1" />
      <Rect x="5.9" y="12.2" width="5.5" height="2.8" rx="0.4" fill={shade(accent, -14)} stroke={rim(accent)} strokeWidth="0.7" />
      <Rect x="12.6" y="12.2" width="5.5" height="2.8" rx="0.4" fill={shade(accent, -14)} stroke={rim(accent)} strokeWidth="0.7" />
      <Circle cx="8.65" cy="13.6" r="0.55" fill={BRASS} stroke={rim(BRASS)} strokeWidth="0.5" />
      <Circle cx="15.35" cy="13.6" r="0.55" fill={BRASS} stroke={rim(BRASS)} strokeWidth="0.5" />
      {/* desktop slab */}
      <Rect x="3.4" y="9.6" width="17.2" height="2.1" rx="0.7" fill={`url(#${oak})`} stroke={rim(accent)} strokeWidth="1" />
      <Path d="M4.6 10.6c4.8-.5 9.9-.5 14.8 0" fill="none" stroke={shade(accent, -38)} strokeWidth="0.5" strokeLinecap="round" />
      <Path d="M4.4 10h6.4" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" />
      {/* paper sheet */}
      <G transform="rotate(-7 8.6 8.4)">
        <Rect x="5.6" y="7.3" width="6" height="2.3" rx="0.3" fill="#f2e9d2" stroke="#c9bb92" strokeWidth="0.6" />
        <Path d="M6.5 8.1h4.2M6.5 8.9h3.2" stroke="#a99a6e" strokeWidth="0.4" strokeLinecap="round" />
      </G>
      {/* inkwell + quill */}
      <Rect x="14.4" y="7.6" width="2.6" height="2.1" rx="0.6" fill="#3c2c58" stroke={rim('#3c2c58')} strokeWidth="0.7" />
      <Ellipse cx="15.7" cy="7.7" rx="1" ry="0.4" fill="#181030" />
      <Path d="M16 7.4C17.3 5.6 18.7 4.1 20.5 3c-.6 2.2-1.6 4-3.2 5.3Z" fill="#efe6cd" stroke="#b8a26a" strokeWidth="0.6" strokeLinejoin="round" />
      <Path d="M16.6 7.1c1-1.3 2-2.4 3.1-3.3" fill="none" stroke="#b8a26a" strokeWidth="0.45" />
    </Svg>
  );
}

/** Antique pedestal table: carved round top, turned column, tripod feet. */
export function AntiqueTableIcon({ size = 24, accent = '#8a4a2f' }: IconProps) {
  const body = useMemo(() => gradId('atabB'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={7.2} cy={21.5} />
      {/* claw feet */}
      <Path d="M11.3 18.2 6.4 20.6c-.5.25-.3.9.2.9h2l3-2Z" fill={shade(accent, -18)} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M12.7 18.2l4.9 2.4c.5.25.3.9-.2.9h-2l-3-2Z" fill={shade(accent, -18)} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M11.4 18.6h1.2l-.1 2.6c0 .5-1 .5-1 0Z" fill={shade(accent, -30)} stroke={rim(accent)} strokeWidth="0.7" />
      {/* turned column with knops */}
      <Rect x="11" y="10.4" width="2" height="8" rx="0.6" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.8" />
      <Ellipse cx="12" cy="11.9" rx="1.7" ry="0.75" fill={shade(accent, 20)} stroke={rim(accent)} strokeWidth="0.7" />
      <Ellipse cx="12" cy="14.3" rx="1.35" ry="0.6" fill={shade(accent, 12)} stroke={rim(accent)} strokeWidth="0.6" />
      <Ellipse cx="12" cy="16.6" rx="1.55" ry="0.65" fill={shade(accent, 20)} stroke={rim(accent)} strokeWidth="0.7" />
      {/* top: thick disc with carved edge */}
      <Ellipse cx="12" cy="8.9" rx="8.3" ry="2.5" fill={shade(accent, -34)} />
      <Ellipse cx="12" cy="8.3" rx="8.3" ry="2.5" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" />
      <Ellipse cx="12" cy="8.1" rx="6.6" ry="1.75" fill="none" stroke={shade(accent, -30)} strokeWidth="0.55" />
      <Ellipse cx="12" cy="8" rx="4.6" ry="1.15" fill="none" stroke={shade(accent, 26)} strokeWidth="0.5" />
      {/* grain + sheen */}
      <Path d="M6.6 7.6c3.3-.9 7.5-.9 10.8 0" fill="none" stroke={shade(accent, -24)} strokeWidth="0.45" strokeLinecap="round" />
      <Path d="M6.8 6.9c1.6-.6 3.4-.9 5.2-.9" fill="none" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" />
      {/* small vase prop */}
      <Path d="M12 3.4c.9 0 1.3.6 1.1 1.4-.15.7-.6 1.1-1.1 1.1s-.95-.4-1.1-1.1c-.2-.8.2-1.4 1.1-1.4Z" fill="#5f86c8" stroke={rim('#5f86c8')} strokeWidth="0.6" />
      <Path d="M11.4 3.3c.15-.6.45-1.1.9-1.5.15.55.5.95 1 1.2" fill="none" stroke="#3f9a5f" strokeWidth="0.6" strokeLinecap="round" />
    </Svg>
  );
}

/** Word Throne: tall arched velvet back, gold frame, tile "W" emblem. */
export function WordThroneIcon({ size = 24, accent = '#7c4dbf' }: IconProps) {
  const velvet = useMemo(() => gradId('wthrV'), []);
  const gold = useMemo(() => gradId('wthrG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={velvet} color={accent} />
      <DuoGrad id={gold} from={shade(BRASS, 46)} to={shade(BRASS, -50)} />
      <Ground rx={8} cy={21.7} />
      {/* stepped base */}
      <Rect x="5" y="19.4" width="14" height="1.9" rx="0.4" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.8" />
      <Rect x="6.2" y="17.8" width="11.6" height="1.8" rx="0.4" fill={shade(accent, -30)} stroke={rim(accent)} strokeWidth="0.8" />
      {/* arched back */}
      <Path d="M6.6 17.8V7.4c0-3.3 2.3-5.3 5.4-5.3s5.4 2 5.4 5.3v10.4Z" fill={`url(#${velvet})`} stroke={rim(accent)} strokeWidth="1.1" strokeLinejoin="round" />
      <Path d="M7.8 16.6V7.6c0-2.5 1.7-4 4.2-4s4.2 1.5 4.2 4v9Z" fill="none" stroke={shade(BRASS, 20)} strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M8.6 4.6c.9-.7 2-1.1 3.4-1.1" fill="none" stroke={HILITE} strokeWidth="1" strokeLinecap="round" />
      {/* crest + finials */}
      <Circle cx="12" cy="1.9" r="0.9" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.6" />
      <Circle cx="6.6" cy="12.1" r="1.1" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.6" />
      <Circle cx="17.4" cy="12.1" r="1.1" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.6" />
      {/* armrests */}
      <Rect x="4.9" y="12.6" width="2.3" height="5.4" rx="1" fill={shade(accent, -14)} stroke={rim(accent)} strokeWidth="0.9" />
      <Rect x="16.8" y="12.6" width="2.3" height="5.4" rx="1" fill={shade(accent, -14)} stroke={rim(accent)} strokeWidth="0.9" />
      {/* letter-tile "W" emblem */}
      <Rect x="9.7" y="7" width="4.6" height="4.6" rx="0.9" fill="#f3ead2" stroke="#b8a26a" strokeWidth="0.7" />
      <Path d="M10.7 8.1l.65 2.4.65-1.7.65 1.7.65-2.4" fill="none" stroke="#6d4a16" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round" />
      {/* seat cushion */}
      <Rect x="7.4" y="14.9" width="9.2" height="3.1" rx="1.2" fill={shade(accent, 16)} stroke={rim(accent)} strokeWidth="0.9" />
      <Path d="M8.6 16.4h6.8" stroke={shade(accent, -34)} strokeWidth="0.6" strokeLinecap="round" />
    </Svg>
  );
}

/** Crystal desk: faceted translucent slab on prism legs, lit from within. */
export function CrystalDeskIcon({ size = 24, accent = '#6fd8e8' }: IconProps) {
  const ice = useMemo(() => gradId('cdskB'), []);
  const glow = useMemo(() => gradId('cdskG'), []);
  const deep = shade(accent, -62);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={ice} from={shade(accent, 68)} to={shade(accent, -46)} />
      <GlowGrad id={glow} color={shade(accent, 80)} />
      <Ground rx={8.4} cy={21.6} />
      <Ellipse cx="12" cy="15" rx="9" ry="5" fill={`url(#${glow})`} opacity="0.5" />
      {/* prism legs */}
      <Path d="M6 11.6l1.9.9-.4 8.3-1.9-.9Z" fill={`url(#${ice})`} stroke={deep} strokeWidth="0.8" strokeLinejoin="round" opacity="0.92" />
      <Path d="M18 11.6l-1.9.9.4 8.3 1.9-.9Z" fill={`url(#${ice})`} stroke={deep} strokeWidth="0.8" strokeLinejoin="round" opacity="0.92" />
      <Path d="M6.6 13.4l.9.4M17.4 13.4l-.9.4" stroke="#ffffff" strokeWidth="0.45" opacity="0.7" />
      {/* faceted slab top */}
      <Path d="M3.4 9.2 7 7l10 .1 3.6 2.3-1.6 2.2H5Z" fill={`url(#${ice})`} stroke={deep} strokeWidth="1" strokeLinejoin="round" opacity="0.95" />
      <Path d="M3.4 9.2h17.2M7 7l1.6 2.2m6.8-2.1 1.7 2.2" fill="none" stroke={shade(accent, -30)} strokeWidth="0.55" />
      <Path d="M4.6 9.9h5.6" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
      {/* embedded glints + sparkle */}
      <Path d="M12 3.6l.55 1.35L13.9 5.5l-1.35.55L12 7.4l-.55-1.35L10.1 5.5l1.35-.55Z" fill="#ffffff" />
      <Circle cx="15.6" cy="4.9" r="0.4" fill="#ffffff" opacity="0.85" />
      <Circle cx="9" cy="5.4" r="0.3" fill="#ffffff" opacity="0.7" />
      <Path d="M7.2 15.6l-.2 3.4M17 15.6l.2 3.4" stroke={shade(accent, 40)} strokeWidth="0.45" opacity="0.8" />
      <Ellipse cx="12" cy="19.9" rx="5.4" ry="0.7" fill={shade(accent, -20)} opacity="0.35" />
    </Svg>
  );
}

/** Candle: brass chamberstick with handle, wax drips, live flame. */
export function CandleDecorIcon({ size = 24, accent = '#f2e2b8' }: IconProps) {
  const brass = useMemo(() => gradId('candB'), []);
  const glow = useMemo(() => gradId('candG'), []);
  const wax = useMemo(() => gradId('candW'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={brass} from={shade(BRASS, 48)} to={shade(BRASS, -52)} />
      <BodyGrad id={wax} color={accent} />
      <GlowGrad id={glow} color="#ffd24d" />
      <Ground rx={6.4} />
      {/* halo */}
      <Circle cx="12" cy="5.6" r="4.6" fill={`url(#${glow})`} />
      {/* chamberstick dish + handle */}
      <Ellipse cx="12" cy="19.2" rx="5.2" ry="1.6" fill={`url(#${brass})`} stroke={rim(BRASS)} strokeWidth="0.9" />
      <Ellipse cx="12" cy="18.5" rx="3.6" ry="1" fill={shade(BRASS, 24)} stroke={rim(BRASS)} strokeWidth="0.6" />
      <Path d="M17 18.2c1.7-.3 2.7.3 2.9 1.4.15.9-.5 1.5-1.5 1.5" fill="none" stroke={`url(#${brass})`} strokeWidth="1.1" strokeLinecap="round" />
      <Circle cx="18.4" cy="21.1" r="0.55" fill={shade(BRASS, 20)} stroke={rim(BRASS)} strokeWidth="0.5" />
      {/* candle body + drips */}
      <Rect x="10.2" y="9.6" width="3.6" height="9" rx="0.7" fill={`url(#${wax})`} stroke="#c2ae7e" strokeWidth="0.8" />
      <Path d="M10.2 10.6c.5 1 .3 2-.1 3.1-.5-.9-.4-2.1.1-3.1Z" fill={shade(accent, 22)} stroke="#c2ae7e" strokeWidth="0.5" />
      <Path d="M13.8 10.2c.6 1.4.6 2.6.1 4-.6-1.2-.7-2.6-.1-4Z" fill={shade(accent, 22)} stroke="#c2ae7e" strokeWidth="0.5" />
      <Ellipse cx="12" cy="9.7" rx="1.8" ry="0.7" fill={shade(accent, 34)} stroke="#c2ae7e" strokeWidth="0.6" />
      <Path d="M10.7 11.4v6.2" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" />
      {/* wick + flame */}
      <Path d="M12 8.4v1.3" stroke="#4a3418" strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M12 3.8c1.2 1.6 1.9 2.8 1.9 4a1.9 1.9 0 1 1-3.8 0c0-1.2.7-2.4 1.9-4Z" fill="#ffb31f" stroke="#e0641a" strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M12 5.9c.55.75.85 1.35.85 1.9a.85.85 0 1 1-1.7 0c0-.55.3-1.15.85-1.9Z" fill="#fff3b8" />
    </Svg>
  );
}

/** Paper lantern: ribbed silk body, gold caps, inner glow, hanging tassel. */
export function PaperLanternIcon({ size = 24, accent = '#e0484f' }: IconProps) {
  const body = useMemo(() => gradId('plntB'), []);
  const gold = useMemo(() => gradId('plntC'), []);
  const glow = useMemo(() => gradId('plntG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <DuoGrad id={gold} from={shade(BRASS, 44)} to={shade(BRASS, -46)} />
      <GlowGrad id={glow} color="#ffcf6e" />
      {/* hanging cord */}
      <Path d="M12 0.6v2.6" stroke={shade(BRASS, -30)} strokeWidth="0.8" strokeLinecap="round" />
      {/* inner light bleeding through */}
      <Ellipse cx="12" cy="11" rx="8.4" ry="6.6" fill={`url(#${glow})`} opacity="0.55" />
      {/* caps */}
      <Rect x="9.3" y="3.1" width="5.4" height="1.7" rx="0.6" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.7" />
      <Rect x="9.3" y="16.6" width="5.4" height="1.6" rx="0.6" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.7" />
      {/* silk body */}
      <Path d="M12 4.7c4.4 0 7.2 2.6 7.2 6s-2.8 6-7.2 6-7.2-2.6-7.2-6 2.8-6 7.2-6Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1.1" />
      {/* ribs */}
      <Path d="M12 4.7c-2.6 3.6-2.6 8.4 0 12M12 4.7c2.6 3.6 2.6 8.4 0 12M12 4.7c-4.5 3.4-4.5 8.6 0 12M12 4.7c4.5 3.4 4.5 8.6 0 12" fill="none" stroke={shade(accent, -34)} strokeWidth="0.55" />
      <Ellipse cx="12" cy="10.7" rx="7.2" ry="1.6" fill="none" stroke={shade(accent, -34)} strokeWidth="0.5" opacity="0.7" />
      {/* hot core + sheen */}
      <Ellipse cx="12" cy="10.9" rx="2.5" ry="3.4" fill="#ffdf8a" opacity="0.75" />
      <Path d="M7.5 7.2c.9-1 2.1-1.7 3.5-2" fill="none" stroke={HILITE} strokeWidth="1" strokeLinecap="round" />
      {/* tassel */}
      <Path d="M12 18.2v1.2" stroke={shade(BRASS, -20)} strokeWidth="0.7" />
      <Circle cx="12" cy="19.7" r="0.6" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.5" />
      <Path d="M11.2 20.2h1.6l-.25 2.6c-.05.5-1.05.5-1.1 0Z" fill="#f0b840" stroke={rim(BRASS)} strokeWidth="0.6" strokeLinejoin="round" />
    </Svg>
  );
}

/** Fireplace: stone surround, mantel shelf, roaring hearth, split logs. */
export function FireplaceDecorIcon({ size = 24, accent = '#8d8398' }: IconProps) {
  const stone = useMemo(() => gradId('fplB'), []);
  const glow = useMemo(() => gradId('fplG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={stone} color={accent} />
      <GlowGrad id={glow} color="#ff9d2e" />
      <Ground rx={9} cy={21.8} ry={1} />
      {/* mantel + columns */}
      <Rect x="2.8" y="3.4" width="18.4" height="2.3" rx="0.6" fill={`url(#${stone})`} stroke={rim(accent)} strokeWidth="1" />
      <Rect x="4" y="5.7" width="3.4" height="15.1" fill={`url(#${stone})`} stroke={rim(accent)} strokeWidth="1" />
      <Rect x="16.6" y="5.7" width="3.4" height="15.1" fill={`url(#${stone})`} stroke={rim(accent)} strokeWidth="1" />
      <Path d="M4.6 8.4h2.2M4.6 12.2h2.2M4.6 16h2.2M17.2 8.4h2.2M17.2 12.2h2.2M17.2 16h2.2" stroke={shade(accent, -32)} strokeWidth="0.5" />
      {/* firebox */}
      <Path d="M7.4 20.8V9.8c0-2.6 2-4.2 4.6-4.2s4.6 1.6 4.6 4.2v11Z" fill="#1c1030" stroke={rim(accent)} strokeWidth="0.9" />
      <Ellipse cx="12" cy="15.4" rx="4.6" ry="4.8" fill={`url(#${glow})`} />
      {/* logs */}
      <Rect x="8.2" y="18.6" width="7.6" height="1.5" rx="0.75" fill={WOOD} stroke={rim(WOOD)} strokeWidth="0.6" transform="rotate(-6 12 19.3)" />
      <Rect x="8.6" y="19.3" width="6.8" height="1.4" rx="0.7" fill={shade(WOOD, -18)} stroke={rim(WOOD)} strokeWidth="0.6" transform="rotate(5 12 20)" />
      {/* flames */}
      <Path d="M12 9.4c1.9 2.3 2.9 4.1 2.9 5.9 0 2-1.3 3.3-2.9 3.3s-2.9-1.3-2.9-3.3c0-1.8 1-3.6 2.9-5.9Z" fill="#ff8b1f" stroke="#d64a12" strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M12 12.6c1 1.4 1.5 2.4 1.5 3.4a1.5 1.5 0 1 1-3 0c0-1 .5-2 1.5-3.4Z" fill="#ffd24d" />
      <Path d="M9.4 12.4c.5.9.7 1.7.6 2.5M14.6 12.4c-.5.9-.7 1.7-.6 2.5" fill="none" stroke="#ffb31f" strokeWidth="0.7" strokeLinecap="round" />
      {/* embers + mantel sheen */}
      <Circle cx="9.4" cy="20.1" r="0.35" fill="#ffcf6e" />
      <Circle cx="14.8" cy="20.4" r="0.3" fill="#ff9d2e" />
      <Path d="M3.8 4.3h7" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" />
    </Svg>
  );
}

/** Aurora lamp: glass dome over ribbons of northern light on a dark base. */
export function AuroraLampIcon({ size = 24, accent = '#35d8b8' }: IconProps) {
  const base = useMemo(() => gradId('aurB'), []);
  const glow = useMemo(() => gradId('aurG'), []);
  const DARK = '#2c2358';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={base} color={DARK} />
      <GlowGrad id={glow} color={shade(accent, 60)} />
      <Ground rx={6.6} />
      {/* ambient glow */}
      <Ellipse cx="12" cy="9.6" rx="8.6" ry="6.8" fill={`url(#${glow})`} opacity="0.6" />
      {/* base */}
      <Ellipse cx="12" cy="19.6" rx="5.4" ry="1.6" fill={`url(#${base})`} stroke={rim(DARK)} strokeWidth="0.9" />
      <Rect x="7.4" y="16.6" width="9.2" height="3" rx="1.1" fill={`url(#${base})`} stroke={rim(DARK)} strokeWidth="0.9" />
      <Path d="M8.6 17.6h2.8" stroke={shade(accent, 30)} strokeWidth="0.6" strokeLinecap="round" />
      <Circle cx="15.2" cy="18.1" r="0.5" fill={shade(accent, 50)} />
      {/* glass dome */}
      <Path d="M5.6 16.6v-5.2C5.6 6.6 8.4 3.2 12 3.2s6.4 3.4 6.4 8.2v5.2Z" fill="rgba(190,240,255,0.14)" stroke="#9fd8e8" strokeWidth="0.9" strokeLinejoin="round" />
      {/* aurora ribbons */}
      <Path d="M6.6 13.6c1.8-2.6 3.4-2.2 4.8.2 1.2 2 2.9 2.1 5-.4" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      <Path d="M6.9 10.4c1.9-2.8 3.6-2.4 5.1.1 1.1 1.8 2.6 1.9 4.6-.5" fill="none" stroke="#7c6ae8" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
      <Path d="M7.8 7.4c1.6-2.2 3.1-2 4.4.2 1 1.6 2.3 1.6 4-.4" fill="none" stroke="#4fc8f0" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
      {/* stars in the dome */}
      <Circle cx="9.2" cy="5.6" r="0.35" fill="#ffffff" opacity="0.9" />
      <Circle cx="14.6" cy="5" r="0.3" fill="#ffffff" opacity="0.75" />
      <Circle cx="16.2" cy="8.2" r="0.3" fill="#ffffff" opacity="0.7" />
      <Path d="M7 12.4c.3-3.6 1.9-6.4 4-7.4" fill="none" stroke={HILITE_SOFT} strokeWidth="0.8" strokeLinecap="round" />
    </Svg>
  );
}

/** Fire sconce: iron wall plate and bracket holding an eternal flame. */
export function FireSconceIcon({ size = 24, accent = '#5a5468' }: IconProps) {
  const iron = useMemo(() => gradId('fscB'), []);
  const glow = useMemo(() => gradId('fscG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={iron} color={accent} />
      <GlowGrad id={glow} color="#ff9d2e" />
      {/* wall plate */}
      <Path d="M4.6 4.4h4.2v13.8l-2.1 2.4-2.1-2.4Z" fill={`url(#${iron})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M5.6 5.6h2.2M5.6 17.4h2.2" stroke={shade(accent, -34)} strokeWidth="0.6" strokeLinecap="round" />
      <Circle cx="6.7" cy="6.9" r="0.45" fill={shade(accent, 34)} />
      <Circle cx="6.7" cy="16.1" r="0.45" fill={shade(accent, 34)} />
      <Path d="M5.2 4.9v11.9" stroke={HILITE_SOFT} strokeWidth="0.6" strokeLinecap="round" />
      {/* scrolled bracket arm */}
      <Path d="M8.8 13.6c2.6.3 4.4-.7 5.6-2.9" fill="none" stroke={`url(#${iron})`} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M9 15.2c1.6.1 2.8-.3 3.8-1.2" fill="none" stroke={shade(accent, -18)} strokeWidth="0.9" strokeLinecap="round" />
      {/* glow */}
      <Circle cx="15.6" cy="7.6" r="5.4" fill={`url(#${glow})`} />
      {/* iron cup */}
      <Path d="M12.6 10.2h6l-.9 2.6c-.3.85-1 1.3-2.1 1.3s-1.8-.45-2.1-1.3Z" fill={`url(#${iron})`} stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
      <Ellipse cx="15.6" cy="10.2" rx="3" ry="0.8" fill={shade(accent, -30)} stroke={rim(accent)} strokeWidth="0.6" />
      <Circle cx="15.6" cy="14.9" r="0.6" fill={shade(accent, 16)} stroke={rim(accent)} strokeWidth="0.5" />
      {/* flame */}
      <Path d="M15.6 3.2c1.7 2.1 2.6 3.7 2.6 5.2a2.6 2.6 0 1 1-5.2 0c0-1.5.9-3.1 2.6-5.2Z" fill="#ff8b1f" stroke="#d64a12" strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M15.6 6.2c.85 1.15 1.3 2 1.3 2.75a1.3 1.3 0 1 1-2.6 0c0-.75.45-1.6 1.3-2.75Z" fill="#ffd24d" />
      <Circle cx="18.9" cy="4.6" r="0.35" fill="#ffcf6e" />
      <Circle cx="12.6" cy="5.2" r="0.3" fill="#ffb31f" />
    </Svg>
  );
}
