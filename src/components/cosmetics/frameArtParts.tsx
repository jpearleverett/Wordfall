/**
 * Shared geometry + primitives for the bespoke profile-frame SVG art.
 *
 * Frames draw in a 100×100 viewBox (finer detail than the 24×24 icon set —
 * these ring compositions render at ~100px around the avatar). Same material
 * recipe as `iconsDecor`: gradient bodies via IconBase's BodyGrad/DuoGrad,
 * dark rim strokes, top-light specular arcs. The avatar disc sits beneath at
 * radius ≈44 units, so the ring band (r≈38–46) overlaps its edge and the
 * decorative flourishes (flames, shards, crowns, stars) reach out to r≈50.
 */
import React from 'react';
import { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { HILITE } from '../icons/IconBase';

export const FVB = '0 0 100 100';

export interface FrameRenderProps {
  /** Primary hue of this frame instance (#rrggbb). */
  accent: string;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Round to 2 decimals so path strings stay compact. */
export function n2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Point on a circle around (50,50). Angle in degrees, 0 = 12 o'clock,
 * increasing clockwise (90 = right, 180 = bottom, 270 = left).
 */
export function pt(r: number, ang: number): { x: number; y: number } {
  return { x: n2(50 + r * Math.sin(rad(ang))), y: n2(50 - r * Math.cos(rad(ang))) };
}

/** Clockwise arc path from a0° to a1° (a1 > a0) at radius r around (50,50). */
export function arcPath(r: number, a0: number, a1: number): string {
  const s = pt(r, a0);
  const e = pt(r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

/** Four-point sparkle (concave diamond) centered at (cx, cy). */
export function sparkle4(cx: number, cy: number, s: number): string {
  const k = n2(s * 0.22);
  return (
    `M ${n2(cx)} ${n2(cy - s)} L ${n2(cx + k)} ${n2(cy - k)} L ${n2(cx + s)} ${n2(cy)}` +
    ` L ${n2(cx + k)} ${n2(cy + k)} L ${n2(cx)} ${n2(cy + s)} L ${n2(cx - k)} ${n2(cy + k)}` +
    ` L ${n2(cx - s)} ${n2(cy)} L ${n2(cx - k)} ${n2(cy - k)} Z`
  );
}

/** Five-point star centered at (cx, cy), tip pointing up. */
export function star5(cx: number, cy: number, rOut: number, rIn: number): string {
  const parts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = rad(i * 36);
    parts.push(`${i === 0 ? 'M' : 'L'} ${n2(cx + r * Math.sin(a))} ${n2(cy - r * Math.cos(a))}`);
  }
  return `${parts.join(' ')} Z`;
}

/**
 * Teardrop leaf in local coords: base at origin, tip at (0, -len).
 * Place with transform={`translate(x y) rotate(deg)`}.
 */
export function leafPath(len: number, wid: number): string {
  return `M0 0 Q ${n2(wid)} ${n2(-len * 0.45)} 0 ${n2(-len)} Q ${n2(-wid)} ${n2(-len * 0.45)} 0 0 Z`;
}

/** Thin dark rims hugging the band's outer + inner edges. */
export function Rims({ color, rOut, rIn, w = 1.3 }: { color: string; rOut: number; rIn: number; w?: number }) {
  return (
    <>
      <Circle cx={50} cy={50} r={rOut} fill="none" stroke={color} strokeWidth={w} />
      <Circle cx={50} cy={50} r={rIn} fill="none" stroke={color} strokeWidth={w} />
    </>
  );
}

/** Specular highlight arc across the top of the band (light from above). */
export function TopShine({ r = 42, spread = 52, opacity = 0.7, w = 2 }: {
  r?: number; spread?: number; opacity?: number; w?: number;
}) {
  return (
    <Path
      d={arcPath(r, 360 - spread, 360 + spread)}
      stroke={HILITE}
      strokeWidth={w}
      strokeLinecap="round"
      fill="none"
      opacity={opacity}
    />
  );
}

/**
 * Multi-stop vertical gradient for material bands (metals need more than the
 * two/three stops of BodyGrad/DuoGrad to read as polished surfaces — bright
 * skylight, tone roll, core color, reflected floor bounce, deep base).
 * `stops` is [offset 0–1, #rrggbb][].
 */
export function MetalGrad({ id, stops }: { id: string; stops: Array<[number, string]> }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {stops.map(([off, c]) => (
          <Stop key={off} offset={String(off)} stopColor={c} />
        ))}
      </LinearGradient>
    </Defs>
  );
}

/**
 * Dark occlusion arc hugging the band's lower edge — the "sits on the page"
 * shadow every dimensional ring needs opposite its specular.
 */
export function UnderShadow({ r = 44.8, spread = 58, opacity = 0.4, w = 2 }: {
  r?: number; spread?: number; opacity?: number; w?: number;
}) {
  return (
    <Path
      d={arcPath(r, 180 - spread, 180 + spread)}
      stroke="rgba(5,0,16,1)"
      strokeWidth={w}
      strokeLinecap="round"
      fill="none"
      opacity={opacity}
    />
  );
}
