import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, FONTS } from '../constants';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { usePlayer } from '../contexts/PlayerContext';
import { ACHIEVEMENTS, AchievementDef } from '../data/achievements';

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
  { key: 'puzzlesSolved', label: 'Puzzles Solved', icon: '\u{1F9E9}' },
  { key: 'totalStars', label: 'Total Stars', icon: '\u2B50' },
  { key: 'bestStreak', label: 'Best Streak', icon: '\u{1F525}' },
  { key: 'perfectSolves', label: 'Perfect Solves', icon: '\u{1F48E}' },
  { key: 'totalScore', label: 'Total Score', icon: '\u{1F3C6}' },
  { key: 'level', label: 'Current Level', icon: '\u{1F4C8}' },
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
    badges: playerContext.achievementIds.map((id: string) => ({ id, name: id, icon: '\u{1F3C5}' })),
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
      <AmbientBackdrop variant="profile" />
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
            <Text style={styles.settingsIcon}>{'\u2699\uFE0F'}</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar Area */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarCircle}>
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <Text style={styles.avatarLetter}>{initial}</Text>
            </View>
          </View>
          <View style={styles.levelBadge}>
            <LinearGradient
              colors={[...GRADIENTS.button.primary]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
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
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>
                {(p as any)[stat.key]?.toLocaleString?.() ?? 0}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Achievements Grid */}
        <Text style={styles.sectionTitle}>
          Achievements ({playerContext.achievementIds.length}/{ACHIEVEMENTS.length * 3})
        </Text>
        <View style={styles.achievementsGrid}>
          {ACHIEVEMENTS.map((achievement: AchievementDef) => {
            const earnedTiers = achievement.tiers.filter(t =>
              playerContext.achievementIds.includes(`${achievement.id}_${t.level}`)
            );
            const highestTier = earnedTiers.length > 0
              ? earnedTiers[earnedTiers.length - 1].level
              : null;
            const tierColor = highestTier === 'gold' ? COLORS.gold
              : highestTier === 'silver' ? '#c0c0c0'
              : highestTier === 'bronze' ? '#cd7f32'
              : 'rgba(255,255,255,0.15)';

            return (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  highestTier && { borderColor: tierColor + '60' },
                ]}
              >
                <LinearGradient
                  colors={[...GRADIENTS.surfaceCard]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <Text style={styles.achievementName} numberOfLines={1}>{achievement.name}</Text>
                <View style={styles.tierDots}>
                  {achievement.tiers.map(t => {
                    const earned = playerContext.achievementIds.includes(`${achievement.id}_${t.level}`);
                    const dotColor = t.level === 'gold' ? COLORS.gold
                      : t.level === 'silver' ? '#c0c0c0' : '#cd7f32';
                    return (
                      <View
                        key={t.level}
                        style={[
                          styles.tierDot,
                          earned
                            ? { backgroundColor: dotColor }
                            : { backgroundColor: 'rgba(255,255,255,0.1)' },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        {/* Collection Progress */}
        <Text style={styles.sectionTitle}>Collection Progress</Text>
        <View style={styles.collectionsCard}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
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
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
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
          <LinearGradient
            colors={[...GRADIENTS.button.primary]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
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
    fontFamily: FONTS.display,
    color: COLORS.accent,
    letterSpacing: 4,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
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
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 12,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLetter: {
    fontSize: 40,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  levelBadge: {
    marginTop: -12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 3,
    zIndex: 1,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  levelText: {
    fontSize: 12,
    fontFamily: FONTS.display,
    color: COLORS.bg,
  },
  playerName: {
    fontSize: 24,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    marginTop: 12,
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  titleBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  titleText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.gold,
    textShadowColor: 'rgba(255,215,0,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 12,
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: CARD_WIDTH,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  statIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    marginBottom: 2,
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontFamily: FONTS.bodyMedium,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  achievementCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  achievementIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  achievementName: {
    fontSize: 10,
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontFamily: FONTS.bodySemiBold,
    marginBottom: 6,
  },
  tierDots: {
    flexDirection: 'row',
    gap: 4,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  collectionsCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  collectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  collectionLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodyMedium,
  },
  collectionPercent: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodyBold,
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
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  cosmeticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  cosmeticLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodyMedium,
  },
  cosmeticValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodySemiBold,
  },
  cosmeticDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  editButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  editButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.bg,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default ProfileScreen;
