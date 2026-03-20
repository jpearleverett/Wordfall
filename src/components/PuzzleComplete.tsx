import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, ECONOMY, GRADIENTS, SHADOWS } from '../constants';
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

const CONFETTI_SHAPES = ['square', 'rect', 'circle'] as const;

function ConfettiParticle({ delay, color, startX }: { delay: number; color: string; startX: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;

  const shape = useMemo(() => CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)], []);
  const baseSize = useMemo(() => 6 + Math.random() * 12, []);

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

  const width = shape === 'rect' ? baseSize * 0.5 : baseSize;
  const height = shape === 'rect' ? baseSize * 1.4 : baseSize;
  const borderRadius = shape === 'circle' ? baseSize / 2 : shape === 'rect' ? 2 : 3;

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          left: startX,
          backgroundColor: color,
          width,
          height,
          borderRadius,
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

  const glowSize = size + 24;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size + 28, height: size + 28 }}>
      {filled && (
        <View
          style={[
            styles.starGlowRing,
            {
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
            },
          ]}
        />
      )}
      <Animated.Text
        style={[
          styles.star,
          {
            fontSize: size,
            opacity: filled ? 1 : 0.25,
            position: 'absolute',
            transform: [
              { scale: anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1.28, 1] }) },
              { rotate: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '-12deg', '0deg'] }) },
            ],
          },
        ]}
      >
        ★
      </Animated.Text>
    </View>
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
      Array.from({ length: 32 }, (_, index) => ({
        id: index,
        delay: Math.random() * 360,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        startX: Math.random() * 320,
      })),
    [],
  );

  const borderColors = perfectRun
    ? [COLORS.gold, 'rgba(255,215,0,0.6)', COLORS.gold]
    : [COLORS.accent, 'rgba(0,212,255,0.5)', COLORS.accent];

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

      <Animated.View style={[styles.cardOuter, { transform: [{ translateY: cardAnim }] }]}>
        {/* Gradient border wrapper */}
        <LinearGradient
          colors={borderColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          <LinearGradient
            colors={GRADIENTS.victoryCard as unknown as [string, string, ...string[]]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.card}
          >
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
              <Star filled={stars >= 1} delay={140} size={48} />
              <Star filled={stars >= 2} delay={340} size={64} />
              <Star filled={stars >= 3} delay={560} size={48} />
            </View>

            <LinearGradient
              colors={GRADIENTS.scorePanel as unknown as [string, string, ...string[]]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.scorePanel}
            >
              <Text style={styles.scoreLabel}>Final Score</Text>
              <AnimatedScore targetScore={score} />
            </LinearGradient>

            <Animated.View
              style={[
                styles.statsGrid,
                {
                  opacity: statsAnim,
                  transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
                },
              ]}
            >
              <LinearGradient
                colors={GRADIENTS.surface as unknown as [string, string, ...string[]]}
                style={styles.statCard}
              >
                <Text style={styles.statCardLabel}>Moves</Text>
                <Text style={styles.statCardValue}>{moves}</Text>
              </LinearGradient>
              <LinearGradient
                colors={GRADIENTS.surface as unknown as [string, string, ...string[]]}
                style={styles.statCard}
              >
                <Text style={styles.statCardLabel}>Best Combo</Text>
                <Text style={styles.statCardValue}>{combo > 1 ? `${combo}x` : '—'}</Text>
              </LinearGradient>
              <LinearGradient
                colors={GRADIENTS.surface as unknown as [string, string, ...string[]]}
                style={styles.statCard}
              >
                <Text style={styles.statCardLabel}>Stars</Text>
                <Text style={styles.statCardValue}>{stars}/3</Text>
              </LinearGradient>
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
                <LinearGradient
                  colors={['#1a2050', '#222860'] as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.rewardChip}
                >
                  <Text style={styles.rewardIcon}>🪙</Text>
                  <Text style={styles.rewardText}>+{coinReward} coins</Text>
                </LinearGradient>
                {perfectRun && (
                  <LinearGradient
                    colors={['rgba(255,215,0,0.18)', 'rgba(255,159,0,0.12)'] as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.rewardChipGold}
                  >
                    <Text style={styles.rewardIcon}>💎</Text>
                    <Text style={styles.rewardTextGold}>+{ECONOMY.perfectClearGems} gems</Text>
                  </LinearGradient>
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
              <Pressable
                style={({ pressed }) => [pressed && styles.buttonPressed]}
                onPress={onNextLevel}
              >
                <LinearGradient
                  colors={GRADIENTS.button.primary as unknown as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>{isDaily ? 'PLAY ANOTHER MODE' : 'NEXT LEVEL'}</Text>
                </LinearGradient>
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
          </LinearGradient>
        </LinearGradient>
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
  cardOuter: {
    width: '100%',
    maxWidth: 380,
    ...SHADOWS.strong,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.2,
    shadowRadius: 30,
  },
  gradientBorder: {
    borderRadius: 32,
    padding: 1.5,
  },
  card: {
    borderRadius: 30.5,
    padding: 24,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.accentGlow,
    top: -100,
    right: -60,
    opacity: 0.7,
  },
  heroGlowSecondary: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.purpleGlow,
    bottom: -90,
    left: -40,
    opacity: 0.6,
  },
  ribbon: {
    alignSelf: 'center',
    marginBottom: 14,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ribbonText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 8,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowRadius: 12,
  },
  titlePerfect: {
    color: COLORS.gold,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 16,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  starGlowRing: {
    position: 'absolute',
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.25)',
  },
  star: {
    color: COLORS.star,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 22,
  },
  scorePanel: {
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.medium,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.15,
  },
  scoreLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  scoreValue: {
    color: COLORS.gold,
    fontSize: 40,
    fontWeight: '900',
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...SHADOWS.soft,
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
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowRadius: 6,
  },
  rewardsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
    ...SHADOWS.soft,
  },
  rewardsTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    textShadowColor: 'rgba(255,255,255,0.08)',
    textShadowRadius: 4,
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
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.soft,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.15,
  },
  rewardChipGold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    ...SHADOWS.soft,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.25,
  },
  rewardIcon: {
    fontSize: 18,
  },
  rewardText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  rewardTextGold: {
    color: COLORS.gold,
    fontWeight: '800',
    fontSize: 14,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 6,
  },
  actionsColumn: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    ...SHADOWS.medium,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.4,
    shadowRadius: 14,
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...SHADOWS.soft,
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
