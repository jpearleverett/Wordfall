import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, FONTS } from '../constants';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { Skeleton, SkeletonCard, SkeletonGrid } from '../components/common/Skeleton';
import {
  usePlayerStore,
  usePlayerActions,
  selectAchievementIds,
  selectCurrentLevel,
  selectEquippedTitle,
  selectPuzzlesSolved,
  selectTotalStars,
  selectStreaks,
  selectPerfectSolves,
  selectTotalScore,
  selectEquippedFrame,
  selectEquippedTheme,
  selectPrestige,
} from '../stores/playerStore';
import { ACHIEVEMENTS, AchievementDef } from '../data/achievements';
import {
  PROFILE_FRAMES,
  COSMETIC_THEMES,
  getTheme,
  getFrame,
  getTitleLabel,
} from '../data/cosmetics';
import { LOCAL_IMAGES } from '../utils/localAssets';
import {
  canPrestige,
  getPrestigeRewards,
  getPrestigeSummary,
  PRESTIGE_LEVELS,
} from '../data/prestigeSystem';

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
  onOpenMastery?: () => void;
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
  onOpenMastery: onOpenMasteryProp,
}) => {
  const [loading, setLoading] = useState(true);
  // Narrow zustand subscriptions — ProfileScreen reads many slices but rarely
  // triggers writes; selector-based subscription drops re-renders on
  // unrelated player state churn (currency, ceremonies, etc.).
  const achievementIds = usePlayerStore(selectAchievementIds);
  const currentLevel = usePlayerStore(selectCurrentLevel);
  const equippedTitle = usePlayerStore(selectEquippedTitle);
  const puzzlesSolved = usePlayerStore(selectPuzzlesSolved);
  const totalStars = usePlayerStore(selectTotalStars);
  const playerStreaks = usePlayerStore(selectStreaks);
  const perfectSolves = usePlayerStore(selectPerfectSolves);
  const totalScore = usePlayerStore(selectTotalScore);
  const equippedFrameId = usePlayerStore(selectEquippedFrame);
  const equippedThemeId = usePlayerStore(selectEquippedTheme);
  const prestige = usePlayerStore(selectPrestige);
  const playerActions = usePlayerActions();
  const onEditProfile = onEditProfileProp ?? (() => {});
  const onOpenSettings = onOpenSettingsProp ?? (() => {});
  const onOpenMastery = onOpenMasteryProp ?? (() => {});

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);
  const achievementIdsSet = useMemo(
    () => new Set(achievementIds),
    [achievementIds],
  );
  const achievementsViewData = useMemo(
    () =>
      ACHIEVEMENTS.map((achievement: AchievementDef) => {
        const earnedLevels = achievement.tiers
          .filter((tier) => achievementIdsSet.has(`${achievement.id}_${tier.level}`))
          .map((tier) => tier.level);
        const highestTier = earnedLevels[earnedLevels.length - 1] ?? null;
        const tierColor = highestTier === 'gold' ? COLORS.gold
          : highestTier === 'silver' ? '#c0c0c0'
          : highestTier === 'bronze' ? '#cd7f32'
          : 'rgba(255,255,255,0.15)';

        return {
          achievement,
          highestTier,
          tierColor,
          earnedLevels,
        };
      }),
    [achievementIdsSet],
  );
  const contextPlayer = useMemo(
    () => ({
      level: currentLevel,
      title: getTitleLabel(equippedTitle),
      puzzlesSolved,
      totalStars,
      bestStreak: playerStreaks.bestStreak,
      perfectSolves,
      totalScore,
      badges: achievementIds.map((id: string) => ({ id, name: id, icon: '\u{1F3C5}' })),
      equippedCosmetics: {
        frame: equippedFrameId,
        theme: equippedThemeId,
      },
    }),
    [
      currentLevel,
      equippedTitle,
      puzzlesSolved,
      totalStars,
      playerStreaks.bestStreak,
      perfectSolves,
      totalScore,
      achievementIds,
      equippedFrameId,
      equippedThemeId,
    ],
  );
  const p: PlayerData = useMemo(
    () => ({ ...DEFAULT_PLAYER, ...contextPlayer, ...playerProp }),
    [contextPlayer, playerProp],
  );
  const initial = useMemo(() => p.name.charAt(0).toUpperCase(), [p.name]);
  const equippedTheme = useMemo(
    () => getTheme(equippedThemeId) ?? COSMETIC_THEMES[0],
    [equippedThemeId],
  );
  const equippedFrame = useMemo(
    () => getFrame(equippedFrameId) ?? PROFILE_FRAMES[0],
    [equippedFrameId],
  );
  const frameBorderColor = useMemo(() => {
    switch (equippedFrame.rarity) {
      case 'legendary':
        return COLORS.rarityLegendary;
      case 'epic':
        return COLORS.rarityEpic;
      case 'rare':
        return COLORS.rarityRare;
      default:
        return COLORS.rarityCommon;
    }
  }, [equippedFrame.rarity]);

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

  if (loading) {
    return (
      <View style={styles.container}>
        <AmbientBackdrop variant="profile" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>PROFILE</Text>
            <View style={styles.headerSpacer} />
          </View>
          {/* Avatar skeleton */}
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Skeleton width={100} height={100} borderRadius={50} style={{ marginBottom: 12 }} />
            <Skeleton width={80} height={20} borderRadius={10} style={{ marginBottom: 10 }} />
            <Skeleton width={120} height={16} borderRadius={8} />
          </View>
          {/* Stats skeleton */}
          <Skeleton width="40%" height={18} borderRadius={8} style={{ marginTop: 24, marginBottom: 12 }} />
          <SkeletonGrid rows={2} cols={3} itemHeight={80} />
          {/* Achievements skeleton */}
          <Skeleton width="50%" height={18} borderRadius={8} style={{ marginTop: 24, marginBottom: 12 }} />
          <SkeletonGrid rows={2} cols={3} itemHeight={90} />
          {/* Collections skeleton */}
          <Skeleton width="55%" height={18} borderRadius={8} style={{ marginTop: 24, marginBottom: 12 }} />
          <SkeletonCard />
        </ScrollView>
      </View>
    );
  }

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
          <TouchableOpacity style={styles.settingsBtn} onPress={onOpenSettings} accessibilityRole="button" accessibilityLabel="Open settings">
            <Text style={styles.settingsIcon}>{'\u2699\uFE0F'}</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar Area */}
        <View style={styles.avatarSection}>
          <View
            style={[
              styles.avatarRing,
              {
                borderColor: frameBorderColor,
                shadowColor: frameBorderColor,
                backgroundColor: equippedTheme.colors.surface,
              },
            ]}
          >
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: equippedTheme.colors.surface,
                },
              ]}
            >
              <LinearGradient
                colors={[equippedTheme.colors.surface, equippedTheme.colors.bg] as [string, string]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <Text style={[styles.avatarLetter, { color: equippedTheme.colors.accent }]}>{initial}</Text>
            </View>
          </View>
          <View style={styles.levelBadge}>
            <LinearGradient
              colors={[equippedTheme.colors.accent, frameBorderColor] as [string, string]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Text style={styles.levelText}>Lv.{p.level}</Text>
          </View>
          <Text style={styles.playerName}>{p.name}</Text>
          <View
            style={[
              styles.titleBadge,
              {
                backgroundColor: `${equippedTheme.colors.surface}cc`,
                borderColor: `${equippedTheme.colors.accent}55`,
              },
            ]}
          >
            <Text style={styles.titleText}>{p.title}</Text>
          </View>
        </View>

        {/* Prestige Badge (for players who have prestiged) */}
        {prestige?.prestigeLevel > 0 && (() => {
          const prestigeLevel = prestige.prestigeLevel;
          const prestigeDef = PRESTIGE_LEVELS.find((pl) => pl.level === prestigeLevel);
          if (!prestigeDef) return null;
          return (
            <View style={styles.prestigeBadgeRow}>
              <LinearGradient
                colors={['#3d2200', '#1a0e00']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={styles.prestigeBadgeIcon}>{prestigeDef.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.prestigeBadgeLabel}>{prestigeDef.label}</Text>
              <Text style={styles.prestigeBadgeMultiplier}>
                  Permanent prestige bonuses unlocked
                </Text>
              </View>
              <Text style={styles.prestigeBadgeCount}>
                Prestige {prestigeLevel}
              </Text>
            </View>
          );
        })()}

        {/* Prestige Button (when eligible) */}
        {canPrestige(p.level, prestige?.prestigeLevel ?? 0) && (() => {
          const nextPrestige = (prestige?.prestigeLevel ?? 0) + 1;
          const nextDef = PRESTIGE_LEVELS.find((pl) => pl.level === nextPrestige);
          if (!nextDef) return null;
          const summary = getPrestigeSummary(nextPrestige);

          return (
            <TouchableOpacity
              style={styles.prestigeButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Prestige to ${nextDef.label}. Resets level to 1 and unlocks permanent prestige bonuses`}
              onPress={() => {
                Alert.alert(
                  `Prestige to ${nextDef.label}?`,
                  `This will reset your level to 1 but you keep all cosmetics.\n\n` +
                  `You'll earn:\n` +
                  `  ${nextDef.icon} ${nextDef.label} prestige bonuses\n` +
                  `  Exclusive ${nextDef.cosmeticReward.type}\n` +
                  summary.gains.map((g) => `  ${g}`).join('\n') +
                  `\n\nThis cannot be undone.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'PRESTIGE',
                      style: 'destructive',
                      onPress: () => {
                        const success = playerActions.performPrestige?.();
                        if (!success) {
                          Alert.alert('Prestige Unavailable', 'Reach the required level before prestiging.');
                        }
                      },
                    },
                  ],
                );
              }}
            >
              <LinearGradient
                colors={[COLORS.gold, '#b8860b']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={styles.prestigeButtonIcon}>{nextDef.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.prestigeButtonTitle}>PRESTIGE</Text>
                <Text style={styles.prestigeButtonSub}>
                  Reset to Level 1 {'\u2022'} Keep cosmetics {'\u2022'} Unlock permanent bonuses {'\u2022'} Claim {nextDef.label} rewards
                </Text>
              </View>
            </TouchableOpacity>
          );
        })()}

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          {STAT_CARDS.map((stat) => (
            <View key={stat.key} style={styles.statCard} accessibilityRole="text" accessibilityLabel={`${stat.label}: ${(p as any)[stat.key]?.toLocaleString?.() ?? 0}`}>
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
          Achievements ({achievementIds.length}/{ACHIEVEMENTS.length * 3})
        </Text>
        <View style={styles.achievementsGrid}>
          {achievementsViewData.map(({ achievement, highestTier, tierColor, earnedLevels }) => {
            return (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  highestTier && { borderColor: tierColor + '60' },
                ]}
                accessibilityRole="text"
                accessibilityLabel={`Achievement: ${achievement.name}, ${highestTier ? highestTier + ' tier earned' : 'not yet earned'}`}
              >
                <LinearGradient
                  colors={[...GRADIENTS.surfaceCard]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <View style={styles.achievementIconWrap}>
                  <Image source={LOCAL_IMAGES.achievementBadge} style={styles.achievementBadgeFrame} resizeMode="contain" />
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                </View>
                <Text style={styles.achievementName} numberOfLines={1}>{achievement.name}</Text>
                <View style={styles.tierDots}>
                  {achievement.tiers.map(t => {
                    const earned = earnedLevels.includes(t.level);
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
          <View accessibilityRole="progressbar" accessibilityLabel={`Word Atlas progress: ${p.atlasProgress} percent`} accessibilityValue={{ min: 0, max: 100, now: p.atlasProgress }}>
            {renderProgressBar(p.atlasProgress, COLORS.accent)}
          </View>

          <View style={[styles.collectionRow, { marginTop: 14 }]}>
            <Text style={styles.collectionLabel}>Rare Tiles</Text>
            <Text style={styles.collectionPercent}>{p.tilesProgress}%</Text>
          </View>
          <View accessibilityRole="progressbar" accessibilityLabel={`Rare Tiles progress: ${p.tilesProgress} percent`} accessibilityValue={{ min: 0, max: 100, now: p.tilesProgress }}>
            {renderProgressBar(p.tilesProgress, COLORS.gold)}
          </View>

          <View style={[styles.collectionRow, { marginTop: 14 }]}>
            <Text style={styles.collectionLabel}>Seasonal Stamps</Text>
            <Text style={styles.collectionPercent}>{p.stampsProgress}%</Text>
          </View>
          <View accessibilityRole="progressbar" accessibilityLabel={`Seasonal Stamps progress: ${p.stampsProgress} percent`} accessibilityValue={{ min: 0, max: 100, now: p.stampsProgress }}>
            {renderProgressBar(p.stampsProgress, COLORS.purple)}
          </View>
        </View>

        {/* Equipped Cosmetics */}
        <Text style={styles.sectionTitle}>Equipped Cosmetics</Text>
        <TouchableOpacity style={styles.cosmeticsCard} activeOpacity={0.7} onPress={onEditProfile} accessibilityRole="button" accessibilityLabel="Edit equipped cosmetics">
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.cosmeticRow}>
            <Text style={styles.cosmeticLabel}>Frame</Text>
            <View style={styles.cosmeticValueRow}>
              <Text style={styles.cosmeticValue}>
                {PROFILE_FRAMES.find(f => f.id === p.equippedCosmetics.frame)?.name ?? 'Default'}
              </Text>
              <Text style={styles.cosmeticChevron}>{'\u203A'}</Text>
            </View>
          </View>
          <View style={styles.cosmeticDivider} />
          <View style={styles.cosmeticRow}>
            <Text style={styles.cosmeticLabel}>Theme</Text>
            <View style={styles.cosmeticValueRow}>
              <Text style={styles.cosmeticValue}>
                {COSMETIC_THEMES.find(t => t.id === p.equippedCosmetics.theme)?.name ?? 'Default'}
              </Text>
              <Text style={styles.cosmeticChevron}>{'\u203A'}</Text>
            </View>
          </View>
          <View style={styles.cosmeticDivider} />
          <View style={styles.cosmeticRow}>
            <Text style={styles.cosmeticLabel}>Title</Text>
            <View style={styles.cosmeticValueRow}>
              <Text style={styles.cosmeticValue}>
                {p.title ?? 'Wordsmith'}
              </Text>
              <Text style={styles.cosmeticChevron}>{'\u203A'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Mastery Button */}
        <TouchableOpacity style={styles.masteryButton} onPress={onOpenMastery} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Open Mastery Pass">
          <LinearGradient
            colors={[COLORS.gold + '25', COLORS.gold + '10'] as [string, string]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <Text style={styles.masteryButtonIcon}>{'\u{1F3C5}'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.masteryButtonTitle}>Mastery Pass</Text>
            <Text style={styles.masteryButtonSub}>Earn XP, unlock rewards</Text>
          </View>
          <Text style={styles.masteryChevron}>{'\u203A'}</Text>
        </TouchableOpacity>

        {/* Edit Profile Button */}
        <TouchableOpacity style={styles.editButton} onPress={onEditProfile} accessibilityRole="button" accessibilityLabel="Edit profile">
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
    borderWidth: 1,
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
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    width: '31%',
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
  achievementIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  achievementBadgeFrame: {
    ...StyleSheet.absoluteFillObject,
    width: 36,
    height: 36,
    opacity: 0.35,
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
  cosmeticValueRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  cosmeticChevron: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodySemiBold,
  },
  cosmeticDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  masteryButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gold + '30',
  },
  masteryButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  masteryButtonTitle: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.gold,
  },
  masteryButtonSub: {
    fontSize: 12,
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  masteryChevron: {
    fontSize: 22,
    color: COLORS.gold,
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
  // ── Prestige ──────────────────────────────────────────────────────────
  prestigeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    overflow: 'hidden',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  prestigeBadgeIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  prestigeBadgeLabel: {
    fontSize: 15,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  prestigeBadgeMultiplier: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  prestigeBadgeCount: {
    fontSize: 12,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    opacity: 0.7,
  },
  prestigeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    overflow: 'hidden',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  prestigeButtonIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  prestigeButtonTitle: {
    fontSize: 18,
    fontFamily: FONTS.display,
    color: COLORS.bg,
    letterSpacing: 2,
  },
  prestigeButtonSub: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.7)',
    fontFamily: FONTS.bodyMedium,
    marginTop: 2,
  },
});

export default ProfileScreen;
