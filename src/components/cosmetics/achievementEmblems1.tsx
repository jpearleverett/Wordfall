/**
 * Bespoke achievement emblems, part 1 of 2 — puzzle + streak families.
 *
 * Each emblem is a small illustration (10–20 layered shapes with rim strokes,
 * shading and highlights) drawn inside the badge's enamel disc: keep shapes
 * within r≈28 of (50,44). Every color literal is routed through the `c()`
 * prop so the unearned state renders the same composition as carved stone.
 */
import React from 'react';
import { Circle, G, Path, Rect } from 'react-native-svg';
import { EmblemProps } from './achievementBadgeParts';
import { sparkle4, star5 } from './frameArtParts';

/** word_finder — magnifying glass finding a "W" letter tile. */
export function LensEmblem({ c }: EmblemProps) {
  return (
    <>
      <Rect x={44} y={26} width={26} height={26} rx={5} fill={c('#f7ecd2')} stroke={c('#8a6d3f')} strokeWidth={1.6} />
      <Rect x={46.5} y={28.5} width={21} height={8.5} rx={3.5} fill={c('#fffaf0')} opacity={0.75} />
      <Path d="M50 33.5 l2.6 12 3-8 3 8 2.6-12" fill="none" stroke={c('#7a5220')} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={42} cy={48} r={13} fill={c('#bfe6ff')} opacity={0.45} />
      <Circle cx={42} cy={48} r={14.6} fill="none" stroke={c('#8a5a00')} strokeWidth={1.1} />
      <Circle cx={42} cy={48} r={13} fill="none" stroke={c('#ffd24d')} strokeWidth={3.2} />
      <Circle cx={42} cy={48} r={11.3} fill="none" stroke={c('#8a5a00')} strokeWidth={1.1} />
      <Path d="M52.5 58.5 L59.5 66.5" stroke={c('#8a5a00')} strokeWidth={6.2} strokeLinecap="round" />
      <Path d="M52.5 58.5 L59.5 66.5" stroke={c('#d9a441')} strokeWidth={4} strokeLinecap="round" />
      <Path d="M34.5 43.5 A9.5 9.5 0 0 1 42 39" fill="none" stroke={c('#ffffff')} strokeWidth={1.8} strokeLinecap="round" opacity={0.8} />
      <Path d={sparkle4(64, 22, 3.4)} fill={c('#ffffff')} opacity={0.9} />
    </>
  );
}

/** puzzle_solver — glossy cyan jigsaw piece with knobs and a socket. */
export function JigsawEmblem({ c }: EmblemProps) {
  return (
    <>
      <Path
        d="M39 32 h5.2 a4.8 4.8 0 1 1 9.6 0 H61 a4 4 0 0 1 4 4 v7.2 a4.8 4.8 0 1 1 0 9.6 V59 a4 4 0 0 1 -4 4 H39 a4 4 0 0 1 -4 -4 v-6.2 a4.8 4.8 0 1 0 0 -9.6 V36 a4 4 0 0 1 4 -4 Z"
        fill={c('#38c6e8')}
        stroke={c('#0e5f78')}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M40 37.5 q9.5 -3.5 19 0" fill="none" stroke={c('#ffffff')} strokeWidth={1.8} strokeLinecap="round" opacity={0.7} />
      <Path d="M38.5 59.5 h22" stroke={c('#0e5f78')} strokeWidth={1.6} strokeLinecap="round" opacity={0.45} />
      <Circle cx={50} cy={47.5} r={3.2} fill={c('#9fe6f8')} opacity={0.85} />
      <Path d={sparkle4(31, 27, 3)} fill={c('#ffffff')} opacity={0.85} />
    </>
  );
}

/** perfect_player — fan of three gold stars for the 3-star clear. */
export function TriStarEmblem({ c }: EmblemProps) {
  return (
    <>
      <Path d={star5(33, 51, 8, 3.4)} fill={c('#ffd24d')} stroke={c('#8a5a00')} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d={star5(67, 51, 8, 3.4)} fill={c('#ffd24d')} stroke={c('#8a5a00')} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d={star5(50, 40, 14.5, 6)} fill={c('#ffc63a')} stroke={c('#8a5a00')} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d={star5(50, 40, 9.5, 3.9)} fill={c('#ffe27a')} opacity={0.9} />
      <Circle cx={50} cy={40} r={2} fill={c('#fff7d9')} />
      <Path d={sparkle4(62, 26, 3)} fill={c('#ffffff')} opacity={0.9} />
      <Circle cx={37} cy={28} r={1.4} fill={c('#ffffff')} opacity={0.8} />
    </>
  );
}

/** high_scorer — bronze/silver/gold podium bars climbing to a star. */
export function ScoreBarsEmblem({ c }: EmblemProps) {
  return (
    <>
      <Path d="M31 64 H69" stroke={c('#5e3800')} strokeWidth={2} strokeLinecap="round" />
      <Rect x={32} y={48} width={10} height={16} rx={2} fill={c('#cd8a4e')} stroke={c('#6b3a12')} strokeWidth={1.3} />
      <Rect x={33.5} y={49.5} width={7} height={3} rx={1.5} fill={c('#f0b478')} opacity={0.9} />
      <Rect x={45} y={40} width={10} height={24} rx={2} fill={c('#c9d2e0')} stroke={c('#5a6478')} strokeWidth={1.3} />
      <Rect x={46.5} y={41.5} width={7} height={3} rx={1.5} fill={c('#f2f6fc')} opacity={0.9} />
      <Rect x={58} y={30} width={10} height={34} rx={2} fill={c('#ffc63a')} stroke={c('#8a5a00')} strokeWidth={1.3} />
      <Rect x={59.5} y={31.5} width={7} height={3} rx={1.5} fill={c('#ffe27a')} opacity={0.9} />
      <Path d={star5(63, 23, 5.5, 2.3)} fill={c('#ffd24d')} stroke={c('#8a5a00')} strokeWidth={1.1} strokeLinejoin="round" />
      <Path d={sparkle4(35, 30, 2.8)} fill={c('#ffffff')} opacity={0.8} />
    </>
  );
}

/** speed_solver — gold lightning bolt striking through a clock face. */
export function BoltClockEmblem({ c }: EmblemProps) {
  return (
    <>
      <Circle cx={50} cy={46} r={16} fill={c('#dde8f8')} stroke={c('#39415a')} strokeWidth={2} />
      <G stroke={c('#5a6478')} strokeWidth={1.3} strokeLinecap="round">
        <Path d="M50 32 V34.8" />
        <Path d="M50 57.2 V60" />
        <Path d="M36 46 H38.8" />
        <Path d="M61.2 46 H64" />
      </G>
      <Path d="M50 46 L50 36" stroke={c('#39415a')} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M50 46 L44.5 41.5" stroke={c('#39415a')} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={50} cy={46} r={1.8} fill={c('#39415a')} />
      <Path
        d="M57 22 L41.5 48.5 L49.5 48.5 L44 69.5 L60.5 42.5 L52 42.5 Z"
        fill={c('#ffd24d')}
        stroke={c('#a06000')}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M55 26.5 L45.5 45.5 L50.5 45.5" fill="none" stroke={c('#ffffff')} strokeWidth={1.6} strokeLinecap="round" opacity={0.65} />
      <Path d="M30 32 l5 2.2 M27.5 40 l5.5 1.4" stroke={c('#ffffff')} strokeWidth={2} strokeLinecap="round" opacity={0.55} />
    </>
  );
}

/** no_hint_master — radiant genius brain, gyri and golden halo rays. */
export function BrainEmblem({ c }: EmblemProps) {
  const half =
    'M50 30 C43 30 40.5 33.5 40 36.5 C35.8 37 33.4 40.5 34 44 C31.4 46.4 31.4 50.6 34.2 53 C33.8 57.2 37 60.6 41.4 60.6 C43 63.2 46.4 64.4 50 63.2 Z';
  const gyri = (
    <G fill="none" stroke={c('#c05a74')} strokeWidth={1.3} strokeLinecap="round">
      <Path d="M42 37 q3 2 2.5 5.5" />
      <Path d="M37 45 q3.5 1.5 6 -0.5" />
      <Path d="M40 54 q3 1.5 5.5 0" />
    </G>
  );
  return (
    <>
      <G stroke={c('#ffd24d')} strokeWidth={2.2} strokeLinecap="round">
        <Path d="M50 26 V20.5" />
        <Path d="M60.5 28.8 L63.3 24" />
        <Path d="M39.5 28.8 L36.7 24" />
        <Path d="M67.8 35.9 L72.4 33" />
        <Path d="M32.2 35.9 L27.6 33" />
      </G>
      <Path d={half} fill={c('#f2889e')} stroke={c('#8c2f4a')} strokeWidth={1.6} strokeLinejoin="round" />
      <G transform="translate(100 0) scale(-1 1)">
        <Path d={half} fill={c('#e8748c')} stroke={c('#8c2f4a')} strokeWidth={1.6} strokeLinejoin="round" />
        {gyri}
      </G>
      {gyri}
      <Path d="M50 30.5 V62.5" stroke={c('#8c2f4a')} strokeWidth={1.2} opacity={0.8} />
      <Path d={sparkle4(68, 47, 3)} fill={c('#ffffff')} opacity={0.85} />
    </>
  );
}

/** combo_king — three chain links climbing to a crowned gold link. */
export function ChainEmblem({ c }: EmblemProps) {
  const link = (x: number, y: number, inner: string, outer: string) => (
    <G transform={`rotate(-33 ${x} ${y})`}>
      <Rect x={x - 8} y={y - 6} width={16} height={12} rx={6} fill="none" stroke={c(outer)} strokeWidth={5.4} />
      <Rect x={x - 8} y={y - 6} width={16} height={12} rx={6} fill="none" stroke={c(inner)} strokeWidth={3.2} />
    </G>
  );
  return (
    <>
      {link(37, 57, '#c9d2e0', '#39415a')}
      {link(50, 47, '#c9d2e0', '#39415a')}
      {link(63, 37, '#ffc63a', '#8a5a00')}
      <Path
        d="M56.5 24.5 l2.6 3.6 3.9 -4.6 3.9 4.6 2.6 -3.6 -1.5 8.2 H58 Z"
        fill={c('#ffd24d')}
        stroke={c('#8a5a00')}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <Path d={sparkle4(43.5, 51.5, 2.6)} fill={c('#ffffff')} opacity={0.9} />
      <Path d={sparkle4(56.5, 41.5, 2.6)} fill={c('#ffffff')} opacity={0.9} />
      <Circle cx={31} cy={40} r={1.3} fill={c('#ffffff')} opacity={0.7} />
    </>
  );
}

/** streak_master — layered streak flame with a white-hot core. */
export function FlameEmblem({ c }: EmblemProps) {
  return (
    <>
      <Path
        d="M50 19 c6 9 13 13 13 25 0 11 -6 19 -13 22 -7 -3 -13 -11 -13 -22 0 -7 3 -11 6 -15 1 2.6 2.2 4.2 4 5.6 -0.8 -5.4 0.2 -10 3 -15.6 Z"
        fill={c('#ff6d2a')}
        stroke={c('#9c2c00')}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M50 32 c3.6 5.4 8 8 8 15 0 7 -3.6 12 -8 14 -4.4 -2 -8 -7 -8 -14 0 -4 1.4 -6.8 3.4 -9.4 0.8 1.6 1.8 2.8 3.2 3.8 -0.6 -3.4 -0.2 -6.2 1.4 -9.4 Z"
        fill={c('#ffb13d')}
      />
      <Path
        d="M50 44 c2.2 3.2 4.6 4.8 4.6 8.6 0 4.2 -2 7 -4.6 8.2 -2.6 -1.2 -4.6 -4 -4.6 -8.2 0 -3.8 2.4 -5.4 4.6 -8.6 Z"
        fill={c('#ffe9b8')}
      />
      <Circle cx={33} cy={34} r={1.6} fill={c('#ffb13d')} opacity={0.9} />
      <Circle cx={67} cy={30} r={1.3} fill={c('#ffd24d')} opacity={0.9} />
      <Path d="M41 26 q1.6 -2.6 4.5 -4" fill="none" stroke={c('#ffffff')} strokeWidth={1.4} strokeLinecap="round" opacity={0.5} />
    </>
  );
}

/** daily_devotee — sun rising over the horizon with shimmering water. */
export function SunriseEmblem({ c }: EmblemProps) {
  return (
    <>
      <G stroke={c('#ffd24d')} strokeWidth={2.6} strokeLinecap="round">
        <Path d="M50 39 V32" />
        <Path d="M57.9 40.8 L61 34.5" />
        <Path d="M42.1 40.8 L39 34.5" />
        <Path d="M64.2 45.9 L69.7 41.6" />
        <Path d="M35.8 45.9 L30.3 41.6" />
        <Path d="M67.5 52.6 L74.3 51" />
        <Path d="M32.5 52.6 L25.7 51" />
      </G>
      <Path d="M35 57 A15 15 0 0 1 65 57 Z" fill={c('#ffc63a')} stroke={c('#a06000')} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M39.5 57 A10.5 10.5 0 0 1 60.5 57 Z" fill={c('#ffe27a')} />
      <Rect x={26} y={56.2} width={48} height={2.6} rx={1.3} fill={c('#7a3f1a')} />
      <G stroke={c('#ffd8a0')} strokeWidth={2} strokeLinecap="round" opacity={0.8}>
        <Path d="M32 62.5 h9" />
        <Path d="M52 66 h12" />
        <Path d="M58 61.5 h8" />
      </G>
    </>
  );
}
