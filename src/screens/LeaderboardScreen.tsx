import React, { useMemo, useState } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';

const { width } = Dimensions.get('window');

const TIME_TABS = ['Daily Challenge', 'Daily', 'Weekly', 'All-Time'] as const;
const SCOPE_TABS = ['Global', 'Friends', 'Club'] as const;

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  rank: number;
  avatar?: string;
}

// Seeded PRNG for deterministic mock data (Mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOCK_FIRST_NAMES = [
  'Alex', 'Blake', 'Casey', 'Dana', 'Eliot', 'Finn', 'Gray', 'Harper',
  'Iris', 'Jules', 'Kai', 'Luna', 'Morgan', 'Nova', 'Orion', 'Parker',
  'Quinn', 'Riley', 'Sage', 'Taylor', 'Uma', 'Val', 'Wren', 'Xan',
  'Yuki', 'Zara', 'Avery', 'Blair', 'Cedar', 'Drew', 'Eden', 'Fox',
  'Gem', 'Haven', 'Ivy', 'Jade', 'Kira', 'Lark', 'Mika', 'Neve',
  'Oakley', 'Pax', 'Rain', 'Sky', 'Tatum', 'Uri', 'Vesper', 'Winter',
  'Xena', 'Zephyr',
];

function generateDailyLeaderboard(playerDailyScore: number | null, playerId: string): LeaderboardEntry[] {
  const today = new Date();
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const rng = mulberry32(dateSeed);

  // Generate 50 mock entries
  const entries: LeaderboardEntry[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < 50; i++) {
    let name: string;
    do {
      name = MOCK_FIRST_NAMES[Math.floor(rng() * MOCK_FIRST_NAMES.length)];
    } while (usedNames.has(name));
    usedNames.add(name);

    // Top players get higher scores, with natural distribution
    const baseScore = Math.floor(800 - i * 12 + rng() * 200);
    const score = Math.max(100, baseScore);

    entries.push({
      id: `mock_${i}`,
      name,
      score,
      rank: i + 1,
    });
  }

  // Sort by score descending
  entries.sort((a, b) => b.score - a.score);

  // If the player has a daily score, insert them at the correct position
  if (playerDailyScore !== null && playerDailyScore > 0) {
    // Remove any existing player entry placeholder
    const playerEntry: LeaderboardEntry = {
      id: playerId,
      name: 'You',
      score: playerDailyScore,
      rank: 0,
    };

    entries.push(playerEntry);
    entries.sort((a, b) => b.score - a.score);

    // Limit to 50 entries
    entries.splice(50);
  }

  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries;
}

function formatTodayDate(): string {
  const today = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
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
  const player = usePlayer();
  const currentUserId = currentUserIdProp ?? user?.uid ?? '';
  const [internalTab, setInternalTab] = useState<string>(activeTabProp ?? 'daily_challenge');
  const activeTab = activeTabProp ?? internalTab;
  const onChangeTab = onChangeTabProp ?? setInternalTab;

  const isDailyChallenge = activeTab === 'daily_challenge';
  const activeTime = isDailyChallenge
    ? 'Daily Challenge'
    : TIME_TABS.find((t) => activeTab.includes(t.toLowerCase())) ?? 'Daily';
  const activeScope = SCOPE_TABS.find((s) => activeTab.includes(s.toLowerCase())) ?? 'Global';

  // Check if player completed today's daily
  const today = new Date().toISOString().split('T')[0];
  const playerCompletedDaily = player.dailyCompleted.includes(today);

  // For the daily challenge tab, compute a mock score from player data
  const playerDailyScore = playerCompletedDaily ? Math.max(300, player.totalScore % 900 + 200) : null;

  const dailyChallengeEntries = useMemo(
    () => generateDailyLeaderboard(playerDailyScore, currentUserId),
    [playerDailyScore, currentUserId],
  );

  const entries: LeaderboardEntry[] = isDailyChallenge
    ? dailyChallengeEntries
    : (leaderboardData ?? []).map((entry: any, index: number) => ({
        id: entry.id ?? `user_${index}`,
        name: entry.name ?? `Player ${index + 1}`,
        score: entry.score ?? 0,
        rank: entry.rank ?? index + 1,
        avatar: entry.avatar,
      }));

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
          const isMe = entry.id === currentUserId;
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
                isMe && { borderColor: COLORS.accent + '60' },
              ]}
            >
              <Text style={styles.topRankEmoji}>{getRankEmoji(entry.rank)}</Text>
              <View
                style={[
                  styles.topAvatar,
                  isFirst && styles.topAvatarFirst,
                  { borderColor: isMe ? COLORS.accent : rankColor },
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
                {entry.name}{isMe ? ' (You)' : ''}
              </Text>
              <Text style={[styles.topScore, { color: isMe ? COLORS.accent : rankColor, textShadowColor: (isMe ? COLORS.accent : rankColor) + '60', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }]}>
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
        {TIME_TABS.map((tab) => {
          const isActive = activeTime === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => {
                if (tab === 'Daily Challenge') {
                  onChangeTab('daily_challenge');
                } else {
                  onChangeTab(`${tab.toLowerCase()}_${activeScope.toLowerCase()}`);
                }
              }}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab === 'Daily Challenge' ? 'Daily' : tab}
              </Text>
              {tab === 'Daily Challenge' && (
                <Text style={[styles.tabSubText, isActive && { color: COLORS.gold }]}>Challenge</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Daily Challenge Date Header */}
      {isDailyChallenge && (
        <LinearGradient
          colors={['rgba(255,215,0,0.10)', 'rgba(255,159,0,0.05)'] as [string, string]}
          style={styles.dailyDateBanner}
        >
          <Text style={styles.dailyDateIcon}>{'☀️'}</Text>
          <View>
            <Text style={styles.dailyDateTitle}>Daily Challenge</Text>
            <Text style={styles.dailyDateText}>{formatTodayDate()}</Text>
          </View>
          {!playerCompletedDaily && (
            <View style={styles.dailyNotCompleted}>
              <Text style={styles.dailyNotCompletedText}>Not played yet</Text>
            </View>
          )}
        </LinearGradient>
      )}

      {/* Scope Tabs - only for non-daily-challenge */}
      {!isDailyChallenge && (
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
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'🏆'}</Text>
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
    fontFamily: FONTS.display,
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
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.accent,
  },
  tabSubText: {
    fontSize: 8,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  dailyDateBanner: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  dailyDateIcon: {
    fontSize: 28,
  },
  dailyDateTitle: {
    color: COLORS.gold,
    fontSize: 15,
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
  },
  dailyDateText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  dailyNotCompleted: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dailyNotCompletedText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
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
    fontFamily: FONTS.bodySemiBold,
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
    fontFamily: FONTS.bodyBold,
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
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
  },
  topAvatarTextFirst: {
    fontSize: 24,
  },
  topName: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  topScore: {
    fontSize: 16,
    fontFamily: FONTS.display,
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
    fontFamily: FONTS.bodyBold,
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
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
  },
  listNameHighlight: {
    color: COLORS.accent,
  },
  listScore: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
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
    fontFamily: FONTS.display,
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
    fontFamily: FONTS.bodyBold,
    color: COLORS.bg,
  },
  currentUserName: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: COLORS.accent,
  },
  currentUserScore: {
    fontSize: 16,
    fontFamily: FONTS.display,
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
