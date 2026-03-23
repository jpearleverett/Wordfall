import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, DimensionValue, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants';
import { CachedImage } from './CachedImage';
import { BACKGROUND_ASSETS } from '../../utils/assetUrls';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Twinkling Star ──────────────────────────────────────────────────
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

// ─── Main Synthwave Backdrop ───────────────────────────────────────────
export function SynthwaveBackdrop() {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const horizonPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(horizonPulse, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(horizonPulse, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim, horizonPulse]);

  const stars = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        top: `${3 + ((i * 13) % 30)}%` as DimensionValue,
        left: `${2 + ((i * 23) % 94)}%` as DimensionValue,
        color:
          i % 4 === 0
            ? COLORS.accentLight
            : i % 3 === 0
            ? COLORS.purpleLight
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

      <CachedImage
        uri={BACKGROUND_ASSETS.gameplayBg}
        overlayColor="rgba(16, 4, 42, 0.56)"
        overlayOpacity={0.56}
        blurRadius={0}
      />

      <LinearGradient
        colors={['rgba(9, 1, 28, 0.20)', 'rgba(68, 18, 113, 0.18)', 'rgba(255, 76, 215, 0.06)'] as [string, string, string]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.colorTint}
      />

      <View style={styles.vignette} />

      <View style={styles.sunContainer}>
        <LinearGradient
          colors={['rgba(90, 255, 255, 0.95)', 'rgba(128, 223, 255, 0.88)', 'rgba(204, 104, 255, 0.92)', 'rgba(255, 92, 203, 0.95)'] as [string, string, string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.sun}
        >
          {Array.from({ length: 9 }).map((_, index) => (
            <View
              key={`sun-stripe-${index}`}
              style={[
                styles.sunStripe,
                {
                  top: 40 + index * 34,
                  opacity: 0.55 - index * 0.04,
                },
              ]}
            />
          ))}
        </LinearGradient>
        <Animated.View
          style={[
            styles.sunGlow,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.24, 0.42],
              }),
              transform: [
                {
                  scale: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1.04],
                  }),
                },
              ],
            },
          ]}
        />
      </View>

      <View style={styles.horizonGlowWrap}>
        <Animated.View
          style={[
            styles.horizonGlow,
            {
              opacity: horizonPulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.45, 0.75],
              }),
            },
          ]}
        />
      </View>

      <View style={styles.skylineWrap}>
        <View style={styles.skylineBase} />
        {SKYLINE_BARS.map((bar, index) => (
          <View
            key={`skyline-${index}`}
            style={[
              styles.skylineBar,
              {
                left: `${bar.left}%`,
                width: `${bar.width}%`,
                height: bar.height,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.gridPlane}>
        {GRID_HORIZONTAL_LINES.map((line, index) => (
          <View
            key={`h-${index}`}
            style={[
              styles.gridHorizontal,
              {
                bottom: line.bottom,
                opacity: line.opacity,
              },
            ]}
          />
        ))}
        {GRID_VERTICAL_LINES.map((line, index) => (
          <View
            key={`v-${index}`}
            style={[
              styles.gridVertical,
              {
                left: `${line.left}%`,
                transform: [{ rotate: `${line.rotate}deg` }],
                opacity: line.opacity,
              },
            ]}
          />
        ))}
      </View>

      <Animated.View
        style={[
          styles.ambientGlow,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.12, 0.24],
            }),
          },
        ]}
      />

      {/* Twinkling stars in upper sky */}
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
        colors={['transparent', 'rgba(8, 0, 20, 0.86)'] as [string, string]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomFade}
      />
    </View>
  );
}

const SKYLINE_BARS = [
  { left: 0, width: 7, height: 92 },
  { left: 6, width: 4, height: 48 },
  { left: 8.5, width: 8, height: 128 },
  { left: 15, width: 4.5, height: 64 },
  { left: 18.5, width: 7, height: 106 },
  { left: 74, width: 7, height: 102 },
  { left: 80, width: 4, height: 58 },
  { left: 83.5, width: 5, height: 138 },
  { left: 88, width: 4.5, height: 74 },
  { left: 92, width: 8, height: 54 },
] as const;

const GRID_HORIZONTAL_LINES = Array.from({ length: 13 }, (_, index) => ({
  bottom: 24 + index * 34,
  opacity: 0.88 - index * 0.05,
}));

const GRID_VERTICAL_LINES = Array.from({ length: 11 }, (_, index) => ({
  left: index * 10,
  rotate: (index - 5) * 7,
  opacity: index === 5 ? 0.9 : 0.5,
}));

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
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 0, 42, 0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 80,
  },
  sunContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.13,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.46,
    height: SCREEN_WIDTH * 0.46,
  },
  sun: {
    width: '100%',
    height: '100%',
    borderRadius: SCREEN_WIDTH * 0.23,
    overflow: 'hidden',
  },
  sunStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 7,
    backgroundColor: 'rgba(42, 10, 72, 0.56)',
  },
  sunGlow: {
    position: 'absolute',
    top: -50,
    left: -80,
    right: -80,
    bottom: -20,
    borderRadius: 240,
    backgroundColor: 'rgba(58, 237, 255, 0.30)',
    shadowColor: 'rgba(64, 233, 255, 0.95)',
    shadowOpacity: 0.8,
    shadowRadius: 44,
  },
  horizonGlowWrap: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.28,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  horizonGlow: {
    width: SCREEN_WIDTH * 0.76,
    height: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(78, 255, 255, 0.55)',
    shadowColor: 'rgba(99, 255, 255, 0.95)',
    shadowOpacity: 0.85,
    shadowRadius: 22,
  },
  skylineWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SCREEN_HEIGHT * 0.34,
    height: 150,
  },
  skylineBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 20,
    backgroundColor: 'rgba(36, 18, 68, 0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(89, 251, 255, 0.5)',
  },
  skylineBar: {
    position: 'absolute',
    bottom: 18,
    backgroundColor: 'rgba(23, 9, 49, 0.86)',
    borderTopWidth: 1.2,
    borderLeftWidth: 1.2,
    borderRightWidth: 1.2,
    borderColor: 'rgba(78, 230, 255, 0.56)',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  gridPlane: {
    position: 'absolute',
    left: -SCREEN_WIDTH * 0.2,
    right: -SCREEN_WIDTH * 0.2,
    bottom: -10,
    height: SCREEN_HEIGHT * 0.36,
  },
  gridHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(110, 202, 255, 0.92)',
    shadowColor: 'rgba(0, 212, 255, 0.85)',
    shadowOpacity: 0.65,
    shadowRadius: 8,
  },
  gridVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(106, 195, 255, 0.70)',
    shadowColor: 'rgba(0, 212, 255, 0.65)',
    shadowOpacity: 0.45,
    shadowRadius: 6,
  },
  ambientGlow: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.16,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 1.16,
    height: SCREEN_WIDTH * 0.84,
    borderRadius: SCREEN_WIDTH * 0.42,
    backgroundColor: 'rgba(255, 74, 210, 0.22)',
    left: (SCREEN_WIDTH - SCREEN_WIDTH * 1.16) / 2,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
  },
});
