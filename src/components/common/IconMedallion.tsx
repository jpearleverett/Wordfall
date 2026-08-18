import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants';

interface IconMedallionProps {
  /** Emoji or single glyph rendered at the medallion's center. */
  glyph?: string;
  /** Image alternative to the glyph (e.g. LOCAL_IMAGES.iconCoin). */
  source?: ImageSourcePropType;
  /** Outer diameter in px. */
  size?: number;
  /** Accent color for the ring, glow, and body tint. */
  accent?: string;
  /** 'circle' (default) or softly-rounded 'squircle'. */
  shape?: 'circle' | 'squircle';
  /** Dims + desaturates for locked/disabled states. */
  muted?: boolean;
  style?: ViewStyle;
}

function withAlpha(color: string, alphaHex: string): string {
  // Accepts #rrggbb; falls back to the color unchanged for anything else.
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color + alphaHex : color;
}

/**
 * IconMedallion — the shared "designed icon" treatment. The blind design
 * review's single most repeated note across screens was that raw emoji
 * floating on flat cards read as placeholder art. This wraps any glyph or
 * image in a layered gem: soft accent glow, dark radial-ish body gradient,
 * glass top highlight, and a tinted ring — so iconography reads as crafted
 * game UI instead of system emoji.
 */
export default function IconMedallion({
  glyph,
  source,
  size = 44,
  accent = COLORS.purple,
  shape = 'circle',
  muted = false,
  style,
}: IconMedallionProps) {
  const radius = shape === 'circle' ? size / 2 : size * 0.3;
  const ringColor = muted ? 'rgba(255,255,255,0.14)' : withAlpha(accent, '73');
  const glowColor = muted ? '#000' : accent;
  const bodyTop = muted ? 'rgba(255,255,255,0.05)' : withAlpha(accent, '3D');
  const bodyBottom = 'rgba(8, 2, 22, 0.92)';

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth: 1.5,
          borderColor: ringColor,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: bodyBottom,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: muted ? 0.2 : 0.55,
          shadowRadius: size * 0.22,
          elevation: muted ? 2 : 6,
        },
        muted && { opacity: 0.55 },
        style,
      ]}
    >
      <LinearGradient
        colors={[bodyTop, bodyBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Glass top highlight */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.06,
          left: size * 0.16,
          right: size * 0.16,
          height: size * 0.16,
          borderRadius: size * 0.08,
          backgroundColor: 'rgba(255,255,255,0.14)',
        }}
      />
      {source ? (
        <Image
          source={source}
          style={{ width: size * 0.56, height: size * 0.56 }}
          resizeMode="contain"
        />
      ) : (
        <Text
          style={{
            fontSize: size * 0.46,
            lineHeight: size * 0.6,
            textAlign: 'center',
            textShadowColor: 'rgba(0,0,0,0.6)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
          }}
        >
          {glyph}
        </Text>
      )}
    </View>
  );
}
