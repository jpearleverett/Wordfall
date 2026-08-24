import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, withRepeat, withSequence, cancelAnimation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { TutorialGuideStep } from '../data/tutorialBoards';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { VB, BodyGrad, gradId, rim, HILITE } from './icons/IconBase';

/**
 * Pointer hand in the icon set's material recipe (gradient body + dark rim
 * + top highlight) — replaces the stock pointing-finger emoji so the
 * tutorial callout matches the rest of the crafted iconography.
 */
function PointerHandIcon({ size = 24, accent = '#ffcf99' }: { size?: number; accent?: string }) {
  const id = useMemo(() => gradId('hand'), []);
  return (
    <Svg width={size} height={size} viewBox={VB}>
      <BodyGrad id={id} color={accent} />
      {/* Index finger up + curled fist */}
      <Path
        d="M10.4 3.9a1.6 1.6 0 0 1 3.2 0v6.3l3.9.9c1.6.4 2.7 1.8 2.7 3.4v2.3c0 .9-.2 1.7-.7 2.5l-.7 1.1c-.5.9-1.5 1.4-2.5 1.4H11c-1 0-1.9-.5-2.4-1.3l-3.2-4.7a1.5 1.5 0 0 1 2.3-1.9l2.7 2.6Z"
        fill={`url(#${id})`}
        stroke={rim(accent)}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Finger highlight */}
      <Path d="M11.3 4.4v5" stroke={HILITE} strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

interface TutorialOverlayProps {
  step: TutorialGuideStep;
  visible: boolean;
}

export function TutorialOverlay({ step, visible }: TutorialOverlayProps) {
  const reduceMotion = useReduceMotion();
  const fade = useSharedValue(0);
  const slide = useSharedValue(20);
  const hand = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      const delayMs = step.delay || 0;
      fade.value = withDelay(delayMs, withTiming(1, { duration: 300 }));
      if (reduceMotion) {
        // Reduce motion: skip the slide spring — the bubble sits at its
        // settled position and only the plain fade plays.
        slide.value = 0;
      } else {
        slide.value = withDelay(delayMs, withSpring(0, { damping: 14, stiffness: 80 }));
      }

      if (step.showHandPointer && !reduceMotion) {
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
      } else {
        // The overlay stays mounted across tutorial steps (OnboardingScreen
        // passes visible={true} throughout), so a step without the pointer
        // must stop the loop the previous step started; under reduce motion
        // the pointer is pinned static at its fully-visible pose.
        cancelAnimation(hand);
        hand.value = step.showHandPointer ? 1 : 0;
      }
    } else {
      // Hidden renders null in the same commit (see below), so snap straight
      // back to the initial values for the next entrance — a fade-out here
      // could never be seen.
      cancelAnimation(hand);
      hand.value = 0;
      fade.value = 0;
      slide.value = 20;
    }
    return () => {
      cancelAnimation(hand);
    };
  }, [visible, step, reduceMotion]);

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
          <Animated.View style={handStyle}>
            <PointerHandIcon size={32} />
          </Animated.View>
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
});
