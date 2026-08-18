import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SHADOWS } from '../../constants';

export type PrimaryButtonVariant = 'primary' | 'gold' | 'green' | 'danger';
export type PrimaryButtonSize = 'small' | 'medium' | 'large';

interface PrimaryButtonProps {
  label: string;
  /**
   * Optional second line rendered under the label — smaller, tighter
   * tracking. Use it for context (chapter name, price) so the main label
   * NEVER ellipsizes; only this subtitle may tail-truncate.
   */
  subLabel?: string;
  onPress: () => void;
  /** Visual intent: primary (pink), gold (deals/claims), green (success), danger. */
  variant?: PrimaryButtonVariant;
  size?: PrimaryButtonSize;
  disabled?: boolean;
  /** Stretch to the container width (default hugs content). */
  fullWidth?: boolean;
  /** Container overrides — margins/alignment only; visuals stay tokenized. */
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const SIZE_SPECS: Record<PrimaryButtonSize, { pv: number; ph: number; fontSize: number; radius: number }> = {
  small: { pv: 8, ph: 14, fontSize: 12, radius: RADIUS.lg },
  medium: { pv: 12, ph: 20, fontSize: 14, radius: RADIUS.xl },
  large: { pv: 16, ph: 24, fontSize: 16, radius: RADIUS.xl },
};

const VARIANT_GRADIENT: Record<PrimaryButtonVariant, readonly [string, string, ...string[]]> = {
  primary: GRADIENTS.button.primary,
  gold: GRADIENTS.button.gold,
  green: GRADIENTS.button.green,
  danger: GRADIENTS.button.danger,
};

// Gold/green fills are bright — dark label reads better; pink/danger keep white.
const VARIANT_LABEL_COLOR: Record<PrimaryButtonVariant, string> = {
  primary: '#fff',
  gold: COLORS.bg,
  green: COLORS.bg,
  danger: '#fff',
};

const VARIANT_GLOW: Record<PrimaryButtonVariant, string> = {
  primary: COLORS.accent,
  gold: COLORS.gold,
  green: COLORS.green,
  danger: COLORS.coral,
};

/**
 * PrimaryButton — the single CTA treatment for Buy / Claim / Join / Play
 * actions. The April 2026 design audit found 8+ hand-rolled variants of
 * this exact gradient-pill-with-display-font pattern; new CTAs should use
 * this component so every primary action in the game reads identically.
 */
export default function PrimaryButton({
  label,
  subLabel,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
}: PrimaryButtonProps) {
  const spec = SIZE_SPECS[size];
  const gradientColors = disabled
    ? ([COLORS.buttonDisabled, COLORS.buttonDisabled] as const)
    : VARIANT_GRADIENT[variant];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subLabel ? `${label}, ${subLabel}` : label)}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        fullWidth && styles.fullWidth,
        !disabled && SHADOWS.glow(VARIANT_GLOW[variant]),
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.surface,
          {
            borderRadius: spec.radius,
            paddingVertical: spec.pv,
            paddingHorizontal: spec.ph,
          },
        ]}
      >
        <Text
          style={[
            styles.label,
            { fontSize: spec.fontSize, color: disabled ? COLORS.textDisabled : VARIANT_LABEL_COLOR[variant] },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {subLabel ? (
          <Text
            style={[
              styles.subLabel,
              { color: disabled ? COLORS.textDisabled : VARIANT_LABEL_COLOR[variant] },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {subLabel}
          </Text>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  surface: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONTS.display,
    letterSpacing: 2,
    textAlign: 'center',
  },
  subLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.78,
    maxWidth: '100%',
  },
});
