import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, withRepeat, withSequence, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { SparkleField } from './effects/ParticleSystem';
import { LOCAL_IMAGES } from '../utils/localAssets';

interface FeatureUnlockCeremonyProps {
  icon: string;
  title: string;
  description: string;
  accentColor?: string;
  onDismiss: () => void;
}

export function FeatureUnlockCeremony({
  icon,
  title,
  description,
  accentColor = COLORS.accent,
  onDismiss,
}: FeatureUnlockCeremonyProps) {
  const fade = useSharedValue(0);
  const scale = useSharedValue(0.7);
  const iconProgress = useSharedValue(0);
  const glow = useSharedValue(0.4);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
    iconProgress.value = withDelay(350, withSpring(1, { damping: 8, stiffness: 120 }));
    glow.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1200 }),
        withTiming(0.4, { duration: 1200 }),
      ),
      -1,
    );
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    backgroundColor: accentColor + '30',
    opacity: glow.value,
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(iconProgress.value, [0, 0.5, 1], [0, 1.3, 1]) },
      { rotate: `${interpolate(iconProgress.value, [0, 0.5, 1], [0, -10, 0])}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <SparkleField count={18} intensity="medium" />
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient
          colors={GRADIENTS.surfaceCard}
          style={styles.cardInner}
        >
          <Animated.View
            style={[
              styles.glowCircle,
              glowStyle,
            ]}
          />

          <Text style={styles.ribbon}>NEW UNLOCK</Text>

          <Animated.View
            style={[
              styles.iconContainer,
              iconStyle,
            ]}
          >
            <View style={[styles.iconBg, { backgroundColor: accentColor + '25', borderColor: accentColor + '40' }]}>
              <Image source={LOCAL_IMAGES.energyRing} style={styles.energyRingDecor} resizeMode="contain" />
              <Text style={styles.icon}>{icon}</Text>
            </View>
          </Animated.View>

          <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={onDismiss}
          >
            <LinearGradient
              colors={GRADIENTS.button.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.button, SHADOWS.glow(accentColor)]}
            >
              <Text style={styles.buttonText}>EXPLORE NOW</Text>
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
  },
  ribbon: {
    color: COLORS.gold,
    fontSize: 12,
    fontFamily: FONTS.display,
    letterSpacing: 2,
    marginBottom: 20,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 8,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  energyRingDecor: {
    ...StyleSheet.absoluteFillObject,
    width: 80,
    height: 80,
    opacity: 0.3,
  },
  icon: {
    fontSize: 40,
  },
  title: {
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
