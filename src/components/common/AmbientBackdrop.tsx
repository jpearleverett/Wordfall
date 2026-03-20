import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View } from 'react-native';
import { COLORS } from '../../constants';

interface AmbientBackdropProps {
  variant?: 'home' | 'library';
}

function FloatingOrb({ color, size, top, left, duration, xOffset, yOffset }: { color: string; size: number; top: DimensionValue; left: DimensionValue; duration: number; xOffset: number; yOffset: number }) {
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
    <View pointerEvents="none" style={[styles.orb, { top, left }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.4, 0.2] }),
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-xOffset, xOffset] }) },
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [yOffset, -yOffset] }) },
            { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.9, 1.08, 0.9] }) },
          ],
        }}
      />
    </View>
  );
}

function TwinklingSparkle({ top, left, color, size, delay }: { top: DimensionValue; left: DimensionValue; color: string; size: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1200 + Math.random() * 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 1200 + Math.random() * 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [anim, delay]);

  return (
    <View pointerEvents="none" style={[styles.sparkle, { top, left }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.85, 0.2] }),
          transform: [
            { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1.2, 0.6] }) },
          ],
        }}
      />
    </View>
  );
}

export function AmbientBackdrop({ variant = 'home' }: AmbientBackdropProps) {
  const sparkles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => ({
        id: index,
        top: `${6 + ((index * 17) % 82)}%` as DimensionValue,
        left: `${3 + ((index * 23) % 90)}%` as DimensionValue,
        color: index % 4 === 0 ? COLORS.goldGlow : index % 3 === 0 ? COLORS.purpleGlow : index % 2 === 0 ? COLORS.accentGlow : 'rgba(255,255,255,0.5)',
        size: 2 + (index % 4),
        delay: (index * 340) % 2400,
      })),
    [],
  );

  return (
    <View pointerEvents="none" style={styles.container}>
      <FloatingOrb color={variant === 'home' ? COLORS.accentGlow : COLORS.purpleGlow} size={240} top="-6%" left="65%" duration={6800} xOffset={12} yOffset={14} />
      <FloatingOrb color={variant === 'home' ? COLORS.purpleGlow : COLORS.accentGlow} size={200} top="20%" left="-10%" duration={7600} xOffset={16} yOffset={18} />
      <FloatingOrb color={COLORS.goldGlow} size={160} top="70%" left="72%" duration={8200} xOffset={14} yOffset={16} />
      <FloatingOrb color="rgba(46, 216, 163, 0.25)" size={120} top="48%" left="80%" duration={9000} xOffset={10} yOffset={12} />
      {sparkles.map((sparkle) => (
        <TwinklingSparkle
          key={sparkle.id}
          top={sparkle.top}
          left={sparkle.left}
          color={sparkle.color}
          size={sparkle.size}
          delay={sparkle.delay}
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
  },
});
