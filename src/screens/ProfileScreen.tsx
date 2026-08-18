import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, FONTS, SHADOWS, RADIUS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import IconMedallion from '../components/common/IconMedallion';
import PrimaryButton from '../components/common/PrimaryButton';
import NeonProgressBar from '../components/common/NeonProgressBar';
import { bentoPanel, bentoDividerColor } from '../styles/bentoPanel';
import { useReduceMotion } from '../hooks/useReduceMotion';
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
import { getRemoteBoolean } from '../services/remoteConfig';
import {
  canPrestige,
  getPrestigeRewards,
  getPrestigeSummary,
  getPrestigeXpMultiplier,
  getPrestigeCoinMultiplier,
  getPrestigeGemMultiplier,
  PRESTIGE_LEVELS,
} from '../data/prestigeSystem';

interface PlayerData {
  name: string;
  level: number;
  title: string;
  puzzlesSolved: number;
  totalStars: number;
  bestStreak: number;
  currentStreak: number;
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
  /**
   * Opens the Clubs screen. ClubScreen was registered in the Profile stack
   * but NOTHING navigated to it — the entire social layer (club goals,
   * shared goals, chat, gift inbox, browse-clubs) was reachable only by
   * following someone else's invite deep link. Onboarding's economy primer
   * even teaches the player what Clubs are, so the game explained a feature
   * it then gave no way to open.
   */
  onOpenClub?: () => void;
  onOpenMastery?: () => void;
}

const DEFAULT_PLAYER: PlayerData = {
  name: 'Player',
  level: 1,
  title: 'Wordsmith',
  puzzlesSolved: 0,
  totalStars: 0,
  bestStreak: 0,
  currentStreak: 0,
  perfectSolves: 0,
  totalScore: 0,
  badges: [],
  atlasProgress: 0,
  tilesProgress: 0,
  stampsProgress: 0,
  equippedCosmetics: {},
};

// Each stat owns an accent so the dashboard reads as a set of crafted gem
// tiles (per the AAA audit) instead of a monochrome web grid.
const STAT_CARDS = [
  { key: 'puzzlesSolved', label: 'Puzzles Solved', icon: '\u{1F9E9}', accent: COLORS.green },
  { key: 'totalStars', label: 'Total Stars', icon: '⭐', accent: COLORS.gold },
  { key: 'currentStreak', label: 'Current Streak', icon: '\u{1F525}', accent: COLORS.orange },
  { key: 'bestStreak', label: 'Best Streak', icon: '\u{1F3C5}', accent: COLORS.accent },
  { key: 'perfectSolves', label: 'Perfect Solves', icon: '\u{1F48E}', accent: COLORS.cyan },
  { key: 'totalScore', label: 'Total Score', icon: '\u{1F3C6}', accent: COLORS.purple },
  { key: 'level', label: 'Current Level', icon: '\u{1F4C8}', accent: COLORS.teal },
] as const;

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  player: playerProp,
  onEditProfile: onEditProfileProp,
  onOpenSettings: onOpenSettingsProp,
  onOpenClub: onOpenClubProp,
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
  const onOpenClub = onOpenClubProp ?? null;
  // `clubsEnabled` was a declared Remote Config key that nothing read, so the
  // most incident-prone feature in the app (Cloud Functions, member chat,
  // Perspective-API moderation, collective goals) had no off switch. Defaults
  // true — this only matters the day something needs darkening.
  const clubsVisible = Boolean(onOpenClub) && getRemoteBoolean('clubsEnabled');
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
        const tierColor = highestTier === 'gold' ? COLORS.tierGold
          : highestTier === 'silver' ? COLORS.tierSilver
          : highestTier === 'bronze' ? COLORS.tierBronze
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
      currentStreak: playerStreaks.currentStreak,
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
      playerStreaks.currentStreak,
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

  // MG3 in launch_blockers.md: animated glow for legendary frames.
  // Pulses scale 1.00 ↔ 1.04 and shadow opacity 0.6 ↔ 1.0 on a 1400ms
  // cycle. Respects reduce-motion — when enabled the ring is static.
  // Focus-gated like the backdrops: ProfileScreen stays mounted beneath
  // pushed screens, and an unfocused withRepeat would keep mutating the
  // shared value (and re-blurring the shadow) every frame while invisible.
  const reduceMotion = useReduceMotion();
  const isFocused = useIsFocused();
  const isLegendary = equippedFrame.rarity === 'legendary';
  const glowPulse = useSharedValue(0);
  useEffect(() => {
    if (!isLegendary || reduceMotion || !isFocused) {
      cancelAnimation(glowPulse);
      glowPulse.value = 0;
      return;
    }
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0, { duration: 700 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(glowPulse);
  }, [isLegendary, reduceMotion, isFocused, glowPulse]);

  const animatedRingStyle = useAnimatedStyle(() => {
    if (!isLegendary || reduceMotion) {
      return { transform: [{ scale: 1 }], shadowOpacity: 0.6 };
    }
    const scale = 1 + glowPulse.value * 0.04;
    const shadowOpacity = 0.6 + glowPulse.value * 0.4;
    return { transform: [{ scale }], shadowOpacity };
  });

  // Settings gear as a glass header button — same material as the
  // scaffold's back button, never a bare emoji floating in the header.
  const settingsButton = (
    <Pressable
      onPress={onOpenSettings}
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      hitSlop={8}
      style={({ pressed }) => [styles.settingsBtn, pressed && styles.pressedScale]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.03)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Text style={styles.settingsGlyph}>{'⚙️'}</Text>
    </Pressable>
  );

  if (loading) {
    return (
      <ScreenScaffold title="PROFILE" backdrop="profile" headerRight={settingsButton}>
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
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="PROFILE" backdrop="profile" headerRight={settingsButton}>
      {/* Hero identity card — avatar + frame + title + prestige badge in one
          bento hero. Avatar pulse + legendary glow animations are untouched. */}
      <View style={styles.heroCard}>
        {/* Clipped decor layer so the glow blob stays inside the rounded
            shell without clipping the avatar ring's own shadow glow. */}
        <View style={styles.heroDecorClip} pointerEvents="none">
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.heroGlowBlob} />
          <View style={[styles.heroGlowBlob, styles.heroGlowBlobAlt]} />
        </View>

        <Animated.View
          style={[
            styles.avatarRing,
            {
              borderColor: frameBorderColor,
              shadowColor: frameBorderColor,
              backgroundColor: equippedTheme.colors.surface,
            },
            animatedRingStyle,
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
        </Animated.View>
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

        {/* Prestige Badge (for players who have prestiged) */}
        {prestige?.prestigeLevel > 0 && (() => {
          const prestigeLevel = prestige.prestigeLevel;
          const prestigeDef = PRESTIGE_LEVELS.find((pl) => pl.level === prestigeLevel);
          if (!prestigeDef) return null;
          // Tier 6 B3 — show the live multiplier so the meta-loop has teeth.
          const xpMult = getPrestigeXpMultiplier(prestigeLevel);
          const coinMult = getPrestigeCoinMultiplier(prestige.permanentBonuses ?? []);
          const gemMult = getPrestigeGemMultiplier(prestige.permanentBonuses ?? []);
          const multiplierSummary = [
            xpMult > 1 ? `${xpMult.toFixed(2)}× XP` : null,
            coinMult > 1 ? `${coinMult.toFixed(2)}× Coin` : null,
            gemMult > 1 ? `${gemMult.toFixed(2)}× Gem` : null,
          ].filter(Boolean).join(' · ');
          return (
            <View style={styles.prestigeBadgeRow}>
              <LinearGradient
                colors={['#3d2200', '#1a0e00']}
                style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <IconMedallion glyph={prestigeDef.icon} accent={COLORS.gold} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.prestigeBadgeLabel}>{prestigeDef.label}</Text>
                <Text style={styles.prestigeBadgeMultiplier}>
                  {multiplierSummary || 'Permanent prestige bonuses unlocked'}
                </Text>
              </View>
              <Text style={styles.prestigeBadgeCount}>
                Prestige {prestigeLevel}
              </Text>
            </View>
          );
        })()}
      </View>

      {/* Prestige Button (when eligible) */}
      {canPrestige(p.level, prestige?.prestigeLevel ?? 0) && (() => {
        const nextPrestige = (prestige?.prestigeLevel ?? 0) + 1;
        const nextDef = PRESTIGE_LEVELS.find((pl) => pl.level === nextPrestige);
        if (!nextDef) return null;
        const summary = getPrestigeSummary(nextPrestige);

        return (
          <Pressable
            style={({ pressed }) => [styles.prestigeButton, pressed && styles.cardPressed]}
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
              style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Text style={styles.prestigeButtonIcon}>{nextDef.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.prestigeButtonTitle}>PRESTIGE</Text>
              <Text style={styles.prestigeButtonSub}>
                Reset to Level 1 {'•'} Keep cosmetics {'•'} Unlock permanent bonuses {'•'} Claim {nextDef.label} rewards
              </Text>
            </View>
          </Pressable>
        );
      })()}

      {/* Stats — accent-tinted gem tiles with medallion icons */}
      <SectionHeader label="STATISTICS" accent={COLORS.cyan} />
      <View style={styles.statsGrid}>
        {STAT_CARDS.map((stat) => (
          <View
            key={stat.key}
            style={[
              styles.statCard,
              { borderColor: stat.accent + '3d', shadowColor: stat.accent },
            ]}
            accessibilityRole="text"
            accessibilityLabel={`${stat.label}: ${(p as any)[stat.key]?.toLocaleString?.() ?? 0}`}
          >
            <LinearGradient
              colors={[stat.accent + '24', 'rgba(26,10,46,0.94)'] as [string, string]}
              style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <IconMedallion glyph={stat.icon} accent={stat.accent} size={38} style={{ marginBottom: 8 }} />
            <Text style={styles.statValue}>
              {(p as any)[stat.key]?.toLocaleString?.() ?? 0}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
      {/* Achievements */}
      <SectionHeader
        label="ACHIEVEMENTS"
        accent={COLORS.gold}
        meta={`${achievementIds.length}/${ACHIEVEMENTS.length * 3}`}
      />
      <View style={styles.achievementsGrid}>
        {achievementsViewData.map(({ achievement, highestTier, tierColor, earnedLevels }) => {
          return (
            <View
              key={achievement.id}
              style={[
                styles.achievementCard,
                highestTier
                  ? { borderColor: tierColor + '66', shadowColor: tierColor, shadowOpacity: 0.35 }
                  : null,
              ]}
              accessibilityRole="text"
              accessibilityLabel={`Achievement: ${achievement.name}, ${highestTier ? highestTier + ' tier earned' : 'not yet earned'}`}
            >
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard]}
                style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <IconMedallion
                glyph={achievement.icon}
                accent={highestTier ? tierColor : COLORS.purple}
                muted={!highestTier}
                size={40}
                style={{ marginBottom: 8 }}
              />
              <Text style={styles.achievementName} numberOfLines={1}>{achievement.name}</Text>
              <View style={styles.tierDots}>
                {achievement.tiers.map(t => {
                  const earned = earnedLevels.includes(t.level);
                  const dotColor = t.level === 'gold' ? COLORS.gold
                    : t.level === 'silver' ? COLORS.tierSilver : COLORS.tierBronze;
                  return (
                    <View
                      key={t.level}
                      style={[
                        styles.tierDot,
                        earned
                          ? { backgroundColor: dotColor, shadowColor: dotColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 2 }
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
      <SectionHeader label="COLLECTION PROGRESS" accent={COLORS.purple} />
      <View style={styles.collectionsCard}>
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard]}
          style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={styles.collectionRow}>
          <Text style={styles.collectionLabel}>Word Atlas</Text>
          <Text style={[styles.collectionPercent, { color: COLORS.accent }]}>{p.atlasProgress}%</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityLabel={`Word Atlas progress: ${p.atlasProgress} percent`} accessibilityValue={{ min: 0, max: 100, now: p.atlasProgress }}>
          <NeonProgressBar progress={Math.min(p.atlasProgress, 100) / 100} color={COLORS.accent} height={9} />
        </View>

        <View style={[styles.collectionRow, { marginTop: 16 }]}>
          <Text style={styles.collectionLabel}>Rare Tiles</Text>
          <Text style={[styles.collectionPercent, { color: COLORS.gold }]}>{p.tilesProgress}%</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityLabel={`Rare Tiles progress: ${p.tilesProgress} percent`} accessibilityValue={{ min: 0, max: 100, now: p.tilesProgress }}>
          <NeonProgressBar progress={Math.min(p.tilesProgress, 100) / 100} color={COLORS.gold} height={9} />
        </View>

        <View style={[styles.collectionRow, { marginTop: 16 }]}>
          <Text style={styles.collectionLabel}>Seasonal Stamps</Text>
          <Text style={[styles.collectionPercent, { color: COLORS.purple }]}>{p.stampsProgress}%</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityLabel={`Seasonal Stamps progress: ${p.stampsProgress} percent`} accessibilityValue={{ min: 0, max: 100, now: p.stampsProgress }}>
          <NeonProgressBar progress={Math.min(p.stampsProgress, 100) / 100} color={COLORS.purple} height={9} />
        </View>
      </View>

      {/* Equipped Cosmetics */}
      <SectionHeader label="EQUIPPED COSMETICS" accent={COLORS.cyan} />
      <Pressable
        style={({ pressed }) => [styles.cosmeticsCard, pressed && styles.cardPressed]}
        onPress={onEditProfile}
        accessibilityRole="button"
        accessibilityLabel="Edit equipped cosmetics"
      >
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard]}
          style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={styles.cosmeticRow}>
          <IconMedallion glyph={'\u{1F5BC}️'} accent={frameBorderColor} shape="squircle" size={34} />
          <Text style={styles.cosmeticLabel}>Frame</Text>
          <Text style={styles.cosmeticValue}>
            {PROFILE_FRAMES.find(f => f.id === p.equippedCosmetics.frame)?.name ?? 'Default'}
          </Text>
          <Text style={styles.cosmeticChevron}>{'›'}</Text>
        </View>
        <View style={styles.cosmeticDivider} />
        <View style={styles.cosmeticRow}>
          <IconMedallion glyph={'\u{1F3A8}'} accent={COLORS.purple} shape="squircle" size={34} />
          <Text style={styles.cosmeticLabel}>Theme</Text>
          <Text style={styles.cosmeticValue}>
            {COSMETIC_THEMES.find(t => t.id === p.equippedCosmetics.theme)?.name ?? 'Default'}
          </Text>
          <Text style={styles.cosmeticChevron}>{'›'}</Text>
        </View>
        <View style={styles.cosmeticDivider} />
        <View style={styles.cosmeticRow}>
          <IconMedallion glyph={'\u{1F3F7}️'} accent={COLORS.gold} shape="squircle" size={34} />
          <Text style={styles.cosmeticLabel}>Title</Text>
          <Text style={styles.cosmeticValue}>
            {p.title ?? 'Wordsmith'}
          </Text>
          <Text style={styles.cosmeticChevron}>{'›'}</Text>
        </View>
      </Pressable>

      {/* Mastery + Clubs — rich link cards with medallions and chevrons */}
      <SectionHeader label="EXPLORE" accent={COLORS.teal} />
      <Pressable
        style={({ pressed }) => [styles.linkCard, styles.linkCardGold, pressed && styles.cardPressed]}
        onPress={onOpenMastery}
        accessibilityRole="button"
        accessibilityLabel="Open Mastery Pass"
      >
        <LinearGradient
          colors={[COLORS.gold + '26', 'rgba(26,10,46,0.92)'] as [string, string]}
          style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <IconMedallion glyph={'\u{1F3C5}'} accent={COLORS.gold} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.linkCardTitle, { color: COLORS.gold }]}>Mastery Pass</Text>
          <Text style={styles.linkCardSub}>Earn XP, unlock rewards</Text>
        </View>
        <Text style={[styles.linkCardChevron, { color: COLORS.gold }]}>{'›'}</Text>
      </Pressable>

      {clubsVisible && (
        <Pressable
          style={({ pressed }) => [styles.linkCard, styles.linkCardCyan, pressed && styles.cardPressed]}
          onPress={onOpenClub!}
          accessibilityRole="button"
          accessibilityLabel="Open Clubs"
        >
          <LinearGradient
            colors={[COLORS.teal + '26', 'rgba(26,10,46,0.92)'] as [string, string]}
            style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <IconMedallion glyph={'\u{1F465}'} accent={COLORS.teal} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.linkCardTitle, { color: COLORS.teal }]}>Clubs</Text>
            <Text style={styles.linkCardSub}>Team up for shared goals and rewards</Text>
          </View>
          <Text style={[styles.linkCardChevron, { color: COLORS.teal }]}>{'›'}</Text>
        </Pressable>
      )}

      {/* Edit Profile CTA */}
      <PrimaryButton
        label="EDIT PROFILE"
        onPress={onEditProfile}
        size="large"
        fullWidth
        accessibilityLabel="Edit profile"
        style={{ marginTop: 24 }}
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  // ── Header ────────────────────────────────────────────────────────────
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(20, 8, 40, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  settingsGlyph: {
    fontSize: 18,
  },
  pressedScale: {
    transform: [{ scale: 0.93 }],
    opacity: 0.85,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  // ── Hero identity card ────────────────────────────────────────────────
  heroCard: {
    ...bentoPanel('pink', { borderRadius: RADIUS.xxl, padding: 20, marginBottom: 4 }),
    alignItems: 'center',
    marginTop: 8,
  },
  heroDecorClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
  },
  heroGlowBlob: {
    position: 'absolute',
    top: -70,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.accentGlow,
    opacity: 0.55,
  },
  heroGlowBlobAlt: {
    top: undefined,
    right: undefined,
    bottom: -90,
    left: -60,
    backgroundColor: 'rgba(0,229,255,0.20)',
    opacity: 0.6,
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
    borderRadius: RADIUS.md,
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
  // ── Stats ─────────────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '31%',
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 6,
  },
  statValue: {
    fontSize: 20,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    marginBottom: 2,
    textShadowColor: 'rgba(255,255,255,0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  statLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontFamily: FONTS.bodySemiBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  // ── Achievements ──────────────────────────────────────────────────────
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  achievementCard: {
    width: '31%',
    borderRadius: RADIUS.xl,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
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
  // ── Collections ───────────────────────────────────────────────────────
  collectionsCard: {
    ...bentoPanel('purple', { borderRadius: RADIUS.xl, padding: 16, marginBottom: 0 }),
  },
  collectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  collectionLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodySemiBold,
  },
  collectionPercent: {
    fontSize: 14,
    fontFamily: FONTS.display,
  },
  // ── Cosmetics ─────────────────────────────────────────────────────────
  cosmeticsCard: {
    ...bentoPanel('cyan', { borderRadius: RADIUS.xl, padding: 14, marginBottom: 0 }),
  },
  cosmeticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  cosmeticLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONTS.bodyMedium,
    width: 52,
  },
  cosmeticValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodySemiBold,
  },
  cosmeticChevron: {
    fontSize: 20,
    color: COLORS.cyan,
    fontFamily: FONTS.display,
  },
  cosmeticDivider: {
    height: 1,
    backgroundColor: bentoDividerColor('cyan'),
  },
  // ── Link cards (Mastery / Clubs) ──────────────────────────────────────
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkCardGold: {
    ...bentoPanel('gold', { borderRadius: RADIUS.xl, padding: 14, marginBottom: 12 }),
  },
  linkCardCyan: {
    ...bentoPanel('cyan', { borderRadius: RADIUS.xl, padding: 14, marginBottom: 12 }),
  },
  linkCardTitle: {
    fontSize: 15,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  linkCardSub: {
    fontSize: 12,
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  linkCardChevron: {
    fontSize: 24,
    fontFamily: FONTS.display,
  },
  // ── Prestige ──────────────────────────────────────────────────────────
  prestigeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 12,
    borderRadius: RADIUS.xl,
    padding: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  prestigeBadgeLabel: {
    fontSize: 15,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  prestigeBadgeMultiplier: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
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
    borderRadius: RADIUS.xl,
    padding: 16,
    marginTop: 16,
    ...SHADOWS.glow(COLORS.gold),
  },
  prestigeButtonIcon: {
    fontSize: 32,
    marginRight: 12,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
