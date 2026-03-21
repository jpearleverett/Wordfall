import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../constants';
import { usePlayer } from '../contexts/PlayerContext';
import {
  MASTERY_REWARDS,
  MASTERY_SEASON,
  MASTERY_MAX_TIER,
  getMasteryTierForXP,
  getXPProgressInTier,
} from '../data/masteryRewards';
import { CollectionReward } from '../types';

const { width } = Dimensions.get('window');

interface MasteryScreenProps {
  onBack?: () => void;
}

const MasteryScreen: React.FC<MasteryScreenProps> = ({ onBack }) => {
  const player = usePlayer();

  // Use puzzlesSolved * 100 as mastery XP proxy
  const masteryXP = (player.puzzlesSolved ?? 0) * 100;
  const currentTier = getMasteryTierForXP(masteryXP);
  const { current: tierProgress, needed: tierNeeded } = getXPProgressInTier(masteryXP);
  const progressPercent = Math.min(100, (tierProgress / tierNeeded) * 100);

  const isPremium = false; // Future IAP integration

  const renderRewardSummary = (reward: CollectionReward, label: string, unlocked: boolean) => {
    const items: string[] = [];
    if (reward.coins > 0) items.push(`${reward.coins} coins`);
    if (reward.gems > 0) items.push(`${reward.gems} gems`);
    if (reward.hintTokens > 0) items.push(`${reward.hintTokens} hints`);
    if (reward.badge) items.push('Badge');
    if (reward.decoration) items.push('Decoration');

    return (
      <View style={[styles.rewardColumn, !unlocked && styles.rewardLocked]}>
        <Text style={[styles.rewardLabel, !unlocked && styles.textLocked]}>{label}</Text>
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

    return (
      <View
        key={tier}
        style={[
          styles.tierCard,
          unlocked && styles.tierCardUnlocked,
          isCurrent && styles.tierCardCurrent,
          isMilestone && styles.tierCardMilestone,
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
            <Text style={styles.unlockedCheck}>✓</Text>
          )}
          {isCurrent && (
            <View style={styles.currentIndicator}>
              <Text style={styles.currentText}>CURRENT</Text>
            </View>
          )}
          {isMilestone && (
            <Text style={styles.milestoneIcon}>
              {tier === 10 ? '⭐' : tier === 20 ? '💎' : tier === 30 ? '👑' : '🏆'}
            </Text>
          )}
        </View>

        <View style={styles.rewardsRow}>
          {renderRewardSummary(reward.free, 'FREE', unlocked)}
          <View style={styles.rewardDivider} />
          {renderRewardSummary(reward.premium, 'PREMIUM', unlocked && isPremium)}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>MASTERY TRACK</Text>
          <Text style={styles.seasonName}>{MASTERY_SEASON}</Text>
        </View>
      </View>

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
        </View>
        <View style={styles.progressBarContainer}>
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
    paddingBottom: 16,
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
  rewardLabel: {
    fontSize: 10,
    fontFamily: FONTS.display,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 6,
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
