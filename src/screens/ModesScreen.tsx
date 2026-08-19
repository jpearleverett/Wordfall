import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path, Polygon, Rect } from 'react-native-svg';
import {
  VB,
  BodyGrad,
  RadialGrad,
  DuoGrad,
  Gloss,
  Gleam,
  gradId,
  shade,
  outline,
} from '../components/icons/IconBase';
import { COLORS, GRADIENTS, FONTS, RADIUS, SHADOWS, MODE_CONFIGS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import NeonProgressBar from '../components/common/NeonProgressBar';
import { ModeConfig } from '../types';
import {
  usePlayerStore,
  usePlayerActions,
  selectUnlockedModes,
  selectCurrentLevel,
  selectPerfectSolves,
  selectTotalStars,
  selectPuzzlesSolved,
  selectTooltipsShown,
  selectModeStats,
} from '../stores/playerStore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const MODES = Object.values(MODE_CONFIGS)
  .map((mode) => ({
    id: mode.id,
    name: mode.name,
    icon: mode.icon,
    desc: mode.description,
    color: mode.color,
    unlockLevel: mode.unlockLevel,
  }))
  .sort((a, b) => a.unlockLevel - b.unlockLevel);

// ─── Drawn glyph kit — layered Views/gradients, no emoji (same technique as
// LeaderboardScreen's GlyphMedallion / ClubScreen's ShieldCrest family). ────

/**
 * DrawnMedallion — IconMedallion's layered-gem shell, but hosting drawn
 * View-based glyphs instead of raw emoji (the art review's residual flag).
 */
function DrawnMedallion({
  size = 44,
  accent = COLORS.purple,
  shape = 'circle',
  muted = false,
  style,
  children,
}: {
  size?: number;
  accent?: string;
  shape?: 'circle' | 'squircle';
  muted?: boolean;
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: shape === 'circle' ? size / 2 : size * 0.3,
          borderWidth: 1.5,
          borderColor: muted ? 'rgba(255,255,255,0.14)' : accent + '73',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: 'rgba(8, 2, 22, 0.92)',
          shadowColor: muted ? '#000' : accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: muted ? 0.2 : 0.55,
          shadowRadius: size * 0.22,
          elevation: muted ? 2 : 6,
        },
        muted && { opacity: 0.55 },
        style ?? null,
      ]}
    >
      <LinearGradient
        colors={[muted ? 'rgba(255,255,255,0.05)' : accent + '3D', 'rgba(8, 2, 22, 0.92)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.06,
          left: size * 0.16,
          right: size * 0.16,
          height: size * 0.16,
          borderRadius: size * 0.08,
          backgroundColor: 'rgba(255,255,255,0.14)',
        }}
      />
      {children}
    </View>
  );
}

/** Rendered letter tile — the classic-mode mark: candy gradient tile, fat
 *  contour, carved "A", glossy upper-left shine. */
function LetterTileGlyph({ size = 24, accent = COLORS.accent }: { size?: number; accent?: string }) {
  const id = useMemo(() => gradId('modeTile'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Rect x="3" y="3" width="18" height="18" rx="4.6" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.9" />
      <Rect x="5" y="4.7" width="14" height="5.8" rx="2.9" fill="#ffffff" opacity={0.16} />
      <Path
        d="M8.6 16.6 12 7.4l3.4 9.2M9.8 13.5h4.4"
        stroke={shade(accent, -82)}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M6.2 18.4c1.8 1 3.7 1.5 5.8 1.5s4-.5 5.8-1.5" stroke={shade(accent, 42)} strokeWidth="1.1" strokeLinecap="round" fill="none" opacity={0.8} />
      <Gloss cx={7.9} cy={6.6} rx={2.9} ry={1.7} rot={-22} o={0.4} />
      <Gleam cx={16.7} cy={5.5} r={0.75} />
    </Svg>
  );
}

/** Rendered clock — glowing gradient face, dark bezel, bold hands + hub,
 *  glossy shine (time pressure). */
function ClockGlyph({ size = 24, accent = COLORS.orange }: { size?: number; accent?: string }) {
  const id = useMemo(() => gradId('modeClock'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} />
      {/* stubby winder + feet so it reads "alarm clock", not "circle" */}
      <Rect x="10.6" y="1.2" width="2.8" height="2.6" rx="1.2" fill={shade(accent, -30)} stroke={outline(accent)} strokeWidth="1.2" />
      <Path d="m5.6 20.9-1.5 1.6M18.4 20.9l1.5 1.6" stroke={outline(accent)} strokeWidth="2.2" strokeLinecap="round" />
      <Circle cx="12" cy="12.4" r="9.4" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.9" />
      <Circle cx="12" cy="12.4" r="7" fill="none" stroke={shade(accent, -50)} strokeWidth="1.1" opacity={0.75} />
      <Path d="M12 6.6v.9M17.8 12.4h-.9M12 18.2v-.9M6.2 12.4h.9" stroke={shade(accent, -60)} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M12 12.4V7.9M12 12.4l3.3 2" stroke={shade(accent, -84)} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="12.4" r="1.5" fill={shade(accent, -84)} />
      <Path d="M7 17.8c1.4 1.2 3.1 1.9 5 1.9s3.6-.7 5-1.9" stroke={shade(accent, 44)} strokeWidth="1.1" strokeLinecap="round" fill="none" opacity={0.8} />
      <Gloss cx={8.5} cy={8.1} rx={2.9} ry={1.8} rot={-24} o={0.42} />
      <Gleam cx={15.2} cy={6.6} r={0.75} />
    </Svg>
  );
}

/** Rendered floating letter tile drifting upward under fat rising chevrons —
 *  the no-gravity mark. */
function FloatTileGlyph({ size = 24, accent = COLORS.teal }: { size?: number; accent?: string }) {
  const id = useMemo(() => gradId('modeFloat'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      {/* rising chevrons — contoured then lit so they pop on dark medallions */}
      <Path d="M7.2 8.3 12 3.9l4.8 4.4" stroke={outline(accent)} strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M7.2 8.3 12 3.9l4.8 4.4" stroke={shade(accent, 36)} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M8.6 11.2 12 8.1l3.4 3.1" stroke={shade(accent, 10)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.55} />
      {/* the drifting tile */}
      <Rect x="6.7" y="12.1" width="10.6" height="10.2" rx="2.9" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.9" />
      <Rect x="8.1" y="13.2" width="7.8" height="3.1" rx="1.55" fill="#ffffff" opacity={0.18} />
      <Path d="M10.3 20 12 15.4l1.7 4.6" stroke={shade(accent, -82)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Gloss cx={9.3} cy={14.3} rx={1.9} ry={1.1} rot={-22} o={0.42} />
      <Gleam cx={15.5} cy={13.6} r={0.65} />
    </Svg>
  );
}

/** Rendered circular arrows — two fat contoured gradient arcs with chunky
 *  filled arrowheads (gravity flip). */
function CycleGlyph({ size = 24, accent = COLORS.coral }: { size?: number; accent?: string }) {
  const id = useMemo(() => gradId('modeCycle'), []);
  const topArc = 'M4.6 10.2a7.9 7.9 0 0 1 13.6-3.5';
  const botArc = 'M19.4 13.8a7.9 7.9 0 0 1-13.6 3.5';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d={topArc} stroke={outline(accent)} strokeWidth="4.6" strokeLinecap="round" fill="none" />
      <Path d={botArc} stroke={outline(accent)} strokeWidth="4.6" strokeLinecap="round" fill="none" />
      <Path d={topArc} stroke={`url(#${id})`} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <Path d={botArc} stroke={`url(#${id})`} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <Polygon points="16.4,1.6 22.6,6 15.4,8.4" fill={shade(accent, 26)} stroke={outline(accent)} strokeWidth="1.6" strokeLinejoin="round" />
      <Polygon points="7.6,22.4 1.4,18 8.6,15.6" fill={shade(accent, 26)} stroke={outline(accent)} strokeWidth="1.6" strokeLinejoin="round" />
      <Gloss cx={8.6} cy={4.9} rx={2.5} ry={1.2} rot={-16} o={0.4} />
      <Gleam cx={4.5} cy={8.1} r={0.7} />
    </Svg>
  );
}

/** Rendered faceted diamond — brilliant-cut gem with crown facets, contour
 *  and shine (perfect solve). */
function DiamondGlyph({ size = 24, accent = COLORS.gold }: { size?: number; accent?: string }) {
  const id = useMemo(() => gradId('modeGem'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M7 4.4h10l4.2 5.4L12 20.6 2.8 9.8Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.9" strokeLinejoin="round" />
      <Path d="M7 4.4 2.8 9.8h5.8Z" fill="#ffffff" opacity={0.26} />
      <Path d="M8.6 9.8h6.8L12 20.6Z" fill={shade(accent, 24)} opacity={0.45} />
      <Path d="M2.8 9.8h18.4M8.6 9.8 12 20.6l3.4-10.8M7 4.4l1.6 5.4M17 4.4l-1.6 5.4" stroke={shade(accent, -54)} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
      <Path d="M5.6 11.6 12 19.3l6.4-7.7" stroke={shade(accent, 42)} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.8} />
      <Gloss cx={8.5} cy={6.6} rx={2.6} ry={1.4} rot={-18} o={0.5} />
      <Gleam cx={14.6} cy={6} r={0.7} />
    </Svg>
  );
}

/** Rendered shrinking frame — contoured gradient frames collapsing onto a
 *  hot candy tile core (shrinking board). */
function NestedSquaresGlyph({ size = 24, accent = COLORS.coral }: { size?: number; accent?: string }) {
  const id = useMemo(() => gradId('modeShrink'), []);
  const idCore = useMemo(() => gradId('modeShrinkCore'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <RadialGrad id={idCore} color={accent} />
      <Rect x="2.6" y="2.6" width="18.8" height="18.8" rx="4.8" fill="none" stroke={outline(accent)} strokeWidth="3.8" />
      <Rect x="2.6" y="2.6" width="18.8" height="18.8" rx="4.8" fill="none" stroke={`url(#${id})`} strokeWidth="1.9" opacity={0.6} />
      <Rect x="6.3" y="6.3" width="11.4" height="11.4" rx="3.2" fill="none" stroke={outline(accent)} strokeWidth="3.4" />
      <Rect x="6.3" y="6.3" width="11.4" height="11.4" rx="3.2" fill="none" stroke={`url(#${id})`} strokeWidth="1.7" opacity={0.85} />
      <Rect x="9.5" y="9.5" width="5" height="5" rx="1.5" fill={`url(#${idCore})`} stroke={outline(accent)} strokeWidth="1.5" />
      <Path d="M4.4 6.9c.3-1.2 1.3-2.2 2.5-2.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity={0.55} />
      <Gloss cx={10.7} cy={10.7} rx={1.3} ry={0.85} rot={-24} o={0.45} />
      <Gleam cx={13.4} cy={10.3} r={0.55} />
    </Svg>
  );
}

/** Rendered leaf — plump gradient leaf with stem, midrib + branch veins,
 *  contour and shine (relax). */
function LeafGlyph({ size = 24, accent = COLORS.green }: { size?: number; accent?: string }) {
  const id = useMemo(() => gradId('modeLeaf'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d="M5.5 18.5c-1.3 1.2-2 2.6-2.2 3.3" stroke={outline(accent)} strokeWidth="2" strokeLinecap="round" fill="none" />
      <Path
        d="M5.2 18.8C3.9 9.9 10.2 3.2 20.3 3.7c.9 10.1-5.8 16.4-14.7 15.1Z"
        fill={`url(#${id})`}
        stroke={outline(accent)}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <Path d="M6.9 17.1C10.5 13.5 14.2 9.8 17.8 6.2" stroke={shade(accent, -62)} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <Path d="M10.7 13.3 9.2 10M13.6 10.4l3.4 1.5" stroke={shade(accent, -62)} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity={0.8} />
      <Path d="M7.6 16.9c3.4.3 6.4-.5 8.8-2.2" stroke={shade(accent, 44)} strokeWidth="1.1" strokeLinecap="round" fill="none" opacity={0.7} />
      <Gloss cx={9.4} cy={7.5} rx={3} ry={1.7} rot={-30} o={0.4} />
      <Gleam cx={15.3} cy={5.9} r={0.7} />
    </Svg>
  );
}

const BURST_PTS =
  '12,2.2 13.84,7.57 18.93,5.07 16.44,10.16 21.8,12 16.44,13.84 18.93,18.93 ' +
  '13.84,16.44 12,21.8 10.16,16.44 5.07,18.93 7.56,13.84 2.2,12 7.57,10.16 5.07,5.07 10.16,7.57';

/** Rendered 8-point star burst — gradient spikes, fat contour, hot white
 *  core (expert). */
function StarBurstGlyph({ size = 24, accent = COLORS.gold }: { size?: number; accent?: string }) {
  const id = useMemo(() => gradId('modeBurst'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Polygon points={BURST_PTS} fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.8" strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="3.4" fill={shade(accent, 70)} />
      <Circle cx="12" cy="12" r="2" fill="#ffffff" opacity={0.85} />
      <Path d="m7.9 16.1 2.3-2.3M16.1 16.1l-2.3-2.3" stroke={shade(accent, 44)} strokeWidth="1.1" strokeLinecap="round" opacity={0.75} />
      <Gloss cx={9.6} cy={7.6} rx={2.2} ry={1.3} rot={-26} o={0.45} />
      <Gleam cx={14.4} cy={5.9} r={0.65} />
    </Svg>
  );
}

/** Rendered sun — chunky contoured gold rays around a glowing gradient core
 *  (daily). */
function SunGlyph({ size = 24 }: { size?: number }) {
  const gold = COLORS.gold;
  const id = useMemo(() => gradId('modeSun'), []);
  const rays = useMemo(() => [0, 45, 90, 135, 180, 225, 270, 315], []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={gold} />
      <G>
        {rays.map((deg) => (
          <Rect
            key={deg}
            x="10.75"
            y="1.2"
            width="2.5"
            height="5.2"
            rx="1.25"
            fill={shade(gold, 18)}
            stroke={outline(gold)}
            strokeWidth="1.2"
            transform={`rotate(${deg} 12 12)`}
          />
        ))}
      </G>
      <Circle cx="12" cy="12" r="5.9" fill={`url(#${id})`} stroke={outline(gold)} strokeWidth="1.9" />
      <Path d="M9 15.4c.9.7 1.9 1 3 1s2.1-.3 3-1" stroke={shade(gold, 46)} strokeWidth="1" strokeLinecap="round" fill="none" opacity={0.8} />
      <Gloss cx={10} cy={9.9} rx={2} ry={1.2} rot={-24} o={0.5} />
      <Gleam cx={14.1} cy={9.3} r={0.65} />
    </Svg>
  );
}

/** Rendered podium — contoured gradient ranking steps, gold champion column
 *  with a star cap (weekly). */
function PodiumGlyph({ size = 24, accent = COLORS.purple }: { size?: number; accent?: string }) {
  const id = useMemo(() => gradId('modePodium'), []);
  const idGold = useMemo(() => gradId('modePodiumGold'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <DuoGrad id={idGold} from={COLORS.goldLight} to={shade(COLORS.gold, -42)} />
      <Rect x="2" y="11.6" width="5.9" height="10.2" rx="1.6" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.6" />
      <Rect x="16.1" y="14.4" width="5.9" height="7.4" rx="1.6" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.6" opacity={0.88} />
      <Rect x="9.05" y="7" width="5.9" height="14.8" rx="1.6" fill={`url(#${idGold})`} stroke={outline(COLORS.gold)} strokeWidth="1.6" />
      <Path d="m12 2.2.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 4.3l2-.3Z" fill={shade(COLORS.gold, 30)} stroke={outline(COLORS.gold)} strokeWidth="1" strokeLinejoin="round" />
      <Path d="M3.4 13.2h3.1M10.45 8.6h3.1M17.5 16h3.1" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity={0.35} />
      <Gloss cx={10.7} cy={9.4} rx={1.3} ry={0.9} rot={-22} o={0.45} />
      <Gleam cx={13.6} cy={8.5} r={0.55} />
    </Svg>
  );
}

/** Rendered padlock — contoured shackle over a candy gradient body with
 *  keyhole, gloss and gleam. */
function LockGlyph({ size = 22, accent = COLORS.gold }: { size?: number; accent?: string }) {
  const id = useMemo(() => gradId('modeLock'), []);
  const shackle = 'M7.5 10.4V7.9a4.5 4.5 0 0 1 9 0v2.5';
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      <Path d={shackle} fill="none" stroke={outline(accent)} strokeWidth="4.4" strokeLinecap="round" />
      <Path d={shackle} fill="none" stroke={shade(accent, 28)} strokeWidth="2.2" strokeLinecap="round" />
      <Rect x="4.4" y="9.8" width="15.2" height="12" rx="3.2" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.9" />
      <Circle cx="12" cy="14.5" r="1.8" fill={shade(accent, -84)} />
      <Rect x="11" y="15.3" width="2" height="3.6" rx="1" fill={shade(accent, -84)} />
      <Path d="M6.6 19.9c1.6.8 3.4 1.2 5.4 1.2s3.8-.4 5.4-1.2" stroke={shade(accent, 42)} strokeWidth="1" strokeLinecap="round" fill="none" opacity={0.75} />
      <Gloss cx={8.1} cy={12.1} rx={2.4} ry={1.4} rot={-20} o={0.42} />
      <Gleam cx={15.9} cy={11.6} r={0.7} />
    </Svg>
  );
}

/** Rendered mini trophy — gold gradient cup with contoured handles, stem
 *  and base, plus shine. */
function TrophyGlyph({ size = 12, accent = COLORS.gold }: { size?: number; accent?: string }) {
  const id = useMemo(() => gradId('modeTrophy'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <DuoGrad id={id} from={COLORS.goldLight} to={shade(accent, -46)} />
      <Path d="M5.8 5H2.6v2.2c0 2.7 2 4.9 4.6 5.2M18.2 5h3.2v2.2c0 2.7-2 4.9-4.6 5.2" fill="none" stroke={outline(accent)} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5.8 5H2.6v2.2c0 2.7 2 4.9 4.6 5.2M18.2 5h3.2v2.2c0 2.7-2 4.9-4.6 5.2" fill="none" stroke={shade(accent, 24)} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.2 3.2h11.6v5.4a5.8 5.8 0 0 1-11.6 0Z" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.8" strokeLinejoin="round" />
      <Rect x="10.8" y="14.2" width="2.4" height="3.4" fill={shade(accent, -28)} stroke={outline(accent)} strokeWidth="1.2" />
      <Rect x="7.2" y="17.6" width="9.6" height="3" rx="1.4" fill={`url(#${id})`} stroke={outline(accent)} strokeWidth="1.5" />
      <Gloss cx={9} cy={5.6} rx={2.3} ry={1.4} rot={-22} o={0.5} />
      <Gleam cx={14.7} cy={4.9} r={0.65} />
    </Svg>
  );
}

/** Rendered light bulb — glowing gradient globe, filament, stacked base
 *  bands, contour + shine (coach tip). */
function BulbGlyph({ size = 18, accent = COLORS.cyan }: { size?: number; accent?: string }) {
  const id = useMemo(() => gradId('modeBulb'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <RadialGrad id={id} color={accent} cx={0.4} cy={0.3} />
      <Path
        d="M12 1.8a7 7 0 0 1 3.8 12.9c-.7.5-1.1 1.1-1.1 1.9H9.3c0-.8-.4-1.4-1.1-1.9A7 7 0 0 1 12 1.8Z"
        fill={`url(#${id})`}
        stroke={outline(accent)}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <Path d="m10 8.6 2 2.2 2-2.2M12 10.8v3.6" stroke={shade(accent, -74)} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="9.3" y="17.8" width="5.4" height="1.9" rx="0.95" fill={shade(accent, -28)} stroke={outline(accent)} strokeWidth="1.1" />
      <Rect x="10" y="20.4" width="4" height="1.6" rx="0.8" fill={shade(accent, -52)} stroke={outline(accent)} strokeWidth="1.1" />
      <Gloss cx={9.2} cy={5.4} rx={2.4} ry={1.5} rot={-24} o={0.5} />
      <Gleam cx={14.6} cy={4.2} r={0.65} />
    </Svg>
  );
}

/** Per-mode drawn silhouette in the mode's accent color. */
function ModeGlyph({ modeId, accent, size }: { modeId: string; accent: string; size: number }) {
  switch (modeId) {
    case 'classic':
      return <LetterTileGlyph size={size} accent={accent} />;
    case 'timePressure':
      return <ClockGlyph size={size} accent={accent} />;
    case 'noGravity':
      return <FloatTileGlyph size={size} accent={accent} />;
    case 'gravityFlip':
      return <CycleGlyph size={size} accent={accent} />;
    case 'perfectSolve':
      return <DiamondGlyph size={size} accent={accent} />;
    case 'shrinkingBoard':
      return <NestedSquaresGlyph size={size} accent={accent} />;
    case 'relax':
      return <LeafGlyph size={size} accent={accent} />;
    case 'daily':
      return <SunGlyph size={size} />;
    case 'weekly':
      return <PodiumGlyph size={size} accent={accent} />;
    case 'expert':
    default:
      return <StarBurstGlyph size={size} accent={accent} />;
  }
}

/** Compact progress readout rendered on a locked card instead of the old
 *  floating gold string: a chip label + a meter toward the requirement. */
interface LockMeter {
  current: number;
  total: number;
  label: string;
}

/**
 * The single most meaningful stat per mode card. One chip per card, varied
 * across modes, so the grid stops reading as ten copies of the same
 * placeholder stats line. Falls back to play count when the focus stat is
 * still zero.
 */
const STAT_FOCUS: Record<string, 'best' | 'wins' | 'played'> = {
  classic: 'best',
  timePressure: 'best',
  expert: 'best',
  weekly: 'best',
  daily: 'played',
  relax: 'played',
  noGravity: 'wins',
  gravityFlip: 'wins',
  shrinkingBoard: 'wins',
  perfectSolve: 'wins',
};

interface ModesScreenProps {
  onSelectMode?: (mode: string) => void;
  unlockedModes?: string[];
  playerLevel?: number;
  onOpenLeaderboard?: () => void;
}

const ModesScreen: React.FC<ModesScreenProps> = ({
  onSelectMode: onSelectModeProp,
  unlockedModes: unlockedModesProp,
  playerLevel: playerLevelProp,
  onOpenLeaderboard,
}) => {
  // Narrow zustand subscriptions
  const playerUnlockedModes = usePlayerStore(selectUnlockedModes);
  const playerCurrentLevel = usePlayerStore(selectCurrentLevel);
  const perfectSolves = usePlayerStore(selectPerfectSolves);
  const totalStars = usePlayerStore(selectTotalStars);
  const puzzlesSolved = usePlayerStore(selectPuzzlesSolved);
  const tooltipsShown = usePlayerStore(selectTooltipsShown);
  const modeStats = usePlayerStore(selectModeStats);
  const { markTooltipShown } = usePlayerActions();
  const onSelectMode = onSelectModeProp ?? ((_mode: string) => {});
  const unlockedModes = unlockedModesProp ?? playerUnlockedModes;
  const playerLevel = playerLevelProp ?? playerCurrentLevel;
  const isModeAccessible = (
    modeId: string,
  ): { accessible: boolean; reason: string; meter: LockMeter } => {
    const modeConfig = MODE_CONFIGS[modeId as keyof typeof MODE_CONFIGS] as ModeConfig | undefined;
    if (!modeConfig) {
      return { accessible: false, reason: 'Unknown mode', meter: { current: 0, total: 1, label: 'LOCKED' } };
    }

    if (playerLevel < modeConfig.unlockLevel && !unlockedModes.includes(modeId)) {
      return {
        accessible: false,
        reason: `Reach level ${modeConfig.unlockLevel}`,
        meter: { current: playerLevel, total: modeConfig.unlockLevel, label: `LV ${modeConfig.unlockLevel}` },
      };
    }

    const gate = modeConfig.rules.skillGate;
    if (gate) {
      if (gate.perfectSolves && perfectSolves < gate.perfectSolves) {
        return {
          accessible: false,
          reason: `Need ${gate.perfectSolves} perfect solves (${perfectSolves}/${gate.perfectSolves})`,
          meter: { current: perfectSolves, total: gate.perfectSolves, label: `${perfectSolves}/${gate.perfectSolves} PERFECT` },
        };
      }
      if (gate.minStars && totalStars < gate.minStars) {
        return {
          accessible: false,
          reason: `Need ${gate.minStars} stars (${totalStars}/${gate.minStars})`,
          meter: { current: totalStars, total: gate.minStars, label: `${totalStars}/${gate.minStars} ★` },
        };
      }
      if (gate.puzzlesSolved && puzzlesSolved < gate.puzzlesSolved) {
        return {
          accessible: false,
          reason: `Need ${gate.puzzlesSolved} puzzles solved (${puzzlesSolved}/${gate.puzzlesSolved})`,
          meter: { current: puzzlesSolved, total: gate.puzzlesSolved, label: `${puzzlesSolved}/${gate.puzzlesSolved} SOLVED` },
        };
      }
    }

    return { accessible: true, reason: '', meter: { current: 1, total: 1, label: '' } };
  };

  /** Compact accent chip carrying one stat; null until the mode is played. */
  const renderStatChip = (modeId: string, accent: string) => {
    const stats = modeStats[modeId];
    if (!stats || stats.played <= 0) return null;
    let focus = STAT_FOCUS[modeId] ?? 'played';
    if (focus === 'best' && stats.bestScore <= 0) focus = 'played';
    if (focus === 'wins' && stats.wins <= 0) focus = 'played';
    const label =
      focus === 'best'
        ? `BEST ${stats.bestScore.toLocaleString()}`
        : focus === 'wins'
          ? `${stats.wins} WON`
          : `${stats.played} PLAYED`;
    const chipAccent = focus === 'best' ? COLORS.gold : accent;
    return (
      <View
        style={[
          styles.statChip,
          { borderColor: chipAccent + '59', backgroundColor: chipAccent + '14' },
        ]}
      >
        {focus === 'best' ? (
          <TrophyGlyph size={11} />
        ) : focus === 'wins' ? (
          <StarBurstGlyph size={10} accent={chipAccent} />
        ) : (
          <DiamondGlyph size={10} accent={chipAccent} />
        )}
        <Text style={[styles.statChipText, { color: chipAccent }]}>{label}</Text>
      </View>
    );
  };

  /** Full stats summary for screen readers (visual chip shows one stat). */
  const statsA11y = (modeId: string): string => {
    const stats = modeStats[modeId];
    if (!stats || stats.played <= 0) return '';
    return `. ${stats.played} played, best score ${stats.bestScore.toLocaleString()}, ${stats.wins} won`;
  };

  const renderModeCard = (mode: typeof MODES[number]) => {
    const { accessible, reason, meter } = isModeAccessible(mode.id);
    const accent = mode.color;
    const special = mode.id === 'daily' || mode.id === 'weekly';
    // Classic shares the full-width banner layout: as the FIRST card it
    // otherwise sits alone in a half-empty grid row, which the round-3
    // blind review read as "oversized Classic card creates dead space".
    const hero = special || mode.id === 'classic';
    const trim = special ? COLORS.gold : accent;

    // Daily / Weekly events (and Classic, the main journey) break the grid
    // rhythm as full-width banner rows — medallion left, copy left-aligned,
    // stat chip on the right.
    if (hero) {
      return (
        <Pressable
          key={mode.id}
          style={({ pressed }) => [
            styles.bannerCard,
            accessible
              ? [{ borderColor: trim + '66' }, SHADOWS.glow(trim)]
              : styles.cardLocked,
            pressed && accessible && styles.cardPressed,
          ]}
          onPress={() => accessible && onSelectMode(mode.id)}
          accessibilityRole="button"
          accessibilityLabel={`${mode.name} mode${accessible ? '' : ', locked'}: ${accessible ? mode.desc : reason}${accessible ? statsA11y(mode.id) : ''}`}
          accessibilityState={{ disabled: !accessible }}
        >
          <LinearGradient
            colors={
              accessible
                ? [...GRADIENTS.surfaceCard]
                : (['rgba(18,6,32,0.94)', 'rgba(10,0,21,0.96)'] as const)
            }
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {accessible && (
            <LinearGradient
              colors={[trim + '26', 'transparent'] as [string, string]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          )}
          {accessible && (
            <View style={[styles.bannerEdge, { backgroundColor: trim }, SHADOWS.neonEdge(trim)]} />
          )}
          {/* Same plate-free glow-ring treatment as the grid cards. */}
          <View
            style={[
              styles.iconHalo,
              styles.iconHaloBanner,
              accessible
                ? {
                    backgroundColor: accent + '1F',
                    borderColor: accent + '4D',
                    shadowColor: accent,
                  }
                : styles.iconHaloLocked,
            ]}
          >
            {accessible ? (
              <ModeGlyph modeId={mode.id} accent={accent} size={34} />
            ) : (
              <LockGlyph size={22} accent={COLORS.gold} />
            )}
          </View>
          <View style={styles.bannerBody}>
            <Text style={[styles.bannerEyebrow, !special && { color: accent }]}>
              {mode.id === 'daily' ? 'DAILY EVENT' : mode.id === 'weekly' ? 'WEEKLY EVENT' : 'THE MAIN JOURNEY'}
            </Text>
            <Text style={[styles.bannerName, !accessible && styles.textLocked]}>
              {mode.name}
            </Text>
            {accessible ? (
              <Text style={styles.bannerDesc} numberOfLines={2} ellipsizeMode="tail">
                {mode.desc}
              </Text>
            ) : (
              <View style={styles.bannerLockBlock}>
                <View style={styles.lockChip}>
                  <Text style={styles.lockChipText}>{meter.label}</Text>
                </View>
                <View style={styles.lockMeter}>
                  <NeonProgressBar
                    progress={meter.total > 0 ? meter.current / meter.total : 0}
                    color={COLORS.gold}
                    height={5}
                    showGlowDot={false}
                  />
                </View>
              </View>
            )}
          </View>
          {accessible && renderStatChip(mode.id, accent)}
        </Pressable>
      );
    }

    return (
      <Pressable
        key={mode.id}
        style={({ pressed }) => [
          styles.card,
          accessible
            ? [{ borderColor: accent + '59' }, SHADOWS.glow(accent)]
            : styles.cardLocked,
          pressed && accessible && styles.cardPressed,
        ]}
        onPress={() => accessible && onSelectMode(mode.id)}
        accessibilityRole="button"
        accessibilityLabel={`${mode.name} mode${accessible ? '' : ', locked'}: ${accessible ? mode.desc : reason}${accessible ? statsA11y(mode.id) : ''}`}
        accessibilityState={{ disabled: !accessible }}
      >
        <LinearGradient
          colors={
            accessible
              ? [...GRADIENTS.surfaceCard]
              : (['rgba(18,6,32,0.94)', 'rgba(10,0,21,0.96)'] as const)
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        {accessible && (
          <LinearGradient
            colors={[accent + '2E', 'transparent']}
            style={styles.accentWash}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        )}
        {accessible && (
          <View
            style={[
              styles.topTick,
              { backgroundColor: accent },
              SHADOWS.neonEdge(accent),
            ]}
          />
        )}
        <View style={styles.cardContent}>
          {/* Mode art rendered LARGE in a soft accent glow ring — no squircle
              plate, so the glyph reads as game art rather than an app icon. */}
          <View
            style={[
              styles.iconHalo,
              accessible
                ? {
                    backgroundColor: accent + '1F',
                    borderColor: accent + '4D',
                    shadowColor: accent,
                  }
                : styles.iconHaloLocked,
            ]}
          >
            {accessible ? (
              <ModeGlyph modeId={mode.id} accent={accent} size={44} />
            ) : (
              <LockGlyph size={24} accent={COLORS.gold} />
            )}
          </View>
          <Text style={[styles.cardName, !accessible && styles.textLocked]}>
            {mode.name}
          </Text>
          {accessible ? (
            <>
              <Text style={styles.cardDesc} numberOfLines={2} ellipsizeMode="tail">
                {mode.desc}
              </Text>
              {/* R8: the player's own history on the card — one compact
                  accent chip per card (full breakdown lives in the a11y
                  label). Hidden entirely until the mode has been played. */}
              {renderStatChip(mode.id, accent)}
            </>
          ) : (
            <View style={styles.lockBlock}>
              <View style={styles.lockChip}>
                <Text style={styles.lockChipText}>{meter.label}</Text>
              </View>
              <View style={styles.lockMeter}>
                <NeonProgressBar
                  progress={meter.total > 0 ? meter.current / meter.total : 0}
                  color={COLORS.gold}
                  height={5}
                  showGlowDot={false}
                />
              </View>
            </View>
          )}
        </View>
        {accessible && (
          <View
            style={[
              styles.cardAccent,
              { backgroundColor: accent, shadowColor: accent },
            ]}
          />
        )}
      </Pressable>
    );
  };

  const [showTooltip, setShowTooltip] = useState(
    !tooltipsShown.includes('modes_screen')
  );

  return (
    <ScreenScaffold
      title="GAME MODES"
      subtitle={`${unlockedModes.length} of ${MODES.length} unlocked`}
      backdrop="modes"
      scroll={false}
      headerRight={
        onOpenLeaderboard ? (
          <Pressable
            onPress={onOpenLeaderboard}
            accessibilityRole="button"
            accessibilityLabel="Open leaderboard"
            hitSlop={8}
            style={({ pressed }) => [pressed && styles.headerBtnPressed]}
          >
            <DrawnMedallion accent={COLORS.gold} size={40}>
              <PodiumGlyph size={20} accent={COLORS.gold} />
            </DrawnMedallion>
          </Pressable>
        ) : undefined
      }
    >
      {/* First-visit coach mark — an IN-FLOW glass banner under the header.
          It pushes the grid down instead of floating over it (the old
          absolutely-positioned Tooltip occluded the mode cards). */}
      {showTooltip && (
        <Pressable
          onPress={() => {
            setShowTooltip(false);
            markTooltipShown('modes_screen');
          }}
          style={({ pressed }) => [styles.coachBanner, pressed && styles.coachBannerPressed]}
          accessibilityRole="button"
          accessibilityLabel="Tip: Each mode has unique rules. Advance through levels to unlock more. Tap to dismiss"
        >
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <LinearGradient
            colors={[COLORS.cyan + '1F', 'transparent'] as [string, string]}
            style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <DrawnMedallion accent={COLORS.cyan} size={30} shape="squircle">
            <BulbGlyph size={17} accent={COLORS.cyan} />
          </DrawnMedallion>
          <Text style={styles.coachBannerText}>
            Each mode has unique rules — advance through levels to unlock more.
          </Text>
          <View style={styles.coachDismiss}>
            <Text style={styles.coachDismissText}>{'✕'}</Text>
          </View>
        </Pressable>
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {MODES.map(renderModeCard)}
      </ScrollView>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  coachBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.28)',
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  coachBannerPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.88,
  },
  coachBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  coachDismiss: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachDismissText: {
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
  },
  headerBtnPressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.85,
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    // FIXED height (not minHeight): every grid card renders identical, sized
    // to the tallest content case (halo icon + title + 2-line desc + stat
    // chip). Kills the per-row height drift that left the Classic card
    // taller than its siblings with dead space under short descriptions.
    height: 188,
    borderWidth: 1.5,
  },
  cardLocked: {
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.soft,
  },
  cardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  accentWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 72,
  },
  topTick: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 40,
    height: 3,
    borderBottomLeftRadius: RADIUS.sm,
    borderBottomRightRadius: RADIUS.sm,
  },
  cardContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  // Soft accent glow ring hosting the mode glyph directly — replaces the old
  // squircle medallion plate so the art reads as game art, not an app icon.
  iconHalo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  iconHaloBanner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 0,
  },
  iconHaloLocked: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  cardName: {
    fontSize: 15,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 4,
    textShadowColor: 'rgba(255,255,255,0.12)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  textLocked: {
    color: COLORS.textMuted,
  },
  cardDesc: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 8,
  },
  statChipText: {
    fontSize: 9,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  bannerCard: {
    width: width - 32,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  bannerEdge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
    backgroundColor: COLORS.gold,
  },
  bannerBody: {
    flex: 1,
    minWidth: 0,
  },
  bannerEyebrow: {
    fontSize: 9,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    letterSpacing: 2,
    marginBottom: 3,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  bannerName: {
    fontSize: 16,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 3,
    textShadowColor: 'rgba(255,255,255,0.12)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  bannerDesc: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  bannerLockBlock: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    marginTop: 2,
  },
  lockBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 2,
  },
  lockChip: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gold + '66',
    backgroundColor: 'rgba(255,184,0,0.10)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  lockChipText: {
    fontSize: 10,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    letterSpacing: 1.5,
  },
  lockMeter: {
    alignSelf: 'stretch',
    paddingHorizontal: 6,
  },
  cardAccent: {
    height: 3,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default ModesScreen;
