import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS, getLevelConfig } from '../constants';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { LOCAL_IMAGES } from '../utils/localAssets';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import {
  usePlayerStore,
  usePlayerActions,
  selectCurrentLevel,
  selectDailyCompleted,
  selectTotalScore,
  selectFriendIds,
  selectReferralCode,
  selectReferralCount,
  selectReferralMilestonesClaimed,
} from '../stores/playerStore';
import {
  firestoreService,
  FirestoreLeaderboardEntry,
} from '../services/firestore';
import { analytics } from '../services/analytics';
import { SendGiftButton } from '../components/social/SendGiftButton';
import ReferralCard from '../components/ReferralCard';
import ReferralPendingRewards from '../components/ReferralPendingRewards';
import FriendLeaderboardCard from '../components/FriendLeaderboardCard';

const { width } = Dimensions.get('window');

const TIME_TABS = ['Daily', 'Weekly', 'All-Time'] as const;
type TimeTab = (typeof TIME_TABS)[number];

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

function generateMockLeaderboard(
  seed: number,
  playerScore: number | null,
  playerId: string
): LeaderboardEntry[] {
  const rng = mulberry32(seed);
  const entries: LeaderboardEntry[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < 50; i++) {
    let name: string;
    do {
      name = MOCK_FIRST_NAMES[Math.floor(rng() * MOCK_FIRST_NAMES.length)];
    } while (usedNames.has(name));
    usedNames.add(name);

    const baseScore = Math.floor(800 - i * 12 + rng() * 200);
    const score = Math.max(100, baseScore);
    entries.push({ id: `mock_${i}`, name, score, rank: i + 1 });
  }

  entries.sort((a, b) => b.score - a.score);

  if (playerScore !== null && playerScore > 0) {
    entries.push({ id: playerId, name: 'You', score: playerScore, rank: 0 });
    entries.sort((a, b) => b.score - a.score);
    entries.splice(50);
  }

  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries;
}

function formatTodayDate(): string {
  const today = new Date();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
}

function firestoreToEntries(
  data: FirestoreLeaderboardEntry[],
  currentUserId: string
): LeaderboardEntry[] {
  return data.map((entry, index) => ({
    id: entry.userId,
    name: entry.userId === currentUserId ? 'You' : entry.displayName,
    score: entry.score,
    rank: index + 1,
  }));
}

type LeaderboardScope = 'global' | 'friends' | 'club';

interface LeaderboardScreenProps {
  leaderboardData?: any[];
  currentUserId?: string;
  activeTab?: string;
  onChangeTab?: (tab: string) => void;
  /** Filter scope — 'global' (default) shows Firestore top 50; 'friends'
   *  restricts to the player's friend circle + self; 'club' is reserved for
   *  future club-scoped cross-club comparisons. */
  scope?: LeaderboardScope;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps & { route?: { params?: { scope?: LeaderboardScope } } }> = ({
  leaderboardData,
  currentUserId: currentUserIdProp,
  activeTab: activeTabProp,
  onChangeTab: onChangeTabProp,
  scope: scopeProp,
  route,
}) => {
  const initialScope: LeaderboardScope = scopeProp ?? route?.params?.scope ?? 'global';
  const [scope, setScope] = useState<LeaderboardScope>(initialScope);
  const { user } = useAuth();
  const currentLevel = usePlayerStore(selectCurrentLevel);
  const dailyCompleted = usePlayerStore(selectDailyCompleted);
  const totalScore = usePlayerStore(selectTotalScore);
  const friendIds = usePlayerStore(selectFriendIds);
  const referralCode = usePlayerStore(selectReferralCode);
  const referralCount = usePlayerStore(selectReferralCount);
  const referralMilestonesClaimed = usePlayerStore(selectReferralMilestonesClaimed);
  const { sendChallenge, claimReferralMilestone } = usePlayerActions();
  const currentUserId = currentUserIdProp ?? user?.uid ?? '';

  useEffect(() => {
    if (scope === 'friends') {
      analytics.logEvent('friend_leaderboard_viewed', {
        friend_count: friendIds.length,
        surface: 'leaderboard_screen',
      });
    }
  }, [scope, friendIds.length]);

  const [activeTime, setActiveTime] = useState<TimeTab>('Daily');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firestoreEntries, setFirestoreEntries] = useState<LeaderboardEntry[]>([]);
  const [friendCode, setFriendCode] = useState('');
  const [myFriendCode, setMyFriendCode] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);

  const isFirestoreAvailable = firestoreService.isAvailable();

  // Check if player completed today's daily
  const today = new Date().toISOString().split('T')[0];
  const playerCompletedDaily = dailyCompleted.includes(today);
  const playerDailyScore = playerCompletedDaily
    ? Math.max(300, (totalScore % 900) + 200)
    : null;

  // Mock fallback for when Firestore is not available
  const mockDailyEntries = useMemo(() => {
    const dateSeed =
      new Date().getFullYear() * 10000 +
      (new Date().getMonth() + 1) * 100 +
      new Date().getDate();
    return generateMockLeaderboard(dateSeed, playerDailyScore, currentUserId);
  }, [playerDailyScore, currentUserId]);

  const mockWeeklyEntries = useMemo(() => {
    const weekSeed =
      new Date().getFullYear() * 100 +
      Math.ceil(
        (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
          604800000
      );
    return generateMockLeaderboard(weekSeed, totalScore > 0 ? Math.floor(totalScore * 0.3) : null, currentUserId);
  }, [totalScore, currentUserId]);

  const mockAllTimeEntries = useMemo(() => {
    return generateMockLeaderboard(42, totalScore > 0 ? totalScore : null, currentUserId);
  }, [totalScore, currentUserId]);

  // Fetch leaderboard data from Firestore
  const fetchLeaderboard = useCallback(
    async (tab: TimeTab) => {
      if (!isFirestoreAvailable) return;
      setLoading(true);
      try {
        let data: FirestoreLeaderboardEntry[] = [];
        if (tab === 'Daily') {
          data = await firestoreService.getDailyLeaderboard(50);
        } else if (tab === 'Weekly') {
          data = await firestoreService.getWeeklyLeaderboard(50);
        } else {
          data = await firestoreService.getAllTimeLeaderboard(50);
        }

        if (data.length > 0) {
          // Merge with current player if not already in the list
          const entries = firestoreToEntries(data, currentUserId);
          const playerInList = entries.some((e) => e.id === currentUserId);
          if (!playerInList && totalScore > 0) {
            let playerScore = 0;
            if (tab === 'Daily') playerScore = playerDailyScore || 0;
            else if (tab === 'Weekly') playerScore = Math.floor(totalScore * 0.3);
            else playerScore = totalScore;

            if (playerScore > 0) {
              entries.push({
                id: currentUserId,
                name: 'You',
                score: playerScore,
                rank: 0,
              });
              entries.sort((a, b) => b.score - a.score);
              entries.forEach((e, i) => (e.rank = i + 1));
            }
          }
          setFirestoreEntries(entries);
        } else {
          setFirestoreEntries([]);
        }
      } catch (e) {
        logger.warn('[Leaderboard] fetch failed:', e);
        setFirestoreEntries([]);
      }
      setLoading(false);
    },
    [currentUserId, isFirestoreAvailable, playerDailyScore, totalScore]
  );

  // Load friend code on mount
  useEffect(() => {
    if (currentUserId && isFirestoreAvailable) {
      firestoreService.generateFriendCode(currentUserId).then(setMyFriendCode);
    } else {
      setMyFriendCode(currentUserId.slice(0, 8).toUpperCase());
    }
  }, [currentUserId, isFirestoreAvailable]);

  // Fetch data when tab changes
  useEffect(() => {
    fetchLeaderboard(activeTime);
  }, [activeTime, fetchLeaderboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLeaderboard(activeTime);
    setRefreshing(false);
  }, [activeTime, fetchLeaderboard]);

  const [searchMode, setSearchMode] = useState<'code' | 'name'>('code');
  const [nameSearchResults, setNameSearchResults] = useState<Array<{ userId: string; displayName: string }>>([]);

  const handleAddFriend = useCallback(async () => {
    if (!addFriendInput.trim()) return;
    setAddingFriend(true);

    if (searchMode === 'name') {
      const results = await firestoreService.searchUsersByDisplayName(
        addFriendInput.trim(),
        currentUserId,
        10,
      );
      setNameSearchResults(results);
      setAddingFriend(false);
      analytics.logEvent('friend_search_performed', {
        query_length: addFriendInput.trim().length,
        results: results.length,
      });
      if (results.length === 0) {
        Alert.alert('No matches', 'No players found with that display name.');
      }
      return;
    }

    const result = await firestoreService.addFriend(currentUserId, addFriendInput.trim());
    setAddingFriend(false);
    if (result) {
      analytics.logEvent('friend_request_sent', { method: 'code' });
      Alert.alert(
        'Friend Request Sent!',
        `Request sent to ${result.friendName}. They will appear in your friends list once accepted.`,
      );
      setAddFriendInput('');
      setShowAddFriend(false);
    } else {
      Alert.alert(
        'Could Not Add Friend',
        'Friend code not found, or you already have a pending request with this player.',
      );
    }
  }, [addFriendInput, currentUserId, searchMode]);

  const handleSendRequestToSearchResult = useCallback(async (
    targetUid: string,
    targetName: string,
  ) => {
    setAddingFriend(true);
    const result = await firestoreService.createFriendRequest(currentUserId, targetUid);
    setAddingFriend(false);
    if (result && typeof result === 'object' && 'friendshipId' in result) {
      analytics.logEvent('friend_request_sent', { method: 'name' });
      Alert.alert('Friend Request Sent!', `Request sent to ${targetName}.`);
      setAddFriendInput('');
      setNameSearchResults([]);
      setShowAddFriend(false);
    } else if (result === 'self') {
      Alert.alert('Invalid Request', "You can't send a friend request to yourself.");
    } else if (result === 'exists') {
      Alert.alert('Already Requested', 'You already have a pending or accepted request with this player.');
    } else {
      Alert.alert('Request Failed', 'Could not send friend request. Please try again.');
    }
  }, [currentUserId]);

  // Determine which entries to show — prefer Firestore, fall back to mock
  const entries: LeaderboardEntry[] = useMemo(() => {
    const base =
      isFirestoreAvailable && firestoreEntries.length > 0
        ? firestoreEntries
        : activeTime === 'Daily'
          ? mockDailyEntries
          : activeTime === 'Weekly'
            ? mockWeeklyEntries
            : mockAllTimeEntries;

    if (scope !== 'friends') return base;

    // Friends scope: keep only rows whose id is in friendIds or is the current
    // user, then re-rank from 1. Mock entries (prefixed `mock_`) are dropped.
    const allowed = new Set<string>([currentUserId, ...friendIds]);
    const filtered = base.filter((e) => allowed.has(e.id));
    filtered.sort((a, b) => b.score - a.score);
    filtered.forEach((e, i) => { e.rank = i + 1; });
    return filtered;
  }, [
    isFirestoreAvailable,
    firestoreEntries,
    activeTime,
    mockDailyEntries,
    mockWeeklyEntries,
    mockAllTimeEntries,
    scope,
    currentUserId,
    friendIds,
  ]);

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
                {entry.name}
                {isMe ? ' (You)' : ''}
              </Text>
              <Text
                style={[
                  styles.topScore,
                  {
                    color: isMe ? COLORS.accent : rankColor,
                    textShadowColor:
                      (isMe ? COLORS.accent : rankColor) + '60',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 8,
                  },
                ]}
              >
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
      <AmbientBackdrop variant="leaderboard" />
      <View style={styles.header}>
        <Image
          source={LOCAL_IMAGES.trophyCrown}
          style={{ width: 28, height: 28 }}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>
          {scope === 'friends' ? 'FRIENDS' : 'LEADERBOARD'}
        </Text>
      </View>

      {/* Scope Tabs — Global / Friends */}
      <View style={styles.tabBar}>
        {(['global', 'friends'] as const).map((s) => {
          const isActive = scope === s;
          const label = s === 'global' ? 'Global' : 'Friends';
          return (
            <TouchableOpacity
              key={s}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setScope(s)}
              accessibilityRole="tab"
              accessibilityLabel={`${label} leaderboard`}
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Time Tabs */}
      <View style={styles.tabBar}>
        {TIME_TABS.map((tab) => {
          const isActive = activeTime === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTime(tab)}
              accessibilityRole="tab"
              accessibilityLabel={`${tab} leaderboard`}
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Daily Date Header */}
      {activeTime === 'Daily' && (
        <LinearGradient
          colors={
            ['rgba(255,215,0,0.10)', 'rgba(255,159,0,0.05)'] as [
              string,
              string,
            ]
          }
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

      {/* Friend Code + Add Friend */}
      <View style={styles.friendCodeBar}>
        <View style={styles.friendCodeLeft}>
          <Text style={styles.friendCodeLabel}>Your Code:</Text>
          <Text style={styles.friendCodeValue}>{myFriendCode}</Text>
        </View>
        <TouchableOpacity
          style={styles.addFriendButton}
          onPress={() => setShowAddFriend(!showAddFriend)}
          accessibilityRole="button"
          accessibilityLabel={showAddFriend ? 'Cancel adding friend' : 'Add friend'}
        >
          <Text style={styles.addFriendButtonText}>
            {showAddFriend ? 'Cancel' : '+ Add Friend'}
          </Text>
        </TouchableOpacity>
      </View>

      {showAddFriend && (
        <>
          <View style={styles.searchModeTabs}>
            <TouchableOpacity
              style={[styles.searchModeTab, searchMode === 'code' && styles.searchModeTabActive]}
              onPress={() => { setSearchMode('code'); setNameSearchResults([]); setAddFriendInput(''); }}
            >
              <Text style={[styles.searchModeTabText, searchMode === 'code' && styles.searchModeTabTextActive]}>
                By Code
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.searchModeTab, searchMode === 'name' && styles.searchModeTabActive]}
              onPress={() => { setSearchMode('name'); setNameSearchResults([]); setAddFriendInput(''); }}
            >
              <Text style={[styles.searchModeTabText, searchMode === 'name' && styles.searchModeTabTextActive]}>
                By Name
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.addFriendRow}>
            <TextInput
              style={styles.addFriendInput}
              placeholder={searchMode === 'code' ? 'Enter friend code...' : 'Search by display name...'}
              placeholderTextColor={COLORS.textMuted}
              value={addFriendInput}
              onChangeText={setAddFriendInput}
              autoCapitalize={searchMode === 'code' ? 'characters' : 'none'}
              maxLength={searchMode === 'code' ? 12 : 40}
            />
            <TouchableOpacity
              style={[
                styles.addFriendSubmit,
                addingFriend && { opacity: 0.5 },
              ]}
              onPress={handleAddFriend}
              disabled={addingFriend}
              accessibilityRole="button"
              accessibilityLabel={searchMode === 'code' ? 'Send friend request' : 'Search by name'}
            >
              {addingFriend ? (
                <ActivityIndicator size="small" color={COLORS.bg} />
              ) : (
                <Text style={styles.addFriendSubmitText}>
                  {searchMode === 'code' ? 'Send' : 'Search'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          {searchMode === 'name' && nameSearchResults.length > 0 && (
            <View style={styles.searchResultsCard}>
              {nameSearchResults.map((r) => (
                <View key={r.userId} style={styles.searchResultRow}>
                  <Text style={styles.searchResultName} numberOfLines={1}>{r.displayName}</Text>
                  <TouchableOpacity
                    style={styles.searchResultBtn}
                    onPress={() => handleSendRequestToSearchResult(r.userId, r.displayName)}
                    disabled={addingFriend}
                  >
                    <Text style={styles.searchResultBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {!isFirestoreAvailable && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Offline mode — showing simulated leaderboard
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
      >
        <ReferralPendingRewards />
        <FriendLeaderboardCard onViewAll={() => setScope('friends')} />
        {referralCode ? (
          <ReferralCard
            referralCode={referralCode}
            referralCount={referralCount}
            milestonesClaimed={referralMilestonesClaimed}
            onClaimMilestone={(count) => claimReferralMilestone(count)}
          />
        ) : null}

        {loading && entries.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.emptySubtext}>Loading leaderboard...</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'🏆'}</Text>
            <Text style={styles.emptyText}>
              {scope === 'friends' ? 'No friend scores yet' : 'No leaderboard data yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {scope === 'friends'
                ? 'Add friends with "+ Add Friend" above, or have them play today\'s daily.'
                : 'Play puzzles to appear on the leaderboard!'}
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
                      {!isCurrentUser && (
                        <TouchableOpacity
                          style={styles.challengeButton}
                          onPress={() => {
                            const level = currentLevel;
                            const config = getLevelConfig(level);
                            sendChallenge(entry.id, {
                              score: totalScore > 0 ? Math.floor(totalScore * 0.01) : 0,
                              stars: 0,
                              time: 0,
                              level,
                              seed: Date.now(),
                              mode: 'classic',
                              boardConfig: config,
                            });
                            Alert.alert('Challenge Sent!', `You challenged ${entry.name}!`);
                          }}
                        >
                          <Text style={styles.challengeButtonText}>{'\u2694\uFE0F'}</Text>
                        </TouchableOpacity>
                      )}
                      {!isCurrentUser && (scope === 'friends' || friendIds.includes(entry.id)) && (
                        <SendGiftButton
                          recipientId={entry.id}
                          recipientName={entry.name}
                          relationship="friend"
                          compact
                        />
                      )}
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
            colors={
              [COLORS.accent + '18', COLORS.accent + '08'] as [string, string]
            }
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
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.accent,
  },
  dailyDateBanner: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
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
  friendCodeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(17, 22, 56, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  friendCodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  friendCodeLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
  },
  friendCodeValue: {
    fontSize: 14,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    letterSpacing: 2,
  },
  addFriendButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.accent + '20',
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  addFriendButtonText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
  },
  addFriendRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  addFriendInput: {
    flex: 1,
    height: 42,
    backgroundColor: 'rgba(17, 22, 56, 0.8)',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    letterSpacing: 2,
  },
  addFriendSubmit: {
    height: 42,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFriendSubmitText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.bg,
  },
  searchModeTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 6,
    gap: 6,
  },
  searchModeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(17, 22, 56, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  searchModeTabActive: {
    backgroundColor: COLORS.accent + '20',
    borderColor: COLORS.accent + '50',
  },
  searchModeTabText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
  },
  searchModeTabTextActive: {
    color: COLORS.accent,
  },
  searchResultsCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(17, 22, 56, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 4,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchResultName: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  searchResultBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.accent + '20',
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  searchResultBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
  },
  offlineBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,159,67,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,159,67,0.25)',
    alignItems: 'center',
  },
  offlineBannerText: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.orange,
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
    marginTop: 8,
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
  challengeButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.accent + '20',
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  challengeButtonText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default LeaderboardScreen;
