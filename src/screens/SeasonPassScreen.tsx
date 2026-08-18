/**
 * SeasonPassScreen — 50-tier ladder with free + premium reward lanes.
 *
 * XP accrues from puzzle completion (wired in `useRewardWiring`). Tiers unlock
 * automatically as XP crosses thresholds; players claim rewards per-tier on
 * this screen. Premium lane is gated on `isPremium`; unlocking premium via
 * IAP (`season_pass_premium`) retroactively allows claiming all already-reached
 * premium tiers.
 *
 * Visual language (2026 redesign): a glowing vertical spine connects tier
 * medallion nodes; free-lane and premium-lane reward cards float on either
 * side. Claimable nodes pulse gold (gated behind reduce-motion), the current
 * tier scales up with a glow ring, and tier 50 gets a grand-reward showcase.
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Animated,
  Easing,
  Alert,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SHADOWS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import PrimaryButton from '../components/common/PrimaryButton';
import NeonProgressBar from '../components/common/NeonProgressBar';
import { bentoPanel } from '../styles/bentoPanel';
import { useReduceMotion } from '../hooks/useReduceMotion';
import {
  useEconomyStore,
  useEconomyActions,
  selectSeasonPass,
} from '../stores/economyStore';
import {
  SEASON_PASS_TIERS,
  MAX_SEASON_TIER,
  getXPProgress,
  getCurrentSeason,
  type PassReward,
  type SeasonPassState,
} from '../data/seasonPass';
import { useCommerce } from '../hooks/useCommerce';
import { usePlayerActions } from '../stores/playerStore';
import GameIcon, { GameIconName } from '../components/icons/GameIcon';
import { getDecorationIconName } from '../data/library';

/**
 * Bespoke art for reward kinds whose catalog emoji resolves to a generic
 * fallback icon ('✨' → sparkle, '⭐' → star). Decoration cosmetics resolve
 * through the decoration icon table so a mapped id shows its own art, with
 * the banner as the season-decoration default; rare tiles get the crystal.
 * Returns undefined for kinds whose emoji already resolves to distinct art.
 */
function rewardIconName(reward: PassReward): GameIconName | undefined {
  if (reward.type === 'rare_tile') return 'cascadeCrystal';
  if (reward.type === 'cosmetic' && reward.cosmeticId && /(^|_)deco/.test(reward.cosmeticId)) {
    const resolved = getDecorationIconName(reward.cosmeticId);
    return resolved === 'chest' ? 'bannerDecor' : resolved;
  }
  return undefined;
}

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
        muted && { opacity: 0.55 },
        style,
      ]}
    >
      <LinearGradient
        colors={[muted ? 'rgba(255,255,255,0.05)' : alpha('3D'), 'rgba(8, 2, 22, 0.92)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Icon-only dim on locked tiers so owned (unlocked) medallions pop. */}
      <View style={muted ? { opacity: 0.6 } : undefined}>
        <GameIcon glyph={glyph} name={name} size={size * 0.58} />
      </View>
    </View>
  );
}

interface SeasonPassScreenProps {
  onBack?: () => void;
}

// Stable data/footer identities for the virtualized tier ladder.
const TIER_NUMBERS = Array.from({ length: MAX_SEASON_TIER }, (_, i) => i + 1);
// Tall enough to clear the floating tab bar (64pt + home-indicator inset)
// with margin, so the last tier row is never cut off at max scroll.
const LADDER_FOOTER = <View style={{ height: 150 }} />;

// ─── DrawnCrown — crown built from pure Views (replaces the crown emoji) ──────
// Gradient gold band + three triangle points + jewel dots + glow. By default
// it sits in a squircle medallion shell so it drops in where IconMedallion
// used to render the emoji; `bare` renders just the crown for inline pills.

interface DrawnCrownProps {
  /** Outer medallion size (or crown width when `bare`). */
  size?: number;
  /** Render just the crown, no squircle shell. */
  bare?: boolean;
  /** Dims for locked states (mirrors IconMedallion's muted). */
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
        muted && { opacity: 0.55 },
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

// ─── Tier node — the medallion on the center spine ─────────────────────────

interface TierNodeProps {
  tier: number;
  reached: boolean;
  allClaimed: boolean;
  isCurrent: boolean;
  isMilestone: boolean;
  pulseActive: boolean;
  reduceMotion: boolean;
}

const TierNode = memo(function TierNode({
  tier,
  reached,
  allClaimed,
  isCurrent,
  isMilestone,
  pulseActive,
  reduceMotion,
}: TierNodeProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion || !pulseActive) {
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
  }, [pulse, pulseActive, reduceMotion]);

  const size = isCurrent ? 52 : isMilestone ? 46 : 40;
  const radius = isMilestone ? size * 0.3 : size / 2;
  const accent = allClaimed ? COLORS.green : reached ? COLORS.gold : COLORS.purple;
  const ringColor = reached || allClaimed ? accent + 'B3' : 'rgba(255,255,255,0.16)';
  const textColor = allClaimed
    ? COLORS.green
    : reached
      ? COLORS.goldLight
      : COLORS.textMuted;

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.85] });

  return (
    <Animated.View style={[styles.nodeWrap, { transform: [{ scale }] }]}>
      {pulseActive && !reduceMotion && (
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
          reached ? SHADOWS.glow(accent) : null,
          !reached && styles.nodeMuted,
        ]}
      >
        <LinearGradient
          colors={[accent + '3D', 'rgba(8,2,22,0.94)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
        />
        <Text style={[styles.nodeText, { color: textColor, fontSize: size * 0.36 }]}>
          {allClaimed ? '✓' : tier}
        </Text>
      </View>
    </Animated.View>
  );
});

// ─── Lane reward card (free / premium) ─────────────────────────────────────

interface LaneCardProps {
  tier: number;
  lane: 'free' | 'premium';
  reward: PassReward;
  reached: boolean;
  claimed: boolean;
  isPremiumUser: boolean;
  onClaim: (tier: number, lane: 'free' | 'premium') => void;
}

const LaneCard = memo(function LaneCard({
  tier,
  lane,
  reward,
  reached,
  claimed,
  isPremiumUser,
  onClaim,
}: LaneCardProps) {
  const premiumLane = lane === 'premium';
  const laneAccent = premiumLane ? COLORS.gold : COLORS.cyan;
  const premiumLocked = premiumLane && !isPremiumUser;
  const claimable = reached && !claimed && (!premiumLane || isPremiumUser);
  const muted = !reached || premiumLocked;
  // Landmark tiers (10/20/30/40/50) get a gilded double-ring medallion so
  // the ladder reads as having milestone payoffs at a glance.
  const landmark = tier % 10 === 0;

  const handlePress = useCallback(() => onClaim(tier, lane), [onClaim, tier, lane]);

  return (
    <View
      style={[
        styles.laneCard,
        premiumLane ? styles.laneCardPremium : styles.laneCardFree,
        claimed && styles.laneCardClaimed,
      ]}
    >
      <LinearGradient
        colors={
          premiumLane
            ? ['rgba(98,52,160,0.95)', 'rgba(26,9,50,0.98)']
            : [...GRADIENTS.surfaceCard]
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
            colors={[...GRADIENTS.button.gold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.premiumRibbonText} numberOfLines={1}>PREMIUM</Text>
        </View>
      )}

      <View style={styles.rewardMedallionWrap}>
        {landmark ? (
          <View
            style={[styles.gildedRing, muted && styles.gildedRingMuted]}
            accessibilityLabel={`Landmark tier ${tier} reward`}
          >
            <View style={[styles.gildedRingInner, muted && styles.gildedRingInnerMuted]}>
              <SvgMedallion
                glyph={reward.icon}
                name={rewardIconName(reward)}
                size={40}
                accent={COLORS.gold}
                muted={muted}
              />
            </View>
          </View>
        ) : (
          <SvgMedallion
            glyph={reward.icon}
            name={rewardIconName(reward)}
            size={42}
            accent={laneAccent}
            muted={muted}
          />
        )}
        {premiumLocked && (
          <SvgMedallion
            name="lock"
            size={22}
            accent={COLORS.gold}
            style={styles.lockOverlay}
          />
        )}
      </View>
      <Text
        style={[styles.rewardLabel, (!reached || premiumLocked) && styles.rewardLabelMuted]}
        numberOfLines={2}
      >
        {reward.label}
      </Text>

      {claimable ? (
        <PrimaryButton
          label="CLAIM"
          variant="gold"
          size="small"
          onPress={handlePress}
          accessibilityLabel={`Claim ${lane} reward for tier ${tier}`}
          style={styles.claimButton}
        />
      ) : (
        <View
          style={[
            styles.statusChip,
            claimed && styles.statusChipClaimed,
            premiumLocked && reached && styles.statusChipPremium,
          ]}
          accessibilityLabel={
            claimed
              ? `Tier ${tier} ${lane} reward claimed`
              : premiumLocked
                ? `Tier ${tier} premium reward requires premium pass`
                : `Tier ${tier} ${lane} reward locked`
          }
        >
          <Text
            style={[
              styles.statusChipText,
              claimed && styles.statusChipTextClaimed,
              premiumLocked && reached && styles.statusChipTextPremium,
            ]}
            numberOfLines={1}
          >
            {claimed ? '✓ CLAIMED' : premiumLocked && reached ? 'PREMIUM' : 'LOCKED'}
          </Text>
        </View>
      )}
    </View>
  );
});

// ─── Tier row: free card | spine node | premium card ───────────────────────

interface SeasonTierRowProps {
  tier: number;
  reached: boolean;
  nextReached: boolean;
  freeClaimed: boolean;
  premiumClaimed: boolean;
  isPremiumUser: boolean;
  isCurrent: boolean;
  reduceMotion: boolean;
  onClaim: (tier: number, lane: 'free' | 'premium') => void;
}

const SeasonTierRow = memo(function SeasonTierRow({
  tier,
  reached,
  nextReached,
  freeClaimed,
  premiumClaimed,
  isPremiumUser,
  isCurrent,
  reduceMotion,
  onClaim,
}: SeasonTierRowProps) {
  const def = SEASON_PASS_TIERS[tier - 1];
  const isMilestone = tier % 5 === 0;
  const allClaimed = reached && freeClaimed && (premiumClaimed || !isPremiumUser);
  const claimablePulse =
    reached && (!freeClaimed || (isPremiumUser && !premiumClaimed));

  if (tier === MAX_SEASON_TIER) {
    return (
      <View>
        <View style={styles.showcaseSpineStub}>
          <View style={[styles.spineSeg, reached && styles.spineSegOn]} />
        </View>
        <View style={[styles.showcaseCard, reached && styles.showcaseCardReached]}>
          <LinearGradient
            colors={['rgba(200,77,255,0.22)', 'rgba(26,10,46,0.96)']}
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
          <DrawnCrown size={64} muted={!reached} style={styles.showcaseMedallion} />
          <Text style={styles.showcaseEyebrow}>TIER 50</Text>
          <Text style={styles.showcaseTitle}>GRAND REWARD</Text>
          <Text style={styles.showcaseSubtitle}>{def.premiumReward.label}</Text>
          <View style={styles.showcaseLanes}>
            <LaneCard
              tier={tier}
              lane="free"
              reward={def.freeReward}
              reached={reached}
              claimed={freeClaimed}
              isPremiumUser={isPremiumUser}
              onClaim={onClaim}
            />
            <View style={styles.showcaseLaneGap} />
            <LaneCard
              tier={tier}
              lane="premium"
              reward={def.premiumReward}
              reached={reached}
              claimed={premiumClaimed}
              isPremiumUser={isPremiumUser}
              onClaim={onClaim}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tierRow}>
      <LaneCard
        tier={tier}
        lane="free"
        reward={def.freeReward}
        reached={reached}
        claimed={freeClaimed}
        isPremiumUser={isPremiumUser}
        onClaim={onClaim}
      />
      <View style={styles.spineCol}>
        <View
          style={[
            styles.spineSeg,
            reached && styles.spineSegOn,
            tier === 1 && styles.spineSegHidden,
          ]}
        />
        <TierNode
          tier={tier}
          reached={reached}
          allClaimed={allClaimed}
          isCurrent={isCurrent}
          isMilestone={isMilestone}
          pulseActive={claimablePulse}
          reduceMotion={reduceMotion}
        />
        <View style={[styles.spineSeg, nextReached && styles.spineSegOn]} />
      </View>
      <LaneCard
        tier={tier}
        lane="premium"
        reward={def.premiumReward}
        reached={reached}
        claimed={premiumClaimed}
        isPremiumUser={isPremiumUser}
        onClaim={onClaim}
      />
    </View>
  );
});

// ─── Screen ────────────────────────────────────────────────────────────────

const SeasonPassScreen: React.FC<SeasonPassScreenProps> = ({ onBack }) => {
  const pass = useEconomyStore(selectSeasonPass);
  const { claimSeasonPassTier } = useEconomyActions();
  const { unlockCosmetic, queueCeremony } = usePlayerActions();
  const commerce = useCommerce();
  const reduceMotion = useReduceMotion();

  const [purchasing, setPurchasing] = useState(false);
  const season = useMemo(() => getCurrentSeason(), []);

  const state: SeasonPassState = pass ?? {
    seasonId: season.id,
    currentXP: 0,
    currentTier: 0,
    isPremium: false,
    claimedFreeTiers: [],
    claimedPremiumTiers: [],
    seasonStartDate: season.startDate,
    seasonEndDate: season.endDate,
  };

  const progress = useMemo(
    () => getXPProgress(state.currentXP, state.currentTier),
    [state.currentXP, state.currentTier],
  );

  const daysLeft = useMemo(() => {
    const endMs = new Date(state.seasonEndDate).getTime();
    if (Number.isNaN(endMs)) return 0;
    return Math.max(0, Math.ceil((endMs - Date.now()) / 86_400_000));
  }, [state.seasonEndDate]);

  // "Season 8: Ocean Depths" → eyebrow "SEASON 8", subtitle "Ocean Depths".
  const [seasonEyebrow, seasonTheme] = useMemo(() => {
    const idx = season.name.indexOf(':');
    if (idx === -1) return [season.name.toUpperCase(), undefined] as const;
    return [
      season.name.slice(0, idx).toUpperCase(),
      season.name.slice(idx + 1).trim(),
    ] as const;
  }, [season.name]);

  const handleBuyPremium = useCallback(async () => {
    if (state.isPremium || purchasing) return;
    setPurchasing(true);
    try {
      const result = await commerce.purchaseProduct('season_pass_premium');
      if (result.success) {
        Alert.alert('Premium Unlocked!', 'You can now claim premium rewards on every reached tier.');
      } else if (result.error && result.error !== 'User cancelled') {
        Alert.alert('Purchase Failed', result.error);
      }
    } catch (e: any) {
      Alert.alert('Purchase Error', e?.message ?? 'Something went wrong');
    } finally {
      setPurchasing(false);
    }
  }, [commerce, state.isPremium, purchasing]);

  const handleClaim = useCallback(
    (tier: number, lane: 'free' | 'premium') => {
      const grant = claimSeasonPassTier(tier, lane);
      if (grant?.cosmetic) {
        void unlockCosmetic(grant.cosmetic.id);
      }
      // MG1 in launch_blockers.md: fire a dedicated cinematic when the
      // ceiling tier (MAX_SEASON_TIER) is claimed. All other tiers fall
      // through to the per-tier claim toast / no ceremony. The reward
      // summary is built from the tier definition so we don't depend on
      // claimSeasonPassTier's slim return type.
      if (tier === MAX_SEASON_TIER) {
        const tierDef = SEASON_PASS_TIERS[tier - 1];
        const rewardLabels: string[] = [];
        const pushReward = (r?: PassReward) => {
          if (r?.label) rewardLabels.push(r.label);
        };
        pushReward(tierDef?.freeReward);
        pushReward(tierDef?.premiumReward);
        queueCeremony({
          type: 'season_pass_complete',
          data: {
            seasonName: season.name,
            tier,
            rewardLabels,
            cosmeticSetId: grant?.cosmetic?.id,
          },
        });
      }
    },
    [claimSeasonPassTier, unlockCosmetic, queueCeremony, season.name],
  );

  const keyExtractorTier = useCallback((tier: number) => String(tier), []);

  const renderItem = useCallback(
    ({ item: tier }: { item: number }) => (
      <SeasonTierRow
        tier={tier}
        reached={state.currentTier >= tier}
        nextReached={state.currentTier >= tier + 1}
        freeClaimed={state.claimedFreeTiers.includes(tier)}
        premiumClaimed={state.claimedPremiumTiers.includes(tier)}
        isPremiumUser={state.isPremium}
        isCurrent={tier === Math.min(state.currentTier + 1, MAX_SEASON_TIER)}
        reduceMotion={reduceMotion}
        onClaim={handleClaim}
      />
    ),
    [
      state.currentTier,
      state.claimedFreeTiers,
      state.claimedPremiumTiers,
      state.isPremium,
      reduceMotion,
      handleClaim,
    ],
  );

  const listHeader = (
    <View>
      {/* Tier progress hero */}
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
              <Text style={styles.progressTierNumber}>{state.currentTier}</Text>
              <Text style={styles.progressTierMax}>/ {MAX_SEASON_TIER}</Text>
            </View>
          </View>
          {state.isPremium ? (
            <View style={styles.premiumPill}>
              <DrawnCrown size={14} bare />
              <Text style={styles.premiumPillText}>PREMIUM</Text>
            </View>
          ) : (
            <View style={styles.countdownPill}>
              <Text style={styles.countdownPillText}>
                {'⏳'} {daysLeft > 0 ? `ENDS IN ${daysLeft}D` : 'ENDING SOON'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.progressXPRow}>
          <Text style={styles.progressXPLabel}>
            {state.currentTier >= MAX_SEASON_TIER ? 'SEASON COMPLETE' : 'NEXT TIER'}
          </Text>
          <Text style={styles.progressXP}>
            {state.currentTier >= MAX_SEASON_TIER
              ? 'Max tier reached!'
              : `${progress.current} / ${progress.required} XP`}
          </Text>
        </View>
        <NeonProgressBar
          progress={progress.percent / 100}
          color={COLORS.purple}
          height={12}
        />
        {state.isPremium && (
          <Text style={styles.countdownInline}>
            {'⏳'} {daysLeft > 0 ? `Season ends in ${daysLeft} days` : 'Season ending soon!'}
          </Text>
        )}
      </View>

      {/* Premium upsell hero */}
      {!state.isPremium && (
        <View style={styles.upsellPanel}>
          <LinearGradient
            colors={['rgba(255,184,0,0.16)', 'rgba(26,10,46,0.94)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFillObject, styles.panelFill]}
          />
          <View style={styles.upsellRow}>
            <DrawnCrown size={52} />
            <View style={styles.upsellCopy}>
              <Text style={styles.upsellTitle}>GO PREMIUM</Text>
              <Text style={styles.upsellDesc}>
                Unlock the gold lane — exclusive frames, titles & gems on all 50 tiers.
              </Text>
            </View>
          </View>
          {/* CTA + price live in separate elements so the label can never
              truncate into "$9…" at narrow widths (390px design review). */}
          <View style={styles.upsellCtaRow}>
            <PrimaryButton
              label={purchasing ? 'PROCESSING…' : 'UPGRADE NOW'}
              variant="gold"
              size="large"
              disabled={purchasing}
              onPress={handleBuyPremium}
              accessibilityLabel="Upgrade to Premium Season Pass for $9.99"
              style={styles.upsellButton}
            />
            <View style={styles.upsellPriceCapsule}>
              <Text style={styles.upsellPriceText}>$9.99</Text>
              <Text style={styles.upsellPriceNote}>ONE-TIME</Text>
            </View>
          </View>
        </View>
      )}

      {/* Meta deliberately does NOT repeat "TIER n / 50" — the hero above is
          the single place that stat reads (design-review hierarchy note). */}
      <SectionHeader
        label="REWARD TRACK"
        meta={`${MAX_SEASON_TIER} TIERS`}
        accent={COLORS.gold}
      />
      <View style={styles.laneTagsRow}>
        <View style={[styles.laneTag, styles.laneTagFree]}>
          <Text style={[styles.laneTagText, { color: COLORS.cyan }]}>FREE</Text>
        </View>
        <View style={styles.laneTagSpacer} />
        <View style={[styles.laneTag, styles.laneTagPremium]}>
          <Text style={[styles.laneTagText, { color: COLORS.gold }]}>PREMIUM</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenScaffold
      title="SEASON PASS"
      eyebrow={seasonEyebrow}
      subtitle={seasonTheme}
      accent={COLORS.gold}
      backdrop="event"
      onBack={onBack}
      scroll={false}
    >
      {/* Virtualized ladder: only ~8 of the 50 tier rows mount at open
          instead of all ~700 views, and claims re-render windows, not the
          whole ladder. */}
      <FlatList
        data={TIER_NUMBERS}
        keyExtractor={keyExtractorTier}
        renderItem={renderItem}
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  panelFill: { borderRadius: 18 },

  // ── Progress hero ────────────────────────────────────────────────────
  progressPanel: {
    ...bentoPanel('purple', { padding: 16 }),
    // Opaque base so the synthwave wireframe backdrop can't bleed through
    // the translucent gradient fill layered on top.
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
  progressTierEyebrow: {
    fontFamily: FONTS.display,
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  progressTierNumber: {
    fontFamily: FONTS.display,
    fontSize: 34,
    color: COLORS.gold,
    letterSpacing: 1,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  progressTierMax: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,184,0,0.18)',
    borderWidth: 1,
    borderColor: COLORS.gold + '80',
    ...SHADOWS.glow(COLORS.gold),
  },
  premiumPillText: {
    color: COLORS.gold,
    fontSize: 11,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  countdownPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,68,102,0.14)',
    borderWidth: 1,
    borderColor: COLORS.coral + '55',
  },
  countdownPillText: {
    color: COLORS.coral,
    fontSize: 11,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  progressXPRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressXPLabel: {
    fontFamily: FONTS.display,
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.textMuted,
  },
  progressXP: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  countdownInline: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.coral,
    textAlign: 'center',
    marginTop: 6,
  },

  // ── Premium upsell hero ──────────────────────────────────────────────
  upsellPanel: {
    ...bentoPanel('gold', { padding: 16 }),
    backgroundColor: 'rgba(12,4,28,0.94)',
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
    color: COLORS.gold,
    letterSpacing: 2.5,
    textShadowColor: COLORS.goldGlow,
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
  upsellCtaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 2,
  },
  upsellButton: {
    flex: 1,
  },
  upsellPriceCapsule: {
    marginLeft: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.gold + '66',
    backgroundColor: 'rgba(255,184,0,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upsellPriceText: {
    fontFamily: FONTS.display,
    fontSize: 17,
    color: COLORS.gold,
    letterSpacing: 0.5,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  upsellPriceNote: {
    fontFamily: FONTS.display,
    fontSize: 7,
    letterSpacing: 1.5,
    color: COLORS.goldLight,
    marginTop: 1,
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
    borderColor: 'rgba(0,229,255,0.30)',
    backgroundColor: 'rgba(0,229,255,0.08)',
  },
  laneTagPremium: {
    borderColor: 'rgba(255,184,0,0.35)',
    backgroundColor: 'rgba(255,184,0,0.08)',
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
    backgroundColor: COLORS.purple,
    ...SHADOWS.neonEdge(COLORS.purple),
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
    borderColor: COLORS.gold,
    ...SHADOWS.neonGlow(COLORS.gold),
  },
  nodeCurrentRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.goldLight + 'CC',
    ...SHADOWS.glow(COLORS.gold),
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
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 136,
    // Opaque base under the gradient fill — content sits ON the card
    // instead of blending into the floor grid behind it.
    backgroundColor: 'rgba(12,4,28,0.96)',
  },
  laneCardFree: {
    borderColor: 'rgba(0,229,255,0.20)',
    ...SHADOWS.soft,
  },
  laneCardPremium: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,196,32,0.55)',
    backgroundColor: 'rgba(28,11,54,0.97)',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  laneCardClaimed: {
    opacity: 0.6,
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
    ...SHADOWS.glow(COLORS.gold),
  },
  premiumRibbonText: {
    fontFamily: FONTS.display,
    fontSize: 8,
    letterSpacing: 1.5,
    color: COLORS.bg,
  },
  rewardMedallionWrap: {
    marginBottom: 6,
  },
  // Gilded double ring wrapping landmark-tier medallions (10/20/30/40/50).
  gildedRing: {
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    padding: 2,
    backgroundColor: 'rgba(255, 184, 0, 0.10)',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 9,
    elevation: 7,
  },
  gildedRingMuted: {
    borderColor: 'rgba(255, 184, 0, 0.35)',
    backgroundColor: 'rgba(255, 184, 0, 0.04)',
    shadowOpacity: 0.15,
    elevation: 2,
  },
  gildedRingInner: {
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 92, 0.55)',
    padding: 1.5,
  },
  gildedRingInnerMuted: {
    borderColor: 'rgba(255, 214, 92, 0.2)',
  },
  lockOverlay: {
    position: 'absolute',
    top: -6,
    right: -8,
  },
  rewardLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 8,
  },
  rewardLabelMuted: {
    color: COLORS.textMuted,
  },
  claimButton: {
    alignSelf: 'stretch',
  },
  statusChip: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statusChipClaimed: {
    borderColor: COLORS.green + '55',
    backgroundColor: 'rgba(0,255,135,0.08)',
  },
  statusChipPremium: {
    borderColor: COLORS.gold + '45',
    backgroundColor: 'rgba(255,184,0,0.08)',
  },
  statusChipText: {
    fontFamily: FONTS.display,
    fontSize: 10,
    letterSpacing: 1.5,
    color: COLORS.textMuted,
  },
  statusChipTextClaimed: {
    color: COLORS.green,
  },
  statusChipTextPremium: {
    color: COLORS.gold,
  },

  // ── Tier 50 showcase ─────────────────────────────────────────────────
  showcaseSpineStub: {
    alignItems: 'center',
    height: 18,
  },
  showcaseCard: {
    borderRadius: RADIUS.xxl,
    borderWidth: 1.5,
    borderColor: 'rgba(255,184,0,0.40)',
    padding: 18,
    paddingTop: 22,
    alignItems: 'center',
    backgroundColor: 'rgba(12,4,28,0.96)',
    ...SHADOWS.glow(COLORS.gold),
  },
  showcaseCardReached: {
    borderColor: COLORS.gold + '99',
    ...SHADOWS.neonGlow(COLORS.gold),
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
    color: COLORS.gold,
    marginTop: 2,
    textShadowColor: COLORS.goldGlow,
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

export default SeasonPassScreen;
