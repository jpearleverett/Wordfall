/**
 * Bespoke profile-frame ring designs, part 1 of 2.
 *
 * Each design is an illustration-grade SVG ring composition (~15–25 shapes):
 * gradient metals/energy, dark rim strokes, top-light shading — the same
 * material language as `iconsDecor`. All draw in the shared 100×100 viewBox
 * with the band at r≈38–46 and flourishes reaching to r≈50.
 */
import React, { useMemo } from 'react';
import { Circle, G, Path, Rect } from 'react-native-svg';
import { BodyGrad, DuoGrad, gradId, rim, shade, HILITE, HILITE_SOFT } from '../icons/IconBase';
import { FrameRenderProps, arcPath, leafPath, pt, sparkle4, Rims, TopShine } from './frameArtParts';

/** Clean polished metal band — the common-tier fallback. */
export function SimpleRing({ accent }: FrameRenderProps) {
  const g = useMemo(() => gradId('frSimple'), []);
  const rimC = rim(accent);
  return (
    <>
      <BodyGrad id={g} color={accent} />
      <Circle cx={50} cy={50} r={42} fill="none" stroke={`url(#${g})`} strokeWidth={7} />
      <Rims color={rimC} rOut={45.7} rIn={38.3} />
      <Circle cx={50} cy={50} r={37.2} fill="none" stroke="rgba(5,0,16,0.35)" strokeWidth={1} />
      <TopShine />
      <Path d={arcPath(42, 132, 228)} stroke={shade(accent, 42)} strokeWidth={1.5} strokeLinecap="round" fill="none" opacity={0.45} />
      {[45, 135, 225, 315].map((a) => {
        const p = pt(42, a);
        return (
          <G key={a}>
            <Circle cx={p.x} cy={p.y} r={1.9} fill={shade(accent, -32)} stroke={rimC} strokeWidth={0.7} />
            <Circle cx={p.x - 0.5} cy={p.y - 0.6} r={0.6} fill={HILITE_SOFT} />
          </G>
        );
      })}
    </>
  );
}

/** Gold laurel wreath: two leafy branches climbing the ring, tied at bottom. */
export function LaurelFrame({ accent }: FrameRenderProps) {
  const band = useMemo(() => gradId('frLaurB'), []);
  const leaf = useMemo(() => gradId('frLaurL'), []);
  const rimC = rim(accent);
  const stemC = shade(accent, -30);
  // Leaf stations climb each side from the bottom toward the top.
  const rightAngles = [152, 128, 104, 80, 56, 33];
  const leftAngles = [208, 232, 256, 280, 304, 327];
  const leafAt = (a: number, left: boolean, i: number) => {
    const outer = i % 2 === 0;
    const p = pt(outer ? 44.4 : 39.6, a);
    const rot = left ? a + (outer ? 42 : 138) : a - (outer ? 42 : 138);
    const len = outer ? 6.4 : 5.4;
    return (
      <Path
        key={`${a}-${left}`}
        d={leafPath(len, len * 0.36)}
        transform={`translate(${p.x} ${p.y}) rotate(${rot})`}
        fill={`url(#${leaf})`}
        stroke={rimC}
        strokeWidth={0.7}
        strokeLinejoin="round"
      />
    );
  };
  return (
    <>
      <DuoGrad id={band} from={shade(accent, 18)} to={shade(accent, -58)} />
      <DuoGrad id={leaf} from={shade(accent, 52)} to={shade(accent, -32)} />
      <Circle cx={50} cy={50} r={42} fill="none" stroke={`url(#${band})`} strokeWidth={4.6} />
      <Rims color={rimC} rOut={44.5} rIn={39.5} w={1.1} />
      {/* branch stems */}
      <Path d={arcPath(42, 25, 172)} stroke={stemC} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d={arcPath(42, 188, 335)} stroke={stemC} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {rightAngles.map((a, i) => leafAt(a, false, i))}
      {leftAngles.map((a, i) => leafAt(a, true, i))}
      {/* berries tucked between leaves */}
      {[66, 118, 242, 294].map((a) => {
        const p = pt(41.6, a);
        return <Circle key={a} cx={p.x} cy={p.y} r={1.2} fill={shade(accent, -14)} stroke={rimC} strokeWidth={0.5} />;
      })}
      {/* crossed ribbon tie at the bottom */}
      <Path d="M45.6 92.6 L50 87.6 L54.4 92.6 L50 91.2 Z" fill="#c8353f" stroke="#701a20" strokeWidth={0.8} strokeLinejoin="round" />
      <Path d="M47.6 88.3 L52.4 92 M52.4 88.3 L47.6 92" stroke="#8e232c" strokeWidth={1.1} strokeLinecap="round" />
      {/* victor's sparkle in the top gap */}
      <Path d={sparkle4(50, 8.2, 3)} fill="#fff" opacity={0.92} />
      <TopShine r={42} spread={30} opacity={0.5} w={1.4} />
    </>
  );
}

/** Ornate gilded ring: beaded inner edge, filigree curls, cardinal gems. */
export function GildedFrame({ accent }: FrameRenderProps) {
  const band = useMemo(() => gradId('frGildB'), []);
  const bez = useMemo(() => gradId('frGildZ'), []);
  const edge = shade(accent, -68);
  const gemColors = ['#ff4d6d', '#34d8b0', '#4d9dff', '#c95eff'];
  return (
    <>
      <DuoGrad id={band} from={shade(accent, 55)} to={shade(accent, -45)} />
      <DuoGrad id={bez} from={shade(accent, 30)} to={shade(accent, -60)} />
      <Circle cx={50} cy={50} r={42} fill="none" stroke={`url(#${band})`} strokeWidth={8} />
      <Rims color={edge} rOut={46.2} rIn={37.8} w={1.4} />
      {/* beaded inner circle */}
      {Array.from({ length: 20 }, (_, i) => {
        const p = pt(38.8, i * 18 + 9);
        return (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={1.2}
            fill={i % 2 === 0 ? shade(accent, 34) : shade(accent, -6)}
            stroke={edge}
            strokeWidth={0.45}
          />
        );
      })}
      {/* filigree curls at the diagonals */}
      {[45, 135, 225, 315].map((a) => {
        const p = pt(42.6, a);
        return (
          <Path
            key={a}
            d="M-4 0 C -2 -3.2 2 -3.2 0.4 -0.2 C -1.4 2.6 2.6 2.8 4 0"
            transform={`translate(${p.x} ${p.y}) rotate(${a})`}
            stroke={shade(accent, 62)}
            strokeWidth={1}
            fill="none"
            strokeLinecap="round"
          />
        );
      })}
      {/* cardinal bezel-set gems */}
      {[0, 90, 180, 270].map((a, i) => {
        const p = pt(42, a);
        return (
          <G key={a}>
            <Circle cx={p.x} cy={p.y} r={4.1} fill={`url(#${bez})`} stroke={edge} strokeWidth={0.9} />
            <Path
              d={`M ${p.x} ${p.y - 2.6} L ${p.x + 2.6} ${p.y} L ${p.x} ${p.y + 2.6} L ${p.x - 2.6} ${p.y} Z`}
              fill={gemColors[i]}
              stroke={shade(gemColors[i], -70)}
              strokeWidth={0.6}
              strokeLinejoin="round"
            />
            <Path d={`M ${p.x - 0.9} ${p.y - 0.9} L ${p.x + 0.3} ${p.y - 1.5}`} stroke={HILITE} strokeWidth={0.6} strokeLinecap="round" />
          </G>
        );
      })}
      <TopShine r={42} spread={34} opacity={0.55} w={1.8} />
    </>
  );
}

/** Neon circuit board: slate ring, glowing traces, solder nodes, chip notch. */
export function NeonCircuitFrame({ accent }: FrameRenderProps) {
  const band = useMemo(() => gradId('frCircB'), []);
  const DARK = '#0d1120';
  const segs: Array<[number, number, number]> = [
    // [radius, a0, a1]
    [44, 210, 265],
    [40, 290, 350],
    [44, 15, 80],
    [40, 100, 150],
    [44, 165, 195],
  ];
  return (
    <>
      <DuoGrad id={band} from="#2e3a5e" to="#161d33" />
      <Circle cx={50} cy={50} r={42} fill="none" stroke={`url(#${band})`} strokeWidth={8} />
      <Rims color={DARK} rOut={46.2} rIn={37.8} w={1.3} />
      {/* traces: soft glow pass under a crisp core pass */}
      {segs.map(([r, a0, a1], i) => (
        <G key={i}>
          <Path d={arcPath(r, a0, a1)} stroke={accent} strokeWidth={3} opacity={0.2} fill="none" strokeLinecap="round" />
          <Path d={arcPath(r, a0, a1)} stroke={accent} strokeWidth={1.2} opacity={0.95} fill="none" strokeLinecap="round" />
        </G>
      ))}
      {/* radial vias linking the two trace radii */}
      {[290, 100, 165].map((a) => {
        const p1 = pt(40, a);
        const p2 = pt(44, a);
        return <Path key={a} d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`} stroke={accent} strokeWidth={1.2} opacity={0.85} />;
      })}
      {/* solder nodes with halos */}
      {[265, 350, 80, 150, 210].map((a) => {
        const p = pt(42, a);
        return (
          <G key={a}>
            <Circle cx={p.x} cy={p.y} r={3.4} fill={accent} opacity={0.16} />
            <Circle cx={p.x} cy={p.y} r={2.1} fill={DARK} stroke={accent} strokeWidth={1} />
            <Circle cx={p.x} cy={p.y} r={0.8} fill={shade(accent, 80)} />
          </G>
        );
      })}
      {/* chip notch at 12 o'clock */}
      <Rect x={46.4} y={4.4} width={7.2} height={3.6} rx={0.9} fill={DARK} stroke={accent} strokeWidth={0.8} />
      <Path d="M48.2 8 v1.6 M51.8 8 v1.6" stroke={accent} strokeWidth={0.8} strokeLinecap="round" />
      <TopShine r={45} spread={26} opacity={0.28} w={1.2} />
    </>
  );
}

/** Faceted ice: frosted band ringed by crystal shards and cold sparkles. */
export function CrystalFrame({ accent }: FrameRenderProps) {
  const band = useMemo(() => gradId('frCryB'), []);
  const ice = useMemo(() => gradId('frCryI'), []);
  const edge = shade(accent, -55);
  const lens = [6.4, 4, 5.4, 3.6, 6, 4.2, 5.6, 3.8, 6.2, 4, 5.2, 3.6];
  return (
    <>
      <DuoGrad id={band} from={shade(accent, 68)} to={shade(accent, -38)} />
      <DuoGrad id={ice} from="#f0fbff" to={accent} />
      <Circle cx={50} cy={50} r={41.5} fill="none" stroke={`url(#${band})`} strokeWidth={6} />
      <Rims color={edge} rOut={44.7} rIn={38.3} w={1.1} />
      {/* shards radiating outward, tallest at the cardinal points */}
      {lens.map((len, i) => {
        const a = i * 30;
        const p = pt(43, a);
        return (
          <Path
            key={a}
            d={`M -2.1 0 L 0 ${-len} L 2.1 0 L 0 1.5 Z`}
            transform={`translate(${p.x} ${p.y}) rotate(${a})`}
            fill={`url(#${ice})`}
            stroke={edge}
            strokeWidth={0.75}
            strokeLinejoin="round"
            opacity={0.96}
          />
        );
      })}
      {/* facet glints on the four tallest shards */}
      {[0, 120, 240, 60].map((a) => {
        const p = pt(43, a);
        return (
          <Path
            key={a}
            d="M -0.6 -0.6 L -0.1 -4.6"
            transform={`translate(${p.x} ${p.y}) rotate(${a})`}
            stroke="#fff"
            strokeWidth={0.55}
            strokeLinecap="round"
            opacity={0.85}
          />
        );
      })}
      <Circle cx={50} cy={50} r={38.6} fill="none" stroke="#eafaff" strokeWidth={0.9} opacity={0.5} />
      <Path d={sparkle4(77.5, 29, 2.6)} fill="#fff" opacity={0.92} />
      <Path d={sparkle4(21.5, 66, 2.1)} fill="#fff" opacity={0.8} />
      <Path d={sparkle4(58, 86.5, 1.7)} fill="#fff" opacity={0.7} />
      <TopShine r={41.5} spread={44} opacity={0.75} w={1.8} />
    </>
  );
}

/** Ring of fire: ember band with licking two-tone flames and drifting sparks. */
export function FlameFrame({ accent }: FrameRenderProps) {
  const band = useMemo(() => gradId('frFlmB'), []);
  const fl = useMemo(() => gradId('frFlmF'), []);
  const edge = shade(accent, -70);
  return (
    <>
      <DuoGrad id={band} from={shade(accent, 30)} to={shade(accent, -66)} />
      <DuoGrad id={fl} from="#ffd24d" to={accent} />
      {/* heat halo */}
      <Circle cx={50} cy={50} r={44.5} fill="none" stroke={accent} strokeWidth={8} opacity={0.16} />
      <Circle cx={50} cy={50} r={41} fill="none" stroke={`url(#${band})`} strokeWidth={6} />
      <Rims color={edge} rOut={44} rIn={38} w={1.1} />
      {/* flame tongues, alternating tall licks and short curls */}
      {Array.from({ length: 9 }, (_, i) => {
        const a = i * 40;
        const big = i % 2 === 0;
        const p = pt(42.6, a);
        const s = big ? 1 : 0.72;
        return (
          <G key={a} transform={`translate(${p.x} ${p.y}) rotate(${a}) scale(${s})`}>
            <Path
              d="M-2.6 0.6 C -3.1 -2.6 -1.7 -3.5 -1.9 -5.6 C -0.8 -4 0.1 -4.8 -0.1 -7 C 1.5 -4.6 2.3 -3.4 2.6 0.6 Z"
              fill={`url(#${fl})`}
              stroke={shade(accent, -46)}
              strokeWidth={0.7}
              strokeLinejoin="round"
            />
            <Path d="M-1 0.4 C -1.4 -1.6 -0.4 -2.2 0 -3.6 C 0.8 -2.2 1.2 -1.2 1.1 0.4 Z" fill="#fff3c0" opacity={0.85} />
          </G>
        );
      })}
      {/* drifting sparks */}
      <Circle cx={70} cy={11.5} r={1} fill="#ffd24d" opacity={0.95} />
      <Circle cx={16.5} cy={38} r={0.8} fill="#ffb84d" opacity={0.85} />
      <Circle cx={82} cy={70} r={0.7} fill="#ffd24d" opacity={0.75} />
      {/* coal glint along the lower band */}
      <Path d={arcPath(41, 140, 220)} stroke={shade(accent, 46)} strokeWidth={1.3} fill="none" strokeLinecap="round" opacity={0.5} />
      <TopShine r={41} spread={36} opacity={0.4} w={1.4} />
    </>
  );
}
