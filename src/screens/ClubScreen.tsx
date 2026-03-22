import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../constants';
import { usePlayer } from '../contexts/PlayerContext';

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
  members: ClubMember[];
  recentEmojis: Array<{ userId: string; emoji: string; timestamp: number }>;
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

  const REACTION_EMOJIS = ['👍', '🎉', '🔥', '💪', '⭐', '❤️', '😎', '🏆'];

  const data: ClubData | null = clubData
    ? {
        name: clubData.name ?? 'My Club',
        memberCount: clubData.memberCount ?? 0,
        maxMembers: clubData.maxMembers ?? 30,
        weeklyScore: clubData.weeklyScore ?? 0,
        members: clubData.members ?? [],
        recentEmojis: clubData.recentEmojis ?? [],
      }
    : null;

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
          />
        </View>
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => onJoinClub(searchText)}
            activeOpacity={0.8}
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
              >
                <Text style={styles.confirmBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreate(true)}
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
        <TouchableOpacity activeOpacity={0.8}>
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

        {/* Members */}
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
                <View style={styles.memberRow}>
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
                      {member.score.toLocaleString()} pts
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
            <TouchableOpacity key={emoji} style={styles.emojiBtn}>
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
    borderColor: 'rgba(0, 212, 255, 0.15)',
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
  bottomSpacer: {
    height: 40,
  },
});

export default ClubScreen;
