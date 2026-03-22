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

  const outerStyle: ViewStyle[] = [styles.base, variantStyle, style as ViewStyle].filter(Boolean) as ViewStyle[];

  const innerContent = (
    <LinearGradient
      colors={['rgba(31, 0, 56, 0.96)', 'rgba(9, 10, 26, 0.96)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, { padding }]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.innerHighlight}
        locations={[0, 0.3]}
      />
      <LinearGradient
        colors={[GRADIENTS.boardGlow[0], 'transparent']}
        start={{ x: 0.1, y: 0.2 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.aura}
      />
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={outerStyle}>
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
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 16,
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
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 14,
  },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 17,
    overflow: 'hidden',
  },
  innerHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 17,
  },
  aura: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 17,
    opacity: 0.8,
  },
});
