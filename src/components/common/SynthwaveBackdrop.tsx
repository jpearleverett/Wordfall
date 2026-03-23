import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, DimensionValue, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Twinkling Star (reused from AmbientBackdrop pattern) ─────────────
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

// ─── Palm Tree Silhouette ──────────────────────────────────────────────
function PalmTree({ side, bottom }: { side: 'left' | 'right'; bottom: number }) {
  const isLeft = side === 'left';
  const lean = isLeft ? 15 : -15;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.absolute,
        {
          bottom,
          [isLeft ? 'left' : 'right']: -20,
          alignItems: 'center',
          transform: [{ rotate: `${lean}deg` }],
        },
      ]}
    >
      {/* Trunk */}
      <View style={styles.palmTrunk} />
      {/* Fronds */}
      {[-65, -35, -10, 10, 35, 65].map((angle, i) => (
        <View
          key={i}
          style={[
            styles.palmFrond,
            {
              transform: [
                { rotate: `${angle}deg` },
                { translateY: -28 },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── City Skyline ──────────────────────────────────────────────────────
function CitySkyline() {
  const buildings = useMemo(
    () => [
      { width: 18, height: 35, left: '5%' as DimensionValue },
      { width: 12, height: 50, left: '10%' as DimensionValue },
      { width: 22, height: 42, left: '15%' as DimensionValue },
      { width: 10, height: 28, left: '21%' as DimensionValue },
      { width: 16, height: 55, left: '25%' as DimensionValue },
      { width: 14, height: 38, left: '31%' as DimensionValue },
      { width: 20, height: 60, left: '36%' as DimensionValue },
      { width: 10, height: 30, left: '42%' as DimensionValue },
      { width: 15, height: 45, left: '46%' as DimensionValue },
      { width: 12, height: 52, left: '52%' as DimensionValue },
      { width: 24, height: 40, left: '57%' as DimensionValue },
      { width: 10, height: 58, left: '64%' as DimensionValue },
      { width: 18, height: 33, left: '69%' as DimensionValue },
      { width: 14, height: 48, left: '75%' as DimensionValue },
      { width: 20, height: 36, left: '81%' as DimensionValue },
      { width: 12, height: 44, left: '87%' as DimensionValue },
      { width: 16, height: 30, left: '93%' as DimensionValue },
    ],
    [],
  );

  return (
    <View pointerEvents="none" style={styles.skylineContainer}>
      {buildings.map((b, i) => (
        <View
          key={i}
          style={[
            styles.building,
            { width: b.width, height: b.height, left: b.left },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Perspective Grid Floor ────────────────────────────────────────────
function PerspectiveGrid() {
  // Horizontal lines with decreasing spacing toward the horizon
  const horizontalLines = useMemo(() => {
    const lines: { top: number; opacity: number }[] = [];
    let y = 0;
    let spacing = 4;
    for (let i = 0; i < 18; i++) {
      lines.push({ top: y, opacity: Math.min(0.6, 0.15 + i * 0.03) });
      y += spacing;
      spacing += 2.5;
    }
    return lines;
  }, []);

  // Vertical lines radiating from center
  const verticalLines = useMemo(() => {
    const lines: { left: number; skew: number; opacity: number }[] = [];
    const count = 15;
    for (let i = 0; i < count; i++) {
      const pct = (i / (count - 1)) * 100;
      const centerDist = Math.abs(pct - 50) / 50;
      lines.push({
        left: pct,
        skew: (pct - 50) * 0.6,
        opacity: 0.15 + (1 - centerDist) * 0.25,
      });
    }
    return lines;
  }, []);

  return (
    <View pointerEvents="none" style={styles.gridFloor}>
      {/* Horizontal lines */}
      {horizontalLines.map((line, i) => (
        <View
          key={`h${i}`}
          style={[
            styles.gridHLine,
            { top: line.top, opacity: line.opacity },
          ]}
        />
      ))}
      {/* Vertical lines */}
      {verticalLines.map((line, i) => (
        <View
          key={`v${i}`}
          style={[
            styles.gridVLine,
            {
              left: `${line.left}%` as DimensionValue,
              opacity: line.opacity,
              transform: [{ skewX: `${line.skew}deg` }],
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Synthwave Sun (grid-patterned glowing hemisphere) ─────────────────
function SynthwaveSun() {
  const sunSize = SCREEN_WIDTH * 0.7;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  // Horizontal stripe positions for the grid pattern on the sun
  const stripes = useMemo(() => {
    const s: { top: number; height: number }[] = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const pct = 30 + (i / count) * 60; // stripes in lower 60% of sun
      s.push({ top: pct, height: 2 + i * 0.6 });
    }
    return s;
  }, []);

  return (
    <View pointerEvents="none" style={styles.sunContainer}>
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.sunGlow,
          {
            width: sunSize * 1.5,
            height: sunSize * 1.0,
            borderRadius: sunSize * 0.75,
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.5],
            }),
          },
        ]}
      />
      {/* Sun body - semicircle (clip bottom half visible) */}
      <View
        style={[
          styles.sunBody,
          {
            width: sunSize,
            height: sunSize / 2,
            borderTopLeftRadius: sunSize / 2,
            borderTopRightRadius: sunSize / 2,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          },
        ]}
      >
        <LinearGradient
          colors={GRADIENTS.synthwave.sun as unknown as [string, string, ...string[]]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderTopLeftRadius: sunSize / 2,
              borderTopRightRadius: sunSize / 2,
            },
          ]}
        />
        {/* Grid horizontal stripes */}
        {stripes.map((stripe, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: `${stripe.top}%`,
              left: 0,
              right: 0,
              height: stripe.height,
              backgroundColor: 'rgba(10, 0, 32, 0.6)',
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Main Synthwave Backdrop ───────────────────────────────────────────
export function SynthwaveBackdrop() {
  const stars = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        top: `${3 + ((i * 13) % 35)}%` as DimensionValue, // stars only in upper sky
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
      {/* Sky gradient */}
      <LinearGradient
        colors={GRADIENTS.synthwave.sky as unknown as [string, string, ...string[]]}
        locations={[0, 0.25, 0.45, 0.6, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Twinkling stars */}
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

      {/* Synthwave sun */}
      <SynthwaveSun />

      {/* City skyline */}
      <CitySkyline />

      {/* Palm trees */}
      <PalmTree side="left" bottom={SCREEN_HEIGHT * 0.38} />
      <PalmTree side="right" bottom={SCREEN_HEIGHT * 0.35} />

      {/* Ground gradient (below horizon) */}
      <LinearGradient
        colors={GRADIENTS.synthwave.ground as unknown as [string, string, ...string[]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.ground}
      />

      {/* Perspective grid floor */}
      <PerspectiveGrid />

      {/* Horizon glow line */}
      <View style={styles.horizonGlow} />

      {/* Bottom darken for content readability */}
      <LinearGradient
        colors={['transparent', 'rgba(10, 0, 32, 0.5)'] as [string, string]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomFade}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────
const HORIZON_Y = SCREEN_HEIGHT * 0.42; // horizon line position

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  absolute: {
    position: 'absolute',
  },

  // ── Sun ──
  sunContainer: {
    position: 'absolute',
    top: HORIZON_Y - SCREEN_WIDTH * 0.35, // sun bottom sits at horizon
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  sunGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 200, 255, 0.15)',
    alignSelf: 'center',
    bottom: -20,
  },
  sunBody: {
    overflow: 'hidden',
  },

  // ── Skyline ──
  skylineContainer: {
    position: 'absolute',
    top: HORIZON_Y - 60,
    left: 0,
    right: 0,
    height: 65,
  },
  building: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#0a0018',
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },

  // ── Palm Trees ──
  palmTrunk: {
    width: 6,
    height: 100,
    backgroundColor: '#0a0015',
    borderRadius: 3,
  },
  palmFrond: {
    position: 'absolute',
    top: -10,
    width: 5,
    height: 50,
    backgroundColor: '#0a0015',
    borderRadius: 3,
    transformOrigin: 'bottom center',
  },

  // ── Ground & Grid Floor ──
  ground: {
    position: 'absolute',
    top: HORIZON_Y,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridFloor: {
    position: 'absolute',
    top: HORIZON_Y,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  gridHLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 212, 255, 0.35)',
  },
  gridVLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(200, 80, 192, 0.25)',
  },

  // ── Horizon Glow ──
  horizonGlow: {
    position: 'absolute',
    top: HORIZON_Y - 2,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 212, 255, 0.6)',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8,
  },

  // ── Bottom Fade ──
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
});
