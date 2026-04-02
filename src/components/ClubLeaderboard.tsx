import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../constants';
import { ClubLeaderboardEntry, getClubLeaderboardReward } from '../data/clubEvents';

const { width } = Dimensions.get('window');

interface ClubLeaderboardProps {
  entries: ClubLeaderboardEntry[];
  currentClubId?: string | null;
}

const TIER_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  bronze: { bg: COLORS.tierBronze + '30', text: COLORS.tierBronze },
  silver: { bg: COLORS.tierSilver + '30', text: COLORS.tierSilver },
  gold: { bg: COLORS.tierGold + '30', text: COLORS.tierGold },
  diamond: { bg: COLORS.tierDiamond + '30', text: COLORS.tierDiamond },
};

const RANK_DECORATIONS: Record<number, { emoji: string; color: string }> = {
  1: { emoji: '🏆', color: COLORS.gold },
  2: { emoji: '🥈', color: COLORS.tierSilver },
  3: { emoji: '🥉', color: COLORS.tierBronze },
};

const ClubLeaderboard: React.FC<ClubLeaderboardProps> = ({ entries, currentClubId }) => {
  return (
    <LinearGradient
      colors={[...GRADIENTS.surfaceCard] as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{'🏅'}</Text>
        <View>
          <Text style={styles.headerTitle}>Club Leaderboard</Text>
          <Text style={styles.headerSubtitle}>Weekly rankings</Text>
        </View>
      </View>

      {/* Reward Preview */}
      <View style={styles.rewardPreview}>
        <Text style={styles.rewardPreviewLabel}>Top Club Rewards</Text>
        <View style={styles.rewardRow}>
          <View style={styles.rewardItem}>
            <Text style={styles.rewardEmoji}>{'🏆'}</Text>
            <Text style={styles.rewardText}>2000c + 100g</Text>
          </View>
          <View style={styles.rewardItem}>
            <Text style={styles.rewardEmoji}>{'🥈'}</Text>
            <Text style={styles.rewardText}>1200c + 60g</Text>
          </View>
          <View style={styles.rewardItem}>
            <Text style={styles.rewardEmoji}>{'🥉'}</Text>
            <Text style={styles.rewardText}>600c + 30g</Text>
          </View>
        </View>
      </View>

      {/* Leaderboard Entries */}
      {entries.length > 0 ? (
        entries.map((entry, idx) => {
          const isCurrentClub = entry.clubId === currentClubId;
          const rankDeco = RANK_DECORATIONS[entry.rank];
          const tierStyle = TIER_BADGE_COLORS[entry.tier] || TIER_BADGE_COLORS.bronze;

          return (
            <View key={entry.clubId}>
              {idx > 0 && <View style={styles.divider} />}
              <View
                style={[
                  styles.entryRow,
                  isCurrentClub && styles.entryRowHighlighted,
                ]}
              >
                {/* Rank */}
                <View style={styles.rankContainer}>
                  {rankDeco ? (
                    <Text style={styles.rankEmoji}>{rankDeco.emoji}</Text>
                  ) : (
                    <Text style={styles.rankText}>{entry.rank}</Text>
                  )}
                </View>

                {/* Club Avatar */}
                <View
                  style={[
                    styles.clubAvatar,
                    isCurrentClub && {
                      borderColor: COLORS.accent + '80',
                      ...SHADOWS.glow(COLORS.accent),
                    },
                  ]}
                >
                  <Text style={styles.clubAvatarText}>
                    {entry.clubInitial || entry.clubName.charAt(0).toUpperCase()}
                  </Text>
                </View>

                {/* Club Info */}
                <View style={styles.clubInfo}>
                  <View style={styles.clubNameRow}>
                    <Text
                      style={[
                        styles.clubName,
                        isCurrentClub && { color: COLORS.accent },
                      ]}
                      numberOfLines={1}
                    >
                      {entry.clubName}
                    </Text>
                    {isCurrentClub && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>YOU</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.clubMeta}>
                    <View style={[styles.tierBadge, { backgroundColor: tierStyle.bg }]}>
                      <Text style={[styles.tierBadgeText, { color: tierStyle.text }]}>
                        {entry.tier.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.memberCountText}>
                      {entry.memberCount} members
                    </Text>
                  </View>
                </View>

                {/* Score */}
                <View style={styles.scoreContainer}>
                  <Text
                    style={[
                      styles.scoreText,
                      entry.rank <= 3 && { color: COLORS.gold },
                    ]}
                  >
                    {entry.weeklyScore.toLocaleString()}
                  </Text>
                  <Text style={styles.scoreLabel}>pts</Text>
                </View>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>{'📊'}</Text>
          <Text style={styles.emptyText}>No club rankings yet this week</Text>
          <Text style={styles.emptySubtext}>Play puzzles to earn club score</Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    marginBottom: 16,
    ...SHADOWS.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    paddingBottom: 12,
    gap: 12,
  },
  headerIcon: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  rewardPreview: {
    marginHorizontal: 18,
    marginBottom: 14,
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  rewardPreviewLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rewardItem: {
    alignItems: 'center',
  },
  rewardEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  rewardText: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderSubtle,
    marginHorizontal: 18,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  entryRowHighlighted: {
    backgroundColor: COLORS.accent + '10',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  rankContainer: {
    width: 28,
    alignItems: 'center',
    marginRight: 10,
  },
  rankEmoji: {
    fontSize: 18,
  },
  rankText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textMuted,
  },
  clubAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  clubAvatarText: {
    fontSize: 17,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
  },
  clubInfo: {
    flex: 1,
  },
  clubNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clubName: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  youBadge: {
    backgroundColor: COLORS.accent + '30',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  youBadgeText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  clubMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  tierBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tierBadgeText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.5,
  },
  memberCountText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 15,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
  },
  scoreLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});

export default ClubLeaderboard;
