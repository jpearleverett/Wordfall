import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../constants';
import {
  ActiveClubGoal,
  ClubGoalContribution,
  getClubGoalProgress,
  getClubGoalTimeRemaining,
  formatTimeRemaining,
  getReachedTiers,
} from '../data/clubEvents';

const { width } = Dimensions.get('window');

interface ClubGoalCardProps {
  goal: ActiveClubGoal;
  playerContribution?: number;
}

const TIER_COLORS: Record<string, string> = {
  bronze: COLORS.tierBronze,
  silver: COLORS.tierSilver,
  gold: COLORS.tierGold,
};

const TIER_ICONS: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
};

const ClubGoalCard: React.FC<ClubGoalCardProps> = ({ goal, playerContribution = 0 }) => {
  const [timeLeft, setTimeLeft] = useState(() => getClubGoalTimeRemaining(goal.endDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getClubGoalTimeRemaining(goal.endDate));
    }, 60000);
    return () => clearInterval(interval);
  }, [goal.endDate]);

  const { total, topContributors, contributorCount } = getClubGoalProgress(goal.contributions);
  const progress = Math.min(total / goal.target, 1);
  const reachedTiers = getReachedTiers(goal, total);
  const description = goal.template.description.replace('{target}', goal.target.toLocaleString());

  return (
    <LinearGradient
      colors={[...GRADIENTS.surfaceCard] as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.goalIcon}>{goal.template.icon}</Text>
          <View style={styles.headerInfo}>
            <Text style={styles.goalName}>{goal.template.name}</Text>
            <Text style={styles.goalDesc}>{description}</Text>
          </View>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerIcon}>{'⏱'}</Text>
          <Text style={styles.timerText}>{formatTimeRemaining(timeLeft)}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBarBg}>
          <LinearGradient
            colors={[COLORS.accent, COLORS.purple] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${Math.max(progress * 100, 2)}%` as any }]}
          />
          {/* Tier markers */}
          {goal.template.rewardTiers.map((rt) => (
            <View
              key={rt.tier}
              style={[
                styles.tierMarker,
                { left: `${rt.threshold * 100}%` as any },
                reachedTiers.includes(rt.tier) && styles.tierMarkerReached,
              ]}
            />
          ))}
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>
            {total.toLocaleString()} / {goal.target.toLocaleString()}
          </Text>
          <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
        </View>
      </View>

      {/* Reward Tiers */}
      <View style={styles.tierRow}>
        {goal.template.rewardTiers.map((rt) => {
          const reached = reachedTiers.includes(rt.tier);
          const claimed = goal.rewardsClaimed.includes(rt.tier);
          return (
            <View
              key={rt.tier}
              style={[
                styles.tierBadge,
                reached && { borderColor: TIER_COLORS[rt.tier] + '80' },
                reached && SHADOWS.glow(TIER_COLORS[rt.tier]),
              ]}
            >
              <Text style={styles.tierEmoji}>{TIER_ICONS[rt.tier]}</Text>
              <Text
                style={[
                  styles.tierLabel,
                  reached && { color: TIER_COLORS[rt.tier] },
                ]}
              >
                {Math.round(rt.threshold * 100)}%
              </Text>
              <Text style={styles.tierReward}>
                {rt.rewards.coins}c {rt.rewards.gems > 0 ? `+ ${rt.rewards.gems}g` : ''}
              </Text>
              {rt.rewards.exclusiveFrame && (
                <Text style={styles.tierExclusive}>+ Frame</Text>
              )}
              {claimed && <Text style={styles.claimedBadge}>Claimed</Text>}
            </View>
          );
        })}
      </View>

      {/* Top Contributors */}
      {topContributors.length > 0 && (
        <View style={styles.contributorsSection}>
          <Text style={styles.contributorsTitle}>Top Contributors</Text>
          <View style={styles.contributorsRow}>
            {topContributors.map((c, idx) => (
              <View key={c.userId} style={styles.contributor}>
                <View style={[styles.contributorAvatar, idx === 0 && styles.contributorAvatarTop]}>
                  <Text style={styles.contributorAvatarText}>
                    {c.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.contributorName} numberOfLines={1}>
                  {c.displayName}
                </Text>
                <Text style={styles.contributorScore}>{c.amount.toLocaleString()}</Text>
              </View>
            ))}
          </View>
          {contributorCount > 3 && (
            <Text style={styles.moreContributors}>
              +{contributorCount - 3} more members contributing
            </Text>
          )}
        </View>
      )}

      {/* Player Contribution */}
      {playerContribution > 0 && (
        <View style={styles.myContribution}>
          <Text style={styles.myContributionLabel}>Your contribution</Text>
          <Text style={styles.myContributionValue}>{playerContribution.toLocaleString()}</Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  goalIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 18,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  goalDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  timerIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  timerText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
  },
  progressSection: {
    marginBottom: 14,
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.bgLight,
    overflow: 'hidden',
    marginBottom: 6,
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  tierMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 14,
    backgroundColor: COLORS.textMuted,
    marginLeft: -1,
    borderRadius: 1,
  },
  tierMarkerReached: {
    backgroundColor: COLORS.gold,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  progressPercent: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: COLORS.accent,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  tierBadge: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  tierEmoji: {
    fontSize: 18,
    marginBottom: 3,
  },
  tierLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  tierReward: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  tierExclusive: {
    fontSize: 9,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.purple,
    marginTop: 2,
  },
  claimedBadge: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: COLORS.green,
    marginTop: 3,
  },
  contributorsSection: {
    marginBottom: 10,
  },
  contributorsTitle: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  contributorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  contributor: {
    alignItems: 'center',
    width: (width - 80) / 3,
  },
  contributorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  contributorAvatarTop: {
    borderWidth: 2,
    borderColor: COLORS.gold + '80',
    ...SHADOWS.glow(COLORS.gold),
  },
  contributorAvatarText: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  contributorName: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    maxWidth: 80,
    textAlign: 'center',
  },
  contributorScore: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: COLORS.accent,
  },
  moreContributors: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  myContribution: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.accent + '12',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.accent + '25',
  },
  myContributionLabel: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
  },
  myContributionValue: {
    fontSize: 16,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});

export default ClubGoalCard;
