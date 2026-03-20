import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS } from '../../constants';

interface TooltipProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  position?: 'top' | 'bottom';
}

export function Tooltip({ message, visible, onDismiss, position = 'top' }: TooltipProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 100, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top' ? styles.positionTop : styles.positionBottom,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable onPress={onDismiss}>
        <LinearGradient
          colors={GRADIENTS.surfaceCard}
          style={[styles.tooltip, SHADOWS.medium]}
        >
          <View style={styles.arrow} />
          <Text style={styles.message}>{message}</Text>
          <Text style={styles.tapToDismiss}>Tap to dismiss</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 100,
    alignItems: 'center',
  },
  positionTop: {
    top: 100,
  },
  positionBottom: {
    bottom: 120,
  },
  tooltip: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
    maxWidth: 320,
  },
  arrow: {
    position: 'absolute',
    top: -6,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    transform: [{ rotate: '45deg' }],
  },
  message: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 6,
  },
  tapToDismiss: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
});
