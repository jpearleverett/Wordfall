import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated as RNAnimated, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, interpolate, cancelAnimation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { SparkleField } from './effects/ParticleSystem';
import { useDeferredMount } from '../utils/perfInstrument';
import { useCeremonyTransition, CEREMONY_LAYER } from '../hooks/useCeremonyTransition';

interface ModeUnlockCeremonyProps {
  modeName: string;
  modeIcon: string;
  modeDescription: string;
  modeColor: string;
  onDismiss: () => void;
  onTryNow?: () => void;
}

export function ModeUnlockCeremony({
  modeName,
  modeIcon,
  modeDescription,
  modeColor,
  onDismiss,
  onTryNow,
}: ModeUnlockCeremonyProps) {
  const { t } = useTranslation();
  // Shared ceremony transition: one entrance, one faster exit, instant
  // settle + instant dismiss under reduced motion, stop-on-unmount.
  const { reduceMotion, animateDecorations, overlayStyle, cardStyle, requestDismiss } =
    useCeremonyTransition(onDismiss);
  const iconProgress = useSharedValue(reduceMotion ? 1 : 0);
  const decorationsMounted = useDeferredMount(280);

  useEffect(() => {
    if (!animateDecorations) return undefined; // reduced motion: mounted settled
    iconProgress.value = withDelay(200, withSpring(1, { damping: 14, stiffness: 200 }));
    return () => {
      cancelAnimation(iconProgress);
    };
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(iconProgress.value, [0, 1], [0.3, 1]) },
      { rotate: `${interpolate(iconProgress.value, [0, 0.5, 1], [0, -10, 0])}deg` },
    ],
  }));

  return (
    <RNAnimated.View
      style={[styles.overlay, overlayStyle]}
      accessibilityViewIsModal
      accessibilityRole="alert"
      accessibilityLabel={`${t('ceremony.newModeUnlocked')}. ${modeName}. ${modeDescription}`}
    >
      {decorationsMounted && animateDecorations && (
        <SparkleField count={20} intensity="medium" colors={[modeColor, '#fff', COLORS.accent]} />
      )}
      <RNAnimated.View style={[styles.cardOuter, cardStyle]}>
        <LinearGradient
          colors={GRADIENTS.surfaceCard}
          style={[styles.card, SHADOWS.strong]}
        >
          <View style={[styles.iconGlow, { backgroundColor: modeColor + '20' }]} />
          <Text style={styles.unlockLabel}>{t('ceremony.newModeUnlocked')}</Text>
          <Animated.View style={iconStyle}>
            <View style={[styles.iconCircle, { borderColor: modeColor + '50', backgroundColor: modeColor + '15' }]}>
              <Text style={styles.icon}>{modeIcon}</Text>
            </View>
          </Animated.View>
          <Text style={[styles.modeName, { color: modeColor }]}>{modeName.toUpperCase()}</Text>
          <Text style={styles.modeDescription}>{modeDescription}</Text>
          <View style={styles.buttons}>
            {onTryNow && (
              <Pressable
                style={({ pressed }) => [pressed && styles.pressed]}
                onPress={() => { requestDismiss(); onTryNow(); }}
              >
                <LinearGradient
                  colors={[modeColor, modeColor + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.tryButton, SHADOWS.glow(modeColor)]}
                >
                  <Text style={styles.tryButtonText}>{t('ceremony.tryItNow')}</Text>
                </LinearGradient>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.laterButton, pressed && styles.pressed]}
              onPress={requestDismiss}
            >
              <Text style={styles.laterButtonText}>{t('ceremony.later')}</Text>
            </Pressable>
          </View>
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
  cardOuter: {
    width: '100%',
    maxWidth: 340,
  },
  card: {
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  iconGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -40,
  },
  unlockLabel: {
    color: COLORS.gold,
    fontSize: 12,
    fontFamily: FONTS.display,
    letterSpacing: 3,
    marginBottom: 20,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  icon: {
    fontSize: 36,
  },
  modeName: {
    fontSize: 22,
    fontFamily: FONTS.display,
    letterSpacing: 2,
    marginBottom: 8,
  },
  modeDescription: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttons: {
    width: '100%',
    gap: 10,
  },
  tryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tryButtonText: {
    color: COLORS.bg,
    fontSize: 15,
    fontFamily: FONTS.display,
    letterSpacing: 2,
  },
  laterButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  laterButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
});
