import React, { ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants';

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

  const outerStyle: ViewStyle[] = [
    styles.base,
    variantStyle,
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  const innerContent = (
    <LinearGradient
      colors={[GRADIENTS.surfaceCard[0], GRADIENTS.surfaceCard[1]]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.gradient, { padding }]}
    >
      {/* Subtle inner highlight for depth */}
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.innerHighlight}
        locations={[0, 0.3]}
      />
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={outerStyle}
      >
        {innerContent}
      </TouchableOpacity>
    );
  }

  return <View style={outerStyle}>{innerContent}</View>;
}

const VARIANT_MAP: Record<string, ViewStyle> = {
  default: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  elevated: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 14,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.surfaceLight,
  },
  glow: {
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 15,
  },
  innerHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
  },
});
