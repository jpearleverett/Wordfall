import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../../constants';

interface TooltipProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  position?: 'top' | 'bottom';
}

export function Tooltip({ message, visible, onDismiss, position = 'top' }: TooltipProps) {
  const fade = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      fade.value = withTiming(1, { duration: 250 });
      scale.value = withSpring(1, { damping: 14, stiffness: 100 });
    } else {
      fade.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const tooltipStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top' ? styles.positionTop : styles.positionBottom,
        tooltipStyle,
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
    fontFamily: FONTS.bodySemiBold,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 6,
  },
  tapToDismiss: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    fontFamily: FONTS.bodySemiBold,
  },
});
