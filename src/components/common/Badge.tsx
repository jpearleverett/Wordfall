import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { FONTS } from '../../constants';

const COLORS = {
  accent: '#00d4ff',
  textPrimary: '#ffffff',
};

interface BadgeProps {
  value?: number | string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'filled' | 'outlined' | 'dot';
}

const SIZE_CONFIG: Record<
  string,
  { minW: number; h: number; fontSize: number; px: number; dotSize: number }
> = {
  small: { minW: 16, h: 16, fontSize: 9, px: 4, dotSize: 8 },
  medium: { minW: 20, h: 20, fontSize: 11, px: 6, dotSize: 10 },
  large: { minW: 26, h: 26, fontSize: 13, px: 8, dotSize: 14 },
};

export default function Badge({
  value,
  color = COLORS.accent,
  size = 'medium',
  variant = 'filled',
}: BadgeProps) {
  const cfg = SIZE_CONFIG[size] ?? SIZE_CONFIG.medium;

  if (variant === 'dot') {
    return (
      <View
        style={[
          styles.dot,
          {
            width: cfg.dotSize,
            height: cfg.dotSize,
            borderRadius: cfg.dotSize / 2,
            backgroundColor: color,
          },
        ]}
      />
    );
  }

  const containerStyle: ViewStyle[] = [
    styles.base,
    {
      minWidth: cfg.h,
      height: cfg.h,
      borderRadius: cfg.h / 2,
      paddingHorizontal: cfg.px,
    },
  ];

  const textStyle: TextStyle[] = [
    styles.text,
    { fontSize: cfg.fontSize },
  ];

  if (variant === 'filled') {
    containerStyle.push({ backgroundColor: color });
    textStyle.push({ color: COLORS.textPrimary });
  } else {
    containerStyle.push({
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: color,
    });
    textStyle.push({ color });
  }

  const display = value !== undefined ? String(value) : '';

  return (
    <View style={containerStyle}>
      {display !== '' && <Text style={textStyle}>{display}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: FONTS.bodyBold,
    textAlign: 'center',
  },
  dot: {},
});
