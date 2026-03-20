import React, { useRef } from 'react';
import {
  Text,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
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
  star: '#ffd700',
  buttonPrimary: '#00d4ff',
  buttonSecondary: '#252b5e',
  buttonDanger: '#ff6b6b',
};

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  icon?: string;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<
  string,
  { bg: string; text: string; border?: string }
> = {
  primary: { bg: COLORS.buttonPrimary, text: '#000000' },
  secondary: { bg: COLORS.buttonSecondary, text: COLORS.textPrimary },
  danger: { bg: COLORS.buttonDanger, text: '#ffffff' },
  ghost: { bg: 'transparent', text: COLORS.accent, border: COLORS.accent },
  gold: { bg: COLORS.gold, text: '#000000' },
};

const SIZE_STYLES: Record<
  string,
  { paddingV: number; paddingH: number; fontSize: number; radius: number }
> = {
  small: { paddingV: 8, paddingH: 16, fontSize: 13, radius: 10 },
  medium: { paddingV: 12, paddingH: 24, fontSize: 15, radius: 12 },
  large: { paddingV: 16, paddingH: 32, fontSize: 17, radius: 14 },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  icon,
  fullWidth = false,
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const v = VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary;
  const s = SIZE_STYLES[size] ?? SIZE_STYLES.medium;

  const containerStyle: Animated.AnimatedProps<ViewStyle>[] = [
    styles.base,
    {
      backgroundColor: v.bg,
      paddingVertical: s.paddingV,
      paddingHorizontal: s.paddingH,
      borderRadius: s.radius,
      transform: [{ scale: scaleAnim }],
      opacity: disabled ? 0.45 : 1,
    } as any,
    v.border ? { borderWidth: 1.5, borderColor: v.border } : undefined,
    fullWidth ? styles.fullWidth : undefined,
    variant === 'primary' && styles.primaryShadow,
    variant === 'gold' && styles.goldShadow,
  ].filter(Boolean) as any;

  const textStyle: TextStyle[] = [
    styles.text,
    {
      color: v.text,
      fontSize: s.fontSize,
    },
  ];

  return (
    <TouchableWithoutFeedback
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={containerStyle}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={textStyle}>{title}</Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  primaryShadow: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  goldShadow: {
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
