import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, withRepeat, withSequence, cancelAnimation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { TutorialGuideStep } from '../data/tutorialBoards';

interface TutorialOverlayProps {
  step: TutorialGuideStep;
  visible: boolean;
}

export function TutorialOverlay({ step, visible }: TutorialOverlayProps) {
  const fade = useSharedValue(0);
  const slide = useSharedValue(20);
  const hand = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      const delayMs = step.delay || 0;
      fade.value = withDelay(delayMs, withTiming(1, { duration: 300 }));
      slide.value = withDelay(delayMs, withSpring(0, { damping: 14, stiffness: 80 }));

      if (step.showHandPointer) {
        hand.value = withDelay(
          delayMs,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 800 }),
              withTiming(0, { duration: 600 }),
            ),
            -1,
          ),
        );
      }
    } else {
      fade.value = withTiming(0, { duration: 200 });
      cancelAnimation(hand);
    }
  }, [visible, step]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value }] }));
  const handStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hand.value * -8 }],
    opacity: 0.5 + hand.value * 0.5,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        overlayStyle,
        slideStyle,
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={GRADIENTS.surfaceCard}
        style={[styles.bubble, SHADOWS.medium]}
      >
        <Text style={styles.message}>{step.message}</Text>
        {step.showHandPointer && (
          <Animated.Text
            style={[
              styles.hand,
              handStyle,
            ]}
          >
            👆
          </Animated.Text>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 160,
    left: 20,
    right: 20,
    zIndex: 100,
    alignItems: 'center',
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: 340,
  },
  message: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    lineHeight: 22,
    flex: 1,
  },
  hand: {
    fontSize: 28,
  },
});
