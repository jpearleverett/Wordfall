import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../../constants';

interface ProgressBarProps {
  progress: number; // 0-1
  color?: string;
  backgroundColor?: string;
  height?: number;
  showLabel?: boolean;
  animated?: boolean;
}

/**
 * Attempt to lighten a hex color by mixing it toward white.
 * Falls back to the original color for non-hex inputs.
 */
function lighten(hex: string, amount: number = 0.25): string {
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  if (!match) return hex;
  const num = parseInt(match[1], 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default function ProgressBar({
  progress,
  color = COLORS.accent,
  backgroundColor = '#141838',
  height = 10,
  showLabel = false,
  animated = true,
}: ProgressBarProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(widthAnim, {
        toValue: clampedProgress,
        duration: 500,
        useNativeDriver: false,
      }).start();
    } else {
      widthAnim.setValue(clampedProgress);
    }
  }, [clampedProgress, animated, widthAnim]);

  const widthInterpolation = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const lighterColor = lighten(color, 0.2);
  const borderRadius = height / 2;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.track,
          {
            backgroundColor,
            height,
            borderRadius,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              height,
              borderRadius,
              width: widthInterpolation,
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7,
              shadowRadius: 8,
              elevation: 4,
            },
          ]}
        >
          <LinearGradient
            colors={[lighterColor, color]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius }]}
          />
          {/* Glass shine highlight */}
          <View
            style={[
              styles.shine,
              {
                height: height * 0.4,
                borderRadius: height * 0.2,
                top: height * 0.12,
              },
            ]}
          />
        </Animated.View>
      </View>
      {showLabel && (
        <Text style={styles.label}>
          {Math.round(clampedProgress * 100)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    left: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  label: {
    marginLeft: 10,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    minWidth: 36,
    textAlign: 'right',
  },
});
