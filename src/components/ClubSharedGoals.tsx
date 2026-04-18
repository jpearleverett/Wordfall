/**
 * Club shared goals list — renders the collective-progress goals at
 * clubs/{clubId}/sharedGoals with a full-club progress bar, the top 3
 * member contributors, and a pending-reward claim row if any rewards are
 * unclaimed in the user's inbox.
 *
 * Feature-gated by the `sharedClubGoalsEnabled` Remote Config flag so the
 * whole section can be flipped off without a rebuild if soft-launch KPIs
 * regress.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SHADOWS, GRADIENTS } from '../constants';
import { firestoreService } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useEconomy } from '../contexts/EconomyContext';
import { analytics } from '../services/analytics';
import { getRemoteBoolean } from '../services/remoteConfig';

interface SharedGoalRow {
  id: string;
  label: string;
  target: number;
  progress: number;
  completed: boolean;
  memberContributions: Record<string, number>;
  rewardCoins: number;
  rewardGems: number;
}

interface PendingReward {
  id: string;
  goalLabel: string;
  coins: number;
  gems: number;
}

interface ClubSharedGoalsProps {
  clubId: string | null;
  /** Used to render the contributor list by display name — optional. */
  memberNames?: Record<string, string>;
}

const ClubSharedGoals: React.FC<ClubSharedGoalsProps> = ({ clubId, memberNames }) => {
  const { user } = useAuth();
  const { addCoins, addGems } = useEconomy();
  const [goals, setGoals] = useState<SharedGoalRow[]>([]);
  const [rewards, setRewards] = useState<PendingReward[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);

  const enabled = getRemoteBoolean('sharedClubGoalsEnabled');

  useEffect(() => {
    if (!enabled || !clubId) return;
    let cancelled = false;
    void firestoreService.getSharedClubGoals(clubId).then((list) => {
      if (!cancelled) setGoals(list);
    });
    return () => { cancelled = true; };
  }, [clubId, enabled]);

  useEffect(() => {
    if (!enabled || !user) return;
    let cancelled = false;
    void firestoreService.getPendingSharedGoalRewards(user.uid).then((list) => {
      if (!cancelled) setRewards(list);
    });
    return () => { cancelled = true; };
  }, [user, enabled]);

  const handleClaim = useCallback(
    async (reward: PendingReward) => {
      if (!user || claiming) return;
      setClaiming(reward.id);
      try {
        const ok = await firestoreService.markSharedGoalRewardClaimed(
          user.uid,
          reward.id,
        );
        if (!ok) return;
        if (reward.coins > 0) addCoins(reward.coins);
        if (reward.gems > 0) addGems(reward.gems);
        analytics.logEvent('shared_goal_reward_claimed', {
          reward_id: reward.id,
          coins: reward.coins,
          gems: reward.gems,
        });
        setRewards((prev) => prev.filter((r) => r.id !== reward.id));
      } finally {
        setClaiming(null);
      }
    },
    [user, claiming, addCoins, addGems],
  );

  if (!enabled) return null;
  if (!clubId) return null;
  if (goals.length === 0 && rewards.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionTitle}>Club Shared Goals</Text>

      {rewards.length > 0 && (
        <View style={styles.rewardCard}>
          <LinearGradient
            colors={GRADIENTS.surfaceCard as unknown as readonly [string, string, ...string[]]}
            style={styles.rewardInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.rewardHeader}>
              <Text style={styles.rewardIcon}>{'\uD83C\uDFC6'}</Text>
              <Text style={styles.rewardTitle}>Rewards Ready to Claim</Text>
            </View>
            {rewards.map((reward) => (
              <View key={reward.id} style={styles.rewardRow}>
                <View style={styles.rewardText}>
                  <Text style={styles.rewardLabel}>{reward.goalLabel}</Text>
                  <Text style={styles.rewardSublabel}>
                    +{reward.coins} coins · +{reward.gems} gems
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleClaim(reward)}
                  disabled={claiming === reward.id}
                  style={({ pressed }) => [
                    styles.claimBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <LinearGradient
                    colors={GRADIENTS.button.primary as unknown as readonly [string, string, ...string[]]}
                    style={styles.claimBtnInner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.claimBtnText}>
                      {claiming === reward.id ? '\u2026' : 'CLAIM'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ))}
          </LinearGradient>
        </View>
      )}

      {goals.map((goal) => (
        <SharedGoalRowView key={goal.id} goal={goal} memberNames={memberNames} />
      ))}
    </View>
  );
};

interface SharedGoalRowViewProps {
  goal: SharedGoalRow;
  memberNames?: Record<string, string>;
}

const SharedGoalRowView: React.FC<SharedGoalRowViewProps> = ({ goal, memberNames }) => {
  const progress = goal.target > 0 ? Math.min(goal.progress / goal.target, 1) : 0;
  const topContributors = useMemo(() => {
    const entries = Object.entries(goal.memberContributions || {});
    entries.sort(([, a], [, b]) => b - a);
    return entries.slice(0, 3);
  }, [goal.memberContributions]);

  return (
    <View style={styles.goalCard}>
      <LinearGradient
        colors={GRADIENTS.surfaceCard as unknown as readonly [string, string, ...string[]]}
        style={styles.goalInner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.goalHeader}>
          <Text style={styles.goalLabel}>{goal.label}</Text>
          <Text style={styles.goalProgress}>
            {goal.progress.toLocaleString()} / {goal.target.toLocaleString()}
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: goal.completed ? COLORS.green : COLORS.accent,
              },
            ]}
          />
        </View>
        <View style={styles.rewardLine}>
          <Text style={styles.rewardLineText}>
            Reward: +{goal.rewardCoins} coins · +{goal.rewardGems} gems (each
            member)
          </Text>
        </View>
        {topContributors.length > 0 && (
          <View style={styles.contribList}>
            <Text style={styles.contribHeader}>Top Contributors</Text>
            {topContributors.map(([uid, amount]) => (
              <View key={uid} style={styles.contribRow}>
                <Text style={styles.contribName}>
                  {memberNames?.[uid] || uid.slice(0, 6)}
                </Text>
                <Text style={styles.contribAmount}>+{amount.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

export default ClubSharedGoals;

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.textPrimary,
    letterSpacing: 1,
    marginBottom: 10,
  },
  rewardCard: {
    borderRadius: 16,
    marginBottom: 12,
    ...SHADOWS.medium,
  },
  rewardInner: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rewardIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  rewardTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rewardText: {
    flex: 1,
  },
  rewardLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  rewardSublabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  claimBtn: {
    borderRadius: 10,
    marginLeft: 10,
  },
  claimBtnInner: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  claimBtnText: {
    fontFamily: FONTS.display,
    fontSize: 11,
    color: '#fff',
    letterSpacing: 1.5,
  },
  goalCard: {
    borderRadius: 16,
    marginBottom: 10,
    ...SHADOWS.medium,
  },
  goalInner: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goalLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  goalProgress: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.accent,
    marginLeft: 8,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  rewardLine: {
    marginTop: 8,
  },
  rewardLineText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  contribList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  contribHeader: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  contribRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  contribName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  contribAmount: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.accent,
  },
});
