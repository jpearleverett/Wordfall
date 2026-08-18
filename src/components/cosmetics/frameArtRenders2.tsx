/**
 * Bespoke profile-frame ring designs, part 2 of 2.
 * Shares the material recipe + 100×100 geometry of part 1.
 */
import React, { useMemo } from 'react';
import { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { DuoGrad, BodyGrad, gradId, shade, HILITE, HILITE_SOFT } from '../icons/IconBase';
import { FrameRenderProps, arcPath, leafPath, pt, sparkle4, star5, Rims, TopShine } from './frameArtParts';

/** Rolling ocean: deep-sea band with breaking wave curls and foam caps. */
export function WaveFrame({ accent }: FrameRenderProps) {
  const band = useMemo(() => gradId('frWavB'), []);
  const crest = useMemo(() => gradId('frWavC'), []);
  const edge = shade(accent, -66);
  return (
    <>
      <DuoGrad id={band} from={shade(accent, 50)} to={shade(accent, -56)} />
      <DuoGrad id={crest} from="#e6faff" to={shade(accent, 24)} />
      <Circle cx={50} cy={50} r={42} fill="none" stroke={`url(#${band})`} strokeWidth={7} />
      <Rims color={edge} rOut={45.7} rIn={38.4} w={1.2} />
      {/* breaking crests riding the band clockwise */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = i * 45 + 10;
        const p = pt(44, a);
        return (
          <Path
            key={a}
            d="M0 0.6 C 1 -3.2 4 -4.4 6.4 -2.8 C 4.7 -3 3.4 -2.1 3.2 -0.6 C 2.2 -1.8 1 -1.5 0 0.6 Z"
            transform={`translate(${p.x} ${p.y}) rotate(${a})`}
            fill={`url(#${crest})`}
            stroke={edge}
            strokeWidth={0.7}
            strokeLinejoin="round"
          />
        );
      })}
      {/* foam clusters at every other crest tip */}
      {[10, 100, 190, 280].map((a) => {
        const p = pt(46.6, a + 10);
        return (
          <G key={a}>
            <Circle cx={p.x} cy={p.y} r={0.9} fill="#f4fdff" opacity={0.95} />
            <Circle cx={p.x + 1.5} cy={p.y + 0.7} r={0.6} fill="#f4fdff" opacity={0.8} />
            <Circle cx={p.x - 1.2} cy={p.y + 0.9} r={0.5} fill="#f4fdff" opacity={0.7} />
          </G>
        );
      })}
      {/* flung droplets */}
      <Path d="M81 24.6 c 1 1.5 1 2.5 0.1 2.9 c -0.9 0.4 -1.7 -0.4 -1.4 -1.5 c 0.2 -0.6 0.7 -1 1.3 -1.4 Z" fill={shade(accent, 42)} stroke={edge} strokeWidth={0.5} />
      <Path d="M18 68 c 0.9 1.3 0.9 2.2 0.1 2.5 c -0.8 0.4 -1.5 -0.3 -1.2 -1.3 c 0.1 -0.5 0.5 -0.8 1.1 -1.2 Z" fill={shade(accent, 42)} stroke={edge} strokeWidth={0.5} />
      <Circle cx={50} cy={50} r={38.7} fill="none" stroke="#dff6ff" strokeWidth={0.9} opacity={0.5} />
      <TopShine r={42} spread={40} opacity={0.6} w={1.8} />
    </>
  );
}

/** Night orbit: dashed star-trail ring, a gradient star, comet and moon. */
export function StarOrbitFrame({ accent }: FrameRenderProps) {
  const star = useMemo(() => gradId('frOrbS'), []);
  const band = useMemo(() => gradId('frOrbB'), []);
  const NIGHT_EDGE = '#0c0a24';
  const bigStar = pt(42, 38);
  const comet = pt(42, 212);
  const moon = pt(42, 318);
  return (
    <>
      <DuoGrad id={band} from="#34346b" to="#141233" />
      <DuoGrad id={star} from={shade(accent, 60)} to={shade(accent, -22)} />
      <Circle cx={50} cy={50} r={42} fill="none" stroke={`url(#${band})`} strokeWidth={6} />
      <Rims color={NIGHT_EDGE} rOut={45.2} rIn={38.8} w={1.2} />
      {/* orbital trail: soft glow + dashed core */}
      <Circle cx={50} cy={50} r={42} fill="none" stroke={accent} strokeWidth={3} opacity={0.16} />
      <Circle cx={50} cy={50} r={42} fill="none" stroke={accent} strokeWidth={1.1} strokeDasharray="5 4.6" opacity={0.9} />
      {/* comet with tapering tail sweeping the lower-left arc */}
      <Path d={arcPath(42, 214, 244)} stroke={shade(accent, 70)} strokeWidth={1.7} fill="none" strokeLinecap="round" opacity={0.4} />
      <Path d={arcPath(42, 214, 236)} stroke="#fff" strokeWidth={0.8} fill="none" strokeLinecap="round" opacity={0.85} />
      <Circle cx={comet.x} cy={comet.y} r={1.7} fill="#fff" />
      <Circle cx={comet.x} cy={comet.y} r={3} fill={accent} opacity={0.25} />
      {/* crescent moon (cut with a band-dark overlay disc) */}
      <Circle cx={moon.x} cy={moon.y} r={2.6} fill="#e8e6ff" stroke={NIGHT_EDGE} strokeWidth={0.6} />
      <Circle cx={moon.x + 1.3} cy={moon.y - 0.9} r={2.2} fill="#1d1b40" />
      {/* hero star with halo, plus supporting sparkles and dust */}
      <Circle cx={bigStar.x} cy={bigStar.y} r={6.6} fill={accent} opacity={0.15} />
      <Path d={star5(bigStar.x, bigStar.y, 5.4, 2.3)} fill={`url(#${star})`} stroke={shade(accent, -58)} strokeWidth={0.8} strokeLinejoin="round" />
      <Path d={`M ${bigStar.x - 1.4} ${bigStar.y - 1.8} L ${bigStar.x - 0.2} ${bigStar.y - 3.4}`} stroke={HILITE} strokeWidth={0.7} strokeLinecap="round" />
      <Path d={sparkle4(pt(42, 152).x, pt(42, 152).y, 3.2)} fill={shade(accent, 36)} stroke={shade(accent, -58)} strokeWidth={0.5} />
      <Path d={sparkle4(pt(42, 268).x, pt(42, 268).y, 2.4)} fill="#fff" opacity={0.9} />
      {[[44.6, 95], [39.4, 122], [44.2, 300], [39.8, 348]].map(([r, a], i) => {
        const p = pt(r, a);
        return <Circle key={i} cx={p.x} cy={p.y} r={i % 2 === 0 ? 0.85 : 0.6} fill="#e8e6ff" opacity={0.55 + (i % 3) * 0.15} />;
      })}
    </>
  );
}

/** Living vine: winding stems, alternating leaves, five-petal blossoms. */
export function VineFrame({ accent }: FrameRenderProps) {
  const band = useMemo(() => gradId('frVinB'), []);
  const leaf = useMemo(() => gradId('frVinL'), []);
  const edge = shade(accent, -74);
  const stemC = shade(accent, -42);
  const blossom = (a: number) => {
    const p = pt(42, a);
    return (
      <G key={a} transform={`translate(${p.x} ${p.y})`}>
        {[0, 72, 144, 216, 288].map((rot) => (
          <Ellipse key={rot} cx={0} cy={-2.5} rx={1.5} ry={2.3} transform={`rotate(${rot})`} fill="#ffa8cc" stroke="#c25f88" strokeWidth={0.45} />
        ))}
        <Circle cx={0} cy={0} r={1.3} fill="#ffd24d" stroke="#b07a20" strokeWidth={0.5} />
      </G>
    );
  };
  return (
    <>
      <DuoGrad id={band} from={shade(accent, -22)} to={shade(accent, -62)} />
      <BodyGrad id={leaf} color={accent} />
      <Circle cx={50} cy={50} r={42} fill="none" stroke={`url(#${band})`} strokeWidth={5} />
      <Rims color={edge} rOut={44.7} rIn={39.3} w={1.1} />
      {/* stems winding over then under the band */}
      <Path d={arcPath(43.4, 8, 174)} stroke={stemC} strokeWidth={1.7} fill="none" strokeLinecap="round" />
      <Path d={arcPath(40.6, 186, 352)} stroke={stemC} strokeWidth={1.7} fill="none" strokeLinecap="round" />
      {/* curled tendrils at the crossover points */}
      <Path d="M0 0 C 2.6 -1.6 3.8 -0.2 2.4 1.1 C 1.4 2 0.5 1.3 1 0.4" transform={`translate(${pt(46, 14).x} ${pt(46, 14).y}) rotate(24)`} stroke={stemC} strokeWidth={0.9} fill="none" strokeLinecap="round" />
      <Path d="M0 0 C 2.6 -1.6 3.8 -0.2 2.4 1.1 C 1.4 2 0.5 1.3 1 0.4" transform={`translate(${pt(46, 194).x} ${pt(46, 194).y}) rotate(204)`} stroke={stemC} strokeWidth={0.9} fill="none" strokeLinecap="round" />
      {/* leaves alternating outside/inside the band */}
      {[30, 64, 98, 132, 160].map((a, i) => {
        const outer = i % 2 === 0;
        const p = pt(outer ? 44.8 : 39.8, a);
        return (
          <Path key={a} d={leafPath(outer ? 5.6 : 4.8, outer ? 2.1 : 1.8)} transform={`translate(${p.x} ${p.y}) rotate(${a - (outer ? 40 : 140)})`} fill={`url(#${leaf})`} stroke={shade(accent, -58)} strokeWidth={0.65} strokeLinejoin="round" />
        );
      })}
      {[200, 234, 268, 302, 330].map((a, i) => {
        const outer = i % 2 === 1;
        const p = pt(outer ? 44.8 : 39.8, a);
        return (
          <Path key={a} d={leafPath(outer ? 5.6 : 4.8, outer ? 2.1 : 1.8)} transform={`translate(${p.x} ${p.y}) rotate(${a + (outer ? 40 : 140)})`} fill={`url(#${leaf})`} stroke={shade(accent, -58)} strokeWidth={0.65} strokeLinejoin="round" />
        );
      })}
      {blossom(0)}
      {blossom(118)}
      {blossom(242)}
      <TopShine r={42} spread={26} opacity={0.35} w={1.2} />
    </>
  );
}

/** Crown-topped royal ring: velvet band between gold rims, studded, gemmed. */
export function RoyalFrame({ accent }: FrameRenderProps) {
  const velvet = useMemo(() => gradId('frRoyV'), []);
  const gold = useMemo(() => gradId('frRoyG'), []);
  const goldDeep = useMemo(() => gradId('frRoyD'), []);
  const GOLD_EDGE = '#6e4410';
  return (
    <>
      <BodyGrad id={velvet} color={accent} />
      <DuoGrad id={gold} from="#f7d97c" to="#a06818" />
      <DuoGrad id={goldDeep} from="#d9a441" to="#7a4c10" />
      <Circle cx={50} cy={50} r={41.5} fill="none" stroke={`url(#${velvet})`} strokeWidth={6.5} />
      {/* gold rims sandwiching the velvet */}
      <Circle cx={50} cy={50} r={45.4} fill="none" stroke={`url(#${gold})`} strokeWidth={2} />
      <Circle cx={50} cy={50} r={37.7} fill="none" stroke={`url(#${gold})`} strokeWidth={1.7} />
      <Rims color={GOLD_EDGE} rOut={46.6} rIn={36.7} w={0.7} />
      {/* velvet sheen along the lower band */}
      <Path d={arcPath(41.5, 138, 222)} stroke={shade(accent, 46)} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.45} />
      {/* gold studs (top arc left clear for the crown) */}
      {[62, 90, 118, 146, 178, 214, 242, 270, 298, 326].map((a) => {
        const p = pt(41.5, a);
        return (
          <G key={a}>
            <Circle cx={p.x} cy={p.y} r={1.5} fill={`url(#${gold})`} stroke={GOLD_EDGE} strokeWidth={0.55} />
            <Circle cx={p.x - 0.4} cy={p.y - 0.5} r={0.5} fill={HILITE_SOFT} />
          </G>
        );
      })}
      {/* seat shadow beneath the crown */}
      <Path d={arcPath(43.8, 338, 382)} stroke="rgba(20,4,2,0.4)" strokeWidth={6} fill="none" strokeLinecap="round" />
      {/* the crown */}
      <Path d="M35 15 L37 5.4 L43.5 10.4 L50 2.6 L56.5 10.4 L63 5.4 L65 15 Z" fill={`url(#${gold})`} stroke={GOLD_EDGE} strokeWidth={1.1} strokeLinejoin="round" />
      <Path d="M34.4 14.2 h31.2 a1.8 1.8 0 0 1 1.8 1.8 v0.6 a1.8 1.8 0 0 1 -1.8 1.8 h-31.2 a1.8 1.8 0 0 1 -1.8 -1.8 v-0.6 a1.8 1.8 0 0 1 1.8 -1.8 Z" fill={`url(#${goldDeep})`} stroke={GOLD_EDGE} strokeWidth={0.9} />
      <Circle cx={37} cy={5.2} r={1.35} fill="#ff4d6d" stroke="#701a2c" strokeWidth={0.5} />
      <Circle cx={50} cy={2.5} r={1.5} fill="#4d9dff" stroke="#123c78" strokeWidth={0.5} />
      <Circle cx={63} cy={5.2} r={1.35} fill="#ff4d6d" stroke="#701a2c" strokeWidth={0.5} />
      <Path d="M50 14.4 L51.9 16.3 L50 18.2 L48.1 16.3 Z" fill="#c95eff" stroke="#571e78" strokeWidth={0.55} strokeLinejoin="round" />
      <Path d="M37.2 12.6 Q 50 10 62.8 12.6" stroke={HILITE_SOFT} strokeWidth={1} fill="none" strokeLinecap="round" />
    </>
  );
}

/** Nebula ring: gas-cloud band, star dust, a ringed planet and a small moon. */
export function CosmicFrame({ accent }: FrameRenderProps) {
  const band = useMemo(() => gradId('frCosB'), []);
  const planet = useMemo(() => gradId('frCosP'), []);
  const moonG = useMemo(() => gradId('frCosM'), []);
  const SPACE_EDGE = '#140a2e';
  const pl = pt(42, 230);
  const mo = pt(42, 72);
  return (
    <>
      <DuoGrad id={band} from={shade(accent, 38)} to={shade(accent, -56)} />
      <DuoGrad id={planet} from="#ffd9a0" to="#c06a28" />
      <DuoGrad id={moonG} from="#d8e8f8" to="#7888a8" />
      <Circle cx={50} cy={50} r={42} fill="none" stroke={`url(#${band})`} strokeWidth={8} />
      <Rims color={SPACE_EDGE} rOut={46.2} rIn={37.8} w={1.3} />
      {/* nebula gas swirls */}
      <Path d={arcPath(43.5, 18, 118)} stroke="#ff2d95" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.3} />
      <Path d={arcPath(40.4, 148, 258)} stroke="#39d5ff" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.28} />
      <Path d={arcPath(42, 288, 352)} stroke="#fff" strokeWidth={1.3} fill="none" strokeLinecap="round" opacity={0.16} />
      {/* star dust */}
      {[[44, 12], [40, 52], [43.4, 96], [39.4, 138], [44, 168], [40, 196], [43.4, 288], [39.4, 330]].map(([r, a], i) => {
        const p = pt(r, a);
        return <Circle key={i} cx={p.x} cy={p.y} r={0.5 + (i % 3) * 0.2} fill="#fff" opacity={0.45 + (i % 4) * 0.14} />;
      })}
      {/* ringed planet riding the band */}
      <G transform={`translate(${pl.x} ${pl.y})`}>
        <Circle cx={0} cy={0} r={4.6} fill={`url(#${planet})`} stroke="#5c2c10" strokeWidth={0.8} />
        <Path d="M -4.6 0 A 4.6 4.6 0 0 0 4.6 0 A 4.6 3.1 0 0 1 -4.6 0 Z" fill="rgba(20,8,40,0.35)" />
        <Ellipse cx={0} cy={0} rx={7.2} ry={2.1} fill="none" stroke="#e8d8ff" strokeWidth={1.1} transform="rotate(-24)" />
        <Circle cx={-1.4} cy={-1.6} r={0.8} fill={HILITE_SOFT} />
      </G>
      {/* small cratered moon */}
      <Circle cx={mo.x} cy={mo.y} r={2.7} fill={`url(#${moonG})`} stroke="#3c4458" strokeWidth={0.7} />
      <Circle cx={mo.x + 0.8} cy={mo.y - 0.5} r={0.6} fill="#93a4bd" />
      <Path d={sparkle4(pt(45, 140).x, pt(45, 140).y, 2.3)} fill="#fff" opacity={0.9} />
      {/* outer aura */}
      <Circle cx={50} cy={50} r={46.8} fill="none" stroke={accent} strokeWidth={1.5} opacity={0.24} />
      <TopShine r={42} spread={30} opacity={0.3} w={1.4} />
    </>
  );
}

/** Segmented chrome: plated arcs, seam lines, screws, hard speculars. */
export function ChromeFrame({ accent }: FrameRenderProps) {
  const band = useMemo(() => gradId('frChrB'), []);
  const screw = useMemo(() => gradId('frChrS'), []);
  const SEAM = '#20242f';
  return (
    <>
      <DuoGrad id={band} from={shade(accent, 46)} to={shade(accent, -58)} />
      <DuoGrad id={screw} from={shade(accent, 34)} to={shade(accent, -44)} />
      <Circle cx={50} cy={50} r={42} fill="none" stroke={`url(#${band})`} strokeWidth={8} />
      <Rims color={SEAM} rOut={46.2} rIn={37.8} w={1.3} />
      {/* panel seams with a light-catch edge */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = i * 45;
        const p1 = pt(38.2, a);
        const p2 = pt(45.8, a);
        const q1 = pt(38.2, a + 2.6);
        const q2 = pt(45.8, a + 2.6);
        return (
          <G key={a}>
            <Path d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`} stroke={SEAM} strokeWidth={1.2} />
            <Path d={`M ${q1.x} ${q1.y} L ${q2.x} ${q2.y}`} stroke={HILITE_SOFT} strokeWidth={0.5} />
          </G>
        );
      })}
      {/* hard speculars + cool bounce light */}
      <Path d={arcPath(43.5, 310, 346)} stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.85} />
      <Path d={arcPath(43.5, 8, 30)} stroke="#fff" strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.5} />
      <Path d={arcPath(40.4, 150, 196)} stroke="#bcd4ff" strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.4} />
      {/* slotted screws on alternating panels */}
      {[22.5, 112.5, 202.5, 292.5].map((a, i) => {
        const p = pt(42, a);
        return (
          <G key={a}>
            <Circle cx={p.x} cy={p.y} r={1.8} fill={`url(#${screw})`} stroke={SEAM} strokeWidth={0.6} />
            <Path d={`M ${p.x - 1} ${p.y} L ${p.x + 1} ${p.y}`} stroke={SEAM} strokeWidth={0.6} transform={`rotate(${i * 45 + 20} ${p.x} ${p.y})`} />
          </G>
        );
      })}
    </>
  );
}

/** Iridescent hologram: prismatic segment ring under a white light sheen. */
export function HoloFrame({ accent }: FrameRenderProps) {
  const sheen = useMemo(() => gradId('frHolS'), []);
  const SEGS = ['#ff8ad6', '#c092ff', '#7db4ff', '#6fe8d8', '#a8ef8a', '#ffd27f'];
  return (
    <>
      <Defs>
        <LinearGradient id={sheen} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.8" />
          <Stop offset="0.45" stopColor="#ffffff" stopOpacity="0.05" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0.28" />
        </LinearGradient>
      </Defs>
      {/* prismatic segments tiled around the band */}
      {SEGS.map((c, i) => (
        <Path key={c} d={arcPath(42, i * 60 - 90, (i + 1) * 60 - 89)} stroke={c} strokeWidth={7} fill="none" />
      ))}
      {/* light sweep over the prism colors */}
      <Circle cx={50} cy={50} r={42} fill="none" stroke={`url(#${sheen})`} strokeWidth={7} />
      <Rims color="rgba(255,255,255,0.75)" rOut={45.8} rIn={38.2} w={0.9} />
      <Circle cx={50} cy={50} r={47} fill="none" stroke={accent} strokeWidth={1.6} opacity={0.3} />
      {/* refracting prism chips */}
      {[30, 160, 265].map((a) => {
        const p = pt(42, a);
        return (
          <G key={a} transform={`translate(${p.x} ${p.y}) rotate(${a})`}>
            <Path d="M0 -3.4 L3 2 L-3 2 Z" fill="#fff" opacity={0.3} stroke="#fff" strokeWidth={0.7} strokeLinejoin="round" />
            <Path d="M0 -1.6 L0 1.4" stroke={accent} strokeWidth={0.6} strokeLinecap="round" opacity={0.85} />
          </G>
        );
      })}
      <Path d={sparkle4(pt(42, 325).x, pt(42, 325).y, 3)} fill="#fff" opacity={0.95} />
      <Path d={sparkle4(pt(42, 130).x, pt(42, 130).y, 2.2)} fill="#fff" opacity={0.8} />
      <Circle cx={pt(42, 95).x} cy={pt(42, 95).y} r={0.9} fill={accent} opacity={0.8} />
      <Circle cx={pt(42, 220).x} cy={pt(42, 220).y} r={0.7} fill={accent} opacity={0.7} />
    </>
  );
}
