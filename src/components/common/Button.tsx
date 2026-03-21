import React, { useRef } from 'react';
import { Text, TouchableWithoutFeedback, Animated, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, RADII, SHADOWS, TYPOGRAPHY } from '../../constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  icon?: string;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<string, { bg?: string; text: string; border?: string; gradient?: string[] }> = {
  primary: { text: COLORS.textOnAccent, gradient: GRADIENTS.accent },
  secondary: { bg: COLORS.buttonSecondary, text: COLORS.textPrimary, border: COLORS.border },
  danger: { bg: COLORS.buttonDanger, text: '#ffffff' },
  ghost: { bg: 'transparent', text: COLORS.accent, border: COLORS.accent },
  gold: { text: COLORS.textOnAccent, gradient: GRADIENTS.gold },
};

const SIZE_STYLES: Record<string, { paddingV: number; paddingH: number; fontSize: number; radius: number }> = {
  small: { paddingV: 9, paddingH: 16, fontSize: 13, radius: RADII.sm },
  medium: { paddingV: 13, paddingH: 24, fontSize: 15, radius: RADII.md },
  large: { paddingV: 16, paddingH: 32, fontSize: 17, radius: RADII.lg },
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
      toValue: 0.97,
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
      borderRadius: s.radius,
      transform: [{ scale: scaleAnim }],
      opacity: disabled ? 0.45 : 1,
    } as any,
    fullWidth ? styles.fullWidth : undefined,
    !v.gradient && v.bg ? { backgroundColor: v.bg } : undefined,
    v.border ? { borderWidth: 1.2, borderColor: v.border } : undefined,
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

  const content = (
    <>
      {icon ? <Text style={[styles.icon, { color: v.text }]}>{icon}</Text> : null}
      <Text style={textStyle}>{title}</Text>
    </>
  );

  return (
    <TouchableWithoutFeedback
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={containerStyle}>
        {v.gradient ? (
          <LinearGradient colors={v.gradient} style={[styles.gradientFill, { paddingVertical: s.paddingV, paddingHorizontal: s.paddingH, borderRadius: s.radius }]}>
            {content}
          </LinearGradient>
        ) : (
          <Animated.View style={{ paddingVertical: s.paddingV, paddingHorizontal: s.paddingH, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            {content}
          </Animated.View>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradientFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontFamily: TYPOGRAPHY.display,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  primaryShadow: {
    ...SHADOWS.glow,
  },
  goldShadow: {
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
