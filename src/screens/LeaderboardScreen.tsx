import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS } from '../constants';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

const TIME_TABS = ['Daily', 'Weekly', 'All-Time'] as const;
const SCOPE_TABS = ['Global', 'Friends', 'Club'] as const;

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  rank: number;
  avatar?: string;
}

interface LeaderboardScreenProps {
  leaderboardData?: any[];
  currentUserId?: string;
  activeTab?: string;
  onChangeTab?: (tab: string) => void;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  leaderboardData,
  currentUserId: currentUserIdProp,
  activeTab: activeTabProp,
  onChangeTab: onChangeTabProp,
}) => {
  const { user } = useAuth();
  const currentUserId = currentUserIdProp ?? user?.uid ?? '';
  const activeTab = activeTabProp ?? 'daily_global';
  const onChangeTab = onChangeTabProp ?? ((_tab: string) => {});
  const activeTime = TIME_TABS.find((t) => activeTab.includes(t.toLowerCase())) ?? 'Daily';
  const activeScope = SCOPE_TABS.find((s) => activeTab.includes(s.toLowerCase())) ?? 'Global';

  const entries: LeaderboardEntry[] = (leaderboardData ?? []).map(
    (entry: any, index: number) => ({
      id: entry.id ?? `user_${index}`,
      name: entry.name ?? `Player ${index + 1}`,
      score: entry.score ?? 0,
      rank: entry.rank ?? index + 1,
      avatar: entry.avatar,
    }),
  );

  const getRankColor = (rank: number): string => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return COLORS.textMuted;
  };

  const getRankEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  const currentUser = entries.find((e) => e.id === currentUserId);

  const renderTopThree = () => {
    const top3 = entries.slice(0, 3);
    if (top3.length === 0) return null;

    const order = [1, 0, 2];

    return (
      <View style={styles.topThreeContainer}>
        {order.map((idx) => {
          const entry = top3[idx];
          if (!entry) return <View key={idx} style={styles.topPlaceholder} />;

          const isFirst = idx === 0;
          const rankColor = getRankColor(entry.rank);

          return (
            <LinearGradient
              key={entry.id}
              colors={[...GRADIENTS.surfaceCard] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[
                styles.topCard,
                isFirst && styles.topCardFirst,
              ]}
            >
              <Text style={styles.topRankEmoji}>{getRankEmoji(entry.rank)}</Text>
              <View
                style={[
                  styles.topAvatar,
                  isFirst && styles.topAvatarFirst,
                  { borderColor: rankColor },
                  isFirst && SHADOWS.glow(rankColor),
                ]}
              >
                <Text
                  style={[
                    styles.topAvatarText,
                    isFirst && styles.topAvatarTextFirst,
                  ]}
                >
                  {entry.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.topName} numberOfLines={1}>
                {entry.name}
              </Text>
              <Text style={[styles.topScore, { color: rankColor, textShadowColor: rankColor + '60', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }]}>
                {entry.score.toLocaleString()}
              </Text>
            </LinearGradient>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LEADERBOARD</Text>
      </View>

      {/* Time Tabs */}
      <View style={styles.tabBar}>
        {TIME_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTime === tab && styles.tabActive]}
            onPress={() => onChangeTab(`${tab.toLowerCase()}_${activeScope.toLowerCase()}`)}
          >
            <Text style={[styles.tabText, activeTime === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scope Tabs */}
      <View style={styles.scopeBar}>
        {SCOPE_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.scopeTab, activeScope === tab && styles.scopeTabActive]}
            onPress={() => onChangeTab(`${activeTime.toLowerCase()}_${tab.toLowerCase()}`)}
          >
            <Text
              style={[styles.scopeTabText, activeScope === tab && styles.scopeTabTextActive]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyText}>No leaderboard data yet</Text>
            <Text style={styles.emptySubtext}>
              Play puzzles to appear on the leaderboard!
            </Text>
          </View>
        ) : (
          <>
            {renderTopThree()}

            {/* Remaining entries */}
            <LinearGradient
              colors={[...GRADIENTS.surfaceCard] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.listCard}
            >
              {entries.slice(3).map((entry, index) => {
                const isCurrentUser = entry.id === currentUserId;
                return (
                  <View key={entry.id}>
                    {index > 0 && <View style={styles.listDivider} />}
                    <View
                      style={[
                        styles.listRow,
                        isCurrentUser && styles.listRowHighlight,
                      ]}
                    >
                      <View style={styles.rankContainer}>
                        <Text
                          style={[
                            styles.rankText,
                            isCurrentUser && styles.rankTextHighlight,
                          ]}
                        >
                          {entry.rank}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.listAvatar,
                          isCurrentUser && styles.listAvatarHighlight,
                        ]}
                      >
                        <Text style={styles.listAvatarText}>
                          {entry.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.listInfo}>
                        <Text
                          style={[
                            styles.listName,
                            isCurrentUser && styles.listNameHighlight,
                          ]}
                          numberOfLines={1}
                        >
                          {entry.name}
                          {isCurrentUser ? ' (You)' : ''}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.listScore,
                          isCurrentUser && styles.listScoreHighlight,
                        ]}
                      >
                        {entry.score.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </LinearGradient>
          </>
        )}

        {/* Current user bar (sticky at bottom if not in top list) */}
        {currentUser && currentUser.rank > 3 && (
          <LinearGradient
            colors={[COLORS.accent + '18', COLORS.accent + '08'] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.currentUserBar}
          >
            <View style={styles.currentUserContent}>
              <Text style={styles.currentUserRank}>#{currentUser.rank}</Text>
              <View style={styles.currentUserAvatar}>
                <Text style={styles.currentUserAvatarText}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.currentUserName} numberOfLines={1}>
                {currentUser.name}
              </Text>
              <Text style={styles.currentUserScore}>
                {currentUser.score.toLocaleString()}
              </Text>
            </View>
          </LinearGradient>
        )}

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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 4,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: 'rgba(17, 22, 56, 0.8)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...SHADOWS.soft,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.soft,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.accent,
  },
  scopeBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  scopeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(26, 31, 69, 0.4)',
  },
  scopeTabActive: {
    borderColor: COLORS.accent + '60',
    backgroundColor: COLORS.accent + '15',
    ...SHADOWS.glow(COLORS.accent),
  },
  scopeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  scopeTabTextActive: {
    color: COLORS.accent,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  topThreeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 20,
    paddingTop: 10,
  },
  topPlaceholder: {
    width: (width - 52) / 3,
  },
  topCard: {
    width: (width - 52) / 3,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  topCardFirst: {
    paddingVertical: 20,
    borderColor: '#FFD700' + '50',
    marginBottom: 10,
    ...SHADOWS.glow('#FFD700'),
  },
  topRankEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  topAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(17, 22, 56, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 8,
    ...SHADOWS.soft,
  },
  topAvatarFirst: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
  },
  topAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  topAvatarTextFirst: {
    fontSize: 24,
  },
  topName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  topScore: {
    fontSize: 16,
    fontWeight: '800',
  },
  listCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.medium,
  },
  listDivider: {
    height: 1,
    backgroundColor: COLORS.bgLight,
    marginHorizontal: 14,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  listRowHighlight: {
    backgroundColor: COLORS.accent + '12',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent + '60',
  },
  rankContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  rankTextHighlight: {
    color: COLORS.accent,
  },
  listAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37, 43, 94, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  listAvatarHighlight: {
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  listAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  listNameHighlight: {
    color: COLORS.accent,
  },
  listScore: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  listScoreHighlight: {
    color: COLORS.accent,
  },
  currentUserBar: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.accent + '50',
    overflow: 'hidden',
    ...SHADOWS.glow(COLORS.accent),
  },
  currentUserContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  currentUserRank: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accent,
    width: 40,
  },
  currentUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currentUserAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.bg,
  },
  currentUserName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.accent,
  },
  currentUserScore: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default LeaderboardScreen;
