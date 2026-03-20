import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants';
import { usePlayer } from '../contexts/PlayerContext';

const { width } = Dimensions.get('window');

interface PlayerData {
  name: string;
  level: number;
  title: string;
  puzzlesSolved: number;
  totalStars: number;
  bestStreak: number;
  perfectSolves: number;
  totalScore: number;
  badges: Array<{ id: string; name: string; icon: string }>;
  atlasProgress: number;
  tilesProgress: number;
  stampsProgress: number;
  equippedCosmetics: {
    frame?: string;
    trail?: string;
    theme?: string;
  };
}

interface ProfileScreenProps {
  player?: any;
  onEditProfile?: () => void;
  onOpenSettings?: () => void;
}

const DEFAULT_PLAYER: PlayerData = {
  name: 'Player',
  level: 1,
  title: 'Wordsmith',
  puzzlesSolved: 0,
  totalStars: 0,
  bestStreak: 0,
  perfectSolves: 0,
  totalScore: 0,
  badges: [],
  atlasProgress: 0,
  tilesProgress: 0,
  stampsProgress: 0,
  equippedCosmetics: {},
};

const STAT_CARDS = [
  { key: 'puzzlesSolved', label: 'Puzzles Solved', icon: '🧩' },
  { key: 'totalStars', label: 'Total Stars', icon: '⭐' },
  { key: 'bestStreak', label: 'Best Streak', icon: '🔥' },
  { key: 'perfectSolves', label: 'Perfect Solves', icon: '💎' },
  { key: 'totalScore', label: 'Total Score', icon: '🏆' },
  { key: 'level', label: 'Current Level', icon: '📈' },
] as const;

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  player: playerProp,
  onEditProfile: onEditProfileProp,
  onOpenSettings: onOpenSettingsProp,
}) => {
  const playerContext = usePlayer();
  const onEditProfile = onEditProfileProp ?? (() => {});
  const onOpenSettings = onOpenSettingsProp ?? (() => {});
  const contextPlayer = {
    level: playerContext.currentLevel,
    title: playerContext.equippedTitle,
    puzzlesSolved: playerContext.puzzlesSolved,
    totalStars: playerContext.totalStars,
    bestStreak: playerContext.streaks.bestStreak,
    perfectSolves: playerContext.perfectSolves,
    totalScore: playerContext.totalScore,
    badges: playerContext.achievementIds.map((id: string) => ({ id, name: id, icon: '🏅' })),
    equippedCosmetics: {
      frame: playerContext.equippedFrame,
      theme: playerContext.equippedTheme,
    },
  };
  const p: PlayerData = { ...DEFAULT_PLAYER, ...contextPlayer, ...playerProp };
  const initial = p.name.charAt(0).toUpperCase();

  const renderProgressBar = (progress: number, color: string) => (
    <View style={styles.progressBarBg}>
      <View
        style={[
          styles.progressBarFill,
          { width: `${Math.min(progress, 100)}%`, backgroundColor: color },
        ]}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with settings gear */}
        <View style={styles.headerRow}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>PROFILE</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={onOpenSettings}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar Area */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>{initial}</Text>
            </View>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Lv.{p.level}</Text>
          </View>
          <Text style={styles.playerName}>{p.name}</Text>
          <View style={styles.titleBadge}>
            <Text style={styles.titleText}>{p.title}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          {STAT_CARDS.map((stat) => (
            <View key={stat.key} style={styles.statCard}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>
                {(p as any)[stat.key]?.toLocaleString?.() ?? 0}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Achievement Badges */}
        <Text style={styles.sectionTitle}>Achievements</Text>
        {p.badges.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.badgesScroll}
            contentContainerStyle={styles.badgesContent}
          >
            {p.badges.map((badge) => (
              <View key={badge.id} style={styles.badgeCard}>
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
                <Text style={styles.badgeName} numberOfLines={1}>
                  {badge.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyBadges}>
            <Text style={styles.emptyBadgesText}>
              Complete challenges to earn badges!
            </Text>
          </View>
        )}

        {/* Collection Progress */}
        <Text style={styles.sectionTitle}>Collection Progress</Text>
        <View style={styles.collectionsCard}>
          <View style={styles.collectionRow}>
            <Text style={styles.collectionLabel}>Word Atlas</Text>
            <Text style={styles.collectionPercent}>{p.atlasProgress}%</Text>
          </View>
          {renderProgressBar(p.atlasProgress, COLORS.accent)}

          <View style={[styles.collectionRow, { marginTop: 14 }]}>
            <Text style={styles.collectionLabel}>Rare Tiles</Text>
            <Text style={styles.collectionPercent}>{p.tilesProgress}%</Text>
          </View>
          {renderProgressBar(p.tilesProgress, COLORS.gold)}

          <View style={[styles.collectionRow, { marginTop: 14 }]}>
            <Text style={styles.collectionLabel}>Seasonal Stamps</Text>
            <Text style={styles.collectionPercent}>{p.stampsProgress}%</Text>
          </View>
          {renderProgressBar(p.stampsProgress, COLORS.purple)}
        </View>

        {/* Equipped Cosmetics */}
        <Text style={styles.sectionTitle}>Equipped Cosmetics</Text>
        <View style={styles.cosmeticsCard}>
          <View style={styles.cosmeticRow}>
            <Text style={styles.cosmeticLabel}>Frame</Text>
            <Text style={styles.cosmeticValue}>
              {p.equippedCosmetics.frame ?? 'Default'}
            </Text>
          </View>
          <View style={styles.cosmeticDivider} />
          <View style={styles.cosmeticRow}>
            <Text style={styles.cosmeticLabel}>Trail</Text>
            <Text style={styles.cosmeticValue}>
              {p.equippedCosmetics.trail ?? 'None'}
            </Text>
          </View>
          <View style={styles.cosmeticDivider} />
          <View style={styles.cosmeticRow}>
            <Text style={styles.cosmeticLabel}>Theme</Text>
            <Text style={styles.cosmeticValue}>
              {p.equippedCosmetics.theme ?? 'Default'}
            </Text>
          </View>
        </View>

        {/* Edit Profile Button */}
        <TouchableOpacity style={styles.editButton} onPress={onEditProfile}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const CARD_WIDTH = (width - 56) / 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 8,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 4,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 22,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.accent,
  },
  levelBadge: {
    marginTop: -12,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 3,
    zIndex: 1,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.bg,
  },
  playerName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  titleBadge: {
    marginTop: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gold,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  statIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  badgesScroll: {
    marginBottom: 4,
  },
  badgesContent: {
    gap: 10,
    paddingRight: 16,
  },
  badgeCard: {
    width: 80,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  badgeIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  badgeName: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyBadges: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  emptyBadgesText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  collectionsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  collectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  collectionLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  collectionPercent: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.cellDefault,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  cosmeticsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  cosmeticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  cosmeticLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cosmeticValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  cosmeticDivider: {
    height: 1,
    backgroundColor: COLORS.bgLight,
  },
  editButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.bg,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default ProfileScreen;
