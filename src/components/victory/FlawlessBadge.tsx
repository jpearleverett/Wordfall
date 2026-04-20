import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../../constants';

interface FlawlessBadgeProps {
  /** Badge scales in once when this becomes true. */
  visible: boolean;
  /** Skip the spring bounce; use a simple fade for reduce-motion. */
  reduceMotion?: boolean;
  /**
   * Reveal delay in ms relative to mount. Default stages the badge after the
   * third star's reveal (~700ms) so it doesn't compete with the star sparkle.
   */
  delay?: number;
}

/**
 * Gold "FLAWLESS" badge shown on PuzzleComplete when perfectRun === true.
 * The badge is the every-puzzle dopamine hit for clean play; streak milestones
 * are celebrated separately by a full-screen ceremony (`flawless_streak_milestone`).
 */
function FlawlessBadgeImpl({ visible, reduceMotion = false, delay = 700 }: FlawlessBadgeProps) {
  const scale = useRef(new Animated.Value(reduceMotion ? 1 : 0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      scale.setValue(reduceMotion ? 1 : 0.6);
      opacity.setValue(0);
      return;
    }
    if (reduceMotion) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        delay,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(delay),
        Animated.spring(scale, {
          toValue: 1.12,
          friction: 5,
          tension: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 160,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [visible, reduceMotion, delay, scale, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.container, { opacity, transform: [{ scale }] }]}
      accessibilityLabel="Flawless solve"
    >
      <LinearGradient
        colors={['rgba(255, 215, 0, 0.95)', 'rgba(255, 184, 0, 0.95)'] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pill}
      >
        <View style={styles.shineTop} />
        <Text style={styles.text}>FLAWLESS</Text>
      </LinearGradient>
    </Animated.View>
  );
}

export const FlawlessBadge = React.memo(FlawlessBadgeImpl);

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 4,
    alignSelf: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.9,
    shadowRadius: 22,
    elevation: 16,
  },
  pill: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
  },
  shineTop: {
    position: 'absolute',
    top: 0,
    left: '12%',
    right: '12%',
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 999,
  },
  text: {
    fontFamily: FONTS.display,
    color: '#1a0f00',
    fontSize: 18,
    letterSpacing: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.55)',
    textShadowRadius: 6,
  },
});

export default FlawlessBadge;
