import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../constants';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService, ClubMessage } from '../services/firestore';
import { getTitleLabel } from '../data/cosmetics';
import ClubGoalCard from '../components/ClubGoalCard';
import ClubLeaderboard from '../components/ClubLeaderboard';
import {
  generateClubGoal,
  ActiveClubGoal,
  ClubLeaderboardEntry,
} from '../data/clubEvents';
import { filterMessage } from '../utils/profanityFilter';

const { width } = Dimensions.get('window');

interface ClubMember {
  id: string;
  name: string;
  score: number;
  isLeader: boolean;
  isOnline: boolean;
}

interface ClubData {
  name: string;
  memberCount: number;
  maxMembers: number;
  weeklyScore: number;
  tier?: 'bronze' | 'silver' | 'gold' | 'diamond';
  members: ClubMember[];
  recentEmojis: Array<{ userId: string; emoji: string; timestamp: number }>;
  activeGoal?: ActiveClubGoal | null;
  leaderboardEntries?: ClubLeaderboardEntry[];
}

interface ClubScreenProps {
  clubId?: string | null;
  clubData?: any;
  onCreateClub?: (name: string) => void;
  onJoinClub?: (id: string) => void;
  onLeaveClub?: () => void;
}

const ClubScreen: React.FC<ClubScreenProps> = ({
  clubId: clubIdProp,
  clubData = null,
  onCreateClub = () => {},
  onJoinClub = () => {},
  onLeaveClub = () => {},
}) => {
  const player = usePlayer();
  const clubId = clubIdProp !== undefined ? clubIdProp : player.clubId;
  const [searchText, setSearchText] = useState('');
  const [createName, setCreateName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { user } = useAuth();
  const [chatMessages, setChatMessages] = useState<ClubMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Load chat messages on mount when club is available
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    setChatLoading(true);
    firestoreService.getClubMessages(clubId, 50).then((messages) => {
      if (!cancelled) {
        setChatMessages(messages);
        setChatLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [clubId]);

  const handleSendMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || !clubId) return;
    const userId = user?.uid ?? 'local_user';
    const displayName = (player as any).displayName ?? getTitleLabel(player.equippedTitle) ?? 'Player';
    setChatInput('');

    // Optimistically add to local list
    const optimisticMessage: ClubMessage = {
      id: `local_${Date.now()}`,
      userId,
      displayName,
      message: filterMessage(text.slice(0, 200)),
      timestamp: Date.now(),
      type: 'text',
    };
    setChatMessages((prev) => [optimisticMessage, ...prev]);

    // Send to Firestore (no-op if unavailable)
    await firestoreService.sendClubMessage(clubId, userId, displayName, filterMessage(text));
  }, [chatInput, clubId, user, (player as any).displayName, player.equippedTitle]);

  const getRelativeTime = useCallback((timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, []);

  const REACTION_EMOJIS = ['👍', '🎉', '🔥', '💪', '⭐', '❤️', '😎', '🏆'];

  const data: ClubData | null = clubData
    ? {
        name: clubData.name ?? 'My Club',
        memberCount: clubData.memberCount ?? 0,
        maxMembers: clubData.maxMembers ?? 30,
        weeklyScore: clubData.weeklyScore ?? 0,
        tier: clubData.tier ?? 'bronze',
        members: clubData.members ?? [],
        recentEmojis: clubData.recentEmojis ?? [],
        activeGoal: clubData.activeGoal ?? null,
        leaderboardEntries: clubData.leaderboardEntries ?? [],
      }
    : null;

  // Generate a club goal if none is active (local fallback)
  const clubGoal = useMemo<ActiveClubGoal | null>(() => {
    if (!data) return null;
    if (data.activeGoal) return data.activeGoal;
    // Generate a fallback goal with mock contributions from members
    const goal = generateClubGoal(data.tier ?? 'bronze', data.memberCount || 1);
    // Populate with mock contributions from members for display
    if (data.members.length > 0) {
      goal.contributions = data.members.map((m) => ({
        userId: m.id,
        displayName: m.name,
        avatarId: '',
        amount: Math.floor(m.score * 0.3),
      }));
    }
    return goal;
  }, [data?.activeGoal, data?.tier, data?.memberCount, data?.members]);

  // Mock leaderboard entries for display when none provided
  const leaderboardEntries = useMemo<ClubLeaderboardEntry[]>(() => {
    if (data?.leaderboardEntries && data.leaderboardEntries.length > 0) {
      return data.leaderboardEntries;
    }
    if (!data || !clubId) return [];
    // Generate mock entries with current club included
    const mockClubs: ClubLeaderboardEntry[] = [
      { clubId: 'c1', clubName: 'Word Warriors', clubInitial: 'W', weeklyScore: 45200, memberCount: 28, tier: 'gold', rank: 1 },
      { clubId: 'c2', clubName: 'Lexicon Lords', clubInitial: 'L', weeklyScore: 38900, memberCount: 25, tier: 'gold', rank: 2 },
      { clubId: 'c3', clubName: 'Puzzle Pros', clubInitial: 'P', weeklyScore: 32100, memberCount: 22, tier: 'silver', rank: 3 },
      { clubId: clubId, clubName: data.name, clubInitial: data.name.charAt(0).toUpperCase(), weeklyScore: data.weeklyScore, memberCount: data.memberCount, tier: data.tier ?? 'bronze', rank: 4 },
      { clubId: 'c5', clubName: 'Brain Squad', clubInitial: 'B', weeklyScore: 18500, memberCount: 18, tier: 'silver', rank: 5 },
    ];
    // Re-sort by score and re-assign ranks
    mockClubs.sort((a, b) => b.weeklyScore - a.weeklyScore);
    return mockClubs.map((c, i) => ({ ...c, rank: i + 1 }));
  }, [data?.leaderboardEntries, data?.weeklyScore, clubId]);

  // Compute player's contribution to current goal
  const playerContribution = useMemo(() => {
    if (!clubGoal) return 0;
    // In real Firestore mode, this would come from the user's tracked contribution
    // For now, derive from player's puzzle progress
    return player.puzzlesSolved ? Math.min(player.puzzlesSolved * 3, clubGoal.target) : 0;
  }, [clubGoal, player.puzzlesSolved]);

  const renderNoClub = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.noClubContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.noClubHero}>
        <Text style={styles.noClubIcon}>🏠</Text>
        <Text style={styles.noClubTitle}>Join or Create a Club</Text>
        <Text style={styles.noClubDesc}>
          Team up with friends, compete in weekly challenges, and climb the
          leaderboards together!
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Find a Club</Text>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search clubs..."
            placeholderTextColor={COLORS.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            accessibilityLabel="Search clubs by name or code"
          />
        </View>
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => onJoinClub(searchText)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Search and join club"
          >
            <LinearGradient
              colors={[...GRADIENTS.button.primary] as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.joinButton}
            >
              <Text style={styles.joinButtonText}>Search & Join</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Create */}
      <View style={styles.createSection}>
        <Text style={styles.sectionTitle}>Create a Club</Text>
        {showCreate ? (
          <View style={styles.createForm}>
            <TextInput
              style={styles.createInput}
              placeholder="Enter club name..."
              placeholderTextColor={COLORS.textMuted}
              value={createName}
              onChangeText={setCreateName}
              maxLength={24}
            />
            <View style={styles.createButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowCreate(false);
                  setCreateName('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancel club creation"
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  !createName.trim() && styles.confirmBtnDisabled,
                ]}
                onPress={() => {
                  if (createName.trim()) {
                    onCreateClub(createName.trim());
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="Create club"
              >
                <Text style={styles.confirmBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreate(true)}
            accessibilityRole="button"
            accessibilityLabel="Create new club"
          >
            <Text style={styles.createButtonIcon}>+</Text>
            <Text style={styles.createButtonText}>Create New Club</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );

  const renderClub = () => {
    if (!data) return null;

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.clubContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Club Header */}
        <View style={styles.clubHeader}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.clubShield}
          >
            <Text style={styles.clubShieldText}>
              {data.name.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <Text style={styles.clubName}>{data.name}</Text>
          <Text style={styles.clubMemberCount}>
            {data.memberCount} / {data.maxMembers} Members
          </Text>
        </View>

        {/* Weekly Score */}
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.weeklyScoreCard}
        >
          <Text style={styles.weeklyScoreLabel}>Weekly Club Score</Text>
          <Text style={styles.weeklyScoreValue}>
            {data.weeklyScore.toLocaleString()}
          </Text>
        </LinearGradient>

        {/* Club Puzzle */}
        <TouchableOpacity activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Play today's club puzzle">
          <LinearGradient
            colors={[COLORS.accent + '18', COLORS.accent + '08'] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.clubPuzzleBtn}
          >
            <Text style={styles.clubPuzzleIcon}>🧩</Text>
            <View style={styles.clubPuzzleInfo}>
              <Text style={styles.clubPuzzleTitle}>Club Puzzle</Text>
              <Text style={styles.clubPuzzleDesc}>
                Solve today's club challenge
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Club Cooperative Goal */}
        {clubGoal && (
          <>
            <Text style={styles.sectionTitle}>Club Goal</Text>
            <ClubGoalCard goal={clubGoal} playerContribution={playerContribution} />
          </>
        )}

        {/* Your Contribution */}
        <Text style={styles.sectionTitle}>Your Contribution</Text>
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.contributeCard}
        >
          <View style={styles.contributeRow}>
            <View style={styles.contributeStat}>
              <Text style={styles.contributeStatValue}>
                {playerContribution.toLocaleString()}
              </Text>
              <Text style={styles.contributeStatLabel}>Contributed</Text>
            </View>
            <View style={styles.contributeDivider} />
            <View style={styles.contributeStat}>
              <Text style={styles.contributeStatValue}>
                {player.puzzlesSolved ?? 0}
              </Text>
              <Text style={styles.contributeStatLabel}>Puzzles</Text>
            </View>
            <View style={styles.contributeDivider} />
            <View style={styles.contributeStat}>
              <Text style={styles.contributeStatValue}>
                {(player.starsByLevel ? Object.values(player.starsByLevel as Record<string, number>).reduce((a: number, b: number) => a + b, 0) : 0).toLocaleString()}
              </Text>
              <Text style={styles.contributeStatLabel}>Stars</Text>
            </View>
          </View>
          <Text style={styles.contributeHint}>
            Keep playing to help your club reach the goal!
          </Text>
        </LinearGradient>

        {/* Club Leaderboard */}
        <Text style={styles.sectionTitle}>Weekly Rankings</Text>
        <ClubLeaderboard entries={leaderboardEntries} currentClubId={clubId} />

        {/* Members with Weekly Scores */}
        <Text style={styles.sectionTitle}>Members</Text>
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.membersCard}
        >
          {data.members.length > 0 ? (
            data.members.map((member, index) => (
              <View key={member.id}>
                {index > 0 && <View style={styles.memberDivider} />}
                <View style={styles.memberRow} accessibilityRole="text" accessibilityLabel={`Rank ${index + 1}: ${member.name}, ${member.score.toLocaleString()} points${member.isLeader ? ', club leader' : ''}${member.isOnline ? ', online' : ''}`}>
                  <View style={styles.memberRank}>
                    <Text style={styles.memberRankText}>{index + 1}</Text>
                  </View>
                  <View
                    style={[
                      styles.memberAvatar,
                      member.isOnline && styles.memberAvatarOnline,
                    ]}
                  >
                    <Text style={styles.memberAvatarText}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      {member.isLeader && (
                        <Text style={styles.leaderBadge}>👑</Text>
                      )}
                    </View>
                    <Text style={styles.memberScore}>
                      {member.score.toLocaleString()} pts this week
                    </Text>
                  </View>
                  {member.isOnline && (
                    <View style={styles.onlineDot} />
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyMembers}>
              <Text style={styles.emptyMembersText}>No members yet</Text>
            </View>
          )}
        </LinearGradient>

        {/* Emoji Reactions */}
        <Text style={styles.sectionTitle}>Quick Reactions</Text>
        <View style={styles.emojiBar}>
          {REACTION_EMOJIS.map((emoji) => (
            <TouchableOpacity key={emoji} style={styles.emojiBtn} accessibilityRole="button" accessibilityLabel={`React with ${emoji}`}>
              <Text style={styles.emojiBtnText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Reactions */}
        {data.recentEmojis.length > 0 && (
          <View style={styles.recentReactions}>
            {data.recentEmojis.slice(0, 10).map((reaction, idx) => (
              <Text key={idx} style={styles.reactionEmoji}>
                {reaction.emoji}
              </Text>
            ))}
          </View>
        )}

        {/* Club Chat */}
        <Text style={styles.sectionTitle}>Club Chat</Text>
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.chatCard}
        >
          {firestoreService.isAvailable() ? (
            <>
              {/* Messages */}
              <View style={styles.chatMessagesContainer}>
                {chatLoading ? (
                  <View style={styles.chatPlaceholder}>
                    <Text style={styles.chatPlaceholderText}>Loading messages...</Text>
                  </View>
                ) : chatMessages.length === 0 ? (
                  <View style={styles.chatPlaceholder}>
                    <Text style={styles.chatPlaceholderIcon}>💬</Text>
                    <Text style={styles.chatPlaceholderText}>No messages yet. Say hello!</Text>
                  </View>
                ) : (
                  <FlatList
                    data={chatMessages}
                    keyExtractor={(item) => item.id}
                    inverted
                    style={styles.chatList}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={true}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    renderItem={({ item }) => (
                      <View style={styles.chatMessageRow}>
                        <View style={styles.chatMessageBubble}>
                          <View style={styles.chatMessageHeader}>
                            <Text style={styles.chatSenderName}>{item.displayName}</Text>
                            <Text style={styles.chatTimestamp}>{getRelativeTime(item.timestamp)}</Text>
                          </View>
                          <Text style={styles.chatMessageText}>{item.message}</Text>
                        </View>
                      </View>
                    )}
                  />
                )}
              </View>

              {/* Input */}
              <View style={styles.chatInputRow}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Type a message..."
                  placeholderTextColor={COLORS.textMuted}
                  value={chatInput}
                  onChangeText={setChatInput}
                  maxLength={200}
                  returnKeyType="send"
                  onSubmitEditing={handleSendMessage}
                  accessibilityLabel="Chat message input"
                />
                <TouchableOpacity
                  style={[styles.chatSendBtn, !chatInput.trim() && styles.chatSendBtnDisabled]}
                  onPress={handleSendMessage}
                  disabled={!chatInput.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                >
                  <Text style={styles.chatSendBtnText}>Send</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.chatPlaceholder}>
              <Text style={styles.chatPlaceholderIcon}>🔒</Text>
              <Text style={styles.chatPlaceholderText}>Club chat requires Firebase</Text>
              <Text style={styles.chatPlaceholderSubtext}>
                Set EXPO_PUBLIC_FIREBASE_* env vars to enable
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Leave Club */}
        <TouchableOpacity style={styles.leaveButton} onPress={onLeaveClub}>
          <Text style={styles.leaveButtonText}>Leave Club</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <AmbientBackdrop variant="club" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CLUB</Text>
      </View>
      {clubId && data ? renderClub() : renderNoClub()}
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
  scrollView: {
    flex: 1,
  },
  noClubContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  noClubHero: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noClubIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  noClubTitle: {
    fontSize: 24,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  noClubDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  searchSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 12,
    textShadowColor: 'rgba(255,255,255,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 31, 69, 0.8)',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.soft,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  joinButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    ...SHADOWS.glow(COLORS.accent),
  },
  joinButtonText: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: COLORS.bg,
  },
  createSection: {
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 31, 69, 0.6)',
    borderRadius: 16,
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 45, 149, 0.15)',
    borderStyle: 'dashed',
    gap: 10,
    ...SHADOWS.soft,
  },
  createButtonIcon: {
    fontSize: 24,
    color: COLORS.accent,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
  },
  createForm: {
    backgroundColor: 'rgba(26, 31, 69, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.medium,
  },
  createInput: {
    height: 48,
    backgroundColor: COLORS.bgLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cellDefault,
  },
  createButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(37, 43, 94, 0.8)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    ...SHADOWS.glow(COLORS.accent),
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.bg,
  },
  clubContent: {
    paddingHorizontal: 16,
  },
  clubHeader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  clubShield: {
    width: 76,
    height: 76,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.accent + '60',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    ...SHADOWS.glow(COLORS.accent),
  },
  clubShieldText: {
    fontSize: 32,
    fontFamily: FONTS.display,
    color: COLORS.accent,
  },
  clubName: {
    fontSize: 24,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    marginBottom: 4,
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  clubMemberCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  weeklyScoreCard: {
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  weeklyScoreLabel: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  weeklyScoreValue: {
    fontSize: 32,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  clubPuzzleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
    ...SHADOWS.glow(COLORS.accent),
  },
  clubPuzzleIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  clubPuzzleInfo: {
    flex: 1,
  },
  clubPuzzleTitle: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  clubPuzzleDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chevron: {
    fontSize: 24,
    color: COLORS.accent,
  },
  membersCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  memberDivider: {
    height: 1,
    backgroundColor: COLORS.bgLight,
    marginHorizontal: 14,
  },
  memberRank: {
    width: 24,
    alignItems: 'center',
    marginRight: 10,
  },
  memberRankText: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textMuted,
  },
  memberAvatar: {
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
  memberAvatarOnline: {
    borderWidth: 2,
    borderColor: COLORS.green,
    ...SHADOWS.glow(COLORS.green),
  },
  memberAvatarText: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
  },
  leaderBadge: {
    fontSize: 14,
  },
  memberScore: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyMembers: {
    padding: 24,
    alignItems: 'center',
  },
  emptyMembersText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  emojiBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(26, 31, 69, 0.7)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.soft,
  },
  emojiBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(17, 22, 56, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emojiBtnText: {
    fontSize: 18,
  },
  recentReactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
  },
  reactionEmoji: {
    fontSize: 20,
    backgroundColor: 'rgba(26, 31, 69, 0.7)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  contributeCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  contributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  contributeStat: {
    alignItems: 'center',
    flex: 1,
  },
  contributeStatValue: {
    fontSize: 22,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  contributeStatLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contributeDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.borderSubtle,
  },
  contributeHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  leaveButton: {
    borderWidth: 1,
    borderColor: COLORS.coral + '40',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: COLORS.coral + '08',
  },
  leaveButtonText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.coral,
    textShadowColor: COLORS.coralGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  chatCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  chatMessagesContainer: {
    height: 240,
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  chatMessageRow: {
    marginVertical: 4,
  },
  chatMessageBubble: {
    backgroundColor: 'rgba(17, 22, 56, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  chatMessageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  chatSenderName: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.accent,
  },
  chatTimestamp: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  chatMessageText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.cellDefault,
  },
  chatSendBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...SHADOWS.glow(COLORS.accent),
  },
  chatSendBtnDisabled: {
    opacity: 0.4,
  },
  chatSendBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: COLORS.bg,
  },
  chatPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  chatPlaceholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  chatPlaceholderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  chatPlaceholderSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default ClubScreen;
