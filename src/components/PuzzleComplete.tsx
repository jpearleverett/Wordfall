import React, { useEffect, useRef, useState } from 'react';
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

// Confetti particle component
function ConfettiParticle({ delay, color, startX }: { delay: number; color: string; startX: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(swayAnim, {
              toValue: 1,
              duration: 400 + Math.random() * 300,
              useNativeDriver: true,
            }),
            Animated.timing(swayAnim, {
              toValue: -1,
              duration: 400 + Math.random() * 300,
              useNativeDriver: true,
            }),
          ]),
        ),
      ]),
    ]).start();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 500],
  });

  const translateX = swayAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-20, 20],
  });

  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${360 + Math.random() * 360}deg`],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.1, 0.7, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          left: startX,
          backgroundColor: color,
          width: 6 + Math.random() * 6,
          height: 6 + Math.random() * 10,
          borderRadius: Math.random() > 0.5 ? 10 : 2,
          opacity,
          transform: [{ translateY }, { translateX }, { rotate }],
        },
      ]}
    />
  );
}

// Animated score counter
function AnimatedScore({ targetScore }: { targetScore: number }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 30;
    const increment = targetScore / steps;
    let current = 0;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      // Ease-out: fast start, slow end
      const progress = step / steps;
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      current = Math.round(targetScore * easedProgress);
      setDisplayScore(current);

      if (step >= steps) {
        setDisplayScore(targetScore);
        clearInterval(interval);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [targetScore]);

  return (
    <Text style={styles.statValue}>{displayScore}</Text>
  );
}

function Star({
  filled,
  delay,
  size,
}: {
  filled: boolean;
  delay: number;
  size: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (filled) {
      Animated.sequence([
        Animated.delay(delay),
        Animated.spring(anim, {
          toValue: 1,
          friction: 3,
          tension: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [filled]);

  const scale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.3, 1],
  });

  const rotate = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '-15deg', '0deg'],
  });

  return (
    <Animated.Text
      style={[
        styles.star,
        {
          fontSize: size,
          transform: [{ scale }, { rotate }],
          opacity: filled ? 1 : 0.3,
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
  '#fff',
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
  const slideAnim = useRef(new Animated.Value(50)).current;
  const perfectAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;
  const rewardsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(600),
      Animated.spring(rewardsAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(buttonsAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    if (perfectRun) {
      Animated.sequence([
        Animated.delay(1200),
        Animated.spring(perfectAnim, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  const getTitle = () => {
    if (isDaily) return 'DAILY COMPLETE!';
    if (perfectRun) return 'PERFECT CLEAR!';
    switch (mode) {
      case 'cascade': return 'CASCADE COMPLETE!';
      case 'expert': return 'EXPERT CLEARED!';
      case 'timePressure': return 'TIME BEATEN!';
      case 'perfectSolve': return 'FLAWLESS!';
      default: return 'PUZZLE CLEARED!';
    }
  };

  // Calculate coin reward
  const difficulty = level <= 5 ? 'easy' : level <= 15 ? 'medium' : level <= 30 ? 'hard' : 'expert';
  const coinReward = ECONOMY.puzzleCompleteCoins[difficulty] + (stars * ECONOMY.starBonus);

  const perfectScale = perfectAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const rewardsScale = rewardsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const buttonsTranslate = buttonsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    delay: Math.random() * 800,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    startX: Math.random() * 300,
  }));

  return (
    <Animated.View
      style={[styles.overlay, { opacity: fadeAnim }]}
    >
      {/* Confetti */}
      <View style={styles.confettiContainer} pointerEvents="none">
        {confettiParticles.map(p => (
          <ConfettiParticle
            key={p.id}
            delay={p.delay}
            color={p.color}
            startX={p.startX}
          />
        ))}
      </View>

      <Animated.View
        style={[styles.card, { transform: [{ translateY: slideAnim }] }]}
      >
        <Text style={[
          styles.title,
          perfectRun && styles.titlePerfect,
        ]}>
          {getTitle()}
        </Text>

        <View style={styles.starsRow}>
          <Star filled={stars >= 1} delay={200} size={44} />
          <Star filled={stars >= 2} delay={500} size={52} />
          <Star filled={stars >= 3} delay={800} size={44} />
        </View>

        {/* Perfect badge */}
        {perfectRun && (
          <Animated.View style={[
            styles.perfectBadge,
            { transform: [{ scale: perfectScale }] },
          ]}>
            <Text style={styles.perfectText}>💎 PERFECT</Text>
          </Animated.View>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <AnimatedScore targetScore={score} />
            <Text style={styles.statLabel}>Score</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{moves}</Text>
            <Text style={styles.statLabel}>Moves</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{combo}x</Text>
            <Text style={styles.statLabel}>Best Combo</Text>
          </View>
        </View>

        {/* Rewards */}
        <Animated.View style={[
          styles.rewardsRow,
          {
            opacity: rewardsAnim,
            transform: [{ scale: rewardsScale }],
          },
        ]}>
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
        </Animated.View>

        <Animated.View style={[
          styles.buttons,
          {
            opacity: buttonsAnim,
            transform: [{ translateY: buttonsTranslate }],
          },
        ]}>
          {!isDaily && mode !== 'endless' && (
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onNextLevel}
            >
              <Text style={styles.primaryButtonText}>
                NEXT LEVEL →
              </Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onRetry}
          >
            <Text style={styles.secondaryButtonText}>
              RETRY
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onHome}
          >
            <Text style={styles.secondaryButtonText}>
              HOME
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  confettiParticle: {
    position: 'absolute',
    top: -10,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    elevation: 16,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 3,
    marginBottom: 16,
    textAlign: 'center',
  },
  titlePerfect: {
    color: COLORS.gold,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 12,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  star: {
    color: COLORS.star,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 12,
  },
  perfectBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gold,
    marginBottom: 12,
  },
  perfectText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.accent,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    width: '100%',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardIcon: {
    fontSize: 16,
  },
  rewardValue: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '800',
  },
  buttons: {
    width: '100%',
    gap: 10,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
  },
  primaryButtonText: {
    color: COLORS.bg,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceLight,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
