import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { SparkleField } from './effects/ParticleSystem';
import { useDeferredMount } from '../utils/perfInstrument';

/**
 * General-purpose milestone ceremony for celebrations that don't need
 * a full bespoke component. Handles: star milestones, perfect milestones,
 * decoration unlocks, first rare tile, first booster, wing complete,
 * word mastery gold, first mode clear, wildcard earned, win streak,
 * mystery wheel jackpot.
 */

interface MilestoneCeremonyProps {
  ribbon: string;
  icon: string;
  title: string;
  description: string;
  accentColor?: string;
  rewardLabel?: string;
  buttonText?: string;
  onDismiss: () => void;
}

export function MilestoneCeremony({
  ribbon,
  icon,
  title,
  description,
  accentColor = COLORS.gold,
  rewardLabel,
  buttonText = 'AWESOME!',
  onDismiss,
}: MilestoneCeremonyProps) {
  const fade = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const iconProgress = useSharedValue(0);

  // Defer the SparkleField until ~200ms after mount — see useDeferredMount
  // in perfInstrument.ts. Lets the card pop in fast and the decorations
  // follow a frame or two later.
  const decorationsMounted = useDeferredMount(280);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 15, stiffness: 180 });
    iconProgress.value = withDelay(200, withSpring(1, { damping: 14, stiffness: 200 }));
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(iconProgress.value, [0, 0.5, 1], [0, 1.4, 1]) }],
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      {decorationsMounted && (
        <SparkleField count={16} intensity="medium" colors={[accentColor, COLORS.gold, '#fff']} />
      )}
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={[styles.ribbon, { color: accentColor }]}>{ribbon}</Text>

          <Animated.View
            style={iconStyle}
          >
            <View style={[styles.iconBg, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
              <Text style={styles.icon}>{icon}</Text>
            </View>
          </Animated.View>

          <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {rewardLabel && (
            <View style={styles.rewardChip}>
              <Text style={[styles.rewardText, { color: accentColor }]}>{rewardLabel}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={onDismiss}
          >
            <LinearGradient
              colors={[accentColor, accentColor + 'CC']}
              style={[styles.button, SHADOWS.glow(accentColor)]}
            >
              <Text style={styles.buttonText}>{buttonText}</Text>
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
    fontFamily: FONTS.display,
    letterSpacing: 2,
    marginBottom: 20,
  },
  iconBg: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 22,
    fontFamily: FONTS.display,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 260,
  },
  rewardChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
  },
  rewardText: {
    fontFamily: FONTS.display,
    fontSize: 13,
    letterSpacing: 0.5,
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
