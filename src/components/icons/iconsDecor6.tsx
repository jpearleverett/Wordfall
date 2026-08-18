/**
 * Decoration illustrations, part 6 — event-exclusive pieces that previously
 * had no catalog entry at all (they fell through to the treasure-chest
 * fallback) plus the drawn piggy-bank gem jar used by PiggyBankCard.
 * Same recipe as iconsDecor.tsx.
 */
import React, { useMemo } from 'react';
import Svg, {
  Circle, Ellipse, G, Path, Rect,
} from 'react-native-svg';
import { IconProps, VB, BodyGrad, DuoGrad, gradId, rim, shade, HILITE, HILITE_SOFT } from './IconBase';
import { Ground, GlowGrad, BRASS } from './iconsDecor';

/** Community star: gold star lifted by a ring of joined figures. */
export function CommunityStarIcon({ size = 24, accent = '#ffb800' }: IconProps) {
  const gold = useMemo(() => gradId('comsB'), []);
  const glow = useMemo(() => gradId('comsG'), []);
  const FIG = '#7c4dbf';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={gold} from={shade(accent, 52)} to={shade(accent, -46)} />
      <GlowGrad id={glow} color={shade(accent, 70)} />
      <Ground rx={7.6} cy={21.6} />
      <Circle cx="12" cy="8.4" r="6.8" fill={`url(#${glow})`} opacity="0.7" />
      {/* the star */}
      <Path d="M12 2.6l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6Z" fill={`url(#${gold})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M12 5.1l1.2 2.4 2.6.4-1.9 1.85.45 2.6L12 11.1l-2.35 1.25.45-2.6-1.9-1.85 2.6-.4Z" fill="none" stroke={shade(accent, -40)} strokeWidth="0.55" strokeLinejoin="round" />
      <Path d="M10.4 4.9l.8-1.4" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" />
      <Circle cx="16.9" cy="4.4" r="0.35" fill="#ffffff" opacity="0.85" />
      <Circle cx="6.9" cy="5.2" r="0.3" fill="#ffffff" opacity="0.7" />
      {/* ring of figures, arms joined, reaching up */}
      <G stroke={rim(FIG)} strokeWidth="0.7" strokeLinejoin="round">
        <Circle cx="6.4" cy="15.4" r="1.15" fill={shade(FIG, 26)} />
        <Path d="M4.9 20.9c.1-2.6 1.4-4.1 3.4-3.9l1.4 1-.9 2.9Z" fill={shade(FIG, 26)} />
        <Circle cx="12" cy="14.6" r="1.25" fill={FIG} />
        <Path d="M10.1 20.9c0-2.9 1.5-4.5 3.8-4.3 1.4.2 2 1.6 2 4.3Z" fill={FIG} />
        <Circle cx="17.6" cy="15.4" r="1.15" fill={shade(FIG, -22)} />
        <Path d="M19.1 20.9c-.1-2.6-1.4-4.1-3.4-3.9l-1.4 1 .9 2.9Z" fill={shade(FIG, -22)} />
      </G>
      {/* linked arms */}
      <Path d="M7.5 16.9c1.4-.9 2.9-1.3 4.5-1.3s3.1.4 4.5 1.3" fill="none" stroke={shade(FIG, 48)} strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M5.6 14.5c.3-.35.7-.55 1.1-.6M11.1 13.7c.3-.35.7-.55 1.1-.6" fill="none" stroke={HILITE_SOFT} strokeWidth="0.6" strokeLinecap="round" />
    </Svg>
  );
}

/** Gravity-flip crystal: inverted shard levitating over its pedestal. */
export function GravityCrystalIcon({ size = 24, accent = '#31c8e8' }: IconProps) {
  const ice = useMemo(() => gradId('grvB'), []);
  const glow = useMemo(() => gradId('grvG'), []);
  const DARK = '#33304a';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={ice} from={shade(accent, 64)} to={shade(accent, -50)} />
      <GlowGrad id={glow} color={shade(accent, 76)} />
      {/* pedestal (crystal floats above it) */}
      <Ground rx={5.8} cy={21.6} />
      <Ellipse cx="12" cy="20.4" rx="4.2" ry="1.1" fill={DARK} stroke={rim(DARK)} strokeWidth="0.8" />
      <Ellipse cx="12" cy="19.8" rx="2.8" ry="0.75" fill={shade(DARK, 18)} stroke={rim(DARK)} strokeWidth="0.6" />
      <Ellipse cx="12" cy="10" rx="8.2" ry="7.6" fill={`url(#${glow})`} opacity="0.55" />
      {/* levitation rings */}
      <Ellipse cx="12" cy="17.9" rx="4.6" ry="1" fill="none" stroke={shade(accent, 34)} strokeWidth="0.7" opacity="0.85" />
      <Ellipse cx="12" cy="16.4" rx="3" ry="0.7" fill="none" stroke={shade(accent, 54)} strokeWidth="0.55" opacity="0.7" />
      {/* inverted shard — broad shoulders up, point down */}
      <Path d="M12 15.9 7.9 7.6 9.8 4h4.4l1.9 3.6Z" fill={`url(#${ice})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M7.9 7.6h8.2M9.8 4l1 3.6L12 15.9l1.2-8.3 1-3.6" fill="none" stroke={shade(accent, -44)} strokeWidth="0.5" strokeLinejoin="round" />
      <Path d="M9.4 6.4l.7-1.7" stroke="#ffffff" strokeWidth="0.75" strokeLinecap="round" opacity="0.9" />
      {/* particles falling UP */}
      <Path d="M6.6 12.4v-2M17.4 12.4v-2M5.2 8.2V6.6M18.8 8.2V6.6" stroke={shade(accent, 50)} strokeWidth="0.6" strokeLinecap="round" />
      <Path d="M6.6 9.6l-.5.7h1ZM17.4 9.6l-.5.7h1Z" fill={shade(accent, 60)} />
      <Path d="M15.9 2l.35.85.85.35-.85.35-.35.85-.35-.85-.85-.35.85-.35Z" fill="#ffffff" opacity="0.9" />
      <Circle cx="8" cy="2.9" r="0.3" fill="#ffffff" opacity="0.7" />
    </Svg>
  );
}

/** Blitz trophy: gold cup with bolt-shaped handles, checkered plinth band. */
export function BlitzTrophyIcon({ size = 24, accent = '#e8b13f' }: IconProps) {
  const gold = useMemo(() => gradId('bltB'), []);
  const glow = useMemo(() => gradId('bltG'), []);
  const DARK = '#33304a';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={gold} from={shade(accent, 48)} to={shade(accent, -50)} />
      <GlowGrad id={glow} color="#ffd24d" />
      <Ground rx={6.6} cy={21.6} />
      <Circle cx="12" cy="8" r="6.6" fill={`url(#${glow})`} opacity="0.5" />
      {/* bolt handles */}
      <Path d="M7.7 5.2 5.2 7.8l1.6.4-1.9 3 3-1.9-1.5-.5 1.9-2.4Z" fill="#ffd24d" stroke="#c8871a" strokeWidth="0.6" strokeLinejoin="round" />
      <Path d="M16.3 5.2l2.5 2.6-1.6.4 1.9 3-3-1.9 1.5-.5-1.9-2.4Z" fill="#ffd24d" stroke="#c8871a" strokeWidth="0.6" strokeLinejoin="round" />
      {/* cup */}
      <Path d="M7.9 3.6h8.2v4.2c0 3.1-1.7 5.2-4.1 5.2s-4.1-2.1-4.1-5.2Z" fill={`url(#${gold})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Ellipse cx="12" cy="3.6" rx="4.1" ry="0.95" fill={shade(accent, 30)} stroke={rim(accent)} strokeWidth="0.7" />
      {/* engraved bolt */}
      <Path d="M12.8 5.3l-2.1 3.2h1.5l-.9 2.8 2.3-3.5h-1.5Z" fill={shade(accent, -38)} stroke={shade(accent, -58)} strokeWidth="0.45" strokeLinejoin="round" />
      <Path d="M8.7 4.7c-.1 2.2.3 3.9 1.2 5.2" fill="none" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" />
      {/* stem + checkered plinth */}
      <Path d="M10.9 13h2.2l.5 2.3h-3.2Z" fill={`url(#${gold})`} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" />
      <Rect x="7.8" y="15.3" width="8.4" height="1.7" rx="0.4" fill={`url(#${gold})`} stroke={rim(accent)} strokeWidth="0.8" />
      <Rect x="6.8" y="17" width="10.4" height="3.6" rx="0.7" fill={DARK} stroke={rim(DARK)} strokeWidth="0.9" />
      <G fill="#e8e2f2">
        <Rect x="8" y="17.8" width="1.3" height="1" /><Rect x="10.6" y="17.8" width="1.3" height="1" />
        <Rect x="13.2" y="17.8" width="1.3" height="1" /><Rect x="9.3" y="18.8" width="1.3" height="1" />
        <Rect x="11.9" y="18.8" width="1.3" height="1" /><Rect x="14.5" y="18.8" width="1.3" height="1" />
      </G>
    </Svg>
  );
}

/** Ocean wave: curling gilded-crest wave sculpture on a driftwood stand. */
export function OceanWaveIcon({ size = 24, accent = '#31a8e8' }: IconProps) {
  const sea = useMemo(() => gradId('owvB'), []);
  const WOODY = '#8a5a30';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={sea} from={shade(accent, 46)} to={shade(accent, -54)} />
      <Ground rx={7.8} cy={21.5} />
      {/* driftwood stand */}
      <Rect x="5" y="19.1" width="14" height="1.8" rx="0.8" fill={WOODY} stroke={rim(WOODY)} strokeWidth="0.8" />
      <Path d="M6.4 20c2.2-.3 4.5-.3 6.9 0" fill="none" stroke={shade(WOODY, -30)} strokeWidth="0.5" strokeLinecap="round" />
      {/* curling wave */}
      <Path d="M4.9 19.1c-.4-4.6 1.1-8.6 4.5-11.9 2.5-2.4 5.5-3.4 8.9-3-2.4 1.1-3.9 2.6-4.5 4.6 2.9-.9 5.3-.4 7 1.6-3.7 2.9-6.6 3.9-9.6 5.8-1.9 1.2-2.9 2.2-3.4 2.9Z" fill={`url(#${sea})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M6.3 17.4c.1-3.3 1.4-6.2 3.9-8.6" fill="none" stroke={shade(accent, 46)} strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M9.2 16.6c2.4-1.6 4.9-2.6 7.6-4.4" fill="none" stroke={shade(accent, -34)} strokeWidth="0.55" strokeLinecap="round" />
      {/* foam crest */}
      <Path d="M13.8 8.8c.5-.9 1.3-1.6 2.4-2.1M15.8 10.1c2 .1 3.4.8 4.4 2.1" fill="none" stroke="#e8f6ff" strokeWidth="0.8" strokeLinecap="round" />
      <Circle cx="17.9" cy="6.2" r="0.5" fill="#e8f6ff" opacity="0.9" />
      <Circle cx="19.6" cy="8" r="0.4" fill="#e8f6ff" opacity="0.75" />
      <Circle cx="15.3" cy="5" r="0.35" fill="#e8f6ff" opacity="0.7" />
      {/* spray droplets */}
      <Path d="M13.3 5.4c.2-.6.5-1.1 1-1.5M11.6 6.6c0-.7.2-1.3.6-1.9" fill="none" stroke={shade(accent, 60)} strokeWidth="0.6" strokeLinecap="round" />
      <Path d="M6.9 10.9c.6-1.3 1.4-2.4 2.5-3.4" fill="none" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" />
      {/* base swash */}
      <Path d="M13.2 18.2c1.4-.6 2.9-.6 4.5-.1-.9 1-2.4 1.3-4.5 1Z" fill={shade(accent, 26)} stroke={rim(accent)} strokeWidth="0.6" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Piggy jar: the gem piggy bank as a drawn glass jar — gold coin-slot lid,
 * coins and a gem inside. Matches ShopScreen's JarGlyph material story so
 * the Home compact card and the shop card read as the same object.
 */
export function PiggyJarIcon({ size = 24, accent = '#e84fd0' }: IconProps) {
  const gold = useMemo(() => gradId('pigL'), []);
  const gem = useMemo(() => gradId('pigJ'), []);
  const glow = useMemo(() => gradId('pigG'), []);
  const coin = (cx: number, cy: number, r: number, i: number) => (
    <G key={i}>
      <Circle cx={cx} cy={cy} r={r} fill="#f0c05a" stroke="#8a5c14" strokeWidth="0.6" />
      <Circle cx={cx} cy={cy} r={r * 0.62} fill="none" stroke="#c8871a" strokeWidth="0.45" />
    </G>
  );
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={gold} from={shade(BRASS, 48)} to={shade(BRASS, -48)} />
      <DuoGrad id={gem} from={shade(accent, 60)} to={shade(accent, -44)} />
      <GlowGrad id={glow} color="#ffd24d" />
      <Ground rx={6.6} cy={21.7} ry={1} />
      <Ellipse cx="12" cy="14" rx="7.6" ry="6.4" fill={`url(#${glow})`} opacity="0.35" />
      {/* lid with coin slot */}
      <Rect x="7.6" y="3" width="8.8" height="2.6" rx="0.9" fill={`url(#${gold})`} stroke={rim(BRASS)} strokeWidth="0.8" />
      <Rect x="10.2" y="3.9" width="3.6" height="0.85" rx="0.4" fill="#241238" />
      <Path d="M8.4 3.7h2.6" stroke={shade(BRASS, 52)} strokeWidth="0.5" strokeLinecap="round" />
      {/* coin dropping in */}
      <G transform="rotate(-18 12 1.9)">
        <Ellipse cx="12" cy="1.9" rx="1.5" ry="1.1" fill="#f0c05a" stroke="#8a5c14" strokeWidth="0.55" />
        <Ellipse cx="12" cy="1.9" rx="0.9" ry="0.6" fill="none" stroke="#c8871a" strokeWidth="0.4" />
      </G>
      {/* glass body */}
      <Path d="M7.9 5.6h8.2c1.3 1.5 2 3.3 2 5.5v6.1c0 2.1-1.4 3.5-3.5 3.5h-5.2c-2.1 0-3.5-1.4-3.5-3.5v-6.1c0-2.2.7-4 2-5.5Z" fill="rgba(190,235,255,0.14)" stroke="#9fd8e8" strokeWidth="0.95" strokeLinejoin="round" />
      {/* treasure inside */}
      {coin(9.4, 18.2, 1.5, 0)}
      {coin(14.4, 18.4, 1.4, 1)}
      {coin(11.9, 16.6, 1.5, 2)}
      <Path d="M12 10.6l2.3 1.9-.9 3h-2.8l-.9-3Z" fill={`url(#${gem})`} stroke={rim(accent)} strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M9.7 12.5h4.6M12 10.6l-.9 1.9.9 3 .9-3Z" fill="none" stroke={shade(accent, -48)} strokeWidth="0.45" strokeLinejoin="round" />
      <Path d="M10.9 11.7l.7-.65" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" />
      {/* glass sheen + sparkle */}
      <Path d="M7.5 8.1c-.6 2.9-.6 6.1 0 9.6" fill="none" stroke={HILITE_SOFT} strokeWidth="0.8" strokeLinecap="round" />
      <Path d="M16.6 7.4c.4.9.7 1.9.8 2.9" fill="none" stroke={HILITE_SOFT} strokeWidth="0.6" strokeLinecap="round" />
      <Path d="M15.9 12.4l.35.85.85.35-.85.35-.35.85-.35-.85-.85-.35.85-.35Z" fill="#ffffff" opacity="0.85" />
    </Svg>
  );
}
