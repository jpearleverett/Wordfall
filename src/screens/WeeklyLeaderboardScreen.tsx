/**
 * Weekly global leaderboard screen.
 *
 * Reads the current week's weeklyScores collection (already populated
 * by every puzzle-complete path via firestoreService.submitWeeklyScore)
 * and renders the top 100 players ordered by score. The current
 * player's row is highlighted; their rank is surfaced at the top even
 * if they're below rank 100 so they can see how close they are to
 * breaking into the reward tiers.
 *
 * Reward distribution runs Sunday 23:00 UTC via the
 * `distributeWeeklyRewards` Cloud Function — grants land in the
 * player's reward inbox (`users/{uid}/rewards/{weekId}_leaderboard`)
 * and the existing inbox UI handles claim.
 *
 * Gated behind the `weeklyCompetitionEnabled` Remote Config flag so
 * Ops can flip it on mid-soft-launch cohort.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS } from '../constants';
import { firestoreService, type FirestoreLeaderboardEntry } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import { analytics } from '../services/analytics';

const TIER_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  default: COLORS.textSecondary,
} as const;

function tierColor(rank: number): string {
  if (rank === 1) return TIER_COLORS.gold;
  if (rank === 2) return TIER_COLORS.silver;
  if (rank === 3) return TIER_COLORS.bronze;
  return TIER_COLORS.default;
}

function rewardHint(rank: number): string | null {
  if (rank === 1) return '🏆 1000 gems + trophy';
  if (rank <= 10) return '🥇 500 gems + frame';
  if (rank <= 100) return '🎖 100 gems';
  if (rank <= 1000) return '🏅 20 gems';
  return null;
}

export function WeeklyLeaderboardScreen({
  onClose,
}: {
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FirestoreLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      void analytics.logEvent('weekly_leaderboard_opened', {});
      try {
        const data = await firestoreService.getWeeklyLeaderboard(100);
        if (!cancelled) {
          setEntries(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const myRank = useMemo(() => {
    if (!user?.uid) return null;
    const idx = entries.findIndex((e) => e.userId === user.uid);
    return idx >= 0 ? idx + 1 : null;
  }, [entries, user?.uid]);

  const myEntry = useMemo(() => {
    if (!user?.uid) return null;
    return entries.find((e) => e.userId === user.uid) ?? null;
  }, [entries, user?.uid]);

  const renderItem = useCallback(
    ({ item, index }: { item: FirestoreLeaderboardEntry; index: number }) => {
      const rank = index + 1;
      const isMe = user?.uid && item.userId === user.uid;
      const reward = rewardHint(rank);
      return (
        <View style={[styles.row, isMe && styles.rowMe]}>
          <Text style={[styles.rank, { color: tierColor(rank) }]}>#{rank}</Text>
          <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
            {item.displayName || 'Player'}
            {isMe ? ' (you)' : ''}
          </Text>
          <View style={styles.rightCol}>
            <Text style={styles.score}>{item.score.toLocaleString()}</Text>
            {reward && <Text style={styles.reward}>{reward}</Text>}
          </View>
        </View>
      );
    },
    [user?.uid],
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...GRADIENTS.surfaceCard]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Weekly Global</Text>
        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close leaderboard"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {myRank !== null && myEntry && (
        <View style={styles.myRankCard}>
          <Text style={styles.myRankLabel}>Your rank this week</Text>
          <Text style={styles.myRankValue}>
            #{myRank} · {myEntry.score.toLocaleString()} pts
          </Text>
          {rewardHint(myRank) && (
            <Text style={styles.myRankReward}>{rewardHint(myRank)}</Text>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.loading}>
          <Text style={styles.emptyText}>
            No scores yet this week — be the first on the board!
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, i) => `${item.userId}-${i}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      <Text style={styles.footnote}>
        Ranks freeze Sunday 23:00 UTC — rewards land in your inbox.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  title: { fontFamily: FONTS.display, fontSize: 22, color: COLORS.textPrimary },
  closeText: { fontSize: 26, color: COLORS.textSecondary },
  myRankCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  myRankLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  myRankValue: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  myRankReward: {
    marginTop: 4,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.gold,
  },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 6,
  },
  rowMe: {
    backgroundColor: 'rgba(124, 92, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.4)',
  },
  rank: {
    width: 52,
    fontFamily: FONTS.display,
    fontSize: 16,
  },
  name: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  nameMe: { color: COLORS.accent },
  rightCol: { alignItems: 'flex-end' },
  score: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  reward: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: {
    color: COLORS.textSecondary,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  footnote: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 11,
    padding: 14,
  },
});
