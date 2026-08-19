import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, FONTS, RADIUS, SHADOWS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import NeonProgressBar from '../components/common/NeonProgressBar';
import { bentoPanel, bentoHeaderStyles, bentoDividerColor } from '../styles/bentoPanel';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { SkeletonCard } from '../components/common/Skeleton';
import {
  usePlayerStore,
  usePlayerActions,
  selectCollections,
  selectTooltipsShown,
} from '../stores/playerStore';
import { LOCAL_IMAGES } from '../utils/localAssets';
import { ATLAS_PAGES, SEASONAL_ALBUMS, getCurrentSeasonAlbum } from '../data/collections';
import GameIcon from '../components/icons/GameIcon';
import StampArt, { STAMP_PAPERS, stampRarity } from '../components/cosmetics/StampArt';

const { width } = Dimensions.get('window');
const TILE_SIZE = (width - 80) / 7;
/** Stamp width inside its card shell (card = (width-68)/3 with 12px padding). */
const STAMP_SIZE = Math.max(64, Math.min(86, (width - 68) / 3 - 24));

const TABS = ['Word Atlas', 'Rare Tiles', 'Seasonal Stamps'] as const;
type TabName = typeof TABS[number];

/** Each collection tab carries its own neon accent so the sliding pill and
 *  section chrome recolor as you move through the treasury. */
const TAB_ACCENT: Record<TabName, string> = {
  'Word Atlas': COLORS.cyan,
  'Rare Tiles': COLORS.gold,
  'Seasonal Stamps': COLORS.purple,
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Rarity tinting for the letter vault — scarce letters read as treasure. */
type LetterRarity = 'common' | 'rare' | 'epic' | 'legendary';
const RARITY_COLOR: Record<LetterRarity, string> = {
  common: COLORS.rarityCommon,
  rare: COLORS.rarityRare,
  epic: COLORS.rarityEpic,
  legendary: COLORS.rarityLegendary,
};
function letterRarity(letter: string): LetterRarity {
  if ('JQZX'.includes(letter)) return 'legendary';
  if ('KVWY'.includes(letter)) return 'epic';
  if ('BFGHMPUD'.includes(letter)) return 'rare';
  return 'common';
}

const TILE_SETS = [
  { name: 'PUZZLE', letters: ['P', 'U', 'Z', 'L', 'E'] },
  { name: 'GRAVITY', letters: ['G', 'R', 'A', 'V', 'I', 'T', 'Y'] },
  { name: 'WORDFALL', letters: ['W', 'O', 'R', 'D', 'F', 'A', 'L'] },
  { name: 'STELLAR', letters: ['S', 'T', 'E', 'L', 'A', 'R'] },
];


// ─── Drawn glyph kit — layered Views/gradients, no emoji (same technique as
// ModesScreen's ModeGlyph family / LeaderboardScreen's GlyphMedallion). ─────

type GlyphProps = { size?: number; accent?: string };

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
        colors={[muted ? 'rgba(255,255,255,0.05)' : accent + '52', 'rgba(8, 2, 22, 0.92)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* White highlight edge — brighter glass bar + hairline top rim so the
          glyph silhouette pops off the dark body. */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.05,
          left: size * 0.16,
          right: size * 0.16,
          height: size * 0.17,
          borderRadius: size * 0.09,
          backgroundColor: 'rgba(255,255,255,0.22)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 1,
          left: size * 0.24,
          right: size * 0.24,
          height: 1.5,
          borderRadius: 1,
          backgroundColor: 'rgba(255,255,255,0.45)',
        }}
      />
      {children}
    </View>
  );
}

/** Drawn paw print — gradient pad + three toe dots (Animals). */
function PawGlyph({ size = 24, accent = COLORS.orange }: GlyphProps) {
  const toe = size * 0.22;
  const toeDot = (left: number, top: number) => (
    <View
      key={`${left}`}
      style={{
        position: 'absolute',
        left,
        top,
        width: toe,
        height: toe,
        borderRadius: toe / 2,
        backgroundColor: accent,
      }}
    />
  );
  return (
    <View style={{ width: size, height: size }}>
      {toeDot(size * 0.05, size * 0.24)}
      {toeDot(size * 0.39, size * 0.06)}
      {toeDot(size * 0.73, size * 0.24)}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.02,
          alignSelf: 'center',
          width: size * 0.54,
          height: size * 0.44,
          borderTopLeftRadius: size * 0.27,
          borderTopRightRadius: size * 0.27,
          borderBottomLeftRadius: size * 0.2,
          borderBottomRightRadius: size * 0.2,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={[accent, accent + '99']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    </View>
  );
}

/** Drawn apple — gradient circle + green leaf + stem (Food & Drink). */
function AppleGlyph({ size = 24, accent = COLORS.coral }: GlyphProps) {
  const body = size * 0.66;
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.02,
          width: size * 0.09,
          height: size * 0.24,
          borderRadius: size * 0.05,
          backgroundColor: 'rgba(255,255,255,0.55)',
          transform: [{ rotate: '14deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.04,
          left: size * 0.56,
          width: size * 0.28,
          height: size * 0.17,
          borderTopRightRadius: size * 0.17,
          borderBottomLeftRadius: size * 0.17,
          backgroundColor: COLORS.green,
          transform: [{ rotate: '-22deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          width: body,
          height: body,
          borderRadius: body / 2,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={[accent, accent + '8C']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            position: 'absolute',
            top: body * 0.14,
            left: body * 0.16,
            width: body * 0.3,
            height: body * 0.2,
            borderRadius: body * 0.15,
            backgroundColor: 'rgba(255,255,255,0.4)',
          }}
        />
      </View>
    </View>
  );
}

/** Drawn sun-behind-cloud — gold disc peeking over white puffs (Weather). */
function SunCloudGlyph({ size = 24 }: GlyphProps) {
  const sun = size * 0.46;
  const cloud = 'rgba(255,255,255,0.92)';
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.02,
          right: size * 0.06,
          width: sun,
          height: sun,
          borderRadius: sun / 2,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={[COLORS.goldLight, COLORS.gold]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          left: size * 0.1,
          bottom: size * 0.26,
          width: size * 0.32,
          height: size * 0.32,
          borderRadius: size * 0.16,
          backgroundColor: cloud,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.32,
          bottom: size * 0.3,
          width: size * 0.4,
          height: size * 0.4,
          borderRadius: size * 0.2,
          backgroundColor: cloud,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.02,
          bottom: size * 0.08,
          width: size * 0.82,
          height: size * 0.28,
          borderRadius: size * 0.14,
          backgroundColor: cloud,
        }}
      />
    </View>
  );
}

/** Drawn house — accent roof triangle + gradient body + door (Home & Living). */
function HouseGlyph({ size = 24, accent = COLORS.gold }: GlyphProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.42,
          borderRightWidth: size * 0.42,
          borderBottomWidth: size * 0.32,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: accent,
        }}
      />
      <View
        style={{
          width: size * 0.6,
          height: size * 0.44,
          borderBottomLeftRadius: size * 0.08,
          borderBottomRightRadius: size * 0.08,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <LinearGradient
          colors={[accent + 'CC', accent + '73']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            width: size * 0.18,
            height: size * 0.24,
            borderTopLeftRadius: size * 0.09,
            borderTopRightRadius: size * 0.09,
            backgroundColor: 'rgba(8,2,22,0.75)',
          }}
        />
      </View>
    </View>
  );
}

/** Drawn heart — rotated square + two lobes (Human Body). */
function HeartGlyph({ size = 24, accent = COLORS.accent }: GlyphProps) {
  const d = size * 0.48;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: d,
          height: d,
          marginTop: size * 0.04,
          transform: [{ rotate: '45deg' }],
        }}
      >
        <View
          style={{
            position: 'absolute',
            width: d,
            height: d,
            backgroundColor: accent,
            borderBottomRightRadius: d * 0.16,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: -d / 2,
            left: 0,
            width: d,
            height: d,
            borderRadius: d / 2,
            backgroundColor: accent,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: -d / 2,
            width: d,
            height: d,
            borderRadius: d / 2,
            backgroundColor: accent,
          }}
        />
      </View>
    </View>
  );
}

/** Drawn swatch trio — three overlapping color discs (Colors & Light). */
function SwatchTrioGlyph({ size = 24 }: GlyphProps) {
  const d = size * 0.52;
  const disc = (left: number, top: number, color: string) => (
    <View
      key={color}
      style={{
        position: 'absolute',
        left,
        top,
        width: d,
        height: d,
        borderRadius: d / 2,
        backgroundColor: color,
        opacity: 0.92,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
      }}
    />
  );
  return (
    <View style={{ width: size, height: size }}>
      {disc(size * 0.02, size * 0.06, COLORS.coral)}
      {disc(size * 0.44, size * 0.06, COLORS.gold)}
      {disc(size * 0.23, size * 0.42, COLORS.cyan)}
    </View>
  );
}

/** Drawn smiley — ring + eye dots + bottom-arc mouth (Emotions). */
function SmileyGlyph({ size = 24, accent = COLORS.teal }: GlyphProps) {
  const t = size * 0.09;
  const eye = size * 0.13;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: t,
          borderColor: accent,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.3,
          left: size * 0.28,
          width: eye,
          height: eye,
          borderRadius: eye / 2,
          backgroundColor: accent,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.3,
          right: size * 0.28,
          width: eye,
          height: eye,
          borderRadius: eye / 2,
          backgroundColor: accent,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.16,
          width: size * 0.52,
          height: size * 0.3,
          borderRadius: size * 0.26,
          borderWidth: t,
          borderColor: 'transparent',
          borderBottomColor: accent,
        }}
      />
    </View>
  );
}

/** Drawn hammer — angled gradient head + handle (Tools & Craft). */
function HammerGlyph({ size = 24, accent = COLORS.orange }: GlyphProps) {
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.36,
          top: size * 0.3,
          width: size * 0.15,
          height: size * 0.68,
          borderRadius: size * 0.08,
          backgroundColor: accent + '99',
          transform: [{ rotate: '-42deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.3,
          top: size * 0.08,
          width: size * 0.54,
          height: size * 0.24,
          borderRadius: size * 0.09,
          overflow: 'hidden',
          transform: [{ rotate: '48deg' }],
        }}
      >
        <LinearGradient
          colors={[accent, accent + '99']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    </View>
  );
}

/** Drawn music note — gradient disc + stem + flag (Music). */
function NoteGlyph({ size = 24, accent = COLORS.accent }: GlyphProps) {
  const head = size * 0.42;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.1,
          bottom: size * 0.02,
          width: head,
          height: head * 0.82,
          borderRadius: head / 2,
          overflow: 'hidden',
          transform: [{ rotate: '-16deg' }],
        }}
      >
        <LinearGradient
          colors={[accent, accent + '99']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          left: size * 0.46,
          top: size * 0.08,
          width: size * 0.1,
          height: size * 0.62,
          borderRadius: size * 0.05,
          backgroundColor: accent,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.5,
          top: size * 0.05,
          width: size * 0.32,
          height: size * 0.17,
          borderTopRightRadius: size * 0.17,
          borderBottomLeftRadius: size * 0.1,
          backgroundColor: accent + 'CC',
          transform: [{ rotate: '16deg' }],
        }}
      />
    </View>
  );
}

/** Drawn compass — ring + rotated needle + hub (Travel). */
function CompassGlyph({ size = 24, accent = COLORS.green }: GlyphProps) {
  const t = size * 0.09;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: t,
          borderColor: accent,
        }}
      />
      <View
        style={{
          width: size * 0.16,
          height: size * 0.54,
          borderRadius: size * 0.08,
          backgroundColor: accent,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.14,
          height: size * 0.14,
          borderRadius: size * 0.07,
          backgroundColor: 'rgba(255,255,255,0.85)',
        }}
      />
    </View>
  );
}

/** Drawn ringed planet — gradient disc + tilted orbit ring (Space). */
function PlanetGlyph({ size = 24, accent = COLORS.cyan }: GlyphProps) {
  const d = size * 0.56;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: d, height: d, borderRadius: d / 2, overflow: 'hidden' }}>
        <LinearGradient
          colors={[accent, accent + '73']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            position: 'absolute',
            top: d * 0.12,
            left: d * 0.16,
            width: d * 0.3,
            height: d * 0.2,
            borderRadius: d * 0.15,
            backgroundColor: 'rgba(255,255,255,0.45)',
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          width: size * 0.98,
          height: size * 0.36,
          borderRadius: size * 0.49,
          borderWidth: size * 0.06,
          borderColor: accent + 'B3',
          transform: [{ rotate: '-24deg' }],
        }}
      />
    </View>
  );
}

/** Drawn leaf — gradient teardrop with vein (Nature themes). */
function LeafGlyph({ size = 24, accent = COLORS.green }: GlyphProps) {
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

/** Drawn 8-point star burst — two crossed gradient squares + hot core (Magic + fallback). */
function StarBurstGlyph({ size = 24, accent = COLORS.gold }: GlyphProps) {
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

/** Drawn faceted diamond — rotated gradient square with facet highlight (coach banner). */
function DiamondGlyph({ size = 24, accent = COLORS.cyan }: GlyphProps) {
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

/** Keyed atlas-page glyph mapper — every category gets a drawn mark;
 *  unknown/future pages fall back to the star burst. */
function AtlasGlyph({ pageId, accent, size }: { pageId: string; accent: string; size: number }) {
  switch (pageId) {
    case 'animals':
      return <PawGlyph size={size} accent={accent} />;
    case 'food':
      return <AppleGlyph size={size} accent={accent} />;
    case 'weather':
      return <SunCloudGlyph size={size} accent={accent} />;
    case 'home':
      return <HouseGlyph size={size} accent={accent} />;
    case 'body':
      return <HeartGlyph size={size} accent={accent} />;
    case 'colors':
      return <SwatchTrioGlyph size={size} accent={accent} />;
    case 'emotions':
      return <SmileyGlyph size={size} accent={accent} />;
    case 'tools':
      return <HammerGlyph size={size} accent={accent} />;
    case 'music':
      return <NoteGlyph size={size} accent={accent} />;
    case 'travel':
      return <CompassGlyph size={size} accent={accent} />;
    case 'space_atlas':
      return <PlanetGlyph size={size} accent={accent} />;
    case 'nature':
      return <LeafGlyph size={size} accent={accent} />;
    case 'magic':
    default:
      return <StarBurstGlyph size={size} accent={accent} />;
  }
}

/** Per-page accent hue — rows stop reading identical. Keyed by page id with a
 *  rotating palette fallback for future pages. Adjacent list rows all differ. */
const ATLAS_PALETTE = [
  COLORS.cyan,
  COLORS.gold,
  COLORS.purple,
  COLORS.coral,
  COLORS.teal,
  COLORS.orange,
  COLORS.accent,
  COLORS.green,
] as const;

const ATLAS_ACCENT_BY_ID: Record<string, string> = {
  animals: COLORS.orange,
  food: COLORS.coral,
  weather: COLORS.cyan,
  home: COLORS.gold,
  body: COLORS.accent,
  colors: COLORS.purple,
  emotions: COLORS.teal,
  tools: COLORS.orange,
  music: COLORS.accent,
  travel: COLORS.green,
  space_atlas: COLORS.cyan,
  magic: COLORS.purple,
};

/**
 * Looping gold sheen swept across a completed card. Reduce-motion users get
 * a static gold wash instead of the moving stripe.
 */
const CardShine: React.FC<{ reduceMotion: boolean }> = ({ reduceMotion }) => {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(2400),
        Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, sweep]);

  if (reduceMotion) {
    return (
      <LinearGradient
        pointerEvents="none"
        colors={[...GRADIENTS.goldShine]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          transform: [
            {
              translateX: sweep.interpolate({
                inputRange: [0, 1],
                outputRange: [-width * 0.7, width],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={['transparent', 'rgba(255,210,77,0.16)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.shineStripe}
      />
    </Animated.View>
  );
};

interface CollectionsScreenProps {
  collections?: any;
}

const CollectionsScreen: React.FC<CollectionsScreenProps> = ({ collections: collectionsProp }) => {
  const collectionsFromStore = usePlayerStore(selectCollections);
  const tooltipsShown = usePlayerStore(selectTooltipsShown);
  const { markTooltipShown } = usePlayerActions();
  const reduceMotion = useReduceMotion();
  // Loose typing preserved: `collections` prop is typed `any` (test/preview
  // bypass); fall back to the player store value otherwise.
  const collections: any = collectionsProp ?? collectionsFromStore;
  const [activeTab, setActiveTab] = useState<TabName>('Word Atlas');
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(
    !tooltipsShown.includes('collections_screen')
  );

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Sliding neon pill behind the active tab (NeonTabBar pattern).
  const [barWidth, setBarWidth] = useState(0);
  const pillX = useRef(new Animated.Value(4)).current;
  const activeIndex = TABS.indexOf(activeTab);
  const activeAccent = TAB_ACCENT[activeTab];
  const pillWidth = barWidth > 0 ? (barWidth - 8) / TABS.length : 0;

  useEffect(() => {
    if (barWidth <= 0) return;
    const toValue = 4 + activeIndex * pillWidth;
    if (reduceMotion) {
      pillX.setValue(toValue);
      return;
    }
    Animated.spring(pillX, {
      toValue,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  }, [activeIndex, barWidth, pillWidth, reduceMotion, pillX]);

  const atlasProgress: Record<string, string[]> = collections?.atlasPages ?? {};
  const atlasPages = ATLAS_PAGES.map(page => ({
    id: page.id,
    name: page.category,
    icon: page.icon,
    total: page.words.length,
    found: (atlasProgress[page.id] ?? []).length,
    words: page.words,
    foundWords: atlasProgress[page.id] ?? [],
  }));
  const [expandedAtlasId, setExpandedAtlasId] = useState<string | null>(null);
  const collectedTiles: string[] = collections?.rareTiles
    ? Object.keys(collections.rareTiles).filter(l => collections.rareTiles[l] > 0)
    : [];
  // Live seasonal album. The screen used to read `collections.stamps` —
  // a key NOTHING writes (progress lands in `collections.seasonalStamps`
  // keyed by album id, as stamp INDICES) — so earned stamps could never
  // display. Derive from the real album + real progress instead.
  const album = getCurrentSeasonAlbum() ?? SEASONAL_ALBUMS[0];
  const earnedStampIdx: number[] =
    (collections?.seasonalStamps as Record<string, number[]> | undefined)?.[album.id] ?? [];
  const stamps = album.stamps.map((s, i) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    collected: earnedStampIdx.includes(i),
  }));
  const seasonName = `${album.season} ${album.year}`;

  const renderAtlasWordList = (page: any, accent: string) => (
    <View style={[styles.atlasWordList, { borderColor: accent + '24' }]}>
      {page.words.map((word: string) => {
        const isFound = page.foundWords.includes(word);
        return (
          <View
            key={word}
            style={[
              styles.atlasWordChip,
              isFound && [styles.atlasWordChipFound, { borderColor: accent + '73' }],
            ]}
          >
            <Text
              style={[
                styles.atlasWordText,
                isFound ? { color: accent } : styles.atlasWordHidden,
              ]}
            >
              {isFound ? word.toUpperCase() : '????'}
            </Text>
          </View>
        );
      })}
    </View>
  );

  const renderWordAtlas = () => {
    const completedPages = atlasPages.filter((p) => p.found >= p.total).length;
    // The page the player is actively filling (else the next unstarted one)
    // renders as a large featured card — the rest drop into a 2-column grid
    // so the tab stops reading as a repeating full-width list.
    const featured =
      atlasPages.find((p) => p.found > 0 && p.found < p.total) ??
      atlasPages.find((p) => p.found < p.total) ??
      atlasPages[0];
    const featuredComplete = featured.found >= featured.total;
    const featuredAccent = featuredComplete
      ? COLORS.gold
      : ATLAS_ACCENT_BY_ID[featured.id] ?? ATLAS_PALETTE[0];
    const gridPages = atlasPages.filter((p) => p.id !== featured.id);
    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.atlasGrid}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          label="WORD ATLAS"
          accent={COLORS.cyan}
          meta={`${completedPages}/${atlasPages.length} PAGES`}
        />
        <Pressable
          style={({ pressed }) => [
            styles.atlasFeaturedCard,
            { borderColor: featuredAccent + '59', shadowColor: featuredAccent },
            pressed && styles.pressedCard,
          ]}
          onPress={() =>
            setExpandedAtlasId(expandedAtlasId === featured.id ? null : featured.id)
          }
          accessibilityRole="button"
          accessibilityLabel={`${featured.name}: ${featured.found} of ${featured.total} words found${featuredComplete ? ', complete' : ''}`}
          accessibilityState={{ expanded: expandedAtlasId === featured.id }}
        >
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <LinearGradient
            colors={[featuredAccent + '2E', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.9, y: 0.9 }}
          />
          {featuredComplete && <CardShine reduceMotion={reduceMotion} />}
          <DrawnMedallion
            accent={featuredAccent}
            size={64}
            shape="squircle"
            style={styles.atlasMedallion}
          >
            <AtlasGlyph pageId={featured.id} accent={featuredAccent} size={36} />
          </DrawnMedallion>
          <View style={styles.atlasInfo}>
            <Text style={[styles.atlasFeaturedEyebrow, { color: featuredAccent }]}>
              {featuredComplete ? 'COMPLETE' : featured.found > 0 ? 'IN PROGRESS' : 'UP NEXT'}
            </Text>
            <Text style={styles.atlasFeaturedName}>{featured.name}</Text>
            <Text style={styles.atlasProgress}>
              {featured.found} / {featured.total} words
            </Text>
            <NeonProgressBar
              progress={featured.total > 0 ? featured.found / featured.total : 0}
              color={featuredAccent}
              height={9}
              showGlowDot={!featuredComplete}
            />
          </View>
        </Pressable>
        {expandedAtlasId === featured.id && renderAtlasWordList(featured, featuredAccent)}
        <View style={styles.atlasGridWrap}>
        {gridPages.map((page: any, pageIndex: number) => {
          const isComplete = page.found >= page.total;
          const pageAccent =
            ATLAS_ACCENT_BY_ID[page.id] ?? ATLAS_PALETTE[pageIndex % ATLAS_PALETTE.length];
          const accent = isComplete ? COLORS.gold : pageAccent;
          return (
            <React.Fragment key={page.id}>
              <Pressable
                style={({ pressed }) => [
                  styles.atlasCompactCard,
                  { borderColor: accent + '3D', shadowColor: accent },
                  pressed && styles.pressedCard,
                ]}
                onPress={() => setExpandedAtlasId(expandedAtlasId === page.id ? null : page.id)}
                accessibilityRole="button"
                accessibilityLabel={`${page.name}: ${page.found} of ${page.total} words found${isComplete ? ', complete' : ''}`}
                accessibilityState={{ expanded: expandedAtlasId === page.id }}
              >
                <LinearGradient
                  colors={[...GRADIENTS.surfaceCard]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <LinearGradient
                  colors={[accent + '21', 'transparent']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.9, y: 0.9 }}
                />
                {isComplete && <CardShine reduceMotion={reduceMotion} />}
                <DrawnMedallion
                  accent={accent}
                  size={54}
                  shape="squircle"
                  style={styles.atlasCompactMedallion}
                >
                  <AtlasGlyph pageId={page.id} accent={accent} size={30} />
                </DrawnMedallion>
                <Text
                  style={[styles.atlasCompactName, isComplete && styles.atlasNameComplete]}
                  numberOfLines={1}
                >
                  {page.name}
                </Text>
                <Text style={styles.atlasCompactProgress}>
                  {page.found} / {page.total} words
                </Text>
                <View style={styles.atlasCompactBar}>
                  <NeonProgressBar
                    progress={page.total > 0 ? page.found / page.total : 0}
                    color={accent}
                    height={6}
                    showGlowDot={false}
                  />
                </View>
                {isComplete && (
                  <View style={styles.completeRibbon}>
                    <Text style={styles.completeRibbonText}>{'✓'} COMPLETE</Text>
                  </View>
                )}
              </Pressable>
              {expandedAtlasId === page.id && (
                <View style={styles.atlasGridWordListWrap}>
                  {renderAtlasWordList(page, accent)}
                </View>
              )}
            </React.Fragment>
          );
        })}
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  const renderRareTiles = () => {
    const totalCollected = collectedTiles.length;
    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.tilesContainer}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          label="RARE TILES"
          accent={COLORS.gold}
          meta={`${totalCollected}/26 COLLECTED`}
        />
        <View style={styles.vaultMeter}>
          <NeonProgressBar
            progress={totalCollected / 26}
            color={COLORS.gold}
            height={8}
          />
        </View>

        <View style={[styles.tileSetsSection, bentoPanel('gold', { padding: 16, marginBottom: 6 })]}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={[bentoHeaderStyles.row, { borderBottomColor: bentoDividerColor('gold') }]}>
            <Text style={bentoHeaderStyles.title}>TILE SETS</Text>
            <Text style={bentoHeaderStyles.meta}>
              {TILE_SETS.filter((s) => s.letters.every((l) => collectedTiles.includes(l))).length}/{TILE_SETS.length} DONE
            </Text>
          </View>
          {TILE_SETS.map((set) => {
            const collected = set.letters.filter((l) =>
              collectedTiles.includes(l),
            ).length;
            const isComplete = collected >= set.letters.length;
            return (
              <View key={set.name} style={styles.tileSetRow}>
                <View style={styles.tileSetInfo}>
                  <Text style={[styles.tileSetName, isComplete && styles.tileSetComplete]}>
                    {set.name}
                  </Text>
                  <Text style={styles.tileSetProgress}>
                    {collected}/{set.letters.length}
                  </Text>
                </View>
                <View style={styles.tileSetLetters}>
                  {set.letters.map((letter, idx) => {
                    const owned = collectedTiles.includes(letter);
                    return (
                      <View
                        key={`${set.name}-${letter}-${idx}`}
                        style={[
                          styles.miniTile,
                          owned ? styles.miniTileOwned : styles.miniTileMissing,
                        ]}
                      >
                        <Text
                          style={[
                            styles.miniTileText,
                            owned ? styles.miniTileTextOwned : styles.miniTileTextMissing,
                          ]}
                        >
                          {letter}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        <SectionHeader label="LETTER VAULT" accent={COLORS.gold} meta="RARITY-TINTED" />
        <View style={styles.tilesGrid}>
          {ALPHABET.map((letter) => {
            const owned = collectedTiles.includes(letter);
            const rarityColor = RARITY_COLOR[letterRarity(letter)];
            return (
              <View
                key={letter}
                style={[
                  styles.tile,
                  owned
                    ? [styles.tileOwned, { borderColor: rarityColor }, SHADOWS.glow(rarityColor)]
                    : [styles.tileMissing, { borderColor: rarityColor + '3D' }],
                ]}
                accessibilityRole="text"
                accessibilityLabel={`Letter ${letter}, ${owned ? 'collected' : 'not collected'}`}
              >
                {owned && (
                  <LinearGradient
                    colors={[...GRADIENTS.button.gold]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                  />
                )}
                <Text
                  style={[
                    styles.tileText,
                    owned ? styles.tileTextOwned : styles.tileTextMissing,
                  ]}
                >
                  {letter}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  const renderSeasonalStamps = () => {
    const collectedCount = stamps.filter((s: any) => s.collected).length;
    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.stampsContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.seasonBanner, bentoPanel('purple', { padding: 20 })]}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <LinearGradient
            colors={[COLORS.purple + '2E', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <Text style={styles.seasonEyebrow}>SEASONAL ALBUM</Text>
          <Text style={styles.seasonName}>{seasonName}</Text>
          <Text style={styles.seasonProgress}>
            {collectedCount} / {stamps.length} stamps
          </Text>
          <View style={styles.seasonMeter}>
            <NeonProgressBar
              progress={stamps.length > 0 ? collectedCount / stamps.length : 0}
              color={COLORS.purple}
              height={8}
            />
          </View>
        </View>

        <View style={styles.stampsGrid}>
          {stamps.map((stamp: any, stampIdx: number) => (
            <View
              key={stamp.id}
              style={[
                styles.stampCard,
                stamp.collected
                  ? [bentoPanel('purple', { padding: 12, marginBottom: 0, borderRadius: RADIUS.xl })]
                  : styles.stampMissing,
              ]}
              accessibilityRole="text"
              accessibilityLabel={`Stamp: ${stamp.collected ? stamp.name : 'undiscovered'}, ${stamp.collected ? 'collected' : 'not collected'}`}
            >
              {stamp.collected && (
                <LinearGradient
                  colors={[...GRADIENTS.surfaceCard]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
              )}
              {/* Illustrated postage stamp — perforated die-cut paper with a
                  big full-color picture panel washed in the motif's own color
                  family, an engraved denomination, and a rarity-dressed frame
                  (every 5th rare, the album's last epic). Paper tint rotates
                  per index so the sheet reads as a real album page. */}
              <StampArt
                stampId={stamp.id}
                icon={stamp.icon}
                name={stamp.name}
                earned={!!stamp.collected}
                accent={COLORS.purple}
                size={STAMP_SIZE}
                paperTint={STAMP_PAPERS[stampIdx % STAMP_PAPERS.length]}
                value={String(stampIdx + 1)}
                rarity={stampRarity(stampIdx, stamps.length)}
                style={styles.stampMedallion}
              />
              <Text
                style={[
                  styles.stampName,
                  !stamp.collected && styles.stampNameDim,
                ]}
                numberOfLines={2}
              >
                {stamp.collected ? stamp.name : '???'}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  return (
    <ScreenScaffold
      title="COLLECTIONS"
      backdrop="collections"
      scroll={false}
      headerRight={
        <Image
          source={LOCAL_IMAGES.crystalGems}
          style={styles.headerGem}
          resizeMode="contain"
        />
      }
    >
      {/* First-visit coach mark — an IN-FLOW glass banner under the header.
          It pushes the tab bar + list down instead of floating over them
          (the old absolutely-positioned Tooltip occluded the atlas cards). */}
      {showTooltip && (
        <Pressable
          onPress={() => {
            setShowTooltip(false);
            markTooltipShown('collections_screen');
          }}
          style={({ pressed }) => [styles.coachBanner, pressed && styles.coachBannerPressed]}
          accessibilityRole="button"
          accessibilityLabel="Tip: Collect words, rare tiles, and seasonal stamps as you play. Complete sets for bonus rewards. Tap to dismiss"
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
            <DiamondGlyph size={19} accent={COLORS.cyan} />
          </DrawnMedallion>
          <Text style={styles.coachBannerText}>
            Collect words, rare tiles & seasonal stamps — complete sets for bonus rewards!
          </Text>
          <View style={styles.coachDismiss}>
            <Text style={styles.coachDismissText}>{'✕'}</Text>
          </View>
        </Pressable>
      )}
      <View
        style={styles.tabBar}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        <LinearGradient
          colors={[...GRADIENTS.surface]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        {pillWidth > 0 && (
          <Animated.View
            style={[
              styles.tabPill,
              {
                width: pillWidth,
                borderColor: activeAccent + '66',
                transform: [{ translateX: pillX }],
              },
              SHADOWS.neonEdge(activeAccent),
            ]}
          >
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <View style={[styles.tabPillUnderline, { backgroundColor: activeAccent }]} />
          </Animated.View>
        )}
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            onPress={() => setActiveTab(tab)}
            accessibilityRole="tab"
            accessibilityLabel={tab}
            accessibilityState={{ selected: activeTab === tab }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && [
                  styles.tabTextActive,
                  { color: TAB_ACCENT[tab], textShadowColor: TAB_ACCENT[tab] + '8C' },
                ],
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonCard style={{ height: 80 }} />
          <SkeletonCard style={{ height: 80 }} />
          <SkeletonCard style={{ height: 80 }} />
          <SkeletonCard style={{ height: 80 }} />
        </ScrollView>
      ) : (
        <>
          {activeTab === 'Word Atlas' && renderWordAtlas()}
          {activeTab === 'Rare Tiles' && renderRareTiles()}
          {activeTab === 'Seasonal Stamps' && renderSeasonalStamps()}
        </>
      )}
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
    // Opaque base so the hex-grid backdrop can't bleed through the
    // translucent gradient fill layered on top.
    backgroundColor: 'rgba(12,4,28,0.94)',
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
  headerGem: {
    width: 30,
    height: 30,
  },
  shineStripe: {
    width: '60%',
    height: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: RADIUS.xl,
    padding: 4,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    ...SHADOWS.medium,
  },
  tabPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabPillUnderline: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: 26,
    height: 2.5,
    borderTopLeftRadius: RADIUS.sm,
    borderTopRightRadius: RADIUS.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
  },
  tabPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
  tabText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    letterSpacing: 0.3,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    fontFamily: FONTS.bodyBold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  tabContent: {
    flex: 1,
  },
  atlasGrid: {
    paddingHorizontal: 16,
  },
  // Featured atlas page — large hero card at the top of the tab.
  atlasFeaturedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,4,28,0.96)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 7,
  },
  atlasFeaturedEyebrow: {
    fontSize: 9,
    fontFamily: FONTS.display,
    letterSpacing: 2.5,
    marginBottom: 2,
  },
  atlasFeaturedName: {
    fontSize: 19,
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  // 2-column grid for the remaining pages — breaks the repeating-list feel.
  atlasGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  atlasCompactCard: {
    width: '48.4%',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,4,28,0.96)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  atlasCompactMedallion: {
    marginBottom: 8,
  },
  atlasCompactName: {
    fontSize: 13,
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    color: COLORS.textPrimary,
    marginBottom: 1,
    textAlign: 'center',
  },
  atlasCompactProgress: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  atlasCompactBar: {
    alignSelf: 'stretch',
  },
  // Full-width break inside the wrap grid for an expanded word list.
  atlasGridWordListWrap: {
    width: '100%',
  },
  pressedCard: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  atlasMedallion: {
    marginRight: 14,
  },
  atlasInfo: {
    flex: 1,
    // minWidth 0 lets the flexed column actually shrink at narrow widths so
    // names/progress wrap instead of pushing the row and clipping (390px fix).
    minWidth: 0,
  },
  atlasName: {
    fontSize: 15,
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  atlasNameComplete: {
    color: COLORS.goldLight,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  atlasProgress: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  completeRibbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.gold,
    borderBottomLeftRadius: RADIUS.lg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    ...SHADOWS.glow(COLORS.gold),
  },
  completeRibbonText: {
    fontSize: 9,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    color: COLORS.bg,
  },
  vaultMeter: {
    marginBottom: 16,
  },
  tilesContainer: {
    paddingHorizontal: 16,
  },
  tileSetsSection: {
    overflow: 'hidden',
    backgroundColor: 'rgba(12,4,28,0.96)',
  },
  tileSetRow: {
    marginBottom: 12,
  },
  tileSetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tileSetName: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
    letterSpacing: 2,
  },
  tileSetComplete: {
    color: COLORS.gold,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  tileSetProgress: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textMuted,
  },
  tileSetLetters: {
    flexDirection: 'row',
    gap: 6,
  },
  miniTile: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTileOwned: {
    backgroundColor: COLORS.gold,
    ...SHADOWS.glow(COLORS.gold),
  },
  miniTileMissing: {
    backgroundColor: COLORS.cellDefault,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  miniTileText: {
    fontSize: 12,
    fontFamily: FONTS.display,
  },
  miniTileTextOwned: {
    color: COLORS.bg,
  },
  miniTileTextMissing: {
    color: COLORS.textMuted,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileOwned: {},
  tileMissing: {
    backgroundColor: COLORS.cellDefault,
  },
  tileText: {
    fontSize: 18,
    fontFamily: FONTS.display,
  },
  tileTextOwned: {
    color: COLORS.bg,
  },
  tileTextMissing: {
    color: COLORS.textMuted,
  },
  stampsContainer: {
    paddingHorizontal: 16,
  },
  seasonBanner: {
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 12,
    backgroundColor: 'rgba(12,4,28,0.96)',
  },
  seasonEyebrow: {
    fontSize: 10,
    fontFamily: FONTS.display,
    letterSpacing: 3,
    color: COLORS.purpleLight,
    marginBottom: 4,
  },
  seasonName: {
    fontSize: 22,
    fontFamily: FONTS.display,
    color: COLORS.purpleLight,
    marginBottom: 6,
    textShadowColor: COLORS.purpleGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  seasonProgress: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  seasonMeter: {
    alignSelf: 'stretch',
  },
  stampsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginTop: 8,
  },
  stampCard: {
    width: (width - 68) / 3,
    borderRadius: RADIUS.xl,
    padding: 12,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(12,4,28,0.96)',
  },
  stampMissing: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.borderDisabled,
  },
  stampMedallion: {
    marginBottom: 8,
  },
  stampName: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  stampNameDim: {
    color: COLORS.textMuted,
  },
  bottomSpacer: {
    height: 110,
  },
  atlasWordList: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(18,7,36,0.94)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.14)',
    marginTop: -4,
    marginBottom: 10,
  },
  atlasWordChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  atlasWordChipFound: {
    borderColor: 'rgba(0,229,255,0.45)',
    ...SHADOWS.soft,
  },
  atlasWordText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.cyan,
    letterSpacing: 1,
  },
  atlasWordHidden: {
    color: COLORS.textMuted,
  },
});

export default CollectionsScreen;
