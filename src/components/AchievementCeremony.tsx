import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence, withDelay, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { SparkleField } from './effects/ParticleSystem';
import { useDeferredMount } from '../utils/perfInstrument';
import { LOCAL_IMAGES } from '../utils/localAssets';

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
  const fade = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const badge = useSharedValue(0);
  const decorationsMounted = useDeferredMount(280);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 15, stiffness: 180 });
    badge.value = withDelay(200, withSpring(1, { damping: 14, stiffness: 200 }));
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(badge.value, [0, 0.6, 1], [0, 1.2, 1]) }],
  }));

  const tierColor = TIER_COLORS[tier];

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      {decorationsMounted && (
        <SparkleField count={22} intensity="intense" colors={[tierColor, '#fff', COLORS.gold, COLORS.accent]} />
      )}
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={[styles.ribbon, { color: tierColor }]}>ACHIEVEMENT UNLOCKED</Text>

          <Animated.View
            style={[
              styles.badgeContainer,
              badgeStyle,
            ]}
          >
            <View style={[styles.badge, { borderColor: tierColor, backgroundColor: tierColor + '20' }]}>
              <Image source={LOCAL_IMAGES.achievementBadge} style={styles.badgeFrame} resizeMode="contain" />
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
              <Image source={LOCAL_IMAGES.iconCoinGold} style={styles.rewardIconImg} resizeMode="contain" />
              <Text style={styles.rewardAmount}>+{reward.coins}</Text>
            </View>
            {reward.gems > 0 && (
              <View style={[styles.rewardChip, styles.rewardChipGems]}>
                <Image source={LOCAL_IMAGES.iconGemDiamond} style={styles.rewardIconImg} resizeMode="contain" />
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

const AnimatedText = Animated.createAnimatedComponent(Text);

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
    fontFamily: FONTS.display,
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
    overflow: 'hidden',
  },
  badgeFrame: {
    ...StyleSheet.absoluteFillObject,
    width: 72,
    height: 72,
    opacity: 0.4,
  },
  badgeIcon: {
    fontSize: 36,
  },
  rewardIconImg: {
    width: 18,
    height: 18,
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
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontFamily: FONTS.display,
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
    fontFamily: FONTS.display,
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
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },
});
