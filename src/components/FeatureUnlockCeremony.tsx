import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated as RNAnimated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, withRepeat, withSequence, interpolate, cancelAnimation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { SparkleField } from './effects/ParticleSystem';
import { useDeferredMount } from '../utils/perfInstrument';
import { LOCAL_IMAGES } from '../utils/localAssets';
import GameIcon from './icons/GameIcon';
import { useCeremonyTransition, CEREMONY_LAYER } from '../hooks/useCeremonyTransition';

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
  const { t } = useTranslation();
  // Shared ceremony transition: one entrance, one faster exit, instant
  // settle + instant dismiss under reduced motion, stop-on-unmount.
  const { reduceMotion, animateDecorations, overlayStyle, cardStyle, requestDismiss } =
    useCeremonyTransition(onDismiss);
  const iconProgress = useSharedValue(reduceMotion ? 1 : 0);
  // 0.4 is the glow's settled value — the pulse loop both starts and ends
  // there, so under reduced motion it simply holds still.
  const glow = useSharedValue(0.4);
  const decorationsMounted = useDeferredMount(280);

  useEffect(() => {
    if (!animateDecorations) return undefined; // reduced motion: mounted settled
    iconProgress.value = withDelay(200, withSpring(1, { damping: 14, stiffness: 200 }));
    glow.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1200 }),
        withTiming(0.4, { duration: 1200 }),
      ),
      3,
    );
    return () => {
      cancelAnimation(iconProgress);
      cancelAnimation(glow);
    };
  }, []);

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
    <RNAnimated.View
      style={[styles.overlay, overlayStyle]}
      accessibilityViewIsModal
      accessibilityRole="alert"
      accessibilityLabel={`${t('ceremony.newUnlock')}. ${title}. ${description}`}
    >
      {decorationsMounted && animateDecorations && (
        <SparkleField count={18} intensity="medium" />
      )}
      <RNAnimated.View style={[styles.card, cardStyle]}>
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

          <Text style={styles.ribbon}>{t('ceremony.newUnlock')}</Text>

          <Animated.View
            style={[
              styles.iconContainer,
              iconStyle,
            ]}
          >
            <View style={[styles.iconBg, { backgroundColor: accentColor + '25', borderColor: accentColor + '40' }]}>
              <Image source={LOCAL_IMAGES.energyRing} style={styles.energyRingDecor} resizeMode="contain" />
              <GameIcon glyph={icon} size={40} accent={accentColor} />
            </View>
          </Animated.View>

          <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={requestDismiss}
          >
            <LinearGradient
              colors={GRADIENTS.button.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.button, SHADOWS.glow(accentColor)]}
            >
              <Text style={styles.buttonText}>{t('ceremony.exploreNow')}</Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </RNAnimated.View>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 2, 14, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: CEREMONY_LAYER,
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
