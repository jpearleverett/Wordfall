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

interface HomeScreenProps {
  progress: PlayerProgress;
  onPlay: (difficulty?: Difficulty) => void;
  onDaily: () => void;
  onResetProgress: () => void;
  onOpenShop?: () => void;
  onOpenSettings?: () => void;
}

export function HomeScreen({
  progress,
  onPlay,
  onDaily,
  onResetProgress,
  onOpenShop,
  onOpenSettings,
}: HomeScreenProps) {
  const titleAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(titleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(buttonsAnim, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const titleScale = titleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const buttonsTranslate = buttonsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });

  const today = new Date().toISOString().split('T')[0];
  const dailyDone = progress.dailyCompleted.includes(today);

  const totalStars = Object.values(progress.starsByLevel).reduce(
    (a, b) => a + b,
    0
  );

  // Determine streak milestone
  const nextMilestone = [7, 14, 30, 60, 100].find(m => m > progress.currentStreak) || 100;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Top actions */}
      <View style={styles.topBar}>
        {onOpenSettings && (
          <Pressable style={styles.iconButton} onPress={onOpenSettings}>
            <Text style={styles.iconButtonText}>⚙</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }} />
        {onOpenShop && (
          <Pressable style={styles.iconButton} onPress={onOpenShop}>
            <Text style={styles.iconButtonText}>🛒</Text>
          </Pressable>
        )}
      </View>

      {/* Title */}
      <Animated.View
        style={[styles.titleContainer, { transform: [{ scale: titleScale }] }]}
      >
        <Text style={styles.title}>WORD</Text>
        <Text style={styles.titleAccent}>FALL</Text>
        <Text style={styles.subtitle}>Strategic Word Puzzle</Text>
      </Animated.View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>★ {totalStars}</Text>
          <Text style={styles.statLabel}>Stars</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{progress.puzzlesSolved}</Text>
          <Text style={styles.statLabel}>Solved</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, progress.currentStreak >= 7 && styles.streakHighlight]}>
            {progress.currentStreak}
          </Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{progress.highestLevel}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
      </View>

      {/* Streak progress */}
      {progress.currentStreak > 0 && (
        <View style={styles.streakBar}>
          <Text style={styles.streakText}>
            🔥 {progress.currentStreak} day streak! Next milestone: {nextMilestone} days
          </Text>
          <View style={styles.streakProgress}>
            <View
              style={[
                styles.streakProgressInner,
                { width: `${Math.min(100, (progress.currentStreak / nextMilestone) * 100)}%` },
              ]}
            />
          </View>
        </View>
      )}

      {/* Daily Login Rewards */}
      <View style={styles.loginRewardsContainer}>
        <Text style={styles.loginRewardsTitle}>DAILY REWARDS</Text>
        <View style={styles.loginRewardsRow}>
          {ECONOMY.loginRewards.map((reward, idx) => {
            const day = idx + 1;
            const isClaimed = progress.currentStreak > idx;
            const isToday = progress.currentStreak === idx;
            return (
              <View
                key={day}
                style={[
                  styles.loginDay,
                  isClaimed && styles.loginDayClaimed,
                  isToday && styles.loginDayToday,
                ]}
              >
                <Text style={[
                  styles.loginDayNum,
                  isClaimed && styles.loginDayNumClaimed,
                  isToday && styles.loginDayNumToday,
                ]}>
                  D{day}
                </Text>
                <Text style={styles.loginDayReward}>
                  {isClaimed ? '✓' : `🪙${reward.coins}`}
                </Text>
                {(reward as any).gems && !isClaimed && (
                  <Text style={styles.loginDayBonus}>💎{(reward as any).gems}</Text>
                )}
                {(reward as any).rareTile && !isClaimed && (
                  <Text style={styles.loginDayBonus}>🎁</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <Animated.View
        style={{
          transform: [{ translateY: buttonsTranslate }],
          opacity: buttonsAnim,
          width: '100%',
        }}
      >
        {/* Play button */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.playButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => onPlay()}
        >
          <Text style={styles.playButtonText}>
            ▶  PLAY LEVEL {progress.currentLevel}
          </Text>
        </Pressable>

        {/* Daily Challenge */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.dailyButton,
            dailyDone && styles.dailyDone,
            pressed && styles.buttonPressed,
          ]}
          onPress={onDaily}
        >
          <Text style={styles.dailyButtonText}>
            {dailyDone ? '✓  DAILY COMPLETE' : '☀  DAILY CHALLENGE'}
          </Text>
          {!dailyDone && (
            <Text style={styles.dailyReward}>+{ECONOMY.dailyCompleteCoins} coins</Text>
          )}
        </Pressable>

        {/* Difficulty quick picks */}
        <Text style={styles.sectionTitle}>QUICK PLAY</Text>
        <View style={styles.difficultyRow}>
          {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map(
            diff => (
              <Pressable
                key={diff}
                style={({ pressed }) => [
                  styles.diffButton,
                  styles[`diff_${diff}` as keyof typeof styles] as any,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => onPlay(diff)}
              >
                <Text style={styles.diffText}>{diff.toUpperCase()}</Text>
              </Pressable>
            )
          )}
        </View>

        {/* How to play */}
        <View style={styles.howToPlay}>
          <Text style={styles.howTitle}>HOW TO PLAY</Text>
          <Text style={styles.howText}>
            Find words in the grid by tapping letters in order.
          </Text>
          <Text style={styles.howText}>
            When you clear a word, letters above fall down.
          </Text>
          <Text style={[styles.howText, styles.howHighlight]}>
            The order you solve words matters — plan ahead!
          </Text>
        </View>

        {/* Reset (small, at bottom) */}
        <Pressable style={styles.resetButton} onPress={onResetProgress}>
          <Text style={styles.resetText}>Reset Progress</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonText: {
    fontSize: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 12,
  },
  titleAccent: {
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 12,
    marginTop: -10,
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    letterSpacing: 4,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    width: '100%',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  streakHighlight: {
    color: COLORS.coral,
    textShadowColor: COLORS.coralGlow,
    textShadowRadius: 8,
  },
  streakBar: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.coral,
  },
  streakText: {
    color: COLORS.coral,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  streakProgress: {
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  streakProgressInner: {
    height: '100%',
    backgroundColor: COLORS.coral,
    borderRadius: 3,
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  playButton: {
    backgroundColor: COLORS.accent,
    elevation: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  playButtonText: {
    color: COLORS.bg,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
  },
  dailyButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  dailyDone: {
    borderColor: COLORS.green,
    opacity: 0.7,
  },
  dailyButtonText: {
    color: COLORS.gold,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
  },
  dailyReward: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 16,
    marginBottom: 10,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  diffButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
  },
  diff_easy: { borderBottomWidth: 3, borderBottomColor: COLORS.green },
  diff_medium: { borderBottomWidth: 3, borderBottomColor: COLORS.accent },
  diff_hard: { borderBottomWidth: 3, borderBottomColor: COLORS.coral },
  diff_expert: { borderBottomWidth: 3, borderBottomColor: COLORS.purple },
  diffText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  howToPlay: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 20,
  },
  howTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  howText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
    textAlign: 'center',
  },
  howHighlight: {
    color: COLORS.accent,
    fontWeight: '700',
    marginTop: 4,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  loginRewardsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  loginRewardsTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 12,
  },
  loginRewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loginDay: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 10,
    backgroundColor: COLORS.bgLight,
    minWidth: 40,
    flex: 1,
    marginHorizontal: 2,
  },
  loginDayClaimed: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  loginDayToday: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  loginDayNum: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
  },
  loginDayNumClaimed: {
    color: COLORS.green,
  },
  loginDayNumToday: {
    color: COLORS.accent,
  },
  loginDayReward: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  loginDayBonus: {
    fontSize: 8,
    color: COLORS.gold,
    marginTop: 1,
  },
  resetButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  resetText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});
