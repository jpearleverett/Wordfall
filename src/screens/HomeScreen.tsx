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
import { COLORS, ECONOMY, GRADIENTS, SHADOWS } from '../constants';
import { Difficulty, PlayerProgress } from '../types';
import { soundManager } from '../services/sound';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { HomeHeroIllustration } from '../components/common/HeroIllustrations';

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
}

const difficultyMeta: Record<Difficulty, { label: string; accent: string; icon: string }> = {
  easy: { label: 'Easy', accent: COLORS.green, icon: '🌱' },
  medium: { label: 'Medium', accent: COLORS.accent, icon: '⚡' },
  hard: { label: 'Hard', accent: COLORS.orange, icon: '🔥' },
  expert: { label: 'Expert', accent: COLORS.purple, icon: '💎' },
};

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
}: HomeScreenProps) {
  const titleAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(titleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(contentAnim, {
        toValue: 1,
        friction: 7,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentAnim, titleAnim]);

  useEffect(() => {
    void soundManager.playMusic('menu');
  }, []);

  const heroTranslate = titleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });

  const contentTranslate = contentAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [48, 0],
  });

  const today = new Date().toISOString().split('T')[0];
  const dailyDone = progress.dailyCompleted.includes(today);
  const totalStars = Object.values(progress.starsByLevel).reduce((a, b) => a + b, 0);
  const nextMilestone = [7, 14, 30, 60, 100].find((milestone) => milestone > progress.currentStreak) || 100;
  const streakProgress = Math.min(100, (progress.currentStreak / nextMilestone) * 100);
  const currentRewardDay = ((loginCycleDay - 1) % 7) + 1;

  return (
    <View style={styles.container}>
      <AmbientBackdrop variant="home" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        {onOpenSettings && (
          <Pressable style={styles.iconButton} onPress={onOpenSettings}>
            <Text style={styles.iconButtonText}>⚙</Text>
          </Pressable>
        )}
        <View style={styles.topBarRight}>
          {currencies && (
            <>
              <LinearGradient
                colors={GRADIENTS.surfaceCard}
                style={styles.currencyChip}
              >
                <Text style={styles.currencyLabel}>🪙 {currencies.coins}</Text>
              </LinearGradient>
              <LinearGradient
                colors={GRADIENTS.surfaceCard}
                style={styles.currencyChip}
              >
                <Text style={styles.currencyLabel}>💎 {currencies.gems}</Text>
              </LinearGradient>
              <LinearGradient
                colors={GRADIENTS.surfaceCard}
                style={styles.currencyChip}
              >
                <Text style={styles.currencyLabel}>💡 {currencies.hintTokens}</Text>
              </LinearGradient>
            </>
          )}
          {onOpenShop && (
            <Pressable onPress={onOpenShop}>
              <LinearGradient
                colors={GRADIENTS.button.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shopButton}
              >
                <Text style={styles.shopButtonText}>Shop</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </View>

      <Animated.View
        style={[
          {
            opacity: titleAnim,
            transform: [{ translateY: heroTranslate }, { scale: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
          },
        ]}
      >
        <LinearGradient
          colors={GRADIENTS.surfaceCard}
          style={styles.heroCard}
        >
          <View style={styles.heroGlowPrimary} />
          <View style={styles.heroGlowSecondary} />
          <Text style={styles.heroEyebrow}>Premium strategy word puzzle</Text>
          <Text style={styles.title}>WORD<Text style={styles.titleAccent}>FALL</Text></Text>
          <Text style={styles.subtitle}>
            Every word changes the board. Restore Chapter {currentChapter} of the library.
          </Text>
          <HomeHeroIllustration />

          <View style={styles.heroStatsRow}>
            {[
              { value: `★ ${totalStars}`, label: 'Stars' },
              { value: `${progress.puzzlesSolved}`, label: 'Solved' },
              { value: `🔥 ${progress.currentStreak}`, label: 'Streak' },
            ].map((stat) => (
              <LinearGradient
                key={stat.label}
                colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                style={styles.heroStatCard}
              >
                <Text style={styles.heroStatValue}>{stat.value}</Text>
                <Text style={styles.heroStatLabel}>{stat.label}</Text>
              </LinearGradient>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={() => onPlay()}
          >
            <LinearGradient
              colors={GRADIENTS.button.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.primaryButton, SHADOWS.glow(COLORS.accent)]}
            >
              <View>
                <Text style={styles.primaryButtonLabel}>Continue journey</Text>
                <Text style={styles.primaryButtonSubLabel}>Play Level {progress.currentLevel}</Text>
              </View>
              <Text style={styles.primaryButtonArrow}>→</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={onDaily}
          >
            <LinearGradient
              colors={dailyDone ? ['rgba(76,175,80,0.2)', 'rgba(76,175,80,0.08)'] : ['rgba(255,215,0,0.12)', 'rgba(255,159,67,0.06)']}
              style={[styles.dailyCard, dailyDone && styles.dailyDone]}
            >
              <View style={styles.dailyContent}>
                <Text style={styles.dailyTitle}>{dailyDone ? 'Daily completed' : "Today's challenge"}</Text>
                <Text style={styles.dailySubtitle}>
                  {dailyDone ? 'Come back tomorrow!' : `+${ECONOMY.dailyCompleteCoins} coins`}
                </Text>
              </View>
              <Text style={styles.dailyBadge}>{dailyDone ? '✓' : '☀'}</Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </Animated.View>

      <Animated.View
        style={{ opacity: contentAnim, transform: [{ translateY: contentTranslate }] }}
      >
        <LinearGradient
          colors={GRADIENTS.surfaceCard}
          style={[styles.streakPanel, SHADOWS.medium]}
        >
          <View style={styles.panelHeaderRow}>
            <Text style={styles.panelTitle}>🔥 Streak</Text>
            <Text style={styles.panelMeta}>Next: {nextMilestone} days</Text>
          </View>
          <View style={styles.streakBarRow}>
            <Text style={styles.streakCount}>{progress.currentStreak}</Text>
            <View style={styles.streakTrack}>
              <LinearGradient
                colors={[COLORS.orange, '#ff6b35']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.streakFill, { width: `${Math.max(streakProgress, 2)}%` }]}
              />
            </View>
            <Text style={styles.streakTarget}>{nextMilestone}</Text>
          </View>
        </LinearGradient>

        <LinearGradient
          colors={GRADIENTS.surfaceCard}
          style={[styles.rewardsPanel, SHADOWS.medium]}
        >
          <View style={styles.panelHeaderRow}>
            <Text style={styles.panelTitle}>7-day rewards</Text>
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
                      ? ['rgba(255,215,0,0.22)', 'rgba(255,159,0,0.10)']
                      : isPast
                        ? ['rgba(76,175,80,0.18)', 'rgba(76,175,80,0.06)']
                        : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']
                  }
                  style={[
                    styles.loginDay,
                    isPast && styles.loginDayClaimed,
                    isToday && styles.loginDayToday,
                  ]}
                >
                  <Text style={[styles.loginDayNum, isToday && styles.loginDayNumToday]}>{reward.day}</Text>
                  <Text style={styles.loginDayReward}>{isPast ? '✓' : `🪙${reward.coins}`}</Text>
                  {'gems' in reward && reward.gems ? <Text style={styles.loginDayBonus}>💎{reward.gems}</Text> : null}
                  {'rareTile' in reward && reward.rareTile ? <Text style={styles.loginDayBonus}>✨</Text> : null}
                </LinearGradient>
              );
            })}
          </View>
        </LinearGradient>

        <LinearGradient
          colors={GRADIENTS.surfaceCard}
          style={[styles.quickPlayPanel, SHADOWS.medium]}
        >
          <Text style={styles.panelTitle}>Quick play</Text>
          <View style={styles.quickPlayGrid}>
            {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map((difficulty) => (
              <Pressable
                key={difficulty}
                style={({ pressed }) => [pressed && styles.buttonPressed]}
                onPress={() => onPlay(difficulty)}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
                  style={[styles.quickPlayCard, SHADOWS.soft]}
                >
                  <View style={[styles.quickPlayIconBg, { backgroundColor: difficultyMeta[difficulty].accent + '22' }]}>
                    <Text style={styles.quickPlayIcon}>{difficultyMeta[difficulty].icon}</Text>
                  </View>
                  <Text style={[styles.quickPlayTitle, { color: difficultyMeta[difficulty].accent }]}>
                    {difficultyMeta[difficulty].label}
                  </Text>
                  <View style={[styles.quickPlayAccentBar, { backgroundColor: difficultyMeta[difficulty].accent }]} />
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </LinearGradient>
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
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...SHADOWS.soft,
  },
  iconButtonText: {
    fontSize: 20,
  },
  currencyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  currencyLabel: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  shopButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    ...SHADOWS.glow(COLORS.accent),
  },
  shopButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    ...SHADOWS.strong,
  },
  heroGlowPrimary: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(0,212,255,0.08)',
    top: -100,
    right: -50,
  },
  heroGlowSecondary: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(168,85,247,0.06)',
    bottom: -80,
    left: -40,
  },
  heroEyebrow: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 8,
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleAccent: {
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
    maxWidth: '90%',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  heroStatValue: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroStatLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  primaryButton: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonLabel: {
    color: '#fff',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  primaryButtonSubLabel: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  primaryButtonArrow: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  dailyCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyDone: {
    borderColor: 'rgba(76,175,80,0.3)',
  },
  dailyContent: {
    flex: 1,
  },
  dailyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  dailySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  dailyBadge: {
    color: COLORS.gold,
    fontSize: 24,
    fontWeight: '800',
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  streakPanel: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  panelTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  panelMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  streakBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakCount: {
    color: COLORS.orange,
    fontSize: 22,
    fontWeight: '900',
    minWidth: 28,
    textAlign: 'center',
    textShadowColor: COLORS.orangeGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  streakTrack: {
    flex: 1,
    height: 8,
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
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  rewardsPanel: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  loginRewardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  loginDay: {
    width: 70,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  loginDayClaimed: {
    borderColor: 'rgba(76,175,80,0.3)',
  },
  loginDayToday: {
    borderColor: 'rgba(255,215,0,0.35)',
    ...SHADOWS.glow(COLORS.gold),
  },
  loginDayNum: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 12,
    marginBottom: 4,
  },
  loginDayNumToday: {
    color: COLORS.gold,
  },
  loginDayReward: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  loginDayBonus: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  quickPlayPanel: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  quickPlayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  quickPlayCard: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    minWidth: 150,
    flex: 1,
  },
  quickPlayIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickPlayIcon: {
    fontSize: 20,
  },
  quickPlayTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  quickPlayAccentBar: {
    width: 24,
    height: 3,
    borderRadius: 999,
    opacity: 0.6,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },
});
