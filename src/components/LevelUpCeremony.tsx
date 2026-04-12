import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, withRepeat, withSequence, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { SparkleField } from './effects/ParticleSystem';
import { LOCAL_IMAGES } from '../utils/localAssets';
import { useDeferredMount } from '../utils/perfInstrument';

interface LevelUpCeremonyProps {
  newLevel: number;
  onDismiss: () => void;
}

export function LevelUpCeremony({ newLevel, onDismiss }: LevelUpCeremonyProps) {
  const fade = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const level = useSharedValue(0);
  const glow = useSharedValue(0.3);
  const decorationsMounted = useDeferredMount(280);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 15, stiffness: 180 });
    level.value = withDelay(200, withSpring(1, { damping: 14, stiffness: 220 }));
    glow.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 }),
      ),
      3,
    );
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const levelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(level.value, [0, 0.5, 1], [0, 1.4, 1]) }],
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      {decorationsMounted && (
        <SparkleField count={24} intensity="intense" colors={[COLORS.gold, COLORS.accent, '#fff']} />
      )}
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Animated.View
            style={[
              styles.glowCircle,
              glowStyle,
            ]}
          />

          <Text style={styles.ribbon}>LEVEL UP!</Text>

          <Animated.View
            style={[
              styles.levelContainer,
              levelStyle,
            ]}
          >
            <LinearGradient
              colors={[COLORS.gold, '#ffaa00']}
              style={styles.levelBadge}
            >
              <Image source={LOCAL_IMAGES.energyRing} style={styles.badgeDecor} resizeMode="contain" />
              <Text style={styles.levelNumber}>{newLevel}</Text>
            </LinearGradient>
          </Animated.View>

          <Text style={styles.title}>Level {newLevel} Reached!</Text>
          <Text style={styles.description}>
            Keep pushing forward — new challenges and rewards await!
          </Text>

          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={onDismiss}
          >
            <LinearGradient
              colors={[COLORS.gold, '#ffaa00']}
              style={[styles.button, SHADOWS.glow(COLORS.gold)]}
            >
              <Text style={styles.buttonText}>CONTINUE</Text>
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
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  glowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -40,
    backgroundColor: COLORS.gold + '30',
  },
  ribbon: {
    color: COLORS.gold,
    fontSize: 13,
    fontFamily: FONTS.display,
    letterSpacing: 3,
    marginBottom: 20,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 10,
  },
  levelContainer: {
    marginBottom: 16,
  },
  levelBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...SHADOWS.strong,
  },
  badgeDecor: {
    ...StyleSheet.absoluteFillObject,
    width: 88,
    height: 88,
    opacity: 0.25,
  },
  levelNumber: {
    color: COLORS.bg,
    fontSize: 36,
    fontFamily: FONTS.display,
    letterSpacing: -1,
  },
  title: {
    color: COLORS.gold,
    fontSize: 24,
    fontFamily: FONTS.display,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 260,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
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
