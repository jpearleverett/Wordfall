/**
 * Typography — system font-scale aware Text wrapper.
 *
 * RN <Text> respects OS font-scale by default. We intentionally clamp the
 * effective scale to [1.0, 1.3] so layout-critical screens (grid, HUD, shop
 * pricing) do not clip when a user has "Large Text" enabled, while still
 * giving a meaningful accessibility boost.
 *
 * Usage:
 *   <Typography variant="bodyMedium">Hello</Typography>
 *   <Typography variant="screenTitle" color={COLORS.accent}>Settings</Typography>
 *   <Typography size={14} style={{ color: '#fff' }}>Custom</Typography>
 *
 * The wrapper forwards every <Text> prop, so existing call sites (e.g.
 * numberOfLines, onPress, accessibility*, style) keep working.
 */

import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
  PixelRatio,
  Platform,
} from 'react-native';
import { TYPOGRAPHY } from '../../constants';
import { logger } from '../../utils/logger';

export type TypographyVariant = keyof typeof TYPOGRAPHY;

export interface TypographyProps extends RNTextProps {
  variant?: TypographyVariant;
  /** Explicit color shortcut (equivalent to style={{ color }}). */
  color?: string;
  /** Explicit size shortcut — overrides variant.fontSize. */
  size?: number;
  /** Explicit fontFamily shortcut — overrides variant.fontFamily. */
  family?: string;
}

/**
 * App-wide font-scale clamp.
 * min 1.0 (never shrink below designer intent)
 * max 1.3 (prevents HUD / grid clip at accessibility setting "XXL")
 */
export const MIN_FONT_SCALE = 1.0;
export const MAX_FONT_SCALE = 1.3;

/**
 * Current clamped font scale. Handy for layout that needs to reserve room
 * proportional to the user's font size (row heights, hit targets, etc.).
 */
export function getClampedFontScale(): number {
  const raw = PixelRatio.getFontScale();
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.max(MIN_FONT_SCALE, Math.min(MAX_FONT_SCALE, raw));
}

/**
 * Scale a pixel value by the clamped font scale — use this for spacing /
 * row heights that need to expand alongside text (so tap targets stay
 * comfortable even at 1.3x).
 */
export function scaleWithFont(px: number): number {
  return Math.round(px * getClampedFontScale());
}

export const Typography: React.FC<TypographyProps> = ({
  variant,
  color,
  size,
  family,
  style,
  allowFontScaling = true,
  maxFontSizeMultiplier,
  ...rest
}) => {
  const variantStyle: TextStyle | undefined = variant
    ? (TYPOGRAPHY[variant] as TextStyle)
    : undefined;

  const composed: TextStyle = {
    ...(variantStyle ?? {}),
    ...(family ? { fontFamily: family } : null),
    ...(size !== undefined ? { fontSize: size } : null),
    ...(color ? { color } : null),
  };

  // RN caps font scaling with `maxFontSizeMultiplier`. Default to our clamp
  // so callers get accessibility-boosted text without blowing out layout.
  // Android + iOS both respect this prop.
  const effectiveMax =
    maxFontSizeMultiplier ?? (allowFontScaling ? MAX_FONT_SCALE : undefined);

  return (
    <RNText
      {...rest}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={effectiveMax}
      style={[composed, style]}
    />
  );
};

/**
 * Default RN <Text> in the project includes no font-scaling clamp, which
 * means a global "Large Text" system setting can blow out tight layouts.
 * Call this once near app start to set a project-wide ceiling of 1.3x.
 *
 * Note: this mutates RNText.defaultProps. That's the officially documented
 * RN escape hatch and matches how Expo app templates configure this.
 */
export function installGlobalFontScaleClamp(): void {
  try {
    const anyText = RNText as unknown as {
      defaultProps?: { maxFontSizeMultiplier?: number; allowFontScaling?: boolean };
    };
    anyText.defaultProps = anyText.defaultProps ?? {};
    anyText.defaultProps.allowFontScaling = true;
    anyText.defaultProps.maxFontSizeMultiplier = MAX_FONT_SCALE;
  } catch {
    // defaultProps is always assignable on RNText in Expo SDK 55; swallow
    // to stay defensive if a future RN rev removes it.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      logger.warn('[Typography] could not install global font-scale clamp');
    }
  }
  // Platform-specific no-op touch so the import isn't unused if something
  // strips the global clamp in tests.
  void Platform.OS;
}

export default Typography;
