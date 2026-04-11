import React, { useEffect, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, interpolate, runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { SparkleField } from './effects/ParticleSystem';
import { useDeferredMount } from '../utils/perfInstrument';

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
  const fade = useSharedValue(0);
  const scale = useSharedValue(0.7);
  const iconProgress = useSharedValue(0);
  const decorationsMounted = useDeferredMount(200);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    iconProgress.value = withDelay(350, withSpring(1, { damping: 8, stiffness: 150 }));
  }, []);

  const dismiss = useCallback(() => {
    fade.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDismiss)();
    });
  }, [onDismiss]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(iconProgress.value, [0, 1], [0.3, 1]) },
      { rotate: `${interpolate(iconProgress.value, [0, 0.5, 1], [0, -10, 0])}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      {decorationsMounted && (
        <SparkleField count={20} intensity="medium" colors={[modeColor, '#fff', COLORS.accent]} />
      )}
      <Animated.View style={[styles.cardOuter, cardStyle]}>
        <LinearGradient
          colors={GRADIENTS.surfaceCard}
          style={[styles.card, SHADOWS.strong]}
        >
          <View style={[styles.iconGlow, { backgroundColor: modeColor + '20' }]} />
          <Text style={styles.unlockLabel}>NEW MODE UNLOCKED</Text>
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
                onPress={() => { dismiss(); onTryNow(); }}
              >
                <LinearGradient
                  colors={[modeColor, modeColor + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.tryButton, SHADOWS.glow(modeColor)]}
                >
                  <Text style={styles.tryButtonText}>TRY IT NOW</Text>
                </LinearGradient>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.laterButton, pressed && styles.pressed]}
              onPress={dismiss}
            >
              <Text style={styles.laterButtonText}>Later</Text>
            </Pressable>
          </View>
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
