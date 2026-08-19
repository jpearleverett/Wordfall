/**
 * World/thematic icons — nature, science, space, arts. Same material recipe
 * as iconsCore (24×24 viewBox, gradient body, rim stroke, top highlight).
 */
import React, { useMemo } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { IconProps, VB, BodyGrad, DuoGrad, gradId, rim, shade, HILITE } from './IconBase';

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

export function LeafIcon({ size = 24, accent = '#35b892' }: IconProps) {
  const id = useMemo(() => gradId('leaf'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M20 4C10 4.6 4.6 9.4 4.6 15.8c0 1.4.3 2.6.8 3.6C10 20.6 15 19 17.6 15 19.6 12 20.2 8.4 20 4Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M4.2 20.8C8 15 12.6 10.6 18.4 6.4" fill="none" stroke={shade(accent, -55)} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="M9.4 15.4c1.8.3 3.4.2 4.9-.3M11.8 12.2c1.6.2 3 .1 4.4-.4" fill="none" stroke={shade(accent, -45)} strokeWidth="1.1" strokeLinecap="round" />
    </Svg>
  );
}

export function FlowerIcon({ size = 24, accent = '#ff2d95' }: IconProps) {
  const id = useMemo(() => gradId('flower'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <G stroke={rim(accent)} strokeWidth="1">
        <Ellipse cx="12" cy="5.6" rx="2.9" ry="3.6" fill={`url(#${id})`} />
        <Ellipse cx="5.9" cy="10.2" rx="3.4" ry="2.9" fill={`url(#${id})`} />
        <Ellipse cx="18.1" cy="10.2" rx="3.4" ry="2.9" fill={`url(#${id})`} />
        <Ellipse cx="8.2" cy="16" rx="2.9" ry="3.2" fill={`url(#${id})`} transform="rotate(-30 8.2 16)" />
        <Ellipse cx="15.8" cy="16" rx="2.9" ry="3.2" fill={`url(#${id})`} transform="rotate(30 15.8 16)" />
      </G>
      <Circle cx="12" cy="11.4" r="3" fill="#ffd24d" stroke={rim('#ffb800')} strokeWidth="1" />
      <Path d="M12 14.4v6.6M12 21c-1.8-.5-3-1.6-3.8-3.2" stroke="#2a9c7a" strokeWidth="1.7" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function TreeIcon({ size = 24, accent = '#2a9c7a' }: IconProps) {
  const id = useMemo(() => gradId('tree'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M12 2 17 8.6h-2.4L19 14h-2.6L21 19.8H3L7.6 14H5L9.4 8.6H7Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Rect x="10.6" y="19.8" width="2.8" height="2.8" fill="#8a5a30" stroke={rim('#8a5a30')} strokeWidth="1" />
    </Svg>
  );
}

export function MountainIcon({ size = 24, accent = '#7c5cff' }: IconProps) {
  const id = useMemo(() => gradId('mtn'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M2 19.6 9 6.2l4 7.2 2.6-4.4L22 19.6Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M9 6.2 7.2 9.6l1.4 1.2 1.6-1.4 1.4 1.6 1.4-1.6" fill="#f5f0ff" stroke={rim(accent)} strokeWidth="0.9" strokeLinejoin="round" />
      <Circle cx="18.6" cy="5" r="2" fill="#ffd24d" stroke={rim('#ffb800')} strokeWidth="0.9" />
    </Svg>
  );
}

export function SunIcon({ size = 24, accent = '#ffb800' }: IconProps) {
  const ray = useMemo(() => gradId('sunray'), []);
  const ol = shade(accent, -120);
  // Rounded triangular ray pointing up; rotated copies make the full corona.
  const rayPath = 'M9.9 7.4 11 2.9q1-1.9 2 0l1.1 4.5q-2.1-.9-4.2 0Z';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <LocalGrad id={ray} stops={[['0', shade(accent, 85)], ['0.55', accent], ['1', shade(accent, -50)]]} />
      <G fill={`url(#${ray})`} stroke={ol} strokeWidth="1.6" strokeLinejoin="round">
        <Path d={rayPath} />
        <Path d={rayPath} transform="rotate(45 12 12)" />
        <Path d={rayPath} transform="rotate(90 12 12)" />
        <Path d={rayPath} transform="rotate(135 12 12)" />
        <Path d={rayPath} transform="rotate(180 12 12)" />
        <Path d={rayPath} transform="rotate(225 12 12)" />
        <Path d={rayPath} transform="rotate(270 12 12)" />
        <Path d={rayPath} transform="rotate(315 12 12)" />
      </G>
      {/* molten core: stacked circles light-to-deep, drifting toward the light */}
      <Circle cx="12" cy="12" r="5.7" fill={shade(accent, -38)} stroke={ol} strokeWidth="2" />
      <Circle cx="11.85" cy="11.85" r="4.6" fill={accent} />
      <Circle cx="11.7" cy="11.7" r="3.5" fill={shade(accent, 48)} />
      <Circle cx="11.6" cy="11.6" r="2.4" fill={shade(accent, 100)} />
      <Circle cx="11.5" cy="11.5" r="1.3" fill="#fff8dc" />
      {/* big specular blob + tiny sparkle */}
      <Ellipse cx="9.8" cy="9.5" rx="2.3" ry="1.4" transform="rotate(-24 9.8 9.5)" fill="rgba(255,255,255,0.8)" />
      <Path d="M15.3 3.2l.45.75.8.45-.8.45-.45.75-.45-.75-.8-.45.8-.45Z" fill="#fffdf0" />
    </Svg>
  );
}

export function MoonIcon({ size = 24, accent = '#c9d2e8' }: IconProps) {
  const id = useMemo(() => gradId('moon'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M20.4 14.6A9 9 0 0 1 9.4 3.6 9 9 0 1 0 20.4 14.6Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Circle cx="10.2" cy="14.8" r="1.3" fill={shade(accent, -45)} />
      <Circle cx="13.8" cy="17.8" r="0.9" fill={shade(accent, -45)} />
    </Svg>
  );
}

export function SnowflakeIcon({ size = 24, accent = '#7cd9ff' }: IconProps) {
  const id = useMemo(() => gradId('snow'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <G stroke={`url(#${id})`} strokeWidth="1.8" strokeLinecap="round">
        <Path d="M12 2.4v19.2M3.7 7.2l16.6 9.6M20.3 7.2 3.7 16.8" />
        <Path d="M12 2.4 9.8 4.6M12 2.4l2.2 2.2M12 21.6l-2.2-2.2M12 21.6l2.2-2.2M3.7 7.2l3 .5M3.7 7.2l.5 3M20.3 16.8l-3-.5M20.3 16.8l-.5-3M20.3 7.2l-3 .5M20.3 7.2l-.5 3M3.7 16.8l3-.5M3.7 16.8l.5-3" />
      </G>
      <Circle cx="12" cy="12" r="1.7" fill="#f5faff" stroke={rim(accent)} strokeWidth="0.9" />
    </Svg>
  );
}

export function DropletIcon({ size = 24, accent = '#31a6e8' }: IconProps) {
  const id = useMemo(() => gradId('drop'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M12 2.4c4 5.2 7 8.6 7 12.4a7 7 0 0 1-14 0c0-3.8 3-7.2 7-12.4Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M8.2 14.4c0 2 1.2 3.6 3 4.2" fill="none" stroke={HILITE} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function WaveIcon({ size = 24, accent = '#31a6e8' }: IconProps) {
  const id = useMemo(() => gradId('wave'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M2 15.6c2.4-6.4 6.6-9.2 10-7.2 2.5 1.5 2.6 4.6.8 5.9-1.5 1.1-3.5.5-3.9-1.1-.3-1.2.5-2.3 1.7-2.4" fill="none" stroke={`url(#${id})`} strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M2.6 19.4c3-1.6 5.8-1.6 9.4 0 3.6 1.6 6.4 1.6 9.4 0" fill="none" stroke={shade(accent, 30)} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="17.8" cy="7.4" r="1.4" fill={shade(accent, 60)} stroke={rim(accent)} strokeWidth="0.9" />
    </Svg>
  );
}

export function FlaskIcon({ size = 24, accent = '#00f5d4' }: IconProps) {
  const id = useMemo(() => gradId('flask'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M9.6 2.8h4.8M10.4 3v6.2l5.9 8.9a2.4 2.4 0 0 1-2 3.7H9.7a2.4 2.4 0 0 1-2-3.7l5.9-8.9V3" fill="none" stroke={shade(accent, -25)} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 14.6h6l1.9 2.9a1.5 1.5 0 0 1-1.2 2.3H8.3a1.5 1.5 0 0 1-1.2-2.3Z" fill={`url(#${id})`} />
      <Circle cx="13.6" cy="13" r="0.9" fill={shade(accent, 50)} />
      <Circle cx="11" cy="11.2" r="0.7" fill={shade(accent, 50)} />
    </Svg>
  );
}

export function TelescopeIcon({ size = 24, accent = '#7c5cff' }: IconProps) {
  const id = useMemo(() => gradId('tele'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M3.2 10.8 17 3.4l2.6 4.8-13.8 7.4Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M17.6 3.1l3 5.4" stroke={shade(accent, -45)} strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M3 11.2l1.6 2.9" stroke={shade(accent, -45)} strokeWidth="2.4" strokeLinecap="round" />
      <Path d="M11 13.6 8.2 21M11.8 14.4l3 6.2" stroke={shade(accent, -30)} strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="11.4" cy="13" r="1.6" fill={shade(accent, 40)} stroke={rim(accent)} strokeWidth="1" />
    </Svg>
  );
}

export function ScrollIcon({ size = 24, accent = '#e8c07a' }: IconProps) {
  const id = useMemo(() => gradId('scroll'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M6.6 4.2h12.2a2.2 2.2 0 0 1 0 4.4h-1V19a1.8 1.8 0 0 1-1.8 1.8H7.2A2.6 2.6 0 0 1 4.6 18V6.4a2.2 2.2 0 0 1 2-2.2Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M16.6 4.2a2.2 2.2 0 0 0-2.2 2.2v2.2h4.4" fill="none" stroke={rim(accent)} strokeWidth="1.2" />
      <Path d="M7.8 10.4h6.4M7.8 13.2h6.4M7.8 16h4.4" stroke={shade(accent, -62)} strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  );
}

export function RocketIcon({ size = 24, accent = '#ff4466' }: IconProps) {
  const id = useMemo(() => gradId('rocket'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M12 1.8c3 2.2 4.6 5.4 4.6 9.2 0 2.6-.7 5-1.9 6.8H9.3c-1.2-1.8-1.9-4.2-1.9-6.8 0-3.8 1.6-7 4.6-9.2Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Circle cx="12" cy="9" r="2.2" fill="#7cd9ff" stroke={rim(accent)} strokeWidth="1.1" />
      <Path d="M7.6 12.6 4.6 16.8l3.4-.6M16.4 12.6l3 4.2-3.4-.6" fill={shade(accent, -25)} stroke={rim(accent)} strokeWidth="1.2" strokeLinejoin="round" />
      <Path d="M12 18v3.6M10 18.6c-.3 1.2-.9 2-1.8 2.6M14 18.6c.3 1.2.9 2 1.8 2.6" stroke="#ffb800" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}

export function PlanetIcon({ size = 24, accent = '#c84dff' }: IconProps) {
  const id = useMemo(() => gradId('planet'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Circle cx="12" cy="12" r="6.4" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" />
      <Path d="M3.2 15.6c-1.5-1.2-.4-3.2 2.9-5M20.8 8.4c1.5 1.2.4 3.2-2.9 5" fill="none" stroke="#00e5ff" strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M5.4 14.9c3.6 2.9 9.6 2.9 13.2 0" fill="none" stroke="#00e5ff" strokeWidth="1.6" strokeLinecap="round" />
      <Circle cx="9.6" cy="9.8" r="1.2" fill={shade(accent, 55)} />
    </Svg>
  );
}

export function PaletteIcon({ size = 24, accent = '#ff7a1a' }: IconProps) {
  const id = useMemo(() => gradId('palette'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M12 2.8a9.2 9.2 0 1 0 .4 18.4c1.7 0 2.3-1 1.7-2.3-.8-1.7 0-3.3 2-3.3h2.2c2 0 3.1-1.2 3-3.2C21 6.6 17 2.8 12 2.8Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Circle cx="8" cy="8.2" r="1.6" fill="#ff2d95" stroke={rim(accent)} strokeWidth="0.8" />
      <Circle cx="13.4" cy="6.6" r="1.6" fill="#00e5ff" stroke={rim(accent)} strokeWidth="0.8" />
      <Circle cx="6.4" cy="13.4" r="1.6" fill="#ffd24d" stroke={rim(accent)} strokeWidth="0.8" />
      <Circle cx="17.4" cy="10.4" r="1.4" fill="#35b892" stroke={rim(accent)} strokeWidth="0.8" />
    </Svg>
  );
}

export function MusicNoteIcon({ size = 24, accent = '#c84dff' }: IconProps) {
  const id = useMemo(() => gradId('note'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M9.8 18.4V5.2L19.4 3v13" fill="none" stroke={`url(#${id})`} strokeWidth="2.1" strokeLinejoin="round" />
      <Ellipse cx="7" cy="18.6" rx="3" ry="2.4" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.2" />
      <Ellipse cx="16.6" cy="16.2" rx="3" ry="2.4" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.2" />
    </Svg>
  );
}

export function MasksIcon({ size = 24, accent = '#ffd24d' }: IconProps) {
  const id = useMemo(() => gradId('masks'), []);
  const id2 = useMemo(() => gradId('masks2'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <BodyGrad id={id2} color="#c84dff" />
      <Path d="M3 4.6c3.2 1.2 5.6 1.2 8.8 0V12c0 3.2-2 5.4-4.4 5.4S3 15.2 3 12Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.3" strokeLinejoin="round" />
      <Path d="M5.4 8.6c.5.5 1.1.5 1.6 0M9 8.6c.5.5 1.1.5 1.6 0M5.6 12.6c.9 1 2.7 1 3.6 0" fill="none" stroke={rim(accent)} strokeWidth="1.1" strokeLinecap="round" />
      <Path d="M12.2 7c3.2 1.2 5.6 1.2 8.8 0v7.4c0 3.2-2 5.4-4.4 5.4s-4.4-2.2-4.4-5.4Z" fill={`url(#${id2})`} stroke={rim('#c84dff')} strokeWidth="1.3" strokeLinejoin="round" />
      <Path d="M14.4 11.4c.5-.5 1.1-.5 1.6 0M18 11.4c.5-.5 1.1-.5 1.6 0M14.8 16c.9-1 2.7-1 3.6 0" fill="none" stroke={rim('#c84dff')} strokeWidth="1.1" strokeLinecap="round" />
    </Svg>
  );
}

export function FrameIcon({ size = 24, accent = '#e8c07a' }: IconProps) {
  const id = useMemo(() => gradId('frame'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Rect x="3.2" y="3.2" width="17.6" height="17.6" rx="2.4" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" />
      <Rect x="7" y="7" width="10" height="10" rx="1" fill="#2a1050" stroke={shade(accent, -55)} strokeWidth="1.2" />
      <Path d="M7.8 15.2 10.6 12l2.2 2.4 1.8-1.8 2.6 2.6" fill="none" stroke="#00e5ff" strokeWidth="1.2" strokeLinejoin="round" />
      <Circle cx="10" cy="9.8" r="0.9" fill="#ffd24d" />
    </Svg>
  );
}

export function GlobeIcon({ size = 24, accent = '#31a6e8' }: IconProps) {
  const sea = useMemo(() => gradId('globesea'), []);
  const land = useMemo(() => gradId('globeland'), []);
  const ol = shade(accent, -118);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <LocalGrad id={sea} stops={[['0', shade(accent, 58)], ['0.5', accent], ['1', shade(accent, -78)]]} />
      <LocalGrad id={land} stops={[['0', '#b9f0a2'], ['1', '#4fbf74']]} />
      {/* glossy deep-sea sphere, fat outline */}
      <Circle cx="12" cy="12" r="9.3" fill={`url(#${sea})`} stroke={ol} strokeWidth="2" />
      {/* lighter landmasses */}
      <Path d="M6.1 8.4C6.5 6.1 8.6 4.8 10.9 5.2c2.2.4 3 2 2 3.6-.7 1-.4 2-1.4 2.9-1.3 1.2-3.6.8-4.6-.6-.7-.9-1-1.7-.8-2.7Z" fill={`url(#${land})`} stroke="rgba(9,64,96,0.4)" strokeWidth="0.9" />
      <Path d="M15.1 10.5c1.4-1 3.4-.5 3.9 1 .4 1.3-.4 2.6-1.9 2.8-1.4.2-2.5-.7-2.4-2 0-.7.1-1.4.4-1.8Z" fill={`url(#${land})`} stroke="rgba(9,64,96,0.4)" strokeWidth="0.9" />
      <Ellipse cx="10.3" cy="16.6" rx="1.5" ry="1.1" fill={`url(#${land})`} stroke="rgba(9,64,96,0.4)" strokeWidth="0.9" />
      {/* thin latitude arc */}
      <Path d="M4.3 14.1c2.4 2.5 13 2.5 15.4 0" fill="none" stroke={shade(accent, -52)} strokeOpacity="0.7" strokeWidth="1.1" strokeLinecap="round" />
      {/* big specular blob */}
      <Ellipse cx="8.6" cy="6.8" rx="3.4" ry="1.9" transform="rotate(-27 8.6 6.8)" fill="rgba(255,255,255,0.55)" />
      {/* tiny orbiting sparkle + trailing mote */}
      <Path d="M20.6 2.9l.4.7.75.4-.75.4-.4.7-.4-.7-.75-.4.75-.4Z" fill="#f2fbff" />
      <Circle cx="3.2" cy="18.9" r="0.65" fill="rgba(242,251,255,0.85)" />
    </Svg>
  );
}

export function BookIcon({ size = 24, accent = '#ff4466' }: IconProps) {
  const id = useMemo(() => gradId('book'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M6.8 2.8h11.4a1 1 0 0 1 1 1V20a1.2 1.2 0 0 1-1.2 1.2H6.8A2.6 2.6 0 0 1 4.2 18.6V5.4a2.6 2.6 0 0 1 2.6-2.6Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M4.2 18.6A2.6 2.6 0 0 1 6.8 16h12.4" fill="none" stroke={rim(accent)} strokeWidth="1.2" />
      <Path d="M8.6 6.8h7M8.6 9.6h5" stroke={shade(accent, 80)} strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  );
}

export function BookOpenIcon({ size = 24, accent = '#00f5d4' }: IconProps) {
  const id = useMemo(() => gradId('bopen'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M12 5.6C10 4 7 3.4 3.2 3.8V18c3.8-.4 6.8.2 8.8 1.8 2-1.6 5-2.2 8.8-1.8V3.8C17 3.4 14 4 12 5.6Z" fill={`url(#${id})`} stroke={rim(accent)} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M12 5.6v14.2" stroke={shade(accent, -55)} strokeWidth="1.3" />
      <Path d="M5.6 7.4c1.6-.1 3 .1 4.2.6M5.6 10.4c1.6-.1 3 .1 4.2.6M14.2 8c1.2-.5 2.6-.7 4.2-.6M14.2 11c1.2-.5 2.6-.7 4.2-.6" stroke={shade(accent, -48)} strokeWidth="1.1" strokeLinecap="round" fill="none" />
    </Svg>
  );
}
