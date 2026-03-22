import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ECONOMY, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { Difficulty, PlayerProgress, WeeklyGoalsState } from '../types';
import { soundManager } from '../services/sound';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { NeonPalmHero } from '../components/common/NeonPalmHero';

interface DailyMissionDisplay {
  id: string;
  progress: number;
  completed: boolean;
}

interface Recommendation {
  icon: string;
  title: string;
  subtitle: string;
  action: () => void;
}

interface HomeScreenProps {
  progress: PlayerProgress;
  onPlay: (difficulty?: Difficulty) => void;
  onDaily: () => void;
  onResetProgress: () => void;
  onOpenShop?: () => void;
  onOpenSettings?: () => void;
  currencies?: {
    coins: number;
    gems: number;
    hintTokens: number;
    libraryPoints: number;
  };
  currentChapter?: number;
  loginCycleDay?: number;
  playerStage?: 'new' | 'early' | 'established' | 'veteran';
  weeklyGoals?: WeeklyGoalsState | null;
  dailyMissions?: DailyMissionDisplay[];
  recommendation?: Recommendation | null;
}

const difficultyMeta: Record<Difficulty, { label: string; accent: string; icon: string; description: string }> = {
  easy: { label: 'Sunset', accent: COLORS.green, icon: '🌴', description: 'Smooth warm-up run' },
  medium: { label: 'Neon', accent: COLORS.accent, icon: '⚡', description: 'Balanced synth pressure' },
  hard: { label: 'Turbo', accent: COLORS.orange, icon: '🔥', description: 'High-voltage challenge' },
  expert: { label: 'Midnight', accent: COLORS.teal, icon: '💎', description: 'Pure vapor mastery' },
};

const MISSION_LABELS: Record<string, { label: string; target: number }> = {
  solve_3_puzzles: { label: 'Solve 3 puzzles', target: 3 },
  earn_500_score: { label: 'Earn 500 score', target: 500 },
  get_perfect_solve: { label: 'Get a perfect solve', target: 1 },
  collect_rare_tile: { label: 'Collect a rare tile', target: 1 },
  complete_daily: { label: 'Complete daily puzzle', target: 1 },
  solve_without_hints: { label: 'Solve without hints', target: 1 },
  earn_3_stars: { label: 'Earn 3 stars', target: 3 },
  play_5_minutes: { label: 'Play for 5 minutes', target: 1 },
};

function SectionShell({ children, glowColor = 'rgba(255,45,149,0.12)', style }: { children: React.ReactNode; glowColor?: string; style?: any }) {
  return (
    <View style={[styles.sectionShell, style]}>
      <View style={[styles.sectionGlow, { backgroundColor: glowColor }]} />
      <LinearGradient colors={['rgba(20, 4, 42, 0.94)', 'rgba(8, 10, 28, 0.96)']} style={styles.sectionCard}>
        <LinearGradient
          colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.sectionHighlight}
        />
        {children}
      </LinearGradient>
    </View>
  );
}

export function HomeScreen({
  progress,
  onPlay,
  onDaily,
  onResetProgress,
  onOpenShop,
  onOpenSettings,
  currencies,
  currentChapter = 1,
  loginCycleDay = 1,
  playerStage = 'new',
  weeklyGoals = null,
  dailyMissions = [],
  recommendation = null,
}: HomeScreenProps) {
  const titleAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(titleAnim, {
        toValue: 1,
        friction: 6,
        tension: 76,
        useNativeDriver: true,
      }),
      Animated.spring(contentAnim, {
        toValue: 1,
        friction: 7,
        tension: 64,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentAnim, titleAnim]);

  useEffect(() => {
    void soundManager.playMusic('menu');
  }, []);

  const heroTranslate = titleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [36, 0],
  });

  const contentTranslate = contentAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [52, 0],
  });

  const today = new Date().toISOString().split('T')[0];
  const dailyDone = progress.dailyCompleted.includes(today);
  const totalStars = Object.values(progress.starsByLevel).reduce((a, b) => a + b, 0);
  const nextMilestone = [7, 14, 30, 60, 100].find((milestone) => milestone > progress.currentStreak) || 100;
  const streakProgress = Math.min(100, (progress.currentStreak / nextMilestone) * 100);
  const currentRewardDay = ((loginCycleDay - 1) % 7) + 1;

  const showStreak = playerStage !== 'new';
  const showDailyRewards = playerStage !== 'new';
  const showQuickPlay = playerStage !== 'new' && playerStage !== 'early';
  const showWeeklyGoals = (playerStage === 'established' || playerStage === 'veteran') && weeklyGoals;
  const showMissions = (playerStage === 'established' || playerStage === 'veteran') && dailyMissions.length > 0;

  return (
    <View style={styles.container}>
      <AmbientBackdrop variant="home" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          {onOpenSettings && (
            <Pressable style={styles.iconButton} onPress={onOpenSettings}>
              <Ionicons name="settings-outline" size={22} color={COLORS.textPrimary} />
            </Pressable>
          )}
          <View style={styles.topBarRight}>
            {currencies && (
              <>
                <LinearGradient colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.03)']} style={styles.currencyChip}>
                  <Text style={styles.currencyLabel}>🪙 {currencies.coins}</Text>
                </LinearGradient>
                <LinearGradient colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.03)']} style={styles.currencyChip}>
                  <Text style={styles.currencyLabel}>💎 {currencies.gems}</Text>
                </LinearGradient>
                <LinearGradient colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.03)']} style={styles.currencyChip}>
                  <Text style={styles.currencyLabel}>💡 {currencies.hintTokens}</Text>
                </LinearGradient>
              </>
            )}
            {onOpenShop && (
              <Pressable onPress={onOpenShop}>
                <LinearGradient colors={GRADIENTS.button.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shopButton}>
                  <View style={styles.shopButtonInner}>
                    <Ionicons name="bag-outline" size={14} color="#fff" />
                    <Text style={styles.shopButtonText}>Boutique</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>

        <Animated.View
          style={{
            opacity: titleAnim,
            transform: [
              { translateY: heroTranslate },
              { scale: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
            ],
          }}
        >
          <LinearGradient colors={['rgba(35, 8, 68, 0.96)', 'rgba(8, 10, 26, 0.98)']} style={styles.heroCard}>
            <View style={styles.heroGlowPrimary} />
            <View style={styles.heroGlowSecondary} />
            <View style={styles.heroGlowTertiary} />
            <Text style={styles.heroEyebrow}>RETROWAVE WORD PUZZLE EXPERIENCE</Text>
            <View style={styles.titleRow}>
              <Text style={styles.title}>WORD</Text>
              <LinearGradient colors={['#8ef9ff', '#ff6eb4', '#ff2d95']} style={styles.titleBadge}>
                <Text style={styles.titleBadgeText}>FALL</Text>
              </LinearGradient>
            </View>
            <Text style={styles.subtitle}>
              {playerStage === 'new'
                ? 'Dive into a neon skyline where every swipe cascades through a chrome-lit puzzle grid.'
                : `Chapter ${currentChapter} is glowing. Chain words, light the skyline, and keep the Miami midnight energy alive.`}
            </Text>

            <View style={styles.heroTagRow}>
              <LinearGradient colors={['rgba(255,45,149,0.24)', 'rgba(255,45,149,0.06)']} style={styles.heroTag}>
                <Text style={styles.heroTagText}>SYNTH SCORE ATTACK</Text>
              </LinearGradient>
              <LinearGradient colors={['rgba(0,255,245,0.20)', 'rgba(0,255,245,0.06)']} style={styles.heroTag}>
                <Text style={[styles.heroTagText, styles.heroTagTextCyan]}>PALM CITY VIBES</Text>
              </LinearGradient>
            </View>

            <NeonPalmHero />

            <View style={styles.heroStatsRow}>
              {[
                { value: `★ ${totalStars}`, label: 'Glow Stars' },
                { value: `${progress.puzzlesSolved}`, label: 'Night Runs' },
                { value: `🔥 ${progress.currentStreak}`, label: 'Heat Streak' },
              ].map((stat) => (
                <LinearGradient key={stat.label} colors={['rgba(255,255,255,0.11)', 'rgba(255,255,255,0.02)']} style={styles.heroStatCard}>
                  <Text style={styles.heroStatValue}>{stat.value}</Text>
                  <Text style={styles.heroStatLabel}>{stat.label}</Text>
                </LinearGradient>
              ))}
            </View>

            <Pressable style={({ pressed }) => [pressed && styles.buttonPressed]} onPress={() => onPlay()}>
              <LinearGradient colors={['#ff8bd1', '#ff2d95', '#9b0070']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.primaryButton, SHADOWS.glow(COLORS.accent)]}>
                <View>
                  <Text style={styles.primaryButtonLabel}>{playerStage === 'new' ? 'Tap into the skyline' : 'Continue the afterglow'}</Text>
                  <Text style={styles.primaryButtonSubLabel}>Play Level {progress.currentLevel}</Text>
                </View>
                <Text style={styles.primaryButtonArrow}>→</Text>
              </LinearGradient>
            </Pressable>

            {playerStage !== 'new' && (
              <Pressable style={({ pressed }) => [pressed && styles.buttonPressed]} onPress={onDaily}>
                <LinearGradient
                  colors={dailyDone ? ['rgba(0,255,170,0.22)', 'rgba(0,255,170,0.06)'] : ['rgba(255,215,0,0.18)', 'rgba(255,45,149,0.10)']}
                  style={[styles.dailyCard, dailyDone && styles.dailyDone]}
                >
                  <View style={styles.dailyContent}>
                    <Text style={styles.dailyKicker}>Tonight&apos;s Feature</Text>
                    <Text style={styles.dailyTitle}>{dailyDone ? 'Daily set complete' : 'Daily neon challenge'}</Text>
                    <Text style={styles.dailySubtitle}>{dailyDone ? 'The skyline resets tomorrow.' : `Collect +${ECONOMY.dailyCompleteCoins} coins and keep the glow alive.`}</Text>
                  </View>
                  <Text style={styles.dailyBadge}>{dailyDone ? '✓' : '☀'}</Text>
                </LinearGradient>
              </Pressable>
            )}
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: contentAnim, transform: [{ translateY: contentTranslate }] }}>
          {showMissions && (
            <SectionShell glowColor="rgba(255,45,149,0.18)">
              <View style={styles.panelHeaderRow}>
                <View>
                  <Text style={styles.panelKicker}>NIGHTLY OBJECTIVES</Text>
                  <Text style={styles.panelTitle}>Daily Missions</Text>
                </View>
                <Text style={styles.panelMeta}>{dailyMissions.filter((m) => m.completed).length}/{dailyMissions.length}</Text>
              </View>
              {dailyMissions.map((mission) => {
                const meta = MISSION_LABELS[mission.id] || { label: mission.id, target: 1 };
                const fillPct = Math.min(100, (mission.progress / meta.target) * 100);
                return (
                  <View key={mission.id} style={styles.missionRow}>
                    <View style={styles.missionHeader}>
                      <Text style={[styles.missionLabel, mission.completed && styles.missionLabelDone]}>{mission.completed ? '✓ ' : ''}{meta.label}</Text>
                      <Text style={styles.missionValue}>{Math.min(mission.progress, meta.target)}/{meta.target}</Text>
                    </View>
                    <View style={styles.missionBarTrack}>
                      <LinearGradient
                        colors={mission.completed ? [COLORS.green, COLORS.teal] : [COLORS.accentLight, COLORS.accent, '#7a0052']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.missionBarFill, { width: `${Math.max(fillPct, 3)}%` }]}
                      />
                    </View>
                  </View>
                );
              })}
            </SectionShell>
          )}

          {showWeeklyGoals && weeklyGoals && (
            <SectionShell glowColor="rgba(0,255,245,0.12)">
              <View style={styles.panelHeaderRow}>
                <View>
                  <Text style={[styles.panelKicker, styles.panelKickerCyan]}>CITYWIDE RUN</Text>
                  <Text style={styles.panelTitle}>Weekly Goals</Text>
                </View>
                <Text style={styles.panelMeta}>{weeklyGoals.goals.filter((g) => g.completed).length}/{weeklyGoals.goals.length}</Text>
              </View>
              {weeklyGoals.goals.map((goal, idx) => {
                const fillPct = Math.min(100, (goal.progress / goal.target) * 100);
                return (
                  <View key={idx} style={styles.weeklyGoalRow}>
                    <View style={styles.weeklyGoalInfo}>
                      <Text style={[styles.weeklyGoalLabel, goal.completed && styles.weeklyGoalLabelDone]}>{goal.completed ? '✓ ' : ''}{goal.description}</Text>
                      <Text style={styles.weeklyGoalProgress}>{goal.completed ? 'Complete' : `${goal.progress}/${goal.target}`}</Text>
                    </View>
                    <View style={styles.weeklyGoalBarTrack}>
                      <LinearGradient
                        colors={goal.completed ? [COLORS.green, COLORS.teal] : [COLORS.teal, '#00b0c7', COLORS.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.weeklyGoalBarFill, { width: `${Math.max(fillPct, 3)}%` }]}
                      />
                    </View>
                    {!goal.completed && <Text style={styles.weeklyGoalReward}>🪙 {goal.reward.coins}</Text>}
                  </View>
                );
              })}
              {weeklyGoals.goals.every((g) => g.completed) && (
                <LinearGradient colors={['rgba(255,215,0,0.20)', 'rgba(255,45,149,0.08)']} style={styles.weeklyBonusBanner}>
                  <Text style={styles.weeklyBonusText}>All weekly beats cleared. Bonus: 🪙{weeklyGoals.allCompleteBonus.coins} · 💎{weeklyGoals.allCompleteBonus.gems}</Text>
                </LinearGradient>
              )}
            </SectionShell>
          )}

          {showStreak && (
            <SectionShell glowColor="rgba(255,145,0,0.14)">
              <View style={styles.panelHeaderRow}>
                <View>
                  <Text style={[styles.panelKicker, styles.panelKickerGold]}>HEAT METER</Text>
                  <Text style={styles.panelTitle}>Streak Pulse</Text>
                </View>
                <Text style={styles.panelMeta}>Next milestone: {nextMilestone}</Text>
              </View>
              <View style={styles.streakBarRow}>
                <Text style={styles.streakCount}>{progress.currentStreak}</Text>
                <View style={styles.streakTrack}>
                  <LinearGradient colors={[COLORS.orange, '#ff5e00', COLORS.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.streakFill, { width: `${Math.max(streakProgress, 3)}%` }]} />
                </View>
                <Text style={styles.streakTarget}>{nextMilestone}</Text>
              </View>
            </SectionShell>
          )}

          {showDailyRewards && (
            <SectionShell glowColor="rgba(255,215,0,0.12)">
              <View style={styles.panelHeaderRow}>
                <View>
                  <Text style={[styles.panelKicker, styles.panelKickerGold]}>CHECK-IN CIRCUIT</Text>
                  <Text style={styles.panelTitle}>7-Day Rewards</Text>
                </View>
                <Text style={styles.panelMeta}>Day {currentRewardDay}</Text>
              </View>
              <View style={styles.loginRewardsRow}>
                {ECONOMY.loginRewards.map((reward) => {
                  const isPast = reward.day < currentRewardDay;
                  const isToday = reward.day === currentRewardDay;
                  return (
                    <LinearGradient
                      key={reward.day}
                      colors={
                        isToday
                          ? ['rgba(255,215,0,0.26)', 'rgba(255,45,149,0.12)']
                          : isPast
                            ? ['rgba(0,255,170,0.18)', 'rgba(0,255,170,0.06)']
                            : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']
                      }
                      style={[styles.loginDay, isPast && styles.loginDayClaimed, isToday && styles.loginDayToday]}
                    >
                      <Text style={[styles.loginDayNum, isToday && styles.loginDayNumToday]}>DAY {reward.day}</Text>
                      <Text style={styles.loginDayReward}>{isPast ? 'CLAIMED' : `🪙 ${reward.coins}`}</Text>
                      {'gems' in reward && reward.gems ? <Text style={styles.loginDayBonus}>💎 {reward.gems}</Text> : null}
                      {'rareTile' in reward && reward.rareTile ? <Text style={styles.loginDayBonus}>RARE DROP</Text> : null}
                    </LinearGradient>
                  );
                })}
              </View>
            </SectionShell>
          )}

          {recommendation && playerStage !== 'new' && (
            <Pressable style={({ pressed }) => [pressed && styles.buttonPressed]} onPress={recommendation.action}>
              <SectionShell glowColor="rgba(255,45,149,0.14)" style={styles.recommendShell}>
                <View style={styles.recommendCard}>
                  <Text style={styles.recommendIcon}>{recommendation.icon}</Text>
                  <View style={styles.recommendContent}>
                    <Text style={styles.recommendLabel}>CURATED FOR YOUR VIBE</Text>
                    <Text style={styles.recommendTitle}>{recommendation.title}</Text>
                    <Text style={styles.recommendSubtitle}>{recommendation.subtitle}</Text>
                  </View>
                  <Text style={styles.recommendArrow}>→</Text>
                </View>
              </SectionShell>
            </Pressable>
          )}

          {showQuickPlay && (
            <SectionShell glowColor="rgba(0,255,245,0.10)">
              <View style={styles.panelHeaderRow}>
                <View>
                  <Text style={[styles.panelKicker, styles.panelKickerCyan]}>PICK YOUR FREQUENCY</Text>
                  <Text style={styles.panelTitle}>Quick Play</Text>
                </View>
              </View>
              <View style={styles.quickPlayGrid}>
                {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map((difficulty) => (
                  <Pressable key={difficulty} style={({ pressed }) => [styles.quickPlayPressable, pressed && styles.buttonPressed]} onPress={() => onPlay(difficulty)}>
                    <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)']} style={styles.quickPlayCard}>
                      <View style={[styles.quickPlayIconBg, { backgroundColor: `${difficultyMeta[difficulty].accent}22`, borderColor: `${difficultyMeta[difficulty].accent}66` }]}>
                        <Text style={styles.quickPlayIcon}>{difficultyMeta[difficulty].icon}</Text>
                      </View>
                      <Text style={[styles.quickPlayTitle, { color: difficultyMeta[difficulty].accent }]}>{difficultyMeta[difficulty].label}</Text>
                      <Text style={styles.quickPlayDescription}>{difficultyMeta[difficulty].description}</Text>
                      <LinearGradient colors={[difficultyMeta[difficulty].accent, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.quickPlayAccentBar} />
                    </LinearGradient>
                  </Pressable>
                ))}
              </View>
            </SectionShell>
          )}

          <Pressable style={({ pressed }) => [styles.resetPressable, pressed && styles.buttonPressed]} onPress={onResetProgress}>
            <Text style={styles.resetText}>Reset progress</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

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
    paddingTop: 60,
    paddingBottom: 52,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 8, 36, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...SHADOWS.glow('rgba(0,255,245,0.25)'),
  },
  currencyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minWidth: 74,
    alignItems: 'center',
  },
  currencyLabel: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  shopButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    ...SHADOWS.glow(COLORS.accent),
  },
  shopButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shopButtonText: {
    color: '#fff',
    fontFamily: FONTS.display,
    fontSize: 13,
    letterSpacing: 0.8,
  },
  heroCard: {
    borderRadius: 32,
    padding: 24,
    marginBottom: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    ...SHADOWS.strong,
    shadowRadius: 30,
  },
  heroGlowPrimary: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,45,149,0.16)',
    top: -120,
    right: -80,
  },
  heroGlowSecondary: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(0,255,245,0.10)',
    bottom: 20,
    left: -90,
  },
  heroGlowTertiary: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,215,0,0.08)',
    top: 180,
    right: 20,
  },
  heroEyebrow: {
    color: COLORS.teal,
    fontFamily: FONTS.display,
    fontSize: 10,
    letterSpacing: 2.6,
    marginBottom: 10,
    textShadowColor: COLORS.tealGlow,
    textShadowRadius: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 44,
    fontFamily: FONTS.display,
    letterSpacing: 4,
    textShadowColor: 'rgba(255,255,255,0.16)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  titleBadge: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  titleBadgeText: {
    color: '#fff',
    fontSize: 28,
    fontFamily: FONTS.display,
    letterSpacing: 3,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 18,
    maxWidth: '94%',
  },
  heroTagRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  heroTag: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroTagText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1.6,
  },
  heroTagTextCyan: {
    color: COLORS.teal,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroStatValue: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontFamily: FONTS.display,
    marginBottom: 3,
    textShadowColor: 'rgba(255,255,255,0.08)',
    textShadowRadius: 4,
  },
  heroStatLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontFamily: FONTS.bodyBold,
  },
  primaryButton: {
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonLabel: {
    color: '#fff',
    fontSize: 11,
    textTransform: 'uppercase',
    fontFamily: FONTS.display,
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  primaryButtonSubLabel: {
    color: '#fff',
    fontSize: 22,
    fontFamily: FONTS.display,
  },
  primaryButtonArrow: {
    color: '#fff',
    fontSize: 28,
    fontFamily: FONTS.display,
  },
  dailyCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyDone: {
    borderColor: 'rgba(0,255,170,0.34)',
  },
  dailyContent: {
    flex: 1,
    paddingRight: 12,
  },
  dailyKicker: {
    color: COLORS.gold,
    fontSize: 10,
    fontFamily: FONTS.display,
    letterSpacing: 1.8,
    marginBottom: 5,
  },
  dailyTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontFamily: FONTS.bodyBold,
    marginBottom: 4,
  },
  dailySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  dailyBadge: {
    color: COLORS.gold,
    fontSize: 30,
    fontFamily: FONTS.display,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  sectionShell: {
    marginBottom: 14,
  },
  sectionGlow: {
    position: 'absolute',
    left: 22,
    right: 22,
    top: 6,
    height: 56,
    borderRadius: 28,
    opacity: 0.85,
  },
  sectionCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  sectionHighlight: {
    ...StyleSheet.absoluteFillObject,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  panelKicker: {
    color: COLORS.accent,
    fontSize: 10,
    fontFamily: FONTS.display,
    letterSpacing: 2,
    marginBottom: 4,
  },
  panelKickerCyan: {
    color: COLORS.teal,
  },
  panelKickerGold: {
    color: COLORS.gold,
  },
  panelTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
  },
  panelMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginTop: 4,
  },
  missionRow: {
    marginBottom: 12,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  missionLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    flex: 1,
  },
  missionLabelDone: {
    color: COLORS.green,
  },
  missionValue: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
  },
  missionBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  missionBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  weeklyGoalRow: {
    marginBottom: 12,
  },
  weeklyGoalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 12,
  },
  weeklyGoalLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    flex: 1,
  },
  weeklyGoalLabelDone: {
    color: COLORS.green,
  },
  weeklyGoalProgress: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  weeklyGoalBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: 4,
  },
  weeklyGoalBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  weeklyGoalReward: {
    color: COLORS.gold,
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    textAlign: 'right',
  },
  weeklyBonusBanner: {
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  weeklyBonusText: {
    color: COLORS.gold,
    fontSize: 13,
    fontFamily: FONTS.display,
    textAlign: 'center',
  },
  streakBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakCount: {
    color: COLORS.orange,
    fontSize: 24,
    fontFamily: FONTS.display,
    minWidth: 34,
    textAlign: 'center',
    textShadowColor: COLORS.orangeGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  streakTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  streakFill: {
    height: '100%',
    borderRadius: 999,
  },
  streakTarget: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    minWidth: 36,
    textAlign: 'center',
  },
  loginRewardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  loginDay: {
    width: 92,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  loginDayClaimed: {
    borderColor: 'rgba(0,255,170,0.28)',
  },
  loginDayToday: {
    borderColor: 'rgba(255,215,0,0.36)',
    ...SHADOWS.glow(COLORS.gold),
  },
  loginDayNum: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.display,
    fontSize: 10,
    marginBottom: 6,
    letterSpacing: 1,
  },
  loginDayNumToday: {
    color: COLORS.gold,
  },
  loginDayReward: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    marginBottom: 3,
  },
  loginDayBonus: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
  },
  recommendShell: {
    marginBottom: 14,
  },
  recommendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  recommendIcon: {
    fontSize: 34,
  },
  recommendContent: {
    flex: 1,
  },
  recommendLabel: {
    fontSize: 9,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    letterSpacing: 1.7,
    marginBottom: 4,
  },
  recommendTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  recommendSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  recommendArrow: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    color: COLORS.accent,
  },
  quickPlayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickPlayPressable: {
    width: '48%',
  },
  quickPlayCard: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    minHeight: 148,
  },
  quickPlayIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  quickPlayIcon: {
    fontSize: 22,
  },
  quickPlayTitle: {
    fontFamily: FONTS.display,
    fontSize: 15,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  quickPlayDescription: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 10,
  },
  quickPlayAccentBar: {
    width: '100%',
    height: 3,
    borderRadius: 999,
    opacity: 0.75,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  resetPressable: {
    alignSelf: 'center',
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resetText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    textDecorationLine: 'underline',
  },
});
