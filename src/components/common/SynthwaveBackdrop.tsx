import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, DimensionValue, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants';
import { CachedImage } from './CachedImage';
import { BACKGROUND_ASSETS } from '../../utils/assetUrls';
import { LOCAL_IMAGES } from '../../utils/localAssets';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function TwinklingStar({
  top,
  left,
  color,
  size,
  delay,
  duration,
}: {
  top: DimensionValue;
  left: DimensionValue;
  color: string;
  size: number;
  delay: number;
  duration: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        Animated.delay(1500),
      ]),
    ).start();
  }, [anim, delay, duration]);

  return (
    <View pointerEvents="none" style={[styles.absolute, { top, left }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.1, 0.95, 0.1] }),
          transform: [
            { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1.3, 0.4] }) },
          ],
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: size * 2,
        }}
      />
    </View>
  );
}

export function SynthwaveBackdrop() {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const horizonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(horizonAnim, { toValue: 1, duration: 5000, useNativeDriver: true }),
        Animated.timing(horizonAnim, { toValue: 0, duration: 5000, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim, horizonAnim]);

  const stars = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        top: `${3 + ((i * 11) % 32)}%` as DimensionValue,
        left: `${2 + ((i * 19) % 94)}%` as DimensionValue,
        color:
          i % 5 === 0
            ? '#ff2d95'
            : i % 4 === 0
            ? '#00e5ff'
            : i % 3 === 0
            ? '#c84dff'
            : i % 2 === 0
            ? 'rgba(255,255,255,0.9)'
            : 'rgba(255,255,255,0.6)',
        size: 1.5 + (i % 4) * 0.8,
        delay: (i * 280) % 3000,
        duration: 1200 + (i % 4) * 450,
      })),
    [],
  );

  return (
    <View pointerEvents="none" style={styles.container}>
      <LinearGradient
        colors={GRADIENTS.synthwave.sky as unknown as [string, string, ...string[]]}
        locations={[0, 0.25, 0.45, 0.6, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Image
        source={LOCAL_IMAGES.bgGameplay}
        style={styles.bgImage}
        resizeMode="cover"
      />

      <View style={styles.colorTint} />

      <Animated.View
        style={[
          styles.sunGlow,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.18, 0.38],
            }),
            transform: [
              { scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.08] }) },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.horizonGlow,
          {
            opacity: horizonAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.12, 0.25],
            }),
          },
        ]}
      />

      <View style={styles.neonLineTop} />
      <View style={styles.neonLineBottom} />

      {stars.map((star) => (
        <TwinklingStar
          key={star.id}
          top={star.top}
          left={star.left}
          color={star.color}
          size={star.size}
          delay={star.delay}
          duration={star.duration}
        />
      ))}

      <LinearGradient
        colors={['transparent', 'rgba(10, 0, 21, 0.7)'] as [string, string]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomFade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  absolute: {
    position: 'absolute',
  },
  colorTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(100, 0, 120, 0.15)',
  },
  sunGlow: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.12,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 1.4,
    height: SCREEN_WIDTH * 0.9,
    borderRadius: SCREEN_WIDTH * 0.45,
    backgroundColor: 'rgba(255, 45, 149, 0.25)',
    left: (SCREEN_WIDTH - SCREEN_WIDTH * 1.4) / 2,
  },
  horizonGlow: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.35,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 2,
    height: SCREEN_WIDTH * 0.3,
    borderRadius: SCREEN_WIDTH * 0.15,
    backgroundColor: 'rgba(0, 229, 255, 0.20)',
    left: (SCREEN_WIDTH - SCREEN_WIDTH * 2) / 2,
  },
  neonLineTop: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.38,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 45, 149, 0.25)',
    shadowColor: '#ff2d95',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  neonLineBottom: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.42,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 229, 255, 0.20)',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
  },
});
