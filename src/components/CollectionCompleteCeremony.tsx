import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { SparkleField, CelebrationBurst } from './effects/ParticleSystem';
import { LOCAL_IMAGES } from '../utils/localAssets';

interface CollectionCompleteCeremonyProps {
  collectionName: string;
  collectionIcon: string;
  reward: { coins: number; gems: number };
  onDismiss: () => void;
}

export function CollectionCompleteCeremony({
  collectionName,
  collectionIcon,
  reward,
  onDismiss,
}: CollectionCompleteCeremonyProps) {
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.6);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 300 });
    scaleAnim.value = withSpring(1, { damping: 12, stiffness: 100 });
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <SparkleField count={26} intensity="intense" colors={[COLORS.gold, COLORS.accent, COLORS.purple, '#fff']} />
      <CelebrationBurst centerX={180} centerY={200} particleCount={20} />
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={styles.ribbon}>COLLECTION COMPLETE</Text>
          <Text style={styles.icon}>{collectionIcon}</Text>
          <Text style={styles.name}>{collectionName}</Text>
          <Text style={styles.subtitle}>You found every item!</Text>

          <View style={styles.rewardRow}>
            <View style={styles.rewardChip}>
              <Image source={LOCAL_IMAGES.iconCoinGold} style={styles.rewardIconImg} resizeMode="contain" />
              <Text style={styles.rewardAmount}>+{reward.coins}</Text>
            </View>
            {reward.gems > 0 && (
              <View style={styles.rewardChip}>
                <Image source={LOCAL_IMAGES.iconGemDiamond} style={styles.rewardIconImg} resizeMode="contain" />
                <Text style={[styles.rewardAmount, { color: COLORS.accent }]}>+{reward.gems}</Text>
              </View>
            )}
          </View>

          <Pressable style={({ pressed }) => [pressed && styles.buttonPressed]} onPress={onDismiss}>
            <LinearGradient colors={GRADIENTS.button.gold} style={styles.button}>
              <Text style={styles.buttonText}>WONDERFUL!</Text>
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
  card: { width: '100%', maxWidth: 320, ...SHADOWS.strong },
  cardInner: {
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold + '30',
  },
  ribbon: {
    color: COLORS.gold,
    fontSize: 11,
    fontFamily: FONTS.display,
    letterSpacing: 2,
    marginBottom: 16,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 8,
  },
  icon: { fontSize: 48, marginBottom: 12 },
  name: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: FONTS.display,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 20,
  },
  rewardRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rewardEmoji: { fontSize: 16 },
  rewardIconImg: { width: 18, height: 18 },
  rewardAmount: { color: COLORS.gold, fontFamily: FONTS.display, fontSize: 14 },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    ...SHADOWS.glow(COLORS.gold),
  },
  buttonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  buttonPressed: { transform: [{ scale: 0.96 }], opacity: 0.88 },
});
