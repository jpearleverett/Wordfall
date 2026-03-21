import React, { ReactNode } from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADII, SHADOWS } from '../../constants';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'glow';
  padding?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function Card({
  children,
  variant = 'default',
  padding = 16,
  onPress,
  style,
}: CardProps) {
  const variantStyle = VARIANT_MAP[variant] ?? VARIANT_MAP.default;

  const combinedStyle: ViewStyle[] = [styles.base, { padding }, variantStyle, style as ViewStyle].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={combinedStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={combinedStyle}>{children}</View>;
}

const VARIANT_MAP: Record<string, ViewStyle> = {
  default: {
    backgroundColor: COLORS.surfaceGlassStrong,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  elevated: {
    backgroundColor: COLORS.surfaceGlassStrong,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  glow: {
    backgroundColor: COLORS.surfaceGlassStrong,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    ...SHADOWS.glow,
  },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: RADII.lg,
    overflow: 'hidden',
  },
});
