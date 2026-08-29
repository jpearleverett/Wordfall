import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { buildClubInviteLink } from '../utils/deepLinking';
import { useIsFocused } from '@react-navigation/native';
import Svg, {
  ClipPath,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { COLORS, GRADIENTS, SHADOWS, FONTS, RADIUS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import IconMedallion from '../components/common/IconMedallion';
import PrimaryButton from '../components/common/PrimaryButton';
import GameIcon from '../components/icons/GameIcon';
import { gradId } from '../components/icons/IconBase';
import { bentoPanel } from '../styles/bentoPanel';
import { useReduceMotion } from '../hooks/useReduceMotion';
import {
  usePlayerStore,
  usePlayerActions,
  selectClubId,
  selectEquippedTitle,
  selectPuzzlesSolved,
  selectStarsByLevel,
} from '../stores/playerStore';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService, ClubMessage } from '../services/firestore';
import { joinClubSecure, leaveClubSecure } from '../services/clubMembership';
import { analytics } from '../services/analytics';
import { getTitleLabel } from '../data/cosmetics';
import ClubGoalCard from '../components/ClubGoalCard';
import ClubLeaderboard from '../components/ClubLeaderboard';
import ClubSharedGoals from '../components/ClubSharedGoals';
import { GiftInbox } from '../components/GiftInbox';
import { SendGiftButton } from '../components/social/SendGiftButton';
import {
  generateClubGoal,
  ActiveClubGoal,
  ClubLeaderboardEntry,
} from '../data/clubEvents';
import { filterMessage } from '../utils/profanityFilter';

interface ClubMember {
  id: string;
  name: string;
  score: number;
  isLeader: boolean;
  isOnline: boolean;
}

interface ClubData {
  name: string;
  memberCount: number;
  maxMembers: number;
  weeklyScore: number;
  tier?: 'bronze' | 'silver' | 'gold' | 'diamond';
  members: ClubMember[];
  recentEmojis: Array<{ userId: string; emoji: string; timestamp: number }>;
  activeGoal?: ActiveClubGoal | null;
  leaderboardEntries?: ClubLeaderboardEntry[];
}

interface ClubScreenProps {
  clubId?: string | null;
  clubData?: any;
  // Optional overrides (tests). When omitted the screen uses the real
  // membership flow: joinClub/leaveClub callables + createClub direct write.
  onCreateClub?: (name: string) => void;
  onJoinClub?: (id: string) => void;
  onLeaveClub?: () => void;
  /** Injected by React Navigation; club_invite deep links set joinClubId. */
  route?: { params?: { joinClubId?: string } };
  /** Injected by React Navigation. */
  navigation?: { goBack: () => void; canGoBack?: () => boolean };
}

// ─────────────────────────────────────────────────────────────────────────────
// Design primitives (screen-local)
// ─────────────────────────────────────────────────────────────────────────────

const TIER_ACCENT: Record<string, string> = {
  bronze: COLORS.tierBronze,
  silver: COLORS.tierSilver,
  gold: COLORS.tierGold,
  diamond: COLORS.tierDiamond,
};

const TIER_METAL: Record<string, readonly [string, string, string]> = {
  bronze: ['#f4b880', '#cd7f32', '#7a4715'],
  silver: ['#ffffff', '#c9d3e6', '#7e8ca6'],
  gold: ['#fff3c4', '#ffd24d', '#a86f00'],
  diamond: ['#d9fbff', '#00e5ff', '#0077a8'],
};

/**
 * Softened CTA shadow — spread into PrimaryButton's `style` to override its
 * default hard {0,4} drop glow with a centered, smaller halo (blind-panel
 * "heavy drop-shadow gradient buttons" flag).
 */
const SOFT_BTN_SHADOW = {
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.32,
  shadowRadius: 7,
  elevation: 4,
} as const;

/**
 * CrestMedallion — layered squircle crest for clubs: metallic (or accent)
 * gradient ring, dark gem body, glass highlight, initial in the display font.
 * Replaces the flat single-letter shields and raw-emoji crests.
 */
function CrestMedallion({
  letter,
  size = 64,
  accent = COLORS.accent,
  ring,
}: {
  letter: string;
  size?: number;
  accent?: string;
  ring?: readonly [string, string, string];
}) {
  const tint = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent + '3D' : accent;
  const ringColors = ring ?? ([accent + 'C0', accent + '55', accent + 'C0'] as const);
  const outerRadius = size * 0.32;
  return (
    <LinearGradient
      colors={[...ringColors]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: outerRadius,
        padding: 2,
        shadowColor: ring ? ring[1] : accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: size * 0.22,
        elevation: 8,
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: outerRadius - 2,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(8, 2, 22, 0.92)',
        }}
      >
        <LinearGradient
          colors={[tint, 'rgba(8, 2, 22, 0.92)']}
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
            height: size * 0.15,
            borderRadius: size * 0.08,
            backgroundColor: 'rgba(255,255,255,0.14)',
          }}
        />
        <Text
          style={{
            fontFamily: FONTS.display,
            fontSize: size * 0.4,
            color: COLORS.textPrimary,
            textShadowColor: accent + '99',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 8,
          }}
        >
          {letter}
        </Text>
      </View>
    </LinearGradient>
  );
}

/** Metallic member-rank disc — gold/silver/bronze for the top 3, glass after. */
const RANK_METALS: Record<
  number,
  { metal: readonly [string, string, string]; text: string; ring: string }
> = {
  1: { metal: TIER_METAL.gold, text: '#3a2600', ring: 'rgba(255,222,120,0.95)' },
  2: { metal: TIER_METAL.silver, text: '#1f2738', ring: 'rgba(226,234,248,0.95)' },
  3: { metal: TIER_METAL.bronze, text: '#331c04', ring: 'rgba(235,164,96,0.95)' },
};

function RankDisc({ rank, size = 28 }: { rank: number; size?: number }) {
  const spec = RANK_METALS[rank];
  if (!spec) {
    return (
      <View
        style={[
          clubPrimStyles.glassDisc,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Text style={[clubPrimStyles.glassDiscText, { fontSize: size * 0.42 }]}>{rank}</Text>
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
        borderColor: spec.ring,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: spec.metal[2],
      }}
    >
      <LinearGradient
        colors={[...spec.metal]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Text style={{ fontFamily: FONTS.display, fontSize: size * 0.42, color: spec.text }}>
        {rank}
      </Text>
    </View>
  );
}

/** Glass avatar disc with accent-tinted gem body and initial. */
function MemberAvatar({
  name,
  size = 38,
  accent = COLORS.purple,
  online = false,
}: {
  name: string;
  size?: number;
  accent?: string;
  online?: boolean;
}) {
  const tint = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent + '3D' : accent;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: online ? 2 : 1,
          borderColor: online ? COLORS.green : accent + '55',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: 'rgba(8, 2, 22, 0.92)',
        },
        online && SHADOWS.glow(COLORS.green),
      ]}
    >
      <LinearGradient
        colors={[tint, 'rgba(8, 2, 22, 0.92)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.07,
          left: size * 0.18,
          right: size * 0.18,
          height: size * 0.15,
          borderRadius: size * 0.08,
          backgroundColor: 'rgba(255,255,255,0.12)',
        }}
      />
      <Text
        style={{ fontFamily: FONTS.display, fontSize: size * 0.42, color: COLORS.textPrimary }}
      >
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/**
 * GlyphMedallion — IconMedallion's layered-gem body, but hosting drawn
 * View-based glyphs instead of raw emoji (the art review's residual flag).
 */
function GlyphMedallion({
  size = 34,
  accent = COLORS.purple,
  muted = false,
  style,
  children,
}: {
  size?: number;
  accent?: string;
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
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: muted ? 'rgba(255,255,255,0.14)' : accent + '73',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: 'rgba(8, 2, 22, 0.92)',
          shadowColor: muted ? '#000' : accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: muted ? 0.2 : 0.3,
          shadowRadius: size * 0.22,
          elevation: muted ? 2 : 6,
        },
        muted && { opacity: 0.55 },
        style,
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

/** Drawn chat bubble — gradient rounded rect, rotated-square tail, 3 dots. */
function ChatBubbleGlyph({ size = 18, accent = COLORS.cyan }: { size?: number; accent?: string }) {
  const w = size;
  const h = size * 0.74;
  const dot = w * 0.13;
  return (
    <View style={{ width: w, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: w * 0.16,
          bottom: size * 0.04,
          width: w * 0.24,
          height: w * 0.24,
          borderRadius: w * 0.05,
          backgroundColor: accent,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          width: w,
          height: h,
          borderRadius: h * 0.42,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LinearGradient
          colors={[accent, accent + 'B3']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={{ flexDirection: 'row', gap: dot * 0.5 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                backgroundColor: 'rgba(8,2,22,0.75)',
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}


/** Drawn magnifier — ring + angled handle. */
function MagnifierGlyph({ size = 14, accent = COLORS.cyan }: { size?: number; accent?: string }) {
  const ring = size * 0.66;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: size * 0.13,
          borderColor: accent,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.02,
          bottom: size * 0.14,
          width: size * 0.42,
          height: size * 0.14,
          borderRadius: size * 0.07,
          backgroundColor: accent,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

/** Drawn mini padlock — ring shackle + gradient rounded-rect body. */
function LockGlyph({ size = 18, accent = COLORS.gold }: { size?: number; accent?: string }) {
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

/** Drawn 2x2 letter-tile grid — the club puzzle mark. */
function TileGridGlyph({ size = 20, accent = COLORS.accent }: { size?: number; accent?: string }) {
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
          colors={[COLORS.accentLight, accent]}
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

/**
 * ShieldCrest — the club emblem: soft accent halo, gold metallic rim, dark
 * inner-border groove, metallic purple face with a glass highlight, a small
 * crown docked over the rim, and ONE of the game's letter tiles
 * (selected-tile gradient, rounded display W) centered on the face. The
 * shield body is ONE SVG silhouette (the icon set's 24×24 heater-shield
 * geometry) drawn at three insets — the previous stacked-View build
 * (rounded-top block + rotated diamond point) let the diamond's square
 * corners poke outside the silhouette on some renderers (round-3 art flag).
 */
function ShieldCrest({ size = 92, muted = false }: { size?: number; muted?: boolean }) {
  const crownH = size * 0.27;
  const shieldTop = crownH * 0.55; // crown overlaps the rim by ~45%
  const shieldH = size * 0.91;
  const unit = shieldH / 20; // shield path spans y 2→22 of the 24×24 viewBox
  const svgSize = unit * 24;
  const height = shieldTop + shieldH + size * 0.03;
  const groove = 'rgba(14,5,30,0.97)';
  const face = ['#7040ae', '#341560', '#4b2280'] as const;
  const tile = size * 0.4;
  const tileTop = shieldTop + shieldH * 0.46 - tile / 2;
  const ids = useMemo(
    () => ({
      rim: gradId('crestRim'),
      face: gradId('crestFace'),
      clip: gradId('crestClip'),
    }),
    []
  );

  // One shield silhouette at three insets: rim → groove → face (the insets
  // match the old rimT / grooveT thicknesses, converted to viewBox units).
  const rimD = 'M12 2 L20 5 V13 C20 18 16 21 12 22 C8 21 4 18 4 13 V5 Z';
  const grooveD =
    'M12 3.15 L18.95 5.75 V12.95 C18.95 17.3 15.5 19.9 12 20.85 C8.5 19.9 5.05 17.3 5.05 12.95 V5.75 Z';
  const faceD =
    'M12 3.7 L18.4 6.1 V12.9 C18.4 16.9 15.3 19.35 12 20.25 C8.7 19.35 5.6 16.9 5.6 12.9 V6.1 Z';

  return (
    <View
      style={{
        width: size,
        height,
        alignItems: 'center',
        opacity: muted ? 0.55 : 1,
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: muted ? 0.2 : 0.3,
        shadowRadius: size * 0.2,
        elevation: muted ? 2 : 6,
      }}
    >
      {/* Soft halo behind the emblem */}
      <View
        style={{
          position: 'absolute',
          top: shieldTop + shieldH / 2 - size * 0.55,
          width: size * 1.1,
          height: size * 1.1,
          borderRadius: size * 0.55,
          backgroundColor: COLORS.accent + '14',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: shieldTop + shieldH / 2 - size * 0.4,
          width: size * 0.8,
          height: size * 0.8,
          borderRadius: size * 0.4,
          backgroundColor: COLORS.purple + '1F',
        }}
      />
      {/* Metallic rim → inner-border groove → metallic face */}
      <Svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 24 24"
        style={{ position: 'absolute', top: shieldTop - unit * 2 }}
      >
        <Defs>
          <SvgLinearGradient id={ids.rim} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={TIER_METAL.gold[0]} />
            <Stop offset="0.5" stopColor={TIER_METAL.gold[1]} />
            <Stop offset="1" stopColor={TIER_METAL.gold[2]} />
          </SvgLinearGradient>
          <SvgLinearGradient id={ids.face} x1="0.2" y1="0" x2="0.9" y2="1">
            <Stop offset="0" stopColor={face[0]} />
            <Stop offset="0.55" stopColor={face[1]} />
            <Stop offset="1" stopColor={face[2]} />
          </SvgLinearGradient>
          <ClipPath id={ids.clip}>
            <Path d={faceD} />
          </ClipPath>
        </Defs>
        {/* Same-paint round-join strokes soften the corners (old borderRadius). */}
        <Path
          d={rimD}
          fill={`url(#${ids.rim})`}
          stroke={`url(#${ids.rim})`}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <Path
          d={grooveD}
          fill={groove}
          stroke={groove}
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <Path
          d={faceD}
          fill={`url(#${ids.face})`}
          stroke={`url(#${ids.face})`}
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        {/* Glass top highlight, clipped to the face */}
        <Rect
          x="6"
          y="4.4"
          width="12"
          height="1.9"
          rx="0.95"
          fill="rgba(255,255,255,0.14)"
          clipPath={`url(#${ids.clip})`}
        />
      </Svg>
      {/* One of the game's letter tiles, centered on the face */}
      <View
        style={{
          position: 'absolute',
          top: tileTop,
          width: tile,
          height: tile,
          borderRadius: tile * 0.26,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.4)',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: COLORS.accent,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: tile * 0.2,
          elevation: 4,
        }}
      >
        <LinearGradient
          colors={[...GRADIENTS.tile.selected]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            position: 'absolute',
            top: tile * 0.07,
            left: tile * 0.12,
            right: tile * 0.12,
            height: tile * 0.2,
            borderRadius: tile * 0.1,
            backgroundColor: 'rgba(255,255,255,0.22)',
          }}
        />
        <Text
          style={{
            fontFamily: FONTS.displayRounded,
            fontSize: tile * 0.58,
            color: '#ffffff',
            textShadowColor: 'rgba(0,0,0,0.35)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          W
        </Text>
      </View>
      {/* Crown docked over the rim */}
      <View style={{ position: 'absolute', top: 0 }}>
        <GameIcon name="crown" size={crownH} accent={COLORS.gold} />
      </View>
    </View>
  );
}

/** Hero benefit bullet: icon in a tinted circular well (Home stat-card style) + copy. */
function BenefitRow({
  icon,
  accent,
  text,
}: {
  icon: React.ReactNode;
  accent: string;
  text: string;
}) {
  return (
    <View style={clubPrimStyles.benefitRow}>
      <View
        style={[
          clubPrimStyles.benefitWell,
          { backgroundColor: accent + '24', borderColor: accent + '55' },
        ]}
      >
        {icon}
      </View>
      <Text style={clubPrimStyles.benefitText}>{text}</Text>
    </View>
  );
}

const clubPrimStyles = StyleSheet.create({
  glassDisc: {
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glassDiscText: {
    fontFamily: FONTS.display,
    color: COLORS.textMuted,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  benefitWell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

const ClubScreen: React.FC<ClubScreenProps> = ({
  clubId: clubIdProp,
  clubData: clubDataProp = null,
  onCreateClub,
  onJoinClub,
  onLeaveClub,
  route,
  navigation,
}) => {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const isFocused = useIsFocused();
  const clubIdFromStore = usePlayerStore(selectClubId);
  const { setClubId } = usePlayerActions();
  const equippedTitle = usePlayerStore(selectEquippedTitle);
  const puzzlesSolved = usePlayerStore(selectPuzzlesSolved);
  const starsByLevel = usePlayerStore(selectStarsByLevel);
  const clubId = clubIdProp !== undefined ? clubIdProp : clubIdFromStore;
  const [searchText, setSearchText] = useState('');
  const [createName, setCreateName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [createFocused, setCreateFocused] = useState(false);
  const [chatFocused, setChatFocused] = useState(false);

  // Ambient breathing scale on the hero crest cluster (recruitment moment).
  // Sole consumer is renderNoClub's ShieldCrest, so the loop only runs while
  // that branch can render (no clubId) AND the screen is focused —
  // freezeOnBlur suspends rendering but does NOT stop an already-running
  // native-driver loop (HomeScreen's ambientActive convention). Otherwise
  // settle at 0 (scale 1).
  const crestPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (clubId || !isFocused || reduceMotion) {
      crestPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(crestPulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(crestPulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      crestPulse.setValue(0);
    };
  }, [clubId, isFocused, reduceMotion, crestPulse]);
  // S1 in launch_blockers.md: browse public clubs alongside join-by-code.
  const [browseList, setBrowseList] = useState<
    Array<{
      id: string;
      name: string;
      description: string;
      memberCount: number;
      maxMembers: number;
      weeklyScore: number;
    }>
  >([]);
  const [browseLoading, setBrowseLoading] = useState(false);

  const { user } = useAuth();
  const [chatMessages, setChatMessages] = useState<ClubMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  // ── Real membership wiring ────────────────────────────────────────────────
  // clubId is only a locally cached pointer; the club document itself is
  // fetched here. Join/leave go through the Cloud Function callables because
  // firestore.rules reserve memberIds/memberCount for the Admin SDK.
  const [fetchedClub, setFetchedClub] = useState<any | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<
    Array<{ id: string; displayName: string }>
  >([]);
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [clubFetchFailed, setClubFetchFailed] = useState(false);

  const refreshClub = useCallback(async () => {
    if (!clubId || !firestoreService.isAvailable()) return;
    setClubFetchFailed(false);
    const club = await firestoreService.getClub(clubId);
    if (!club) {
      // Missing OR unreachable — getClub can't tell the two apart, so never
      // clear the cached clubId here (PlayerContext's discovery effect
      // reconciles authoritative membership on app open). Just surface retry.
      setClubFetchFailed(true);
      return;
    }
    setFetchedClub(club);
    const ids: string[] = Array.isArray(club.memberIds) ? club.memberIds : [];
    const profiles = await firestoreService.getClubMemberProfiles(ids);
    setMemberProfiles(profiles);
  }, [clubId]);

  useEffect(() => {
    if (!clubId || clubDataProp) return;
    void refreshClub();
  }, [clubId, clubDataProp, refreshClub]);

  const handleJoinClub = useCallback(
    async (id: string) => {
      const target = id.trim();
      if (!target || membershipBusy) return;
      if (!firestoreService.isAvailable()) {
        Alert.alert('Offline', 'Clubs need an internet connection.');
        return;
      }
      setMembershipBusy(true);
      try {
        const res = await joinClubSecure(target);
        setClubId(res.clubId);
        setSearchText('');
        void analytics.logEvent('club_joined', { club_id: res.clubId });
      } catch (e: any) {
        const code = String(e?.code ?? '');
        let message = 'Could not join the club. Please try again.';
        if (code.endsWith('not-found')) {
          message = 'No club found with that code.';
        } else if (code.endsWith('failed-precondition')) {
          message = 'You are already in a club — leave it before joining another.';
        } else if (code.endsWith('resource-exhausted')) {
          message = 'That club is full (or you have switched clubs too often — try again later).';
        }
        Alert.alert('Could not join', message);
      } finally {
        setMembershipBusy(false);
      }
    },
    [membershipBusy, setClubId],
  );

  const handleCreateClub = useCallback(
    async (name: string) => {
      if (membershipBusy) return;
      if (!user || !firestoreService.isAvailable()) {
        Alert.alert('Offline', 'Clubs need an internet connection.');
        return;
      }
      setMembershipBusy(true);
      try {
        const newClubId = await firestoreService.createClub(user.uid, name, '');
        if (!newClubId) {
          Alert.alert('Could not create club', 'Please try again later.');
          return;
        }
        setClubId(newClubId);
        setShowCreate(false);
        setCreateName('');
        void analytics.logEvent('club_created', { club_id: newClubId });
      } finally {
        setMembershipBusy(false);
      }
    },
    [membershipBusy, user, setClubId],
  );

  const handleLeaveClub = useCallback(() => {
    if (!clubId || membershipBusy) return;
    Alert.alert('Leave club?', 'You can rejoin later if there is space.', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('club.leave'),
        style: 'destructive',
        onPress: async () => {
          setMembershipBusy(true);
          try {
            await leaveClubSecure(clubId);
            setClubId(null);
            setFetchedClub(null);
            setMemberProfiles([]);
            void analytics.logEvent('club_left', { club_id: clubId });
          } catch {
            Alert.alert('Could not leave club', 'Please try again later.');
          } finally {
            setMembershipBusy(false);
          }
        },
      },
    ]);
  }, [clubId, membershipBusy, setClubId, t]);

  // club_invite deep link → Profile > Club with { joinClubId }. Confirm
  // before joining so a tapped link never silently changes membership.
  const invitePromptedFor = useRef<string | null>(null);
  useEffect(() => {
    const inviteId = route?.params?.joinClubId;
    if (!inviteId || invitePromptedFor.current === inviteId) return;
    invitePromptedFor.current = inviteId;
    if (clubId === inviteId) return; // already a member of this club
    (async () => {
      const club = await firestoreService.getClub(inviteId);
      if (!club) {
        Alert.alert('Club not found', 'That club invite is no longer valid.');
        return;
      }
      const name = typeof club.name === 'string' ? club.name : 'this club';
      Alert.alert(`Join ${name}?`, 'You were invited to join this club.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Join', onPress: () => void handleJoinClub(inviteId) },
      ]);
    })();
  }, [route?.params?.joinClubId, clubId, handleJoinClub]);

  // Prop overrides win (tests); otherwise the real flow above.
  const joinClub = onJoinClub ?? handleJoinClub;
  const createClub = onCreateClub ?? handleCreateClub;
  const leaveClub = onLeaveClub ?? handleLeaveClub;

  // Load chat messages on mount when club is available
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    setChatLoading(true);
    firestoreService.getClubMessages(clubId, 50).then((messages) => {
      if (!cancelled) {
        setChatMessages(messages);
        setChatLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [clubId]);

  // Club-vs-club weekly rankings — the REAL server snapshot written by
  // updateClubLeaderboard at leaderboards/clubs_weekly. null = not loaded /
  // unavailable (offline), [] = read fine but no scores recorded this week.
  const [clubsWeeklyLb, setClubsWeeklyLb] = useState<
    ClubLeaderboardEntry[] | null
  >(null);
  const [clubsLbLoading, setClubsLbLoading] = useState(false);
  useEffect(() => {
    if (!clubId || !firestoreService.isAvailable()) return;
    let cancelled = false;
    setClubsLbLoading(true);
    firestoreService
      .getClubsWeeklyLeaderboard()
      .then((rows) => {
        if (cancelled) return;
        setClubsWeeklyLb(
          rows === null
            ? null
            : rows.map((r) => ({
                clubId: r.clubId,
                clubName: r.name,
                clubInitial: r.name.charAt(0).toUpperCase(),
                weeklyScore: r.score,
                memberCount: r.memberCount,
                tier: r.tier,
                rank: r.rank,
              })),
        );
      })
      .finally(() => {
        if (!cancelled) setClubsLbLoading(false);
      });
    return () => { cancelled = true; };
  }, [clubId]);

  // Load this user's block list — messages from blocked users are filtered out
  useEffect(() => {
    const userId = user?.uid;
    if (!userId) {
      setBlockedUserIds(new Set());
      return;
    }
    let cancelled = false;
    firestoreService.getBlockedUserIds(userId).then((ids) => {
      if (!cancelled) setBlockedUserIds(ids);
    });
    return () => { cancelled = true; };
  }, [user?.uid]);

  // S1: populate the club browser when the player has no club joined.
  // Only runs once on no-club entry; the Refresh button re-fetches on demand.
  useEffect(() => {
    if (clubId) return;
    if (!firestoreService.isAvailable()) return;
    let cancelled = false;
    setBrowseLoading(true);
    firestoreService
      .listPublicClubs({ limit: 20 })
      .then((clubs) => {
        if (!cancelled) setBrowseList(clubs);
      })
      .finally(() => {
        if (!cancelled) setBrowseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const refreshBrowseList = useCallback(async () => {
    if (!firestoreService.isAvailable()) return;
    setBrowseLoading(true);
    try {
      const clubs = await firestoreService.listPublicClubs({ limit: 20 });
      setBrowseList(clubs);
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  const handleMessageLongPress = useCallback(
    (message: ClubMessage) => {
      const currentUserId = user?.uid ?? 'local_user';
      if (message.userId === currentUserId) {
        // Let the author delete their own message
        Alert.alert(
          t('club.yourMessage'),
          t('club.deleteMessagePrompt'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.delete'),
              style: 'destructive',
              onPress: async () => {
                setChatMessages((prev) => prev.filter((m) => m.id !== message.id));
                // Best-effort: Firestore rule permits author delete via setDoc-rules/allow delete
              },
            },
          ],
        );
        return;
      }

      Alert.alert(
        message.displayName || t('club.player'),
        t('club.chooseAction'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('club.reportMessage'),
            onPress: () => confirmReportMessage(message),
          },
          {
            text: t('club.blockUser'),
            style: 'destructive',
            onPress: () => confirmBlockUser(message.userId, message.displayName),
          },
        ],
      );
    },
    [user?.uid, t],
  );

  const confirmReportMessage = useCallback(
    (message: ClubMessage) => {
      if (!clubId) return;
      const reasons: Array<'spam' | 'harassment' | 'hate' | 'other'> = [
        'spam',
        'harassment',
        'hate',
        'other',
      ];
      Alert.alert(
        t('club.reportMessage'),
        t('club.whyReport'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          ...reasons.map((r) => ({
            text: r.charAt(0).toUpperCase() + r.slice(1),
            onPress: async () => {
              const reporterId = user?.uid ?? 'local_user';
              const ok = await firestoreService.reportMessage(
                reporterId,
                clubId,
                message.id,
                message.userId,
                r,
                message.message,
              );
              Alert.alert(
                ok ? t('club.reported') : t('club.couldNotReport'),
                ok
                  ? t('club.reportThanks')
                  : t('club.tryAgainLater'),
              );
            },
          })),
        ],
      );
    },
    [clubId, user?.uid, t],
  );

  const confirmBlockUser = useCallback(
    (targetUserId: string, targetName: string) => {
      Alert.alert(
        'Block user',
        `Block ${targetName}? You won't see their messages anymore.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              const reporterId = user?.uid;
              if (!reporterId) return;
              const ok = await firestoreService.blockUser(reporterId, targetUserId);
              if (ok) {
                setBlockedUserIds((prev) => {
                  const next = new Set(prev);
                  next.add(targetUserId);
                  return next;
                });
              } else {
                Alert.alert('Could not block', 'Please try again later.');
              }
            },
          },
        ],
      );
    },
    [user?.uid],
  );

  const visibleChatMessages = useMemo(
    () => chatMessages.filter((m) => !blockedUserIds.has(m.userId)),
    [chatMessages, blockedUserIds],
  );

  const handleSendMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || !clubId) return;
    const userId = user?.uid ?? 'local_user';
    const displayName = getTitleLabel(equippedTitle) ?? 'Player';
    setChatInput('');

    // Optimistically add to local list
    const optimisticMessage: ClubMessage = {
      id: `local_${Date.now()}`,
      userId,
      displayName,
      message: filterMessage(text.slice(0, 200)),
      timestamp: Date.now(),
      type: 'text',
    };
    setChatMessages((prev) => [optimisticMessage, ...prev]);

    // Send to Firestore (no-op if unavailable)
    await firestoreService.sendClubMessage(clubId, userId, displayName, filterMessage(text));
  }, [chatInput, clubId, user, equippedTitle]);

  const getRelativeTime = useCallback((timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, []);

  const REACTION_EMOJIS = ['👍', '🎉', '🔥', '💪', '⭐', '❤️', '😎', '🏆'];

  // Members derived from the fetched club doc: display names from
  // users/{uid} profiles, weekly scores from the club's memberContributions
  // map (written server-side by onPuzzleComplete), crown on the ownerId.
  const derivedMembers = useMemo<ClubMember[]>(() => {
    if (!fetchedClub) return [];
    const contributions: Record<string, unknown> =
      fetchedClub.memberContributions ?? {};
    return memberProfiles
      .map((p) => ({
        id: p.id,
        name: p.displayName,
        score: Number(contributions[p.id] ?? 0) || 0,
        isLeader: p.id === fetchedClub.ownerId,
        isOnline: false,
      }))
      .sort((a, b) => b.score - a.score);
  }, [fetchedClub, memberProfiles]);

  const effectiveClubData = clubDataProp ?? fetchedClub;
  const data: ClubData | null = effectiveClubData
    ? {
        name: effectiveClubData.name ?? 'My Club',
        memberCount: effectiveClubData.memberCount ?? derivedMembers.length,
        maxMembers: effectiveClubData.maxMembers ?? 30,
        weeklyScore: effectiveClubData.weeklyScore ?? 0,
        tier: effectiveClubData.tier ?? 'bronze',
        members: effectiveClubData.members ?? derivedMembers,
        recentEmojis: effectiveClubData.recentEmojis ?? [],
        activeGoal: effectiveClubData.activeGoal ?? null,
        leaderboardEntries: effectiveClubData.leaderboardEntries ?? [],
      }
    : null;

  // Generate a club goal if none is active (local fallback)
  const clubGoal = useMemo<ActiveClubGoal | null>(() => {
    if (!data) return null;
    if (data.activeGoal) return data.activeGoal;
    // Generate a fallback goal with mock contributions from members
    const goal = generateClubGoal(data.tier ?? 'bronze', data.memberCount || 1);
    // Populate with mock contributions from members for display
    if (data.members.length > 0) {
      goal.contributions = data.members.map((m) => ({
        userId: m.id,
        displayName: m.name,
        avatarId: '',
        amount: Math.floor(m.score * 0.3),
      }));
    }
    return goal;
  }, [data?.activeGoal, data?.tier, data?.memberCount, data?.members]);

  const memberNames = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const m of data?.members || []) map[m.id] = m.name;
    return map;
  }, [data?.members]);

  // Club-vs-club rankings: prop-supplied entries win (tests / previews),
  // otherwise the fetched server snapshot. NO fabricated fallback — an empty
  // week honestly renders as "no rankings yet" instead of a mock top-5 the
  // player's club could never actually climb.
  const leaderboardEntries = useMemo<ClubLeaderboardEntry[]>(() => {
    if (data?.leaderboardEntries && data.leaderboardEntries.length > 0) {
      return data.leaderboardEntries;
    }
    return clubsWeeklyLb ?? [];
  }, [data?.leaderboardEntries, clubsWeeklyLb]);

  // Compute player's contribution to current goal
  const playerContribution = useMemo(() => {
    if (!clubGoal) return 0;
    // In real Firestore mode, this would come from the user's tracked contribution
    // For now, derive from player's puzzle progress
    return puzzlesSolved ? Math.min(puzzlesSolved * 3, clubGoal.target) : 0;
  }, [clubGoal, puzzlesSolved]);

  const renderNoClub = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.noClubContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hero recruitment panel */}
      <View style={styles.heroPanel}>
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={[COLORS.accent + '24', COLORS.purple + '12', 'rgba(8,2,22,0.0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Crest emblem cluster: shield + satellite chips docked at 45° */}
        <View style={styles.crestCluster}>
          <Animated.View
            style={{
              transform: [
                {
                  scale: crestPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.05],
                  }),
                },
              ],
            }}
          >
            <ShieldCrest size={96} />
          </Animated.View>
          <GlyphMedallion size={40} accent={COLORS.gold} style={styles.crestSideLeft}>
            <GameIcon name="gift" size={19} accent={COLORS.gold} />
          </GlyphMedallion>
          <GlyphMedallion size={40} accent={COLORS.cyan} style={styles.crestSideRight}>
            <GameIcon name="chat" size={19} accent={COLORS.cyan} />
          </GlyphMedallion>
        </View>

        <Text style={styles.noClubTitle}>{t('club.joinOrCreate')}</Text>
        <Text style={styles.noClubDesc}>
          Team up with friends, compete in weekly challenges, and climb the
          leaderboards together!
        </Text>

        <View style={styles.benefitList}>
          <BenefitRow icon={<GameIcon name="gift" size={28} accent={COLORS.accent} />} accent={COLORS.accent} text="Send and receive booster gifts with clubmates" />
          <BenefitRow icon={<GameIcon name="trophy" size={28} accent={COLORS.gold} />} accent={COLORS.gold} text="Climb the weekly club rankings as a team" />
          <BenefitRow icon={<GameIcon name="chat" size={28} accent={COLORS.cyan} />} accent={COLORS.cyan} text="Chat, react, and clear shared goals together" />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <SectionHeader label={t('club.findClub')} accent={COLORS.cyan} />
        <View style={[styles.searchBar, searchFocused && styles.inputFocused]}>
          <GlyphMedallion size={28} accent={COLORS.cyan}>
            <MagnifierGlyph size={14} accent={COLORS.cyan} />
          </GlyphMedallion>
          <TextInput
            style={styles.searchInput}
            placeholder={t('club.searchPlaceholder')}
            placeholderTextColor={COLORS.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            accessibilityLabel="Search clubs by name or code"
          />
        </View>
        {searchText.length > 0 && (
          <PrimaryButton
            label={t('club.searchAndJoin')}
            onPress={() => joinClub(searchText)}
            fullWidth
            accessibilityLabel="Search and join club"
            style={{ ...SOFT_BTN_SHADOW, marginTop: 10 }}
          />
        )}
      </View>

      {/* S1: Browse public clubs — appears when Firestore is available. */}
      {firestoreService.isAvailable() && (
        <View style={styles.searchSection}>
          <View style={styles.browseHeaderRow}>
            <View style={styles.browseHeaderLabel}>
              <SectionHeader label="Browse clubs" accent={COLORS.purple} />
            </View>
            <Pressable
              onPress={refreshBrowseList}
              disabled={browseLoading}
              accessibilityRole="button"
              accessibilityLabel="Refresh club list"
              style={({ pressed }) => [styles.browseRefreshBtn, pressed && styles.chipPressed]}
            >
              <Text style={styles.browseRefresh}>
                {browseLoading ? '...' : 'Refresh'}
              </Text>
            </Pressable>
          </View>
          {browseList.length === 0 && !browseLoading && (
            <Text style={styles.browseEmpty}>
              No public clubs available right now. Try again in a bit, or
              create your own below.
            </Text>
          )}
          {browseList.map((c) => (
            <Pressable
              key={c.id}
              style={({ pressed }) => [styles.browseCard, pressed && styles.cardPressed]}
              onPress={() => joinClub(c.id)}
              accessibilityRole="button"
              accessibilityLabel={`Join ${c.name} — ${c.memberCount} of ${c.maxMembers} members`}
            >
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <CrestMedallion letter={c.name.charAt(0).toUpperCase()} size={46} accent={COLORS.purple} />
              <View style={styles.browseCardMain}>
                <Text style={styles.browseCardName} numberOfLines={1}>
                  {c.name}
                </Text>
                {c.description ? (
                  <Text style={styles.browseCardDesc} numberOfLines={2}>
                    {c.description}
                  </Text>
                ) : null}
                <View style={styles.browseCardMetaRow}>
                  <View style={styles.memberChip}>
                    <Text style={styles.memberChipText}>
                      {c.memberCount}/{c.maxMembers}
                    </Text>
                  </View>
                  <Text style={styles.browseCardMeta}>
                    {c.weeklyScore.toLocaleString()} pts/wk
                  </Text>
                </View>
              </View>
              <View style={styles.joinChip}>
                <Text style={styles.joinChipText}>JOIN</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Create */}
      <View style={styles.createSection}>
        <SectionHeader label={t('club.createClub')} accent={COLORS.gold} />
        {showCreate ? (
          <View style={styles.createForm}>
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <TextInput
              style={[styles.createInput, createFocused && styles.inputFocused]}
              placeholder={t('club.createPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={createName}
              onChangeText={setCreateName}
              onFocus={() => setCreateFocused(true)}
              onBlur={() => setCreateFocused(false)}
              maxLength={24}
            />
            <View style={styles.createButtons}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.chipPressed]}
                onPress={() => {
                  setShowCreate(false);
                  setCreateName('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancel club creation"
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </Pressable>
              <PrimaryButton
                label={t('club.create')}
                onPress={() => {
                  if (createName.trim()) {
                    createClub(createName.trim());
                  }
                }}
                disabled={!createName.trim()}
                style={{ ...SOFT_BTN_SHADOW, ...styles.createConfirm }}
                accessibilityLabel="Create club"
              />
            </View>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.createButton, pressed && styles.cardPressed]}
            onPress={() => setShowCreate(true)}
            accessibilityRole="button"
            accessibilityLabel="Create new club"
          >
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <GlyphMedallion size={36} accent={COLORS.accent}>
              <Text style={styles.plusGlyph}>+</Text>
            </GlyphMedallion>
            <Text style={styles.createButtonText}>{t('club.createNewClub')}</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );

  const renderClub = () => {
    if (!data) return null;
    const tier = data.tier ?? 'bronze';
    const tierColor = TIER_ACCENT[tier] ?? COLORS.tierBronze;

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.clubContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Club hero header */}
        <View style={styles.clubHeroPanel}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={[COLORS.accent + '1E', COLORS.purple + '0E', 'rgba(8,2,22,0.0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <CrestMedallion
            letter={data.name.charAt(0).toUpperCase()}
            size={76}
            accent={COLORS.accent}
            ring={TIER_METAL[tier]}
          />
          <Text style={styles.clubName}>{data.name}</Text>
          <View style={styles.clubChipRow}>
            <View style={styles.memberChip}>
              <Text style={styles.memberChipText}>
                {t('club.memberCountLabel', { current: data.memberCount, max: data.maxMembers })}
              </Text>
            </View>
            <View style={[styles.tierChip, { borderColor: tierColor + '88' }]}>
              <Text style={[styles.tierChipText, { color: tierColor }]}>
                {tier.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly Score */}
        <View style={styles.weeklyScoreCard}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.weeklyScoreLabel}>{t('club.weeklyClubScore')}</Text>
          <Text style={styles.weeklyScoreValue}>
            {data.weeklyScore.toLocaleString()}
          </Text>
        </View>

        {/* Club Puzzle */}
        <Pressable
          style={({ pressed }) => [pressed && styles.cardPressed]}
          accessibilityRole="button"
          accessibilityLabel="Play today's club puzzle"
        >
          <LinearGradient
            colors={[COLORS.accent + '18', COLORS.accent + '08'] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.clubPuzzleBtn}
          >
            <GlyphMedallion size={44} accent={COLORS.accent}>
              <TileGridGlyph size={20} accent={COLORS.accent} />
            </GlyphMedallion>
            <View style={styles.clubPuzzleInfo}>
              <Text style={styles.clubPuzzleTitle}>{t('club.clubPuzzle')}</Text>
              <Text style={styles.clubPuzzleDesc}>
                {t('club.clubPuzzleDesc')}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </LinearGradient>
        </Pressable>

        {/* Pending Gifts */}
        <GiftInbox />

        {/* Club Cooperative Goal */}
        {clubGoal && (
          <>
            <SectionHeader label={t('club.clubGoal')} accent={COLORS.gold} />
            <ClubGoalCard goal={clubGoal} playerContribution={playerContribution} />
          </>
        )}

        {/* Shared Club Goals (Clash-style collective progress) */}
        <ClubSharedGoals clubId={clubId ?? null} memberNames={memberNames} />

        {/* Your Contribution */}
        <SectionHeader label={t('club.yourContribution')} accent={COLORS.accent} />
        <View style={styles.contributeCard}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.contributeRow}>
            <View style={styles.contributeStat}>
              <Text style={styles.contributeStatValue}>
                {playerContribution.toLocaleString()}
              </Text>
              <Text style={styles.contributeStatLabel}>{t('club.contributed')}</Text>
            </View>
            <View style={styles.contributeDivider} />
            <View style={styles.contributeStat}>
              <Text style={styles.contributeStatValue}>
                {puzzlesSolved ?? 0}
              </Text>
              <Text style={styles.contributeStatLabel}>{t('club.puzzles')}</Text>
            </View>
            <View style={styles.contributeDivider} />
            <View style={styles.contributeStat}>
              <Text style={styles.contributeStatValue}>
                {(starsByLevel ? Object.values(starsByLevel as Record<string, number>).reduce((a: number, b: number) => a + b, 0) : 0).toLocaleString()}
              </Text>
              <Text style={styles.contributeStatLabel}>{t('club.stars')}</Text>
            </View>
          </View>
          <Text style={styles.contributeHint}>
            Keep playing to help your club reach the goal!
          </Text>
        </View>

        {/* Club Leaderboard — real leaderboards/clubs_weekly snapshot */}
        <SectionHeader label={t('club.weeklyRankings')} accent={COLORS.cyan} />
        {clubsLbLoading && leaderboardEntries.length === 0 ? (
          <View style={styles.lbStateCard}>
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <ActivityIndicator color={COLORS.cyan} />
            <Text style={styles.lbStateText}>Loading weekly rankings…</Text>
          </View>
        ) : leaderboardEntries.length === 0 ? (
          <View style={styles.lbStateCard}>
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <GameIcon name="medal" metal="gold" size={30} />
            <Text style={styles.lbStateText}>
              Rankings appear after this week's first scores
            </Text>
          </View>
        ) : (
          <ClubLeaderboard entries={leaderboardEntries} currentClubId={clubId} />
        )}

        {/* Members with Weekly Scores */}
        <SectionHeader
          label={t('club.members')}
          accent={COLORS.purple}
          meta={`${data.members.length}`}
        />
        <View style={styles.membersBlock}>
          {data.members.length > 0 ? (
            data.members.map((member, index) => (
              <View key={member.id} style={styles.memberCard}>
                <LinearGradient
                  colors={[...GRADIENTS.surfaceCard] as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View
                  style={styles.memberRow}
                  accessibilityRole="text"
                  accessibilityLabel={`Rank ${index + 1}: ${member.name}, ${member.score.toLocaleString()} points${member.isLeader ? ', club leader' : ''}${member.isOnline ? ', online' : ''}`}
                >
                  <RankDisc rank={index + 1} size={28} />
                  <MemberAvatar
                    name={member.name}
                    size={38}
                    accent={member.isLeader ? COLORS.gold : COLORS.purple}
                    online={member.isOnline}
                  />
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName} numberOfLines={1}>{member.name}</Text>
                      {member.isLeader && (
                        <View style={styles.leaderChip}>
                          <Text style={styles.leaderChipText}>LEADER</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.memberScore}>
                      {member.score.toLocaleString()} pts this week
                    </Text>
                  </View>
                  {member.isOnline && (
                    <View style={styles.onlineDot} />
                  )}
                  {member.id !== user?.uid && (
                    <SendGiftButton
                      recipientId={member.id}
                      recipientName={member.name}
                      relationship="clubmate"
                      compact
                    />
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyMembers}>
              <Text style={styles.emptyMembersText}>No members yet</Text>
            </View>
          )}
        </View>

        {/* Emoji Reactions */}
        <SectionHeader label={t('club.quickReactions')} accent={COLORS.gold} />
        <View style={styles.emojiBar}>
          {REACTION_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              style={({ pressed }) => [pressed && styles.chipPressed]}
              accessibilityRole="button"
              accessibilityLabel={`React with ${emoji}`}
            >
              <IconMedallion glyph={emoji} size={38} accent={COLORS.purple} />
            </Pressable>
          ))}
        </View>

        {/* Recent Reactions */}
        {data.recentEmojis.length > 0 && (
          <View style={styles.recentReactions}>
            {data.recentEmojis.slice(0, 10).map((reaction, idx) => (
              <Text key={idx} style={styles.reactionEmoji}>
                {reaction.emoji}
              </Text>
            ))}
          </View>
        )}

        {/* Club Chat */}
        <SectionHeader label={t('club.clubChat')} accent={COLORS.cyan} />
        <View style={styles.chatCard}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {firestoreService.isAvailable() ? (
            <>
              {/* Messages */}
              <View style={styles.chatMessagesContainer}>
                {chatLoading ? (
                  <View style={styles.chatPlaceholder}>
                    <Text style={styles.chatPlaceholderText}>Loading messages...</Text>
                  </View>
                ) : visibleChatMessages.length === 0 ? (
                  <View style={styles.chatPlaceholder}>
                    <GlyphMedallion size={44} accent={COLORS.cyan} muted>
                      <ChatBubbleGlyph size={20} accent={COLORS.cyan} />
                    </GlyphMedallion>
                    <Text style={[styles.chatPlaceholderText, styles.chatPlaceholderGap]}>
                      No messages yet. Say hello!
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={visibleChatMessages}
                    keyExtractor={(item) => item.id}
                    inverted
                    style={styles.chatList}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={true}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    // This list lives inside the screen's vertical ScrollView.
                    // Android disables nested same-orientation scrolling by
                    // default, which left the 240px chat pane unscrollable —
                    // players could only ever read the newest few messages.
                    nestedScrollEnabled
                    renderItem={({ item }) => (
                      <Pressable
                        onLongPress={() => handleMessageLongPress(item)}
                        delayLongPress={300}
                        style={({ pressed }) => [pressed && styles.messagePressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Message from ${item.displayName}. Long-press for options.`}
                        accessibilityHint="Long-press to report or block this user"
                      >
                        <View style={styles.chatMessageRow}>
                          <View style={styles.chatMessageBubble}>
                            <View style={styles.chatMessageHeader}>
                              <Text style={styles.chatSenderName}>{item.displayName}</Text>
                              <Text style={styles.chatTimestamp}>{getRelativeTime(item.timestamp)}</Text>
                            </View>
                            <Text style={styles.chatMessageText}>{item.message}</Text>
                          </View>
                        </View>
                      </Pressable>
                    )}
                  />
                )}
              </View>

              {/* Input */}
              <View style={styles.chatInputRow}>
                <TextInput
                  style={[styles.chatInput, chatFocused && styles.inputFocused]}
                  placeholder={t('club.chatPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  value={chatInput}
                  onChangeText={setChatInput}
                  onFocus={() => setChatFocused(true)}
                  onBlur={() => setChatFocused(false)}
                  maxLength={200}
                  returnKeyType="send"
                  onSubmitEditing={handleSendMessage}
                  accessibilityLabel="Chat message input"
                />
                <PrimaryButton
                  label={t('club.send')}
                  onPress={handleSendMessage}
                  size="small"
                  disabled={!chatInput.trim()}
                  style={SOFT_BTN_SHADOW}
                  accessibilityLabel="Send message"
                />
              </View>
            </>
          ) : (
            <View style={styles.chatPlaceholder}>
              <GlyphMedallion size={44} accent={COLORS.purple} muted>
                <LockGlyph size={20} accent={COLORS.purpleLight} />
              </GlyphMedallion>
              <Text style={[styles.chatPlaceholderText, styles.chatPlaceholderGap]}>
                Club chat requires Firebase
              </Text>
              <Text style={styles.chatPlaceholderSubtext}>
                Set EXPO_PUBLIC_FIREBASE_* env vars to enable
              </Text>
            </View>
          )}
        </View>

        {/* Invite friends.
            The receiving half of this shipped a long time ago — parseDeepLink
            handles `club/<id>`, the router routes it, and this screen runs a
            confirm-before-join prompt. Nothing generated the link, so the club
            growth loop had no outbound edge at all: invites could be accepted
            and never sent. */}
        <Pressable
          style={({ pressed }) => [styles.inviteButton, pressed && styles.chipPressed]}
          onPress={() => {
            const id = clubId ?? (data as { id?: string }).id;
            if (!id) return;
            Share.share({
              message: `Join my Wordfall club "${data.name}"! ${buildClubInviteLink(id)}`,
            }).catch(() => {
              // Share sheet dismissed or unavailable — nothing to recover.
            });
          }}
          accessibilityRole="button"
          accessibilityLabel={`Invite friends to ${data.name}`}
        >
          <Text style={styles.inviteButtonText}>INVITE FRIENDS</Text>
        </Pressable>

        {/* Leave Club */}
        <Pressable
          style={({ pressed }) => [styles.leaveButton, pressed && styles.chipPressed]}
          onPress={leaveClub}
          accessibilityRole="button"
          accessibilityLabel={t('club.leave')}
        >
          <Text style={styles.leaveButtonText}>{t('club.leave')}</Text>
        </Pressable>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  // clubId set but the doc hasn't arrived yet (or the fetch failed): show a
  // loading/retry pane instead of the misleading no-club browse view.
  const renderClubLoading = () => (
    <View style={styles.clubLoading}>
      <View style={styles.clubLoadingCard}>
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <ShieldCrest size={52} muted={clubFetchFailed} />
        <Text style={styles.clubLoadingText}>
          {clubFetchFailed ? 'Could not load your club.' : 'Loading your club…'}
        </Text>
        {clubFetchFailed && (
          <PrimaryButton
            label="RETRY"
            size="small"
            onPress={() => void refreshClub()}
            style={SOFT_BTN_SHADOW}
            accessibilityLabel="Retry loading club"
          />
        )}
      </View>
    </View>
  );

  const onBack =
    navigation && (navigation.canGoBack ? navigation.canGoBack() : true)
      ? () => navigation.goBack()
      : undefined;

  return (
    <ScreenScaffold
      title={t('club.header')}
      eyebrow="TEAM UP"
      accent={COLORS.accent}
      backdrop="club"
      scroll={false}
      onBack={onBack}
    >
      {clubId ? (data ? renderClub() : renderClubLoading()) : renderNoClub()}
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  // Weekly-rankings loading / empty card (real clubs_weekly snapshot).
  lbStateCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    marginBottom: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  lbStateText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  clubLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  clubLoadingCard: {
    ...bentoPanel('purple', { padding: 24 }),
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceGlass,
  },
  clubLoadingText: {
    fontSize: 15,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  noClubContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    // Clears the floating tab bar (64pt + home-indicator inset) with margin,
    // so the create-club input at the bottom never sits clipped against the
    // screen edge — and stays reachable above the keyboard while focused.
    paddingBottom: 150,
  },
  heroPanel: {
    ...bentoPanel('pink', { padding: 20, borderRadius: RADIUS.xxl, marginBottom: 10 }),
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceGlass,
  },
  crestCluster: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  crestSideLeft: {
    position: 'absolute',
    left: -26,
    bottom: 16,
    zIndex: 3,
  },
  crestSideRight: {
    position: 'absolute',
    right: -26,
    bottom: 16,
    zIndex: 3,
  },
  noClubTitle: {
    fontSize: 22,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  noClubDesc: {
    fontSize: 14,
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  benefitList: {
    alignSelf: 'stretch',
    marginTop: 8,
    marginBottom: 2,
  },
  searchSection: {
    // SectionHeader carries its own 22pt top margin; pull each band up so the
    // no-club scroll reads as one composed pitch instead of floating islands.
    marginTop: -7,
    marginBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    ...SHADOWS.soft,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  inputFocused: {
    borderColor: COLORS.accent + '99',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  // S1 club browser
  browseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  browseHeaderLabel: {
    flex: 1,
  },
  browseRefreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent + '18',
    borderWidth: 1,
    borderColor: COLORS.accent + '44',
    marginTop: 10,
  },
  browseRefresh: {
    color: COLORS.accent,
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    letterSpacing: 1,
  },
  browseEmpty: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.bodyRegular,
    lineHeight: 20,
    paddingVertical: 12,
  },
  browseCard: {
    ...bentoPanel('purple', { padding: 12, marginBottom: 10 }),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceGlass,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  chipPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  messagePressed: {
    opacity: 0.7,
  },
  browseCardMain: {
    flex: 1,
  },
  browseCardName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    marginBottom: 2,
  },
  browseCardDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bodyRegular,
    lineHeight: 17,
    marginBottom: 6,
  },
  browseCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  memberChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    letterSpacing: 0.5,
  },
  browseCardMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FONTS.bodyRegular,
  },
  joinChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent + '20',
    borderWidth: 1,
    borderColor: COLORS.accent + '55',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  joinChipText: {
    color: COLORS.accent,
    fontSize: 12,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  createSection: {
    marginTop: -7,
    marginBottom: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,45,149,0.28)',
    overflow: 'hidden',
    gap: 12,
    ...SHADOWS.soft,
  },
  createButtonText: {
    fontSize: 15,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  plusGlyph: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  createForm: {
    ...bentoPanel('gold', { padding: 16 }),
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceGlass,
  },
  createInput: {
    height: 48,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  createButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
  },
  createConfirm: {
    flex: 1,
  },
  clubContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  clubHeroPanel: {
    ...bentoPanel('pink', { padding: 18, borderRadius: RADIUS.xxl }),
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceGlass,
  },
  clubName: {
    fontSize: 24,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  clubChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
  },
  tierChipText: {
    fontSize: 11,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  weeklyScoreCard: {
    ...bentoPanel('gold', { padding: 20 }),
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceGlass,
  },
  weeklyScoreLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  weeklyScoreValue: {
    fontSize: 32,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  clubPuzzleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: RADIUS.xl,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
    ...SHADOWS.glow(COLORS.accent),
  },
  clubPuzzleInfo: {
    flex: 1,
  },
  clubPuzzleTitle: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  clubPuzzleDesc: {
    fontSize: 12,
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textSecondary,
  },
  chevron: {
    fontSize: 24,
    fontFamily: FONTS.display,
    color: COLORS.accent,
  },
  membersBlock: {
    marginBottom: 8,
  },
  memberCard: {
    ...bentoPanel('purple', { padding: 0, marginBottom: 8 }),
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceGlass,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  leaderChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.gold + '1C',
    borderWidth: 1,
    borderColor: COLORS.gold + '66',
  },
  leaderChipText: {
    fontSize: 9,
    fontFamily: FONTS.display,
    letterSpacing: 1.2,
    color: COLORS.gold,
  },
  memberScore: {
    fontSize: 12,
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyMembers: {
    ...bentoPanel('purple', { padding: 24 }),
    alignItems: 'center',
    backgroundColor: COLORS.surfaceGlass,
  },
  emptyMembersText: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textMuted,
  },
  emojiBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: RADIUS.xl,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    ...SHADOWS.soft,
  },
  recentReactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
  },
  reactionEmoji: {
    fontSize: 20,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: RADIUS.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  contributeCard: {
    ...bentoPanel('pink', { padding: 18 }),
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceGlass,
  },
  contributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  contributeStat: {
    alignItems: 'center',
    flex: 1,
  },
  contributeStatValue: {
    fontSize: 22,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  contributeStatLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contributeDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.borderSubtle,
  },
  contributeHint: {
    fontSize: 12,
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  inviteButton: {
    borderWidth: 1,
    borderColor: COLORS.accent + '55',
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: COLORS.accent + '12',
  },
  inviteButtonText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  leaveButton: {
    borderWidth: 1,
    borderColor: COLORS.coral + '40',
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: COLORS.coral + '08',
  },
  leaveButtonText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.coral,
    textShadowColor: COLORS.coralGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  chatCard: {
    ...bentoPanel('cyan', { padding: 0 }),
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceGlass,
  },
  chatMessagesContainer: {
    height: 240,
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  chatMessageRow: {
    marginVertical: 4,
  },
  chatMessageBubble: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  chatMessageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  chatSenderName: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
  },
  chatTimestamp: {
    fontSize: 10,
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textMuted,
  },
  chatMessageText: {
    fontSize: 14,
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  chatPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  chatPlaceholderGap: {
    marginTop: 10,
  },
  chatPlaceholderText: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  chatPlaceholderSubtext: {
    fontSize: 12,
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default ClubScreen;
