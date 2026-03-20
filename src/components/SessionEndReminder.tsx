import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS } from '../constants';

interface SessionEndReminderProps {
  type: 'daily' | 'streak';
  message: string;
  onDismiss: () => void;
}

export function SessionEndReminder({ type, message, onDismiss }: SessionEndReminderProps) {
  const slideAnim = useRef(new Animated.Value(80)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 80, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 4000);

    return () => clearTimeout(timer);
  }, [slideAnim, fadeAnim, onDismiss]);

  const icon = type === 'daily' ? '☀️' : '🔥';
  const accentColor = type === 'daily' ? COLORS.gold : COLORS.orange;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
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
    fontWeight: '700',
    lineHeight: 18,
  },
  dismiss: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
