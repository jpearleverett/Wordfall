import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS, RADIUS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import PrimaryButton from '../components/common/PrimaryButton';
import NeonProgressBar from '../components/common/NeonProgressBar';
import EventLeaderboardCard from '../components/events/EventLeaderboardCard';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentEvent } from '../data/events';
import { EventExclusiveReward } from '../types';
import { eventManager, ActiveEvent, EventRewardTierDisplay } from '../services/eventManager';
import { useEconomyActions } from '../stores/economyStore';
import {
  usePlayerStore,
  usePlayerActions,
  selectOwnedDecorations,
  selectUnlockedCosmetics,
} from '../stores/playerStore';

/** Thousands-separated display numbers — "1,000,000", never "1000000". */
const fmt = (n: number): string => n.toLocaleString('en-US');

// ─── Drawn glyph kit — layered Views/gradients, no emoji (same technique as
// LeaderboardScreen's GlyphMedallion / ClubScreen's ShieldCrest family). ────

/**
 * DrawnMedallion — IconMedallion's layered-gem shell, but hosting drawn
 * View-based glyphs instead of raw emoji (the art review's residual flag).
 */
function DrawnMedallion({
  size = 44,
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

/** Drawn 8-point star burst — two crossed gradient squares + hot core. */
function StarBurstGlyph({ size = 22, accent = COLORS.gold }: { size?: number; accent?: string }) {
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

/** Drawn lightning bolt — two skewed gradient bars forming the zigzag. */
function BoltGlyph({ size = 22, accent = COLORS.gold }: { size?: number; accent?: string }) {
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

/** Drawn globe — ring + meridian ellipse + latitude bands. */
function GlobeGlyph({ size = 22, accent = COLORS.teal }: { size?: number; accent?: string }) {
  const b = Math.max(1.5, size * 0.07);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: b, borderColor: accent }} />
      <View style={{ position: 'absolute', width: size * 0.5, height: size, borderRadius: size / 2, borderWidth: b, borderColor: accent + '99' }} />
      <View style={{ position: 'absolute', width: size, height: b, borderRadius: b / 2, backgroundColor: accent + '99' }} />
      <View style={{ position: 'absolute', top: size * 0.26, width: size * 0.88, height: b, borderRadius: b / 2, backgroundColor: accent + '55' }} />
    </View>
  );
}

/** Drawn trophy — gradient cup, ring handles, stem + base. */
function TrophyGlyph({ size = 22, accent = COLORS.gold }: { size?: number; accent?: string }) {
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

/** Drawn flame — layered gradient teardrops (win streak). */
function FlameGlyph({ size = 22 }: { size?: number }) {
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

/** Drawn gift box — gradient body, lid band, gold ribbon + bow knots. */
function GiftGlyph({ size = 20 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: size * 0.06, marginBottom: -size * 0.04 }}>
        <View style={{ width: size * 0.2, height: size * 0.16, borderRadius: size * 0.08, backgroundColor: COLORS.goldLight }} />
        <View style={{ width: size * 0.2, height: size * 0.16, borderRadius: size * 0.08, backgroundColor: COLORS.goldLight }} />
      </View>
      <View style={{ width: size * 0.96, height: size * 0.24, borderRadius: size * 0.07, overflow: 'hidden' }}>
        <LinearGradient
          colors={[COLORS.accentLight, COLORS.accent]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View
        style={{
          width: size * 0.78,
          height: size * 0.5,
          marginTop: size * 0.03,
          borderBottomLeftRadius: size * 0.09,
          borderBottomRightRadius: size * 0.09,
          overflow: 'hidden',
          alignItems: 'center',
        }}
      >
        <LinearGradient
          colors={[COLORS.accent, COLORS.accentDark]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={{ width: size * 0.14, height: '100%', backgroundColor: COLORS.gold }} />
      </View>
    </View>
  );
}

/** Drawn mini padlock — ring shackle + gradient rounded-rect body. */
function LockGlyph({ size = 20, accent = COLORS.gold }: { size?: number; accent?: string }) {
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
        <View style={{ width: size * 0.16, height: size * 0.22, borderRadius: size * 0.08, backgroundColor: 'rgba(8,2,22,0.7)' }} />
      </View>
    </View>
  );
}

/** Drawn check mark — two rounded bars. */
function CheckGlyph({ size = 20, accent = COLORS.green }: { size?: number; accent?: string }) {
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.08,
          bottom: size * 0.26,
          width: size * 0.38,
          height: size * 0.14,
          borderRadius: size * 0.07,
          backgroundColor: accent,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.02,
          bottom: size * 0.38,
          width: size * 0.64,
          height: size * 0.14,
          borderRadius: size * 0.07,
          backgroundColor: accent,
          transform: [{ rotate: '-50deg' }],
        }}
      />
    </View>
  );
}

/** Drawn 2x2 letter-tile grid — the puzzle mark (empty state). */
function TileGridGlyph({ size = 24, accent = COLORS.purple }: { size?: number; accent?: string }) {
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

/** Drawn nested frame squares (frame reward). */
function NestedSquaresGlyph({ size = 22, accent = COLORS.purple }: { size?: number; accent?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size * 0.2, borderWidth: size * 0.08, borderColor: accent + '66' }} />
      <View style={{ position: 'absolute', width: size * 0.62, height: size * 0.62, borderRadius: size * 0.14, borderWidth: size * 0.08, borderColor: accent + 'B3' }} />
      <View style={{ width: size * 0.26, height: size * 0.26, borderRadius: size * 0.07, backgroundColor: accent }} />
    </View>
  );
}

/** Drawn label tag — rotated gradient square with punched hole (title reward). */
function TagGlyph({ size = 22, accent = COLORS.gold }: { size?: number; accent?: string }) {
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

/** Drawn faceted gem — rotated gradient square with facet highlight. */
function DiamondGlyph({ size = 22, accent = COLORS.cyan }: { size?: number; accent?: string }) {
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

/** Drawn shopping bag — gradient body + handle arc (event shop). */
function BagGlyph({ size = 22, accent = COLORS.gold }: { size?: number; accent?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.44,
          height: size * 0.34,
          borderTopLeftRadius: size * 0.22,
          borderTopRightRadius: size * 0.22,
          borderWidth: size * 0.09,
          borderBottomWidth: 0,
          borderColor: accent + 'D9',
          marginBottom: -size * 0.08,
        }}
      />
      <View
        style={{
          width: size * 0.82,
          height: size * 0.62,
          borderRadius: size * 0.12,
          borderTopLeftRadius: size * 0.06,
          borderTopRightRadius: size * 0.06,
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
        <View style={{ width: size * 0.3, height: size * 0.07, borderRadius: size * 0.04, backgroundColor: 'rgba(8,2,22,0.45)' }} />
      </View>
    </View>
  );
}

/** Drawn coin — gold gradient disc + inner ring. */
function CoinGlyph({ size = 22 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <LinearGradient
        colors={[COLORS.goldLight, COLORS.gold]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={{ width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3, borderWidth: size * 0.06, borderColor: 'rgba(8,2,22,0.35)' }} />
    </View>
  );
}

/** Drawn rising chevron stack (speed / rocket events). */
function ChevronStackGlyph({ size = 22, accent = COLORS.teal }: { size?: number; accent?: string }) {
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

/** Maps a data-driven event emoji icon to a drawn glyph (star-burst fallback). */
function EventIconGlyph({ icon, accent, size }: { icon?: string; accent: string; size: number }) {
  switch ((icon ?? '').replace(/\uFE0F/g, '')) {
    case '\u26A1': return <BoltGlyph size={size} accent={COLORS.gold} />;
    case '\u{1F3C6}': return <TrophyGlyph size={size} accent={COLORS.gold} />;
    case '\u{1F30D}': return <GlobeGlyph size={size} accent={accent} />;
    case '\u{1F525}': return <FlameGlyph size={size} />;
    case '\u{1FA99}': return <CoinGlyph size={size} />;
    case '\u{1F48E}': return <DiamondGlyph size={size} accent={accent} />;
    case '\u{1F680}': return <ChevronStackGlyph size={size} accent={accent} />;
    case '\u{1F381}': return <GiftGlyph size={size} />;
    default: return <StarBurstGlyph size={size} accent={accent} />;
  }
}

/**
 * Self-contained 1Hz countdown leaf (same pattern as ShopScreen's
 * LiveCountdownText). Owning the interval here means the tick re-renders one
 * Text node instead of re-running the entire ~950-line EventScreen body every
 * second for the lifetime of the screen.
 */
const EventCountdownText = React.memo(function EventCountdownText({
  endTime,
  style,
}: {
  endTime: number;
  style: object;
}) {
  const format = useCallback(() => {
    const remaining = Math.max(0, endTime - Date.now());
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [endTime]);

  const [text, setText] = useState(() => format());

  useEffect(() => {
    setText(format());
    const interval = setInterval(() => setText(format()), 1000);
    return () => clearInterval(interval);
  }, [format]);

  return <Text style={style}>Ends in {text}</Text>;
});

/**
 * Event progress bar with milestone markers. Wraps the shared NeonProgressBar
 * and overlays one marker dot per reward tier at its threshold position so
 * the player can see exactly where the next payoff sits on the track.
 */
const MilestoneProgress = React.memo(function MilestoneProgress({
  progress,
  max,
  color,
  rewards,
}: {
  progress: number;
  max: number;
  color: string;
  rewards: EventRewardTierDisplay[];
}) {
  const frac = max > 0 ? Math.min(progress / max, 1) : 0;
  return (
    <View style={styles.milestoneWrap}>
      <NeonProgressBar progress={frac} color={color} height={12} />
      <View style={styles.milestoneOverlay} pointerEvents="none">
        {rewards.map((reward) => {
          const at = max > 0 ? Math.min(reward.threshold / max, 1) : 0;
          const reached = reward.reached;
          return (
            <View
              key={reward.tier}
              style={[
                styles.milestoneMarker,
                { left: `${at * 100}%` },
                reached
                  ? {
                      backgroundColor: color,
                      borderColor: '#fff',
                      ...SHADOWS.neonGlow(color),
                    }
                  : // Unreached markers stay alive at 0%: accent-tinted ring
                    // with an ember dot instead of a flat grey disc.
                    { borderColor: color + '88', ...SHADOWS.glow(color) },
              ]}
            >
              {!reached && (
                <View style={[styles.milestoneDot, { backgroundColor: color + '66' }]} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
});

interface EventScreenProps {
  event?: any;
  progress?: number;
  onPlayEventPuzzle?: () => void;
  onOpenEventShop?: () => void;
}

const EventScreen: React.FC<EventScreenProps> = ({
  event,
  progress: progressProp,
  onPlayEventPuzzle: onPlayEventPuzzleProp,
  onOpenEventShop: onOpenEventShopProp,
}) => {
  const { addCoins, addGems, addHintTokens } = useEconomyActions();
  const { user } = useAuth();
  const ownedDecorations = usePlayerStore(selectOwnedDecorations);
  const unlockedCosmetics = usePlayerStore(selectUnlockedCosmetics);
  const { unlockCosmetic, unlockDecoration, updateProgress } = usePlayerActions();
  const onPlayEventPuzzle = onPlayEventPuzzleProp ?? (() => {});
  const onOpenEventShop = onOpenEventShopProp ?? (() => {});
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([]);
  const [claimAnim] = useState(new Animated.Value(1));

  // Fetch active events from the event manager
  useEffect(() => {
    const events = eventManager.getActiveEvents();
    setActiveEvents(events);
  }, []);

  // Get the primary event (main or first active)
  const primaryEvent = activeEvents.find(e => e.type === 'main') || activeEvents[0];
  const endTime = primaryEvent?.endTime ?? (event?.endTime ?? Date.now() + 5 * 24 * 60 * 60 * 1000);

  // Claim a reward tier
  const handleClaimReward = useCallback((eventId: string, tier: string) => {
    const reward = eventManager.claimEventReward(eventId, tier);
    if (reward) {
      if (reward.coins) addCoins(reward.coins);
      if (reward.gems) addGems(reward.gems);
      if (reward.hintTokens) addHintTokens(reward.hintTokens);

      // Animate claim
      Animated.sequence([
        Animated.timing(claimAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
        Animated.spring(claimAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();

      // Refresh events and persist claimed state to PlayerContext/AsyncStorage
      setActiveEvents(eventManager.getActiveEvents());
      updateProgress({ eventProgress: eventManager.getProgressSnapshot() });
    }
  }, [addCoins, addGems, addHintTokens, claimAnim, updateProgress]);

  // Get the current event's exclusive reward (must be declared before the claim callback
  // that closes over it, otherwise TS flags a "used before declaration" error).
  const currentEvent = getCurrentEvent();
  const exclusiveReward: EventExclusiveReward | undefined =
    event?.exclusiveReward ?? currentEvent?.exclusiveReward;
  const isTimeLimited: boolean = event?.isTimeLimited ?? currentEvent?.isTimeLimited ?? false;

  // Claim the exclusive cosmetic reward (frame/title/decoration) at Gold tier
  const handleClaimExclusiveReward = useCallback(() => {
    if (!exclusiveReward || !primaryEvent) return;

    if (exclusiveReward.type === 'decoration') {
      unlockDecoration(exclusiveReward.id);
    } else {
      unlockCosmetic(exclusiveReward.id);
    }
    eventManager.claimExclusiveReward(primaryEvent.id);

    Animated.sequence([
      Animated.timing(claimAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.spring(claimAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    setActiveEvents(eventManager.getActiveEvents());
    updateProgress({ eventProgress: eventManager.getProgressSnapshot() });
  }, [exclusiveReward, primaryEvent, unlockCosmetic, unlockDecoration, updateProgress, claimAnim]);

  // Exclusive reward claim state
  const goldTierReached = primaryEvent?.rewards?.find(r => r.tier === 'gold')?.reached ?? false;
  const exclusiveAlreadyClaimed = exclusiveReward
    ? exclusiveReward.type === 'decoration'
      ? ownedDecorations.includes(exclusiveReward.id)
      : unlockedCosmetics.includes(exclusiveReward.id)
    : false;
  const canClaimExclusive = goldTierReached && !exclusiveAlreadyClaimed && !!exclusiveReward;

  // Multiplier display
  const multipliers = eventManager.getEventMultipliers();
  const hasActiveMultipliers = multipliers.coins > 1 || multipliers.xp > 1 || multipliers.rareTileChance > 1;

  /** Reward-specific glyph for a tier's PRIMARY payout — locked tiers show
   *  the actual reward dimly instead of an identical padlock everywhere. */
  const getTierRewardGlyph = (
    rewards: { coins?: number; gems?: number; hintTokens?: number; badge?: string; decoration?: string },
    accent: string,
    size: number,
  ): React.ReactNode => {
    if (rewards.badge) return <TrophyGlyph size={size} accent={COLORS.gold} />;
    if (rewards.decoration) return <StarBurstGlyph size={size} accent={accent} />;
    if (rewards.gems) return <DiamondGlyph size={size} accent={COLORS.cyan} />;
    if (rewards.coins) return <CoinGlyph size={size} />;
    if (rewards.hintTokens) return <BoltGlyph size={size} accent={accent} />;
    return <GiftGlyph size={size} />;
  };

  const getRewardTypeGlyph = (type: string, accent: string, size: number): React.ReactNode => {
    switch (type) {
      case 'frame': return <NestedSquaresGlyph size={size} accent={accent} />;
      case 'title': return <TagGlyph size={size} accent={accent} />;
      case 'decoration': return <DiamondGlyph size={size} accent={accent} />;
      default: return <GiftGlyph size={size} />;
    }
  };

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'legendary': return COLORS.rarityLegendary;
      case 'epic': return COLORS.rarityEpic;
      case 'rare': return COLORS.rarityRare;
      default: return COLORS.rarityCommon;
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return COLORS.green;
      case 'medium':
        return COLORS.gold;
      case 'hard':
        return COLORS.coral;
      case 'expert':
        return COLORS.purple;
      default:
        return COLORS.textSecondary;
    }
  };

  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case 'main': return COLORS.accent;
      case 'mini': return COLORS.teal;
      case 'weekend_blitz': return COLORS.orange;
      case 'win_streak': return COLORS.gold;
      default: return COLORS.accent;
    }
  };

  const getEventTypeLabel = (type: string): string => {
    switch (type) {
      case 'main': return 'WEEKLY EVENT';
      case 'mini': return 'MINI EVENT';
      case 'weekend_blitz': return 'WEEKEND BLITZ';
      case 'win_streak': return 'WIN STREAK';
      default: return 'EVENT';
    }
  };

  const formatCountdown = (endMs: number): string => {
    const remaining = Math.max(0, endMs - Date.now());
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const headerAccent = primaryEvent ? getEventTypeColor(primaryEvent.type) : COLORS.accent;

  return (
    <ScreenScaffold
      title="EVENTS"
      eyebrow={
        primaryEvent
          ? `ENDS IN ${formatCountdown(endTime).toUpperCase()}`
          : 'LIVE CHALLENGES'
      }
      accent={headerAccent}
      backdrop="event"
    >
      <>
        {/* Active Event Multipliers Banner */}
        {hasActiveMultipliers && (
          <LinearGradient
            colors={[COLORS.gold + '20', COLORS.orange + '10'] as [string, string]}
            style={styles.multiplierBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <DrawnMedallion size={44} accent={COLORS.gold} style={styles.multiplierMedallion}>
              <BoltGlyph size={22} accent={COLORS.gold} />
            </DrawnMedallion>
            <View style={styles.multiplierInfo}>
              <Text style={styles.multiplierTitle}>ACTIVE BONUSES</Text>
              <View style={styles.multiplierRow}>
                {multipliers.coins > 1 && (
                  <View style={styles.multiplierChip}>
                    <Text style={styles.multiplierChipText}>{multipliers.coins}x Coins</Text>
                  </View>
                )}
                {multipliers.xp > 1 && (
                  <View style={styles.multiplierChip}>
                    <Text style={styles.multiplierChipText}>{multipliers.xp}x XP</Text>
                  </View>
                )}
                {multipliers.rareTileChance > 1 && (
                  <View style={styles.multiplierChip}>
                    <Text style={styles.multiplierChipText}>{multipliers.rareTileChance}x Rare Tiles</Text>
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Active Events List */}
        {activeEvents.length > 0 && (
          <SectionHeader
            label="LIVE NOW"
            accent={headerAccent}
            meta={`${activeEvents.length} ACTIVE`}
          />
        )}
        {activeEvents.map((activeEvent) => {
          const color = getEventTypeColor(activeEvent.type);
          const progress = activeEvent.progress;
          const maxThreshold = activeEvent.rewards.length > 0
            ? activeEvent.rewards[activeEvent.rewards.length - 1].threshold
            : 100;

          return (
            <View
              key={activeEvent.id}
              style={[styles.eventCard, { borderColor: color + '40', ...SHADOWS.glow(color) }]}
            >
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard] as [string, string]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              {/* Accent top edge */}
              <LinearGradient
                colors={['transparent', color + 'AA', 'transparent'] as [string, string, string]}
                style={styles.eventTopEdge}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
              />
              {/* Event Type Label */}
              <View style={[styles.eventTypeBadge, { backgroundColor: color + '20', borderColor: color + '55' }]}>
                <Text style={[styles.eventTypeText, { color }]}>
                  {getEventTypeLabel(activeEvent.type)}
                </Text>
              </View>

              {/* Event Header */}
              <View style={styles.eventHeader}>
                <DrawnMedallion size={54} accent={color} style={styles.eventMedallion}>
                  <EventIconGlyph icon={activeEvent.icon} accent={color} size={27} />
                </DrawnMedallion>
                <View style={styles.eventTitleArea}>
                  <Text style={[styles.eventName, { color, textShadowColor: color + '66' }]}>
                    {activeEvent.name}
                  </Text>
                  <Text style={styles.eventDesc}>{activeEvent.description}</Text>
                </View>
              </View>

              {/* Countdown */}
              <LinearGradient
                colors={[color + '15', color + '05'] as [string, string]}
                style={styles.countdownBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.countdownText, { color }]}>
                  {formatCountdown(activeEvent.endTime)} remaining
                </Text>
              </LinearGradient>

              {/* Progress Bar with milestone markers */}
              <View style={styles.eventProgressHeader}>
                <View style={styles.eventProgressLabelRow}>
                  <Text style={styles.eventProgressLabel}>Progress</Text>
                  <View
                    style={[
                      styles.eventProgressPct,
                      { borderColor: color + '55', backgroundColor: color + '1A' },
                    ]}
                  >
                    <Text style={[styles.eventProgressPctText, { color }]}>
                      {Math.min(
                        100,
                        Math.floor((progress / Math.max(maxThreshold, 1)) * 100),
                      )}
                      %
                    </Text>
                  </View>
                </View>
                <Text style={styles.eventProgressValue}>
                  {fmt(progress)} / {fmt(maxThreshold)}
                </Text>
              </View>
              <MilestoneProgress
                progress={progress}
                max={maxThreshold}
                color={color}
                rewards={activeEvent.rewards}
              />

              {/* Reward Tiers — cards scale up with reward magnitude; every
                  tier shows its OWN reward glyph (locked ones dimmed behind a
                  small lock badge), with distinct reached / next / far states. */}
              <Animated.View style={[styles.rewardTiersRow, { transform: [{ scale: claimAnim }] }]}>
                {activeEvent.rewards.map((reward, tierIdx) => {
                  const canClaim = reward.reached && !reward.claimed;
                  const nextIdx = activeEvent.rewards.findIndex((r) => !r.reached);
                  const isNext = !reward.reached && tierIdx === nextIdx;
                  const isFar = !reward.reached && !isNext;
                  const tierAccent = reward.claimed
                    ? COLORS.green
                    : canClaim
                      ? COLORS.gold
                      : color;
                  // Bigger tiers = bigger cards: medallion + halo grow up the ladder.
                  const medSize = 32 + Math.min(tierIdx, 3) * 4;
                  const haloSize = medSize + 14;
                  return (
                    <Pressable
                      key={reward.tier}
                      onPress={() => canClaim && handleClaimReward(activeEvent.id, reward.tier)}
                      disabled={!canClaim}
                      accessibilityRole="button"
                      accessibilityLabel={`${reward.tier} tier reward${reward.claimed ? ', claimed' : reward.reached ? ', tap to claim' : isNext ? ', next up' : ', locked'}`}
                      style={({ pressed }) => [
                        styles.rewardTierCard,
                        { paddingTop: 10 + Math.min(tierIdx, 3) * 3 },
                        isNext && [styles.rewardTierCardNext, { borderColor: color + '77' }],
                        isFar && styles.rewardTierCardFar,
                        canClaim && styles.rewardTierCardClaimable,
                        reward.claimed && styles.rewardTierCardClaimed,
                        pressed && canClaim && styles.pressedScale,
                      ]}
                    >
                      <LinearGradient
                        colors={
                          canClaim
                            ? ([COLORS.gold + '26', 'rgba(26,10,46,0.92)'] as [string, string])
                            : isNext
                              ? ([color + '1F', 'rgba(26,10,46,0.92)'] as [string, string])
                              : ([...GRADIENTS.surfaceCard] as [string, string])
                        }
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                      />
                      <View
                        style={[
                          styles.rewardTierHalo,
                          {
                            width: haloSize,
                            height: haloSize,
                            borderRadius: haloSize / 2,
                            borderColor: tierAccent + (reward.reached ? '66' : isNext ? '55' : '33'),
                            backgroundColor: tierAccent + '12',
                            ...(reward.reached || isNext ? SHADOWS.glow(tierAccent) : null),
                          },
                        ]}
                      >
                        <DrawnMedallion size={medSize} accent={tierAccent} muted={isFar}>
                          {reward.claimed ? (
                            <CheckGlyph size={medSize * 0.5} accent={COLORS.green} />
                          ) : reward.reached ? (
                            <GiftGlyph size={medSize * 0.5} />
                          ) : (
                            getTierRewardGlyph(reward.rewards, tierAccent, medSize * 0.5)
                          )}
                        </DrawnMedallion>
                        {!reward.reached && (
                          <View style={styles.tierLockBadge}>
                            <LockGlyph size={10} accent={COLORS.gold} />
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.rewardTierThreshold,
                          (reward.reached || isNext) && { color: COLORS.textSecondary },
                        ]}
                      >
                        {fmt(reward.threshold)}
                      </Text>
                      <Text style={[
                        styles.rewardTierLabel,
                        isNext && { color },
                        reward.reached && { color: COLORS.textPrimary },
                        reward.claimed && { color: COLORS.green },
                      ]}>
                        {reward.tier.charAt(0).toUpperCase() + reward.tier.slice(1)}
                      </Text>
                      {isNext && (
                        <View style={[styles.nextPill, { borderColor: color + '66', backgroundColor: color + '1A' }]}>
                          <Text style={[styles.nextPillText, { color }]}>NEXT</Text>
                        </View>
                      )}
                      {canClaim && (
                        <View style={styles.claimPill}>
                          <LinearGradient
                            colors={[...GRADIENTS.button.gold] as [string, string, string]}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                          />
                          <Text style={styles.claimPillText}>CLAIM</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </Animated.View>
              {/* MG2: per-event leaderboard — degrades to null offline. */}
              <View style={styles.leaderboardGlass}>
                <LinearGradient
                  colors={[...GRADIENTS.glassOverlay] as [string, string]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                />
                <EventLeaderboardCard
                  eventId={activeEvent.id}
                  currentUserId={user?.uid}
                  previewSize={5}
                />
              </View>
            </View>
          );
        })}

        {/* No Active Events Fallback */}
        {activeEvents.length === 0 && (
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard] as [string, string]}
            style={styles.emptyCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <DrawnMedallion size={64} accent={COLORS.purple} style={styles.emptyMedallion}>
              <TileGridGlyph size={30} accent={COLORS.purple} />
            </DrawnMedallion>
            <Text style={styles.emptyTitle}>No Active Events</Text>
            <Text style={styles.emptyDesc}>Check back soon for new events and challenges!</Text>
          </LinearGradient>
        )}

        {/* Limited Time Exclusive Reward */}
        {isTimeLimited && exclusiveReward && (
          <LinearGradient
            colors={[COLORS.gold + '18', COLORS.rarityLegendary + '08'] as [string, string]}
            style={styles.exclusiveCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <LinearGradient
              colors={[COLORS.gold + '20', 'transparent'] as [string, string]}
              style={styles.exclusiveGlow}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            <View style={styles.exclusiveLabelRow}>
              <View style={styles.exclusiveLabelRule} />
              <Text style={styles.exclusiveLabel}>LIMITED TIME EXCLUSIVE</Text>
              <View style={styles.exclusiveLabelRule} />
            </View>
            <View style={styles.exclusiveContent}>
              <DrawnMedallion
                size={60}
                accent={getRarityColor(exclusiveReward.rarity)}
                style={styles.exclusiveMedallion}
              >
                {getRewardTypeGlyph(exclusiveReward.type, getRarityColor(exclusiveReward.rarity), 28)}
              </DrawnMedallion>
              <View style={styles.exclusiveInfo}>
                <Text style={styles.exclusiveRewardName}>
                  {exclusiveReward.name}
                </Text>
                <View style={styles.exclusiveMetaRow}>
                  <View style={[
                    styles.exclusiveRarityBadge,
                    { backgroundColor: getRarityColor(exclusiveReward.rarity) + '25', borderColor: getRarityColor(exclusiveReward.rarity) + '60' },
                  ]}>
                    <Text style={[styles.exclusiveRarityText, { color: getRarityColor(exclusiveReward.rarity) }]}>
                      {exclusiveReward.rarity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.exclusiveTypeText}>
                    {exclusiveReward.type.charAt(0).toUpperCase() + exclusiveReward.type.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
            {exclusiveAlreadyClaimed ? (
              <View style={styles.exclusiveClaimedRow}>
                <Text style={styles.exclusiveClaimedIcon}>{'✓'}</Text>
                <Text style={styles.exclusiveClaimedText}>Claimed! Check your cosmetics.</Text>
              </View>
            ) : canClaimExclusive ? (
              <>
                <Text style={[styles.exclusiveHint, { color: COLORS.gold }]}>
                  Gold tier reached! Claim your exclusive reward below.
                </Text>
                <PrimaryButton
                  label="CLAIM REWARD"
                  onPress={handleClaimExclusiveReward}
                  variant="gold"
                  size="medium"
                  accessibilityLabel={`Claim exclusive reward: ${exclusiveReward?.name}`}
                  style={styles.exclusiveClaimBtn}
                />
              </>
            ) : (
              <>
                <View style={styles.exclusiveTimerRow}>
                  <EventCountdownText endTime={endTime} style={styles.exclusiveTimerText} />
                </View>
                <Text style={styles.exclusiveHint}>
                  Reach the Gold tier to unlock this exclusive reward!
                </Text>
              </>
            )}
          </LinearGradient>
        )}

        {/* Event Puzzles */}
        <SectionHeader label="EVENT PUZZLES" accent={COLORS.pink} />
        <PrimaryButton
          label="PLAY NEXT PUZZLE"
          onPress={onPlayEventPuzzle}
          variant="primary"
          size="large"
          fullWidth
          accessibilityLabel="Play next event puzzle"
          style={styles.playNextButton}
        />

        {/* Event Shop Button */}
        <SectionHeader label="EVENT SHOP" accent={COLORS.gold} />
        <Pressable
          onPress={onOpenEventShop}
          accessibilityRole="button"
          accessibilityLabel="Open event shop"
          style={({ pressed }) => [styles.shopButton, pressed && styles.pressedScale]}
        >
          <LinearGradient
            colors={[COLORS.gold + '20', COLORS.gold + '08'] as [string, string]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <DrawnMedallion size={46} accent={COLORS.gold} style={styles.shopMedallion}>
            <BagGlyph size={23} accent={COLORS.gold} />
          </DrawnMedallion>
          <View style={styles.shopButtonInfo}>
            <Text style={styles.shopButtonTitle}>Event Shop</Text>
            <Text style={styles.shopButtonDesc}>
              Spend tokens on exclusive items
            </Text>
          </View>
          <Text style={styles.shopChevron}>{'\u{203A}'}</Text>
        </Pressable>

        {/* Upcoming Events */}
        <SectionHeader label="COMING UP" accent={COLORS.teal} />
        <View style={styles.upcomingCard}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard] as [string, string]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.upcomingHint}>
            {eventManager.isWeekendBlitz()
              ? 'Weekend Blitz is active! Enjoy double XP and boosted rare tile drops.'
              : 'Weekend Blitz returns every Saturday & Sunday with 2x XP!'}
          </Text>
        </View>
      </>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  pressedScale: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },

  // Multiplier Banner
  multiplierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    ...SHADOWS.glow(COLORS.gold),
  },
  multiplierMedallion: {
    marginRight: 12,
  },
  multiplierInfo: {
    flex: 1,
  },
  multiplierTitle: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: COLORS.gold,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  multiplierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  multiplierChip: {
    backgroundColor: COLORS.gold + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
  },
  multiplierChipText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: COLORS.gold,
  },

  // Event Card — opaque surface base so the grid backdrop never repeats
  // through the translucent card gradient (blind-review flag).
  eventCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  eventTopEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
  },
  eventTypeBadge: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 12,
  },
  eventTypeText: {
    fontSize: 10,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventMedallion: {
    marginRight: 14,
  },
  eventTitleArea: {
    flex: 1,
  },
  eventName: {
    fontSize: 20,
    fontFamily: FONTS.display,
    marginBottom: 4,
    letterSpacing: 0.5,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  eventDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  countdownBadge: {
    alignSelf: 'center',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  countdownText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    fontVariant: ['tabular-nums'],
  },

  // Event Progress
  eventProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eventProgressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventProgressLabel: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
  },
  eventProgressPct: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  eventProgressPctText: {
    fontSize: 10,
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  eventProgressValue: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  // Milestone progress bar
  milestoneWrap: {
    marginBottom: 16,
    paddingVertical: 4,
  },
  milestoneOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  milestoneMarker: {
    position: 'absolute',
    top: '50%',
    marginTop: -8,
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(10,0,21,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Reward Tiers — cards align to the row's bottom so the size ramp
  // (bronze → diamond) reads as an ascending ladder.
  rewardTiersRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  rewardTierCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingVertical: 10,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  // Next tier to hit: fully lit with an accent edge.
  rewardTierCardNext: {
    borderWidth: 1.5,
  },
  // Distant tiers: dimmed to ~75% — visibly future, still readable.
  rewardTierCardFar: {
    opacity: 0.75,
  },
  rewardTierCardClaimable: {
    borderColor: COLORS.gold + '77',
    ...SHADOWS.glow(COLORS.gold),
  },
  rewardTierCardClaimed: {
    opacity: 0.9,
    borderColor: COLORS.green + '44',
  },
  // Small drawn-padlock badge overlaying a locked tier's reward medallion.
  tierLockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.gold + '8C',
    backgroundColor: 'rgba(12,4,28,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nextPill: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  nextPillText: {
    fontSize: 8,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  rewardTierMedallion: {
    marginBottom: 6,
  },
  rewardTierHalo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  rewardTierThreshold: {
    fontSize: 11,
    fontFamily: FONTS.display,
    color: COLORS.textMuted,
  },
  rewardTierLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  claimPill: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 4,
    overflow: 'hidden',
    marginTop: 2,
  },
  claimPillText: {
    fontSize: 10,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    color: COLORS.bg,
  },

  // Leaderboard glass wrap
  leaderboardGlass: {
    marginTop: 14,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surfaceGlass,
    overflow: 'hidden',
    padding: 4,
  },

  // Empty State
  emptyCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  emptyMedallion: {
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Exclusive Reward
  exclusiveCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gold + '50',
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    ...SHADOWS.glow(COLORS.gold),
  },
  exclusiveGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  exclusiveLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  exclusiveLabelRule: {
    flex: 1,
    height: 1,
    maxWidth: 40,
    marginHorizontal: 10,
    backgroundColor: COLORS.gold + '55',
  },
  exclusiveLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: COLORS.gold,
    letterSpacing: 2,
    textShadowColor: COLORS.gold + '60',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  exclusiveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  exclusiveMedallion: {
    marginRight: 14,
  },
  exclusiveInfo: {
    flex: 1,
  },
  exclusiveRewardName: {
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 6,
    textShadowColor: 'rgba(255,255,255,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  exclusiveMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exclusiveRarityBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    marginRight: 10,
  },
  exclusiveRarityText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1,
  },
  exclusiveTypeText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
  },
  exclusiveTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    backgroundColor: COLORS.gold + '14',
  },
  exclusiveTimerText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.gold,
    fontVariant: ['tabular-nums'],
    textShadowColor: COLORS.gold + '40',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  exclusiveHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  exclusiveClaimBtn: {
    alignSelf: 'center',
    marginTop: 12,
    minWidth: 200,
  },
  exclusiveClaimedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  exclusiveClaimedIcon: {
    fontSize: 16,
    marginRight: 6,
    color: COLORS.green,
    fontFamily: FONTS.bodyBold,
  },
  exclusiveClaimedText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.green,
  },

  // Puzzles
  playNextButton: {
    marginBottom: 6,
  },

  // Shop Button
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    padding: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    ...SHADOWS.glow(COLORS.gold),
  },
  shopMedallion: {
    marginRight: 14,
  },
  shopButtonInfo: {
    flex: 1,
  },
  shopButtonTitle: {
    fontSize: 16,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    color: COLORS.gold,
    marginBottom: 2,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  shopButtonDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  shopChevron: {
    fontSize: 24,
    color: COLORS.gold,
  },

  // Upcoming
  upcomingCard: {
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    ...SHADOWS.medium,
  },
  upcomingHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default EventScreen;
