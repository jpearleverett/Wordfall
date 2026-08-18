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
import { View, Text, StyleSheet, Animated, Easing, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SHADOWS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import IconMedallion from '../components/common/IconMedallion';
import PrimaryButton from '../components/common/PrimaryButton';
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
import { CollectionReward } from '../types';
import { useCommerce } from '../hooks/useCommerce';

interface MasteryScreenProps {
  onBack?: () => void;
}

// ─── Reward chip list — every reward gets a medallion, not a bare string ───

interface RewardChip {
  glyph: string;
  label: string;
  accent: string;
}

function buildRewardChips(reward: CollectionReward): RewardChip[] {
  const chips: RewardChip[] = [];
  if (reward.coins > 0) {
    chips.push({ glyph: '\u{1FA99}', label: `${reward.coins}`, accent: COLORS.gold });
  }
  if (reward.gems > 0) {
    chips.push({ glyph: '\u{1F48E}', label: `${reward.gems}`, accent: COLORS.cyan });
  }
  if (reward.hintTokens > 0) {
    chips.push({ glyph: '\u{1F4A1}', label: `${reward.hintTokens}`, accent: COLORS.orange });
  }
  if (reward.badge) {
    chips.push({ glyph: '\u{1F396}\u{FE0F}', label: 'Badge', accent: COLORS.purple });
  }
  if (reward.decoration) {
    chips.push({ glyph: '\u{2728}', label: 'Decor', accent: COLORS.purple });
  }
  return chips;
}

// ─── Tier node on the center spine ─────────────────────────────────────────

interface MasteryNodeProps {
  tier: number;
  unlocked: boolean;
  isCurrent: boolean;
  isMilestone: boolean;
  milestoneGlyph?: string;
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
        <Text style={[styles.nodeText, { color: textColor, fontSize: size * 0.36 }]}>
          {isMilestone && milestoneGlyph ? milestoneGlyph : unlocked ? '✓' : tier}
        </Text>
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
}

const MasteryLaneCard = memo(function MasteryLaneCard({
  lane,
  reward,
  unlocked,
  premiumOwned,
}: MasteryLaneCardProps) {
  const premiumLane = lane === 'premium';
  const laneAccent = premiumLane ? COLORS.purple : COLORS.teal;
  const premiumLocked = premiumLane && !premiumOwned;
  const chips = useMemo(() => buildRewardChips(reward), [reward]);

  return (
    <View
      style={[
        styles.laneCard,
        premiumLane ? styles.laneCardPremium : styles.laneCardFree,
        (!unlocked || premiumLocked) && styles.laneCardLocked,
      ]}
    >
      <LinearGradient
        colors={
          premiumLane
            ? ['rgba(200,77,255,0.16)', 'rgba(26,10,46,0.94)']
            : ['rgba(0,245,212,0.10)', 'rgba(26,10,46,0.94)']
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
      {premiumLocked && (
        <IconMedallion
          glyph={'\u{1F512}'}
          size={22}
          accent={COLORS.gold}
          style={styles.lockOverlay}
        />
      )}

      <View style={styles.chipColumn}>
        {chips.map((chip, i) => (
          <View key={i} style={styles.chipRow}>
            <IconMedallion
              glyph={chip.glyph}
              size={26}
              accent={chip.accent}
              muted={!unlocked || premiumLocked}
            />
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

function milestoneGlyphFor(tier: number): string {
  return tier === 10 ? '⭐' : tier === 20 ? '\u{1F48E}' : tier === 30 ? '\u{1F451}' : '\u{1F3C6}';
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
          <IconMedallion
            glyph={'\u{1F3C6}'}
            size={64}
            accent={COLORS.teal}
            shape="squircle"
            muted={!unlocked}
            style={styles.showcaseMedallion}
          />
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
            />
            <View style={styles.showcaseLaneGap} />
            <MasteryLaneCard
              lane="premium"
              reward={premium}
              unlocked={unlocked}
              premiumOwned={premiumOwned}
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
      />
    </View>
  );
});

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

  return (
    <ScreenScaffold
      title="MASTERY TRACK"
      eyebrow={seasonName.toUpperCase()}
      accent={COLORS.teal}
      backdrop="mastery"
      onBack={onBack}
    >
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
          {isPremium ? (
            <View style={styles.premiumPill}>
              <Text style={styles.premiumPillText}>{'\u{1F451}'} PREMIUM</Text>
            </View>
          ) : (
            <View style={styles.countdownPill}>
              <Text style={styles.countdownPillText}>
                {'⏳'}{' '}
                {days > 0
                  ? t('common.daysRemainingSeason', { count: days })
                  : 'Season ending soon!'}
              </Text>
            </View>
          )}
        </View>
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
            colors={['rgba(255,184,0,0.16)', 'rgba(26,10,46,0.94)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFillObject, styles.panelFill]}
          />
          <View style={styles.upsellRow}>
            <IconMedallion glyph={'\u{1F451}'} size={52} accent={COLORS.gold} shape="squircle" />
            <View style={styles.upsellCopy}>
              <Text style={styles.upsellTitle}>GET PREMIUM</Text>
              <Text style={styles.upsellDesc}>Unlock exclusive rewards at every tier!</Text>
              {days <= 14 && days > 0 && (
                <Text style={styles.fomoText}>{t('common.daysLeftRewards', { count: days })}</Text>
              )}
            </View>
          </View>
          <PrimaryButton
            label={purchasingPass ? 'PROCESSING…' : 'UNLOCK PREMIUM — $4.99'}
            variant="gold"
            size="large"
            fullWidth
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

      {MASTERY_REWARDS.map((reward) => (
        <MasteryTierRow
          key={reward.tier}
          tier={reward.tier}
          free={reward.free}
          premium={reward.premium}
          unlocked={currentTier >= reward.tier}
          nextUnlocked={currentTier >= reward.tier + 1}
          premiumOwned={isPremium}
          isCurrent={currentTier === reward.tier - 1}
          reduceMotion={reduceMotion}
        />
      ))}
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  panelFill: { borderRadius: 18 },

  // ── Progress hero ────────────────────────────────────────────────────
  progressPanel: {
    ...bentoPanel('cyan', { padding: 16 }),
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
    maxWidth: 190,
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
  fomoText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.coral,
    marginTop: 4,
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
  },
  laneCardFree: {
    borderColor: 'rgba(0,245,212,0.22)',
    ...SHADOWS.soft,
  },
  laneCardPremium: {
    borderColor: 'rgba(200,77,255,0.30)',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  laneCardLocked: {
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
  lockOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  chipColumn: {
    gap: 6,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipLabel: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  chipLabelMuted: {
    color: COLORS.textMuted,
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
