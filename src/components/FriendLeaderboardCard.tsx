/**
 * FriendLeaderboardCard — home-screen widget showing today's top-scoring
 * friends plus the player's rank within their friend circle. Taps the
 * "View All" CTA to open the Leaderboard screen pre-filtered to the
 * `friends` scope.
 *
 * Feature-gated by `friendLeaderboardHomeCardEnabled` Remote Config so the
 * whole section can be flipped off if soft-launch KPIs regress. Auto-hides
 * when the player has no friends yet (the `/friends` tab CTA lives on the
 * Leaderboard screen itself).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SHADOWS, GRADIENTS } from '../constants';
import { firestoreService } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import { usePlayerStore, selectFriendIds } from '../stores/playerStore';
import { analytics } from '../services/analytics';
import { getRemoteBoolean } from '../services/remoteConfig';
import { SendGiftButton } from './social/SendGiftButton';

interface FriendLeaderboardCardProps {
  onViewAll?: () => void;
}

interface Row {
  userId: string;
  displayName: string;
  score: number;
}

const FriendLeaderboardCard: React.FC<FriendLeaderboardCardProps> = ({ onViewAll }) => {
  const { user } = useAuth();
  const friendIds = usePlayerStore(selectFriendIds);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const enabled = getRemoteBoolean('friendLeaderboardHomeCardEnabled')
    && getRemoteBoolean('friendsEnabled');

  useEffect(() => {
    if (!enabled || !user || friendIds.length === 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void firestoreService
      .getFriendDailyScores(user.uid, friendIds)
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, friendIds, enabled]);

  const { top3, selfRank, total } = useMemo(() => {
    if (!user) return { top3: [] as Row[], selfRank: 0, total: 0 };
    const total_ = rows.length;
    const selfIdx = rows.findIndex((r) => r.userId === user.uid);
    return {
      top3: rows.slice(0, 3),
      selfRank: selfIdx >= 0 ? selfIdx + 1 : 0,
      total: total_,
    };
  }, [rows, user]);

  const handleViewAll = useCallback(() => {
    analytics.logEvent('friend_leaderboard_viewed', {
      friend_count: friendIds.length,
      scored_friends: total,
    });
    onViewAll?.();
  }, [onViewAll, friendIds.length, total]);

  if (!enabled) return null;
  if (!user) return null;
  if (friendIds.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={GRADIENTS.surfaceCard as unknown as readonly [string, string, ...string[]]}
        style={styles.inner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.icon}>{'\uD83C\uDFC5'}</Text>
          <Text style={styles.title}>Friends Leaderboard</Text>
          <Pressable onPress={handleViewAll} hitSlop={8}>
            <Text style={styles.viewAll}>View All ›</Text>
          </Pressable>
        </View>

        {loading && rows.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={COLORS.accent} />
          </View>
        ) : total === 0 ? (
          <Text style={styles.emptyText}>
            No friends have played today yet — be the first to post a score!
          </Text>
        ) : (
          <>
            {top3.map((row, idx) => {
              const isMe = row.userId === user.uid;
              return (
                <View key={row.userId} style={styles.row}>
                  <Text style={[styles.rank, isMe && styles.rankMe]}>
                    {idx + 1}
                  </Text>
                  <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
                    {isMe ? 'You' : row.displayName}
                  </Text>
                  <Text style={[styles.score, isMe && styles.scoreMe]}>
                    {row.score.toLocaleString()}
                  </Text>
                  {!isMe && (
                    <SendGiftButton
                      recipientId={row.userId}
                      recipientName={row.displayName}
                      relationship="friend"
                      compact
                    />
                  )}
                </View>
              );
            })}

            {selfRank > 3 ? (
              <View style={styles.selfBar}>
                <Text style={styles.selfText}>
                  You: #{selfRank} of {total}
                </Text>
              </View>
            ) : selfRank === 0 ? (
              <View style={styles.selfBar}>
                <Text style={styles.selfText}>
                  Play today's daily to enter the ranking
                </Text>
              </View>
            ) : null}
          </>
        )}
      </LinearGradient>
    </View>
  );
};

export default FriendLeaderboardCard;

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    ...SHADOWS.medium,
  },
  inner: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  viewAll: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.accent,
  },
  loading: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rank: {
    width: 22,
    fontFamily: FONTS.display,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  rankMe: {
    color: COLORS.accent,
  },
  name: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  nameMe: {
    color: COLORS.accent,
    fontFamily: FONTS.bodySemiBold,
  },
  score: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  scoreMe: {
    color: COLORS.accent,
  },
  selfBar: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  selfText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
