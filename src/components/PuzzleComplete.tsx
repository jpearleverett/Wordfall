import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, ECONOMY, GRADIENTS, RADII, SHADOWS, SPACING, TYPOGRAPHY } from '../constants';
import { GameMode } from '../types';

interface PuzzleCompleteProps {
  score: number;
  moves: number;
  stars: number;
  combo: number;
  level: number;
  isDaily: boolean;
  mode?: GameMode;
  perfectRun?: boolean;
  onNextLevel: () => void;
  onHome: () => void;
  onRetry: () => void;
}

function Star({ filled, delay, size }: { filled: boolean; delay: number; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (filled) {
      Animated.sequence([
        Animated.delay(delay),
        Animated.spring(anim, {
          toValue: 1,
          friction: 4,
          tension: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [anim, delay, filled]);

  const scale = anim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.3, 1.25, 1],
  });

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: filled ? 1 : 0.22 }}>
      <LinearGradient colors={GRADIENTS.gold} style={[styles.starWrap, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={styles.star}>★</Text>
      </LinearGradient>
    </Animated.View>
  );
}

export function PuzzleComplete({
  score,
  moves,
  stars,
  combo,
  level,
  isDaily,
  mode = 'classic',
  perfectRun = false,
  onNextLevel,
  onHome,
  onRetry,
}: PuzzleCompleteProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const perfectAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    if (perfectRun) {
      Animated.sequence([
        Animated.delay(900),
        Animated.spring(perfectAnim, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [fadeAnim, perfectAnim, perfectRun, slideAnim]);

  const getTitle = () => {
    if (isDaily) return 'Daily conquered';
    if (perfectRun) return 'Perfect clear';
    switch (mode) {
      case 'cascade': return 'Cascade mastered';
      case 'expert': return 'Expert cleared';
      case 'timePressure': return 'Clock defeated';
      case 'perfectSolve': return 'Flawless victory';
      default: return 'Puzzle cleared';
    }
  };

  const difficulty = level <= 5 ? 'easy' : level <= 15 ? 'medium' : level <= 30 ? 'hard' : 'expert';
  const coinReward = ECONOMY.puzzleCompleteCoins[difficulty] + (stars * ECONOMY.starBonus);

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <View style={styles.sparkA} />
      <View style={styles.sparkB} />
      <Animated.View style={[styles.cardShell, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={GRADIENTS.panel} style={styles.card}>
          <Text style={styles.kicker}>Stage complete</Text>
          <Text style={[styles.title, perfectRun && styles.titlePerfect]}>{getTitle()}</Text>
          <Text style={styles.subtitle}>Your board control was clean, strategic, and satisfying.</Text>

          <View style={styles.starsRow}>
            <Star filled={stars >= 1} delay={200} size={52} />
            <Star filled={stars >= 2} delay={420} size={64} />
            <Star filled={stars >= 3} delay={640} size={52} />
          </View>

          {perfectRun && (
            <Animated.View style={[styles.perfectBadge, { transform: [{ scale: perfectAnim }] }]}>
              <Text style={styles.perfectText}>✦ PERFECT RUN</Text>
            </Animated.View>
          )}

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{score}</Text>
              <Text style={styles.statLabel}>Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{moves}</Text>
              <Text style={styles.statLabel}>Moves</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{combo}×</Text>
              <Text style={styles.statLabel}>Best chain</Text>
            </View>
          </View>

          <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']} style={styles.rewardsRow}>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardIcon}>🪙</Text>
              <Text style={styles.rewardValue}>+{coinReward}</Text>
            </View>
            {perfectRun && (
              <View style={styles.rewardItem}>
                <Text style={styles.rewardIcon}>💎</Text>
                <Text style={styles.rewardValue}>+{ECONOMY.perfectClearGems}</Text>
              </View>
            )}
            <View style={styles.rewardItem}>
              <Text style={styles.rewardIcon}>★</Text>
              <Text style={styles.rewardValue}>+{stars}</Text>
            </View>
          </LinearGradient>

          <View style={styles.buttons}>
            {!isDaily && mode !== 'endless' && (
              <Pressable style={styles.primaryButton} onPress={onNextLevel}>
                <LinearGradient colors={GRADIENTS.accent} style={styles.primaryButtonFill}>
                  <Text style={styles.primaryButtonText}>Next level</Text>
                </LinearGradient>
              </Pressable>
            )}

            <View style={styles.secondaryRow}>
              <Pressable style={styles.secondaryButton} onPress={onRetry}>
                <Text style={styles.secondaryButtonText}>Retry</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={onHome}>
                <Text style={styles.secondaryButtonText}>Home</Text>
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 6, 18, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
    zIndex: 100,
  },
  sparkA: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: COLORS.accentGlow,
    top: '18%',
    left: '10%',
  },
  sparkB: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: COLORS.goldGlow,
    bottom: '16%',
    right: '8%',
  },
  cardShell: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    borderRadius: RADII.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    ...SHADOWS.card,
  },
  kicker: {
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2.2,
    fontSize: 11,
    fontFamily: TYPOGRAPHY.ui,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 30,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: TYPOGRAPHY.display,
  },
  titlePerfect: {
    color: COLORS.gold,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 14,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: SPACING.xl,
    fontFamily: TYPOGRAPHY.ui,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  starWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.gold,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  star: {
    color: COLORS.textOnAccent,
    fontSize: 26,
  },
  perfectBadge: {
    backgroundColor: 'rgba(255,207,90,0.14)',
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    marginBottom: SPACING.lg,
  },
  perfectText: {
    color: COLORS.gold,
    fontSize: 12,
    letterSpacing: 1.8,
    fontFamily: TYPOGRAPHY.display,
  },
  statsGrid: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADII.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    color: COLORS.accentStrong,
    fontSize: 24,
    fontFamily: TYPOGRAPHY.display,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: TYPOGRAPHY.ui,
  },
  rewardsRow: {
    width: '100%',
    borderRadius: RADII.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardIcon: {
    fontSize: 16,
  },
  rewardValue: {
    color: COLORS.gold,
    fontSize: 15,
    fontFamily: TYPOGRAPHY.display,
  },
  buttons: {
    width: '100%',
    gap: SPACING.md,
  },
  primaryButton: {
    borderRadius: RADII.md,
    overflow: 'hidden',
  },
  primaryButtonFill: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.textOnAccent,
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontFamily: TYPOGRAPHY.display,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.ui,
  },
});
