import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '../constants';

interface PuzzleCompleteProps {
  score: number;
  moves: number;
  stars: number;
  combo: number;
  level: number;
  isDaily: boolean;
  onNextLevel: () => void;
  onHome: () => void;
  onRetry: () => void;
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

  return (
    <Animated.Text
      style={[
        styles.star,
        {
          fontSize: size,
          transform: [{ scale }],
          opacity: filled ? 1 : 0.3,
        },
      ]}
    >
      ★
    </Animated.Text>
  );
}

export function PuzzleComplete({
  score,
  moves,
  stars,
  combo,
  level,
  isDaily,
  onNextLevel,
  onHome,
  onRetry,
}: PuzzleCompleteProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
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
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.title}>
          {isDaily ? 'DAILY COMPLETE!' : 'PUZZLE CLEARED!'}
        </Text>

        <View style={styles.starsRow}>
          <Star filled={stars >= 1} delay={200} size={44} />
          <Star filled={stars >= 2} delay={500} size={52} />
          <Star filled={stars >= 3} delay={800} size={44} />
        </View>

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
            <Text style={styles.statValue}>{combo}x</Text>
            <Text style={styles.statLabel}>Best Combo</Text>
          </View>
        </View>

        <View style={styles.buttons}>
          {!isDaily && (
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={onNextLevel}
            >
              <Text style={styles.primaryButtonText}>
                NEXT LEVEL →
              </Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={onRetry}
          >
            <Text style={styles.secondaryButtonText}>
              RETRY
            </Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={onHome}
          >
            <Text style={styles.secondaryButtonText}>
              HOME
            </Text>
          </Pressable>
        </View>
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
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 3,
    marginBottom: 16,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  star: {
    color: COLORS.star,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
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
  buttons: {
    width: '100%',
    gap: 10,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
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
