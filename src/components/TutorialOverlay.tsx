import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { TutorialGuideStep } from '../data/tutorialBoards';

interface TutorialOverlayProps {
  step: TutorialGuideStep;
  visible: boolean;
}

export function TutorialOverlay({ step, visible }: TutorialOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const handAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      const delay = step.delay || 0;
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 7,
            tension: 80,
            useNativeDriver: true,
          }),
        ]).start();

        if (step.showHandPointer) {
          Animated.loop(
            Animated.sequence([
              Animated.timing(handAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.timing(handAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
              }),
            ]),
          ).start();
        }
      }, delay);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, step, fadeAnim, slideAnim, handAnim]);

  if (!visible) return null;

  const handTranslateY = handAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
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
              { transform: [{ translateY: handTranslateY }] },
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
