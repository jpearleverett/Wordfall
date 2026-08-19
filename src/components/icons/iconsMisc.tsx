/**
 * Social / object / creature icons. Same 24×24 material recipe as iconsCore.
 */
import React, { useMemo } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import {
  IconProps, VB, BodyGrad, RadialGrad, Gloss, Gleam, gradId, rim, shade, outline, HILITE,
} from './IconBase';

/**
 * File-local multi-stop vertical gradient for "rendered" hero icons that
 * need richer materials than the shared BodyGrad recipe. (IconBase is a
 * shared file owned elsewhere — keep custom helpers local to this file.)
 */
function LocalGrad({ id, stops }: { id: string; stops: ReadonlyArray<readonly [string, string]> }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {stops.map(([offset, color]) => (
          <Stop key={offset} offset={offset} stopColor={color} />
        ))}
      </LinearGradient>
    </Defs>
  );
}

export function MagnifierIcon({ size = 24, accent = '#00e5ff' }: IconProps) {
  const id = useMemo(() => gradId('mag'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      {/* fat contour underlay for ring + handle */}
      <Circle cx="10" cy="10" r="6.6" fill="none" stroke={outline(accent)} strokeWidth="5" />
      <Path d="M15 15l6 6" stroke={outline(accent)} strokeWidth="5.6" strokeLinecap="round" />
      {/* glass lens */}
      <Circle cx="10" cy="10" r="5.2" fill="rgba(190,235,255,0.18)" />
      <Circle cx="10" cy="10" r="6.6" fill="none" stroke={`url(#${id})`} strokeWidth="2.7" />
      <Path d="M15 15l6 6" stroke={`url(#${id})`} strokeWidth="3.2" strokeLinecap="round" />
      {/* lens sheen + bounce light on the lower rim */}
      <Path d="M6.6 8.2c.7-1.2 1.9-2 3.2-2.2" stroke={HILITE} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <Path d="M6.7 13.7c.9.9 2 1.4 3.3 1.5" fill="none" stroke={shade(accent, 46)} strokeWidth="1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={7.9} cy={7.4} rx={1.7} ry={1.1} rot={-32} o={0.5} />
      <Gleam cx={12.6} cy={6.1} r={0.6} />
    </Svg>
  );
}

export function ChatIcon({ size = 24, accent = '#00f5d4' }: IconProps) {
  const id = useMemo(() => gradId('chat'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.36} cy={0.3} />
      <Path d="M12 3.4c5.4 0 9.4 3.2 9.4 7.5s-4 7.5-9.4 7.5c-1 0-2-.1-2.9-.4L4.6 20l1.2-3.4c-1.9-1.4-3.2-3.4-3.2-5.7 0-4.3 4-7.5 9.4-7.5Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      {/* bottom bounce light along the bubble's chin */}
      <Path d="M7.9 16.6c1.3.4 2.7.6 4.1.6 2 0 3.8-.4 5.3-1.2" fill="none" stroke={shade(accent, 44)} strokeWidth="1.1" strokeLinecap="round" opacity={0.85} />
      <Circle cx="8" cy="11" r="1.3" fill={shade(accent, -82)} />
      <Circle cx="12" cy="11" r="1.3" fill={shade(accent, -82)} />
      <Circle cx="16" cy="11" r="1.3" fill={shade(accent, -82)} />
      <Gloss cx={8.3} cy={6.4} rx={2.6} ry={1.4} rot={-16} o={0.45} />
      <Gleam cx={13.9} cy={5.1} r={0.65} />
    </Svg>
  );
}

export function PeopleIcon({ size = 24, accent = '#c84dff' }: IconProps) {
  const id = useMemo(() => gradId('ppl'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.36} cy={0.3} />
      {/* back figure, dimmed */}
      <Circle cx="15.2" cy="8" r="3.6" fill={shade(accent, -30)} stroke={outline(accent)} strokeWidth="1.8" />
      <Path d="M9.4 20.4c0-3.6 2.6-6 5.8-6s5.8 2.4 5.8 6Z" fill={shade(accent, -30)} stroke={outline(accent)} strokeWidth="1.8" strokeLinejoin="round" />
      {/* front figure with fat contour + gloss */}
      <Circle cx="8.4" cy="8.8" r="3.9" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" />
      <Path d="M2 21c0-3.9 2.8-6.5 6.4-6.5s6.4 2.6 6.4 6.5Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      {/* bottom bounce light on the front shoulders */}
      <Path d="M4.4 19.6c1.2-.9 2.5-1.4 4-1.4s2.8.5 4 1.4" fill="none" stroke={shade(accent, 44)} strokeWidth="1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={7.1} cy={7.2} rx={1.7} ry={1.1} rot={-24} o={0.5} />
      <Gleam cx={10} cy={6.4} r={0.55} />
    </Svg>
  );
}

export function HandshakeIcon({ size = 24, accent = '#ffb800' }: IconProps) {
  const id = useMemo(() => gradId('shake'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      {/* fat contour underlay for cuffs + clasped hands */}
      <Path d="M2.4 7.2 7 5.4l5 2 4.6-2 5 1.8v7.6l-2.4.8" fill="none" stroke={outline(accent)} strokeWidth="3.6" strokeLinejoin="round" />
      <Path d="M2.4 14.8V7.2M12 7.4 8.6 10.6a1.7 1.7 0 0 0 2.4 2.4l2-1.9 5.4 4.6a1.6 1.6 0 0 1-2 2.5l-.9-.7a1.6 1.6 0 0 1-2.2 2.1l-1-.8a1.6 1.6 0 0 1-2.3 1.9l-3.4-2.6-1.2.5" fill="none" stroke={outline(accent)} strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* juicy gradient pass */}
      <Path d="M2.4 7.2 7 5.4l5 2 4.6-2 5 1.8v7.6l-2.4.8" fill="none" stroke={shade(accent, -24)} strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M2.4 14.8V7.2M12 7.4 8.6 10.6a1.7 1.7 0 0 0 2.4 2.4l2-1.9 5.4 4.6a1.6 1.6 0 0 1-2 2.5l-.9-.7a1.6 1.6 0 0 1-2.2 2.1l-1-.8a1.6 1.6 0 0 1-2.3 1.9l-3.4-2.6-1.2.5" fill="none" stroke={`url(#${id})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* bounce light on the lowest knuckle */}
      <Path d="M8.7 18.6l1.9 1.4" stroke={shade(accent, 46)} strokeWidth="0.9" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={9.7} cy={10.3} rx={1.4} ry={0.8} rot={-36} o={0.5} />
      <Gleam cx={13.9} cy={9.7} r={0.6} />
    </Svg>
  );
}

export function BrainIcon({ size = 24, accent = '#ff6ec7' }: IconProps) {
  const id = useMemo(() => gradId('brain'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.34} cy={0.3} />
      <Path d="M11.2 3.2a3.2 3.2 0 0 0-3.7 1.5A3.4 3.4 0 0 0 4.4 8a3.5 3.5 0 0 0-1 5.9 3.4 3.4 0 0 0 2.3 4.6c.4 1.6 1.9 2.7 3.6 2.5 1-.1 1.9-.8 1.9-1.9V4.6c0-.7-.4-1.2-1-1.4Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.9" strokeLinejoin="round" />
      <Path d="M12.8 3.2a3.2 3.2 0 0 1 3.7 1.5A3.4 3.4 0 0 1 19.6 8a3.5 3.5 0 0 1 1 5.9 3.4 3.4 0 0 1-2.3 4.6c-.4 1.6-1.9 2.7-3.6 2.5-1-.1-1.9-.8-1.9-1.9V4.6c0-.7.4-1.2 1-1.4Z" fill={shade(accent, -22)} stroke={outline(accent)} strokeWidth="1.9" strokeLinejoin="round" />
      {/* fold creases + bottom bounce light on both lobes */}
      <Path d="M8.8 8.2c-1 .3-1.7.9-2 1.8M15.2 12.4c1 .3 1.7.9 2 1.8M8.2 12.6c-.8.2-1.4.7-1.7 1.4" stroke={shade(accent, -60)} strokeWidth="1" strokeLinecap="round" fill="none" opacity={0.8} />
      <Path d="M6.6 18.9c.9.8 2 1.2 3.2 1.1M14.2 20c1.2.1 2.3-.3 3.2-1.1" fill="none" stroke={shade(accent, 44)} strokeWidth="1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={8} cy={5.9} rx={2} ry={1.2} rot={-22} o={0.45} />
      <Gleam cx={14.7} cy={4.9} r={0.6} />
    </Svg>
  );
}

export function PuzzleIcon({ size = 24, accent = '#35b892' }: IconProps) {
  const id = useMemo(() => gradId('puz'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.36} cy={0.3} />
      <Path d="M9.6 3.6a2 2 0 0 1 4 0v1h3.8a1.4 1.4 0 0 1 1.4 1.4v3.6h1a2 2 0 0 1 0 4h-1v4.8a1.4 1.4 0 0 1-1.4 1.4h-4.2v-1.2a1.8 1.8 0 0 0-3.6 0v1.2H5.4A1.4 1.4 0 0 1 4 18.4v-4h1.2a1.8 1.8 0 0 0 0-3.6H4V6a1.4 1.4 0 0 1 1.4-1.4h4.2Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      {/* inner edge shade + bottom bounce light */}
      <Path d="M16.6 7.2v3.4" stroke={shade(accent, -50)} strokeWidth="0.9" strokeLinecap="round" opacity={0.75} />
      <Path d="M5.8 19c1 .4 2 .5 3 .3M14.4 19.6c1.2.2 2.3.1 3.4-.4" fill="none" stroke={shade(accent, 44)} strokeWidth="1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={8.1} cy={6.7} rx={2.1} ry={1.2} rot={-18} o={0.45} />
      <Gleam cx={12.7} cy={5.4} r={0.6} />
    </Svg>
  );
}

export function OwlIcon({ size = 24, accent = '#c98b3f' }: IconProps) {
  const body = useMemo(() => gradId('owlbody'), []);
  const chest = useMemo(() => gradId('owlchest'), []);
  const beak = useMemo(() => gradId('owlbeak'), []);
  const ol = shade(accent, -110);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <LocalGrad id={body} stops={[['0', shade(accent, 72)], ['0.48', accent], ['1', shade(accent, -64)]]} />
      <LocalGrad id={chest} stops={[['0', shade(accent, 104)], ['1', shade(accent, 22)]]} />
      <LocalGrad id={beak} stops={[['0', '#ffd24d'], ['1', '#f08000']]} />
      {/* feather-tuft ears — rooted under the body so only the tips show */}
      <Path d="M4.9 8.6 5.7 2.6l4.6 3Z" fill={shade(accent, -10)} stroke={ol} strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M19.1 8.6 18.3 2.6l-4.6 3Z" fill={shade(accent, -10)} stroke={ol} strokeWidth="1.8" strokeLinejoin="round" />
      {/* round body, fat outline */}
      <Ellipse cx="12" cy="13.1" rx="8.7" ry="8.5" fill={`url(#${body})`} stroke={ol} strokeWidth="2" />
      {/* wing shading */}
      <Ellipse cx="6.5" cy="13.9" rx="2" ry="4.4" transform="rotate(14 6.5 13.9)" fill={shade(accent, -44)} opacity="0.85" />
      <Ellipse cx="17.5" cy="13.9" rx="2" ry="4.4" transform="rotate(-14 17.5 13.9)" fill={shade(accent, -44)} opacity="0.85" />
      {/* lighter chest patch + feather scallops */}
      <Ellipse cx="12" cy="16.5" rx="4.7" ry="4" fill={`url(#${chest})`} stroke={shade(accent, -34)} strokeWidth="0.9" />
      <Path d="M10 15.4q1 .9 2 0M12 17.4q1 .9 2 0" fill="none" stroke={shade(accent, -34)} strokeOpacity="0.55" strokeWidth="0.9" strokeLinecap="round" />
      {/* glossy specular + bottom bounce light */}
      <Ellipse cx="8.7" cy="7.2" rx="3.1" ry="1.6" transform="rotate(-16 8.7 7.2)" fill="rgba(255,255,255,0.45)" />
      <Path d="M7.4 20.8q4.6 1.9 9.2 0" fill="none" stroke="rgba(255,224,168,0.55)" strokeWidth="1.4" strokeLinecap="round" />
      {/* big two-tone eyes: cream disc, plum pupil, white gleam */}
      <Circle cx="8.3" cy="10.7" r="3.5" fill="#fff6e2" stroke={ol} strokeWidth="1.7" />
      <Circle cx="15.7" cy="10.7" r="3.5" fill="#fff6e2" stroke={ol} strokeWidth="1.7" />
      <Circle cx="8.6" cy="11" r="1.95" fill="#2a1050" />
      <Circle cx="15.4" cy="11" r="1.95" fill="#2a1050" />
      <Circle cx="7.9" cy="10.2" r="0.8" fill="#fff" />
      <Circle cx="14.7" cy="10.2" r="0.8" fill="#fff" />
      <Circle cx="9.3" cy="11.9" r="0.35" fill="rgba(255,255,255,0.7)" />
      <Circle cx="16.1" cy="11.9" r="0.35" fill="rgba(255,255,255,0.7)" />
      {/* small V beak */}
      <Path d="M12 12.7 10.6 13.9q1.4 1.9 2.8 0Z" fill={`url(#${beak})`} stroke="#7a3c00" strokeWidth="1.1" strokeLinejoin="round" />
    </Svg>
  );
}

export function GearIcon({ size = 24, accent = '#c9d2e8' }: IconProps) {
  const id = useMemo(() => gradId('gear'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.36} cy={0.3} />
      <Path d="M10.3 2.6h3.4l.5 2.6c.7.2 1.3.6 1.9 1l2.5-.9 1.7 3-2 1.8a7 7 0 0 1 0 2.2l2 1.8-1.7 3-2.5-.9c-.6.4-1.2.8-1.9 1l-.5 2.6h-3.4l-.5-2.6c-.7-.2-1.3-.6-1.9-1l-2.5.9-1.7-3 2-1.8a7 7 0 0 1 0-2.2l-2-1.8 1.7-3 2.5.9c.6-.4 1.2-.8 1.9-1Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.9" strokeLinejoin="round" />
      {/* bottom bounce light hugging the lower teeth */}
      <Path d="M8.9 18.2c1 .5 2 .8 3.1.8s2.1-.3 3.1-.8" fill="none" stroke={shade(accent, 46)} strokeWidth="1" strokeLinecap="round" opacity={0.85} />
      <Circle cx="12" cy="12" r="3.2" fill={shade(accent, -78)} stroke={outline(accent)} strokeWidth="1.4" />
      <Circle cx="12" cy="12" r="1.4" fill={shade(accent, -100)} />
      <Gloss cx={9.3} cy={6.9} rx={2} ry={1.2} rot={-22} o={0.45} />
      <Gleam cx={14.3} cy={5.7} r={0.6} />
    </Svg>
  );
}

export function CastleIcon({ size = 24, accent = '#a08cc0' }: IconProps) {
  const id = useMemo(() => gradId('castle'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M4 21V9.6h2.2V7.2h2.2v2.4h2.4V7.2h2.4v2.4h2.4V7.2h2.2v2.4H20V21Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M10.4 21v-4.6a1.6 1.6 0 0 1 3.2 0V21" fill={shade(accent, -70)} stroke={rim(accent)} strokeWidth="1.1" />
      <Rect x="6.6" y="12.4" width="2" height="2.6" rx="0.6" fill={shade(accent, -60)} />
      <Rect x="15.4" y="12.4" width="2" height="2.6" rx="0.6" fill={shade(accent, -60)} />
      <Path d="M12 7V3.6l3-.9-3-.9" stroke="#ff2d95" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function ShieldIcon({ size = 24, accent = '#31a6e8' }: IconProps) {
  const id = useMemo(() => gradId('shield'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.36} cy={0.28} />
      <Path d="M12 2.2 20.2 5v6.4c0 5.2-3.3 8.6-8.2 10.4C7.1 20 3.8 16.6 3.8 11.4V5Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M12 4.6v14.6" stroke={shade(accent, -52)} strokeWidth="1.1" opacity={0.7} />
      {/* bottom bounce light tracing the point */}
      <Path d="M7.4 17.2c1.3 1.3 2.8 2.3 4.6 3 1.8-.7 3.3-1.7 4.6-3" fill="none" stroke={shade(accent, 44)} strokeWidth="1.1" strokeLinecap="round" opacity={0.85} />
      <Path d="M8.6 11.2l2.3 2.3 4.5-4.6" fill="none" stroke={outline(accent)} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8.6 11.2l2.3 2.3 4.5-4.6" fill="none" stroke="#f5faff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <Gloss cx={8} cy={5.9} rx={2.2} ry={1.3} rot={-22} o={0.42} />
      <Gleam cx={15.1} cy={4.6} r={0.6} />
    </Svg>
  );
}

export function SwordIcon({ size = 24, accent = '#c9d2e8' }: IconProps) {
  const id = useMemo(() => gradId('sword'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M19.8 2.6 21.4 4.2 10.6 15l-1.6-1.6Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.2" strokeLinejoin="round" />
      <Path d="M7.2 12.6l4.2 4.2M5.4 16.4l2.2 2.2" stroke="#ffb800" strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M6.4 15.4 3 18.8l2.2 2.2 3.4-3.4Z" fill="#8a5a30" stroke={rim('#8a5a30')} strokeWidth="1.1" strokeLinejoin="round" />
    </Svg>
  );
}

export function PawIcon({ size = 24, accent = '#c98b3f' }: IconProps) {
  const id = useMemo(() => gradId('paw'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Ellipse cx="6" cy="9.8" rx="2.1" ry="2.7" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.1" />
      <Ellipse cx="18" cy="9.8" rx="2.1" ry="2.7" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.1" />
      <Ellipse cx="9.4" cy="6.2" rx="2.1" ry="2.8" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.1" />
      <Ellipse cx="14.6" cy="6.2" rx="2.1" ry="2.8" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.1" />
      <Path d="M12 11c3.2 0 6 2.4 6 5.2 0 2-1.4 3.4-3.2 3.4-1 0-1.9-.5-2.8-.5s-1.8.5-2.8.5C7.4 19.6 6 18.2 6 16.2 6 13.4 8.8 11 12 11Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.3" strokeLinejoin="round" />
    </Svg>
  );
}

export function AppleIcon({ size = 24, accent = '#ff4466' }: IconProps) {
  const id = useMemo(() => gradId('apple'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M12 7.6c1-.8 2.2-1.2 3.5-1.2 3 0 5.1 2.4 5.1 5.6 0 4.4-3 9.4-5.9 9.4-1 0-1.8-.6-2.7-.6s-1.7.6-2.7.6c-2.9 0-5.9-5-5.9-9.4 0-3.2 2.1-5.6 5.1-5.6 1.3 0 2.5.4 3.5 1.2Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M12 7.2c0-2 .9-3.6 2.6-4.6" fill="none" stroke="#8a5a30" strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M14.6 4.4c1.8-.5 3.2.1 3.9 1.6-1.8.5-3.2-.1-3.9-1.6Z" fill="#35b892" stroke={rim('#35b892')} strokeWidth="0.9" strokeLinejoin="round" />
      <Path d="M8 10.4c-.8.8-1.2 1.9-1.2 3" stroke={HILITE} strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function HouseIcon({ size = 24, accent = '#ff7a1a' }: IconProps) {
  const id = useMemo(() => gradId('house'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.38} cy={0.32} />
      <Path d="M12 3 2.8 10.8h2.4V21h13.6V10.8h2.4Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      {/* eave shadow under the roofline */}
      <Path d="M5.2 10.8h13.6" stroke={shade(accent, -52)} strokeWidth="1" opacity={0.75} />
      {/* bottom bounce light on the wall */}
      <Path d="M6.4 19.9c1 .3 2.1.5 3.1.5M14.5 20.4c1 0 2.1-.2 3.1-.5" fill="none" stroke={shade(accent, 44)} strokeWidth="1" strokeLinecap="round" opacity={0.85} />
      <Rect x="9.9" y="14.2" width="4.2" height="6.8" rx="0.9" fill={shade(accent, -72)} stroke={outline(accent)} strokeWidth="1.3" />
      <Circle cx="13" cy="17.7" r="0.5" fill="#ffd24d" />
      <Rect x="6.3" y="12" width="2.5" height="2.5" rx="0.6" fill="#ffd24d" stroke={outline(accent)} strokeWidth="1.1" />
      <Rect x="15.2" y="12" width="2.5" height="2.5" rx="0.6" fill="#ffd24d" stroke={outline(accent)} strokeWidth="1.1" />
      <Gloss cx={9.5} cy={6.6} rx={2} ry={1.1} rot={-32} o={0.45} />
      <Gleam cx={13.4} cy={5.6} r={0.6} />
    </Svg>
  );
}

export function RainbowIcon({ size = 24, accent = '#ff2d95' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <G fill="none" strokeLinecap="round">
        <Path d="M3 18a9 9 0 0 1 18 0" stroke={accent} strokeWidth="2.2" />
        <Path d="M6.2 18a5.8 5.8 0 0 1 11.6 0" stroke="#ffb800" strokeWidth="2.2" />
        <Path d="M9.4 18a2.6 2.6 0 0 1 5.2 0" stroke="#00e5ff" strokeWidth="2.2" />
      </G>
      <Circle cx="4.1" cy="18.9" r="1.6" fill="#f5faff" stroke={rim('#c9d2e8')} strokeWidth="0.8" />
      <Circle cx="19.9" cy="18.9" r="1.6" fill="#f5faff" stroke={rim('#c9d2e8')} strokeWidth="0.8" />
    </Svg>
  );
}

export function ButterflyIcon({ size = 24, accent = '#c84dff' }: IconProps) {
  const id = useMemo(() => gradId('bfly'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M11 11C8.6 6.6 5.8 4.4 3.4 5.2c-2 .7-1.6 5 1.4 6.8-2.4 1.4-2.2 5.2 0 5.8 2.2.6 4.6-1.4 6.2-4.6Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.2" strokeLinejoin="round" />
      <Path d="M13 11c2.4-4.4 5.2-6.6 7.6-5.8 2 .7 1.6 5-1.4 6.8 2.4 1.4 2.2 5.2 0 5.8-2.2.6-4.6-1.4-6.2-4.6Z" fill={shade(accent, -16)} stroke={rim(accent)} strokeWidth="1.2" strokeLinejoin="round" />
      <Ellipse cx="12" cy="12.4" rx="1.2" ry="4.4" fill="#2a1050" stroke={rim(accent)} strokeWidth="0.9" />
      <Path d="M11 7.4 9.6 5.2M13 7.4l1.4-2.2" stroke="#2a1050" strokeWidth="1.1" strokeLinecap="round" />
      <Circle cx="6.6" cy="8.4" r="1" fill="#00e5ff" />
      <Circle cx="17.4" cy="8.4" r="1" fill="#00e5ff" />
    </Svg>
  );
}

export function GamepadIcon({ size = 24, accent = '#ff2d95' }: IconProps) {
  const id = useMemo(() => gradId('pad'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.36} cy={0.3} />
      <Path d="M7 6.4h10a6.4 6.4 0 0 1 6.3 7.6c-.4 2.2-1.6 3.8-3.3 3.8-1.3 0-2.2-.8-3-1.9-.6-.8-1.1-1.1-2-1.1h-6c-.9 0-1.4.3-2 1.1-.8 1.1-1.7 1.9-3 1.9-1.7 0-2.9-1.6-3.3-3.8A6.4 6.4 0 0 1 7 6.4Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      {/* bottom bounce light along the grips */}
      <Path d="M3.6 15.9c.5.8 1.1 1.3 1.9 1.3M18.5 17.2c.8 0 1.4-.5 1.9-1.3" fill="none" stroke={shade(accent, 44)} strokeWidth="1" strokeLinecap="round" opacity={0.85} />
      {/* d-pad with contour, juicy buttons */}
      <Path d="M8 9.6v4.2M5.9 11.7h4.2" stroke={outline(accent)} strokeWidth="3.4" strokeLinecap="round" />
      <Path d="M8 9.6v4.2M5.9 11.7h4.2" stroke="#f5f0ff" strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="15.4" cy="12.9" r="1.4" fill="#00e5ff" stroke={outline('#00e5ff')} strokeWidth="1.1" />
      <Circle cx="17.8" cy="10.5" r="1.4" fill="#ffd24d" stroke={outline('#ffd24d')} strokeWidth="1.1" />
      <Circle cx="15" cy="12.5" r="0.4" fill="#ffffff" opacity={0.85} />
      <Circle cx="17.4" cy="10.1" r="0.4" fill="#ffffff" opacity={0.85} />
      <Gloss cx={8.6} cy={8} rx={2.6} ry={1.1} rot={-8} o={0.42} />
      <Gleam cx={13.3} cy={7.6} r={0.6} />
    </Svg>
  );
}

export function CrystalBallIcon({ size = 24, accent = '#c84dff' }: IconProps) {
  const id = useMemo(() => gradId('cball'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Circle cx="12" cy="10.6" r="8" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" />
      <Path d="M7 7.4c1-1.6 2.6-2.7 4.4-3" stroke={HILITE} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <Circle cx="14.4" cy="12.2" r="1" fill={shade(accent, 70)} />
      <Path d="M7.6 18.4h8.8l1.2 2.6H6.4Z" fill={shade(accent, -62)} stroke={rim(accent)} strokeWidth="1.2" strokeLinejoin="round" />
    </Svg>
  );
}

export function PencilIcon({ size = 24, accent = '#ffb800' }: IconProps) {
  const id = useMemo(() => gradId('pencil'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M16.4 3.4a2.4 2.4 0 0 1 3.4 0l.8.8a2.4 2.4 0 0 1 0 3.4L8.8 19.4 3.4 20.6 4.6 15.2Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="2" strokeLinejoin="round" />
      {/* ferrule + wood collar seams */}
      <Path d="M14.6 5.2l4.2 4.2" stroke={outline(accent)} strokeWidth="1.4" />
      <Path d="M4.6 15.2l4.2 4.2" stroke={outline(accent)} strokeWidth="1.4" />
      {/* body facet line + bounce light on the lower edge */}
      <Path d="M15.7 7.7 6.6 16.8" stroke={shade(accent, -40)} strokeWidth="0.9" opacity={0.7} />
      <Path d="M8.1 18.6 16.3 10.4" stroke={shade(accent, 44)} strokeWidth="1" strokeLinecap="round" opacity={0.85} />
      {/* graphite tip */}
      <Path d="M4.3 18.2l1.5 1.5-2.4.9Z" fill={shade(accent, -104)} />
      <Gloss cx={17.9} cy={5} rx={1.5} ry={0.9} rot={45} o={0.5} />
      <Gleam cx={19.9} cy={7.3} r={0.6} />
    </Svg>
  );
}

export function LinkIcon({ size = 24, accent = '#00e5ff' }: IconProps) {
  const id = useMemo(() => gradId('link'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      {/* fat contour under, juicy gradient links over */}
      <Path d="M10 14 14 10M8.4 11.2 5.6 14a4 4 0 0 0 5.7 5.7l2.7-2.9M15.6 12.8l2.8-2.8a4 4 0 0 0-5.7-5.7L10 7.2" fill="none" stroke={outline(accent)} strokeWidth="4.7" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 14 14 10M8.4 11.2 5.6 14a4 4 0 0 0 5.7 5.7l2.7-2.9M15.6 12.8l2.8-2.8a4 4 0 0 0-5.7-5.7L10 7.2" fill="none" stroke={`url(#${id})`} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* bounce light on the lower link */}
      <Path d="M7.3 17.9c.9.7 2 .9 3.2.7" fill="none" stroke={shade(accent, 46)} strokeWidth="1" strokeLinecap="round" opacity={0.85} />
      <Gloss cx={14.9} cy={6.1} rx={1.5} ry={0.9} rot={-40} o={0.5} />
      <Gleam cx={18.3} cy={5.4} r={0.6} />
    </Svg>
  );
}

export function RunnerIcon({ size = 24, accent = '#00f5d4' }: IconProps) {
  const id = useMemo(() => gradId('run'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Circle cx="14.6" cy="4.6" r="2.3" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.1" />
      <Path d="M9 9.6 12.6 8l3.4 1.6 2.8-.4M12.6 8l-1.2 4.6 3.2 2.6-1 5.4M11.4 12.6 8 14.4l-3 4.2M14.6 15.2l3.8 1.4" fill="none" stroke={`url(#${id})`} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
