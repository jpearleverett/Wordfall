/**
 * MasteryScreen — 30-tier seasonal mastery track with free + premium lanes.
 *
 * Shares the Season Pass "reward track" visual language (glowing center
 * spine, medallion tier nodes, dual lane cards) but with its own teal /
 * purple accent so the two tracks read as siblings, not clones. Rewards
 * unlock automatically as mastery XP crosses tier thresholds — there is
 * no per-tier claim step on this track.
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Alert,
  FlatList,
  Pressable,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SHADOWS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import NeonProgressBar from '../components/common/NeonProgressBar';
import { bentoPanel } from '../styles/bentoPanel';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { usePlayerStore, selectPuzzlesSolved } from '../stores/playerStore';
import { useEconomyStore, selectIsPremiumPassFlag } from '../stores/economyStore';
import {
  MASTERY_REWARDS,
  MASTERY_MAX_TIER,
  getMasteryTierForXP,
  getXPProgressInTier,
  currentSeason,
  daysRemaining,
} from '../data/masteryRewards';
import { CollectionReward, MasteryReward } from '../types';
import { useCommerce } from '../hooks/useCommerce';
import GameIcon, { GameIconName } from '../components/icons/GameIcon';
import {
  coinArtName,
  gemArtName,
  hintArtName,
  milestoneChestName,
  PREMIUM_CTA_GRADIENT,
  PREMIUM_ACCENT,
  PREMIUM_TEXT,
  PREMIUM_TEXT_GLOW,
  PREMIUM_INNER_BORDER,
  PREMIUM_GLOW,
} from '../utils/rewardArt';

// Stable footer identity for the virtualized tier ladder: extra clearance
// beyond the list's own bottom padding so the final tier row scrolls fully
// clear of the floating tab bar (same 36pt the old bottomSpacer provided).
const LADDER_FOOTER = <View style={{ height: 36 }} />;

/**
 * IconMedallion's shell (accent ring + glow + body gradient) hosting a
 * GameIcon SVG instead of an emoji Text — same layered-gem look with the
 * bespoke icon set. Local because common/IconMedallion is emoji-Text-based.
 */
function SvgMedallion({
  glyph,
  name,
  size = 44,
  accent = COLORS.purple,
  muted = false,
  style,
}: {
  glyph?: string;
  name?: GameIconName;
  size?: number;
  accent?: string;
  muted?: boolean;
  style?: object;
}) {
  const alpha = (a: string) => (/^#[0-9a-fA-F]{6}$/.test(accent) ? accent + a : accent);
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: muted ? 'rgba(255,255,255,0.14)' : alpha('73'),
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
        style,
      ]}
    >
      <LinearGradient
        colors={[muted ? 'rgba(255,255,255,0.05)' : alpha('3D'), 'rgba(8, 2, 22, 0.92)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <GameIcon glyph={glyph} name={name} size={size * 0.62} />
    </View>
  );
}

interface MasteryScreenProps {
  onBack?: () => void;
}

// ─── DrawnCrown — crown built from pure Views (replaces the crown emoji) ──────
// Gradient gold band + three triangle points + jewel dots + glow. By default
// it sits in a squircle medallion shell so it drops in where IconMedallion
// used to render the emoji; `bare` renders just the crown for inline pills.

interface DrawnCrownProps {
  /** Outer medallion size (or crown width when `bare`). */
  size?: number;
  /** Render just the crown, no squircle shell. */
  bare?: boolean;
  /** Greys the shell chrome for locked states — the crown art stays lit. */
  muted?: boolean;
  style?: ViewStyle;
}

const DrawnCrown = memo(function DrawnCrown({
  size = 52,
  bare = false,
  muted = false,
  style,
}: DrawnCrownProps) {
  const w = bare ? size : size * 0.6;
  const pointW = w * 0.32;
  const sideH = w * 0.4;
  const midH = w * 0.56;
  const bandH = w * 0.28;
  const jewel = Math.max(3, Math.round(w * 0.16));

  const crown = (
    <View style={{ width: w, height: midH + bandH }}>
      <View style={[crownStyles.pointsRow, { height: midH }]}>
        <View
          style={[
            crownStyles.point,
            {
              borderLeftWidth: pointW / 2,
              borderRightWidth: pointW / 2,
              borderBottomWidth: sideH,
              borderBottomColor: '#ffb800',
            },
          ]}
        />
        <View
          style={[
            crownStyles.point,
            {
              borderLeftWidth: pointW / 2,
              borderRightWidth: pointW / 2,
              borderBottomWidth: midH,
              borderBottomColor: '#ffd24d',
            },
          ]}
        />
        <View
          style={[
            crownStyles.point,
            {
              borderLeftWidth: pointW / 2,
              borderRightWidth: pointW / 2,
              borderBottomWidth: sideH,
              borderBottomColor: '#ffb800',
            },
          ]}
        />
      </View>
      <LinearGradient
        colors={[...GRADIENTS.button.gold]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: midH - 1,
          height: bandH,
          borderRadius: bandH * 0.35,
        }}
      />
      {/* Jewel dots: side point tips, center point tip, band center */}
      <View
        style={[
          crownStyles.jewel,
          {
            width: jewel * 0.8,
            height: jewel * 0.8,
            borderRadius: jewel * 0.4,
            backgroundColor: COLORS.cyan,
            top: midH - sideH - jewel * 0.35,
            left: pointW / 2 - jewel * 0.4,
          },
        ]}
      />
      <View
        style={[
          crownStyles.jewel,
          {
            width: jewel,
            height: jewel,
            borderRadius: jewel / 2,
            backgroundColor: COLORS.pink,
            top: -jewel * 0.35,
            left: w / 2 - jewel / 2,
          },
        ]}
      />
      <View
        style={[
          crownStyles.jewel,
          {
            width: jewel * 0.8,
            height: jewel * 0.8,
            borderRadius: jewel * 0.4,
            backgroundColor: COLORS.cyan,
            top: midH - sideH - jewel * 0.35,
            right: pointW / 2 - jewel * 0.4,
          },
        ]}
      />
      <View
        style={[
          crownStyles.jewel,
          {
            width: jewel,
            height: jewel,
            borderRadius: jewel / 2,
            backgroundColor: COLORS.pink,
            top: midH + bandH / 2 - jewel / 2 - 1,
            left: w / 2 - jewel / 2,
          },
        ]}
      />
    </View>
  );

  if (bare) {
    return <View style={style}>{crown}</View>;
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          borderWidth: 1.5,
          borderColor: muted ? 'rgba(255,255,255,0.14)' : COLORS.gold + '8C',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: 'rgba(12,4,28,0.97)',
          shadowColor: muted ? '#000' : COLORS.gold,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: muted ? 0.2 : 0.55,
          shadowRadius: size * 0.22,
          elevation: muted ? 2 : 6,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={['rgba(255,184,0,0.22)', 'rgba(12,4,28,0.97)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.68,
          height: size * 0.68,
          borderRadius: size * 0.34,
          backgroundColor: 'rgba(255,184,0,0.14)',
        }}
      />
      {crown}
    </View>
  );
});

const crownStyles = StyleSheet.create({
  pointsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  point: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  jewel: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
});

// ─── DrawnLock — crisp padlock built from pure Views (replaces the lock emoji) ───

function DrawnLock({ size = 16, accent = COLORS.gold }: { size?: number; accent?: string }) {
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
          borderColor: accent + 'E6',
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

// ─── Reward chip list — every reward gets a medallion, not a bare string ───

interface RewardChip {
  icon: GameIconName;
  label: string;
  accent: string;
}

function buildRewardChips(
  reward: CollectionReward,
  lane: 'free' | 'premium',
  milestone: boolean,
): RewardChip[] {
  const chips: RewardChip[] = [];
  // Every-5th-tier bundle leads with a chest so milestones read as hauls,
  // not another identical currency row (blind-panel "thin reward-art
  // variety" fix). Bronze on the free lane, gold on premium.
  if (milestone) {
    chips.push({
      icon: milestoneChestName(lane),
      label: 'Bundle',
      accent: lane === 'premium' ? COLORS.gold : COLORS.orange,
    });
  }
  // Currency art escalates with amount: coin → stack → pile → spilling chest.
  if (reward.coins > 0) {
    chips.push({ icon: coinArtName(reward.coins), label: `${reward.coins}`, accent: COLORS.gold });
  }
  if (reward.gems > 0) {
    chips.push({ icon: gemArtName(reward.gems), label: `${reward.gems}`, accent: COLORS.cyan });
  }
  if (reward.hintTokens > 0) {
    chips.push({ icon: hintArtName(reward.hintTokens), label: `${reward.hintTokens}`, accent: COLORS.orange });
  }
  if (reward.badge) {
    chips.push({ icon: 'medal', label: 'Badge', accent: COLORS.purple });
  }
  if (reward.decoration) {
    chips.push({ icon: 'sparkle', label: 'Decor', accent: COLORS.purple });
  }
  return chips;
}

// ─── Tier node on the center spine ─────────────────────────────────────────

interface MasteryNodeProps {
  tier: number;
  unlocked: boolean;
  isCurrent: boolean;
  isMilestone: boolean;
  milestoneGlyph?: GameIconName;
  reduceMotion: boolean;
}

const MasteryNode = memo(function MasteryNode({
  tier,
  unlocked,
  isCurrent,
  isMilestone,
  milestoneGlyph,
  reduceMotion,
}: MasteryNodeProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion || !isCurrent) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, isCurrent, reduceMotion]);

  const size = isCurrent ? 52 : isMilestone ? 46 : 40;
  const radius = isMilestone ? size * 0.3 : size / 2;
  const accent = isMilestone ? COLORS.gold : COLORS.teal;
  const ringColor = unlocked || isCurrent ? accent + 'B3' : 'rgba(255,255,255,0.16)';
  const textColor = unlocked ? COLORS.teal : isCurrent ? COLORS.textPrimary : COLORS.textMuted;

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.85] });

  return (
    <Animated.View style={[styles.nodeWrap, { transform: [{ scale }] }]}>
      {isCurrent && !reduceMotion && (
        <Animated.View
          style={[
            styles.nodePulseRing,
            {
              width: size + 14,
              height: size + 14,
              borderRadius: isMilestone ? radius + 7 : (size + 14) / 2,
              opacity: ringOpacity,
            },
          ]}
        />
      )}
      {isCurrent && (
        <View
          style={[
            styles.nodeCurrentRing,
            {
              width: size + 10,
              height: size + 10,
              borderRadius: isMilestone ? radius + 5 : (size + 10) / 2,
            },
          ]}
        />
      )}
      <View
        style={[
          styles.node,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderColor: ringColor,
          },
          (unlocked || isCurrent) && SHADOWS.glow(accent),
          !unlocked && !isCurrent && styles.nodeMuted,
        ]}
      >
        <LinearGradient
          colors={[accent + '3D', 'rgba(8,2,22,0.94)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
        />
        {isMilestone && milestoneGlyph ? (
          <GameIcon name={milestoneGlyph} size={size * 0.44} />
        ) : (
          <Text style={[styles.nodeText, { color: textColor, fontSize: size * 0.36 }]}>
            {unlocked ? '✓' : tier}
          </Text>
        )}
      </View>
    </Animated.View>
  );
});

// ─── Lane card (free / premium) ────────────────────────────────────────────

interface MasteryLaneCardProps {
  lane: 'free' | 'premium';
  reward: CollectionReward;
  unlocked: boolean;
  premiumOwned: boolean;
  /** Every-5th tier — larger, gold-kissed row so the ladder has rhythm. */
  milestone?: boolean;
  /** The tier the player is currently working toward. */
  highlight?: boolean;
  /** Alternating-row depth variation to break visual monotony. */
  alt?: boolean;
}

const MasteryLaneCard = memo(function MasteryLaneCard({
  lane,
  reward,
  unlocked,
  premiumOwned,
  milestone = false,
  highlight = false,
  alt = false,
}: MasteryLaneCardProps) {
  const premiumLane = lane === 'premium';
  const laneAccent = premiumLane ? COLORS.purple : COLORS.teal;
  const premiumLocked = premiumLane && !premiumOwned;
  const chips = useMemo(
    () => buildRewardChips(reward, lane, milestone),
    [reward, lane, milestone],
  );
  const chipSize = milestone ? 40 : 36;

  return (
    <View
      style={[
        styles.laneCard,
        premiumLane ? styles.laneCardPremium : styles.laneCardFree,
        milestone &&
          (premiumLane ? styles.laneCardMilestonePremium : styles.laneCardMilestoneFree),
        alt && !milestone && styles.laneCardAlt,
        highlight && styles.laneCardCurrent,
        !unlocked && !premiumLane && !highlight && !milestone && styles.laneCardLocked,
      ]}
    >
      <LinearGradient
        colors={
          premiumLane
            ? premiumLocked
              ? ['rgba(74,46,118,0.95)', 'rgba(30,15,58,0.97)']
              : ['rgba(98,52,160,0.95)', 'rgba(26,9,50,0.98)']
            : milestone
              ? ['rgba(255,184,0,0.13)', 'rgba(12,4,28,0.96)']
              : !unlocked
                ? ['rgba(255,255,255,0.04)', 'rgba(16,9,32,0.97)']
                : ['rgba(0,245,212,0.10)', 'rgba(12,4,28,0.96)']
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFillObject, styles.laneCardFill]}
      />
      {premiumLane && (
        <LinearGradient
          colors={[...GRADIENTS.synthwave.holographic]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.holoStrip}
        />
      )}
      {premiumLane && (
        <View style={styles.premiumRibbon}>
          <LinearGradient
            colors={[...PREMIUM_CTA_GRADIENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.premiumRibbonText} numberOfLines={1}>PREMIUM</Text>
        </View>
      )}
      {premiumLocked && (
        <View style={[styles.lockOverlay, styles.lockBadge]}>
          <DrawnLock size={13} accent={PREMIUM_ACCENT} />
        </View>
      )}

      {/* Reward art NEVER dims — locked reads via the lock badge and the
          desaturated card fill, so icons stay full-color and covetable. */}
      <View style={styles.chipColumn}>
        {chips.map((chip, i) => (
          <View key={i} style={styles.chipRow}>
            <View
              style={[
                styles.chipRing,
                {
                  borderColor: chip.accent + '59',
                  backgroundColor: chip.accent + '26',
                  borderRadius: (chipSize + 6) / 2,
                },
                milestone && styles.chipRingMilestone,
              ]}
            >
              <SvgMedallion
                name={chip.icon}
                size={chipSize}
                accent={chip.accent}
              />
            </View>
            <Text
              style={[
                styles.chipLabel,
                (!unlocked || premiumLocked) && styles.chipLabelMuted,
              ]}
              numberOfLines={1}
            >
              {chip.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

// ─── Tier row: free card | spine | premium card ────────────────────────────

interface MasteryTierRowProps {
  tier: number;
  free: CollectionReward;
  premium: CollectionReward;
  unlocked: boolean;
  nextUnlocked: boolean;
  premiumOwned: boolean;
  isCurrent: boolean;
  reduceMotion: boolean;
}

function milestoneGlyphFor(tier: number): GameIconName {
  return tier === 10 ? 'star' : tier === 20 ? 'gem' : tier === 30 ? 'crown' : 'trophy';
}

const MasteryTierRow = memo(function MasteryTierRow({
  tier,
  free,
  premium,
  unlocked,
  nextUnlocked,
  premiumOwned,
  isCurrent,
  reduceMotion,
}: MasteryTierRowProps) {
  const isMilestone = tier % 5 === 0;

  if (tier === MASTERY_MAX_TIER) {
    return (
      <View>
        <View style={styles.showcaseSpineStub}>
          <View style={[styles.spineSeg, unlocked && styles.spineSegOn]} />
        </View>
        <View style={[styles.showcaseCard, unlocked && styles.showcaseCardUnlocked]}>
          <LinearGradient
            colors={['rgba(0,245,212,0.16)', 'rgba(26,10,46,0.96)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFillObject, styles.showcaseFill]}
          />
          <LinearGradient
            colors={[...GRADIENTS.synthwave.holographic]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.showcaseHoloStrip}
          />
          <DrawnCrown size={64} muted={!unlocked} style={styles.showcaseMedallion} />
          <Text style={styles.showcaseEyebrow}>TIER 30</Text>
          <Text style={styles.showcaseTitle}>GRAND MASTERY</Text>
          <Text style={styles.showcaseSubtitle}>
            The champion badge, the grand statue & the season's richest haul.
          </Text>
          <View style={styles.showcaseLanes}>
            <MasteryLaneCard
              lane="free"
              reward={free}
              unlocked={unlocked}
              premiumOwned={premiumOwned}
              milestone
            />
            <View style={styles.showcaseLaneGap} />
            <MasteryLaneCard
              lane="premium"
              reward={premium}
              unlocked={unlocked}
              premiumOwned={premiumOwned}
              milestone
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tierRow}>
      <MasteryLaneCard
        lane="free"
        reward={free}
        unlocked={unlocked}
        premiumOwned={premiumOwned}
        milestone={isMilestone}
        highlight={isCurrent}
        alt={tier % 2 === 0}
      />
      <View style={styles.spineCol}>
        <View
          style={[
            styles.spineSeg,
            unlocked && styles.spineSegOn,
            tier === 1 && styles.spineSegHidden,
          ]}
        />
        <MasteryNode
          tier={tier}
          unlocked={unlocked}
          isCurrent={isCurrent}
          isMilestone={isMilestone}
          milestoneGlyph={isMilestone ? milestoneGlyphFor(tier) : undefined}
          reduceMotion={reduceMotion}
        />
        <View style={[styles.spineSeg, nextUnlocked && styles.spineSegOn]} />
      </View>
      <MasteryLaneCard
        lane="premium"
        reward={premium}
        unlocked={unlocked && premiumOwned}
        premiumOwned={premiumOwned}
        milestone={isMilestone}
        highlight={isCurrent}
        alt={tier % 2 === 0}
      />
    </View>
  );
});

// ─── Premium CTA — synthwave-harmonized gold ───────────────────────────────
// Blind-panel fix: PrimaryButton's flat saturated gold clashed with the
// magenta/violet scheme. Premium purchase CTAs use a warm amber → coral →
// magenta-leaning gradient, thin white-alpha inner border, and a softer
// glow so the gold sits INSIDE the neon palette instead of on top of it.

function PremiumCTAButton({
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        !disabled && PREMIUM_GLOW,
        pressed && !disabled && styles.premiumCtaPressed,
        style,
      ]}
    >
      <LinearGradient
        colors={
          disabled
            ? [COLORS.buttonDisabled, COLORS.buttonDisabled]
            : [...PREMIUM_CTA_GRADIENT]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.premiumCtaSurface}
      >
        <Text
          style={[styles.premiumCtaLabel, disabled && { color: COLORS.textDisabled }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────

const MasteryScreen: React.FC<MasteryScreenProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const puzzlesSolved = usePlayerStore(selectPuzzlesSolved);
  const isPremiumPass = useEconomyStore(selectIsPremiumPassFlag);
  const commerce = useCommerce();
  const reduceMotion = useReduceMotion();

  // Use puzzlesSolved * 100 as mastery XP proxy
  const masteryXP = (puzzlesSolved ?? 0) * 100;
  const currentTier = getMasteryTierForXP(masteryXP);
  const { current: tierProgress, needed: tierNeeded } = getXPProgressInTier(masteryXP);
  const progressPercent = Math.min(100, (tierProgress / tierNeeded) * 100);

  const isPremium = isPremiumPass;
  const seasonName = currentSeason();
  const days = daysRemaining();

  const [purchasingPass, setPurchasingPass] = useState(false);

  // ── Premium pass purchase ─────────────────────────────────────────────

  const handleBuyPremium = useCallback(async () => {
    if (isPremium || purchasingPass) return;
    setPurchasingPass(true);
    try {
      const result = await commerce.purchaseProduct('premium_pass');
      if (result.success) {
        Alert.alert('Premium Unlocked!', 'You now have access to all premium rewards this season.');
      } else if (result.error && result.error !== 'User cancelled') {
        Alert.alert('Purchase Failed', result.error);
      }
    } catch (e: any) {
      Alert.alert('Purchase Error', e?.message ?? 'Something went wrong');
    } finally {
      setPurchasingPass(false);
    }
  }, [commerce, isPremium, purchasingPass]);

  const listHeader = (
    <View>
      {/* Progress hero */}
      <View style={styles.progressPanel}>
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFillObject, styles.panelFill]}
        />
        <View style={styles.progressTopRow}>
          <View>
            <Text style={styles.progressTierEyebrow}>TIER</Text>
            <View style={styles.progressTierBlock}>
              <Text style={styles.progressTierNumber}>{currentTier}</Text>
              <Text style={styles.progressTierMax}>/ {MASTERY_MAX_TIER}</Text>
            </View>
          </View>
          {isPremium && (
            <View style={styles.premiumPill}>
              <DrawnCrown size={14} bare />
              <Text style={styles.premiumPillText}>PREMIUM</Text>
            </View>
          )}
        </View>
        {/* Countdown gets its own full-width row (never squeezed against the
            tier block), so even the longest locale string cannot truncate. */}
        {!isPremium && (
          <View style={styles.countdownPill}>
            <Text
              style={styles.countdownPillText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {'⏳'}{' '}
              {days > 0
                ? t('common.daysRemainingSeason', { count: days })
                : 'Season ending soon!'}
            </Text>
          </View>
        )}
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={`Mastery progress: ${tierProgress} of ${tierNeeded} XP`}
          accessibilityValue={{ min: 0, max: tierNeeded, now: tierProgress }}
        >
          <NeonProgressBar progress={progressPercent / 100} color={COLORS.teal} height={12} />
        </View>
        {/* ONE supporting line. The bar's fill already shows the ratio, so
            the old "200 / 500 XP" + "300 XP to next tier" double readout is
            consolidated into a single "what do I do next" statement. */}
        <Text style={styles.progressHint}>
          {currentTier >= MASTERY_MAX_TIER
            ? 'Mastery track complete! Check back next season.'
            : `${tierNeeded - tierProgress} XP to Tier ${currentTier + 1}`}
        </Text>
        {isPremium && (
          <Text style={styles.countdownInline}>
            {'⏳'}{' '}
            {days > 0
              ? t('common.daysRemainingSeason', { count: days })
              : 'Season ending soon!'}
          </Text>
        )}
      </View>

      {/* Premium upsell hero */}
      {!isPremium && (
        <View style={styles.upsellPanel}>
          <LinearGradient
            colors={['rgba(255,138,92,0.14)', 'rgba(26,10,46,0.94)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFillObject, styles.panelFill]}
          />
          <View style={styles.upsellRow}>
            <DrawnCrown size={52} />
            <View style={styles.upsellCopy}>
              <Text style={styles.upsellTitle}>GET PREMIUM</Text>
              <Text style={styles.upsellDesc}>Unlock exclusive rewards at every tier!</Text>
              {days <= 14 && days > 0 && (
                <Text style={styles.fomoText}>{t('common.daysLeftRewards', { count: days })}</Text>
              )}
            </View>
          </View>
          <PremiumCTAButton
            label={purchasingPass ? 'PROCESSING…' : 'UNLOCK PREMIUM — $4.99'}
            disabled={purchasingPass}
            onPress={handleBuyPremium}
            accessibilityLabel="Buy premium mastery pass for $4.99"
            style={styles.upsellButton}
          />
        </View>
      )}

      <SectionHeader
        label="REWARD TRACK"
        meta={`TIER ${currentTier} / ${MASTERY_MAX_TIER}`}
        accent={COLORS.teal}
      />
      <View style={styles.laneTagsRow}>
        <View style={[styles.laneTag, styles.laneTagFree]}>
          <Text style={[styles.laneTagText, { color: COLORS.teal }]}>FREE</Text>
        </View>
        <View style={styles.laneTagSpacer} />
        <View style={[styles.laneTag, styles.laneTagPremium]}>
          <Text style={[styles.laneTagText, { color: COLORS.purpleLight }]}>PREMIUM</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenScaffold
      title="MASTERY TRACK"
      eyebrow={seasonName.toUpperCase()}
      accent={COLORS.teal}
      backdrop="mastery"
      onBack={onBack}
      scroll={false}
    >
      {/* Virtualized ladder (mirrors SeasonPassScreen): only ~8 of the 30
          tier rows mount at open instead of the whole spine of gradients,
          medallions and ribbons; the hero/upsell/lane tags scroll with the
          list as its header. */}
      <FlatList
        data={MASTERY_REWARDS}
        keyExtractor={(reward: MasteryReward) => String(reward.tier)}
        renderItem={({ item: reward }: { item: MasteryReward }) => (
          <MasteryTierRow
            tier={reward.tier}
            free={reward.free}
            premium={reward.premium}
            unlocked={currentTier >= reward.tier}
            nextUnlocked={currentTier >= reward.tier + 1}
            premiumOwned={isPremium}
            isCurrent={currentTier === reward.tier - 1}
            reduceMotion={reduceMotion}
          />
        )}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        ListHeaderComponent={listHeader}
        ListFooterComponent={LADDER_FOOTER}
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  // FlatList owns scrolling (ScreenScaffold gets scroll={false}); content
  // padding mirrors the scaffold's own scroll-mode values so spacing is
  // unchanged.
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    paddingTop: 12,
  },
  panelFill: { borderRadius: 18 },

  // ── Progress hero ────────────────────────────────────────────────────
  progressPanel: {
    ...bentoPanel('cyan', { padding: 16 }),
    // Opaque base so the hex-grid backdrop can't bleed through the
    // translucent gradient fill layered on top.
    backgroundColor: 'rgba(12,4,28,0.94)',
  },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressTierBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  progressTierNumber: {
    fontFamily: FONTS.display,
    fontSize: 34,
    color: COLORS.teal,
    letterSpacing: 1,
    textShadowColor: COLORS.tealGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  progressTierMax: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  // Premium chrome runs the warm amber→coral family (see utils/rewardArt)
  // so gold accents harmonize with the magenta/violet scheme instead of
  // clashing against it.
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,138,92,0.16)',
    borderWidth: 1,
    borderColor: PREMIUM_ACCENT + '80',
    ...PREMIUM_GLOW,
  },
  premiumPillText: {
    color: PREMIUM_TEXT,
    fontSize: 11,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  countdownPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,68,102,0.14)',
    borderWidth: 1,
    borderColor: COLORS.coral + '55',
    marginBottom: 12,
  },
  countdownPillText: {
    color: COLORS.coral,
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    letterSpacing: 0.5,
  },
  progressTierEyebrow: {
    fontFamily: FONTS.display,
    fontSize: 10,
    letterSpacing: 2.5,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  progressHint: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  countdownInline: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.coral,
    marginTop: 8,
  },

  // ── Premium upsell hero ──────────────────────────────────────────────
  upsellPanel: {
    ...bentoPanel('gold', { padding: 16 }),
    backgroundColor: 'rgba(12,4,28,0.94)',
    // Warm the bento gold shell into the amber→coral premium family.
    borderColor: 'rgba(255,138,92,0.26)',
    shadowColor: PREMIUM_ACCENT,
  },
  upsellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  upsellCopy: {
    flex: 1,
    marginLeft: 14,
  },
  upsellTitle: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: PREMIUM_TEXT,
    letterSpacing: 2.5,
    textShadowColor: PREMIUM_TEXT_GLOW,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  upsellDesc: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  fomoText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.coral,
    marginTop: 4,
  },
  upsellButton: {
    marginTop: 2,
  },

  // ── Premium CTA (amber→coral, thin white-alpha inner border) ─────────
  premiumCtaPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  premiumCtaSurface: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: PREMIUM_INNER_BORDER,
  },
  premiumCtaLabel: {
    fontFamily: FONTS.display,
    fontSize: 16,
    letterSpacing: 2,
    color: COLORS.bg,
    textAlign: 'center',
  },

  // ── Lane tags ────────────────────────────────────────────────────────
  laneTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  laneTag: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  laneTagFree: {
    borderColor: 'rgba(0,245,212,0.30)',
    backgroundColor: 'rgba(0,245,212,0.07)',
  },
  laneTagPremium: {
    borderColor: 'rgba(200,77,255,0.35)',
    backgroundColor: 'rgba(200,77,255,0.08)',
  },
  laneTagSpacer: {
    width: 56,
  },
  laneTagText: {
    fontFamily: FONTS.display,
    fontSize: 10,
    letterSpacing: 2.5,
  },

  // ── Tier row + spine ─────────────────────────────────────────────────
  tierRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  spineCol: {
    width: 56,
    alignItems: 'center',
  },
  spineSeg: {
    flex: 1,
    width: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  spineSegOn: {
    backgroundColor: COLORS.teal,
    ...SHADOWS.neonEdge(COLORS.teal),
  },
  spineSegHidden: {
    opacity: 0,
  },
  nodeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  nodePulseRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.teal,
    ...SHADOWS.neonGlow(COLORS.teal),
  },
  nodeCurrentRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.teal + 'CC',
    ...SHADOWS.glow(COLORS.teal),
  },
  node: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(8,2,22,0.92)',
  },
  nodeMuted: {
    opacity: 0.6,
  },
  nodeText: {
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
  },

  // ── Lane cards ───────────────────────────────────────────────────────
  laneCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    paddingTop: 16,
    marginBottom: 14,
    minHeight: 112,
    // Opaque base under the gradient fill — content sits ON the card
    // instead of blending into the hex grid behind it.
    backgroundColor: 'rgba(12,4,28,0.96)',
  },
  laneCardFree: {
    borderColor: 'rgba(0,245,212,0.22)',
    ...SHADOWS.soft,
  },
  laneCardPremium: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,154,110,0.50)',
    backgroundColor: 'rgba(28,11,54,0.97)',
    shadowColor: PREMIUM_ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.26,
    shadowRadius: 12,
    elevation: 5,
  },
  // Every-5th tier: larger, gold-kissed rows to break the ladder's rhythm.
  laneCardMilestoneFree: {
    minHeight: 128,
    borderWidth: 1.5,
    borderColor: 'rgba(255,184,0,0.40)',
    shadowColor: COLORS.gold,
    shadowOpacity: 0.26,
    shadowRadius: 12,
    elevation: 6,
  },
  laneCardMilestonePremium: {
    minHeight: 128,
    borderColor: 'rgba(255,154,110,0.70)',
  },
  // Subtle alternating depth on even tiers.
  laneCardAlt: {
    backgroundColor: 'rgba(20,8,40,0.96)',
  },
  // The tier currently being worked toward glows on both lanes.
  laneCardCurrent: {
    borderWidth: 1.5,
    borderColor: COLORS.teal + 'B3',
    shadowColor: COLORS.teal,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  // Locked lanes: darker, desaturated CARD shell — the reward art itself
  // never dims (blind-panel "muddy low-contrast reward orbs" fix).
  laneCardLocked: {
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(9,4,20,0.97)',
  },
  laneCardFill: {
    borderRadius: 18,
  },
  holoStrip: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 2.5,
    borderRadius: 2,
    opacity: 0.85,
  },
  premiumRibbon: {
    position: 'absolute',
    top: -7,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PREMIUM_INNER_BORDER,
    ...PREMIUM_GLOW,
  },
  premiumRibbonText: {
    fontFamily: FONTS.display,
    fontSize: 8,
    letterSpacing: 1.5,
    color: COLORS.bg,
  },
  lockOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  // Crisp drawn-padlock badge: small gold-ringed disc, full opacity so the
  // locked state reads intentional instead of washed out.
  lockBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PREMIUM_ACCENT + '8C',
    backgroundColor: 'rgba(12,4,28,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...PREMIUM_GLOW,
    zIndex: 2,
  },
  chipColumn: {
    gap: 6,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Accent ring around each reward medallion so rows read as crafted
  // treasury entries rather than identical utility list items.
  chipRing: {
    padding: 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRingMilestone: {
    borderWidth: 1.5,
    ...SHADOWS.glow(COLORS.gold),
  },
  chipLabel: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  chipLabelMuted: {
    color: COLORS.textSecondary,
  },

  // ── Tier 30 showcase ─────────────────────────────────────────────────
  showcaseSpineStub: {
    alignItems: 'center',
    height: 18,
  },
  showcaseCard: {
    borderRadius: RADIUS.xxl,
    borderWidth: 1.5,
    borderColor: 'rgba(0,245,212,0.40)',
    padding: 18,
    paddingTop: 22,
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: 'rgba(12,4,28,0.96)',
    ...SHADOWS.glow(COLORS.teal),
  },
  showcaseCardUnlocked: {
    borderColor: COLORS.teal + '99',
    ...SHADOWS.neonGlow(COLORS.teal),
  },
  showcaseFill: {
    borderRadius: RADIUS.xxl,
  },
  showcaseHoloStrip: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 3,
    borderRadius: 2,
  },
  showcaseMedallion: {
    marginBottom: 10,
  },
  showcaseEyebrow: {
    fontFamily: FONTS.display,
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.purpleLight,
  },
  showcaseTitle: {
    fontFamily: FONTS.display,
    fontSize: 22,
    letterSpacing: 3,
    color: COLORS.teal,
    marginTop: 2,
    textShadowColor: COLORS.tealGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  showcaseSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  showcaseLanes: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  showcaseLaneGap: {
    width: 12,
  },
});

export default MasteryScreen;
