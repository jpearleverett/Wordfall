import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, STREAK } from '../constants';

interface StreakMilestoneCeremonyProps {
  milestone: number;
  onDismiss: () => void;
}

export function StreakMilestoneCeremony({ milestone, onDismiss }: StreakMilestoneCeremonyProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const fireAnim = useRef(new Animated.Value(1)).current;

  const reward = STREAK.milestoneRewards[milestone as keyof typeof STREAK.milestoneRewards] || { coins: 0, gems: 0 };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(fireAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(fireAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ).start();
  }, [fadeAnim, scaleAnim, fireAnim]);

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={styles.ribbon}>STREAK MILESTONE</Text>

          <Animated.Text style={[styles.fireEmoji, { transform: [{ scale: fireAnim }] }]}>
            🔥
          </Animated.Text>

          <Text style={styles.milestoneCount}>{milestone}</Text>
          <Text style={styles.milestoneLabel}>DAYS</Text>
          <Text style={styles.subtitle}>Incredible dedication!</Text>

          <View style={styles.rewardRow}>
            <View style={styles.rewardChip}>
              <Text style={styles.rewardEmoji}>🪙</Text>
              <Text style={styles.rewardAmount}>+{reward.coins}</Text>
            </View>
            {reward.gems > 0 && (
              <View style={styles.rewardChip}>
                <Text style={styles.rewardEmoji}>💎</Text>
                <Text style={[styles.rewardAmount, { color: COLORS.accent }]}>+{reward.gems}</Text>
              </View>
            )}
          </View>

          {'cosmetic' in reward && (
            <View style={styles.cosmeticBadge}>
              <Text style={styles.cosmeticText}>+ Exclusive cosmetic reward</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={onDismiss}
          >
            <LinearGradient
              colors={[COLORS.orange, '#ff6b35']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>AMAZING!</Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 20, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 200,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    ...SHADOWS.strong,
  },
  cardInner: {
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.orange + '30',
  },
  ribbon: {
    color: COLORS.orange,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 16,
  },
  fireEmoji: {
    fontSize: 60,
    marginBottom: 8,
  },
  milestoneCount: {
    color: COLORS.orange,
    fontSize: 48,
    fontWeight: '900',
    textShadowColor: COLORS.orangeGlow,
    textShadowRadius: 20,
  },
  milestoneLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 20,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rewardEmoji: {
    fontSize: 16,
  },
  rewardAmount: {
    color: COLORS.gold,
    fontWeight: '800',
    fontSize: 14,
  },
  cosmeticBadge: {
    backgroundColor: COLORS.purple + '20',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.purple + '40',
  },
  cosmeticText: {
    color: COLORS.purple,
    fontSize: 12,
    fontWeight: '700',
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    ...SHADOWS.glow(COLORS.orange),
  },
  buttonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },
});
