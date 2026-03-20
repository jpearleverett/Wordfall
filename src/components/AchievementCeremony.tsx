import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS } from '../constants';

interface AchievementCeremonyProps {
  icon: string;
  name: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold';
  reward: { coins: number; gems: number };
  onDismiss: () => void;
}

const TIER_COLORS = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
};

export function AchievementCeremony({
  icon,
  name,
  description,
  tier,
  reward,
  onDismiss,
}: AchievementCeremonyProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
      ]),
      Animated.spring(badgeAnim, { toValue: 1, friction: 4, tension: 150, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim, badgeAnim]);

  const tierColor = TIER_COLORS[tier];

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={[styles.ribbon, { color: tierColor }]}>ACHIEVEMENT UNLOCKED</Text>

          <Animated.View
            style={[
              styles.badgeContainer,
              {
                transform: [
                  { scale: badgeAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1.2, 1] }) },
                ],
              },
            ]}
          >
            <View style={[styles.badge, { borderColor: tierColor, backgroundColor: tierColor + '20' }]}>
              <Text style={styles.badgeIcon}>{icon}</Text>
            </View>
            <View style={[styles.tierTag, { backgroundColor: tierColor }]}>
              <Text style={styles.tierText}>{tier.toUpperCase()}</Text>
            </View>
          </Animated.View>

          <Text style={styles.name}>{name}</Text>
          <Text style={styles.description}>{description}</Text>

          <View style={styles.rewardRow}>
            <View style={styles.rewardChip}>
              <Text style={styles.rewardEmoji}>🪙</Text>
              <Text style={styles.rewardAmount}>+{reward.coins}</Text>
            </View>
            {reward.gems > 0 && (
              <View style={[styles.rewardChip, styles.rewardChipGems]}>
                <Text style={styles.rewardEmoji}>💎</Text>
                <Text style={[styles.rewardAmount, { color: COLORS.accent }]}>+{reward.gems}</Text>
              </View>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={onDismiss}
          >
            <LinearGradient
              colors={[tierColor, tierColor + 'CC']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>CLAIM</Text>
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
    maxWidth: 340,
    ...SHADOWS.strong,
  },
  cardInner: {
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ribbon: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 20,
  },
  badgeContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeIcon: {
    fontSize: 36,
  },
  tierTag: {
    marginTop: -8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tierText: {
    color: COLORS.bg,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
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
  rewardChipGems: {
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  rewardEmoji: {
    fontSize: 16,
  },
  rewardAmount: {
    color: COLORS.gold,
    fontWeight: '800',
    fontSize: 14,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    ...SHADOWS.medium,
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
