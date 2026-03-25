import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS, MATERIALS } from '../../constants';

interface NeonButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'gold' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  isPrimaryCTA?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

const VARIANT_CONFIG: Record<
  string,
  {
    gradient: readonly [string, string, ...string[]];
    glowColor: string;
    textColor: string;
    borderColor: string;
  }
> = {
  primary: {
    gradient: GRADIENTS.button.primary,
    glowColor: COLORS.accent,
    textColor: '#ffffff',
    borderColor: COLORS.accent,
  },
  gold: {
    gradient: GRADIENTS.button.gold,
    glowColor: COLORS.gold,
    textColor: '#000000',
    borderColor: COLORS.gold,
  },
  danger: {
    gradient: GRADIENTS.button.danger,
    glowColor: COLORS.coral,
    textColor: '#ffffff',
    borderColor: COLORS.coral,
  },
  ghost: {
    gradient: ['transparent', 'transparent'] as unknown as readonly [string, string],
    glowColor: COLORS.accent,
    textColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
};

const SIZE_CONFIG: Record<
  string,
  { paddingV: number; paddingH: number; fontSize: number; radius: number }
> = {
  small: { paddingV: 8, paddingH: 16, fontSize: 13, radius: 10 },
  medium: { paddingV: 12, paddingH: 24, fontSize: 15, radius: 12 },
  large: { paddingV: 16, paddingH: 32, fontSize: 17, radius: 14 },
};

const NeonButton: React.FC<NeonButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  isPrimaryCTA = false,
  disabled = false,
  icon,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Subtle idle pulse for primary CTA only
  useEffect(() => {
    if (!isPrimaryCTA || disabled) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isPrimaryCTA, disabled, pulseAnim]);

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
      bounciness: 6,
    }).start();
  };

  const v = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.primary;
  const s = SIZE_CONFIG[size] ?? SIZE_CONFIG.medium;

  const glowShadow: ViewStyle = disabled
    ? {}
    : SHADOWS.neonEdge(v.glowColor);

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
          opacity: isPrimaryCTA && !disabled ? pulseAnim : disabled ? 0.5 : 1,
        },
      ]}
    >
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={disabled ? undefined : handlePressIn}
        onPressOut={disabled ? undefined : handlePressOut}
        disabled={disabled}
      >
        <View
          style={[
            styles.outerBorder,
            {
              borderRadius: s.radius,
              borderColor: disabled ? COLORS.textMuted : v.borderColor,
              borderWidth: MATERIALS.neonTube.borderWidth,
            },
            !disabled && glowShadow,
          ]}
        >
          <LinearGradient
            colors={[v.gradient[0], v.gradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.gradient,
              {
                paddingVertical: s.paddingV,
                paddingHorizontal: s.paddingH,
                borderRadius: s.radius - 1.5,
              },
            ]}
          >
            {/* Inner highlight for 3D look */}
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.0)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: s.radius - 1.5 }]}
              locations={[0, 0.35]}
            />
            <View style={styles.contentRow}>
              {icon && <View style={styles.iconWrap}>{icon}</View>}
              <Text
                style={[
                  styles.label,
                  { color: v.textColor, fontSize: s.fontSize },
                ]}
              >
                {label}
              </Text>
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerBorder: {
    overflow: 'hidden',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    marginRight: 8,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.5,
  },
});

export default React.memo(NeonButton);
