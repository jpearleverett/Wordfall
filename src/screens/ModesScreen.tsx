import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

/** Drawn mini letter tile — the classic-mode mark. */
function LetterTileGlyph({ size = 24, accent = COLORS.accent }: { size?: number; accent?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
      }}
    >
      <LinearGradient
        colors={[accent, accent + '99']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.08,
          left: size * 0.12,
          right: size * 0.12,
          height: size * 0.18,
          borderRadius: size * 0.09,
          backgroundColor: 'rgba(255,255,255,0.30)',
        }}
      />
      <Text style={{ fontFamily: FONTS.display, fontSize: size * 0.52, color: 'rgba(8,2,22,0.9)' }}>A</Text>
    </View>
  );
}

/** Drawn clock — ring + hour/minute hands + hub. */
function ClockGlyph({ size = 24, accent = COLORS.orange }: { size?: number; accent?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: size * 0.1,
          borderColor: accent,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.09,
          height: size * 0.3,
          borderRadius: size * 0.05,
          backgroundColor: accent,
          top: size * 0.18,
          left: size / 2 - size * 0.045,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.26,
          height: size * 0.09,
          borderRadius: size * 0.05,
          backgroundColor: accent,
          top: size / 2 - size * 0.045,
          left: size / 2 - size * 0.02,
        }}
      />
      <View style={{ width: size * 0.12, height: size * 0.12, borderRadius: size * 0.06, backgroundColor: COLORS.textPrimary }} />
    </View>
  );
}

/** Drawn floating tile with rising chevrons — the no-gravity mark. */
function FloatTileGlyph({ size = 24, accent = COLORS.teal }: { size?: number; accent?: string }) {
  const c = size * 0.4;
  const chev = (top: number, opacity: number) => (
    <View
      key={top}
      style={{
        position: 'absolute',
        top,
        alignSelf: 'center',
        width: c,
        height: c,
        borderTopWidth: size * 0.1,
        borderRightWidth: size * 0.1,
        borderColor: accent,
        opacity,
        transform: [{ rotate: '-45deg' }],
      }}
    />
  );
  return (
    <View style={{ width: size, height: size }}>
      {chev(size * 0.02, 1)}
      {chev(size * 0.24, 0.5)}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          alignSelf: 'center',
          width: size * 0.4,
          height: size * 0.4,
          borderRadius: size * 0.1,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={[accent, accent + '88']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    </View>
  );
}

/** Drawn circular-arrows mark — two arcs + diamond arrowheads (gravity flip). */
function CycleGlyph({ size = 24, accent = COLORS.coral }: { size?: number; accent?: string }) {
  const t = size * 0.11;
  const head = (left: number, top: number) => (
    <View
      style={{
        position: 'absolute',
        left,
        top,
        width: t * 1.8,
        height: t * 1.8,
        backgroundColor: accent,
        transform: [{ rotate: '45deg' }],
      }}
    />
  );
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: t,
          borderColor: accent,
          borderTopColor: 'transparent',
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: t,
          borderColor: 'transparent',
          borderTopColor: accent + '66',
          transform: [{ rotate: '45deg' }],
        }}
      />
      {head(size * 0.02, size * 0.02)}
      {head(size - t * 2, size - t * 2.2)}
    </View>
  );
}

/** Drawn faceted diamond — rotated gradient square with facet highlight. */
function DiamondGlyph({ size = 24, accent = COLORS.gold }: { size?: number; accent?: string }) {
  const d = size * 0.62;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: d, height: d, borderRadius: d * 0.16, overflow: 'hidden', transform: [{ rotate: '45deg' }] }}>
        <LinearGradient
          colors={[accent + 'E6', accent + '66']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={{ position: 'absolute', top: 0, left: 0, width: d * 0.5, height: d * 0.5, backgroundColor: 'rgba(255,255,255,0.35)' }} />
      </View>
    </View>
  );
}

/** Drawn nested squares — the shrinking-board mark. */
function NestedSquaresGlyph({ size = 24, accent = COLORS.coral }: { size?: number; accent?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size * 0.2,
          borderWidth: size * 0.08,
          borderColor: accent + '66',
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: size * 0.14,
          borderWidth: size * 0.08,
          borderColor: accent + 'B3',
        }}
      />
      <View style={{ width: size * 0.26, height: size * 0.26, borderRadius: size * 0.07, backgroundColor: accent }} />
    </View>
  );
}

/** Drawn leaf — gradient teardrop with vein (relax). */
function LeafGlyph({ size = 24, accent = COLORS.green }: { size?: number; accent?: string }) {
  const d = size * 0.74;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: d,
          height: d,
          borderTopLeftRadius: d * 0.06,
          borderBottomRightRadius: d * 0.06,
          borderTopRightRadius: d,
          borderBottomLeftRadius: d,
          overflow: 'hidden',
          transform: [{ rotate: '45deg' }],
        }}
      >
        <LinearGradient
          colors={[accent, accent + '77']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            position: 'absolute',
            top: d * 0.47,
            left: -d * 0.1,
            width: d * 1.2,
            height: size * 0.05,
            backgroundColor: 'rgba(8,2,22,0.35)',
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
    </View>
  );
}

/** Drawn 8-point star burst — two crossed gradient squares + hot core. */
function StarBurstGlyph({ size = 24, accent = COLORS.gold }: { size?: number; accent?: string }) {
  const sq = size * 0.68;
  const square = {
    position: 'absolute' as const,
    width: sq,
    height: sq,
    borderRadius: sq * 0.18,
    overflow: 'hidden' as const,
  };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[square, { transform: [{ rotate: '45deg' }] }]}>
        <LinearGradient
          colors={[accent, accent + '99']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View style={square}>
        <LinearGradient
          colors={[accent, accent + '99']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          width: sq * 0.34,
          height: sq * 0.34,
          borderRadius: sq * 0.17,
          backgroundColor: 'rgba(255,255,255,0.6)',
        }}
      />
    </View>
  );
}

/** Drawn sun — gold gradient core with crossed ray bars (daily). */
function SunGlyph({ size = 24 }: { size?: number }) {
  const core = size * 0.54;
  const ray = { position: 'absolute' as const, width: size, height: size * 0.1, borderRadius: size * 0.05, backgroundColor: COLORS.gold + 'B3' };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={ray} />
      <View style={[ray, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[ray, { transform: [{ rotate: '90deg' }] }]} />
      <View style={[ray, { transform: [{ rotate: '135deg' }] }]} />
      <View style={{ width: core, height: core, borderRadius: core / 2, overflow: 'hidden' }}>
        <LinearGradient
          colors={[COLORS.goldLight, COLORS.gold]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            position: 'absolute',
            top: core * 0.12,
            left: core * 0.2,
            width: core * 0.3,
            height: core * 0.22,
            borderRadius: core * 0.15,
            backgroundColor: 'rgba(255,255,255,0.55)',
          }}
        />
      </View>
    </View>
  );
}

/** Drawn podium — three gradient ranking bars, center tallest (weekly). */
function PodiumGlyph({ size = 24, accent = COLORS.purple }: { size?: number; accent?: string }) {
  const bar = (h: number, colors: readonly [string, string], key: number) => (
    <View key={key} style={{ width: size * 0.26, height: size * h, borderRadius: size * 0.06, overflow: 'hidden' }}>
      <LinearGradient
        colors={[...colors]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
  return (
    <View
      style={{
        width: size,
        height: size,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: size * 0.08,
      }}
    >
      {bar(0.55, [accent, accent + '80'], 0)}
      {bar(0.95, [COLORS.goldLight, COLORS.gold], 1)}
      {bar(0.4, [accent + 'CC', accent + '66'], 2)}
    </View>
  );
}

/** Drawn mini padlock — ring shackle + gradient rounded-rect body. */
function LockGlyph({ size = 22, accent = COLORS.gold }: { size?: number; accent?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.5,
          height: size * 0.4,
          borderTopLeftRadius: size * 0.25,
          borderTopRightRadius: size * 0.25,
          borderWidth: size * 0.11,
          borderBottomWidth: 0,
          borderColor: accent + 'D9',
          marginBottom: -size * 0.05,
        }}
      />
      <View
        style={{
          width: size * 0.82,
          height: size * 0.56,
          borderRadius: size * 0.14,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LinearGradient
          colors={[accent, accent + '8C']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            width: size * 0.16,
            height: size * 0.22,
            borderRadius: size * 0.08,
            backgroundColor: 'rgba(8,2,22,0.7)',
          }}
        />
      </View>
    </View>
  );
}

/** Drawn mini trophy — gold gradient cup + handles, stem and base. */
function TrophyGlyph({ size = 12, accent = COLORS.gold }: { size?: number; accent?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.58,
          height: size * 0.46,
          borderBottomLeftRadius: size * 0.29,
          borderBottomRightRadius: size * 0.29,
          borderTopLeftRadius: size * 0.06,
          borderTopRightRadius: size * 0.06,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={[COLORS.goldLight, accent]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          top: size * 0.04,
          left: 0,
          width: size * 0.22,
          height: size * 0.3,
          borderRadius: size * 0.11,
          borderWidth: Math.max(1, size * 0.09),
          borderColor: accent + 'CC',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.04,
          right: 0,
          width: size * 0.22,
          height: size * 0.3,
          borderRadius: size * 0.11,
          borderWidth: Math.max(1, size * 0.09),
          borderColor: accent + 'CC',
        }}
      />
      <View style={{ width: size * 0.12, height: size * 0.16, backgroundColor: accent + 'D9' }} />
      <View style={{ width: size * 0.42, height: size * 0.12, borderRadius: size * 0.04, backgroundColor: accent }} />
    </View>
  );
}

/** Drawn light bulb — gradient globe + stacked base bands (coach tip). */
function BulbGlyph({ size = 18, accent = COLORS.cyan }: { size?: number; accent?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View style={{ width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3, overflow: 'hidden' }}>
        <LinearGradient
          colors={[accent, accent + '8C']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            position: 'absolute',
            top: size * 0.07,
            left: size * 0.1,
            width: size * 0.16,
            height: size * 0.12,
            borderRadius: size * 0.08,
            backgroundColor: 'rgba(255,255,255,0.6)',
          }}
        />
      </View>
      <View style={{ width: size * 0.26, height: size * 0.1, marginTop: size * 0.04, borderRadius: size * 0.03, backgroundColor: accent + '99' }} />
      <View style={{ width: size * 0.18, height: size * 0.07, marginTop: size * 0.02, borderRadius: size * 0.03, backgroundColor: accent + '66' }} />
    </View>
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

    // Daily / Weekly events break the grid rhythm as full-width gold banner
    // rows — medallion left, copy left-aligned, stat chip on the right.
    if (special) {
      return (
        <Pressable
          key={mode.id}
          style={({ pressed }) => [
            styles.bannerCard,
            accessible
              ? [{ borderColor: COLORS.gold + '66' }, SHADOWS.glow(COLORS.gold)]
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
              colors={[COLORS.gold + '26', 'transparent'] as [string, string]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          )}
          {accessible && (
            <View style={[styles.bannerEdge, SHADOWS.neonEdge(COLORS.gold)]} />
          )}
          <DrawnMedallion
            accent={accessible ? accent : COLORS.gold}
            size={52}
            shape="squircle"
            muted={!accessible}
          >
            {accessible ? (
              <ModeGlyph modeId={mode.id} accent={accent} size={26} />
            ) : (
              <LockGlyph size={22} accent={COLORS.gold} />
            )}
          </DrawnMedallion>
          <View style={styles.bannerBody}>
            <Text style={styles.bannerEyebrow}>
              {mode.id === 'daily' ? 'DAILY EVENT' : 'WEEKLY EVENT'}
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
          <DrawnMedallion
            accent={accessible ? accent : COLORS.gold}
            size={48}
            shape="squircle"
            muted={!accessible}
            style={styles.medallion}
          >
            {accessible ? (
              <ModeGlyph modeId={mode.id} accent={accent} size={24} />
            ) : (
              <LockGlyph size={22} accent={COLORS.gold} />
            )}
          </DrawnMedallion>
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
    minHeight: 184,
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
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  medallion: {
    marginBottom: 10,
  },
  cardName: {
    fontSize: 15,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 6,
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
