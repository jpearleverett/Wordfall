/**
 * Bespoke achievement emblems, part 2 of 2 — collection, mode + mastery
 * families. Same contract as part 1: draw within r≈28 of (50,44) and route
 * every color literal through `c()` for the stone (unearned) rendition.
 */
import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { EmblemProps } from './achievementBadgeParts';
import { sparkle4, star5 } from './frameArtParts';

/** atlas_scholar — open atlas with a dotted route to an X. */
export function AtlasEmblem({ c }: EmblemProps) {
  return (
    <>
      <Path d="M26 38 V60 Q38 63 50 68 Q62 63 74 60 V38" fill={c('#8a5a30')} stroke={c('#4c2e12')} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M28.5 36 Q39 38.5 48.5 43.5 V64.5 Q39 59.5 28.5 57.5 Z" fill={c('#f7ecd2')} stroke={c('#b09a6a')} strokeWidth={1} strokeLinejoin="round" />
      <Path d="M71.5 36 Q61 38.5 51.5 43.5 V64.5 Q61 59.5 71.5 57.5 Z" fill={c('#fdf3dc')} stroke={c('#b09a6a')} strokeWidth={1} strokeLinejoin="round" />
      <Path d="M50 44 V67" stroke={c('#4c2e12')} strokeWidth={1.2} />
      <G fill="none" stroke={c('#b09a6a')} strokeWidth={1.4} strokeLinecap="round">
        <Path d="M32 43.5 q6 1.8 12 4" />
        <Path d="M32 48 q6 1.8 12 4" />
        <Path d="M32 52.5 q6 1.8 12 4" />
      </G>
      <Path d="M55 56 Q60 50 64 51.5 Q69 53 67 47" fill="none" stroke={c('#d64a3a')} strokeWidth={1.6} strokeDasharray="2.5 2.5" />
      <Path d="M65.5 42.5 l3.5 3.5 M69 42.5 l-3.5 3.5" stroke={c('#d64a3a')} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M61 38.5 V29 l2.4 1.8 2.4 -1.8 v8.4" fill={c('#d64a3a')} stroke={c('#7a1f16')} strokeWidth={0.9} strokeLinejoin="round" />
    </>
  );
}

/** tile_collector — faceted rare gem, girdle line and pavilion shading. */
export function GemTileEmblem({ c }: EmblemProps) {
  return (
    <>
      <Path d="M42 31 H58 L67 44 L50 67 L33 44 Z" fill={c('#5fc4ec')} stroke={c('#155e80')} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M44.5 34 H55.5 L60 42.8 H40 Z" fill={c('#b8ecff')} />
      <Path d="M33 44 L50 67 L46 44 Z" fill={c('#2b8ec4')} opacity={0.85} />
      <Path d="M67 44 L50 67 L54 44 Z" fill={c('#8fdcff')} opacity={0.75} />
      <Path d="M33 44 H67" stroke={c('#155e80')} strokeWidth={1} opacity={0.8} />
      <Path d="M42 31 L46 44 M58 31 L54 44" stroke={c('#155e80')} strokeWidth={0.8} opacity={0.55} />
      <Path d={sparkle4(59.5, 36, 3.2)} fill={c('#ffffff')} opacity={0.95} />
      <Circle cx={44} cy={51} r={1.4} fill={c('#ffffff')} opacity={0.7} />
    </>
  );
}

/** library_restorer — restored marble library facade with a gold seal. */
export function TempleEmblem({ c }: EmblemProps) {
  return (
    <>
      <Rect x={30} y={62} width={40} height={4} rx={1} fill={c('#d8cdb0')} stroke={c('#6d6248')} strokeWidth={1.2} />
      <Rect x={33} y={58} width={34} height={4} rx={1} fill={c('#e8dfc4')} stroke={c('#6d6248')} strokeWidth={1.2} />
      {[35.8, 43.8, 51.8, 59.8].map((x) => (
        <G key={x}>
          <Rect x={x - 0.8} y={39.2} width={6.4} height={1.8} fill={c('#d8cdb0')} stroke={c('#8a7d5c')} strokeWidth={0.7} />
          <Rect x={x} y={41} width={4.8} height={17} rx={1} fill={c('#efe6cc')} stroke={c('#8a7d5c')} strokeWidth={1} />
          <Path d={`M${x + 2.4} 43 V56`} stroke={c('#c9bd9a')} strokeWidth={1} />
        </G>
      ))}
      <Rect x={31} y={35.5} width={38} height={4} rx={1} fill={c('#e8dfc4')} stroke={c('#6d6248')} strokeWidth={1.2} />
      <Path d="M29 35.5 L50 24 L71 35.5 Z" fill={c('#f2ecdc')} stroke={c('#6d6248')} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M34.5 34 L50 26.5 L65.5 34" fill="none" stroke={c('#b8ac8c')} strokeWidth={1} />
      <Circle cx={50} cy={31.5} r={2.6} fill={c('#ffc63a')} stroke={c('#8a5a00')} strokeWidth={0.8} />
    </>
  );
}

/** collector_supreme — jeweled crown over a soft ground shadow. */
export function CrownGemsEmblem({ c }: EmblemProps) {
  return (
    <>
      <Ellipse cx={50} cy={64} rx={14} ry={2.2} fill={c('#1a0b2e')} opacity={0.35} />
      <Path d="M33 52 V33.5 L43.5 44 L50 30 L56.5 44 L67 33.5 V52 Z" fill={c('#ffd24d')} stroke={c('#8a5a00')} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M33 45 L43.5 48.5 L50 44 L56.5 48.5 L67 45 V52 H33 Z" fill={c('#e8a512')} opacity={0.55} />
      <Circle cx={33} cy={32.5} r={2.4} fill={c('#ffe27a')} stroke={c('#8a5a00')} strokeWidth={1} />
      <Circle cx={50} cy={28.5} r={2.6} fill={c('#ffe27a')} stroke={c('#8a5a00')} strokeWidth={1} />
      <Circle cx={67} cy={32.5} r={2.4} fill={c('#ffe27a')} stroke={c('#8a5a00')} strokeWidth={1} />
      <Rect x={33} y={52} width={34} height={9} rx={2.5} fill={c('#ffc63a')} stroke={c('#8a5a00')} strokeWidth={1.6} />
      <Rect x={34.5} y={57} width={31} height={3.2} rx={1.6} fill={c('#c07c00')} opacity={0.7} />
      <Path d="M50 52.5 l4 3.5 -4 3.5 -4 -3.5 Z" fill={c('#d63a5e')} stroke={c('#7a1030')} strokeWidth={1} strokeLinejoin="round" />
      <Circle cx={40} cy={56.3} r={2.2} fill={c('#38c6e8')} stroke={c('#0e5f78')} strokeWidth={0.9} />
      <Circle cx={60} cy={56.3} r={2.2} fill={c('#3ddc84')} stroke={c('#0e6f3c')} strokeWidth={0.9} />
      <Path d={sparkle4(63, 24.5, 3)} fill={c('#ffffff')} opacity={0.9} />
      <Circle cx={36} cy={26} r={1.3} fill={c('#ffffff')} opacity={0.8} />
    </>
  );
}

/** mode_explorer — brass compass, eight-point rose, red needle NE. */
export function CompassEmblem({ c }: EmblemProps) {
  return (
    <>
      <Circle cx={50} cy={46} r={21.8} fill="none" stroke={c('#6d4515')} strokeWidth={1.2} />
      <Circle cx={50} cy={46} r={20} fill={c('#fdf3dc')} stroke={c('#b0782a')} strokeWidth={3} />
      <Circle cx={50} cy={46} r={18.2} fill="none" stroke={c('#6d4515')} strokeWidth={0.8} opacity={0.6} />
      <G stroke={c('#8a6d3f')} strokeWidth={1.2} strokeLinecap="round">
        <Path d="M50 28 V30.5" />
        <Path d="M50 61.5 V64" />
        <Path d="M32 46 H34.5" />
        <Path d="M65.5 46 H68" />
      </G>
      <G transform="rotate(45 50 46)">
        <Path d={sparkle4(50, 46, 11)} fill={c('#cbb98d')} stroke={c('#8a6d3f')} strokeWidth={0.7} />
      </G>
      <Path d={sparkle4(50, 46, 15.5)} fill={c('#efe6cc')} stroke={c('#8a6d3f')} strokeWidth={1} />
      <G transform="rotate(45 50 46)">
        <Path d="M50 31.5 L52.6 46 L50 60.5 L47.4 46 Z" fill={c('#e8e4d8')} stroke={c('#7a4a20')} strokeWidth={0.9} strokeLinejoin="round" />
        <Path d="M50 31.5 L52.6 46 L47.4 46 Z" fill={c('#d64a3a')} />
      </G>
      <Circle cx={50} cy={46} r={2.6} fill={c('#ffc63a')} stroke={c('#8a5a00')} strokeWidth={0.9} />
      <Path d="M38 36 A16 16 0 0 1 50 30.5" fill="none" stroke={c('#ffffff')} strokeWidth={1.8} strokeLinecap="round" opacity={0.7} />
    </>
  );
}

/** speed_demon — racing stopwatch, red hand and motion dashes. */
export function StopwatchEmblem({ c }: EmblemProps) {
  return (
    <>
      <Rect x={47.5} y={21.5} width={5} height={5} rx={1.2} fill={c('#c9d2e0')} stroke={c('#5a6478')} strokeWidth={1.2} />
      <Rect x={48.6} y={26} width={2.8} height={3.2} fill={c('#8c96ac')} />
      <G transform="rotate(40 50 48)">
        <Rect x={47.8} y={25.2} width={4.4} height={4.2} rx={1.1} fill={c('#c9d2e0')} stroke={c('#5a6478')} strokeWidth={1} />
      </G>
      <Circle cx={50} cy={48} r={18.4} fill="none" stroke={c('#39415a')} strokeWidth={1.1} />
      <Circle cx={50} cy={48} r={17} fill={c('#dde4f0')} stroke={c('#5a6478')} strokeWidth={2} />
      <Circle cx={50} cy={48} r={13.2} fill={c('#fbfdff')} stroke={c('#9aa6bc')} strokeWidth={1} />
      <G stroke={c('#5a6478')} strokeWidth={1.4} strokeLinecap="round">
        <Path d="M50 37 V39.6" />
        <Path d="M50 56.4 V59" />
        <Path d="M39 48 H41.6" />
        <Path d="M58.4 48 H61" />
      </G>
      <Circle cx={57.8} cy={40.2} r={0.7} fill={c('#5a6478')} />
      <Circle cx={42.2} cy={40.2} r={0.7} fill={c('#5a6478')} />
      <Path d="M50 48 L56.5 39" stroke={c('#d64a3a')} strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M50 48 L47 52" stroke={c('#d64a3a')} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={50} cy={48} r={1.8} fill={c('#39415a')} />
      <G stroke={c('#ffffff')} strokeWidth={2.2} strokeLinecap="round" opacity={0.7}>
        <Path d="M28 40 h6" />
        <Path d="M26 48 h7" />
        <Path d="M28 56 h6" />
      </G>
    </>
  );
}

/** level_climber — twin peaks, snow caps and a summit flag. */
export function PeakEmblem({ c }: EmblemProps) {
  return (
    <>
      <Path d="M46 62 L61 34 L74 62 Z" fill={c('#7a6fae')} stroke={c('#3d3560')} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M57.5 40.5 L61 34 L64.5 40.5 L62.5 39 L60.8 41 L59 39.2 Z" fill={c('#e8ecff')} />
      <Path d="M24 64 L44 28 L64 64 Z" fill={c('#8f86c9')} stroke={c('#3d3560')} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M44 28 L64 64 H44 Z" fill={c('#5e548f')} opacity={0.5} />
      <Path d="M38.8 37.5 L44 28 L49.2 37.5 L46.6 35.6 L44.4 38.4 L41.8 35.8 Z" fill={c('#f2f5ff')} stroke={c('#b8c0e8')} strokeWidth={0.8} strokeLinejoin="round" />
      <Path d="M44 28 V19.5" stroke={c('#4c2e12')} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M44 19.5 h8.5 l-2.6 3 2.6 3 H44 Z" fill={c('#d64a3a')} stroke={c('#7a1f16')} strokeWidth={0.9} strokeLinejoin="round" />
      <Ellipse cx={31} cy={53} rx={5} ry={1.8} fill={c('#ffffff')} opacity={0.4} />
      <Ellipse cx={68} cy={48} rx={4} ry={1.5} fill={c('#ffffff')} opacity={0.35} />
      <Path d="M27 64 H73" stroke={c('#3d3560')} strokeWidth={1.6} strokeLinecap="round" />
    </>
  );
}

/** star_collector — gathered constellation around one great star. */
export function StarClusterEmblem({ c }: EmblemProps) {
  return (
    <>
      <Path d="M28 56 A26 15 -18 0 1 72 34" fill="none" stroke={c('#ffffff')} strokeWidth={1.4} strokeDasharray="3 3.5" opacity={0.35} />
      <Path d={star5(47, 45, 15, 6.2)} fill={c('#ffc63a')} stroke={c('#8a5a00')} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d={star5(47, 45, 9.8, 4)} fill={c('#ffe27a')} opacity={0.95} />
      <Circle cx={47} cy={45} r={2} fill={c('#fff7d9')} />
      <Path d={star5(68, 31, 6, 2.5)} fill={c('#ffd24d')} stroke={c('#8a5a00')} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d={star5(30, 33, 4.6, 1.9)} fill={c('#ffd24d')} stroke={c('#8a5a00')} strokeWidth={1} strokeLinejoin="round" />
      <Path d={star5(66, 59, 4.2, 1.75)} fill={c('#ffb13d')} stroke={c('#8a5a00')} strokeWidth={1} strokeLinejoin="round" />
      <Circle cx={37} cy={26} r={1.3} fill={c('#ffffff')} opacity={0.8} />
      <Circle cx={58} cy={64} r={1.2} fill={c('#ffffff')} opacity={0.8} />
    </>
  );
}

/** night_owl — owl perched on a branch under a cratered moon. */
export function OwlEmblem({ c }: EmblemProps) {
  return (
    <>
      <Circle cx={62} cy={32} r={10.5} fill={c('#ffeec2')} />
      <Circle cx={66} cy={29} r={1.8} fill={c('#e8cf8e')} opacity={0.85} />
      <Circle cx={60} cy={35} r={1.3} fill={c('#e8cf8e')} opacity={0.85} />
      <Circle cx={28} cy={28} r={1.2} fill={c('#ffffff')} opacity={0.8} />
      <Circle cx={70} cy={50} r={1.2} fill={c('#ffffff')} opacity={0.8} />
      <Path d="M33.5 40.5 L36 33 L40.5 38.5 Z" fill={c('#8a6a48')} stroke={c('#3f2c16')} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M54.5 40.5 L52 33 L47.5 38.5 Z" fill={c('#8a6a48')} stroke={c('#3f2c16')} strokeWidth={1.2} strokeLinejoin="round" />
      <Ellipse cx={44} cy={50} rx={12.5} ry={14} fill={c('#8a6a48')} stroke={c('#3f2c16')} strokeWidth={1.6} />
      <Ellipse cx={44} cy={57} rx={7} ry={6} fill={c('#c2a276')} opacity={0.9} />
      <G fill="none" stroke={c('#8a6a48')} strokeWidth={1.1} strokeLinecap="round">
        <Path d="M40 55.5 l2 2 2 -2 M44 55.5 l2 2 2 -2" />
        <Path d="M41 59.5 l2 2 2 -2" />
      </G>
      <Ellipse cx={44} cy={45.5} rx={10} ry={8} fill={c('#a8865e')} />
      <Circle cx={39} cy={45} r={4.6} fill={c('#fff7e0')} stroke={c('#3f2c16')} strokeWidth={1} />
      <Circle cx={49} cy={45} r={4.6} fill={c('#fff7e0')} stroke={c('#3f2c16')} strokeWidth={1} />
      <Circle cx={39.5} cy={45.3} r={2} fill={c('#2b2417')} />
      <Circle cx={48.5} cy={45.3} r={2} fill={c('#2b2417')} />
      <Circle cx={40.2} cy={44.4} r={0.7} fill={c('#ffffff')} />
      <Circle cx={49.2} cy={44.4} r={0.7} fill={c('#ffffff')} />
      <Path d="M44 48.5 l-2.2 3 2.2 3 2.2 -3 Z" fill={c('#e8a03a')} stroke={c('#8a5a00')} strokeWidth={0.9} strokeLinejoin="round" />
      <Path d="M33.5 48 q-1.5 6 3 10.5" fill="none" stroke={c('#3f2c16')} strokeWidth={1.2} />
      <G stroke={c('#e8a03a')} strokeWidth={1.6} strokeLinecap="round">
        <Path d="M40 63.8 v2.6" />
        <Path d="M44 64.2 v2.6" />
        <Path d="M48 63.8 v2.6" />
      </G>
      <Path d="M32 67 H57" stroke={c('#5a3c1e')} strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M52 67 q3 -1 5 -3" fill="none" stroke={c('#5a3c1e')} strokeWidth={1.6} strokeLinecap="round" />
    </>
  );
}

/** marathon_player — crimson running shoe with a winged heel. */
export function WingedShoeEmblem({ c }: EmblemProps) {
  return (
    <>
      <G stroke={c('#ffffff')} strokeWidth={2} strokeLinecap="round" opacity={0.6}>
        <Path d="M26 44 h7" />
        <Path d="M24.5 50 h8" />
        <Path d="M27 56 h6" />
      </G>
      <Path
        d="M34 58.5 C33.6 52 34.6 47.5 36.4 44.5 C37.8 42.2 40.8 42 42.6 43.8 L47.4 48.6 C50 51.2 53.4 52.9 57 53.6 L69.6 56.1 C71.4 56.5 72.5 57.3 72.5 58.5 Z"
        fill={c('#d64a3a')}
        stroke={c('#7a1f16')}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M34 58.5 C33.6 52 34.6 47.5 36.4 44.5 L40 47 C38.4 50.4 38 54 38.3 58.5 Z" fill={c('#9c2c20')} />
      <Path d="M40 55 q8 3 18 3.2" fill="none" stroke={c('#ffd24d')} strokeWidth={2} strokeLinecap="round" />
      <G stroke={c('#fdf3dc')} strokeWidth={1.5} strokeLinecap="round">
        <Path d="M45 49.5 l5.5 -1.8" />
        <Path d="M47.5 52.5 l6 -1.8" />
        <Path d="M50.5 55 l6.5 -1.6" />
      </G>
      <Path d="M34 58.5 h38.5 q-1 5.5 -8 5.5 H38 q-4 0 -4 -4 Z" fill={c('#f2f5fb')} stroke={c('#8a93a8')} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M38 61.5 h26" stroke={c('#c3cbd9')} strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M38 43.5 Q30 36.5 26 38 Q31 40.5 34.5 44.5 Z" fill={c('#fdf3dc')} stroke={c('#b09a6a')} strokeWidth={1} strokeLinejoin="round" />
      <Path d="M38 46 Q30 41.5 27.5 43 Q31.5 45 34.5 47.5 Z" fill={c('#f2e8cc')} stroke={c('#b09a6a')} strokeWidth={1} strokeLinejoin="round" />
      <Path d="M38 48.5 Q31.5 46 29.5 47.5 Q33 49 35.5 50.5 Z" fill={c('#e8dcbc')} stroke={c('#b09a6a')} strokeWidth={1} strokeLinejoin="round" />
      <Path d={sparkle4(63, 30, 3)} fill={c('#ffffff')} opacity={0.85} />
    </>
  );
}
