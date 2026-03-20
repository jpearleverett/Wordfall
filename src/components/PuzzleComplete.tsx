import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS, ECONOMY } from '../constants';
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

function ConfettiParticle({ delay, color, startX }: { delay: number; color: string; startX: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1,
          duration: 2200 + Math.random() * 900,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(swayAnim, {
              toValue: 1,
              duration: 380 + Math.random() * 260,
              useNativeDriver: true,
            }),
            Animated.timing(swayAnim, {
              toValue: -1,
              duration: 380 + Math.random() * 260,
              useNativeDriver: true,
            }),
          ]),
        ),
      ]),
    ]).start();
  }, [anim, delay, swayAnim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-80, 560] });
  const translateX = swayAnim.interpolate({ inputRange: [-1, 1], outputRange: [-22, 22] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${320 + Math.random() * 260}deg`] });
  const opacity = anim.interpolate({ inputRange: [0, 0.08, 0.75, 1], outputRange: [0, 1, 1, 0] });

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          left: startX,
          backgroundColor: color,
          width: 8 + Math.random() * 8,
          height: 8 + Math.random() * 12,
          borderRadius: Math.random() > 0.5 ? 10 : 3,
          opacity,
          transform: [{ translateY }, { translateX }, { rotate }],
        },
      ]}
    />
  );
}

function AnimatedScore({ targetScore }: { targetScore: number }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 36;
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      const progress = step / steps;
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(targetScore * easedProgress));
      if (step >= steps) {
        setDisplayScore(targetScore);
        clearInterval(interval);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [targetScore]);

  return <Text style={styles.scoreValue}>{displayScore.toLocaleString()}</Text>;
}

function Star({ filled, delay, size }: { filled: boolean; delay: number; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!filled) return;
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(anim, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [anim, delay, filled]);

  return (
    <Animated.Text
      style={[
        styles.star,
        {
          fontSize: size,
          opacity: filled ? 1 : 0.25,
          transform: [
            { scale: anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1.28, 1] }) },
            { rotate: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '-12deg', '0deg'] }) },
          ],
        },
      ]}
    >
      ★
    </Animated.Text>
  );
}

const CONFETTI_COLORS = [
  COLORS.accent,
  COLORS.gold,
  COLORS.green,
  COLORS.coral,
  COLORS.purple,
  COLORS.orange,
  COLORS.teal,
  '#ffffff',
];

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
  const cardAnim = useRef(new Animated.Value(30)).current;
  const ribbonAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.spring(cardAnim, {
          toValue: 0,
          friction: 7,
          tension: 90,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(ribbonAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(statsAnim, {
        toValue: 1,
        friction: 6,
        tension: 85,
        useNativeDriver: true,
      }),
      Animated.spring(actionsAnim, {
        toValue: 1,
        friction: 6,
        tension: 85,
        useNativeDriver: true,
      }),
    ]).start();
  }, [actionsAnim, cardAnim, fadeAnim, ribbonAnim, statsAnim]);

  const title = useMemo(() => {
    if (isDaily) return 'Daily Triumph';
    if (perfectRun) return 'Perfect Clear';
    if (mode === 'cascade') return 'Combo Mastery';
    if (mode === 'expert') return 'Expert Conquered';
    if (mode === 'timePressure') return 'Clock Defeated';
    if (mode === 'perfectSolve') return 'Flawless Solve';
    return 'Puzzle Cleared';
  }, [isDaily, mode, perfectRun]);

  const subtitle = perfectRun
    ? 'You solved it without mistakes and kept the board perfectly under control.'
    : combo > 1
    ? `Your best chain reached ${combo}x and kept the board flowing beautifully.`
    : 'A clean clear with strong sequencing and smart gravity reads.';

  const difficulty = level <= 5 ? 'easy' : level <= 15 ? 'medium' : level <= 30 ? 'hard' : 'expert';
  const coinReward = ECONOMY.puzzleCompleteCoins[difficulty] + stars * ECONOMY.starBonus;

  const confetti = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        id: index,
        delay: Math.random() * 360,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        startX: Math.random() * 320,
      })),
    [],
  );

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {confetti.map((particle) => (
        <ConfettiParticle
          key={particle.id}
          delay={particle.delay}
          color={particle.color}
          startX={particle.startX}
        />
      ))}

      <Animated.View style={[styles.card, { transform: [{ translateY: cardAnim }] }]}>
        <View style={styles.heroGlow} />
        <View style={styles.heroGlowSecondary} />

        <Animated.View
          style={[
            styles.ribbon,
            {
              opacity: ribbonAnim,
              transform: [
                { scale: ribbonAnim.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
                { translateY: ribbonAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
              ],
            },
          ]}
        >
          <Text style={styles.ribbonText}>{perfectRun ? '✨ PERFECT RUN' : isDaily ? '☀ DAILY WIN' : '🏆 STAGE COMPLETE'}</Text>
        </Animated.View>

        <Text style={[styles.title, perfectRun && styles.titlePerfect]}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.starsRow}>
          <Star filled={stars >= 1} delay={140} size={44} />
          <Star filled={stars >= 2} delay={340} size={56} />
          <Star filled={stars >= 3} delay={560} size={44} />
        </View>

        <View style={styles.scorePanel}>
          <Text style={styles.scoreLabel}>Final Score</Text>
          <AnimatedScore targetScore={score} />
        </View>

        <Animated.View
          style={[
            styles.statsGrid,
            {
              opacity: statsAnim,
              transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
            },
          ]}
        >
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Moves</Text>
            <Text style={styles.statCardValue}>{moves}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Best Combo</Text>
            <Text style={styles.statCardValue}>{combo > 1 ? `${combo}x` : '—'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Stars</Text>
            <Text style={styles.statCardValue}>{stars}/3</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.rewardsCard,
            {
              opacity: statsAnim,
              transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
            },
          ]}
        >
          <Text style={styles.rewardsTitle}>Rewards</Text>
          <View style={styles.rewardRow}>
            <View style={styles.rewardChip}>
              <Text style={styles.rewardIcon}>🪙</Text>
              <Text style={styles.rewardText}>+{coinReward} coins</Text>
            </View>
            {perfectRun && (
              <View style={styles.rewardChipGold}>
                <Text style={styles.rewardIcon}>💎</Text>
                <Text style={styles.rewardTextGold}>+{ECONOMY.perfectClearGems} gems</Text>
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.actionsColumn,
            {
              opacity: actionsAnim,
              transform: [{ translateY: actionsAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
            },
          ]}
        >
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]} onPress={onNextLevel}>
            <Text style={styles.primaryButtonText}>{isDaily ? 'PLAY ANOTHER MODE' : 'NEXT LEVEL'}</Text>
          </Pressable>
          <View style={styles.secondaryRow}>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]} onPress={onRetry}>
              <Text style={styles.secondaryButtonText}>Retry</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]} onPress={onHome}>
              <Text style={styles.secondaryButtonText}>Home</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 9, 28, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confettiParticle: {
    position: 'absolute',
    top: -30,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.accentGlow,
    top: -90,
    right: -50,
  },
  heroGlowSecondary: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.purpleGlow,
    bottom: -80,
    left: -30,
  },
  ribbon: {
    alignSelf: 'center',
    marginBottom: 14,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ribbonText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  titlePerfect: {
    color: COLORS.gold,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  star: {
    color: COLORS.star,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 18,
  },
  scorePanel: {
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderRadius: 24,
    paddingVertical: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  scoreLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  scoreValue: {
    color: COLORS.textPrimary,
    fontSize: 36,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  statCardLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center',
  },
  statCardValue: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  rewardsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 18,
  },
  rewardsTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  rewardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bgLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rewardChipGold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rewardIcon: {
    fontSize: 16,
  },
  rewardText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  rewardTextGold: {
    color: COLORS.gold,
    fontWeight: '800',
  },
  actionsColumn: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.bg,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.88,
  },
});
