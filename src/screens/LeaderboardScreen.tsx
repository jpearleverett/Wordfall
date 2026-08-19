import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS, RADIUS } from '../constants';
import { getLevelConfigExtended } from '../engine/puzzleGenerator';
import ScreenScaffold from '../components/common/ScreenScaffold';
import IconMedallion from '../components/common/IconMedallion';
import AvatarPortrait from '../components/cosmetics/AvatarPortrait';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { LOCAL_IMAGES } from '../utils/localAssets';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import {
  usePlayerStore,
  usePlayerActions,
  selectCurrentLevel,
  selectDailyCompleted,
  selectTotalScore,
  selectFriendIds,
  selectReferralCode,
  selectReferralCount,
  selectReferralMilestonesClaimed,
} from '../stores/playerStore';
import {
  firestoreService,
  FirestoreLeaderboardEntry,
} from '../services/firestore';
import { analytics } from '../services/analytics';
import { SendGiftButton } from '../components/social/SendGiftButton';
import ReferralCard from '../components/ReferralCard';
import ReferralPendingRewards from '../components/ReferralPendingRewards';
import FriendLeaderboardCard from '../components/FriendLeaderboardCard';

const { width } = Dimensions.get('window');

const TIME_TABS = ['Daily', 'Weekly', 'All-Time'] as const;
type TimeTab = (typeof TIME_TABS)[number];

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  rank: number;
  avatar?: string;
}

// Seeded PRNG for deterministic mock data (Mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOCK_FIRST_NAMES = [
  'Alex', 'Blake', 'Casey', 'Dana', 'Eliot', 'Finn', 'Gray', 'Harper',
  'Iris', 'Jules', 'Kai', 'Luna', 'Morgan', 'Nova', 'Orion', 'Parker',
  'Quinn', 'Riley', 'Sage', 'Taylor', 'Uma', 'Val', 'Wren', 'Xan',
  'Yuki', 'Zara', 'Avery', 'Blair', 'Cedar', 'Drew', 'Eden', 'Fox',
  'Gem', 'Haven', 'Ivy', 'Jade', 'Kira', 'Lark', 'Mika', 'Neve',
  'Oakley', 'Pax', 'Rain', 'Sky', 'Tatum', 'Uri', 'Vesper', 'Winter',
  'Xena', 'Zephyr',
];

function generateMockLeaderboard(
  seed: number,
  playerScore: number | null,
  playerId: string
): LeaderboardEntry[] {
  const rng = mulberry32(seed);
  const entries: LeaderboardEntry[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < 50; i++) {
    let name: string;
    do {
      name = MOCK_FIRST_NAMES[Math.floor(rng() * MOCK_FIRST_NAMES.length)];
    } while (usedNames.has(name));
    usedNames.add(name);

    const baseScore = Math.floor(800 - i * 12 + rng() * 200);
    const score = Math.max(100, baseScore);
    entries.push({ id: `mock_${i}`, name, score, rank: i + 1 });
  }

  entries.sort((a, b) => b.score - a.score);

  if (playerScore !== null && playerScore > 0) {
    entries.push({ id: playerId, name: 'You', score: playerScore, rank: 0 });
    entries.sort((a, b) => b.score - a.score);
    entries.splice(50);
  }

  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries;
}

function formatTodayDate(): string {
  const today = new Date();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
}

function firestoreToEntries(
  data: FirestoreLeaderboardEntry[],
  currentUserId: string
): LeaderboardEntry[] {
  return data.map((entry, index) => ({
    id: entry.userId,
    name: entry.userId === currentUserId ? 'You' : entry.displayName,
    score: entry.score,
    rank: index + 1,
  }));
}

type LeaderboardScope = 'global' | 'friends' | 'club';

interface LeaderboardScreenProps {
  leaderboardData?: any[];
  currentUserId?: string;
  activeTab?: string;
  onChangeTab?: (tab: string) => void;
  /** Filter scope — 'global' (default) shows Firestore top 50; 'friends'
   *  restricts to the player's friend circle + self; 'club' is reserved for
   *  future club-scoped cross-club comparisons. */
  scope?: LeaderboardScope;
}

// ─────────────────────────────────────────────────────────────────────────────
// Design primitives (screen-local)
// ─────────────────────────────────────────────────────────────────────────────

/** Metallic specs for the crafted gold / silver / bronze rank medallions.
 *  `edge` is the thin dark rim that sells the coin as struck metal; `score`
 *  is the podium score tint (lighter than the raw metal so it stays legible
 *  on the dark-violet card surface). */
const MEDAL_SPECS: Record<
  number,
  {
    metal: readonly [string, string, string];
    glow: string;
    text: string;
    edge: string;
    score: string;
  }
> = {
  1: { metal: ['#fff3c4', '#ffd24d', '#a86f00'], glow: COLORS.gold, text: '#3a2600', edge: 'rgba(122,80,0,0.92)', score: COLORS.goldLight },
  2: { metal: ['#ffffff', '#c9d3e6', '#7e8ca6'], glow: COLORS.chrome, text: '#1f2738', edge: 'rgba(90,104,132,0.92)', score: COLORS.chromeHighlight },
  3: { metal: ['#f4b880', '#cd7f32', '#7a4715'], glow: '#e08e3c', text: '#331c04', edge: 'rgba(104,60,16,0.92)', score: '#f2a55e' },
};

/**
 * RankMedallion — crafted rank disc. Top-3 get a metallic gradient coin with
 * a glass highlight and colored glow; everyone else gets a quiet glass disc.
 * Replaces the emoji medals the art review flagged as placeholder art.
 */
function RankMedallion({ rank, size = 34 }: { rank: number; size?: number }) {
  const spec = MEDAL_SPECS[rank];
  if (!spec) {
    return (
      <View
        style={[
          medStyles.glassDisc,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Text style={[medStyles.glassRankText, { fontSize: size * 0.4 }]}>{rank}</Text>
      </View>
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: spec.edge,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: spec.metal[2],
        shadowColor: spec.glow,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: size * 0.3,
        elevation: 8,
      }}
    >
      {/* Struck-coin shading: lit crown at top falling to a dark lower rim,
          held in by the thin dark edge border above. */}
      <LinearGradient
        colors={[...spec.metal]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Glass top highlight */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.08,
          left: size * 0.18,
          right: size * 0.18,
          height: size * 0.18,
          borderRadius: size * 0.09,
          backgroundColor: 'rgba(255,255,255,0.45)',
        }}
      />
      <Text
        style={{
          fontFamily: FONTS.display,
          fontSize: size * 0.42,
          color: spec.text,
        }}
      >
        {rank}
      </Text>
    </View>
  );
}

/**
 * Six neon two-tone ring pairs — deterministic pick via name hash so each
 * player keeps a stable, designed-looking gradient instead of a flat tint.
 */
const AVATAR_HUE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  [COLORS.purple, COLORS.cyan],
  [COLORS.cyan, COLORS.teal],
  [COLORS.gold, COLORS.orange],
  [COLORS.green, COLORS.teal],
  [COLORS.accentLight, COLORS.purpleLight],
  [COLORS.orange, COLORS.purple],
];

function hashSeed(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Hue pair is salted DIFFERENTLY from the portrait pose seed (see
 * `GlassAvatar`), so two names that collide onto the same pose still land on
 * different ring colors instead of reading as a copy-pasted avatar.
 */
function nameHuePair(name: string): readonly [string, string] {
  return AVATAR_HUE_PAIRS[hashSeed(name + '#hue') % AVATAR_HUE_PAIRS.length];
}

/**
 * GlassAvatar — illustrated player gem. The inner disc hosts the bespoke
 * `AvatarPortrait` keeper art, seeded deterministically by the player's name
 * (so a given name always shows the same character), backdrop-tinted by the
 * same per-player hue pair that colors the gradient ring. Ranked rows pass
 * `rank` so the pose seed mixes in a rank bucket — with only six poses and six
 * hue pairs, adjacent rows otherwise collide onto identical pose+hue combos.
 * Podium rows pass `rim` to wrap the gem in a metallic ring matching their
 * rank metal, which also feeds the portrait's rim light.
 */
function GlassAvatar({
  name,
  size = 36,
  highlighted = false,
  rank,
  rim,
}: {
  name: string;
  size?: number;
  highlighted?: boolean;
  rank?: number;
  rim?: readonly [string, string, string];
}) {
  const [hueA, hueB] = highlighted
    ? ([COLORS.accentLight, COLORS.accent] as const)
    : nameHuePair(name);
  const hue = highlighted ? COLORS.accent : hueA;
  // The current user's gem stays seeded by name ALONE so their character is
  // stable across every screen (EditProfile hero, sticky bar, list row).
  const portraitSeed =
    !highlighted && rank != null ? `${name}#${rank % 3}` : name;
  const ringColors: readonly [string, string, string] =
    rim ?? ([hueA, hueB, hueA + 'D9'] as const);
  const pad = 1.5;
  const inner = size - pad * 2;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: rim ? rim[1] : hue,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: highlighted || rim ? 0.6 : 0.35,
        shadowRadius: size * 0.2,
        elevation: highlighted || rim ? 7 : 4,
      }}
    >
      <LinearGradient
        colors={[...ringColors]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ flex: 1, borderRadius: size / 2, padding: pad }}
      >
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            overflow: 'hidden',
            backgroundColor: 'rgba(8, 2, 22, 0.95)',
          }}
        >
          {/* Illustrated keeper portrait — deterministic per name, so each
              player keeps a stable character instead of a letter initial.
              Podium rims lend the portrait their metal as its rim light. */}
          <AvatarPortrait
            size={inner}
            accent={hue}
            variant={portraitSeed}
            rimColor={rim ? rim[0] : undefined}
          />
          {/* Glass sheen keeps the gem language over the art */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: size * 0.04,
              left: size * 0.16,
              right: size * 0.16,
              height: size * 0.22,
              borderRadius: size * 0.11,
              backgroundColor: 'rgba(255,255,255,0.14)',
              transform: [{ scaleY: 0.55 }],
            }}
          />
        </View>
      </LinearGradient>
    </View>
  );
}

const medStyles = StyleSheet.create({
  glassDisc: {
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glassRankText: {
    fontFamily: FONTS.display,
    color: COLORS.textMuted,
  },
});

/**
 * GlyphMedallion — IconMedallion's layered-gem body, but hosting drawn
 * View-based glyphs instead of raw emoji (the art review's residual flag).
 */
function GlyphMedallion({
  size = 38,
  accent = COLORS.purple,
  muted = false,
  children,
}: {
  size?: number;
  accent?: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
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
      ]}
    >
      <LinearGradient
        colors={[
          muted ? 'rgba(255,255,255,0.05)' : accent + '3D',
          'rgba(8, 2, 22, 0.92)',
        ]}
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

/** Drawn sun — gold gradient core with crossed ray bars, no emoji. */
function SunGlyph({ size = 20 }: { size?: number }) {
  const core = size * 0.54;
  const ray = { position: 'absolute' as const, width: size, height: size * 0.1, borderRadius: size * 0.05, backgroundColor: COLORS.gold + 'B3' };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={ray} />
      <View style={[ray, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[ray, { transform: [{ rotate: '90deg' }] }]} />
      <View style={[ray, { transform: [{ rotate: '135deg' }] }]} />
      <View
        style={{
          width: core,
          height: core,
          borderRadius: core / 2,
          overflow: 'hidden',
          shadowColor: COLORS.gold,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: size * 0.3,
          elevation: 4,
        }}
      >
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

/** Drawn mini trophy — gold gradient cup + handles, stem and base. */
function TrophyGlyph({ size = 18, accent = COLORS.gold }: { size?: number; accent?: string }) {
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
        <View
          style={{
            position: 'absolute',
            top: size * 0.04,
            left: size * 0.1,
            width: size * 0.16,
            height: size * 0.1,
            borderRadius: size * 0.08,
            backgroundColor: 'rgba(255,255,255,0.55)',
          }}
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

/** Drawn 8-point star burst — two crossed gradient squares + hot core. */
function StarBurstGlyph({ size = 30 }: { size?: number }) {
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
          colors={[COLORS.goldLight, COLORS.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View style={square}>
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
          width: sq * 0.34,
          height: sq * 0.34,
          borderRadius: sq * 0.17,
          backgroundColor: 'rgba(255,255,255,0.6)',
        }}
      />
    </View>
  );
}

/**
 * SegmentedNeonTabs — the single tab control language for this screen. A
 * glass track with a spring-animated neon glow pill sliding under the active
 * segment; replaces the two stacked flat web tab bars.
 */
function SegmentedNeonTabs({
  tabs,
  activeKey,
  onSelect,
  accent = COLORS.accent,
  compact = false,
  a11yLabelSuffix = '',
}: {
  tabs: ReadonlyArray<{ key: string; label: string }>;
  activeKey: string;
  onSelect: (key: string) => void;
  accent?: string;
  compact?: boolean;
  a11yLabelSuffix?: string;
}) {
  const reduceMotion = useReduceMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === activeKey));
  const anim = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(activeIndex);
      return;
    }
    Animated.spring(anim, {
      toValue: activeIndex,
      stiffness: 260,
      damping: 26,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, reduceMotion, anim]);

  const pad = compact ? 2 : 3;
  const segWidth = trackWidth > 0 ? (trackWidth - pad * 2) / tabs.length : 0;
  const maxIndex = Math.max(1, tabs.length - 1);
  const translateX = anim.interpolate({
    inputRange: [0, maxIndex],
    outputRange: [0, segWidth * maxIndex],
  });

  return (
    <View
      style={[segStyles.track, compact && segStyles.trackCompact]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {/* Glass gradient fill so the track reads as a lit surface, not a flat pill */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.01)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: RADIUS.full }]}
      />
      {segWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            segStyles.indicator,
            compact && segStyles.indicatorCompact,
            {
              width: segWidth,
              borderColor: accent + '66',
              backgroundColor: accent + '1C',
              shadowColor: accent,
              transform: [{ translateX }],
            },
          ]}
        >
          <LinearGradient
            colors={[accent + '30', accent + '0A']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: RADIUS.full }]}
          />
          <View style={[segStyles.indicatorUnderline, { backgroundColor: accent }]} />
        </Animated.View>
      )}
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            style={({ pressed }) => [
              segStyles.segment,
              compact && segStyles.segmentCompact,
              pressed && !isActive && segStyles.segmentPressed,
            ]}
            onPress={() => onSelect(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={`${tab.label}${a11yLabelSuffix}`}
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                segStyles.segmentText,
                compact && segStyles.segmentTextCompact,
                isActive && {
                  color: accent,
                  textShadowColor: accent + '80',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 8,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: RADIUS.full,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderSubtle,
  },
  trackCompact: {
    padding: 2,
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  indicatorCompact: {
    top: 2,
    bottom: 2,
    left: 2,
  },
  indicatorUnderline: {
    position: 'absolute',
    bottom: 3,
    alignSelf: 'center',
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  segment: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  segmentCompact: {
    paddingVertical: 5,
  },
  segmentPressed: {
    opacity: 0.7,
  },
  segmentText: {
    fontSize: 11,
    fontFamily: FONTS.display,
    letterSpacing: 1.1,
    color: COLORS.textMuted,
  },
  segmentTextCompact: {
    fontSize: 10,
    letterSpacing: 0.9,
  },
});

/**
 * One list row, extracted so React (with the Compiler's auto-memoization)
 * can bail out unchanged rows when the screen re-renders — previously every
 * tab/scope switch and Firestore refresh rebuilt all ~47 inline row subtrees.
 */
const LeaderboardRow = React.memo(function LeaderboardRow({
  entry,
  isCurrentUser,
  showDivider,
  showGift,
  alternate,
  onChallenge,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  showDivider: boolean;
  showGift: boolean;
  alternate: boolean;
  onChallenge: (entry: LeaderboardEntry) => void;
}) {
  return (
    <View>
      {showDivider && <View style={styles.listDivider} />}
      <View
        style={[
          styles.listRow,
          alternate && styles.listRowAlternate,
          isCurrentUser && styles.listRowHighlight,
        ]}
      >
        {isCurrentUser && (
          <LinearGradient
            colors={[COLORS.accent + '22', COLORS.accent + '08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <View style={styles.rankContainer}>
          <RankMedallion rank={entry.rank} size={30} />
        </View>
        <GlassAvatar
          name={entry.name}
          size={36}
          highlighted={isCurrentUser}
          rank={entry.rank}
        />
        <View style={styles.listInfo}>
          <Text
            style={[styles.listName, isCurrentUser && styles.listNameHighlight]}
            numberOfLines={1}
          >
            {entry.name}
            {isCurrentUser ? ' (You)' : ''}
          </Text>
        </View>
        <Text style={[styles.listScore, isCurrentUser && styles.listScoreHighlight]}>
          {entry.score.toLocaleString()}
        </Text>
        {!isCurrentUser && (
          <Pressable
            style={({ pressed }) => [styles.challengeButton, pressed && styles.chipPressed]}
            onPress={() => onChallenge(entry)}
            accessibilityRole="button"
            accessibilityLabel={`Challenge ${entry.name}`}
          >
            <LinearGradient
              pointerEvents="none"
              colors={[COLORS.accent + '3D', COLORS.accent + '10']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.challengeButtonText}>VS</Text>
          </Pressable>
        )}
        {!isCurrentUser && showGift && (
          <SendGiftButton
            recipientId={entry.id}
            recipientName={entry.name}
            relationship="friend"
            compact
          />
        )}
      </View>
    </View>
  );
});

const SCOPE_TABS = [
  { key: 'global', label: 'Global' },
  { key: 'friends', label: 'Friends' },
] as const;

const LeaderboardScreen: React.FC<
  LeaderboardScreenProps & {
    route?: { params?: { scope?: LeaderboardScope } };
    navigation?: { goBack: () => void; canGoBack?: () => boolean };
  }
> = ({
  leaderboardData,
  currentUserId: currentUserIdProp,
  activeTab: activeTabProp,
  onChangeTab: onChangeTabProp,
  scope: scopeProp,
  route,
  navigation,
}) => {
  const initialScope: LeaderboardScope = scopeProp ?? route?.params?.scope ?? 'global';
  const [scope, setScope] = useState<LeaderboardScope>(initialScope);
  const { user } = useAuth();
  const reduceMotion = useReduceMotion();
  const currentLevel = usePlayerStore(selectCurrentLevel);
  const dailyCompleted = usePlayerStore(selectDailyCompleted);
  const totalScore = usePlayerStore(selectTotalScore);
  const friendIds = usePlayerStore(selectFriendIds);
  const referralCode = usePlayerStore(selectReferralCode);
  const referralCount = usePlayerStore(selectReferralCount);
  const referralMilestonesClaimed = usePlayerStore(selectReferralMilestonesClaimed);
  const { sendChallenge, claimReferralMilestone } = usePlayerActions();
  const currentUserId = currentUserIdProp ?? user?.uid ?? '';

  useEffect(() => {
    if (scope === 'friends') {
      analytics.logEvent('friend_leaderboard_viewed', {
        friend_count: friendIds.length,
        surface: 'leaderboard_screen',
      });
    }
  }, [scope, friendIds.length]);

  const [activeTime, setActiveTime] = useState<TimeTab>('Daily');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firestoreEntries, setFirestoreEntries] = useState<LeaderboardEntry[]>([]);
  const [friendCode, setFriendCode] = useState('');
  const [myFriendCode, setMyFriendCode] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [addFriendFocused, setAddFriendFocused] = useState(false);

  // Champion card ambient shimmer — a slow breathing glow behind rank #1.
  const championPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) {
      championPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(championPulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(championPulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, championPulse]);

  const isFirestoreAvailable = firestoreService.isAvailable();

  // Check if player completed today's daily
  const today = new Date().toISOString().split('T')[0];
  const playerCompletedDaily = dailyCompleted.includes(today);
  const playerDailyScore = playerCompletedDaily
    ? Math.max(300, (totalScore % 900) + 200)
    : null;

  // Mock fallback for when Firestore is not available
  const mockDailyEntries = useMemo(() => {
    const dateSeed =
      new Date().getFullYear() * 10000 +
      (new Date().getMonth() + 1) * 100 +
      new Date().getDate();
    return generateMockLeaderboard(dateSeed, playerDailyScore, currentUserId);
  }, [playerDailyScore, currentUserId]);

  const mockWeeklyEntries = useMemo(() => {
    const weekSeed =
      new Date().getFullYear() * 100 +
      Math.ceil(
        (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
          604800000
      );
    return generateMockLeaderboard(weekSeed, totalScore > 0 ? Math.floor(totalScore * 0.3) : null, currentUserId);
  }, [totalScore, currentUserId]);

  const mockAllTimeEntries = useMemo(() => {
    return generateMockLeaderboard(42, totalScore > 0 ? totalScore : null, currentUserId);
  }, [totalScore, currentUserId]);

  // Fetch leaderboard data from Firestore
  const fetchLeaderboard = useCallback(
    async (tab: TimeTab) => {
      if (!isFirestoreAvailable) return;
      setLoading(true);
      try {
        let data: FirestoreLeaderboardEntry[] = [];
        if (tab === 'Daily') {
          data = await firestoreService.getDailyLeaderboard(50);
        } else if (tab === 'Weekly') {
          data = await firestoreService.getWeeklyLeaderboard(50);
        } else {
          data = await firestoreService.getAllTimeLeaderboard(50);
        }

        if (data.length > 0) {
          // Merge with current player if not already in the list
          const entries = firestoreToEntries(data, currentUserId);
          const playerInList = entries.some((e) => e.id === currentUserId);
          if (!playerInList && totalScore > 0) {
            let playerScore = 0;
            if (tab === 'Daily') playerScore = playerDailyScore || 0;
            else if (tab === 'Weekly') playerScore = Math.floor(totalScore * 0.3);
            else playerScore = totalScore;

            if (playerScore > 0) {
              entries.push({
                id: currentUserId,
                name: 'You',
                score: playerScore,
                rank: 0,
              });
              entries.sort((a, b) => b.score - a.score);
              entries.forEach((e, i) => (e.rank = i + 1));
            }
          }
          setFirestoreEntries(entries);
        } else {
          setFirestoreEntries([]);
        }
      } catch (e) {
        logger.warn('[Leaderboard] fetch failed:', e);
        setFirestoreEntries([]);
      }
      setLoading(false);
    },
    [currentUserId, isFirestoreAvailable, playerDailyScore, totalScore]
  );

  // Load friend code on mount
  useEffect(() => {
    if (currentUserId && isFirestoreAvailable) {
      firestoreService.generateFriendCode(currentUserId).then(setMyFriendCode);
    } else {
      setMyFriendCode(currentUserId.slice(0, 8).toUpperCase());
    }
  }, [currentUserId, isFirestoreAvailable]);

  // Fetch data when tab changes
  useEffect(() => {
    fetchLeaderboard(activeTime);
  }, [activeTime, fetchLeaderboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLeaderboard(activeTime);
    setRefreshing(false);
  }, [activeTime, fetchLeaderboard]);

  const [searchMode, setSearchMode] = useState<'code' | 'name'>('code');
  const [nameSearchResults, setNameSearchResults] = useState<Array<{ userId: string; displayName: string }>>([]);

  const handleAddFriend = useCallback(async () => {
    if (!addFriendInput.trim()) return;
    setAddingFriend(true);

    if (searchMode === 'name') {
      const results = await firestoreService.searchUsersByDisplayName(
        addFriendInput.trim(),
        currentUserId,
        10,
      );
      setNameSearchResults(results);
      setAddingFriend(false);
      analytics.logEvent('friend_search_performed', {
        query_length: addFriendInput.trim().length,
        results: results.length,
      });
      if (results.length === 0) {
        Alert.alert('No matches', 'No players found with that display name.');
      }
      return;
    }

    const result = await firestoreService.addFriend(currentUserId, addFriendInput.trim());
    setAddingFriend(false);
    if (result) {
      analytics.logEvent('friend_request_sent', { method: 'code' });
      Alert.alert(
        'Friend Request Sent!',
        `Request sent to ${result.friendName}. They will appear in your friends list once accepted.`,
      );
      setAddFriendInput('');
      setShowAddFriend(false);
    } else {
      Alert.alert(
        'Could Not Add Friend',
        'Friend code not found, or you already have a pending request with this player.',
      );
    }
  }, [addFriendInput, currentUserId, searchMode]);

  const handleSendRequestToSearchResult = useCallback(async (
    targetUid: string,
    targetName: string,
  ) => {
    setAddingFriend(true);
    const result = await firestoreService.createFriendRequest(currentUserId, targetUid);
    setAddingFriend(false);
    if (result && typeof result === 'object' && 'friendshipId' in result) {
      analytics.logEvent('friend_request_sent', { method: 'name' });
      Alert.alert('Friend Request Sent!', `Request sent to ${targetName}.`);
      setAddFriendInput('');
      setNameSearchResults([]);
      setShowAddFriend(false);
    } else if (result === 'self') {
      Alert.alert('Invalid Request', "You can't send a friend request to yourself.");
    } else if (result === 'exists') {
      Alert.alert('Already Requested', 'You already have a pending or accepted request with this player.');
    } else {
      Alert.alert('Request Failed', 'Could not send friend request. Please try again.');
    }
  }, [currentUserId]);

  // Determine which entries to show — prefer Firestore, fall back to mock
  const entries: LeaderboardEntry[] = useMemo(() => {
    const base =
      isFirestoreAvailable && firestoreEntries.length > 0
        ? firestoreEntries
        : activeTime === 'Daily'
          ? mockDailyEntries
          : activeTime === 'Weekly'
            ? mockWeeklyEntries
            : mockAllTimeEntries;

    if (scope !== 'friends') return base;

    // Friends scope: keep only rows whose id is in friendIds or is the current
    // user, then re-rank from 1. Mock entries (prefixed `mock_`) are dropped.
    // Copy each row before re-ranking — filter() shares the underlying entry
    // objects with the Global scope, and writing friend-scope ranks onto them
    // corrupts the Global list's rank numbers/medals after a tab round-trip.
    const allowed = new Set<string>([currentUserId, ...friendIds]);
    const filtered = base
      .filter((e) => allowed.has(e.id))
      .map((e) => ({ ...e }));
    filtered.sort((a, b) => b.score - a.score);
    filtered.forEach((e, i) => { e.rank = i + 1; });
    return filtered;
  }, [
    isFirestoreAvailable,
    firestoreEntries,
    activeTime,
    mockDailyEntries,
    mockWeeklyEntries,
    mockAllTimeEntries,
    scope,
    currentUserId,
    friendIds,
  ]);

  const handleChallenge = useCallback((entry: LeaderboardEntry) => {
    const level = currentLevel;
    // Extended: past level 600 the challenge board must use the live
    // procedural config, not the curated endgame-cycle fallthrough.
    const config = getLevelConfigExtended(level);
    sendChallenge(entry.id, {
      score: totalScore > 0 ? Math.floor(totalScore * 0.01) : 0,
      stars: 0,
      time: 0,
      level,
      seed: Date.now(),
      mode: 'classic',
      boardConfig: config,
    });
    Alert.alert('Challenge Sent!', `You challenged ${entry.name}!`);
  }, [currentLevel, totalScore, sendChallenge]);

  const currentUser = entries.find((e) => e.id === currentUserId);

  const renderTopThree = () => {
    const top3 = entries.slice(0, 3);
    if (top3.length === 0) return null;

    const order = [1, 0, 2];

    return (
      <View style={styles.topThreeContainer}>
        {order.map((idx) => {
          const entry = top3[idx];
          if (!entry) return <View key={idx} style={styles.topPlaceholder} />;

          const isFirst = idx === 0;
          const isMe = entry.id === currentUserId;
          const spec = MEDAL_SPECS[entry.rank] ?? MEDAL_SPECS[3];
          const metal = isMe
            ? ([COLORS.accentLight, COLORS.accent, COLORS.accentDark] as const)
            : spec.metal;
          const glow = isMe ? COLORS.accent : spec.glow;
          const scoreColor = isMe ? COLORS.accentLight : spec.score;

          return (
            // Metallic gradient border frame — glow scaled by rank.
            <LinearGradient
              key={entry.id}
              colors={[...metal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={[
                styles.topCardFrame,
                isFirst && styles.topCardFrameFirst,
                {
                  shadowColor: glow,
                  shadowOpacity: isFirst ? 0.6 : 0.3,
                },
              ]}
            >
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.topCard, isFirst && styles.topCardFirst]}
              >
                {isFirst && (
                  // Crown glow only: the gold breath stays a thin band behind
                  // the medallion. A full-card gold wash over the violet
                  // surface read as murky brown — the card body stays clean
                  // dark violet and gold lives on the rim/coin/score.
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '40%',
                      opacity: championPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.1, 0.32],
                      }),
                    }}
                  >
                    <LinearGradient
                      colors={[...GRADIENTS.goldShine] as [string, string, string]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </Animated.View>
                )}
                <RankMedallion rank={entry.rank} size={isFirst ? 44 : 34} />
                <View style={styles.topAvatarSpacer} />
                <GlassAvatar
                  name={entry.name}
                  size={isFirst ? 56 : 44}
                  highlighted={isMe}
                  rank={entry.rank}
                  rim={metal}
                />
                <Text style={styles.topName} numberOfLines={1}>
                  {entry.name}
                  {isMe ? ' (You)' : ''}
                </Text>
                <Text
                  style={[
                    styles.topScore,
                    {
                      color: scoreColor,
                      textShadowColor: glow + '60',
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 8,
                    },
                  ]}
                >
                  {entry.score.toLocaleString()}
                </Text>
              </LinearGradient>
            </LinearGradient>
          );
        })}
      </View>
    );
  };

  const onBack =
    navigation && (navigation.canGoBack ? navigation.canGoBack() : true)
      ? () => navigation.goBack()
      : undefined;

  return (
    <ScreenScaffold
      title={scope === 'friends' ? 'FRIENDS' : 'LEADERBOARD'}
      eyebrow="HALL OF FAME"
      accent={COLORS.accent}
      backdrop="leaderboard"
      scroll={false}
      onBack={onBack}
      headerRight={
        <IconMedallion
          source={LOCAL_IMAGES.trophyCrown}
          size={38}
          accent={COLORS.gold}
        />
      }
    >
      <View style={styles.body}>
        {/* Scope + time — one cohesive neon segmented control language */}
        <SegmentedNeonTabs
          tabs={SCOPE_TABS}
          activeKey={scope}
          onSelect={(key) => setScope(key as LeaderboardScope)}
          accent={COLORS.accent}
          a11yLabelSuffix=" leaderboard"
        />
        <View style={styles.tabGap} />
        <SegmentedNeonTabs
          tabs={TIME_TABS.map((t) => ({ key: t, label: t }))}
          activeKey={activeTime}
          onSelect={(key) => setActiveTime(key as TimeTab)}
          accent={COLORS.cyan}
          compact
          a11yLabelSuffix=" leaderboard"
        />

        {/* Daily Date Header */}
        {activeTime === 'Daily' && (
          <LinearGradient
            colors={['rgba(255,210,77,0.12)', 'rgba(255,149,0,0.04)'] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dailyDateBanner}
          >
            <GlyphMedallion size={26} accent={COLORS.gold}>
              <SunGlyph size={14} />
            </GlyphMedallion>
            <Text style={styles.dailyDateTitle} numberOfLines={1}>
              Daily Challenge
            </Text>
            <Text style={styles.dailyDateText} numberOfLines={1}>
              {formatTodayDate()}
            </Text>
            {!playerCompletedDaily && (
              <View style={styles.dailyNotCompleted}>
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(255,210,77,0.18)', 'rgba(255,210,77,0.04)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.dailyNotCompletedText}>Not played yet</Text>
              </View>
            )}
          </LinearGradient>
        )}

        {/* Friend Code + Add Friend — surfaced only on the Friends scope so
            the Global view keeps a clear runway to the podium */}
        {scope === 'friends' && (
          <>
          <View style={styles.friendCodeBar}>
            <LinearGradient
              pointerEvents="none"
              colors={[COLORS.accent + '14', 'rgba(255,255,255,0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.friendCodeLeft}>
              <Text style={styles.friendCodeLabel}>Your Code:</Text>
              <Text style={styles.friendCodeValue}>{myFriendCode}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.addFriendButton, pressed && styles.chipPressed]}
              onPress={() => setShowAddFriend(!showAddFriend)}
              accessibilityRole="button"
              accessibilityLabel={showAddFriend ? 'Cancel adding friend' : 'Add friend'}
            >
              <LinearGradient
                pointerEvents="none"
                colors={[COLORS.accent + '4D', COLORS.accent + '12']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.addFriendButtonText}>
                {showAddFriend ? 'Cancel' : '+ Add Friend'}
              </Text>
            </Pressable>
          </View>

          {showAddFriend && (
            <>
              <View style={styles.searchModeTabs}>
                <SegmentedNeonTabs
                  tabs={[
                    { key: 'code', label: 'By Code' },
                    { key: 'name', label: 'By Name' },
                  ]}
                  activeKey={searchMode}
                  onSelect={(key) => {
                    setSearchMode(key as 'code' | 'name');
                    setNameSearchResults([]);
                    setAddFriendInput('');
                  }}
                  accent={COLORS.purple}
                  compact
                />
              </View>
              <View style={styles.addFriendRow}>
                <TextInput
                  style={[
                    styles.addFriendInput,
                    addFriendFocused && styles.addFriendInputFocused,
                  ]}
                  placeholder={searchMode === 'code' ? 'Enter friend code...' : 'Search by display name...'}
                  placeholderTextColor={COLORS.textMuted}
                  value={addFriendInput}
                  onChangeText={setAddFriendInput}
                  onFocus={() => setAddFriendFocused(true)}
                  onBlur={() => setAddFriendFocused(false)}
                  autoCapitalize={searchMode === 'code' ? 'characters' : 'none'}
                  maxLength={searchMode === 'code' ? 12 : 40}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.addFriendSubmit,
                    SHADOWS.glow(COLORS.accent),
                    addingFriend && { opacity: 0.5 },
                    pressed && !addingFriend && styles.chipPressed,
                  ]}
                  onPress={handleAddFriend}
                  disabled={addingFriend}
                  accessibilityRole="button"
                  accessibilityLabel={searchMode === 'code' ? 'Send friend request' : 'Search by name'}
                >
                  <LinearGradient
                    colors={[...GRADIENTS.button.primary] as [string, string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.addFriendSubmitFill}
                  >
                    {addingFriend ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.addFriendSubmitText}>
                        {searchMode === 'code' ? 'SEND' : 'SEARCH'}
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
              {searchMode === 'name' && nameSearchResults.length > 0 && (
                <View style={styles.searchResultsCard}>
                  {nameSearchResults.map((r) => (
                    <View key={r.userId} style={styles.searchResultRow}>
                      <Text style={styles.searchResultName} numberOfLines={1}>{r.displayName}</Text>
                      <Pressable
                        style={({ pressed }) => [styles.searchResultBtn, pressed && styles.chipPressed]}
                        onPress={() => handleSendRequestToSearchResult(r.userId, r.displayName)}
                        disabled={addingFriend}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${r.displayName}`}
                      >
                        <LinearGradient
                          pointerEvents="none"
                          colors={[COLORS.accent + '3D', COLORS.accent + '10']}
                          start={{ x: 0.5, y: 0 }}
                          end={{ x: 0.5, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <Text style={styles.searchResultBtnText}>Add</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
          </>
        )}

        {!isFirestoreAvailable && (
          <View
            style={styles.practiceHeader}
            accessibilityLabel="Practice Arena. Live rankings return when you're back online"
          >
            <LinearGradient
              pointerEvents="none"
              colors={[COLORS.gold + '1F', 'rgba(255,255,255,0.01)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <GlyphMedallion size={34} accent={COLORS.gold}>
              <TrophyGlyph size={18} />
            </GlyphMedallion>
            <View style={styles.practiceHeaderBody}>
              <Text style={styles.practiceHeaderTitle}>PRACTICE ARENA</Text>
              <Text style={styles.practiceHeaderSub}>
                Live rankings return when you're back online
              </Text>
            </View>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
        >
          <ReferralPendingRewards />
          <FriendLeaderboardCard onViewAll={() => setScope('friends')} />
          {referralCode ? (
            <ReferralCard
              referralCode={referralCode}
              referralCount={referralCount}
              milestonesClaimed={referralMilestonesClaimed}
              onClaimMilestone={(count) => claimReferralMilestone(count)}
            />
          ) : null}

          {loading && entries.length === 0 ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.emptySubtext}>Loading leaderboard...</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.emptyState}>
              <GlyphMedallion size={72} accent={COLORS.gold}>
                <StarBurstGlyph size={34} />
              </GlyphMedallion>
              <Text style={styles.emptyText}>
                {scope === 'friends' ? 'No friend scores yet' : 'No leaderboard data yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {scope === 'friends'
                  ? 'Add friends with "+ Add Friend" above, or have them play today\'s daily.'
                  : 'Play puzzles to appear on the leaderboard!'}
              </Text>
            </View>
          ) : (
            <>
              {renderTopThree()}

              {/* Remaining entries */}
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.listCard}
              >
                {entries.slice(3).map((entry, index) => (
                  <LeaderboardRow
                    key={entry.id}
                    entry={entry}
                    isCurrentUser={entry.id === currentUserId}
                    showDivider={index > 0}
                    showGift={scope === 'friends' || friendIds.includes(entry.id)}
                    alternate={index % 2 === 1}
                    onChallenge={handleChallenge}
                  />
                ))}
              </LinearGradient>
            </>
          )}

          {/* Current user bar (sticky at bottom if not in top list) */}
          {currentUser && currentUser.rank > 3 && (
            <LinearGradient
              colors={
                [COLORS.accent + '18', COLORS.accent + '08'] as [string, string]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.currentUserBar}
            >
              <View style={styles.currentUserContent}>
                <Text style={styles.currentUserRank}>#{currentUser.rank}</Text>
                <GlassAvatar name={currentUser.name} size={36} highlighted />
                <Text style={styles.currentUserName} numberOfLines={1}>
                  {currentUser.name}
                </Text>
                <Text style={styles.currentUserScore}>
                  {currentUser.score.toLocaleString()}
                </Text>
              </View>
            </LinearGradient>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  tabGap: {
    height: 6,
  },
  // Slim single-line row (was a tall two-line card) — keeps the runway to
  // the podium short.
  dailyDateBanner: {
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,210,77,0.22)',
  },
  dailyDateTitle: {
    color: COLORS.gold,
    fontSize: 13,
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  dailyDateText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
  },
  dailyNotCompleted: {
    marginLeft: 'auto',
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,210,77,0.38)',
    overflow: 'hidden',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  dailyNotCompletedText: {
    color: COLORS.goldLight,
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    letterSpacing: 0.3,
  },
  friendCodeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  friendCodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  friendCodeLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
  },
  friendCodeValue: {
    fontSize: 14,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    letterSpacing: 2,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  addFriendButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(8, 2, 22, 0.6)',
    borderWidth: 1,
    borderColor: COLORS.accent + '66',
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  addFriendButtonText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
  },
  chipPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  addFriendRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  addFriendInput: {
    flex: 1,
    height: 42,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    letterSpacing: 2,
  },
  addFriendInputFocused: {
    borderColor: COLORS.accent + '99',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  addFriendSubmit: {
    height: 42,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  addFriendSubmitFill: {
    height: 42,
    minWidth: 86,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFriendSubmitText: {
    fontSize: 13,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
    color: '#fff',
  },
  searchModeTabs: {
    marginTop: 8,
  },
  searchResultsCard: {
    marginTop: 8,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingVertical: 4,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchResultName: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  searchResultBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(8, 2, 22, 0.6)',
    borderWidth: 1,
    borderColor: COLORS.accent + '55',
    overflow: 'hidden',
  },
  searchResultBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
  },
  // PRACTICE ARENA — designed gold-chip header for the offline state
  // (honest "you're offline" copy, styled as game copy, not a debug string).
  practiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 7,
    paddingLeft: 8,
    paddingRight: 16,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gold + '59',
    overflow: 'hidden',
    ...SHADOWS.glow(COLORS.gold),
  },
  practiceHeaderBody: {
    flexShrink: 1,
  },
  practiceHeaderTitle: {
    fontSize: 12,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    letterSpacing: 2,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  practiceHeaderSub: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
    marginTop: 1,
  },
  scrollView: {
    flex: 1,
    marginTop: 10,
  },
  content: {
    paddingBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 4,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  topThreeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 20,
    paddingTop: 10,
  },
  topPlaceholder: {
    width: (width - 52) / 3,
  },
  // Metallic border frame: gradient fill + 1.5px padding = gradient border.
  topCardFrame: {
    width: (width - 52) / 3,
    borderRadius: RADIUS.xl + 2,
    padding: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 8,
  },
  topCardFrameFirst: {
    marginBottom: 12,
    shadowRadius: 18,
    elevation: 12,
  },
  topCard: {
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    overflow: 'hidden',
    // Opaque violet floor: the surfaceCard gradient is ~12% translucent, and
    // compositing it straight over the metallic frame let gold bleed through
    // as a muddy brown. Ground it on the app's card violet instead.
    backgroundColor: '#1d0b36',
  },
  topCardFirst: {
    paddingVertical: 20,
  },
  topAvatarSpacer: {
    height: 8,
  },
  topName: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  topScore: {
    fontSize: 16,
    fontFamily: FONTS.display,
  },
  listCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    ...SHADOWS.medium,
  },
  listDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 14,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    overflow: 'hidden',
  },
  listRowAlternate: {
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  listRowHighlight: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  rankContainer: {
    width: 34,
    alignItems: 'center',
    marginRight: 10,
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listName: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
  },
  listNameHighlight: {
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  listScore: {
    fontSize: 15,
    fontFamily: FONTS.display,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  listScoreHighlight: {
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  currentUserBar: {
    marginTop: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.accent + '50',
    overflow: 'hidden',
    ...SHADOWS.glow(COLORS.accent),
  },
  currentUserContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  currentUserRank: {
    fontSize: 14,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    width: 40,
  },
  currentUserName: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: COLORS.accent,
  },
  currentUserScore: {
    fontSize: 16,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  challengeButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(8, 2, 22, 0.6)',
    borderWidth: 1,
    borderColor: COLORS.accent + '55',
    overflow: 'hidden',
  },
  challengeButtonText: {
    fontSize: 11,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default LeaderboardScreen;
