import React, { useEffect, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';

interface SessionEndReminderProps {
  type: 'daily' | 'streak';
  message: string;
  onDismiss: () => void;
}

export function SessionEndReminder({ type, message, onDismiss }: SessionEndReminderProps) {
  const slide = useSharedValue(80);
  const fade = useSharedValue(0);

  useEffect(() => {
    slide.value = withSpring(0, { damping: 14, stiffness: 80 });
    fade.value = withTiming(1, { duration: 300 });

    const timer = setTimeout(() => {
      slide.value = withTiming(80, { duration: 200 });
      fade.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(onDismiss)();
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const icon = type === 'daily' ? '☀️' : '🔥';
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
          <Text style={styles.icon}>{icon}</Text>
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
  icon: { fontSize: 22 },
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
