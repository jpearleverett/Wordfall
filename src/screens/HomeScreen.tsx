import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, ECONOMY, GRADIENTS, RADII, SCREEN_HEIGHT, SHADOWS, SPACING, TYPOGRAPHY } from '../constants';
import { Difficulty, PlayerProgress } from '../types';

interface HomeScreenProps {
  progress: PlayerProgress;
  onPlay: (difficulty?: Difficulty) => void;
  onDaily: () => void;
  onResetProgress: () => void;
  onOpenShop?: () => void;
  onOpenSettings?: () => void;
}

const QUICK_PLAY: Array<{ id: Difficulty; label: string; tone: string; caption: string }> = [
  { id: 'easy', label: 'Easy', tone: COLORS.green, caption: 'Warm-up runs' },
  { id: 'medium', label: 'Medium', tone: COLORS.accent, caption: 'Balanced strategy' },
  { id: 'hard', label: 'Hard', tone: COLORS.coral, caption: 'Demanding drops' },
  { id: 'expert', label: 'Expert', tone: COLORS.purple, caption: 'Mastery only' },
];

export function HomeScreen({
  progress,
  onPlay,
  onDaily,
  onResetProgress,
  onOpenShop,
  onOpenSettings,
}: HomeScreenProps) {
  const titleAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(titleAnim, {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentAnim, titleAnim]);

  const today = new Date().toISOString().split('T')[0];
  const dailyDone = progress.dailyCompleted.includes(today);
  const totalStars = Object.values(progress.starsByLevel).reduce((a, b) => a + b, 0);
  const nextMilestone = [7, 14, 30, 60, 100].find(m => m > progress.currentStreak) || 100;
  const streakProgress = progress.currentStreak > 0 ? Math.min(100, (progress.currentStreak / nextMilestone) * 100) : 0;

  const heroTranslate = titleAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const contentTranslate = contentAnim.interpolate({ inputRange: [0, 1], outputRange: [26, 0] });

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            {onOpenSettings ? (
              <Pressable style={styles.iconButton} onPress={onOpenSettings}>
                <Text style={styles.iconButtonText}>⚙</Text>
              </Pressable>
            ) : <View style={styles.iconPlaceholder} />}
            {onOpenShop ? (
              <Pressable style={styles.iconButton} onPress={onOpenShop}>
                <Text style={styles.iconButtonText}>✦</Text>
              </Pressable>
            ) : <View style={styles.iconPlaceholder} />}
          </View>

          <Animated.View style={[styles.hero, { opacity: titleAnim, transform: [{ translateY: heroTranslate }] }]}>
            <Text style={styles.heroKicker}>Strategic wordfall</Text>
            <Text style={styles.title}>WORD</Text>
            <Text style={styles.titleAccent}>FALL</Text>
            <Text style={styles.subtitle}>Every clear changes the board. Plan the drop. Chase the chain.</Text>
          </Animated.View>

          <Animated.View style={{ opacity: contentAnim, transform: [{ translateY: contentTranslate }] }}>
            <LinearGradient colors={GRADIENTS.panel} style={styles.playWell}>
              <View style={styles.playWellHeader}>
                <View>
                  <Text style={styles.playLabel}>Current run</Text>
                  <Text style={styles.playLevel}>Continue Level {progress.currentLevel}</Text>
                </View>
                <View style={styles.streakBadge}>
                  <Text style={styles.streakBadgeValue}>{progress.currentStreak}</Text>
                  <Text style={styles.streakBadgeLabel}>day streak</Text>
                </View>
              </View>

              <Pressable style={styles.primaryCta} onPress={() => onPlay()}>
                <LinearGradient colors={GRADIENTS.accent} style={styles.primaryCtaFill}>
                  <Text style={styles.primaryCtaText}>Play now</Text>
                  <Text style={styles.primaryCtaSubtext}>Best move wins the future board</Text>
                </LinearGradient>
              </Pressable>

              <View style={styles.statRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statValue}>★ {totalStars}</Text>
                  <Text style={styles.statLabel}>Total stars</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statValue}>{progress.puzzlesSolved}</Text>
                  <Text style={styles.statLabel}>Puzzles solved</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statValue}>{progress.highestLevel}</Text>
                  <Text style={styles.statLabel}>Peak level</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Return rewards</Text>
              <Text style={styles.sectionCaption}>Daily momentum and weekly mastery.</Text>
            </View>

            <View style={styles.rewardRow}>
              <Pressable style={styles.dailyCard} onPress={onDaily}>
                <LinearGradient colors={dailyDone ? GRADIENTS.success : GRADIENTS.gold} style={styles.dailyCardFill}>
                  <Text style={styles.dailyKicker}>{dailyDone ? 'Claimed today' : 'Daily challenge'}</Text>
                  <Text style={styles.dailyTitle}>{dailyDone ? 'Challenge complete' : 'One board. One shot.'}</Text>
                  <Text style={styles.dailyMeta}>{dailyDone ? 'Come back tomorrow for a fresh puzzle.' : `Reward +${ECONOMY.dailyCompleteCoins} coins`}</Text>
                </LinearGradient>
              </Pressable>

              <LinearGradient colors={GRADIENTS.panelSoft} style={styles.streakCard}>
                <Text style={styles.streakTitle}>Streak pulse</Text>
                <Text style={styles.streakBody}>{progress.currentStreak > 0 ? `${progress.currentStreak} days strong` : 'Start your streak today'}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${streakProgress}%` }]} />
                </View>
                <Text style={styles.streakMeta}>Next milestone: {nextMilestone} days</Text>
              </LinearGradient>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick play</Text>
              <Text style={styles.sectionCaption}>Choose the energy you want right now.</Text>
            </View>

            <View style={styles.quickGrid}>
              {QUICK_PLAY.map(option => (
                <Pressable key={option.id} style={styles.quickCard} onPress={() => onPlay(option.id)}>
                  <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']} style={styles.quickCardFill}>
                    <View style={[styles.quickAccent, { backgroundColor: option.tone }]} />
                    <Text style={styles.quickLabel}>{option.label}</Text>
                    <Text style={styles.quickCaption}>{option.caption}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>

            <LinearGradient colors={GRADIENTS.panelSoft} style={styles.howToPlay}>
              <Text style={styles.sectionTitle}>Why Wordfall feels different</Text>
              <Text style={styles.howText}>• Words are only the start — gravity rewrites the board after every clear.</Text>
              <Text style={styles.howText}>• The smartest path creates chain reactions, not just fast finds.</Text>
              <Text style={styles.howText}>• Look for opportunities that improve the next move before you commit.</Text>
            </LinearGradient>

            <Pressable style={styles.resetButton} onPress={onResetProgress}>
              <Text style={styles.resetText}>Reset progress</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: SCREEN_HEIGHT,
  },
  safeArea: {
    flex: 1,
  },
  bgOrbTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(32,216,255,0.16)',
    top: -60,
    right: -40,
  },
  bgOrbBottom: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: 'rgba(168,116,255,0.12)',
    bottom: -140,
    left: -80,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    color: COLORS.textPrimary,
    fontSize: 18,
  },
  iconPlaceholder: {
    width: 46,
  },
  hero: {
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  heroKicker: {
    color: COLORS.accentStrong,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily: TYPOGRAPHY.ui,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 56,
    letterSpacing: 10,
    marginTop: 10,
    fontFamily: TYPOGRAPHY.display,
  },
  titleAccent: {
    color: COLORS.accentStrong,
    fontSize: 56,
    letterSpacing: 10,
    marginTop: -10,
    textShadowColor: COLORS.accentGlowStrong,
    textShadowRadius: 18,
    fontFamily: TYPOGRAPHY.display,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
    fontFamily: TYPOGRAPHY.ui,
  },
  playWell: {
    borderRadius: RADII.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    ...SHADOWS.card,
  },
  playWellHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  playLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontFamily: TYPOGRAPHY.ui,
  },
  playLevel: {
    color: COLORS.textPrimary,
    fontSize: 24,
    marginTop: 4,
    fontFamily: TYPOGRAPHY.display,
  },
  streakBadge: {
    minWidth: 78,
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(255,124,114,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,124,114,0.42)',
    alignItems: 'center',
  },
  streakBadgeValue: {
    color: COLORS.coral,
    fontSize: 22,
    fontFamily: TYPOGRAPHY.display,
  },
  streakBadgeLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
    fontFamily: TYPOGRAPHY.ui,
  },
  primaryCta: {
    borderRadius: RADII.lg,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  primaryCtaFill: {
    paddingVertical: 20,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  primaryCtaText: {
    color: COLORS.textOnAccent,
    fontSize: 22,
    textTransform: 'uppercase',
    letterSpacing: 2.4,
    fontFamily: TYPOGRAPHY.display,
  },
  primaryCtaSubtext: {
    color: 'rgba(4,16,31,0.72)',
    fontSize: 12,
    marginTop: 6,
    fontFamily: TYPOGRAPHY.ui,
  },
  statRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statPill: {
    flex: 1,
    borderRadius: RADII.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontFamily: TYPOGRAPHY.display,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
    fontFamily: TYPOGRAPHY.ui,
  },
  sectionHeader: {
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontFamily: TYPOGRAPHY.display,
  },
  sectionCaption: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
    fontFamily: TYPOGRAPHY.ui,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  dailyCard: {
    flex: 1.2,
    borderRadius: RADII.lg,
    overflow: 'hidden',
  },
  dailyCardFill: {
    minHeight: 150,
    padding: SPACING.lg,
    justifyContent: 'space-between',
  },
  dailyKicker: {
    color: 'rgba(4,16,31,0.7)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontFamily: TYPOGRAPHY.ui,
  },
  dailyTitle: {
    color: COLORS.textOnAccent,
    fontSize: 22,
    fontFamily: TYPOGRAPHY.display,
  },
  dailyMeta: {
    color: 'rgba(4,16,31,0.75)',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: TYPOGRAPHY.ui,
  },
  streakCard: {
    flex: 1,
    borderRadius: RADII.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
  },
  streakTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: TYPOGRAPHY.display,
  },
  streakBody: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    fontFamily: TYPOGRAPHY.ui,
  },
  progressTrack: {
    height: 8,
    borderRadius: RADII.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: SPACING.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADII.pill,
    backgroundColor: COLORS.coral,
  },
  streakMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: TYPOGRAPHY.ui,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickCard: {
    width: '48.5%',
    borderRadius: RADII.lg,
    overflow: 'hidden',
  },
  quickCardFill: {
    minHeight: 126,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    justifyContent: 'flex-end',
  },
  quickAccent: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  quickLabel: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontFamily: TYPOGRAPHY.display,
  },
  quickCaption: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
    fontFamily: TYPOGRAPHY.ui,
  },
  howToPlay: {
    marginTop: SPACING.xxl,
    borderRadius: RADII.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  howText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    fontFamily: TYPOGRAPHY.ui,
  },
  resetButton: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  resetText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: TYPOGRAPHY.ui,
  },
});
