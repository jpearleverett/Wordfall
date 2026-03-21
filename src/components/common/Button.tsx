import React, { useRef } from 'react';
import {
  Text,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS } from '../../constants';

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

const GRADIENT_VARIANTS: Record<string, readonly [string, string]> = {
  primary: GRADIENTS.button.primary,
  gold: GRADIENTS.button.gold,
  danger: GRADIENTS.button.danger,
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
      toValue: 0.93,
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
  const gradientColors = GRADIENT_VARIANTS[variant];
  const hasGradient = !!gradientColors;

  const containerStyle: Animated.AnimatedProps<ViewStyle>[] = [
    styles.base,
    {
      borderRadius: s.radius,
      transform: [{ scale: scaleAnim }],
      opacity: disabled ? 0.45 : 1,
    } as any,
    !hasGradient && {
      backgroundColor: v.bg,
      paddingVertical: s.paddingV,
      paddingHorizontal: s.paddingH,
    },
    v.border ? { borderWidth: 1.5, borderColor: v.border } : undefined,
    fullWidth ? styles.fullWidth : undefined,
    variant === 'primary' && styles.primaryShadow,
    variant === 'gold' && styles.goldShadow,
    variant === 'danger' && styles.dangerShadow,
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
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
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
        {hasGradient ? (
          <LinearGradient
            colors={[gradientColors[0], gradientColors[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.gradient,
              {
                paddingVertical: s.paddingV,
                paddingHorizontal: s.paddingH,
                borderRadius: s.radius,
              },
            ]}
          >
            {/* Inner highlight for 3D look */}
            <LinearGradient
              colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.0)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[styles.innerHighlight, { borderRadius: s.radius }]}
              locations={[0, 0.3]}
            />
            <View style={styles.contentRow}>
              {content}
            </View>
          </LinearGradient>
        ) : (
          content
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
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  innerHighlight: {
    ...StyleSheet.absoluteFillObject,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.4,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  primaryShadow: {
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  goldShadow: {
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  dangerShadow: {
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
