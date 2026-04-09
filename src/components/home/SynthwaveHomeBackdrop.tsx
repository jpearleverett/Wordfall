import React, { useEffect, useMemo } from 'react';
import { Dimensions, DimensionValue, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants';

const { width: SW, height: SH } = Dimensions.get('window');

const HORIZON_Y = SH * 0.45;
const SUN_SIZE = SW * 0.40;
const SUN_BANDS = GRADIENTS.synthwave.sunBands;
const BAND_COUNT = SUN_BANDS.length;

// ---------------------------------------------------------------------------
// Twinkling Star
// ---------------------------------------------------------------------------

function TwinklingStar({
  top,
  left,
  color,
  size,
  delay: delayMs,
  duration,
}: {
  top: DimensionValue;
  left: DimensionValue;
  color: string;
  size: number;
  delay: number;
  duration: number;
}) {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration }),
          withTiming(0, { duration }),
          withDelay(1200, withTiming(0, { duration: 0 })),
        ),
        -1,
      ),
    );
  }, [delayMs, duration]);

  const starStyle = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    opacity: interpolate(anim.value, [0, 0.5, 1], [0.08, 0.9, 0.08]),
    transform: [
      { scale: interpolate(anim.value, [0, 0.5, 1], [0.3, 1.4, 0.3]) },
    ],
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: size * 3,
  }));

  return (
    <View pointerEvents="none" style={[styles.absolute, { top, left }]}>
      <Animated.View style={starStyle} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Animated sub-views for BandedSun (use hooks inside own component)
// ---------------------------------------------------------------------------

import type { SharedValue } from 'react-native-reanimated';

function BandedSunGlowView({ pulse, sunTop, sunLeft }: { pulse: SharedValue<number>; sunTop: number; sunLeft: number }) {
  const glowStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: sunTop - SUN_SIZE * 0.4,
    left: sunLeft - SUN_SIZE * 0.4,
    width: SUN_SIZE * 1.8,
    height: SUN_SIZE * 1.8,
    borderRadius: SUN_SIZE * 0.9,
    backgroundColor: 'rgba(255, 45, 149, 0.08)',
    opacity: interpolate(pulse.value, [0, 1], [0.4, 0.7]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.92, 1.08]) }],
  }));
  return <Animated.View style={glowStyle} />;
}

function BandedSunReflectionView({ pulse }: { pulse: SharedValue<number> }) {
  const reflectionStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: HORIZON_Y - 1,
    left: SW * 0.1,
    right: SW * 0.1,
    height: SW * 0.06,
    borderRadius: SW * 0.03,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    opacity: interpolate(pulse.value, [0, 1], [0.3, 0.6]),
  }));
  return <Animated.View style={reflectionStyle} />;
}

// ---------------------------------------------------------------------------
// Banded Retro Sun
// ---------------------------------------------------------------------------

function BandedSun() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3500 }),
        withTiming(0, { duration: 3500 }),
      ),
      -1,
    );
  }, []);

  const sunTop = HORIZON_Y - SUN_SIZE * 0.55;
  const sunLeft = (SW - SUN_SIZE) / 2;

  // Build horizontal band slices through the sun circle
  const bands = useMemo(() => {
    const slices: React.ReactNode[] = [];
    const bandHeight = SUN_SIZE / BAND_COUNT;
    const opacities = [1, 0.92, 0.85, 0.78, 0.85, 0.92];

    for (let i = 0; i < BAND_COUNT; i++) {
      const y = i * bandHeight;
      slices.push(
        <View
          key={`band-${i}`}
          style={{
            position: 'absolute',
            top: y,
            left: 0,
            right: 0,
            height: bandHeight,
            backgroundColor: SUN_BANDS[i],
            opacity: opacities[i] ?? 0.85,
          }}
        />,
      );

      // Add thin gap between bands for the sliced look
      if (i > 0) {
        const gapHeight = 2 + i * 0.8;
        slices.push(
          <View
            key={`gap-${i}`}
            style={{
              position: 'absolute',
              top: y - gapHeight / 2,
              left: 0,
              right: 0,
              height: gapHeight,
              backgroundColor: 'transparent',
              zIndex: 1,
            }}
          />,
        );
      }
    }
    return slices;
  }, []);

  return (
    <View pointerEvents="none">
      {/* Outer glow - uses animated style for pulse */}
      <BandedSunGlowView pulse={pulse} sunTop={sunTop} sunLeft={sunLeft} />

      {/* Sun body with banded slices */}
      <View
        style={{
          position: 'absolute',
          top: sunTop,
          left: sunLeft,
          width: SUN_SIZE,
          height: SUN_SIZE,
          borderRadius: SUN_SIZE / 2,
          overflow: 'hidden',
        }}
      >
        {bands}
      </View>

      {/* Horizon glow line */}
      <View
        style={{
          position: 'absolute',
          top: HORIZON_Y - 2,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: COLORS.accent,
          opacity: 0.5,
          shadowColor: COLORS.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 12,
        }}
      />

      {/* Horizon reflection */}
      <BandedSunReflectionView pulse={pulse} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Geometric Mountain Silhouettes
// ---------------------------------------------------------------------------

function MountainSilhouettes() {
  const mountainFarColor = GRADIENTS.synthwave.mountainFar[0];
  const mountainNearColor = GRADIENTS.synthwave.mountainNear[0];

  return (
    <View pointerEvents="none">
      {/* Far mountain — left, larger */}
      <View
        style={{
          position: 'absolute',
          top: HORIZON_Y - SW * 0.22,
          left: SW * 0.02,
          width: 0,
          height: 0,
          borderBottomWidth: SW * 0.22,
          borderBottomColor: mountainFarColor,
          borderLeftWidth: SW * 0.28,
          borderLeftColor: 'transparent',
          borderRightWidth: SW * 0.28,
          borderRightColor: 'transparent',
          opacity: 0.7,
        }}
      />

      {/* Near mountain — right, smaller */}
      <View
        style={{
          position: 'absolute',
          top: HORIZON_Y - SW * 0.16,
          left: SW * 0.45,
          width: 0,
          height: 0,
          borderBottomWidth: SW * 0.16,
          borderBottomColor: mountainNearColor,
          borderLeftWidth: SW * 0.22,
          borderLeftColor: 'transparent',
          borderRightWidth: SW * 0.22,
          borderRightColor: 'transparent',
          opacity: 0.85,
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Flowing Perspective Grid
// ---------------------------------------------------------------------------

function FlowingHLines({ scroll, totalHeight, scrollDistance, horizontalLines }: {
  scroll: SharedValue<number>;
  totalHeight: number;
  scrollDistance: number;
  horizontalLines: React.ReactNode[];
}) {
  const hStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: totalHeight + scrollDistance,
    transform: [{ translateY: interpolate(scroll.value, [0, 1], [0, scrollDistance]) }],
  }));
  return <Animated.View style={hStyle}>{horizontalLines}</Animated.View>;
}

function FlowingPerspectiveGrid() {
  const scroll = useSharedValue(0);

  useEffect(() => {
    scroll.value = withRepeat(
      withTiming(1, { duration: 8000 }),
      -1,
    );
  }, []);

  const totalHeight = SH - HORIZON_Y;

  const verticalLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const count = 15;
    const centerX = SW / 2;
    const spread = SW * 1.8;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const bottomX = centerX - spread / 2 + spread * t;
      const topX = centerX + (bottomX - centerX) * 0.08;
      const distFromCenter = Math.abs(t - 0.5) * 2;
      const opacity = 0.15 + (1 - distFromCenter) * 0.25;
      lines.push(
        <View
          key={`v${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: topX,
            width: 1,
            height: '100%',
            backgroundColor: `rgba(255, 45, 149, ${opacity})`,
            transform: [
              { perspective: 200 },
              { rotateZ: `${(bottomX - topX) * 0.03}deg` },
            ],
            shadowColor: COLORS.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: opacity * 0.6,
            shadowRadius: 3,
          }}
        />,
      );
    }
    return lines;
  }, []);

  // Horizontal lines are placed in a double-height container that scrolls
  // downward in a loop, creating the illusion of flowing toward the viewer.
  const horizontalLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const t = Math.pow(i / count, 1.8);
      const y = t * totalHeight;
      const opacity = 0.08 + t * 0.2;
      const color = i % 3 === 0 ? COLORS.accent : COLORS.purple;
      lines.push(
        <View
          key={`h${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: y,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: color,
            opacity,
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: opacity * 0.5,
            shadowRadius: 4,
          }}
        />,
      );
    }
    return lines;
  }, [totalHeight]);

  // Spacing between repeating sets for the scroll loop
  const scrollDistance = totalHeight * 0.3;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: HORIZON_Y,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={GRADIENTS.synthwave.ground as unknown as [string, string, ...string[]]}
        style={StyleSheet.absoluteFill}
      />

      {/* Scrolling horizontal lines */}
      <FlowingHLines scroll={scroll} totalHeight={totalHeight} scrollDistance={scrollDistance} horizontalLines={horizontalLines} />

      {verticalLines}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface SynthwaveHomeBackdropProps {
  playerLevel?: number;
}

function SynthwaveHomeBackdropInner(_props: SynthwaveHomeBackdropProps) {
  const stars = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        top: `${2 + ((i * 7 + 3) % 34)}%` as DimensionValue,
        left: `${1 + ((i * 19 + 5) % 96)}%` as DimensionValue,
        color:
          i % 7 === 0
            ? '#ff2d95'
            : i % 5 === 0
            ? '#00e5ff'
            : i % 4 === 0
            ? '#c84dff'
            : i % 3 === 0
            ? 'rgba(255,255,255,0.95)'
            : 'rgba(255,255,255,0.6)',
        size: 1.2 + (i % 5) * 0.8,
        delay: (i * 230) % 3500,
        duration: 1000 + (i % 5) * 400,
      })),
    [],
  );

  return (
    <View pointerEvents="none" style={styles.container}>
      {/* Sky gradient */}
      <LinearGradient
        colors={GRADIENTS.synthwave.sky as unknown as [string, string, ...string[]]}
        locations={[0, 0.2, 0.4, 0.6, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Stars */}
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

      {/* Mountain silhouettes behind the sun */}
      <MountainSilhouettes />

      {/* Banded retro sun */}
      <BandedSun />

      {/* Flowing perspective grid floor */}
      <FlowingPerspectiveGrid />

      {/* Bottom fade for content readability */}
      <LinearGradient
        colors={['transparent', 'rgba(10, 0, 21, 0.85)'] as [string, string]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomFade}
      />

      {/* Vignette */}
      <View style={styles.vignette} />
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
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 80,
  },
});

export default React.memo(SynthwaveHomeBackdropInner);
