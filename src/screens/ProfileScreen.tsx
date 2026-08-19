import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, FONTS, SHADOWS, RADIUS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import PrimaryButton from '../components/common/PrimaryButton';
import NeonProgressBar from '../components/common/NeonProgressBar';
import { bentoPanel, bentoDividerColor } from '../styles/bentoPanel';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { Skeleton, SkeletonCard, SkeletonGrid } from '../components/common/Skeleton';
import {
  usePlayerStore,
  usePlayerActions,
  selectAchievementIds,
  selectCurrentLevel,
  selectEquippedTitle,
  selectPuzzlesSolved,
  selectTotalStars,
  selectStreaks,
  selectPerfectSolves,
  selectTotalScore,
  selectEquippedFrame,
  selectEquippedTheme,
  selectPrestige,
  selectCollections,
} from '../stores/playerStore';
import { ACHIEVEMENTS, AchievementDef } from '../data/achievements';
import { ATLAS_PAGES, SEASONAL_ALBUMS, getCurrentSeasonAlbum } from '../data/collections';
import {
  PROFILE_FRAMES,
  COSMETIC_THEMES,
  getTheme,
  getFrame,
  getTitleLabel,
} from '../data/cosmetics';
import { getRemoteBoolean } from '../services/remoteConfig';
import { ProfileFrameArt } from '../components/cosmetics/ProfileFrameArt';
import { resolveFrameArt } from '../components/cosmetics/frameArtCatalog';
import { AchievementBadge } from '../components/cosmetics/AchievementBadge';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import AvatarPortrait from '../components/cosmetics/AvatarPortrait';
import { gradId, shade } from '../components/icons/IconBase';
import GameIcon, { GameIconName } from '../components/icons/GameIcon';
import {
  canPrestige,
  getPrestigeRewards,
  getPrestigeSummary,
  getPrestigeXpMultiplier,
  getPrestigeCoinMultiplier,
  getPrestigeGemMultiplier,
  PRESTIGE_LEVELS,
} from '../data/prestigeSystem';

interface PlayerData {
  name: string;
  level: number;
  title: string;
  puzzlesSolved: number;
  totalStars: number;
  bestStreak: number;
  currentStreak: number;
  perfectSolves: number;
  totalScore: number;
  badges: Array<{ id: string; name: string; icon: string }>;
  atlasProgress: number;
  tilesProgress: number;
  stampsProgress: number;
  equippedCosmetics: {
    frame?: string;
    trail?: string;
    theme?: string;
  };
}

interface ProfileScreenProps {
  player?: any;
  onEditProfile?: () => void;
  onOpenSettings?: () => void;
  /**
   * Opens the Clubs screen. ClubScreen was registered in the Profile stack
   * but NOTHING navigated to it — the entire social layer (club goals,
   * shared goals, chat, gift inbox, browse-clubs) was reachable only by
   * following someone else's invite deep link. Onboarding's economy primer
   * even teaches the player what Clubs are, so the game explained a feature
   * it then gave no way to open.
   */
  onOpenClub?: () => void;
  onOpenMastery?: () => void;
}

const DEFAULT_PLAYER: PlayerData = {
  name: 'Player',
  level: 1,
  title: 'Wordsmith',
  puzzlesSolved: 0,
  totalStars: 0,
  bestStreak: 0,
  currentStreak: 0,
  perfectSolves: 0,
  totalScore: 0,
  badges: [],
  atlasProgress: 0,
  tilesProgress: 0,
  stampsProgress: 0,
  equippedCosmetics: {},
};

// Each stat owns an accent so the dashboard reads as a set of crafted gem
// tiles (per the AAA audit) instead of a monochrome web grid. Icons are
// drawn View glyphs (see the glyph kit below), never emoji.
const STAT_CARDS = [
  { key: 'puzzlesSolved', label: 'Puzzles Solved', accent: COLORS.green, family: 'progress' },
  { key: 'totalStars', label: 'Total Stars', accent: COLORS.gold, family: 'reward' },
  { key: 'currentStreak', label: 'Current Streak', accent: COLORS.orange, family: 'streak' },
  { key: 'bestStreak', label: 'Best Streak', accent: COLORS.accent, family: 'streak' },
  { key: 'perfectSolves', label: 'Perfect Solves', accent: COLORS.cyan, family: 'mastery' },
  { key: 'totalScore', label: 'Total Score', accent: COLORS.purple, family: 'reward' },
  { key: 'level', label: 'Current Level', accent: COLORS.teal, family: 'progress' },
] as const;

type StatFamily = (typeof STAT_CARDS)[number]['family'];
type StatOrnamentKind = 'notch' | 'facet' | 'chevrons' | 'pips';

/**
 * Metric families. Icon hue alone made the six tiles one repeated rectangle,
 * so each family now owns a distinct wash DIRECTION and undertone (progress
 * falls, streak heat rises from the base, reward runs warm on the diagonal,
 * mastery reads cold from the top-right), plus its own corner ornament and
 * hairline-rule width. Two tiles of the same family are meant to rhyme.
 */
const STAT_FAMILY_STYLE: Record<
  StatFamily,
  {
    wash: (accent: string) => [string, string, string];
    start: { x: number; y: number };
    end: { x: number; y: number };
    ornament: StatOrnamentKind;
    ruleWidth: `${number}%`;
  }
> = {
  progress: {
    wash: (a) => [a + '2b', 'rgba(30,14,58,0.90)', 'rgba(20,8,38,0.96)'],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
    ornament: 'pips',
    ruleWidth: '58%',
  },
  reward: {
    wash: (a) => [a + '2e', 'rgba(70,42,12,0.34)', 'rgba(24,10,44,0.95)'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    ornament: 'facet',
    ruleWidth: '44%',
  },
  streak: {
    wash: (a) => ['rgba(24,10,44,0.95)', a + '1c', a + '3a'],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
    ornament: 'chevrons',
    ruleWidth: '34%',
  },
  mastery: {
    wash: (a) => [a + '32', 'rgba(16,42,64,0.40)', 'rgba(22,9,42,0.95)'],
    start: { x: 1, y: 0 },
    end: { x: 0, y: 1 },
    ornament: 'notch',
    ruleWidth: '50%',
  },
};

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

/** Drawn 2x2 letter-tile grid — the puzzle-count mark. */
function TileGridGlyph({ size = 20, accent = COLORS.green }: { size?: number; accent?: string }) {
  const cell = size * 0.44;
  const tile = (filled: boolean, key: number) => (
    <View
      key={key}
      style={{
        width: cell,
        height: cell,
        borderRadius: cell * 0.24,
        overflow: 'hidden',
        borderWidth: filled ? 0 : 1,
        borderColor: accent + '88',
        backgroundColor: filled ? undefined : 'rgba(255,255,255,0.06)',
      }}
    >
      {filled && (
        <LinearGradient
          colors={[accent, accent + '99']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
    </View>
  );
  return (
    <View style={{ width: size, height: size, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {tile(true, 0)}
        {tile(false, 1)}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {tile(false, 2)}
        {tile(true, 3)}
      </View>
    </View>
  );
}

/** Drawn 8-point star burst — two crossed gradient squares + hot core. */
function StarBurstGlyph({ size = 20, accent = COLORS.gold }: { size?: number; accent?: string }) {
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

/** Drawn flame — layered gradient teardrops (streak). */
function FlameGlyph({ size = 20 }: { size?: number }) {
  const tear = (d: number, colors: readonly [string, string], dy: number, key: number) => (
    <View
      key={key}
      style={{
        position: 'absolute',
        bottom: dy,
        width: d,
        height: d,
        borderRadius: d / 2,
        borderTopLeftRadius: 0,
        overflow: 'hidden',
        transform: [{ rotate: '45deg' }],
      }}
    >
      <LinearGradient
        colors={[...colors]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      {tear(size * 0.76, [COLORS.orange, COLORS.coral], size * 0.04, 0)}
      {tear(size * 0.42, [COLORS.goldLight, COLORS.orange], size * 0.1, 1)}
    </View>
  );
}

/** Drawn trophy — gradient cup, ring handles, stem + base. */
function TrophyGlyph({ size = 20, accent = COLORS.gold }: { size?: number; accent?: string }) {
  const handle = (side: 'left' | 'right') => (
    <View
      style={{
        position: 'absolute',
        top: size * 0.06,
        ...(side === 'left' ? { left: 0 } : { right: 0 }),
        width: size * 0.3,
        height: size * 0.3,
        borderRadius: size * 0.15,
        borderWidth: size * 0.07,
        borderColor: accent + 'B3',
      }}
    />
  );
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      {handle('left')}
      {handle('right')}
      <View
        style={{
          width: size * 0.56,
          height: size * 0.46,
          borderTopLeftRadius: size * 0.08,
          borderTopRightRadius: size * 0.08,
          borderBottomLeftRadius: size * 0.3,
          borderBottomRightRadius: size * 0.3,
          overflow: 'hidden',
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
            position: 'absolute',
            top: size * 0.05,
            left: size * 0.08,
            width: size * 0.12,
            height: size * 0.2,
            borderRadius: size * 0.06,
            backgroundColor: 'rgba(255,255,255,0.4)',
          }}
        />
      </View>
      <View style={{ width: size * 0.12, height: size * 0.14, backgroundColor: accent + 'CC' }} />
      <View style={{ width: size * 0.44, height: size * 0.1, borderRadius: size * 0.04, backgroundColor: accent }} />
    </View>
  );
}

/** Drawn faceted diamond — rotated gradient square with facet highlight. */
function DiamondGlyph({ size = 20, accent = COLORS.cyan }: { size?: number; accent?: string }) {
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

/** Drawn lightning bolt — two skewed gradient bars forming the zigzag. */
function BoltGlyph({ size = 20, accent = COLORS.purple }: { size?: number; accent?: string }) {
  const bar = (left: number, top: number) => ({
    position: 'absolute' as const,
    left,
    top,
    width: size * 0.34,
    height: size * 0.52,
    borderRadius: size * 0.07,
    overflow: 'hidden' as const,
    transform: [{ skewX: '-16deg' }],
  });
  return (
    <View style={{ width: size, height: size }}>
      <View style={bar(size * 0.38, 0)}>
        <LinearGradient
          colors={[accent, accent + 'B3']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View style={bar(size * 0.2, size * 0.46)}>
        <LinearGradient
          colors={[accent + 'B3', accent + '66']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    </View>
  );
}

/** Drawn rising chevron stack (level). */
function ChevronStackGlyph({ size = 20, accent = COLORS.teal }: { size?: number; accent?: string }) {
  const c = size * 0.5;
  const chev = (top: number, opacity: number, key: number) => (
    <View
      key={key}
      style={{
        position: 'absolute',
        top,
        alignSelf: 'center',
        width: c,
        height: c,
        borderTopWidth: size * 0.12,
        borderRightWidth: size * 0.12,
        borderColor: accent,
        opacity,
        transform: [{ rotate: '-45deg' }],
      }}
    />
  );
  return (
    <View style={{ width: size, height: size }}>
      {chev(size * 0.08, 1, 0)}
      {chev(size * 0.42, 0.5, 1)}
    </View>
  );
}

/** Drawn gear — four tooth bars + ring core (settings). */
function GearGlyph({ size = 18, accent = COLORS.textSecondary }: { size?: number; accent?: string }) {
  const tooth = {
    position: 'absolute' as const,
    width: size,
    height: size * 0.24,
    borderRadius: size * 0.08,
    backgroundColor: accent,
  };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={tooth} />
      <View style={[tooth, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[tooth, { transform: [{ rotate: '90deg' }] }]} />
      <View style={[tooth, { transform: [{ rotate: '135deg' }] }]} />
      <View
        style={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: size * 0.31,
          backgroundColor: accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: size * 0.26, height: size * 0.26, borderRadius: size * 0.13, backgroundColor: 'rgba(8,2,22,0.9)' }} />
      </View>
    </View>
  );
}

/** Drawn nested frame squares (frame cosmetic). */
function NestedSquaresGlyph({ size = 18, accent = COLORS.purple }: { size?: number; accent?: string }) {
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

/** Drawn label tag — rotated gradient square with punched hole (title). */
function TagGlyph({ size = 18, accent = COLORS.gold }: { size?: number; accent?: string }) {
  const d = size * 0.62;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: d,
          height: d,
          borderRadius: size * 0.12,
          overflow: 'hidden',
          transform: [{ rotate: '45deg' }],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LinearGradient
          colors={[accent, accent + '8C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            width: size * 0.16,
            height: size * 0.16,
            borderRadius: size * 0.08,
            backgroundColor: 'rgba(8,2,22,0.8)',
            transform: [{ translateX: -size * 0.11 }, { translateY: -size * 0.11 }],
          }}
        />
      </View>
    </View>
  );
}

/** Drawn medal — crossed ribbon straps over a gold disc (mastery / best). */
function MedalGlyph({ size = 20, accent = COLORS.gold }: { size?: number; accent?: string }) {
  const strap = (rot: string, left: number, color: string) => (
    <View
      style={{
        position: 'absolute',
        top: -size * 0.02,
        left,
        width: size * 0.2,
        height: size * 0.48,
        borderRadius: size * 0.05,
        backgroundColor: color,
        transform: [{ rotate: rot }],
      }}
    />
  );
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      {strap('20deg', size * 0.24, COLORS.accent + 'CC')}
      {strap('-20deg', size * 0.56, COLORS.purple + 'CC')}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          width: size * 0.58,
          height: size * 0.58,
          borderRadius: size * 0.29,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LinearGradient
          colors={[COLORS.goldLight, accent]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            width: size * 0.32,
            height: size * 0.32,
            borderRadius: size * 0.16,
            borderWidth: size * 0.05,
            borderColor: 'rgba(8,2,22,0.4)',
          }}
        />
      </View>
    </View>
  );
}

/** Drawn duo silhouette — two heads + shoulders (clubs). */
function UsersGlyph({ size = 20, accent = COLORS.teal }: { size?: number; accent?: string }) {
  const person = (left: number, scale: number, back: boolean) => (
    <View style={{ position: 'absolute', bottom: 0, left, alignItems: 'center', opacity: back ? 0.55 : 1 }}>
      <View
        style={{
          width: size * 0.32 * scale,
          height: size * 0.32 * scale,
          borderRadius: size * 0.16 * scale,
          backgroundColor: accent,
          marginBottom: size * 0.03,
        }}
      />
      <View
        style={{
          width: size * 0.5 * scale,
          height: size * 0.28 * scale,
          borderTopLeftRadius: size * 0.25,
          borderTopRightRadius: size * 0.25,
          backgroundColor: accent,
        }}
      />
    </View>
  );
  return (
    <View style={{ width: size, height: size }}>
      {person(0, 0.85, true)}
      {person(size * 0.32, 1, false)}
    </View>
  );
}

/** Per-stat drawn glyph in the stat's accent color. */
function StatGlyph({ statKey, accent, size }: { statKey: string; accent: string; size: number }) {
  switch (statKey) {
    case 'puzzlesSolved':
      return <TileGridGlyph size={size} accent={accent} />;
    case 'totalStars':
      return <StarBurstGlyph size={size} accent={accent} />;
    case 'currentStreak':
      return <FlameGlyph size={size} />;
    case 'bestStreak':
      return <TrophyGlyph size={size} accent={accent} />;
    case 'perfectSolves':
      return <DiamondGlyph size={size} accent={accent} />;
    case 'totalScore':
      return <BoltGlyph size={size} accent={accent} />;
    case 'level':
    default:
      return <ChevronStackGlyph size={size} accent={accent} />;
  }
}

/**
 * Top-right corner mark, one per metric family. Small enough to stay quiet at
 * a 31%-wide tile, distinct enough that the families sort themselves out
 * peripherally without reading a single label.
 */
function StatOrnament({ kind, accent }: { kind: StatOrnamentKind; accent: string }) {
  switch (kind) {
    case 'facet':
      return (
        <View style={styles.statOrnSlot} pointerEvents="none">
          <View style={[styles.statOrnFacet, { borderColor: accent + 'b3' }]} />
        </View>
      );
    case 'chevrons':
      return (
        <View style={styles.statOrnSlot} pointerEvents="none">
          <View style={[styles.statOrnChevron, { borderColor: accent + 'cc' }]} />
          <View
            style={[styles.statOrnChevron, { borderColor: accent + '59', marginTop: -1 }]}
          />
        </View>
      );
    case 'pips':
      return (
        <View style={[styles.statOrnSlot, styles.statOrnPipRow]} pointerEvents="none">
          <View style={[styles.statOrnPip, { backgroundColor: accent + 'cc' }]} />
          <View style={[styles.statOrnPip, { backgroundColor: accent + '80' }]} />
          <View style={[styles.statOrnPip, { backgroundColor: accent + '3d' }]} />
        </View>
      );
    case 'notch':
    default:
      return (
        <View style={styles.statOrnSlot} pointerEvents="none">
          <View
            style={[
              styles.statOrnNotch,
              { borderTopColor: accent + 'a6', borderRightColor: accent + 'a6' },
            ]}
          />
        </View>
      );
  }
}

// ─── Prestige tier marks — one distinct SVG mark per prestige tier ──────────

/** Tier metal per prestige level: bronze / silver / gold / diamond / legendary. */
const PRESTIGE_TIER_COLORS: Record<number, string> = {
  1: COLORS.tierBronze,
  2: COLORS.tierSilver,
  3: COLORS.tierGold,
  4: COLORS.cyan,
  5: COLORS.accent,
};

// ─── Struck-medal geometry (viewBox 0 0 100 100, medal centred at 50,48) ────
// The medallion is minted, not printed: an outer bezel band that catches light
// along its upper-left, a field recessed BELOW it (gradient inverted so the
// eye reads a dish), an inner raised ring, laurels standing proud of the
// field, and the tier numeral cut INTO it. Every layer is a ring/offset pair,
// which is what survives the shrink to 40px where blur-based relief dies.

/** Laurel leaf anchors on the LEFT branch: [cx, cy, rotationDeg]. */
const LAUREL_LEAVES = [
  [26.5, 61.0, -42],
  [23.4, 53.5, -32],
  [22.1, 45.5, -20],
  [22.9, 37.5, -8],
] as const;

/** Left laurel stem; the right branch mirrors it about x = 50. */
const LAUREL_STEM = 'M29.5 67.5 C23.6 59.4 21.4 45.8 24.6 33.4';

/**
 * Specular hits along the bezel band (r ≈ 41), each ellipse rotated onto the
 * local tangent so the highlights ride the ring instead of floating on it.
 */
const BEZEL_SPECULARS = [
  { cx: 26.5, cy: 14.4, rx: 9.4, ry: 3.1, rot: -35, o: 0.88 },
  { cx: 12.8, cy: 30.7, rx: 5.4, ry: 2.3, rot: -65, o: 0.55 },
  { cx: 67.3, cy: 10.8, rx: 5.0, ry: 2.1, rot: 25, o: 0.5 },
  { cx: 76.4, cy: 79.4, rx: 6.6, ry: 2.5, rot: -40, o: 0.34 },
] as const;

/** Roman numeral composition per prestige tier. */
const NUMERAL_GLYPHS: Record<number, ReadonlyArray<'I' | 'V'>> = {
  1: ['I'],
  2: ['I', 'I'],
  3: ['I', 'I', 'I'],
  4: ['I', 'V'],
  5: ['V'],
};

/** Serifed slab strokes — drawn, never typeset, so no font ships with them. */
const GLYPH_PATH = {
  I: 'M-3.8 -13 H3.8 M0 -13 V13 M-3.8 13 H3.8',
  V: 'M-8.5 -13 L0 13 L8.5 -13',
} as const;
const GLYPH_WIDTH = { I: 7.6, V: 17 } as const;
const GLYPH_GAP = 4;

/** Centre the numeral's glyph run on x = 0; caller translates to the field. */
function numeralLayout(tier: number): Array<{ g: 'I' | 'V'; x: number }> {
  const glyphs = NUMERAL_GLYPHS[tier] ?? NUMERAL_GLYPHS[1];
  const total =
    glyphs.reduce((sum, g) => sum + GLYPH_WIDTH[g], 0) + GLYPH_GAP * (glyphs.length - 1);
  let cursor = -total / 2;
  return glyphs.map((g) => {
    const x = cursor + GLYPH_WIDTH[g] / 2;
    cursor += GLYPH_WIDTH[g] + GLYPH_GAP;
    return { g, x };
  });
}

/** One laurel branch in relief: a dark under-copy offset down-right, then the lit copy. */
function LaurelBranch({ metal, mirrored }: { metal: string; mirrored?: boolean }) {
  const lit = shade(metal, 62);
  const body = shade(metal, 8);
  const cast = shade(metal, -74);
  const flip = mirrored ? 'translate(100, 0) scale(-1, 1)' : undefined;
  return (
    <G transform={flip} opacity={0.95}>
      {/* Cast copy — offset down-right; this is the whole relief illusion. */}
      <G transform="translate(1.1, 1.2)" opacity={0.75}>
        <Path d={LAUREL_STEM} stroke={cast} strokeWidth={2.2} strokeLinecap="round" fill="none" />
        {LAUREL_LEAVES.map(([cx, cy, rot], i) => (
          <Ellipse
            key={`c${i}`}
            cx={cx}
            cy={cy}
            rx={4.6}
            ry={2.3}
            fill={cast}
            transform={`rotate(${rot}, ${cx}, ${cy})`}
          />
        ))}
      </G>
      <Path d={LAUREL_STEM} stroke={body} strokeWidth={1.9} strokeLinecap="round" fill="none" />
      {LAUREL_LEAVES.map(([cx, cy, rot], i) => (
        <React.Fragment key={i}>
          <Ellipse
            cx={cx}
            cy={cy}
            rx={4.6}
            ry={2.3}
            fill={body}
            stroke={cast}
            strokeWidth={0.45}
            transform={`rotate(${rot}, ${cx}, ${cy})`}
          />
          {/* Upper-left facet of each leaf — the struck highlight. */}
          <Ellipse
            cx={cx - 0.7}
            cy={cy - 0.7}
            rx={2.6}
            ry={0.95}
            fill={lit}
            opacity={0.85}
            transform={`rotate(${rot}, ${cx}, ${cy})`}
          />
        </React.Fragment>
      ))}
    </G>
  );
}

/**
 * The tier numeral, genuinely engraved: a dark wall on the upper-left of the
 * groove, a bright catch on its lower-right lip, and a dim interior between
 * them. Three offset passes of the same stroke, in that order.
 */
function EngravedNumeral({ tier, metal }: { tier: number; metal: string }) {
  const layout = numeralLayout(tier);
  const passes = [
    { dx: -1.2, dy: -1.3, color: shade(metal, -96), w: 5.4, o: 0.92 },
    { dx: 1.4, dy: 1.5, color: shade(metal, 118), w: 5.4, o: 0.72 },
    { dx: 0, dy: 0, color: shade(metal, -58), w: 4, o: 1 },
  ] as const;
  return (
    <G>
      {passes.map((pass, pi) =>
        layout.map(({ g, x }, gi) => (
          <Path
            key={`${pi}-${gi}`}
            d={GLYPH_PATH[g]}
            transform={`translate(${50 + x + pass.dx}, ${49 + pass.dy})`}
            stroke={pass.color}
            strokeWidth={pass.w}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={pass.o}
            fill="none"
          />
        )),
      )}
    </G>
  );
}

/**
 * PrestigeMedal — the headline unlockable, struck rather than printed.
 *
 * Layer order (all in one 100×100 viewBox so it holds together at 40px and
 * 62px alike): cast shadow → raised outer bezel with bevelled arcs → recessed
 * field (gradient INVERTED against the bezel, which is what makes the eye read
 * a dish) → inner raised ring → laurels in relief → engraved tier numeral →
 * specular hits riding the bezel tangent.
 */
function PrestigeMedal({
  level,
  size = 62,
  style,
}: {
  level: number;
  size?: number;
  style?: object;
}) {
  const tier = Math.max(1, Math.min(PRESTIGE_LEVELS.length, level));
  const metal = PRESTIGE_TIER_COLORS[tier] ?? COLORS.gold;
  const ids = useMemo(() => {
    const n = gradId('medal');
    return { bezel: `${n}-b`, field: `${n}-f`, ring: `${n}-r` };
  }, []);
  const edge = shade(metal, -88);
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          shadowColor: metal,
          shadowOffset: { width: 0, height: size * 0.05 },
          shadowOpacity: 0.6,
          shadowRadius: size * 0.24,
          elevation: 9,
        },
        style ?? null,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* Raised: lit at the top, falling into shadow at the base. */}
          <SvgLinearGradient id={ids.bezel} x1="0.25" y1="0" x2="0.75" y2="1">
            <Stop offset="0" stopColor={shade(metal, 104)} />
            <Stop offset="0.42" stopColor={shade(metal, 26)} />
            <Stop offset="1" stopColor={shade(metal, -72)} />
          </SvgLinearGradient>
          {/* Recessed: the same ramp inverted, so the field sits below. */}
          <SvgLinearGradient id={ids.field} x1="0.3" y1="0" x2="0.7" y2="1">
            <Stop offset="0" stopColor={shade(metal, -54)} />
            <Stop offset="0.55" stopColor={shade(metal, 4)} />
            <Stop offset="1" stopColor={shade(metal, 60)} />
          </SvgLinearGradient>
          <SvgLinearGradient id={ids.ring} x1="0.3" y1="0" x2="0.7" y2="1">
            <Stop offset="0" stopColor={shade(metal, 116)} />
            <Stop offset="1" stopColor={shade(metal, -46)} />
          </SvgLinearGradient>
        </Defs>

        {/* Cast shadow onto the card. */}
        <Circle cx={50} cy={56} r={44.5} fill="rgba(6,1,16,0.55)" />
        <Circle cx={50} cy={53} r={44.5} fill="rgba(6,1,16,0.32)" />

        {/* Outer bezel + its rim line. */}
        <Circle cx={50} cy={48} r={45} fill={`url(#${ids.bezel})`} stroke={edge} strokeWidth={1.3} />
        {/* Bevel: bright along the upper-left arc, dark along the lower-right. */}
        <Path
          d="M13.1 73.8 A45 45 0 0 1 69 7.2"
          stroke="rgba(255,255,255,0.62)"
          strokeWidth={2.1}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M86.9 22.2 A45 45 0 1 1 31 88.8"
          stroke="rgba(24,8,0,0.42)"
          strokeWidth={2.1}
          strokeLinecap="round"
          fill="none"
        />

        {/* Recessed field, with a hard inner shoulder where the bezel drops. */}
        <Circle cx={50} cy={48} r={37} fill={`url(#${ids.field})`} />
        <Path
          d="M19.7 69.2 A37 37 0 0 1 65.6 14.5"
          stroke="rgba(22,8,0,0.5)"
          strokeWidth={1.9}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M80.3 26.8 A37 37 0 1 1 34.4 81.5"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />

        {/* Inner raised ring around the field proper. */}
        <Circle
          cx={50}
          cy={48}
          r={32}
          fill="none"
          stroke={`url(#${ids.ring})`}
          strokeWidth={2.6}
        />
        <Circle cx={50} cy={48} r={33.5} fill="none" stroke={edge} strokeWidth={0.7} opacity={0.55} />
        <Circle cx={50} cy={48} r={30.4} fill="none" stroke={edge} strokeWidth={0.7} opacity={0.4} />

        <LaurelBranch metal={metal} />
        <LaurelBranch metal={metal} mirrored />
        <EngravedNumeral tier={tier} metal={metal} />

        {BEZEL_SPECULARS.map((s, i) => (
          <Ellipse
            key={i}
            cx={s.cx}
            cy={s.cy}
            rx={s.rx}
            ry={s.ry}
            fill="#fffdf4"
            opacity={s.o}
            transform={`rotate(${s.rot}, ${s.cx}, ${s.cy})`}
          />
        ))}
      </Svg>
    </View>
  );
}

/**
 * Iconized prestige benefits — replaces the old dot-separated paragraph on
 * the prestige CTA with three compact, scannable rows.
 */
/**
 * Achievement plate fill. GRADIENTS.surfaceCard (rgba(45,20,82,.88) →
 * rgba(26,10,46,.92)) sat within a few percent of the nebula background, which
 * is what collapsed the badge grid to near-zero contrast; these are opaque and
 * markedly lighter so each card reads as a plate.
 */
const ACHIEVEMENT_PLATE = ['#41246e', '#31174f', '#251038'] as const;

/** Faint tier tint layered over the plate on earned cards. */
const ACHIEVEMENT_TIER_WASH: Record<string, readonly [string, string]> = {
  bronze: ['rgba(212,137,58,0.26)', 'rgba(212,137,58,0.05)'],
  silver: ['rgba(208,216,232,0.24)', 'rgba(208,216,232,0.04)'],
  gold: ['rgba(255,184,0,0.28)', 'rgba(255,184,0,0.05)'],
};

const PRESTIGE_BENEFITS: Array<{ icon: GameIconName; label: string }> = [
  { icon: 'undo', label: 'Reset to Level 1' },
  { icon: 'crown', label: 'Keep all cosmetics' },
  { icon: 'bolt', label: 'Permanent bonuses' },
];

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  player: playerProp,
  onEditProfile: onEditProfileProp,
  onOpenSettings: onOpenSettingsProp,
  onOpenClub: onOpenClubProp,
  onOpenMastery: onOpenMasteryProp,
}) => {
  const [loading, setLoading] = useState(true);
  // Narrow zustand subscriptions — ProfileScreen reads many slices but rarely
  // triggers writes; selector-based subscription drops re-renders on
  // unrelated player state churn (currency, ceremonies, etc.).
  const achievementIds = usePlayerStore(selectAchievementIds);
  const currentLevel = usePlayerStore(selectCurrentLevel);
  const equippedTitle = usePlayerStore(selectEquippedTitle);
  const puzzlesSolved = usePlayerStore(selectPuzzlesSolved);
  const totalStars = usePlayerStore(selectTotalStars);
  const playerStreaks = usePlayerStore(selectStreaks);
  const perfectSolves = usePlayerStore(selectPerfectSolves);
  const totalScore = usePlayerStore(selectTotalScore);
  const equippedFrameId = usePlayerStore(selectEquippedFrame);
  const equippedThemeId = usePlayerStore(selectEquippedTheme);
  const prestige = usePlayerStore(selectPrestige);
  const playerActions = usePlayerActions();
  const onEditProfile = onEditProfileProp ?? (() => {});
  const onOpenSettings = onOpenSettingsProp ?? (() => {});
  const onOpenClub = onOpenClubProp ?? null;
  // `clubsEnabled` was a declared Remote Config key that nothing read, so the
  // most incident-prone feature in the app (Cloud Functions, member chat,
  // Perspective-API moderation, collective goals) had no off switch. Defaults
  // true — this only matters the day something needs darkening.
  const clubsVisible = Boolean(onOpenClub) && getRemoteBoolean('clubsEnabled');
  const onOpenMastery = onOpenMasteryProp ?? (() => {});

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);
  const achievementIdsSet = useMemo(
    () => new Set(achievementIds),
    [achievementIds],
  );
  const achievementsViewData = useMemo(
    () =>
      ACHIEVEMENTS.map((achievement: AchievementDef) => {
        const earnedLevels = achievement.tiers
          .filter((tier) => achievementIdsSet.has(`${achievement.id}_${tier.level}`))
          .map((tier) => tier.level);
        const highestTier = earnedLevels[earnedLevels.length - 1] ?? null;
        const tierColor = highestTier === 'gold' ? COLORS.tierGold
          : highestTier === 'silver' ? COLORS.tierSilver
          : highestTier === 'bronze' ? COLORS.tierBronze
          : 'rgba(255,255,255,0.15)';

        return {
          achievement,
          highestTier,
          tierColor,
          earnedLevels,
        };
      }),
    [achievementIdsSet],
  );
  const collections = usePlayerStore(selectCollections);
  // The three collection percentages were props nothing ever passed — the
  // card showed 0% for every player forever. Compute from live state.
  const collectionPcts = useMemo(() => {
    const atlasFound = Object.values(collections?.atlasPages ?? {}).reduce(
      (n, words) => n + (words?.length ?? 0),
      0,
    );
    const atlasTotal = ATLAS_PAGES.reduce((n, page) => n + page.words.length, 0);
    const tilesFound = Object.entries(collections?.rareTiles ?? {}).filter(
      ([, count]) => (count as number) > 0,
    ).length;
    const album = getCurrentSeasonAlbum() ?? SEASONAL_ALBUMS[0];
    const stampsEarned = (
      (collections?.seasonalStamps as Record<string, number[]> | undefined)?.[album.id] ?? []
    ).length;
    const pct = (found: number, total: number) =>
      total > 0 ? Math.round((found / total) * 100) : 0;
    return {
      atlasProgress: pct(atlasFound, atlasTotal),
      tilesProgress: pct(tilesFound, 26),
      stampsProgress: pct(stampsEarned, album.stamps.length),
    };
  }, [collections]);
  const contextPlayer = useMemo(
    () => ({
      level: currentLevel,
      title: getTitleLabel(equippedTitle),
      puzzlesSolved,
      totalStars,
      bestStreak: playerStreaks.bestStreak,
      currentStreak: playerStreaks.currentStreak,
      perfectSolves,
      totalScore,
      ...collectionPcts,
      badges: achievementIds.map((id: string) => ({ id, name: id, icon: '\u{1F3C5}' })),
      equippedCosmetics: {
        frame: equippedFrameId,
        theme: equippedThemeId,
      },
    }),
    [
      currentLevel,
      equippedTitle,
      puzzlesSolved,
      totalStars,
      playerStreaks.bestStreak,
      playerStreaks.currentStreak,
      perfectSolves,
      totalScore,
      achievementIds,
      equippedFrameId,
      equippedThemeId,
      collectionPcts,
    ],
  );
  const p: PlayerData = useMemo(
    () => ({ ...DEFAULT_PLAYER, ...contextPlayer, ...playerProp }),
    [contextPlayer, playerProp],
  );
  const initial = useMemo(() => p.name.charAt(0).toUpperCase(), [p.name]);
  // The single biggest number gets the metallic treatment, so the stat block
  // has a focal point instead of six equal-weight rectangles.
  const topStatKey = useMemo<string | null>(() => {
    let bestKey: string | null = null;
    let bestVal = 0;
    for (const stat of STAT_CARDS) {
      const raw = Number((p as any)[stat.key] ?? 0);
      if (Number.isFinite(raw) && raw > bestVal) {
        bestVal = raw;
        bestKey = stat.key;
      }
    }
    return bestKey;
  }, [p]);

  // Achievement badges must FILL their card, not float inside it. The grid is
  // 3 columns of `achievementCard` (width 31%) inside the scaffold's 16px
  // content padding, so derive the art size from the real card width and
  // leave only ~28px of breathing room, then clamp for phone/tablet extremes.
  const { width: windowWidth } = useWindowDimensions();
  const achievementBadgeSize = useMemo(() => {
    const cardWidth = (windowWidth - 32) * 0.31;
    return Math.round(Math.max(56, Math.min(84, cardWidth - 28)));
  }, [windowWidth]);
  const equippedTheme = useMemo(
    () => getTheme(equippedThemeId) ?? COSMETIC_THEMES[0],
    [equippedThemeId],
  );
  const equippedFrame = useMemo(
    () => getFrame(equippedFrameId) ?? PROFILE_FRAMES[0],
    [equippedFrameId],
  );
  const frameBorderColor = useMemo(() => {
    switch (equippedFrame.rarity) {
      case 'legendary':
        return COLORS.rarityLegendary;
      case 'epic':
        return COLORS.rarityEpic;
      case 'rare':
        return COLORS.rarityRare;
      default:
        return COLORS.rarityCommon;
    }
  }, [equippedFrame.rarity]);
  // The portrait backdrop borrows the equipped frame's own art accent (the
  // same hue its ring is drawn in) so avatar and ring read as one object.
  const equippedFrameAccent = useMemo(
    () => resolveFrameArt(equippedFrameId).accent,
    [equippedFrameId],
  );
  // Bespoke SVG ring art for the equipped frame; its accent drives the glow
  // shadow so a flame frame glows ember-orange, a circuit frame cyan, etc.
  const frameArt = useMemo(() => resolveFrameArt(equippedFrameId), [equippedFrameId]);

  // MG3 in launch_blockers.md: animated glow for legendary frames.
  // Pulses scale 1.00 ↔ 1.04 and shadow opacity 0.6 ↔ 1.0 on a 1400ms
  // cycle. Respects reduce-motion — when enabled the ring is static.
  // Focus-gated like the backdrops: ProfileScreen stays mounted beneath
  // pushed screens, and an unfocused withRepeat would keep mutating the
  // shared value (and re-blurring the shadow) every frame while invisible.
  const reduceMotion = useReduceMotion();
  const isFocused = useIsFocused();
  const isLegendary = equippedFrame.rarity === 'legendary';
  const glowPulse = useSharedValue(0);
  useEffect(() => {
    if (!isLegendary || reduceMotion || !isFocused) {
      cancelAnimation(glowPulse);
      glowPulse.value = 0;
      return;
    }
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0, { duration: 700 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(glowPulse);
  }, [isLegendary, reduceMotion, isFocused, glowPulse]);

  const animatedRingStyle = useAnimatedStyle(() => {
    if (!isLegendary || reduceMotion) {
      return { transform: [{ scale: 1 }], shadowOpacity: 0.6 };
    }
    const scale = 1 + glowPulse.value * 0.04;
    const shadowOpacity = 0.6 + glowPulse.value * 0.4;
    return { transform: [{ scale }], shadowOpacity };
  });

  // Settings gear as a glass header button — same material as the
  // scaffold's back button, never a bare emoji floating in the header.
  const settingsButton = (
    <Pressable
      onPress={onOpenSettings}
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      hitSlop={8}
      style={({ pressed }) => [styles.settingsBtn, pressed && styles.pressedScale]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.03)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <GearGlyph size={18} accent={COLORS.textSecondary} />
    </Pressable>
  );

  if (loading) {
    return (
      <ScreenScaffold title="PROFILE" backdrop="profile" headerRight={settingsButton}>
        {/* Avatar skeleton */}
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Skeleton width={100} height={100} borderRadius={50} style={{ marginBottom: 12 }} />
          <Skeleton width={80} height={20} borderRadius={10} style={{ marginBottom: 10 }} />
          <Skeleton width={120} height={16} borderRadius={8} />
        </View>
        {/* Stats skeleton */}
        <Skeleton width="40%" height={18} borderRadius={8} style={{ marginTop: 24, marginBottom: 12 }} />
        <SkeletonGrid rows={2} cols={3} itemHeight={80} />
        {/* Achievements skeleton */}
        <Skeleton width="50%" height={18} borderRadius={8} style={{ marginTop: 24, marginBottom: 12 }} />
        <SkeletonGrid rows={2} cols={3} itemHeight={90} />
        {/* Collections skeleton */}
        <Skeleton width="55%" height={18} borderRadius={8} style={{ marginTop: 24, marginBottom: 12 }} />
        <SkeletonCard />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="PROFILE" backdrop="profile" headerRight={settingsButton}>
      {/* Hero identity card — avatar + frame + title + prestige badge in one
          bento hero. Avatar pulse + legendary glow animations are untouched. */}
      <View style={styles.heroCard}>
        {/* Clipped decor layer so the glow blob stays inside the rounded
            shell without clipping the avatar ring's own shadow glow. */}
        <View style={styles.heroDecorClip} pointerEvents="none">
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.heroGlowBlob} />
          <View style={[styles.heroGlowBlob, styles.heroGlowBlobAlt]} />
        </View>

        <Animated.View
          style={[
            styles.avatarRing,
            { shadowColor: frameArt.accent },
            animatedRingStyle,
          ]}
        >
          {/* Bespoke SVG frame ring replaces the old rarity-colored border;
              the legendary pulse (scale + shadow) wraps it unchanged. */}
          <ProfileFrameArt frameId={equippedFrameId} size={100}>
          <View
            style={[
              styles.avatarCircle,
              {
                backgroundColor: equippedTheme.colors.surface,
              },
            ]}
          >
            <LinearGradient
              colors={[equippedTheme.colors.surface, equippedTheme.colors.bg] as [string, string]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            {/* Radial-ish rarity wash: bright top-center falling off downward,
                plus a faint bottom counter-glow so the disc reads lit, not flat. */}
            <LinearGradient
              colors={[frameBorderColor + '3D', 'rgba(8,2,22,0)'] as [string, string]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.72 }}
            />
            <LinearGradient
              colors={['rgba(8,2,22,0)', frameBorderColor + '20'] as [string, string]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0.45 }}
              end={{ x: 0.5, y: 1 }}
            />
            {/* Illustrated Word Architect portrait — the hero of the disc
                (no custom avatar upload yet, so this is the default identity
                art). Fills the disc edge to edge, backdrop tinted by the
                equipped frame's accent and rim-lit in its rarity metal. The
                variant is keyed to the equipped FRAME, so the character the
                player saw on the store card is the one they now wear. */}
            <AvatarPortrait
              size={88}
              accent={equippedFrameAccent}
              variant={equippedFrameId}
              rimColor={frameBorderColor}
              style={StyleSheet.absoluteFill}
            />
            {/* Glass top shine */}
            <View style={styles.avatarShine} pointerEvents="none" />
            {/* Initial demoted to a small monogram chip on the disc's lower
                edge — identity signature, not the centerpiece. */}
            <View
              style={[
                styles.avatarMonogramChip,
                { borderColor: frameBorderColor + 'AA', shadowColor: frameBorderColor },
              ]}
              pointerEvents="none"
            >
              <Text style={[styles.avatarMonogramText, { color: equippedTheme.colors.accent }]}>
                {initial}
              </Text>
            </View>
          </View>
          </ProfileFrameArt>
        </Animated.View>
        <View style={styles.levelBadge}>
          <LinearGradient
            colors={[equippedTheme.colors.accent, frameBorderColor] as [string, string]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <Text style={styles.levelText}>Lv.{p.level}</Text>
        </View>
        <Text style={styles.playerName}>{p.name}</Text>
        <View
          style={[
            styles.titleBadge,
            {
              backgroundColor: `${equippedTheme.colors.surface}cc`,
              borderColor: `${equippedTheme.colors.accent}55`,
            },
          ]}
        >
          <Text style={styles.titleText}>{p.title}</Text>
        </View>

        {/* Prestige Badge (for players who have prestiged) */}
        {prestige?.prestigeLevel > 0 && (() => {
          const prestigeLevel = prestige.prestigeLevel;
          const prestigeDef = PRESTIGE_LEVELS.find((pl) => pl.level === prestigeLevel);
          if (!prestigeDef) return null;
          // Tier 6 B3 — show the live multiplier so the meta-loop has teeth.
          const xpMult = getPrestigeXpMultiplier(prestigeLevel);
          const coinMult = getPrestigeCoinMultiplier(prestige.permanentBonuses ?? []);
          const gemMult = getPrestigeGemMultiplier(prestige.permanentBonuses ?? []);
          const multiplierSummary = [
            xpMult > 1 ? `${xpMult.toFixed(2)}× XP` : null,
            coinMult > 1 ? `${coinMult.toFixed(2)}× Coin` : null,
            gemMult > 1 ? `${gemMult.toFixed(2)}× Gem` : null,
          ].filter(Boolean).join(' · ');
          return (
            <View style={styles.prestigeBadgeRow}>
              <LinearGradient
                colors={['#3d2200', '#1a0e00']}
                style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <PrestigeMedal level={prestigeLevel} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.prestigeBadgeLabel}>{prestigeDef.label}</Text>
                <Text style={styles.prestigeBadgeMultiplier}>
                  {multiplierSummary || 'Permanent prestige bonuses unlocked'}
                </Text>
              </View>
              <Text style={styles.prestigeBadgeCount}>
                Prestige {prestigeLevel}
              </Text>
            </View>
          );
        })()}
      </View>

      {/* Prestige Button (when eligible) */}
      {canPrestige(p.level, prestige?.prestigeLevel ?? 0) && (() => {
        const nextPrestige = (prestige?.prestigeLevel ?? 0) + 1;
        const nextDef = PRESTIGE_LEVELS.find((pl) => pl.level === nextPrestige);
        if (!nextDef) return null;
        const summary = getPrestigeSummary(nextPrestige);

        return (
          <Pressable
            style={({ pressed }) => [styles.prestigeCard, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Prestige to ${nextDef.label}. Resets level to 1 and unlocks permanent prestige bonuses`}
            onPress={() => {
              Alert.alert(
                `Prestige to ${nextDef.label}?`,
                `This will reset your level to 1 but you keep all cosmetics.\n\n` +
                `You'll earn:\n` +
                `  ${nextDef.label} prestige bonuses\n` +
                `  Exclusive ${nextDef.cosmeticReward.type}\n` +
                summary.gains.map((g) => `  ${g}`).join('\n') +
                `\n\nThis cannot be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'PRESTIGE',
                    style: 'destructive',
                    onPress: () => {
                      const success = playerActions.performPrestige?.();
                      if (!success) {
                        Alert.alert('Prestige Unavailable', 'Reach the required level before prestiging.');
                      }
                    },
                  },
                ],
              );
            }}
          >
            {/* Gilded card: deep plum gradient body inside a thin gold
                double border, gold sheen falling from the top edge. */}
            <View style={styles.prestigeCardInner}>
              <LinearGradient
                colors={['#3a1258', '#22093d', '#150527']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 1 }}
              />
              <LinearGradient
                colors={[...GRADIENTS.goldShine]}
                style={styles.prestigeCardSheen}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                pointerEvents="none"
              />
              <PrestigeMedal level={nextPrestige} size={62} />
              <View style={styles.prestigeCardBody}>
                <Text style={styles.prestigeCardHeadline}>PRESTIGE</Text>
                {PRESTIGE_BENEFITS.map((benefit) => (
                  <View key={benefit.icon} style={styles.prestigeBenefitRow}>
                    <GameIcon name={benefit.icon} size={14} accent={COLORS.goldLight} />
                    <Text style={styles.prestigeBenefitText}>{benefit.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.prestigeCardChevron}>{'›'}</Text>
            </View>
          </Pressable>
        );
      })()}

      {/* Stats — accent-tinted gem tiles with medallion icons */}
      <SectionHeader label="STATISTICS" accent={COLORS.cyan} />
      <View style={styles.statsGrid}>
        {STAT_CARDS.map((stat) => {
          const fam = STAT_FAMILY_STYLE[stat.family];
          const isTop = stat.key === topStatKey;
          return (
            <View
              key={stat.key}
              style={[
                styles.statCard,
                { borderColor: stat.accent + '3d', shadowColor: stat.accent },
                isTop && { borderColor: stat.accent + '7a' },
              ]}
              accessibilityRole="text"
              accessibilityLabel={`${stat.label}: ${(p as any)[stat.key]?.toLocaleString?.() ?? 0}`}
            >
              <LinearGradient
                colors={fam.wash(stat.accent)}
                locations={[0, 0.55, 1]}
                style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                start={fam.start}
                end={fam.end}
              />
              <StatOrnament kind={fam.ornament} accent={stat.accent} />
              <DrawnMedallion accent={stat.accent} size={38} style={{ marginBottom: 8 }}>
                <StatGlyph statKey={stat.key} accent={stat.accent} size={19} />
              </DrawnMedallion>
              <View style={styles.statValueWrap}>
                {/* Metallic sheen — only the leading stat earns the polish. */}
                {isTop && (
                  <LinearGradient
                    colors={[
                      'rgba(255,255,255,0)',
                      'rgba(255,255,255,0.30)',
                      'rgba(255,255,255,0)',
                    ]}
                    locations={[0.12, 0.5, 0.88]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 5 }]}
                  />
                )}
                <Text style={[styles.statValue, isTop && styles.statValueTop]}>
                  {(p as any)[stat.key]?.toLocaleString?.() ?? 0}
                </Text>
              </View>
              <LinearGradient
                colors={[stat.accent + '00', stat.accent + 'a6', stat.accent + '00']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.statRule, { width: fam.ruleWidth }]}
              />
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          );
        })}
      </View>
      {/* Achievements */}
      <SectionHeader
        label="ACHIEVEMENTS"
        accent={COLORS.gold}
        meta={`${achievementIds.length}/${ACHIEVEMENTS.length * 3}`}
      />
      <View style={styles.achievementsGrid}>
        {achievementsViewData.map(({ achievement, highestTier, tierColor, earnedLevels }) => {
          return (
            <View
              key={achievement.id}
              style={[
                styles.achievementCard,
                highestTier
                  ? { borderColor: tierColor + 'AA', shadowColor: tierColor, shadowOpacity: 0.45 }
                  : null,
              ]}
              accessibilityRole="text"
              accessibilityLabel={`Achievement: ${achievement.name}, ${highestTier ? highestTier + ' tier earned' : 'not yet earned'}`}
            >
              {/* Plate body — lifted well clear of the nebula background so the
                  card reads as a plate holding a trophy, not a hole in the bg. */}
              <LinearGradient
                colors={ACHIEVEMENT_PLATE}
                style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              {/* Earned cards take a faint tier wash, so the wall shows
                  bronze/silver/gold progress at a glance. */}
              {highestTier ? (
                <LinearGradient
                  colors={ACHIEVEMENT_TIER_WASH[highestTier] ?? ACHIEVEMENT_TIER_WASH.bronze}
                  style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  pointerEvents="none"
                />
              ) : null}
              {/* Soft inner top-light — the plate's lit edge. */}
              <LinearGradient
                colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0)']}
                style={styles.achievementTopLight}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                pointerEvents="none"
              />
              <View style={styles.achievementBadgeWrap}>
                <AchievementBadge
                  achievementId={achievement.id}
                  earned={!!highestTier}
                  tier={highestTier ?? undefined}
                  size={achievementBadgeSize}
                />
              </View>
              <Text style={styles.achievementName} numberOfLines={1}>{achievement.name}</Text>
              <View style={styles.tierDots}>
                {achievement.tiers.map(t => {
                  const earned = earnedLevels.includes(t.level);
                  const dotColor = t.level === 'gold' ? COLORS.gold
                    : t.level === 'silver' ? COLORS.tierSilver : COLORS.tierBronze;
                  return (
                    <View
                      key={t.level}
                      style={[
                        styles.tierDot,
                        earned
                          ? { backgroundColor: dotColor, shadowColor: dotColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 2 }
                          : { backgroundColor: 'rgba(255,255,255,0.1)' },
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      {/* Collection Progress */}
      <SectionHeader label="COLLECTION PROGRESS" accent={COLORS.purple} />
      <View style={styles.collectionsCard}>
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard]}
          style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={styles.collectionRow}>
          <Text style={styles.collectionLabel}>Word Atlas</Text>
          <Text style={[styles.collectionPercent, { color: COLORS.accent }]}>{p.atlasProgress}%</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityLabel={`Word Atlas progress: ${p.atlasProgress} percent`} accessibilityValue={{ min: 0, max: 100, now: p.atlasProgress }}>
          <NeonProgressBar progress={Math.min(p.atlasProgress, 100) / 100} color={COLORS.accent} height={9} />
        </View>

        <View style={[styles.collectionRow, { marginTop: 16 }]}>
          <Text style={styles.collectionLabel}>Rare Tiles</Text>
          <Text style={[styles.collectionPercent, { color: COLORS.gold }]}>{p.tilesProgress}%</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityLabel={`Rare Tiles progress: ${p.tilesProgress} percent`} accessibilityValue={{ min: 0, max: 100, now: p.tilesProgress }}>
          <NeonProgressBar progress={Math.min(p.tilesProgress, 100) / 100} color={COLORS.gold} height={9} />
        </View>

        <View style={[styles.collectionRow, { marginTop: 16 }]}>
          <Text style={styles.collectionLabel}>Seasonal Stamps</Text>
          <Text style={[styles.collectionPercent, { color: COLORS.purple }]}>{p.stampsProgress}%</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityLabel={`Seasonal Stamps progress: ${p.stampsProgress} percent`} accessibilityValue={{ min: 0, max: 100, now: p.stampsProgress }}>
          <NeonProgressBar progress={Math.min(p.stampsProgress, 100) / 100} color={COLORS.purple} height={9} />
        </View>
      </View>

      {/* Equipped Cosmetics */}
      <SectionHeader label="EQUIPPED COSMETICS" accent={COLORS.cyan} />
      <Pressable
        style={({ pressed }) => [styles.cosmeticsCard, pressed && styles.cardPressed]}
        onPress={onEditProfile}
        accessibilityRole="button"
        accessibilityLabel="Edit equipped cosmetics"
      >
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard]}
          style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={styles.cosmeticRow}>
          <DrawnMedallion accent={frameBorderColor} shape="squircle" size={34}>
            <NestedSquaresGlyph size={16} accent={frameBorderColor} />
          </DrawnMedallion>
          <Text style={styles.cosmeticLabel}>Frame</Text>
          <Text style={styles.cosmeticValue}>
            {PROFILE_FRAMES.find(f => f.id === p.equippedCosmetics.frame)?.name ?? 'Default'}
          </Text>
          <Text style={styles.cosmeticChevron}>{'›'}</Text>
        </View>
        <View style={styles.cosmeticDivider} />
        <View style={styles.cosmeticRow}>
          <DrawnMedallion accent={COLORS.purple} shape="squircle" size={34}>
            <DiamondGlyph size={17} accent={COLORS.purple} />
          </DrawnMedallion>
          <Text style={styles.cosmeticLabel}>Theme</Text>
          <Text style={styles.cosmeticValue}>
            {COSMETIC_THEMES.find(t => t.id === p.equippedCosmetics.theme)?.name ?? 'Default'}
          </Text>
          <Text style={styles.cosmeticChevron}>{'›'}</Text>
        </View>
        <View style={styles.cosmeticDivider} />
        <View style={styles.cosmeticRow}>
          <DrawnMedallion accent={COLORS.gold} shape="squircle" size={34}>
            <TagGlyph size={17} accent={COLORS.gold} />
          </DrawnMedallion>
          <Text style={styles.cosmeticLabel}>Title</Text>
          <Text style={styles.cosmeticValue}>
            {p.title ?? 'Wordsmith'}
          </Text>
          <Text style={styles.cosmeticChevron}>{'›'}</Text>
        </View>
      </Pressable>

      {/* Mastery + Clubs — rich link cards with medallions and chevrons */}
      <SectionHeader label="EXPLORE" accent={COLORS.teal} />
      <Pressable
        style={({ pressed }) => [styles.linkCard, styles.linkCardGold, pressed && styles.cardPressed]}
        onPress={onOpenMastery}
        accessibilityRole="button"
        accessibilityLabel="Open Mastery Pass"
      >
        <LinearGradient
          colors={[COLORS.gold + '26', 'rgba(26,10,46,0.92)'] as [string, string]}
          style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <DrawnMedallion accent={COLORS.gold} size={44}>
          <MedalGlyph size={22} accent={COLORS.gold} />
        </DrawnMedallion>
        <View style={{ flex: 1 }}>
          <Text style={[styles.linkCardTitle, { color: COLORS.gold }]}>Mastery Pass</Text>
          <Text style={styles.linkCardSub}>Earn XP, unlock rewards</Text>
        </View>
        <Text style={[styles.linkCardChevron, { color: COLORS.gold }]}>{'›'}</Text>
      </Pressable>

      {clubsVisible && (
        <Pressable
          style={({ pressed }) => [styles.linkCard, styles.linkCardCyan, pressed && styles.cardPressed]}
          onPress={onOpenClub!}
          accessibilityRole="button"
          accessibilityLabel="Open Clubs"
        >
          <LinearGradient
            colors={[COLORS.teal + '26', 'rgba(26,10,46,0.92)'] as [string, string]}
            style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <DrawnMedallion accent={COLORS.teal} size={44}>
            <UsersGlyph size={22} accent={COLORS.teal} />
          </DrawnMedallion>
          <View style={{ flex: 1 }}>
            <Text style={[styles.linkCardTitle, { color: COLORS.teal }]}>Clubs</Text>
            <Text style={styles.linkCardSub}>Team up for shared goals and rewards</Text>
          </View>
          <Text style={[styles.linkCardChevron, { color: COLORS.teal }]}>{'›'}</Text>
        </Pressable>
      )}

      {/* Edit Profile CTA */}
      <PrimaryButton
        label="EDIT PROFILE"
        onPress={onEditProfile}
        size="large"
        fullWidth
        accessibilityLabel="Edit profile"
        style={{ marginTop: 24 }}
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  // ── Header ────────────────────────────────────────────────────────────
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(20, 8, 40, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  settingsGlyph: {
    fontSize: 18,
  },
  pressedScale: {
    transform: [{ scale: 0.93 }],
    opacity: 0.85,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  // ── Hero identity card ────────────────────────────────────────────────
  heroCard: {
    ...bentoPanel('pink', { borderRadius: RADIUS.xxl, padding: 20, marginBottom: 4 }),
    alignItems: 'center',
    marginTop: 8,
  },
  heroDecorClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
  },
  heroGlowBlob: {
    position: 'absolute',
    top: -70,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.accentGlow,
    opacity: 0.55,
  },
  heroGlowBlobAlt: {
    top: undefined,
    right: undefined,
    bottom: -90,
    left: -60,
    backgroundColor: 'rgba(0,229,255,0.20)',
    opacity: 0.6,
  },
  // The ring itself is now drawn by ProfileFrameArt's bespoke SVG art —
  // this wrapper only carries the size and the (legendary-pulsed) glow.
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 12,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Small monogram chip riding the disc's lower-left edge. The portrait art
  // is the hero now; the initial is a signature, so it stays compact and
  // clear of the level badge that overlaps the ring's bottom center.
  avatarMonogramChip: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(6,1,18,0.82)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 3,
  },
  avatarMonogramText: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: FONTS.display,
    color: COLORS.accent,
  },
  avatarShine: {
    position: 'absolute',
    top: 7,
    left: 17,
    right: 17,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  levelBadge: {
    marginTop: -12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 3,
    zIndex: 1,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  levelText: {
    fontSize: 12,
    fontFamily: FONTS.display,
    color: COLORS.bg,
  },
  playerName: {
    fontSize: 24,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    marginTop: 12,
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  titleBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
  },
  titleText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.gold,
    textShadowColor: 'rgba(255,215,0,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  // ── Stats ─────────────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '31%',
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 6,
  },
  // Corner ornaments — one mark per metric family, top-right of the tile.
  statOrnSlot: {
    position: 'absolute',
    top: 7,
    right: 8,
    alignItems: 'flex-end',
  },
  statOrnFacet: {
    width: 7,
    height: 7,
    borderWidth: 1.2,
    transform: [{ rotate: '45deg' }],
  },
  statOrnChevron: {
    width: 7,
    height: 7,
    borderTopWidth: 1.3,
    borderRightWidth: 1.3,
    transform: [{ rotate: '-45deg' }],
  },
  statOrnPipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statOrnPip: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  statOrnNotch: {
    width: 9,
    height: 9,
    borderTopWidth: 1.2,
    borderRightWidth: 1.2,
  },
  statValueWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRadius: 5,
  },
  statValue: {
    fontSize: 20,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    // Tabular figures so the numbers across the 3-column grid align on their
    // digit columns instead of jittering with each new score.
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
    textShadowColor: 'rgba(255,255,255,0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  statValueTop: {
    color: '#fff7e2',
    textShadowColor: 'rgba(255,214,140,0.9)',
    textShadowRadius: 9,
  },
  /** Hairline rule between value and label; width varies by metric family. */
  statRule: {
    height: 1,
    borderRadius: 1,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontFamily: FONTS.bodySemiBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  // ── Achievements ──────────────────────────────────────────────────────
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  achievementCard: {
    width: '31%',
    borderRadius: RADIUS.xl,
    // Tight vertical padding so the badge art — not the dark plate — is what
    // the eye lands on. Horizontal padding only guards the border radius.
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.26)',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  // Lit top edge of the plate — a short gradient band, not a full overlay, so
  // the badge art below keeps its own value range.
  achievementTopLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 26,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  achievementBadgeWrap: {
    marginBottom: 4,
  },
  achievementName: {
    fontSize: 10,
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontFamily: FONTS.bodySemiBold,
    marginBottom: 5,
  },
  tierDots: {
    flexDirection: 'row',
    gap: 4,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // ── Collections ───────────────────────────────────────────────────────
  collectionsCard: {
    ...bentoPanel('purple', { borderRadius: RADIUS.xl, padding: 16, marginBottom: 0 }),
  },
  collectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  collectionLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodySemiBold,
  },
  collectionPercent: {
    fontSize: 14,
    fontFamily: FONTS.display,
  },
  // ── Cosmetics ─────────────────────────────────────────────────────────
  cosmeticsCard: {
    ...bentoPanel('cyan', { borderRadius: RADIUS.xl, padding: 14, marginBottom: 0 }),
  },
  cosmeticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  cosmeticLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONTS.bodyMedium,
    width: 52,
  },
  cosmeticValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodySemiBold,
  },
  cosmeticChevron: {
    fontSize: 20,
    color: COLORS.cyan,
    fontFamily: FONTS.display,
  },
  cosmeticDivider: {
    height: 1,
    backgroundColor: bentoDividerColor('cyan'),
  },
  // ── Link cards (Mastery / Clubs) ──────────────────────────────────────
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkCardGold: {
    ...bentoPanel('gold', { borderRadius: RADIUS.xl, padding: 14, marginBottom: 12 }),
  },
  linkCardCyan: {
    ...bentoPanel('cyan', { borderRadius: RADIUS.xl, padding: 14, marginBottom: 12 }),
  },
  linkCardTitle: {
    fontSize: 15,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  linkCardSub: {
    fontSize: 12,
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  linkCardChevron: {
    fontSize: 24,
    fontFamily: FONTS.display,
  },
  // ── Prestige ──────────────────────────────────────────────────────────
  prestigeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 12,
    borderRadius: RADIUS.xl,
    padding: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  prestigeBadgeLabel: {
    fontSize: 15,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  prestigeBadgeMultiplier: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  prestigeBadgeCount: {
    fontSize: 12,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    opacity: 0.7,
  },
  // Gilded prestige CTA — thin gold double border (outer ring + inner
  // hairline) around a deep plum gradient body. Static; reduce-motion safe.
  prestigeCard: {
    marginTop: 16,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: COLORS.gold + '8C',
    padding: 3,
    backgroundColor: 'rgba(8,2,22,0.9)',
    ...SHADOWS.glow(COLORS.gold),
  },
  prestigeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: RADIUS.xxl - 4,
    borderWidth: 1,
    borderColor: COLORS.gold + '4D',
    paddingVertical: 14,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  prestigeCardSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 34,
  },
  prestigeCardBody: {
    flex: 1,
    gap: 4,
  },
  prestigeCardHeadline: {
    fontSize: 21,
    fontFamily: FONTS.display,
    color: COLORS.goldLight,
    letterSpacing: 2.5,
    marginBottom: 3,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  prestigeBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  prestigeBenefitText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  prestigeCardChevron: {
    fontSize: 26,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    marginLeft: 2,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});

export default ProfileScreen;
