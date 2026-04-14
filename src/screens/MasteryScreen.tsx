import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../constants';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
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

const { width } = Dimensions.get('window');

interface MasteryScreenProps {
  onBack?: () => void;
}

const MasteryScreen: React.FC<MasteryScreenProps> = ({ onBack }) => {
  const puzzlesSolved = usePlayerStore(selectPuzzlesSolved);
  const isPremiumPass = useEconomyStore(selectIsPremiumPassFlag);
  const commerce = useCommerce();

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

  // ── Render helpers ────────────────────────────────────────────────────

  const renderRewardSummary = (reward: CollectionReward, label: string, unlocked: boolean, isPremiumLane: boolean) => {
    const items: string[] = [];
    if (reward.coins > 0) items.push(`${reward.coins} coins`);
    if (reward.gems > 0) items.push(`${reward.gems} gems`);
    if (reward.hintTokens > 0) items.push(`${reward.hintTokens} hints`);
    if (reward.badge) items.push('Badge');
    if (reward.decoration) items.push('Decoration');

    const showLock = isPremiumLane && !isPremium;

    return (
      <View style={[styles.rewardColumn, !unlocked && styles.rewardLocked]}>
        <View style={styles.rewardLabelRow}>
          <Text style={[styles.rewardLabel, !unlocked && styles.textLocked, isPremiumLane && styles.premiumLabel]}>
            {label}
          </Text>
          {showLock && <Text style={styles.lockIcon}>{'\u{1F512}'}</Text>}
        </View>
        {items.map((item, i) => (
          <Text key={i} style={[styles.rewardItem, !unlocked && styles.textLocked]}>
            {item}
          </Text>
        ))}
      </View>
    );
  };

  const renderTierCard = (tierIndex: number) => {
    const reward = MASTERY_REWARDS[tierIndex];
    if (!reward) return null;

    const tier = reward.tier;
    const unlocked = currentTier >= tier;
    const isCurrent = currentTier === tier - 1;
    const isMilestone = tier % 5 === 0;
    const premiumUnlocked = unlocked && isPremium;

    return (
      <View
        key={tier}
        style={[
          styles.tierCard,
          unlocked && styles.tierCardUnlocked,
          isCurrent && styles.tierCardCurrent,
          isMilestone && styles.tierCardMilestone,
          !isPremium && isMilestone && styles.tierCardMilestoneLocked,
        ]}
      >
        {unlocked ? (
          <LinearGradient
            colors={isMilestone ? [COLORS.gold + '30', COLORS.gold + '10'] : [...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        ) : (
          <LinearGradient
            colors={['#121636', '#0e1230']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        )}

        <View style={styles.tierHeader}>
          <View style={[styles.tierBadge, unlocked && styles.tierBadgeUnlocked, isMilestone && styles.tierBadgeMilestone]}>
            <Text style={[styles.tierNumber, unlocked && styles.tierNumberUnlocked, isMilestone && styles.tierNumberMilestone]}>
              {tier}
            </Text>
          </View>
          {unlocked && (
            <Text style={styles.unlockedCheck}>{'\u2713'}</Text>
          )}
          {isCurrent && (
            <View style={styles.currentIndicator}>
              <Text style={styles.currentText}>CURRENT</Text>
            </View>
          )}
          {isMilestone && (
            <Text style={styles.milestoneIcon}>
              {tier === 10 ? '\u2B50' : tier === 20 ? '\u{1F48E}' : tier === 30 ? '\u{1F451}' : '\u{1F3C6}'}
            </Text>
          )}
        </View>

        <View style={styles.rewardsRow}>
          {renderRewardSummary(reward.free, 'FREE', unlocked, false)}
          <View style={styles.rewardDivider} />
          {renderRewardSummary(reward.premium, 'PREMIUM', premiumUnlocked, true)}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AmbientBackdrop variant="mastery" />
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backText}>{'\u2190'}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>MASTERY TRACK</Text>
          <Text style={styles.seasonName}>{seasonName}</Text>
        </View>
      </View>

      {/* Season Countdown */}
      <View style={styles.countdownBar}>
        <LinearGradient
          colors={[COLORS.coral + '20', COLORS.orange + '10']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <Text style={styles.countdownIcon}>{'\u23F3'}</Text>
        <Text style={styles.countdownText}>
          {days > 0 ? `${days} day${days === 1 ? '' : 's'} remaining this season` : 'Season ending soon!'}
        </Text>
      </View>

      {/* Premium CTA (if not premium) */}
      {!isPremium && (
        <View style={styles.premiumCta}>
          <LinearGradient
            colors={[COLORS.gold + '20', COLORS.gold + '08']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.premiumCtaContent}>
            <Text style={styles.premiumCtaIcon}>{'\u{1F451}'}</Text>
            <View style={styles.premiumCtaInfo}>
              <Text style={styles.premiumCtaTitle}>GET PREMIUM</Text>
              <Text style={styles.premiumCtaDesc}>
                Unlock exclusive rewards at every tier!
              </Text>
              {days <= 14 && days > 0 && (
                <Text style={styles.fomoText}>
                  Don't miss out! Only {days} day{days === 1 ? '' : 's'} left to earn exclusive rewards
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.premiumCtaButton}
              onPress={handleBuyPremium}
              activeOpacity={0.7}
              disabled={purchasingPass}
              accessibilityRole="button"
              accessibilityLabel="Buy premium mastery pass for $4.99"
            >
              <LinearGradient
                colors={[COLORS.gold, '#e6b800']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              {purchasingPass ? (
                <ActivityIndicator size="small" color={COLORS.bg} />
              ) : (
                <Text style={styles.premiumCtaButtonText}>$4.99</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Progress Summary */}
      <View style={styles.progressCard}>
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={styles.progressHeader}>
          <Text style={styles.progressTierLabel}>Tier {currentTier}</Text>
          <Text style={styles.progressTierMax}>/ {MASTERY_MAX_TIER}</Text>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>{'\u{1F451}'} PREMIUM</Text>
            </View>
          )}
        </View>
        <View style={styles.progressBarContainer} accessibilityRole="progressbar" accessibilityLabel={`Mastery progress: ${tierProgress} of ${tierNeeded} XP`} accessibilityValue={{ min: 0, max: tierNeeded, now: tierProgress }}>
          <View style={styles.progressBarTrack}>
            <LinearGradient
              colors={[COLORS.accent, COLORS.teal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
            />
          </View>
          <Text style={styles.progressXP}>
            {tierProgress} / {tierNeeded} XP
          </Text>
        </View>
        <Text style={styles.progressHint}>
          {currentTier >= MASTERY_MAX_TIER
            ? 'Mastery track complete! Check back next season.'
            : `${tierNeeded - tierProgress} XP to next tier`}
        </Text>
      </View>

      {/* Tier List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.tierList}
        showsVerticalScrollIndicator={false}
      >
        {MASTERY_REWARDS.map((_, i) => renderTierCard(i))}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backText: {
    color: COLORS.textPrimary,
    fontSize: 20,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    letterSpacing: 3,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  seasonName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontFamily: FONTS.bodySemiBold,
  },

  // ── Countdown bar ─────────────────────────────────────────────────────
  countdownBar: {
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.coral + '30',
  },
  countdownIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  countdownText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.coral,
  },

  // ── Premium CTA ───────────────────────────────────────────────────────
  premiumCta: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
  },
  premiumCtaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  premiumCtaIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  premiumCtaInfo: {
    flex: 1,
  },
  premiumCtaTitle: {
    fontSize: 16,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    letterSpacing: 2,
  },
  premiumCtaDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  fomoText: {
    fontSize: 11,
    color: COLORS.coral,
    fontFamily: FONTS.bodySemiBold,
    marginTop: 4,
  },
  premiumCtaButton: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    overflow: 'hidden',
    marginLeft: 10,
  },
  premiumCtaButtonText: {
    fontSize: 16,
    fontFamily: FONTS.display,
    color: COLORS.bg,
  },

  // ── Progress card ─────────────────────────────────────────────────────
  progressCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.medium,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  progressTierLabel: {
    fontSize: 32,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  progressTierMax: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginLeft: 6,
    fontFamily: FONTS.bodySemiBold,
  },
  premiumBadge: {
    marginLeft: 'auto',
    backgroundColor: COLORS.gold + '25',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressXP: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'right',
    fontFamily: FONTS.bodySemiBold,
  },
  progressHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONTS.bodyMedium,
  },

  // ── Tier list ─────────────────────────────────────────────────────────
  scrollView: {
    flex: 1,
    marginTop: 16,
  },
  tierList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tierCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 16,
  },
  tierCardUnlocked: {
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tierCardCurrent: {
    borderColor: COLORS.accent + '60',
    ...SHADOWS.glow(COLORS.accent),
  },
  tierCardMilestone: {
    borderColor: COLORS.gold + '40',
  },
  tierCardMilestoneLocked: {
    borderColor: COLORS.gold + '20',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  tierBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBadgeUnlocked: {
    backgroundColor: COLORS.accent + '25',
  },
  tierBadgeMilestone: {
    backgroundColor: COLORS.gold + '25',
  },
  tierNumber: {
    fontSize: 14,
    fontFamily: FONTS.display,
    color: COLORS.textMuted,
  },
  tierNumberUnlocked: {
    color: COLORS.accent,
  },
  tierNumberMilestone: {
    color: COLORS.gold,
  },
  unlockedCheck: {
    fontSize: 16,
    color: COLORS.green,
    fontFamily: FONTS.display,
  },
  currentIndicator: {
    backgroundColor: COLORS.accent + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  currentText: {
    fontSize: 10,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  milestoneIcon: {
    fontSize: 20,
    marginLeft: 'auto',
  },

  // ── Rewards ───────────────────────────────────────────────────────────
  rewardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardColumn: {
    flex: 1,
  },
  rewardLocked: {
    opacity: 0.4,
  },
  rewardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  rewardLabel: {
    fontSize: 10,
    fontFamily: FONTS.display,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  premiumLabel: {
    color: COLORS.gold,
  },
  lockIcon: {
    fontSize: 10,
  },
  rewardItem: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodySemiBold,
    marginBottom: 2,
  },
  textLocked: {
    color: COLORS.textMuted,
  },
  rewardDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  bottomSpacer: {
    height: 40,
  },
});

export default MasteryScreen;
