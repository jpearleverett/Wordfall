/**
 * Seasonal-stamp motifs — bespoke illustration-grade art for every stamp in
 * SEASONAL_ALBUMS (blind-panel fix: "stock system emoji as central artwork",
 * plus name/art contradictions like an apple labelled 'Ice Cream').
 *
 * Same material recipe as iconsDecor.tsx: 24×24 viewBox, gradient body, rim
 * stroke, white top highlight, small grounded shadow. Nothing here is a
 * recolored generic — each motif draws the *named* subject so a stamp can
 * never contradict its label. STAMP_ICON_BY_ID (bottom of this file) pins
 * every one of the 80 stamp ids to the motif matching its NAME.
 */
import React, { useMemo } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import {
  IconProps, VB, BodyGrad, DuoGrad, gradId, rim, shade, HILITE, HILITE_SOFT,
} from './IconBase';
import { Ground, GlowGrad } from './iconsDecor';

const BOUGH = '#6b4630';
const SOIL = '#5b4232';
const SAND = '#e3c88b';

/** Five-petal blossom head — shared by cherry, sunflower and wreath motifs. */
function Blossom({
  cx, cy, r, fill, edge, core = '#ffe08a',
}: { cx: number; cy: number; r: number; fill: string; edge: string; core?: string }) {
  const pts = [0, 1, 2, 3, 4].map((i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  return (
    <G>
      {pts.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={r * 0.74} fill={fill} stroke={edge} strokeWidth={0.45} />
      ))}
      <Circle cx={cx} cy={cy} r={r * 0.42} fill={core} stroke={edge} strokeWidth={0.4} />
    </G>
  );
}

/** Cherry-blossom branch: dark bough carrying three open blossoms. */
export function StampBlossomBranchIcon({ size = 24, accent = '#f490b6' }: IconProps) {
  const body = useMemo(() => gradId('stBls'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={6.6} cy={21.6} />
      <Path d="M3.2 20.2c3.6-1.1 6.4-3.3 8.4-6.6 1.7-2.9 4-5 6.9-6.2" fill="none" stroke={BOUGH} strokeWidth="1.7" strokeLinecap="round" />
      <Path d="M8.9 15.6c1.6.2 2.8 1.1 3.5 2.7M14.4 9.9c1.5-.5 2.9-.2 4.1.9" fill="none" stroke={shade(BOUGH, -16)} strokeWidth="1" strokeLinecap="round" />
      <Blossom cx={6.7} cy={16.6} r={2.2} fill={`url(#${body})`} edge={rim(accent)} />
      <Blossom cx={12.4} cy={11.2} r={2.6} fill={`url(#${body})`} edge={rim(accent)} />
      <Blossom cx={18} cy={5.9} r={2.1} fill={`url(#${body})`} edge={rim(accent)} />
      <Path d="M11.1 9.4c.5-.5 1.1-.8 1.8-.9" stroke={HILITE} strokeWidth="0.7" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Sunflower: tall stem, broad leaves, ringed golden petal head. */
export function StampSunflowerIcon({ size = 24, accent = '#f2b325' }: IconProps) {
  const body = useMemo(() => gradId('stSfl'), []);
  const LEAF = '#3f9b4f';
  const pet = [...Array(10).keys()].map((i) => {
    const a = (i * 2 * Math.PI) / 10;
    return { x: 12 + 4.4 * Math.cos(a), y: 9 + 4.4 * Math.sin(a), r: (a * 180) / Math.PI };
  });
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={5.4} cy={21.6} />
      <Path d="M12 21V11" fill="none" stroke={LEAF} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M12 17.6c-2.4.5-3.9-.5-4.5-2.8 2.4-.5 3.9.4 4.5 2.8ZM12 15.2c2.3.4 3.8-.6 4.3-2.8-2.3-.4-3.8.5-4.3 2.8Z" fill={LEAF} stroke={rim(LEAF)} strokeWidth="0.6" strokeLinejoin="round" />
      {pet.map((p, i) => (
        <Ellipse key={i} cx={p.x} cy={p.y} rx={2.5} ry={1.35} fill={`url(#${body})`} stroke={rim(accent)} strokeWidth={0.55} rotation={p.r} origin={`${p.x}, ${p.y}`} />
      ))}
      <Circle cx="12" cy="9" r="3.1" fill="#5d3a1c" stroke="#3b2410" strokeWidth="0.8" />
      <G fill="#8a5a2c">
        <Circle cx="11" cy="8.2" r="0.4" /><Circle cx="12.6" cy="8.6" r="0.4" />
        <Circle cx="11.6" cy="9.8" r="0.4" /><Circle cx="13" cy="10" r="0.35" />
      </G>
      <Path d="M9.4 6.4c.5-.5 1.1-.8 1.7-1" stroke={HILITE} strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Flower crown: woven wreath of blossoms with trailing ribbons. */
export function StampFlowerCrownIcon({ size = 24, accent = '#e879c0' }: IconProps) {
  const body = useMemo(() => gradId('stFcr'), []);
  const VINE = '#3f9b4f';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={7} cy={21.6} />
      <Ellipse cx="12" cy="12" rx="8" ry="7.2" fill="none" stroke={VINE} strokeWidth="2.1" />
      <Ellipse cx="12" cy="12" rx="8" ry="7.2" fill="none" stroke={shade(VINE, 34)} strokeWidth="0.7" strokeDasharray="2.4,3" />
      <Path d="M6.2 18.2c-.6 1.6-1.5 2.6-2.7 3M17.8 18.2c.6 1.6 1.5 2.6 2.7 3" fill="none" stroke="#d9b6e8" strokeWidth="1.2" strokeLinecap="round" />
      <Blossom cx={12} cy={4.9} r={2.3} fill={`url(#${body})`} edge={rim(accent)} />
      <Blossom cx={4.6} cy={10.4} r={1.9} fill="#f7d15f" edge="#a67c12" core="#7c4f0c" />
      <Blossom cx={19.4} cy={10.4} r={1.9} fill="#9fb6f0" edge="#3f56a8" />
      <Blossom cx={7.6} cy={17.7} r={1.7} fill={`url(#${body})`} edge={rim(accent)} />
      <Blossom cx={16.4} cy={17.7} r={1.7} fill="#f7d15f" edge="#a67c12" core="#7c4f0c" />
      <Path d="M10.6 3.8c.5-.4 1-.6 1.5-.7" stroke={HILITE} strokeWidth="0.7" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Seedling: two cotyledon leaves rising from a mound of turned soil. */
export function StampSeedlingIcon({ size = 24, accent = '#4cc167' }: IconProps) {
  const body = useMemo(() => gradId('stSdl'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={7.2} cy={21.6} />
      <Path d="M3.6 20.4c1.4-2.4 4.2-3.6 8.4-3.6s7 1.2 8.4 3.6Z" fill={SOIL} stroke={rim(SOIL)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M5.6 19.4c1.6-.7 3-1 4.2-1M14.6 18.6c1.4.1 2.6.4 3.6.9" fill="none" stroke={shade(SOIL, 26)} strokeWidth="0.6" strokeLinecap="round" />
      <Path d="M12 17.4V9.4" fill="none" stroke={shade(accent, -34)} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M12 12.6C9.6 12.6 7.2 11 6.4 8.2c3-1 5.6.4 5.6 4.4Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M12 10.6c2.4 0 4.8-1.6 5.6-4.4-3-1-5.6.4-5.6 4.4Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M8.2 9.2c1.2.4 2.2 1.2 2.9 2.3M15.8 7.4c-1.2.4-2.2 1.2-2.9 2.3" fill="none" stroke={shade(accent, -40)} strokeWidth="0.5" strokeLinecap="round" />
      <Path d="M14.6 6.9c.7-.4 1.4-.6 2-.6" stroke={HILITE} strokeWidth="0.7" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Fern frond: arched midrib with paired pinnae, curled fiddlehead tip. */
export function StampFernLeafIcon({ size = 24, accent = '#3faa5c' }: IconProps) {
  const body = useMemo(() => gradId('stFrn'), []);
  const leaflets = [0, 1, 2, 3, 4, 5];
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={6} cy={21.6} />
      <Path d="M6 20.6C5.4 13.4 8 7.6 14.6 4" fill="none" stroke={shade(accent, -40)} strokeWidth="1.5" strokeLinecap="round" />
      {leaflets.map((i) => {
        const t = i / 5;
        const x = 6 + t * 8.4 + t * t * 0.4;
        const y = 19.4 - t * 13 + t * t * 2.6;
        const len = 4.4 - i * 0.55;
        return (
          <G key={i}>
            <Ellipse cx={x - len / 2} cy={y - 0.6} rx={len / 2} ry={1.25} fill={`url(#${body})`} stroke={rim(accent)} strokeWidth={0.55} rotation={-18} origin={`${x}, ${y}`} />
            <Ellipse cx={x + len / 2} cy={y + 0.6} rx={len / 2} ry={1.25} fill={shade(accent, -16)} stroke={rim(accent)} strokeWidth={0.55} rotation={-18} origin={`${x}, ${y}`} />
          </G>
        );
      })}
      <Path d="M14.6 4c1.9-.5 2.9.4 2.6 2-.2 1.1-1.6 1.2-1.7.1" fill="none" stroke={shade(accent, -30)} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M8 15.2c.6-1.6 1.4-3 2.4-4.2" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Butterfly: four patterned wings, beaded body, curled antennae. */
export function StampButterflyIcon({ size = 24, accent = '#8b6ef0' }: IconProps) {
  const body = useMemo(() => gradId('stBfy'), []);
  const glow = useMemo(() => gradId('stBfyG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from={shade(accent, 60)} to={shade(accent, -48)} />
      <GlowGrad id={glow} color={shade(accent, 70)} />
      <Ground rx={5.6} cy={21.6} />
      <Circle cx="12" cy="11.4" r="8.4" fill={`url(#${glow})`} opacity="0.4" />
      <Path d="M11.2 10.4C8.6 5.6 5.4 3.6 3.2 5.2c-2 1.5-1 5.2 2.2 7 2 1.1 4 1.5 5.8 1.2Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.95" strokeLinejoin="round" />
      <Path d="M12.8 10.4c2.6-4.8 5.8-6.8 8-5.2 2 1.5 1 5.2-2.2 7-2 1.1-4 1.5-5.8 1.2Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.95" strokeLinejoin="round" />
      <Path d="M11.2 13.8c-2.4-.4-4.6.6-5.2 2.6-.6 1.9.8 3.4 2.6 3 1.6-.4 2.6-2.4 2.6-5.6Z" fill={shade(accent, -22)} stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M12.8 13.8c2.4-.4 4.6.6 5.2 2.6.6 1.9-.8 3.4-2.6 3-1.6-.4-2.6-2.4-2.6-5.6Z" fill={shade(accent, -22)} stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
      <G fill="#ffd24d" opacity="0.92">
        <Circle cx="7.2" cy="8.2" r="1.05" /><Circle cx="16.8" cy="8.2" r="1.05" />
        <Circle cx="8.4" cy="15.9" r="0.7" /><Circle cx="15.6" cy="15.9" r="0.7" />
      </G>
      <Path d="M12 8.6c.9 0 1.4.8 1.4 2.6s-.5 5-1.4 6.4c-.9-1.4-1.4-4.6-1.4-6.4s.5-2.6 1.4-2.6Z" fill="#2f2740" stroke="#151022" strokeWidth="0.6" strokeLinejoin="round" />
      <Path d="M11.4 8.2C10.6 7 9.8 6.2 9 5.8M12.6 8.2c.8-1.2 1.6-2 2.4-2.4" fill="none" stroke="#2f2740" strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M5.6 6.4c.8-.6 1.7-.7 2.6-.3" stroke={HILITE} strokeWidth="0.75" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Honeybee in flight over a pollen trail of drifting motes. */
export function StampHoneybeeIcon({ size = 24, accent = '#f0b62e' }: IconProps) {
  const body = useMemo(() => gradId('stBee'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={5.2} cy={21.6} />
      <Path d="M2.6 18.8c2.4-.6 3.8-1.8 4.2-3.6" fill="none" stroke={shade(accent, 40)} strokeWidth="0.8" strokeLinecap="round" strokeDasharray="1.6,2.2" />
      <G fill="#ffe9a8" opacity="0.85">
        <Circle cx="3.2" cy="19.6" r="0.6" /><Circle cx="5.4" cy="18" r="0.45" /><Circle cx="7.2" cy="16.2" r="0.35" />
      </G>
      <Ellipse cx="9.4" cy="7.6" rx="3.4" ry="2.4" fill="rgba(214,240,255,0.72)" stroke="#8fbcd6" strokeWidth="0.6" rotation={-24} origin="9.4, 7.6" />
      <Ellipse cx="14.6" cy="7.2" rx="3" ry="2.1" fill="rgba(214,240,255,0.6)" stroke="#8fbcd6" strokeWidth="0.6" rotation={18} origin="14.6, 7.2" />
      <Ellipse cx="12" cy="12.6" rx="5.6" ry="4.1" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" rotation={-8} origin="12, 12.6" />
      <G fill="#3a2a12">
        <Path d="M11.1 8.8c1.2 2.3 1.5 5.4.9 8-1-.2-1.6-.5-2.1-.9-.3-2.4-.1-4.9.5-7.1Z" />
        <Path d="M14.6 9.6c.8 2 1 4.4.6 6.4-.5.3-1 .5-1.6.6.5-2.4.5-4.8.2-7Z" />
      </G>
      <Circle cx="7.4" cy="11.4" r="2.5" fill={shade(accent, -30)} stroke={rim(accent)} strokeWidth="0.8" />
      <Circle cx="6.6" cy="10.8" r="0.6" fill="#231708" />
      <Path d="M6.4 9.1 5.2 7.6M8.2 8.9 8 7.2" fill="none" stroke="#231708" strokeWidth="0.65" strokeLinecap="round" />
      <Path d="M9.6 14.6c1.6.8 3.3 1 5 .7" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Songbird perched on a twig with three rising song notes. */
export function StampSongbirdIcon({ size = 24, accent = '#37b6e0' }: IconProps) {
  const body = useMemo(() => gradId('stBrd'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={6} cy={21.6} />
      <Path d="M3.4 19.4c3.4.6 6.8.6 10.2 0" fill="none" stroke={BOUGH} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M5.6 19.2c-.6 1-1.3 1.6-2.2 1.9" fill="none" stroke={shade(BOUGH, -14)} strokeWidth="0.9" strokeLinecap="round" />
      <Path d="M8.6 18.6V16M10 18.6V16" fill="none" stroke="#d9a441" strokeWidth="0.8" strokeLinecap="round" />
      <Path d="M9.3 16.4c-3 0-4.9-2-4.9-4.8 0-3 2.2-5.2 5.2-5.2 3.2 0 5 2.1 5.4 5.5l3.4 2.5-3.6.9c-.8 1.1-2.4 1.1-5.5 1.1Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M8.2 12.6c1.7-1.8 3.5-2.6 5.5-2.4" fill="none" stroke={shade(accent, -38)} strokeWidth="0.6" strokeLinecap="round" />
      <Circle cx="11.6" cy="8.6" r="0.75" fill="#1b2334" />
      <Circle cx="11.85" cy="8.35" r="0.25" fill="#ffffff" />
      <Path d="M13.9 9.7 16.6 9l-2.6 1.4Z" fill="#f2a43a" stroke="#a8611a" strokeWidth="0.5" strokeLinejoin="round" />
      <G fill="none" stroke="#e6d9ff" strokeWidth="0.9" strokeLinecap="round">
        <Path d="M18.4 7.4V4.2M20.9 6.6V3.4" />
      </G>
      <G fill="#e6d9ff">
        <Circle cx="17.9" cy="7.5" r="0.85" /><Circle cx="20.4" cy="6.7" r="0.85" />
        <Path d="M18.4 4.2 21 3.4v1L18.4 5.2Z" />
      </G>
      <Path d="M7.2 8.6c.7-1 1.6-1.6 2.7-1.9" stroke={HILITE} strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Dewdrop: fat water bead beaded on a leaf blade, lit from within. */
export function StampDewdropIcon({ size = 24, accent = '#4fc6f2' }: IconProps) {
  const body = useMemo(() => gradId('stDew'), []);
  const glow = useMemo(() => gradId('stDewG'), []);
  const LEAF = '#3f9b4f';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from={shade(accent, 70)} to={shade(accent, -40)} />
      <GlowGrad id={glow} color={shade(accent, 76)} />
      <Ground rx={6.2} cy={21.6} />
      <Path d="M2.6 19.4c3-4.2 8.4-6 18.8-5.4-3.6 4.2-9.6 6.1-18.8 5.4Z" fill={LEAF} stroke={rim(LEAF)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M3.6 18.6c5-2.6 10.6-3.9 16.8-4" fill="none" stroke={shade(LEAF, -30)} strokeWidth="0.6" strokeLinecap="round" />
      <Circle cx="11.6" cy="8.6" r="8" fill={`url(#${glow})`} opacity="0.4" />
      <Path d="M11.6 2.4c2.7 3.5 4.1 6.2 4.1 8.1a4.1 4.1 0 0 1-8.2 0c0-1.9 1.4-4.6 4.1-8.1Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M9.6 11.1c0 1.3.7 2.2 1.9 2.5" fill="none" stroke={shade(accent, -46)} strokeWidth="0.6" strokeLinecap="round" />
      <Ellipse cx="10" cy="8.2" rx="1" ry="1.9" fill="#ffffff" opacity="0.66" rotation={-14} origin="10, 8.2" />
      <Circle cx="13.9" cy="11.6" r="0.55" fill="#ffffff" opacity="0.7" />
    </Svg>
  );
}

/** Rain cloud: layered cumulus with falling raindrop strokes. */
export function StampRainCloudIcon({ size = 24, accent = '#8fa6c8' }: IconProps) {
  const body = useMemo(() => gradId('stRcl'), []);
  const DROP = '#4fc6f2';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={6.4} cy={21.6} />
      <G stroke={DROP} strokeWidth="1.3" strokeLinecap="round" fill="none">
        <Path d="M7.4 14.6 6 18.4M12 15.4l-1.4 4.4M16.6 14.6l-1.4 3.8" />
      </G>
      <Path d="M6.6 20.6l.5-1.4M11.2 21l.5-1.4M15.8 20l.5-1.4" stroke={shade(DROP, 34)} strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <Path d="M6.6 14.2A3.6 3.6 0 0 1 6.9 7c.7-2.5 2.6-3.9 5-3.9 2.3 0 4 1.2 4.8 3.4 2.4.1 3.9 1.5 3.9 3.6s-1.6 4.1-4 4.1Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M8.4 6.9c1-1.5 2.3-2.3 4-2.4" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <Path d="M7.6 12.6c3.4.5 6.8.5 10.2 0" fill="none" stroke={shade(accent, -40)} strokeWidth="0.55" strokeLinecap="round" />
    </Svg>
  );
}

/** Umbrella: scalloped canopy over a curved handle, drops running off. */
export function StampUmbrellaIcon({ size = 24, accent = '#e0554f' }: IconProps) {
  const body = useMemo(() => gradId('stUmb'), []);
  const ALT = '#f2efe6';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={5.8} cy={21.6} />
      <Path d="M12 10.4v8.1c0 1.4-.9 2.2-2.1 2.2-1 0-1.7-.6-1.9-1.5" fill="none" stroke="#7a5230" strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M2.6 11.4C2.6 6.5 6.7 3 12 3s9.4 3.5 9.4 8.4Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M5.7 11.4c0-4.6 1.3-8 3.2-8.2M15.1 3.2c1.9.2 3.2 3.6 3.2 8.2" fill={ALT} stroke={rim(accent)} strokeWidth="0.75" strokeLinejoin="round" opacity="0.92" />
      <Path d="M2.6 11.4c1.6 0 2.4 1 3.1 1 .8 0 1.5-1 3.1-1s2.4 1 3.2 1c.8 0 1.5-1 3.1-1s2.4 1 3.2 1c.7 0 1.5-1 3.1-1" fill="none" stroke={shade(accent, -50)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M12 3V1.4" fill="none" stroke="#7a5230" strokeWidth="1.1" strokeLinecap="round" />
      <Path d="M6.4 7.6c1-2 2.5-3.2 4.4-3.6" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <G fill="#4fc6f2" opacity="0.9">
        <Path d="M3.4 14.4c.7.9 1 1.5 1 2a1 1 0 0 1-2 0c0-.5.3-1.1 1-2Z" />
        <Path d="M20.6 15.4c.7.9 1 1.5 1 2a1 1 0 0 1-2 0c0-.5.3-1.1 1-2Z" />
      </G>
    </Svg>
  );
}

/** Paw print: pad and four toes pressed into soft earth. */
export function StampPawPrintIcon({ size = 24, accent = '#a0764f' }: IconProps) {
  const body = useMemo(() => gradId('stPaw'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={7.4} cy={21.6} />
      <Ellipse cx="12" cy="16.4" rx="9" ry="4.6" fill={shade(SOIL, 14)} stroke={rim(SOIL)} strokeWidth="0.8" />
      <Ellipse cx="12" cy="15.2" rx="4.4" ry="3.5" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.95" />
      <Ellipse cx="6.6" cy="9.9" rx="2.05" ry="2.5" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.85" rotation={-18} origin="6.6, 9.9" />
      <Ellipse cx="10.4" cy="7.6" rx="1.95" ry="2.5" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.85" rotation={-6} origin="10.4, 7.6" />
      <Ellipse cx="14.4" cy="7.8" rx="1.95" ry="2.5" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.85" rotation={7} origin="14.4, 7.8" />
      <Ellipse cx="17.8" cy="10.4" rx="2" ry="2.4" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.85" rotation={20} origin="17.8, 10.4" />
      <Path d="M9.4 13.6c1.2-.9 2.5-1.2 3.8-.9M6 8.9c.4-.6.9-1 1.5-1.1M13.8 6.6c.5-.3 1.1-.4 1.7-.2" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" fill="none" />
      <Path d="M4.2 18.4c1.4.7 3 1.1 4.6 1.3" stroke={shade(SOIL, 30)} strokeWidth="0.6" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Sunrise: half-disc sun with rays lifting over a banded horizon. */
export function StampSunriseIcon({ size = 24, accent = '#f5a72c' }: IconProps) {
  const body = useMemo(() => gradId('stSnr'), []);
  const glow = useMemo(() => gradId('stSnrG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from="#ffe08a" to={shade(accent, -20)} />
      <GlowGrad id={glow} color="#ffd98a" />
      <Ground rx={7.4} cy={21.6} />
      <Circle cx="12" cy="14" r="9.6" fill={`url(#${glow})`} opacity="0.55" />
      <G stroke={shade(accent, 26)} strokeWidth="1.25" strokeLinecap="round" fill="none">
        <Path d="M12 1.6v2.6M4.6 4.6 6.4 6.4M19.4 4.6 17.6 6.4M2 12.4h2.6M19.4 12.4H22" />
      </G>
      <Path d="M4.6 14a7.4 7.4 0 0 1 14.8 0Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M7.4 10.4c1-1.6 2.3-2.6 3.9-3" stroke={HILITE} strokeWidth="0.95" strokeLinecap="round" fill="none" />
      <Path d="M1.8 14.4h20.4" fill="none" stroke="#5b6ba0" strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M2.6 17h7.2M13 17h8.4M5.4 19.4h13.2" fill="none" stroke="#46558a" strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
    </Svg>
  );
}

/** Kite: diamond sail with spars, bow-tie tail streaming on the wind. */
export function StampKiteIcon({ size = 24, accent = '#e05a8f' }: IconProps) {
  const body = useMemo(() => gradId('stKit'), []);
  const ALT = '#f2c53d';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={5} cy={21.6} />
      <Path d="M12 14.4c-.6 2.4-2.2 4.2-4.8 5.4" fill="none" stroke="#cbb7e8" strokeWidth="0.9" strokeLinecap="round" />
      <Path d="M11.2 16.6l-1.7-.5 1.4-1.1ZM9.8 18.6l-1.8-.3 1.3-1.3ZM8.1 20l-1.8-.1 1.2-1.4Z" fill={ALT} stroke="#a8791a" strokeWidth="0.5" strokeLinejoin="round" />
      <Path d="M12 1.8 19.4 9 12 14.4 4.6 9Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M12 1.8 4.6 9h14.8Z" fill={ALT} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" opacity="0.95" />
      <Path d="M12 1.8v12.6M4.6 9h14.8" fill="none" stroke={shade(accent, -52)} strokeWidth="0.7" />
      <Path d="M7.8 6.4 11 3.4" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <Path d="M4.6 9C3 10 2.2 11.4 2.2 13.2" fill="none" stroke="#cbb7e8" strokeWidth="0.7" strokeLinecap="round" strokeDasharray="2,2" />
    </Svg>
  );
}

/** Royal crown: five-point gold band with jewels — the "Legend" stamps. */
export function StampCrownIcon({ size = 24, accent = '#f0c33c' }: IconProps) {
  const body = useMemo(() => gradId('stCrw'), []);
  const glow = useMemo(() => gradId('stCrwG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from={shade(accent, 56)} to={shade(accent, -48)} />
      <GlowGrad id={glow} color="#ffe28a" />
      <Ground rx={7} cy={21.6} />
      <Circle cx="12" cy="11" r="9" fill={`url(#${glow})`} opacity="0.42" />
      <Path d="M3.4 7.6 7 11.6l2.6-6.2L12 10l2.4-4.6L17 11.6l3.6-4 -1.4 8.2H4.8Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Rect x="4.4" y="15.8" width="15.2" height="3.2" rx="1" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" />
      <Path d="M6 17.4h12" fill="none" stroke={shade(accent, -46)} strokeWidth="0.6" />
      <G stroke={rim(accent)} strokeWidth="0.55">
        <Circle cx="8.2" cy="13.4" r="1.15" fill="#e05a8f" />
        <Circle cx="12" cy="12.7" r="1.35" fill="#4fc6f2" />
        <Circle cx="15.8" cy="13.4" r="1.15" fill="#5fd07a" />
      </G>
      <G fill="#ffe9a8">
        <Circle cx="3.4" cy="7.6" r="1.15" /><Circle cx="12" cy="4.4" r="1.15" /><Circle cx="20.6" cy="7.6" r="1.15" />
      </G>
      <Path d="M5.6 16.6h2.6M6.4 10.4 5 8.9" stroke={HILITE} strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Laurel trophy cup on a plinth — the "Master / Champion" stamps. */
export function StampTrophyIcon({ size = 24, accent = '#e8b13f' }: IconProps) {
  const body = useMemo(() => gradId('stTrp'), []);
  const glow = useMemo(() => gradId('stTrpG'), []);
  const PLINTH = '#4a3a26';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from={shade(accent, 52)} to={shade(accent, -50)} />
      <GlowGrad id={glow} color="#ffd870" />
      <Ground rx={6.8} cy={21.6} />
      <Circle cx="12" cy="9" r="7.6" fill={`url(#${glow})`} opacity="0.45" />
      <Path d="M7.6 4.6H4.2c0 3.4 1.4 5.3 4 5.6M16.4 4.6h3.4c0 3.4-1.4 5.3-4 5.6" fill="none" stroke={shade(accent, -18)} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M7.4 3.4h9.2v4.9c0 3.3-1.9 5.5-4.6 5.5s-4.6-2.2-4.6-5.5Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Ellipse cx="12" cy="3.4" rx="4.6" ry="1" fill={shade(accent, 32)} stroke={rim(accent)} strokeWidth="0.7" />
      <Path d="M9.2 6c1.4 1.2 2.3 2.6 2.6 4.2" fill="none" stroke={shade(accent, -44)} strokeWidth="0.55" strokeLinecap="round" />
      <Path d="M8.7 4.8c-.1 2.2.3 3.9 1.2 5.2" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <Path d="M10.9 13.8h2.2l.5 2.4h-3.2Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" />
      <Rect x="7.6" y="16.2" width="8.8" height="1.8" rx="0.5" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.8" />
      <Rect x="6.4" y="18" width="11.2" height="2.8" rx="0.7" fill={PLINTH} stroke={rim(PLINTH)} strokeWidth="0.9" />
      <Path d="M8 19.4h8" fill="none" stroke={shade(accent, 20)} strokeWidth="0.7" strokeLinecap="round" opacity="0.8" />
    </Svg>
  );
}

/** Campfire: crossed logs with a stone ring and a bright layered flame. */
export function StampCampfireIcon({ size = 24, accent = '#f2732c' }: IconProps) {
  const body = useMemo(() => gradId('stCmp'), []);
  const glow = useMemo(() => gradId('stCmpG'), []);
  const LOG = '#8a5a30';
  const STONE = '#6f6a7e';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from="#ffe07a" to={shade(accent, -30)} />
      <GlowGrad id={glow} color="#ffb54d" />
      <Ground rx={7.6} cy={21.6} />
      <Circle cx="12" cy="11" r="9.4" fill={`url(#${glow})`} opacity="0.5" />
      <Path d="M12 3.2c2.6 2.6 4 5 4 7.2a4 4 0 0 1-8 0c0-1.2.5-2.3 1.4-3.4.2 1.2.7 1.9 1.5 2.1.5-2 .9-3.9 1.1-5.9Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M12 8c1.1 1.5 1.7 2.7 1.7 3.7a1.7 1.7 0 0 1-3.4 0c0-.7.6-1.9 1.7-3.7Z" fill="#ffe9a8" opacity="0.9" />
      <Path d="M4.6 18.8 15 14.4" fill="none" stroke={LOG} strokeWidth="2.4" strokeLinecap="round" />
      <Path d="M19.4 18.8 9 14.4" fill="none" stroke={shade(LOG, -18)} strokeWidth="2.4" strokeLinecap="round" />
      <Path d="M6.4 18 13 15.2" fill="none" stroke={shade(LOG, 26)} strokeWidth="0.6" strokeLinecap="round" />
      <G fill={STONE} stroke={rim(STONE)} strokeWidth="0.7">
        <Ellipse cx="4.6" cy="20.2" rx="2.1" ry="1.35" />
        <Ellipse cx="12" cy="20.8" rx="2.4" ry="1.4" />
        <Ellipse cx="19.4" cy="20.2" rx="2.1" ry="1.35" />
      </G>
      <Path d="M3.6 19.6c.4-.5.9-.8 1.5-.8M11 20.2c.5-.5 1.1-.8 1.8-.8" stroke={HILITE_SOFT} strokeWidth="0.6" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Blazing sun: full disc with alternating long and short rays. */
export function StampSunRaysIcon({ size = 24, accent = '#f5b024' }: IconProps) {
  const body = useMemo(() => gradId('stSun'), []);
  const glow = useMemo(() => gradId('stSunG'), []);
  const rays = [...Array(12).keys()];
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from="#ffe58a" to={shade(accent, -34)} />
      <GlowGrad id={glow} color="#ffd24d" />
      <Ground rx={5.6} cy={21.7} />
      <Circle cx="12" cy="11.4" r="11" fill={`url(#${glow})`} opacity="0.5" />
      {rays.map((i) => {
        const a = (i * Math.PI) / 6;
        const inner = 6.2;
        const outer = i % 2 === 0 ? 10.4 : 8.6;
        return (
          <Path
            key={i}
            d={`M${(12 + inner * Math.cos(a)).toFixed(2)},${(11.4 + inner * Math.sin(a)).toFixed(2)} L${(12 + outer * Math.cos(a)).toFixed(2)},${(11.4 + outer * Math.sin(a)).toFixed(2)}`}
            stroke={shade(accent, i % 2 === 0 ? 30 : -6)}
            strokeWidth={i % 2 === 0 ? 1.5 : 1.1}
            strokeLinecap="round"
          />
        );
      })}
      <Circle cx="12" cy="11.4" r="5.6" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" />
      <Path d="M8.6 8.4c1-1.1 2.2-1.7 3.6-1.9" stroke={HILITE} strokeWidth="1" strokeLinecap="round" fill="none" />
      <Circle cx="14.4" cy="14" r="0.55" fill="#ffffff" opacity="0.6" />
    </Svg>
  );
}

/** Beach parasol: striped canopy planted in sand beside a folded towel. */
export function StampParasolIcon({ size = 24, accent = '#e0554f' }: IconProps) {
  const body = useMemo(() => gradId('stPrs'), []);
  const ALT = '#f4efe2';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={8} cy={21.6} />
      <Path d="M2.4 19.6c2.6-1.6 6-2.4 9.6-2.4s7 .8 9.6 2.4v1.6H2.4Z" fill={SAND} stroke={rim(SAND)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M13.6 4.4 9.2 19.6" fill="none" stroke="#8a6a44" strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M3.2 10.2c.8-4.4 5.4-7.4 10.4-6.6 5 .8 8.2 4.9 7.2 9.2Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M8.4 4.6c.1 3 .4 5.7 1 8.2M13.8 3.8c-.9 2.9-1.3 5.7-1.2 8.4" fill={ALT} stroke={rim(accent)} strokeWidth="0.7" strokeLinejoin="round" opacity="0.9" />
      <Path d="M3.2 10.2c1.4-.3 2.3.4 3.1.3.8-.1 1.2-1.2 2.7-1.4 1.5-.2 2.2.7 3 .6.8-.1 1.3-1.2 2.8-1.4 1.5-.2 2.2.7 3 .6.8-.1 1.3-1.1 2.8-1.4" fill="none" stroke={shade(accent, -50)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M6.4 7.4c1.4-1.8 3.2-2.8 5.4-3" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <Path d="M13.8 18.4c1.6-1 3.4-1.2 5.4-.6l-.6 2.2c-2 .2-3.6-.3-4.8-1.6Z" fill="#4fc6f2" stroke="#1d7fa8" strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M15 18.6c1.2-.4 2.4-.5 3.6-.2" stroke={HILITE_SOFT} strokeWidth="0.6" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Ocean wave: curling barrel with a foaming crest and spray. */
export function StampWaveIcon({ size = 24, accent = '#2f97e0' }: IconProps) {
  const body = useMemo(() => gradId('stWav'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from={shade(accent, 52)} to={shade(accent, -52)} />
      <Ground rx={8} cy={21.6} />
      <Path d="M1.8 18.2c3-6.6 6.6-10.6 10.8-12 5-1.6 8.4.6 9.6 5.2-2.2-2.6-4.6-3.4-7.2-2.4 2.4 1.2 3.4 3.2 3 6-1.4-2.6-3.4-3.6-6-3-2.8.6-5.2 2.6-7.2 6.2Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M6 13.6c2.4-3.2 5.2-5 8.4-5.4" fill="none" stroke={shade(accent, 46)} strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M15 6.9c2.4-.5 4.4.1 6 1.9" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <Path d="M1.8 18.4c2 1 3.9 1 5.7 0 1.8 1.1 3.7 1.1 5.6 0 1.9 1.1 3.8 1.1 5.6 0 1.4.8 2.8 1 4.1.6" fill="none" stroke="#bfe8ff" strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M2.6 20.6c2 .9 3.9.9 5.7 0 1.8 1 3.7 1 5.6 0 1.9 1 3.8 1 5.6 0" fill="none" stroke="#8fd0f2" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      <G fill="#eaf7ff">
        <Circle cx="18.4" cy="5.6" r="0.85" /><Circle cx="20.8" cy="7.2" r="0.55" /><Circle cx="16.2" cy="4.4" r="0.45" />
      </G>
    </Svg>
  );
}

/** Ice cream: two scoops on a waffle cone, with a drip and a cherry. */
export function StampIceCreamIcon({ size = 24, accent = '#f28fb1' }: IconProps) {
  const scoop = useMemo(() => gradId('stIce'), []);
  const cone = useMemo(() => gradId('stIceC'), []);
  const CONE = '#d8a45e';
  const MINT = '#8fe0c0';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={scoop} color={accent} />
      <BodyGrad id={cone} color={CONE} />
      <Ground rx={4.8} cy={21.6} />
      <Path d="M7.4 12.6h9.2L12 21.4Z" fill={`url(#${cone})`} stroke={rim(CONE)} strokeWidth="1" strokeLinejoin="round" />
      <G stroke={shade(CONE, -34)} strokeWidth="0.55" fill="none">
        <Path d="M9.2 12.6 12.8 21M14.8 12.6 11.2 21M8.2 14.6h7.6M9.4 17h5.2" />
      </G>
      <Ellipse cx="12" cy="12.2" rx="6" ry="2" fill={MINT} stroke={rim(MINT)} strokeWidth="0.85" />
      <Path d="M6.2 11.6c0-2.5 2.6-4.2 5.8-4.2s5.8 1.7 5.8 4.2c0 1.1-1 1.5-2.4 1.1-1.1-.3-2.1.5-3.4.5s-2.3-.8-3.4-.5c-1.4.4-2.4 0-2.4-1.1Z" fill={MINT} stroke={rim(MINT)} strokeWidth="0.9" strokeLinejoin="round" />
      <Circle cx="12" cy="6.4" r="4.4" fill={`url(#${scoop})`} stroke={rim(accent)} strokeWidth="1" />
      <Path d="M9.2 4.4c.7-1 1.7-1.6 2.9-1.8" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <Path d="M8.3 8.9c.9.8 1.9 1.2 3 1.3" fill="none" stroke={shade(accent, -42)} strokeWidth="0.55" strokeLinecap="round" />
      <Circle cx="12" cy="1.9" r="1.5" fill="#e0453f" stroke="#8c1f1c" strokeWidth="0.6" />
      <Path d="M12 .5c.6-.7 1.2-1 1.9-.9" fill="none" stroke="#3f7c2c" strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M16.4 12.4c.8 1.1 1 2.1.5 3-.5.9-1.5.7-1.6-.4-.1-.8.3-1.7 1.1-2.6Z" fill={MINT} stroke={rim(MINT)} strokeWidth="0.6" strokeLinejoin="round" />
    </Svg>
  );
}

/** Star trail: bright star drawing a comet-arc of smaller stars. */
export function StampStarTrailIcon({ size = 24, accent = '#ffd24d' }: IconProps) {
  const body = useMemo(() => gradId('stStr'), []);
  const glow = useMemo(() => gradId('stStrG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from="#fff3c4" to={shade(accent, -44)} />
      <GlowGrad id={glow} color="#ffe98a" />
      <Ground rx={5} cy={21.7} />
      <Path d="M2.6 20.4C5 13.4 9.4 8.4 15.8 5.4" fill="none" stroke={shade(accent, 40)} strokeWidth="0.9" strokeLinecap="round" strokeDasharray="1.2,2.6" opacity="0.8" />
      <Circle cx="15.6" cy="7.6" r="7.4" fill={`url(#${glow})`} opacity="0.45" />
      <Path d="M15.6 2.2 17.6 6.6 22.4 7.2 18.9 10.5 19.8 15.2 15.6 12.9 11.4 15.2 12.3 10.5 8.8 7.2 13.6 6.6Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M13.4 5.4l1.4-2.2" stroke={HILITE} strokeWidth="0.85" strokeLinecap="round" fill="none" />
      <G fill={shade(accent, 22)} stroke={rim(accent)} strokeWidth="0.45">
        <Path d="M7.6 13.4l.85 1.75 1.95.28-1.4 1.34.33 1.93-1.73-.92-1.73.92.33-1.93-1.4-1.34 1.95-.28Z" />
        <Path d="M3.4 17.8l.6 1.25 1.4.2-1 .95.24 1.38-1.24-.66-1.24.66.24-1.38-1-.95 1.4-.2Z" />
      </G>
      <Circle cx="10.6" cy="11" r="0.5" fill="#ffffff" opacity="0.8" />
    </Svg>
  );
}

/** Firefly jar: glass jar, punched lid, four glowing bugs inside. */
export function StampFireflyJarIcon({ size = 24, accent = '#a9f05a' }: IconProps) {
  const glow = useMemo(() => gradId('stFfG'), []);
  const GLASS = 'rgba(196,228,240,0.34)';
  const LID = '#c9963c';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <GlowGrad id={glow} color={accent} />
      <Ground rx={5.8} cy={21.6} />
      <Circle cx="12" cy="13" r="8.6" fill={`url(#${glow})`} opacity="0.42" />
      <Path d="M8.2 5.4h7.6v2.1c0 1 2 2.2 2 4.5v6.6c0 1.6-1.1 2.6-3 2.6H9.2c-1.9 0-3-1-3-2.6V12c0-2.3 2-3.5 2-4.5Z" fill={GLASS} stroke="#9fd0e4" strokeWidth="1" strokeLinejoin="round" />
      <Path d="M8.4 11.6c-.6 1.4-.8 3-.6 4.8" fill="none" stroke="#eaf9ff" strokeWidth="0.9" strokeLinecap="round" opacity="0.85" />
      <Rect x="7.4" y="3.4" width="9.2" height="2.6" rx="0.8" fill={LID} stroke={rim(LID)} strokeWidth="0.9" />
      <G fill={shade(LID, -40)}>
        <Circle cx="9.6" cy="4.7" r="0.32" /><Circle cx="11.3" cy="4.7" r="0.32" />
        <Circle cx="13" cy="4.7" r="0.32" /><Circle cx="14.7" cy="4.7" r="0.32" />
      </G>
      <G stroke={shade(accent, -50)} strokeWidth="0.5">
        <Circle cx="10.2" cy="12.4" r="1.35" fill={accent} />
        <Circle cx="14.2" cy="14.6" r="1.15" fill={shade(accent, -12)} />
        <Circle cx="10.8" cy="17" r="1" fill={shade(accent, -6)} />
        <Circle cx="14.6" cy="10.4" r="0.85" fill={shade(accent, 20)} />
      </G>
      <G fill="#ffffff" opacity="0.75">
        <Circle cx="9.9" cy="12" r="0.4" /><Circle cx="13.9" cy="14.2" r="0.35" />
      </G>
      <Path d="M8.6 6.2h6.8" fill="none" stroke="#eaf9ff" strokeWidth="0.6" opacity="0.7" />
    </Svg>
  );
}

/** Beach ball: paneled inflatable bobbing in pool water. */
export function StampBeachBallIcon({ size = 24, accent = '#e0554f' }: IconProps) {
  const body = useMemo(() => gradId('stBbl'), []);
  const POOL = '#3fc0e8';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={7} cy={21.6} />
      <Circle cx="12" cy="10.6" r="7.8" fill="#f6f2e8" stroke="#a89880" strokeWidth="1" />
      <Path d="M12 2.8c2.4 2 3.6 4.6 3.6 7.8s-1.2 5.8-3.6 7.8Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M12 2.8c-2.4 2-3.6 4.6-3.6 7.8s1.2 5.8 3.6 7.8Z" fill="#f2c53d" stroke="#a8791a" strokeWidth="0.7" strokeLinejoin="round" opacity="0.95" />
      <Path d="M12 2.8c-4 1.5-6.3 4.1-6.9 7.8h13.8c-.6-3.7-2.9-6.3-6.9-7.8Z" fill={POOL} stroke={rim(POOL)} strokeWidth="0.7" strokeLinejoin="round" opacity="0.75" />
      <Circle cx="12" cy="10.6" r="1.5" fill="#f6f2e8" stroke="#a89880" strokeWidth="0.6" />
      <Path d="M7 6.6c1-1.4 2.3-2.3 3.9-2.7" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <Path d="M1.8 17.4c1.9 1.1 3.8 1.1 5.6 0 1.9 1.1 3.8 1.1 5.6 0 1.9 1.1 3.8 1.1 5.6 0" fill="none" stroke={POOL} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M2.6 20c1.9 1.1 3.8 1.1 5.6 0 1.9 1.1 3.8 1.1 5.6 0 1.7.9 3.3 1.1 4.8.4" fill="none" stroke={shade(POOL, 32)} strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
    </Svg>
  );
}

/** Waterfall: cascade dropping between rock ledges into a plunge pool. */
export function StampWaterfallIcon({ size = 24, accent = '#3fb0e8' }: IconProps) {
  const body = useMemo(() => gradId('stWfl'), []);
  const ROCK = '#5f6a86';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from={shade(accent, 64)} to={shade(accent, -36)} />
      <Ground rx={7.6} cy={21.6} />
      <Path d="M1.8 6.4h7.4c1 0 1.6.5 1.6 1.4v10.4H1.8Z" fill={ROCK} stroke={rim(ROCK)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M22.2 4.4h-7c-1 0-1.6.5-1.6 1.4v12.4h8.6Z" fill={shade(ROCK, -14)} stroke={rim(ROCK)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M3.4 9.4h5.2M2.6 12.6h6.4M15.4 7.4h5.6M15 11h6" fill="none" stroke={shade(ROCK, 26)} strokeWidth="0.6" strokeLinecap="round" />
      <Path d="M10.8 5.4h2.8v12.4h-2.8Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.85" strokeLinejoin="round" />
      <Path d="M11.6 6.4v10.4M12.9 6.8v10" fill="none" stroke="#eaf9ff" strokeWidth="0.6" strokeLinecap="round" opacity="0.8" />
      <Path d="M10.8 5.4c1-1 2-1 2.8 0Z" fill="#eaf9ff" />
      <Path d="M2.2 17.8c2 1.2 4 1.2 5.9 0 2 1.2 4 1.2 5.9 0 2 1.2 4 1.2 5.9 0" fill="none" stroke={accent} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M2.6 20.4c2 1.2 4 1.2 5.9 0 2 1.2 4 1.2 5.9 0 1.8 1 3.5 1.2 5.1.4" fill="none" stroke={shade(accent, 34)} strokeWidth="1.1" strokeLinecap="round" />
      <G fill="#eaf9ff" opacity="0.85">
        <Circle cx="9.6" cy="17" r="0.75" /><Circle cx="14.4" cy="16.2" r="0.55" /><Circle cx="12" cy="18.4" r="0.5" />
      </G>
    </Svg>
  );
}

/** Palm tree: curved trunk with fronds and coconuts on a sand islet. */
export function StampPalmTreeIcon({ size = 24, accent = '#3fb36a' }: IconProps) {
  const body = useMemo(() => gradId('stPlm'), []);
  const TRUNK = '#9a6b3c';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={8} cy={21.6} />
      <Path d="M2.6 20.4c2.2-1.8 5.4-2.8 9.4-2.8s7.2 1 9.4 2.8v1H2.6Z" fill={SAND} stroke={rim(SAND)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M13.4 19.4C11.6 14.6 11.2 10 12.2 5.6" fill="none" stroke={TRUNK} strokeWidth="2.1" strokeLinecap="round" />
      <G stroke={shade(TRUNK, -30)} strokeWidth="0.5" fill="none">
        <Path d="M11.7 9.2h2M11.9 12.2h2.1M12.5 15.2h2" />
      </G>
      <Path d="M12.2 5.4c-2.8-2-5.4-2-7.8 0 2.4-.6 4.6-.2 6.6 1.2ZM12.2 5.4c1.6-3 3.8-4 6.6-3-2.2.6-3.8 2-4.8 4.2ZM12.4 6c3.2-.4 5.4.9 6.6 3.8-2-1.7-4-2.4-6.2-2.1ZM11.6 6.4c-2.8.9-4.4 2.9-4.8 6 1-2.5 2.6-4.1 4.9-4.8Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.85" strokeLinejoin="round" />
      <Path d="M6.6 6.4c1.6-.3 3 0 4.2.9M15.4 3.6c1.1-.3 2.1-.2 3 .2" stroke={HILITE} strokeWidth="0.7" strokeLinecap="round" fill="none" />
      <G fill="#8a5a30" stroke="#4f3218" strokeWidth="0.5">
        <Circle cx="10.9" cy="7.6" r="1.05" /><Circle cx="13.2" cy="8" r="0.95" />
      </G>
      <Path d="M4.4 19.6c1.6-.6 3.2-.9 4.8-1" stroke={shade(SAND, -26)} strokeWidth="0.6" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Sandcastle: two towers, crenellated wall, flag, bucket-packed sand. */
export function StampSandcastleIcon({ size = 24, accent = '#e0bc74' }: IconProps) {
  const body = useMemo(() => gradId('stCst'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={8.2} cy={21.6} />
      <Path d="M1.8 20.2c2.6-1.4 5.8-2.1 10.2-2.1s7.6.7 10.2 2.1v1.2H1.8Z" fill={shade(accent, -18)} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" />
      <Rect x="3.4" y="10.4" width="4.4" height="9" rx="0.5" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.9" />
      <Rect x="16.2" y="10.4" width="4.4" height="9" rx="0.5" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.9" />
      <Rect x="8.2" y="13.4" width="7.6" height="6" rx="0.5" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.9" />
      <G fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.7">
        <Rect x="3.4" y="8.8" width="1.4" height="1.8" /><Rect x="5.4" y="8.8" width="1.4" height="1.8" />
        <Rect x="16.2" y="8.8" width="1.4" height="1.8" /><Rect x="18.2" y="8.8" width="1.4" height="1.8" />
        <Rect x="8.2" y="11.9" width="1.6" height="1.7" /><Rect x="11.2" y="11.9" width="1.6" height="1.7" />
        <Rect x="14.2" y="11.9" width="1.6" height="1.7" />
      </G>
      <Path d="M11.2 15.4h1.6v4h-1.6Z" fill="#7a5a2c" stroke={rim(accent)} strokeWidth="0.6" />
      <Path d="M12 8.8V3.4" fill="none" stroke="#6f6a7e" strokeWidth="0.8" strokeLinecap="round" />
      <Path d="M12 3.6 17 5.2 12 6.8Z" fill="#e0554f" stroke="#8c1f1c" strokeWidth="0.6" strokeLinejoin="round" />
      <Rect x="9.6" y="8.8" width="4.8" height="3.1" rx="0.5" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.9" />
      <Path d="M4.2 11.4v6.6M17 11.4v6.6" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" fill="none" />
      <G fill={shade(accent, -34)} opacity="0.6">
        <Circle cx="6" cy="20.4" r="0.35" /><Circle cx="15" cy="20.6" r="0.3" /><Circle cx="19.4" cy="20.3" r="0.3" />
      </G>
    </Svg>
  );
}

/** Sailboat: hull cutting water under a mainsail and jib at sunset. */
export function StampSailboatIcon({ size = 24, accent = '#f4efe2' }: IconProps) {
  const body = useMemo(() => gradId('stSbt'), []);
  const HULL = '#8a5a30';
  const SEA = '#2f97e0';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={7.6} cy={21.6} />
      <Circle cx="12" cy="9" r="6.2" fill="#f5b024" opacity="0.22" />
      <Path d="M12 2.2v11.2" fill="none" stroke="#6b4630" strokeWidth="0.9" strokeLinecap="round" />
      <Path d="M11.2 3.2v10.2H5.4Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M12.8 6.4v7h4.6Z" fill={shade(accent, -14)} stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M10.2 5.6v7.2M9.2 8v4.8" fill="none" stroke={shade(accent, -34)} strokeWidth="0.5" />
      <Path d="M10.8 4.6v3" stroke={HILITE} strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <Path d="M3.6 13.6h16.8l-2.6 3.8H6.2Z" fill={HULL} stroke={rim(HULL)} strokeWidth="0.95" strokeLinejoin="round" />
      <Path d="M5.4 14.8h13.2" fill="none" stroke={shade(HULL, 30)} strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M1.8 18.4c1.9 1 3.8 1 5.6 0 1.9 1 3.8 1 5.6 0 1.9 1 3.8 1 5.6 0" fill="none" stroke={SEA} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M2.8 20.6c1.9 1 3.8 1 5.6 0 1.9 1 3.8 1 5.6 0 1.6.8 3.1 1 4.6.5" fill="none" stroke={shade(SEA, 30)} strokeWidth="1" strokeLinecap="round" opacity="0.85" />
    </Svg>
  );
}

/** Coral reef: branching coral heads with a fan and drifting bubbles. */
export function StampCoralIcon({ size = 24, accent = '#f2698f' }: IconProps) {
  const body = useMemo(() => gradId('stCrl'), []);
  const ALT = '#f2a83d';
  const FAN = '#8b6ef0';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={8} cy={21.6} />
      <Path d="M2.4 20.4c2.6-1.2 5.8-1.8 9.6-1.8s7 .6 9.6 1.8v1H2.4Z" fill={SAND} stroke={rim(SAND)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M17.4 19.4c-1.4-2.6-1.6-5.2-.4-7.8 2.6 1 3.8 3.6 3.4 7.8Z" fill={FAN} stroke={rim(FAN)} strokeWidth="0.85" strokeLinejoin="round" opacity="0.92" />
      <G stroke={shade(FAN, 40)} strokeWidth="0.5" fill="none">
        <Path d="M17.6 18.8c-.4-2.2-.2-4.2.6-6M19 19c-.2-2-.1-3.8.4-5.4" />
      </G>
      <Path d="M8.6 19.4c-.6-2.4-.5-4.6.4-6.6" fill="none" stroke={`url(#${body})`} strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M9 15.4c-1.2-1.2-1.6-2.6-1.2-4.2M9.4 13.4c1.4-1 2.1-2.4 2-4.2M9.2 10.6c-1.6-.6-2.6-1.7-3-3.4" fill="none" stroke={`url(#${body})`} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M5.2 19.4c-.6-1.8-.4-3.4.6-5 .9 1.7 1 3.4.4 5Z" fill={ALT} stroke={rim(ALT)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M13.4 19.4c-.5-2-.2-3.8 1-5.4 1.1 1.6 1.4 3.4.8 5.4Z" fill={ALT} stroke={rim(ALT)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M7.4 11.2c.3-.9.8-1.6 1.5-2.1" stroke={HILITE} strokeWidth="0.7" strokeLinecap="round" fill="none" />
      <G fill="#eaf9ff" opacity="0.75">
        <Circle cx="4.4" cy="8.4" r="1" /><Circle cx="6.4" cy="5.4" r="0.65" /><Circle cx="13.4" cy="6" r="0.8" /><Circle cx="15.6" cy="3.6" r="0.5" />
      </G>
    </Svg>
  );
}

/** Surfboard: waxed longboard planted in sand with a curling wave behind. */
export function StampSurfboardIcon({ size = 24, accent = '#f2c53d' }: IconProps) {
  const body = useMemo(() => gradId('stSrf'), []);
  const SEA = '#2f97e0';
  const STRIPE = '#e0554f';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={7.4} cy={21.6} />
      <Path d="M1.6 15.6c2.4-4.6 5.4-6.8 9-6.4 2.6.3 4 1.8 4.2 4.4-1.4-1.8-3-2.4-4.8-1.8 1.6.9 2.3 2.2 2 4-1-1.8-2.4-2.5-4.2-2-1.9.5-3.6 1.9-5 4.2Z" fill={SEA} stroke={rim(SEA)} strokeWidth="0.9" strokeLinejoin="round" opacity="0.9" />
      <Path d="M2.4 19.6c2.4-1.2 5.6-1.8 9.6-1.8s7.6.6 10 1.8v1.6H2.4Z" fill={SAND} stroke={rim(SAND)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M16.4 2.6c2.4 2.6 3.4 6.2 3.4 9.6s-1 6.4-3.4 8.2c-2.4-1.8-3.4-4.8-3.4-8.2s1-7 3.4-9.6Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" rotation={14} origin="16.4, 11.6" />
      <G rotation={14} origin="16.4, 11.6">
        <Path d="M16.4 3.6v16.6" fill="none" stroke={shade(accent, -46)} strokeWidth="0.6" />
        <Path d="M14.6 8.4h3.6v2.4h-3.6Z" fill={STRIPE} stroke={rim(STRIPE)} strokeWidth="0.6" />
        <Path d="M14.8 14h3.2v1.8h-3.2Z" fill={STRIPE} opacity="0.85" />
        <Path d="M15 5.9c.3-.9.7-1.7 1.2-2.3" stroke={HILITE} strokeWidth="0.85" strokeLinecap="round" fill="none" />
      </G>
      <G fill="#eaf7ff">
        <Circle cx="6.6" cy="7.4" r="0.7" /><Circle cx="9.4" cy="5.6" r="0.45" />
      </G>
    </Svg>
  );
}

/** Lemonade: chilled glass with lemon wheel, straw, ice cubes. */
export function StampLemonadeIcon({ size = 24, accent = '#f2d23d' }: IconProps) {
  const body = useMemo(() => gradId('stLem'), []);
  const GLASS = 'rgba(206,234,246,0.4)';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={5.4} cy={21.6} />
      <Path d="M14.4 3.4 12.6 9" fill="none" stroke="#e0554f" strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M6.6 6.6h10.8l-1.5 13c-.1.9-.7 1.4-1.7 1.4h-4.4c-1 0-1.6-.5-1.7-1.4Z" fill={GLASS} stroke="#9fd0e4" strokeWidth="1" strokeLinejoin="round" />
      <Path d="M7.3 10.4h9.4l-1.2 9.2c0 .5-.4.8-1 .8h-5c-.6 0-1-.3-1-.8Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.8" strokeLinejoin="round" />
      <G fill="#eaf9ff" opacity="0.85" stroke="#9fd0e4" strokeWidth="0.5">
        <Rect x="8.4" y="11.4" width="2.6" height="2.4" rx="0.4" rotation={-12} origin="9.7, 12.6" />
        <Rect x="12.4" y="13.8" width="2.4" height="2.2" rx="0.4" rotation={16} origin="13.6, 14.9" />
      </G>
      <Path d="M8.4 12.6c-.3 2.6-.2 4.9.4 6.9" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" fill="none" />
      <Circle cx="17.6" cy="7.6" r="3.1" fill={shade(accent, 26)} stroke={rim(accent)} strokeWidth="0.85" />
      <G stroke={shade(accent, -46)} strokeWidth="0.5" fill="none">
        <Path d="M17.6 4.5v6.2M14.5 7.6h6.2M15.4 5.4l4.4 4.4M19.8 5.4l-4.4 4.4" />
      </G>
      <Circle cx="17.6" cy="7.6" r="0.5" fill="#fff8d8" />
      <Path d="M6.6 6.6h10.8" fill="none" stroke="#eaf9ff" strokeWidth="0.7" opacity="0.8" />
    </Svg>
  );
}

/** Autumn leaf: lobed maple leaf with veins, drifting on its stem. */
export function StampAutumnLeafIcon({ size = 24, accent = '#e2732a' }: IconProps) {
  const body = useMemo(() => gradId('stLef'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={6} cy={21.6} />
      <Path d="M12 19.8v-4.4" fill="none" stroke="#7a4a24" strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M12 2.4l1.9 3.1 2.3-.7-.6 2.4 3.3-.5-1.7 2.6 3.2 1.2-2.6 1.8 1.9 2.3-3.4.2.5 2.6-3-1.4L12 18.6l-1.8-2.1-3 1.4.5-2.6-3.4-.2 1.9-2.3-2.6-1.8 3.2-1.2L5.1 7.2l3.3.5-.6-2.4 2.3.7Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <G stroke={shade(accent, -46)} strokeWidth="0.55" fill="none" strokeLinecap="round">
        <Path d="M12 16.4V5.6M12 11.4 7.4 8.4M12 11.4l4.6-3M12 14.4l-3.6 1.4M12 14.4l3.6 1.4" />
      </G>
      <Path d="M10.4 6.4c.4-.9.9-1.6 1.6-2.2" stroke={HILITE} strokeWidth="0.85" strokeLinecap="round" fill="none" />
      <Path d="M14.6 9.2c.9.3 1.7.8 2.4 1.5" stroke={HILITE_SOFT} strokeWidth="0.6" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Pumpkin: ribbed gourd with a curled vine and a leaf. */
export function StampPumpkinIcon({ size = 24, accent = '#f0862c' }: IconProps) {
  const body = useMemo(() => gradId('stPmk'), []);
  const VINE = '#4f8f3c';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={8} cy={21.6} />
      <Ellipse cx="12" cy="14.4" rx="9" ry="6.6" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" />
      <Ellipse cx="6.8" cy="14.4" rx="3.4" ry="6.5" fill={shade(accent, -20)} stroke={rim(accent)} strokeWidth="0.7" opacity="0.85" />
      <Ellipse cx="17.2" cy="14.4" rx="3.4" ry="6.5" fill={shade(accent, -20)} stroke={rim(accent)} strokeWidth="0.7" opacity="0.85" />
      <Ellipse cx="12" cy="14.4" rx="3.6" ry="6.6" fill={shade(accent, 16)} stroke={rim(accent)} strokeWidth="0.7" />
      <Path d="M11 8.2h2v-2c0-.9.5-1.4 1.4-1.6" fill="none" stroke="#6f4a24" strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M14.8 4.6c1.9-.4 2.9.4 2.7 2-.2 1.1-1.5 1.2-1.6.1" fill="none" stroke={VINE} strokeWidth="1.1" strokeLinecap="round" />
      <Path d="M10.8 6.4c-1.5-1.8-3.2-2.4-5.2-1.8 1 2 2.6 2.9 4.8 2.7Z" fill={VINE} stroke={rim(VINE)} strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M6.4 10.4c-.5 2.6-.4 5.1.4 7.4" stroke={HILITE_SOFT} strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <Path d="M9.4 9.8c.9-.5 1.8-.8 2.7-.8" stroke={HILITE} strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Corn: husked ear with peeled leaves and kerneled cob. */
export function StampCornIcon({ size = 24, accent = '#f2c53d' }: IconProps) {
  const body = useMemo(() => gradId('stCrn'), []);
  const HUSK = '#5f9c3c';
  const kernels = [...Array(5).keys()];
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={5.6} cy={21.6} />
      <Path d="M12 20.6c-2.6-2-3.6-4.8-3.2-8.4 2.9.9 4.4 3.7 3.2 8.4ZM12 20.6c2.6-2 3.6-4.8 3.2-8.4-2.9.9-4.4 3.7-3.2 8.4Z" fill={HUSK} stroke={rim(HUSK)} strokeWidth="0.85" strokeLinejoin="round" />
      <Path d="M9.6 15c.5 1.9 1.3 3.4 2.4 4.6M14.4 15c-.5 1.9-1.3 3.4-2.4 4.6" fill="none" stroke={shade(HUSK, 34)} strokeWidth="0.5" strokeLinecap="round" />
      <Path d="M12 2.2c3 1.6 4.4 4.4 4.4 8.4 0 3.4-1.5 5.6-4.4 5.6s-4.4-2.2-4.4-5.6c0-4 1.4-6.8 4.4-8.4Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      {kernels.map((r) => (
        <G key={r} fill={shade(accent, -22)} opacity="0.85">
          <Circle cx={9.9} cy={5.4 + r * 2.2} r="0.66" />
          <Circle cx={12} cy={4.6 + r * 2.2} r="0.66" />
          <Circle cx={14.1} cy={5.4 + r * 2.2} r="0.66" />
        </G>
      ))}
      <Path d="M9.8 5.2c.6-1.1 1.3-2 2.2-2.6" stroke={HILITE} strokeWidth="0.85" strokeLinecap="round" fill="none" />
      <Path d="M12 2.2c.9-.9 1.9-1.3 3-1.2" fill="none" stroke={HUSK} strokeWidth="0.9" strokeLinecap="round" />
    </Svg>
  );
}

/** Candle: lit taper in a holder with wax runs and a warm halo. */
export function StampCandleIcon({ size = 24, accent = '#f4efd8' }: IconProps) {
  const body = useMemo(() => gradId('stCnd'), []);
  const glow = useMemo(() => gradId('stCndG'), []);
  const BRASS_TONE = '#d9a441';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <GlowGrad id={glow} color="#ffc85a" />
      <Ground rx={6} cy={21.6} />
      <Circle cx="12" cy="5.8" r="7.4" fill={`url(#${glow})`} opacity="0.55" />
      <Path d="M12 1.6c1.9 1.9 2.8 3.5 2.8 4.9a2.8 2.8 0 0 1-5.6 0c0-1.4.9-3 2.8-4.9Z" fill="#ffd05a" stroke="#c88418" strokeWidth="0.85" strokeLinejoin="round" />
      <Path d="M12 4.2c.9 1.2 1.3 2.1 1.3 2.8a1.3 1.3 0 0 1-2.6 0c0-.7.4-1.6 1.3-2.8Z" fill="#fff3c4" />
      <Path d="M12 8.6v1.4" fill="none" stroke="#3a2a12" strokeWidth="0.8" strokeLinecap="round" />
      <Path d="M9.6 10h4.8v7.4H9.6Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.95" strokeLinejoin="round" />
      <Path d="M9.6 11.4c.6 1.2.6 2.4 0 3.6M14.4 12c-.7 1.2-.7 2.4 0 3.6" fill="none" stroke={shade(accent, -26)} strokeWidth="0.7" strokeLinecap="round" />
      <Path d="M10.4 11.4v5" stroke={HILITE} strokeWidth="0.85" strokeLinecap="round" fill="none" />
      <Path d="M7.4 17.4h9.2l-1 2.6H8.4Z" fill={BRASS_TONE} stroke={rim(BRASS_TONE)} strokeWidth="0.9" strokeLinejoin="round" />
      <Ellipse cx="12" cy="17.4" rx="4.6" ry="1" fill={shade(BRASS_TONE, 26)} stroke={rim(BRASS_TONE)} strokeWidth="0.7" />
      <Path d="M8.8 18.6h6.4" fill="none" stroke={shade(BRASS_TONE, -40)} strokeWidth="0.5" />
    </Svg>
  );
}

/** Hot cocoa: steaming mug topped with marshmallows. */
export function StampCocoaIcon({ size = 24, accent = '#c9553f' }: IconProps) {
  const body = useMemo(() => gradId('stCoc'), []);
  const COCOA = '#7a4526';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={6.8} cy={21.6} />
      <G stroke="#dfe8f5" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.8">
        <Path d="M9.4 6.4c-1-1.1-1-2.2 0-3.3s1-2.1 0-3.1M12 5.6c-1-1.1-1-2.2 0-3.3s1-2.1 0-3.1M14.6 6.4c-1-1.1-1-2.2 0-3.3" />
      </G>
      <Path d="M17.4 11.4c2.4-.6 3.8.2 4.2 2.4.4 2.2-.8 3.6-3.4 4" fill="none" stroke={shade(accent, -20)} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M4.2 9.4h13.4v6.9c0 2.6-1.5 4.1-4.2 4.1H8.4c-2.7 0-4.2-1.5-4.2-4.1Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Ellipse cx="10.9" cy="9.4" rx="6.7" ry="1.7" fill={COCOA} stroke={rim(COCOA)} strokeWidth="0.85" />
      <Ellipse cx="10.9" cy="9.2" rx="5.2" ry="1.15" fill={shade(COCOA, 26)} opacity="0.85" />
      <G fill="#fdf6ea" stroke="#cbb9a4" strokeWidth="0.45">
        <Ellipse cx="9" cy="8.9" rx="1.5" ry="1.05" /><Ellipse cx="12.4" cy="9.4" rx="1.3" ry="0.9" />
      </G>
      <Path d="M6 11.4c-.4 2.2-.3 4.2.4 6" stroke={HILITE_SOFT} strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <Path d="M6.6 17.4h8.4" fill="none" stroke={shade(accent, -48)} strokeWidth="0.6" opacity="0.8" />
    </Svg>
  );
}

/** Fog bank: layered mist bands drifting across a dim hill and pines. */
export function StampMistIcon({ size = 24, accent = '#b8c6dd' }: IconProps) {
  const body = useMemo(() => gradId('stMst'), []);
  const HILL = '#4c5878';
  const PINE = '#33405e';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={7.6} cy={21.6} />
      <Path d="M1.8 19.4c2.4-4.6 5-7 7.8-7 3 0 5.8 2.4 8.4 7Z" fill={HILL} stroke={rim(HILL)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M16.6 19.4c-1-3.6-1.6-6.6-1.6-9-1.6 2.4-2.4 5.4-2.4 9Z" fill={PINE} stroke={rim(PINE)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M20.6 19.4c-.8-2.9-1.2-5.3-1.2-7.2-1.3 1.9-2 4.3-2 7.2Z" fill={PINE} stroke={rim(PINE)} strokeWidth="0.8" strokeLinejoin="round" />
      <G stroke={`url(#${body})`} strokeWidth="2.1" strokeLinecap="round" fill="none" opacity="0.92">
        <Path d="M2.6 8.4h11.2M8.6 12h12.8M2.4 15.6h9.4M14.6 15.6h6.6M5.6 19.2h12.8" />
      </G>
      <G stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.4">
        <Path d="M3.6 7.7h8.4M10 11.3h8.6M4 14.9h6.4" />
      </G>
    </Svg>
  );
}

/** Orchard apple: round fruit with a bite-free sheen, stem and leaf. */
export function StampAppleIcon({ size = 24, accent = '#d8362f' }: IconProps) {
  const body = useMemo(() => gradId('stApl'), []);
  const LEAF = '#4f9c3c';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={6.6} cy={21.6} />
      <Path d="M12 7.4c1.4-1.1 3-1.4 4.6-.8 2.2.8 3.4 3 3.4 6 0 4.4-2.6 8.4-5 8.4-1.1 0-1.9-.6-3-.6s-1.9.6-3 .6c-2.4 0-5-4-5-8.4 0-3 1.2-5.2 3.4-6 1.6-.6 3.2-.3 4.6.8Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M12 7.4v1.6" fill="none" stroke={shade(accent, -50)} strokeWidth="0.6" />
      <Path d="M11.6 7.2c-.4-2.4.2-4.2 1.8-5.4.4 2.6-.2 4.4-1.8 5.4Z" fill="#6b4630" stroke="#3f2a18" strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M12.6 5c1.8-1.6 3.6-2 5.4-1.2-1 2.2-2.8 3-5.4 2.4Z" fill={LEAF} stroke={rim(LEAF)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M14.2 4.4c1-.6 2-.9 3-.8" stroke={HILITE_SOFT} strokeWidth="0.6" strokeLinecap="round" fill="none" />
      <Path d="M7.6 11.4c-.8 1.8-.9 3.8-.4 5.9" stroke={HILITE} strokeWidth="1" strokeLinecap="round" fill="none" />
      <Ellipse cx="9" cy="10.6" rx="1.5" ry="1" fill="#ffffff" opacity="0.4" rotation={-30} origin="9, 10.6" />
    </Svg>
  );
}

/** Amber: honeyed resin gem with an inclusion, glowing from within. */
export function StampAmberGemIcon({ size = 24, accent = '#e8952c' }: IconProps) {
  const body = useMemo(() => gradId('stAmb'), []);
  const glow = useMemo(() => gradId('stAmbG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from="#ffd88a" to={shade(accent, -46)} />
      <GlowGrad id={glow} color="#ffbe5c" />
      <Ground rx={6} cy={21.6} />
      <Circle cx="12" cy="12" r="9.6" fill={`url(#${glow})`} opacity="0.5" />
      <Path d="M12 2.6 18.4 6v9L12 18.4 5.6 15V6Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M12 2.6v15.8M5.6 6l6.4 3.6L18.4 6M5.6 15l6.4-3.6L18.4 15" fill="none" stroke={shade(accent, -44)} strokeWidth="0.55" />
      <Path d="M9.8 8.2c1.3-.9 2.5-1.2 3.6-1" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <Path d="M11.4 11.6c1.1-.7 1.8-.5 2.1.6.3 1-.2 1.7-1.2 1.9-.9.2-1.5-.3-1.5-1.2 0-.5.2-1 .6-1.3Z" fill={shade(accent, -54)} opacity="0.75" />
      <Path d="M12.7 12.2l1.9-1.4M11.4 13.6l-1.6 1.3" stroke={shade(accent, -54)} strokeWidth="0.5" strokeLinecap="round" opacity="0.7" />
      <Circle cx="16.2" cy="7.6" r="0.5" fill="#ffffff" opacity="0.8" />
    </Svg>
  );
}

/** Toadstool: spotted red cap on a pale stalk with a collar and moss. */
export function StampMushroomIcon({ size = 24, accent = '#d8433f' }: IconProps) {
  const body = useMemo(() => gradId('stMsh'), []);
  const STALK = '#f0e5d2';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={6.4} cy={21.6} />
      <Path d="M9.2 11.4h5.6v6.4c0 1.9-.9 2.9-2.8 2.9s-2.8-1-2.8-2.9Z" fill={STALK} stroke={rim(STALK)} strokeWidth="0.95" strokeLinejoin="round" />
      <Path d="M10.2 13.4c-.4 2.2-.3 4.2.4 5.9" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" fill="none" />
      <Path d="M8.4 12.2c2.4-.9 4.8-.9 7.2 0-2.4.9-4.8.9-7.2 0Z" fill={shade(STALK, -22)} stroke={rim(STALK)} strokeWidth="0.6" strokeLinejoin="round" />
      <Path d="M2.6 11.6C2.6 6.9 6.7 3.6 12 3.6s9.4 3.3 9.4 8c0 1-.7 1.6-2 1.6H4.6c-1.3 0-2-.6-2-1.6Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <G fill="#fdf3e2" stroke={rim(accent)} strokeWidth="0.4">
        <Ellipse cx="7.2" cy="8.4" rx="1.7" ry="1.35" /><Ellipse cx="13" cy="6.6" rx="1.4" ry="1.1" />
        <Ellipse cx="17.4" cy="9.4" rx="1.5" ry="1.2" /><Ellipse cx="10.6" cy="10.8" rx="1.1" ry="0.85" />
      </G>
      <Path d="M5.4 8.4c1.2-2 2.9-3.2 5.2-3.6" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <Path d="M4.4 20.4c1.6-.6 3-.8 4.4-.7M15.4 19.7c1.4-.1 2.7.1 4.2.7" fill="none" stroke="#4f8f3c" strokeWidth="0.9" strokeLinecap="round" />
    </Svg>
  );
}

/** Acorn: ridged nut under a cross-hatched cap with a short stem. */
export function StampAcornIcon({ size = 24, accent = '#c98b3c' }: IconProps) {
  const body = useMemo(() => gradId('stAcn'), []);
  const CAP = '#6f4522';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={5.8} cy={21.6} />
      <Path d="M12 4.4V1.8c0-.6.4-1 1.1-1.1" fill="none" stroke={CAP} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M5.2 10.4h13.6c0 6-2.7 10.4-6.8 10.4S5.2 16.4 5.2 10.4Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M8.6 12.4c-.5 2.8-.2 5.2 1 7.2" stroke={HILITE} strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <Path d="M14.6 12.6c.4 2.4.2 4.6-.6 6.6" fill="none" stroke={shade(accent, -44)} strokeWidth="0.55" strokeLinecap="round" />
      <Path d="M4.4 9.8c0-3.3 3.4-5.6 7.6-5.6s7.6 2.3 7.6 5.6c0 .9-.6 1.4-1.7 1.4H6.1c-1.1 0-1.7-.5-1.7-1.4Z" fill={CAP} stroke={rim(CAP)} strokeWidth="1" strokeLinejoin="round" />
      <G stroke={shade(CAP, 30)} strokeWidth="0.5" fill="none">
        <Path d="M4.6 8.4h14.8M5.6 6.4h12.8M8.4 4.8v6.4M12 4.2v7M15.6 4.8v6.4" />
      </G>
      <Path d="M6.8 6.4c1.4-1.1 3-1.7 4.8-1.9" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Owl at night: perched round owl with big eyes, tufts and a moon. */
export function StampOwlIcon({ size = 24, accent = '#a2764c' }: IconProps) {
  const body = useMemo(() => gradId('stOwl'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={6.4} cy={21.6} />
      <Path d="M20.4 3.2a3.4 3.4 0 1 1-3.6-1.2c-.5 1.9.9 3.1 3.6 1.2Z" fill="#ffe9a8" stroke="#c8a03a" strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M3.6 19.4h9.4" fill="none" stroke={BOUGH} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M8.9 18.9v-1.5M11.1 18.9v-1.5" fill="none" stroke="#d9a441" strokeWidth="0.9" strokeLinecap="round" />
      <Path d="M6.4 6.2c.4-1.6 1.4-2.4 2.8-2.4l-.6 2.6ZM13.6 6.2c-.4-1.6-1.4-2.4-2.8-2.4l.6 2.6Z" fill={shade(accent, -24)} stroke={rim(accent)} strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M10 4.4c3.6 0 6.2 2.8 6.2 6.8 0 4-2.6 6.6-6.2 6.6S3.8 15.2 3.8 11.2c0-4 2.6-6.8 6.2-6.8Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M10 11.4c1.9 1.4 2.8 3.2 2.6 5.4-1.7.7-3.5.7-5.2 0-.2-2.2.7-4 2.6-5.4Z" fill={shade(accent, 26)} stroke={rim(accent)} strokeWidth="0.6" strokeLinejoin="round" />
      <G fill="#fdf3e2" stroke={rim(accent)} strokeWidth="0.7">
        <Circle cx="7.8" cy="9.4" r="2.5" /><Circle cx="12.4" cy="9.4" r="2.5" />
      </G>
      <G fill="#2b2136">
        <Circle cx="7.9" cy="9.5" r="1.25" /><Circle cx="12.3" cy="9.5" r="1.25" />
      </G>
      <G fill="#ffffff" opacity="0.9">
        <Circle cx="8.3" cy="9.1" r="0.42" /><Circle cx="12.7" cy="9.1" r="0.42" />
      </G>
      <Path d="M10.1 11 8.9 12.4h2.4Z" fill="#f2a43a" stroke="#a8611a" strokeWidth="0.5" strokeLinejoin="round" />
      <Path d="M5.4 7.4c.8-1.1 1.8-1.8 3-2.2" stroke={HILITE} strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Harvest moon: huge amber moon low over a stubble field and haystack. */
export function StampHarvestMoonIcon({ size = 24, accent = '#f0a83c' }: IconProps) {
  const body = useMemo(() => gradId('stHmn'), []);
  const glow = useMemo(() => gradId('stHmnG'), []);
  const FIELD = '#6b5a2c';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from="#ffe3a0" to={shade(accent, -30)} />
      <GlowGrad id={glow} color="#ffc95c" />
      <Ground rx={7.8} cy={21.6} />
      <Circle cx="12" cy="10.6" r="10.4" fill={`url(#${glow})`} opacity="0.45" />
      <Circle cx="12" cy="10.4" r="7.2" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" />
      <G fill={shade(accent, -30)} opacity="0.55">
        <Circle cx="9.6" cy="8.4" r="1.5" /><Circle cx="14.2" cy="11.4" r="1.15" />
        <Circle cx="11.4" cy="13.4" r="0.85" /><Circle cx="14.8" cy="7.4" r="0.7" />
      </G>
      <Path d="M7.6 7.4c1-1.5 2.4-2.4 4.2-2.7" stroke={HILITE} strokeWidth="1" strokeLinecap="round" fill="none" />
      <Path d="M1.8 17.6h20.4" fill="none" stroke={FIELD} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M6 20.4c-.6-2 .1-3.4 2.2-4.2 2 .8 2.8 2.2 2.2 4.2Z" fill="#d9b45c" stroke={rim('#d9b45c')} strokeWidth="0.8" strokeLinejoin="round" />
      <G stroke={FIELD} strokeWidth="0.8" strokeLinecap="round" fill="none">
        <Path d="M13.4 20.4v-2.4M15.4 20.4v-2M17.4 20.4v-2.4M19.4 20.4v-2M3.6 20.4v-2.2" />
      </G>
    </Svg>
  );
}

/** Snowflake: six-fold dendrite with barbs and a faceted hub. */
export function StampSnowflakeIcon({ size = 24, accent = '#7fd4f5' }: IconProps) {
  const glow = useMemo(() => gradId('stSnfG'), []);
  const arms = [0, 1, 2, 3, 4, 5];
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <GlowGrad id={glow} color="#bdeaff" />
      <Ground rx={5.4} cy={21.7} />
      <Circle cx="12" cy="11.6" r="10" fill={`url(#${glow})`} opacity="0.4" />
      {arms.map((i) => (
        <G key={i} rotation={i * 60} origin="12, 11.6">
          <Path d="M12 11.6V2.4" stroke={accent} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <Path d="M12 4.4 9.4 2.2M12 4.4l2.6-2.2M12 7.4 9.9 5.6M12 7.4l2.1-1.8" stroke={shade(accent, 22)} strokeWidth="1.1" strokeLinecap="round" fill="none" />
          <Path d="M12 2.9l-.9 1.1h1.8Z" fill="#eaf9ff" />
        </G>
      ))}
      <Circle cx="12" cy="11.6" r="2.3" fill={shade(accent, 34)} stroke={shade(accent, -40)} strokeWidth="0.85" />
      <Path d="M10.7 10.4c.6-.5 1.2-.7 1.9-.6" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" fill="none" />
      <Circle cx="12" cy="11.6" r="0.7" fill="#eaf9ff" />
    </Svg>
  );
}

/** Wrapped gift: ribboned box with a full bow and a tag. */
export function StampGiftIcon({ size = 24, accent = '#d8434f' }: IconProps) {
  const body = useMemo(() => gradId('stGft'), []);
  const RIB = '#f2d23d';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={7.6} cy={21.6} />
      <Rect x="3.4" y="9.4" width="17.2" height="11.2" rx="1" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" />
      <Rect x="2.4" y="6.6" width="19.2" height="3.6" rx="0.9" fill={shade(accent, 20)} stroke={rim(accent)} strokeWidth="1" />
      <Rect x="10.2" y="6.6" width="3.6" height="14" fill={RIB} stroke={rim(RIB)} strokeWidth="0.85" />
      <Path d="M2.4 8.4h19.2" fill="none" stroke={shade(accent, -46)} strokeWidth="0.5" />
      <Path d="M12 6.6C9.4 6.6 7.6 5.9 7.2 4.4c-.3-1.3.6-2.4 2-2.4 1.6 0 2.6 1.4 2.8 4.6ZM12 6.6c2.6 0 4.4-.7 4.8-2.2.3-1.3-.6-2.4-2-2.4-1.6 0-2.6 1.4-2.8 4.6Z" fill={RIB} stroke={rim(RIB)} strokeWidth="0.85" strokeLinejoin="round" />
      <Circle cx="12" cy="5.4" r="1.15" fill={shade(RIB, 26)} stroke={rim(RIB)} strokeWidth="0.6" />
      <Path d="M4.8 11.4v7.6" stroke={HILITE_SOFT} strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <Path d="M8.6 4.4c.5-.7 1.1-1.1 1.8-1.2" stroke={HILITE} strokeWidth="0.7" strokeLinecap="round" fill="none" />
      <Path d="M15.4 13.4h4.2l.8 2.4-.8 2.4h-4.2Z" fill="#f4efe2" stroke="#a89880" strokeWidth="0.65" strokeLinejoin="round" />
      <Path d="M16.4 15.2h2.4M16.4 16.6h1.8" fill="none" stroke="#a89880" strokeWidth="0.55" strokeLinecap="round" />
    </Svg>
  );
}

/** Ice crystal: cluster of frost shards with a bright refracting core. */
export function StampIceCrystalIcon({ size = 24, accent = '#5fd0f0' }: IconProps) {
  const body = useMemo(() => gradId('stIcy'), []);
  const glow = useMemo(() => gradId('stIcyG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from={shade(accent, 66)} to={shade(accent, -48)} />
      <GlowGrad id={glow} color="#c4f0ff" />
      <Ground rx={6.4} cy={21.6} />
      <Circle cx="12" cy="11.4" r="9.6" fill={`url(#${glow})`} opacity="0.45" />
      <Path d="M6.4 20.4 4.2 12.6l2.6-3.4 3 3.2-1.2 8Z" fill={shade(accent, -22)} stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M17.6 20.4 19.8 13l-2.4-3.2-3 3 1.2 7.6Z" fill={shade(accent, -22)} stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M12 1.8 16.6 8l-1.4 12.6H8.8L7.4 8Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M7.4 8h9.2M12 1.8v18.8M9.4 8 12 12l2.6-4" fill="none" stroke={shade(accent, -46)} strokeWidth="0.55" />
      <Path d="M9.6 6.4 11.2 3.6" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <Path d="M5.6 12.4l1-1.4M18.4 12.8l-1-1.4" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" opacity="0.75" fill="none" />
      <Circle cx="13.8" cy="15.4" r="0.5" fill="#ffffff" opacity="0.75" />
    </Svg>
  );
}

/** Knitted mitten: cuffed wool mitten with a snowflake motif and cord. */
export function StampMittenIcon({ size = 24, accent = '#d8434f' }: IconProps) {
  const body = useMemo(() => gradId('stMtn'), []);
  const CUFF = '#f4efe2';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={6.2} cy={21.6} />
      <Path d="M15.4 4.4c2.4 1.4 3.4 3.4 3.4 6.2 0 1.9-.4 3.9-1.2 6l-.9 2.6H7.6l-1-3.6c-1.6-.4-2.6-1.4-2.9-2.9-.4-2.2.7-3.7 3.1-4.1V5.9c0-1.6.9-2.5 2.6-2.5h3.4c1.1 0 1.9.3 2.6 1Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M6.8 8.2c-1.4.4-2 1.3-1.8 2.5.2 1.1 1 1.8 2.3 2" fill="none" stroke={shade(accent, -44)} strokeWidth="0.6" strokeLinecap="round" />
      <G stroke="#ffffff" strokeWidth="0.85" strokeLinecap="round" fill="none" opacity="0.9">
        <Path d="M13 8v5M10.5 10.5h5M11.2 8.7l3.6 3.6M14.8 8.7l-3.6 3.6" />
      </G>
      <Rect x="6.6" y="18.4" width="11.4" height="2.6" rx="0.8" fill={CUFF} stroke={rim(CUFF)} strokeWidth="0.9" />
      <G stroke={shade(CUFF, -30)} strokeWidth="0.5" fill="none">
        <Path d="M8.4 18.6v2.2M10.4 18.6v2.2M12.4 18.6v2.2M14.4 18.6v2.2M16.4 18.6v2.2" />
      </G>
      <Path d="M15.4 4.4c1.4-1.4 2.9-1.9 4.6-1.6" fill="none" stroke="#f2d23d" strokeWidth="1" strokeLinecap="round" strokeDasharray="2,1.6" />
      <Path d="M9.8 5.4c1-.6 2-.9 3.1-.9" stroke={HILITE} strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Midnight: crescent moon among stars over a thin cloud. */
export function StampCrescentMoonIcon({ size = 24, accent = '#e8e2ff' }: IconProps) {
  const body = useMemo(() => gradId('stMon'), []);
  const glow = useMemo(() => gradId('stMonG'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={body} from="#ffffff" to={shade(accent, -60)} />
      <GlowGrad id={glow} color="#cfd8ff" />
      <Ground rx={5.4} cy={21.7} />
      <Circle cx="11.4" cy="10.6" r="9.6" fill={`url(#${glow})`} opacity="0.4" />
      <Path d="M15.6 2.6c-4.6.7-7.6 4-7.6 8.4 0 4.5 3.2 7.8 8 8.4-6.4 2.2-12-1.5-12-8.2 0-6.5 5.4-10.3 11.6-8.6Z" fill={`url(#${body})`} stroke="#8d8bb8" strokeWidth="1" strokeLinejoin="round" />
      <G fill={shade(accent, -34)} opacity="0.5">
        <Circle cx="6.6" cy="9" r="1.5" /><Circle cx="8.4" cy="14.6" r="1" /><Circle cx="5" cy="13.4" r="0.7" />
      </G>
      <Path d="M6.4 5.4c1.2-1.1 2.6-1.8 4.2-2.1" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <G fill="#ffe9a8">
        <Path d="M19 5.4l.7 1.5 1.6.24-1.15 1.14.27 1.62L19 9.14 17.58 9.9l.27-1.62L16.7 7.14l1.6-.24Z" />
        <Path d="M17.4 14.6l.5 1.05 1.1.16-.8.78.19 1.13-1-.53-1 .53.19-1.13-.8-.78 1.1-.16Z" />
        <Circle cx="21" cy="12.4" r="0.6" />
      </G>
    </Svg>
  );
}

/** Sled: wooden toboggan on steel runners with a rope pull. */
export function StampSledIcon({ size = 24, accent = '#b06a2c' }: IconProps) {
  const body = useMemo(() => gradId('stSld'), []);
  const STEEL = '#9fb2c9';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={8} cy={21.6} />
      <Path d="M2.6 20.6c2.4-1 5.6-1.5 9.4-1.5s7 .5 9.4 1.5v.8H2.6Z" fill="#e8f2fb" stroke="#a9c0d6" strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M4 8.6h13.4c1.4 0 2.2.7 2.2 1.9s-.8 1.9-2.2 1.9H4Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" rotation={-8} origin="12, 10.5" />
      <G rotation={-8} origin="12, 10.5">
        <Path d="M5.4 8.8v3.4M8.4 8.7v3.5M11.4 8.6v3.6M14.4 8.6v3.6M17.4 8.6v3.6" fill="none" stroke={shade(accent, -44)} strokeWidth="0.55" />
        <Path d="M5 9.4h12.4" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" fill="none" />
      </G>
      <Path d="M4.6 13.6v3.2M9.4 12.8v3.2M14.2 12v3.2M18.6 11.6v3" fill="none" stroke={shade(accent, -30)} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M3.6 18.6c.4-1.6 1.6-2.4 3.4-2.4h11.2c1.5 0 2.4.5 2.6 1.6" fill="none" stroke={STEEL} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M4.4 17.9c.8-.7 1.8-1 3-1h10.8" fill="none" stroke="#e4eef7" strokeWidth="0.6" strokeLinecap="round" />
      <Path d="M4 9C2.4 7.6 2 6.2 2.6 4.6" fill="none" stroke="#d8434f" strokeWidth="1.1" strokeLinecap="round" />
      <Circle cx="2.6" cy="4" r="1" fill="#d8434f" stroke="#8c1f1c" strokeWidth="0.5" />
    </Svg>
  );
}

/** Northern lights: aurora ribbons over a snow ridge and star field. */
export function StampAuroraIcon({ size = 24, accent = '#4fe0b0' }: IconProps) {
  const a1 = useMemo(() => gradId('stAur1'), []);
  const a2 = useMemo(() => gradId('stAur2'), []);
  const SNOW = '#dfeefb';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={a1} from={accent} to="rgba(79,224,176,0)" />
      <DuoGrad id={a2} from="#a97cf0" to="rgba(169,124,240,0)" />
      <Ground rx={7.8} cy={21.6} />
      <G fill="#ffffff" opacity="0.8">
        <Circle cx="4" cy="3.4" r="0.5" /><Circle cx="19.8" cy="2.8" r="0.45" />
        <Circle cx="15" cy="5" r="0.35" /><Circle cx="8.4" cy="2.4" r="0.35" />
      </G>
      <Path d="M4.6 2.6c-.8 5.4.2 9.6 3 12.6H4.4C2.2 12 1.4 7.8 2.2 2.6Z" fill={`url(#${a1})`} opacity="0.9" />
      <Path d="M9.4 1.8c-.6 5.8.6 10.2 3.6 13.4H9.6C7 12 6.2 7.4 7 1.8Z" fill={`url(#${a2})`} opacity="0.9" />
      <Path d="M14.6 2.6c-.4 5.4.8 9.6 3.6 12.6h-3.4c-2.4-3.2-3.2-7.4-2.4-12.6Z" fill={`url(#${a1})`} opacity="0.75" />
      <Path d="M19.6 3.4c-.3 4.8.7 8.5 3 11.4h-2.8c-2-2.9-2.7-6.7-2-11.4Z" fill={`url(#${a2})`} opacity="0.7" />
      <Path d="M1.8 20.4c2.4-3.4 4.4-5.1 6-5.1 1.8 0 3.4 1.5 4.8 4.5 1.4-2.8 2.9-4.2 4.4-4.2 1.6 0 3.3 1.6 5.2 4.8Z" fill={SNOW} stroke="#a9c0d6" strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M4.4 19.2c1.2-1.6 2.3-2.4 3.4-2.4" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Snowman: stacked snow spheres with scarf, top hat and stick arms. */
export function StampSnowmanIcon({ size = 24, accent = '#eaf4ff' }: IconProps) {
  const body = useMemo(() => gradId('stSnm'), []);
  const HAT = '#3a3550';
  const SCARF = '#d8434f';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={7.4} cy={21.6} />
      <Path d="M5.4 12.4 1.8 9.8M18.6 12.4 22.2 9.8" fill="none" stroke="#8a5a30" strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M3.2 10.6 2 9.4M20.8 10.6 22 9.4" fill="none" stroke="#8a5a30" strokeWidth="0.9" strokeLinecap="round" />
      <Circle cx="12" cy="16.2" r="5.2" fill={`url(#${body})`} stroke="#9db6cc" strokeWidth="1" />
      <Circle cx="12" cy="9.4" r="3.9" fill={`url(#${body})`} stroke="#9db6cc" strokeWidth="1" />
      <Circle cx="12" cy="6.2" r="2.6" fill={`url(#${body})`} stroke="#9db6cc" strokeWidth="1" />
      <Path d="M9.4 12.4c1.7.9 3.5.9 5.2 0 .6 1 .8 1.9.6 2.6-2.1.7-4.2.7-6.4 0-.2-.7 0-1.6.6-2.6Z" fill={SCARF} stroke={rim(SCARF)} strokeWidth="0.8" strokeLinejoin="round" />
      <Path d="M14 14.4c1 .5 1.6 1.5 1.8 3l-1.9.4c-.3-1.4-.3-2.5.1-3.4Z" fill={shade(SCARF, -18)} stroke={rim(SCARF)} strokeWidth="0.7" strokeLinejoin="round" />
      <Path d="M8.4 4.4h7.2v-.9c0-.7-.5-1-1.4-1H9.8c-.9 0-1.4.3-1.4 1Z" fill={HAT} stroke={rim(HAT)} strokeWidth="0.8" strokeLinejoin="round" />
      <Rect x="9.6" y="0.6" width="4.8" height="3.2" rx="0.4" fill={HAT} stroke={rim(HAT)} strokeWidth="0.8" />
      <Rect x="9.6" y="2.8" width="4.8" height="1" fill={SCARF} />
      <G fill="#2b2136">
        <Circle cx="10.9" cy="5.9" r="0.5" /><Circle cx="13.1" cy="5.9" r="0.5" />
        <Circle cx="11" cy="15" r="0.42" /><Circle cx="12.2" cy="17.4" r="0.42" /><Circle cx="12.9" cy="19.4" r="0.4" />
      </G>
      <Path d="M12 6.8 14 7.6l-2 .8Z" fill="#f0862c" stroke="#a8571a" strokeWidth="0.45" strokeLinejoin="round" />
      <Path d="M9.6 14.2c-.9 1.1-1.2 2.3-1 3.6M10 8c.4-.7 1-1.2 1.8-1.4" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Snowy evergreen: tiered pine loaded with snow on a drifted base. */
export function StampEvergreenSnowIcon({ size = 24, accent = '#2f8a54' }: IconProps) {
  const body = useMemo(() => gradId('stEvg'), []);
  const SNOW = '#eaf4ff';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={7.4} cy={21.6} />
      <Path d="M2.6 20.4c1.8-2 4-3 6.6-3 3 0 5.6 1 8 3 1.4.3 2.6.6 3.6 1v.4H2.6Z" fill={SNOW} stroke="#a9c0d6" strokeWidth="0.8" strokeLinejoin="round" />
      <Rect x="10.6" y="16.6" width="2.8" height="4" rx="0.5" fill="#6b4630" stroke={rim('#6b4630')} strokeWidth="0.8" />
      <Path d="M12 2 17 9H7ZM12 6.6 18.4 14.2H5.6ZM12 11.4l7.4 8.4H4.6Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M12 2.4 15.5 7.4c-2.1-.6-4-.2-5.9 1.1ZM12 7.2l4.7 5.6c-2.7-.8-5.2-.3-7.6 1.4ZM12 12l5.6 6.6c-3.2-1-6.2-.4-9 1.7Z" fill={SNOW} stroke="#a9c0d6" strokeWidth="0.7" strokeLinejoin="round" opacity="0.95" />
      <Path d="M10.4 5.4c.5-.9 1-1.7 1.6-2.3" stroke={HILITE_SOFT} strokeWidth="0.7" strokeLinecap="round" fill="none" />
      <G fill="#ffffff" opacity="0.85">
        <Circle cx="4" cy="6.4" r="0.55" /><Circle cx="20" cy="5.4" r="0.5" /><Circle cx="18.4" cy="10.6" r="0.4" /><Circle cx="5.2" cy="12.4" r="0.4" />
      </G>
    </Svg>
  );
}

/** Mistletoe sprig: paired leaves with pale berries and a red tie. */
export function StampHollyIcon({ size = 24, accent = '#3f8f4c' }: IconProps) {
  const body = useMemo(() => gradId('stHly'), []);
  const BERRY = '#f2efe2';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={6} cy={21.6} />
      <Path d="M12 3.4v6.2" fill="none" stroke="#6b4630" strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M12 9.6c-1.9 1.6-3 3.6-3.4 6M12 9.6c1.9 1.6 3 3.6 3.4 6" fill="none" stroke="#6b4630" strokeWidth="1.1" strokeLinecap="round" />
      <Path d="M8.6 15.6c-2.9-.4-4.9-2-6-4.8 3.1-.8 5.3.6 6 4.8ZM8.6 15.6c-2.2 1.6-4.4 1.7-6.6.4 1.7-2.4 3.9-2.6 6.6-.4Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.85" strokeLinejoin="round" />
      <Path d="M15.4 15.6c2.9-.4 4.9-2 6-4.8-3.1-.8-5.3.6-6 4.8ZM15.4 15.6c2.2 1.6 4.4 1.7 6.6.4-1.7-2.4-3.9-2.6-6.6-.4Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="0.85" strokeLinejoin="round" />
      <G stroke={shade(accent, -46)} strokeWidth="0.5" fill="none">
        <Path d="M3.4 11.4c2 .8 3.6 2.2 4.8 4.2M20.6 11.4c-2 .8-3.6 2.2-4.8 4.2" />
      </G>
      <G fill={BERRY} stroke="#b4ae9a" strokeWidth="0.5">
        <Circle cx="10.6" cy="17.8" r="1.35" /><Circle cx="13.4" cy="18.4" r="1.15" /><Circle cx="12" cy="20.2" r="1" />
      </G>
      <Path d="M10.2 17.4c.3-.3.7-.5 1.1-.5" stroke="#ffffff" strokeWidth="0.5" strokeLinecap="round" fill="none" />
      <Path d="M9.6 4.4c1.6-.9 3.2-.9 4.8 0l-1.2 2h-2.4Z" fill="#d8434f" stroke={rim('#d8434f')} strokeWidth="0.7" strokeLinejoin="round" />
    </Svg>
  );
}

/** Frozen lake: cracked ice sheet under snowy peaks. */
export function StampFrozenLakeIcon({ size = 24, accent = '#8fd8f2' }: IconProps) {
  const body = useMemo(() => gradId('stFrz'), []);
  const PEAK = '#5c6b96';
  const SNOW = '#eaf4ff';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={body} color={accent} />
      <Ground rx={8} cy={21.6} />
      <Path d="M1.8 14.4 7.4 4.6l4.2 6.6L14.6 6l7.6 8.4Z" fill={PEAK} stroke={rim(PEAK)} strokeWidth="0.95" strokeLinejoin="round" />
      <Path d="M7.4 4.6 9.9 9c-1.4-.5-2.6-.3-3.8.6ZM14.6 6l3.2 3.6c-1.6-.4-3-.1-4.2.9Z" fill={SNOW} stroke="#a9c0d6" strokeWidth="0.6" strokeLinejoin="round" />
      <Path d="M1.8 14.4h20.4v3.9c0 1.5-.9 2.3-2.6 2.3H4.4c-1.7 0-2.6-.8-2.6-2.3Z" fill={`url(#${body})`} stroke={rim(accent)} strokeWidth="1" strokeLinejoin="round" />
      <G stroke={shade(accent, -40)} strokeWidth="0.6" strokeLinecap="round" fill="none">
        <Path d="M4.4 14.8 7 17.4l-1.6 2.8M7 17.4l4 .6 2.4 2.6M11 18l2.4-3.2M13.4 20.6l3.6-2.2 3.4 1M17 18.4l1.4-3.4" />
      </G>
      <Path d="M3.2 16.2c2.4-.5 4.7-.6 7-.4" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.7" />
      <G fill="#ffffff" opacity="0.75">
        <Circle cx="19.4" cy="16.4" r="0.45" /><Circle cx="15.4" cy="15.4" r="0.35" />
      </G>
    </Svg>
  );
}

/** New Year fireworks: three bursting shells over a dark skyline glow. */
export function StampFireworksIcon({ size = 24, accent = '#f2c53d' }: IconProps) {
  const glow = useMemo(() => gradId('stFwG'), []);
  const P = '#e05a8f';
  const B = '#5fc8f0';
  const burst = (cx: number, cy: number, r: number, color: string, n: number) =>
    [...Array(n).keys()].map((i) => {
      const a = (i * 2 * Math.PI) / n;
      return (
        <G key={`${cx}-${cy}-${i}`}>
          <Path
            d={`M${cx},${cy} L${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`}
            stroke={color}
            strokeWidth={0.85}
            strokeLinecap="round"
          />
          <Circle cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r={0.55} fill={shade(color, 40)} />
        </G>
      );
    });
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <GlowGrad id={glow} color="#ffd870" />
      <Ground rx={7} cy={21.6} />
      <Circle cx="12" cy="9.6" r="10.4" fill={`url(#${glow})`} opacity="0.32" />
      {burst(8.4, 7.4, 4.6, accent, 10)}
      {burst(17, 11.4, 3.6, P, 8)}
      {burst(6, 15.4, 3, B, 8)}
      <Circle cx="8.4" cy="7.4" r="1.15" fill="#fff3c4" stroke={rim(accent)} strokeWidth="0.5" />
      <Circle cx="17" cy="11.4" r="0.95" fill="#ffd8ea" stroke={rim(P)} strokeWidth="0.5" />
      <Circle cx="6" cy="15.4" r="0.8" fill="#d8f4ff" stroke={rim(B)} strokeWidth="0.5" />
      <G fill="#2b2740">
        <Path d="M1.8 21.4v-3.2h2.4v3.2ZM12.4 21.4v-4.4h2.6v4.4ZM19 21.4v-3.6h3.2v3.6Z" />
      </G>
      <G fill="#ffe9a8" opacity="0.9">
        <Rect x="2.4" y="19" width="0.7" height="0.9" /><Rect x="13" y="18" width="0.7" height="0.9" />
        <Rect x="19.8" y="18.8" width="0.7" height="0.9" /><Rect x="21" y="18.8" width="0.7" height="0.9" />
      </G>
    </Svg>
  );
}

export { STAMP_ICON_BY_ID, stampIconName } from './stampArtMap';
