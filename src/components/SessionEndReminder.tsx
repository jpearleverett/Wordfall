import React, { useEffect, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { useReduceMotion } from '../hooks/useReduceMotion';
import GameIcon from './icons/GameIcon';

interface SessionEndReminderProps {
  type: 'daily' | 'streak';
  message: string;
  onDismiss: () => void;
}

export function SessionEndReminder({ type, message, onDismiss }: SessionEndReminderProps) {
  const reduceMotion = useReduceMotion();
  const slide = useSharedValue(reduceMotion ? 0 : 80);
  const fade = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      // Reduce motion: banner shows settled in place (no slide/fade) and the
      // 4s auto-dismiss fires instantly with no exit animation.
      slide.value = 0;
      fade.value = 1;
      const timer = setTimeout(onDismiss, 4000);
      return () => clearTimeout(timer);
    }

    slide.value = withSpring(0, { damping: 14, stiffness: 80 });
    fade.value = withTiming(1, { duration: 300 });

    const timer = setTimeout(() => {
      slide.value = withTiming(80, { duration: 200 });
      fade.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(onDismiss)();
        }
      });
    }, 4000);

    return () => {
      clearTimeout(timer);
      cancelAnimation(slide);
      cancelAnimation(fade);
    };
  }, [onDismiss, reduceMotion, slide, fade]);

  const accentColor = type === 'daily' ? COLORS.gold : COLORS.orange;

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: slide.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        containerStyle,
      ]}
    >
      <Pressable onPress={onDismiss}>
        <LinearGradient
          colors={GRADIENTS.surfaceCard}
          style={[styles.banner, { borderColor: accentColor + '40' }, SHADOWS.medium]}
        >
          <GameIcon name={type === 'daily' ? 'sun' : 'flame'} size={25} />
          <Text style={[styles.message, { color: accentColor }]}>{message}</Text>
          <Text style={styles.dismiss}>✕</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 150,
  },
  banner: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    lineHeight: 18,
  },
  dismiss: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
  },
});
