/**
 * BoosterComboBanner — transient full-width banner that flashes the name of
 * the combo (`Eagle Eye`, `Lucky Roll`, `Power Surge`) plus the 2x multiplier
 * duration for a few seconds after two boosters have been activated in the
 * same puzzle. The banner is the primary visual confirmation of the synergy;
 * the underlying score multiplier is applied inside the game reducer and is
 * not dependent on this component being mounted.
 *
 * Auto-hides via an internal timer 2.4s after mount (tuneable). Consumers
 * pass the active combo id via props; when the id changes the banner
 * remounts and re-animates.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../constants';
import { COMBO_DEFINITIONS, type ComboType } from '../data/boosterCombos';
import { useReduceMotion } from '../hooks/useReduceMotion';

interface BoosterComboBannerProps {
  comboType: ComboType | null;
  wordsRemaining: number;
  multiplier: number;
  onDismiss?: () => void;
}

const AUTO_DISMISS_MS = 2400;

const BoosterComboBanner: React.FC<BoosterComboBannerProps> = ({
  comboType,
  wordsRemaining,
  multiplier,
  onDismiss,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-40);
  const scale = useSharedValue(0.9);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (!comboType) return;
    if (reduceMotion) {
      // Skip spring/scale pop; just fade the banner in and out so
      // vestibular-sensitive players still see the combo name +
      // multiplier without a bouncing pulse.
      opacity.value = withSequence(
        withTiming(1, { duration: 120 }),
        withDelay(AUTO_DISMISS_MS - 240, withTiming(0, { duration: 120 })),
      );
      translateY.value = 0;
      scale.value = 1;
    } else {
      opacity.value = withSequence(
        withTiming(1, { duration: 180 }),
        withDelay(AUTO_DISMISS_MS - 480, withTiming(0, { duration: 300 })),
      );
      translateY.value = withSpring(0, { damping: 14, stiffness: 220 });
      scale.value = withSequence(
        withSpring(1.04, { damping: 10, stiffness: 200 }),
        withSpring(1.0, { damping: 14, stiffness: 220 }),
      );
    }
    const id = setTimeout(() => {
      onDismiss?.();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
    // Only re-run when the combo id itself changes — duplicate effect runs on
    // wordsRemaining decrement would restart the dismiss timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comboType]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  if (!comboType) return null;
  const def = COMBO_DEFINITIONS[comboType];
  if (!def) return null;

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]} pointerEvents="none">
      <LinearGradient
        colors={[COLORS.accent, COLORS.purple] as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.inner}
      >
        <Text style={styles.icon}>{def.icon}</Text>
        <View style={styles.textColumn}>
          <Text style={styles.name}>{def.name.toUpperCase()}</Text>
          <Text style={styles.tagline}>
            {`${multiplier.toFixed(multiplier % 1 === 0 ? 0 : 1)}x SCORE · NEXT ${wordsRemaining} WORDS`}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

export default BoosterComboBanner;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 72,
    left: 16,
    right: 16,
    borderRadius: 14,
    overflow: 'hidden',
    zIndex: 50,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  icon: {
    fontSize: 28,
    marginRight: 12,
  },
  textColumn: {
    flex: 1,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.textPrimary,
    letterSpacing: 1.2,
  },
  tagline: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.textPrimary,
    opacity: 0.9,
    letterSpacing: 0.6,
    marginTop: 2,
  },
});
