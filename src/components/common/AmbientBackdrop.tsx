import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { COLORS } from '../../constants';

interface AmbientBackdropProps {
  variant?: 'home' | 'library';
}

function FloatingOrb({ color, size, top, left, duration, xOffset, yOffset }: { color: string; size: number; top: string; left: string; duration: number; xOffset: number; yOffset: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [anim, duration]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          top,
          left,
          backgroundColor: color,
          opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.16, 0.3, 0.16] }),
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-xOffset, xOffset] }) },
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [yOffset, -yOffset] }) },
            { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.92, 1.06, 0.92] }) },
          ],
        },
      ]}
    />
  );
}

export function AmbientBackdrop({ variant = 'home' }: AmbientBackdropProps) {
  const sparkles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: index,
        top: `${8 + ((index * 17) % 78)}%`,
        left: `${4 + ((index * 23) % 88)}%`,
        color: index % 3 === 0 ? COLORS.goldGlow : index % 2 === 0 ? COLORS.purpleGlow : COLORS.accentGlow,
        size: 2 + (index % 3),
      })),
    [],
  );

  return (
    <View pointerEvents="none" style={styles.container}>
      <FloatingOrb color={variant === 'home' ? COLORS.accentGlow : COLORS.purpleGlow} size={220} top="-4%" left="68%" duration={6800} xOffset={10} yOffset={12} />
      <FloatingOrb color={variant === 'home' ? COLORS.purpleGlow : COLORS.accentGlow} size={180} top="22%" left="-8%" duration={7600} xOffset={14} yOffset={16} />
      <FloatingOrb color={COLORS.goldGlow} size={140} top="72%" left="74%" duration={8200} xOffset={12} yOffset={14} />
      {sparkles.map((sparkle) => (
        <View
          key={sparkle.id}
          style={[
            styles.sparkle,
            {
              top: sparkle.top,
              left: sparkle.left,
              width: sparkle.size,
              height: sparkle.size,
              borderRadius: sparkle.size / 2,
              backgroundColor: sparkle.color,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
  },
  sparkle: {
    position: 'absolute',
    opacity: 0.65,
  },
});
