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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SHADOWS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import IconMedallion from '../components/common/IconMedallion';
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

interface SeasonPassScreenProps {
  onBack?: () => void;
}

// Stable data/footer identities for the virtualized tier ladder.
const TIER_NUMBERS = Array.from({ length: MAX_SEASON_TIER }, (_, i) => i + 1);
const LADDER_FOOTER = <View style={{ height: 110 }} />;

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
            ? ['rgba(255,184,0,0.14)', 'rgba(26,10,46,0.94)']
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
          <Text style={styles.premiumRibbonText}>PREMIUM</Text>
        </View>
      )}

      <View style={styles.rewardMedallionWrap}>
        <IconMedallion
          glyph={reward.icon}
          size={42}
          accent={laneAccent}
          muted={!reached || premiumLocked}
        />
        {premiumLocked && (
          <IconMedallion
            glyph={'\u{1F512}'}
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
          <IconMedallion
            glyph={'\u{1F451}'}
            size={64}
            accent={COLORS.gold}
            shape="squircle"
            muted={!reached}
            style={styles.showcaseMedallion}
          />
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
          <View style={styles.progressTierBlock}>
            <Text style={styles.progressTierNumber}>{state.currentTier}</Text>
            <Text style={styles.progressTierMax}>/ {MAX_SEASON_TIER}</Text>
          </View>
          {state.isPremium ? (
            <View style={styles.premiumPill}>
              <Text style={styles.premiumPillText}>{'\u{1F451}'} PREMIUM</Text>
            </View>
          ) : (
            <View style={styles.countdownPill}>
              <Text style={styles.countdownPillText}>
                {'⏳'} {daysLeft > 0 ? `ENDS IN ${daysLeft}D` : 'ENDING SOON'}
              </Text>
            </View>
          )}
        </View>
        <NeonProgressBar
          progress={progress.percent / 100}
          color={COLORS.purple}
          height={12}
        />
        <Text style={styles.progressXP}>
          {state.currentTier >= MAX_SEASON_TIER
            ? 'Max tier reached!'
            : `${progress.current} / ${progress.required} XP to next tier`}
        </Text>
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
            <IconMedallion glyph={'\u{1F451}'} size={52} accent={COLORS.gold} shape="squircle" />
            <View style={styles.upsellCopy}>
              <Text style={styles.upsellTitle}>GO PREMIUM</Text>
              <Text style={styles.upsellDesc}>
                Unlock the gold lane — exclusive frames, titles & gems on all 50 tiers.
              </Text>
            </View>
          </View>
          <PrimaryButton
            label={purchasing ? 'PROCESSING…' : 'UPGRADE TO PREMIUM — $9.99'}
            variant="gold"
            size="large"
            fullWidth
            disabled={purchasing}
            onPress={handleBuyPremium}
            accessibilityLabel="Upgrade to Premium Season Pass for $9.99"
            style={styles.upsellButton}
          />
        </View>
      )}

      <SectionHeader
        label="REWARD TRACK"
        meta={`TIER ${state.currentTier} / ${MAX_SEASON_TIER}`}
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
  progressXP: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
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
  upsellButton: {
    marginTop: 2,
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
  },
  laneCardFree: {
    borderColor: 'rgba(0,229,255,0.20)',
    ...SHADOWS.soft,
  },
  laneCardPremium: {
    borderColor: 'rgba(255,184,0,0.30)',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
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
