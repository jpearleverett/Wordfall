import React, { ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';

const COLORS = {
  bg: '#0a0e27',
  bgLight: '#111638',
  surface: '#1a1f45',
  surfaceLight: '#252b5e',
  textPrimary: '#ffffff',
  textSecondary: '#8890b5',
  textMuted: '#4a5280',
  accent: '#00d4ff',
  accentGlow: 'rgba(0, 212, 255, 0.3)',
  gold: '#ffd700',
  green: '#4caf50',
  coral: '#ff6b6b',
  purple: '#a855f7',
};

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

  const combinedStyle: ViewStyle[] = [
    styles.base,
    { padding },
    variantStyle,
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={combinedStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={combinedStyle}>{children}</View>;
}

const VARIANT_MAP: Record<string, ViewStyle> = {
  default: {
    backgroundColor: COLORS.surface,
  },
  elevated: {
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.surfaceLight,
  },
  glow: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    overflow: 'hidden',
  },
});
