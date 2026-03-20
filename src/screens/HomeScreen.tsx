import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS, ECONOMY } from '../constants';
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

const difficultyMeta: Record<Difficulty, { label: string; accent: string; blurb: string }> = {
  easy: { label: 'Easy', accent: COLORS.green, blurb: 'Warm-up boards with flexible solutions.' },
  medium: { label: 'Medium', accent: COLORS.accent, blurb: 'Balanced strategy with visible gravity pivots.' },
  hard: { label: 'Hard', accent: COLORS.orange, blurb: 'Tighter routes and sharper consequences.' },
  expert: { label: 'Expert', accent: COLORS.purple, blurb: 'Minimal margin for error and deeper planning.' },
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
              <View style={styles.currencyChip}>
                <Text style={styles.currencyLabel}>🪙 {currencies.coins}</Text>
              </View>
              <View style={styles.currencyChip}>
                <Text style={styles.currencyLabel}>💎 {currencies.gems}</Text>
              </View>
              <View style={styles.currencyChip}>
                <Text style={styles.currencyLabel}>💡 {currencies.hintTokens}</Text>
              </View>
            </>
          )}
          {onOpenShop && (
            <Pressable style={styles.shopButton} onPress={onOpenShop}>
              <Text style={styles.shopButtonText}>Shop</Text>
            </Pressable>
          )}
        </View>
      </View>

      <Animated.View
        style={[
          styles.heroCard,
          {
            opacity: titleAnim,
            transform: [{ translateY: heroTranslate }, { scale: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
          },
        ]}
      >
        <View style={styles.heroGlowPrimary} />
        <View style={styles.heroGlowSecondary} />
        <Text style={styles.heroEyebrow}>Premium strategy word puzzle</Text>
        <Text style={styles.title}>WORD<Text style={styles.titleAccent}>FALL</Text></Text>
        <Text style={styles.subtitle}>
          Every word changes the board. Predict the collapse, sequence the clears, and restore Chapter {currentChapter} of the library.
        </Text>
        <HomeHeroIllustration />

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>★ {totalStars}</Text>
            <Text style={styles.heroStatLabel}>Stars</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{progress.puzzlesSolved}</Text>
            <Text style={styles.heroStatLabel}>Solved</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>🔥 {progress.currentStreak}</Text>
            <Text style={styles.heroStatLabel}>Streak</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          onPress={() => onPlay()}
        >
          <View>
            <Text style={styles.primaryButtonLabel}>Continue journey</Text>
            <Text style={styles.primaryButtonSubLabel}>Play Level {progress.currentLevel}</Text>
          </View>
          <Text style={styles.primaryButtonArrow}>→</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.dailyCard, dailyDone && styles.dailyDone, pressed && styles.buttonPressed]}
          onPress={onDaily}
        >
          <View>
            <Text style={styles.dailyTitle}>{dailyDone ? 'Daily puzzle completed' : 'Today’s daily challenge'}</Text>
            <Text style={styles.dailySubtitle}>
              {dailyDone ? 'Come back tomorrow for a fresh shared board.' : `Shared puzzle • +${ECONOMY.dailyCompleteCoins} coins • same challenge for everyone`}
            </Text>
          </View>
          <Text style={styles.dailyBadge}>{dailyDone ? '✓' : '☀'}</Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={{ opacity: contentAnim, transform: [{ translateY: contentTranslate }] }}
      >
        <View style={styles.streakPanel}>
          <View style={styles.panelHeaderRow}>
            <Text style={styles.panelTitle}>Streak momentum</Text>
            <Text style={styles.panelMeta}>Next milestone: {nextMilestone} days</Text>
          </View>
          <Text style={styles.streakText}>
            Keep solving daily boards to earn richer rewards, comeback protection, and chapter pacing bonuses.
          </Text>
          <View style={styles.streakTrack}>
            <View style={[styles.streakFill, { width: `${streakProgress}%` }]} />
          </View>
        </View>

        <View style={styles.rewardsPanel}>
          <View style={styles.panelHeaderRow}>
            <Text style={styles.panelTitle}>7-day reward cycle</Text>
            <Text style={styles.panelMeta}>Day {currentRewardDay}</Text>
          </View>
          <View style={styles.loginRewardsRow}>
            {ECONOMY.loginRewards.map((reward) => {
              const isPast = reward.day < currentRewardDay;
              const isToday = reward.day === currentRewardDay;
              return (
                <View
                  key={reward.day}
                  style={[
                    styles.loginDay,
                    isPast && styles.loginDayClaimed,
                    isToday && styles.loginDayToday,
                  ]}
                >
                  <Text style={[styles.loginDayNum, isToday && styles.loginDayNumToday]}>D{reward.day}</Text>
                  <Text style={styles.loginDayReward}>{isPast ? '✓' : `🪙${reward.coins}`}</Text>
                  {'gems' in reward && reward.gems ? <Text style={styles.loginDayBonus}>💎{reward.gems}</Text> : null}
                  {'rareTile' in reward && reward.rareTile ? <Text style={styles.loginDayBonus}>✨ Tile</Text> : null}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.quickPlayPanel}>
          <Text style={styles.panelTitle}>Quick play</Text>
          {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map((difficulty) => (
            <Pressable
              key={difficulty}
              style={({ pressed }) => [styles.quickPlayCard, pressed && styles.buttonPressed]}
              onPress={() => onPlay(difficulty)}
            >
              <View style={[styles.quickPlayAccent, { backgroundColor: difficultyMeta[difficulty].accent }]} />
              <View style={styles.quickPlayBody}>
                <Text style={styles.quickPlayTitle}>{difficultyMeta[difficulty].label}</Text>
                <Text style={styles.quickPlayBlurb}>{difficultyMeta[difficulty].blurb}</Text>
              </View>
              <Text style={styles.quickPlayAction}>Play</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.strategyPanel}>
          <Text style={styles.panelTitle}>Master the board</Text>
          <View style={styles.strategyStep}>
            <Text style={styles.strategyNumber}>1</Text>
            <Text style={styles.strategyText}>Find a target word, but do not rush — the best first move is the one that unlocks the most future paths.</Text>
          </View>
          <View style={styles.strategyStep}>
            <Text style={styles.strategyNumber}>2</Text>
            <Text style={styles.strategyText}>Watch how gravity drops letters after every clear. Good solves create chains instead of chaos.</Text>
          </View>
          <View style={styles.strategyStep}>
            <Text style={styles.strategyNumber}>3</Text>
            <Text style={styles.strategyText}>Use hints and preview tools sparingly. The goal is to build your own board-reading intuition.</Text>
          </View>
        </View>

        <Pressable style={styles.resetButton} onPress={onResetProgress}>
          <Text style={styles.resetText}>Reset Progress</Text>
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
    paddingTop: 16,
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
  },
  iconButtonText: {
    fontSize: 20,
  },
  currencyChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  currencyLabel: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  shopButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  shopButtonText: {
    color: COLORS.bg,
    fontWeight: '800',
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 30,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    overflow: 'hidden',
  },
  heroGlowPrimary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.accentGlow,
    top: -80,
    right: -30,
  },
  heroGlowSecondary: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.purpleGlow,
    bottom: -70,
    left: -30,
  },
  heroEyebrow: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  titleAccent: {
    color: COLORS.accent,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 20,
    maxWidth: '92%',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  heroStatValue: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroStatLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonLabel: {
    color: COLORS.bg,
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  primaryButtonSubLabel: {
    color: COLORS.bg,
    fontSize: 22,
    fontWeight: '900',
  },
  primaryButtonArrow: {
    color: COLORS.bg,
    fontSize: 26,
    fontWeight: '900',
  },
  dailyCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyDone: {
    borderColor: COLORS.green,
    backgroundColor: 'rgba(76, 175, 80, 0.16)',
  },
  dailyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  dailySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: '88%',
  },
  dailyBadge: {
    color: COLORS.gold,
    fontSize: 26,
    fontWeight: '800',
  },
  streakPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    marginBottom: 16,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  panelTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  panelMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  streakText: {
    color: COLORS.textSecondary,
    lineHeight: 21,
    fontSize: 14,
    marginBottom: 12,
  },
  streakTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.bgLight,
    overflow: 'hidden',
  },
  streakFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.orange,
  },
  rewardsPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    marginBottom: 16,
  },
  loginRewardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  loginDay: {
    width: '22%',
    minWidth: 72,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    alignItems: 'center',
  },
  loginDayClaimed: {
    borderColor: COLORS.green,
    backgroundColor: 'rgba(76, 175, 80, 0.14)',
  },
  loginDayToday: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255, 215, 0, 0.14)',
  },
  loginDayNum: {
    color: COLORS.textPrimary,
    fontWeight: '800',
    marginBottom: 8,
  },
  loginDayNumToday: {
    color: COLORS.gold,
  },
  loginDayReward: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  loginDayBonus: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  quickPlayPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    marginBottom: 16,
  },
  quickPlayCard: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 20,
    marginBottom: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  quickPlayAccent: {
    width: 5,
    alignSelf: 'stretch',
  },
  quickPlayBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  quickPlayTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  quickPlayBlurb: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  quickPlayAction: {
    color: COLORS.accent,
    fontWeight: '800',
    paddingHorizontal: 16,
  },
  strategyPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    marginBottom: 20,
  },
  strategyStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  strategyNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accentGlow,
    color: COLORS.accent,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '800',
    marginRight: 12,
  },
  strategyText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  resetButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  resetText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.88,
  },
});
